
'use server';

import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import type { ActivityItem } from "@/lib/types";
import { unstable_noStore as noStore } from 'next/cache';

export type DogruYolQuestion = {
    q: string;
    correct: string;
    wrong: string;
}

export async function getDogruYolKosucusuAction(
    { courseId, unitId, topicId }: { courseId?: string; unitId?: string; topicId?: string; }
): Promise<{ questions: DogruYolQuestion[]; error?: string }> {
    noStore();
    try {
        let baseQuery = query(collection(db, 'activityItems'));

        const conditions = [];
        if (topicId && topicId !== 'all') {
            conditions.push(where("topicId", "==", topicId));
        } else if (unitId && unitId !== 'all') {
            conditions.push(where("unitId", "==", unitId));
        } else if (courseId && courseId !== 'all') {
            conditions.push(where("courseId", "==", courseId));
        }
        
        conditions.push(where('type', '==', 'definition'));

        const finalQuery = query(baseQuery, ...conditions);
        const snapshot = await getDocs(finalQuery);
        
        const allDefinitions = snapshot.docs
            .map(doc => doc.data() as ActivityItem)
            .filter(item => item.content?.term && item.content?.definition);

        if (allDefinitions.length < 2) {
            return { error: "Bu oyun için en az 2 farklı tanım/kavram gereklidir.", questions: [] };
        }
        
        // Create question-answer pairs
        const gameQuestions: DogruYolQuestion[] = allDefinitions.map((item, index, arr) => {
            const wrongOptions = arr.filter((_, i) => i !== index);
            const wrongAnswerItem = wrongOptions[Math.floor(Math.random() * wrongOptions.length)];

            return {
                q: item.content.definition!,
                correct: item.content.term!,
                wrong: wrongAnswerItem.content.term!
            };
        });

        return { questions: JSON.parse(JSON.stringify(gameQuestions)) };
    } catch (error: any) {
        console.error("Error getting Dogru Yol Kosucusu questions:", error);
        return { error: "Oyun için sorular alınırken bir hata oluştu.", questions: [] };
    }
}
