
'use server';

import { db } from "@/lib/firebase";
import { collection, query, getDocs, orderBy, Timestamp, where } from "firebase/firestore";
import type { Course, Unit, Topic, SchoolClass } from "@/lib/types";
import { unstable_noStore as noStore } from 'next/cache';

export type CourseGroup = {
    title: string;
    courses: (Omit<Course, 'units'> & {
        className: string;
        units: (Omit<Unit, 'topics'> & {
            topics: (Topic & { hasYazilacaklarContent: boolean; hasOzetContent: boolean })[]
        })[]
    })[];
};


export async function getPublicCurriculum(): Promise<{ courseGroups: CourseGroup[] }> {
    noStore();
    try {
        const [coursesSnap, classesSnap] = await Promise.all([
            getDocs(query(collection(db, 'courses'), where('isTeacherOnly', '!=', true))),
            getDocs(query(collection(db, 'classes'), orderBy('createdAt', 'asc')))
        ]);

        const allCoursesData = coursesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
        const allClasses = classesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolClass));
        const classMap = new Map(allClasses.map(c => [c.id, c.name]));

        const groupedByTitle: { [title: string]: CourseGroup['courses'][0][] } = {};

        for (const course of allCoursesData) {
            const courseClassName = course.classId ? classMap.get(course.classId) || 'Genel' : 'Genel';
            
            const unitsSnap = await getDocs(query(collection(db, `courses/${course.id}/units`), orderBy("title")));
            const units: CourseGroup['courses'][0]['units'] = [];

            for (const unitDoc of unitsSnap.docs) {
                const topicsSnap = await getDocs(query(collection(db, `courses/${course.id}/units/${unitDoc.id}/topics`), orderBy("title")));
                
                const topics = topicsSnap.docs.map(topicDoc => {
                    const data = topicDoc.data() as Topic;
                    const hasYazilacaklar = !!(data.writingContent && (data.writingContent.notes?.length || 0) > 0);
                    const hasOzet = !!data.htmlContent;
                    return { id: topicDoc.id, ...data, hasYazilacaklarContent: hasYazilacaklar, hasOzetContent: hasOzet };
                });

                units.push({
                    id: unitDoc.id,
                    title: unitDoc.data().title,
                    topics
                });
            }

            // Only add the course if it has units with topics
            if (units.some(u => u.topics.length > 0)) {
                let groupTitle = course.title;
                if (groupTitle.toUpperCase() === 'DKAB') {
                    groupTitle = 'Din Kültürü ve Ahlak Bilgisi';
                } else if (groupTitle.toUpperCase() === 'SİYER') {
                    groupTitle = 'Peygamberimizin Hayatı (Siyer)';
                }

                if (!groupedByTitle[groupTitle]) {
                    groupedByTitle[groupTitle] = [];
                }
                
                groupedByTitle[groupTitle].push({
                    ...course,
                    className: courseClassName,
                    units,
                });
            }
        }
        
        const courseGroups: CourseGroup[] = Object.keys(groupedByTitle)
            .sort((a,b) => a.localeCompare(b))
            .map(title => ({
                title: title,
                courses: groupedByTitle[title].sort((a,b) => (a.className || '').localeCompare(b.className || '')),
            }));

        return { courseGroups: JSON.parse(JSON.stringify(courseGroups)) };

    } catch (e: any) {
        console.error("Error fetching public curriculum: ", e);
        return { courseGroups: [] };
    }
}
