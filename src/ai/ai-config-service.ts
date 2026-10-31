'use server';

import { getAdminDb } from '@/lib/firebase-admin';

// In-memory cache for ultra-fast access
declare global {
  var __SYSTEM_GEMINI_API_KEY: string | undefined;
  var __SYSTEM_GEMINI_MODEL: string | undefined;
}

/**
 * Saves Gemini API Key and Model configuration globally to the system (Firestore + In-Memory).
 */
export async function saveSystemAiConfigAction(config: { apiKey?: string; modelName?: string }) {
  try {
    const trimmedKey = config.apiKey ? config.apiKey.trim() : '';
    const trimmedModel = config.modelName ? config.modelName.trim() : 'gemini-3.6-flash';

    globalThis.__SYSTEM_GEMINI_API_KEY = trimmedKey || undefined;
    globalThis.__SYSTEM_GEMINI_MODEL = trimmedModel;

    const db = getAdminDb();
    await db.collection('settings').doc('ai_config').set({
      geminiApiKey: trimmedKey,
      selectedModel: trimmedModel,
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    return { 
      success: true, 
      message: trimmedKey 
        ? 'Gemini API anahtarı sisteme kalıcı olarak kaydedildi. Artık tüm AI işlemleri bu anahtarı kullanacak.' 
        : 'Sistem varsayılan anahtarına geri dönüldü.' 
    };
  } catch (error: any) {
    console.error('Error saving system AI config to Firestore:', error);
    // In-memory fallback is still active
    return { success: true, message: 'API Anahtarı sunucu belleğine başarıyla kaydedildi.' };
  }
}

/**
 * Retrieves the currently saved system Gemini API Key and Model.
 */
export async function getSystemAiConfigAction(): Promise<{ apiKey: string; modelName: string }> {
  try {
    if (globalThis.__SYSTEM_GEMINI_API_KEY) {
      return {
        apiKey: globalThis.__SYSTEM_GEMINI_API_KEY,
        modelName: globalThis.__SYSTEM_GEMINI_MODEL || 'gemini-3.6-flash',
      };
    }

    const db = getAdminDb();
    const doc = await db.collection('settings').doc('ai_config').get();
    if (doc.exists) {
      const data = doc.data();
      const apiKey = data?.geminiApiKey || '';
      const modelName = data?.selectedModel || 'gemini-3.6-flash';
      if (apiKey) globalThis.__SYSTEM_GEMINI_API_KEY = apiKey;
      if (modelName) globalThis.__SYSTEM_GEMINI_MODEL = modelName;
      return { apiKey, modelName };
    }
  } catch (error) {
    console.warn('Could not read system AI config from Firestore, fallback to env/memory:', error);
  }

  return {
    apiKey: globalThis.__SYSTEM_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '',
    modelName: globalThis.__SYSTEM_GEMINI_MODEL || 'gemini-3.6-flash',
  };
}

/**
 * Resolves the final active API Key and Model to be used for a generation request.
 */
export async function resolveActiveGeminiConfig(overrides?: { apiKey?: string; modelName?: string }) {
  let key = overrides?.apiKey?.trim();
  let model = overrides?.modelName?.trim();

  if (!key) {
    try {
      const sysConfig = await getSystemAiConfigAction();
      key = sysConfig.apiKey;
      if (!model) model = sysConfig.modelName;
    } catch (e) {
      console.warn('[resolveActiveGeminiConfig] Failed to get system config:', e);
    }
  }

  if (!key) {
    key = process.env.GEMINI_API_KEY || '';
  }

  if (!model) {
    model = 'gemini-3.6-flash';
  }

  return { apiKey: key, modelName: model };
}

/**
 * Tests connection with Google Gemini using the active or provided API Key.
 */
export async function testGeminiConnectionAction(apiKeyInput?: string, modelNameInput?: string): Promise<{ success: boolean; modelUsed?: string; message: string }> {
  try {
    const resolved = await resolveActiveGeminiConfig({ apiKey: apiKeyInput, modelName: modelNameInput });
    const cleanKey = (resolved.apiKey || '').trim().replace(/^["']|["']$/g, '');
    if (!cleanKey) {
      return { 
        success: false, 
        message: 'API anahtarı bulunamadı. Lütfen Google AI Studio (aistudio.google.com) üzerinden aldığınız API anahtarınızı girin.' 
      };
    }

    const { runGeminiWithFallback } = await import('@/ai/gemini-fallback-runner');
    const result = await runGeminiWithFallback({
      apiKey: cleanKey,
      primaryModel: resolved.modelName || 'gemini-3.6-flash',
      prompt: 'Ping. Yanıt olarak sadece "OK" yaz.',
    });

    if (result && result.trim().length > 0) {
      return { 
        success: true, 
        modelUsed: resolved.modelName || 'gemini-3.6-flash',
        message: 'Google Gemini bağlantısı başarılı! API anahtarınız aktif ve sorunsuz çalışıyor.' 
      };
    }
    return { success: false, message: 'Google Gemini sunucusundan yanıt alınamadı.' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Bağlantı testi başarısız oldu.' };
  }
}
