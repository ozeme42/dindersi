
'use server';

/**
 * @fileOverview AI-assisted activity data generation tool with fallback runner and active model resolution.
 */
import { z } from 'zod';
import { resolveActiveGeminiConfig } from '@/ai/ai-config-service';
import { runGeminiWithFallback } from '@/ai/gemini-fallback-runner';

const AiActivityDataInputSchema = z.object({
  topicTitle: z.string().describe('The title of the topic to generate data for.'),
  contextText: z.string().optional().describe('Optional context text to use as the primary source for generation.'),
  generateConcepts: z.boolean().describe('Generate a list of key concepts?'),
  generateDefinitions: z.boolean().describe('Generate concept-definition pairs?'),
  generateSentences: z.boolean().describe('Generate summary sentences?'),
  countPerType: z.number().optional().describe('Target count of items to generate per type.'),
  customPrompt: z.string().optional().describe('Optional teacher specific instructions.'),
  apiKey: z.string().optional(),
  modelName: z.string().optional(),
});
export type AiActivityDataInput = z.infer<typeof AiActivityDataInputSchema>;

export type AiActivityDataOutput = {
  concepts?: string[];
  conceptDefinitions?: { concept: string; definition: string }[];
  summarySentences?: string[];
};

export async function generateActivityData(input: AiActivityDataInput): Promise<AiActivityDataOutput> {
  const { apiKey: activeKey, modelName: selectedModel } = await resolveActiveGeminiConfig({
    apiKey: input.apiKey,
    modelName: input.modelName,
  });

  if (!activeKey) {
    throw new Error('Gemini API anahtarı bulunamadı. Lütfen AI ayarlarından Google AI Studio API anahtarınızı kaydedin.');
  }

  const isUnlimited = !input.countPerType || input.countPerType <= 0;
  const targetCount = input.countPerType || 6;
  const instructions: string[] = [];

  if (input.generateConcepts || input.generateDefinitions) {
    if (isUnlimited) {
      instructions.push(
        `- **Kavram - Tanım Çiftleri (conceptDefinitions)**: Konu ve kaynak metindeki BÜTÜN temel ve yan kavramları, dini terimleri, önemli isimleri ve bunların "Ben Kimim?" tarzı soru/ipucu tanımlarını EKSİKSİZ olarak çıkar. Sayı sınırlaması YOKTUR; metinde geçen, oyunlara ve kazanımlara uygun olan TÜM kavram ve tanımları (bulabildiğin kadar çok, hiçbir kavramı atlamadan) üret. 'definition' alanında ipucu tanımı, 'concept' alanında ise tek kelimelik veya kısa kavram adı yer almalıdır. Tanım metninde kavramın kendi adı KESİNLİKLE GEÇMEMELİDİR.`
      );
    } else {
      instructions.push(
        `- **Kavram - Tanım Çiftleri (conceptDefinitions)**: Konuyla ilgili en az ${targetCount} adet "Ben Kimim?" tarzı soru/ipucu tanımı ve kavram üret. 'definition' alanında ipucu tanımı, 'concept' alanında ise tek kelimelik veya kısa kavram adı yer almalıdır. Tanım metninde kavramın kendi adı KESİNLİKLE GEÇMEMELİDİR.`
      );
    }
  }

  if (input.generateSentences) {
    if (isUnlimited) {
      instructions.push(
        `- **Özet Cümleler (summarySentences)**: Konunun bütün kazanımlarını, önemli noktalarını, ayet ve hadis mesajlarını kapsayan çıkarabileceğin TÜM özet cümleleri eksiksiz üret. Sayı sınırlaması YOKTUR; konudaki bütün önemli bilgileri kapsasın. ZORUNLU KURAL: Her bir cümle EN FAZLA 6 KELİMEDEN oluşmalıdır. Anagram ve cümle kurma oyunlarında kullanıldığı için asla 6 kelimeden uzun cümle üretme.`
      );
    } else {
      instructions.push(
        `- **Özet Cümleler (summarySentences)**: Konunun en önemli noktalarını özetleyen en az ${targetCount} adet cümle üret. ZORUNLU KURAL: Her bir cümle EN FAZLA 6 KELİMEDEN oluşmalıdır. Anagram ve cümle kurma oyunlarında kullanıldığı için asla 6 kelimeden uzun cümle üretme.`
      );
    }
  }

  if (input.customPrompt && input.customPrompt.trim().length > 0) {
    instructions.push(
      `- **ÖĞRETMEN ÖZEL TALİMATI**: """${input.customPrompt.trim()}""" Bu talimata kesinlikle uymalısın.`
    );
  }

  const prompt = `Sen Din Kültürü ve Ahlak Bilgisi dersi için etkinlik veri bankası uzmanısın.
Tüm çıktılar %100 Türkçe olmalıdır.

${input.contextText ? `Kaynak Metin:\n"""\n${input.contextText}\n"""` : `Konu Başlığı: ${input.topicTitle}`}

İstenen İçerikler:
${instructions.join('\n\n')}

Lütfen SADECE geçerli bir JSON nesnesi döndür:
{
  ${(input.generateConcepts || input.generateDefinitions) ? `"conceptDefinitions": [
    { "concept": "Tevhid", "definition": "Allah'ın bir ve tek olduğuna, eşi ve benzeri olmadığına inanma ilkesi." }
  ],` : ''}
  ${input.generateSentences ? `"summarySentences": [
    "Namaz dinin direğidir.",
    "İslam barış ve esenlik dinidir."
  ]` : ''}
}
`;

  const text = await runGeminiWithFallback({
    apiKey: activeKey,
    primaryModel: selectedModel,
    prompt,
    generationConfig: {
      responseMimeType: 'application/json',
    },
  });

  try {
    const cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
    const output = JSON.parse(cleaned) as Record<string, any>;

    const finalOutput: AiActivityDataOutput = {};

    if (output.conceptDefinitions && Array.isArray(output.conceptDefinitions) && output.conceptDefinitions.length > 0) {
      if (input.generateDefinitions) {
        finalOutput.conceptDefinitions = output.conceptDefinitions;
      }
      if (input.generateConcepts) {
        finalOutput.concepts = output.conceptDefinitions.map((cd: any) => cd.concept);
      }
    }

    if (output.summarySentences && Array.isArray(output.summarySentences)) {
      finalOutput.summarySentences = output.summarySentences;
    }

    return finalOutput;
  } catch (err: any) {
    console.error("JSON parse error in generateActivityData:", text);
    throw new Error("Yapay zeka yanıtı JSON formatında okunamadı: " + err.message);
  }
}
