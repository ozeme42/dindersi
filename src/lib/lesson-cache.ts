'use client';

import type { LessonStep } from '@/lib/types';

interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

// In-memory cache for ultra-fast same-session navigation (0ms, no JSON.parse cost)
const memoryCache = new Map<string, CacheEntry>();

// Default cache duration: 1 hour (refreshes if older or if explicitly invalidated)
const DEFAULT_TTL_MS = 60 * 60 * 1000;
const CACHE_PREFIX = 'dd_cache_v4_';

/**
 * Oyun veya harici interaktif etkinlik adımı mı?
 * Öğrenci akışında (didaktik / soru odaklı akışta) oyun adımları yer almaz.
 */
export const isGameStep = (step: any): boolean => {
  if (!step) return false;
  const type = String(step.type || '');
  if (type === 'activityLink' || type === 'anagramGame' || type === 'anagram' || type === 'kelimeDahasi' || type === 'game' || type === 'wordSearch') {
    return true;
  }
  const actType = String(step.activityType || '');
  if (actType.includes('/oyunlar/') || actType.includes('kelime-avi') || actType.includes('eslestirme')) {
    return true;
  }
  const url = String(step.url || '');
  if (url.includes('/oyunlar/')) {
    return true;
  }
  const titleStr = String(step.title || '');
  const labelStr = String(step.activityLabel || '');
  const combined = (titleStr + ' ' + labelStr).toLocaleLowerCase('tr-TR');
  if (titleStr.includes('🎮') || labelStr.includes('🎮')) {
    return true;
  }
  if (/oyun|kelime av|kavram av|kelime deha|etkinli|eşleştirme|eslestirme/i.test(combined)) {
    return true;
  }
  return false;
};

/**
 * Generic getter for cached data from in-memory or localStorage cache.
 */
export function getCachedData<T = any>(key: string): T | null {
  if (!key) return null;
  const now = Date.now();

  // 1. Check memory cache first
  const mem = memoryCache.get(key);
  if (mem) {
    if (now < mem.expiresAt && mem.data !== undefined && mem.data !== null) {
      return mem.data as T;
    }
    memoryCache.delete(key);
  }

  // 2. Check localStorage (if in browser)
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!raw) return null;

    const parsed: CacheEntry<T> = JSON.parse(raw);
    if (parsed && parsed.data !== undefined && parsed.data !== null) {
      if (now < parsed.expiresAt) {
        // Hydrate memory cache
        memoryCache.set(key, parsed);
        return parsed.data;
      } else {
        // Expired
        localStorage.removeItem(`${CACHE_PREFIX}${key}`);
      }
    }
  } catch (e) {
    console.warn(`[app-cache] Failed to read cache for ${key}:`, e);
  }

  return null;
}

/**
 * Generic setter for caching data both in-memory and in localStorage.
 */
export function setCachedData<T = any>(
  key: string,
  data: T,
  ttlMs: number = DEFAULT_TTL_MS
): void {
  if (!key || data === undefined || data === null) return;

  const now = Date.now();
  const entry: CacheEntry<T> = {
    data,
    timestamp: now,
    expiresAt: now + ttlMs,
  };

  // 1. Save to in-memory cache
  memoryCache.set(key, entry);

  // 2. Save to localStorage
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(entry));
    } catch (e) {
      try {
        pruneOldCaches();
        localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(entry));
      } catch {
        // Fallback: memory cache is still active
      }
    }
  }
}

/**
 * Invalidate a specific cached key.
 */
export function invalidateCachedData(key: string): void {
  if (!key) return;
  memoryCache.delete(key);
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(`${CACHE_PREFIX}${key}`);
    } catch (e) {
      // Ignore
    }
  }
}

// ═════════ STEP / FLOW SPECIFIC HELPERS ═════════

export function getCachedSteps(topicId: string): LessonStep[] | null {
  const steps = getCachedData<LessonStep[]>(`flow_${topicId}`);
  if (!steps || !Array.isArray(steps)) return null;
  // Öğrenci akışında oyun adımlarını ve yayında olmayan adımları anında filtrele
  return steps.filter(s => (s.isPublished ?? true) && !isGameStep(s));
}

export function setCachedSteps(
  topicId: string,
  steps: LessonStep[],
  ttlMs: number = DEFAULT_TTL_MS
): void {
  if (!steps || !Array.isArray(steps)) return;
  const cleanSteps = steps.filter(s => (s.isPublished ?? true) && !isGameStep(s));
  setCachedData<LessonStep[]>(`flow_${topicId}`, cleanSteps, ttlMs);
}

export function invalidateCachedSteps(topicId: string): void {
  invalidateCachedData(`flow_${topicId}`);
}

// ═════════ CLEANUP & UTILITIES ═════════

export function clearAllLessonCache(): void {
  memoryCache.clear();
  if (typeof window !== 'undefined') {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(CACHE_PREFIX)) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch (e) {
      // Ignore
    }
  }
}

function pruneOldCaches(): void {
  if (typeof window === 'undefined') return;
  const now = Date.now();
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith('dd_cache_')) {
      // Clean up legacy cache versions immediately (v1, v2, v3)
      if (k.startsWith('dd_cache_v1_') || k.startsWith('dd_cache_v2_') || k.startsWith('dd_cache_v3_')) {
        localStorage.removeItem(k);
        continue;
      }
      if (k.startsWith(CACHE_PREFIX)) {
        keys.push(k);
      }
    }
  }

  for (const k of keys) {
    try {
      const item = localStorage.getItem(k);
      if (item) {
        const parsed: CacheEntry = JSON.parse(item);
        if (now >= parsed.expiresAt) {
          localStorage.removeItem(k);
        }
      }
    } catch {
      localStorage.removeItem(k);
    }
  }
}
