
'use server';

import { unstable_noStore as noStore } from 'next/cache';
import type { ActivityItem, Anagram } from '@/lib/types';
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
  getDocs
} from 'firebase/firestore';
import { getStaticQuestionsForGame } from '@/lib/quiz-actions';


function isValidEducationalDefinition(term: string, definition: string): boolean {
    const t = term.trim().toLocaleLowerCase('tr-TR');
    const d = definition.trim().toLocaleLowerCase('tr-TR');

    if (t.length < 2 || d.length < 5) return false;
    if (t === d) return false;

    // Kesinlikle elenmesi gereken oyun ve anagram yönergeleri:
    const bannedKeywords = [
        'harflerini',
        'sıralayarak',
        'kelimeyi bulun',
        'kelimeyi bul',
        'doğru sırala',
        'bu kavramın',
        'ipucu',
        'soru:',
        'hangisidir',
        'aşağıdakilerden',
        'boşluğu doldur',
        'doğru cevabı',
        'seçiniz',
        'tahmin ediniz',
        'bulmaca'
    ];

    for (const kw of bannedKeywords) {
        if (d.includes(kw)) return false;
    }

    if (
        d === `${t} kavramı` ||
        d.endsWith(' kavramı') ||
        d.includes('islami kavram') ||
        d.includes('bu kelime') ||
        d === 'tanım' ||
        d === 'tanımsız' ||
        d === '...' ||
        d === '-'
    ) {
        return false;
    }

    if (d.includes(`"${t}"`) || d.includes(`'${t}'`)) {
        return false;
    }

    return true;
}

export async function getConceptHuntAction({ 
    courseId,
    unitId,
    topicId
}: { 
    courseId?: string;
    unitId?: string;
    topicId?: string; 
}): Promise<{ questions: Anagram[] | null; error?: string }> {
    noStore();
    try {
        const rawItems: { term: string; definition: string }[] = [];

        // 1. Statik dosyalardan (activities, questions, flows) öncelikli hızlı veri çekimi
        try {
            const allItems = await getStaticQuestionsForGame({ courseId, unitId, topicId, dataType: 'all' });
            for (const item of allItems || []) {
                if (!item || typeof item !== 'object') continue;

                let term = '';
                let definition = '';

                if ('type' in item) {
                    if (item.type === 'definition' || item.type === 'concept') {
                        term = String((item as any).content?.term || (item as any).content?.concept || (item as any).term || '').trim();
                        definition = String((item as any).content?.definition || (item as any).definition || '').trim();
                    } else if (item.type === 'conceptExplanation') {
                        term = String((item as any).concept || (item as any).term || '').trim();
                        definition = String((item as any).definition || '').trim();
                    } else if (item.type === 'flashcard') {
                        term = String((item as any).term || (item as any).correctAnswer || '').trim();
                        definition = String((item as any).definition || '').trim();
                    }
                }

                if (isValidEducationalDefinition(term, definition)) {
                    rawItems.push({ term, definition });
                }
            }
        } catch (e) {
            console.warn("Static items read warning in getConceptHuntAction:", e);
        }

        // 2. Statik dosyalarda veri azsa Firestore fallback yap
        if (rawItems.length < 2 && topicId && topicId !== 'all') {
            try {
                let topicSnap = null;
                if (courseId && unitId) {
                    topicSnap = await (await import('firebase/firestore')).getDoc(doc(db, 'courses', courseId, 'units', unitId, 'topics', topicId));
                }
                if (!topicSnap || !topicSnap.exists()) {
                    topicSnap = await (await import('firebase/firestore')).getDoc(doc(db, 'topics', topicId));
                }
                if (topicSnap && topicSnap.exists()) {
                    const topicData = topicSnap.data();
                    if (Array.isArray(topicData.steps)) {
                        for (const step of topicData.steps) {
                            if (step.type === 'conceptExplanation' && Array.isArray(step.items)) {
                                for (const it of step.items) {
                                    const term = String(it.concept || it.term || '').trim();
                                    const definition = String(it.definition || '').trim();
                                    if (isValidEducationalDefinition(term, definition)) {
                                        rawItems.push({ term, definition });
                                    }
                                }
                            } else if (step.type === 'flashcard' && Array.isArray(step.cards)) {
                                for (const cd of step.cards) {
                                    const term = String(cd.term || cd.correctAnswer || '').trim();
                                    const definition = String(cd.definition || '').trim();
                                    if (isValidEducationalDefinition(term, definition)) {
                                        rawItems.push({ term, definition });
                                    }
                                }
                            }
                        }
                    }
                }
            } catch (e) {
                console.warn("Firestore fallback warning in getConceptHuntAction:", e);
            }
        }

        const cleanWord = (raw: string) => {
            return raw
                .replace(/[âÂ]/g, 'a')
                .replace(/[îÎ]/g, 'i')
                .replace(/[ûÛ]/g, 'u')
                .replace(/[''\\-\s\.]/g, '')
                .trim()
                .toLocaleLowerCase('tr-TR');
        };

        const turkishAlphabetRegex = /^[abcçdefgğhıijklmnoöprsştuüvyz]+$/;
        const seenTerms = new Set<string>();
        const validItems: { term: string; definition: string }[] = [];

        for (const item of rawItems) {
            const cleaned = cleanWord(item.term);
            if (
                cleaned.length >= 3 && 
                cleaned.length <= 15 && 
                turkishAlphabetRegex.test(cleaned) && 
                !seenTerms.has(cleaned)
            ) {
                seenTerms.add(cleaned);
                validItems.push({ term: cleaned, definition: item.definition.trim() });
            }
        }

        if (validItems.length < 1) {
            return { error: "Kavram Avı oynamak için bu konuda tanımı bulunan en az 1 adet uygun kavram bulunmalıdır.", questions: null };
        }
        
        // Karıştır
        for (let i = validItems.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [validItems[i], validItems[j]] = [validItems[j], validItems[i]];
        }
        
        const anagramQuestions: Anagram[] = validItems.map(item => {
            const correctAnswer = item.term.toLocaleUpperCase('tr-TR');
            const chars = correctAnswer.split('');
            let scrambled = correctAnswer;
            let attempts = 0;
            // Kesinlikle anagram oluşturacak şekilde karıştır (aynı kalmasın)
            while (scrambled === correctAnswer && attempts < 25) {
                scrambled = [...chars].sort(() => 0.5 - Math.random()).join('');
                attempts++;
            }
            if (scrambled === correctAnswer && chars.length > 1) {
                // Manuel swap
                const temp = chars[0];
                chars[0] = chars[chars.length - 1];
                chars[chars.length - 1] = temp;
                scrambled = chars.join('');
            }
            return {
                definition: item.definition,
                scrambledWord: scrambled.toLocaleUpperCase('tr-TR'),
                correctAnswer: correctAnswer,
            };
        });

        return { questions: JSON.parse(JSON.stringify(anagramQuestions.slice(0, 20))) };

    } catch (error: any) {
        console.error("Server Action Error (getConceptHuntAction):", error);
        return { error: "Oyun verileri alınırken teknik bir hata oluştu.", questions: null };
    }
}

export async function submitConceptHuntScoreAction(
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
            where('gameType', '==', 'Kavram Avı'),
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
            gameType: 'Kavram Avı',
            context: context,
            attemptNumber: attemptCount + 1,
        });

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Server Action Error (submitConceptHuntScoreAction):", error);
        return { success: false, error: "Skor kaydedilirken sunucu hatası oluştu." };
    }
}
