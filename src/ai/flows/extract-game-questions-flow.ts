'use server';

import { resolveActiveGeminiConfig } from '@/ai/ai-config-service';
import { runGeminiWithFallback } from '@/ai/gemini-fallback-runner';
import type { MiniGameQuestion } from '@/lib/types';

export type ExtractGameQuestionsInput = {
  text: string; // Adımdaki veya konudaki kaynak metin
  count?: number; // Üretilecek soru veya kavram sayısı (varsayılan 4)
  mode?: 'questions' | 'concepts'; // 'questions' = Test/Soru, 'concepts' = Anahtar Kavram & Tanım
  topicTitle?: string;
  apiKey?: string;
  modelName?: string;
};

export type ExtractGameQuestionsOutput = {
  questions: MiniGameQuestion[];
  explanation?: string;
  error?: string;
};

export async function extractGameQuestions(
  input: ExtractGameQuestionsInput
): Promise<ExtractGameQuestionsOutput> {
  try {
    const rawText = (input.text || '').trim();
    if (!rawText) {
      return {
        questions: [],
        error: 'Soru üretmek için geçerli bir metin bulunamadı.'
      };
    }

    const isConceptMode = input.mode === 'concepts';
    const defaultCount = isConceptMode ? 4 : 3;
    const count = Math.max(1, Math.min(input.count || defaultCount, 8));

    const { apiKey: resolvedKey, modelName: resolvedModel } = await resolveActiveGeminiConfig({
      apiKey: input.apiKey,
      modelName: input.modelName,
    });

    const prompt = isConceptMode
      ? `
Sen MEB Din Kültürü ve Ahlak Bilgisi dersi için akıllı tahta kavram oyunları (Eşleşen Çiftler / Hafıza Kartları, Eşleştirme, Adam Asmaca, Karışık Harfler, Kelime Avı, Çapraz Bulmaca) hazırlayan uzman bir eğitimcisin.
Aşağıda verilen slayt metnini incele ve metinde geçen EN ÖNEMLİ ${count} ADET ANAHTAR KAVRAMI ve bu kavramların METİNDEKİ TANIMINI / İPUCUNU çıkar.

🔴 EN KATI KURALLAR:
1. KAVRAM (options[0]): Sadece metinde doğrudan geçen 1 veya 2 kelimelik net terim olmalıdır (Örnek: "Tevhid", "İhlas", "Zekât", "Nisap", "Kaza", "Kader", "Sadaka-i Cariye", "Farz", "Sünnet", "Vahiy", "Nübüvvet").
2. TANIM / İPUCU (question): Metne göre bu kavramın anlamını veya açıklamasını veren 1 kısa, net ve anlaşılır cümle olmalıdır (Örnek: "Allah'ın bir ve tek olduğuna, eşi ve benzeri olmadığına inanmak").
3. ÇELDIRICILER (options 1, 2, 3): Konuyla ve din kültürü dersiyle ilişkili diğer kavram isimleri olmalıdır.
4. Bu format hem hafıza eşleştirme kartlarında hem de çoktan seçmeli test oyunlarında kusursuz çalışacaktır.

=== DERS / KONU BAŞLIĞI ===
"${input.topicTitle || 'Din Kültürü ve Ahlak Bilgisi'}"

=== SLAYT METNİ (KAYNAK) ===
"""
${rawText}
"""

---

### ÇIKTI FORMATI:
SADECE aşağıdaki JSON formatında yanıt ver:
{
  "explanation": "Metinden ${count} adet anahtar kavram ve tanımı çıkarıldı.",
  "questions": [
    {
      "question": "Metindeki tanım/ipucu cümlesi...",
      "options": ["Doğru Kavram Adı", "Çeldirici Kavram 1", "Çeldirici Kavram 2", "Çeldirici Kavram 3"],
      "correctAnswerIndex": 0
    }
  ]
}
`
      : `
Sen MEB Din Kültürü ve Ahlak Bilgisi dersi için akıllı tahta oyunları hazırlayan uzman bir soru yazarısın.
Aşağıda bir konu anlatımı slaytında yer alan metin verilmiştir.

🔴 EN KATI KURAL (KAYNAK METNE %100 SADAKAT):
- SADECE VE SADECE sana verilen aşağıdaki metinde geçen cümlelerden, kavramlardan ve bilgilerden ${count} adet soru üret.
- Metin dışından ASLA genel kültür veya harici bilgi ekleme!
- Sorunun doğru cevabı MUTLAKA metinde doğrudan geçen bir kelime, ifade veya kural olmalıdır.
- Her soru için tam 4 şık (seçenek) oluştur. Şıkların başına 'A)', 'B)' gibi harfler EKLEME, sadece cevabın kendisini yaz.
- Çeldiriciler (yanlış şıklar) konuyla ilgili ama metne göre açıkça yanlış olmalıdır.
- Sorular akıllı tahtada (Çarkıfelek, Kutuyu Aç, Penaltı vb.) oynanacağı için kısa, net, anlaşılır ve dikkat toplayıcı olsun.

=== DERS / KONU BAŞLIĞI ===
"${input.topicTitle || 'Din Kültürü ve Ahlak Bilgisi'}"

=== SLAYT METNİ (KAYNAK) ===
"""
${rawText}
"""

---

### ÇIKTI FORMATI:
SADECE aşağıdaki JSON formatında yanıt ver:
{
  "explanation": "Metinden ${count} adet pekiştirme sorusu çıkarıldı.",
  "questions": [
    {
      "question": "Soru metni...",
      "options": ["Doğru Seçenek", "Çeldirici 1", "Çeldirici 2", "Çeldirici 3"],
      "correctAnswerIndex": 0
    }
  ]
}
`;

    const rawResponse = await runGeminiWithFallback({
      apiKey: resolvedKey,
      modelName: resolvedModel || 'gemini-2.5-flash',
      prompt,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2, // Düşük sıcaklık -> Metne maksimum sadakat
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

    const formattedQuestions: MiniGameQuestion[] = questionsRaw.map((q: any, idx: number) => {
      // Şıkların başındaki A), B) gibi harfleri temizle
      const cleanedOptions = (Array.isArray(q.options) ? q.options : ['A', 'B', 'C', 'D']).map((opt: any) => {
        return String(opt || '').replace(/^[A-Da-d][\)\.\-]\s*/, '').trim();
      });

      // En az 2 şık olsun
      while (cleanedOptions.length < 4) {
        cleanedOptions.push(`Seçenek ${cleanedOptions.length + 1}`);
      }

      const correctIdx = typeof q.correctAnswerIndex === 'number' && q.correctAnswerIndex >= 0 && q.correctAnswerIndex < cleanedOptions.length
        ? q.correctAnswerIndex
        : 0;

      return {
        id: `gen-q-${Date.now()}-${idx + 1}`,
        question: String(q.question || `Metinle ilgili soru ${idx + 1}`),
        options: cleanedOptions.slice(0, 4),
        correctAnswerIndex: correctIdx,
      };
    });

    if (formattedQuestions.length === 0) {
      return {
        questions: [],
        error: 'Metinden soru çıkarılamadı. Lütfen metnin yeterli bilgi içerdiğinden emin olun.'
      };
    }

    return {
      questions: formattedQuestions,
      explanation: parsed?.explanation || `${formattedQuestions.length} soru başarıyla oluşturuldu.`
    };
  } catch (err: any) {
    console.error('[extractGameQuestions] Error:', err);
    return {
      questions: [],
      error: err?.message || 'Metinden soru çıkarılırken yapay zekâ hatası oluştu.'
    };
  }
}
