
'use server';

import { db } from "@/lib/firebase";
import { 
  doc, 
  updateDoc, 
  increment, 
  collection, 
  addDoc, 
  serverTimestamp, 
  writeBatch, 
  query, 
  where, 
  getDocs, 
  getCountFromServer,
  limit 
} from 'firebase/firestore';
import { unstable_noStore as noStore } from 'next/cache';
import type { ActivityItem } from '@/lib/types';

export type HangmanData = {
    word: string;
    hint: string;
};

const MAX_ATTEMPTS_PER_CONTEXT = 10;
const POOL_SIZE_LIMIT = 100; // Okuma maliyetini düşürmek için sınır

export async function getAdamAsmacaAction(
    { courseId, unitId, topicId }: { courseId?: string; unitId?: string; topicId?: string; }
): Promise<{ data: HangmanData[] | null; error?: string }> {
    noStore();
    try {
        let baseQuery = query(collection(db, 'activityItems'), where('type', '==', 'definition'));

        if (topicId && topicId !== 'all') {
            baseQuery = query(baseQuery, where("topicId", "==", topicId));
        } else if (unitId && unitId !== 'all') {
            baseQuery = query(baseQuery, where("unitId", "==", unitId));
        } else if (courseId && courseId !== 'all') {
            baseQuery = query(baseQuery, where("courseId", "==", courseId));
        }

        // ! ÖNEMLİ: Firestore maliyetini korumak için limit ekliyoruz.
        const limitedQuery = query(baseQuery, limit(POOL_SIZE_LIMIT));
        const querySnapshot = await getDocs(limitedQuery);
        
        const allDefinitions = querySnapshot.docs.map(doc => doc.data() as ActivityItem);
        
        // Türkçe karakterleri ve sadece harfleri içeren Regex
        // Boşluk (space) karakterine izin vermiyoruz çünkü Adam Asmaca genelde tek kelime veya bitişik kelimelerle daha iyi çalışır.
        const turkishAlphabetRegex = /^[a-zA-ZçÇğĞıİöÖşŞüÜ]+$/;

        const suitableItems = allDefinitions.filter(item => 
            item.content &&
            item.content.term && 
            item.content.definition &&
            item.content.term.trim().length >= 4 && // En az 4 harf (Çok kısa kelimeler sıkıcı olur)
            item.content.term.trim().length <= 14 && // En çok 14 harf (Mobil ekrana sığması için)
            !item.content.term.includes(' ') && // Tek kelime olmalı
            turkishAlphabetRegex.test(item.content.term.trim()) // Sadece harf içermeli (Rakam/Sembol yok)
        );

        if (suitableItems.length < 3) {
            return { error: "Adam Asmaca oynamak için bu konuda yeterli uygunlukta kelime bulunamadı.", data: null };
        }
        
        // Fisher-Yates Shuffle
        const shuffled = [...suitableItems];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        const gameData: HangmanData[] = shuffled.slice(0, 10).map(item => ({
            word: item.content.term!.trim().toLocaleUpperCase('tr-TR'),
            hint: item.content.definition!,
        }));

        return { data: JSON.parse(JSON.stringify(gameData)) };

    } catch (error: any) {
        console.error("Server Action Error (getAdamAsmacaAction):", error);
        return { error: "Oyun verileri alınırken teknik bir hata oluştu.", data: null };
    }
}

export async function submitAdamAsmacaScoreAction(
    userId: string | null, 
    score: number, 
    context: string
): Promise<{ success: boolean; error?: string }> {
    if (!userId || score <= 0) return { success: true };
    
    try {
        // 1. Limit Kontrolü
        const attemptsQuery = query(
            collection(db, 'scoreEvents'),
            where('userId', '==', userId),
            where('gameType', '==', 'Adam Asmaca'),
            where('context', '==', context)
        );
        
        const attemptsSnapshot = await getCountFromServer(attemptsQuery);
        
        if (attemptsSnapshot.data().count >= MAX_ATTEMPTS_PER_CONTEXT) {
            return { 
                success: false, 
                error: `Bu etkinlikten daha fazla puan kazanamazsınız. Lütfen farklı bir konu seçin.` 
            };
        }

        // 2. Batch İşlemi
        const batch = writeBatch(db);
        
        // Kullanıcı puanını güncelle
        const userRef = doc(db, 'users', userId);
        batch.update(userRef, { score: increment(score) });

        // Etkinlik kaydını oluştur
        const eventRef = doc(collection(db, 'scoreEvents'));
        batch.set(eventRef, {
            userId: userId,
            points: score,
            timestamp: serverTimestamp(),
            gameType: 'Adam Asmaca',
            context: context,
            metadata: {
                platform: 'web',
                version: '2.0'
            }
        });

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Server Action Error (submitAdamAsmacaScoreAction):", error);
        return { success: false, error: "Skor kaydedilirken sunucu hatası oluştu." };
    }
}
