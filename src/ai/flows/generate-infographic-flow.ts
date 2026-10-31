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

  const prompt = `Sen Milli Eğitim Bakanlığı (MEB) Din Kültürü ve Ahlak Bilgisi müfredatında uzman başyazar ve kıdemli eğitim fasikülü tasarımcısısın.
GÖREVİN: Aşağıda verilen ders özeti içeriğinden, tek bakışta konuyu kavratan "TÜRKİYE YÜZYILI MAARİF MODELİ - DİNDERSİ ATÖLYESİ ÖZET FASİKÜLÜ" (Single-file HTML) hazırlamaktır.

KONU ÖZETİ BİLGİSİ:
"${input.topicSummary}"

GÖRSEL TASARIM & YAPI (ÇOK ŞIK VE YAYINEVİ KALİTESİNDE):
1. Google Fonts: 'Plus Jakarta Sans:wght@400;500;600;700;800;900'
2. .toolbar: Yazdır / PDF kaydet butonu
3. .fasikul-page: A4 fasikül sayfası
4. .fasikul-header:
   - .top-meta: "TÜRKİYE YÜZYILI MAARİF MODELİ"
   - .brand-pill: "DİNDERSİ ATÖLYESİ" + .brand-sub: "> KONU ÖZET FASİKÜLÜ <"
   - .badge-grade: "★ Ders Notu ★"
   - .unit-banner: "Konu Başlığı"
   - .quote-box: <strong>🌙 Ayet/Hadis:</strong> "İlgili meâl / veciz ifade"
5. Kutu 1 (.card-box.card-pink): "★ KAVRAMLAR KUTUSU <span class='tag-highlight tag-red'>(Sınavda Çıkar!)</span>" (4-6 .concept-row, .c-tag ve .hl-yellow vurgulu)
6. Kutu 2 (.grid-2): İki Sütunlu Kartlar (.card-orange & .card-blue) ile temel ilkeler ve pratik kazanımlar
7. Kutu 3 (.card-box.card-green): "★ ADIM ADIM SÜREÇ / ÖNEMLİ AŞAMALAR" (.steps-grid veya .fasikul-table)
8. Kutu 4 (.card-box.card-yellow veya .card-purple): Görsel Şema / Bubble harita
9. .fasikul-footer: "▶ <strong>DİNDERSİ ATÖLYESİ</strong> | Özet Fasikülü     Tam Özet"

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
