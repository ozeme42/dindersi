
'use server';

import { unstable_noStore as noStore } from 'next/cache';
import type { ActivityItem } from '@/lib/types';
import { db } from "@/lib/firebase";
import { 
  doc, 
  getDoc,
  updateDoc, 
  increment, 
  collection, 
  addDoc, 
  serverTimestamp, 
  writeBatch, 
  query, 
  where, 
  getDocs, 
  limit as firestoreLimit,
  getCountFromServer,
} from 'firebase/firestore';
import fs from 'fs/promises';
import path from 'path';
import { getStaticQuestionsForGame } from '@/lib/quiz-actions';

export type MatchingPair = {
    id: string;
    type: 'term' | 'definition';
    content: string;
    pairId: string;
};

export async function getHafizaKartlariAction(
    { topicId, courseId, unitId }: { topicId?: string; courseId?: string, unitId?: string }
): Promise<{ pairs: MatchingPair[] | null; error?: string }> {
    noStore();
    try {
        const rawPairs: { term: string; definition: string }[] = [];

        // 1. Statik dosyalardan (activities, questions, flows) öncelikli hızlı veri çekimi (0ms)
        try {
            const allItems = await getStaticQuestionsForGame({ courseId, unitId, topicId });
            for (const item of allItems) {
                if ('type' in item) {
                    if (item.type === 'definition' && (item as any).content?.term && (item as any).content?.definition) {
                        const term = String((item as any).content.term).trim();
                        const definition = String((item as any).content.definition).trim();
                        if (term && definition) {
                            rawPairs.push({ term, definition });
                        }
                    } else if (item.type === 'concept' && (item as any).content?.term && (item as any).content?.definition) {
                        const term = String((item as any).content.term).trim();
                        const definition = String((item as any).content.definition).trim();
                        if (term && definition) {
                            rawPairs.push({ term, definition });
                        }
                    }
                }
            }
        } catch (e) {
            console.warn("Static items read warning in getHafizaKartlariAction:", e);
        }

        // Tekilleştir (Kavram adına göre)
        const seenTerms = new Set<string>();
        let uniquePairs: { term: string; definition: string }[] = [];
        for (const p of rawPairs) {
            const key = p.term.toLocaleLowerCase('tr-TR');
            if (p.term.length > 0 && p.definition.length > 0 && !seenTerms.has(key)) {
                seenTerms.add(key);
                uniquePairs.push(p);
            }
        }

        // Statik dosyalarda yeterli kavram-tanım çifti varsa DOĞRUDAN DÖN (0ms)
        if (uniquePairs.length >= 2) {
            const selectedItems = uniquePairs.sort(() => 0.5 - Math.random()).slice(0, 6);
            const gamePairs: MatchingPair[] = [];
            selectedItems.forEach((item, index) => {
                const pairId = `pair-${index}`;
                gamePairs.push({ id: `term-${index}`, type: 'term', content: item.term, pairId });
                gamePairs.push({ id: `def-${index}`, type: 'definition', content: item.definition, pairId });
            });
            const shuffledPairs = gamePairs.sort(() => Math.random() - 0.5);
            return { pairs: JSON.parse(JSON.stringify(shuffledPairs)) };
        }

        // 2. Statik dosyalarda tanım azsa, çoktan seçmeli ve boşluk doldurma sorularının kısa olanlarından kavram-tanım üret
        try {
            const allItems = await getStaticQuestionsForGame({ courseId, unitId, topicId });
            for (const item of allItems) {
                if ('type' in item) {
                    if ((item.type === 'Boşluk Doldurma' || item.type === 'fitb') && (item as any).correctAnswer && ((item as any).sentenceWithBlank || (item as any).text)) {
                        const term = String((item as any).correctAnswer).trim();
                        const definition = String((item as any).sentenceWithBlank || (item as any).text).trim();
                        const key = term.toLocaleLowerCase('tr-TR');
                        if (term.length > 0 && term.length <= 30 && definition.length > 0 && definition.length <= 120 && !seenTerms.has(key)) {
                            seenTerms.add(key);
                            uniquePairs.push({ term, definition });
                        }
                    } else if ((item.type === 'Çoktan Seçmeli' || item.type === 'mcq') && (item as any).correctAnswer && ((item as any).question || (item as any).text)) {
                        const term = String((item as any).correctAnswer).trim();
                        const definition = String((item as any).question || (item as any).text).trim();
                        const key = term.toLocaleLowerCase('tr-TR');
                        if (term.length > 0 && term.length <= 25 && definition.length > 0 && definition.length <= 100 && !seenTerms.has(key)) {
                            seenTerms.add(key);
                            uniquePairs.push({ term, definition });
                        }
                    }
                }
            }
        } catch (e) {}

        if (uniquePairs.length >= 2) {
            const selectedItems = uniquePairs.sort(() => 0.5 - Math.random()).slice(0, 6);
            const gamePairs: MatchingPair[] = [];
            selectedItems.forEach((item, index) => {
                const pairId = `pair-${index}`;
                gamePairs.push({ id: `term-${index}`, type: 'term', content: item.term, pairId });
                gamePairs.push({ id: `def-${index}`, type: 'definition', content: item.definition, pairId });
            });
            const shuffledPairs = gamePairs.sort(() => Math.random() - 0.5);
            return { pairs: JSON.parse(JSON.stringify(shuffledPairs)) };
        }

        // 3. SADECE VE SADECE statik dosyalarda hiç veri yoksa (öğretmenin Firestore'da açtığı özel konuysa) Firestore'u sorgula
        if (topicId && topicId !== 'all') {
            try {
                let topicSnap = null;
                if (courseId && unitId) {
                    topicSnap = await getDoc(doc(db, 'courses', courseId, 'units', unitId, 'topics', topicId));
                }
                if (!topicSnap || !topicSnap.exists()) {
                    topicSnap = await getDoc(doc(db, 'topics', topicId));
                }
                if (topicSnap && topicSnap.exists()) {
                    const topicData = topicSnap.data();
                    if (Array.isArray(topicData.steps)) {
                        for (const step of topicData.steps) {
                            if (step.type === 'conceptExplanation' && Array.isArray(step.items)) {
                                for (const it of step.items) {
                                    if (it.concept && it.definition) {
                                        const key = String(it.concept).trim().toLocaleLowerCase('tr-TR');
                                        if (!seenTerms.has(key)) {
                                            seenTerms.add(key);
                                            uniquePairs.push({ term: String(it.concept).trim(), definition: String(it.definition).trim() });
                                        }
                                    }
                                }
                            } else if (step.type === 'flashcard' && Array.isArray(step.cards)) {
                                for (const cd of step.cards) {
                                    if (cd.term && cd.definition) {
                                        const key = String(cd.term).trim().toLocaleLowerCase('tr-TR');
                                        if (!seenTerms.has(key)) {
                                            seenTerms.add(key);
                                            uniquePairs.push({ term: String(cd.term).trim(), definition: String(cd.definition).trim() });
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            } catch (e) {
                console.warn("Firestore topic doc read warning in getHafizaKartlariAction:", e);
            }
        }

        if (uniquePairs.length < 2) {
            return { 
                error: "Bu konu için henüz hafıza kartı verisi bulunamadı. Lütfen konuya 'Kavram Açıklamaları' veya 'Bilgi Kartları' ekleyin.", 
                pairs: null 
            };
        }

        // En fazla 6 çift (12 kart) seç (Maksimum oyun dengesi için)
        const selectedItems = uniquePairs.sort(() => 0.5 - Math.random()).slice(0, 6);

        const gamePairs: MatchingPair[] = [];
        selectedItems.forEach((item, index) => {
            const pairId = `pair-${index}`;
            gamePairs.push({ id: `term-${index}`, type: 'term', content: item.term, pairId });
            gamePairs.push({ id: `def-${index}`, type: 'definition', content: item.definition, pairId });
        });

        const shuffledPairs = gamePairs.sort(() => Math.random() - 0.5);

        return { pairs: JSON.parse(JSON.stringify(shuffledPairs)) };

    } catch (error: any) {
        console.error("Server Action Error (getHafizaKartlariAction):", error);
        return { error: "Oyun verileri alınırken teknik bir hata oluştu.", pairs: null };
    }
}

export async function submitHafizaKartlariScoreAction(
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
            where('gameType', '==', 'Hafıza Kartları'),
            where('context', '==', context)
        );
        
        const attemptsSnapshot = await getCountFromServer(attemptsQuery);
        const attemptCount = attemptsSnapshot.data().count;

        if (attemptCount >= 10) {
            return { 
                success: false, 
                error: `Bu etkinlikten daha fazla puan kazanamazsınız. Lütfen farklı bir konu seçin.` 
            };
        }

        const batch = writeBatch(db);
        
        const userRef = doc(db, 'users', userId);
        batch.update(userRef, { score: increment(score) });

        const eventRef = doc(collection(db, 'scoreEvents'));
        batch.set(eventRef, {
            userId: userId,
            points: score,
            timestamp: serverTimestamp(),
            gameType: 'Hafıza Kartları',
            context: context,
            attemptNumber: attemptCount + 1,
        });

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Server Action Error (submitHafizaKartlariScoreAction):", error);
        return { success: false, error: "Skor kaydedilirken sunucu hatası oluştu." };
    }
}
