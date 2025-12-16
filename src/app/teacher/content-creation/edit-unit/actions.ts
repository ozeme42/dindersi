
'use server';

import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import type { LessonStep } from '@/lib/types';

export async function updateUnitContent(courseId: string, unitId: string, data: { title: string, htmlContent?: string, steps?: LessonStep[] }): Promise<{ success: boolean, error?: string }> {
    try {
        if (!courseId || !unitId) {
            throw new Error("Ders veya Ünite ID'si eksik.");
        }
        
        const unitRef = doc(db, `courses/${courseId}/units/${unitId}`);

        const dataToUpdate: any = {};
        if (data.title) {
            dataToUpdate.title = data.title;
        }
        // htmlContent'i korumak veya güncellemek için kontrol
        if (data.htmlContent !== undefined) {
            dataToUpdate.htmlContent = data.htmlContent;
        }
        if (data.steps !== undefined) {
             // Firestore'un anlayacağı düz objelere dönüştür
             dataToUpdate.steps = JSON.parse(JSON.stringify(data.steps));
        }

        await updateDoc(unitRef, dataToUpdate);
        return { success: true };
    } catch (e: any) {
        console.error("Error updating unit content:", e);
        return { success: false, error: "Ünite içeriği güncellenemedi." };
    }
}
