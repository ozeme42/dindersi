'use server';

import { getAdminDb } from "@/lib/firebase-admin";
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

/**
 * Bu fonksiyon verinin statik mi yoksa canlı mı geleceğine karar verir.
 * Statik seçildiğinde 'public/curriculum/manifest.json' dosyasını okur.
 */
export async function getCurriculumForSelection(
    dataType: 'games' | 'yazilacaklar' | 'ozetler' | 'questions',
    isStatic: boolean,
    userId?: string
): Promise<{ classGroups: ClassGroup[], error?: string }> {
    noStore();
    try {
        if (isStatic) {
            // DOSYALARI GÖRDÜĞÜ YER: public/curriculum/manifest.json
            const filePath = path.join(process.cwd(), 'public', 'curriculum', 'manifest.json');
            try {
                const fileContent = await fs.readFile(filePath, 'utf-8');
                const data = JSON.parse(fileContent);
                return { classGroups: data.classGroups || [] };
            } catch (e) {
                console.error("Manifest dosyası okunamadı, boş dönülüyor.");
                return { classGroups: [] };
            }
        }

        const db = getAdminDb();
        // --- DİNAMİK VERİ TABANI MANTIĞI ---
        const [classesSnap, coursesSnap] = await Promise.all([
            db.collection("classes").get(), 
            db.collection("courses").get()
        ]);
        
        const allCourses = coursesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Course));
        const allClasses = classesSnap.docs.map(d => ({ id: d.id, ...d.data() } as SchoolClass));
        allClasses.sort((a,b) => a.name.localeCompare(b.name, 'tr', { numeric: true }));

        let relevantCourses: Course[];

        if (userId) {
            const userDoc = await db.collection("users").doc(userId).get();
            if (!userDoc.exists) return { classGroups: [], error: "Öğrenci bulunamadı." };
            const student = userDoc.data() as UserProfile;
            const studentClassName = student.class?.split(' - ')[0];
            const studentClass = allClasses.find(c => c.name === studentClassName);
            relevantCourses = allCourses.filter(c => !c.isTeacherOnly && (c.classId === studentClass?.id || !c.classId));
        } else {
            relevantCourses = allCourses.filter(c => !(c.isTeacherOnly ?? false));
        }

        const enrichedCourses: EnrichedCourse[] = [];
        for (const course of relevantCourses) {
            const unitsSnapshot = await db.collection(`courses/${course.id}/units`).get();
            const unitsData = unitsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Unit));
            unitsData.sort((a,b) => (a.title || '').localeCompare(b.title || '', 'tr', { numeric: true }));

            const enrichedUnits: EnrichedCourse['units'] = [];

            for (const unitDoc of unitsData) {
                const topicsSnapshot = await db.collection(`courses/${course.id}/units/${unitDoc.id}/topics`).get();
                const topicsData = topicsSnapshot.docs.map(d => ({id: d.id, ...d.data()} as Topic));
                topicsData.sort((a,b) => (a.title || '').localeCompare(b.title || '', 'tr', { numeric: true }));
                
                const topicsWithFlags = await Promise.all(topicsData.map(async (topicData) => {
                    let hasYazilacaklarContent = false;
                    const definitionsSnapshot = await db.collection("activityItems")
                        .where("topicId", "==", topicData.id)
                        .where("type", "==", "definition")
                        .get();
                    hasYazilacaklarContent = !definitionsSnapshot.empty || (topicData.writingContent?.notes?.length || 0) > 0;
                    
                    return {
                        ...topicData,
                        hasOzetContent: !!topicData.htmlContent,
                        hasYazilacaklarContent,
                    };
                }));

                const validTopics = topicsWithFlags.filter(t => (t.isPublished ?? true));
                const unitHasOzet = !!unitDoc.htmlContent;
                const unitHasTopicsWithContent = validTopics.some(t => {
                    if (dataType === 'games' || dataType === 'questions') return true;
                    if (dataType === 'ozetler') return t.hasOzetContent;
                    if (dataType === 'yazilacaklar') return t.hasYazilacaklarContent;
                    return false;
                });
                
                if (unitHasTopicsWithContent || (dataType === 'ozetler' && unitHasOzet)) {
                    enrichedUnits.push({
                        ...unitDoc,
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
        
        enrichedCourses.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'tr'));
        const groupedByClass: {[key: string]: EnrichedCourse[]} = {};
        enrichedCourses.forEach(course => {
            const className = course.className || 'Genel';
            if (!groupedByClass[className]) groupedByClass[className] = [];
            groupedByClass[className].push(course);
        });

        const classGroups: ClassGroup[] = Object.keys(groupedByClass).map(name => ({
            name,
            courses: groupedByClass[name]
        }));
        
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
