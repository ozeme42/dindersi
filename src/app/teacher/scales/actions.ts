
'use server';

import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc, addDoc, serverTimestamp, writeBatch, updateDoc, deleteDoc, orderBy } from 'firebase/firestore';
import type { EvaluationScale, UserProfile, SchoolClass, ScaleEntry, Course, Unit, Topic, EvaluationScaleColumn } from '@/lib/types';
import { unstable_noStore as noStore } from 'next/cache';

export async function getTeacherScales(teacherId: string): Promise<{ success: boolean; data?: EvaluationScale[]; error?: string }> {
    noStore();
    if (!teacherId) {
        return { success: false, error: 'Öğretmen ID\'si bulunamadı.' };
    }

    try {
        const q = query(
            collection(db, 'evaluationScales'),
            where('teacherId', '==', teacherId),
            orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const scales = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EvaluationScale));
        return { success: true, data: JSON.parse(JSON.stringify(scales)) };
    } catch (error: any) {
        console.error("Error fetching scales:", error);
        if (error.code === 'failed-precondition') {
            return { success: false, error: `Veritabanı indeksi eksik. Lütfen bu hatayı gidermek için geliştirici konsolundaki linki kullanın veya aşağıdaki linke tıklayın. Hata: ${error.message}`};
        }
        return { success: false, error: 'Ölçekler alınırken bir hata oluştu.' };
    }
}

export async function createScale(data: Omit<EvaluationScale, 'id' | 'createdAt'>): Promise<{ success: boolean, id?: string, error?: string }> {
    try {
        if (!data.name || !data.type || !data.teacherId || !data.classId || !data.courseId) {
            return { success: false, error: 'Eksik bilgi. Tüm alanlar doldurulmalıdır.' };
        }

        const dataToSave: Omit<EvaluationScale, 'id'> = {
            name: data.name,
            type: data.type,
            teacherId: data.teacherId,
            classId: data.classId,
            courseId: data.courseId,
            columns: data.type === 'checklist' ? (data.columns || [{ id: `col_${Date.now()}`, name: 'Ödevini Yaptı', type: 'status' }]) : [],
            createdAt: serverTimestamp(),
        };

        const docRef = await addDoc(collection(db, 'evaluationScales'), dataToSave);
        return { success: true, id: docRef.id };

    } catch (error: any) {
        console.error("Error creating scale:", error);
        return { success: false, error: 'Ölçek oluşturulurken bir hata oluştu.' };
    }
}


export async function deleteScale(scaleId: string): Promise<{ success: boolean; error?: string }> {
    if (!scaleId) {
        return { success: false, error: "Silinecek ölçek ID'si belirtilmedi." };
    }

    try {
        const batch = writeBatch(db);
        const scaleRef = doc(db, 'evaluationScales', scaleId);
        
        const entriesCollectionRef = collection(db, `evaluationScales/${scaleId}/entries`);
        const entriesSnapshot = await getDocs(entriesCollectionRef);
        entriesSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });

        batch.delete(scaleRef);
        
        await batch.commit();
        
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting scale and its entries:", error);
        return { success: false, error: "Ölçek silinirken bir hata oluştu." };
    }
}
