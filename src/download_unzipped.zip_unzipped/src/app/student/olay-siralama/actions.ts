

'use server';

import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { unstable_noStore as noStore } from 'next/cache';
import type { ActivityItem, SortingGameData, Course, Unit, Topic, SchoolClass, UserProfile } from '@/lib/types';

export type SortingGameItem = SortingGameData & {
    id: string;
};

// This is a simplified version of the curriculum structure for client-side filtering.
export type EnrichedCourseWithSortingGames = Omit<Course, 'units'> & {
    units: (Omit<Unit, 'topics'> & {
        topics: (Topic & { hasSortingGames: boolean })[]
    })[]
};


export async function getCurriculumForSortingGames(): Promise<{ courses: EnrichedCourseWithSortingGames[], error?: string }> {
    noStore();
    try {
        const sortingItemsQuery = query(collection(db, 'activityItems'), where('type', '==', 'sorting'));
        const sortingItemsSnapshot = await getDocs(sortingItemsQuery);
        const topicsWithSortingGames = new Set<string>();
        sortingItemsSnapshot.forEach(doc => {
            topicsWithSortingGames.add(doc.data().topicId);
        });

        if (topicsWithSortingGames.size === 0) {
            return { courses: [], error: "Sıralama etkinliği için uygun veri bulunamadı." };
        }

        const coursesQuery = query(collection(db, 'courses'));
        const coursesSnapshot = await getDocs(coursesQuery);
        const relevantCourses = coursesSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Course));

        const enrichedCourses: EnrichedCourseWithSortingGames[] = [];
        for (const course of relevantCourses) {
            const unitsSnapshot = await getDocs(query(collection(db, `courses/${course.id}/units`), orderBy("title")));
            const enrichedUnits: EnrichedCourseWithSortingGames['units'] = [];

            for (const unitDoc of unitsSnapshot.docs) {
                const topicsSnapshot = await getDocs(query(collection(db, `courses/${course.id}/units/${unitDoc.id}/topics`), orderBy("title")));
                const topicsWithFlag = topicsSnapshot.docs
                    .map(topicDoc => ({
                        id: topicDoc.id,
                        ...topicDoc.data(),
                        hasSortingGames: topicsWithSortingGames.has(topicDoc.id)
                    } as Topic & { hasSortingGames: boolean }))
                    .filter(t => t.hasSortingGames);

                if (topicsWithFlag.length > 0) {
                    enrichedUnits.push({
                        id: unitDoc.id,
                        title: unitDoc.data().title,
                        topics: topicsWithFlag
                    });
                }
            }

            if (enrichedUnits.length > 0) {
                enrichedCourses.push({
                    id: course.id,
                    title: course.title,
                    units: enrichedUnits
                });
            }
        }
        
        return { courses: JSON.parse(JSON.stringify(enrichedCourses)) };
        
    } catch (e: any) {
        console.error("Error getting curriculum for sorting games: ", e);
        return { courses: [], error: "Veri alınırken bir hata oluştu." };
    }
}


export async function getOlaySiralamaAction(
    { courseId, unitId, topicId }: { courseId?: string; unitId?: string; topicId?: string; }
): Promise<{ data: SortingGameItem[] | null, error?: string }> {
    noStore();
    try {
        let q = query(collection(db, 'activityItems'), where('type', '==', 'sorting'));

        if (topicId && topicId !== 'all') {
            q = query(q, where("topicId", "==", topicId));
        } else if (unitId && unitId !== 'all') {
            q = query(q, where("unitId", "==", unitId));
        } else if (courseId && courseId !== 'all') {
            q = query(q, where("courseId", "==", courseId));
        }

        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            return { error: "Olay Sıralama için bu konuda uygun veri bulunamadı.", data: null };
        }
        
        const games: SortingGameItem[] = querySnapshot.docs.map(doc => {
            const content = doc.data().content as SortingGameData;
            return {
                id: doc.id,
                title: content.title,
                items: content.items,
            };
        }).filter(game => game.items && game.items.length >= 3);


        if (games.length === 0) {
            return { error: "Olay Sıralama için en az 3 sıralanacak öğe içeren uygun veri bulunamadı.", data: null };
        }
        
        return { data: games };
    } catch (error: any) {
        console.error("Error getting olay sıralama items:", error);
        return { error: "Olay Sıralama görevi alınırken bir hata oluştu.", data: null };
    }
}

export async function submitOlaySiralamaScoreAction(userId: string | null, score: number, context: string): Promise<{ success: boolean; error?: string }> {
    if (!userId || score <= 0) {
        return { success: true };
    }
    
    try {
        const attemptsQuery = query(
            collection(db, 'scoreEvents'),
            where('userId', '==', userId),
            where('gameType', '==', 'Olay Sıralama'),
            where('context', '==', context)
        );
        const attemptsSnapshot = await getCountFromServer(attemptsQuery);
        if (attemptsSnapshot.data().count >= 10) {
            return { success: false, error: "Puan limiti aşıldı. Bu etkinlikten daha fazla puan kazanamazsınız." };
        }

        const batch = writeBatch(db);

        // 1. Increment the user's total score
        const userRef = doc(db, 'users', userId);
        batch.update(userRef, { score: increment(score) });

        // 2. Log the score event
        const eventRef = doc(collection(db, 'scoreEvents'));
        batch.set(eventRef, {
            userId: userId,
            points: score,
            timestamp: serverTimestamp(),
            gameType: 'Olay Sıralama',
            context: context,
        });

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Error submitting olay sıralama score:", error);
        return { success: false, error: "Skor kaydedilirken bir hata oluştu." };
    }
}
