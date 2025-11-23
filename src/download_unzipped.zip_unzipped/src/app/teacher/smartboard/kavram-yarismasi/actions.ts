
'use server';

import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import type { Question, GetQuizInput, GetQuizOutput, ActivityItem } from "@/lib/types";

export type ConceptQuizConcept = {
  id: string;
  name: string;
  question: string;
  color: string;
};

const colors = ['bg-blue-500', 'bg-green-500', 'bg-red-500', 'bg-yellow-500', 'bg-indigo-500', 'bg-pink-500', 'bg-purple-500', 'bg-orange-500', 'bg-teal-500', 'bg-cyan-500'];

export async function getConceptQuizData(topicId: string): Promise<{ concepts: ConceptQuizConcept[]; error?: string }> {
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
        color: colors[index % colors.length]
      })) as ConceptQuizConcept[];

    if (finalConcepts.length === 0) {
        return { concepts: [], error: "Kavramlar ve tanımları eşleştirilemedi. Lütfen veri bankasını kontrol edin." };
    }

    return { concepts: JSON.parse(JSON.stringify(finalConcepts)) };
  } catch (e: any) {
    console.error("Error fetching concept quiz data:", e);
    return { concepts: [], error: "Veriler alınırken bir hata oluştu." };
  }
}

    