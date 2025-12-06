
'use server';

import { db } from "@/lib/firebase";
import { 
  doc, 
  updateDoc, 
  increment, 
  collection, 
  addDoc, 
  serverTimestamp, 
  writeBatch, 
  query, 
  where, 
  getDocs, 
  getCountFromServer,
  limit
} from 'firebase/firestore';
import { unstable_noStore as noStore } from 'next/cache';
import type { ActivityItem } from '@/lib/types';
import { GENERIC_TURKISH_WORDS } from '@/lib/generic-words';

export type IlimHazinesiLevel = {
    letters: string[];
    words: string[];
    mainWord: string;
    info: string;
};

const MAX_ATTEMPTS_PER_CONTEXT = 10;

// Yeni harf üretme fonksiyonu
const generateLetters = (mainWord: string): string[] => {
    const mainWordLetters = mainWord.toLocaleUpperCase('tr-TR').split('');
    const alphabet = "ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ";
    const additionalLettersCount = Math.max(0, 8 - mainWordLetters.length);
    let letters = [...mainWordLetters];
    for (let i = 0; i < additionalLettersCount; i++) {
        letters.push(alphabet[Math.floor(Math.random() * alphabet.length)]);
    }
    return letters.sort(() => Math.random() - 0.5);
}

export async function getIlimHazinesiAction(
    { courseId, unitId, topicId }: { courseId?: string; unitId?: string; topicId?: string; }
): Promise<{ levels: IlimHazinesiLevel[] | null; error?: string }> {
    noStore();
    try {
        let baseQuery = query(collection(db, 'activityItems'), where('type', '==', 'definition'));

        if (topicId && topicId !== 'all') {
            baseQuery = query(baseQuery, where("topicId", "==", topicId));
        } else if (unitId && unitId !== 'all') {
            baseQuery = query(baseQuery, where("unitId", "==", unitId));
        } else if (courseId && courseId !== 'all') {
            baseQuery = query(baseQuery, where("courseId", "==", courseId));
        }

        const querySnapshot = await getDocs(baseQuery);
        
        const allDefinitions = querySnapshot.docs.map(doc => doc.data() as ActivityItem)
             .filter(item => 
                item.content &&
                item.content.term && 
                item.content.definition &&
                item.content.term.trim().length >= 4 &&
                item.content.term.trim().length <= 8 &&
                !item.content.term.includes(' ')
            );

        if (allDefinitions.length < 3) {
            return { error: "İlim Hazinesi oynamak için bu konuda en az 3 adet (4-8 harfli) kelime bulunmalıdır.", levels: null };
        }
        
        const shuffled = [...allDefinitions].sort(() => 0.5 - Math.random());
        const selectedForGame = shuffled.slice(0, 5); // Oyunda 5 seviye olsun
        
        const gameLevels: IlimHazinesiLevel[] = [];

        for (const item of selectedForGame) {
            const mainWord = item.content.term!;
            const info = item.content.definition!;
            const letters = generateLetters(mainWord);
            
            // Bu harflerle oluşturulabilecek diğer kelimeleri bul (basit bir yaklaşım)
            const otherWords = GENERIC_TURKISH_WORDS.filter(word => {
                if (word.length < 3 || word.toLocaleUpperCase('tr-TR') === mainWord) return false;
                const wordLetters = word.toLocaleUpperCase('tr-TR').split('');
                const availableLetters = [...letters];
                return wordLetters.every(letter => {
                    const index = availableLetters.indexOf(letter);
                    if (index > -1) {
                        availableLetters.splice(index, 1);
                        return true;
                    }
                    return false;
                });
            }).map(w => w.toLocaleUpperCase('tr-TR')).slice(0, 5);

            gameLevels.push({
                mainWord,
                info,
                letters,
                words: [mainWord, ...otherWords],
            });
        }
        
        if (gameLevels.length === 0) {
             return { error: "Oyun seviyeleri oluşturulamadı.", levels: null };
        }

        return { levels: JSON.parse(JSON.stringify(gameLevels)) };

    } catch (error: any) {
        console.error("Server Action Error (getIlimHazinesiAction):", error);
        return { error: "Oyun verileri alınırken teknik bir hata oluştu.", levels: null };
    }
}


export async function submitIlimHazinesiScoreAction(userId: string | null, score: number, context: string): Promise<{ success: boolean; error?: string }> {
    if (!userId || score <= 0) {
        return { success: true };
    }

    try {
        const attemptsQuery = query(
            collection(db, 'scoreEvents'),
            where('userId', '==', userId),
            where('gameType', '==', 'İlim Hazinesi'),
            where('context', '==', context)
        );
        const attemptsSnapshot = await getCountFromServer(attemptsQuery);
        if (attemptsSnapshot.data().count >= MAX_ATTEMPTS_PER_CONTEXT) {
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
            gameType: 'İlim Hazinesi',
            context: context,
        });

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Error submitting Ilim Hazinesi score:", error);
        return { success: false, error: "Skor kaydedilirken bir hata oluştu." };
    }
}
