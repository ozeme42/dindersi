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
    hookQuestion: z.boolean().optional(),
    notebookNote: z.boolean().optional(),
    processFlow: z.boolean().optional(),
    conceptMatrix: z.boolean().optional(),
    categoryTable: z.boolean().optional(),
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
  hookQuestion?: {
    title?: string;
    question: string;
    thoughtStarter?: string;
    tag?: string;
  };
  notebookNote?: {
    title?: string;
    noteTitle?: string;
    notes: string[];
    suggestedMinutes?: number;
  };
  processFlow?: {
    title: string;
    steps: { stepNumber: number; title: string; description: string; icon?: string }[];
  };
  conceptMatrix?: {
    title: string;
    topicName?: string;
    quadrants: { label: string; content: string; color?: string; icon?: string }[];
  };
  categoryTable?: {
    title: string;
    tableTitle?: string;
    description?: string;
    categories: {
      name: string;
      badge?: string;
      color?: string;
      items: string[];
    }[];
  };
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
  hookQuestion: `"hookQuestion": {
    "title": "🤔 Derse Başlarken: Bir Düşünelim!",
    "question": "Eğer dünyada dürüstlük, adalet ve güven duygusu tamamen yok olsaydı, insanların bir gün bile huzurla yaşaması mümkün olur muydu?",
    "thoughtStarter": "Sizce bir toplumu ayakta tutan en temel manevi değer nedir? Arkadaşlarınızla fikirlerinizi paylaşın.",
    "tag": "Merak & Düşünce Sorusu"
  }`,
  notebookNote: `"notebookNote": {
    "title": "✏️ Defterimize Yazalım",
    "noteTitle": "Dersin En Önemli Özet Maddeleri",
    "notes": [
      "1. Konunun en temel ve unutulmaması gereken 1. ana kuralı.",
      "2. Öğrencinin defterine yazacağı 2. kritik madde.",
      "3. Sınavda soru olarak gelebilecek 3. önemli hap bilgi.",
      "4. Günlük hayata aktarılacak 4. temel ahlaki ilke."
    ],
    "suggestedMinutes": 3
  }`,
  processFlow: `"processFlow": {
    "title": "🪜 Konunun Adım Adım Aşamaları & Süreci",
    "steps": [
      { "stepNumber": 1, "title": "1. Hazırlık ve Niyet", "description": "Sürecin ilk başlangıç basamağı ve temel şartı.", "icon": "target" },
      { "stepNumber": 2, "title": "2. Uygulama ve Eylem", "description": "Gerekli adımların sırasıyla ve dikkatle yerine getirilmesi.", "icon": "zap" },
      { "stepNumber": 3, "title": "3. Tamamlama ve Sonuç", "description": "Sürecin hedefine ulaşması ve güzel bir sonla bağlanması.", "icon": "check" }
    ]
  }`,
  conceptMatrix: `"conceptMatrix": {
    "title": "🔲 4 Boyutta Konu Analizi",
    "topicName": "Konu Başlığı",
    "quadrants": [
      { "label": "1. Nedir? (Tanım)", "content": "Konunun veya kavramın en sade ve anlaşılır temel tanımı.", "color": "blue" },
      { "label": "2. Niçin Önemlidir? (Amaç)", "content": "Bu ilkenin veya ibadetin var oluş sebebi, hikmeti ve gayesi.", "color": "emerald" },
      { "label": "3. Nasıl Uygulanır? (Pratik)", "content": "Günlük hayatta veya ibadet hayatında nasıl hayata geçirilir?", "color": "amber" },
      { "label": "4. Bize Ne Kazandırır? (Fayda)", "content": "Bireye huzur, topluma adalet ve güven kazandıran nihai sonucu.", "color": "purple" }
    ]
  }`,
  categoryTable: `"categoryTable": {
    "title": "📊 Hükümlerine Göre Namazlar Sınıflandırma Tablosu",
    "tableTitle": "Namaz Çeşitleri, Hükümleri ve Örnekleri",
    "description": "Namazlar dinimizdeki hüküm ve bağlayıcılık durumlarına göre 3 temel ana gruba ayrılır.",
    "categories": [
      {
        "name": "Farz Namazlar",
        "badge": "Kesin Dini Emir",
        "color": "emerald",
        "items": [
          "5 Vakit Namazın Farzları (Sabah 2, Öğle 4, İkindi 4, Akşam 3, Yatsı 4 rekat)",
          "Cuma Namazı (Akıllı, ergen ve hür erkeklere farz-ı ayn)",
          "Cenaze Namazı (Müslüman topluluk üzerine farz-ı kifaye)"
        ]
      },
      {
        "name": "Vacip Namazlar",
        "badge": "Kuvvetli Delille Sabit",
        "color": "amber",
        "items": [
          "Vitir Namazı (Her gece yatsı namazından sonra kılınan 3 rekat)",
          "Ramazan ve Kurban Bayramı Namazları (Yılda 2 defa kılınan 2 rekat)",
          "Adak (Nezir) Namazı ve Tilavet/Sehiv Secdesi gerektiren durumlar"
        ]
      },
      {
        "name": "Sünnet / Nafile Namazlar",
        "badge": "Peygamberimizin Uygulaması",
        "color": "indigo",
        "items": [
          "Beş Vaktin Düzenli Sünnetleri (Sabah, Öğle, İkindi, Akşam, Yatsı revatib sünnetleri)",
          "Teravih Namazı (Ramazan ayı gecelerinde cemaatle veya tek kılınır)",
          "Kuşluk (Duha), Teheccüd (Gece), Evvabin ve Tahiyyetü'l-Mescid Namazları"
        ]
      }
    ]
  }`,
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
    "Konunun temel kavramlarını ve dini önemini doğru şekilde açıklayabileceksiniz.",
    "Konuyla ilgili temel hüküm ve çeşitleri birbirinden ayırt edebileceksiniz.",
    "Kazanımları günlük hayatla ilişkilendirerek örneklendirebileceksiniz."
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
2. "hookQuestion" (Merak & Giriş Sorusu): Derse başlarken öğrencilerin dikkatini anında çekecek, onları derin düşünmeye ve sınıfta tartışmaya sevk edecek ilgi çekici bir açık uçlu soru ("question") ve düşünme yönlendiricisi ("thoughtStarter") oluştur.
3. "notebookNote" (Defterimize Yazalım): Öğrencilerin defterlerine geçireceği, konunun en can alıcı 3-5 özet maddesini ("notes" dizisi) oluştur. Sade, net ve madde imi ile deftere yazılmaya hazır olsun.
4. "processFlow" (Adım Adım Yol Haritası / Süreç): Konunun aşamalarını, oluş sırasını veya basamaklarını 3 ila 5 sıralı adım ("steps" dizisi) olarak hazırla. Her adımda "stepNumber", "title" ve "description" olsun.
5. "conceptMatrix" (4 Boyutta Konu Analizi): Konuyu 4 ana boyuta ("1. Nedir? (Tanım)", "2. Niçin Önemlidir? (Amaç)", "3. Nasıl Uygulanır? (Pratik)", "4. Bize Ne Kazandırır? (Fayda)") bölerek her biri için 1-2 cümlelik net açıklamalar yaz.
6. "summary" (Konu Özeti / Ders Slaytları): Kaynak metni içeriğin kapsamına göre mantıklı ana başlıklara böl. Her başlık ("title") için, ortaokul öğrencisinin rahatça okuyup kavrayabileceği KISA ve ÖZ cümlelerden oluşan bir "sentences" dizisi oluştur.
7. "learningObjectives" (Öğrenme Hedefleri): Doğrudan öğrencinin dersteki kazanımlarını hedefleyen, öğrenciye hitap eden 3-5 adet net kazanım cümlesi yaz ("... açıklayabileceksiniz", "... kavrayabileceksiniz" kipiyle).
8. "conceptExplanations" ve "flashcards": Tanımları ortaokul düzeyine uygun, akılda kalıcı ve kısa tut.
9. Tüm içerikler MEB müfredatına ve Türkçe yazım kurallarına %100 uygun olmalıdır.
10. Sorularda çeldiriciler mantıklı olmalı, \`correctAnswer\` tam olarak \`options\` dizisindeki seçeneklerden biriyle BİREBİR AYNI olmalıdır.
11. Anagram sorularında \`scrambledWord\` harfleri karışık olmalı, \`correctAnswer\` doğru kelime olmalıdır.
12. SADECE saf JSON nesnesi döndür.
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
    const parsed = JSON.parse(cleaned) as Record<string, any>;
    
    // KESİN FİLTRELEME: Sadece öğretmenin açıkça seçtiği modülleri koru, seçilmeyen hiçbir şeyi aktarma!
    const filtered: Record<string, any> = {};
    for (const key of requestedKeys) {
      if (key in parsed && parsed[key] !== undefined && parsed[key] !== null) {
        filtered[key] = parsed[key];
      }
    }
    return filtered as GenerateLessonContentOutput;
  } catch (parseError) {
    console.error('JSON parse error in generateLessonContent:', text);
    throw new Error('Yapay zeka yanıtı JSON olarak okunamadı: ' + (parseError as any).message);
  }
}
