

'use server';

import { db } from "@/lib/firebase";
import { doc, updateDoc, setDoc, writeBatch, collection, serverTimestamp } from "firebase/firestore";
import type { LessonStep, YazilacaklarContent, ActivityItem } from "@/lib/types";

export async function updateTopicContent({ 
    courseId, 
    unitId, 
    topicId, 
    writingContent 
}: { 
    courseId: string; 
    unitId: string; 
    topicId: string; 
    writingContent: YazilacaklarContent;
}): Promise<{ success: boolean; error?: string }> {
    if (!courseId || !unitId || !topicId) {
        return { success: false, error: "Eksik bilgi: Ders, ünite veya konu ID'si belirtilmemiş." };
    }

    try {
        const topicRef = doc(db, `courses/${courseId}/units/${unitId}/topics/${topicId}`);
        const dataToUpdate: { writingContent?: { notes: string[] } } = {};

        if (writingContent?.notes) {
            dataToUpdate.writingContent = { notes: writingContent.notes };
        }
        
        await updateDoc(topicRef, dataToUpdate);

        return { success: true };
    } catch (error: any) {
        console.error("Error updating topic content:", error);
        return { success: false, error: "Konu içeriği güncellenirken bir hata oluştu." };
    }
}
