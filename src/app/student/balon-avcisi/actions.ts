'use server';

import { db } from "@/lib/firebase";
import { doc, updateDoc, increment, collection, addDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { unstable_noStore as noStore } from 'next/cache';

// Bu veriler normalde Firestore'dan çekilebilir, şimdilik statik olarak burada duruyor.
const LEVELS = [
    { q: "Hz. Musa'nın Kitabı?", a: "Tevrat", wrongs: ["İncil", "Zebur", "Kur'an", "Suhuf"] },
    { q: "Hz. İsa'nın Kitabı?", a: "İncil", wrongs: ["Tevrat", "Zebur", "Kur'an", "Hadis"] },
    { q: "Hz. Davud'un Kitabı?", a: "Zebur", wrongs: ["Tevrat", "İncil", "Kur'an", "Siyer"] },
    { q: "Son İlahi Kitap?", a: "Kur'an", wrongs: ["İncil", "Tevrat", "Zebur", "Suhuf"] },
    { q: "Güvenilir Olmak?", a: "Emanet", wrongs: ["Sıdk", "İsmet", "Fetanet", "Tebliğ"] },
    { q: "Doğru Sözlü Olmak?", a: "Sıdk", wrongs: ["Emanet", "İsmet", "Fetanet", "Tebyin"] },
    { q: "Akıllı Olmak?", a: "Fetanet", wrongs: ["İsmet", "Emanet", "Sıdk", "Temsil"] },
    { q: "Günahsız Olmak?", a: "İsmet", wrongs: ["Sıdk", "Fetanet", "Emanet", "Tebliğ"] },
    { q: "Vahyi İletmek?", a: "Tebliğ", wrongs: ["Tebyin", "Temsil", "Tezkiye", "İnzar"] },
    { q: "İlk Peygamber?", a: "Hz. Adem", wrongs: ["Hz. Nuh", "Hz. İbrahim", "Hz. Musa", "Hz. İsa"] }
];

export async function getBalloonHuntQuestions(params: { topicId?: string }): Promise<{ levels?: any[]; error?: string }> {
    noStore();
    // TODO: Use topicId to fetch topic-specific questions from Firestore
    // For now, we return the static LEVELS array.
    return { levels: LEVELS };
}

export async function submitBalloonHuntScore(userId: string, score: number, context: string): Promise<{ success: boolean; error?: string }> {
    if (!userId || score <= 0) {
        return { success: true }; // No score to submit
    }
    
    try {
        const batch = writeBatch(db);
        
        // 1. Increment user's total score
        const userRef = doc(db, 'users', userId);
        batch.update(userRef, { score: increment(score) });

        // 2. Log the score event
        const eventRef = doc(collection(db, 'scoreEvents'));
        batch.set(eventRef, {
            userId: userId,
            points: score,
            timestamp: serverTimestamp(),
            gameType: 'Balon Avcısı',
            context: context,
        });

        await batch.commit();
        
        return { success: true };
    } catch (error: any) {
        console.error("Error submitting Balloon Hunt score:", error);
        return { success: false, error: "Skor kaydedilirken bir hata oluştu." };
    }
}
