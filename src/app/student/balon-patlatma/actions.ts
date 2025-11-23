
'use server';

import { db } from "@/lib/firebase";
import { doc, updateDoc, increment, collection, getDocs, query, where, addDoc, serverTimestamp, writeBatch, getCountFromServer } from 'firebase/firestore';
import { unstable_noStore as noStore } from 'next/cache';
import type { ActivityItem } from '@/lib/types';

export type Balloon = {
    id: number;
    word: string;
    isCorrect: boolean;
};

export type BalloonRound = {
    definition: string;
    correctWord: string;
    balloons: Balloon[];
};

const shuffleArray = <T>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};


export async function getBalloonGameAction(
    { courseId, unitId, topicId }: { courseId?: string; unitId?: string; topicId?: string; }
): Promise<{ rounds: BalloonRound[]; error?: string }> {
    noStore();
    try {
        let definitionsQuery = query(collection(db, 'activityItems'), where('type', '==', 'definition'));
        let conceptsQuery = query(collection(db, 'activityItems'), where('type', '==', 'concept'));

        if (topicId && topicId !== 'all') {
            definitionsQuery = query(definitionsQuery, where("topicId", "==", topicId));
            conceptsQuery = query(conceptsQuery, where("topicId", "==", topicId));
        } else if (unitId && unitId !== 'all') {
            definitionsQuery = query(definitionsQuery, where("unitId", "==", unitId));
            conceptsQuery = query(conceptsQuery, where("unitId", "==", unitId));
        } else if (courseId && courseId !== 'all') {
            definitionsQuery = query(definitionsQuery, where("courseId", "==", courseId));
            conceptsQuery = query(conceptsQuery, where("courseId", "==", courseId));
        }

        const [definitionsSnapshot, conceptsSnapshot] = await Promise.all([
            getDocs(definitionsQuery),
            getDocs(conceptsQuery)
        ]);

        const definitions = definitionsSnapshot.docs.map(doc => doc.data() as ActivityItem).filter(item => item.content?.term && item.content?.definition);
        const conceptPool = conceptsSnapshot.docs.map(doc => (doc.data() as ActivityItem).content.text!).filter(Boolean);

        if (definitions.length < 5) {
            return { error: `Bu oyun için en az 5 tanım gereklidir. Bulunan: ${definitions.length}`, rounds: [] };
        }
        if (conceptPool.length < 10) {
             return { error: `Bu oyun için en az 10 farklı kavram gereklidir (çeldiriciler için). Bulunan: ${conceptPool.length}`, rounds: [] };
        }

        const shuffledDefinitions = shuffleArray(definitions).slice(0, 10); // 10 rounds

        const rounds: BalloonRound[] = shuffledDefinitions.map((def, index) => {
            const correctWord = def.content.term!;
            const distractors = shuffleArray(conceptPool.filter(c => c !== correctWord)).slice(0, 5);
            
            const balloonWords = shuffleArray([correctWord, ...distractors]);
            
            const balloons: Balloon[] = balloonWords.map((word, i) => ({
                id: i,
                word: word,
                isCorrect: word === correctWord,
            }));
            
            return {
                definition: def.content.definition!,
                correctWord: correctWord,
                balloons: balloons,
            };
        });

        return { rounds: JSON.parse(JSON.stringify(rounds)) };

    } catch (error: any) {
        console.error("Error getting Balloon Pop data:", error);
        return { error: "Balon Patlatma oyunu verileri alınırken bir hata oluştu.", rounds: [] };
    }
}


export async function submitBalloonPopScoreAction(userId: string | null, score: number, context: string): Promise<{ success: boolean; error?: string }> {
    if (!userId || score <= 0) {
        return { success: true };
    }
    
    try {
        const attemptsQuery = query(
            collection(db, 'scoreEvents'),
            where('userId', '==', userId),
            where('gameType', '==', 'Balon Patlatma'),
            where('context', '==', context)
        );
        const attemptsSnapshot = await getCountFromServer(attemptsQuery);
        if (attemptsSnapshot.data().count >= 10) {
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
            gameType: 'Balon Patlatma',
            context: context,
        });

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Error submitting Balon Patlatma score:", error);
        return { success: false, error: "Skor kaydedilirken bir hata oluştu." };
    }
}
