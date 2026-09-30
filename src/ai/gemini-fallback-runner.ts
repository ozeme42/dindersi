'use server';

import { GoogleGenerativeAI, GenerationConfig } from '@google/generative-ai';

// Google Generative Language API doğrulanmış ve aktif çalışan modelleri (Öncelik ve başarı sıralamasına göre)
export const ACTIVE_GEMINI_FALLBACK_MODELS = [
  // 1. En Kararlı & Hızlı Ana Model (Anında yanıt veren, tam kararlı)
  'gemini-3.6-flash',

  // 2. En Yeni Nesil Flash Modeli
  'gemini-3.8-flash',

  // 3. Yüksek Hızlı & Dengeli Modeller
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',

  // 4. Otomatik Güncel ve Hibrit Modeller
  'gemini-flash-latest',
  'gemini-3.7-flash',
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
  
  const chosenPrimary = (primaryModel || 'gemini-3.6-flash').trim();

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
  const attemptedFailures: { model: string; errorMsg: string; isQuota: boolean; isHighDemand: boolean }[] = [];

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

      const isHighDemand =
        errorMsg.includes('503') ||
        errorMsg.toLowerCase().includes('high demand') ||
        errorMsg.toLowerCase().includes('service unavailable');

      const nextModel = modelsToTry[i + 1];
      attemptedFailures.push({ model: modelName, errorMsg, isQuota, isHighDemand });

      const reason = isQuota 
        ? 'KOTASI DOLDU (429)' 
        : isHighDemand 
          ? 'SUNUCU YOĞUN (503)' 
          : 'yanıt vermedi';

      console.warn(
        `[Gemini Fallback] Model '${modelName}' ${reason}. ` +
        (nextModel ? `Sıradaki modele geçiliyor: '${nextModel}'...` : 'Tüm alternatif modeller tüketildi.')
      );
    }
  }

  // Tüm modeller denendiyse:
  const quotaFailures = attemptedFailures.filter(f => f.isQuota);
  const demandFailures = attemptedFailures.filter(f => f.isHighDemand);

  if (quotaFailures.length > 0) {
    throw new Error(
      `Tüm yapay zekâ modelleri sırayla denendi ancak modellerin dakikalık kota sınırına ulaşıldı. ` +
      `Lütfen 1 dakika bekleyip tekrar deneyin veya farklı bir API anahtarı kullanın.`
    );
  }

  if (demandFailures.length > 0) {
    throw new Error(
      `Google Gemini sunucuları şu an geçici yoğunluk yaşıyor (503). ` +
      `Lütfen 30 saniye sonra tekrar deneyin.`
    );
  }

  throw new Error(
    `Tüm yapay zeka modelleri (${modelsToTry.length} model) sırayla denendi ancak yanıt alınamadı. ` +
    `Son hata: ${lastError?.message || 'Bilinmeyen hata'}`
  );
}
