
'use server';
/**
 * @fileOverview AI-assisted infographic HTML page generation.
 * This flow generates a complete, self-contained HTML document for a presentation.
 */
import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

const GenerateInfographicInputSchema = z.object({
  topicSummary: z.string().describe('A summary of the topic to generate an infographic for.'),
});
export type GenerateInfographicInput = z.infer<typeof GenerateInfographicInputSchema>;

const GenerateInfographicOutputSchema = z.object({
  htmlContent: z.string().describe('A complete, self-contained HTML5 document string for the infographic presentation. It must start with <!DOCTYPE html> and end with </html>.'),
});
export type GenerateInfographicOutput = z.infer<typeof GenerateInfographicOutputSchema>;

export async function generateInfographic(input: GenerateInfographicInput): Promise<GenerateInfographicOutput> {
  return generateInfographicFlow(input);
}

const generateInfographicFlow = ai.defineFlow(
  {
    name: 'generateInfographicFlow',
    inputSchema: GenerateInfographicInputSchema,
    outputSchema: GenerateInfographicOutputSchema,
  },
  async (input) => {
    const prompt = `You are an expert instructional designer and web developer creating a beautiful, single-file, interactive infographic presentation in Turkish.

Your task is to generate a complete and valid HTML5 document as a single string, based on the provided topic summary. The entire output must be a single block of HTML code.

The content MUST be creative, unique, and based exclusively on the provided topic summary. Do not use generic examples. Instead of using the "Evrendeki Mükemmel Düzen" example, create new analogies and structures that fit the user's specific topic. Generate 4 to 6 unique and creative slides.

**Topic Summary:**
"${input.topicSummary}"

---

**RULES & INSTRUCTIONS (based on the provided successful template):**

1.  **Full HTML Document:** The output MUST be a complete HTML document, starting with \`<!DOCTYPE html>\` and ending with \`</html>\`.
2.  **Self-Contained:** The HTML must be self-contained. Use CDN links for any external resources like Tailwind CSS or Chart.js.
    - Tailwind CSS CDN: \`<script src="https://cdn.tailwindcss.com"></script>\`
    - Chart.js CDN: \`<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>\`
3.  **Structure & Interactivity:** 
    - The page must contain multiple \`<section class="slide-section">\` elements.
    - Include JavaScript within a \`<script>\` tag to handle slide navigation. A "Next" and "Previous" button should control which slide has the "active" class, making them visible one at a time. The first slide should be active by default.
4.  **Content Generation:**
    *   Slides can include text, comparisons (e.g., in two columns), lists with emojis, and charts (using Chart.js).
    *   For charts, create relevant data that fits the topic summary.
5.  **Language:** All visible text content (titles, paragraphs, chart labels, etc.) MUST be in Turkish.
6.  **Styling:** 
    - Use inline \`<style>\` tags for custom CSS, such as slide transitions and animations.
    - Use Tailwind CSS classes for layout and component styling.
    - Create a visually appealing and modern design with a consistent color palette.
`;
    const {output} = await ai.generate({
        model: googleAI.model('gemini-pro'),
        prompt: prompt,
        config: {
            responseModalities: ['TEXT'],
        },
        output: { schema: GenerateInfographicOutputSchema }
    });

    if (!output?.htmlContent) {
        throw new Error("AI failed to generate infographic HTML.");
    }
    return output;
  }
);
