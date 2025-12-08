
'use server';

import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, writeBatch, doc, Timestamp, runTransaction, limit, startAfter, QueryDocumentSnapshot } from "firebase/firestore";
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

export async function getScoreEvents(cursor: SerializableTimestamp | null = null): Promise<{ success: boolean; data?: EnrichedScoreEvent[]; error?: string, lastVisible?: SerializableTimestamp | null }> {
    noStore();
    try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const usersMap = new Map(usersSnapshot.docs.map(doc => [doc.id, doc.data().displayName]));

        let eventsQuery = query(
            collection(db, 'scoreEvents'), 
            orderBy('timestamp', 'desc'), 
            limit(25)
        );
        
        if (cursor) {
             const firestoreCursor = new Timestamp(cursor._seconds, cursor._nanoseconds);
             eventsQuery = query(
                collection(db, 'scoreEvents'), 
                orderBy('timestamp', 'desc'), 
                startAfter(firestoreCursor),
                limit(25)
            );
        }

        const eventsSnapshot = await getDocs(eventsQuery);
        const lastVisibleDoc = eventsSnapshot.docs[eventsSnapshot.docs.length - 1];

        const allEvents = eventsSnapshot.docs.map(doc => {
            const data = doc.data() as ScoreEvent;
            return {
                ...data,
                id: doc.id,
                timestamp: (data.timestamp as any).toDate(),
                userName: usersMap.get(data.userId) || 'Bilinmeyen Kullanıcı',
            } as EnrichedScoreEvent;
        });

        // The logic for attemptNumber calculation requires all events, which is inefficient for pagination.
        // For now, we will omit the attemptNumber logic to make pagination possible.
        // A more complex solution would involve a separate system or denormalization if this feature is critical.

        const serializableEvents = allEvents.map(event => ({
            ...event,
            timestamp: new Date(event.timestamp).toISOString(),
        }));
        
        // Serialize the lastVisible document for the client
        const serializableLastVisible = lastVisibleDoc ? {
            _seconds: lastVisibleDoc.data().timestamp.seconds,
            _nanoseconds: lastVisibleDoc.data().timestamp.nanoseconds
        } : null;
        
        return { 
            success: true, 
            data: JSON.parse(JSON.stringify(serializableEvents)),
            lastVisible: serializableLastVisible
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
            
            // Step 1: Read all event documents to be deleted.
            const eventDocs = await Promise.all(eventRefs.map(ref => transaction.get(ref)));
            
            // Step 2: Calculate points adjustments based on the events to be deleted.
            for (const eventDoc of eventDocs) {
                if (eventDoc.exists()) {
                    const eventData = eventDoc.data() as ScoreEvent;
                    const currentAdjustment = pointsToAdjust.get(eventData.userId) || 0;
                    pointsToAdjust.set(eventData.userId, currentAdjustment + eventData.points);
                }
            }
            
            // Step 3: Read all affected user documents.
            const userRefs = Array.from(pointsToAdjust.keys()).map(userId => doc(db, 'users', userId));
            const userDocs = await Promise.all(userRefs.map(ref => transaction.get(ref)));
            const userDocMap = new Map(userDocs.map(d => [d.id, d]));

            // Step 4: Perform all write operations (updates and deletes).
            for (const eventDoc of eventDocs) {
                if (eventDoc.exists()) {
                    transaction.delete(eventDoc.ref); // Queue deletion
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
