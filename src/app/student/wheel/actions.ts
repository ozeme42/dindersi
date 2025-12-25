
'use server';

import { db } from '@/lib/firebase';
import { doc, getDoc, serverTimestamp, runTransaction } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { getTurkeyDateString } from '@/lib/utils';

// This function will be called AFTER the wheel spin animation on the client
// to award the points and mark the wheel as spun for the day.
export async function claimWheelPrize(userId: string, prizeAmount: number): Promise<{ success: boolean; error?: string }> {
    if (!userId || !prizeAmount) {
        return { success: false, error: 'Kullanıcı veya ödül bilgisi eksik.' };
    }

    const userRef = doc(db, 'users', userId);
    const todayStr = getTurkeyDateString();

    try {
        await runTransaction(db, async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists()) {
                throw new Error("Kullanıcı bulunamadı.");
            }
            
            const userData = userDoc.data() as UserProfile;

            // Double-check eligibility on the server
            const lastSpinStr = userData.lastWheelSpin ? getTurkeyDateString(new Date(userData.lastWheelSpin)) : "";
            if ((userData.currentStreak || 0) < 7) {
                throw new Error("Çarkı çevirmek için yeterli seriniz yok.");
            }
            if (lastSpinStr === todayStr) {
                throw new Error("Şans çarkını bugün zaten çevirdiniz.");
            }

            // 1. Update user's score
            transaction.update(userRef, { 
                score: (userData.score || 0) + prizeAmount,
                lastWheelSpin: new Date().toISOString() // Mark as spun today
            });

            // 2. Create a score event for the prize
            const scoreEventRef = doc(collection(db, 'scoreEvents'));
            transaction.set(scoreEventRef, {
                userId: userId,
                points: prizeAmount,
                gameType: 'Hediye Puan',
                context: 'Şans Çarkı Ödülü',
                timestamp: serverTimestamp(),
            });
        });

        return { success: true };
    } catch (e: any) {
        console.error("Error claiming wheel prize:", e);
        return { success: false, error: e.message || "Ödül alınırken bir sunucu hatası oluştu." };
    }
}
