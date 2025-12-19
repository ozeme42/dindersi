

'use server';

import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, writeBatch, doc, Timestamp, runTransaction, limit, startAfter, QueryDocumentSnapshot, where, Query } from "firebase/firestore";
import type { ScoreEvent, UserProfile } from "@/lib/types";
import { unstable_noStore as noStore } from 'next/cache';

type EnrichedScoreEvent = ScoreEvent & {
    userName?: string;
    attemptNumber?: number; // Add attempt number for Soru Bankası tests
};

type SerializableTimestamp = {
    _seconds: number;
    _nanoseconds: number;
}

export async function getScoreEvents(params: {
    cursor?: SerializableTimestamp | null,
    searchTerm?: string | null,
    showOnlyExcessiveAttempts?: boolean,
}): Promise<{ success: boolean; data?: EnrichedScoreEvent[]; error?: string, lastVisible?: SerializableTimestamp | null }> {
    noStore();
    const { cursor, searchTerm, showOnlyExcessiveAttempts } = params;
    const itemsPerPage = 25;

    try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const usersMap = new Map(usersSnapshot.docs.map(doc => [doc.id, doc.data().displayName]));

        let eventsQuery: Query = collection(db, 'scoreEvents');
        
        let queryConstraints = [orderBy('timestamp', 'desc')];

        if (showOnlyExcessiveAttempts) {
             // This logic remains complex for Firestore queries alone.
             // We'll fetch all and filter for this specific case for now.
             // A better long-term solution involves denormalizing attempt counts.
        }
        
        // Apply cursor for pagination
        if (cursor) {
            const cursorTimestamp = new Timestamp(cursor._seconds, cursor._nanoseconds);
            queryConstraints.push(startAfter(cursorTimestamp));
        }

        queryConstraints.push(limit(itemsPerPage * (searchTerm ? 5 : 1))); // Fetch more if we need to filter client-side

        eventsQuery = query(collection(db, 'scoreEvents'), ...queryConstraints);
        
        const snapshot = await getDocs(eventsQuery);

        let events = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                id: doc.id,
                userName: usersMap.get(data.userId) || 'Bilinmeyen Kullanıcı',
                timestamp: (data.timestamp as Timestamp).toDate().toISOString(),
            } as EnrichedScoreEvent;
        });
        
        // Client-side filtering for search term
        if (searchTerm) {
            const lowercasedTerm = searchTerm.toLowerCase();
            events = events.filter(event => 
                event.userName?.toLowerCase().includes(lowercasedTerm) ||
                event.gameType?.toLowerCase().includes(lowercasedTerm) ||
                (typeof event.context === 'string' && event.context.toLowerCase().includes(lowercasedTerm))
            );
        }

        // Handle attempt number calculation after filtering if needed
        if (showOnlyExcessiveAttempts) {
             // This is inefficient and should be improved with a better data model in the future.
             // For now, it demonstrates the complexity. We'd need to fetch all events per user/context to do this accurately.
             // The logic is omitted here to prefer performance, the UI should note this limitation.
        }

        const paginatedEvents = events.slice(0, itemsPerPage);
        
        const lastVisibleDoc = snapshot.docs.length > itemsPerPage ? snapshot.docs[itemsPerPage - 1] : (snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null);
        
        const lastVisibleTimestamp = lastVisibleDoc ? lastVisibleDoc.data().timestamp as Timestamp : null;

        const lastVisible = lastVisibleTimestamp ? {
            _seconds: lastVisibleTimestamp.seconds,
            _nanoseconds: lastVisibleTimestamp.nanoseconds
        } : null;

        return { 
            success: true, 
            data: JSON.parse(JSON.stringify(paginatedEvents)),
            lastVisible
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
