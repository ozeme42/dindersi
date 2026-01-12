'use server';

import { db } from "@/lib/firebase";
import { 
  doc, 
  getDoc, 
  increment, 
  collection, 
  serverTimestamp, 
  writeBatch,
} from 'firebase/firestore';
import fs from 'fs/promises';
import path from 'path';
import type { QuestionBankProgress, TestResult, Question } from '@/lib/types';

// 1. DERS MÜFREDATINI ÇEK VE SIRALA
export async function getCourseCurriculum(courseId: string) {
    try {
        const filePath = path.join(process.cwd(), 'public', 'curriculum', 'manifest.json');
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const manifest = JSON.parse(fileContent);
        
        let courseData: any = null;
        for (const group of manifest.classGroups) {
            const found = group.courses.find((c: any) => c.id === courseId);
            if (found) { courseData = found; break; }
        }
        
        if (!courseData) return null;

        if (courseData.units) {
            courseData.units.sort((a: any, b: any) => (a.title || '').localeCompare(b.title || '', 'tr', { numeric: true }));
            courseData.units.forEach((unit: any) => {
                if (unit.topics) {
                    unit.topics.sort((a: any, b: any) => (a.title || '').localeCompare(b.title || '', 'tr', { numeric: true }));
                }
            });
        }
        return JSON.parse(JSON.stringify(courseData));
    } catch (e) {
        console.error("Müfredat hatası:", e);
        return null;
    }
}

// 2. KULLANICININ SORU BANKASI İLERLEMESİNİ ÇEK
export async function getQuestionBankProgress(courseId: string, userId: string): Promise<QuestionBankProgress> {
    try {
        const docRef = doc(db, 'users', userId, 'questionBankProgress', courseId);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? (docSnap.data() as QuestionBankProgress) : {};
    } catch (error) {
        console.error("İlerleme hatası:", error);
        return {};
    }
}

// 3. TEST SONUCUNU KAYDET (Zorluk yerine 'tests' dizisi/objesi kullanıyoruz)
export async function saveTestResult(
    userId: string, 
    courseId: string, 
    topicId: string, 
    testIndex: number, 
    result: TestResult,
    isTopicFinished: boolean 
) {
    try {
        const batch = writeBatch(db);
        const progressRef = doc(db, 'users', userId, 'questionBankProgress', courseId);
        
        // Yeni Yapı: progress[topicId]['tests'][testIndex] = result
        batch.set(progressRef, {
            [topicId]: {
                tests: { [testIndex]: result }
            }
        }, { merge: true });

        // Puan Ver
        let totalPoints = result.score;
        if (isTopicFinished) {
            totalPoints += 30000; // BÖLÜM ÖDÜLÜ
        }

        if (totalPoints > 0) {
            const userRef = doc(db, 'users', userId);
            batch.update(userRef, { score: increment(totalPoints) });

            const eventRef = doc(collection(db, 'scoreEvents'));
            batch.set(eventRef, {
                userId,
                points: totalPoints,
                timestamp: serverTimestamp(),
                gameType: isTopicFinished ? 'Konu Tamamlama (Soru Bankası)' : 'Test Çözme',
                context: `${topicId} - Test ${testIndex + 1}`
            });
        }

        await batch.commit();
        return { success: true, earnedPoints: totalPoints };
    } catch (error) {
        console.error("Kayıt hatası:", error);
        return { success: false, error: "Kaydedilemedi" };
    }
}

// 4. TOPLAM SORU SAYISINI GETİR (Zorluk ayrımı olmadan)
export async function getTopicTotalQuestionCount(topicId: string) {
    try {
        const filePath = path.join(process.cwd(), 'public', 'curriculum', 'questions', `${topicId}.json`);
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const questions = JSON.parse(fileContent) as Question[];
        return questions.length;
    } catch (e) {
        return 0;
    }
}