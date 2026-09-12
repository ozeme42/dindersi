'use server';

import { getAdminDb } from '@/lib/firebase-admin';
import { syncCurriculumManifest } from '@/app/teacher/content-creation/actions';

import fs from 'fs/promises';
import path from 'path';

const SOURCE_TEXTS_PATH = path.join(process.cwd(), 'public', 'curriculum', 'source-texts.json');

async function updateLocalSourceText(topicId: string, text: string) {
    try {
        let data: { topics: Record<string, string>; units: Record<string, string> } = { topics: {}, units: {} };
        try {
            const raw = await fs.readFile(SOURCE_TEXTS_PATH, 'utf-8');
            data = JSON.parse(raw);
        } catch {}
        if (!data.topics) data.topics = {};
        if (text) {
            data.topics[topicId] = text;
        } else {
            delete data.topics[topicId];
        }
        await fs.writeFile(SOURCE_TEXTS_PATH, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
        console.warn('Failed to update local source-texts.json:', e);
    }
}

export async function saveTopicSourceText(courseId: string, unitId: string, topicId: string, sourceText: string) {
    if (!courseId || !unitId || !topicId) {
        return { success: false, error: "Eksik parametre: ders, ünite veya konu ID'si bulunamadı." };
    }

    try {
        const db = getAdminDb();
        const trimmed = (sourceText || '').trim();
        
        await db.collection('courses')
            .doc(courseId)
            .collection('units')
            .doc(unitId)
            .collection('topics')
            .doc(topicId)
            .update({
                sourceText: trimmed,
                updatedAt: new Date()
            });

        // Yerel source-texts.json dosyasını güncelle
        updateLocalSourceText(topicId, trimmed).catch(() => {});

        // Manifest dosyasını senkronize et
        syncCurriculumManifest().catch((err) => {
            console.warn('Failed to sync curriculum manifest after saving source text:', err);
        });

        return { success: true };
    } catch (error: any) {
        console.error('Error saving topic source text:', error);
        return { success: false, error: error.message || 'Kaynak metin kaydedilirken bir hata oluştu.' };
    }
}

export async function clearTopicSourceText(courseId: string, unitId: string, topicId: string) {
    if (!courseId || !unitId || !topicId) {
        return { success: false, error: 'Eksik parametre.' };
    }

    try {
        const db = getAdminDb();
        await db.collection('courses')
            .doc(courseId)
            .collection('units')
            .doc(unitId)
            .collection('topics')
            .doc(topicId)
            .update({
                sourceText: '',
                updatedAt: new Date()
            });

        // Yerel source-texts.json dosyasını güncelle
        updateLocalSourceText(topicId, '').catch(() => {});

        syncCurriculumManifest().catch(() => {});

        return { success: true };
    } catch (error: any) {
        console.error('Error clearing topic source text:', error);
        return { success: false, error: error.message || 'Kaynak metin silinirken bir hata oluştu.' };
    }
}

import { resolveActiveGeminiConfig } from '@/ai/ai-config-service';
import { runGeminiWithFallback } from '@/ai/gemini-fallback-runner';

/**
 * MEB Ders Kitapları için Özel Yapay Zeka Formatlama ve Ayet/Hadis İyileştirici.
 * Kitap metnini eksiltmeden, özetlemeden; ayetleri doğru Arapça hat ve meal düzeninde yapılandırır.
 */
export async function cleanAndFormatSourceTextWithAi(
    rawText: string, 
    topicTitle?: string,
    apiKeyInput?: string,
    modelNameInput?: string
) {
    if (!rawText || !rawText.trim()) {
        return { success: false, error: 'Metin boş.' };
    }

    try {
        const resolved = await resolveActiveGeminiConfig();
        const apiKey = apiKeyInput?.trim() || resolved.apiKey;
        const modelName = modelNameInput?.trim() || resolved.modelName || 'gemini-3.7-flash';
        if (!apiKey) {
            return { 
                success: false, 
                error: 'Gemini API anahtarı sistemde tanımlı değil. Lütfen Ayarlar sayfasından API anahtarınızı giriniz veya çevrimdışı modu kullanınız.' 
            };
        }

        const prompt = `Sen Milli Eğitim Bakanlığı (MEB) Din Kültürü ve Ahlak Bilgisi ile İmam Hatip ders kitapları alanında uzman bir başyazar ve kıdemli editörsün.
Aşağıda bir MEB ders kitabının ilgili sayfasından doğrudan taranmış ham metin yer almaktadır.

GÖREVİN:
Bu metni ders kitabının aslına %100 SADIK kalarak, hiçbir konuyu veya cümleyi KISALTMADAN, ÖZETLEMEDEN ve ASLA ATLAMADAN mükemmel bir ders kitabı kaynak metnine dönüştürmektir.

UYULMASI ZORUNLU KESİN KURALLAR:
1. AYET VE HADİSLERİN ARAPÇASI (EN ÖNCELİKLİ):
   - Metinde geçen ayet, sure veya hadislerin Arapça metinlerini düzgün, harfleri birleşik, eksiksiz Arapça hat düzeninde yaz (Örnek: "بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّح۪يمِ", "قُلْ هُوَ اللّٰهُ اَحَدٌ").
   - Arapça harflerin arasına kesinlikle boşluk koyma.
   - Ayetin Arapçasını ayrı bir paragrafa yerleştir, hemen altına da Türkçe mealini/anlamını ekle.

2. GÖRSEL İÇİ BOZUK YAZI VE HAREKE KIRINTILARINI TEMİZLE:
   - PDF taranırken sayfa kenarındaki minyatür Kur'an mushafı fotoğraflarından, tablolardan veya çizimlerden gelmiş anlamsız Arapça harf/hareke kırıntılarını (örneğin: "ََِْ َُٓ ََُُُْ ََِْْ ِٰ ِْ...") tamamen temizle.
   - Sadece konunun gerçek anlatımında, ayetlerinde ve hadislerinde yer alan anlamlı metinleri tut.
   - "Görsel 1.1: Kur'an-ı Kerim tüm insanlığa gönderilen kutsal bir kitaptır." veya "Görsel 1.2: ..." gibi gerçek görsel açıklamalarını koru.

3. KELİME VE TİRE BÖLÜNMELERİNİ DÜZELT:
   - Satır sonu hece bölmelerini ("söz - lükte" -> "sözlükte", "Sev - gili" -> "Sevgili", "be - lirtmi ş tir" -> "belirtmiştir", "oldu ğ unu" -> "olduğunu", "boş - luklara" -> "boşluklara") düzelt.
   - Kesme işaretlerini ("Kur ' an-ı Kerim ' in" -> "Kur'an-ı Kerim'in") düzelt.

4. DERS KİTABI AKIŞI VE BAŞLIKLARI:
   - Tema, Ünite, Konu başlıkları, "Konuya Başlarken", "Etkinlik", "Çalışma Yaprağı", "Kontrol Noktası", kavram kutuları (Ayet, Sure, Cüz, Hizip vb.) gibi kısımları ders kitabındaki hiyerarşide düzenli paragraflara ve başlıklara ayır.

5. ASLA ÖZETLEME VEYA KISALTMA YAPMA:
   - Kitaptaki hiçbir cümleyi, açıklamayı, etkinliği veya soruyu atlama. Orijinal ders kitabı metninin tamamını eksiksiz aktar.

KONU ADI: ${topicTitle || 'Ders Kitabı'}

HAM PDF METNİ:
${rawText}

ÇIKTI TALİMATI:
Sadece düzenlenmiş nihai ders kitabı kaynak metnini döndür. Başında veya sonunda hiçbir selamlama, not veya markdown backtick ("\`\`\`") kullanma.`;

        const cleanedText = await runGeminiWithFallback({
            apiKey,
            primaryModel: modelName,
            prompt,
        });

        return { 
            success: true, 
            cleanedText: cleanedText.trim() 
        };
    } catch (err: any) {
        console.error('AI clean error:', err);
        return { 
            success: false, 
            error: err.message || 'Yapay zeka ile metin düzenlenirken bir hata oluştu.' 
        };
    }
}

