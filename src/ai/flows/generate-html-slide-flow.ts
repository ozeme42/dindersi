
'use server';
/**
 * @fileOverview AI-assisted full-page HTML slide generation tool.
 *
 * This flow analyzes a given topic and generates a rich, single-page HTML
 * content block suitable for a presentation slide.
 */
import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

const GenerateHtmlSlideInputSchema = z.object({
  topicSummary: z.string().describe('A summary of the topic for which to generate an HTML slide.'),
});
export type GenerateHtmlSlideInput = z.infer<typeof GenerateHtmlSlideInputSchema>;

const GenerateHtmlSlideOutputSchema = z.object({
  htmlContent: z.string().describe("A rich HTML content string for a slide, styled with Tailwind CSS classes. It can include text, headings, lists, tables, inline SVGs for icons/diagrams, and placeholder images from placehold.co. It must NOT contain <html>, <head>, or <body> tags."),
});
export type GenerateHtmlSlideOutput = z.infer<typeof GenerateHtmlSlideOutputSchema>;

export async function generateHtmlSlide(input: GenerateHtmlSlideInput): Promise<GenerateHtmlSlideOutput> {
  return generateHtmlSlideFlow(input);
}

const generateHtmlSlideFlow = ai.defineFlow(
  {
    name: 'generateHtmlSlideFlow',
    inputSchema: GenerateHtmlSlideInputSchema,
    outputSchema: GenerateHtmlSlideOutputSchema,
  },
  async (input) => {
      
    const prompt = `You are an expert instructional designer and web developer creating an engaging educational slide in Turkish.
Your task is to generate a single, rich HTML content block based on the provided topic summary.
The generated HTML must be well-structured and styled using Tailwind CSS classes. Use the 'prose' class for beautiful typography by default.

Rules:
1.  The output must be ONLY the HTML content. Do NOT include \`<html>\`, \`<head>\`, or \`<body>\` tags.
2.  All content must be in Turkish.
3.  Use semantic HTML5 tags (e.g., \`<h1>\`, \`<p>\`, \`<ul>\`, \`<li>\`, \`<strong>\`, \`<table>\` ).
4.  Use Tailwind CSS classes for styling (e.g., 'p-4', 'rounded-lg', 'bg-blue-100', 'grid', 'grid-cols-2', 'gap-4'). The design should be modern and visually appealing.
5.  **Incorporate Rich Media:** To make the slide more engaging, you MUST include a variety of the following elements where appropriate:
    - **Icons:** Use inline SVG icons (e.g., from lucide.dev) to visually represent concepts.The SVGs should be simple, with \`width="24" height="24" stroke="currentColor"\`.
    - **Images:** For images, use placeholders from \`https://placehold.co/<width>x<height>.png\`. For example: \`https://placehold.co/600x400.png\`. Add a \`data-ai-hint\` attribute with one or two relevant keywords (e.g., \`data-ai-hint="teknoloji uzay"\`).
    - **Diagrams:** For diagrams or flowcharts, generate them as inline SVG.
    - **Tables:** When presenting tabular data, use \`<table>\` with \`<thead>\` and \`<tbody>\`. Style it with Tailwind classes for a clean look (e.g., 'w-full', 'text-left', '[&_th]:p-2', '[&_td]:p-2').
6.  The content should be visually appealing, easy to read, and informative. It can include headings, paragraphs, lists, and even simple layouts using flexbox or grid.

Topic Summary:
"${input.topicSummary}"
`;
      
    const {output} = await ai.generate({
      model: googleAI.model('gemini-2.5-flash'),
      prompt: prompt,
      output: {
        schema: GenerateHtmlSlideOutputSchema,
      }
    });
    return output!;
  }
);
