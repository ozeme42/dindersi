
'use server';
/**
 * @fileoverview A Genkit flow for converting text to speech.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import wav from 'wav';
import { googleAI } from '@genkit-ai/googleai';

const TextToSpeechInputSchema = z.object({
  text: z.string().min(1, 'Metin boş olamaz.'),
});
export type TextToSpeechInput = z.infer<typeof TextToSpeechInputSchema>;

const TextToSpeechOutputSchema = z.object({
  audioDataUri: z.string(),
});
export type TextToSpeechOutput = z.infer<typeof TextToSpeechOutputSchema>;


async function toWav(pcmData: Buffer): Promise<string> {
    return new Promise((resolve, reject) => {
        const writer = new wav.Writer({
            channels: 1,
            sampleRate: 24000,
            bitDepth: 16,
        });

        const chunks: Buffer[] = [];
        writer.on('data', (chunk) => {
            chunks.push(chunk);
        });
        writer.on('end', () => {
            resolve(Buffer.concat(chunks).toString('base64'));
        });
        writer.on('error', reject);
        
        writer.end(pcmData);
    });
}

export const textToSpeechFlow = ai.defineFlow(
  {
    name: 'textToSpeechFlow',
    inputSchema: TextToSpeechInputSchema,
    outputSchema: TextToSpeechOutputSchema,
  },
  async ({ text }) => {
    try {
      const { media } = await ai.generate({
        model: 'googleai/tts-1',
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Algenib' },
            },
          },
        },
        prompt: text,
      });

      if (!media) {
        throw new Error('Yapay zeka ses verisi döndürmedi.');
      }
      
      const audioBuffer = Buffer.from(
          media.url.substring(media.url.indexOf(',') + 1),
          'base64'
      );
      
      const wavBase64 = await toWav(audioBuffer);

      return { audioDataUri: `data:audio/wav;base64,${wavBase64}` };

    } catch (error: any) {
      console.error('Error in text-to-speech flow:', error);
      throw new Error(error.message || 'Metin sese dönüştürülürken bir hata oluştu.');
    }
  }
);
