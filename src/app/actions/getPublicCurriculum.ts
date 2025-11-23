
'use server';

import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, Timestamp } from "firebase/firestore";
import type { Course, Unit, Topic } from "@/lib/types";
import { unstable_noStore as noStore } from 'next/cache';

export type CourseGroup = {
    title: string;
    courses: (Omit<Course, 'units'> & {
        units: (Omit<Unit, 'topics'> & {
            topics: (Topic & { hasYazilacaklarContent: boolean; hasOzetContent: boolean; })[]
        })[]
    })[];
};

export async function getPublicCurriculum(): Promise<{ courseGroups: CourseGroup[] }> {
    noStore();
    try {
        const [coursesSnap, classesSnap] = await Promise.all([
            getDocs(query(collection(db, 'courses'))),
            getDocs(query(collection(db, 'classes'), orderBy('createdAt', 'asc')))
        ]);

        const allCoursesData = coursesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
        const allClasses = classesSnap.docs.map(doc => ({ id: doc.id, name: doc.data().name, branches: doc.data().branches } as { id: string, name: string, branches: string[] }));
        
        const coursesWithContent = await Promise.all(allCoursesData.map(async (course) => {
            const unitsSnap = await getDocs(query(collection(db, `courses/${course.id}/units`), orderBy("title")));
            const units = await Promise.all(unitsSnap.docs.map(async (unitDoc) => {
                const topicsSnap = await getDocs(query(collection(db, `courses/${course.id}/units/${unitDoc.id}/topics`), orderBy("title")));
                const topics = topicsSnap.docs.map(topicDoc => {
                    const data = topicDoc.data() as Topic;
                    const hasYazilacaklar = !!(data.writingContent?.notes?.length || data.writingContent?.conceptDefinitions?.length);
                    const hasOzet = !!data.htmlContent;
                    return { id: topicDoc.id, ...data, hasYazilacaklarContent: hasYazilacaklar, hasOzetContent: hasOzet };
                });
                
                return {
                    id: unitDoc.id,
                    title: unitDoc.data().title,
                    topics
                };
            }));

            const courseClass = allClasses.find(c => c.id === course.classId);

            return {
                id: course.id,
                title: course.title,
                classId: course.classId,
                className: courseClass?.name || 'Genel',
                units
            };
        }));
        
        const groupedByTitle: { [title: string]: any[] } = {};
        
        coursesWithContent.forEach(course => {
            let groupTitle = course.title;
             if (groupTitle.toUpperCase() === 'DKAB') {
                groupTitle = 'Din Kültürü ve Ahlak Bilgisi';
            } else if (groupTitle.toUpperCase() === 'SİYER') {
                groupTitle = 'Peygamberimizin Hayatı (Siyer)';
            }
            
            if (!groupedByTitle[groupTitle]) {
                groupedByTitle[groupTitle] = [];
            }
            groupedByTitle[groupTitle].push(course);
        });

        const courseGroups: CourseGroup[] = Object.keys(groupedByTitle).map(title => ({
            title,
            courses: groupedByTitle[title].sort((a,b) => a.className.localeCompare(b.className))
        }));
        
        return { courseGroups: JSON.parse(JSON.stringify(courseGroups)) };

    } catch (e: any) {
        console.error("Error fetching public curriculum: ", e);
        return { courseGroups: [] };
    }
}
