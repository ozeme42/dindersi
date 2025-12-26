'use server';

import { db } from '@/lib/firebase';
import { doc, collection, serverTimestamp, runTransaction } from 'firebase/firestore'; // collection eklendi
import type { UserProfile } from '@/lib/types';

// Türkiye saatine göre tarih stringi (YYYY-MM-DD)
// Bu fonksiyonu utils'den de alabilirsin ama burada garanti olsun diye inline tanımladım.
function getTurkeyDateString(date: Date = new Date()): string {
    return date.toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' });
}

export async function claimWheelPrize(userId: string, prizeAmount: number): Promise<{ success: boolean; error?: string }> {
    if (!userId || !prizeAmount) {
        return { success: false, error: 'Eksik veri.' };
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

            // --- GÜVENLİK KONTROLLERİ ---
            // 1. Seri Kontrolü
            if ((userData.currentStreak || 0) < 7) {
                // Not: Test aşamasında burayı yorum satırı yapabilirsin.
                throw new Error("Çarkı çevirmek için 7 günlük seriye ulaşmalısın.");
            }

            // 2. Tarih Kontrolü (Bugün çevirdi mi?)
            const lastSpinStr = userData.lastWheelSpin 
                ? getTurkeyDateString(userData.lastWheelSpin.toDate()) // Timestamp -> Date -> String
                : "";

            if (lastSpinStr === todayStr) {
                throw new Error("Şans çarkını bugün zaten çevirdin. Yarın yine gel!");
            }

            // --- GÜNCELLEME ---
            // 1. Kullanıcı Puanını ve Çark Tarihini Güncelle
            transaction.update(userRef, { 
                score: (userData.score || 0) + prizeAmount,
                lastWheelSpin: serverTimestamp() // Firestore sunucu zamanı
            });

            // 2. Skor Geçmişine Kayıt At
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
        console.error("Wheel Claim Error:", e);
        return { success: false, error: e.message || "Ödül alınırken sunucu hatası oluştu." };
    }
}