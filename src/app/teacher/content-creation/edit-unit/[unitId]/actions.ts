
'use server';

import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import type { LessonStep } from '@/lib/types';

export async function updateUnitContent(courseId: string, unitId: string, data: { title: string, htmlContent?: string, steps?: LessonStep[], sourceText?: string }): Promise<{ success: boolean, error?: string }> {
    try {
        if (!courseId || !unitId) {
            throw new Error("Ders veya Ünite ID'si eksik.");
        }
        
        const unitRef = doc(db, `courses/${courseId}/units/${unitId}`);

        const dataToUpdate: any = {};
        if (data.title) {
            dataToUpdate.title = data.title;
        }
        
        if (data.htmlContent !== undefined) {
            dataToUpdate.htmlContent = data.htmlContent;
        }

        if (data.steps !== undefined) {
             dataToUpdate.steps = JSON.parse(JSON.stringify(data.steps));
        }

        if (data.sourceText !== undefined) {
            dataToUpdate.sourceText = data.sourceText;
        }

        await setDoc(unitRef, dataToUpdate, { merge: true });

        // Statik dosya senkronizasyonu
        try {
            const fs = await import('fs/promises');
            const path = await import('path');

            if (data.steps !== undefined) {
                const flowsDir = path.join(process.cwd(), 'public', 'curriculum', 'flows');
                await fs.mkdir(flowsDir, { recursive: true }).catch(() => {});
                await fs.writeFile(path.join(flowsDir, `${unitId}.json`), JSON.stringify(dataToUpdate.steps, null, 2), 'utf-8');
            }

            if (data.htmlContent !== undefined) {
                const ozetlerDir = path.join(process.cwd(), 'public', 'curriculum', 'ozetler');
                await fs.mkdir(ozetlerDir, { recursive: true }).catch(() => {});
                await fs.writeFile(path.join(ozetlerDir, `${unitId}.html`), data.htmlContent, 'utf-8');
            }

            if (data.sourceText !== undefined) {
                const sourceTextsPath = path.join(process.cwd(), 'public', 'curriculum', 'source-texts.json');
                let sourceData: any = { topics: {}, units: {} };
                try {
                    const raw = await fs.readFile(sourceTextsPath, 'utf-8');
                    sourceData = JSON.parse(raw);
                } catch {}
                if (!sourceData.units) sourceData.units = {};
                sourceData.units[unitId] = data.sourceText;
                await fs.writeFile(sourceTextsPath, JSON.stringify(sourceData, null, 2), 'utf-8');
            }
        } catch (syncErr) {
            console.warn("Static file sync error in updateUnitContent:", syncErr);
        }

        return { success: true };
    } catch (e: any) {
        console.error("Error updating unit content:", e);
        return { success: false, error: "Ünite içeriği güncellenemedi." };
    }
}
