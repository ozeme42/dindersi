
"use server";

/**
 * @fileOverview AI-assisted question generation flow for educators.
 *
 * - generateQuestions - A function that handles the question generation process.
 * - GenerateQuestionsInput - The input type for the generateQuestions function.
 * - AIGeneratedQuestions - The raw return type from the AI model.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { googleAI } from '@genkit-ai/google-genai';

const DifficultyEnum = z.enum(['Kolay', 'Orta', 'Zor']);

const GenerateQuestionsInputSchema = z.object({
  topicName: z.string().describe("The name of the topic for which to generate questions."),
  contextText: z.string().describe("A summary or key information about the topic to provide context for question generation."),
  questionTypes: z.array(z.string()).describe("An array of question type IDs to generate (e.g., 'mcq', 'tf', 'fitb')."),
  difficulty: z.array(DifficultyEnum).describe("An array of difficulty levels to generate."),
  questionCountPerType: z.number().int().min(1).max(50).describe("The number of questions to generate for each selected type."),
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
  return generateQuestionsFlow(input);
}

const generateQuestionsFlow = ai.defineFlow(
  {
    name: 'generateQuestionsFlow',
    inputSchema: GenerateQuestionsInputSchema,
    outputSchema: AIGeneratedQuestionsSchema,
  },
  async (input) => {
    const typeMap: { [key: string]: string } = {
        'mcq': 'Çoktan Seçmeli (Multiple Choice)',
        'tf': 'Doğru/Yanlış (True/False)',
        'fitb': 'Boşluk Doldurma (Fill in the Blank)',
    };
    
    const questionTypesFormatted = input.questionTypes.map(typeId => `- ${typeMap[typeId] || typeId}`).join('\n');
    const difficultiesFormatted = input.difficulty.join(', ');

    const prompt = `You are an expert Turkish educator creating a quiz.
Your task is to generate a set of high-quality questions about the given topic.
First, fully understand the provided topic summary. If the summary is brief, use your expert knowledge to expand on it.
Then, based on this comprehensive understanding, create questions in the requested formats. The generated questions must be independent and should not refer to the provided context text with phrases like "Metne göre" or "Yukarıdaki metne göre". They should stand alone as general knowledge questions about the topic.

All generated content MUST be in Turkish.

Topic: ${input.topicName}
Topic Summary / Key Information: ${input.contextText}

Please generate exactly ${input.questionCountPerType} questions for each of the following types:
${questionTypesFormatted}

It is CRITICAL that you create a balanced mix of difficulties for the generated questions. Distribute them evenly among the FOLLOWING requested difficulty levels:
${difficultiesFormatted}
Each generated question MUST have a 'difficulty' field set to one of the requested values.

For fill-in-the-blank questions, you MUST provide 4 options, one of which is the correct answer.

Return all generated questions in a single, valid JSON object that adheres to the output schema. The questions should be clear, accurate, and relevant.
`;

    const { output } = await ai.generate({
        model: googleAI.model('gemini-1.5-flash'),
        prompt: prompt,
        output: {
            schema: AIGeneratedQuestionsSchema,
        },
    });

    if (!output) {
        throw new Error("AI model failed to generate questions. The output was empty.");
    }
    return output;
  }
);
