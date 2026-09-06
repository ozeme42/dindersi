'use server';

import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import fs from 'fs/promises';
import path from 'path';

export async function syncCurriculumManifest() {
    try {
        const db = getAdminDb();
        const manifestPath = path.join(process.cwd(), 'public', 'curriculum', 'manifest.json');
        
        let manifest: any = { classGroups: [] };
        try {
            const existing = await fs.readFile(manifestPath, 'utf8');
            manifest = JSON.parse(existing);
        } catch {}

        const classesSnap = await db.collection('classes').orderBy('name').get();
        const classesList = classesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        const gradeToClassMap = new Map<string, any>();
        for (const c of classesList) {
            const grade = (((c as any).name as string) || '').replace(/[^0-9]/g, '');
            if (grade) gradeToClassMap.set(grade, c);
        }

        const coursesSnap = await db.collection('courses').get();
        const coursesList = coursesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        for (const [grade] of gradeToClassMap.entries()) {
            let cg = manifest.classGroups.find((g: any) => g.name === grade);
            if (!cg) {
                cg = { name: grade, courses: [] };
                manifest.classGroups.push(cg);
            }
        }
        manifest.classGroups.sort((a: any, b: any) => Number(a.name) - Number(b.name));

        for (const course of coursesList) {
            let grade = '';
            for (const [g, cls] of gradeToClassMap.entries()) {
                if (cls.id === (course as any).classId) {
                    grade = g;
                    break;
                }
            }
            if (!grade) continue;

            let cg = manifest.classGroups.find((g: any) => g.name === grade);
            if (!cg) continue;

            let mCourse = cg.courses.find((c: any) => c.id === course.id);
            if (!mCourse) {
                mCourse = { id: course.id, title: (course as any).title, units: [] };
                cg.courses.push(mCourse);
            } else {
                mCourse.title = (course as any).title || mCourse.title;
            }

            const unitsSnap = await db.collection('courses').doc(course.id).collection('units').orderBy('title').get();
            for (const uDoc of unitsSnap.docs) {
                const uData = uDoc.data();
                let mUnit = mCourse.units.find((u: any) => u.id === uDoc.id);
                if (!mUnit) {
                    mUnit = {
                        id: uDoc.id,
                        title: uData.title || 'İsimsiz Ünite',
                        hasUnitOzet: !!(uData.htmlContent || uData.hasUnitOzet),
                        hasFlowContent: !!((uData.steps && uData.steps.length > 0) || uData.hasFlowContent),
                        topics: []
                    };
                    mCourse.units.push(mUnit);
                } else {
                    if (uData.title) mUnit.title = uData.title;
                    if (uData.htmlContent) mUnit.hasUnitOzet = true;
                    if (uData.steps && uData.steps.length > 0) mUnit.hasFlowContent = true;
                }

                const topicsSnap = await db.collection('courses').doc(course.id).collection('units').doc(uDoc.id).collection('topics').orderBy('title').get();
                for (const tDoc of topicsSnap.docs) {
                    const tData = tDoc.data();
                    let mTopic = mUnit.topics.find((t: any) => t.id === tDoc.id);
                    if (!mTopic) {
                        mTopic = {
                            id: tDoc.id,
                            title: tData.title || 'İsimsiz Konu',
                            hasOzetContent: !!(tData.htmlContent || tData.hasOzetContent),
                            hasFlowContent: !!((tData.steps && tData.steps.length > 0) || tData.hasFlowContent),
                            hasYazilacaklarContent: !!(tData.sourceText || tData.hasYazilacaklarContent)
                        };
                        mUnit.topics.push(mTopic);
                    } else {
                        if (tData.title) mTopic.title = tData.title;
                        if (tData.htmlContent) mTopic.hasOzetContent = true;
                        if (tData.steps && tData.steps.length > 0) mTopic.hasFlowContent = true;
                        if (tData.sourceText) mTopic.hasYazilacaklarContent = true;
                    }
                }
            }
        }

        await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
    } catch (err) {
        console.error("Error auto-syncing manifest:", err);
    }
}

/**
 * Firestore 'undefined' kabul etmez. 
 * Bu yardımcı fonksiyon nesne içindeki undefined değerleri temizler.
 */
const sanitizeData = (data: any) => {
    const sanitized: any = {};
    Object.keys(data).forEach(key => {
        if (data[key] !== undefined) {
            sanitized[key] = data[key];
        }
    });
    return sanitized;
};

export async function saveCurriculumItem(
    type: string,
    mode: 'add' | 'edit',
    data: {
        name: string,
        id?: string,
        parentId?: string, // Ders için classId, Ünite için courseId, Konu için unitId
        courseId?: string, // Sadece Konu düzenleme/ekleme için gerekli
        branches?: string[],
        externalLink?: string,
        sourceText?: string,
    }
) {
    const { name, id, parentId, courseId, branches, externalLink, sourceText } = data;
    const db = getAdminDb();

    if (!name?.trim()) {
        return { success: false, error: "İsim alanı boş bırakılamaz." };
    }

    // Arayüzden gelen farklı isimlendirmeleri standardize et
    let normalizedType = type;
    if (type.includes('Sınıf')) normalizedType = 'Sınıf';
    else if (type.includes('Ders')) normalizedType = 'Ders';
    else if (type.includes('Ünite')) normalizedType = 'Ünite';
    else if (type.includes('Konu')) normalizedType = 'Konu';

    try {
        if (mode === 'add') {
            let collectionRef;
            let payload: any = { 
                createdAt: FieldValue.serverTimestamp(), 
                isPublished: true 
            };

            if (normalizedType === 'Sınıf') {
                collectionRef = db.collection('classes');
                payload.name = name;
                payload.branches = branches || [];
            } else if (normalizedType === 'Ders' && parentId) {
                collectionRef = db.collection('courses');
                payload.title = name;
                payload.classId = parentId;
            } else if (normalizedType === 'Ünite' && parentId) {
                collectionRef = db.collection('courses').doc(parentId).collection('units');
                payload.title = name;
                payload.steps = [];
            } else if (normalizedType === 'Konu' && parentId && courseId) {
                collectionRef = db.collection('courses').doc(courseId).collection('units').doc(parentId).collection('topics');
                payload.title = name;
                payload.steps = [];
                payload.sourceText = sourceText || '';
                payload.externalLink = externalLink || null;
            } else {
                return { success: false, error: `Ekleme için geçersiz parametreler (${normalizedType} - Parent: ${parentId ? 'Var' : 'Yok'}).` };
            }
            
            await collectionRef.add(sanitizeData(payload));
        } else { // edit mode
            if (!id) return { success: false, error: "Düzenlenecek öğe ID'si bulunamadı." };
            
            let docRef;
            let updatePayload: any = {};

            if (normalizedType === 'Sınıf') {
                docRef = db.collection('classes').doc(id);
                updatePayload.name = name;
                if (branches !== undefined) updatePayload.branches = branches;
            } else if (normalizedType === 'Ders') {
                docRef = db.collection('courses').doc(id);
                updatePayload.title = name;
            } else if (normalizedType === 'Ünite' && parentId) {
                docRef = db.collection('courses').doc(parentId).collection('units').doc(id);
                updatePayload.title = name;
            } else if (normalizedType === 'Konu' && parentId && courseId) {
                docRef = db.collection('courses').doc(courseId).collection('units').doc(parentId).collection('topics').doc(id);
                updatePayload.title = name;
                updatePayload.externalLink = externalLink || null;
                updatePayload.sourceText = sourceText || '';
            } else {
                return { success: false, error: `Güncelleme için geçersiz parametreler (${normalizedType} - Parent: ${parentId ? 'Var' : 'Yok'}).` };
            }
            
            await docRef.update(sanitizeData(updatePayload));
        }
        syncCurriculumManifest().catch(() => {});
        return { success: true };
    } catch (error: any) {
        console.error("Error saving curriculum item:", error);
        return { success: false, error: "Veritabanı kaydı sırasında bir hata oluştu: " + error.message };
    }
}

export async function bulkAddCurriculumItems(
    type: string,
    names: string[],
    parentId?: string,
    courseIdForTopic?: string 
) {
    if (!names || names.length === 0) {
        return { success: false, error: "Eklenecek isim listesi boş." };
    }

    let normalizedType = type;
    if (type.includes('Sınıf')) normalizedType = 'Sınıf';
    else if (type.includes('Ders')) normalizedType = 'Ders';
    else if (type.includes('Ünite')) normalizedType = 'Ünite';
    else if (type.includes('Konu')) normalizedType = 'Konu';
    
    const db = getAdminDb();
    const batch = db.batch();

    try {
        let collectionRef;
        let commonData: any = { 
            createdAt: FieldValue.serverTimestamp(), 
            isPublished: true 
        };

        if (normalizedType === 'Sınıf') {
            collectionRef = db.collection('classes');
        } else if (normalizedType === 'Ders' && parentId) {
            collectionRef = db.collection('courses');
            commonData.classId = parentId;
        } else if (normalizedType === 'Ünite' && parentId) {
            collectionRef = db.collection('courses').doc(parentId).collection('units');
        } else if (normalizedType === 'Konu' && parentId && courseIdForTopic) {
            collectionRef = db.collection('courses').doc(courseIdForTopic).collection('units').doc(parentId).collection('topics');
            commonData.steps = [];
            commonData.sourceText = '';
        } else {
            return { success: false, error: "Toplu ekleme için üst dizin bilgisi yetersiz." };
        }

        names.forEach(name => {
            const docRef = collectionRef.doc();
            const itemData = { ...commonData };
            if (normalizedType === 'Sınıf') {
                itemData.name = name;
                itemData.branches = [];
            } else {
                itemData.title = name;
            }
            batch.set(docRef, sanitizeData(itemData));
        });

        await batch.commit();
        syncCurriculumManifest().catch(() => {});
        return { success: true, count: names.length };
    } catch (error: any) {
        console.error("Error bulk saving items:", error);
        return { success: false, error: "Toplu işlem sırasında hata: " + error.message };
    }
}

export async function deleteCurriculumItem(path: string) {
    if (!path) return { success: false, error: "Silinecek yol belirtilmedi." };
    try {
        const db = getAdminDb();
        await db.doc(path).delete();
        syncCurriculumManifest().catch(() => {});
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting item:", error);
        return { success: false, error: "Silme işlemi başarısız: " + error.message };
    }
}

export async function togglePublishState(path: string, currentPublishedState: boolean) {
    if (!path) return { success: false, error: "Geçersiz yol." };
    try {
        const db = getAdminDb();
        await db.doc(path).update({ isPublished: !currentPublishedState });
        return { success: true };
    } catch (error: any) {
        console.error("Error toggling publish state:", error);
        return { success: false, error: "Yayın durumu güncellenemedi." };
    }
}