'use server';

/**
 * @fileOverview AI-assisted lesson content generation tool with custom API Key & Model support.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';

const GenerateLessonContentInputSchema = z.object({
  topicSummary: z.string().describe('A summary of the topic for which to generate lesson content.'),
  apiKey: z.string().optional(),
  modelName: z.string().optional(),
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
    infographicIdeas: z.boolean().optional(),
    videos: z.boolean().optional(),
    documents: z.boolean().optional(),
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
  generatedImageDataUri?: string;
  progress?: string;
};

const moduleInstructions: Record<string, string> = {
  summary: `- summary: Konunun 3-5 maddelik özeti. Her biri "title" ve "content" içermelidir. (Örn: [{ "title": "...", "content": "..." }])`,
  learningObjectives: `- learningObjectives: Öğrencinin kazanacağı hedefler ("... kavrayabileceksiniz."). Dizi olmalıdır. (Örn: ["Hedef 1", "Hedef 2"])`,
  keyTakeaways: `- keyTakeaways: Öğrenilen temel çıkarımlar ("... öğrendim."). Dizi olmalıdır. (Örn: ["Çıkarım 1", "Çıkarım 2"])`,
  conceptExplanations: `- conceptExplanations: 3-5 temel kavram ve detaylı açıklamaları. (Örn: [{ "concept": "Adalet", "definition": "Hak ve hukuka uygunluk..." }])`,
  keyConcepts: `- keyConcepts: Anahtar kavramların isim listesi. (Örn: ["Kavram 1", "Kavram 2"])`,
  flashcards: `- flashcards: Bilgi kartları terim ve tanım çiftleri. (Örn: [{ "term": "Terim", "definition": "Tanım..." }])`,
  multipleChoiceQuestions: `- multipleChoiceQuestions: 4 seçenekli çoktan seçmeli sorular. (Örn: [{ "question": "Soru...", "options": ["A", "B", "C", "D"], "correctAnswer": "A" }])`,
  trueFalseQuestions: `- trueFalseQuestions: Doğru/Yanlış ifadeleri. (Örn: [{ "statement": "İfade...", "isTrue": true }])`,
  fillInTheBlankQuestions: `- fillInTheBlankQuestions: Boşluk doldurma soruları (boşluk '___' ile belirtilir). (Örn: [{ "sentenceWithBlank": "İslam'ın şartı ___ tanedir.", "options": ["3", "4", "5", "6"], "correctAnswer": "5" }])`,
  anagramQuestions: `- anagramQuestions: Karışık harfli kelime bulma soruları. (Örn: [{ "definition": "İpucu tanım", "scrambledWord": "karnaa", "correctAnswer": "Ankara" }])`,
  sentenceScrambleQuestions: `- sentenceScrambleQuestions: Karışık kelimeli cümle düzeltme. (Örn: [{ "scrambledSentence": "geldi bugün okula ali", "correctSentence": "ali bugün okula geldi" }])`,
};

export async function generateLessonContent(input: GenerateLessonContentInput): Promise<GenerateLessonContentOutput> {
  const activeKey = input.apiKey?.trim() || process.env.GEMINI_API_KEY || '';
  const selectedModel = input.modelName?.trim() || 'gemini-3.7-flash';

  if (!activeKey) {
    throw new Error('Gemini API anahtarı bulunamadı. Lütfen "Model & API Ayarları" bölümünden kendi Google AI Studio API anahtarınızı girin.');
  }

  const requestedInstructions = Object.entries(input.modules)
    .filter(([, value]) => value)
    .filter(([key]) => key in moduleInstructions && key !== 'visuals')
    .map(([key]) => moduleInstructions[key])
    .join('\n');

  let output: GenerateLessonContentOutput = {};

  if (requestedInstructions) {
    const prompt = `Sen uzman bir Türk eğitim içerik üreticisi ve pedagojik ders tasarımcısısın.
Aşağıdaki konu metnini ve istenen modülleri kullanarak SADECE geçerli bir JSON nesnesi üret.
Tüm içerik Türkçe olmalıdır.

KONU / KAYNAK METİN:
${input.topicSummary}

---

İSTENEN MODÜLLER VE FORMATLARI:
${requestedInstructions}

ÖNEMLİ KURALLAR:
1. Yanıtın SADECE geçerli bir JSON nesnesi olsun. Başına veya sonuna \`\`\`json veya açıklama ekleme.
2. Yalnızca istenen modüllerin anahtarlarını JSON içine ekle.
3. Sorularda ve içeriklerde Türkçe yazım kurallarına tam uy.
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
      // JSON temizleme ve parse
      const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      output = JSON.parse(cleaned);
    } catch (parseError) {
      console.error('JSON parse error in generateLessonContent:', text);
      throw new Error('Yapay zeka yanıtı JSON formatına dönüştürülemedi.');
    }
  }

  return output;
}
