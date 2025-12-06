
'use server';

import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, Timestamp } from "firebase/firestore";
import type { Course, Unit, Topic, SchoolClass } from "@/lib/types";
import { unstable_noStore as noStore } from 'next/cache';

// Helper function to serialize Firestore Timestamps to JSON-compatible format
const serializeData = (doc: any) => {
    const data = doc.data();
    for (const key in data) {
        if (data[key] instanceof Timestamp) {
            data[key] = data[key].toDate().toISOString();
        }
    }
    return { id: doc.id, ...data };
};

export async function getCoursesForSetup(): Promise<(Course & { units: (Unit & { topics: Topic[] })[] })[]> {
    noStore();
    try {
        const coursesQuery = query(collection(db, 'courses'));
        const coursesSnapshot = await getDocs(coursesQuery);

        const coursesData = await Promise.all(coursesSnapshot.docs.map(async (courseDoc) => {
            const course = serializeData(courseDoc) as Course & { units: (Unit & { topics: Topic[] })[] };

            const unitsQuery = query(collection(db, `courses/${course.id}/units`), orderBy('title'));
            const unitsSnapshot = await getDocs(unitsQuery);
            
            course.units = await Promise.all(unitsSnapshot.docs.map(async (unitDoc) => {
                const unit = serializeData(unitDoc) as Unit & { topics: Topic[] };
                
                const topicsQuery = query(collection(db, `courses/${course.id}/units/${unit.id}/topics`), orderBy('title'));
                const topicsSnapshot = await getDocs(topicsQuery);
                unit.topics = topicsSnapshot.docs.map(topicDoc => serializeData(topicDoc) as Topic);

                return unit;
            }));

            return course;
        }));
        
        return coursesData;

    } catch (e: any) {
        console.error("Error fetching courses for setup: ", e);
        return [];
    }
}
