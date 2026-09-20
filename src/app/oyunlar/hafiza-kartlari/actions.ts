
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
        const rawTerms: string[] = [];

        // 1. Statik dosyalardan (activities, questions, flows) kavramları topla
        try {
            const allItems = await getStaticQuestionsForGame({ courseId, unitId, topicId, dataType: 'all' });
            for (const item of allItems || []) {
                if ('type' in item) {
                    let term = '';
                    if (item.type === 'definition' && (item as any).content?.term) {
                        term = String((item as any).content.term).trim();
                    } else if (item.type === 'concept' && ((item as any).content?.term || (item as any).content?.concept || (item as any).content?.text)) {
                        term = String((item as any).content?.term || (item as any).content?.concept || (item as any).content?.text).trim();
                    }
                    if (term) {
                        rawTerms.push(term);
                    }
                }
            }
        } catch (e) {
            console.warn("Static items read warning in getHafizaKartlariAction:", e);
        }

        // 2. Statik dosyalarda yeterli kavram yoksa Firestore'dan oku
        if (rawTerms.length < 2 && topicId && topicId !== 'all') {
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
                                    if (it.concept) {
                                        rawTerms.push(String(it.concept).trim());
                                    }
                                }
                            } else if (step.type === 'flashcard' && Array.isArray(step.cards)) {
                                for (const cd of step.cards) {
                                    if (cd.term) {
                                        rawTerms.push(String(cd.term).trim());
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

        // Tekilleştir ve temizle
        const seenTerms = new Set<string>();
        const uniqueTerms: string[] = [];
        for (const raw of rawTerms) {
            const cleaned = raw.replace(/[.:;!?,]+$/, '').trim();
            const key = cleaned.toLocaleLowerCase('tr-TR');
            if (
                cleaned.length >= 2 &&
                cleaned.length <= 40 &&
                !seenTerms.has(key)
            ) {
                seenTerms.add(key);
                uniqueTerms.push(cleaned);
            }
        }

        if (uniqueTerms.length < 2) {
            return { 
                error: "Bu konu için henüz yeterli kavram bulunamadı. Hafıza kartı oynayabilmek için konuya en az 2 kavram eklenmelidir.", 
                pairs: null 
            };
        }

        // En fazla 6 kavram seçip her birini çiftleyelim (Toplam 12 kart - Akıllı tahta için ideal)
        const selectedConcepts = uniqueTerms.sort(() => 0.5 - Math.random()).slice(0, 6);
        const gamePairs: MatchingPair[] = [];

        selectedConcepts.forEach((term, index) => {
            const pairId = `pair-${index}`;
            // Her kavram için birebir aynı kavram adına sahip iki kart (Çift)
            gamePairs.push({ id: `term-a-${index}`, type: 'term', content: term, pairId });
            gamePairs.push({ id: `term-b-${index}`, type: 'term', content: term, pairId });
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
