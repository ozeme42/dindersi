
'use server';

import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import type { SchoolClass, Course, Unit, Topic } from "@/lib/types";

export type EnrichedCourse = Course & { units: (Unit & { topics: Topic[] })[] };
export type EnrichedClass = SchoolClass & { courses: EnrichedCourse[] };

export async function getActivitiesPageData(): Promise<EnrichedClass[]> {
    try {
        const classesQuery = query(collection(db, 'classes'), orderBy('createdAt', 'asc'));
        const [classesSnapshot, allCoursesSnapshot] = await Promise.all([
            getDocs(classesQuery),
            getDocs(query(collection(db, 'courses'), orderBy('title')))
        ]);

        const allCourses = allCoursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
        const enrichedClasses: EnrichedClass[] = [];

        for (const classDoc of classesSnapshot.docs) {
            const classData = { id: classDoc.id, ...classDoc.data() } as SchoolClass;
            const enrichedClass: EnrichedClass = { ...classData, courses: [] };

            const coursesForThisClass = allCourses.filter(course => course.classId === classData.id || !course.classId);

            for (const courseData of coursesForThisClass) {
                const enrichedCourse: EnrichedCourse = { ...courseData, units: [] };

                const unitsSnapshot = await getDocs(query(collection(db, `courses/${courseData.id}/units`), orderBy("title")));
                const unitsData: (Unit & { topics: Topic[] })[] = [];
                for (const unitDoc of unitsSnapshot.docs) {
                    const unit = { id: unitDoc.id, ...unitDoc.data(), topics: [] } as (Unit & { topics: Topic[] });
                    const topicsSnapshot = await getDocs(query(collection(db, `courses/${courseData.id}/units/${unitDoc.id}/topics`), orderBy("title")));
                    unit.topics = topicsSnapshot.docs.map(topicDoc => ({ id: topicDoc.id, ...topicDoc.data() } as Topic));
                    unitsData.push(unit);
                }
                enrichedCourse.units = unitsData;
                enrichedClass.courses.push(enrichedCourse);
            }
            enrichedClasses.push(enrichedClass);
        }

        return JSON.parse(JSON.stringify(enrichedClasses));
    } catch (error) {
        console.error("Error fetching activities page data: ", error);
        return [];
    }
}
