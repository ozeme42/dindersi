'use server';

import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import type { Course, Unit, Topic, SchoolClass } from "@/lib/types";
import { unstable_noStore as noStore } from 'next/cache';
import { useAuth } from "@/context/auth-context";

export async function getCoursesForSetup(): Promise<Course[]> {
    noStore();
    try {
        const classesSnap = await getDocs(query(collection(db, 'classes'), orderBy('name')));
        const allClasses = classesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolClass));

        const coursesSnap = await getDocs(query(collection(db, 'courses')));
        let allCourses = coursesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));

        // Note: This part runs on the server, so we can't use the useAuth hook directly.
        // The logic to filter by student's class should be passed as an argument if needed.
        // For a general setup page available to all students, we might not need to filter by class initially.
        
        const coursesWithData = await Promise.all(allCourses.map(async (course) => {
            const unitsSnap = await getDocs(query(collection(db, `courses/${course.id}/units`)));
            const units = await Promise.all(unitsSnap.docs.map(async (unitDoc) => {
                const topicsSnap = await getDocs(query(collection(db, `courses/${course.id}/units/${unitDoc.id}/topics`)));
                const topics = topicsSnap.docs.map(topicDoc => ({ id: topicDoc.id, ...topicDoc.data() } as Topic));
                return { id: unitDoc.id, ...unitDoc.data(), topics } as Unit;
            }));
            return { ...course, units };
        }));

        return JSON.parse(JSON.stringify(coursesWithData));
    } catch (e) {
        console.error("Error fetching courses for setup: ", e);
        return [];
    }
}
