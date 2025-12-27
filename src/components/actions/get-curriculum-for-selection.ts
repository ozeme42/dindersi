
'use server';

import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, orderBy, Timestamp } from "firebase/firestore";
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

        if (!userId) {
            return { classGroups: [], error: "Kullanıcı bilgisi gerekli." };
        }

        // Logic for authenticated users
        const userDoc = await getDoc(doc(db, "users", userId));
        if (!userDoc.exists()) {
            return { classGroups: [], error: "Öğrenci bulunamadı." };
        }
        const student = userDoc.data() as UserProfile;
        const studentClassName = student.class?.split(' - ')[0];

        const [classesSnap, coursesSnap] = await Promise.all([
            getDocs(query(collection(db, "classes"), orderBy("createdAt", "asc"))),
            getDocs(collection(db, "courses"))
        ]);
        
        const allCourses = coursesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Course));
        const allClasses = classesSnap.docs.map(d => ({ id: d.id, ...d.data() } as SchoolClass));

        let relevantCourses: Course[];
        if (studentClassName) {
            const studentClass = allClasses.find(c => c.name === studentClassName);
            relevantCourses = allCourses.filter(c => !c.isTeacherOnly && (c.classId === studentClass?.id || !c.classId));
        } else {
            relevantCourses = allCourses.filter(c => !c.isTeacherOnly && !c.classId);
        }

        const enrichedCourses: EnrichedCourse[] = [];
        for (const course of relevantCourses) {
            const unitsSnapshot = await getDocs(query(collection(db, `courses/${course.id}/units`), orderBy("title")));
            const enrichedUnits: EnrichedCourse['units'] = [];

            for (const unitDoc of unitsSnapshot.docs) {
                const topicsSnapshot = await getDocs(query(collection(db, `courses/${course.id}/units/${unitDoc.id}/topics`), orderBy("title")));
                
                const topicsWithFlags = await Promise.all(topicsSnapshot.docs.map(async (topicDoc) => {
                    const topicData = topicDoc.data() as Topic;
                    
                    let hasContent = false;
                    if (dataType === 'yazilacaklar') {
                        // Check if there are any definitions or notes for this topic.
                        const definitionsQuery = query(collection(db, "activityItems"), where("topicId", "==", topicDoc.id), where("type", "==", "definition"));
                        const definitionsSnapshot = await getDocs(definitionsQuery);
                        hasContent = !definitionsSnapshot.empty || (topicData.writingContent?.notes?.length || 0) > 0;
                    } else if (dataType === 'ozetler') {
                       hasContent = !!topicData.htmlContent;
                    } else if (dataType === 'games') {
                       hasContent = (topicData.isPublished ?? true); 
                    }

                    return {
                        id: topicDoc.id,
                        ...topicData,
                        hasContent: hasContent,
                    };
                }));

                const validTopics = topicsWithFlags.filter(t => t.hasContent);

                if (validTopics.length > 0) {
                    const unitData = unitDoc.data() as Unit;
                    enrichedUnits.push({
                        id: unitDoc.id,
                        title: unitData.title,
                        hasUnitOzet: !!unitData.htmlContent,
                        topics: validTopics as any,
                    });
                }
            }

            if (enrichedUnits.length > 0) {
                enrichedCourses.push({
                    ...course,
                    className: student.class || 'Genel',
                    units: enrichedUnits,
                });
            }
        }
        
        enrichedCourses.sort((a, b) => a.title.localeCompare(b.title, 'tr'));

        // Group by class name for the final structure
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
        
        return { classGroups: JSON.parse(JSON.stringify(classGroups)) };
        
    } catch (e: any) {
        console.error("Error getting curriculum for selection: ", e);
        return { classGroups: [], error: "Veri alınırken bir hata oluştu." };
    }
}
