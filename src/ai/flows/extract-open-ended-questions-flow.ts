'use server';

import { resolveActiveGeminiConfig } from '@/ai/ai-config-service';
import { runGeminiWithFallback } from '@/ai/gemini-fallback-runner';
import type { OpenEndedQuestionItem } from '@/lib/types';
import { cleanQuestionText } from '@/lib/utils';

export type ExtractOpenEndedQuestionsInput = {
  text: string;
  count?: number;
  topicTitle?: string;
  apiKey?: string;
  modelName?: string;
};

export type ExtractOpenEndedQuestionsOutput = {
  questions: OpenEndedQuestionItem[];
  explanation?: string;
  error?: string;
};

export async function extractOpenEndedQuestions(
  input: ExtractOpenEndedQuestionsInput
): Promise<ExtractOpenEndedQuestionsOutput> {
  try {
    const rawText = (input.text || '').trim();
    if (!rawText) {
      return {
        questions: [],
        error: 'Açık uçlu soru üretmek için geçerli bir metin bulunamadı.'
      };
    }

    const count = Math.max(1, Math.min(input.count || 3, 5));

    const { apiKey: resolvedKey, modelName: resolvedModel } = await resolveActiveGeminiConfig({
      apiKey: input.apiKey,
      modelName: input.modelName,
    });

    const prompt = `
Sen MEB Din Kültürü ve Ahlak Bilgisi dersi için akıllı tahtada öğrencilerin dikkatini toplayan, onları düşündüren uzman bir eğitim tasarımcısısın.
Aşağıda verilen metinden tam 3 ADET KISA, ETKİLİ VE ZORLUK DERECESİ AŞAMALI (KOLAY → ORTA → BİRAZ ZOR) AÇIK UÇLU SORU üret.

🔴 EN KATI KURALLAR:
1. SORULAR TAM VE BAĞIMSIZ OLMALIDIR (ASLA "METNE GÖRE" DİYE BAŞLAMA!):
   - Sorularda ASLA "Metne göre...", "Yukarıdaki metne göre...", "Parçaya göre...", "Verilen metinden hareketle..." gibi ifadeler KULLANILMAYACAKTIR.
   - Sorular akıllı tahtada spiralli defter üzerinde ekranda kaynak metin OLMADAN gösterilecektir.
   - Soru konunun öznesini doğrudan içermeli, bağımsız ve tam bir soru olmalıdır (Örnek: "Tahiyyat duasının tüm evrene selam gönderme mesajı bize ne kazandırır?").

2. ZORLUK DERECELERİ (TAM 3 ADET SIRALI):
   - 1. Soru (kolay): Konunun temel kavramını anlama ve kavrama sorusu. Soru KISA ve doğrudan olsun (Asla 'Metne göre...' deme!).
   - 2. Soru (orta): Bu bilgiyi yorumlama veya günlük hayatla ilişkilendirme sorusu. Soru KISA olsun.
   - 3. Soru (zor): Neden-sonuç, ahlaki çıkarım veya derin düşünme gerektiren "biraz zor" soru. Soru KISA olsun.

3. SORULAR KISA VE NET OLMALIDIR:
   - Sorular asla uzun ve karmaşık paragraflar OLMASIN. 1 veya en fazla 2 kısa cümleyle net ve anlaşılır olsun.

4. MODEL CEVAPLAR KISA OLMALIDIR (UZUN CEVAPLARA KESİNLİKLE GEREK YOK!):
   - Model cevaplar asla uzun paragraflar olmasın! 1 veya en çok 2 kısa, net ve hap cümlelik ideal MEB cevabı olsun.

5. DÜŞÜNME İPUCU (hint):
   - Öğrencinin aklına fikir gelmesi için 1 kısa cümlelik yol gösterici ipucu.

6. KİLİT KAVRAMLAR (keywords):
   - Cevapta geçmesi beklenen en önemli 2-3 adet kavram/kelime.

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
  "explanation": "Metinden aşamalı (kolay, orta, biraz zor) 3 kısa soru ve hap cevap üretildi.",
  "questions": [
    {
      "difficulty": "kolay",
      "question": "1. Kolay ve kısa soru...",
      "hint": "Kısa düşünme ipucu...",
      "modelAnswer": "1-2 kısa cümlelik net ve hap model cevap.",
      "keywords": ["Kavram1", "Kavram2"]
    },
    {
      "difficulty": "orta",
      "question": "2. Orta seviye günlük hayat/yorum sorusu...",
      "hint": "Kısa düşünme ipucu...",
      "modelAnswer": "1-2 kısa cümlelik net ve hap model cevap.",
      "keywords": ["Kavram1", "Kavram2"]
    },
    {
      "difficulty": "zor",
      "question": "3. Biraz zor çıkarım/analiz sorusu...",
      "hint": "Kısa düşünme ipucu...",
      "modelAnswer": "1-2 kısa cümlelik net ve hap model cevap.",
      "keywords": ["Kavram1", "Kavram2"]
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
    const defaultDiffs = ['kolay', 'orta', 'zor'];

    const formattedQuestions: OpenEndedQuestionItem[] = questionsRaw.slice(0, count).map((q: any, idx: number) => {
      const keywordsRaw = Array.isArray(q.keywords) ? q.keywords : [];
      const cleanedKeywords = keywordsRaw
        .map((k: any) => String(k || '').trim())
        .filter(Boolean);

      const diff = q.difficulty === 'kolay' || q.difficulty === 'orta' || q.difficulty === 'zor' 
        ? q.difficulty 
        : defaultDiffs[idx] || 'orta';

      return {
        id: `open-q-${Date.now()}-${idx + 1}`,
        difficulty: diff,
        question: cleanQuestionText(String(q.question || `Konuyla ilgili düşündürücü soru ${idx + 1}`).trim()),
        hint: q.hint ? String(q.hint).trim() : undefined,
        modelAnswer: q.modelAnswer ? String(q.modelAnswer).trim() : undefined,
        keywords: cleanedKeywords.length > 0 ? cleanedKeywords : undefined,
      };
    });

    if (formattedQuestions.length === 0) {
      return {
        questions: [],
        error: 'Metinden soru çıkarılamadı.',
      };
    }

    return {
      questions: formattedQuestions,
      explanation: parsed?.explanation || `${formattedQuestions.length} adet açık uçlu soru hazırlandı.`,
    };
  } catch (error: any) {
    console.error('extractOpenEndedQuestions error:', error);
    return {
      questions: [],
      error: error?.message || 'Açık uçlu soru çıkarma işleminde beklenmeyen bir hata oluştu.',
    };
  }
}
