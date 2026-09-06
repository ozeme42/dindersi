'use server';

import fs from 'fs/promises';
import path from 'path';
import { clearStaticGameCache } from '@/lib/quiz-actions';

// Helper to ensure the directory exists
async function ensureDirExists(filePath: string) {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
}

export async function getStaticData(dataType: string, id: string): Promise<{ success: boolean; data?: any; error?: string }> {
    if (!dataType || !id) {
        return { success: false, error: "Veri tipi veya ID belirtilmedi." };
    }

    // Map dataType to a file path
    const relativePath = path.join('public', 'curriculum', dataType, `${id}.json`);
    const filePath = path.join(process.cwd(), relativePath);

    try {
        await ensureDirExists(filePath);
        const fileContent = await fs.readFile(filePath, 'utf-8');
        return { success: true, data: JSON.parse(fileContent) };
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            return { success: true, data: dataType.includes('soru') ? [] : {} }; // Return empty array for question lists, empty object otherwise
        }
        return { success: false, error: 'Dosya okunurken hata oluştu.' };
    }
}

export async function saveStaticData(dataType: string, id: string, data: any): Promise<{ success: boolean; error?: string }> {
    if (!dataType || !id) {
        return { success: false, error: "Veri tipi veya ID belirtilmedi." };
    }

    const relativePath = path.join('public', 'curriculum', dataType, `${id}.json`);
    const filePath = path.join(process.cwd(), relativePath);

    try {
        await ensureDirExists(filePath);
        const fileContent = JSON.stringify(data, null, 2); // Pretty-print
        await fs.writeFile(filePath, fileContent, 'utf-8');
        clearStaticGameCache();
        return { success: true };
    } catch (error: any) {
        return { success: false, error: 'Dosya yazılırken hata oluştu.' };
    }
}

export async function getStaticHtmlContent(dataType: string, id: string): Promise<{ success: boolean; data?: string; error?: string }> {
     if (!dataType || !id) {
        return { success: false, error: "Veri tipi veya ID belirtilmedi." };
    }
    const relativePath = path.join('public', 'curriculum', dataType, `${id}.html`);
    const filePath = path.join(process.cwd(), relativePath);

     try {
        await ensureDirExists(filePath);
        const fileContent = await fs.readFile(filePath, 'utf-8');
        return { success: true, data: fileContent };
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            return { success: true, data: '' }; // Return empty string for new/empty files
        }
        return { success: false, error: 'HTML dosyası okunurken hata oluştu.' };
    }
}

export async function saveStaticHtmlContent(dataType: string, id: string, content: string): Promise<{ success: boolean; error?: string }> {
     if (!dataType || !id) {
        return { success: false, error: "Veri tipi veya ID belirtilmedi." };
    }
    const relativePath = path.join('public', 'curriculum', dataType, `${id}.html`);
    const filePath = path.join(process.cwd(), relativePath);

     try {
        await ensureDirExists(filePath);
        await fs.writeFile(filePath, content, 'utf-8');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: 'HTML dosyası yazılırken hata oluştu.' };
    }
}

import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";

export async function syncFirestoreToJson(): Promise<{ success: boolean; message?: string; syncedQuestions?: number; syncedActivities?: number; error?: string }> {
    try {
        // 1. Firestore questions
        const questionsSnap = await getDocs(collection(db, "questions"));
        const questionsByTopic: Record<string, any[]> = {};
        
        questionsSnap.docs.forEach(doc => {
            const data: any = { id: doc.id, ...doc.data() };
            const topicId = data.topicId;
            if (topicId) {
                if (!questionsByTopic[topicId]) questionsByTopic[topicId] = [];
                questionsByTopic[topicId].push(data);
            }
        });

        // 2. Firestore activityItems
        const activitiesSnap = await getDocs(collection(db, "activityItems"));
        const activitiesByTopic: Record<string, any[]> = {};

        activitiesSnap.docs.forEach(doc => {
            const data: any = { id: doc.id, ...doc.data() };
            const topicId = data.topicId;
            if (topicId) {
                if (!activitiesByTopic[topicId]) activitiesByTopic[topicId] = [];
                activitiesByTopic[topicId].push(data);
            }
        });

        let totalQuestions = 0;
        let totalActivities = 0;

        // 3. Write questions to public/curriculum/questions/{topicId}.json
        for (const [topicId, newQuestions] of Object.entries(questionsByTopic)) {
            const filePath = path.join(process.cwd(), 'public', 'curriculum', 'questions', `${topicId}.json`);
            await ensureDirExists(filePath);

            let existing: any[] = [];
            try {
                const content = await fs.readFile(filePath, 'utf-8');
                existing = JSON.parse(content);
            } catch (e) {}

            const existingTexts = new Set(existing.map(q => (q.text || q.questionText || q.id || '').trim().toLowerCase()));
            const merged = [...existing];

            for (const q of newQuestions) {
                const key = (q.text || q.questionText || q.id || '').trim().toLowerCase();
                if (!existingTexts.has(key)) {
                    merged.push(q);
                    existingTexts.add(key);
                    totalQuestions++;
                }
            }

            await fs.writeFile(filePath, JSON.stringify(merged, null, 2), 'utf-8');
        }

        // 4. Write activities to public/curriculum/activities/{topicId}.json
        for (const [topicId, newActivities] of Object.entries(activitiesByTopic)) {
            const filePath = path.join(process.cwd(), 'public', 'curriculum', 'activities', `${topicId}.json`);
            await ensureDirExists(filePath);

            let existing: any[] = [];
            try {
                const content = await fs.readFile(filePath, 'utf-8');
                existing = JSON.parse(content);
            } catch (e) {}

            const existingKeys = new Set(existing.map(a => {
                const text = a.content?.text || a.content?.term || a.id || '';
                return `${a.type || ''}_${text.trim().toLowerCase()}`;
            }));

            const merged = [...existing];
            for (const a of newActivities) {
                const text = a.content?.text || a.content?.term || a.id || '';
                const key = `${a.type || ''}_${text.trim().toLowerCase()}`;
                if (!existingKeys.has(key)) {
                    merged.push(a);
                    existingKeys.add(key);
                    totalActivities++;
                }
            }

            await fs.writeFile(filePath, JSON.stringify(merged, null, 2), 'utf-8');
        }

        clearStaticGameCache();

        return {
            success: true,
            syncedQuestions: totalQuestions,
            syncedActivities: totalActivities,
            message: `Senkronizasyon tamamlandı: ${totalQuestions} soru ve ${totalActivities} etkinlik JSON dosyalarına aktarıldı.`
        };
    } catch (error: any) {
        console.error("Sync error:", error);
        return { success: false, error: error.message || "Senkronizasyon sırasında hata oluştu." };
    }
}
