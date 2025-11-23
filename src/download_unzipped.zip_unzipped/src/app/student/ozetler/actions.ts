
'use server';

import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, orderBy } from "firebase/firestore";
import type { Topic, SchoolClass, Course, Unit, UserProfile } from "@/lib/types";
import { unstable_noStore as noStore } from 'next/cache';

export type EnrichedCourseWithOzetler = Omit<Course, 'units'> & {
    units: (Omit<Unit, 'topics'> & {
        topics: (Topic & { hasOzetContent: boolean })[]
    })[]
};


export async function getCurriculumForOzetler(userId: string): Promise<{ courses: EnrichedCourseWithOzetler[], error?: string }> {
    noStore();
    try {
        const userDoc = await getDoc(doc(db, "users", userId));
        if (!userDoc.exists()) {
            return { courses: [], error: "Öğrenci bulunamadı." };
        }
        const student = userDoc.data() as UserProfile;
        const studentClassName = student.class?.split(' - ')[0];

        const coursesQuery = query(collection(db, 'courses'));
        const coursesSnapshot = await getDocs(coursesQuery);
        let relevantCourses = coursesSnapshot.docs
            .map(d => ({ id: d.id, ...d.data() } as Course))
            .filter(c => !c.isTeacherOnly);

        if (studentClassName) {
            const classesSnapshot = await getDocs(collection(db, "classes"));
            const studentClass = classesSnapshot.docs.find(c => c.data().name === studentClassName);
            
            relevantCourses = relevantCourses.filter(course =>
                course.classId === studentClass?.id || !course.classId
            );
        } else {
            relevantCourses = relevantCourses.filter(course => !course.classId);
        }

        const enrichedCourses: EnrichedCourseWithOzetler[] = [];
        for (const course of relevantCourses) {
            const unitsSnapshot = await getDocs(query(collection(db, `courses/${course.id}/units`), orderBy("title")));
            const enrichedUnits: EnrichedCourseWithOzetler['units'] = [];

            for (const unitDoc of unitsSnapshot.docs) {
                const topicsSnapshot = await getDocs(query(collection(db, `courses/${course.id}/units/${unitDoc.id}/topics`), orderBy("title")));
                const topicsWithFlag = topicsSnapshot.docs
                    .map(topicDoc => {
                        const topicData = topicDoc.data() as Topic;
                        const hasContent = !!topicData.htmlContent;
                        return {
                            id: topicDoc.id,
                            ...topicData,
                            hasOzetContent: hasContent
                        } as Topic & { hasOzetContent: boolean };
                    })
                    .filter(t => t.hasOzetContent);

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
                    units: enrichedUnits,
                    className: student.class,
                });
            }
        }
        
        return { courses: JSON.parse(JSON.stringify(enrichedCourses)) };
        
    } catch (e: any) {
        console.error("Error getting curriculum for ozetler: ", e);
        return { courses: [], error: "Veri alınırken bir hata oluştu." };
    }
}
