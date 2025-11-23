
'use server';

import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, Timestamp } from "firebase/firestore";
import type { Course, Unit, Topic, SchoolClass } from "@/lib/types";
import { unstable_noStore as noStore } from 'next/cache';

export type CourseGroup = {
    title: string;
    courses: (Omit<Course, 'units' | 'className'> & {
        className: string;
        units: (Omit<Unit, 'topics'> & {
            topics: (Topic & { hasYazilacaklarContent: boolean; hasOzetContent: boolean })[]
        })[]
    })[]
};

export async function getPublicCurriculum(): Promise<{ courseGroups: CourseGroup[] }> {
    noStore();
    try {
        const [coursesSnap, classesSnap] = await Promise.all([
            getDocs(query(collection(db, 'courses'))),
            getDocs(query(collection(db, 'classes'), orderBy('createdAt', 'asc')))
        ]);

        const allCoursesData = coursesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
        const allClassesData = classesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolClass));
        const classMap = new Map(allClassesData.map(c => [c.id, c.name]));

        const courseGroups: { [title: string]: any[] } = {};

        for (const course of allCoursesData) {
            const unitsSnap = await getDocs(query(collection(db, `courses/${course.id}/units`), orderBy("title")));
            const units: CourseGroup['courses'][0]['units'] = [];

            for (const unitDoc of unitsSnap.docs) {
                const topicsSnap = await getDocs(query(collection(db, `courses/${course.id}/units/${unitDoc.id}/topics`), orderBy("title")));
                
                const topics = topicsSnap.docs.map(topicDoc => {
                    const data = topicDoc.data() as Topic;
                    const hasYazilacaklar = (data.writingContent?.notes?.length || 0) > 0 || (data.writingContent?.conceptDefinitions?.length || 0) > 0;
                    const hasOzet = !!data.htmlContent;
                    return { 
                        id: topicDoc.id, 
                        ...data, 
                        hasYazilacaklarContent: hasYazilacaklar, 
                        hasOzetContent: hasOzet 
                    };
                });
                
                // Only add unit if it has topics
                if (topics.length > 0) {
                     units.push({
                        id: unitDoc.id,
                        ...unitDoc.data(),
                        topics
                    } as any);
                }
            }
            
            // Only add course if it has units
            if (units.length > 0) {
                const groupTitle = course.title || "Diğer";
                const courseClassName = course.classId ? classMap.get(course.classId) || 'Genel' : 'Genel';
                const enrichedCourse = {
                    ...course,
                    className: courseClassName,
                    units: units
                };
                
                if (!courseGroups[groupTitle]) {
                    courseGroups[groupTitle] = [];
                }
                courseGroups[groupTitle].push(enrichedCourse);
            }
        }
        
        const finalCourseGroups = Object.keys(courseGroups).map(title => {
            return {
                title,
                courses: courseGroups[title].sort((a,b) => (a.className || '').localeCompare(b.className || ''))
            };
        });

        return { courseGroups: JSON.parse(JSON.stringify(finalCourseGroups)) };

    } catch (e: any) {
        console.error("Error fetching public curriculum: ", e);
        return { courseGroups: [] };
    }
}
