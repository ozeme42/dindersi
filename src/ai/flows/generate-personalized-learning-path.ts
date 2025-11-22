'use server';
/**
 * @fileOverview AI flow to generate a personalized learning path based on user goals and skill level.
 *
 * - generatePersonalizedLearningPath - A function that generates a personalized learning path.
 * - PersonalizedLearningPathInput - The input type for the generatePersonalizedLearningPath function.
 * - PersonalizedLearningPathOutput - The return type for the generatePersonalizedLearningPath function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PersonalizedLearningPathInputSchema = z.object({
  goals: z.string().describe('The learning goals of the student.'),
  skillLevel: z.enum(['beginner', 'intermediate', 'advanced']).describe('The current skill level of the student.'),
  learningPreferences: z.string().optional().describe('Optional learning preferences of the student.'),
});

export type PersonalizedLearningPathInput = z.infer<typeof PersonalizedLearningPathInputSchema>;

const PersonalizedLearningPathOutputSchema = z.object({
  learningPath: z.string().describe('A personalized learning path for the student.'),
});

export type PersonalizedLearningPathOutput = z.infer<typeof PersonalizedLearningPathOutputSchema>;

export async function generatePersonalizedLearningPath(
  input: PersonalizedLearningPathInput
): Promise<PersonalizedLearningPathOutput> {
  return generatePersonalizedLearningPathFlow(input);
}

const prompt = ai.definePrompt({
  name: 'personalizedLearningPathPrompt',
  input: {schema: PersonalizedLearningPathInputSchema},
  output: {schema: PersonalizedLearningPathOutputSchema},
  prompt: `You are an expert learning path generator. Based on the student's goals, skill level, and learning preferences, you will generate a personalized learning path.

Student Goals: {{{goals}}}
Student Skill Level: {{{skillLevel}}}
Student Learning Preferences: {{{learningPreferences}}}

Please generate a personalized learning path for the student.`,
});

const generatePersonalizedLearningPathFlow = ai.defineFlow(
  {
    name: 'generatePersonalizedLearningPathFlow',
    inputSchema: PersonalizedLearningPathInputSchema,
    outputSchema: PersonalizedLearningPathOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
