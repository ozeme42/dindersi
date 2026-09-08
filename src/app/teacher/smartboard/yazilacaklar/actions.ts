'use server';

import fs from 'fs/promises';
import path from 'path';
import { getAdminDb } from '@/lib/firebase-admin';
import { resolveActiveGeminiConfig } from '@/ai/ai-config-service';
import { runGeminiWithFallback } from '@/ai/gemini-fallback-runner';
import { clearStaticGameCache } from '@/lib/quiz-actions';
import { revalidatePath } from 'next/cache';

export interface ConceptItem {
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
    notes: string[];
    conceptDefinitions: ConceptItem[];
    conceptsCount: number;
    notesCount: number;
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
 * Loads all topics with their existing yazilacaklar (concepts and notes) and textbook source text.
 * Also checks Etkinlik Veri Bankası (activities / activityItems) for existing definitions.
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
            console.warn('Manifest read warning in yazilacaklar actions:', e);
        }

        // 2. Source Texts
        let sourceTextsMap: { topics: Record<string, string>; units: Record<string, string> } = { topics: {}, units: {} };
        try {
            const sourceRaw = await fs.readFile(SOURCE_TEXTS_PATH, 'utf-8');
            sourceTextsMap = JSON.parse(sourceRaw);
        } catch (e) {
            console.warn('source-texts.json read warning in yazilacaklar actions:', e);
        }

        // 3. Existing Yazilacaklar JSON files
        let existingFiles: Set<string> = new Set();
        try {
            const fileList = await fs.readdir(YAZILACAKLAR_DIR);
            existingFiles = new Set(fileList.map(f => f.toLowerCase()));
        } catch (e) {
            console.warn('Error reading yazilacaklar dir:', e);
        }

        // 4. Existing Activities JSON files (Etkinlik Veri Bankası)
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

                        let notes: string[] = [];
                        let conceptDefinitions: ConceptItem[] = [];

                        // A. Check Yazılacaklar local JSON file
                        if (existingFiles.has(jsonFileName)) {
                            try {
                                const fileContent = await fs.readFile(path.join(YAZILACAKLAR_DIR, `${topicId}.json`), 'utf-8');
                                const parsed = JSON.parse(fileContent);
                                if (Array.isArray(parsed.notes)) {
                                    notes = parsed.notes.filter(Boolean);
                                }
                                if (Array.isArray(parsed.conceptDefinitions)) {
                                    conceptDefinitions = parsed.conceptDefinitions.filter((c: any) => c && (c.concept || c.definition));
                                }
                            } catch (readErr) {
                                console.warn(`Error reading yazilacaklar JSON for topic ${topicId}:`, readErr);
                            }
                        }

                        // B. Check Etkinlik Veri Bankası (activities/${topicId}.json) for definitions if empty
                        if (conceptDefinitions.length === 0 && existingActivityFiles.has(jsonFileName)) {
                            try {
                                const actContent = await fs.readFile(path.join(ACTIVITIES_DIR, `${topicId}.json`), 'utf-8');
                                const parsedAct = JSON.parse(actContent);
                                if (Array.isArray(parsedAct)) {
                                    const defs = parsedAct.filter((it: any) => it && it.type === 'definition' && it.content?.term);
                                    if (defs.length > 0) {
                                        conceptDefinitions = defs.map((d: any) => ({
                                            concept: d.content.term || d.content.concept,
                                            definition: d.content.definition || ''
                                        }));
                                    }
                                }
                            } catch (actErr) {
                                console.warn(`Error reading activities JSON for topic ${topicId}:`, actErr);
                            }
                        }

                        // C. Fallback from topic object in manifest if empty
                        if (notes.length === 0 && topic.writingContent?.notes) {
                            notes = topic.writingContent.notes;
                        }
                        if (conceptDefinitions.length === 0 && topic.writingContent?.conceptDefinitions) {
                            conceptDefinitions = topic.writingContent.conceptDefinitions;
                        }

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
                            notes: notes,
                            conceptDefinitions: conceptDefinitions,
                            conceptsCount: conceptDefinitions.length,
                            notesCount: notes.length,
                            hasContent: conceptDefinitions.length > 0 || notes.length > 0,
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
 * Saves concept definitions and notes for a specific topic.
 * SYNCHRONIZES WITH BOTH:
 * 1. Yazılacaklar (public/curriculum/yazilacaklar/*.json + writingContent)
 * 2. Etkinlik Veri Bankası (public/curriculum/activities/*.json + public/curriculum/activityItems/*.json + Firestore activityItems)
 * 3. Clears game cache so games (Kavram Düellosu, Anlat Bakalım, Anagram, Çarkıfelek vb.) immediately have the concepts!
 */
export async function saveTopicYazilacaklarAction(params: {
    courseId: string;
    unitId: string;
    topicId: string;
    notes: string[];
    conceptDefinitions: ConceptItem[];
}): Promise<{ success: boolean; error?: string }> {
    try {
        const { courseId, unitId, topicId, notes, conceptDefinitions } = params;
        if (!topicId) {
            return { success: false, error: 'Geçersiz konu kimliği.' };
        }

        // Clean arrays
        const cleanedNotes = notes.map(n => n.trim()).filter(Boolean);
        const cleanedConcepts = conceptDefinitions
            .map(c => ({ concept: (c.concept || '').trim(), definition: (c.definition || '').trim() }))
            .filter(c => c.concept || c.definition);

        const dataToSave = {
            notes: cleanedNotes,
            conceptDefinitions: cleanedConcepts,
            updatedAt: new Date().toISOString()
        };

        // ── 1. Save to Yazılacaklar local JSON ──
        await fs.mkdir(YAZILACAKLAR_DIR, { recursive: true });
        const yazilacaklarFilePath = path.join(YAZILACAKLAR_DIR, `${topicId}.json`);
        await fs.writeFile(yazilacaklarFilePath, JSON.stringify(dataToSave, null, 2), 'utf-8');

        // ── 2. Save to Firestore topic.writingContent ──
        try {
            const adminDb = getAdminDb();
            if (adminDb && courseId && unitId) {
                const topicRef = adminDb.collection('courses').doc(courseId).collection('units').doc(unitId).collection('topics').doc(topicId);
                await topicRef.set({
                    writingContent: {
                        notes: cleanedNotes,
                        conceptDefinitions: cleanedConcepts
                    }
                }, { merge: true });
            }
        } catch (fsErr) {
            console.warn('Firestore writingContent sync warning:', fsErr);
        }

        // ── 3. SYNC WITH ETKİNLİK VERİ BANKASI (activities & activityItems) ──
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

            // Diğer etkinlik tiplerini koru (eşleştirme, bilgi kartı, sıralama vb.)
            const otherActivityItems = existingActivityItems.filter(
                item => item.type !== 'definition' && item.type !== 'concept'
            );

            // Kavram tanımları ve kelime kartları oluştur
            const syncedDefinitionItems = cleanedConcepts.map((cd, idx) => ({
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

            const syncedConceptItems = cleanedConcepts.map((cd, idx) => ({
                id: `concept_${topicId}_${idx}`,
                type: 'concept',
                topicId,
                unitId,
                courseId,
                content: {
                    text: cd.concept
                },
                updatedAt: new Date().toISOString()
            }));

            const allSyncedActivities = [
                ...otherActivityItems,
                ...syncedDefinitionItems,
                ...syncedConceptItems
            ];

            const jsonStr = JSON.stringify(allSyncedActivities, null, 2);
            await fs.writeFile(actFilePath, jsonStr, 'utf-8');
            await fs.writeFile(path.join(ACTIVITY_ITEMS_DIR, `${topicId}.json`), jsonStr, 'utf-8');

            // Firestore activityItems senkronizasyonu
            try {
                const adminDb = getAdminDb();
                if (adminDb) {
                    const batch = adminDb.batch();
                    const collRef = adminDb.collection('activityItems');

                    // Mevcut tanımları bul ve güncelle/ekle
                    const existingSnap = await collRef
                        .where('topicId', '==', topicId)
                        .where('type', '==', 'definition')
                        .get();

                    existingSnap.docs.forEach(d => batch.delete(d.ref));

                    syncedDefinitionItems.forEach(item => {
                        const newDoc = collRef.doc();
                        batch.set(newDoc, {
                            type: 'definition',
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

            // Oyun önbelleğini temizle ki yeni kavramlar oyunlara (Kavram Düellosu, Anlat Bakalım vb.) anında yansısın
            await clearStaticGameCache().catch(() => {});
        } catch (syncErr) {
            console.warn('Etkinlik Veri Bankası sync warning:', syncErr);
        }

        revalidatePath('/teacher/smartboard/yazilacaklar');
        revalidatePath('/teacher/smartboard/yazilacaklar/oyun');
        revalidatePath('/teacher/activity-data');

        return { success: true };
    } catch (error: any) {
        console.error('saveTopicYazilacaklarAction error:', error);
        return { success: false, error: error.message || 'Kaydedilirken hata oluştu.' };
    }
}

/**
 * Generates concept definitions and summary notes from textbook text using Gemini AI.
 */
export async function generateYazilacaklarAiAction(params: {
    sourceText: string;
    topicTitle: string;
    grade?: string;
    courseTitle?: string;
    mode?: 'all' | 'concepts' | 'notes';
}): Promise<{
    success: boolean;
    conceptDefinitions?: ConceptItem[];
    notes?: string[];
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

        const prompt = `Sen MEB Din Kültürü ve Ahlak Bilgisi müfredatında uzman, pedagojik formasyona sahip kıdemli bir ders kitabı yazarısın.
Aşağıda verilen ${grade}. Sınıf "${courseTitle}" dersi ve "${topicTitle}" konusuna ait ders kitabı metnini analiz et.

DERS KİTABI METNİ:
"""
${textToAnalyze}
"""

GÖREVLER:
${mode === 'all' || mode === 'concepts' ? `
1. **KAVRAMLAR VE TANIMLAR (conceptDefinitions):**
- Metindeki kilit dinî terimleri, ahlaki kavramları ve ayet/hadis kökenli anahtar kelimeleri belirle (en az 6, en fazla 15 kavram).
- Her kavram için öğrencilerin seviyesine uygun, net, doğru ve anlaşılır bir tanım yaz.
` : ''}
${mode === 'all' || mode === 'notes' ? `
2. **ÖNEMLİ NOTLAR (notes):**
- Öğrencilerin akıllı tahtadan defterlerine yazacakları, konunun özünü ve kazanımlarını özetleyen 5 ila 10 adet maddeli özet cümle yaz.
- Cümleler akıcı, açık ve net olsun.
` : ''}

ÇIKTI FORMATI:
SADECE geçerli bir JSON döndür:
{
  "conceptDefinitions": [
    { "concept": "Kavram Adı", "definition": "Kavramın açıklaması ve tanımı" }
  ],
  "notes": [
    "1. Konu özeti maddesi...",
    "2. Konu özeti maddesi..."
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
            conceptDefinitions: Array.isArray(parsed.conceptDefinitions) ? parsed.conceptDefinitions : [],
            notes: Array.isArray(parsed.notes) ? parsed.notes : []
        };
    } catch (error: any) {
        console.error('generateYazilacaklarAiAction error:', error);
        return { success: false, error: error.message || 'Yapay zeka içeriği oluşturamadı.' };
    }
}
