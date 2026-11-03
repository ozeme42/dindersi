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
GÖREVİN: Aşağıda verilen ders metninden, öğrencilerin bayılacağı ve hiçbir konuyu atlamayan KAPSAMLI, ZENGİN "NOKTALI DEFTER TEMALI, RENKLİ ÇERÇEVELİ, FOSFORLU ŞERİTLİ DERS NOTU" (Single-file HTML) hazırlamaktır.

KONU ÖZETİ BİLGİSİ / KAYNAK METİN:
"${input.topicSummary}"

GÖRSEL TASARIM & YAPI (HİÇBİR KONUYU VE KAVRAMI ATLAMA):
1. Google Fonts: 'Caveat:wght@600;700', 'Patrick Hand', 'Neucha'
2. .toolbar: "🖨️ Yazdır / PDF Olarak Kaydet" butonu
3. .notebook-sheet (id="summaryCard"): Sağa sola tam yaslı, geniş, ferah beyaz defter yaprağı
4. .sheet-brand-bar: En üstte marka şeridi (<div class="sheet-brand-bar"><div class="brand-pill"><span>🕌</span> <strong>DinDersi Atölyesi</strong></div><div class="brand-motto">MEB Müfredatına Tam Uyumlu Özgün Ders Notu</div></div>)
5. .header (Sayfa merkezinde tam ortalanmış ve dengeli 3'lü grid):
   - .badge-grade: "★ Ders Notu" (kompakt sarı fosforlu rozet, sol tarafta)
   - .title-area (Sayfanın tam merkezinde simetrik):
     - .title-banner: "Konu Başlığı" ('Caveat' fontlu mavi çerçeveli tam ortalı başlık)
     - .subtitle-banner: "✨ Detaylı Konu Özeti, Tüm Kavramlar ve Sınav İpuçları" (pembe fosforlu şerit)
   - .quote-box: <strong>🌙 Ayet/Hadis:</strong> "İlgili meâl / veciz ifade" (sağ tarafta dengeli)
6. Kutu 1 (.box.box-yellow - Sarı Renkli Çerçeve): "⭐ KAVRAMLAR KUTUSU <span class='tag-exam'>Sınavda Kesin Çıkar! 🎯</span>"
   - Kaynak metindeki TÜM kilit kavramları eksiksiz listele (asla birkaç kavramla sınırlama). .concepts-grid içinde her kavram için .concept-item veya .concept-card (.concept-badge badge-c-yellow/green/cyan/pink/purple/orange ve <mark>fosforlu sarı</mark> vurgulu net tanım).
7. Konu Detay Bölümleri:
   - Metindeki TÜM ana ve alt başlıkları ayrı renkli çerçeveler (.box.box-cyan, .box.box-pink, .box.box-purple, .box.box-orange vb.) veya .columns-2 içinde ele al.
   - Her konu başlığı altında 6 ila 12 detaylı madde (.list-item içinde .bullet-num ve <strong>Alt Başlık:</strong> Detaylı anlatım) oluştur.
   - Olayları, kıssaları, kişileri ve tarihleri asla atlama.
8. Kutu 3 (.box.box-green - Yeşil Çerçeve): "⚡ EN ÇOK KARIŞTIRILANLAR & SINAV TUZAKLARI ⚠️" (.traps-grid içinde .trap-card)
9. .footer: "🕌 <strong>DinDersi Atölyesi</strong> | MEB Müfredatına Tam Uyumlu Özgün Ders Notu"

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
