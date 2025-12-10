

'use server';

/**
 * @fileOverview AI-assisted lesson content generation tool.
 *
 * - generateLessonContent - A function that handles the lesson content generation process.
 * - GenerateLessonContentInput - The input type for the generateLessonContent function.
 * - GenerateLessonContentOutput - The return type for the generateLessonContent function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

const GenerateLessonContentInputSchema = z.object({
  topicSummary: z
    .string()
    .describe('A summary of the topic for which to generate lesson content.'),
  modules: z.object({
    summary: z.boolean().optional().describe('Generate a summary of the topic?'),
    learningObjectives: z.boolean().optional().describe('Generate learning objectives for the topic?'),
    keyTakeaways: z.boolean().optional().describe('Generate key takeaways for the topic?'),
    conceptExplanations: z.boolean().optional().describe('Generate concept explanations?'),
    keyConcepts: z.boolean().optional().describe('Generate a list of key concepts?'),
    flashcards: z.boolean().optional().describe('Generate flashcards?'),
    multipleChoiceQuestions: z.boolean().optional().describe('Generate multiple choice questions?'),
    trueFalseQuestions: z.boolean().optional().describe('Generate true/false questions?'),
    fillInTheBlankQuestions: z.boolean().optional().describe('Generate fill-in-the-blank questions?'),
    anagramQuestions: z.boolean().optional().describe('Generate anagram questions?'),
    sentenceScrambleQuestions: z.boolean().optional().describe('Generate sentence scramble questions?'),
    visuals: z.boolean().optional().describe('Generate a main visual for the lesson?'),
    infographicIdeas: z.boolean().optional().describe('Generate ideas for an infographic?'),
    videos: z.boolean().optional().describe('Generate video ideas?'),
    documents: z.boolean().optional().describe('Generate document links?'),
  }).describe('Which content modules to generate.'),
});
export type GenerateLessonContentInput = z.infer<typeof GenerateLessonContentInputSchema>;

const SummaryItemSchema = z.object({
  title: z.string().describe('The title of the summary point.'),
  content: z.string().describe('The detailed explanation for the summary point.'),
});

const GenerateLessonContentOutputSchema = z.object({
  summary: z.array(SummaryItemSchema).optional().describe('A summary of the topic, as a list of expandable items, each with a title and content.'),
  learningObjectives: z.array(z.string()).optional().describe('A list of learning objectives for the topic.'),
  keyTakeaways: z.array(z.string()).optional().describe('A list of key takeaways for the topic, phrased in the past tense.'),
  conceptExplanations: z.array(z.object({
    concept: z.string().describe('The key concept or term.'),
    definition: z.string().describe('The detailed explanation or definition for the concept.')
  })).optional().describe('A list of key concepts and their detailed explanations.'),
  keyConcepts: z.array(z.string()).optional().describe('A list of key concepts related to the topic.'),
  flashcards: z.array(z.object({term: z.string(), definition: z.string()})).optional().describe('Flashcards for vocabulary and definitions.'),
  multipleChoiceQuestions: z.array(z.object({
    question: z.string().describe('The question text.'),
    options: z.array(z.string()).describe('An array of 4 possible answers, including the correct one.'),
    correctAnswer: z.string().describe('The correct answer from the options array.'),
  })).optional().describe('A list of multiple choice questions.'),
  trueFalseQuestions: z.array(z.object({
    statement: z.string().describe('The statement to be evaluated.'),
    isTrue: z.boolean().describe('Whether the statement is true or false.'),
  })).optional().describe('A list of true/false questions.'),
  fillInTheBlankQuestions: z.array(z.object({
    sentenceWithBlank: z.string().describe("The sentence with a blank part, represented by '___'."),
    options: z.array(z.string()).describe('An array of 4 possible answers, including the correct one.'),
    correctAnswer: z.string().describe('The word or phrase that correctly fills the blank.'),
  })).optional().describe('A list of fill-in-the-blank questions.'),
  anagramQuestions: z.array(z.object({
    definition: z.string().describe('A hint or definition for the scrambled word.'),
    scrambledWord: z.string().describe('The scrambled word.'),
    correctAnswer: z.string().describe('The unscrambled, correct word.'),
  })).optional().describe('A list of anagrams.'),
  sentenceScrambleQuestions: z.array(z.object({
    scrambledSentence: z.string().describe('A sentence with its words scrambled.'),
    correctSentence: z.string().describe('The correctly ordered sentence.'),
  })).optional().describe('A list of scrambled sentences.'),
  visuals: z.array(z.string()).optional().describe('URLs or descriptions of relevant visuals.'),
  infographicIdeas: z.array(z.string()).optional().describe('A list of ideas for an infographic?'),
  videos: z.array(z.string()).optional().describe('URLs of relevant videos.'),
  documents: z.array(z.string()).optional().describe('Links to supporting documents.'),
  generatedImageDataUri: z.string().optional().describe('A generated image for the lesson, as a data URI.'),
  progress: z.string().optional().describe('Short summary of what has been generated.'),
});
export type GenerateLessonContentOutput = z.infer<typeof GenerateLessonContentOutputSchema>;

export async function generateLessonContent(input: GenerateLessonContentInput): Promise<GenerateLessonContentOutput> {
  return generateLessonContentFlow(input);
}

const moduleInstructions = {
    summary: `- summary: Generate a summary of the topic as an array of objects. Each object must have a "title" (a short, concise heading for a summary point) and a "content" (a detailed explanation for that point. The content should be broken down into several short, easy-to-understand sentences, formatted as a list of <li> items). Generate 3-5 summary points.`,
    learningObjectives: `- learningObjectives: Generate a list of what the student will learn, phrased from their perspective. For example: "Atomun yapısını açıklayabileceksiniz.". This should be an array of strings.`,
    keyTakeaways: `- keyTakeaways: Generate a list of key takeaways about what the student has learned, phrased in the past tense from a student's perspective. For example: "Atomun yapısını öğrendim." or "Fotosentezin önemini kavradık.". This should be an array of strings.`,
    conceptExplanations: `- conceptExplanations: Generate detailed explanations for 3-5 key concepts. This should be an array of objects, where each object has a "concept" (the single term or phrase) and a "definition" (the detailed explanation for that concept).`,
    keyConcepts: `- keyConcepts: Generate a list of the most important concepts related to the topic. This should be an array of strings.`,
    flashcards: `- flashcards: Generate terms and their definitions. This should be an array of objects, each with a "term" and a "definition".`,
    multipleChoiceQuestions: `- multipleChoiceQuestions: Generate a set of questions. Each question must have 4 options. One of the options MUST be the correct answer. IMPORTANT: The position of the correct answer within the options array should be randomized for each question. Do not always place the correct answer at the same position (e.g., always first). This should be an array of objects.`,
    trueFalseQuestions: `- trueFalseQuestions: Generate a set of true/false statements. This should be an array of objects.`,
    fillInTheBlankQuestions: `- fillInTheBlankQuestions: Generate a set of sentences with a blank part ('___'), each with 4 options and one correct answer. This should be an array of objects.`,
    anagramQuestions: `- anagramQuestions: Generate anagrams. For each, provide a 'definition' for the word, the 'scrambledWord', and the 'correctAnswer' (the unscrambled word). Example: { "definition": "Türkiye'nin başkenti", "scrambledWord": "karnaa", "correctAnswer": "Ankara" }`,
    sentenceScrambleQuestions: `- sentenceScrambleQuestions: Generate scrambled sentences. For each, provide the 'scrambledSentence' and the 'correctSentence'. This should be an array of objects.`,
    infographicIdeas: `- infographicIdeas: Generate ideas for an infographic that summarizes the topic. This should be an array of strings.`,
    videos: `- videos: Generate ideas for relevant video topics or search terms. This should be an array of strings.`,
    documents: `- documents: Generate links to supporting documents or articles. This should be an array of strings.`,
};


const generateLessonContentFlow = ai.defineFlow(
  {
    name: 'generateLessonContentFlow',
    inputSchema: GenerateLessonContentInputSchema,
    outputSchema: GenerateLessonContentOutputSchema,
  },
  async (input) => {
    
    let output: GenerateLessonContentOutput = {};
    
    const requestedInstructions = Object.entries(input.modules)
      .filter(([, value]) => value)
      .filter(([key]) => key in moduleInstructions && key !== 'visuals') // Exclude visuals from text prompt
      .map(([key]) => moduleInstructions[key as keyof typeof moduleInstructions])
      .join('\n');

    if (requestedInstructions) {
        const prompt = `You are an expert Turkish educational content creator.
Your task is to generate a valid JSON object based on the provided topic summary and the requested modules.
All generated content MUST be in Turkish.
The JSON object you generate MUST ONLY contain keys for the modules listed in the "REQUESTED MODULES" section.

TOPIC SUMMARY:
${input.topicSummary}

---

REQUESTED MODULES AND THEIR FORMATS:
${requestedInstructions}
`;
        
        const { output: textOutput } = await ai.generate({
            model: googleAI.model('gemini-2.5-flash'),
            prompt: prompt,
            output: {
                schema: GenerateLessonContentOutputSchema,
            }
        });
        
        if (textOutput) {
            output = textOutput;
        }
    }
    
    if (input.modules.visuals) {
      try {
        const { media } = await ai.generate({
            model: googleAI.model('imagen-4.0-fast-generate-001'),
            prompt: `Generate an educational and visually appealing image or diagram that illustrates the concept of '${input.topicSummary}'. The style should be simple, clean, and suitable for a classroom setting. Avoid text unless it is essential for the diagram.`,
        });
        if (media?.url) {
            output.generatedImageDataUri = media.url;
        }
      } catch (err) {
          console.error("Image generation failed but the flow will continue:", err);
          // Don't throw an error, just log it. The flow can continue with text content.
      }
    }
        
    if (Object.keys(output).length > 0) {
      const generatedModules: string[] = [];
      
      for (const key in input.modules) {
        if (Object.prototype.hasOwnProperty.call(input.modules, key)) {
          const moduleKey = key as keyof typeof input.modules;
          if (input.modules[moduleKey] && output[moduleKey] && (Array.isArray(output[moduleKey]) ? (output[moduleKey] as any[]).length > 0 : true)) {
            generatedModules.push(key);
          }
        }
      }

      // Special check for generatedImageDataUri because it's not directly in input.modules
      if (output.generatedImageDataUri && !generatedModules.includes('visuals')) {
          generatedModules.push('visuals');
      }
      
      if(generatedModules.length > 0) {
        output.progress = `Generated content for: ${generatedModules.map(m => m.replace(/([A-Z])/g, ' $1').trim()).join(', ')}.`;
      }
    }
    
    return output;
  }
);
