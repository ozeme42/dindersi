
'use server';
/**
 * @fileOverview AI-assisted concept map generation tool.
 *
 * This flow analyzes a given text summary and generates a structured concept map,
 * consisting of nodes (concepts) and edges (relationships).
 */
import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

const ConceptMapNodeSchema = z.object({
  id: z.string().describe('A unique identifier for the node (e.g., "concept_1").'),
  label: z.string().describe('The text label for the concept node.'),
  isCentral: z.boolean().optional().describe('Set to true if this is the main, central topic of the map. Only one node should be central.'),
});

const ConceptMapEdgeSchema = z.object({
  from: z.string().describe('The ID of the starting node.'),
  to: z.string().describe('The ID of the ending node.'),
  label: z.string().optional().describe('An optional label describing the relationship (e.g., "is a type of", "leads to").'),
});

const ConceptMapOutputSchema = z.object({
  nodes: z.array(ConceptMapNodeSchema).describe('A list of all concept nodes in the map, typically 5-10 nodes.'),
  edges: z.array(ConceptMapEdgeSchema).describe('A list of all edges connecting the nodes.'),
});
export type ConceptMapData = z.infer<typeof ConceptMapOutputSchema>;

const GenerateConceptMapInputSchema = z.object({
  topicSummary: z.string().describe('A summary of the topic to be mapped.'),
});
export type GenerateConceptMapInput = z.infer<typeof GenerateConceptMapInputSchema>;

export async function generateConceptMap(input: GenerateConceptMapInput): Promise<ConceptMapData> {
  return generateConceptMapFlow(input);
}

const generateConceptMapFlow = ai.defineFlow(
  {
    name: 'generateConceptMapFlow',
    inputSchema: GenerateConceptMapInputSchema,
    outputSchema: ConceptMapOutputSchema,
  },
  async (input) => {
    
    const prompt = `You are an expert in creating structured knowledge graphs in Turkish. Analyze the following text and identify the main concepts and their relationships. Generate a concept map with a central topic, related sub-concepts, and the connections between them.

All generated content MUST be in Turkish.

The map should contain between 5 and 10 nodes in total.

Instructions:
1. Identify the single most important, central concept from the text.
2. Identify 4 to 9 related key sub-concepts.
3. Determine the relationships (edges) between these concepts.
4. Format the output as a JSON object containing a "nodes" array and an "edges" array.
5. In the "nodes" array, ensure one and only one node is marked as the central topic by setting its "isCentral" property to true. All other nodes should not have this property or have it set to false.

Topic Summary:
"${input.topicSummary}"
`;

    const {output} = await ai.generate({
      model: googleAI.model('gemini-pro'),
      prompt: prompt,
      output: {
        schema: ConceptMapOutputSchema,
      }
    });
    return output!;
  }
);
