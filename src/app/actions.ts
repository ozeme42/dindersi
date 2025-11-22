'use server';

import { generatePersonalizedLearningPath, PersonalizedLearningPathInput } from '@/ai/flows/generate-personalized-learning-path';
import { provideAiTutoringAssistance, ProvideAiTutoringAssistanceInput } from '@/ai/flows/provide-ai-tutoring-assistance';

export async function generateLearningPathAction(input: PersonalizedLearningPathInput) {
  try {
    const result = await generatePersonalizedLearningPath(input);
    return { success: true, data: result };
  } catch (error) {
    console.error(error);
    return { success: false, error: 'Failed to generate learning path.' };
  }
}

export async function getTutorAssistanceAction(input: ProvideAiTutoringAssistanceInput) {
  try {
    const result = await provideAiTutoringAssistance(input);
    return { success: true, data: result };
  } catch (error) {
    console.error(error);
    return { success: false, error: 'Failed to get assistance.' };
  }
}
