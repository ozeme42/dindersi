
'use server';

import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, getDocs, orderBy } from "firebase/firestore";
import type { Topic, SchoolClass, Course, Unit, UserProfile } from "@/lib/types";
import { unstable_noStore as noStore } from 'next/cache';

export type EnrichedCourse = Omit<Course, 'units'> & {
    units: (Omit<Unit, 'topics'> & {
        topics: Topic[]
    })[]
};

export async function getCurriculumForSelection(userId: string, dataType: 'games' | 'yazilacaklar' | 'ozetler'): Promise<EnrichedCourse[]> {
    noStore();
    try {
        const userDoc = await getDoc(doc(db, "users", userId));
        if (!userDoc.exists()) {
            console.error("No user found with ID:", userId);
            return [];
        }
        const student = userDoc.data() as UserProfile;
        const studentClassName = student.class?.split(' - ')[0];

        const coursesQuery = query(collection(db, 'courses'));
        const coursesSnapshot = await getDocs(coursesQuery);
        let relevantCourses = coursesSnapshot.docs
            .map(d => ({ id: d.id, ...d.data() } as Course))
            .filter(c => !c.isTeacherOnly && (c.isPublished ?? true));

        if (studentClassName) {
            relevantCourses = relevantCourses.filter(course =>
                course.className?.startsWith(studentClassName) || !course.className || course.className === 'Genel'
            );
        } else {
            relevantCourses = relevantCourses.filter(course => !course.className || course.className === 'Genel');
        }

        const enrichedCourses: EnrichedCourse[] = [];
        for (const course of relevantCourses) {
            const unitsSnapshot = await getDocs(query(collection(db, `courses/${course.id}/units`), orderBy("title")));
            const enrichedUnits: EnrichedCourse['units'] = [];

            for (const unitDoc of unitsSnapshot.docs) {
                const unitData = unitDoc.data() as Unit;
                if (!(unitData.isPublished ?? true)) continue; // Skip unpublished units

                const topicsSnapshot = await getDocs(query(collection(db, `courses/${course.id}/units/${unitDoc.id}/topics`), orderBy("title")));
                
                const topicsWithContent = topicsSnapshot.docs
                    .map(topicDoc => ({ id: topicDoc.id, ...topicDoc.data() } as Topic))
                    .filter(topicData => {
                        if (!(topicData.isPublished ?? true)) return false; // Skip unpublished topics

                        if (dataType === 'yazilacaklar') {
                            return (topicData.writingContent?.notes?.length || 0) > 0 || (topicData.writingContent?.conceptDefinitions?.length || 0) > 0;
                        }
                        if (dataType === 'ozetler') {
                            return !!topicData.htmlContent;
                        }
                        return true; // For games, include all published topics
                    });


                if (topicsWithContent.length > 0) {
                    enrichedUnits.push({
                        id: unitDoc.id,
                        title: unitDoc.data().title,
                        topics: topicsWithContent,
                        isPublished: unitData.isPublished
                    });
                }
            }

            if (enrichedUnits.length > 0) {
                enrichedCourses.push({
                    ...course,
                    units: enrichedUnits,
                });
            }
        }
        
        enrichedCourses.sort((a, b) => {
            if (a.title.includes('Din Kültürü')) return -1;
            if (b.title.includes('Din Kültürü')) return 1;
            return a.title.localeCompare(b.title);
        });

        return JSON.parse(JSON.stringify(enrichedCourses));
        
    } catch (e: any) {
        console.error("Error getting curriculum for selection: ", e);
        return [];
    }
}
