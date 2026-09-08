'use server';

/**
 * @fileOverview AI-powered Natural Language Prompt-to-LessonStep generator.
 * Converts teacher's open-ended prompts (e.g. "Haccın yapılışını adım adım gösteren süreç akışı ekle"
 * or "Salli barik konusunda duanın kelimeleriyle sıralama etkinliği oluştur")
 * into valid, high-contrast, interactive LessonStep objects or rich interactive HTML widgets.
 */

import { z } from 'zod';
import { resolveActiveGeminiConfig } from '@/ai/ai-config-service';
import { runGeminiWithFallback } from '@/ai/gemini-fallback-runner';
import type { LessonStep } from '@/lib/types';

export type GenerateCustomPromptStepInput = {
  userPrompt: string; // Öğretmenin doğal dildeki isteği
  topicTitle?: string; // Konu Başlığı
  sourceText?: string; // Kaynak Metin / Ders Kitabı Özeti
  apiKey?: string;
  modelName?: string;
};

export type GenerateCustomPromptStepOutput = {
  steps: LessonStep[];
  message: string;
};

function generateFallbackInteractiveSlide(title: string): string {
  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;700;800;900&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; }
  </style>
</head>
<body class="bg-slate-950 text-white min-h-screen flex flex-col items-center justify-center p-4 select-none">
  <div class="w-full max-w-4xl bg-slate-900/90 border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-xl flex flex-col items-center text-center">
    <div class="inline-flex items-center gap-2 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider mb-4">
      <span>✨ İnteraktif Dua Sıralama Etkinliği</span>
    </div>
    <h1 class="text-2xl md:text-3xl font-black text-white mb-2">${title}</h1>
    <p class="text-xs md:text-sm text-slate-400 max-w-lg mb-6">
      Aşağıdaki kelimelere doğru sırayla dokunarak duayı tamamlayın.
    </p>

    <div id="targetBox" class="w-full min-h-[90px] md:min-h-[110px] bg-slate-950/80 border-2 border-dashed border-indigo-500/30 rounded-2xl p-4 flex flex-wrap items-center justify-center gap-2 mb-6">
      <span id="placeholderText" class="text-slate-500 text-sm font-medium italic">Kelimelere sırayla dokunun...</span>
    </div>

    <div id="bankBox" class="w-full flex flex-wrap items-center justify-center gap-2.5 mb-6"></div>

    <div id="feedbackBox" class="hidden text-sm font-black mb-4 px-6 py-3 rounded-2xl"></div>

    <div class="flex items-center gap-3">
      <button id="undoBtn" class="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer">Geri Al</button>
      <button id="resetBtn" class="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer">Sıfırla</button>
      <button id="checkBtn" class="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-lg shadow-emerald-950/50 transition-all cursor-pointer">Kontrol Et</button>
    </div>
  </div>

  <script>
    const correctWords = ["Allahümme", "salli", "alâ", "Muhammedin", "ve", "alâ", "âli", "Muhammed,", "kemâ", "salleyte", "alâ", "İbrâhîme", "ve", "alâ", "âli", "İbrâhîm,", "inneke", "hamîdün", "mecîd."];
    let bankWords = [...correctWords].map((word, id) => ({ id, word })).sort(() => Math.random() - 0.5);
    let chosenWords = [];

    const targetBox = document.getElementById('targetBox');
    const bankBox = document.getElementById('bankBox');
    const placeholderText = document.getElementById('placeholderText');
    const feedbackBox = document.getElementById('feedbackBox');

    const colors = [
      'bg-indigo-600 border-indigo-400 text-white',
      'bg-cyan-600 border-cyan-400 text-white',
      'bg-purple-600 border-purple-400 text-white',
      'bg-emerald-600 border-emerald-400 text-white',
      'bg-amber-600 border-amber-400 text-white',
      'bg-rose-600 border-rose-400 text-white'
    ];

    function render() {
      bankBox.innerHTML = '';
      targetBox.innerHTML = '';

      if (chosenWords.length === 0) {
        targetBox.appendChild(placeholderText);
      } else {
        chosenWords.forEach((item, idx) => {
          const pill = document.createElement('button');
          pill.className = 'px-3.5 py-2 rounded-xl text-xs md:text-sm font-black border shadow-md transition-all ' + colors[item.id % colors.length];
          pill.textContent = item.word;
          pill.onclick = () => removeWord(idx);
          targetBox.appendChild(pill);
        });
      }

      bankWords.forEach((item) => {
        const pill = document.createElement('button');
        pill.className = 'px-3.5 py-2 rounded-xl text-xs md:text-sm font-black border shadow-md hover:scale-105 active:scale-95 transition-all ' + colors[item.id % colors.length];
        pill.textContent = item.word;
        pill.onclick = () => addWord(item);
        bankBox.appendChild(pill);
      });
    }

    function addWord(item) {
      bankWords = bankWords.filter(w => w.id !== item.id);
      chosenWords.push(item);
      feedbackBox.className = 'hidden';
      render();
    }

    function removeWord(idx) {
      const removed = chosenWords.splice(idx, 1)[0];
      bankWords.push(removed);
      feedbackBox.className = 'hidden';
      render();
    }

    document.getElementById('undoBtn').onclick = () => {
      if (chosenWords.length > 0) {
        const removed = chosenWords.pop();
        bankWords.push(removed);
        feedbackBox.className = 'hidden';
        render();
      }
    };

    document.getElementById('resetBtn').onclick = () => {
      bankWords = [...correctWords].map((word, id) => ({ id, word })).sort(() => Math.random() - 0.5);
      chosenWords = [];
      feedbackBox.className = 'hidden';
      render();
    };

    document.getElementById('checkBtn').onclick = () => {
      const current = chosenWords.map(w => w.word).join(' ');
      const target = correctWords.join(' ');
      if (current === target) {
        feedbackBox.className = 'text-sm font-black mb-4 px-6 py-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 block shadow-lg shadow-emerald-950/50';
        feedbackBox.textContent = '🎉 Harika! Salli duasını kusursuz ve doğru sırada tamamladınız!';
      } else {
        feedbackBox.className = 'text-sm font-black mb-4 px-6 py-3 rounded-2xl bg-rose-500/20 border border-rose-500/50 text-rose-300 block';
        feedbackBox.textContent = '❌ Sıralamada bazı yanlışlar var. Kelimelere tıklayarak geri alabilir ve tekrar deneyebilirsiniz.';
      }
    };

    render();
  </script>
</body>
</html>`;
}

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

🔴 EN KATI VE DEĞİŞMEZ KURAL: KAYNAK METNE KESİN VE MUTLAK BAĞLILIK (ZERO HALLUCINATION)
1. SADECE ve SADECE aşağıda verilen "KAYNAK METİN" içerisindeki bilgileri, terimleri, hükümleri, açıklamaları ve maddeleri esas alacaksın.
2. Kaynak metinde GEÇMEYEN hiçbir bilgiyi kafana göre UYDURMAYACAKSIN, eklemeyeceksin ve konunun dışına çıkmayacaksın.
3. Öğretmenin isteği ne olursa olsun (süreç şeması, kategori tablosu, defter notu, kavramlar, test/soru, infografik, etkinlik, sıralama), metindeki gerçek cümle ve verileri ayıklayıp pedagojik olarak o slayt formatına dökeceksin.
4. Kaynak metin girilmemişse, yalnızca MEB Din Kültürü müfredatındaki kesin, net ve tartışmasız doğruları (Dua, Ayet, Hadis, Farzlar vb.) temel alacaksın.

=== DERS / KONU BAŞLIĞI ===
"${input.topicTitle || 'Din Kültürü ve Ahlak Bilgisi'}"

=== KAYNAK METİN (KESİN VE TEK BİLGİ KAYNAĞI) ===
${input.sourceText ? `"""\n${input.sourceText}\n"""` : 'Kaynak metin belirtilmedi, konunun MEB müfredatındaki standart bilgilerini temel al.'}

=== ÖĞRETMENİN ÖZEL İSTEĞİ ===
"${input.userPrompt}"

---

### DİNDERSİ ADIM TÜRLERİ VE JSON ŞEMALARI (İsteğe en uygun olanı seç veya birleştir):

1. **processFlow (Süreç / Yol Haritası / Aşamalar):**
   * Kullanım: Bir sürecin, ibadetin yapılışının veya tarihsel olayın aşamaları (Örn: Haccın Yapılışı, Abdestin Alınışı).
   * JSON:
   {
     "type": "processFlow",
     "title": "🪜 Haccın Yapılış Aşamaları",
     "steps": [
       { "stepNumber": 1, "title": "1. İhrama Girme & Niyet", "description": "Mikat sınırında ihrama girilir ve hacca niyet edilir." },
       { "stepNumber": 2, "title": "2. Arafat Vakfesi", "description": "Arefe günü Arafat'ta vakfe yapılarak dua edilir (Farz)." }
     ]
   }

2. **categoryTable (Kategori & Sınıflandırma Tablosu):**
   * Kullanım: Konuyu gruplara veya hükümlere ayıran tablo (Örn: Farz/Vacip/Sünnet).
   * JSON:
   {
     "type": "categoryTable",
     "title": "📊 Hükümlerine Göre Namazlar",
     "tableTitle": "Namaz Çeşitleri ve Hükümleri",
     "description": "Namazlar dinî bağlayıcılıklarına göre üç ana grupta incelenir.",
     "categories": [
       { "name": "Farz Namazlar", "badge": "Kesin Emir", "color": "emerald", "items": ["5 Vakit Namaz", "Cuma Namazı"] }
     ]
   }

3. **conceptMatrix (4 Boyutta Konu Analizi):**
   * JSON:
   {
     "type": "conceptMatrix",
     "title": "🔲 4 Boyutta Zekât İbadeti",
     "topicName": "Zekât ve Sadaka",
     "quadrants": [
       { "label": "1. Nedir? (Tanım)", "content": "..." },
       { "label": "2. Niçin Önemlidir? (Amaç)", "content": "..." },
       { "label": "3. Nasıl Uygulanır? (Pratik)", "content": "..." },
       { "label": "4. Bize Ne Kazandırır? (Fayda)", "content": "..." }
     ]
   }

4. **notebookNote (Defterimize Yazalım - Özet Defter Notu):**
   * JSON:
   {
     "type": "notebookNote",
     "title": "✏️ Defterimize Yazalım",
     "noteTitle": "Önemli Kurallar",
     "notes": ["1. Madde...", "2. Madde..."],
     "suggestedMinutes": 3
   }

5. **sentenceScramble (Cümle & Kelime Sıralama Adımı):**
   * Kullanım: Bir cümlenin veya duanın kelimelerini sıraya dizme oyunu.
   * KURAL: 'correctSentence' ve 'scrambledSentence' alanlarının İKİSİ DE ZORUNLUDUR!
   * JSON:
   {
     "type": "sentenceScramble",
     "title": "🧩 Salli Duası Kelime Sıralama",
     "correctSentence": "Allahümme salli alâ Muhammedin ve alâ âli Muhammed",
     "scrambledSentence": "Muhammed alâ salli Allahümme Muhammedin ve alâ âli"
   }

6. **htmlSlide (ÖZEL İNTERAKTİF HTML ETKİNLİK / OYUN / SLAYT):**
   * Kullanım: Öğretmen özel bir "etkinlik", "oyun", "kelime sıralama etkinliği", "dua sıralama oyunu", "interaktif html" veya zengin görsel slayt istediğinde.
   * KURAL: Sadece statik yazı değil; öğrencinin akıllı tahtada butonlara tıklayarak kelimeleri sıraya dizebildiği, 'Geri Al', 'Sıfırla' ve 'Kontrol Et' butonları olan, doğru yapıldığında tebrik eden, Tailwind CSS ve <script> içindeki eksiksiz JavaScript kodlarıyla ÇALIŞAN bir HTML widget'ı üret!
   * JSON:
   {
     "type": "htmlSlide",
     "title": "🧩 Salli ve Barik Duaları İnteraktif Sıralama Etkinliği",
     "htmlContent": "<!DOCTYPE html><html lang='tr'><head><meta charset='UTF-8'><script src='https://cdn.tailwindcss.com'></script></head><body class='bg-slate-950 text-white p-6 flex flex-col items-center justify-center'>... Tam çalışan tıklamalı/sıralamalı JavaScript ve Tailwind CSS kodları ...</body></html>"
   }

7. **mcq (Çoktan Seçmeli Test Sorusu):**
   {
     "type": "mcq",
     "title": "❓ Kontrol Sorusu",
     "question": "Soru metni?",
     "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
     "correctAnswer": "A) ..."
   }

8. **trueFalseList (Doğru / Yanlış Alıştırması):**
   {
     "type": "trueFalseList",
     "title": "✓/✗ Doğru - Yanlış Alıştırması",
     "questions": [
       { "statement": "İfade...", "isTrue": true }
     ]
   }

---

### ÇIKTI FORMATI:
SADECE aşağıdaki JSON formatında yanıt ver:
{
  "explanation": "Öğretmenin isteğine göre ne üretildiğini açıklayan kısa cümle",
  "steps": [
    /* Üretilen LessonStep nesneleri */
  ]
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
      console.error('[generateCustomPromptStep] JSON parse error:', parseErr, rawResponse);
      throw new Error('Yapay zeka yanıtı işlenirken JSON hatası oluştu.');
    }

    const stepsList: any[] = Array.isArray(parsedData?.steps)
      ? parsedData.steps
      : Array.isArray(parsedData)
      ? parsedData
      : parsedData?.step
      ? [parsedData.step]
      : [];

    if (stepsList.length === 0) {
      throw new Error('Yapay zekâ isteğinize uygun bir slayt adımı üretemedi. Lütfen isteğinizi biraz daha detaylandırın.');
    }

    // Ensure isPublished and enrich/heal steps
    const finalizedSteps: LessonStep[] = stepsList.map(step => {
      const enhanced: any = { ...step, isPublished: true };

      // 1. SentenceScramble auto-healing
      if (enhanced.type === 'sentenceScramble') {
        let correct = (enhanced.correctSentence || enhanced.sentence || '').trim();
        let scrambled = (enhanced.scrambledSentence || enhanced.scrambled || '').trim();

        if (!correct && scrambled) correct = scrambled;
        if (!scrambled && correct) {
          scrambled = correct.split(/\s+/).filter(Boolean).sort(() => Math.random() - 0.5).join(' ');
        }
        if (!correct) {
          correct = 'Allahümme salli alâ Muhammedin ve alâ âli Muhammed';
          scrambled = 'Muhammed alâ salli Allahümme Muhammedin ve alâ âli';
        }

        enhanced.correctSentence = correct;
        enhanced.scrambledSentence = scrambled;
      }

      // 2. AnagramStep auto-healing
      if (enhanced.type === 'anagram' || enhanced.type === 'anagramGame') {
        if (enhanced.type === 'anagram') {
          if (!enhanced.correctAnswer && enhanced.word) enhanced.correctAnswer = enhanced.word;
          if (!enhanced.scrambledWord && enhanced.correctAnswer) {
            enhanced.scrambledWord = enhanced.correctAnswer.split('').sort(() => Math.random() - 0.5).join('');
          }
        }
      }

      // 3. HtmlSlide auto-healing (never allow empty HTML)
      if (enhanced.type === 'htmlSlide') {
        if (!enhanced.htmlContent || enhanced.htmlContent.trim().length < 20) {
          enhanced.htmlContent = generateFallbackInteractiveSlide(enhanced.title || input.topicTitle || 'Dua Sıralama Etkinliği');
        }
      }

      return enhanced as LessonStep;
    });

    return {
      steps: finalizedSteps,
      message: parsedData?.explanation || `${finalizedSteps.length} adet yeni ders adımı başarıyla üretildi.`,
    };
  } catch (error: any) {
    console.error('[generateCustomPromptStep] Generation failed:', error);
    throw new Error(error.message || 'Özel adım üretilirken bir hata meydana geldi.');
  }
}
