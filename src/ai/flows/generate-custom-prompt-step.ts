'use server';

/**
 * @fileOverview AI-powered Natural Language Prompt-to-LessonStep generator.
 * Converts teacher's open-ended prompts (e.g. "Haccın yapılışını adım adım gösteren süreç akışı ekle")
 * into valid, high-contrast, interactive LessonStep objects.
 */

import { z } from 'zod';
import { resolveActiveGeminiConfig } from '@/ai/ai-config-service';
import { runGeminiWithFallback } from '@/ai/gemini-fallback-runner';
import type { LessonStep } from '@/lib/types';

export type GenerateCustomPromptStepInput = {
  userPrompt: string; // Öğretmenin doğal dildeki isteği (Örn: "Haccın yapılışını adım adım gösteren infografik/süreç adımı ekle")
  topicTitle?: string; // Konu Başlığı (Örn: "Hac ve Kurban")
  sourceText?: string; // Kaynak Metin / Ders Kitabı Özeti
  apiKey?: string;
  modelName?: string;
};

export type GenerateCustomPromptStepOutput = {
  steps: LessonStep[];
  message: string;
};

export async function generateCustomPromptStep(
  input: GenerateCustomPromptStepInput
): Promise<GenerateCustomPromptStepOutput> {
  const { apiKey: resolvedKey, modelName: resolvedModel } = await resolveActiveGeminiConfig({
    apiKey: input.apiKey,
    modelName: input.modelName,
  });

  const prompt = `
Sen MEB Din Kültürü ve Ahlak Bilgisi dersi için çalışan uzman bir pedagoji ve interaktif ders tasarım yapay zekâsısın.
Öğretmen senden özel bir istekte bulundu. Bu isteği analiz et ve Dindersi akıllı tahta sistemine tam uyumlu 1 veya birden fazla 'LessonStep' (Ders Adımı) üret.

=== ÖĞRETMENİN İSTEĞİ ===
"${input.userPrompt}"

=== DERS / KONU BAŞLIĞI ===
"${input.topicTitle || 'Din Kültürü ve Ahlak Bilgisi'}"

=== KAYNAK METİN (EĞER VARSA) ===
${input.sourceText ? `"""\n${input.sourceText}\n"""` : 'Kaynak metin belirtilmedi, konunun MEB müfredatındaki standart bilgilerini temel al.'}

---

### DİNDERSİ ADIM TÜRLERİ VE JSON ŞEMALARI (İsteğe en uygun olanı seç veya birleştir):

1. **processFlow (Süreç / Yol Haritası / Aşamalar):**
   * Kullanım: Bir sürecin, ibadetin yapılışının veya tarihsel olayın aşamaları (Örn: Haccın Yapılışı, Abdestin Alınışı, Vahyin İniş Süreci, Peygamberimizin Hayatının Aşamaları).
   * JSON Şeması:
   {
     "type": "processFlow",
     "title": "🪜 Haccın Yapılış Aşamaları",
     "steps": [
       { "stepNumber": 1, "title": "1. İhrama Girme & Niyet", "description": "Mikat sınırında ihrama girilir ve hacca niyet edilir." },
       { "stepNumber": 2, "title": "2. Arafat Vakfesi", "description": "Arefe günü Arafat'ta vakfe yapılarak dua edilir (Farz)." },
       { "stepNumber": 3, "title": "3. Müzdelife & Şeytan Taşlama", "description": "Müzdelife vakfesinden sonra Mina'da sembolik şeytan taşlanır." },
       { "stepNumber": 4, "title": "4. Kurban & İhramdan Çıkış", "description": "Kurban kesilip tıraş olunarak ihramdan çıkılır." },
       { "stepNumber": 5, "title": "5. Ziyaret Tavafı & Sa'y", "description": "Kâbe tavaf edilir ve Safa-Merve arasında sa'y yapılır." }
     ]
   }

2. **categoryTable (Kategori & Sınıflandırma Tablosu):**
   * Kullanım: Konuyu gruplara, türlere veya hükümlere ayıran çok sütunlu tablo (Örn: Farz/Vacip/Sünnet Namazlar, Zekat Verilenler/Verilmeyenler, Helaller/Haramlar, Abdesti Bozanlar/Bozmayanlar).
   * JSON Şeması:
   {
     "type": "categoryTable",
     "title": "📊 Hükümlerine Göre Namazlar",
     "tableTitle": "Namaz Çeşitleri ve Hükümleri",
     "description": "Namazlar dinî bağlayıcılıklarına göre üç ana grupta incelenir.",
     "categories": [
       { "name": "Farz Namazlar", "badge": "Kesin Emir", "color": "emerald", "items": ["5 Vakit Namazın Farzları", "Cuma Namazı", "Cenaze Namazı (Kifaye)"] },
       { "name": "Vacip Namazlar", "badge": "Kuvvetli Emir", "color": "amber", "items": ["Vitir Namazı", "Ramazan Bayramı Namazı", "Kurban Bayramı Namazı", "Adak Namazı"] },
       { "name": "Sünnet / Nafile", "badge": "Gönüllü İbadet", "color": "indigo", "items": ["5 Vaktin Sünnetleri", "Teravih Namazı", "Teheccüd & Kuşluk Namazı"] }
     ]
   }

3. **conceptMatrix (4 Boyutta Konu Analizi):**
   * Kullanım: Konuyu 4 ana boyutta ele alan derinlemesine matris (1. Nedir? 2. Niçin Önemli? 3. Nasıl Uygulanır? 4. Bize Ne Kazandırır?).
   * JSON Şeması:
   {
     "type": "conceptMatrix",
     "title": "🔲 4 Boyutta Zekât İbadeti",
     "topicName": "Zekât ve Sadaka",
     "quadrants": [
       { "label": "1. Nedir? (Tanım)", "content": "Dinen zengin sayılan Müslümanların mallarının belirli bir kısmını ihtiyaç sahiplerine vermesidir." },
       { "label": "2. Niçin Önemlidir? (Amaç)", "content": "Toplumsal adaleti sağlar, yoksulluğu azaltır ve kalbi cimrilikten arındırır." },
       { "label": "3. Nasıl Uygulanır? (Pratik)", "content": "Nisap miktarı mala sahip olanlar yılda bir kez %2.5 (1/40) oranında verir." },
       { "label": "4. Bize Ne Kazandırır? (Fayda)", "content": "Zengin ile fakir arasında sevgi bağı kurar, malı bereketlendirir ve şükür bilinci kazandırır." }
     ]
   }

4. **notebookNote (Defterimize Yazalım - Özet Defter Notu):**
   * Kullanım: Öğrencilerin deftere yazacağı en net, akılda kalıcı 3-5 maddelik ders notu.
   * JSON Şeması:
   {
     "type": "notebookNote",
     "title": "✏️ Defterimize Yazalım",
     "noteTitle": "Hac İbadetinin Farzları ve Önemli Kuralları",
     "notes": [
       "1. Haccın 3 farzı vardır: İhrama girmek (şart), Arafat vakfesi ve Ziyaret tavafı (rükün).",
       "2. Hac ibadeti hicretin 9. yılında farz kılınmıştır.",
       "3. Hem mal hem bedenle yapılan farz bir ibadettir."
     ],
     "suggestedMinutes": 3
   }

5. **hookQuestion (Merak & Giriş Sorusu):**
   * Kullanım: Derse başlarken öğrencilerin dikkatini çeken düşündürücü açık uçlu soru.
   * JSON Şeması:
   {
     "type": "hookQuestion",
     "title": "🤔 Derse Başlarken: Bir Düşünelim!",
     "question": "Sizce dünyanın dört bir yanından milyonlarca insanın aynı kıyafetle (ihram) Kâbe'de toplanması insanlığa ne mesaj verir?",
     "thoughtStarter": "Arkadaşlarınızla tartışın: İhramın simgelediği eşitlik ve kardeşlik duygusunu düşünün.",
     "tag": "🤔 Merak & Giriş Sorusu"
   }

6. **conceptExplanation (Kavram Kartları) veya flashcard (3D Bilgi Kartları):**
   * JSON Şeması (conceptExplanation):
   {
     "type": "conceptExplanation",
     "title": "📌 Temel Kavramlar",
     "items": [
       { "concept": "İhram", "definition": "Hac veya umreye niyet eden kimsenin diğer zamanlarda helal olan bazı davranışları kendine haram kılması." },
       { "concept": "Vakfe", "definition": "Arafat veya Müzdelife'de belirli bir süre durup dua etmek." }
     ]
   }

7. **mcq (Çoktan Seçmeli Test Sorusu):**
   * JSON Şeması:
   {
     "type": "mcq",
     "title": "❓ Kontrol Sorusu",
     "question": "Aşağıdakilerden hangisi haccın farzlarından (rükünlerinden) biri değildir?",
     "options": ["A) İhrama girmek", "B) Arafat vakfesi yapmak", "C) Şeytan taşlamak", "D) Ziyaret tavafı yapmak"],
     "correctAnswer": "C) Şeytan taşlamak"
   }

8. **trueFalseList (Doğru / Yanlış Alıştırması):**
   * JSON Şeması:
   {
     "type": "trueFalseList",
     "title": "✓/✗ Doğru - Yanlış Alıştırması",
     "questions": [
       { "statement": "Hac ibadeti sadece zengin olan her Müslümana ömründe bir defa farzdır.", "isTrue": true },
       { "statement": "Kâbe etrafında her bir dönüşe 'şavt', yedi şavta ise 'tavaf' denir.", "isTrue": true },
       { "statement": "Arafat vakfesi bayramın üçüncü günü yapılır.", "isTrue": false }
     ]
   }

9. **fitb (Boşluk Doldurma) veya anagramGame (Kelime Dehası) veya sentenceScramble (Cümle Kurma):**
   * Standart Dindersi oyun adımları.

10. **htmlSlide (Zengin İnteraktif HTML İnfografik / Kartlı Slayt):**
    * Eğer öğretmen zengin bir görsel slayt veya karşılaştırmalı infografik istemişse modern Tailwind CSS sınıflarıyla şık HTML slaytı üret.
    * JSON Şeması:
    {
      "type": "htmlSlide",
      "title": "💻 Görsel İnfografik",
      "htmlContent": "<div class='p-6 bg-slate-900 rounded-3xl text-white'>...</div>"
    }

---

### ÇIKTI FORMATI:
SADECE aşağıdaki JSON formatında yanıt ver (Markdown kod bloğu içinde veya saf JSON olarak):
{
  "explanation": "Öğretmenin isteğine göre ne üretildiğini açıklayan kısa cümle (Örn: Haccın yapılış aşamalarını içeren 5 adımlı interaktif süreç akışı ve defter notu oluşturuldu.)",
  "steps": [
    /* Üretilen 1 veya daha fazla LessonStep nesnesi */
  ]
}
`;

  try {
    const rawResponse = await runGeminiWithFallback({
      apiKey: resolvedKey,
      primaryModel: resolvedModel,
      prompt,
      generationConfig: {
        temperature: 0.3,
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
      console.error('[generateCustomPromptStep] JSON parse error:', parseErr, rawResponse);
      throw new Error('Yapay zeka yanıtı işlenirken JSON hatası oluştu.');
    }

    const stepsList: LessonStep[] = Array.isArray(parsedData?.steps)
      ? parsedData.steps
      : Array.isArray(parsedData)
      ? parsedData
      : parsedData?.step
      ? [parsedData.step]
      : [];

    if (stepsList.length === 0) {
      throw new Error('Yapay zekâ isteğinize uygun bir slayt adımı üretemedi. Lütfen isteğinizi biraz daha detaylandırın.');
    }

    // Ensure isPublished is true for all generated steps
    const finalizedSteps = stepsList.map(step => ({
      ...step,
      isPublished: true,
    }));

    return {
      steps: finalizedSteps,
      message: parsedData?.explanation || `${finalizedSteps.length} adet yeni ders adımı başarıyla üretildi.`,
    };
  } catch (error: any) {
    console.error('[generateCustomPromptStep] Generation failed:', error);
    throw new Error(error.message || 'Özel adım üretilirken bir hata meydana geldi.');
  }
}
