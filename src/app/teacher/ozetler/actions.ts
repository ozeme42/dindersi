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
        const resolved = await resolveActiveGeminiConfig({ apiKey: customKey, modelName: customModel });
        const cleanKey = (resolved.apiKey || '').trim().replace(/^["']|["']$/g, '');
        const modelName = resolved.modelName || 'gemini-3.6-flash';
        if (!cleanKey) {
            return {
                success: false,
                error: 'Gemini API anahtarı sistemde tanımlı değil. Lütfen Ayarlar sayfasından veya üst menüden Google AI Studio API anahtarınızı giriniz.'
            };
        }

        const isUnit = type === 'unit';
        const displayGrade = grade ? `${grade}. Sınıf` : 'Ortaokul';
        const displayTitle = (isUnit ? (unitTitle || title) : title).toUpperCase();
        const displayCourse = courseTitle || 'Din Kültürü ve Ahlak Bilgisi';

        const prompt = `Sen uzman bir pedagojik içerik tasarımcısı, MEB Din Kültürü başyazarı ve web geliştiricisisin. Görevin, sana verilen ders konusunu / metnini öğrencilerin ilgisini çeken, akılda kalıcı, "Sketchnote / Renkli Defter Notu" tarzında, KAPSAMLI, HİÇBİR KONUYU VE KAVRAMI ATLAMAYAN, tek parça ve yazdırılabilir bir HTML infografik ders notuna dönüştürmektir.

HEDEF DERS NOTU: ${title} (${isUnit ? 'Ünite Özeti' : 'Konu Özeti'})
SINIF: ${displayGrade}
DERS: ${displayCourse}
${isUnit && topicTitles && topicTitles.length > 0 ? `ÜNİTEDEKİ KONULAR:\n${topicTitles.map((t, idx) => `${idx + 1}. ${t}`).join('\n')}\n` : ''}

DERS KİTABI KAYNAK METNİ:
"""
${sourceText || 'Bu konunun MEB Din Kültürü ve Ahlak Bilgisi ders kitabı kazanımlarını temel al.'}
"""

📐 KRİTİK PEDAGOJİK VE YAPI DÜZENİ KURALLARI (KESİNLİKLE EKSİKSİZ VE DETAYLI OLACAK):

0. Marka Şeridi (<div class="sheet-brand-bar">):
- Not kağıdının (<div class="notebook-sheet">) en tepesinde, header'dan hemen önce belirgin marka şeridi yer alacaktır:
  <div class="sheet-brand-bar">
    <div class="brand-pill"><span>🕌</span> <strong>DinDersi Atölyesi</strong></div>
    <div class="brand-motto">MEB Müfredatına Tam Uyumlu Özgün Ders Notu</div>
  </div>

1. Başlık Alanı (<header class="header">) - KESİNLİKLE TAM DENGELİ VE SAYFA ORTALI OLMALIDIR:
- Sol tarafta kompakt sınıf rozeti: <div class="badge-grade">★ ${displayGrade} Din Kültürü</div>
- Ortada KESİNLİKLE SAYFANIN TAM MERKEZİNE HİZALANMIŞ (tam simetrik, dengeli ve geniş) ana başlık ve alt başlık alanı:
  <div class="title-area">
    <div class="title-banner">${displayTitle}</div>
    <div class="subtitle-banner">✨ Detaylı Konu Özeti, Tüm Anahtar Kavramlar ve Önemli İpuçları</div>
  </div>
- Sağ tarafta dengeli 1-2 cümlelik "Altın Kural / Önemli İpucu" kutucuğu:
  <div class="quote-box"><strong>🌙 Altın Kural / Ayet-Hadis:</strong> "İlgili veciz mesaj"</div>
- DİKKAT: Konu başlığı (.title-banner) kesinlikle sayfanın tam ortasında simetrik yer alacaktır. BAŞLIK İÇİNE KESİNLİKLE <br> EKLEME, BAŞLIĞI TEK PARÇA YAZ.

2. Kavramlar Kutusu (Sarı Blok - TÜM KAVRAMLAR EKSİKSİZ) (<section class="box box-yellow">):
- Başlık: <div class="box-title">⭐ KAVRAMLAR KUTUSU <span class="tag-exam">Temel Kavramlar 🎯</span></div>
- ÇOK ÖNEMLİ: ASLA 4 VEYA 6 KAVRAMLA SINIRLAMA! Kaynak metinde geçen BÜTÜN anahtar kavramları, terimleri, şahısları, mekanları, antlaşmaları ve kavram kutularını eksiksiz çıkar! (Örn: Muhammedü'l-Emin, Emin, Cahiliye Dönemi, Hilfülfudul, Kâbe Hakemliği, Hacerülesved, Ahde Vefa, Nebevi Nezaket, Tâhire, Meysere, Ebü'l-Kasım, Haniflik, Tevhit, Hira Mağarası, Kadir Gecesi, Alak Suresi, Nâmûs-ı Ekber, Varaka b. Nevfel, Fetret-i Vahiy, Müddessir, Dârülerkâm, Necaşi, Habeşistan Hicreti, Boykot Yılları, Senetü'l-Hüzn, Taif Seferi, İsrâ ve Mi'rac, Akabe Biatleri, Mus'ab b. Umeyr, Hicret, Sevr Mağarası, Kuba, Muâhât, Ensar, Muhacir, Mescid-i Nebevi, Suffe, Medine Vesikası, Bedir-Uhud-Hendek Savaşları, Hudeybiye, Davet Mektupları, Mekke'nin Fethi, Veda Hutbesi, Ravza-i Mutahhara vb.).
- <div class="concepts-grid"> içinde HER KAVRAM İÇİN bir <div class="concept-card"> oluştur (15-30 arası kavram olabilir, CSS grid otomatik dengeli dizer).
- Her kavram kartının üstünde renkli bir rozet (<span class="concept-badge badge-c-yellow/green/cyan/pink/purple/orange">Kavram</span>), altında ise ortaokul öğrencisinin anlayacağı net ve açıklayıcı tanım olsun. Kilit kelimeleri <mark> ile sarı fosforlu vurgula.

3. Konu Başlıkları ve Kapsamlı Detay Alanları (HİÇBİR KONU BAŞLIĞINI ATLAMA):
- ASLA sadece 4 madde yazıp geçme! Kaynak metindeki TÜM ana başlıkları ve alt başlıkları ayrı ayrı, genişçe ele al.
- Her ana konu için ayrı renkli kutular (<section class="box box-cyan">, <section class="box box-pink">, <section class="box box-purple">, <section class="box box-orange"> vb.) veya ikili sütunlar (<div class="columns-2">) oluştur.
- SIRA DÜZENİ: İkili sütunlarda (<div class="columns-2">) maddeleri (<div class="list-item">) doğrudan columns-2 içine koy (araya wrapper div koyma). Böylece CSS Grid otomatik olarak 1 ile 2'yi yan yana, 3 ile 4'ü yan yana, 5 ile 6'yı yan yana, 7 ile 8'i yan yana dizer.
- Her konu başlığı altında 6 ila 12 numaralı detaylı madde (<div class="list-item"><div class="bullet-num">X</div><div class="list-content"><strong>Alt Başlık / Olay:</strong> Detaylı açıklama... <mark>kilit kelimeler</mark></div></div>) oluştur.
- Metindeki tüm olaylar (çobanlık, Şam kervanı, Nebevi Nezaket ve Enes b. Malik'in anlattıkları, Cahiliye zulümleri, Hilfülfudul ve Abdullah b. Cüdan evi, Zübeydli tüccar & Ebu Cehil olayı, ahde vefa 3 gün bekleme, Hz. Hatice evliliği ve 7 çocuğu, Kâbe Hakemliğinde hırka ile Hacerülesved'in konması; Hira tefekkürü, 610 Kadir Gecesi ilk vahiy Alak 1-5, Varaka b. Nevfel müjdesi, Fetret-i Vahiy ve Müddessir açık daveti, Dârülerkâm, Habeşistan hicretleri ve Necaşi, 3 yıllık Boykot dönemi, Hüzün Yılı ve Taif taşlanması ile af duası, İsrâ ve Mi'rac 5 vakit namaz, Akabe Biatleri ve Mus'ab b. Umeyr, Hicret ve Sevr Mağarası, Kuba ve Ranuna, Muâhât kardeşliği, Mescid-i Nebevi ve Suffe mektebi, Medine Vesikası ilk anayasa, Bedir-Uhud-Hendek savunma savaşları, Hudeybiye Barışı ve hükümdarlara davet mektupları, Mekke'nin fethi ve genel af, Veda Haccı ve Veda Hutbesi evrensel insan hakları, 8 Haziran 632 vefatı ve Ravza-i Mutahhara) EKSİKSİZ VE DETAYLI YER ALMALIDIR!

4. En Çok Karıştırılanlar ve Kritik Noktalar (Yeşil Blok) (<section class="box box-green">):
- Başlık: <div class="box-title">⚡ EN ÇOK KARIŞTIRILANLAR & KRİTİK NOKTALAR ⚠️</div>
- Öğrencilerin en çok karıştırdığı en az 4-6 kritik noktayı <div class="traps-grid"> içinde <div class="trap-card"><strong>Tuzak / Dikkat:</strong> Açıklama</div> hap bilgi olarak sun. (İlk hicret yeri Habeşistan vs Medine, Hilfülfudul'un peygamberlik öncesi kurulması, Ensar-Muhacir ayrımı, Hira ve Sevr mağaraları farkı, Uhud Okçular Tepesi ve Hendek taktiği, Veda Hutbesi evrensel ilkeleri).

5. Altbilgi (Footer) (<footer class="footer">):
- <footer class="footer"><div>🕌 <strong>DinDersi Atölyesi</strong> | MEB Müfredatına Tam Uyumlu Özgün Ders Notu</div><div>🌱 <em>"İlim rütbesi rütbelerin en yücesidir."</em></div></footer>

⚠️ KESİNLİKLE YASAK: Özette hiçbir yerde "sınav", "sınavda çıkar", "sınavda kesin çıkar", "sınav tüyosu", "sınav tuzakları" gibi sınav odaklı ifadeler ASLA KULLANILMAYACAKTIR! Bunların yerine "Önemli Bilgi", "Kritik Nokta", "Dikkat Edelim", "Temel Kavram", "Altın Kural" gibi pedagojik ifadeler kullanılmalıdır.

🎨 TEKNİK VE CSS KURALLARI:
- Yazı tipleri: Caveat:wght@700 (başlıklar) ve Patrick Hand (metinler).
- Not kağıdı: <div class="notebook-sheet" id="summaryCard"> içinde sağa sola tam yaslı, kenarları ferah, akıllı tahtaya tam uyumlu.
- Buton: <div class="toolbar"><button class="btn" onclick="window.print()">🖨️ Yazdır / PDF Olarak Kaydet</button></div>
- Çıktı olarak SADECE geçerli, eksiksiz ve tek başına çalışan tek parça HTML kodu ver (asla markdown backtick veya açıklama yazma).
`;

        const generatedRaw = await runGeminiWithFallback({
            apiKey: cleanKey,
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
 * AI Summary Refiner / Editor.
 * Modifies an existing Sketchnote/Notebook-Sheet summary based on the teacher's natural language instructions.
 */
export async function refineOzetWithAi(params: {
    currentHtml: string;
    instruction: string;
    title: string;
    type?: 'unit' | 'topic';
    grade?: string;
    courseTitle?: string;
    sourceText?: string;
    apiKey?: string;
    modelName?: string;
}): Promise<{ success: boolean; htmlContent?: string; error?: string }> {
    const { currentHtml, instruction, title, type, grade, courseTitle, sourceText, apiKey: customKey, modelName: customModel } = params;

    if (!currentHtml || !currentHtml.trim()) {
        return { success: false, error: 'Düzeltilecek mevcut özet içeriği bulunamadı.' };
    }
    if (!instruction || !instruction.trim()) {
        return { success: false, error: 'Lütfen yapay zekaya bir düzeltme talimatı verin.' };
    }

    try {
        const resolved = await resolveActiveGeminiConfig({ apiKey: customKey, modelName: customModel });
        const cleanKey = (resolved.apiKey || '').trim().replace(/^["']|["']$/g, '');
        const modelName = resolved.modelName || 'gemini-3.6-flash';

        if (!cleanKey) {
            return {
                success: false,
                error: 'Gemini API anahtarı sistemde tanımlı değil. Lütfen API anahtarınızı giriniz.'
            };
        }

        const displayGrade = grade ? `${grade}. Sınıf` : 'Ortaokul';
        const displayCourse = courseTitle || 'Din Kültürü ve Ahlak Bilgisi';

        const prompt = `Sen uzman bir pedagojik editör, MEB Din Kültürü yazarı ve HTML web geliştiricisisin.
Öğretmen, var olan "Sketchnote / Renkli Defter Notu" tarzındaki bir ders özetinde yapay zeka ile DÜZELTME / GELİŞTİRME yapmak istiyor.

HEDEF KONU: ${title}
SINIF: ${displayGrade} | DERS: ${displayCourse}

🔴 ÖĞRETMENİN DÜZELTME TALİMATI:
"""
${instruction.trim()}
"""

MEVCUT ÖZETİN HTML KODU:
"""
${currentHtml.trim()}
"""

${sourceText ? `DERS KİTABI KAYNAK METNİ (Bilgi doğruluğu için referans):
"""
${sourceText.slice(0, 8000)}
"""` : ''}

🔴 DÜZELTME VE UYGULAMA KURALLARI:
1. ÖĞRETMENİN İSTEĞİNİ EKSİKSİZ UYGULA:
   - Öğretmenin belirttiği düzeltmeyi (örn: "Kavramı değiştir", "Maddeleri kısalt", "Ayet mealini ekle", "Dili sadeleştir", "Fosforlu vurguları artır", "Yeni kritik nokta ekle") mevcut HTML dokümanına tam olarak yansıt.
   - İstenmeyen kısımları bozma, mevcut yapıyı ve zengin içeriği koru.

2. "SKETCHNOTE / RENKLİ DEFTER NOTU" TASARIM DİLİNİ VE CLASS'LARINI KORU:
   - Başlık alanı: .header (kesinlikle tam dengeli ve sayfa ortalı 3 sütunlu grid), .badge-grade (kompakt sınıf rozeti, örn: "★ 5. Sınıf"), .title-area (.title-banner ve .subtitle-banner sayfa merkezinde tam ortalanmış), .quote-box (sağda dengeli kutucuk)
   - Sarı Kutu (Kavramlar): .box.box-yellow, simetrik .concepts-grid, .concept-card, .concept-badge (badge-c-yellow/green/cyan/pink/purple/orange), <mark> fosforlu vurgular
   - İki Sütunlu Detay: .columns-2, .box.box-cyan (mavi), .box.box-pink (pembe), .list-item ve .bullet-num (.bullet-num-pink)
   - Yeşil Kutu (Kritik Noktalar & Dikkat Edilecekler): .box.box-green, .traps-grid, .trap-card
   - Altbilgi: .footer
   - Tipografi: Caveat:wght@700 ve Patrick Hand

3. ÇIKTI FORMATI:
   - SADECE tam, geçerli ve tek parça HTML kodunu ver (<!DOCTYPE html> ile başlasın veya <div class="notebook-sheet"> ile devam etsin).
   - Asla markdown backtick (\`\`\`html) veya hiçbir açıklama ekleme.`;

        const generatedRaw = await runGeminiWithFallback({
            apiKey: cleanKey,
            primaryModel: modelName,
            prompt
        });

        const formattedHtml = formatNotebookSheetHtml(generatedRaw, {
            title,
            grade,
            courseTitle
        });

        return { success: true, htmlContent: formattedHtml };
    } catch (err: any) {
        console.error('Error refining summary with AI:', err);
        return { success: false, error: err.message || 'Yapay zeka ile özet düzeltilirken bir hata oluştu.' };
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

export interface YaziliVaktiCardItem {
    term: string;
    desc: string;
    color?: string;
}

export interface YaziliVaktiNumberedItem {
    num: number;
    term: string;
    desc: string;
}

export interface YaziliVaktiTableRow {
    col1: string;
    col2: string;
    bg?: string;
}

export interface YaziliVaktiSheetData {
    gradeTag: string;          // "6. Sınıf\nDin Kültürü\nve Ahlak Bilgisi"
    unitTag: string;           // "1. ÜNİTE"
    topicTitle: string;        // "Peygamber ve İlahî Kitap İnancı"
    subTitle: string;          // "1. Dönem 1. Yazılıya Hazırlık Notları"

    // 1. Satır
    card1: {
        title: string;         // örn. "Peygamber Kimdir?"
        bullets: string[];     // 4 madde (pembe nokta)
    };
    card2: {
        title: string;         // örn. "Peygamberlerin Özellikleri"
        items: YaziliVaktiCardItem[]; // 5 kavram
    };

    // 2. Satır
    card3: {
        title: string;         // örn. "Peygamberlerin Görevleri"
        items: YaziliVaktiNumberedItem[]; // 6 numaralı madde (pembe rozetler ❶-❻)
    };
    card4: {
        title: string;         // örn. "Vahiy ve Vahyin Özellikleri"
        sub1Title: string;     // örn. "Vahiy Nedir?"
        sub1Text: string;      // örn. "Allah'ın seçtiği elçilere bildirdiği ilahi mesajdır."
        sub2Title: string;     // örn. "Vahyin Özellikleri"
        sub2Bullets: string[]; // 4 yeşil onaylı madde
    };

    // 3. Satır
    card5: {
        title: string;         // örn. "İlahî Kitaplar"
        bullets: string[];     // 2 yeşil onaylı madde
    };
    card6: {
        title: string;         // örn. "Dört Büyük İlahî Kitap"
        col1Header: string;    // örn. "İlahî Kitap" veya "Kavram"
        col2Header: string;    // örn. "Gönderildiği Peygamber" veya "Açıklama"
        rows: YaziliVaktiTableRow[]; // 4 satır
    };

    // 4. Satır (Unutma! Şeridi)
    unutmaBullets: string[];   // 2 altın sınav kuralı
    caption?: string;
}

/**
 * Belirli bir konuya / nota ÖZEL Instagram infografik post verisini (Yazılı Vakti 6 Kart + Tablo formatında) yapay zeka ile üretir.
 */
export async function generateInstagramPostWithAi(params: {
    title: string;
    htmlContent?: string;
    sourceText?: string;
    grade?: string;
    unitTitle?: string;
    courseTitle?: string;
    apiKey?: string;
    modelName?: string;
}): Promise<{ success: boolean; data?: YaziliVaktiSheetData; error?: string }> {
    const { title, htmlContent, sourceText, grade, unitTitle, courseTitle, apiKey: customKey, modelName: customModel } = params;

    try {
        const resolved = await resolveActiveGeminiConfig({ apiKey: customKey, modelName: customModel });
        const cleanKey = (resolved.apiKey || '').trim().replace(/^["']|["']$/g, '');
        const modelName = resolved.modelName || 'gemini-3.6-flash';

        if (!cleanKey) {
            return {
                success: false,
                error: 'Gemini API anahtarı tanımlı değil. Lütfen API anahtarınızı giriniz.'
            };
        }

        const displayGrade = grade ? `${grade}. Sınıf` : '6. Sınıf';
        const displayCourse = courseTitle || 'Din Kültürü ve Ahlak Bilgisi';
        const displayUnit = unitTitle ? unitTitle.replace(/^\d+[\.\-\s]+/, '') : title;

        // Metin içeriğini temizle
        let cleanContent = '';
        if (sourceText && sourceText.trim().length > 50) {
            cleanContent = sourceText.trim().slice(0, 4500);
        } else if (htmlContent && htmlContent.trim().length > 50) {
            cleanContent = htmlContent
                .replace(/<style[\s\S]*?<\/style>/gi, '')
                .replace(/<script[\s\S]*?<\/script>/gi, '')
                .replace(/<[^>]*>/g, ' ')
                .replace(/\s+/g, ' ')
                .trim()
                .slice(0, 4500);
        }

        const prompt = `Sen uzman bir MEB Din Kültürü başyazarı ve sosyal medya infografik tasarımcısısın.
Görevin, aşağıdaki konunun DERS KİTABI İÇERİĞİNE %100 SADIK, SADECE BU KONUYA ÖZEL, "@yazilivakti" Instagram infografik posteri için zengin ve eksiksiz veriyi oluşturmaktır.

🎯 HEDEF KONU: ${title}
📚 SINIF: ${displayGrade} | DERS: ${displayCourse}
📌 ÜNİTE: ${displayUnit}

DERS İÇERİĞİ / KAYNAK METİN:
"""
${cleanContent || `${displayGrade} ${displayCourse} müfredatındaki "${title}" kazanımlarını ve kilit kavramlarını temel al.`}
"""

📐 KURALLAR (KESİNLİKLE UYULACAK):
1. BAŞKA KONULARDAN ASLA VE ASLA BİLGİ KARIŞTIRMA! Sadece yukarıdaki "${title}" konusunun gerçek kavramları, kuralları, ayet/hadisleri ve bilgileri yer alacaktır.
2. Yazılı Vakti formatı 6 kart + 1 tablo + 1 Unutma kutusundan oluşur:
   - "gradeTag": "${displayGrade}\\nDin Kültürü\\nve Ahlak Bilgisi"
   - "unitTag": "1. ÜNİTE" (veya ilgili ünite no)
   - "topicTitle": "${title}"
   - "subTitle": "${displayGrade} 1. Dönem 1. Yazılıya Hazırlık Notları"
   - "card1": (Sol Üst) "${title} Nedir?" başlığı ve tam 4 adet kısa, vurucu madde (bullets).
   - "card2": (Sağ Üst) "${title} Kavramları" veya Özellikleri başlığı ve tam 5 adet kavram tanımı (term ve kısa desc).
   - "card3": (Sol Orta) "${title} Görevleri / İlkeleri / Şartları" başlığı ve tam 6 adet numaralı madde (num: 1..6, term ve desc).
   - "card4": (Sağ Orta) İki alt bölümlü kart:
     * sub1Title: "Kilit Soru / İlke Nedir?" ve sub1Text (tek cümlelik net tanım)
     * sub2Title: "Özellikleri / Faydaları" ve sub2Bullets (tam 4 adet yeşil onaylı kısa madde)
   - "card5": (Sol Alt) "${title} Esasları / Hükümleri" başlığı ve tam 2 adet net özet madde (bullets).
   - "card6": (Sağ Alt Tablo) 2 sütunlu eşleştirme / kavram tablosu:
     * col1Header: Sol sütun başlığı (örn: "Kavram" veya "Terim")
     * col2Header: Sağ sütun başlığı (örn: "Açıklaması" veya "Anlamı")
     * rows: Tam 4 satır (col1 ve col2)
   - "unutmaBullets": Bu konuda öğrencilerin en çok karıştırdığı 2 kritik altın sınav kuralı / püf noktası.
   - "caption": Bu post için hazır Instagram gönderi metni ve etiketler.

ÇIKTI FORMATI:
Sadece aşağıdaki JSON şemasına uyan saf JSON döndür (asla markdown backtick veya açıklama yazma):
{
  "gradeTag": "...",
  "unitTag": "...",
  "topicTitle": "...",
  "subTitle": "...",
  "card1": {
    "title": "...",
    "bullets": ["...", "...", "...", "..."]
  },
  "card2": {
    "title": "...",
    "items": [
      { "term": "...", "desc": "..." },
      { "term": "...", "desc": "..." },
      { "term": "...", "desc": "..." },
      { "term": "...", "desc": "..." },
      { "term": "...", "desc": "..." }
    ]
  },
  "card3": {
    "title": "...",
    "items": [
      { "num": 1, "term": "...", "desc": "..." },
      { "num": 2, "term": "...", "desc": "..." },
      { "num": 3, "term": "...", "desc": "..." },
      { "num": 4, "term": "...", "desc": "..." },
      { "num": 5, "term": "...", "desc": "..." },
      { "num": 6, "term": "...", "desc": "..." }
    ]
  },
  "card4": {
    "title": "...",
    "sub1Title": "...",
    "sub1Text": "...",
    "sub2Title": "...",
    "sub2Bullets": ["...", "...", "...", "..."]
  },
  "card5": {
    "title": "...",
    "bullets": ["...", "..."]
  },
  "card6": {
    "title": "...",
    "col1Header": "...",
    "col2Header": "...",
    "rows": [
      { "col1": "...", "col2": "..." },
      { "col1": "...", "col2": "..." },
      { "col1": "...", "col2": "..." },
      { "col1": "...", "col2": "..." }
    ]
  },
  "unutmaBullets": ["...", "..."],
  "caption": "..."
}`;

        const raw = await runGeminiWithFallback({
            apiKey: cleanKey,
            primaryModel: modelName,
            prompt
        });

        const jsonStr = raw
            .replace(/```json\s*/gi, '')
            .replace(/```\s*$/gi, '')
            .trim();

        const parsed = JSON.parse(jsonStr) as YaziliVaktiSheetData;
        return { success: true, data: parsed };
    } catch (err: any) {
        console.error('Error generating custom Instagram post with AI:', err);
        return { success: false, error: err.message || 'Instagram postu oluşturulurken bir hata oluştu.' };
    }
}

