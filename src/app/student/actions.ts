'use server';

import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, getDoc, query, where, Timestamp, getDocs } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';

// --- YARDIMCI: Türkiye Saat Dilimine Göre Tarih Stringi Al ---
// Bu fonksiyon "YYYY-MM-DD" formatında bugünün tarihini döner.
// UTC değil, TR saati baz alınır.
function getSafeTurkeyDateString(date: Date = new Date()): string {
    return date.toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' });
}

// --- YARDIMCI: Gün Farkı Hesaplama (String Tabanlı) ---
// "YYYY-MM-DD" formatındaki iki tarih arasındaki gün farkını bulur.
function calculateDaysDiff(dateStr1: string, dateStr2: string): number {
    const d1 = new Date(dateStr1);
    const d2 = new Date(dateStr2);
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// 1. Manuel Kontrol ve Puan Yükleme Kontrolü
export async function forceStreakCheck(userId: string): Promise<{ streakUpdated: boolean, newStreak: number, canSpinWheel: boolean, currentStreak: number }> {
    if (!userId) return { streakUpdated: false, newStreak: 0, canSpinWheel: false, currentStreak: 0 };

    try {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
             return { streakUpdated: false, newStreak: 0, canSpinWheel: false, currentStreak: 0 };
        }
        const userData = userSnap.data() as UserProfile;
        
        return await checkAndUpdateStreak(userId, userData);

    } catch (error) {
        console.error("Force check error:", error);
        return { streakUpdated: false, newStreak: 0, canSpinWheel: false, currentStreak: 0 };
    }
}


// 2. Puan Ekleme
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
        
        if (score > 0) {
           await forceStreakCheck(userId);
        }

    } catch (error) {
        console.error("Error updating score:", error);
    }
}

// 3. Seri Hesaplama Mantığı (GÜNCELLENMİŞ VERSİYON)
async function checkAndUpdateStreak(userId: string, userData: UserProfile): Promise<{ streakUpdated: boolean, newStreak: number, canSpinWheel: boolean, currentStreak: number }> {
    // 1. Türkiye saatine göre "BUGÜN"ü belirle
    const todayStr = getSafeTurkeyDateString(); 
    
    let currentStreak = userData.currentStreak || 0;
    const lastStreakDateStr = userData.lastStreakDate; // Örn: "2024-01-03"

    const userRef = doc(db, 'users', userId);
    let hasChanges = false; // Veritabanı güncellemesi gerekiyor mu?

    // --- ADIM 1: SERİ BOZULMA KONTROLÜ (RESET CHECK) ---
    if (lastStreakDateStr) {
        const diffDays = calculateDaysDiff(lastStreakDateStr, todayStr);

        // Fark 0 ise: Bugün zaten yapılmış (Sorun yok)
        // Fark 1 ise: Dün yapılmış, bugün bekleniyor (Sorun yok, seri devam edebilir)
        // Fark > 1 ise: Dün yapılmamış, seri bozulmuş. (Örn: 2 gün önce yapmış)
        if (diffDays > 1) {
            currentStreak = 0;
            hasChanges = true;
        }
    } else if (currentStreak > 0) {
        // Tarih yok ama seri var -> Hatalı durum, sıfırla
        currentStreak = 0;
        hasChanges = true;
    }

    // Eğer seri bozulduysa veritabanını güncelle
    if (hasChanges) {
        await updateDoc(userRef, { currentStreak: 0 });
    }

    // --- ADIM 2: ÇARK KONTROLÜ ---
    const lastSpinDate = userData.lastWheelSpin ? (userData.lastWheelSpin as Timestamp).toDate() : null;
    const lastSpinStr = lastSpinDate ? getSafeTurkeyDateString(lastSpinDate) : null;
    
    // Çark Hakkı Kuralı:
    // 1. Seri 0'dan büyük olmalı.
    // 2. Seri 7'nin katı olmalı (7, 14, 21...).
    // 3. Bugün henüz çevrilmemiş olmalı.
    const canSpin = currentStreak > 0 && currentStreak % 7 === 0 && lastSpinStr !== todayStr;


    // --- ADIM 3: BUGÜNKÜ PUAN HEDEFİ KONTROLÜ ---
    
    // Eğer bugün zaten seriye işlendiyse (lastStreakDate === todayStr),
    // tekrar artırma yapma. Sadece mevcut durumu dön.
    if (lastStreakDateStr === todayStr) {
         return { streakUpdated: false, newStreak: currentStreak, canSpinWheel: canSpin, currentStreak };
    }

    // Bugünün başlangıç ve bitişini TR saatine göre timestamp olarak hazırla
    // "2024-01-14" -> "2024-01-14T00:00:00+03:00"
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
        // Hariç tutulanlar
        if (!data.gameType?.startsWith('smartboard_') && data.gameType !== 'Derece Puanı' && data.gameType !== 'Manuel Puan' && data.gameType !== 'Hediye Puan') {
            return sum + (data.points || 0);
        }
        return sum;
    }, 0);
    
    // HEDEF TAMAMLANMADIYSA (500 PUAN)
    if (totalDailyScore < 500) {
        return { streakUpdated: false, newStreak: currentStreak, canSpinWheel: canSpin, currentStreak };
    }
    
    // --- ADIM 4: HEDEF TAMAMLANDI, SERİYİ ARTIR ---
    
    let newStreak = currentStreak;
    
    // Bugün ilk defa 500'ü geçiyor.
    // Eğer seri az önce sıfırlandıysa (bozulduysa) 0 -> 1 olur.
    // Eğer dün yaptıysa (devam ediyorsa) X -> X+1 olur.
    newStreak += 1;

    const newLongestStreak = Math.max(userData.longestStreak || 0, newStreak);
    
    await updateDoc(userRef, {
        currentStreak: newStreak,
        longestStreak: newLongestStreak,
        lastStreakDate: todayStr, // Bugünü "yapıldı" olarak işaretle
    });

    // Yeni seri değeriyle çark hakkını tekrar kontrol et
    const newCanSpin = newStreak > 0 && newStreak % 7 === 0 && lastSpinStr !== todayStr;

    return { streakUpdated: true, newStreak, canSpinWheel: newCanSpin, currentStreak: newStreak };
}