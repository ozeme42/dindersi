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
Öğretmen, var olan bir ders adımını (slaytı / etkinliği) geliştirmek veya değiştirmek istiyor.

🔴 EN KATI VE DEĞİŞMEZ KURAL: KAYNAK METNE KESİN BAĞLILIK (ZERO HALLUCINATION)
1. SADECE ve SADECE aşağıda verilen "KAYNAK METİN" içerisindeki bilgileri, terimleri, açıklamaları ve maddeleri esas alacaksın.
2. Kaynak metinde GEÇMEYEN hiçbir bilgiyi kafana göre UYDURMAYACAKSIN.
3. Öğretmenin talimatı doğrultusunda mevcut adımı güncelle, geliştir veya yeniden yapılandır.
4. Adımın JSON şemasını ve alanlarını (type, title vb.) tam olarak koru.

=== DERS / KONU BAŞLIĞI ===
"${input.topicTitle || 'Din Kültürü ve Ahlak Bilgisi'}"

=== KAYNAK METİN (KESİN BİLGİ KAYNAĞI) ===
${input.sourceText ? `"""\n${input.sourceText}\n"""` : 'Kaynak metin belirtilmedi, MEB müfredatındaki standart dini bilgileri temel al.'}

=== MEVCUT ADIM (JSON) ===
${JSON.stringify(input.currentStep, null, 2)}

=== ÖĞRETMENİN DEĞİŞİKLİK TALİMATI ===
"${input.instruction}"

---

### ADIM ŞEMALARI HATIRLATMASI:
- type "processFlow": { "type": "processFlow", "title": string, "steps": [{ "stepNumber": number, "title": string, "description": string }] }
- type "categoryTable": { "type": "categoryTable", "title": string, "tableTitle"?: string, "description"?: string, "categories": [{ "name": string, "badge"?: string, "color"?: string, "items": string[] }] }
- type "conceptMatrix": { "type": "conceptMatrix", "title": string, "topicName"?: string, "quadrants": [{ "label": string, "content": string }] }
- type "notebookNote": { "type": "notebookNote", "title": string, "noteTitle"?: string, "notes": string[], "suggestedMinutes"?: number }
- type "hookQuestion": { "type": "hookQuestion", "title": string, "question": string, "thoughtStarter"?: string, "tag"?: string }
- type "conceptExplanation": { "type": "conceptExplanation", "title": string, "items": [{ "concept": string, "definition": string }] }
- type "flashcard": { "type": "flashcard", "title": string, "cards": [{ "term": string, "definition": string }] }
- type "mcq": { "type": "mcq", "title": string, "question": string, "options": string[], "correctAnswer": string }
- type "trueFalseList": { "type": "trueFalseList", "title": string, "questions": [{ "statement": string, "isTrue": boolean }] }
- type "fitb": { "type": "fitb", "title": string, "sentenceWithBlank": string, "options": string[], "correctAnswer": string }
- type "htmlSlide": { "type": "htmlSlide", "title": string, "htmlContent": string }
- type "content": { "type": "content", "title": string, "content": string }

---

### ÇIKTI FORMATI:
SADECE aşağıdaki JSON formatında yanıt ver:
{
  "explanation": "Yapılan değişikliğin kısa açıklaması (Örn: Soru çeldiricileri daha güçlü hale getirildi ve soru kökü netleştirildi.)",
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
