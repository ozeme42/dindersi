
'use server';
/**
 * @fileOverview An AI flow for generating a two-column summary (concepts and notes) from a given text.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { googleAI } from '@genkit-ai/googleai';

const SummaryInputSchema = z.object({
  sourceText: z.string().min(20, "Özet oluşturmak için en az 20 karakterlik bir metin gereklidir."),
});

const SummaryOutputSchema = z.object({
  notes: z.array(z.string()).describe("A list of 5-10 important summary notes from the text, easy for students to write down."),
});

export type YazilacaklarOutput = z.infer<typeof SummaryOutputSchema> & {
    conceptDefinitions: { concept: string; definition: string; }[];
};

export async function generateTopicSummary(input: z.infer<typeof SummaryInputSchema>): Promise<z.infer<typeof SummaryOutputSchema>> {
  return generateTopicSummaryFlow(input);
}

const generateTopicSummaryFlow = ai.defineFlow(
  {
    name: 'generateTopicSummaryFlow',
    inputSchema: SummaryInputSchema,
    outputSchema: SummaryOutputSchema,
  },
  async (input) => {
    
    const prompt = `Aşağıdaki metni analiz et ve özet notlar çıkar. Tüm çıktılar Türkçe olmalıdır.

Metin:
"""
${input.sourceText}
"""

İstenen Çıktı Formatı:
- **Önemli Notlar:** Metnin ana fikirlerini, öğrencilerin defterlerine yazabileceği şekilde, kısa ve anlaşılır 5 ila 10 madde halinde özetle. Bu listeyi "notes" anahtarı altında bir dizi olarak döndür.
`;

    const { output } = await ai.generate({
      model: googleAI.model('gemini-1.5-flash'),
      prompt: prompt,
      output: {
        schema: SummaryOutputSchema,
      }
    });

    if (!output) {
      throw new Error("AI modeli bir çıktı üretemedi.");
    }
    
    // Ensure the array is always present, even if empty
    return {
        notes: output.notes || [],
    };
  }
);
