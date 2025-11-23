

'use server';

import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

export async function getGuestPlayers(teacherId: string): Promise<string[]> {
    try {
        const teacherRef = doc(db, 'users', teacherId);
        const docSnap = await getDoc(teacherRef);
        if (docSnap.exists()) {
            return docSnap.data().guestPlayers || [];
        }
        return [];
    } catch (error) {
        console.error("Error fetching guest players: ", error);
        return [];
    }
}

export async function saveGuestPlayers(teacherId: string, players: string[]): Promise<{ success: boolean; error?: string }> {
    try {
        const teacherRef = doc(db, 'users', teacherId);
        await updateDoc(teacherRef, { guestPlayers: players });
        return { success: true };
    } catch (error) {
        console.error("Error saving guest players: ", error);
        return { success: false, error: "Misafir oyuncular kaydedilirken bir hata oluştu." };
    }
}
