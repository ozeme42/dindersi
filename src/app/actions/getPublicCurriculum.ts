
'use server';

import { db } from "@/lib/firebase";
import { collection, query, getDocs, orderBy } from "firebase/firestore";
import type { Course, Unit, Topic, SchoolClass } from "@/lib/types";
import { unstable_noStore as noStore } from 'next/cache';

export type CourseGroup = {
    title: string;
    courses: (Course & { units: (Unit & { topics: Topic[] })[] })[];
};

type EnrichedCourse = Course & {
    className: string;
    units: (Unit & {
        topics: (Topic & { hasYazilacaklarContent: boolean; hasOzetContent: boolean; })[];
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
        const allClasses = classesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolClass));
        const classMap = new Map(allClasses.map(c => [c.id, c.name]));

        const enrichedCourses: EnrichedCourse[] = [];

        for (const course of allCoursesData) {
            if (course.isTeacherOnly) continue;

            const unitsSnap = await getDocs(query(collection(db, `courses/${course.id}/units`), orderBy("title")));
            const units: EnrichedCourse['units'] = [];

            for (const unitDoc of unitsSnap.docs) {
                const topicsSnap = await getDocs(query(collection(db, `courses/${course.id}/units/${unitDoc.id}/topics`), orderBy("title")));
                const topics = topicsSnap.docs.map(topicDoc => {
                    const data = topicDoc.data() as Topic;
                    const hasYazilacaklar = (data.writingContent?.notes?.length || 0) > 0 || (data.writingContent?.conceptDefinitions?.length || 0) > 0;
                    const hasOzet = !!data.htmlContent;
                    return { id: topicDoc.id, ...data, hasYazilacaklarContent: hasYazilacaklar, hasOzetContent: hasOzet };
                }).filter(topic => topic.hasYazilacaklarContent || topic.hasOzetContent);

                if (topics.length > 0) {
                    units.push({
                        id: unitDoc.id,
                        title: unitDoc.data().title,
                        topics: topics
                    });
                }
            }
            
            // Also fetch topics directly under the course for summer school
            if (course.isSummerSchool) {
                 const topicsSnap = await getDocs(query(collection(db, `courses/${course.id}/topics`), orderBy("title")));
                 const topics = topicsSnap.docs.map(topicDoc => {
                    const data = topicDoc.data() as Topic;
                    const hasYazilacaklar = (data.writingContent?.notes?.length || 0) > 0 || (data.writingContent?.conceptDefinitions?.length || 0) > 0;
                    const hasOzet = !!data.htmlContent;
                    return { id: topicDoc.id, ...data, hasYazilacaklarContent: hasYazilacaklar, hasOzetContent: hasOzet };
                }).filter(topic => topic.hasYazilacaklarContent || topic.hasOzetContent);

                 if (topics.length > 0) {
                    // Add a placeholder "Genel" unit for summer school topics
                     units.push({
                        id: 'summer-topics',
                        title: 'Konular',
                        topics: topics
                    });
                 }
            }


            if (units.length > 0) {
                enrichedCourses.push({
                    ...course,
                    className: course.classId ? (classMap.get(course.classId) || 'Genel') : 'Genel',
                    units: units,
                });
            }
        }
        
        const groupedByTitle: { [title: string]: EnrichedCourse[] } = {};

        enrichedCourses.forEach(course => {
            let courseTitle = course.title;
             if (courseTitle.toUpperCase() === 'DKAB') {
                courseTitle = 'Din Kültürü ve Ahlak Bilgisi';
            } else if (courseTitle.toUpperCase() === 'SİYER') {
                courseTitle = 'Peygamberimizin Hayatı (Siyer)';
            }
            if (!groupedByTitle[courseTitle]) {
                groupedByTitle[courseTitle] = [];
            }
            groupedByTitle[courseTitle].push(course);
        });
        
        const courseGroups: CourseGroup[] = Object.keys(groupedByTitle).map(title => ({
            title: title,
            courses: groupedByTitle[title].sort((a, b) => {
                const aName = a.className || '';
                const bName = b.className || '';
                return aName.localeCompare(bName, 'tr', { numeric: true });
            })
        }));

        return { courseGroups: JSON.parse(JSON.stringify(courseGroups)) };

    } catch (e: any) {
        console.error("Error fetching public curriculum: ", e);
        return { courseGroups: [] };
    }
}
