'use server';

import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import type { GetQuizInput, GetQuizOutput, Question } from "@/lib/types";

export type HangmanData = {
    word: string;
    hint: string;
};

// Bu fonksiyon, Adam Asmaca oyunu için gerekli kelime ve ipuçlarını veritabanından çeker.
// Özellikle "Boşluk Doldurma" ve "Tanım" türündeki verileri kullanarak oyun için uygun formatı oluşturur.
export async function getAdamAsmacaAction(params: { courseId?: string, unitId?: string, topicId?: string }): Promise<{ data?: HangmanData[], error?: string }> {
    const { courseId, unitId, topicId } = params;

    try {
        let conditions = [];
        
        // Konu, ünite veya derse göre filtreleme
        if (topicId && topicId !== 'all') {
            conditions.push(where("topicId", "==", topicId));
        } else if (unitId && unitId !== 'all') {
            conditions.push(where("unitId", "==", unitId));
        } else if (courseId && courseId !== 'all') {
            conditions.push(where("courseId", "==", courseId));
        }
        
        // Oyun için uygun veri türlerini seçme
        conditions.push(where("type", "in", ["definition", "fitb"]));

        const activityItemsRef = collection(db, "activityItems");
        const finalQuery = conditions.length > 0 ? query(activityItemsRef, ...conditions) : query(activityItemsRef);
        
        const querySnapshot = await getDocs(finalQuery);
        
        const allData: HangmanData[] = [];
        querySnapshot.forEach(doc => {
            const data = doc.data();
            if (data.type === 'definition' && data.content.term && data.content.definition) {
                // Tanım verisinden kelime ve ipucu oluştur
                allData.push({
                    word: data.content.term.toLocaleUpperCase('tr-TR'),
                    hint: data.content.definition,
                });
            } else if (data.type === 'fitb' && data.content.sentenceWithBlank && data.content.correctAnswer) {
                // Boşluk doldurma verisinden kelime ve ipucu oluştur
                 allData.push({
                    word: data.content.correctAnswer.toLocaleUpperCase('tr-TR'),
                    hint: data.content.sentenceWithBlank.replace('___', '...'),
                });
            }
        });

        if (allData.length === 0) {
            return { error: "Bu konu için Adam Asmaca oyununa uygun veri (tanım veya boşluk doldurma) bulunamadı." };
        }

        // Verileri karıştır ve 10 tanesini seç
        const shuffled = allData.sort(() => 0.5 - Math.random());
        const selectedData = shuffled.slice(0, 10);
        
        return { data: JSON.parse(JSON.stringify(selectedData)) };

    } catch (e: any) {
        console.error("Adam Asmaca verisi alınırken hata:", e);
        if (e.code === 'failed-precondition') {
            return { error: `Veritabanı indeksi eksik. Lütfen bu hatayı gidermek için geliştirici konsolundaki linki kullanın. Hata: ${e.message}` };
        }
        return { error: 'Oyun verileri alınırken bir veritabanı hatası oluştu.' };
    }
}

// Oyuncunun skorunu veritabanına kaydeder.
export async function submitAdamAsmacaScoreAction(userId: string, score: number, context: string): Promise<{ success: boolean, error?: string }> {
     if (!userId || score === undefined) {
        return { success: false, error: 'Kullanıcı ID veya skor eksik.' };
    }

    try {
        const { collection, addDoc, serverTimestamp, increment, runTransaction, doc } = await import("firebase/firestore");
        
        const userRef = doc(db, "users", userId);
        
        await runTransaction(db, async (transaction) => {
            transaction.update(userRef, { score: increment(score) });

            const scoreEventRef = doc(collection(db, 'scoreEvents'));
            transaction.set(scoreEventRef, {
                userId: userId,
                points: score,
                gameType: 'Adam Asmaca',
                context: context,
                timestamp: serverTimestamp(),
            });
        });

        return { success: true };
    } catch (error: any) {
        console.error("Adam Asmaca skoru kaydedilirken hata:", error);
        return { success: false, error: "Skor kaydedilirken bir veritabanı hatası oluştu." };
    }
}
