'use client';

import type { LessonStep } from '@/lib/types';

interface CacheEntry {
  steps: LessonStep[];
  timestamp: number;
  expiresAt: number;
}

// In-memory cache for ultra-fast same-session navigation (0ms, no JSON.parse cost)
const memoryCache = new Map<string, CacheEntry>();

// Default cache duration: 12 hours (refreshes if older or if explicitly invalidated)
const DEFAULT_TTL_MS = 12 * 60 * 60 * 1000;
const CACHE_PREFIX = 'dd_flow_v2_';

/**
 * Retrieves cached lesson steps for a given topicId from in-memory or localStorage cache.
 */
export function getCachedSteps(topicId: string): LessonStep[] | null {
  if (!topicId) return null;

  const now = Date.now();

  // 1. Check memory cache first
  const mem = memoryCache.get(topicId);
  if (mem) {
    if (now < mem.expiresAt && Array.isArray(mem.steps) && mem.steps.length > 0) {
      return mem.steps;
    }
    memoryCache.delete(topicId);
  }

  // 2. Check localStorage (if in browser)
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${topicId}`);
    if (!raw) return null;

    const parsed: CacheEntry = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.steps) && parsed.steps.length > 0) {
      if (now < parsed.expiresAt) {
        // Hydrate memory cache
        memoryCache.set(topicId, parsed);
        return parsed.steps;
      } else {
        // Expired
        localStorage.removeItem(`${CACHE_PREFIX}${topicId}`);
      }
    }
  } catch (e) {
    console.warn(`[lesson-cache] Failed to read cache for ${topicId}:`, e);
  }

  return null;
}

/**
 * Caches lesson steps for a topicId both in-memory and in localStorage.
 */
export function setCachedSteps(
  topicId: string,
  steps: LessonStep[],
  ttlMs: number = DEFAULT_TTL_MS
): void {
  if (!topicId || !Array.isArray(steps) || steps.length === 0) return;

  const now = Date.now();
  const entry: CacheEntry = {
    steps,
    timestamp: now,
    expiresAt: now + ttlMs,
  };

  // 1. Save to in-memory cache
  memoryCache.set(topicId, entry);

  // 2. Save to localStorage
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`${CACHE_PREFIX}${topicId}`, JSON.stringify(entry));
    } catch (e) {
      try {
        pruneOldCaches();
        localStorage.setItem(`${CACHE_PREFIX}${topicId}`, JSON.stringify(entry));
      } catch {
        // Fallback: memory cache is still active
      }
    }
  }
}

/**
 * Invalidates and removes cached steps for a specific topic (e.g. when teacher updates).
 */
export function invalidateCachedSteps(topicId: string): void {
  if (!topicId) return;
  memoryCache.delete(topicId);
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(`${CACHE_PREFIX}${topicId}`);
    } catch (e) {
      // Ignore
    }
  }
}

/**
 * Clears all cached lesson flows.
 */
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

/**
 * Cleans expired or excess cache entries to prevent localStorage quota exhaustion.
 */
function pruneOldCaches(): void {
  if (typeof window === 'undefined') return;
  const now = Date.now();
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(CACHE_PREFIX)) {
      keys.push(k);
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
