

'use server';

import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";

export async function getGuestPlayers(teacherId: string): Promise<string[]> {
    try {
        const teacherRef = doc(db, 'users', teacherId);
        const docSnap = await getDoc(teacherRef);
        if (docSnap.exists()) {
            // Firestore'dan gelen diziyi sıralayarak döndür
            const players = docSnap.data().guestPlayers || [];
            return players.sort((a: string, b: string) => a.localeCompare(b, 'tr'));
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
        // SetDoc kullanarak alanı oluştur veya güncelle
        await setDoc(teacherRef, { guestPlayers: players }, { merge: true });
        return { success: true };
    } catch (error: any) {
        console.error("Error saving guest players: ", error);
        return { success: false, error: "Misafir oyuncular kaydedilirken bir hata oluştu." };
    }
}
