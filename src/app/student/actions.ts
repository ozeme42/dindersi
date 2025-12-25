
'use server';

import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, getDoc, query, where, Timestamp, getDocs } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';

// Türkiye saatine göre tarih stringi (YYYY-MM-DD)
function getTurkeyDateString(date: Date = new Date()): string {
    return new Date(date.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' })).toISOString().split('T')[0];
}

// 1. Manuel Kontrol İçin Fonksiyon (Artık daha basit)
export async function forceStreakCheck(userId: string) {
    // checkAndUpdateStreak fonksiyonu artık dışarıdan puan almayacak,
    // doğrudan DB'den kontrol edecek.
    return await checkAndUpdateStreak(userId);
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
        
        const isIndividualScore = !gameType.startsWith('smartboard_') && gameType !== 'Derece Puanı' && gameType !== 'Manuel Puan';
        if (isIndividualScore && score > 0) {
           await checkAndUpdateStreak(userId);
        }

    } catch (error) {
        console.error("Error updating score:", error);
    }
}

// 3. Seri Hesaplama Mantığı (YENİDEN DÜZENLENDİ)
export async function checkAndUpdateStreak(userId: string): Promise<{ streakUpdated: boolean, newStreak: number, canSpinWheel: boolean }> {
    if (!userId) return { streakUpdated: false, newStreak: 0, canSpinWheel: false };

    const userRef = doc(db, 'users', userId);
    
    try {
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) return { streakUpdated: false, newStreak: 0, canSpinWheel: false };

        const userData = userSnap.data() as UserProfile;
        const todayStr = getTurkeyDateString(); 

        // Bugünün hedefi zaten tamamlandıysa başka bir işlem yapma.
        if (userData.lastStreakDate === todayStr) {
             const canSpin = (userData.currentStreak || 0) >= 7 && (!userData.lastWheelSpin || getTurkeyDateString(new Date(userData.lastWheelSpin)) !== todayStr);
             return { streakUpdated: false, newStreak: userData.currentStreak || 0, canSpinWheel: canSpin };
        }

        // Günlük Puan Kontrolü (O GÜNE AİT TÜM PUANLARI YENİDEN HESAPLA)
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
            // Seriyi etkilemeyecek puan türlerini hariç tut
            if (!data.gameType?.startsWith('smartboard_') && data.gameType !== 'Derece Puanı' && data.gameType !== 'Manuel Puan') {
                return sum + (data.points || 0);
            }
            return sum;
        }, 0);
        
        if (totalDailyScore < 500) {
             // Hedef tamamlanmadı, bir şey yapma
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
            
            const diffDays = (utcToday - utcLast) / (1000 * 60 * 60 * 24);

            if (diffDays === 1) {
                newStreak += 1;
            } else if (diffDays > 1) {
                newStreak = 1;
            }
        } else {
            newStreak = 1;
        }

        const newLongestStreak = Math.max(userData.longestStreak || 0, newStreak);
        
        await updateDoc(userRef, {
            currentStreak: newStreak,
            longestStreak: newLongestStreak,
            lastStreakDate: todayStr,
        });

        const lastSpinStr = userData.lastWheelSpin ? getTurkeyDateString(new Date(userData.lastWheelSpin)) : "";
        const canSpinWheel = newStreak >= 7 && lastSpinStr !== todayStr;

        return { streakUpdated: true, newStreak, canSpinWheel };

    } catch (error) {
        console.error("Streak Error:", error);
        return { streakUpdated: false, newStreak: 0, canSpinWheel: false };
    }
}
