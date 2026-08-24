'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';

const ConceptMapNodeSchema = z.object({
  id: z.string().describe('A unique identifier for the node (e.g., "concept_1").'),
  label: z.string().describe('The text label for the concept node.'),
  isCentral: z.boolean().optional().describe('Set to true if this is the main, central topic of the map.'),
});

const ConceptMapEdgeSchema = z.object({
  from: z.string().describe('The ID of the starting node.'),
  to: z.string().describe('The ID of the ending node.'),
  label: z.string().optional().describe('An optional label describing the relationship.'),
});

export type ConceptMapData = {
  nodes: { id: string; label: string; isCentral?: boolean }[];
  edges: { from: string; to: string; label?: string }[];
};

const GenerateConceptMapInputSchema = z.object({
  topicSummary: z.string().describe('A summary of the topic to be mapped.'),
  apiKey: z.string().optional(),
  modelName: z.string().optional(),
});
export type GenerateConceptMapInput = z.infer<typeof GenerateConceptMapInputSchema>;

import { resolveActiveGeminiConfig } from '@/ai/ai-config-service';
import { runGeminiWithFallback } from '@/ai/gemini-fallback-runner';

export async function generateConceptMap(input: GenerateConceptMapInput): Promise<ConceptMapData> {
  const { apiKey: activeKey, modelName: selectedModel } = await resolveActiveGeminiConfig({
    apiKey: input.apiKey,
    modelName: input.modelName,
  });

  if (!activeKey) {
    throw new Error('Gemini API anahtarı bulunamadı.');
  }

  const prompt = `Sen kavram haritası ve bilgi grafiği uzmanısın.
Aşağıdaki metni analiz ederek Türkçe bir kavram haritası (5-10 düğüm ve aralarındaki ilişkiler) üret.
SADECE geçerli bir JSON nesnesi üret:
{
  "nodes": [
    { "id": "1", "label": "Merkez Kavram", "isCentral": true },
    { "id": "2", "label": "Alt Kavram", "isCentral": false }
  ],
  "edges": [
    { "from": "1", "to": "2", "label": "içerir" }
  ]
}

Metin:
"${input.topicSummary}"
`;

  const text = await runGeminiWithFallback({
    apiKey: activeKey,
    primaryModel: selectedModel,
    prompt,
    generationConfig: {
      responseMimeType: 'application/json',
    },
  });

  const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
  return JSON.parse(cleaned);
}
