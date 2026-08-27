
"use server";

/**
 * @fileOverview AI-assisted question generation flow with fallback runner and active model resolution.
 */

import { z } from 'zod';
import { resolveActiveGeminiConfig } from '@/ai/ai-config-service';
import { runGeminiWithFallback } from '@/ai/gemini-fallback-runner';

const DifficultyEnum = z.enum(['Kolay', 'Orta', 'Zor']);

const GenerateQuestionsInputSchema = z.object({
  topicName: z.string().describe("The name of the topic for which to generate questions."),
  contextText: z.string().describe("A summary or key information about the topic to provide context for question generation."),
  questionTypes: z.array(z.string()).describe("An array of question type IDs to generate (e.g., 'mcq', 'tf', 'fitb')."),
  difficulty: z.array(DifficultyEnum).describe("An array of difficulty levels to generate."),
  questionCountPerType: z.number().int().min(1).max(50).describe("The number of questions to generate for each selected type."),
  apiKey: z.string().optional(),
  modelName: z.string().optional(),
});
export type GenerateQuestionsInput = z.infer<typeof GenerateQuestionsInputSchema>;

const MultipleChoiceQuestionSchema = z.object({
    question: z.string().describe('The question text.'),
    options: z.array(z.string()).length(4).describe('An array of 4 possible answers, including the correct one.'),
    correctAnswer: z.string().describe('The correct answer from the options array.'),
    difficulty: DifficultyEnum.describe('The difficulty of the question: Kolay, Orta, or Zor.'),
});

const TrueFalseQuestionSchema = z.object({
    statement: z.string().describe('The statement to be evaluated.'),
    isTrue: z.boolean().describe('Whether the statement is true or false.'),
    difficulty: DifficultyEnum.describe('The difficulty of the question: Kolay, Orta, or Zor.'),
});

const FillInTheBlankQuestionSchema = z.object({
    sentenceWithBlank: z.string().describe("The sentence with a blank part, represented by '___'."),
    options: z.array(z.string()).length(4).describe('An array of 4 possible answers, including the correct one.'),
    correctAnswer: z.string().describe('The word or phrase that correctly fills the blank.'),
    difficulty: DifficultyEnum.describe('The difficulty of the question: Kolay, Orta, or Zor.'),
});

const AIGeneratedQuestionsSchema = z.object({
  multipleChoiceQuestions: z.array(MultipleChoiceQuestionSchema).optional().describe('A list of multiple choice questions.'),
  trueFalseQuestions: z.array(TrueFalseQuestionSchema).optional().describe('A list of true/false questions.'),
  fillInTheBlankQuestions: z.array(FillInTheBlankQuestionSchema).optional().describe('A list of fill-in-the-blank questions.'),
});
export type AIGeneratedQuestions = z.infer<typeof AIGeneratedQuestionsSchema>;

export async function generateQuestions(input: GenerateQuestionsInput): Promise<AIGeneratedQuestions> {
  const { apiKey: activeKey, modelName: selectedModel } = await resolveActiveGeminiConfig({
    apiKey: input.apiKey,
    modelName: input.modelName,
  });

  if (!activeKey) {
    throw new Error('Gemini API anahtarı bulunamadı. Lütfen AI ayarlarından Google AI Studio API anahtarınızı kaydedin.');
  }

  const typeMap: { [key: string]: string } = {
      'mcq': 'Çoktan Seçmeli (multipleChoiceQuestions)',
      'tf': 'Doğru/Yanlış (trueFalseQuestions)',
      'fitb': 'Boşluk Doldurma (fillInTheBlankQuestions)',
  };
  
  const questionTypesFormatted = input.questionTypes.map(typeId => `- ${typeMap[typeId] || typeId}`).join('\n');
  const difficultiesFormatted = input.difficulty.join(', ');

  const prompt = `Sen uzman bir Din Kültürü ve Ahlak Bilgisi öğretmenisin. Ortaokul düzeyinde kaliteli sınav ve test soruları üreteceksin.
Tüm içerikler %100 Türkçe olmalıdır.

Konu: ${input.topicName}
Kaynak Metin / Bilgi: ${input.contextText}

İstenen Soru Tipleri:
${questionTypesFormatted}

Her tip için üretilecek soru sayısı: ${input.questionCountPerType} adet
Zorluk seviyeleri dağılımı: ${difficultiesFormatted}

KRİTİK KURALLAR:
1. Sorular bağımsız olmalı, "Metne göre" veya "Yukarıdaki metne göre" gibi kalıplar içermemelidir.
2. Çoktan seçmeli sorular için 4 seçenek (options) ve seçeneklerden biriyle birebir aynı olan correctAnswer olmalıdır.
3. Doğru/yanlış sorularında statement ve isTrue (boolean) olmalıdır.
4. Boşluk doldurma sorularında sentenceWithBlank (cümledeki boşluk ___ ile gösterilmeli), 4 adet options ve correctAnswer olmalıdır.
5. Her soruda difficulty alanı 'Kolay', 'Orta' veya 'Zor' olmalıdır.
6. SADECE geçerli bir JSON nesnesi döndür:

{
  "multipleChoiceQuestions": [
    { "question": "...", "options": ["...", "...", "...", "..."], "correctAnswer": "...", "difficulty": "Kolay" }
  ],
  "trueFalseQuestions": [
    { "statement": "...", "isTrue": true, "difficulty": "Orta" }
  ],
  "fillInTheBlankQuestions": [
    { "sentenceWithBlank": "... ___ ...", "options": ["...", "...", "...", "..."], "correctAnswer": "...", "difficulty": "Zor" }
  ]
}
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
    return parsed as AIGeneratedQuestions;
  } catch (err: any) {
    console.error("JSON parsing error in generateQuestions:", text);
    throw new Error("Yapay zeka soru yanıtı JSON formatında okunamadı: " + err.message);
  }
}
