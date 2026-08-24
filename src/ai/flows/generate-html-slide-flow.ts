'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';

const GenerateHtmlSlideInputSchema = z.object({
  topicSummary: z.string().describe('A summary of the topic for which to generate an HTML slide.'),
  apiKey: z.string().optional(),
  modelName: z.string().optional(),
});
export type GenerateHtmlSlideInput = z.infer<typeof GenerateHtmlSlideInputSchema>;

export type GenerateHtmlSlideOutput = {
  htmlContent: string;
};

import { resolveActiveGeminiConfig } from '@/ai/ai-config-service';

export async function generateHtmlSlide(input: GenerateHtmlSlideInput): Promise<GenerateHtmlSlideOutput> {
  const { apiKey: activeKey, modelName: selectedModel } = await resolveActiveGeminiConfig({
    apiKey: input.apiKey,
    modelName: input.modelName,
  });

  if (!activeKey) {
    throw new Error('Gemini API anahtarı bulunamadı.');
  }

  const prompt = `Sen uzman bir eğitim tasarımcısı ve web geliştiricisisin. Türkçe etkileşimli bir slayt bloğu oluşturacaksın.
Aşağıdaki konu özetine göre zengin, modern ve Tailwind CSS ile stillendirilmiş tek bir HTML içerik bloğu üret.

Kurallar:
1. Yanıtın SADECE saf HTML kodu olsun. <html>, <head>, <body> etiketleri EKLEME.
2. Tüm içerik Türkçe olmalıdır.
3. Başlıklar (<h1>, <h2>), listeler (<ul>, <li>), açıklamalar, kartlar ve Tailwind CSS sınıflarını (p-6, rounded-2xl, bg-slate-900, text-white, grid, gap-4 vb.) kullan.

Konu Özeti:
"${input.topicSummary}"
`;

  const genAI = new GoogleGenerativeAI(activeKey);
  const model = genAI.getGenerativeModel({ model: selectedModel });
  const result = await model.generateContent(prompt);
  let text = result.response.text();
  text = text.replace(/^```html\s*/i, '').replace(/```\s*$/i, '').trim();

  return { htmlContent: text };
}
