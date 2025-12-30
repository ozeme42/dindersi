'use server';

import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, orderBy } from "firebase/firestore";
import type { Topic, SchoolClass, Course, Unit, UserProfile, ActivityItem } from "@/lib/types";
import { unstable_noStore as noStore } from 'next/cache';
import fs from 'fs/promises';
import path from 'path';

export type EnrichedCourse = Course & {
    units: (Omit<Unit, 'topics'> & {
        topics: (Topic & { hasOzetContent?: boolean; hasYazilacaklarContent?: boolean; })[]
    })[]
};

export type ClassGroup = { 
    name: string; 
    courses: EnrichedCourse[] 
};

export async function getCurriculumForSelection(
    dataType: 'games' | 'yazilacaklar' | 'ozetler',
    isStatic: boolean,
    userId?: string
): Promise<{ classGroups: ClassGroup[], error?: string }> {
    noStore();
    try {
        if (isStatic) {
            // For static pages, read from the generated manifest.json
            const filePath = path.join(process.cwd(), 'public', 'curriculum', 'manifest.json');
            const fileContent = await fs.readFile(filePath, 'utf-8');
            const data = JSON.parse(fileContent);
            return { classGroups: data.classGroups || [] };
        }

        // --- DYNAMIC DATA FETCHING LOGIC (FOR BOTH TEACHER & STUDENT) ---
        const [classesSnap, coursesSnap] = await Promise.all([
            getDocs(query(collection(db, "classes"))), // No order needed, will sort client-side
            getDocs(collection(db, "courses"))
        ]);
        
        const allCourses = coursesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Course));
        const allClasses = classesSnap.docs.map(d => ({ id: d.id, ...d.data() } as SchoolClass));
        allClasses.sort((a,b) => a.name.localeCompare(b.name, 'tr', { numeric: true }));

        let relevantCourses: Course[];

        if (userId) { // --- STUDENT LOGIC ---
            const userDoc = await getDoc(doc(db, "users", userId));
            if (!userDoc.exists()) {
                return { classGroups: [], error: "Öğrenci bulunamadı." };
            }
            const student = userDoc.data() as UserProfile;
            const studentClassName = student.class?.split(' - ')[0];
            
            const studentClass = allClasses.find(c => c.name === studentClassName);
            relevantCourses = allCourses.filter(c => !c.isTeacherOnly && (c.classId === studentClass?.id || !c.classId));
        } else { // --- TEACHER/SMARTBOARD LOGIC ---
            relevantCourses = allCourses.filter(c => !(c.isTeacherOnly ?? false));
        }

        const enrichedCourses: EnrichedCourse[] = [];
        for (const course of relevantCourses) {
            const unitsSnapshot = await getDocs(query(collection(db, `courses/${course.id}/units`)));
            const unitsData = unitsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Unit));
            unitsData.sort((a,b) => a.title.localeCompare(b.title, 'tr', { numeric: true }));

            const enrichedUnits: EnrichedCourse['units'] = [];

            for (const unitDoc of unitsData) {
                const topicsSnapshot = await getDocs(query(collection(db, `courses/${course.id}/units/${unitDoc.id}/topics`)));
                const topicsData = topicsSnapshot.docs.map(d => ({id: d.id, ...d.data()} as Topic));
                topicsData.sort((a,b) => a.title.localeCompare(b.title, 'tr', { numeric: true }));
                
                const topicsWithFlags = await Promise.all(topicsData.map(async (topicData) => {
                    
                    let hasYazilacaklarContent = false;
                    // Check for definitions to determine if 'yazilacaklar' exists
                    const definitionsQuery = query(collection(db, "activityItems"), where("topicId", "==", topicData.id), where("type", "==", "definition"));
                    const definitionsSnapshot = await getDocs(definitionsQuery);
                    hasYazilacaklarContent = !definitionsSnapshot.empty || (topicData.writingContent?.notes?.length || 0) > 0;
                    
                    return {
                        ...topicData,
                        hasOzetContent: !!topicData.htmlContent,
                        hasYazilacaklarContent,
                    };
                }));

                const validTopics = topicsWithFlags.filter(t => (t.isPublished ?? true));
                const unitDataWithTopics = unitDoc;
                
                const unitHasOzet = !!unitDataWithTopics.htmlContent;
                // A unit should appear if it has its own content, or any of its topics have content relevant to the data type
                const unitHasTopicsWithContent = validTopics.some(t => {
                    if (dataType === 'games') return true; // For games, just having a topic is enough
                    if (dataType === 'ozetler') return t.hasOzetContent;
                    if (dataType === 'yazilacaklar') return t.hasYazilacaklarContent;
                    return false;
                });
                
                if (unitHasTopicsWithContent || (dataType === 'ozetler' && unitHasOzet)) {
                    enrichedUnits.push({
                        ...unitDataWithTopics,
                        hasUnitOzet: unitHasOzet,
                        topics: validTopics as any,
                    });
                }
            }

            if (enrichedUnits.length > 0) {
                const courseClassInfo = allClasses.find(c => c.id === course.classId);
                enrichedCourses.push({
                    ...course,
                    className: courseClassInfo?.name || 'Genel',
                    units: enrichedUnits,
                });
            }
        }
        
        enrichedCourses.sort((a, b) => a.title.localeCompare(b.title, 'tr'));

        const groupedByClass: {[key: string]: Course[]} = {};
        enrichedCourses.forEach(course => {
            const className = course.className || 'Genel';
            if (!groupedByClass[className]) {
                groupedByClass[className] = [];
            }
            groupedByClass[className].push(course);
        });

        const classGroups: ClassGroup[] = Object.keys(groupedByClass).map(name => ({
            name,
            courses: groupedByClass[name]
        }));
        
        // Ensure "Genel" group is always first if it exists
        classGroups.sort((a,b) => {
            if (a.name === 'Genel') return -1;
            if (b.name === 'Genel') return 1;
            return a.name.localeCompare(b.name, 'tr', { numeric: true });
        });

        return { classGroups: JSON.parse(JSON.stringify(classGroups)) };
        
    } catch (e: any) {
        console.error("Error getting curriculum for selection: ", e);
        return { classGroups: [], error: "Veri alınırken bir hata oluştu." };
    }
}