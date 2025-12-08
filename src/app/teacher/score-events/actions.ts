
'use server';

import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, writeBatch, doc, Timestamp, runTransaction, limit, startAfter, QueryDocumentSnapshot, where } from "firebase/firestore";
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

    try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const usersMap = new Map(usersSnapshot.docs.map(doc => [doc.id, doc.data().displayName]));

        // IMPORTANT: Because Firestore does not support text search on multiple fields or case-insensitive search natively,
        // we have to fetch a larger dataset and filter on the server.
        // The more efficient solution would be to use a third-party search service like Algolia or Typesense,
        // but for this project's scope, we'll do server-side filtering.
        
        let allEventsData: ScoreEvent[] = [];
        
        // We will fetch ALL events first if a search term is provided, then filter.
        // This is inefficient for very large datasets.
        const allEventsQuery = query(collection(db, 'scoreEvents'), orderBy('timestamp', 'desc'));
        const allEventsSnapshot = await getDocs(allEventsQuery);
        
        allEventsData = allEventsSnapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id,
            timestamp: (doc.data().timestamp as any).toDate(),
        } as ScoreEvent));
        
        // Calculate attempt numbers for the entire dataset
        const attemptCounts: { [key: string]: number } = {};
        const eventsWithAttempts: EnrichedScoreEvent[] = [];

        for (let i = allEventsData.length - 1; i >= 0; i--) {
            const event = allEventsData[i];
            const key = `${event.userId}-${event.gameType}-${typeof event.context === 'string' ? event.context : JSON.stringify(event.context)}`;
            attemptCounts[key] = (attemptCounts[key] || 0) + 1;
            eventsWithAttempts.unshift({
                ...event,
                userName: usersMap.get(event.userId) || 'Bilinmeyen Kullanıcı',
                attemptNumber: attemptCounts[key]
            });
        }
        
        // Now, filter the enriched data
        let filteredEvents = eventsWithAttempts;

        if (searchTerm) {
            const lowercasedTerm = searchTerm.toLowerCase();
            filteredEvents = filteredEvents.filter(event => 
                event.userName?.toLowerCase().includes(lowercasedTerm) ||
                event.gameType?.toLowerCase().includes(lowercasedTerm) ||
                (typeof event.context === 'string' && event.context.toLowerCase().includes(lowercasedTerm))
            );
        }

        if (showOnlyExcessiveAttempts) {
            filteredEvents = filteredEvents.filter(event => (event.attemptNumber || 0) > 10);
        }

        // Apply pagination to the filtered results
        const itemsPerPage = 25;
        const pageIndex = cursor ? Math.floor(filteredEvents.findIndex(e => (e.timestamp as Date).getTime() === new Timestamp(cursor._seconds, cursor._nanoseconds).toDate().getTime()) / itemsPerPage) + 1 : 0;
        const startIndex = pageIndex * itemsPerPage;
        const paginatedEvents = filteredEvents.slice(startIndex, startIndex + itemsPerPage);
        
        // Find the last visible event from the ORIGINAL (unpaginated) filtered list to get the cursor for the NEXT page.
        const lastVisibleEvent = (startIndex + itemsPerPage < filteredEvents.length) ? filteredEvents[startIndex + itemsPerPage] : null;

        const serializableEvents = paginatedEvents.map(event => ({
            ...event,
            timestamp: new Date(event.timestamp).toISOString(),
        }));
        
        const serializableLastVisible = lastVisibleEvent ? {
            _seconds: (lastVisibleEvent.timestamp as Date).getTime() / 1000,
            _nanoseconds: (lastVisibleEvent.timestamp as Date).getMilliseconds() * 1000000
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
