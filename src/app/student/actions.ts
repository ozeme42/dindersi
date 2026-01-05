'use server';

import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, getDoc, query, where, Timestamp, getDocs } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { getTurkeyDateString } from '@/lib/utils';

// --- YARDIMCI: Gün Farkı Hesaplama ---
function calculateDaysDiff(lastDateStr: string, todayStr: string): number {
    const d1 = new Date(lastDateStr);
    const d2 = new Date(todayStr);
    // UTC çevirimi yaparak saat farkı kaynaklı hataları önleriz
    const utc1 = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate());
    const utc2 = Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate());
    return Math.floor((utc2 - utc1) / (1000 * 60 * 60 * 24));
}

// 1. Manuel Kontrol ve Puan Yükleme Kontrolü
export async function forceStreakCheck(userId: string): Promise<{ streakUpdated: boolean, newStreak: number, canSpinWheel: boolean }> {
    if (!userId) return { streakUpdated: false, newStreak: 0, canSpinWheel: false };

    try {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
             return { streakUpdated: false, newStreak: 0, canSpinWheel: false };
        }
        const userData = userSnap.data() as UserProfile;
        
        // Mantığı burada çağırıyoruz
        return await checkAndUpdateStreak(userId, userData);

    } catch (error) {
        console.error("Force check error:", error);
        return { streakUpdated: false, newStreak: 0, canSpinWheel: false };
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
        
        // Puan eklendikten sonra seri kontrolünü tetikle
        if (score > 0) {
           await forceStreakCheck(userId);
        }

    } catch (error) {
        console.error("Error updating score:", error);
    }
}

// 3. Seri Hesaplama Mantığı (GÜNCELLENMİŞ VERSİYON)
async function checkAndUpdateStreak(userId: string, userData: UserProfile): Promise<{ streakUpdated: boolean, newStreak: number, canSpinWheel: boolean }> {
    const todayStr = getTurkeyDateString(); // Örn: "2024-01-05"
    let currentStreak = userData.currentStreak || 0;
    const lastStreakDateStr = userData.lastStreakDate; // Örn: "2024-01-03"

    const userRef = doc(db, 'users', userId);

    // --- ADIM 1: SERİ SIFIRLAMA KONTROLÜ (Passive Check) ---
    // Bu adım, puan kazanılmasa bile Dashboard açıldığı an çalışır.
    
    if (lastStreakDateStr) {
        const diffDays = calculateDaysDiff(lastStreakDateStr, todayStr);

        // Eğer fark 1 günden fazlaysa (Örn: En son 3'ünde yaptı, bugün ayın 5'i. Fark = 2)
        // Seri BOZULMUŞTUR. Sıfırlamamız gerekir.
        if (diffDays > 1) {
            currentStreak = 0;
            // Veritabanını hemen güncelle, böylece ekranda 0 görünür.
            await updateDoc(userRef, {
                currentStreak: 0
                // lastStreakDate'i güncellemiyoruz ki en son ne zaman yaptığını bilelim (opsiyonel)
            });
        }
    } else if (currentStreak > 0 && !lastStreakDateStr) {
        // Eski veri hatası varsa ve tarih yoksa ama seri varsa sıfırla
        currentStreak = 0;
        await updateDoc(userRef, { currentStreak: 0 });
    }

    // --- ADIM 2: ÇARK KONTROLÜ (Mevcut duruma göre) ---
    const lastSpinDate = userData.lastWheelSpin ? (userData.lastWheelSpin as Timestamp).toDate() : null;
    const lastSpinStr = lastSpinDate ? getTurkeyDateString(lastSpinDate) : null;
    // Çark hakkı: Seri > 0, 7'nin katı ve bugün çevrilmemiş.
    const canSpin = currentStreak > 0 && currentStreak % 7 === 0 && lastSpinStr !== todayStr;


    // --- ADIM 3: BUGÜNKÜ PUAN HEDEFİ KONTROLÜ ---
    
    // Eğer bugün zaten seriye işlendiyse, tekrar artırma. Sadece mevcut durumu dön.
    if (userData.lastStreakDate === todayStr) {
         return { streakUpdated: false, newStreak: currentStreak, canSpinWheel: canSpin };
    }

    // Bugünün puanlarını topla
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
        if (!data.gameType?.startsWith('smartboard_') && data.gameType !== 'Derece Puanı' && data.gameType !== 'Manuel Puan' && data.gameType !== 'Hediye Puan') {
            return sum + (data.points || 0);
        }
        return sum;
    }, 0);
    
    // HEDEF TAMAMLANMADIYSA
    if (totalDailyScore < 500) {
        // Henüz hedef tamamlanmadı, ama yukarıdaki (Adım 1) sıfırlama işlemi yapılmış olabilir.
        // O yüzden güncel (belki de sıfırlanmış) currentStreak'i dönüyoruz.
        return { streakUpdated: false, newStreak: currentStreak, canSpinWheel: canSpin };
    }
    
    // --- ADIM 4: HEDEF TAMAMLANDI, SERİYİ ARTIR ---
    
    let newStreak = currentStreak;
    
    // Eğer sıfırlanmışsa (0) veya dünden devam ediyorsa artır
    // Not: Adım 1'de diffDays > 1 ise currentStreak zaten 0 yapılmıştı.
    // Dolayısıyla burada basitçe +1 yapabiliriz.
    newStreak += 1;

    const newLongestStreak = Math.max(userData.longestStreak || 0, newStreak);
    
    await updateDoc(userRef, {
        currentStreak: newStreak,
        longestStreak: newLongestStreak,
        lastStreakDate: todayStr, // Bugünü "yapıldı" olarak işaretle
    });

    // Çark hakkını yeni seriye göre tekrar hesapla
    const newCanSpin = newStreak > 0 && newStreak % 7 === 0 && lastSpinStr !== todayStr;

    return { streakUpdated: true, newStreak, canSpinWheel: newCanSpin };
}