'use server';

import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, writeBatch, doc, Timestamp, runTransaction, limit, startAfter, where } from "firebase/firestore";
import type { ScoreEvent } from "@/lib/types";
import { unstable_noStore as noStore } from 'next/cache';

type EnrichedScoreEvent = ScoreEvent & {
    userName?: string;
    attemptNumber?: number;
};

type SerializableTimestamp = {
    _seconds: number;
    _nanoseconds: number;
} | null;

export async function getScoreEvents(params: {
    cursor?: SerializableTimestamp | null,
    direction?: 'next' | 'prev',
    searchTerm?: string | null,
    showOnlyExcessiveAttempts?: boolean,
    filterGameType?: string
}): Promise<{ success: boolean; data?: EnrichedScoreEvent[]; error?: string, lastVisible?: SerializableTimestamp | null }> {
    noStore();
    const { cursor, direction = 'next', searchTerm, showOnlyExcessiveAttempts, filterGameType } = params;
    const itemsPerPage = 20;

    try {
        // Kullanıcı İsimlerini Haritala (Performans için tek sorgu)
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const usersMap = new Map(usersSnapshot.docs.map(doc => [doc.id, doc.data().displayName]));

        let queryConstraints = [];
        
        // --- FİLTRELER (Backend Tarafı) ---
        if (showOnlyExcessiveAttempts) {
             queryConstraints.push(where("attemptNumber", ">", 10));
        }

        if (filterGameType && filterGameType !== 'all') {
            queryConstraints.push(where("gameType", "==", filterGameType));
        }
        
        // --- SORGULAMA MANTIĞI ---
        let finalQuery;
        const collectionRef = collection(db, 'scoreEvents');

        // DURUM 1: ARAMA VARSA (Limit Yok, Tüm Veriyi Çekip Filtrele)
        if (searchTerm && searchTerm.trim() !== "") {
            finalQuery = query(collectionRef, orderBy('timestamp', 'desc'), ...queryConstraints, limit(500));
            
            const snapshot = await getDocs(finalQuery);
            let allData = snapshot.docs.map(doc => {
                const data = doc.data();
                const ts = data.timestamp;
                const isoTimestamp = (ts && typeof ts.toDate === 'function') ? ts.toDate().toISOString() : (typeof ts === 'string' ? ts : new Date().toISOString());
                return {
                    ...data,
                    id: doc.id,
                    timestamp: isoTimestamp,
                    userName: usersMap.get(data.userId) || 'Bilinmeyen Kullanıcı',
                } as EnrichedScoreEvent;
            });

            // JS ile Filtreleme
            const lowerTerm = searchTerm.toLowerCase();
            const filteredData = allData.filter(event => 
                event.userName?.toLowerCase().includes(lowerTerm) ||
                event.gameType?.toLowerCase().includes(lowerTerm) ||
                (typeof event.context === 'string' && event.context.toLowerCase().includes(lowerTerm))
            );

            return {
                success: true,
                data: JSON.parse(JSON.stringify(filteredData)),
                lastVisible: null
            };
        } 
        
        // DURUM 2: ARAMA YOKSA (Normal Sayfalama)
        else {
            if (direction === 'next') {
                let q = query(collectionRef, orderBy('timestamp', 'desc'), ...queryConstraints);
                if (cursor && cursor._seconds) {
                    const startAtTimestamp = new Timestamp(cursor._seconds, cursor._nanoseconds);
                    q = query(q, startAfter(startAtTimestamp));
                }
                finalQuery = query(q, limit(itemsPerPage));
            } else { 
                finalQuery = query(collectionRef, orderBy('timestamp', 'desc'), ...queryConstraints, limit(itemsPerPage));
            }

            const snapshot = await getDocs(finalQuery);
            
            const data = snapshot.docs.map(doc => {
                const d = doc.data();
                const ts = d.timestamp;
                const isoTimestamp = (ts && typeof ts.toDate === 'function') ? ts.toDate().toISOString() : (typeof ts === 'string' ? ts : new Date().toISOString());
                return {
                    ...d,
                    id: doc.id,
                    timestamp: isoTimestamp,
                    userName: usersMap.get(d.userId) || 'Bilinmeyen Kullanıcı',
                } as EnrichedScoreEvent;
            });

            const lastDoc = snapshot.docs[snapshot.docs.length - 1];
            const rawLast = lastDoc ? lastDoc.data().timestamp : null;
            const lastVisible = (rawLast && typeof rawLast === 'object' && 'seconds' in rawLast) ? { _seconds: rawLast.seconds, _nanoseconds: rawLast.nanoseconds } : null;

            return {
                success: true,
                data: JSON.parse(JSON.stringify(data)),
                lastVisible
            };
        }

    } catch (error: any) {
        console.error("Error fetching score events:", error);
        return { success: false, error: 'Veri alınamadı: ' + error.message };
    }
}

// ... (deleteScoreEvents fonksiyonu aynı kalacak) ...
export async function deleteScoreEvents(eventIds: string[]): Promise<{ success: boolean; error?: string }> {
    if (!eventIds || eventIds.length === 0) {
        return { success: false, error: "Silinecek olay seçilmedi." };
    }

    try {
        await runTransaction(db, async (transaction) => {
            const pointsToAdjust: Map<string, number> = new Map();
            const eventRefs = eventIds.map(id => doc(db, 'scoreEvents', id));
            
            const eventDocs = await Promise.all(eventRefs.map(ref => transaction.get(ref)));
            
            for (const eventDoc of eventDocs) {
                if (eventDoc.exists()) {
                    const eventData = eventDoc.data() as ScoreEvent;
                    const currentAdjustment = pointsToAdjust.get(eventData.userId) || 0;
                    pointsToAdjust.set(eventData.userId, currentAdjustment + eventData.points);
                }
            }
            
            const userRefs = Array.from(pointsToAdjust.keys()).map(userId => doc(db, 'users', userId));
            const userDocs = await Promise.all(userRefs.map(ref => transaction.get(ref)));
            const userDocMap = new Map(userDocs.map(d => [d.id, d]));

            for (const eventDoc of eventDocs) {
                if (eventDoc.exists()) {
                    transaction.delete(eventDoc.ref);
                }
            }

            for (const [userId, points] of pointsToAdjust.entries()) {
                const userDoc = userDocMap.get(userId);
                if (userDoc && userDoc.exists()) {
                    const currentScore = userDoc.data().score || 0;
                    transaction.update(userDoc.ref, { score: currentScore - points });
                }
            }
        });

        return { success: true };
    } catch (error: any) {
        console.error("Error deleting score events and adjusting scores:", error);
        return { success: false, error: "Puan olayları silinirken ve kullanıcı skorları güncellenirken bir hata oluştu." };
    }
}