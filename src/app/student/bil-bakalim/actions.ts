
'use server';

import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import type { ActivityItem } from '@/lib/types';
import { unstable_noStore as noStore } from 'next/cache';

export type TermData = {
    id: string;
    term: string;       // Kavram (Cevap)
    definition: string; // Tanım (Soru)
};

export async function getBilBakalimAction(
    { courseId, unitId, topicId }: { courseId?: string; unitId?: string; topicId?: string; }
): Promise<{ data: TermData[]; error?: string }> {
    noStore();
    try {
        let q = query(collection(db, 'activityItems'));
        
        let conditions = [];
        if (topicId && topicId !== 'all') {
            conditions.push(where("topicId", "==", topicId));
        } else if (unitId && unitId !== 'all') {
            conditions.push(where("unitId", "==", unitId));
        } else if (courseId && courseId !== 'all') {
            conditions.push(where("courseId", "==", courseId));
        }

        if (conditions.length > 0) {
            q = query(q, ...conditions);
        }

        const querySnapshot = await getDocs(q);
        const allDefinitions = querySnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as ActivityItem))
            .filter(item => item.type === 'definition' && item.content?.term && item.content?.definition)
            .map(item => ({
                id: item.id,
                term: item.content.term!,
                definition: item.content.definition!,
            }));

        if (allDefinitions.length < 4) {
            return { error: "Bu oyun için en az 4 kavram-tanım çifti gereklidir.", data: [] };
        }

        return { data: JSON.parse(JSON.stringify(allDefinitions)) };
    } catch (error: any) {
        console.error("Error getting Bil Bakalım data:", error);
        return { error: "Bil Bakalım görevi verileri alınırken bir hata oluştu.", data: [] };
    }
}


export async function submitBilBakalimScoreAction(userId: string | null, score: number, context: string): Promise<{ success: boolean; error?: string }> {
    // This is now handled client-side for this mock/standalone version.
    // In a real app, you would implement the score submission here.
    if (userId) {
        console.log(`Submitting score for ${userId}: ${score} points for context: ${context}`);
        // Here you would add the logic to write to Firestore.
    }
    return { success: true };
}
