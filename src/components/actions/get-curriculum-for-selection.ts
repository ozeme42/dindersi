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

// In-memory cache for manifest.json (30 minutes TTL)
let CACHED_MANIFEST: { timestamp: number; data: any } | null = null;
const MANIFEST_TTL = 1000 * 60 * 30;

export async function clearCurriculumSelectionCache() {
    CACHED_MANIFEST = null;
}

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

/**
 * Bu fonksiyon verinin statik mi yoksa canlı mı geleceğine karar verir.
 * Statik öncelikli olarak 'public/curriculum/manifest.json' dosyasını ve RAM önbelleğini okur.
 */
export async function getCurriculumForSelection(
    dataType: 'games' | 'yazilacaklar' | 'ozetler' | 'questions',
    isStatic: boolean = true,
    userId?: string
): Promise<{ classGroups: ClassGroup[], error?: string }> {
    noStore();
    try {
        // 1. STATİK ÖNCELİK (0 FIRESTORE READS - In-memory Cached)
        const manifest = await getLoadedManifest();
        if (manifest && manifest.classGroups && (isStatic || isStatic === undefined)) {
            let classGroups: ClassGroup[] = JSON.parse(JSON.stringify(manifest.classGroups));

            // Veri tipine göre konuları ve üniteleri filtrele
            if (dataType === 'ozetler' || dataType === 'yazilacaklar') {
                classGroups = classGroups.map(group => ({
                    ...group,
                    courses: (group.courses || []).map(course => ({
                        ...course,
                        units: (course.units || []).map(unit => {
                            const validTopics = (unit.topics || []).filter((topic: any) => {
                                if (dataType === 'ozetler') return topic.hasOzetContent;
                                if (dataType === 'yazilacaklar') return topic.hasYazilacaklarContent;
                                return true;
                            });
                            return {
                                ...unit,
                                topics: validTopics
                            };
                        }).filter(unit => {
                            if (dataType === 'ozetler') return unit.topics.length > 0 || (unit as any).hasUnitOzet;
                            if (dataType === 'yazilacaklar') return unit.topics.length > 0;
                            return true;
                        })
                    })).filter(course => course.units.length > 0)
                })).filter(group => group.courses.length > 0);
            }

            return { classGroups };
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
