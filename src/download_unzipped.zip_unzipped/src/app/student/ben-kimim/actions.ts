
'use server';

import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, increment, collection, getDocs, query, where, addDoc, serverTimestamp, writeBatch, getCountFromServer } from 'firebase/firestore';
import { unstable_noStore as noStore } from 'next/cache';
import type { ActivityItem, Question, Course } from '@/lib/types';

export type BenKimimQuestion = {
    id: string;
    questionText: string;
    options: string[];
    correctAnswer: string;
};

// Simple array shuffle function
const shuffleArray = <T>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

export async function getBenKimimAction(
    { courseId, unitId, topicId }: { courseId?: string; unitId?: string; topicId?: string; }
): Promise<{ questions: BenKimimQuestion[]; error?: string }> {
    noStore();
    try {
        let baseQuery = query(collection(db, 'activityItems'));

        if (topicId && topicId !== 'all') {
            baseQuery = query(baseQuery, where("topicId", "==", topicId));
        } else if (unitId && unitId !== 'all') {
            baseQuery = query(baseQuery, where("unitId", "==", unitId));
        } else if (courseId && courseId !== 'all') {
            baseQuery = query(baseQuery, where("courseId", "==", courseId));
        }
        
        const definitionsQuery = query(baseQuery, where('type', '==', 'definition'));
        const definitionsSnapshot = await getDocs(definitionsQuery);
        
        const allDefinitions = definitionsSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as ActivityItem))
            .filter(item => item.content?.term && item.content?.definition);

        if (allDefinitions.length < 1) {
            return { error: "Ben Kimim? için bu konuda uygun tanım bulunamadı.", questions: [] };
        }

        // --- Improved Distractor Pool Logic ---
        let distractorPoolQuery = query(collection(db, 'activityItems'), where('type', '==', 'concept'));
        
        if (courseId && courseId !== 'all') {
            const courseRef = doc(db, 'courses', courseId);
            const courseSnap = await getDoc(courseRef);
            const courseData = courseSnap.exists() ? courseSnap.data() as Course : null;
            
            if (courseData?.classId) {
                 const classCourseIdsSnap = await getDocs(query(collection(db, 'courses'), where('classId', '==', courseData.classId)));
                 const classCourseIds = classCourseIdsSnap.docs.map(d => d.id);
                 if(classCourseIds.length > 0) {
                    distractorPoolQuery = query(distractorPoolQuery, where('courseId', 'in', classCourseIds.slice(0, 30)));
                 }
            } else {
                distractorPoolQuery = query(distractorPoolQuery, where('courseId', '==', courseId));
            }
        }
        
        const conceptsSnapshot = await getDocs(distractorPoolQuery);
        const distractorPool = conceptsSnapshot.docs.map(doc => (doc.data() as ActivityItem).content.text!).filter(Boolean);
        const uniqueDistractors = [...new Set(distractorPool)];

        const selectedDefinitions = shuffleArray(allDefinitions).slice(0, 10);

        const gameQuestions: BenKimimQuestion[] = selectedDefinitions.map((item) => {
            const correctAnswer = item.content.term!;
            const questionText = item.content.definition!;
            
            const distractors = shuffleArray(uniqueDistractors.filter(d => d !== correctAnswer)).slice(0, 3);
            const options = shuffleArray([correctAnswer, ...distractors]);
            
            return {
                id: item.id,
                questionText: questionText,
                correctAnswer: correctAnswer,
                options: options,
            };
        });
        
        const finalQuestions = gameQuestions.filter(q => q.options?.length === 4);
        if (finalQuestions.length === 0 && selectedDefinitions.length > 0) {
            return { error: "Sorular için yeterli sayıda seçenek bulunamadı.", questions: [] };
        }

        return { questions: finalQuestions };

    } catch (error: any) {
        console.error("Error getting Ben Kimim? questions:", error);
        return { error: "Ben Kimim? görevi alınırken bir hata oluştu.", questions: [] };
    }
}


export async function submitBenKimimScoreAction(userId: string | null, score: number, context: string): Promise<{ success: boolean; error?: string }> {
    if (!userId || score <= 0) {
        return { success: true };
    }

    try {
        const attemptsQuery = query(
            collection(db, 'scoreEvents'),
            where('userId', '==', userId),
            where('gameType', '==', 'Ben Kimim?'),
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
            gameType: 'Ben Kimim?',
            context: context,
        });

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Error submitting Ben Kimim? score:", error);
        return { success: false, error: "Skor kaydedilirken bir hata oluştu." };
    }
}
