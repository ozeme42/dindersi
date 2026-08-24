'use server';

/**
 * @fileOverview AI-assisted lesson content generation tool with custom API Key & Model support.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import { resolveActiveGeminiConfig } from '@/ai/ai-config-service';

const GenerateLessonContentInputSchema = z.object({
  topicSummary: z.string().describe('A summary of the topic for which to generate lesson content.'),
  apiKey: z.string().optional(),
  modelName: z.string().optional(),
  itemCount: z.number().optional(), // e.g. 5 questions / concepts
  modules: z.object({
    summary: z.boolean().optional(),
    learningObjectives: z.boolean().optional(),
    keyTakeaways: z.boolean().optional(),
    conceptExplanations: z.boolean().optional(),
    keyConcepts: z.boolean().optional(),
    flashcards: z.boolean().optional(),
    multipleChoiceQuestions: z.boolean().optional(),
    trueFalseQuestions: z.boolean().optional(),
    fillInTheBlankQuestions: z.boolean().optional(),
    anagramQuestions: z.boolean().optional(),
    sentenceScrambleQuestions: z.boolean().optional(),
    visuals: z.boolean().optional(),
    conceptMap: z.boolean().optional(),
    htmlSlide: z.boolean().optional(),
  }),
});
export type GenerateLessonContentInput = z.infer<typeof GenerateLessonContentInputSchema>;

export type GenerateLessonContentOutput = {
  summary?: { title: string; content: string }[];
  learningObjectives?: string[];
  keyTakeaways?: string[];
  conceptExplanations?: { concept: string; definition: string }[];
  keyConcepts?: string[];
  flashcards?: { term: string; definition: string }[];
  multipleChoiceQuestions?: { question: string; options: string[]; correctAnswer: string }[];
  trueFalseQuestions?: { statement: string; isTrue: boolean }[];
  fillInTheBlankQuestions?: { sentenceWithBlank: string; options: string[]; correctAnswer: string }[];
  anagramQuestions?: { definition: string; scrambledWord: string; correctAnswer: string }[];
  sentenceScrambleQuestions?: { scrambledSentence: string; correctSentence: string }[];
  visuals?: string[];
  progress?: string;
};

const moduleInstructions: Record<string, string> = {
  summary: `"summary": [
    { "title": "1. Giriş ve Temel İlke", "content": "<li>Konunun ana hatlarını açıklayan detaylı birinci madde.</li><li>İkinci önemli açıklama noktası.</li>" },
    { "title": "2. Önemli Özellikler ve Hükümler", "content": "<li>Uygulama şartları ve dikkat edilecek noktalar.</li>" },
    { "title": "3. Günlük Hayata Yansımaları", "content": "<li>Bireysel ve toplumsal faydaları.</li>" }
  ]`,
  learningObjectives: `"learningObjectives": [
    "Konunun temel kavramlarını ve anlamını doğru şekilde açıklayabileceksiniz.",
    "Konuyla ilgili temel ilkeleri günlük yaşam örnekleriyle ilişkilendirebileceksiniz.",
    "Kazanımları kavrayarak değerlendirme sorularını başarıyla çözebileceksiniz."
  ]`,
  keyTakeaways: `"keyTakeaways": [
    "Konu hakkındaki en kritik 1. temel kazanım cümlesi.",
    "Unutulmaması gereken 2. önemli ilke.",
    "Sınavlarda sıkça çıkan 3. kilit kural."
  ]`,
  conceptExplanations: `"conceptExplanations": [
    { "concept": "Kavram 1", "definition": "Bu kavramın açık, net ve pedagojik tanımı." },
    { "concept": "Kavram 2", "definition": "İkinci kilit kavramın detaylı tanımı." },
    { "concept": "Kavram 3", "definition": "Üçüncü kilit kavramın detaylı tanımı." },
    { "concept": "Kavram 4", "definition": "Dördüncü kilit kavramın detaylı tanımı." }
  ]`,
  flashcards: `"flashcards": [
    { "term": "Terim 1", "definition": "Bu terimin akılda kalıcı, kısa ve vurucu açıklaması." },
    { "term": "Terim 2", "definition": "İkinci terimin açıklaması." },
    { "term": "Terim 3", "definition": "Üçüncü terimin açıklaması." },
    { "term": "Terim 4", "definition": "Dördüncü terimin açıklaması." }
  ]`,
  anagramQuestions: `"anagramQuestions": [
    { "definition": "İpucu tanım veya açıklama", "scrambledWord": "karışıkharfler", "correctAnswer": "DOĞRUKELİME" },
    { "definition": "İkinci ipucu tanım", "scrambledWord": "harflerkarışık", "correctAnswer": "İKİNCİKELİME" },
    { "definition": "Üçüncü ipucu tanım", "scrambledWord": "karışıküç", "correctAnswer": "ÜÇÜNCÜKELİME" }
  ]`,
  sentenceScrambleQuestions: `"sentenceScrambleQuestions": [
    { "scrambledSentence": "şartıdır İslam'ın beş temel namaz kılmak", "correctSentence": "namaz kılmak İslam'ın beş temel şartıdır" },
    { "scrambledSentence": "bireyi korur kötülüklerden güzel ahlak", "correctSentence": "güzel ahlak bireyi kötülüklerden korur" }
  ]`,
  multipleChoiceQuestions: `"multipleChoiceQuestions": [
    { "question": "Konuyla ilgili 1. soru kökü?", "options": ["A Seçeneği", "B Seçeneği", "C Seçeneği", "D Seçeneği"], "correctAnswer": "A Seçeneği" },
    { "question": "Konuyla ilgili 2. soru kökü?", "options": ["A Seçeneği", "B Seçeneği", "C Seçeneği", "D Seçeneği"], "correctAnswer": "B Seçeneği" },
    { "question": "Konuyla ilgili 3. soru kökü?", "options": ["A Seçeneği", "B Seçeneği", "C Seçeneği", "D Seçeneği"], "correctAnswer": "C Seçeneği" }
  ]`,
  trueFalseQuestions: `"trueFalseQuestions": [
    { "statement": "Konuyla ilgili doğru bir yargı ifadesi.", "isTrue": true },
    { "statement": "Konuyla ilgili çeldirici yanlış bir ifade.", "isTrue": false },
    { "statement": "Konuyla ilgili ikinci doğru bir ifade.", "isTrue": true },
    { "statement": "Konuyla ilgili ikinci yanlış bir ifade.", "isTrue": false }
  ]`,
  fillInTheBlankQuestions: `"fillInTheBlankQuestions": [
    { "sentenceWithBlank": "Cümledeki boşluk ___ işaretiyle gösterilir.", "options": ["Doğru Cevap", "Çeldirici 1", "Çeldirici 2", "Çeldirici 3"], "correctAnswer": "Doğru Cevap" },
    { "sentenceWithBlank": "İkinci boşluklu ___ cümle buradadır.", "options": ["Doğru Seçenek", "Yanlış 1", "Yanlış 2", "Yanlış 3"], "correctAnswer": "Doğru Seçenek" }
  ]`
};

export async function generateLessonContent(input: GenerateLessonContentInput): Promise<GenerateLessonContentOutput> {
  const { apiKey: activeKey, modelName: selectedModel } = await resolveActiveGeminiConfig({
    apiKey: input.apiKey,
    modelName: input.modelName,
  });

  if (!activeKey) {
    throw new Error('Gemini API anahtarı bulunamadı. Lütfen AI ayarlarından Google AI Studio API anahtarınızı girip Sisteme Kaydet butonuna tıklayın.');
  }

  const requestedKeys = Object.entries(input.modules)
    .filter(([, value]) => value)
    .map(([key]) => key)
    .filter(key => key in moduleInstructions);

  if (requestedKeys.length === 0) {
    return {};
  }

  const requestedExamples = requestedKeys.map(k => moduleInstructions[k]).join(',\n\n');

  const prompt = `Sen uzman bir Türk eğitim içerik üreticisi, soru yazarı ve pedagojik ders tasarımcısısın.
Görevin, aşağıdaki konuyu derinlemesine analiz ederek talep edilen eğitim modüllerini EKSİKSİZ, DOĞRU ve ZENGİN bir şekilde üretmektir.

KONU / KAYNAK METİN:
"${input.topicSummary}"

---

İSTENEN JSON FORMATI VE ŞABLONU:
SADECE geçerli bir JSON nesnesi üret. Yanıtın başında ve sonunda hiçbir ek metin, markdown (\`\`\`json) olmasın.
Format tam olarak şu yapıda olmalıdır:

{
${requestedExamples}
}

---

### KRİTİK KURALLAR:
1. SADECE yukarıda istenen alanları (${requestedKeys.join(', ')}) JSON nesnesinde doldur.
2. Tüm içerikler pedagojik olarak zengin, anlaşılır, MEB müfredatına ve Türkçe yazım kurallarına %100 uygun olmalıdır.
3. Sorularda çeldiriciler mantıklı olmalı, \`correctAnswer\` tam olarak \`options\` dizisindeki seçeneklerden biriyle BİREBİR AYNI olmalıdır.
4. Anagram sorularında \`scrambledWord\` harfleri karışık olmalı, \`correctAnswer\` doğru kelime olmalıdır.
5. SADECE saf JSON nesnesi döndür.
`;

  const genAI = new GoogleGenerativeAI(activeKey);
  const model = genAI.getGenerativeModel({
    model: selectedModel,
    generationConfig: {
      responseMimeType: 'application/json',
    },
  });

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  try {
    const cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
    const parsed = JSON.parse(cleaned);
    return parsed as GenerateLessonContentOutput;
  } catch (parseError) {
    console.error('JSON parse error in generateLessonContent:', text);
    throw new Error('Yapay zeka yanıtı JSON olarak okunamadı: ' + (parseError as any).message);
  }
}
