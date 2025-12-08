
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
        const [allClassesSnap, allCoursesSnap] = await Promise.all([
            getDocs(query(collection(db, 'classes'))),
            getDocs(collection(db, 'courses'))
        ]);

        const allClasses = allClassesSnap.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as SchoolClass))
            .filter(cls => cls.isPublished !== false); // Filter out unpublished classes

        const allCoursesData = allCoursesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
        
        const coursesWithContent: PublicCourse[] = [];

        for (const course of allCoursesData) {
            // Ensure unpublished courses are skipped
            if (course.isPublished === false) {
                continue;
            }

            const unitsSnap = await getDocs(query(collection(db, `courses/${course.id}/units`), orderBy("title")));
            const unitsWithContent: PublicCourse['units'] = [];

            for (const unitDoc of unitsSnap.docs) {
                const unitData = unitDoc.data();
                if (unitData.isPublished === false) {
                    continue;
                }

                const topicsSnap = await getDocs(query(collection(db, `courses/${course.id}/units/${unitDoc.id}/topics`), orderBy("title")));
                const topics = topicsSnap.docs
                    .map(topicDoc => {
                        const data = topicDoc.data() as Topic;
                        if (data.isPublished === false) {
                            return null;
                        }
                        const hasYazilacaklar = (data.writingContent?.notes?.length || 0) > 0 || (data.writingContent?.conceptDefinitions?.length || 0) > 0;
                        const hasOzet = !!data.htmlContent;
                        
                        if (hasYazilacaklar || hasOzet) {
                             return { id: topicDoc.id, ...data, hasYazilacaklarContent: hasYazilacaklar, hasOzetContent: hasOzet };
                        }
                        return null;
                    })
                    .filter((topic): topic is Topic & { hasYazilacaklarContent: boolean; hasOzetContent: boolean } => topic !== null);
                
                if (topics.length > 0) {
                     unitsWithContent.push({
                        id: unitDoc.id,
                        title: unitData.title,
                        topics: topics as any,
                        isPublished: unitData.isPublished
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
