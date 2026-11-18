'use server';

import { resolveActiveGeminiConfig } from '@/ai/ai-config-service';
import { runGeminiWithFallback } from '@/ai/gemini-fallback-runner';
import { cleanQuestionText } from '@/lib/utils';

export type ExtractTrueFalseInput = {
  text: string;
  topicTitle?: string;
  count?: number;
  apiKey?: string;
  modelName?: string;
};

export type TrueFalseItem = {
  statement: string;
  isTrue: boolean;
  explanation?: string;
};

export type ExtractTrueFalseOutput = {
  questions: TrueFalseItem[];
  explanation?: string;
  error?: string;
};

export async function extractTrueFalse(
  input: ExtractTrueFalseInput
): Promise<ExtractTrueFalseOutput> {
  try {
    const rawText = (input.text || '').trim();
    if (!rawText) {
      return {
        questions: [],
        error: 'Doğru/Yanlış ifadeleri üretmek için geçerli bir metin bulunamadı.'
      };
    }

    const count = Math.max(1, Math.min(input.count || 4, 10));

    const { apiKey: resolvedKey, modelName: resolvedModel } = await resolveActiveGeminiConfig({
      apiKey: input.apiKey,
      modelName: input.modelName,
    });

    const prompt = `
Sen MEB Din Kültürü ve Ahlak Bilgisi dersi için akıllı tahtada öğrencilerin dikkatini toplayan, kazanımları pekiştiren uzman bir soru yazarı ve eğitim tasarımcısısın.
Aşağıda verilen kaynak metinden TAM ${count} ADET ETKİLEŞİMLİ DOĞRU / YANLIŞ İFADESİ üret.

🔴 EN KATI KURALLAR:
1. SORULAR TAM VE BAĞIMSIZ OLMALIDIR (ASLA "METNE GÖRE" DİYE BAŞLAMA!):
   - İfadelerde ASLA "Metne göre...", "Yukarıdaki metne göre...", "Parçaya göre...", "Verilen metinden hareketle..." gibi ifadeler KULLANILMAYACAKTIR.
   - Çünkü bu ifadeler akıllı tahtada ekranda kaynak metin OLMADAN tek başına gösterilecektir.
   - İfadeler öznesiyle ve yüklemiyle tam, bağımsız bir bilgi cümlesi olmalıdır.
     * YANLIŞ: "Metne göre Tahiyyat duası namazda okunur."
     * DOĞRU: "Tahiyyat duası namazın oturuş bölümlerinde okunan bir duadır."
     * YANLIŞ: "Parçaya göre zekât vermek herkese farzdır."
     * DOĞRU: "Zekât ibadeti dinen zengin sayılan her Müslümana farzdır."

2. DOĞRU / YANLIŞ DENGESİ:
   - Üretilen ${count} ifadenin yaklaşık yarısı DOĞRU (isTrue: true), diğer yarısı YANLIŞ (isTrue: false) olmalıdır.

3. YANLIŞ İFADELER PEDAGOJİK VE DÜŞÜNDÜRÜCÜ OLMALIDIR:
   - Yanlış ifadeler bariz saçmalıklar veya komik cümleler DEĞİL; öğrencilerin sıkça karıştırdığı kavram yanılgılarını ölçen düşündürücü ifadeler olmalıdır (Örn: Bir farzı sünnetle değiştirmek, vakitleri veya şartları karıştırmak gibi).

4. AÇIKLAMA (explanation):
   - Her ifadenin neden doğru veya neden yanlış olduğunu belirten 1 kısa MEB izah cümlesi ekle.

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
  "explanation": "Metinden ${count} adet dengeli Doğru/Yanlış alıştırması üretildi.",
  "questions": [
    {
      "statement": "Konuyla ilgili bağımsız ve net doğru ifade cümlesi...",
      "isTrue": true,
      "explanation": "Bu ifadenin doğru olmasının kısa sebebi..."
    },
    {
      "statement": "Konuyla ilgili düşündürücü yanıltıcı ifade cümlesi...",
      "isTrue": false,
      "explanation": "Bu ifadenin yanlış olmasının sebebi ve doğrusu..."
    }
  ]
}
`;

    const rawResponse = await runGeminiWithFallback({
      apiKey: resolvedKey,
      primaryModel: resolvedModel || 'gemini-3.6-flash',
      prompt,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.3,
      },
    });

    let cleaned = rawResponse.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
    }

    const parsed = JSON.parse(cleaned);
    const questionsRaw = Array.isArray(parsed?.questions) ? parsed.questions : [];

    const formattedQuestions: TrueFalseItem[] = questionsRaw.slice(0, count).map((q: any, idx: number) => {
      const rawStatement = String(q.statement || q.text || q.question || `Konuyla ilgili Doğru/Yanlış ifadesi ${idx + 1}`).trim();
      return {
        statement: cleanQuestionText(rawStatement),
        isTrue: typeof q.isTrue === 'boolean' ? q.isTrue : Boolean(q.isTrue),
        explanation: q.explanation ? String(q.explanation).trim() : undefined,
      };
    });

    if (formattedQuestions.length === 0) {
      return {
        questions: [],
        error: 'Metinden Doğru/Yanlış ifadeleri çıkarılamadı.',
      };
    }

    return {
      questions: formattedQuestions,
      explanation: parsed?.explanation || `${formattedQuestions.length} adet Doğru/Yanlış ifadesi başarıyla üretildi.`,
    };
  } catch (err: any) {
    console.error('[extractTrueFalse] Error:', err);
    return {
      questions: [],
      error: err?.message || 'Doğru/Yanlış ifadeleri üretilirken bir hata oluştu.',
    };
  }
}
