
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

export async function getScoreEvents(cursor?: SerializableTimestamp | null): Promise<{ success: boolean; data?: EnrichedScoreEvent[]; error?: string, lastVisible?: SerializableTimestamp | null }> {
    noStore();
    try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const usersMap = new Map(usersSnapshot.docs.map(doc => [doc.id, doc.data().displayName]));
        
        const allEventsQuery = query(
            collection(db, 'scoreEvents'), 
            orderBy('timestamp', 'desc'),
        );

        const allEventsSnapshot = await getDocs(allEventsQuery);
        const allEventsData = allEventsSnapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id,
            timestamp: (doc.data().timestamp as any).toDate(),
        } as ScoreEvent));

        // Calculate attempt numbers
        const attemptCounts: { [key: string]: number } = {};
        const eventsWithAttempts: EnrichedScoreEvent[] = [];

        // Iterate backwards to calculate attempt numbers correctly
        for (let i = allEventsData.length - 1; i >= 0; i--) {
            const event = allEventsData[i];
            // Check if context is a string, as it could be an object for 'deneme'
            if (typeof event.context === 'string') {
                const key = `${event.userId}-${event.gameType}-${event.context}`;
                attemptCounts[key] = (attemptCounts[key] || 0) + 1;
                eventsWithAttempts.unshift({
                    ...event,
                    userName: usersMap.get(event.userId) || 'Bilinmeyen Kullanıcı',
                    attemptNumber: attemptCounts[key]
                });
            } else {
                 // For non-string contexts or other types, just add them without attempt number
                eventsWithAttempts.unshift({
                    ...event,
                    userName: usersMap.get(event.userId) || 'Bilinmeyen Kullanıcı'
                });
            }
        }
        
        const itemsPerPage = 25;
        const pageIndex = cursor ? Math.floor(allEventsData.findIndex(e => (e.timestamp as Date).getTime() === new Timestamp(cursor._seconds, cursor._nanoseconds).toDate().getTime()) / itemsPerPage) + 1 : 0;
        
        const startIndex = pageIndex * itemsPerPage;
        const paginatedEvents = eventsWithAttempts.slice(startIndex, startIndex + itemsPerPage);
        const lastVisibleEvent = paginatedEvents.length === itemsPerPage ? allEventsData[startIndex + itemsPerPage] : null;


        const serializableEvents = paginatedEvents.map(event => ({
            ...event,
            timestamp: new Date(event.timestamp).toISOString(),
        }));
        
        const serializableLastVisible = lastVisibleEvent ? {
            _seconds: (lastVisibleEvent.timestamp as Date).getTime() / 1000,
            _nanoseconds: 0 // Simplification, as JS Date doesn't have nanos
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
