

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

        // Check if the streak goal for today has already been met and recorded.
        if (userData.lastStreakDate === todayStr) {
            const canSpin = (userData.currentStreak || 0) >= 7 && (!userData.lastWheelSpin || new Date(userData.lastWheelSpin).toDateString() !== today.toDateString());
            return { streakUpdated: false, newStreak: userData.currentStreak || 0, canSpinWheel: canSpin };
        }

        // Calculate total points earned today, EXCLUDING smartboard activities
        const startOfTodayDate = startOfDay(today);
        const endOfTodayDate = endOfDay(today);
        const scoreEventsQuery = query(
            collection(db, 'scoreEvents'),
            where('userId', '==', userId),
            where('timestamp', '>=', Timestamp.fromDate(startOfTodayDate)),
            where('timestamp', '<=', Timestamp.fromDate(endOfTodayDate))
        );
        
        const eventsSnapshot = await getDocs(scoreEventsQuery);
        
        const todayScore = eventsSnapshot.docs.reduce((sum, doc) => {
            const event = doc.data();
            // Only add points if it's NOT a smartboard game type or Derece/Manuel Puanı
            if (!event.gameType?.startsWith('smartboard_') && event.gameType !== 'Derece Puanı' && event.gameType !== 'Manuel Puan') {
                return sum + event.points;
            }
            return sum;
        }, 0);


        // If the 500 point goal for today is not met yet, exit.
        if (todayScore < 500) {
            const canSpin = (userData.currentStreak || 0) >= 7 && (!userData.lastWheelSpin || new Date(userData.lastWheelSpin).toDateString() !== today.toDateString());
            return { streakUpdated: false, newStreak: userData.currentStreak || 0, canSpinWheel: canSpin };
        }
        
        // At this point, the 500 point goal for today has been reached for the first time.
        
        const lastStreakDateObj = userData.lastStreakDate 
            ? (userData.lastStreakDate instanceof Timestamp ? userData.lastStreakDate.toDate() : new Date(userData.lastStreakDate))
            : null;
            
        const currentStreak = userData.currentStreak || 0;
        const longestStreak = userData.longestStreak || 0;

        let newStreak = currentStreak;

        if (lastStreakDateObj) {
            const diff = differenceInCalendarDays(today, lastStreakDateObj);
            if (diff === 1) {
                // Goal met yesterday, streak continues.
                newStreak = currentStreak + 1;
            } else if (diff > 1) {
                // Missed a day, streak is reset.
                newStreak = 1;
            }
            // if diff === 0, it means the goal was already met today, handled by the initial check.
        } else {
            // First time ever meeting the goal.
            newStreak = 1;
        }

        const newLongestStreak = Math.max(longestStreak, newStreak);
        
        // Update database
        await updateDoc(userRef, {
            currentStreak: newStreak,
            longestStreak: newLongestStreak,
            lastStreakDate: todayStr, // The last day the goal was met
        });
        
        const canSpinWheel = newStreak >= 7 && (!userData.lastWheelSpin || new Date(userData.lastWheelSpin).toDateString() !== today.toDateString());

        return { streakUpdated: true, newStreak, canSpinWheel };

    } catch (error) {
        console.error("Error updating streak:", error);
        return { streakUpdated: false, newStreak: 0, canSpinWheel: false };
    }
}
