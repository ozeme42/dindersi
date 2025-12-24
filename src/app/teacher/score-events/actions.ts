
'use server';

import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, writeBatch, doc, Timestamp, runTransaction, limit, startAfter, QueryDocumentSnapshot, where, endBefore } from "firebase/firestore";
import type { ScoreEvent, UserProfile } from "@/lib/types";
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
}): Promise<{ success: boolean; data?: EnrichedScoreEvent[]; error?: string, lastVisible?: SerializableTimestamp | null, firstVisible?: SerializableTimestamp | null }> {
    noStore();
    const { cursor, direction = 'next', searchTerm, showOnlyExcessiveAttempts } = params;
    const itemsPerPage = 25;

    try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const usersMap = new Map(usersSnapshot.docs.map(doc => [doc.id, doc.data().displayName]));

        let queryConstraints = [];
        
        if (showOnlyExcessiveAttempts) {
             queryConstraints.push(where("attemptNumber", ">", 10));
        }
        
        let finalQuery;
        if (direction === 'next') {
            finalQuery = query(collection(db, 'scoreEvents'), orderBy('timestamp', 'desc'), ...queryConstraints, limit(itemsPerPage));
            if (cursor) {
                const startAtTimestamp = Timestamp.fromMillis(cursor._seconds * 1000 + cursor._nanoseconds / 1000000);
                finalQuery = query(finalQuery, startAfter(startAtTimestamp));
            }
        } else { // direction === 'prev'
            finalQuery = query(collection(db, 'scoreEvents'), orderBy('timestamp', 'asc'), ...queryConstraints, limit(itemsPerPage));
            if (cursor) {
                const endAtTimestamp = Timestamp.fromMillis(cursor._seconds * 1000 + cursor._nanoseconds / 1000000);
                finalQuery = query(finalQuery, startAfter(endAtTimestamp)); // Firestore doesn't have `endBefore` with `orderBy desc`, so we reverse logic
            }
        }
        
        const snapshot = await getDocs(finalQuery);
        
        let eventsData = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                id: doc.id,
                timestamp: (data.timestamp as Timestamp).toDate().toISOString(),
                userName: usersMap.get(data.userId) || 'Bilinmeyen Kullanıcı',
            } as EnrichedScoreEvent;
        });

        // If 'prev', we need to reverse the order back to descending
        if (direction === 'prev') {
            eventsData.reverse();
        }

        // Apply search term filter after fetching because Firestore doesn't support text search on multiple fields efficiently.
        if (searchTerm) {
            const lowercasedTerm = searchTerm.toLowerCase();
            eventsData = eventsData.filter(event => 
                event.userName?.toLowerCase().includes(lowercasedTerm) ||
                event.gameType?.toLowerCase().includes(lowercasedTerm) ||
                (typeof event.context === 'string' && event.context.toLowerCase().includes(lowercasedTerm))
            );
        }

        const firstVisibleDoc = snapshot.docs[0];
        const lastVisibleDoc = snapshot.docs[snapshot.docs.length - 1];
        const firstVisibleTimestamp = firstVisibleDoc ? (firstVisibleDoc.data().timestamp as Timestamp) : null;
        const lastVisibleTimestamp = lastVisibleDoc ? (lastVisibleDoc.data().timestamp as Timestamp) : null;

        return {
            success: true,
            data: JSON.parse(JSON.stringify(eventsData)),
            firstVisible: firstVisibleTimestamp ? { _seconds: firstVisibleTimestamp.seconds, _nanoseconds: firstVisibleTimestamp.nanoseconds } : null,
            lastVisible: lastVisibleTimestamp ? { _seconds: lastVisibleTimestamp.seconds, _nanoseconds: lastVisibleTimestamp.nanoseconds } : null
        };

    } catch (error: any) {
        console.error("Error fetching score events:", error);
        return { success: false, error: 'Puan hareketleri alınırken bir veritabanı hatası oluştu.' };
    }
}


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
