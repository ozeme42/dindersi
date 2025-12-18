
'use server';

import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, getDocs, orderBy } from "firebase/firestore";
import type { Topic, SchoolClass, Course, Unit, UserProfile } from "@/lib/types";
import { unstable_noStore as noStore } from 'next/cache';

export type EnrichedCourse = Omit<Course, 'units'> & {
    units: (Omit<Unit, 'topics'> & {
        topics: Topic[]
    })[]
};

const isStaticBuild = process.env.NEXT_PUBLIC_STATIC_BUILD === 'true';

async function fetchStaticCurriculum(): Promise<EnrichedCourse[]> {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/curriculum/manifest.json`);
    if (!res.ok) {
        throw new Error("Failed to fetch static curriculum manifest.");
    }
    const manifest = await res.json();
    
    const coursePromises = manifest.courseGroups.flatMap((group: any) => group.courses.map(async (courseInfo: any) => {
        const courseRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/curriculum/${courseInfo.file}`);
        if (!courseRes.ok) return null;
        return courseRes.json();
    }));

    const courses = (await Promise.all(coursePromises)).filter(Boolean);
    return courses as EnrichedCourse[];
}

export async function getCurriculumForSelection(userId: string, dataType: 'games' | 'yazilacaklar' | 'ozetler'): Promise<EnrichedCourse[]> {
    noStore();
    try {
        if (isStaticBuild) {
            let allCourses = await fetchStaticCurriculum();
            
            const enrichedCourses: EnrichedCourse[] = await Promise.all(allCourses.map(async (course) => {
                const enrichedUnits = await Promise.all((course.units || []).map(async (unit) => {
                    const topicsWithContent = await Promise.all(unit.topics.map(async (topic) => {
                         if (!(topic.isPublished ?? true)) return null;

                        if (dataType === 'yazilacaklar') {
                            const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/curriculum/yazilacaklar/${topic.id}.json`);
                            return res.ok ? topic : null;
                        }
                        if (dataType === 'ozetler') {
                            return topic.htmlContent ? topic : null;
                        }
                        return topic; // For games, include all published topics
                    }));
                    
                    const filteredTopics = topicsWithContent.filter(Boolean) as Topic[];
                    if (filteredTopics.length > 0) {
                        return { ...unit, topics: filteredTopics };
                    }
                    return null;
                }));
                const filteredUnits = enrichedUnits.filter(Boolean) as EnrichedCourse['units'];
                if (filteredUnits.length > 0) {
                    return { ...course, units: filteredUnits };
                }
                return null;
            }));

            return enrichedCourses.filter(Boolean) as EnrichedCourse[];
        }

        // --- DYNAMIC (FIRESTORE) LOGIC ---
        const userDoc = await getDoc(doc(db, "users", userId));
        if (!userDoc.exists()) {
            console.error("No user found with ID:", userId);
            return [];
        }
        const student = userDoc.data() as UserProfile;
        const studentClassName = student.class?.split(' - ')[0];

        const coursesQuery = query(collection(db, 'courses'));
        const coursesSnapshot = await getDocs(coursesQuery);
        let relevantCourses = coursesSnapshot.docs
            .map(d => ({ id: d.id, ...d.data() } as Course))
            .filter(c => !c.isTeacherOnly && (c.isPublished ?? true));

        if (studentClassName) {
            relevantCourses = relevantCourses.filter(course =>
                course.className?.startsWith(studentClassName) || !course.className || course.className === 'Genel'
            );
        } else {
            relevantCourses = relevantCourses.filter(course => !course.className || course.className === 'Genel');
        }

        const enrichedCourses: EnrichedCourse[] = [];
        for (const course of relevantCourses) {
            const unitsSnapshot = await getDocs(query(collection(db, `courses/${course.id}/units`), orderBy("title")));
            const enrichedUnits: EnrichedCourse['units'] = [];

            for (const unitDoc of unitsSnapshot.docs) {
                const unitData = unitDoc.data() as Unit;
                if (!(unitData.isPublished ?? true)) continue;

                const topicsSnapshot = await getDocs(query(collection(db, `courses/${course.id}/units/${unitDoc.id}/topics`), orderBy("title")));
                
                const topicsWithContent = topicsSnapshot.docs
                    .map(topicDoc => ({ id: topicDoc.id, ...topicDoc.data() } as Topic))
                    .filter(topicData => {
                        if (!(topicData.isPublished ?? true)) return false;

                        if (dataType === 'yazilacaklar') {
                            return (topicData.writingContent?.notes?.length || 0) > 0 || (topicData.writingContent?.conceptDefinitions?.length || 0) > 0;
                        }
                        if (dataType === 'ozetler') {
                            return !!topicData.htmlContent;
                        }
                        return true; 
                    });


                if (topicsWithContent.length > 0) {
                    enrichedUnits.push({
                        id: unitDoc.id,
                        title: unitDoc.data().title,
                        topics: topicsWithContent,
                        isPublished: unitData.isPublished
                    });
                }
            }

            if (enrichedUnits.length > 0) {
                enrichedCourses.push({
                    ...course,
                    units: enrichedUnits,
                });
            }
        }
        
        enrichedCourses.sort((a, b) => {
            if (a.title.includes('Din Kültürü')) return -1;
            if (b.title.includes('Din Kültürü')) return 1;
            return a.title.localeCompare(b.title);
        });

        return JSON.parse(JSON.stringify(enrichedCourses));
        
    } catch (e: any) {
        console.error("Error getting curriculum for selection: ", e);
        return [];
    }
}
