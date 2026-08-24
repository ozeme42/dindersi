'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import { resolveActiveGeminiConfig } from '@/ai/ai-config-service';

const GenerateHtmlSlideInputSchema = z.object({
  topicSummary: z.string().describe('A summary or title of the topic for which to generate an HTML slide.'),
  slideTheme: z.enum(['modern-dark', 'vibrant-cards', 'infographic-split', 'minimal-elegant']).optional(),
  apiKey: z.string().optional(),
  modelName: z.string().optional(),
});
export type GenerateHtmlSlideInput = z.infer<typeof GenerateHtmlSlideInputSchema>;

export type GenerateHtmlSlideOutput = {
  htmlContent: string;
};

export async function generateHtmlSlide(input: GenerateHtmlSlideInput): Promise<GenerateHtmlSlideOutput> {
  const { apiKey: activeKey, modelName: selectedModel } = await resolveActiveGeminiConfig({
    apiKey: input.apiKey,
    modelName: input.modelName,
  });

  if (!activeKey) {
    throw new Error('Gemini API anahtarı bulunamadı. Lütfen AI ayarlarından API anahtarınızı kaydedin.');
  }

  const prompt = `Sen dünya çapında ödüllü bir eğitim teknolojisi ve sunum tasarımcısısın (Gamma.app, NotebookLM ve Apple Keynote kalitesinde tasarımlar yapıyorsun).
Görevin: Verilen konu için akıllı tahtada ve mobilde büyüleyici görünen, **zengin, interaktif ve modern Tailwind CSS sınıflarıyla stillendirilmiş tek bir HTML slayt bileşeni** üretmektir.

KONU / METİN:
"${input.topicSummary}"

---

### TASARIM VE İÇERİK REHBERİ:
1. **Yapı:**
   - En üstte şık bir Konu Rozeti (Badge), büyük çarpıcı bir Başlık (h1/h2) ve 1-2 cümlelik ilham verici ana fikir.
   - Ortada **2 veya 3 sütunlu Grid (grid grid-cols-1 md:grid-cols-3 gap-4)** içinde tematik bilgi kartları.
   - Her kartta: Renkli bir ikon/emoji, belirgin bir alt başlık, 2-3 maddelik temiz açıklamalar veya hap bilgiler.
   - En altta veya kenarda "💡 Önemli Çıkarım" veya "📌 Hatırla" kutusu (Vurgu kutusu).
2. **Görsel Stil (Modern Dark / Glassmorphism):**
   - Arka planlar: \`bg-slate-900/90\`, \`bg-slate-950\`, \`border border-white/10\`, \`backdrop-blur-xl\`, \`rounded-3xl\`.
   - Kart stilleri: \`bg-gradient-to-br from-indigo-950/50 to-slate-900\`, \`border-indigo-500/30\`, \`hover:border-indigo-400\`, \`shadow-xl\`.
   - Tipografi: \`text-white\`, \`font-black\`, \`text-slate-300\`, \`tracking-tight\`, \`leading-relaxed\`.
   - Vurgu renkleri: Indigo, Cyan, Emerald, Amber, Rose ve Violet gradyanları.
3. **KESİN KURALLAR:**
   - SADECE \`<div className="...">...</div>\` şeklinde saf HTML içeriği döndür.
   - Kesinlikle \`<!DOCTYPE html>\`, \`<html>\`, \`<head>\`, \`<body>\` veya \`<script>\` ETİKETİ EKLEME.
   - Yanıtın başında veya sonunda \`\`\`html veya açıklama metni olmasın, doğrudan ilk \`<div\` ile başlasın.
   - Tüm metinler pedagojik olarak doğru, zengin ve kusursuz Türkçe olmalıdır.
`;

  const genAI = new GoogleGenerativeAI(activeKey);
  const model = genAI.getGenerativeModel({ model: selectedModel });
  const result = await model.generateContent(prompt);
  let text = result.response.text();
  text = text.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

  return { htmlContent: text };
}
