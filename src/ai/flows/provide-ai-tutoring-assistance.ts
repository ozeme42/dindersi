'use server';
/**
 * @fileOverview An AI tutoring assistant that answers student questions and provides hints.
 *
 * - provideAiTutoringAssistance - A function that handles the AI tutoring assistance process.
 * - ProvideAiTutoringAssistanceInput - The input type for the provideAiTutoringAssistance function.
 * - ProvideAiTutoringAssistanceOutput - The return type for the provideAiTutoringAssistance function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ProvideAiTutoringAssistanceInputSchema = z.object({
  question: z.string().describe('The student\'s question.'),
  subject: z.string().describe('The subject of the question.'),
  studentLevel: z.string().describe('The student\'s skill level (e.g., beginner, intermediate, advanced).'),
});
export type ProvideAiTutoringAssistanceInput = z.infer<typeof ProvideAiTutoringAssistanceInputSchema>;

const ProvideAiTutoringAssistanceOutputSchema = z.object({
  answer: z.string().describe('The answer to the student\'s question.'),
  hint: z.string().optional().describe('An optional hint to help the student.'),
});
export type ProvideAiTutoringAssistanceOutput = z.infer<typeof ProvideAiTutoringAssistanceOutputSchema>;

export async function provideAiTutoringAssistance(input: ProvideAiTutoringAssistanceInput): Promise<ProvideAiTutoringAssistanceOutput> {
  return provideAiTutoringAssistanceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'provideAiTutoringAssistancePrompt',
  input: {schema: ProvideAiTutoringAssistanceInputSchema},
  output: {schema: ProvideAiTutoringAssistanceOutputSchema},
  prompt: `You are an AI tutoring assistant. A student is asking for help with a question.

  Subject: {{{subject}}}
  Student Level: {{{studentLevel}}}
  Question: {{{question}}}

  Answer the question to the best of your ability. If the student is struggling, provide a hint.
  If you cannot answer the question, say you do not know.`, 
});

const provideAiTutoringAssistanceFlow = ai.defineFlow(
  {
    name: 'provideAiTutoringAssistanceFlow',
    inputSchema: ProvideAiTutoringAssistanceInputSchema,
    outputSchema: ProvideAiTutoringAssistanceOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
