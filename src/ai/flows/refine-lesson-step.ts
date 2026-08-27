'use server';

/**
 * @fileOverview AI-powered Step Refiner / Editor.
 * Modifies an existing LessonStep based on natural language instructions from the teacher
 * while strictly maintaining sourceText fidelity and correct step schema.
 */

import { z } from 'zod';
import { resolveActiveGeminiConfig } from '@/ai/ai-config-service';
import { runGeminiWithFallback } from '@/ai/gemini-fallback-runner';
import type { LessonStep } from '@/lib/types';

export type RefineLessonStepInput = {
  currentStep: LessonStep; // Düzenlenmekte olan mevcut adım
  instruction: string; // Öğretmenin değişiklik talimatı (Örn: "Maddeleri kısalt", "1 sütun daha ekle", "Çeldiricileri zorlaştır")
  topicTitle?: string;
  sourceText?: string;
  apiKey?: string;
  modelName?: string;
};

export type RefineLessonStepOutput = {
  updatedStep: LessonStep;
  explanation: string;
};

export async function refineLessonStep(
  input: RefineLessonStepInput
): Promise<RefineLessonStepOutput> {
  const { apiKey: resolvedKey, modelName: resolvedModel } = await resolveActiveGeminiConfig({
    apiKey: input.apiKey,
    modelName: input.modelName,
  });

  const prompt = `
Sen MEB Din Kültürü ve Ahlak Bilgisi dersi için çalışan uzman bir pedagoji ve akıllı tahta içerik editörü yapay zekâsısın.
Öğretmen, var olan bir ders adımını (slaytı / etkinliği) geliştirmek, değiştirmek veya yeni bilgiler eklemek istiyor.

🔴 GÖREV VE KURALLAR:
1. **ÖĞRETMENİN TALİMATINI TAM VE EKSİKSİZ UYGULA:**
   - Öğretmenin isteğini (Örn: "Arapçalarını ve sure-ayet numaralarını yaz", "Maddeleri kısalt", "Yeni sorular ekle", "Kategori sütunu ekle", "Dili sadeleştir") MUTLAKA ve EKSİKSİZ olarak mevcut adıma uygula.
   - Asla içeriği değiştirmeden eski haliyle bırakma!

2. **AYETLER, HADİSLER, ARAPÇA METİNLER VE SURE-AYET REFERANSLARI:**
   - Öğretmen ayet, hadis, Kur'an Arapçası, sure adı ve ayet numarası (Örn: "Bakara Suresi 43. Ayet") eklenmesini veya mevcut bilgilerin Arapça ve kaynaklarıyla güncellenmesini istediğinde;
   - Kur'an-ı Kerim ve sahih hadis kaynaklarındaki %100 orijinal ve doğru Arapça harekeli metinleri, Türkçe mealleri ve sure:ayet numarası künyelerini eksiksiz ekle.
   - Örnek Ayet Formatı:
     - Başlık/Künye: Bakara Suresi, 43. Ayet
     - Arapça: وَأَقِيمُوا الصَّلَاةَ وَآتُوا الزَّكَاةَ وَارْكَعُوا مَعَ الرَّاكِعِينَ
     - Meali: "Namazı dosdoğru kılın, zekâtı verin ve rükû edenlerle birlikte siz de rükû edin."

3. **KAYNAK METİN VE PEDAGOJİK DOĞRULUK:**
   - Konu anlatımı ve kavramlarda varsa "KAYNAK METİN"i ve MEB Din Kültürü müfredatı kazanımlarını temel al.
   - Dini doğruluğa, mezhepler üstü ve sahih kaynaklara azami özen göster.

4. **ADIM ŞEMASI VE VERİ YAPISINI KORU:**
   - Adımın türünü (type) ve alanlarını geçerli JSON şemasına uygun olarak üret.
   - Eğer 'type' = 'content' ise 'content' alanını <ul><li>...</li></ul> HTML etiketleriyle yapılandır.

=== DERS / KONU BAŞLIĞI ===
"${input.topicTitle || 'Din Kültürü ve Ahlak Bilgisi'}"

=== KAYNAK METİN (EĞER VARSA) ===
${input.sourceText ? `"""\n${input.sourceText}\n"""` : 'Kaynak metin belirtilmedi.'}

=== MEVCUT ADIM (DÜZENLENECEK NESNE) ===
${JSON.stringify(input.currentStep, null, 2)}

=== ÖĞRETMENİN DEĞİŞİKLİK TALİMATI ===
"${input.instruction}"

---

### ADIM ŞEMALARI:
- type "content": { "type": "content", "title": string, "content": "<ul><li>1. Madde/Ayet...</li><li>2. Madde/Ayet...</li></ul>" }
- type "notebookNote": { "type": "notebookNote", "title": string, "noteTitle"?: string, "notes": string[], "suggestedMinutes"?: number }
- type "processFlow": { "type": "processFlow", "title": string, "steps": [{ "stepNumber": number, "title": string, "description": string }] }
- type "categoryTable": { "type": "categoryTable", "title": string, "tableTitle"?: string, "description"?: string, "categories": [{ "name": string, "badge"?: string, "color"?: string, "items": string[] }] }
- type "conceptMatrix": { "type": "conceptMatrix", "title": string, "topicName"?: string, "quadrants": [{ "label": string, "content": string }] }
- type "hookQuestion": { "type": "hookQuestion", "title": string, "question": string, "thoughtStarter"?: string, "tag"?: string }
- type "conceptExplanation": { "type": "conceptExplanation", "title": string, "items": [{ "concept": string, "definition": string }] }
- type "flashcard": { "type": "flashcard", "title": string, "cards": [{ "term": string, "definition": string }] }
- type "matching": { "type": "matching", "title": string, "pairs": [{ "concept": string, "definition": string }] }
- type "anagramGame": { "type": "anagramGame", "title": string, "cards": [{ "correctAnswer": string, "scrambledWord": string, "definition": string }] }
- type "anagramFlashcard": { "type": "anagramFlashcard", "title": string, "cards": [{ "correctAnswer": string, "scrambledWord": string, "definition"?: string }] }
- type "sentenceScramble": { "type": "sentenceScramble", "title": string, "correctSentence": string, "scrambledSentence": string }
- type "mcq": { "type": "mcq", "title": string, "question": string, "options": string[], "correctAnswer": string }
- type "trueFalseList": { "type": "trueFalseList", "title": string, "questions": [{ "statement": string, "isTrue": boolean }] }
- type "tf": { "type": "tf", "title": string, "statement": string, "isTrue": boolean }
- type "fitb": { "type": "fitb", "title": string, "sentenceWithBlank": string, "options": string[], "correctAnswer": string }
- type "accordion": { "type": "accordion", "title": string, "items": [{ "title": string, "content": string }] }
- type "video": { "type": "video", "title": string, "videoUrl": string, "caption"?: string }
- type "visual": { "type": "visual", "title": string, "imageUrl": string, "caption"?: string }
- type "htmlSlide": { "type": "htmlSlide", "title": string, "htmlContent": string }

---

### ÇIKTI FORMATI:
SADECE aşağıdaki JSON formatında yanıt ver:
{
  "explanation": "Öğretmenin talimatına göre neyin nasıl güncellendiğinin net açıklaması (Örn: İlgili ayetlerin Kur'an-ı Kerim Arapça metinleri ve Bakara 43, İsra 32 sure-ayet numaraları eklendi.)",
  "updatedStep": {
    /* Güncellenmiş tam LessonStep nesnesi */
  }
}
`;

  try {
    const rawResponse = await runGeminiWithFallback({
      apiKey: resolvedKey,
      primaryModel: resolvedModel,
      prompt,
      generationConfig: {
        temperature: 0.15,
        responseMimeType: 'application/json',
      },
    });

    let parsedData: any;
    try {
      const cleaned = rawResponse
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();
      parsedData = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error('[refineLessonStep] JSON parse error:', parseErr, rawResponse);
      throw new Error('Yapay zeka yanıtı işlenirken JSON hatası oluştu.');
    }

    const updatedStep = parsedData?.updatedStep || parsedData?.step || parsedData;
    if (!updatedStep || !updatedStep.type) {
      throw new Error('Yapay zekâ adımı güncellerken geçerli bir şema oluşturamadı.');
    }

    // Preserve ID and isPublished status
    const finalizedStep: LessonStep = {
      ...(input.currentStep as any),
      ...updatedStep,
      id: (input.currentStep as any)?.id || (updatedStep as any)?.id,
      isPublished: true,
    };

    return {
      updatedStep: finalizedStep,
      explanation: parsedData?.explanation || 'Adım başarıyla güncellendi.',
    };
  } catch (error: any) {
    console.error('[refineLessonStep] Refine failed:', error);
    throw new Error(error.message || 'Adım düzenlenirken bir hata oluştu.');
  }
}
