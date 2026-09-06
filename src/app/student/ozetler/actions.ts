
'use server';

import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, orderBy } from "firebase/firestore";
import type { Topic, SchoolClass, Course, Unit, UserProfile } from "@/lib/types";
import { unstable_noStore as noStore } from 'next/cache';

export type EnrichedCourseWithOzetler = Omit<Course, 'units'> & {
    units: (Omit<Unit, 'topics'> & {
        topics: (Topic & { hasOzetContent: boolean })[]
    })[]
};


import fs from 'fs/promises';
import path from 'path';

let MANIFEST_CACHE: any = null;

export async function getCurriculumForOzetler(userId: string): Promise<{ courses: EnrichedCourseWithOzetler[], error?: string }> {
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
                    const enrichedCourses: EnrichedCourseWithOzetler[] = [];
                    for (const course of group.courses) {
                        const enrichedUnits: EnrichedCourseWithOzetler['units'] = [];
                        for (const unit of course.units || []) {
                            const topicsWithFlag = (unit.topics || [])
                                .filter((t: any) => t.hasOzetContent)
                                .map((t: any) => ({
                                    ...t,
                                    hasOzetContent: true
                                }));
                            if (topicsWithFlag.length > 0 || unit.hasUnitOzet) {
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

        // 2. FALLBACK: FIRESTORE (Sadece manifest bulunamazsa)
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

        const enrichedCourses: EnrichedCourseWithOzetler[] = [];
        for (const course of relevantCourses) {
            const unitsSnapshot = await getDocs(query(collection(db, `courses/${course.id}/units`), orderBy("title")));
            const enrichedUnits: EnrichedCourseWithOzetler['units'] = [];

            for (const unitDoc of unitsSnapshot.docs) {
                const topicsSnapshot = await getDocs(query(collection(db, `courses/${course.id}/units/${unitDoc.id}/topics`), orderBy("title")));
                const topicsWithFlag = topicsSnapshot.docs
                    .map(topicDoc => {
                        const topicData = topicDoc.data() as Topic;
                        const hasContent = !!topicData.htmlContent;
                        return {
                            ...topicData,
                            id: topicDoc.id,
                            hasOzetContent: hasContent
                        } as Topic & { hasOzetContent: boolean };
                    })
                    .filter(t => t.hasOzetContent);

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
        
        // Sort courses to put "Din Kültürü ve Ahlak Bilgisi" first
        enrichedCourses.sort((a, b) => {
            if (a.title.includes('Din Kültürü')) return -1;
            if (b.title.includes('Din Kültürü')) return 1;
            return a.title.localeCompare(b.title);
        });

        return { courses: JSON.parse(JSON.stringify(enrichedCourses)) };
        
    } catch (e: any) {
        console.error("Error getting curriculum for ozetler: ", e);
        return { courses: [], error: "Veri alınırken bir hata oluştu." };
    }
}

export async function getSingleOzet(courseId: string, unitId: string, topicId?: string): Promise<{ data?: { title: string; htmlContent: string; courseName: string }; error?: string }> {
    noStore();
    try {
        const targetId = topicId || unitId;
        
        // 1. STATİK HTML DOSYASI KONTROLÜ (0 FIRESTORE READS):
        const filePath = path.join(process.cwd(), 'public', 'curriculum', 'ozetler', `${targetId}.html`);
        let htmlContent = '';
        let title = '';
        let courseName = 'Ders';

        try {
            htmlContent = await fs.readFile(filePath, 'utf-8');
        } catch (e) {
            // HTML dosyası yoksa devam et
        }

        // Başlık ve ders adını manifestten bul
        try {
            if (!MANIFEST_CACHE) {
                const manifestPath = path.join(process.cwd(), 'public', 'curriculum', 'manifest.json');
                const content = await fs.readFile(manifestPath, 'utf-8');
                MANIFEST_CACHE = JSON.parse(content);
            }
            if (MANIFEST_CACHE && MANIFEST_CACHE.classGroups) {
                for (const group of MANIFEST_CACHE.classGroups) {
                    const c = (group.courses || []).find((x: any) => x.id === courseId);
                    if (c) {
                        courseName = c.title || courseName;
                        const u = (c.units || []).find((x: any) => x.id === unitId);
                        if (u) {
                            if (topicId) {
                                const t = (u.topics || []).find((x: any) => x.id === topicId);
                                if (t) title = t.title;
                            } else {
                                title = u.title;
                            }
                        }
                    }
                    if (title) break;
                }
            }
        } catch (mErr) {
            console.warn("Manifest lookup error for ozet:", mErr);
        }

        if (htmlContent && htmlContent.trim().length > 0) {
            return {
                data: {
                    title: title || 'Konu Özeti',
                    htmlContent,
                    courseName
                }
            };
        }

        // 2. FIRESTORE FALLBACK (Sadece statik dosya yoksa):
        const docRef = topicId 
            ? doc(db, 'courses', courseId, 'units', unitId, 'topics', topicId)
            : doc(db, 'courses', courseId, 'units', unitId);
        
        const [docSnap, courseSnap] = await Promise.all([
            getDoc(docRef),
            getDoc(doc(db, 'courses', courseId))
        ]);

        if (!docSnap.exists()) {
            return { error: "İçerik bulunamadı." };
        }

        const data = docSnap.data();
        const courseData = courseSnap.data();

        if (!data.htmlContent) {
            return { error: "Bu konu için interaktif özet içeriği henüz eklenmemiş." };
        }

        return {
            data: {
                title: data.title || title || 'Konu Özeti',
                htmlContent: data.htmlContent,
                courseName: courseData?.title || courseName
            }
        };
    } catch (e: any) {
        console.error("Error fetching single ozet:", e);
        return { error: "Veri çekilirken bir hata oluştu." };
    }
}
