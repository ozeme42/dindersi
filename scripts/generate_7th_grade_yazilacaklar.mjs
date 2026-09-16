import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createRequire } from 'module';

const projectRoot = 'D:\\yeniindirme\\dindersi-main\\dindersi-main';
const require = createRequire(path.join(projectRoot, 'package.json'));

if (fs.existsSync(path.join(projectRoot, '.env.local'))) {
  const env = dotenv.parse(fs.readFileSync(path.join(projectRoot, '.env.local')));
  for (const k in env) process.env[k] = env[k];
}

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

const app = getApps().length === 0 ? initializeApp({
  credential: cert({ projectId, clientEmail, privateKey })
}) : getApps()[0];

const db = getFirestore(app);

const COURSE_ID = '134DwgMfh8VYogm3gDyh';
const UNIT_ID = '14Ox2maDLwQIYSUE3qmd';

const TOPICS = [
  { id: 'iMXvYZESmR3700GLvsuj', title: '1. Varlıklar Âlemi' },
  { id: 'x6oWj5a0vpvKvPocgEJA', title: '2. Dünya ve Ahiret Hayatı' },
  { id: 'aHbGAm8EglAfh076WIZs', title: '3. Melek ve Ahiret İnancının İnsana Kazandırdıkları' },
  { id: 'CwY3zQxNb5YnAJVgaw75', title: '4. Bir Sure Öğreniyorum: Nâs Suresi' }
];

async function generateWithRetry(model, prompt, maxRetries = 5) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Sending prompt to Gemini (attempt ${attempt}/${maxRetries})...`);
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (err) {
      console.warn(`Attempt ${attempt} failed:`, err.message);
      if (attempt === maxRetries) throw err;
      const delay = attempt * 3000;
      console.log(`Waiting ${delay}ms before retrying...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

async function main() {
  console.log('Fetching Gemini API Key from Firestore settings/ai_config...');
  const configDoc = await db.collection('settings').doc('ai_config').get();
  const apiKey = configDoc.data()?.geminiApiKey;
  if (!apiKey) {
    throw new Error('No Gemini API key found in Firestore settings/ai_config');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-3.6-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.2
    }
  });

  const YAZILACAKLAR_DIR = path.join(projectRoot, 'public', 'curriculum', 'yazilacaklar');
  const ACTIVITIES_DIR = path.join(projectRoot, 'public', 'curriculum', 'activities');
  const ACTIVITY_ITEMS_DIR = path.join(projectRoot, 'public', 'curriculum', 'activityItems');

  fs.mkdirSync(YAZILACAKLAR_DIR, { recursive: true });
  fs.mkdirSync(ACTIVITIES_DIR, { recursive: true });
  fs.mkdirSync(ACTIVITY_ITEMS_DIR, { recursive: true });

  for (const topic of TOPICS) {
    const yazilacaklarFilePath = path.join(YAZILACAKLAR_DIR, `${topic.id}.json`);
    if (fs.existsSync(yazilacaklarFilePath)) {
      console.log(`Topic ${topic.title} (${topic.id}) already generated. Skipping.`);
      continue;
    }

    console.log(`\n========================================`);
    console.log(`Processing Topic: ${topic.title} (${topic.id})`);
    console.log(`========================================`);

    const topicRef = db.collection('courses').doc(COURSE_ID).collection('units').doc(UNIT_ID).collection('topics').doc(topic.id);
    const topicSnap = await topicRef.get();
    if (!topicSnap.exists) {
      console.warn(`Topic ${topic.id} not found in Firestore!`);
      continue;
    }

    const tData = topicSnap.data();
    const sourceText = (tData.sourceText || '').trim();
    console.log(`Source text length: ${sourceText.length} characters.`);

    const prompt = `Sen MEB Din Kültürü ve Ahlak Bilgisi müfredatında uzman, pedagojik formasyona sahip kıdemli bir ders kitabı ve eğitim oyunu yazarısın.
Aşağıda verilen 7. Sınıf "Din Kültürü ve Ahlak Bilgisi" dersi ve "${topic.title}" konusuna ait ders kitabı metnini analiz et.

DERS KİTABI METNİ:
"""
${sourceText.slice(0, 15000)}
"""

GÖREVLER:
1. **KELİME / KAVRAM HAVUZU (concepts)**:
- Metindeki kilit dinî terimleri, melek isimlerini, kavramları belirle (en az 12, en fazla 18 kelime).
- Bunlar tek kelimelik veya kısa tamlamalar olmalıdır (Örn: "Melek", "Gayb", "Cebrail", "Mikail", "İsrafil", "Azrail", "Kirâmen Kâtibîn", "Münker ve Nekir", "Hafaza").

2. **KAVRAM - TANIM ÇİFTLERİ (conceptDefinitions)**:
- Metindeki önemli kavramların açık, net ve pedagojik tanımlarını çıkar (en az 8, en fazla 14 adet).
- 'concept' alanında kavramın adı tam olarak yer alsın.
- 'definition' alanında ise açık, net, anlaşılır tanımı yer almalıdır.
- KRİTİK KURAL (OYUNLAR İÇİN ZORUNLU): 'definition' metninde kavramın kendi adı KESİNLİKLE GEÇMEMELİDİR! Tanım doğrudan kavramın özelliklerini ve işlevini açıklamalıdır (Kavram Düellosu, Anlat Bakalım ve Eşleştirme oyunlarında soru olarak kullanılacaktır).

3. **DEFTERE YAZILACAK ÖZET NOTLAR (notes)**:
- Öğrencilerin akıllı tahtadan doğrudan defterlerine yazacakları, konunun can alıcı noktalarını, ana fikirlerini ve MEB kazanımlarını özetleyen 6 ila 8 adet maddeli ders notu yaz.
- Her madde "1. ...", "2. ...", "3. ..." şeklinde numaralandırılmış olsun ve akıcı, öğretici bir Türkçe ile yazılsın.

4. **KISA ETKİNLİK VE OYUN CÜMLELERİ (activitySentences)**:
- Cümle Kurma (kelimeleri karıştırılıp doğru sıraya dizilen oyun), Doğru-Yanlış Zinciri ve Tornado oyunlarında kullanılmak üzere 8 ila 12 adet KISA, YALIN ve ANLAŞILIR cümle yaz.
- ÇOK ÖNEMLİ KURAL: Bu cümleler ÖZET DEĞİLDİR, oyun cümlesidir! Cümle Kurma oyununda kelimelere ayrılacağı için her cümle KESİNLİKLE 4 ila 8 kelime arasında olmalıdır. Asla uzun cümle kurma.

ÇIKTI FORMATI:
SADECE geçerli bir JSON döndür:
{
  "concepts": ["Kavram1", "Kavram2"],
  "conceptDefinitions": [
    { "concept": "Kavram Adı", "definition": "Kavramın açıklaması (kavramın adı içinde geçmemeli)" }
  ],
  "notes": [
    "1. Birinci önemli not...",
    "2. İkinci önemli not..."
  ],
  "activitySentences": [
    "Allah evrendeki her şeyi bir ölçüye göre yaratmıştır.",
    "İyilik ve güzellikler insana huzur verir."
  ]
}
`;

    const text = await generateWithRetry(model, prompt);
    const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
    const generatedData = JSON.parse(cleaned);

    console.log(`Generated:`);
    console.log(`- Concepts: ${generatedData.concepts?.length}`);
    console.log(`- Concept Definitions: ${generatedData.conceptDefinitions?.length}`);
    console.log(`- Notes: ${generatedData.notes?.length}`);
    console.log(`- Activity Sentences: ${generatedData.activitySentences?.length}`);

    // Verify definitions don't contain the concept name in definition
    const cleanedDefs = (generatedData.conceptDefinitions || []).map(cd => {
      let def = cd.definition.trim();
      // If concept name appears at beginning or inside, log it
      return {
        concept: cd.concept.trim(),
        definition: def
      };
    });

    const cleanedNotes = (generatedData.notes || []).map(n => n.trim()).filter(Boolean);
    const cleanedSentences = (generatedData.activitySentences || []).map(s => s.trim()).filter(Boolean);
    const cleanedConcepts = (generatedData.concepts || []).map(c => c.trim()).filter(Boolean);

    // 1. Write to public/curriculum/yazilacaklar/${topicId}.json
    const yazilacaklarData = {
      notes: cleanedNotes,
      conceptDefinitions: cleanedDefs,
      updatedAt: new Date().toISOString()
    };
    fs.writeFileSync(yazilacaklarFilePath, JSON.stringify(yazilacaklarData, null, 2), 'utf-8');
    console.log(`Saved ${yazilacaklarFilePath}`);

    // 2. Write to public/curriculum/activities/${topicId}.json and activityItems/${topicId}.json
    const newConceptItems = cleanedConcepts.map((term, idx) => ({
      id: `concept_${topic.id}_${idx}`,
      type: 'concept',
      topicId: topic.id,
      unitId: UNIT_ID,
      courseId: COURSE_ID,
      content: { text: term },
      updatedAt: new Date().toISOString()
    }));

    const newDefinitionItems = cleanedDefs.map((cd, idx) => ({
      id: `def_${topic.id}_${idx}`,
      type: 'definition',
      topicId: topic.id,
      unitId: UNIT_ID,
      courseId: COURSE_ID,
      content: {
        term: cd.concept,
        definition: cd.definition
      },
      updatedAt: new Date().toISOString()
    }));

    const newSentenceItems = cleanedSentences.map((sentence, idx) => ({
      id: `sentence_${topic.id}_${idx}`,
      type: 'sentence',
      topicId: topic.id,
      unitId: UNIT_ID,
      courseId: COURSE_ID,
      content: { text: sentence },
      updatedAt: new Date().toISOString()
    }));

    const allActivityItems = [
      ...newConceptItems,
      ...newDefinitionItems,
      ...newSentenceItems
    ];

    const actFilePath = path.join(ACTIVITIES_DIR, `${topic.id}.json`);
    fs.writeFileSync(actFilePath, JSON.stringify(allActivityItems, null, 2), 'utf-8');
    console.log(`Saved ${actFilePath}`);

    const actItemsFilePath = path.join(ACTIVITY_ITEMS_DIR, `${topic.id}.json`);
    fs.writeFileSync(actItemsFilePath, JSON.stringify(allActivityItems, null, 2), 'utf-8');
    console.log(`Saved ${actItemsFilePath}`);

    // 3. Update Firestore Topic document writingContent
    await topicRef.set({
      writingContent: {
        notes: cleanedNotes,
        conceptDefinitions: cleanedDefs
      }
    }, { merge: true });
    console.log(`Updated Firestore topic.writingContent for ${topic.id}`);

    // 4. Update Firestore activityItems collection
    const collRef = db.collection('activityItems');
    const existingSnap = await collRef.where('topicId', '==', topic.id).get();
    const batch = db.batch();
    existingSnap.docs.forEach(d => {
      const data = d.data();
      if (data.type === 'definition' || data.type === 'concept' || data.type === 'sentence') {
        batch.delete(d.ref);
      }
    });

    allActivityItems.forEach(item => {
      const newDoc = collRef.doc();
      batch.set(newDoc, {
        type: item.type,
        content: item.content,
        topicId: topic.id,
        unitId: UNIT_ID,
        courseId: COURSE_ID,
        createdAt: new Date()
      });
    });
    await batch.commit();
    console.log(`Synced Firestore activityItems collection (${allActivityItems.length} items) for ${topic.id}`);
  }

  console.log(`\n========================================`);
  console.log(`All 4 topics successfully generated and saved!`);
  console.log(`========================================`);
}

main().catch(console.error);
