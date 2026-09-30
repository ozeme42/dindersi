'use server';

import { GoogleGenerativeAI, GenerationConfig } from '@google/generative-ai';

// Google Generative Language API en yeni ve aktif modelleri (Öncelik ve başarı sıralamasına göre)
export const ACTIVE_GEMINI_FALLBACK_MODELS = [
  // 1. En Yeni 2026 Gemini 3.8 Serisi (Öncelikli & En Hızlı)
  'gemini-3.8-flash',
  'gemini-3.8-flash-lite',
  'gemini-3.8-pro',

  // 2. Gemini 3.6 & 3.5 Serisi (Yüksek Verimli İş Gücü Modelleri)
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',

  // 3. Gemini 3.1 & 3.7 Serisi (Akıl Yürütme ve Hibrit Modeller)
  'gemini-3.1-pro',
  'gemini-3.1-flash-lite',
  'gemini-3.7-flash',
  'gemini-flash-latest',

  // 4. Gemini 2.5 & 2.0 & 1.5 Yedek Havuzu (Geriye Dönük Kota Güvencesi)
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
  'gemini-1.5-pro',
  'gemini-2.0-pro-exp-02-05',
];

export async function runGeminiWithFallback({
  apiKey,
  primaryModel,
  prompt,
  generationConfig,
}: {
  apiKey: string;
  primaryModel?: string;
  prompt: string;
  generationConfig?: GenerationConfig;
}): Promise<string> {
  const cleanKey = (apiKey || '').trim();
  if (!cleanKey) {
    throw new Error('Gemini API anahtarı bulunamadı. Lütfen AI ayarlarından Google AI Studio API anahtarınızı girin.');
  }

  const genAI = new GoogleGenerativeAI(cleanKey);
  
  const chosenPrimary = (primaryModel || 'gemini-3.8-flash').trim();

  // Model deneme sırası: Önce kullanıcının seçtiği model, ardından sırasıyla tüm alternatif modeller
  const uniqueModels: string[] = [];
  const seen = new Set<string>();

  const addModel = (m: string) => {
    const trimmed = (m || '').trim();
    if (trimmed && !seen.has(trimmed.toLowerCase())) {
      seen.add(trimmed.toLowerCase());
      uniqueModels.push(trimmed);
    }
  };

  if (chosenPrimary) {
    addModel(chosenPrimary);
  }

  for (const m of ACTIVE_GEMINI_FALLBACK_MODELS) {
    addModel(m);
  }

  const modelsToTry = uniqueModels;
  let lastError: any = null;
  const attemptedFailures: { model: string; errorMsg: string; isQuota: boolean }[] = [];

  for (let i = 0; i < modelsToTry.length; i++) {
    const modelName = modelsToTry[i];
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig,
      });

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      if (text && text.trim().length > 0) {
        if (i > 0) {
          console.info(
            `[Gemini Fallback] Başarılı! '${modelsToTry[0]}' modeli yerine '${modelName}' modeli içeriği başarıyla üretti.`
          );
        }
        return text;
      }
    } catch (err: any) {
      lastError = err;
      const errorMsg = err?.message || String(err);
      
      // Eğer API anahtarı tamamen geçersizse, başka modelleri denemeden doğrudan bildir
      if (
        errorMsg.includes('API_KEY_INVALID') || 
        errorMsg.includes('API key not valid') ||
        errorMsg.includes('API_KEY_NOT_VALID')
      ) {
        throw new Error('Geçersiz Gemini API anahtarı. Lütfen Google AI Studio anahtarınızı kontrol edin.');
      }

      const isQuota = 
        errorMsg.includes('429') || 
        errorMsg.includes('RESOURCE_EXHAUSTED') || 
        errorMsg.toLowerCase().includes('quota') ||
        errorMsg.toLowerCase().includes('rate limit');

      const nextModel = modelsToTry[i + 1];
      attemptedFailures.push({ model: modelName, errorMsg, isQuota });

      console.warn(
        `[Gemini Fallback] Model '${modelName}' ${isQuota ? 'KOTASI DOLDU (429)' : 'yanıt vermedi'}. ` +
        (nextModel ? `Sıradaki modele geçiliyor: '${nextModel}'...` : 'Tüm alternatif modeller tüketildi.')
      );
    }
  }

  // Tüm modeller denendiyse:
  const quotaFailures = attemptedFailures.filter(f => f.isQuota);
  if (quotaFailures.length > 0) {
    throw new Error(
      `Tüm yapay zekâ modelleri (${modelsToTry.length} model) denendi ancak modellerin kota sınırına ulaşıldı. ` +
      `Lütfen 1-2 dakika bekleyip tekrar deneyin veya AI ayarlarından farklı bir API anahtarı girin.`
    );
  }

  throw new Error(
    `Tüm yapay zeka modelleri (${modelsToTry.length} model) sırayla denendi ancak yanıt alınamadı. ` +
    `Son hata: ${lastError?.message || 'Bilinmeyen hata'}`
  );
}
