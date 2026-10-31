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

  const prompt = `Sen Milli Eğitim Bakanlığı (MEB) Din Kültürü ve Ahlak Bilgisi müfredatında uzman başyazar ve kıdemli eğitim içeriği tasarımcısısın.
GÖREVİN: Aşağıda verilen ders özeti içeriğinden, öğrencilerin bayılacağı "NOKTALI DEFTER TEMALI, RENKLİ ÇERÇEVELİ, FOSFORLU ŞERİTLİ DERS NOTU" (Single-file HTML) hazırlamaktır.

KONU ÖZETİ BİLGİSİ:
"${input.topicSummary}"

GÖRSEL TASARIM & YAPI (NOKTALI DEFTER, RENKLİ ÇERÇEVELER, FOSFORLU ŞERİTLER, KAVRAM ETİKETLERİ):
1. Google Fonts: 'Caveat:wght@600;700', 'Patrick Hand', 'Neucha'
2. .toolbar: "🖨️ Yazdır / PDF Olarak Kaydet" butonu
3. .notebook-sheet (id="summaryCard"): Noktalı zemin üzerinde beyaz defter yaprağı
4. .header:
   - .badge-grade: "★ Ders Notu" (sarı fosforlu, eğik rozet)
   - .title-banner: "Konu Başlığı" ('Caveat' fontlu mavi çerçeveli başlık)
   - .subtitle-banner: "✨ Önemli Kavramlar, İlkeler & Ders Notu" (pembe fosforlu şerit)
   - .quote-box: <strong>🌙 Ayet/Hadis:</strong> "İlgili meâl / veciz ifade"
5. Kutu 1 (.box.box-yellow - Sarı Renkli Çerçeve): "⭐ KAVRAMLAR KUTUSU <span class='tag-exam'>Sınavda Kesin Çıkar! 🎯</span>"
   - .concepts-grid içinde 4-6 .concept-item (.concept-badge badge-c-yellow/green/cyan/pink/purple/orange ve <span class='highlight'>fosforlu sarı</span> vurgulu tanım)
6. İki Sütunlu Bölüm (.columns-2):
   - Sol (.box.box-pink - Pembe Çerçeve): "🌸 KONUNUN ÖZÜ VE İLKELERİ" (renkli numara dairesi .bullet-num.bullet-num-pink ile maddeler)
   - Sağ (.box.box-cyan - Mavi Çerçeve): "📖 HİKMETLER VE ÇIKARILACAK DERSLER" (renkli numara dairesi .bullet-num ile maddeler)
7. Kutu 3 (.box.box-orange - Turuncu Çerçeve): "⏳ AŞAMALAR VE TARİH ŞERİDİ" (.timeline içinde .timeline-node, .t-year, .t-dot, .t-desc)
8. .footer: "📱 <strong>Ders Notu İnfografiği (Noktalı Defter Teması)</strong> | MEB Müfredatına Tam Uyumlu"

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
