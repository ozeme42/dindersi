'use server';

import fs from 'fs/promises';
import path from 'path';
import { getAdminDb } from '@/lib/firebase-admin';
import { syncCurriculumManifest } from '@/app/teacher/content-creation/actions';
import { resolveActiveGeminiConfig } from '@/ai/ai-config-service';
import { runGeminiWithFallback } from '@/ai/gemini-fallback-runner';
import { revalidatePath, revalidateTag } from 'next/cache';
import { clearCurriculumSelectionCache } from '@/components/actions/get-curriculum-for-selection';
import { NOTEBOOK_SHEET_CSS, formatNotebookSheetHtml } from '@/lib/notebook-sheet-template';

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
    const cleanTitle = title.trim();
    const lower = cleanTitle.toLocaleLowerCase('tr');

    // Sonda veya metin içinde 1 veya 2 (veya Roma rakamı I, II) sayı eki varsa tespit et
    let suffix = '';
    const numMatch = cleanTitle.match(/(?:[\s\-\(\_]+)(1|2|I{1,2})[\)]?$/i) || cleanTitle.match(/\b(1|2)\b/);
    if (numMatch) {
        const val = numMatch[1].toUpperCase();
        suffix = ` ${val === 'I' ? '1' : (val === 'II' ? '2' : val)}`;
    }

    if (lower.includes('temel dini') || lower === 'tdb' || lower.startsWith('tdb') || lower.includes('temel dinî')) {
        return `Temel Dini Bilgiler${suffix}`;
    }
    if (lower === 'dkab' || lower.includes('dkab') || lower === 'din' || lower.includes('din kültürü')) {
        return `Din Kültürü ve Ahlak Bilgisi${suffix}`;
    }
    if (lower === 'siyer' || lower.includes('siyer') || lower.includes('peygamber')) {
        return `Peygamberimizin Hayatı${suffix}`;
    }
    if (lower.includes('kuran') || lower.includes('kur’an') || lower.includes('kur-an')) {
        return `Kur'an-ı Kerim${suffix}`;
    }
    return cleanTitle;
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
            await clearCurriculumSelectionCache();
            (revalidateTag as any)('curriculum');
            revalidatePath('/');
            revalidatePath('/student');
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

// ══════════════════════════════════════════════════════════════════════
// NOTEBOOK-SHEET DERS NOTU ÜRETİMİ
// ══════════════════════════════════════════════════════════════════════

/**
 * AI Summary Generator (Strictly derived from Textbook Source Text in Notebook-Sheet style).
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
        const modelName = customModel?.trim() || resolved.modelName || 'gemini-1.5-flash';
        if (!apiKey) {
            return {
                success: false,
                error: 'Gemini API anahtarı sistemde tanımlı değil. Lütfen Ayarlar sayfasından veya üst menüden API anahtarınızı giriniz.'
            };
        }

        const isUnit = type === 'unit';
        const displayGrade = grade ? `${grade}. Sınıf` : 'Ortaokul';
        const displayTitle = (isUnit ? (unitTitle || title) : title).toUpperCase();

        let prompt = '';

        if (isUnit) {
            // ════════════════════════════════════════════════════════════
            // ÜNİTE GENEL ÖZET FASİKÜLÜ (TÜRKİYE YÜZYILI MAARİF MODELİ)
            // ════════════════════════════════════════════════════════════
            prompt = `Sen Milli Eğitim Bakanlığı (MEB) Din Kültürü ve Ahlak Bilgisi ile İmam Hatip müfredatında uzman başyazar ve kıdemli eğitim fasikülü tasarımcısısın.
GÖREVİN: Aşağıda verilen ders kitabı kaynak metinlerini analiz ederek, "TÜRKİYE YÜZYILI MAARİF MODELİ - DİNDERSİ ATÖLYESİ ÜNİTE ÖZET FASİKÜLÜ" (Single-file HTML) hazırlamaktır.

HEDEF: ${unitTitle || title} (Ünite Özet Fasikülü)
SINIF: ${displayGrade}
DERS: ${courseTitle || 'Din Kültürü ve Ahlak Bilgisi'}
${topicTitles && topicTitles.length > 0 ? `ÜNİTEDEKİ KONULAR:\n${topicTitles.map((t, idx) => `${idx + 1}. ${t}`).join('\n')}\n` : ''}

DERS KİTABI ÜNİTE KAYNAK METİNLERİ:
"""
${sourceText || 'Ünite konularının MEB Din Kültürü müfredatındaki standart ders kitabı bilgilerini temel al.'}
"""

FASİKÜL TASARIMI VE KURAL SİSTEMİ (ÇOK ŞIK VE YAYINEVİ KALİTESİNDE):
Çıktı tam ve geçerli bir HTML5 dokümanı olmalı ve şu standart yapıyı içermelidir:
1. Google Fonts: 'Plus Jakarta Sans:wght@400;500;600;700;800;900'
2. .toolbar: "🖨️ Yazdır / PDF Olarak Kaydet" butonu
3. .fasikul-page: A4 fasikül sayfası kapsayıcısı.
4. .fasikul-header:
   - .top-meta: "TÜRKİYE YÜZYILI MAARİF MODELİ"
   - .brand-pill: "DİNDERSİ ATÖLYESİ" + .brand-sub: "> ÜNİTE ÖZET FASİKÜLÜ <"
   - .badge-grade: "★ ${displayGrade} ★"
   - .unit-banner: "${displayTitle}"
   - .quote-box: <strong>🌙 Ayet/Hadis:</strong> "Konuyla ilgili veciz ayet veya hadis meali"
5. Kutu 1 (.card-box.card-yellow): "★ BU FASİKÜLDE HANGİ KONULAR VAR? <span class='tag-highlight tag-yellow'>(Tam Özet!)</span>"
   - .fasikul-table tablosu: Sütunlar "Konu No" (pill-topic), "Konu Başlığı", "Anahtar Kavramlar".
6. Kutu 2 (.card-box.card-green): "★ ☑ NASIL ÇALIŞMALIYIM? (4 ADIMDA BAŞARI)"
   - .steps-grid (2x2 grid): 1 KEŞFET, 2 TANI, 3 SIRALA, 4 ÖRNEK AL (step-num-1, step-num-2, step-num-3, step-num-4 ile).
7. Kutu 3 (.card-box.card-pink): "★ KAVRAMLAR KUTUSU <span class='tag-highlight tag-red'>(Sınavda Çıkar!)</span>"
   - .concept-row satırları: .c-tag etiketleri (.c-tag-pink, .c-tag-blue, .c-tag-green, .c-tag-orange, .c-tag-purple) ve .hl-yellow vurgulu açıklamalar.
8. Kutu 4 (.grid-2): İki sütunlu detay kartları (.card-orange ve .card-blue):
   - Önemli olaylar, ilkeler, vefa ve ahlaki kazanımlar (yıldızlı maddeler ★ ile).
9. Kutu 5 (.card-box.card-purple): "★ GÖRSEL ŞEMA: KAVRAM VEYA İSİMLER ŞEMASI"
   - .family-tree veya .bubble-wrap ile görsel bağlantılı düğümler.
10. Kutu 6 (.card-box.card-yellow): "★ YAŞ DÖNEMLERİ / ADIM ADIM GELİŞİM TABLOSU"
   - .fasikul-table içinde renkli numara daireleri ve aşamalar.
11. Kutu 7 (.card-box.card-orange): "★ TARİH ŞERİDİ: KRONOLOJİ TABLOSU <span class='tag-highlight tag-yellow'>(Kitap Özeti!)</span>"
   - .timeline-table: İki sütunlu (örneğin Mekke Dönemi vs Medine Dönemi veya 1. Aşama vs 2. Aşama) ve renkli .year-badge rozetleri.
12. .fasikul-footer: "▶ <strong>DİNDERSİ ATÖLYESİ</strong> | ${unitTitle || title} Özet Fasikülü"

PEDAGOJİK VE İÇERİK KURALLARI:
- Verilen ders kitabı kaynak metnine %100 SADIK KAL. Bilgi uydurma.
- Çıktı olarak SADECE tam, geçerli <!DOCTYPE html> ile başlayan ve </html> ile biten HTML kodunu ver.
- Markdown backtick veya açıklama yazma.`;
        } else {
            // ════════════════════════════════════════════════════════════
            // KONU ÖZET FASİKÜLÜ (TÜRKİYE YÜZYILI MAARİF MODELİ)
            // ════════════════════════════════════════════════════════════
            prompt = `Sen Milli Eğitim Bakanlığı (MEB) Din Kültürü ve Ahlak Bilgisi alanında uzman başyazar ve kıdemli eğitim fasikülü tasarımcısısın.
GÖREVİN: Aşağıda verilen konu kaynak metnine %100 SADIK KALARAK, akıllı tahtada, mobilde ve baskıda öğrencilerin hayran kalacağı "TÜRKİYE YÜZYILI MAARİF MODELİ - DİNDERSİ ATÖLYESİ KONU ÖZET FASİKÜLÜ" (Single-file HTML) hazırlamaktır.

HEDEF: ${title} (Konu Özet Fasikülü)
SINIF: ${displayGrade}
DERS: ${courseTitle || 'Din Kültürü ve Ahlak Bilgisi'}
ÜNİTE: ${unitTitle || 'İlgili Ünite'}

DERS KİTABI KAYNAK METNİ:
"""
${sourceText || 'Bu konunun MEB Din Kültürü müfredatındaki standart ders kitabı bilgilerini temel al.'}
"""

FASİKÜL TASARIMI VE KURAL SİSTEMİ (ÇOK ŞIK VE YAYINEVİ KALİTESİNDE):
Çıktı tam ve geçerli bir HTML5 dokümanı olmalı ve şu standart yapıyı içermelidir:
1. Google Fonts: 'Plus Jakarta Sans:wght@400;500;600;700;800;900'
2. .toolbar: "🖨️ Yazdır / PDF Olarak Kaydet" butonu
3. .fasikul-page: A4 fasikül sayfası kapsayıcısı.
4. .fasikul-header:
   - .top-meta: "TÜRKİYE YÜZYILI MAARİF MODELİ"
   - .brand-pill: "DİNDERSİ ATÖLYESİ" + .brand-sub: "> KONU ÖZET FASİKÜLÜ <"
   - .badge-grade: "★ ${displayGrade} ★"
   - .unit-banner: "${displayTitle}"
   - .quote-box: <strong>🌙 Ayet/Hadis:</strong> "Konuyla ilgili ayet veya hadis meali"
5. Kutu 1 (.card-box.card-pink): "★ KAVRAMLAR KUTUSU <span class='tag-highlight tag-red'>(Sınavda Çıkar!)</span>"
   - Konuda geçen 4-6 anahtar kavram! Her biri .concept-row içinde .c-tag etiketi ve .hl-yellow vurgulu tanımı.
6. Kutu 2 (.grid-2): İki Sütunlu Derinlemesine Analiz:
   - Sol Sütun (.card-box.card-orange): "★ KONUNUN TEMEL İLKELERİ VE KAZANIMLARI" (3-4 yıldızlı ★ madde).
   - Sağ Sütun (.card-box.card-blue): "★ UYGULAMA, HİKMETLER VE AHLAKİ ÇIKARIMLAR" (3-4 yıldızlı ★ madde, ayet/hadis).
7. Kutu 3 (.card-box.card-green): "★ ADIM ADIM SÜREÇ / ÖNEMLİ AŞAMALAR"
   - .steps-grid (4 adımlı başarı şeması) VEYA .fasikul-table ile konunun gelişim aşamaları.
8. Kutu 4 (.card-box.card-purple veya .card-yellow): "★ GÖRSEL ŞEMA VEYA KRONOLOJİ"
   - .bubble-wrap veya .family-tree veya mini kartlar (.grid-3 / .mini-card) ile konuyu akılda kalıcı kılan görsel bölüm.
9. .fasikul-footer: "▶ <strong>DİNDERSİ ATÖLYESİ</strong> | ${title} Konu Fasikülü     Tam Özet"

PEDAGOJİK VE İÇERİK KURALLARI:
- Verilen ders kitabı kaynak metnine %100 SADIK KAL. Bilgi uydurma.
- Çıktı olarak SADECE tam, geçerli <!DOCTYPE html> ile başlayan ve </html> ile biten HTML kodunu ver.
- Markdown backtick veya açıklama yazma.`;
        }

        const generatedRaw = await runGeminiWithFallback({
            apiKey,
            primaryModel: modelName,
            prompt
        });

        const formattedHtml = formatNotebookSheetHtml(generatedRaw, {
            title: isUnit ? (unitTitle || title) : title,
            grade,
            courseTitle
        });

        return { success: true, htmlContent: formattedHtml };
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
            await clearCurriculumSelectionCache();
            (revalidateTag as any)('curriculum');
            revalidatePath('/');
            revalidatePath('/student');
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
