
'use server';

import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, writeBatch, doc, Timestamp, runTransaction, limit, startAfter, QueryDocumentSnapshot, where } from "firebase/firestore";
import type { ScoreEvent, UserProfile } from "@/lib/types";
import { unstable_noStore as noStore } from 'next/cache';

type EnrichedScoreEvent = ScoreEvent & {
    userName?: string;
    attemptNumber?: number;
};

type SerializableTimestamp = {
    _seconds: number;
    _nanoseconds: number;
};

// This function now returns paginated data.
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

        let baseQuery = query(collection(db, 'scoreEvents'), orderBy('timestamp', 'desc'));
        
        let allEvents: EnrichedScoreEvent[] = [];

        // If searching or filtering, we need to fetch all and then filter/paginate in memory.
        // This is not efficient for very large datasets.
        if (searchTerm || showOnlyExcessiveAttempts) {
             const allEventsSnapshot = await getDocs(baseQuery);
             const allEventsData = allEventsSnapshot.docs.map(doc => {
                 const data = doc.data();
                 return { ...data, id: doc.id, timestamp: (data.timestamp as Timestamp).toDate() } as EnrichedScoreEvent;
            });
            
            // Enrich with attempt numbers
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

            // Apply filters
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
            
            // Manual pagination on filtered results
            const startIndex = cursor ? filteredEvents.findIndex(e => (e.timestamp as Date).getTime() === new Timestamp(cursor._seconds, cursor._nanoseconds).toDate().getTime()) + 1 : 0;
            const paginatedEvents = filteredEvents.slice(startIndex, startIndex + itemsPerPage);
            const lastEvent = paginatedEvents[paginatedEvents.length - 1];

            allEvents = paginatedEvents;
            const finalLastVisible = startIndex + itemsPerPage < filteredEvents.length ? filteredEvents[startIndex + itemsPerPage-1] : null;
            
            return {
                success: true,
                data: JSON.parse(JSON.stringify(allEvents.map(e => ({...e, timestamp: (e.timestamp as Date).toISOString()})))),
                lastVisible: finalLastVisible ? { _seconds: (finalLastVisible.timestamp as Date).getTime() / 1000, _nanoseconds: 0 } : null
            };

        } else {
            // Paginate directly with Firestore
            if (cursor) {
                const startAtTimestamp = Timestamp.fromMillis(cursor._seconds * 1000 + cursor._nanoseconds / 1000000);
                baseQuery = query(baseQuery, startAfter(startAtTimestamp));
            }

            const finalQuery = query(baseQuery, limit(itemsPerPage));
            const snapshot = await getDocs(finalQuery);

            const lastVisibleDoc = snapshot.docs[snapshot.docs.length - 1];
            const lastVisibleTimestamp = lastVisibleDoc ? lastVisibleDoc.data().timestamp as Timestamp : null;
            
            const eventsData = snapshot.docs.map(doc => {
                 const data = doc.data();
                 return { ...data, id: doc.id, timestamp: (data.timestamp as Timestamp).toDate().toISOString() } as EnrichedScoreEvent;
            });
            
             // We still need to calculate attempt numbers for the fetched page
            const attemptCounts: { [key: string]: number } = {};
            const eventsWithAttempts: EnrichedScoreEvent[] = [];
             for (let i = eventsData.length - 1; i >= 0; i--) {
                const event = eventsData[i];
                const key = `${event.userId}-${event.gameType}-${typeof event.context === 'string' ? event.context : JSON.stringify(event.context)}`;
                const previousAttemptsSnapshot = await getCountFromServer(query(
                    collection(db, 'scoreEvents'),
                    where('userId', '==', event.userId),
                    where('gameType', '==', event.gameType),
                    where('context', '==', event.context),
                    where('timestamp', '<', Timestamp.fromMillis(new Date(event.timestamp).getTime()))
                ));
                const attemptNumber = previousAttemptsSnapshot.data().count + 1;
                
                eventsWithAttempts.unshift({
                    ...event,
                    userName: usersMap.get(event.userId) || 'Bilinmeyen Kullanıcı',
                    attemptNumber: attemptNumber
                });
            }


            return {
                success: true,
                data: JSON.parse(JSON.stringify(eventsWithAttempts)),
                lastVisible: lastVisibleTimestamp ? { _seconds: lastVisibleTimestamp.seconds, _nanoseconds: lastVisibleTimestamp.nanoseconds } : null
            };
        }

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
