/**
 * @fileoverview A Genkit flow for converting Turkish text into studio neural human speech.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import wav from 'wav';
import { googleAI } from '@genkit-ai/googleai';
import { resolveActiveGeminiConfig } from '@/ai/ai-config-service';

const ALLOWED_VOICES = ['Aoede', 'Kore', 'Orus', 'Charon', 'Leda', 'Puck', 'Fenrir', 'Zephyr'] as const;

const TextToSpeechInputSchema = z.object({
  text: z.string().min(1, 'Metin boş olamaz.').max(3500),
  voiceName: z.string().optional(),
});
export type TextToSpeechInput = z.infer<typeof TextToSpeechInputSchema>;

const TextToSpeechOutputSchema = z.object({
  audioDataUri: z.string(),
});
export type TextToSpeechOutput = z.infer<typeof TextToSpeechOutputSchema>;

async function pcmToWavBuffer(pcmData: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const writer = new wav.Writer({
      channels: 1,
      sampleRate: 24000,
      bitDepth: 16,
    });

    const chunks: Buffer[] = [];
    writer.on('data', (chunk: Buffer) => chunks.push(chunk));
    writer.on('end', () => resolve(Buffer.concat(chunks)));
    writer.on('error', reject);
    writer.end(pcmData);
  });
}

function normalizeVoiceName(requested?: string): (typeof ALLOWED_VOICES)[number] {
  if (requested && (ALLOWED_VOICES as readonly string[]).includes(requested)) {
    return requested as (typeof ALLOWED_VOICES)[number];
  }
  return 'Aoede';
}

export async function synthesizeTurkishSpeechWav(rawText: string, voiceName?: string): Promise<Buffer> {
  const text = rawText.trim().slice(0, 3500);
  if (!text) {
    throw new Error('Metin boş olamaz.');
  }

  const resolved = await resolveActiveGeminiConfig();
  const cleanKey = (resolved.apiKey || '').trim().replace(/^["']|["']$/g, '');
  if (!cleanKey) {
    const err = new Error('Gemini API anahtarı bulunamadı.');
    (err as any).code = 'NO_API_KEY';
    throw err;
  }

  const chosenVoice = normalizeVoiceName(voiceName);
  const modelsToTry = ['gemini-2.5-flash-preview-tts', 'gemini-2.5-pro-preview-tts'] as const;
  let lastError: any = null;

  for (const modelName of modelsToTry) {
    try {
      const { media } = await ai.generate({
        model: googleAI.model(modelName),
        prompt: text,
        config: {
          apiKey: cleanKey,
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: chosenVoice,
              },
            },
          },
        },
      });

      if (!media?.url) {
        throw new Error('Yapay zeka ses verisi döndürmedi.');
      }

      const commaIdx = media.url.indexOf(',');
      const base64Payload = commaIdx !== -1 ? media.url.slice(commaIdx + 1) : media.url;
      const rawBuffer = Buffer.from(base64Payload, 'base64');

      // Zaten RIFF/WAV başlığı taşıyorsa tekrar başlık sarmalama
      if (rawBuffer.length >= 4 && rawBuffer.subarray(0, 4).toString('ascii') === 'RIFF') {
        return rawBuffer;
      }

      return await pcmToWavBuffer(rawBuffer);
    } catch (err: any) {
      lastError = err;
      const msg = String(err?.message || err);
      if (
        msg.includes('API_KEY_INVALID') ||
        msg.includes('API key not valid') ||
        msg.includes('API_KEY_NOT_VALID')
      ) {
        (err as any).code = 'INVALID_API_KEY';
        throw err;
      }
      if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.toLowerCase().includes('quota')) {
        (err as any).code = 'QUOTA';
        throw err;
      }
    }
  }

  throw lastError || new Error('Metin sese dönüştürülemedi.');
}

export const textToSpeechFlow = ai.defineFlow(
  {
    name: 'textToSpeechFlow',
    inputSchema: TextToSpeechInputSchema,
    outputSchema: TextToSpeechOutputSchema,
  },
  async ({ text, voiceName }) => {
    const wavBuffer = await synthesizeTurkishSpeechWav(text, voiceName);
    return {
      audioDataUri: `data:audio/wav;base64,${wavBuffer.toString('base64')}`,
    };
  }
);
