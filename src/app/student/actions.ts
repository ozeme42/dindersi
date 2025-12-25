

'use server';

import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, getDoc, query, where, Timestamp, getDocs } from 'firebase/firestore';
import { format, subDays, differenceInCalendarDays, startOfDay, endOfDay } from 'date-fns';
import type { UserProfile } from '@/lib/types';


export async function updateScore(userId: string, score: number, gameType: string, context: string) {
    // This is a client-called function. It should not use the Admin SDK.
    if (process.env.NEXT_PUBLIC_STATIC_BUILD === 'true') {
        console.log(`Static mode: Score update for ${userId} ignored.`);
        return;
    }

    if (!userId || !gameType) {
        console.error("User ID or game type is missing for score update.");
        return;
    }

    try {
        // Use client SDK 'db' from @/lib/firebase
        await addDoc(collection(db, 'scoreEvents'), {
            userId: userId,
            points: score,
            gameType: gameType,
            context: context,
            timestamp: serverTimestamp()
        });
        
        // Puan eklendikten sonra seri kontrolünü tetikle
        await checkAndUpdateStreak(userId);

    } catch (error) {
        console.error("Error updating score in actions.ts: ", error);
        // We don't throw an error here to prevent the client from crashing
        // if score logging fails. This is a background task.
    }
}


export async function checkAndUpdateStreak(userId: string): Promise<{ streakUpdated: boolean, newStreak: number, canSpinWheel: boolean }> {
    if (!userId) {
        return { streakUpdated: false, newStreak: 0, canSpinWheel: false };
    }

    const userRef = doc(db, 'users', userId);
    
    try {
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
            return { streakUpdated: false, newStreak: 0, canSpinWheel: false };
        }

        const userData = userSnap.data() as UserProfile;
        const today = new Date();
        const todayStr = format(today, 'yyyy-MM-dd');

        // Eğer bugün için seri zaten güncellendiyse, tekrar işlem yapma.
        if (userData.lastStreakCheckDate === todayStr) {
            const canSpin = (userData.currentStreak || 0) >= 7 && (!userData.lastWheelSpin || new Date(userData.lastWheelSpin) < new Date(today.toDateString()));
            return { streakUpdated: false, newStreak: userData.currentStreak || 0, canSpinWheel: canSpin };
        }

        // Bugün kazanılan toplam puanı hesapla
        const startOfTodayDate = startOfDay(today);
        const endOfTodayDate = endOfDay(today);
        const scoreEventsQuery = query(
            collection(db, 'scoreEvents'),
            where('userId', '==', userId),
            where('timestamp', '>=', Timestamp.fromDate(startOfTodayDate)),
            where('timestamp', '<=', Timestamp.fromDate(endOfTodayDate))
        );
        
        const eventsSnapshot = await getDocs(scoreEventsQuery);
        const todayScore = eventsSnapshot.docs.reduce((sum, doc) => sum + doc.data().points, 0);

        // Eğer bugün 500 puandan az kazanılmışsa, seri güncellemesi yapma ve çık.
        if (todayScore < 500) {
            const canSpin = (userData.currentStreak || 0) >= 7 && (!userData.lastWheelSpin || new Date(userData.lastWheelSpin) < new Date(today.toDateString()));
            return { streakUpdated: false, newStreak: userData.currentStreak || 0, canSpinWheel: canSpin };
        }
        
        // Bu noktadan sonra, bugün 500 puan barajı aşıldı demektir.
        
        const lastStreakDate = userData.lastStreakDate ? new Date(userData.lastStreakDate) : null;
        const currentStreak = userData.currentStreak || 0;
        const longestStreak = userData.longestStreak || 0;

        let newStreak = currentStreak;

        if (lastStreakDate) {
            const diff = differenceInCalendarDays(today, lastStreakDate);
            if (diff === 1) {
                // Dün de hedefe ulaşılmış, seri devam ediyor.
                newStreak = currentStreak + 1;
            } else if (diff > 1) {
                // Arada boş gün var, seri bozuldu.
                newStreak = 1;
            }
            // diff === 0 ise (aynı gün) seri değişmez, bu durum en başta kontrol ediliyor.
        } else {
            // İlk kez hedefe ulaşıldı.
            newStreak = 1;
        }

        const newLongestStreak = Math.max(longestStreak, newStreak);
        
        // Veritabanını güncelle
        await updateDoc(userRef, {
            currentStreak: newStreak,
            longestStreak: newLongestStreak,
            lastStreakDate: todayStr, // Hedefe ulaşılan son gün
            lastStreakCheckDate: todayStr, // Bu kontrolün yapıldığı gün (tekrar tekrar çalışmasın diye)
        });
        
        const canSpinWheel = newStreak >= 7 && (!userData.lastWheelSpin || new Date(userData.lastWheelSpin) < new Date(today.toDateString()));

        return { streakUpdated: true, newStreak, canSpinWheel };

    } catch (error) {
        console.error("Error updating streak:", error);
        return { streakUpdated: false, newStreak: 0, canSpinWheel: false };
    }
}
