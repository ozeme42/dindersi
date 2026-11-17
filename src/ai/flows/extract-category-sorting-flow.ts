'use server';

import { resolveActiveGeminiConfig } from '@/ai/ai-config-service';
import { runGeminiWithFallback } from '@/ai/gemini-fallback-runner';
import type { CategorySortCategory, CategorySortItem } from '@/lib/types';

export type ExtractCategorySortingInput = {
  text: string;
  topicTitle?: string;
  categoryCount?: number;
  apiKey?: string;
  modelName?: string;
};

export type ExtractCategorySortingOutput = {
  title: string;
  description: string;
  categories: CategorySortCategory[];
  items: CategorySortItem[];
  explanation?: string;
  error?: string;
};

const DEFAULT_COLORS = ['emerald', 'amber', 'indigo', 'rose', 'cyan', 'purple'];

export async function extractCategorySorting(
  input: ExtractCategorySortingInput
): Promise<ExtractCategorySortingOutput> {
  try {
    const rawText = (input.text || '').trim();
    if (!rawText) {
      return {
        title: 'Kategorilere Yerleştirme Oyunu',
        description: 'Maddeleri ait oldukları kategorilere yerleştirin.',
        categories: [],
        items: [],
        error: 'Kategori oyunu üretmek için geçerli bir kaynak metin bulunamadı.'
      };
    }

    const { apiKey: resolvedKey, modelName: resolvedModel } = await resolveActiveGeminiConfig({
      apiKey: input.apiKey,
      modelName: input.modelName,
    });

    const prompt = `
Sen MEB Din Kültürü ve Ahlak Bilgisi dersi için akıllı tahtada öğrencilerin kavramları sınıflandırmasını, gruplandırmasını ve pekiştirmesini sağlayan uzman bir eğitim materyali tasarımcısısın.
Aşağıda verilen kaynak metni incele ve bu konudaki kavramları sınıflandırmak için 2 ila 4 adet NET KATEGORİ (örn: Farz Namazlar, Vacip Namazlar, Sünnet Namazlar VEYA İmanın Şartları, İslamın Şartları VEYA Zekât Verilenler, Verilmeyenler vb.) ve bu kategorilere ait toplam 6 ila 12 adet KAVRAM/MADDE çıkar.

🔴 EN KATI KURALLAR:
1. KATEGORİLER (categories):
   - Kesinlikle 2, 3 veya en fazla 4 adet belirgin, birbiriyle karışmayan kategori oluştur.
   - Her kategorinin "id" değeri 'cat-1', 'cat-2' şeklinde olmalı.
   - "name": Kategori adı (Örn: "Farz Namazlar", "Vacip Namazlar", "Sünnet Namazlar").
   - "badge": 1-2 kelimelik kısa rozet (Örn: "Kesin Hüküm", "Gereklilik", "Peygamber Sünneti").
   - "description": Kategorinin tanımı veya açıklaması (1 kısa cümle).
   - "color": 'emerald', 'amber', 'indigo', 'rose', 'cyan' veya 'purple' renklerinden biri.

2. MADDELER / KARTLAR (items):
   - Toplam 6 ila 12 adet olmalıdır. Her kategoriye en az 2, en fazla 4 madde düşmelidir.
   - Her maddenin "id" değeri 'item-1', 'item-2' şeklinde olmalı.
   - "text": Öğrencinin okuyup sürükleyeceği net ifade (Örn: "Sabah Namazının Farzı", "Vitir Namazı", "Teravih Namazı", "Bayram Namazı").
   - "categoryId": Bu maddenin KESİNLİKLE AİT OLDUĞU kategorinin 'id' değeri (örn: 'cat-1').
   - "hint": Öğrenci takıldığında tahtada açılabilecek 1 kısa cümlelik ipucu.

3. BAŞLIK & YÖNERGE:
   - "title": Etkinliğe uygun canlı bir başlık (Örn: "Namaz Çeşitlerini Sınıflandıralım").
   - "description": Öğrenciye net dokunmatik yönerge (Örn: "Aşağıdaki namazları ait oldukları kategorilere sürükleyiniz veya dokunarak yerleştiriniz:").

${input.topicTitle ? `KONU BAŞLIĞI: ${input.topicTitle}` : ''}

KAYNAK METİN:
"""
${rawText}
"""

CEVAP FORMATI (SADECE GEÇERLİ JSON):
{
  "title": "Namaz Çeşitlerini Sınıflandıralım",
  "description": "Aşağıdaki namazları ait oldukları kategorilere sürükleyiniz veya dokunarak yerleştiriniz:",
  "categories": [
    { "id": "cat-1", "name": "Farz Namazlar", "badge": "Kesin Emir", "description": "Günde 5 vakit ve cuma namazı gibi kılınması kesin olan namazlar.", "color": "emerald" },
    { "id": "cat-2", "name": "Vacip Namazlar", "badge": "Gerekli", "description": "Farz kadar kesin olmasa da yerine getirilmesi gereken namazlar.", "color": "amber" },
    { "id": "cat-3", "name": "Sünnet Namazlar", "badge": "Örnek İbadet", "description": "Peygamberimizin farzların yanında kıldığı nafile namazlar.", "color": "indigo" }
  ],
  "items": [
    { "id": "item-1", "text": "Sabah Namazının Farzı", "categoryId": "cat-1", "hint": "Günde 5 vakit olan temel namazlardandır." },
    { "id": "item-2", "text": "Vitir Namazı", "categoryId": "cat-2", "hint": "Yatsı namazından sonra kılınan üç rekatlık namazdır." },
    { "id": "item-3", "text": "Teravih Namazı", "categoryId": "cat-3", "hint": "Ramazan gecelerinde cemaatle kılınan sünnettir." },
    { "id": "item-4", "text": "Cuma Namazı", "categoryId": "cat-1", "hint": "Haftada bir gün cemaatle kılınması farzdır." },
    { "id": "item-5", "text": "Bayram Namazı", "categoryId": "cat-2", "hint": "Yılda iki kez kılınan cemaat namazıdır." },
    { "id": "item-6", "text": "Kuşluk (Duha) Namazı", "categoryId": "cat-3", "hint": "Güneş doğduktan sonra kılınan nafile sünnettir." }
  ]
}
`;

    const resultText = await runGeminiWithFallback({
      apiKey: resolvedKey,
      primaryModel: resolvedModel || 'gemini-3.6-flash',
      prompt,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      }
    });

    if (!resultText) {
      throw new Error('Yapay zekâdan boş yanıt alındı.');
    }

    const cleanJson = resultText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    const parsed = JSON.parse(cleanJson);

    // Kategori normalizasyonu
    const categories: CategorySortCategory[] = (parsed.categories || []).map((cat: any, idx: number) => ({
      id: cat.id || `cat-${idx + 1}`,
      name: String(cat.name || `Kategori ${idx + 1}`).trim(),
      description: cat.description ? String(cat.description).trim() : undefined,
      badge: cat.badge ? String(cat.badge).trim() : undefined,
      color: cat.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length]
    }));

    // Madde normalizasyonu
    const validCategoryIds = new Set(categories.map(c => c.id));
    const items: CategorySortItem[] = (parsed.items || []).map((item: any, idx: number) => {
      let catId = item.categoryId;
      // Eğer kategori adı verilmişse id'ye eşle
      if (!validCategoryIds.has(catId)) {
        const foundByName = categories.find(c => c.name.toLowerCase() === String(catId).toLowerCase());
        catId = foundByName ? foundByName.id : (categories[0]?.id || 'cat-1');
      }
      return {
        id: item.id || `item-${idx + 1}`,
        text: String(item.text || '').trim(),
        categoryId: catId,
        hint: item.hint ? String(item.hint).trim() : undefined
      };
    }).filter((it: CategorySortItem) => Boolean(it.text));

    return {
      title: parsed.title || 'Kategorilere Yerleştirme Oyunu',
      description: parsed.description || 'Maddeleri ait oldukları kategorilere sürükleyiniz veya dokunarak yerleştiriniz:',
      categories,
      items,
      explanation: parsed.explanation
    };

  } catch (err: any) {
    console.error('extractCategorySorting hatası:', err);
    return {
      title: 'Kategorilere Yerleştirme Oyunu',
      description: 'Maddeleri ait oldukları kategorilere yerleştirin.',
      categories: [],
      items: [],
      error: err?.message || 'Kategori ayıklama işlemi sırasında bir hata oluştu.'
    };
  }
}
