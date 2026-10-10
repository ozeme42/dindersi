
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

            // Manifest dosyasını senkronize et
            const manifestPath = path.join(process.cwd(), 'public', 'curriculum', 'manifest.json');
            try {
                const manifestRaw = await fs.readFile(manifestPath, 'utf-8');
                const manifest = JSON.parse(manifestRaw);
                let modified = false;

                for (const cg of manifest.classGroups || []) {
                    for (const c of cg.courses || []) {
                        if (c.id === courseId || !courseId) {
                            for (const u of c.units || []) {
                                if (u.id === unitId) {
                                    if (data.title) u.title = data.title;
                                    if (data.htmlContent !== undefined) u.hasUnitOzet = data.htmlContent.length > 0;
                                    if (data.steps !== undefined) u.hasFlowContent = data.steps.length > 0;
                                    modified = true;
                                }
                            }
                        }
                    }
                }

                if (modified) {
                    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
                }
            } catch (manifestErr) {
                console.warn("Manifest update warning in updateUnitContent:", manifestErr);
            }
        } catch (syncErr) {
            console.warn("Static file sync error in updateUnitContent:", syncErr);
        }

        try {
            const { clearCurriculumSelectionCache } = await import('@/components/actions/get-curriculum-for-selection');
            const { clearFlowDataCache } = await import('@/app/teacher/ders-akisi/actions');
            const { revalidatePath, revalidateTag } = await import('next/cache');
            
            clearFlowDataCache();
            await clearCurriculumSelectionCache();
            (revalidateTag as any)('curriculum');
            revalidatePath('/');
            revalidatePath('/student');
            revalidatePath('/curriculum');
            revalidatePath('/teacher/content-creation');
            revalidatePath('/teacher/ders-akisi');
        } catch {}

        return { success: true };
    } catch (e: any) {
        console.error("Error updating unit content:", e);
        return { success: false, error: "Ünite içeriği güncellenemedi." };
    }
}

/**
 * Üniteye ait kaynak metni getirir.
 * Eğer ünitenin doğrudan metni yoksa (veya forceCombineTopics=true ise),
 * bu üniteye ait tüm konuların kaynak metinlerini başlıklarıyla birlikte birleştirip döndürür.
 */
export async function getUnitSourceText(
    courseId: string,
    unitId: string,
    forceCombineTopics: boolean = false
): Promise<{ success: boolean; sourceText: string; topicCount: number; isCombined: boolean; error?: string }> {
    try {
        if (!unitId) {
            return { success: false, sourceText: '', topicCount: 0, isCombined: false, error: 'Ünite ID eksik.' };
        }

        const fs = await import('fs/promises');
        const path = await import('path');

        // 1. source-texts.json oku
        const sourceTextsPath = path.join(process.cwd(), 'public', 'curriculum', 'source-texts.json');
        let sourceData: { topics: Record<string, string>; units: Record<string, string> } = { topics: {}, units: {} };
        try {
            const raw = await fs.readFile(sourceTextsPath, 'utf-8');
            sourceData = JSON.parse(raw);
        } catch (e) {
            console.warn("source-texts.json read warning in getUnitSourceText:", e);
        }

        // 2. Firestore'dan üniteyi kontrol et
        let firestoreUnitSourceText = '';
        if (courseId && unitId) {
            try {
                const { getDoc } = await import('firebase/firestore');
                const unitRef = doc(db, `courses/${courseId}/units/${unitId}`);
                const unitSnap = await getDoc(unitRef);
                if (unitSnap.exists()) {
                    firestoreUnitSourceText = (unitSnap.data() as any)?.sourceText || '';
                }
            } catch (e) {
                console.warn("Firestore unit read warning in getUnitSourceText:", e);
            }
        }

        const directSourceText = (firestoreUnitSourceText || sourceData.units?.[unitId] || '').trim();

        // Eğer kullanıcı özellikle "konulardan birleştir" demediyse ve doğrudan metin varsa onu kullan
        if (!forceCombineTopics && directSourceText) {
            return {
                success: true,
                sourceText: directSourceText,
                topicCount: 0,
                isCombined: false
            };
        }

        // 3. Manifest dosyasından ünitenin konularını bul
        const manifestPath = path.join(process.cwd(), 'public', 'curriculum', 'manifest.json');
        let manifest: any = { classGroups: [] };
        try {
            const manifestRaw = await fs.readFile(manifestPath, 'utf-8');
            manifest = JSON.parse(manifestRaw);
        } catch (e) {
            console.warn("manifest.json read warning in getUnitSourceText:", e);
        }

        let unitTopics: Array<{ id: string; title: string; sourceText?: string }> = [];
        for (const cg of manifest.classGroups || []) {
            for (const c of cg.courses || []) {
                if (!courseId || c.id === courseId) {
                    for (const u of c.units || []) {
                        if (u.id === unitId) {
                            unitTopics = u.topics || [];
                            break;
                        }
                    }
                }
                if (unitTopics.length > 0) break;
            }
            if (unitTopics.length > 0) break;
        }

        // Eğer manifest'ten bulunamadıysa (kurs filtresi olmadan da tara)
        if (unitTopics.length === 0) {
            for (const cg of manifest.classGroups || []) {
                for (const c of cg.courses || []) {
                    for (const u of c.units || []) {
                        if (u.id === unitId) {
                            unitTopics = u.topics || [];
                            break;
                        }
                    }
                    if (unitTopics.length > 0) break;
                }
                if (unitTopics.length > 0) break;
            }
        }

        // Eğer hala bulunamadıysa Firestore subcollection'dan çek
        if (unitTopics.length === 0 && courseId && unitId) {
            try {
                const { collection, getDocs } = await import('firebase/firestore');
                const topicsCol = collection(db, `courses/${courseId}/units/${unitId}/topics`);
                const snap = await getDocs(topicsCol);
                unitTopics = snap.docs.map(d => ({
                    id: d.id,
                    title: (d.data() as any).title || '',
                    sourceText: (d.data() as any).sourceText
                }));
            } catch (e) {
                console.warn("Firestore topics read warning in getUnitSourceText:", e);
            }
        }

        // Konu kaynak metinlerini birleştir
        const compositeParts: string[] = [];
        let foundTopicCount = 0;

        for (let idx = 0; idx < unitTopics.length; idx++) {
            const t = unitTopics[idx];
            let tText = (sourceData.topics?.[t.id] || t.sourceText || '').trim();

            if (!tText && courseId && unitId) {
                try {
                    const { getDoc } = await import('firebase/firestore');
                    const tRef = doc(db, `courses/${courseId}/units/${unitId}/topics/${t.id}`);
                    const tSnap = await getDoc(tRef);
                    if (tSnap.exists()) {
                        tText = ((tSnap.data() as any)?.sourceText || '').trim();
                    }
                } catch {}
            }

            if (tText) {
                foundTopicCount++;
                const titleStr = t.title || `Konu ${idx + 1}`;
                compositeParts.push(`### ${titleStr}\n\n${tText}`);
            }
        }

        const combinedFromTopics = compositeParts.join('\n\n---\n\n');

        if (combinedFromTopics) {
            // İsteğe bağlı: Yerel dosyaya da kaydet ki sonraki istekler hızlı olsun
            try {
                if (!sourceData.units) sourceData.units = {};
                sourceData.units[unitId] = combinedFromTopics;
                await fs.writeFile(sourceTextsPath, JSON.stringify(sourceData, null, 2), 'utf-8');
            } catch {}

            return {
                success: true,
                sourceText: combinedFromTopics,
                topicCount: foundTopicCount,
                isCombined: true
            };
        }

        return {
            success: true,
            sourceText: directSourceText || '',
            topicCount: 0,
            isCombined: false
        };
    } catch (e: any) {
        console.error("Error in getUnitSourceText:", e);
        return {
            success: false,
            sourceText: '',
            topicCount: 0,
            isCombined: false,
            error: e.message || 'Kaynak metin alınamadı.'
        };
    }
}

