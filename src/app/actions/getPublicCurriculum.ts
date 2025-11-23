
'use server';

import { db } from "@/lib/firebase";
import { collection, query, getDocs, orderBy, where } from "firebase/firestore";
import type { Course, Unit, Topic, SchoolClass } from "@/lib/types";
import { unstable_noStore as noStore } from 'next/cache';

export type CourseGroup = {
    title: string;
    courses: PublicCourse[];
};

export type PublicCourse = Omit<Course, 'units'> & {
    units: (Omit<Unit, 'topics'> & {
        topics: (Topic & { hasYazilacaklarContent: boolean; hasOzetContent: boolean })[]
    })[]
};

export async function getPublicCurriculum(): Promise<CourseGroup[]> {
    noStore();
    try {
        const [coursesSnap, classesSnap] = await Promise.all([
            getDocs(query(collection(db, 'courses'))),
            getDocs(query(collection(db, 'classes'), orderBy('createdAt', 'asc')))
        ]);

        const allCoursesData = coursesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
        const allClassNames = new Map(classesSnap.docs.map(doc => [doc.id, doc.data().name]));

        const coursesWithContent: (PublicCourse & { className?: string })[] = [];

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
                });
                
                units.push({
                    id: unitDoc.id,
                    title: unitDoc.data().title,
                    topics
                });
            }
            
            const enrichedCourse: PublicCourse & { className?: string } = {
                id: course.id,
                title: course.title,
                classId: course.classId,
                className: course.classId ? allClassNames.get(course.classId) : "Genel",
                units: units
            };
            coursesWithContent.push(enrichedCourse);
        }
        
        const groupedByCourseTitle: { [title: string]: (PublicCourse & { className?: string })[] } = {};

        coursesWithContent.forEach(course => {
            let courseTitle = course.title;
            if (courseTitle.toUpperCase() === 'DKAB') {
                courseTitle = 'Din Kültürü ve Ahlak Bilgisi';
            } else if (courseTitle.toUpperCase() === 'SİYER') {
                courseTitle = 'Peygamberimizin Hayatı (Siyer)';
            }
            if (!groupedByCourseTitle[courseTitle]) {
                groupedByCourseTitle[courseTitle] = [];
            }
            groupedByCourseTitle[courseTitle].push(course);
        });

        const finalGroups: CourseGroup[] = Object.keys(groupedByCourseTitle).map(title => ({
            title: title,
            courses: groupedByCourseTitle[title].sort((a,b) => (a.className || '').localeCompare(b.className || '', 'tr', {numeric: true})),
        }));
        
        return JSON.parse(JSON.stringify(finalGroups));

    } catch (e: any) {
        console.error("Error fetching public curriculum: ", e);
        return [];
    }
}
