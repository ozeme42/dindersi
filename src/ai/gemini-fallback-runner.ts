'use server';

import { GoogleGenerativeAI, GenerationConfig } from '@google/generative-ai';

// 2026 Google Generative Language API active models
const FALLBACK_MODELS = [
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-flash-latest',
  'gemini-3.7-flash',
  'gemini-3.1-pro-preview',
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
  const genAI = new GoogleGenerativeAI(apiKey);
  
  const chosenPrimary = primaryModel || 'gemini-3.6-flash';
  const modelsToTry = [
    chosenPrimary,
    ...FALLBACK_MODELS.filter(m => m !== chosenPrimary)
  ];

  let lastError: any = null;

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
        return text;
      }
    } catch (err: any) {
      lastError = err;
      const errorMsg = err?.message || String(err);
      console.warn(`[Gemini Runner] Model '${modelName}' failed (${errorMsg}), trying next active model...`);
      
      // If API key itself is wrong, stop immediately
      if (errorMsg.includes('API_KEY_INVALID') || errorMsg.includes('API key not valid')) {
        throw new Error('Geçersiz Gemini API anahtarı. Lütfen Google AI Studio anahtarınızı kontrol edin.');
      }
    }
  }

  throw new Error(`Tüm yapay zeka modelleri denendi ancak Google AI yanıt vermedi: ${lastError?.message || 'Bilinmeyen hata'}`);
}
