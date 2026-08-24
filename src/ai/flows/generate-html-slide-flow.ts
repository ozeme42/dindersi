'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import { resolveActiveGeminiConfig } from '@/ai/ai-config-service';
import { runGeminiWithFallback } from '@/ai/gemini-fallback-runner';

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

  const prompt = `Sen ödüllü bir eğitim teknolojisi, infografik tasarımcısı ve akıllı tahta UI/UX uzmanısın.
Görevin: Verilen konu için akıllı tahtada öğrencilerin dikkatini anında çekecek, **CANLI, HAREKETLİ, ANİMASYONLU, İNFOGRAFİK VE GÖRSEL OLARAK ÇOK ZENGİN TEK BİR HTML SLAYTI** üretmektir.

KONU / METİN:
"${input.topicSummary}"

---

### ZENGİN İNFOGRAFİK VE ANİMASYON TASARIM REHBERİ:
1. **Hareketli & Animasyonlu Başlık:**
   - \`bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 via-indigo-300 to-fuchsia-400\` ile parlayan gradyan başlık.
   - Üstte \`animate-pulse\` ile yanıp sönen veya \`animate-bounce\` ile hareket eden rozetler (Badge).
2. **Görsel İnfografik Kartları & Akış Diyagramı (Süreç / Karşılaştırma):**
   - Konunun aşamalarını veya kısımlarını gösteren **Adım Adım İnfografik Akış** (Örn: 1. Adım ➔ 2. Adım ➔ 3. Adım).
   - Her kart için canlı neon renkler (Cyan, Emerald, Amber, Violet, Rose, Sky).
   - Kartlarda \`hover:scale-[1.03] transition-all duration-300 hover:shadow-[0_0_25px_rgba(99,102,241,0.35)]\` ile etkileşim efektleri.
   - İlgili tematik emojiler (🕌, 🤲, 📖, 🔑, ✨, 💡, 🛡️, ⏳, 🎯) ve renkli ikon kutucukları.
3. **İlgi Çekici İpuçları & İnteraktif Vurgu Alanları:**
   - "💡 Kritik Hap Bilgi" veya "🎯 Sınav Tüyosu" gibi renkli parlayan paneller.
   - 2'li veya 3'lü karşılaştırma kutuları (Örn: Farz vs Vacip vs Nafile).
4. **Pedagojik Dil:**
   - Ortaokul öğrencileri için kısa, net, anlaşılır ve görsel odaklı metinler.

### KESİN KURALLAR:
- SADECE \`<div class="...">...</div>\` şeklinde saf HTML içeriği döndür.
- Kesinlikle \`<!DOCTYPE html>\`, \`<html>\`, \`<head>\`, \`<body>\` veya \`<script>\` ETİKETİ EKLEME (Bunlar otomatik inject edilir).
- Yanıtın başında veya sonunda \`\`\`html veya açıklama metni olmasın, doğrudan ilk \`<div\` ile başlasın.
- Tüm Tailwind sınıfları tam ve doğru olsun.
`;

  const rawText = await runGeminiWithFallback({
    apiKey: activeKey,
    primaryModel: selectedModel,
    prompt,
  });

  let text = rawText.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

  return { htmlContent: text };
}
