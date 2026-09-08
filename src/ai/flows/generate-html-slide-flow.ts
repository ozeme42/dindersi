'use server';

import { z } from 'zod';
import { resolveActiveGeminiConfig } from '@/ai/ai-config-service';
import { runGeminiWithFallback } from '@/ai/gemini-fallback-runner';

const GenerateHtmlSlideInputSchema = z.object({
  topicSummary: z.string().describe('A summary or title of the topic for which to generate an HTML slide.'),
  slideTheme: z.enum(['modern-dark', 'vibrant-cards', 'infographic-split', 'minimal-elegant']).optional(),
  slideCount: z.number().optional().default(5),
  customPrompt: z.string().optional(),
  apiKey: z.string().optional(),
  modelName: z.string().optional(),
});
export type GenerateHtmlSlideInput = {
  topicSummary: string;
  slideTheme?: 'modern-dark' | 'vibrant-cards' | 'infographic-split' | 'minimal-elegant';
  slideCount?: number;
  customPrompt?: string;
  apiKey?: string;
  modelName?: string;
};

export type GenerateHtmlSlideOutput = {
  htmlContent: string;
};

export async function generateHtmlSlide(input: GenerateHtmlSlideInput): Promise<GenerateHtmlSlideOutput> {
  const { apiKey: activeKey, modelName: selectedModel } = await resolveActiveGeminiConfig({
    apiKey: input.apiKey,
    modelName: input.modelName,
  });

  if (!activeKey) {
    throw new Error('Gemini API anahtarı bulunamadı. Lütfen AI ayarlarından API anahtarınızı kaydedin.');
  }

  const slideCount = input.slideCount || 5;

  const prompt = `Sen ödüllü bir eğitim teknolojisi, Canva/Gamma kalitesinde sunum mimarı ve akıllı tahta UI/UX uzmanısın.
Görevin: Verilen konu için akıllı tahtada öğrencilerin ve öğretmenin hayran kalacağı, **ÇOK SAYFALI (HER BİRİ AYRI SLAYT OLAN), SAYFA GEÇİŞLİ, KLAVYE OK TUŞLARI VE DOKUNMATİK KAYDIRMA DESTEKLİ İNTERAKTİF BİR HTML SLAYT SUNUMU (PRESENTATION DECK)** üretmektir.

KONU / METİN:
"${input.topicSummary}"
${input.customPrompt ? `\nÖĞRETMENİN ÖZEL İSTEĞİ / TALİMATI:\n"${input.customPrompt}"\n` : ''}

SLAYT SAYISI: Tam olarak ${slideCount} slayt oluşturacaksın.

---

### SLAYT MİMARİSİ VE İÇERİK PLANI (${slideCount} Slayt):
1. **Slayt 1 (Göz Alıcı Kapak & Giriş):**
   - Parlayan gradyan başlık: \`bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 via-indigo-300 to-fuchsia-400 font-black\`
   - Konu/Ders rozeti (Badge), konunun ana merak sorusu veya çarpıcı bir giriş cümlesi.
   - Dikkat çeken "Derse Başla ➔" butonu (tıklanınca 2. slayta geçer: onclick="nextSlide()").

2. **Slayt 2 (Kilit Kavramlar & Tanımlar):**
   - Konunun en önemli 2-4 kavramı.
   - Her kavram için parlayan cam efektli neon kart (\`bg-slate-900/80 border border-cyan-500/30 rounded-2xl p-5 hover:border-cyan-400 transition-all\`).
   - Her kartta ilgili tematik emoji/ikon ve hap gibi anlaşılır kısa tanım.

3. **Slayt 3 (Görsel İnfografik Akış / Süreç / Şema):**
   - Konunun aşamalarını gösteren adım adım infografik bloklar (1. Adım ➔ 2. Adım ➔ 3. Adım).
   - Canlı renkli numara rozetleri, yön okları, öğrencinin aklında kalacak şematik anlatım.

4. **Slayt 4 (Karşılaştırma / Kritik Noktalar / Doğru Bilinen Yanlışlar):**
   - 2'li veya 3'lü karşılaştırma kutusu (Örn: Farz vs Vacip, Doğru vs Yanlış, Dikkat Edilecekler).
   - "⚠️ Dikkat Edelim" veya "💡 Kritik Hap Bilgi" vurgulu uyarı paneli.

5. **Slayt 5 (Deftere Yazılacaklar & Altın Çıkarımlar):**
   - "✏️ Defterimize Not Edelim" temalı şık panel.
   - Öğrencilerin defterine yazacağı 3-4 kural/özet madde.
   - "🎯 Sınav Tüyosu" veya "🔑 Altın Kural" kutucuğu.

${slideCount >= 6 ? `
6. **Slayt 6 (Sınıf İçi Pekiştirme & Düşünme Sorusu):**
   - Akıllı tahtada sınıfça tartışılacak interaktif kontrol sorusu.
   - Şık 2 veya 4 seçenekli tartışma kartları (tıklanınca doğru/yanlış yeşil/kırmızı olan mini interaktivite).
` : ''}

---

### ETKİLEŞİM VE MOTOR GEREKSİNİMLERİ (ÇOK ÖNEMLİ):
Slaytların sorunsuz sayfa sayfa geçebilmesi için şu HTML + Vanilla JS yapısını kur:
1. **Dış Kapsayıcı:**
   - \`<div id="presentation-container" class="relative w-full h-full min-h-[550px] max-h-[90vh] bg-slate-950 text-slate-100 rounded-3xl border border-white/10 p-4 md:p-8 flex flex-col justify-between overflow-hidden select-none">\`
2. **Üst Çubuk:**
   - Sol: Konu başlığı küçük rozet.
   - Orta: Slayt Sayacı (\`<span id="slide-counter" class="font-mono text-xs px-3 py-1 rounded-full bg-white/10 text-purple-300 font-bold border border-white/10">1 / ${slideCount}</span>\`).
   - Sağ: İlerleme Çubuğu (\`<div class="w-24 bg-white/10 h-1.5 rounded-full overflow-hidden"><div id="slide-progress" class="bg-gradient-to-r from-purple-500 to-cyan-400 h-full transition-all duration-300" style="width: ${Math.round(100/slideCount)}%"></div></div>\`).
3. **Slayt Alanı:**
   - Her slayt için: \`<div class="slide-page [diğer sınıflar]" data-slide="0">...</div>\`, \`<div class="slide-page hidden [diğer sınıflar]" data-slide="1">...</div>\` vb.
   - İlk slayt açık, diğerleri \`hidden\` olacak.
   - İçerikler akıllı tahtada uzaktan çok rahat okunacak puntolarda olsun (h1: text-3xl/4xl, p: text-lg/xl).
4. **Alt Kontrol Çubuğu:**
   - Sol: \`<button id="btn-prev" onclick="prevSlide()" class="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer">◀ Önceki</button>\`
   - Orta: Tıklanabilir Slayt Noktaları (Dots) - her slayt için bir nokta.
   - Sağ: \`<button id="btn-next" onclick="nextSlide()" class="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-purple-900/40 cursor-pointer">Sonraki ▶</button>\`
5. **Dahili JavaScript (\`<script>\` bloğu):**
   - \`currentSlide\` indeksi tut.
   - \`showSlide(index)\` fonksiyonu: aktif slaytı göster, diğerlerini gizle, sayaç (\`X / ${slideCount}\`) ve ilerleme çubuğunu güncelle, butonları aktif/pasif yap.
   - \`nextSlide()\` ve \`prevSlide()\` fonksiyonları.
   - **Klavye Olayı:** \`window.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight' || e.key === ' ') nextSlide(); if (e.key === 'ArrowLeft') prevSlide(); });\`
   - **Dokunmatik Kaydırma (Swipe):** \`touchstart\` ve \`touchend\` dinleyerek ekranda parmağı sola çekince sonraki, sağa çekince önceki slayta geçiş yaptır.

---

### KESİN FORMAT KURALLARI:
- SADECE \`<div id="presentation-container" class="...">...<script>...</script></div>\` formatında saf HTML ve script döndür.
- Kesinlikle \`<!DOCTYPE html>\`, \`<html>\`, \`<head>\`, \`<body>\` etiketleri EKLEME (Bunlar iframe tarafından otomatik sağlanır).
- Çıktının başında veya sonunda markdown \`\`\`html blokları OLMAYACAK, doğrudan ilk \`<div\` karakteri ile başlayacak.
- Tüm Tailwind CSS sınıfları eksiksiz ve görsel olarak göz kamaştırıcı koyu kozmik temada olsun.
`;

  const rawText = await runGeminiWithFallback({
    apiKey: activeKey,
    primaryModel: selectedModel,
    prompt,
  });

  let text = rawText
    .replace(/^\`\`\`html\s*/i, '')
    .replace(/^\`\`\`\s*/i, '')
    .replace(/\`\`\`\s*$/i, '')
    .trim();

  return { htmlContent: text };
}
