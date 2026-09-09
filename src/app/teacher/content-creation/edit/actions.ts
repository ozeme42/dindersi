'use server';

import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import type { LessonStep, YazilacaklarContent } from "@/lib/types";
import { revalidatePath, revalidateTag } from "next/cache";
import fs from 'fs/promises';
import path from 'path';
import { clearFlowDataCache } from "@/app/teacher/ders-akisi/actions";

export async function updateTopicContent({ 
    courseId, 
    unitId, 
    topicId, 
    steps, 
    sourceText,
    htmlContent
}: { 
    courseId: string; 
    unitId: string; 
    topicId: string; 
    steps: Omit<LessonStep, 'id'>[], 
    sourceText?: string;
    htmlContent?: string;
}) {
    try {
        const topicRef = doc(db, 'courses', courseId, 'units', unitId, 'topics', topicId);
        
        // Firestore works best with plain objects, so we serialize the steps array.
        const plainSteps = JSON.parse(JSON.stringify(steps));
        
        await setDoc(topicRef, { 
            steps: plainSteps,
            sourceText: sourceText || '',
            htmlContent: htmlContent || '',
            itemCount: plainSteps.length,
        }, { merge: true });

        // Statik dosya sistemine otomatik senkronizasyon (/curriculum/flows/{topicId}.json)
        try {
            const flowsDir = path.join(process.cwd(), 'public', 'curriculum', 'flows');
            await fs.mkdir(flowsDir, { recursive: true }).catch(() => {});
            await fs.writeFile(
                path.join(flowsDir, `${topicId}.json`),
                JSON.stringify(plainSteps, null, 2),
                'utf-8'
            );
        } catch (flowFsErr) {
            console.warn("Could not sync flow to static file:", flowFsErr);
        }

        // Özet içeriği varsa statik ozetler dosyasına senkronize et (/curriculum/ozetler/{topicId}.html)
        if (htmlContent) {
            try {
                const ozetlerDir = path.join(process.cwd(), 'public', 'curriculum', 'ozetler');
                await fs.mkdir(ozetlerDir, { recursive: true }).catch(() => {});
                await fs.writeFile(
                    path.join(ozetlerDir, `${topicId}.html`),
                    htmlContent,
                    'utf-8'
                );
            } catch (ozetFsErr) {
                console.warn("Could not sync ozet to static file:", ozetFsErr);
            }
        }

        // Kaynak metin varsa statik source-texts.json dosyasına senkronize et
        if (sourceText) {
            try {
                const sourceTextsPath = path.join(process.cwd(), 'public', 'curriculum', 'source-texts.json');
                let sourceData: any = { topics: {}, units: {} };
                try {
                    const raw = await fs.readFile(sourceTextsPath, 'utf-8');
                    sourceData = JSON.parse(raw);
                } catch {}
                if (!sourceData.topics) sourceData.topics = {};
                sourceData.topics[topicId] = sourceText;
                await fs.writeFile(sourceTextsPath, JSON.stringify(sourceData, null, 2), 'utf-8');
            } catch (srcFsErr) {
                console.warn("Could not sync source text to static file:", srcFsErr);
            }
        }

        // Manifest dosyasını (manifest.json) anında güncelle
        // Böylece /teacher/ders-akisi sayfasında eklenen akış anında görünür
        try {
            const manifestPath = path.join(process.cwd(), 'public', 'curriculum', 'manifest.json');
            const manifestContent = await fs.readFile(manifestPath, 'utf-8');
            const manifest = JSON.parse(manifestContent);

            let modified = false;
            for (const cg of manifest.classGroups || []) {
                for (const c of cg.courses || []) {
                    if (c.id === courseId || !courseId) {
                        for (const u of c.units || []) {
                            if (u.id === unitId || !unitId) {
                                for (const t of u.topics || []) {
                                    if (t.id === topicId) {
                                        t.hasFlowContent = plainSteps.length > 0;
                                        if (sourceText) t.hasYazilacaklarContent = true;
                                        if (htmlContent) t.hasOzetContent = true;
                                        modified = true;
                                    }
                                }
                                if (plainSteps.length > 0) {
                                    u.hasFlowContent = true;
                                    modified = true;
                                }
                            }
                        }
                    }
                }
            }

            if (modified) {
                await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
            }
        } catch (manifestErr) {
            console.warn("Could not auto-sync manifest in updateTopicContent:", manifestErr);
        }

        // Bellek içi önbelleği sıfırla ve sayfaları yeniden doğrula
        try {
            clearFlowDataCache();
            (revalidateTag as any)('curriculum');
            revalidatePath('/teacher/ders-akisi');
            revalidatePath('/curriculum');
            revalidatePath('/teacher/content-creation');
        } catch (e) {
            // Edge runtime fallback
        }

        return { success: true };
    } catch (error: any) {
        console.error("Error updating topic content:", error);
        return { success: false, error: "Konu içeriği güncellenirken bir hata oluştu." };
    }
}
