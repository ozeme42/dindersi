
'use server';

import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";

export async function updateUnitContent(courseId: string, unitId: string, data: { title: string, htmlContent: string }): Promise<{ success: boolean, error?: string }> {
    try {
        const unitRef = doc(db, `courses/${courseId}/units/${unitId}`);
        await updateDoc(unitRef, data);
        return { success: true };
    } catch (e: any) {
        console.error("Error updating unit content:", e);
        return { success: false, error: "Ünite içeriği güncellenemedi." };
    }
}
