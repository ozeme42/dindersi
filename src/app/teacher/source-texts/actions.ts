'use server';

import { getAdminDb } from '@/lib/firebase-admin';
import { syncCurriculumManifest } from '@/app/teacher/content-creation/actions';

export async function saveTopicSourceText(courseId: string, unitId: string, topicId: string, sourceText: string) {
    if (!courseId || !unitId || !topicId) {
        return { success: false, error: "Eksik parametre: ders, ünite veya konu ID'si bulunamadı." };
    }

    try {
        const db = getAdminDb();
        const trimmed = (sourceText || '').trim();
        
        await db.collection('courses')
            .doc(courseId)
            .collection('units')
            .doc(unitId)
            .collection('topics')
            .doc(topicId)
            .update({
                sourceText: trimmed,
                updatedAt: new Date()
            });

        // Manifest dosyasını senkronize et
        syncCurriculumManifest().catch((err) => {
            console.warn('Failed to sync curriculum manifest after saving source text:', err);
        });

        return { success: true };
    } catch (error: any) {
        console.error('Error saving topic source text:', error);
        return { success: false, error: error.message || 'Kaynak metin kaydedilirken bir hata oluştu.' };
    }
}

export async function clearTopicSourceText(courseId: string, unitId: string, topicId: string) {
    if (!courseId || !unitId || !topicId) {
        return { success: false, error: 'Eksik parametre.' };
    }

    try {
        const db = getAdminDb();
        await db.collection('courses')
            .doc(courseId)
            .collection('units')
            .doc(unitId)
            .collection('topics')
            .doc(topicId)
            .update({
                sourceText: '',
                updatedAt: new Date()
            });

        syncCurriculumManifest().catch(() => {});

        return { success: true };
    } catch (error: any) {
        console.error('Error clearing topic source text:', error);
        return { success: false, error: error.message || 'Kaynak metin silinirken bir hata oluştu.' };
    }
}
