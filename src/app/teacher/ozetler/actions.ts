'use server';

import fs from 'fs/promises';
import path from 'path';
import { getAdminDb } from '@/lib/firebase-admin';
import { syncCurriculumManifest } from '@/app/teacher/content-creation/actions';
import { resolveActiveGeminiConfig } from '@/ai/ai-config-service';
import { runGeminiWithFallback } from '@/ai/gemini-fallback-runner';
import { revalidatePath, revalidateTag } from 'next/cache';

export interface OzetItem {
    id: string;
    targetId: string;
    courseId: string;
    unitId: string;
    topicId?: string | null;
    type: 'unit' | 'topic';
    title: string;
    htmlContent: string;
    sourceText?: string;
    sourceWordCount: number;
    className: string;
    grade: string;
    unitTitle: string;
    courseTitle: string;
    wordCount: number;
    charCount: number;
    hasOzet: boolean;
    topicsCountInUnit?: number;
    topicsWithSourceCountInUnit?: number;
}

const OZETLER_DIR = path.join(process.cwd(), 'public', 'curriculum', 'ozetler');
const MANIFEST_PATH = path.join(process.cwd(), 'public', 'curriculum', 'manifest.json');
const SOURCE_TEXTS_PATH = path.join(process.cwd(), 'public', 'curriculum', 'source-texts.json');

const formatCourseTitle = (title: string): string => {
    if (!title) return '';
    const lower = title.toLocaleLowerCase('tr').trim();
    if (lower === 'dkab' || lower.includes('dkab') || lower === 'din' || lower.includes('din kültürü')) {
        return 'Din Kültürü ve Ahlak Bilgisi';
    }
    if (lower === 'siyer' || lower.includes('siyer') || lower.includes('peygamber')) {
        return 'Peygamberimizin Hayatı';
    }
    if (lower.includes('kuran') || lower.includes('kur’an') || lower.includes('kur-an')) {
        return "Kur'an-ı Kerim";
    }
    if (lower.includes('temel dini')) {
        return 'Temel Dini Bilgiler';
    }
    return title;
};

function getHtmlWordCount(html: string): number {
    if (!html) return 0;
    const cleanText = html.replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/gi, ' ').trim();
    return cleanText ? cleanText.split(/\s+/).filter(Boolean).length : 0;
}

function getTextWordCount(text: string): number {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Loads all unit and topic summaries with their associated textbook source texts.
 */
export async function loadAllOzetlerData(): Promise<{ success: boolean; items: OzetItem[]; error?: string }> {
    try {
        await fs.mkdir(OZETLER_DIR, { recursive: true });

        // 1. Manifest
        let manifest: any = { classGroups: [] };
        try {
            const manifestRaw = await fs.readFile(MANIFEST_PATH, 'utf-8');
            manifest = JSON.parse(manifestRaw);
        } catch (e) {
            console.warn('Manifest read error in loadAllOzetlerData:', e);
        }

        // 2. Local Source Texts (public/curriculum/source-texts.json)
        let sourceTextsMap: { topics: Record<string, string>; units: Record<string, string> } = { topics: {}, units: {} };
        try {
            const sourceRaw = await fs.readFile(SOURCE_TEXTS_PATH, 'utf-8');
            sourceTextsMap = JSON.parse(sourceRaw);
        } catch (e) {
            console.warn('source-texts.json read warning:', e);
        }

        // 3. Available HTML files in public/curriculum/ozetler
        let existingFiles: Set<string> = new Set();
        try {
            const fileList = await fs.readdir(OZETLER_DIR);
            existingFiles = new Set(fileList.map(f => f.toLowerCase()));
        } catch (e) {
            console.warn('Error reading ozetler dir:', e);
        }

        const items: OzetItem[] = [];

        for (const cg of manifest.classGroups || []) {
            const grade = cg.name;
            const className = `${grade}. Sınıf`;

            for (const course of cg.courses || []) {
                const fullCourseTitle = formatCourseTitle(course.title);

                for (const unit of course.units || []) {
                    // Konu kaynak metinlerini topla (Ünite özeti sentezi için)
                    const unitTopics = unit.topics || [];
                    let topicsWithSourceCount = 0;
                    const compositeTopicTexts: string[] = [];

                    for (let idx = 0; idx < unitTopics.length; idx++) {
                        const t = unitTopics[idx];
                        const tSource = (sourceTextsMap.topics[t.id] || t.sourceText || '').trim();
                        if (tSource) {
                            topicsWithSourceCount++;
                            compositeTopicTexts.push(`=== ${idx + 1}. KONU: ${t.title} ===\n${tSource}`);
                        }
                    }

                    const unitDirectSource = (sourceTextsMap.units[unit.id] || unit.sourceText || '').trim();
                    const combinedUnitSourceText = unitDirectSource 
                        ? (unitDirectSource + (compositeTopicTexts.length > 0 ? '\n\n' + compositeTopicTexts.join('\n\n') : ''))
                        : compositeTopicTexts.join('\n\n');

                    // 1. ÜNİTE ÖZETİ (Unit Summary)
                    const unitFile = `${unit.id}.html`.toLowerCase();
                    let unitHtml = '';
                    if (existingFiles.has(unitFile)) {
                        try {
                            unitHtml = await fs.readFile(path.join(OZETLER_DIR, `${unit.id}.html`), 'utf-8');
                        } catch (err) {
                            console.warn(`Error reading unit summary file ${unit.id}:`, err);
                        }
                    }

                    const unitTrimmed = (unitHtml || '').trim();
                    const unitWordCount = getHtmlWordCount(unitTrimmed);

                    items.push({
                        id: `unit_${unit.id}`,
                        targetId: unit.id,
                        courseId: course.id,
                        unitId: unit.id,
                        topicId: null,
                        type: 'unit',
                        title: `${unit.title} (Ünite Özeti)`,
                        htmlContent: unitTrimmed,
                        sourceText: combinedUnitSourceText,
                        sourceWordCount: getTextWordCount(combinedUnitSourceText),
                        className,
                        grade,
                        unitTitle: unit.title,
                        courseTitle: fullCourseTitle,
                        wordCount: unitWordCount,
                        charCount: unitTrimmed.length,
                        hasOzet: unitWordCount > 0 || !!unit.hasUnitOzet,
                        topicsCountInUnit: unitTopics.length,
                        topicsWithSourceCountInUnit: topicsWithSourceCount
                    });

                    // 2. KONU ÖZETLERİ (Topic Summaries)
                    for (const topic of unitTopics) {
                        const topicFile = `${topic.id}.html`.toLowerCase();
                        let topicHtml = '';
                        if (existingFiles.has(topicFile)) {
                            try {
                                topicHtml = await fs.readFile(path.join(OZETLER_DIR, `${topic.id}.html`), 'utf-8');
                            } catch (err) {
                                console.warn(`Error reading topic summary file ${topic.id}:`, err);
                            }
                        }

                        const topicTrimmed = (topicHtml || '').trim();
                        const topicWordCount = getHtmlWordCount(topicTrimmed);
                        const topicSource = (sourceTextsMap.topics[topic.id] || topic.sourceText || '').trim();

                        items.push({
                            id: `topic_${topic.id}`,
                            targetId: topic.id,
                            courseId: course.id,
                            unitId: unit.id,
                            topicId: topic.id,
                            type: 'topic',
                            title: topic.title,
                            htmlContent: topicTrimmed,
                            sourceText: topicSource,
                            sourceWordCount: getTextWordCount(topicSource),
                            className,
                            grade,
                            unitTitle: unit.title,
                            courseTitle: fullCourseTitle,
                            wordCount: topicWordCount,
                            charCount: topicTrimmed.length,
                            hasOzet: topicWordCount > 0 || !!topic.hasOzetContent
                        });
                    }
                }
            }
        }

        return { success: true, items };
    } catch (error: any) {
        console.error('Error in loadAllOzetlerData:', error);
        return { success: false, items: [], error: error.message || 'Özet verileri yüklenirken bir hata oluştu.' };
    }
}

/**
 * Saves a unit summary or topic summary.
 */
export async function saveOzetContent(
    courseId: string,
    unitId: string,
    topicId: string | null | undefined,
    htmlContent: string
): Promise<{ success: boolean; wordCount: number; error?: string }> {
    if (!courseId || !unitId) {
        return { success: false, wordCount: 0, error: "Ders veya ünite ID'si eksik." };
    }

    const targetId = topicId || unitId;
    const isTopic = !!topicId;
    const trimmedHtml = (htmlContent || '').trim();
    const wordCount = getHtmlWordCount(trimmedHtml);

    try {
        await fs.mkdir(OZETLER_DIR, { recursive: true });

        // 1. Yerel HTML dosyasına kaydet
        const targetHtmlPath = path.join(OZETLER_DIR, `${targetId}.html`);
        await fs.writeFile(targetHtmlPath, trimmedHtml, 'utf-8');

        // Opsiyonel JSON dosyası
        const targetJsonPath = path.join(OZETLER_DIR, `${targetId}.json`);
        try {
            await fs.writeFile(targetJsonPath, JSON.stringify({
                htmlContent: trimmedHtml,
                updatedAt: new Date().toISOString()
            }, null, 2), 'utf-8');
        } catch {}

        // 2. Firestore veritabanına kaydet
        try {
            const db = getAdminDb();
            if (db) {
                if (isTopic) {
                    await db.collection('courses')
                        .doc(courseId)
                        .collection('units')
                        .doc(unitId)
                        .collection('topics')
                        .doc(topicId)
                        .set({
                            htmlContent: trimmedHtml,
                            hasOzetContent: trimmedHtml.length > 0,
                            updatedAt: new Date()
                        }, { merge: true });
                } else {
                    await db.collection('courses')
                        .doc(courseId)
                        .collection('units')
                        .doc(unitId)
                        .set({
                            htmlContent: trimmedHtml,
                            hasUnitOzet: trimmedHtml.length > 0,
                            updatedAt: new Date()
                        }, { merge: true });
                }
            }
        } catch (dbErr) {
            console.warn('Firestore update warning (local file saved successfully):', dbErr);
        }

        // 3. Manifest dosyasında bayrağı güncelle
        try {
            const manifestRaw = await fs.readFile(MANIFEST_PATH, 'utf-8');
            const manifest = JSON.parse(manifestRaw);
            let updated = false;

            for (const cg of manifest.classGroups || []) {
                const c = (cg.courses || []).find((x: any) => x.id === courseId);
                if (c) {
                    const u = (c.units || []).find((x: any) => x.id === unitId);
                    if (u) {
                        if (isTopic) {
                            const t = (u.topics || []).find((x: any) => x.id === topicId);
                            if (t) {
                                t.hasOzetContent = trimmedHtml.length > 0;
                                updated = true;
                            }
                        } else {
                            u.hasUnitOzet = trimmedHtml.length > 0;
                            updated = true;
                        }
                    }
                }
                if (updated) break;
            }

            if (updated) {
                await fs.writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf-8');
            }
        } catch (mErr) {
            console.warn('Manifest local update warning:', mErr);
        }

        syncCurriculumManifest().catch(() => {});

        try {
            (revalidateTag as any)('curriculum');
            revalidatePath('/teacher/ozetler');
            revalidatePath('/teacher/smartboard/ozetler');
            revalidatePath('/student/ozetler');
            revalidatePath('/ozetler');
        } catch {}

        return { success: true, wordCount };
    } catch (error: any) {
        console.error('Error saving ozet content:', error);
        return { success: false, wordCount: 0, error: error.message || 'Özet kaydedilirken bir hata oluştu.' };
    }
}

/**
 * Clears / deletes a summary.
 */
export async function clearOzetContent(
    courseId: string,
    unitId: string,
    topicId: string | null | undefined
): Promise<{ success: boolean; error?: string }> {
    return saveOzetContent(courseId, unitId, topicId, '');
}

/**
 * AI Summary Generator (Strictly derived from Textbook Source Text).
 */
export async function generateOzetWithAi(params: {
    title: string;
    type: 'unit' | 'topic';
    sourceText?: string;
    grade?: string;
    courseTitle?: string;
    unitTitle?: string;
    topicTitles?: string[];
    apiKey?: string;
    modelName?: string;
}): Promise<{ success: boolean; htmlContent?: string; error?: string }> {
    const { title, type, sourceText, grade, courseTitle, unitTitle, topicTitles, apiKey: customKey, modelName: customModel } = params;

    try {
        const resolved = await resolveActiveGeminiConfig();
        const apiKey = customKey?.trim() || resolved.apiKey;
        const modelName = customModel?.trim() || resolved.modelName || 'gemini-3.7-flash';
        if (!apiKey) {
            return {
                success: false,
                error: 'Gemini API anahtarı sistemde tanımlı değil. Lütfen Ayarlar sayfasından veya üst menüden API anahtarınızı giriniz.'
            };
        }

        const isUnit = type === 'unit';

        let prompt = '';

        if (isUnit) {
            // ════════════════════════════════════════════════════════════
            // ÜNİTE GENEL ÖZETİ (TÜM KONU KAYNAK METİNLERİNDEN SENTEZ)
            // ════════════════════════════════════════════════════════════
            prompt = `Sen Milli Eğitim Bakanlığı (MEB) Din Kültürü ve Ahlak Bilgisi ile İmam Hatip ders kitapları alanında uzman bir başyazar ve kıdemli eğitim teknolojisi uzmanısın.
GÖREVİN: Aşağıda verilen ders kitabı kaynak metinlerinin TAMAMINI inceleyerek, bu ünitenin bütünü için akıllı tahtada, tablette ve ders tekrarlarında kullanılabilecek MÜKEMMEL BİR ÜNİTE GENEL TEKRAR ÖZETİ VE KAVRAM HARİTASI (HTML) hazırlamaktır.

HEDEF: ${unitTitle} - ÜNİTE GENEL ÖZETİ & TEKRAR REHBERİ
SINIF: ${grade ? `${grade}. Sınıf` : 'Ortaokul'}
DERS: ${courseTitle || 'Din Kültürü ve Ahlak Bilgisi'}
${topicTitles && topicTitles.length > 0 ? `ÜNİTEDEKİ KONULAR:\n${topicTitles.map((t, idx) => `${idx + 1}. ${t}`).join('\n')}\n` : ''}

DERS KİTABI ÜNİTE KAYNAK METİNLERİ:
"""
${sourceText || 'Ünite konularının MEB Din Kültürü müfredatındaki standart bilgilerini temel al.'}
"""

KESİN KURALLAR:
1. KAYNAK METNE %100 SADAKAT:
   - Sadece verilen ders kitabı metinlerindeki bilgileri, kavramları ve ayet/hadisleri özetle. Metinde geçmeyen yabancı bilgi uydurma.
2. ÜNİTE BÜTÜNLÜĞÜ:
   - Ünitedeki her konudan en az 1 ana fikir ve temel kazanımı kapsa.
3. KAVRAMLAR KUTUSU:
   - Ünitede geçen tüm temel kavramları (Örn: Vahiy, Nübüvvet, Mucize, İhlas, Tevhit vb.) kartlar halinde listele.
4. AYET & HADİS BÖLÜMÜ:
   - Metinde geçen kilit ayet ve hadisleri düzgün Arapça hatla ve Türkçe mealiyle öne çıkar.
5. SINAV İPUÇLARI / ALTIN NOTLAR:
   - "📌 Üniteyi Bitirirken Unutma!" başlığı altında 3-5 can alıcı püf noktasını kutula.
6. FORMAT:
   - Bağımsız, doğrudan render edilebilir geçerli HTML.
   - Tailwind CSS CDN (<script src="https://cdn.tailwindcss.com"></script>) ve FontAwesome (<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />) ekle.
   - Açık, göz yormayan, ferah ve modern renk tonları (bg-slate-50 veya bg-emerald-50).
   - Çıktı olarak SADECE HTML kodunu döndür, selamlama veya markdown backtick kullanma.`;
        } else {
            // ════════════════════════════════════════════════════════════
            // KONU ÖZETİ (KONU DERS KİTABI KAYNAK METNİNDEN)
            // ════════════════════════════════════════════════════════════
            prompt = `Sen Milli Eğitim Bakanlığı (MEB) Din Kültürü ve Ahlak Bilgisi alanında uzman bir başyazar ve kıdemli eğitim teknolojisi tasarımcısısın.
GÖREVİN: Aşağıda verilen ders kitabı kaynak metnine %100 SADIK KALARAK, bu konunun akıllı tahtada sunulabilecek ve öğrencilerin tek bakışta anlayabileceği EN NİTELİKLİ VE ÇEKİCİ İNTERAKTİF DERS ÖZETİNİ (HTML) hazırlamaktır.

HEDEF: ${title} (Konu Özeti)
SINIF: ${grade ? `${grade}. Sınıf` : 'Ortaokul'}
DERS: ${courseTitle || 'Din Kültürü ve Ahlak Bilgisi'}
ÜNİTE: ${unitTitle || 'İlgili Ünite'}

DERS KİTABI KAYNAK METNİ:
"""
${sourceText || 'Bu konunun MEB Din Kültürü müfredatındaki standart ders kitabı bilgilerini temel al.'}
"""

KESİN KURALLAR:
1. DERS KİTABINA %100 SADAKAT (EN KRİTİK):
   - Kaynak metinde geçen hiçbir temel kavramı, ayeti veya açıklamayı atlama.
   - Metinde geçmeyen bilgileri kafana göre ekleme.
2. KAVRAMLAR VE TANIMLARI:
   - Metindeki kilit kavramları (Örn: Tevhit, İman, Esma-i Hüsna, Sadaka vb.) belirgin renkli kartlar olarak yerleştir.
3. KAZANIM MADDELERİ:
   - Konunun ana fikrini 3-5 maddelik şık ikonlu maddelerle özetle.
4. AYET VE HADİS KUTUSU (ÖNCELİKLİ):
   - Metinde ayet veya hadis geçiyorsa mutlaka Arapça hat metnini (font-arabic veya text-xl text-emerald-900) ve Türkçe mealini ekle.
5. AKILDA KALICI PÜF NOKTA:
   - "💡 Unutmayalım!" veya "🎯 Sınav İpucu" kutusu ekle.
6. FORMAT:
   - Bağımsız, doğrudan render edilebilir geçerli HTML.
   - Tailwind CSS CDN (<script src="https://cdn.tailwindcss.com"></script>) ve FontAwesome (<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />) ekle.
   - Ferah, göz yormayan, okunaklı modern kart tasarımı (rounded-2xl / rounded-3xl).
   - Çıktı olarak SADECE HTML kodunu döndür, selamlama veya markdown backtick kullanma.`;
        }

        const generatedRaw = await runGeminiWithFallback({
            apiKey,
            primaryModel: modelName,
            prompt
        });

        let cleaned = (generatedRaw || '').trim();
        if (cleaned.startsWith('```html')) {
            cleaned = cleaned.slice(7);
        } else if (cleaned.startsWith('```')) {
            cleaned = cleaned.slice(3);
        }
        if (cleaned.endsWith('```')) {
            cleaned = cleaned.slice(0, -3);
        }
        cleaned = cleaned.trim();

        return { success: true, htmlContent: cleaned };
    } catch (err: any) {
        console.error('Error generating summary with AI:', err);
        return { success: false, error: err.message || 'Yapay zeka ile özet üretilirken bir hata oluştu.' };
    }
}

/**
 * Batch Generates Summaries for all topics in a unit from their source texts.
 */
export async function batchGenerateUnitTopicSummaries(
    courseId: string, 
    unitId: string,
    apiKey?: string,
    modelName?: string
): Promise<{ success: boolean; generatedCount: number; errors: string[] }> {
    try {
        const dataRes = await loadAllOzetlerData();
        if (!dataRes.success || !dataRes.items) {
            return { success: false, generatedCount: 0, errors: ['Veriler yüklenemedi.'] };
        }

        const unitTopics = dataRes.items.filter(i => 
            i.courseId === courseId && 
            i.unitId === unitId && 
            i.type === 'topic' &&
            i.sourceText && 
            i.sourceText.trim().length > 50
        );

        if (unitTopics.length === 0) {
            return { success: false, generatedCount: 0, errors: ['Bu ünitede kaynak metni olan konu bulunamadı.'] };
        }

        let count = 0;
        const errors: string[] = [];

        for (const topic of unitTopics) {
            try {
                const aiRes = await generateOzetWithAi({
                    title: topic.title,
                    type: 'topic',
                    sourceText: topic.sourceText,
                    grade: topic.grade,
                    courseTitle: topic.courseTitle,
                    unitTitle: topic.unitTitle,
                    apiKey,
                    modelName
                });

                if (aiRes.success && aiRes.htmlContent) {
                    await saveOzetContent(courseId, unitId, topic.topicId, aiRes.htmlContent);
                    count++;
                } else if (aiRes.error) {
                    errors.push(`${topic.title}: ${aiRes.error}`);
                }
            } catch (err: any) {
                errors.push(`${topic.title}: ${err.message}`);
            }
        }

        return { success: count > 0, generatedCount: count, errors };
    } catch (err: any) {
        return { success: false, generatedCount: 0, errors: [err.message] };
    }
}

/**
 * Saves source text for a topic or unit both to Firestore and to public/curriculum/source-texts.json.
 */
export async function saveItemSourceText(
    courseId: string,
    unitId: string,
    topicId: string | null | undefined,
    sourceText: string
): Promise<{ success: boolean; wordCount: number; error?: string }> {
    if (!courseId || !unitId) {
        return { success: false, wordCount: 0, error: "Eksik parametre: ders veya ünite ID'si bulunamadı." };
    }

    try {
        const db = getAdminDb();
        const trimmed = (sourceText || '').trim();
        const wordCount = getTextWordCount(trimmed);
        const isTopic = !!topicId;

        // 1. Firestore güncelle
        if (isTopic) {
            await db.collection('courses')
                .doc(courseId)
                .collection('units')
                .doc(unitId)
                .collection('topics')
                .doc(topicId!)
                .update({
                    sourceText: trimmed,
                    updatedAt: new Date()
                });
        } else {
            await db.collection('courses')
                .doc(courseId)
                .collection('units')
                .doc(unitId)
                .set({
                    sourceText: trimmed,
                    updatedAt: new Date()
                }, { merge: true });
        }

        // 2. Yerel source-texts.json güncelle
        try {
            let data: { topics: Record<string, string>; units: Record<string, string> } = { topics: {}, units: {} };
            try {
                const raw = await fs.readFile(SOURCE_TEXTS_PATH, 'utf-8');
                data = JSON.parse(raw);
            } catch {}
            if (!data.topics) data.topics = {};
            if (!data.units) data.units = {};

            const targetKey = isTopic ? topicId! : unitId;
            const targetCategory = isTopic ? data.topics : data.units;

            if (trimmed) {
                targetCategory[targetKey] = trimmed;
            } else {
                delete targetCategory[targetKey];
            }

            await fs.writeFile(SOURCE_TEXTS_PATH, JSON.stringify(data, null, 2), 'utf-8');
        } catch (fErr) {
            console.warn('source-texts.json update warning:', fErr);
        }

        // 3. Manifest senkronizasyonu
        syncCurriculumManifest().catch(() => {});

        try {
            (revalidateTag as any)('curriculum');
            revalidatePath('/teacher/ozetler');
            revalidatePath('/teacher/source-texts');
        } catch {}

        return { success: true, wordCount };
    } catch (error: any) {
        console.error('Error saving item source text:', error);
        return { success: false, wordCount: 0, error: error.message || 'Kaynak metin kaydedilirken bir hata oluştu.' };
    }
}

import { cleanAndFormatSourceTextWithAi as cleanAndFormatAi } from '@/app/teacher/source-texts/actions';

export async function cleanAndFormatSourceTextWithAi(
    rawText: string, 
    topicTitle?: string,
    apiKey?: string,
    modelName?: string
) {
    return cleanAndFormatAi(rawText, topicTitle, apiKey, modelName);
}
