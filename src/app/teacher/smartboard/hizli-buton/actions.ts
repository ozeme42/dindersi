'use server';

import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, limit as firestoreLimit } from "firebase/firestore";
import type { Question, ActivityItem } from "@/lib/types";
import { unstable_noStore as noStore } from 'next/cache';

export type HizliButonQuestion = {
    q: string; // The definition
    a: string; // The correct term
};

export async function getHizliButonQuestions(
    { courseId, unitId, topicId }: { courseId?: string; unitId?: string; topicId?: string; }
): Promise<{ questions: HizliButonQuestion[]; error?: string }> {
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
        
        const snapshot = await getDocs(baseQuery);
        
        const allDefinitions = snapshot.docs
            .map(doc => doc.data() as ActivityItem)
            .filter(item => item.content?.term && item.content?.definition);

        if (allDefinitions.length < 1) {
            return { error: "Bu oyun için en az 1 tanım/kavram gereklidir.", questions: [] };
        }
        
        const gameQuestions: HizliButonQuestion[] = allDefinitions.map(item => ({
            q: item.content.definition!,
            a: item.content.term!,
        }));

        return { questions: JSON.parse(JSON.stringify(gameQuestions.sort(() => 0.5 - Math.random()))) };
    } catch (error: any) {
        console.error("Error getting Hizli Buton data:", error);
        return { error: "Oyun için veriler alınırken bir hata oluştu.", questions: [] };
    }
}
