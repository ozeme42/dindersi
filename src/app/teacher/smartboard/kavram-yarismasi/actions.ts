
'use server';

import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import type { ActivityItem } from "@/lib/types";
import { unstable_noStore as noStore } from 'next/cache';


export type ConceptQuizConcept = {
  id: string; // doc id of the activityItem
  name: string; // term
  question: string; // definition
  color?: string;
};

const conceptColors = [
    'bg-blue-600', 'bg-green-600', 'bg-purple-600', 'bg-red-600', 'bg-yellow-600', 
    'bg-indigo-600', 'bg-pink-600', 'bg-teal-600', 'bg-orange-600', 'bg-cyan-600'
];

export async function getConceptQuizData(
    { courseId, unitId, topicId }: { courseId?: string; unitId?: string; topicId?: string; }
): Promise<{ concepts: ConceptQuizConcept[], error?: string }> {
    noStore();
    try {
        let q = query(collection(db, 'activityItems'), where('type', '==', 'definition'));

        if (topicId && topicId !== 'all') {
            q = query(q, where("topicId", "==", topicId));
        } else if (unitId && unitId !== 'all') {
            q = query(q, where("unitId", "==", unitId));
        } else if (courseId && courseId !== 'all') {
            q = query(q, where("courseId", "==", courseId));
        }
        
        const definitionsSnapshot = await getDocs(q);

        if (definitionsSnapshot.empty) {
            return { error: 'Bu seçime uygun kavram bulunamadı.', concepts: [] };
        }
        
        const concepts: ConceptQuizConcept[] = definitionsSnapshot.docs.map((doc, index) => {
            const item = doc.data() as ActivityItem;
            return {
                id: doc.id,
                name: item.content.term || '',
                question: item.content.definition || '',
                color: conceptColors[index % conceptColors.length]
            };
        }).filter(c => c.name && c.question);
        
        if (concepts.length < 2) {
             return { error: 'Bu yarışma için en az 2 uygun kavram gereklidir.', concepts: [] };
        }

        return { concepts: JSON.parse(JSON.stringify(concepts)) };
    } catch (error) {
        console.error("Error fetching concept quiz data: ", error);
        return { error: 'Veri alınırken bir hata oluştu.', concepts: [] };
    }
}
