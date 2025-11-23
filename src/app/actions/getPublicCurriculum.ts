
'use server';

import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, Timestamp } from "firebase/firestore";
import type { Course, Unit, Topic, SchoolClass } from "@/lib/types";
import { unstable_noStore as noStore } from 'next/cache';

export type PublicCourse = Omit<Course, 'units'> & {
    units: (Omit<Unit, 'topics'> & {
        topics: (Topic & { hasYazilacaklarContent: boolean; hasOzetContent: boolean })[]
    })[]
};

export type PublicClass = Omit<SchoolClass, 'courses'> & {
    courses: PublicCourse[];
};


export async function getPublicCurriculum(): Promise<{ classGroups: { name: string; courses: PublicCourse[] }[] }> {
    noStore();
    try {
        const [coursesSnap, classesSnap] = await Promise.all([
            getDocs(query(collection(db, 'courses'), where('isTeacherOnly', '!=', true))),
            getDocs(query(collection(db, 'classes'), orderBy('createdAt', 'asc')))
        ]);

        const allCoursesData = coursesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
        const allClasses = classesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolClass));
        
        const coursesWithContent: PublicCourse[] = [];

        for (const course of allCoursesData) {
            const unitsSnap = await getDocs(query(collection(db, `courses/${course.id}/units`), orderBy("title")));
            const units: PublicCourse['units'] = [];

            for (const unitDoc of unitsSnap.docs) {
                const topicsSnap = await getDocs(query(collection(db, `courses/${course.id}/units/${unitDoc.id}/topics`), orderBy("title")));
                const topics = topicsSnap.docs.map(topicDoc => {
                    const data = topicDoc.data() as Topic;
                    const hasYazilacaklar = (data.writingContent?.notes?.length || 0) > 0 || (data.writingContent?.conceptDefinitions?.length || 0) > 0;
                    const hasOzet = !!data.htmlContent;
                    return { id: topicDoc.id, ...data, hasYazilacaklarContent: hasYazilacaklar, hasOzetContent: hasOzet } as Topic & { hasYazilacaklarContent: boolean, hasOzetContent: boolean };
                }).filter(topic => topic.hasYazilacaklarContent || topic.hasOzetContent); // Only include topics with content

                if (topics.length > 0) {
                     units.push({
                        id: unitDoc.id,
                        title: unitDoc.data().title,
                        topics
                    });
                }
            }

            if (units.length > 0) {
                 const enrichedCourse: PublicCourse = {
                    id: course.id,
                    title: course.title,
                    classId: course.classId,
                    units: units
                };
                coursesWithContent.push(enrichedCourse);
            }
        }
        
        const groupedByClass: { [classId: string]: PublicCourse[] } = {};
        const generalCourses: PublicCourse[] = [];
        
        coursesWithContent.forEach(course => {
            if (course.classId) {
                if (!groupedByClass[course.classId]) {
                    groupedByClass[course.classId] = [];
                }
                groupedByClass[course.classId].push(course);
            } else {
                generalCourses.push(course);
            }
        });
        
        const classGroups = allClasses
            .map(cls => ({
                name: cls.name,
                courses: groupedByClass[cls.id] || []
            }))
            .filter(group => group.courses.length > 0);
        
        if (generalCourses.length > 0) {
            classGroups.push({ name: "Genel", courses: generalCourses });
        }
        
        return { classGroups: JSON.parse(JSON.stringify(classGroups)) };

    } catch (e: any) {
        console.error("Error fetching public curriculum: ", e);
        return { classGroups: [] };
    }
}
