'use server';

import { getAdminDb } from '@/lib/firebase-admin';

// In-memory cache for ultra-fast access
declare global {
  var __SYSTEM_GEMINI_API_KEY: string | undefined;
  var __SYSTEM_GEMINI_MODEL: string | undefined;
}

function normalizeModel(m?: string): string {
  let trimmed = (m || '').trim();
  if (!trimmed || trimmed.startsWith('gemini-3.') || trimmed.includes('gemini-3')) {
    return 'gemini-1.5-flash';
  }
  return trimmed;
}

/**
 * Saves Gemini API Key and Model configuration globally to the system (Firestore + In-Memory).
 */
export async function saveSystemAiConfigAction(config: { apiKey?: string; modelName?: string }) {
  try {
    const trimmedKey = config.apiKey ? config.apiKey.trim() : '';
    const trimmedModel = normalizeModel(config.modelName);

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
        modelName: normalizeModel(globalThis.__SYSTEM_GEMINI_MODEL),
      };
    }

    const db = getAdminDb();
    const doc = await db.collection('settings').doc('ai_config').get();
    if (doc.exists) {
      const data = doc.data();
      const apiKey = data?.geminiApiKey || '';
      const modelName = normalizeModel(data?.selectedModel);
      if (apiKey) globalThis.__SYSTEM_GEMINI_API_KEY = apiKey;
      if (modelName) globalThis.__SYSTEM_GEMINI_MODEL = modelName;
      return { apiKey, modelName };
    }
  } catch (error) {
    console.warn('Could not read system AI config from Firestore, fallback to env/memory:', error);
  }

  return {
    apiKey: globalThis.__SYSTEM_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '',
    modelName: normalizeModel(globalThis.__SYSTEM_GEMINI_MODEL),
  };
}

/**
 * Resolves the final active API Key and Model to be used for a generation request.
 */
export async function resolveActiveGeminiConfig(overrides?: { apiKey?: string; modelName?: string }) {
  let key = overrides?.apiKey?.trim();
  let model = normalizeModel(overrides?.modelName);

  if (!key) {
    try {
      const sysConfig = await getSystemAiConfigAction();
      key = sysConfig.apiKey;
      if (!overrides?.modelName) model = normalizeModel(sysConfig.modelName);
    } catch (e) {
      console.warn('[resolveActiveGeminiConfig] Failed to get system config:', e);
    }
  }

  if (!key) {
    key = process.env.GEMINI_API_KEY || '';
  }

  return { apiKey: key, modelName: model };
}
