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
Sen MEB Din Kültürü ve Ahlak Bilgisi dersi için akıllı tahtada öğrencilerin dikkatini toplayan, onları derinlemesine düşündüren uzman bir eğitim tasarımcısısın.
Aşağıda verilen metinden tam 3 ADET KISA, ETKİLİ VE ZORLUK DERECESİ AŞAMALI (KOLAY → ORTA → BİRAZ ZOR) AÇIK UÇLU DÜŞÜNME SORUSU üret.

🔴 EN KATI KURALLAR:
1. 🚫 ASLA "BU KONUDA", "BU METİNDE", "METNE GÖRE" GİBİ KALIPLAR KULLANMA (KESİNLİKLE YASAKTIR!):
   - Sorularda ASLA "Bu konuda...", "Bu konuya göre...", "Bu konudan hareketle...", "Bu konu da bize...", "Bu derste...", "Metne göre...", "Yukarıdaki metne göre...", "Parçaya göre...", "Verilen metinden hareketle...", "Bu metinde..." gibi kalıplar KULLANILMAYACAKTIR!
   - Akıllı tahtada spiralli defter sayfası açıldığında ekranda kaynak metin OLMAYACAKTIR. Soru tek başına tam, bağımsız ve öznesiyle net anlaşılır olmalıdır.

2. 💡 GEREKİRSE KISA BİR ÖN AÇIKLAMA / BAĞLAM (1 CÜMLELİK ÖN BİLGİ) YAP VE ARDINDAN SOR:
   - Soruyu havada bırakmak veya "Bu konuda..." demek yerine; sorunun girişinde 1 kısa cümleyle konunun/kavramın temel bağlamını, tanımını veya ön bilgisini ver; ardından soruyu sor!
   - Bahsedilen ibadetin, kavramın, ahlaki ilkenin, surenin veya peygamberin ADINI doğrudan soru cümlesinde zikret.

   ✅ DOĞRU ÖRNEKLER (BÖYLE YAZ):
   * "İslam dininde zekât; maddi durumu iyi olan Müslümanların yılda bir kez ihtiyaç sahiplerine vermesi farz olan bir ibadettir. Zekât ibadetinin toplumdaki kardeşlik ve yardımlaşma bilincine katkısını açıklayınız."
   * "Peygamberimiz Hz. Muhammed (s.a.v.) gençliğinden itibaren doğruluğuyla tanınmış ve 'el-Emin' (güvenilir) lakabıyla anılmıştır. Bir gencin okul ortamında bu dürüstlük ilkesini nasıl sergileyebileceğini bir örnekle açıklayınız."
   * "Tahiyyat duası, namazların oturuşlarında okunur ve Miraç gecesindeki kutlu hitaplaşmayı hatırlatır. Bu duanın Müslümana kazandırdığı kulluk ve teslimiyet bilincini açıklayınız."

   ❌ YANLIŞ ÖRNEKLER (ASLA BÖYLE ÜRETME):
   * "Bu konuda geçen en önemli bilgi nedir?" (YANLIŞ: 'Bu konuda' ifadesi yasaktır!)
   * "Bu konudan hareketle günlük hayatımızda ne yapmalıyız?" (YANLIŞ: Hangi konu olduğu belirtilmemiş!)
   * "Bu konu da bize ne anlatmaktadır?" (YANLIŞ: Muğlak ve öznesiz!)
   * "Bu konuya göre zekatın şartları nelerdir?" (YANLIŞ: 'Bu konuya göre' yasaktır!)

3. ZORLUK DERECELERİ (TAM 3 ADET SIRALI):
   - 1. Soru (kolay): Konunun temel kavramını anlama ve kavrama sorusu. Gerekirse 1 cümlelik ön tanım/açıklama yapıp soruyu sor (Asla 'Bu konuda...' deme!).
   - 2. Soru (orta): Bu bilgiyi yorumlama veya günlük hayatla ilişkilendirme sorusu. 1 cümlelik bağlam ve hayatla ilişkili düşündürücü soru.
   - 3. Soru (zor): Neden-sonuç, ahlaki çıkarım veya derin düşünme gerektiren "biraz zor" soru. Ön açıklama veya somut durum içeren kaliteli soru.

4. MODEL CEVAPLAR (HAP VE ÖĞRETİCİ):
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
      "question": "1. Ön açıklamalı kolay ve düşündürücü soru...",
      "hint": "Kısa düşünme ipucu...",
      "modelAnswer": "1-2 kısa cümlelik net ve hap model cevap.",
      "keywords": ["Kavram1", "Kavram2"]
    },
    {
      "difficulty": "orta",
      "question": "2. Ön açıklamalı orta seviye günlük hayat/yorum sorusu...",
      "hint": "Kısa düşünme ipucu...",
      "modelAnswer": "1-2 kısa cümlelik net ve hap model cevap.",
      "keywords": ["Kavram1", "Kavram2"]
    },
    {
      "difficulty": "zor",
      "question": "3. Ön açıklamalı biraz zor çıkarım/analiz sorusu...",
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

      const cleanedQuestion = cleanQuestionText(String(q.question || '').trim(), input.topicTitle);

      return {
        id: `open-q-${Date.now()}-${idx + 1}`,
        difficulty: diff,
        question: cleanedQuestion || (input.topicTitle ? `${input.topicTitle} ile ilgili düşündürücü soru ${idx + 1}` : `Düşündürücü soru ${idx + 1}`),
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
