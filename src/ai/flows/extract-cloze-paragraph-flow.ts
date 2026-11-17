'use server';

import { resolveActiveGeminiConfig } from '@/ai/ai-config-service';
import { runGeminiWithFallback } from '@/ai/gemini-fallback-runner';
import type { ClozeBlankItem } from '@/lib/types';

export type ExtractClozeParagraphInput = {
  text: string;
  topicTitle?: string;
  blankCount?: number;
  apiKey?: string;
  modelName?: string;
};

export type ExtractClozeParagraphOutput = {
  paragraphWithBlanks: string;
  blanks: ClozeBlankItem[];
  distractors: string[];
  explanation?: string;
  error?: string;
};

export async function extractClozeParagraph(
  input: ExtractClozeParagraphInput
): Promise<ExtractClozeParagraphOutput> {
  try {
    const rawText = (input.text || '').trim();
    if (!rawText) {
      return {
        paragraphWithBlanks: '',
        blanks: [],
        distractors: [],
        error: 'Boşluk doldurma metni üretmek için geçerli bir kaynak metin bulunamadı.'
      };
    }

    const blankCount = Math.max(2, Math.min(input.blankCount || 3, 5));

    const { apiKey: resolvedKey, modelName: resolvedModel } = await resolveActiveGeminiConfig({
      apiKey: input.apiKey,
      modelName: input.modelName,
    });

    const prompt = `
Sen MEB Din Kültürü ve Ahlak Bilgisi dersi için akıllı tahtada öğrencilerin dikkatini toplayan, kilit kavramları pekiştiren uzman bir eğitim materyali tasarımcısısın.
Aşağıda verilen kaynak metni incele ve bu metnin en önemli noktalarını özetleyen AKICI BİR PARAGRAF oluştur. Bu paragrafın içindeki EN KRİTİK ${blankCount} ADET KAVRAMI boşluk haline getir.

🔴 EN KATI KURALLAR:
1. PARAGRAF (paragraphWithBlanks):
   - Verilen metne %100 sadık, 2 ila 4 cümlelik, anlam bütünlüğü taşıyan akıcı bir özet paragrafı olsun.
   - Paragraftaki boşlukları kesinlikle "[1]", "[2]", "[3]" gibi köşeli parantezli sayılarla belirt.
   - Örnek: "İslam dininde [1], zengin Müslümanların yılda bir kez yerine getirmesi gereken [2] bir ibadettir. Bu ibadeti yerine getirmek için kişinin [3] miktarı mala sahip olması şarttır."

2. BOŞLUK KELİMELERİ (blanks):
   - Tam ${blankCount} adet olmalıdır.
   - Her bir boşluk için (targetWord): Metinde geçen 1 veya 2 kelimelik net anahtar terim olmalıdır (Örn: "zekât", "farz", "nisap").
   - İpucu (hint): Öğrenci takıldığında yardımcı olacak 1 kısa cümlelik açıklama.

3. ÇELDİRİCİ KELİMELER (distractors):
   - Kesinlikle TAM 2 ADET olmalıdır.
   - Ders konusuyla ve din kültürüyle yakından ilişkili, ancak bu paragraftaki boşluklara ait OLMAYAN kavramlar olmalıdır (Örn: "sadaka", "vacip").

=== DERS / KONU BAŞLIĞI ===
"${input.topicTitle || 'Din Kültürü ve Ahlak Bilgisi'}"

=== KAYNAK METİN ===
"""
${rawText}
"""

---

### ÇIKTI FORMATI:
SADECE aşağıdaki JSON formatında yanıt ver:
{
  "explanation": "Metinden ${blankCount} boşluklu özet paragrafı ve çeldiriciler oluşturuldu.",
  "paragraphWithBlanks": "Paragraf metni [1] boşluk [2] devamı [3]...",
  "blanks": [
    {
      "id": "1",
      "targetWord": "DoğruKelime1",
      "hint": "1. boşluk için ipucu..."
    },
    {
      "id": "2",
      "targetWord": "DoğruKelime2",
      "hint": "2. boşluk için ipucu..."
    },
    {
      "id": "3",
      "targetWord": "DoğruKelime3",
      "hint": "3. boşluk için ipucu..."
    }
  ],
  "distractors": ["ÇeldiriciKelime1", "ÇeldiriciKelime2"]
}
`;

    const rawResponse = await runGeminiWithFallback({
      apiKey: resolvedKey,
      primaryModel: resolvedModel || 'gemini-3.6-flash',
      prompt,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.25,
      },
    });

    let cleaned = rawResponse.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
    }

    const parsed = JSON.parse(cleaned);

    const paragraphWithBlanks = String(parsed?.paragraphWithBlanks || '').trim();
    const rawBlanks = Array.isArray(parsed?.blanks) ? parsed.blanks : [];
    const rawDistractors = Array.isArray(parsed?.distractors) ? parsed.distractors : [];

    const formattedBlanks: ClozeBlankItem[] = rawBlanks.slice(0, blankCount).map((b: any, idx: number) => ({
      id: String(b.id || idx + 1),
      targetWord: String(b.targetWord || '').trim(),
      hint: b.hint ? String(b.hint).trim() : undefined,
    })).filter((b: ClozeBlankItem) => Boolean(b.targetWord));

    const formattedDistractors: string[] = rawDistractors
      .map((d: any) => String(d || '').trim())
      .filter((d: string) => Boolean(d) && !formattedBlanks.some((b: ClozeBlankItem) => b.targetWord.toLowerCase() === d.toLowerCase()))
      .slice(0, 3);

    if (!paragraphWithBlanks || formattedBlanks.length === 0) {
      return {
        paragraphWithBlanks: '',
        blanks: [],
        distractors: [],
        error: 'Metinden geçerli bir boşluk doldurma paragrafı üretilemedi.',
      };
    }

    return {
      paragraphWithBlanks,
      blanks: formattedBlanks,
      distractors: formattedDistractors,
      explanation: parsed?.explanation || `${formattedBlanks.length} boşluklu özet paragrafı hazırlandı.`,
    };
  } catch (error: any) {
    console.error('extractClozeParagraph error:', error);
    return {
      paragraphWithBlanks: '',
      blanks: [],
      distractors: [],
      error: error?.message || 'Paragraf boşluk doldurma çıkarma işleminde bir hata oluştu.',
    };
  }
}
