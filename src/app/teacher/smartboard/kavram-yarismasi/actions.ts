
'use server';

import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from 'firebase/firestore';
import type { ActivityItem } from '@/lib/types';

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
  try {
     const isStatic = process.env.STATIC_BUILD;
     let items: Pick<ActivityItem, 'id' | 'content'>[] = [];

     if (isStatic) {
         const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/curriculum/activities/${topicId}.json`);
         if(res.ok) {
             items = await res.json();
         } else {
            return { concepts: [], error: `Static activity data for topic ${topicId} not found.` };
         }
     } else {
        const q = query(
          collection(db, "activityItems"),
          where("topicId", "==", topicId),
          where("type", "in", ["concept", "definition"])
        );
        const querySnapshot = await getDocs(q);
        items = querySnapshot.docs.map(doc => ({ id: doc.id, content: doc.data().content as ActivityItem['content'] }));
     }
    
    if (items.length === 0) {
      return { concepts: [], error: "Bu konu için 'kavram' veya 'tanım' türünde etkinlik verisi bulunamadı." };
    }

    const conceptsMap = new Map<string, Partial<ConceptQuizConcept>>();

    items.forEach(item => {
      if (item.content.term && item.content.definition) { // It's a definition
        const existing = conceptsMap.get(item.content.term) || {};
        conceptsMap.set(item.content.term, { ...existing, id: item.id, name: item.content.term, question: item.content.definition });
      } else if (item.content.text) { // It's a concept
        const existing = conceptsMap.get(item.content.text) || {};
        conceptsMap.set(item.content.text, { ...existing, id: item.id, name: item.content.text });
      }
    });

    const finalConcepts: ConceptQuizConcept[] = Array.from(conceptsMap.values())
      .filter(c => c.id && c.name && c.question)
      .map((c, index) => ({
        ...c,
        color: conceptColors[index % conceptColors.length]
      })) as ConceptQuizConcept[];

    if (finalConcepts.length < 2) {
        return { concepts: [], error: "Bu yarışma için en az 2 uygun kavram gereklidir." };
    }

    return { concepts: JSON.parse(JSON.stringify(finalConcepts)) };
  } catch (e: any) {
    console.error("Error fetching concept quiz data:", e);
    return { error: 'Veri alınırken bir hata oluştu.', concepts: [] };
  }
}
