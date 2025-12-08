
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
        // HATA DÜZELTME: Sadece yayınlanmış olanları değil, TÜM sınıfları ve dersleri çek.
        // Filtrelemeyi daha sonra, içeriklerin yayın durumuna göre yapacağız.
        const [allCoursesSnap, allClassesSnap] = await Promise.all([
            getDocs(collection(db, 'courses')),
            getDocs(query(collection(db, 'classes'), orderBy('createdAt', 'asc')))
        ]);

        const allCoursesData = allCoursesSnap.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as Course))
            .filter(course => course.isPublished ?? true); // Yalnızca yayınlanmış dersleri al

        const allClasses = allClassesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolClass));
        
        const coursesWithContent: PublicCourse[] = [];

        for (const course of allCoursesData) {
            const unitsSnap = await getDocs(query(collection(db, `courses/${course.id}/units`), where('isPublished', '==', true), orderBy("title")));
            const unitsWithContent: PublicCourse['units'] = [];

            for (const unitDoc of unitsSnap.docs) {
                const topicsSnap = await getDocs(query(collection(db, `courses/${course.id}/units/${unitDoc.id}/topics`), where('isPublished', '==', true), orderBy("title")));
                const topics = topicsSnap.docs.map(topicDoc => {
                    const data = topicDoc.data() as Topic;
                    const hasYazilacaklar = (data.writingContent?.notes?.length || 0) > 0 || (data.writingContent?.conceptDefinitions?.length || 0) > 0;
                    const hasOzet = !!data.htmlContent;
                    return { id: topicDoc.id, ...data, hasYazilacaklarContent: hasYazilacaklar, hasOzetContent: hasOzet };
                }).filter(topic => (topic as any).hasYazilacaklarContent || (topic as any).hasOzetContent || (topic.steps && topic.steps.length > 0)); // Include topics if they have any content for students

                if (topics.length > 0) {
                     unitsWithContent.push({
                        id: unitDoc.id,
                        title: unitDoc.data().title,
                        topics: topics as any,
                        isPublished: unitDoc.data().isPublished
                    });
                }
            }

            if (unitsWithContent.length > 0) {
                 const enrichedCourse: PublicCourse = {
                    id: course.id,
                    title: course.title,
                    classId: course.classId,
                    isPublished: course.isPublished,
                    units: unitsWithContent
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
            // HATA DÜZELTME: Sadece yayınlanmış sınıfları değil, tümünü al ve sonra filtrele
            .filter(cls => cls.isPublished ?? true) // Gizlenmiş sınıfları burada filtrele
            .map(cls => ({
                name: cls.name,
                courses: groupedByClass[cls.id] || []
            }))
            .filter(group => group.courses.length > 0); // Sadece içinde ders olan sınıfları göster
        
        if (generalCourses.length > 0) {
            classGroups.push({ name: "Genel", courses: generalCourses });
        }
        
        return { classGroups: JSON.parse(JSON.stringify(classGroups)) };

    } catch (e: any) {
        console.error("Error fetching public curriculum: ", e);
        return { classGroups: [] };
    }
}
