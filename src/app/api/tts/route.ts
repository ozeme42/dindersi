import { NextRequest, NextResponse } from 'next/server';
import { synthesizeTurkishSpeechWav } from '@/ai/flows/text-to-speech-flow';

// Sunucu tarafı bellek içi ses önbelleği (sınıftaki tekrar oynatımlarda 0ms yanıt)
const MAX_CACHE_ENTRIES = 120;
const ttsMemoryCache = new Map<string, Buffer>();

function getCachedWav(key: string): Buffer | undefined {
  const existing = ttsMemoryCache.get(key);
  if (!existing) return undefined;
  // LRU tazeleme
  ttsMemoryCache.delete(key);
  ttsMemoryCache.set(key, existing);
  return existing;
}

function setCachedWav(key: string, buf: Buffer) {
  if (ttsMemoryCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = ttsMemoryCache.keys().next().value;
    if (oldestKey) ttsMemoryCache.delete(oldestKey);
  }
  ttsMemoryCache.set(key, buf);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const rawText = typeof body?.text === 'string' ? body.text.trim() : '';
    const voiceName = typeof body?.voiceName === 'string' ? body.voiceName.trim() : 'Aoede';

    if (!rawText) {
      return NextResponse.json({ error: 'Okunacak metin boş olamaz.' }, { status: 400 });
    }

    const cleanText = rawText.slice(0, 3500);
    const cacheKey = `${voiceName}::${cleanText}`;
    const cached = getCachedWav(cacheKey);
    if (cached) {
      return new NextResponse(new Uint8Array(cached), {
        status: 200,
        headers: {
          'Content-Type': 'audio/wav',
          'Cache-Control': 'public, max-age=86400',
          'X-TTS-Cache': 'HIT',
        },
      });
    }

    const wavBuffer = await synthesizeTurkishSpeechWav(cleanText, voiceName);
    setCachedWav(cacheKey, wavBuffer);

    return new NextResponse(new Uint8Array(wavBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'audio/wav',
        'Cache-Control': 'public, max-age=86400',
        'X-TTS-Cache': 'MISS',
      },
    });
  } catch (error: any) {
    const code = error?.code || 'TTS_FAILED';
    const status = code === 'NO_API_KEY' ? 503 : code === 'QUOTA' ? 429 : 500;
    return NextResponse.json(
      {
        errorCode: code,
        error: error?.message || 'Ses üretilemedi.',
      },
      { status }
    );
  }
}
