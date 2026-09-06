
'use server';

import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, orderBy } from "firebase/firestore";
import type { Topic, YazilacaklarContent, SchoolClass, Course, Unit, UserProfile } from "@/lib/types";
import { unstable_noStore as noStore } from 'next/cache';
import fs from 'fs/promises';
import path from 'path';

let MANIFEST_CACHE: any = null;

export async function getYazilacaklarContent(courseId: string, unitId: string, topicId: string): Promise<{ data?: YazilacaklarContent; title?: string; error?: string }> {
    noStore();
    try {
        // 1. STATİK JSON ÖNCELİĞİ (0 FIRESTORE READS):
        const filePath = path.join(process.cwd(), 'public', 'curriculum', 'yazilacaklar', `${topicId}.json`);
        let title = '';

        // Başlığı bulmak için manifest önbelleğini kullan
        try {
            if (!MANIFEST_CACHE) {
                const manifestPath = path.join(process.cwd(), 'public', 'curriculum', 'manifest.json');
                const content = await fs.readFile(manifestPath, 'utf-8');
                MANIFEST_CACHE = JSON.parse(content);
            }
            if (MANIFEST_CACHE && MANIFEST_CACHE.classGroups) {
                for (const group of MANIFEST_CACHE.classGroups) {
                    for (const c of group.courses || []) {
                        for (const u of c.units || []) {
                            const found = (u.topics || []).find((t: any) => t.id === topicId);
                            if (found) {
                                title = found.title;
                                break;
                            }
                        }
                        if (title) break;
                    }
                    if (title) break;
                }
            }
        } catch (mErr) {
            console.warn("Manifest title lookup warning:", mErr);
        }

        try {
            const fileContent = await fs.readFile(filePath, 'utf-8');
            const data = JSON.parse(fileContent);
            if (data && (data.conceptDefinitions?.length > 0 || data.notes?.length > 0)) {
                return { data, title };
            }
        } catch (fErr) {
            // Statik dosya bulunamadıysa Firestore'a devam et
        }

        // 2. FIRESTORE FALLBACK:
        const topicRef = doc(db, 'courses', courseId, 'units', unitId, 'topics', topicId);
        const topicSnap = await getDoc(topicRef);
        
        if (topicSnap.exists()) {
            const topicData = topicSnap.data() as Topic;
            if (topicData.writingContent && (topicData.writingContent.conceptDefinitions?.length > 0 || topicData.writingContent.notes?.length > 0)) {
                return { data: JSON.parse(JSON.stringify(topicData.writingContent)), title: topicData.title || title };
            }
        }
        return { error: "Bu konu için yazılacaklar içeriği bulunamadı." };
    } catch(e: any) {
        console.error("Error fetching yazilacaklar content:", e);
        return { error: "İçerik alınırken bir veritabanı hatası oluştu." };
    }
}

export type EnrichedCourseWithYazilacaklar = Omit<Course, 'units'> & {
    units: (Omit<Unit, 'topics'> & {
        topics: (Topic & { hasYazilacaklarContent: boolean })[]
    })[]
};

export async function getCurriculumForYazilacaklar(userId: string): Promise<{ courses: EnrichedCourseWithYazilacaklar[], error?: string }> {
    noStore();
    try {
        const userDoc = await getDoc(doc(db, "users", userId));
        if (!userDoc.exists()) {
            return { courses: [], error: "Öğrenci bulunamadı." };
        }
        const student = userDoc.data() as UserProfile;
        let studentClassName = student.class?.split(' - ')[0]?.trim();
        if (studentClassName) {
            studentClassName = studentClassName.replace(/[^0-9]/g, '') || studentClassName;
        }

        // 1. STATİK MANIFEST ÖNCELİĞİ (0 FIRESTORE READS):
        try {
            if (!MANIFEST_CACHE) {
                const manifestPath = path.join(process.cwd(), 'public', 'curriculum', 'manifest.json');
                const content = await fs.readFile(manifestPath, 'utf-8');
                MANIFEST_CACHE = JSON.parse(content);
            }

            if (MANIFEST_CACHE && MANIFEST_CACHE.classGroups) {
                const group = MANIFEST_CACHE.classGroups.find((g: any) => 
                    (studentClassName && g.name === studentClassName) ||
                    (student.class && g.name === student.class)
                );

                if (group && group.courses && group.courses.length > 0) {
                    const enrichedCourses: EnrichedCourseWithYazilacaklar[] = [];
                    for (const course of group.courses) {
                        const enrichedUnits: EnrichedCourseWithYazilacaklar['units'] = [];
                        for (const unit of course.units || []) {
                            const topicsWithFlag = (unit.topics || [])
                                .filter((t: any) => t.hasYazilacaklarContent)
                                .map((t: any) => ({
                                    ...t,
                                    hasYazilacaklarContent: true
                                }));
                            if (topicsWithFlag.length > 0) {
                                enrichedUnits.push({
                                    id: unit.id,
                                    title: unit.title,
                                    topics: topicsWithFlag
                                });
                            }
                        }
                        if (enrichedUnits.length > 0) {
                            enrichedCourses.push({
                                id: course.id,
                                title: course.title,
                                units: enrichedUnits,
                                className: student.class,
                            });
                        }
                    }

                    if (enrichedCourses.length > 0) {
                        enrichedCourses.sort((a, b) => {
                            if (a.title.includes('Din Kültürü')) return -1;
                            if (b.title.includes('Din Kültürü')) return 1;
                            return a.title.localeCompare(b.title);
                        });
                        return { courses: JSON.parse(JSON.stringify(enrichedCourses)) };
                    }
                }
            }
        } catch(e) {
            console.warn("Manifest okuma uyarısı, Firestore fallback:", e);
        }

        // 2. FALLBACK: FIRESTORE (Sadece manifestte bulunamazsa)
        const coursesQuery = query(collection(db, 'courses'));
        const coursesSnapshot = await getDocs(coursesQuery);
        let relevantCourses = coursesSnapshot.docs
            .map(d => ({ id: d.id, ...d.data() } as Course))
            .filter(c => !c.isTeacherOnly);

        if (studentClassName) {
            const classesSnapshot = await getDocs(collection(db, "classes"));
            const studentClass = classesSnapshot.docs.find(c => c.data().name === studentClassName);
            
            relevantCourses = relevantCourses.filter(course =>
                course.classId === studentClass?.id || !course.classId
            );
        } else {
            relevantCourses = relevantCourses.filter(course => !course.classId);
        }

        const enrichedCourses: EnrichedCourseWithYazilacaklar[] = [];
        for (const course of relevantCourses) {
            const unitsSnapshot = await getDocs(query(collection(db, `courses/${course.id}/units`), orderBy("title")));
            const enrichedUnits: EnrichedCourseWithYazilacaklar['units'] = [];

            for (const unitDoc of unitsSnapshot.docs) {
                const topicsSnapshot = await getDocs(query(collection(db, `courses/${course.id}/units/${unitDoc.id}/topics`), orderBy("title")));
                const topicsWithFlag = topicsSnapshot.docs
                    .map(topicDoc => {
                        const topicData = topicDoc.data() as Topic;
                        const hasContent = (topicData.writingContent?.notes?.length || 0) > 0 || (topicData.writingContent?.conceptDefinitions?.length || 0) > 0;
                        return {
                            id: topicDoc.id,
                            ...topicData,
                            hasYazilacaklarContent: hasContent
                        } as Topic & { hasYazilacaklarContent: boolean };
                    })
                    .filter(t => t.hasYazilacaklarContent);

                if (topicsWithFlag.length > 0) {
                    enrichedUnits.push({
                        id: unitDoc.id,
                        title: unitDoc.data().title,
                        topics: topicsWithFlag
                    });
                }
            }

            if (enrichedUnits.length > 0) {
                enrichedCourses.push({
                    id: course.id,
                    title: course.title,
                    units: enrichedUnits,
                    className: student.class,
                });
            }
        }
        
        return { courses: JSON.parse(JSON.stringify(enrichedCourses)) };
        
    } catch (e: any) {
        console.error("Error getting curriculum for yazilacaklar: ", e);
        return { courses: [], error: "Veri alınırken bir hata oluştu." };
    }
}
