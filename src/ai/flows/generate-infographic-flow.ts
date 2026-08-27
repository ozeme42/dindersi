
'use server';

/**
 * @fileOverview AI-assisted infographic HTML page generation with fallback runner and active model resolution.
 */
import { z } from 'zod';
import { resolveActiveGeminiConfig } from '@/ai/ai-config-service';
import { runGeminiWithFallback } from '@/ai/gemini-fallback-runner';

const GenerateInfographicInputSchema = z.object({
  topicSummary: z.string().describe('A summary of the topic to generate an infographic for.'),
  apiKey: z.string().optional(),
  modelName: z.string().optional(),
});
export type GenerateInfographicInput = z.infer<typeof GenerateInfographicInputSchema>;

export type GenerateInfographicOutput = {
  htmlContent: string;
};

export async function generateInfographic(input: GenerateInfographicInput): Promise<GenerateInfographicOutput> {
  const { apiKey: activeKey, modelName: selectedModel } = await resolveActiveGeminiConfig({
    apiKey: input.apiKey,
    modelName: input.modelName,
  });

  if (!activeKey) {
    throw new Error('Gemini API anahtarı bulunamadı. Lütfen AI ayarlarından Google AI Studio API anahtarınızı kaydedin.');
  }

  const prompt = `You are an expert instructional designer and web developer creating a beautiful, single-file, interactive infographic presentation in Turkish.

Your task is to generate a complete and valid HTML5 document as a single string, based on the provided topic summary. The entire output must be a single block of HTML code.

The content MUST be creative, unique, and based exclusively on the provided topic summary. Generate 4 to 6 unique and creative slides.

**Topic Summary:**
"${input.topicSummary}"

---

**RULES & INSTRUCTIONS:**
1. **Full HTML Document:** The output MUST be a complete HTML document, starting with \`<!DOCTYPE html>\` and ending with \`</html>\`.
2. **Self-Contained:** Use CDN links for Tailwind CSS (\`<script src="https://cdn.tailwindcss.com"></script>\`) and Chart.js if needed.
3. **Structure:** The page must contain multiple \`<section class="slide-section">\` elements with next/prev buttons.
4. **Language:** All visible text content MUST be in Turkish.
`;

  const text = await runGeminiWithFallback({
    apiKey: activeKey,
    primaryModel: selectedModel,
    prompt,
  });

  let htmlContent = text.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

  return { htmlContent };
}
