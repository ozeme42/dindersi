
'use server';

import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import type { LessonStep, YazilacaklarContent } from "@/lib/types";

export async function updateTopicContent({ 
    courseId, 
    unitId, 
    topicId, 
    steps, 
    sourceText,
    htmlContent
}: { 
    courseId: string; 
    unitId: string; 
    topicId: string; 
    steps: Omit<LessonStep, 'id'>[], 
    sourceText?: string;
    htmlContent?: string;
}) {
    try {
        const topicRef = doc(db, 'courses', courseId, 'units', unitId, 'topics', topicId);
        
        // Firestore works best with plain objects, so we serialize the steps array.
        const plainSteps = JSON.parse(JSON.stringify(steps));
        
        await updateDoc(topicRef, { 
            steps: plainSteps,
            sourceText: sourceText || '',
            htmlContent: htmlContent || '',
        });

        return { success: true };
    } catch (error: any) {
        console.error("Error updating topic content:", error);
        return { success: false, error: "Konu içeriği güncellenirken bir hata oluştu." };
    }
}
