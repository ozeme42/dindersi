

'use server';

// This file is no longer used for the public curriculum page.
// The page now fetches the static manifest.json directly.
// This file is kept for potential future use or reference but can be deleted.

import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, Timestamp } from "firebase/firestore";
import type { Course, Unit, Topic, SchoolClass } from "@/lib/types";
import { unstable_noStore as noStore } from 'next/cache';

export type PublicCourse = Omit<Course, 'units'> & {
    units: (Omit<Unit, 'topics'> & {
        topics: (Topic & { hasYazilacaklarContent: boolean; hasOzetContent: boolean })[]
        hasUnitOzet: boolean;
    })[]
};

export type PublicClass = Omit<SchoolClass, 'courses'> & {
    courses: PublicCourse[];
};


export async function getPublicCurriculum(): Promise<{ classGroups: { name: string; courses: PublicCourse[] }[] }> {
    noStore();
    try {
        const [allClassesSnap, allCoursesSnap, allActivityItemsSnap] = await Promise.all([
            getDocs(query(collection(db, 'classes'))),
            getDocs(collection(db, 'courses')),
            getDocs(query(collection(db, 'activityItems'), where('type', '==', 'definition')))
        ]);

        const allDefinitions = new Set(allActivityItemsSnap.docs.map(doc => doc.data().topicId));

        const allClasses = allClassesSnap.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as SchoolClass))
            .filter(cls => cls.isPublished !== false); 

        const allCoursesData = allCoursesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
        
        const coursesWithContent: PublicCourse[] = [];

        for (const course of allCoursesData) {
            if (course.isPublished === false) {
                continue;
            }

            const unitsSnap = await getDocs(query(collection(db, `courses/${course.id}/units`), orderBy("title")));
            const unitsWithContent: PublicCourse['units'] = [];

            for (const unitDoc of unitsSnap.docs) {
                const unitData = unitDoc.data() as Unit;
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
                        const hasYazilacaklar = (data.writingContent?.notes?.length || 0) > 0 || allDefinitions.has(topicDoc.id);
                        const hasOzet = !!data.htmlContent;
                        
                        if (hasYazilacaklar || hasOzet) {
                             return { id: topicDoc.id, ...data, hasYazilacaklarContent: hasYazilacaklar, hasOzetContent: hasOzet };
                        }
                        return null;
                    })
                    .filter((topic): topic is Topic & { hasYazilacaklarContent: boolean; hasOzetContent: boolean } => topic !== null);
                
                const hasUnitOzet = !!unitData.htmlContent;

                if (topics.length > 0 || hasUnitOzet) {
                     unitsWithContent.push({
                        id: unitDoc.id,
                        title: unitData.title,
                        topics: topics as any,
                        isPublished: unitData.isPublished,
                        hasUnitOzet: hasUnitOzet
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
            const generalGroup = classGroups.find(g => g.name === 'Genel');
            if (generalGroup) {
                generalGroup.courses.push(...generalCourses);
            } else {
                classGroups.push({ name: "Genel", courses: generalCourses });
            }
        }
        
        return { classGroups: JSON.parse(JSON.stringify(classGroups)) };

    } catch (e: any) {
        console.error("Error fetching public curriculum: ", e);
        return { classGroups: [] };
    }
}
