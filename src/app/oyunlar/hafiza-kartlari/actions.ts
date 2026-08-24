
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

        // 1. Statik dosyalardan veri çek
        try {
            const allItems = await getStaticQuestionsForGame({ courseId, unitId, topicId });
            for (const item of allItems) {
                if ('type' in item) {
                    if (item.type === 'definition' && item.content?.term && item.content?.definition) {
                        rawPairs.push({ term: item.content.term.trim(), definition: item.content.definition.trim() });
                    } else if (item.type === 'concept' && item.content?.term && item.content?.definition) {
                        rawPairs.push({ term: item.content.term.trim(), definition: item.content.definition.trim() });
                    } else if ((item.type === 'Çoktan Seçmeli' || item.type === 'mcq') && (item as any).correctAnswer && ((item as any).question || (item as any).text)) {
                        rawPairs.push({ term: (item as any).correctAnswer.trim(), definition: ((item as any).question || (item as any).text).trim() });
                    } else if ((item.type === 'Boşluk Doldurma' || item.type === 'fitb') && (item as any).correctAnswer && ((item as any).sentenceWithBlank || (item as any).text)) {
                        rawPairs.push({ term: (item as any).correctAnswer.trim(), definition: ((item as any).sentenceWithBlank || (item as any).text).trim() });
                    }
                }
            }
        } catch (e) {
            console.warn("Static items read warning in getHafizaKartlariAction:", e);
        }

        // 2. Firestore Topic Belgesinden Ders Adımlarını Tara (Öğretmen ve Dinamik Konular)
        if (topicId && topicId !== 'all') {
            try {
                const topicRef = doc(db, 'topics', topicId);
                const topicSnap = await getDoc(topicRef);
                if (topicSnap.exists()) {
                    const topicData = topicSnap.data();
                    if (Array.isArray(topicData.steps)) {
                        for (const step of topicData.steps) {
                            if (step.type === 'conceptExplanation' && Array.isArray(step.items)) {
                                for (const it of step.items) {
                                    if (it.concept && it.definition) {
                                        rawPairs.push({ term: String(it.concept).trim(), definition: String(it.definition).trim() });
                                    }
                                }
                            } else if (step.type === 'flashcard' && Array.isArray(step.cards)) {
                                for (const cd of step.cards) {
                                    if (cd.term && cd.definition) {
                                        rawPairs.push({ term: String(cd.term).trim(), definition: String(cd.definition).trim() });
                                    }
                                }
                            } else if ((step.type === 'anagramGame' || step.type === 'anagramFlashcard') && Array.isArray(step.cards)) {
                                for (const cd of step.cards) {
                                    if (cd.correctAnswer && cd.definition) {
                                        rawPairs.push({ term: String(cd.correctAnswer).trim(), definition: String(cd.definition).trim() });
                                    }
                                }
                            } else if (step.type === 'mcq' && step.correctAnswer && step.question) {
                                rawPairs.push({ term: String(step.correctAnswer).trim(), definition: String(step.question).trim() });
                            } else if (step.type === 'fitb' && step.correctAnswer && step.sentenceWithBlank) {
                                rawPairs.push({ term: String(step.correctAnswer).trim(), definition: String(step.sentenceWithBlank).trim() });
                            }
                        }
                    }
                }
            } catch (e) {
                console.warn("Firestore topic doc read warning in getHafizaKartlariAction:", e);
            }
        }

        // 3. Firestore activityItems Koleksiyonunu Tara
        if (topicId && topicId !== 'all') {
            try {
                const actQuery = query(collection(db, 'activityItems'), where('topicId', '==', topicId), firestoreLimit(50));
                const actSnap = await getDocs(actQuery);
                actSnap.docs.forEach(d => {
                    const data = d.data();
                    if (data.content?.term && data.content?.definition) {
                        rawPairs.push({ term: String(data.content.term).trim(), definition: String(data.content.definition).trim() });
                    }
                });
            } catch (e) {
                console.warn("Firestore activityItems query warning in getHafizaKartlariAction:", e);
            }
        }

        // 4. Firestore questions Koleksiyonunu Tara (Eğer hala azsa)
        if (rawPairs.length < 4 && topicId && topicId !== 'all') {
            try {
                const qQuery = query(collection(db, 'questions'), where('topicId', '==', topicId), firestoreLimit(30));
                const qSnap = await getDocs(qQuery);
                qSnap.docs.forEach(d => {
                    const data = d.data();
                    if (data.correctAnswer && (data.question || data.text)) {
                        rawPairs.push({ term: String(data.correctAnswer).trim(), definition: String(data.question || data.text).trim() });
                    }
                });
            } catch (e) {
                console.warn("Firestore questions query warning in getHafizaKartlariAction:", e);
            }
        }

        // Tekilleştir (Kavram adına göre)
        const seenTerms = new Set<string>();
        const uniquePairs: { term: string; definition: string }[] = [];
        for (const p of rawPairs) {
            const key = p.term.toLocaleLowerCase('tr-TR');
            if (p.term.length > 0 && p.definition.length > 0 && !seenTerms.has(key)) {
                seenTerms.add(key);
                uniquePairs.push(p);
            }
        }

        if (uniquePairs.length < 2) {
            return { 
                error: "Bu konu için henüz hafıza kartı verisi eklenmemiş. Lütfen konuya 'Kavram Açıklamaları' veya 'Bilgi Kartları' adımı ekleyin.", 
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
