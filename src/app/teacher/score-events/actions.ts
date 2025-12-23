
'use server';

import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, writeBatch, doc, Timestamp, runTransaction, limit, startAfter, where, Query, and } from "firebase/firestore";
import type { ScoreEvent, UserProfile } from "@/lib/types";
import { unstable_noStore as noStore } from 'next/cache';

type EnrichedScoreEvent = ScoreEvent & {
    userName?: string;
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
        
        let queryConstraints: any[] = [orderBy('timestamp', 'desc')];
        let postQueryFilters: ((event: EnrichedScoreEvent) => boolean)[] = [];

        // Server-side filtering for excessive attempts
        if (showOnlyExcessiveAttempts) {
            queryConstraints.push(where("attemptNumber", ">", 10));
        }
        
        // Server-side filtering for search term if possible
        // Note: Firestore does not support full-text search. This is a very basic prefix search.
        // For more complex search, a third-party service like Algolia is needed.
        if (searchTerm) {
            // We can't efficiently query by userName, so we have to filter client-side (after fetching)
            // This is a limitation we accept for now.
             postQueryFilters.push(event => 
                event.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                event.gameType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (typeof event.context === 'string' && event.context.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }

        // Apply cursor for pagination
        if (cursor) {
            const cursorTimestamp = new Timestamp(cursor._seconds, cursor._nanoseconds);
            queryConstraints.push(startAfter(cursorTimestamp));
        }

        // We fetch more items than needed if we have client-side filters
        const fetchLimit = postQueryFilters.length > 0 ? itemsPerPage * 5 : itemsPerPage;
        queryConstraints.push(limit(fetchLimit));
        
        eventsQuery = query(collection(db, 'scoreEvents'), ...queryConstraints);
        
        const snapshot = await getDocs(eventsQuery);

        let events = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                id: doc.id,
                userName: usersMap.get(data.userId) || 'Bilinmeyen Kullanıcı',
                timestamp: (data.timestamp as Timestamp).toDate().toISOString(),
                attemptNumber: data.attemptNumber || 1, // Default to 1 if not present
            } as EnrichedScoreEvent;
        });
        
        // Apply post-query filters
        if (postQueryFilters.length > 0) {
            events = events.filter(event => postQueryFilters.every(filterFn => filterFn(event)));
        }
        
        const paginatedEvents = events.slice(0, itemsPerPage);
        
        const lastVisibleDoc = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;
        
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
