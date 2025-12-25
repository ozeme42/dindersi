
'use server';

import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, getDoc, query, where, Timestamp, getDocs } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';


function getTurkeyDateString(date: Date = new Date()): string {
    return new Date(date.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' })).toISOString().split('T')[0];
}

// 1. Manuel Kontrol ve Puan Yükleme Kontrolü İçin Fonksiyon
export async function forceStreakCheck(userId: string): Promise<{ streakUpdated: boolean, newStreak: number, canSpinWheel: boolean }> {
    if (!userId) return { streakUpdated: false, newStreak: 0, canSpinWheel: false };

    try {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
             return { streakUpdated: false, newStreak: 0, canSpinWheel: false };
        }
        const userData = userSnap.data() as UserProfile;
        
        return await checkAndUpdateStreak(userId, userData);

    } catch (error) {
        console.error("Force check error:", error);
        return { streakUpdated: false, newStreak: 0, canSpinWheel: false };
    }
}


// 2. Puan Ekleme (Sadece puan ekler ve seri kontrolünü tetikler)
export async function updateScore(userId: string, score: number, gameType: string, context: string) {
    if (process.env.NEXT_PUBLIC_STATIC_BUILD === 'true') return;
    if (!userId || !gameType) return;

    try {
        await addDoc(collection(db, 'scoreEvents'), {
            userId,
            points: score,
            gameType,
            context,
            timestamp: serverTimestamp()
        });
        
        // Puan eklendikten sonra seri kontrolünü tetikle
        if (score > 0) {
           await forceStreakCheck(userId);
        }

    } catch (error) {
        console.error("Error updating score:", error);
    }
}

// 3. Seri Hesaplama Mantığı (GÜVENİLİR VE YENİDEN YAZILMIŞ)
async function checkAndUpdateStreak(userId: string, userData: UserProfile): Promise<{ streakUpdated: boolean, newStreak: number, canSpinWheel: boolean }> {
    const todayStr = getTurkeyDateString();

    // Bugünün hedefi zaten tamamlandıysa başka bir işlem yapma.
    if (userData.lastStreakDate === todayStr) {
         const canSpin = (userData.currentStreak || 0) >= 7 && (!userData.lastWheelSpin || getTurkeyDateString(new Date(userData.lastWheelSpin)) !== todayStr);
         return { streakUpdated: false, newStreak: userData.currentStreak || 0, canSpinWheel: canSpin };
    }

    // Günlük Puan Kontrolü
    const startOfDay = new Date(`${todayStr}T00:00:00+03:00`);
    const endOfDay = new Date(`${todayStr}T23:59:59+03:00`);

    const q = query(
        collection(db, 'scoreEvents'),
        where('userId', '==', userId),
        where('timestamp', '>=', Timestamp.fromDate(startOfDay)),
        where('timestamp', '<=', Timestamp.fromDate(endOfDay))
    );
    
    const snapshot = await getDocs(q);
    
    const totalDailyScore = snapshot.docs.reduce((sum, d) => {
        const data = d.data();
        // Sadece bireysel kazanılan puanları say
        if (!data.gameType?.startsWith('smartboard_') && data.gameType !== 'Derece Puanı' && data.gameType !== 'Manuel Puan' && data.gameType !== 'Hediye Puan') {
            return sum + (data.points || 0);
        }
        return sum;
    }, 0);
    
    if (totalDailyScore < 500) {
        const canSpin = (userData.currentStreak || 0) >= 7 && (!userData.lastWheelSpin || getTurkeyDateString(new Date(userData.lastWheelSpin)) !== todayStr);
        return { streakUpdated: false, newStreak: userData.currentStreak || 0, canSpinWheel: canSpin };
    }
    
    // Hedef tamamlandı, seri mantığını çalıştır
    let newStreak = userData.currentStreak || 0;
    const lastStreakDateStr = userData.lastStreakDate;
    
    if (lastStreakDateStr) {
        const lastDate = new Date(lastStreakDateStr);
        const todayDate = new Date(todayStr);
        
        const utcLast = Date.UTC(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate());
        const utcToday = Date.UTC(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate());
        
        const diffDays = Math.round((utcToday - utcLast) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            newStreak += 1;
        } else if (diffDays > 1) {
            newStreak = 1;
        } // diffDays <= 0 ise bir şey yapma (aynı gün içinde tekrar tekrar tetiklenirse)
    } else {
        newStreak = 1;
    }

    const newLongestStreak = Math.max(userData.longestStreak || 0, newStreak);
    
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
        currentStreak: newStreak,
        longestStreak: newLongestStreak,
        lastStreakDate: todayStr,
    });

    const lastSpinStr = userData.lastWheelSpin ? getTurkeyDateString(new Date(userData.lastWheelSpin)) : "";
    const canSpinWheel = newStreak >= 7 && lastSpinStr !== todayStr;

    return { streakUpdated: true, newStreak, canSpinWheel };
}

// Geçici Test Fonksiyonu
export async function setStreakForTesting(userId: string, streakValue: number): Promise<{ success: boolean }> {
    if (!userId) return { success: false };
    
    const userRef = doc(db, 'users', userId);
    try {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = getTurkeyDateString(yesterday);

        await updateDoc(userRef, {
            currentStreak: streakValue,
            lastStreakDate: yesterdayStr,
            lastWheelSpin: null,
        });
        return { success: true };
    } catch (error) {
        console.error("Error setting streak for testing:", error);
        return { success: false };
    }
}
