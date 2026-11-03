'use server';

/**
 * @fileOverview An AI flow for generating comprehensive topic summary notes and extracting key concepts.
 */
import { z } from 'zod';
import { resolveActiveGeminiConfig } from '@/ai/ai-config-service';
import { runGeminiWithFallback } from '@/ai/gemini-fallback-runner';

const SummaryInputSchema = z.object({
  sourceText: z.string().min(20, "Özet oluşturmak için en az 20 karakterlik bir metin gereklidir."),
  apiKey: z.string().optional(),
  modelName: z.string().optional(),
});

const SummarySectionSchema = z.object({
  title: z.string().describe("Metindeki her bir ana veya alt konu başlığı"),
  summaryPoints: z.array(z.string()).describe("Bu başlığın altındaki önemli olaylar, bilgiler ve pedagojik özet cümleleri"),
  keyTerms: z.array(z.string()).describe("Bu başlıkta geçen önemli kavramlar, şahıslar, mekanlar ve terimler")
});

const ConceptDefinitionSchema = z.object({
  concept: z.string().describe("Kavram, terim, tarihi kişi, yer veya kurum adı"),
  definition: z.string().describe("Ortaokul öğrencisine uygun, sade, net ve öğretici tanımı")
});

const SummaryOutputSchema = z.object({
  sections: z.array(SummarySectionSchema).optional().describe("Metindeki konu başlıklarının ayrı ayrı detaylı özetleri"),
  notes: z.array(z.string()).describe("Öğrencilerin defterine yazabileceği, konu başlıklarına göre gruplandırılmış zengin ve detaylı özet notları."),
  conceptDefinitions: z.array(ConceptDefinitionSchema).describe("Metinde geçen TÜM anahtar kavramlar ve açıklamaları (hiçbir kavram atlanmamalı).")
});

export type YazilacaklarOutput = z.infer<typeof SummaryOutputSchema>;

export async function generateTopicSummary(input: z.infer<typeof SummaryInputSchema>): Promise<z.infer<typeof SummaryOutputSchema>> {
  const { apiKey: activeKey, modelName: selectedModel } = await resolveActiveGeminiConfig({
    apiKey: input.apiKey,
    modelName: input.modelName,
  });

  if (!activeKey) {
    throw new Error('Gemini API anahtarı bulunamadı. Lütfen AI ayarlarından Google AI Studio API anahtarınızı kaydedin.');
  }

  const prompt = `Sen uzman bir Din Kültürü ve Ahlak Bilgisi öğretmenisin. Görevin, verilen ders/ünite metnini DETAYLI, EKSİKSİZ ve PEDAGOJİK olarak özetlemektir.

KAYNAK METİN:
"""
${input.sourceText}
"""

KRİTİK TALİMATLAR:
1. **ASLA ÇOK KISA ÖZETLEME VE HİÇBİR BAŞLIĞI ATLAMADAN İŞLE:** Metindeki TÜM ana başlıkları ve alt başlıkları tek tek tespit et. Bazı başlıkları alıp bazılarını es geçmek KESİNLİKLE YASAKTIR. Her konu başlığı ayrı ayrı, dengeli ve detaylı biçimde ele alınmalıdır.
2. **DETAYLI VE ZENGİN ÖZET NOTLARI ("notes"):** 
   - Notlar salt birkaç maddeden ibaret olmamalıdır; metindeki tüm tarihi olayları, kıssaları, örnekleri, isimleri ve ilkeleri kapsamalıdır.
   - Her konu başlığı için maddelerin başına "📌 [Konu Başlığı]: ..." formatında başlık etiketi koyarak yapılandır.
   - Önemli kilit kavramları ve tarihleri cümle içinde belirt.
3. **EKSİKSİZ KAVRAM LİSTESİ ("conceptDefinitions"):**
   - Metinde adı geçen, kavram kutularında yer alan veya metin akışında bulunan BÜTÜN anahtar kavramları, dini terimleri, tarihi şahsiyetleri, mekanları, anlaşmaları ve olayları ÇIKAR.
   - HİÇBİR KAVRAMI VE TERİMİ ATLAMADAN tanımla. Tanımlar ortaokul öğrencisinin kolayca anlayabileceği, net ve öğretici 1-2 cümlelik açıklamalar olmalıdır.
4. **BÖLÜM BAZLI YAPI ("sections"):**
   - Metindeki her konu başlığını ayrı bir nesne olarak "sections" dizisine ekle ("title", "summaryPoints", "keyTerms").

Lütfen SADECE geçerli bir JSON nesnesi döndür (başında ve sonunda markdown \`\`\`json olmasın):
{
  "sections": [
    {
      "title": "1. Konu Başlığı",
      "summaryPoints": [
        "Bu başlığa ait detaylı açıklayıcı madde 1...",
        "Bu başlığa ait detaylı açıklayıcı madde 2..."
      ],
      "keyTerms": ["Kavram 1", "Kavram 2"]
    }
  ],
  "notes": [
    "📌 [1. Konu Başlığı]: Detaylı özet cümlesi...",
    "📌 [1. Konu Başlığı]: Detaylı özet cümlesi...",
    "📌 [2. Konu Başlığı]: Detaylı özet cümlesi..."
  ],
  "conceptDefinitions": [
    { "concept": "Kavram Adı", "definition": "Kavramın ortaokul düzeyinde net ve anlaşılır tanımı." }
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
      sections: Array.isArray(output.sections) ? output.sections : [],
      notes: Array.isArray(output.notes) ? output.notes : [],
      conceptDefinitions: Array.isArray(output.conceptDefinitions) ? output.conceptDefinitions : [],
    };
  } catch (err: any) {
    console.error("JSON parse error in generateTopicSummary:", text);
    throw new Error("Yapay zeka özet yanıtı JSON formatında okunamadı: " + err.message);
  }
}
