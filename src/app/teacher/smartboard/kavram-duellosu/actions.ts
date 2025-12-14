'use server';

import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, limit as firestoreLimit } from "firebase/firestore";
import type { Question, ActivityItem } from "@/lib/types";
import { unstable_noStore as noStore } from 'next/cache';

export type KavramDuellosuQuestion = {
    q: string; // The definition
    a: string; // The correct term
    options: string[]; // All options including correct one
};

export async function getKavramDuellosuQuestions(
    { courseId, unitId, topicId }: { courseId?: string; unitId?: string; topicId?: string; }
): Promise<{ questions: KavramDuellosuQuestion[]; error?: string }> {
    noStore();
    try {
        let baseQuery = query(collection(db, 'activityItems'), where('type', '==', 'definition'));
        let allItemsQuery = query(collection(db, 'activityItems'), where('type', '==', 'definition'));
        
        if (topicId && topicId !== 'all') {
            baseQuery = query(baseQuery, where("topicId", "==", topicId));
            allItemsQuery = query(allItemsQuery, where("topicId", "==", topicId));
        } else if (unitId && unitId !== 'all') {
            baseQuery = query(baseQuery, where("unitId", "==", unitId));
             allItemsQuery = query(allItemsQuery, where("unitId", "==", unitId));
        } else if (courseId && courseId !== 'all') {
            baseQuery = query(baseQuery, where("courseId", "==", courseId));
            allItemsQuery = query(allItemsQuery, where("courseId", "==", courseId));
        }
        
        const [snapshot, allItemsSnapshot] = await Promise.all([
            getDocs(baseQuery),
            getDocs(allItemsQuery)
        ]);
        
        const allDefinitions = snapshot.docs
            .map(doc => doc.data() as ActivityItem)
            .filter(item => item.content?.term && item.content?.definition);

        const allTerms = allItemsSnapshot.docs
            .map(doc => doc.data() as ActivityItem)
            .filter(item => item.content?.term)
            .map(item => item.content.term!);

        if (allDefinitions.length < 1 || allTerms.length < 4) {
            return { error: "Bu oyun için en az 1 tanım ve 4 farklı kavram gereklidir.", questions: [] };
        }
        
        const gameQuestions: KavramDuellosuQuestion[] = allDefinitions.map(item => {
            const correctAnswer = item.content.term!;
            const distractors = allTerms
                .filter(term => term !== correctAnswer)
                .sort(() => 0.5 - Math.random()) // Shuffle
                .slice(0, 3); // Get 3 distractors

            const options = [correctAnswer, ...distractors].sort(() => 0.5 - Math.random());

            return {
                q: item.content.definition!,
                a: correctAnswer,
                options: options,
            };
        });

        return { questions: JSON.parse(JSON.stringify(gameQuestions.sort(() => 0.5 - Math.random()))) };
    } catch (error: any) {
        console.error("Error getting Kavram Düellosu data:", error);
        return { error: "Oyun için veriler alınırken bir hata oluştu.", questions: [] };
    }
}
