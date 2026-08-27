
'use server';

/**
 * @fileOverview An AI flow for generating summary notes with fallback runner and active model resolution.
 */
import { z } from 'zod';
import { resolveActiveGeminiConfig } from '@/ai/ai-config-service';
import { runGeminiWithFallback } from '@/ai/gemini-fallback-runner';

const SummaryInputSchema = z.object({
  sourceText: z.string().min(20, "Özet oluşturmak için en az 20 karakterlik bir metin gereklidir."),
  apiKey: z.string().optional(),
  modelName: z.string().optional(),
});

const SummaryOutputSchema = z.object({
  notes: z.array(z.string()).describe("A list of 5-10 important summary notes from the text, easy for students to write down."),
});

export type YazilacaklarOutput = z.infer<typeof SummaryOutputSchema> & {
    conceptDefinitions: { concept: string; definition: string; }[];
};

export async function generateTopicSummary(input: z.infer<typeof SummaryInputSchema>): Promise<z.infer<typeof SummaryOutputSchema>> {
  const { apiKey: activeKey, modelName: selectedModel } = await resolveActiveGeminiConfig({
    apiKey: input.apiKey,
    modelName: input.modelName,
  });

  if (!activeKey) {
    throw new Error('Gemini API anahtarı bulunamadı. Lütfen AI ayarlarından Google AI Studio API anahtarınızı kaydedin.');
  }

  const prompt = `Aşağıdaki metni analiz et ve özet notlar çıkar. Tüm çıktılar Türkçe olmalıdır.

Metin:
"""
${input.sourceText}
"""

İstenen Çıktı Formatı:
- **Önemli Notlar:** Metnin ana fikirlerini, öğrencilerin defterlerine yazabileceği şekilde, kısa ve anlaşılır 5 ila 10 madde halinde özetle.
Lütfen SADECE geçerli bir JSON nesnesi döndür:
{
  "notes": [
    "1. Özet not maddesi...",
    "2. Özet not maddesi..."
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
    const output = JSON.parse(cleaned);
    return {
      notes: Array.isArray(output.notes) ? output.notes : [],
    };
  } catch (err: any) {
    console.error("JSON parse error in generateTopicSummary:", text);
    throw new Error("Yapay zeka özet yanıtı JSON formatında okunamadı: " + err.message);
  }
}
