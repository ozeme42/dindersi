

'use server';

import { getAdminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import type { Topic, Unit, Course, SchoolClass, Question, LessonStep } from "@/lib/types";

// Tip tanımlarını Enriched versiyonları için genişletelim
type EnrichedTopic = Topic & { questionCount?: number, hasFlowContent?: boolean };
type EnrichedUnit = Unit & { topics: EnrichedTopic[], questionCount?: number, htmlContent?: string, steps?: any[], hasFlowContent?: boolean };
type EnrichedCourse = Course & { units: EnrichedUnit[], className?: string };
type EnrichedClass = SchoolClass & { courses: EnrichedCourse[] };

// Helper to serialize any data, converting Timestamps
const serialize = (data: any): any => {
    if (!data) return data;
    if (Array.isArray(data)) {
        return data.map(serialize);
    }
    if (data instanceof Timestamp) {
        return data.toDate().toISOString();
    }
    if (typeof data === 'object' && Object.prototype.toString.call(data) === '[object Object]') {
        const newObj: { [key: string]: any } = {};
        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                newObj[key] = serialize(data[key]);
            }
        }
        return newObj;
    }
    return data;
};

import { unstable_cache } from 'next/cache';

const getCachedFlowData = unstable_cache(
    async (): Promise<EnrichedClass[]> => {
        const db = getAdminDb();
        const [classesSnap, coursesSnap, unitsSnap, topicsSnap] = await Promise.all([
            db.collection('classes').get(),
            db.collection('courses').select('title', 'classId', 'isTeacherOnly', 'order').get(),
            db.collectionGroup('units').select('title', 'steps', 'isPublished').get(),
            db.collectionGroup('topics').select('title', 'steps', 'isPublished').get(),
        ]);
        
        const topicsByUnit = new Map<string, EnrichedTopic[]>();
        topicsSnap.forEach(doc => {
            const topic = { id: doc.id, ...doc.data() } as Topic;
            const parentUnitPath = doc.ref.parent.parent?.path;
            if (parentUnitPath) {
                const unitId = doc.ref.parent.parent!.id;
                if (!topicsByUnit.has(unitId)) {
                    topicsByUnit.set(unitId, []);
                }
                const hasFlow = (topic.steps || []).length > 0;
                topicsByUnit.get(unitId)!.push({ ...topic, hasFlowContent: hasFlow });
            }
        });
        
        const unitsByCourse = new Map<string, EnrichedUnit[]>();
        unitsSnap.forEach(doc => {
            const unit = { id: doc.id, ...doc.data() } as Unit;
            const parentCoursePath = doc.ref.parent.parent?.path;
            if(parentCoursePath) {
                const courseId = doc.ref.parent.parent!.id;
                if (!unitsByCourse.has(courseId)) {
                    unitsByCourse.set(courseId, []);
                }
                const topicsForUnit = (topicsByUnit.get(unit.id) || []).sort((a, b) => a.title.localeCompare(b.title, 'tr', { numeric: true, sensitivity: 'base' }));
                const hasUnitFlow = (unit.steps || []).length > 0;
                unitsByCourse.get(courseId)!.push({
                    ...unit,
                    hasFlowContent: hasUnitFlow,
                    topics: topicsForUnit
                });
            }
        });
        
        const courses = coursesSnap.docs.map(doc => {
            const courseData = { id: doc.id, ...doc.data() } as Course;
            const unitsForCourse = (unitsByCourse.get(courseData.id) || []).sort((a,b) => a.title.localeCompare(b.title, 'tr', { numeric: true, sensitivity: 'base' }));
            return { ...courseData, units: unitsForCourse };
        });
        courses.sort((a,b) => a.title.localeCompare(b.title, 'tr', { numeric: true, sensitivity: 'base' }));

        const classes = classesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolClass));
        classes.sort((a,b) => a.name.localeCompare(b.name, 'tr', { numeric: true, sensitivity: 'base' }));

        const enrichedClasses: EnrichedClass[] = classes.map(cls => ({
            ...cls,
            courses: courses.filter(c => c.classId === cls.id),
        }));

        const generalCourses = courses.filter(c => !c.classId);
        if (generalCourses.length > 0) {
            const generalClassIndex = enrichedClasses.findIndex(c => c.name === "Genel");
            if (generalClassIndex > -1) {
                enrichedClasses[generalClassIndex].courses.push(...generalCourses);
            } else {
                enrichedClasses.unshift({
                    id: 'general',
                    name: 'Genel',
                    courses: generalCourses,
                    createdAt: new Date(),
                } as EnrichedClass);
            }
        }
        
        return enrichedClasses;
    },
    ['ders-akisi-flow-data'],
    { revalidate: 60, tags: ['curriculum'] } // Her 60 saniyede bir önbelleği yenile
);

export async function getFlowData(): Promise<EnrichedClass[]> {
    try {
        return serialize(await getCachedFlowData());
    } catch (error) {
        console.error("Error fetching curriculum data:", error);
        return [];
    }
}
