'use server';

/**
 * @fileOverview AI-assisted lesson content generation tool with custom API Key & Model support.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import { resolveActiveGeminiConfig } from '@/ai/ai-config-service';
import { runGeminiWithFallback } from '@/ai/gemini-fallback-runner';

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
    infographicTable: z.boolean().optional(),
    visualInfographics: z.boolean().optional(),
    visuals: z.boolean().optional(),
    conceptMap: z.boolean().optional(),
    htmlSlide: z.boolean().optional(),
  }),
});
export type GenerateLessonContentInput = z.infer<typeof GenerateLessonContentInputSchema>;

export type GenerateLessonContentOutput = {
  summary?: { title: string; sentences?: string[]; content?: string }[];
  learningObjectives?: string[];
  keyTakeaways?: string[];
  conceptExplanations?: { concept: string; definition: string }[];
  keyConcepts?: string[];
  flashcards?: { term: string; definition: string }[];
  infographicTable?: {
    title: string;
    description?: string;
    columns: string[];
    rows: string[][];
  };
  visualInfographics?: {
    title: string;
    type?: 'process' | 'comparison' | 'stat-grid' | 'timeline';
    items: { icon: string; title: string; subtitle?: string; description: string; badge?: string }[];
    summaryNote?: string;
  };
  multipleChoiceQuestions?: { question: string; options: string[]; correctAnswer: string }[];
  trueFalseQuestions?: { statement: string; isTrue: boolean }[];
  fillInTheBlankQuestions?: { sentenceWithBlank: string; options: string[]; correctAnswer: string }[];
  anagramQuestions?: { definition: string; scrambledWord: string; correctAnswer: string }[];
  sentenceScrambleQuestions?: { scrambledSentence: string; correctSentence: string }[];
  visuals?: string[];
  progress?: string;
};

const moduleInstructions: Record<string, string> = {
  infographicTable: `"infographicTable": {
    "title": "Hükümlerine Göre Namaz Çeşitleri Karşılaştırma Tablosu",
    "description": "Namazların dini hükümleri, vakitleri ve temel özellikleri",
    "columns": ["Namaz Türü", "Hükmü", "Örnekler", "Kılınış Özelliği"],
    "rows": [
      ["Farz Namazlar", "Kesin Farz (Farz-ı Ayn / Kifaye)", "5 Vakit, Cuma, Cenaze", "Özürsüz terk edilemez, sevabı çok büyüktür."],
      ["Vacip Namazlar", "Kuvvetli Dini Emir", "Vitir, Ramazan & Kurban Bayramı", "Kılınması dinen zorunludur, sevabı yüksektir."],
      ["Nafile (Sünnet)", "Gönüllü İbadet & Sevap", "Teravih, Kuşluk, Teheccüt", "Peygamberimizin sünnetidir, eksikleri tamamlar."]
    ]
  }`,
  visualInfographics: `"visualInfographics": {
    "title": "Namaz İbadetinin 3 Temel Boyutu ve Aşamaları",
    "items": [
      { "icon": "🌱", "title": "1. Niyet ve Başlangıç", "subtitle": "Manevi Hazırlık", "description": "Dünyevi telaşlardan sıyrılarak yalnız Allah rızası için huzura durulur.", "badge": "İhlas" },
      { "icon": "🤲", "title": "2. Kıraat ve Rükû", "subtitle": "Huzur ve Saygı", "description": "Kur'an ayetleri okunur, Rabbimizin yüceliği karşısında eğilinir.", "badge": "Tevazu" },
      { "icon": "✨", "title": "3. Secde ve Selam", "subtitle": "En Yakın An", "description": "Kulun Allah'a en yakın olduğu an olan secde ile tamamlanır.", "badge": "Huzur" }
    ],
    "summaryNote": "Namaz, müminin gün içinde düzenli aralıklarla manevi olarak yenilenmesini sağlar."
  }`,
  summary: `"summary": [
    { 
      "title": "Metindeki 1. Ana Konu Başlığı (Örn: Namaz İbadetinin Anlamı ve Önemi)", 
      "sentences": [
        "Namaz, tekbirle başlayıp selamla biten, belirli hareket ve sözlerden oluşan bedenî bir ibadettir.",
        "İslam'ın beş temel şartından biri olup ergenlik çağına gelmiş her Müslümana farzdır.",
        "Günde beş vakit kılınan namaz, kul ile Allah arasındaki bağı güçlendirir."
      ] 
    },
    { 
      "title": "Metindeki 2. Ana Konu Başlığı (Örn: Namaz Çeşitleri: Farz, Vacip ve Nafile)", 
      "sentences": [
        "Farz Namazlar: Günlük beş vakit namaz, cuma namazı ve cenaze namazıdır.",
        "Vacip Namazlar: Vitir namazı ile Ramazan ve Kurban bayramı namazlarıdır.",
        "Nafile Namazlar: Farz ve vaciplerin dışında Allah rızası için kılınan sünnet namazlardır."
      ] 
    },
    { 
      "title": "Metindeki 3. Ana Konu Başlığı (Örn: Namazın Bireysel ve Toplumsal Faydaları)", 
      "sentences": [
        "İnsana zaman bilinci, düzen ve beden-ruh temizliği kazandırır.",
        "Kötülüklere karşı kalkan olur ve kalbe huzur verir.",
        "Cemaatle namaz Müslümanlar arasında birlik, beraberlik ve kardeşliği pekiştirir."
      ] 
    }
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

  const prompt = `Sen uzman bir Din Kültürü ve Ahlak Bilgisi öğretmeni, eğitim içerik üreticisi ve pedagojik ders tasarımcısısın.
Görevin, aşağıdaki kaynak metni pedagojik olarak analiz ederek ORTAOKUL ÖĞRENCİLERİNİN (5, 6, 7, 8. SINIF) kolayca anlayabileceği seviyede eğitim modülleri üretmektir.

HEDEF KİTLE VE DİL KURALLARI:
- Cümleler KISA, NET, SADE ve ANLAŞILIR olmalıdır. Ağdalı, aşırı uzun ve karmaşık cümlelerden kesinlikle kaçın.
- Her cümle tek bir ana fikri/bilgiyi aktarmalıdır (Hap bilgi niteliğinde).

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
2. "summary" (Konu Özeti / Ders Slaytları): Kaynak metni içeriğin kapsamına göre mantıklı ana başlıklara böl (Sabit bir başlık sınırı YOKTUR; metnin uzunluğuna göre 2, 3, 4, 5, 6 veya daha fazla başlığa serbestçe bölebilirsin). Her başlık ("title") için, ortaokul öğrencisinin rahatça okuyup kavrayabileceği KISA ve ÖZ cümlelerden oluşan bir "sentences" dizisi oluştur.
3. "learningObjectives" (Öğrenme Hedefleri): Konuyla ilgili öğrencinin kazanacağı 3-5 adet kısa ve net hedef cümlesi yaz.
4. "conceptExplanations" ve "flashcards": Tanımları ortaokul düzeyine uygun, akılda kalıcı ve kısa tut.
5. Tüm içerikler MEB müfredatına ve Türkçe yazım kurallarına %100 uygun olmalıdır.
6. Sorularda çeldiriciler mantıklı olmalı, \`correctAnswer\` tam olarak \`options\` dizisindeki seçeneklerden biriyle BİREBİR AYNI olmalıdır.
7. Anagram sorularında \`scrambledWord\` harfleri karışık olmalı, \`correctAnswer\` doğru kelime olmalıdır.
8. SADECE saf JSON nesnesi döndür.
`;

  const text = await runGeminiWithFallback({
    apiKey: activeKey,
    primaryModel: selectedModel,
    prompt,
    generationConfig: {
      responseMimeType: 'application/json',
    },
  });

  try {
    const cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
    const parsed = JSON.parse(cleaned);
    return parsed as GenerateLessonContentOutput;
  } catch (parseError) {
    console.error('JSON parse error in generateLessonContent:', text);
    throw new Error('Yapay zeka yanıtı JSON olarak okunamadı: ' + (parseError as any).message);
  }
}
