

'use server';

import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import type { LessonStep } from "@/lib/types";

export async function updateSummerTopicContent({ 
    courseId, 
    topicId, 
    steps,
    sourceText
}: { 
    courseId: string; 
    topicId: string; 
    steps: Omit<LessonStep, 'id'>[],
    sourceText?: string
}) {
    try {
        const topicRef = doc(db, 'courses', courseId, 'topics', topicId);
        // Firestore works best with plain objects, so we serialize the steps array.
        const plainSteps = JSON.parse(JSON.stringify(steps));
        await updateDoc(topicRef, { 
            steps: plainSteps,
            sourceText: sourceText || '',
        });
        return { success: true };
    } catch (error: any) {
        console.error("Error updating summer topic steps:", error);
        return { success: false, error: "Konu adımları güncellenirken bir hata oluştu." };
    }
}
