

'use server';

import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, getDoc } from 'firebase/firestore';
import { format, subDays, differenceInCalendarDays } from 'date-fns';
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

        const lastLoginDate = userData.lastLoginDate ? new Date(userData.lastLoginDate) : null;

        // If last login is today, do nothing.
        if (userData.lastLoginDate === todayStr) {
             const canSpin = (userData.currentStreak || 0) >= 7 && (!userData.lastWheelSpin || new Date(userData.lastWheelSpin) < new Date(today.toDateString()));
            return { streakUpdated: false, newStreak: userData.currentStreak || 0, canSpinWheel: canSpin };
        }
        
        const currentStreak = userData.currentStreak || 0;
        const longestStreak = userData.longestStreak || 0;

        let newStreak = currentStreak;
        let streakUpdated = false;

        if (lastLoginDate) {
            const yesterday = subDays(today, 1);
            const diff = differenceInCalendarDays(today, lastLoginDate);

            if (diff === 1) {
                // Streak continues
                newStreak = currentStreak + 1;
            } else if (diff > 1) {
                // Streak is broken
                newStreak = 1;
            }
            // if diff is 0 or less, it's the same day, do nothing (handled above)
        } else {
            // First login
            newStreak = 1;
        }

        if (newStreak !== currentStreak) {
            streakUpdated = true;
            const newLongestStreak = Math.max(longestStreak, newStreak);
            await updateDoc(userRef, {
                currentStreak: newStreak,
                longestStreak: newLongestStreak,
                lastLoginDate: todayStr,
            });
        }
        
        const canSpinWheel = newStreak >= 7 && (!userData.lastWheelSpin || new Date(userData.lastWheelSpin) < new Date(today.toDateString()));

        return { streakUpdated, newStreak, canSpinWheel };

    } catch (error) {
        console.error("Error updating streak:", error);
        return { streakUpdated: false, newStreak: 0, canSpinWheel: false };
    }
}
