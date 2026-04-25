'use server';

import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

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
    type: 'Sınıf' | 'Ders' | 'Ünite' | 'Konu',
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

    try {
        if (mode === 'add') {
            let collectionRef;
            let payload: any = { 
                createdAt: FieldValue.serverTimestamp(), 
                isPublished: true 
            };

            if (type === 'Sınıf') {
                collectionRef = db.collection('classes');
                payload.name = name;
                payload.branches = branches || [];
            } else if (type === 'Ders' && parentId) {
                collectionRef = db.collection('courses');
                payload.title = name;
                payload.classId = parentId;
            } else if (type === 'Ünite' && parentId) {
                collectionRef = db.collection('courses').doc(parentId).collection('units');
                payload.title = name;
                payload.steps = [];
            } else if (type === 'Konu' && parentId && courseId) {
                collectionRef = db.collection('courses').doc(courseId).collection('units').doc(parentId).collection('topics');
                payload.title = name;
                payload.steps = [];
                payload.sourceText = sourceText || '';
                payload.externalLink = externalLink || null;
            } else {
                return { success: false, error: "Eksik üst dizin bilgisi. Lütfen hiyerarşiyi kontrol edin." };
            }
            
            await collectionRef.add(sanitizeData(payload));
        } else { // edit mode
            if (!id) return { success: false, error: "Düzenlenecek öğe ID'si bulunamadı." };
            
            let docRef;
            let updatePayload: any = {};

            if (type === 'Sınıf') {
                docRef = db.collection('classes').doc(id);
                updatePayload.name = name;
                if (branches !== undefined) updatePayload.branches = branches;
            } else if (type === 'Ders') {
                docRef = db.collection('courses').doc(id);
                updatePayload.title = name;
            } else if (type === 'Ünite' && parentId) {
                docRef = db.collection('courses').doc(parentId).collection('units').doc(id);
                updatePayload.title = name;
            } else if (type === 'Konu' && parentId && courseId) {
                docRef = db.collection('courses').doc(courseId).collection('units').doc(parentId).collection('topics').doc(id);
                updatePayload.title = name;
                updatePayload.externalLink = externalLink || null;
                updatePayload.sourceText = sourceText || '';
            } else {
                return { success: false, error: "Güncelleme için geçersiz parametreler." };
            }
            
            await docRef.update(sanitizeData(updatePayload));
        }
        return { success: true };
    } catch (error: any) {
        console.error("Error saving curriculum item:", error);
        return { success: false, error: "Veritabanı kaydı sırasında bir hata oluştu: " + error.message };
    }
}

export async function bulkAddCurriculumItems(
    type: 'Sınıf' | 'Ders' | 'Ünite' | 'Konu',
    names: string[],
    parentId?: string,
    courseIdForTopic?: string // Konu eklerken kurs ID'si
) {
    if (!names || names.length === 0) {
        return { success: false, error: "Eklenecek isim listesi boş." };
    }
    
    const db = getAdminDb();
    const batch = db.batch();

    try {
        let collectionRef;
        let commonData: any = { 
            createdAt: FieldValue.serverTimestamp(), 
            isPublished: true 
        };

        if (type === 'Sınıf') {
            collectionRef = db.collection('classes');
        } else if (type === 'Ders' && parentId) {
            collectionRef = db.collection('courses');
            commonData.classId = parentId;
        } else if (type === 'Ünite' && parentId) {
            collectionRef = db.collection('courses').doc(parentId).collection('units');
        } else if (type === 'Konu' && parentId && courseIdForTopic) {
            collectionRef = db.collection('courses').doc(courseIdForTopic).collection('units').doc(parentId).collection('topics');
            commonData.steps = [];
            commonData.sourceText = '';
        } else {
            return { success: false, error: "Toplu ekleme için üst dizin bilgisi yetersiz." };
        }

        names.forEach(name => {
            const docRef = collectionRef.doc();
            const itemData = { ...commonData };
            if (type === 'Sınıf') {
                itemData.name = name;
                itemData.branches = [];
            } else {
                itemData.title = name;
            }
            batch.set(docRef, sanitizeData(itemData));
        });

        await batch.commit();
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
