'use server';

import fs from 'fs/promises';
import path from 'path';
import { getAdminDb } from '@/lib/firebase-admin';
import { resolveActiveGeminiConfig } from '@/ai/ai-config-service';
import { runGeminiWithFallback } from '@/ai/gemini-fallback-runner';
import { clearStaticGameCache } from '@/lib/quiz-actions';
import { revalidatePath } from 'next/cache';

export interface ConceptItem {
    id?: string;
    concept: string;
    definition: string;
}

export interface YazilacaklarTopicItem {
    id: string;
    topicId: string;
    unitId: string;
    courseId: string;
    grade: string;
    className: string;
    courseTitle: string;
    unitTitle: string;
    title: string;
    sourceText: string;
    // 1. Kavramlar (Tek kelimelik terimler - Anlat Bakalım, Anagram, Çarkıfelek için)
    concepts: string[];
    // 2. Kavram - Tanım Eşleşmeli (Kavram Düellosu, Hafıza Kartı, Eşleştirme, Kavram Panosu için)
    conceptDefinitions: ConceptItem[];
    // 3. Özet Cümleler (Doğru-Yanlış, Cümle Kurma, Defter Notları için)
    sentences: string[];
    // İstatistikler
    conceptsCount: number;
    definitionsCount: number;
    sentencesCount: number;
    hasContent: boolean;
}

const YAZILACAKLAR_DIR = path.join(process.cwd(), 'public', 'curriculum', 'yazilacaklar');
const ACTIVITIES_DIR = path.join(process.cwd(), 'public', 'curriculum', 'activities');
const ACTIVITY_ITEMS_DIR = path.join(process.cwd(), 'public', 'curriculum', 'activityItems');
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

/**
 * Loads all topics with their comprehensive activity bank data:
 * - concepts (kelimeler)
 * - conceptDefinitions (kavram-tanım çiftleri)
 * - sentences (özet cümleler / notlar)
 * Merges data seamlessly from both yazilacaklar and activities.
 */
export async function loadAllYazilacaklarData(): Promise<{ success: boolean; items: YazilacaklarTopicItem[]; error?: string }> {
    try {
        await fs.mkdir(YAZILACAKLAR_DIR, { recursive: true });
        await fs.mkdir(ACTIVITIES_DIR, { recursive: true });
        await fs.mkdir(ACTIVITY_ITEMS_DIR, { recursive: true });

        // 1. Manifest
        let manifest: any = { classGroups: [] };
        try {
            const manifestRaw = await fs.readFile(MANIFEST_PATH, 'utf-8');
            manifest = JSON.parse(manifestRaw);
        } catch (e) {
            console.warn('Manifest read warning in loadAllYazilacaklarData:', e);
        }

        // 2. Source Texts
        let sourceTextsMap: { topics: Record<string, string>; units: Record<string, string> } = { topics: {}, units: {} };
        try {
            const sourceRaw = await fs.readFile(SOURCE_TEXTS_PATH, 'utf-8');
            sourceTextsMap = JSON.parse(sourceRaw);
        } catch (e) {
            console.warn('source-texts.json read warning in loadAllYazilacaklarData:', e);
        }

        // 3. Existing Yazilacaklar files
        let existingYazilacaklarFiles: Set<string> = new Set();
        try {
            const fileList = await fs.readdir(YAZILACAKLAR_DIR);
            existingYazilacaklarFiles = new Set(fileList.map(f => f.toLowerCase()));
        } catch (e) {}

        // 4. Existing Activities files
        let existingActivityFiles: Set<string> = new Set();
        try {
            const actList = await fs.readdir(ACTIVITIES_DIR);
            existingActivityFiles = new Set(actList.map(f => f.toLowerCase()));
        } catch (e) {}

        const items: YazilacaklarTopicItem[] = [];

        for (const cg of manifest.classGroups || []) {
            const grade = cg.name;
            const className = `${grade}. Sınıf`;

            for (const course of cg.courses || []) {
                const fullCourseTitle = formatCourseTitle(course.title);

                for (const unit of course.units || []) {
                    for (const topic of unit.topics || []) {
                        const topicId = topic.id;
                        const jsonFileName = `${topicId}.json`.toLowerCase();

                        let conceptsSet = new Set<string>();
                        let conceptDefinitionsMap = new Map<string, string>();
                        let sentencesSet = new Set<string>();

                        // ── A. Read from public/curriculum/yazilacaklar/${topicId}.json ──
                        if (existingYazilacaklarFiles.has(jsonFileName)) {
                            try {
                                const raw = await fs.readFile(path.join(YAZILACAKLAR_DIR, `${topicId}.json`), 'utf-8');
                                const parsed = JSON.parse(raw);
                                if (Array.isArray(parsed.notes)) {
                                    parsed.notes.forEach((n: any) => {
                                        if (typeof n === 'string' && n.trim()) sentencesSet.add(n.trim());
                                    });
                                }
                                if (Array.isArray(parsed.conceptDefinitions)) {
                                    parsed.conceptDefinitions.forEach((c: any) => {
                                        if (c && c.concept && c.concept.trim()) {
                                            const term = c.concept.trim();
                                            conceptDefinitionsMap.set(term, (c.definition || '').trim());
                                            conceptsSet.add(term);
                                        }
                                    });
                                }
                            } catch (readErr) {
                                console.warn(`Error reading yazilacaklar for ${topicId}:`, readErr);
                            }
                        }

                        // ── B. Read from public/curriculum/activities/${topicId}.json ──
                        if (existingActivityFiles.has(jsonFileName)) {
                            try {
                                const rawAct = await fs.readFile(path.join(ACTIVITIES_DIR, `${topicId}.json`), 'utf-8');
                                const parsedAct = JSON.parse(rawAct);
                                if (Array.isArray(parsedAct)) {
                                    parsedAct.forEach((it: any) => {
                                        if (!it) return;
                                        if (it.type === 'concept' && it.content?.text) {
                                            const term = it.content.text.trim();
                                            if (term) conceptsSet.add(term);
                                        } else if (it.type === 'definition' && it.content?.term) {
                                            const term = it.content.term.trim();
                                            const def = (it.content.definition || '').trim();
                                            if (term) {
                                                if (!conceptDefinitionsMap.has(term)) {
                                                    conceptDefinitionsMap.set(term, def);
                                                }
                                                conceptsSet.add(term);
                                            }
                                        } else if (it.type === 'sentence' && it.content?.text) {
                                            const sentence = it.content.text.trim();
                                            if (sentence) sentencesSet.add(sentence);
                                        }
                                    });
                                }
                            } catch (actErr) {
                                console.warn(`Error reading activities for ${topicId}:`, actErr);
                            }
                        }

                        // ── C. Fallback from manifest topic writingContent if still empty ──
                        if (sentencesSet.size === 0 && Array.isArray(topic.writingContent?.notes)) {
                            topic.writingContent.notes.forEach((n: string) => {
                                if (n.trim()) sentencesSet.add(n.trim());
                            });
                        }
                        if (conceptDefinitionsMap.size === 0 && Array.isArray(topic.writingContent?.conceptDefinitions)) {
                            topic.writingContent.conceptDefinitions.forEach((c: any) => {
                                if (c && c.concept) {
                                    const term = c.concept.trim();
                                    conceptDefinitionsMap.set(term, (c.definition || '').trim());
                                    conceptsSet.add(term);
                                }
                            });
                        }

                        // Convert maps/sets to arrays
                        const concepts = Array.from(conceptsSet);
                        const conceptDefinitions: ConceptItem[] = Array.from(conceptDefinitionsMap.entries()).map(([concept, definition]) => ({
                            concept,
                            definition
                        }));
                        const sentences = Array.from(sentencesSet);

                        const sourceText = (sourceTextsMap.topics[topicId] || topic.sourceText || '').trim();

                        items.push({
                            id: topicId,
                            topicId: topicId,
                            unitId: unit.id,
                            courseId: course.id,
                            grade: String(grade),
                            className: className,
                            courseTitle: fullCourseTitle,
                            unitTitle: unit.title,
                            title: topic.title,
                            sourceText: sourceText,
                            concepts,
                            conceptDefinitions,
                            sentences,
                            conceptsCount: concepts.length,
                            definitionsCount: conceptDefinitions.length,
                            sentencesCount: sentences.length,
                            hasContent: concepts.length > 0 || conceptDefinitions.length > 0 || sentences.length > 0,
                        });
                    }
                }
            }
        }

        return { success: true, items };
    } catch (error: any) {
        console.error('loadAllYazilacaklarData error:', error);
        return { success: false, items: [], error: error.message || 'Veriler yüklenirken hata oluştu.' };
    }
}

/**
 * Saves all 3 activity types (concepts, conceptDefinitions, sentences) to:
 * 1. public/curriculum/yazilacaklar/${topicId}.json
 * 2. public/curriculum/activities/${topicId}.json & activityItems/${topicId}.json
 * 3. Firestore topic.writingContent
 * 4. Firestore activityItems collection
 * 5. Clears game cache so all games immediately update!
 */
export async function saveCentralActivityDataAction(params: {
    courseId: string;
    unitId: string;
    topicId: string;
    concepts: string[];
    conceptDefinitions: ConceptItem[];
    sentences: string[];
}): Promise<{ success: boolean; error?: string }> {
    try {
        const { courseId, unitId, topicId, concepts, conceptDefinitions, sentences } = params;
        if (!topicId) {
            return { success: false, error: 'Geçersiz konu kimliği.' };
        }

        // Clean arrays
        const cleanedConcepts = concepts.map(c => c.trim()).filter(Boolean);
        const cleanedDefinitions = conceptDefinitions
            .map(c => ({ concept: (c.concept || '').trim(), definition: (c.definition || '').trim() }))
            .filter(c => c.concept || c.definition);
        const cleanedSentences = sentences.map(s => s.trim()).filter(Boolean);

        // Also ensure every concept in conceptDefinitions exists in concepts array
        const allConceptsSet = new Set(cleanedConcepts);
        cleanedDefinitions.forEach(d => {
            if (d.concept) allConceptsSet.add(d.concept);
        });
        const finalConcepts = Array.from(allConceptsSet);

        // ── 1. Save to Yazılacaklar JSON ──
        await fs.mkdir(YAZILACAKLAR_DIR, { recursive: true });
        const yazilacaklarData = {
            notes: cleanedSentences,
            conceptDefinitions: cleanedDefinitions,
            updatedAt: new Date().toISOString()
        };
        await fs.writeFile(
            path.join(YAZILACAKLAR_DIR, `${topicId}.json`),
            JSON.stringify(yazilacaklarData, null, 2),
            'utf-8'
        );

        // ── 2. Save to Firestore topic.writingContent ──
        try {
            const adminDb = getAdminDb();
            if (adminDb && courseId && unitId) {
                const topicRef = adminDb.collection('courses').doc(courseId).collection('units').doc(unitId).collection('topics').doc(topicId);
                await topicRef.set({
                    writingContent: {
                        notes: cleanedSentences,
                        conceptDefinitions: cleanedDefinitions
                    }
                }, { merge: true });
            }
        } catch (fsErr) {
            console.warn('Firestore writingContent sync warning:', fsErr);
        }

        // ── 3. Save to Etkinlik Veri Bankası (activities & activityItems) ──
        try {
            await fs.mkdir(ACTIVITIES_DIR, { recursive: true });
            await fs.mkdir(ACTIVITY_ITEMS_DIR, { recursive: true });

            const actFilePath = path.join(ACTIVITIES_DIR, `${topicId}.json`);
            let existingActivityItems: any[] = [];
            try {
                const raw = await fs.readFile(actFilePath, 'utf-8');
                existingActivityItems = JSON.parse(raw);
                if (!Array.isArray(existingActivityItems)) existingActivityItems = [];
            } catch (e) {
                existingActivityItems = [];
            }

            // Diğer etkinlik tiplerini koru (matching, flashcard, sorting vb.)
            const otherActivityItems = existingActivityItems.filter(
                item => item.type !== 'definition' && item.type !== 'concept' && item.type !== 'sentence'
            );

            // Yeni activityItems öğeleri oluştur
            const newConceptItems = finalConcepts.map((term, idx) => ({
                id: `concept_${topicId}_${idx}`,
                type: 'concept',
                topicId,
                unitId,
                courseId,
                content: { text: term },
                updatedAt: new Date().toISOString()
            }));

            const newDefinitionItems = cleanedDefinitions.map((cd, idx) => ({
                id: `def_${topicId}_${idx}`,
                type: 'definition',
                topicId,
                unitId,
                courseId,
                content: {
                    term: cd.concept,
                    definition: cd.definition
                },
                updatedAt: new Date().toISOString()
            }));

            const newSentenceItems = cleanedSentences.map((sentence, idx) => ({
                id: `sentence_${topicId}_${idx}`,
                type: 'sentence',
                topicId,
                unitId,
                courseId,
                content: { text: sentence },
                updatedAt: new Date().toISOString()
            }));

            const allSyncedItems = [
                ...otherActivityItems,
                ...newConceptItems,
                ...newDefinitionItems,
                ...newSentenceItems
            ];

            const jsonOutput = JSON.stringify(allSyncedItems, null, 2);
            await fs.writeFile(actFilePath, jsonOutput, 'utf-8');
            await fs.writeFile(path.join(ACTIVITY_ITEMS_DIR, `${topicId}.json`), jsonOutput, 'utf-8');

            // Firestore activityItems koleksiyonu senkronizasyonu
            try {
                const adminDb = getAdminDb();
                if (adminDb) {
                    const batch = adminDb.batch();
                    const collRef = adminDb.collection('activityItems');

                    // Eski kayıtları sil
                    const existingSnap = await collRef
                        .where('topicId', '==', topicId)
                        .get();

                    existingSnap.docs.forEach(d => {
                        const data = d.data();
                        if (data.type === 'definition' || data.type === 'concept' || data.type === 'sentence') {
                            batch.delete(d.ref);
                        }
                    });

                    // Yenileri ekle
                    [...newConceptItems, ...newDefinitionItems, ...newSentenceItems].forEach(item => {
                        const newDoc = collRef.doc();
                        batch.set(newDoc, {
                            type: item.type,
                            content: item.content,
                            topicId,
                            unitId,
                            courseId,
                            createdAt: new Date().toISOString()
                        });
                    });

                    await batch.commit().catch(() => {});
                }
            } catch (actDbErr) {
                console.warn('Firestore activityItems batch sync warning:', actDbErr);
            }

            // Oyun önbelleğini temizle (Kavram Düellosu, Anlat Bakalım, Anagram, Çarkıfelek anında görsün)
            await clearStaticGameCache().catch(() => {});
        } catch (syncErr) {
            console.warn('Etkinlik Veri Bankası sync warning:', syncErr);
        }

        revalidatePath('/teacher/smartboard/yazilacaklar');
        revalidatePath('/teacher/smartboard/yazilacaklar/oyun');
        revalidatePath('/teacher/activity-data');

        return { success: true };
    } catch (error: any) {
        console.error('saveCentralActivityDataAction error:', error);
        return { success: false, error: error.message || 'Kaydedilirken hata oluştu.' };
    }
}

// Backward compatibility alias
export const saveTopicYazilacaklarAction = async (params: {
    courseId: string;
    unitId: string;
    topicId: string;
    notes: string[];
    conceptDefinitions: ConceptItem[];
}) => {
    return saveCentralActivityDataAction({
        courseId: params.courseId,
        unitId: params.unitId,
        topicId: params.topicId,
        concepts: params.conceptDefinitions.map(c => c.concept).filter(Boolean),
        conceptDefinitions: params.conceptDefinitions,
        sentences: params.notes
    });
};

/**
 * Generates all or selective activity bank data from textbook text:
 * - concepts (kelime havuzu)
 * - conceptDefinitions (kavram-tanım çiftleri)
 * - sentences (özet cümleler / defter notları)
 */
export async function generateCentralActivityAiAction(params: {
    sourceText: string;
    topicTitle: string;
    grade?: string;
    courseTitle?: string;
    mode?: 'all' | 'concepts' | 'definitions' | 'sentences';
}): Promise<{
    success: boolean;
    concepts?: string[];
    conceptDefinitions?: ConceptItem[];
    sentences?: string[];
    error?: string;
}> {
    try {
        const { sourceText, topicTitle, grade = '5', courseTitle = 'Din Kültürü ve Ahlak Bilgisi', mode = 'all' } = params;
        const textToAnalyze = sourceText.trim() || topicTitle.trim();

        if (textToAnalyze.length < 10) {
            return { success: false, error: 'Yapay zeka analizi için yeterli kaynak metin veya konu başlığı bulunamadı.' };
        }

        const { apiKey, modelName } = await resolveActiveGeminiConfig();
        if (!apiKey) {
            return { success: false, error: 'Gemini API anahtarı bulunamadı. Lütfen AI Ayarlarından API anahtarınızı girin.' };
        }

        const prompt = `Sen MEB Din Kültürü ve Ahlak Bilgisi müfredatında uzman, pedagojik formasyona sahip kıdemli bir ders kitabı ve eğitim oyunu yazarısın.
Aşağıda verilen ${grade}. Sınıf "${courseTitle}" dersi ve "${topicTitle}" konusuna ait ders kitabı metnini analiz et.

DERS KİTABI METNİ:
"""
${textToAnalyze}
"""

GÖREVLER:
${mode === 'all' || mode === 'concepts' ? `
1. **KELİME / KAVRAM HAVUZU (concepts)**:
- Metindeki kilit dinî terimleri, ahlaki kavramları, isimleri ve anahtar kelimeleri belirle (en az 8, en fazla 20 kelime).
- Bunlar tek kelimelik veya kısa tamlamalar olmalıdır (Örn: "Tevhid", "İhlas", "Rahman", "Sadaka").
- Anlat Bakalım, Anagram Duvarı ve Çarkıfelek oyunlarında kelime olarak kullanılacaktır.
` : ''}

${mode === 'all' || mode === 'definitions' ? `
2. **KAVRAM - TANIM ÇİFTLERİ (conceptDefinitions)**:
- Metindeki önemli kavramların "Ben Kimim?" / "Bu Nedir?" tarzı ipucu tanımlarını çıkar (en az 6, en fazla 15 adet).
- 'concept' alanında kavramın adı, 'definition' alanında ise açık, net, anlaşılır tanımı yer almalıdır.
- Tanım metninde kavramın kendi adı KESİNLİKLE GEÇMEMELİDİR (Kavram Düellosu ve Eşleştirme oyunlarında soru olarak sorulacaktır).
` : ''}

${mode === 'all' || mode === 'sentences' ? `
3. **ÖZET CÜMLELER VE DEFTER NOTLARI (sentences)**:
- Konunun ana fikrini ve kazanımlarını özetleyen 5 ila 10 adet öz cümle yaz.
- Cümleler öğrencilerin defterine yazacağı nitelikte ve aynı zamanda Cümle Kurma ve Doğru/Yanlış oyunlarına uygun akıcı cümleler olsun.
- Mümkünse cümleler çok karmaşık ve uzun olmasın (ortalama 5-10 kelime).
` : ''}

ÇIKTI FORMATI:
SADECE geçerli bir JSON döndür:
{
  "concepts": ["Kavram1", "Kavram2", "Kavram3"],
  "conceptDefinitions": [
    { "concept": "Kavram Adı", "definition": "Kavramın açıklaması ve tanımı" }
  ],
  "sentences": [
    "Evrendeki her şey belirli bir amaca ve düzene göre yaratılmıştır.",
    "İnsan aklı sayesinde çevresini gözlemler ve evrendeki dengeyi fark eder."
  ]
}
`;

        const responseText = await runGeminiWithFallback({
            apiKey,
            primaryModel: modelName,
            prompt,
            generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.3
            }
        });

        const cleaned = responseText.trim().replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
        const parsed = JSON.parse(cleaned);

        return {
            success: true,
            concepts: Array.isArray(parsed.concepts) ? parsed.concepts : [],
            conceptDefinitions: Array.isArray(parsed.conceptDefinitions) ? parsed.conceptDefinitions : [],
            sentences: Array.isArray(parsed.sentences) ? parsed.sentences : (Array.isArray(parsed.notes) ? parsed.notes : [])
        };
    } catch (error: any) {
        console.error('generateCentralActivityAiAction error:', error);
        return { success: false, error: error.message || 'Yapay zeka içeriği oluşturamadı.' };
    }
}

// Backward compatibility alias
export const generateYazilacaklarAiAction = async (params: any) => {
    const res = await generateCentralActivityAiAction(params);
    return {
        success: res.success,
        conceptDefinitions: res.conceptDefinitions,
        notes: res.sentences,
        error: res.error
    };
};
