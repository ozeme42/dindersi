
'use server';

import { db } from "@/lib/firebase";
import { collection, query, getDocs, orderBy, Timestamp, where } from "firebase/firestore";
import type { Course, Unit, Topic, SchoolClass } from "@/lib/types";
import { unstable_noStore as noStore } from 'next/cache';

export type PublicCourse = Omit<Course, 'units' | 'className'> & {
    className: string;
    units: (Omit<Unit, 'topics'> & {
        topics: (Topic & { hasYazilacaklarContent: boolean; hasOzetContent: boolean })[]
    })[]
};

export type CourseGroup = {
    title: string;
    courses: PublicCourse[];
}

export async function getPublicCurriculum(): Promise<{ courseGroups: CourseGroup[] }> {
    noStore();
    try {
        const [coursesSnap, classesSnap] = await Promise.all([
            getDocs(query(collection(db, 'courses'))),
            getDocs(query(collection(db, 'classes'), orderBy('createdAt', 'asc')))
        ]);

        const allCoursesData = coursesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
        const allClasses = classesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolClass));
        const classMap = new Map(allClasses.map(c => [c.id, c.name]));
        
        const coursesWithContent: PublicCourse[] = [];

        for (const course of allCoursesData) {
            const unitsSnap = await getDocs(query(collection(db, `courses/${course.id}/units`), orderBy("title")));
            const units: PublicCourse['units'] = [];

            for (const unitDoc of unitsSnap.docs) {
                const topicsSnap = await getDocs(query(collection(db, `courses/${course.id}/units/${unitDoc.id}/topics`), orderBy("title")));
                const topics = topicsSnap.docs.map(topicDoc => {
                    const data = topicDoc.data() as Topic;
                    const hasYazilacaklar = (data.writingContent?.notes?.length || 0) > 0;
                    const hasOzet = !!data.htmlContent;
                    return { id: topicDoc.id, ...data, hasYazilacaklarContent: hasYazilacaklar, hasOzetContent: hasOzet };
                });
                
                units.push({
                    id: unitDoc.id,
                    title: unitDoc.data().title,
                    topics
                });
            }

            const enrichedCourse: PublicCourse = {
                id: course.id,
                title: course.title,
                classId: course.classId,
                className: classMap.get(course.classId || '') || 'Genel',
                units: units
            };
            coursesWithContent.push(enrichedCourse);
        }
        
        const groupedByCourseTitle: { [title: string]: PublicCourse[] } = {};
        
        coursesWithContent.forEach(course => {
            if (!groupedByCourseTitle[course.title]) {
                groupedByCourseTitle[course.title] = [];
            }
            groupedByCourseTitle[course.title].push(course);
        });

        const courseGroups = Object.keys(groupedByCourseTitle).map(title => ({
            title,
            courses: groupedByCourseTitle[title].sort((a, b) => (a.className).localeCompare(b.className))
        })).sort((a,b) => a.title.localeCompare(b.title));
        
        return { courseGroups: JSON.parse(JSON.stringify(courseGroups)) };

    } catch (e: any) {
        console.error("Error fetching public curriculum: ", e);
        return { courseGroups: [] };
    }
}
