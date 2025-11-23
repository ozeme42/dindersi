
'use server';

import { db } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc, getDoc, updateDoc, increment, writeBatch, serverTimestamp } from 'firebase/firestore';
import { auth as adminAuth } from 'firebase-admin';
import type { Question, DailyQuest } from '@/lib/types';
import { unstable_noStore as noStore } from 'next/cache';
import { getAdminApp } from '@/lib/firebase-admin';

const getTodayDateString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export async function getDailyQuestAction(userId: string | null): Promise<{ questions: Question[]; completed: boolean; error?: string }> {
    noStore();
    if (!userId) {
        return { error: "Kullanıcı girişi yapılmamış.", questions: [], completed: false };
    }

    const today = getTodayDateString();
    const questRef = doc(db, 'users', userId, 'dailyQuests', today);

    try {
        const questSnap = await getDoc(questRef);
        if (questSnap.exists() && questSnap.data().completed) {
            return { completed: true, questions: [] };
        }

        const questionsCollection = collection(db, "questions");
        const questionsSnapshot = await getDocs(questionsCollection);
        
        const allQuestions: Question[] = questionsSnapshot.docs.map(doc => {
            const data = doc.data();
            const question: Question = {
                id: doc.id,
                text: data.text,
                type: data.type,
                options: data.options,
                difficulty: data.difficulty,
                courseId: data.courseId,
                unitId: data.unitId,
                topicId: data.topicId,
                topic: data.topic,
                classId: data.classId,
                className: data.className,
            };

            if (question.type === 'Doğru/Yanlış') {
                question.correctAnswer = data.isTrue ? "Doğru" : "Yanlış";
                question.isTrue = data.isTrue;
            } else {
                question.correctAnswer = data.correctAnswer || '';
            }

            return question;
        });

        if (allQuestions.length < 5) {
             return { error: "Günün görevi için yeterli sayıda soru bulunmuyor.", questions: [], completed: false };
        }

        const shuffled = allQuestions.sort(() => 0.5 - Math.random());
        const selectedQuestions = shuffled.slice(0, 5);

        return { questions: selectedQuestions, completed: false };

    } catch (error: any) {
        console.error("Error getting daily quest:", error);
        return { error: "Günün görevi alınırken bir hata oluştu.", questions: [], completed: false };
    }
}

export async function submitDailyQuestAction(userId: string | null, score: number, correctAnswers: number): Promise<{ success: boolean; error?: string }> {
    if (!userId) {
        return { success: false, error: "Kullanıcı girişi yapılmamış." };
    }

    const today = getTodayDateString();
    const questRef = doc(db, 'users', userId, 'dailyQuests', today);
    const userRef = doc(db, 'users', userId);

    try {
        // Critical check: Ensure the quest for today hasn't already been completed.
        const questSnap = await getDoc(questRef);
        if (questSnap.exists() && questSnap.data().completed) {
            return { success: false, error: "Günün görevi zaten tamamlanmış ve puanlar daha önce kaydedilmiş." };
        }
        
        const bonusPoints = correctAnswers === 5 ? 50 : 0;
        const totalPoints = score + bonusPoints;
        
        const batch = writeBatch(db);
        
        // 1. Mark the daily quest as completed with its score details.
        batch.set(questRef, {
            completed: true,
            score: score,
            bonus: bonusPoints,
            timestamp: serverTimestamp()
        });

        // 2. Update the user's main score only if there are points to add.
        if (totalPoints > 0) {
            batch.update(userRef, {
                score: increment(totalPoints)
            });

            // 3. Log the score event for leaderboard and history.
            const eventRef = doc(collection(db, 'scoreEvents'));
            batch.set(eventRef, {
                userId: userId,
                points: totalPoints,
                timestamp: serverTimestamp(),
                gameType: 'Günün Görevi',
                context: `${correctAnswers}/5 Doğru - ${bonusPoints > 0 ? 'Bonuslu!' : ''}`,
            });
        }

        await batch.commit();

        return { success: true };

    } catch (error: any) {
        console.error("Error submitting daily quest:", error);
        return { success: false, error: "Görevin sonucu kaydedilirken bir veritabanı hatası oluştu." };
    }
}
