
'use server';

import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import type { SchoolClass, Course, Unit, Topic } from "@/lib/types";
import fs from 'fs/promises';
import path from 'path';

export type EnrichedCourse = Course & { units: (Unit & { topics: Topic[] })[] };
export type EnrichedClass = SchoolClass & { courses: EnrichedCourse[] };

let CACHED_MANIFEST: { timestamp: number; data: any } | null = null;
const MANIFEST_TTL = 1000 * 60 * 30;

async function getLoadedManifest(): Promise<any | null> {
    if (CACHED_MANIFEST && (Date.now() - CACHED_MANIFEST.timestamp < MANIFEST_TTL)) {
        return CACHED_MANIFEST.data;
    }
    const filePath = path.join(process.cwd(), 'public', 'curriculum', 'manifest.json');
    try {
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(fileContent);
        CACHED_MANIFEST = { timestamp: Date.now(), data };
        return data;
    } catch (e) {
        return null;
    }
}

export async function getActivitiesPageData(): Promise<EnrichedClass[]> {
    try {
        const [manifest, classesSnapshot] = await Promise.all([
            getLoadedManifest(),
            getDocs(query(collection(db, 'classes'), orderBy('createdAt', 'asc'))).catch(() => null)
        ]);

        if (manifest && manifest.classGroups) {
            const firestoreClasses = classesSnapshot 
                ? classesSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as SchoolClass))
                : [];

            const gradeToClassMap = new Map<string, { id: string; name: string }>();
            firestoreClasses.forEach(c => {
                const grade = c.name.replace(/[^0-9]/g, '');
                const formattedName = c.name.includes('Sınıf') ? c.name : `${c.name}. Sınıf`;
                if (grade) {
                    gradeToClassMap.set(grade, { id: c.id, name: formattedName });
                }
                gradeToClassMap.set(c.id, { id: c.id, name: formattedName });
                gradeToClassMap.set(c.name, { id: c.id, name: formattedName });
            });

            const enrichedClasses: EnrichedClass[] = manifest.classGroups.map((cg: any) => {
                const mappedClass = gradeToClassMap.get(cg.name) || {
                    id: cg.name,
                    name: `${cg.name}. Sınıf`
                };

                const courses: EnrichedCourse[] = (cg.courses || []).map((c: any) => ({
                    id: c.id,
                    title: c.title,
                    classId: mappedClass.id,
                    className: mappedClass.name,
                    isTeacherOnly: false,
                    units: (c.units || []).map((u: any) => ({
                        id: u.id,
                        title: u.title,
                        courseId: c.id,
                        topics: (u.topics || []).map((t: any) => ({
                            id: t.id,
                            title: t.title,
                            unitId: u.id,
                        }))
                    }))
                }));

                return {
                    id: mappedClass.id,
                    name: mappedClass.name,
                    grade: cg.name,
                    branches: ['A', 'B', 'C', 'D'],
                    createdAt: new Date().toISOString(),
                    courses,
                } as unknown as EnrichedClass;
            });

            return JSON.parse(JSON.stringify(enrichedClasses));
        }

        // Fallback: Dinamik Firestore
        const classesQuery = query(collection(db, 'classes'), orderBy('createdAt', 'asc'));
        const [fallbackClassesSnapshot, allCoursesSnapshot] = await Promise.all([
            getDocs(classesQuery),
            getDocs(query(collection(db, 'courses'), orderBy('title')))
        ]);

        const allCourses = allCoursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
        const enrichedClasses: EnrichedClass[] = [];

        for (const classDoc of fallbackClassesSnapshot.docs) {
            const classData = { id: classDoc.id, ...classDoc.data() } as SchoolClass;
            const enrichedClass: EnrichedClass = { ...classData, courses: [] };

            const coursesForThisClass = allCourses.filter(course => course.classId === classData.id || !course.classId);

            for (const courseData of coursesForThisClass) {
                const enrichedCourse: EnrichedCourse = { ...courseData, units: [] };

                const unitsSnapshot = await getDocs(query(collection(db, `courses/${courseData.id}/units`), orderBy("title")));
                const unitsData: (Unit & { topics: Topic[] })[] = [];
                for (const unitDoc of unitsSnapshot.docs) {
                    const unit = { id: unitDoc.id, ...unitDoc.data(), topics: [] } as unknown as (Unit & { topics: Topic[] });
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
