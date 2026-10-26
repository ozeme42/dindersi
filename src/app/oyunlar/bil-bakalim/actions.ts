'use server';

import { unstable_noStore as noStore } from 'next/cache';
import type { ActivityItem, Question } from '@/lib/types';
import { db } from "@/lib/firebase";
import { 
  collection, 
  query, 
  where, 
  getCountFromServer, 
  writeBatch, 
  doc, 
  serverTimestamp, 
  increment,
} from 'firebase/firestore';
import { getStaticQuestionsForGame } from '@/lib/quiz-actions';

// Kavram ismini temizleme
const cleanConceptTerm = (raw: string) => {
    return raw
        // Parantez ve köşeli parantez içi ek notları sil: "İhlas (Samimiyet)" -> "İhlas"
        .replace(/\s*\([^)]*\)/g, '')
        .replace(/\s*\[[^\]]*\]/g, '')
        // Başındaki numara veya madde işaretlerini sil: "1. ", "a) ", "- "
        .replace(/^[0-9]+[\.\-\)\s]+/, '')
        // Şapkalı harfleri standart harflere çevir
        .replace(/[âÂ]/g, 'A')
        .replace(/[îÎ]/g, 'İ')
        .replace(/[ûÛ]/g, 'U')
        .replace(/[êÊ]/g, 'E')
        // Tırnak, apostrof, tire ve noktaları temizle
        .replace(/['’"”`\-\.]/g, '')
        // Fazla boşlukları teke indir ve kenar boşluklarını kırp
        .replace(/\s+/g, ' ')
        .trim();
};

// Tanım metnini temizleme
const cleanClueText = (term: string, rawDef: string) => {
    let clue = rawDef.replace(/^[0-9]+[\.\-\)\s]+/, '').trim();
    // Eğer tanım doğrudan kavramın adıyla başlıyorsa (örn: "Rahman: ...") başlığı temizle
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    clue = clue.replace(new RegExp(`^${escaped}\\s*[:,-]\\s*`, 'i'), '');
    if (clue.length > 0) {
        clue = clue.charAt(0).toLocaleUpperCase('tr-TR') + clue.slice(1);
    }
    return clue;
};

export async function getBilBakalimAction(
    { topicId, courseId, unitId }: { topicId?: string; courseId?: string, unitId?: string }
): Promise<{ questions: Partial<Question>[]; error?: string }> {
    noStore();
    try {
        let allItems: ActivityItem[] = (await getStaticQuestionsForGame({ courseId, unitId, topicId, dataType: 'activities' }) as any);

        // Eğer seçilen konuda 4'ten az tanım varsa, aynı ünitedeki diğer konulardan da kavramları al
        if ((!allItems || allItems.length < 4) && unitId) {
            const unitItems: ActivityItem[] = (await getStaticQuestionsForGame({ courseId, unitId, dataType: 'activities' }) as any);
            allItems = [...(allItems || []), ...(unitItems || [])];
        }

        if (!allItems || allItems.length === 0) {
             return { questions: [], error: "Bu konu için etkinlik verisi bulunamadı." };
        }
        
        const validDefinitions: Partial<Question>[] = [];
        const seenTerms = new Set<string>();

        for (const item of allItems || []) {
            if ('type' in item) {
                let rawTerm = '';
                let rawDef = '';

                if (item.type === 'definition' && (item as any).content?.term && (item as any).content?.definition) {
                    rawTerm = String((item as any).content.term).trim();
                    rawDef = String((item as any).content.definition).trim();
                } else if (item.type === 'concept' && ((item as any).content?.term || (item as any).content?.text) && ((item as any).content?.definition || (item as any).content?.meaning)) {
                    rawTerm = String((item as any).content?.term || (item as any).content?.text).trim();
                    rawDef = String((item as any).content?.definition || (item as any).content?.meaning).trim();
                }

                if (rawTerm && rawDef) {
                    const cleanedTerm = cleanConceptTerm(rawTerm);
                    const cleanedDef = cleanClueText(cleanedTerm, rawDef);

                    // Geçerlilik kontrolleri
                    if (cleanedTerm.length < 2 || cleanedDef.length < 8) continue;
                    if (cleanedTerm.toLowerCase() === cleanedDef.toLowerCase()) continue;

                    const key = cleanedTerm.toLocaleLowerCase('tr-TR');
                    if (seenTerms.has(key)) continue;
                    seenTerms.add(key);

                    validDefinitions.push({
                        id: item.id || `def-${Math.random()}`,
                        text: cleanedDef,
                        type: 'Bil Bakalım',
                        correctAnswer: cleanedTerm,
                        difficulty: 'Orta',
                    });
                }
            }
        }
        
        if (validDefinitions.length < 2) {
            return { questions: [], error: "Bil Bakalım oynamak için bu konuda en az 2 farklı kavram tanımı bulunmalıdır." };
        }

        const shuffled = [...validDefinitions].sort(() => 0.5 - Math.random());
        // Wordwall "Find the Match" için ideal soru sayısı: 8 ila 12 arası
        return { questions: JSON.parse(JSON.stringify(shuffled.slice(0, 12))) };

    } catch (error: any) {
        console.error("Error getting Bil Bakalım questions:", error);
        return { error: "Oyun için sorular alınırken bir hata oluştu.", questions: [] };
    }
}

export async function submitBilBakalimScoreAction(
    userId: string | null, 
    score: number, 
    context: string
): Promise<{ success: boolean; error?: string }> {
    if (process.env.NEXT_PUBLIC_STATIC_BUILD === 'true' || !userId || score <= 0) {
        return { success: true };
    }

    try {
        const attemptsQuery = query(
            collection(db, 'scoreEvents'),
            where('userId', '==', userId),
            where('gameType', '==', 'Bil Bakalım'),
            where('context', '==', context)
        );
        const attemptsSnapshot = await getCountFromServer(attemptsQuery);
        const attemptCount = attemptsSnapshot.data().count;

        if (attemptCount >= 10) {
            return { success: false, error: "Puan limiti aşıldı. Bu etkinlikten daha fazla puan kazanamazsınız." };
        }

        const batch = writeBatch(db);

        const userRef = doc(db, 'users', userId);
        batch.update(userRef, { score: increment(score) });

        const eventRef = doc(collection(db, 'scoreEvents'));
        batch.set(eventRef, {
            userId: userId,
            points: score,
            timestamp: serverTimestamp(),
            gameType: 'Bil Bakalım',
            context: context,
            attemptNumber: attemptCount + 1,
        });

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Error submitting Bil Bakalım score:", error);
        return { success: false, error: "Skor kaydedilirken bir hata oluştu." };
    }
}
