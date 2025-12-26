

'use server';

import { db } from "@/lib/firebase";
import { collection, getDocs, doc, query, where, orderBy, Timestamp, collectionGroup } from "firebase/firestore";
import type { Topic, Unit, Course, SchoolClass, Question } from "@/lib/types";

// Tip tanımlarını Enriched versiyonları için genişletelim
type EnrichedTopic = Topic & { questionCount?: number };
type EnrichedUnit = Unit & { topics: EnrichedTopic[], questionCount?: number, htmlContent?: string };
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

export async function getFlowData(): Promise<EnrichedClass[]> {
    try {
        const [classesSnapshot, allCoursesSnapshot, allUnitsSnapshot, allTopicsSnapshot, allQuestionsSnapshot] = await Promise.all([
            getDocs(query(collection(db, 'classes'), orderBy('createdAt', 'asc'))),
            getDocs(query(collection(db, 'courses'))),
            getDocs(collectionGroup(db, 'units')),
            getDocs(collectionGroup(db, 'topics')),
            getDocs(collection(db, 'questions'))
        ]);

        const allQuestions = allQuestionsSnapshot.docs.map(doc => doc.data() as Question);
        const allTopics = allTopicsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Topic));
        const allUnits = allUnitsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Unit));
        const allCourses = allCoursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));

        const topicsByUnit: { [unitId: string]: Topic[] } = {};
        for (const topic of allTopics) {
            // Since topics is a subcollection of units, its ref path contains the unit ID.
            const pathSegments = allTopicsSnapshot.docs.find(d => d.id === topic.id)?.ref.path.split('/');
            if(pathSegments && pathSegments.length > 3) {
                const unitId = pathSegments[3];
                 if (!topicsByUnit[unitId]) {
                    topicsByUnit[unitId] = [];
                }
                // No filtering by isPublished here for the teacher view
                topicsByUnit[unitId].push(topic);
            }
        }
        
        const unitsByCourse: { [courseId: string]: EnrichedUnit[] } = {};
        for (const unit of allUnits) {
             // Find the parent course ID from the document reference path
            const pathSegments = allUnitsSnapshot.docs.find(d => d.id === unit.id)?.ref.path.split('/');
            if(pathSegments && pathSegments.length > 1) {
                const courseId = pathSegments[1];
                 if (!unitsByCourse[courseId]) {
                    unitsByCourse[courseId] = [];
                }
                // No filtering by isPublished here for the teacher view
                const topicsForUnit = (topicsByUnit[unit.id] || []).sort((a,b) => a.title.localeCompare(b.title));
                unitsByCourse[courseId].push({
                    ...unit,
                    topics: topicsForUnit,
                    questionCount: allQuestions.filter(q => q.unitId === unit.id).length
                });
            }
        }
        
        const coursesByClass: { [classId: string]: EnrichedCourse[] } = {};
        for (const course of allCourses) {
            const classId = course.classId || 'general';
            if (!coursesByClass[classId]) {
                coursesByClass[classId] = [];
            }
            // No filtering by isPublished here for the teacher view
            const unitsForCourse = (unitsByCourse[course.id] || []).sort((a,b) => a.title.localeCompare(b.title));
            coursesByClass[classId].push({ ...course, units: unitsForCourse });
        }

        const enrichedClasses: EnrichedClass[] = classesSnapshot.docs.map(doc => {
            const classData = { id: doc.id, ...doc.data() } as SchoolClass;
            // No filtering by isPublished here for the teacher view
            return { ...classData, courses: coursesByClass[doc.id] || [] };
        });

        if (coursesByClass['general']) {
             enrichedClasses.unshift({
                id: 'general',
                name: 'Genel',
                courses: coursesByClass['general'],
                createdAt: new Date()
            } as EnrichedClass);
        }
        
        return serialize(enrichedClasses) as EnrichedClass[];
    } catch (error) {
        console.error("Error fetching curriculum data:", error);
        return [];
    }
}
