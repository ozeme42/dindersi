
'use server';
/**
 * @fileOverview AI-assisted activity data generation tool.
 */
import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

const AiActivityDataInputSchema = z.object({
  topicTitle: z.string().describe('The title of the topic to generate data for.'),
  contextText: z.string().optional().describe('Optional context text to use as the primary source for generation.'),
  generateConcepts: z.boolean().describe('Generate a list of key concepts?'),
  generateDefinitions: z.boolean().describe('Generate concept-definition pairs?'),
  generateSentences: z.boolean().describe('Generate summary sentences?'),
});
export type AiActivityDataInput = z.infer<typeof AiActivityDataInputSchema>;

const AiActivityDataOutputSchema = z.object({
  concepts: z.array(z.string()).optional().describe('A list of key concepts related to the topic.'),
  conceptDefinitions: z.array(z.object({concept: z.string(), definition: z.string()})).optional().describe('A list of concept and definition pairs.'),
  summarySentences: z.array(z.string()).optional().describe('A list of sentences that summarize the topic.'),
});
export type AiActivityDataOutput = z.infer<typeof AiActivityDataOutputSchema>;

export async function generateActivityData(input: AiActivityDataInput): Promise<AiActivityDataOutput> {
  return generateActivityDataFlow(input);
}

const promptTemplate = `You are a helpful assistant for a Turkish teacher.
Your task is to generate educational materials based on the provided information.
All content must be in Turkish.

{{#if contextText}}
Use the following text as the primary source for generation:
"""
{{{contextText}}}
"""
{{else}}
Generate content based on the following topic title: {{{topicTitle}}}
{{/if}}

Based on the provided information, generate the requested items.

{{{instructions}}}

Please provide the output as a single, valid JSON object, containing ONLY the keys for the requested fields.
`;

const generateActivityDataFlow = ai.defineFlow(
  {
    name: 'generateActivityDataFlow',
    inputSchema: AiActivityDataInputSchema,
    outputSchema: AiActivityDataOutputSchema,
  },
  async (input) => {
    
    const instructions: string[] = [];

    // If concepts or definitions (or both) are requested, we will always ask for definitions
    // and then derive concepts from them to ensure synchronization.
    if (input.generateConcepts || input.generateDefinitions) {
      instructions.push(
        `- **Definitions as Questions**: Generate 5-10 definitions that can be used as 'What am I?' style questions. For each, provide the 'definition' (the clue/question) and the 'concept' (the single-word answer). The definition must not contain the concept word itself. Provide this as a 'conceptDefinitions' array of {concept, definition} objects.`
      );
    }

    if (input.generateSentences) {
      instructions.push(`- **Summary Sentences**: Generate 5-10 sentences that summarize key aspects of the topic (konuyu özetleyen cümleler). It is MANDATORY that each sentence has a maximum of 6 words. Do not generate sentences longer than 6 words.`);
    }

    const prompt = promptTemplate
      .replace('{{{topicTitle}}}', input.topicTitle)
      .replace('{{{contextText}}}', input.contextText || '')
      .replace('{{{instructions}}}', instructions.join('\n\n'));
    
    const {output} = await ai.generate({
        prompt: prompt,
        model: googleAI.model('gemini-pro'),
        output: {
            schema: AiActivityDataOutputSchema
        }
    });

    if (!output) {
      return {};
    }

    // Post-processing to ensure sync
    const finalOutput: AiActivityDataOutput = {};
    
    if (output.conceptDefinitions && output.conceptDefinitions.length > 0) {
      // If user requested definitions, add them.
      if (input.generateDefinitions) {
        finalOutput.conceptDefinitions = output.conceptDefinitions;
      }
      // If user requested concepts, derive them from the definitions that were just generated.
      if (input.generateConcepts) {
        finalOutput.concepts = output.conceptDefinitions.map(cd => cd.concept);
      }
    }
    
    if (output.summarySentences) {
      finalOutput.summarySentences = output.summarySentences;
    }
    
    return finalOutput;
  }
);
