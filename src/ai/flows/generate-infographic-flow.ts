'use server';

/**
 * @fileOverview AI-assisted infographic HTML page generation with fallback runner and active model resolution.
 */
import { z } from 'zod';
import { resolveActiveGeminiConfig } from '@/ai/ai-config-service';
import { runGeminiWithFallback } from '@/ai/gemini-fallback-runner';
import { NOTEBOOK_SHEET_CSS, formatNotebookSheetHtml } from '@/lib/notebook-sheet-template';

const GenerateInfographicInputSchema = z.object({
  topicSummary: z.string().describe('A summary of the topic to generate an infographic for.'),
  apiKey: z.string().optional(),
  modelName: z.string().optional(),
});
export type GenerateInfographicInput = z.infer<typeof GenerateInfographicInputSchema>;

export type GenerateInfographicOutput = {
  htmlContent: string;
};

export async function generateInfographic(input: GenerateInfographicInput): Promise<GenerateInfographicOutput> {
  const { apiKey: activeKey, modelName: selectedModel } = await resolveActiveGeminiConfig({
    apiKey: input.apiKey,
    modelName: input.modelName,
  });

  if (!activeKey) {
    throw new Error('Gemini API anahtarı bulunamadı. Lütfen AI ayarlarından Google AI Studio API anahtarınızı kaydedin.');
  }

  const prompt = `Sen Milli Eğitim Bakanlığı (MEB) Din Kültürü ve Ahlak Bilgisi müfredatında uzman başyazar ve eğitim infografiği tasarımcısısın.
GÖREVİN: Aşağıda verilen ders özeti içeriğinden, tek bakışta konuyu kavratan "DEFTER SAYFASI / AÇIK TEMA DERS NOTU" (Single-file HTML) hazırlamaktır.

KONU ÖZETİ BİLGİSİ:
"${input.topicSummary}"

GÖRSEL TASARIM & YAPI:
1. Google Fonts: 'Caveat', 'Patrick Hand', 'Neucha'
2. .toolbar: Yazdır / PDF kaydet butonu
3. .notebook-sheet: Beyaz defter yaprağı kartı (id="summaryCard")
4. .header:
   - .badge-grade: ★ Ders Notu
   - .title-area:
     - .title-banner: Konu Başlığı
     - .subtitle-banner: ✨ Konuyla ilgili slogan
   - .quote-box: <strong>🌙 Ayet/Hadis:</strong> "İlgili meâl / söz"
5. .box.box-yellow:
   - .box-title: ⭐ KAVRAMLAR KUTUSU <span class="tag-exam">Sınavda Kesin Çıkar! 🎯</span>
   - .concepts-grid: 4 ila 6 temel kavram ve tanımı
6. .columns-2:
   - Sol Sütun: .box.box-pink (3-4 maddelik temel ilkeler, .bullet-num-pink ile)
   - Sağ Sütun: .box.box-cyan (3-4 maddelik pratik ve hikmet boyutları, .bullet-num ile)
7. .box.box-orange:
   - .box-title: ⏳ Önemli Aşamalar / Kronoloji
   - .timeline: 5 ila 7 adet .timeline-node (.t-year, .t-dot, .t-desc)
8. .footer:
   - MEB uyumluluk notu ve hikmetli söz

Çıktı SADECE geçerli HTML kodu olmalı, açıklama veya markdown backtick olmamalıdır.
`;

  const text = await runGeminiWithFallback({
    apiKey: activeKey,
    primaryModel: selectedModel,
    prompt,
  });

  const htmlContent = formatNotebookSheetHtml(text, {
    title: 'Ders Notu İnfografiği'
  });

  return { htmlContent };
}
