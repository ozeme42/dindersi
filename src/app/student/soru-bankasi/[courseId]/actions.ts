'use server';

import { db } from "@/lib/firebase";
import { 
  doc, 
  getDoc, 
  setDoc, 
  increment, 
  collection, 
  serverTimestamp, 
  writeBatch,
  query,
  orderBy,
  limit,
  getDocs
} from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import fs from 'fs/promises';
import path from 'path';
import type { QuestionBankProgress, TestResult, Question, Course } from '@/lib/types';

// 1. DERS MÜFREDATINI ÇEK
export async function getCourseForSoruBankasi(courseId: string): Promise<{ course: Course | null, error?: string }> {
    try {
        const filePath = path.join(process.cwd(), 'public', 'curriculum', 'manifest.json');
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const manifest = JSON.parse(fileContent);
        
        let courseData: any = null;
        for (const group of manifest.classGroups) {
            const found = group.courses.find((c: any) => c.id === courseId);
            if (found) { courseData = found; break; }
        }
        
        if (!courseData) return { course: null, error: "Ders bulunamadı" };

        if (courseData.units) {
            courseData.units.sort((a: any, b: any) => (a.title || '').localeCompare(b.title || '', 'tr', { numeric: true }));
            courseData.units.forEach((unit: any) => {
                if (unit.topics) {
                    unit.topics.sort((a: any, b: any) => (a.title || '').localeCompare(b.title || '', 'tr', { numeric: true }));
                }
            });
        }
        return { course: JSON.parse(JSON.stringify(courseData)) };
    } catch (e) {
        console.error("Müfredat hatası:", e);
        return { course: null, error: "Sunucu hatası" };
    }
}

// 2. KULLANICININ İLERLEMESİNİ ÇEK
export async function getQuestionBankProgress(courseId: string, userId: string): Promise<QuestionBankProgress> {
    try {
        if (!userId || !courseId) return {};

        const docRef = doc(db, 'users', userId, 'questionBankProgress', courseId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            // Veriyi terminale yazdıralım ki çekildiğini görelim
            const data = docSnap.data();
            // console.log("ÇEKİLEN VERİ:", JSON.stringify(data, null, 2)); 
            return data as QuestionBankProgress;
        }
        
        return {};
    } catch (error) {
        console.error("İlerleme okuma hatası:", error);
        return {};
    }
}

// 3. TEST SONUCUNU KAYDET (GARANTİ METOD: Deep Merge)
export async function updateTopicTestProgress(
    userId: string, 
    courseId: string, 
    topicId: string, 
    difficulty: 'easy' | 'medium' | 'hard', 
    testIndex: number, 
    result: TestResult
) {
    try {
        // Parametre kontrolü
        if (!userId || !courseId || !topicId) {
            console.error("Eksik parametre ile kayıt denendi.");
            return { success: false, error: "Eksik parametre" };
        }

        // Object referansını kırmak için temiz bir kopya oluştur
        const safeResult = {
            status: result.status,
            correct: result.correct,
            total: result.total,
            score: result.score
        };

        const batch = writeBatch(db);
        const progressRef = doc(db, 'users', userId, 'questionBankProgress', courseId);
        
        // --- KRİTİK DÜZELTME ---
        // update() yerine set() kullanıyoruz.
        // Ama veriyi iç içe obje olarak elle hazırlıyoruz.
        // { merge: true } sayesinde Firestore bu yapıyı mevcut veriye "yama" yapar.
        // Diğer testleri veya konuları SİLMEZ.
        
        const dataToSave = {
            [topicId]: {
                [difficulty]: {
                    [testIndex]: safeResult
                }
            }
        };

        batch.set(progressRef, dataToSave, { merge: true });

        // Puan Ekleme
        if (result.score > 0) {
            const userRef = doc(db, 'users', userId);
            batch.update(userRef, { score: increment(result.score) });

            const eventRef = doc(collection(db, 'scoreEvents'));
            batch.set(eventRef, {
                userId,
                points: result.score,
                timestamp: serverTimestamp(),
                gameType: 'Soru Bankası',
                context: `${topicId} - ${difficulty} - Test ${testIndex + 1}`
            });
        }

        await batch.commit();
        
        console.log(`✅ KAYIT BAŞARILI: ${topicId} / ${difficulty} / Test ${testIndex}`);

        // Cache Temizle
        revalidatePath(`/student/soru-bankasi/${courseId}`);
        
        return { success: true };
    } catch (error) {
        console.error("❌ KAYIT HATASI (Backend):", error);
        return { success: false, error: "Kaydedilemedi" };
    }
}

// 4. PUANLAMA (Boş fonksiyon, hata vermemesi için)
export async function submitSoruBankasiScore(userId: string, score: number, context: string) {
    return { success: true };
}

// 5. SORU SAYILARI
export async function getQuestionCounts(topicId: string) {
    try {
        const filePath = path.join(process.cwd(), 'public', 'curriculum', 'questions', `${topicId}.json`);
        try { await fs.access(filePath); } catch { return { easy: 0, medium: 0, hard: 0 }; }

        const fileContent = await fs.readFile(filePath, 'utf-8');
        const questions = JSON.parse(fileContent) as Question[];
        
        const easy = questions.filter(q => q.difficulty?.toLowerCase() === 'easy' || q.difficulty === 'Kolay').length;
        const medium = questions.filter(q => q.difficulty?.toLowerCase() === 'medium' || q.difficulty === 'Orta').length;
        const hard = questions.filter(q => q.difficulty?.toLowerCase() === 'hard' || q.difficulty === 'Zor').length;

        return { easy, medium, hard };
    } catch (e) {
        return { easy: 0, medium: 0, hard: 0 };
    }
}

// 6. SIRALAMA
export async function getCourseLeaderboard(courseId: string, userClass: string, currentUserId: string) {
    try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, orderBy('score', 'desc'), limit(10));
        const snapshot = await getDocs(q);
        return { rank: 1, total: snapshot.size || 100 }; 
    } catch (e) {
        return { rank: 0, total: 0 };
    }
}