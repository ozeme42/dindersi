'use server';

import { db } from "@/lib/firebase";
import { 
  doc, 
  updateDoc, 
  increment, 
  collection, 
  setDoc, 
  serverTimestamp, 
  writeBatch, 
  query, 
  where, 
  getCountFromServer,
  getDoc,
  getDocs,
  orderBy,
  arrayUnion
} from 'firebase/firestore';
import { revalidatePath } from 'next/cache'; 
import type { Course, Unit, Topic, Question, QuestionBankProgress, TestResult, QuestionBankStats } from '@/lib/types';
import { getQuestionsFromBank } from '@/lib/quiz-actions';
import fs from 'fs/promises';
import path from 'path';

// 1. DERS BİLGİLERİNİ GETİR
export async function getCourseForSoruBankasi(courseId: string): Promise<{ course: (Course & { units: { id: string; title: string; topics: { id: string; title: string; }[] }[] }) | null, error?: string }> {
    try {
        let courseData: any = null;
        try {
            const filePath = path.join(process.cwd(), 'public', 'curriculum', 'manifest.json');
            const fileContent = await fs.readFile(filePath, 'utf-8');
            const manifest = JSON.parse(fileContent);
            
            for (const group of manifest.classGroups || []) {
                const found = group.courses?.find((c: any) => c.id === courseId);
                if (found) {
                    courseData = found;
                    break;
                }
            }
        } catch (e) {
            console.warn("Manifest read error in getCourseForSoruBankasi:", e);
        }

        // Firestore fallback
        if (!courseData) {
            const courseDoc = await getDoc(doc(db, 'courses', courseId));
            if (courseDoc.exists()) {
                const c = { id: courseDoc.id, ...courseDoc.data() } as Course;
                const unitsSnap = await getDocs(query(collection(db, `courses/${courseId}/units`), orderBy("title", "asc")));
                const units = [];
                for (const uDoc of unitsSnap.docs) {
                    const uData = { id: uDoc.id, ...uDoc.data() } as Unit;
                    const topicsSnap = await getDocs(query(collection(db, `courses/${courseId}/units/${uDoc.id}/topics`), orderBy("title", "asc")));
                    const topics = topicsSnap.docs.map(t => ({ id: t.id, ...t.data() } as Topic));
                    units.push({ ...uData, topics });
                }
                courseData = { ...c, units };
            }
        }
        
        if (!courseData) {
            return { course: null, error: 'Ders bulunamadı.' };
        }

        return { course: JSON.parse(JSON.stringify(courseData)) };
    } catch (e: any) {
        console.error("Error getting course for Soru Bankasi: ", e);
        return { course: null, error: 'Ders bilgileri alınamadı.' };
    }
}

// 2. İLERLEMEYİ GETİR
export async function getQuestionBankProgress(courseId: string, userId: string): Promise<QuestionBankProgress> {
    try {
        const progressRef = doc(db, 'users', userId, 'questionBankProgress', courseId);
        const docSnap = await getDoc(progressRef);
        
        if (docSnap.exists()) {
            return JSON.parse(JSON.stringify(docSnap.data())) as QuestionBankProgress;
        }
        return {};
    } catch (error) {
        console.error("Error fetching question bank progress:", error);
        return {};
    }
}

// 3. TEST İÇİN SORULARI GETİR
export async function getQuestionsForTest(topicId: string, difficulty: 'Kolay' | 'Orta' | 'Zor', testIndex: number): Promise<{ questions: Question[], error?: string }> {
    try {
        const result = await getQuestionsFromBank({
            topicId: topicId,
            difficulty: [difficulty],
            questionCount: 100, 
            isStatic: true, 
        });

        if (result.error || !result.questions) {
            return { questions: [], error: result.error || 'Sorular yüklenemedi.' };
        }
        
        const allQuestions = (result.questions as Question[]).sort((a,b) => (a.text || '').localeCompare(b.text || '', 'tr'));
        
        const startIndex = testIndex * 10;
        const endIndex = startIndex + 10;

        if (allQuestions.length < startIndex) {
            return { questions: [], error: 'Bu test için yeterli soru bulunamadı.' };
        }
        
        const selectedQuestions = allQuestions.slice(startIndex, endIndex);

        const questionsWithShuffledOptions = selectedQuestions.map(question => {
            if ((question.type === 'Çoktan Seçmeli' || question.type === 'Boşluk Doldurma') && question.options) {
                const shuffledOptions = [...question.options].sort(() => Math.random() - 0.5);
                return { ...question, options: shuffledOptions };
            }
            return question;
        });

        return { questions: JSON.parse(JSON.stringify(questionsWithShuffledOptions)) };

    } catch (e: any) {
        console.error("Error getting questions for test:", e);
        return { questions: [], error: 'Sorular yüklenirken bir hata oluştu.' };
    }
}

// 4. SORU SAYILARINI GETİR
export async function getQuestionCounts(topicId: string): Promise<{ easy: number, medium: number, hard: number } | null> {
    if (!topicId) return null;
    const counts = { easy: 0, medium: 0, hard: 0 };
    try {
        const filePath = path.join(process.cwd(), 'public', 'curriculum', 'questions', `${topicId}.json`);
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const questions = JSON.parse(fileContent) as Question[];

        questions.forEach(question => {
            const d = question.difficulty?.toLowerCase();
            if (d === 'kolay' || d === 'easy') counts.easy++;
            else if (d === 'orta' || d === 'medium') counts.medium++;
            else if (d === 'zor' || d === 'hard') counts.hard++;
        });
    } catch {
        // Static file doesn't exist, proceed to Firestore check
    }

    if (counts.easy === 0 && counts.medium === 0 && counts.hard === 0) {
        try {
            const qSnap = await getDocs(query(collection(db, 'questions'), where('topicId', '==', topicId)));
            qSnap.docs.forEach(d => {
                const q = d.data() as Question;
                const diff = (q.difficulty || '').toLowerCase();
                if (diff === 'easy' || diff === 'kolay') counts.easy++;
                else if (diff === 'medium' || diff === 'orta') counts.medium++;
                else if (diff === 'hard' || diff === 'zor') counts.hard++;
            });
        } catch (dbErr) {
            console.warn(`Firestore question count fetch failed for topic ${topicId}:`, dbErr);
        }
    }

    return counts;
}

// 5. İLERLEMEYİ VE PUANI KAYDET (GÜNCELLENDİ)
export async function updateTopicTestProgress(
    userId: string, 
    courseId: string, 
    topicId: string, 
    difficultyKey: 'easy' | 'medium' | 'hard', 
    testIndex: number, 
    result: TestResult,
    solvedQuestionIds?: string[]
): Promise<{ success: boolean; error?: string }> {
    try {
        const batch = writeBatch(db);
        const progressRef = doc(db, 'users', userId, 'questionBankProgress', courseId);
        const userRef = doc(db, 'users', userId);
        
        // Firestore'a gönderirken objeyi saf hale getiriyoruz
        const safeResult = JSON.parse(JSON.stringify(result));

        // 1. İlerleme Kaydı
        batch.set(progressRef, {
            [topicId]: {
                [difficultyKey]: {
                    [testIndex]: safeResult
                }
            }
        }, { merge: true });

        // 2. Puan Güncelleme (Eğer skor varsa)
        if (result.score > 0) {
            batch.set(userRef, { score: increment(result.score) }, { merge: true });

            // 3. Puan Hareketi Kaydı
            const eventRef = doc(collection(db, 'scoreEvents'));
            batch.set(eventRef, {
                userId: userId,
                points: result.score,
                timestamp: serverTimestamp(),
                gameType: 'Soru Bankası',
                context: `${topicId} - ${difficultyKey} - Test ${testIndex + 1}`,
                completed: result.status === 'passed'
            });
        }
        
        // 4. Çözülen (doğru bilinen) soruları havuza ekle
        if (solvedQuestionIds && solvedQuestionIds.length > 0) {
            const solvedRef = doc(db, 'users', userId, 'questionBankProgress', 'solved');
            batch.set(solvedRef, {
                ids: arrayUnion(...solvedQuestionIds)
            }, { merge: true });
        }
        
        await batch.commit();

        revalidatePath(`/student/soru-bankasi/${courseId}`);
        revalidatePath('/student/soru-bankasi');

        return { success: true };
    } catch (e: any) {
        console.error("Error updating test progress:", e);
        return { success: false, error: 'İlerleme kaydedilirken bir hata oluştu.' };
    }
}

// 6. PUAN GÖNDER (Yedek olarak bırakıldı)
export async function submitSoruBankasiScore(userId: string, score: number, context: string): Promise<{ success: boolean; error?: string }> {
    if (!userId || score <= 0) return { success: true };
    
    try {
        const attemptsQuery = query(
            collection(db, 'scoreEvents'),
            where('userId', '==', userId),
            where('gameType', '==', 'Soru Bankası'),
            where('context', '==', context)
        );
        const attemptsSnapshot = await getCountFromServer(attemptsQuery);
        const attemptCount = attemptsSnapshot.data().count;

        if (attemptCount >= 50) { 
            return { success: false, error: "Puan limiti aşıldı." };
        }

        const batch = writeBatch(db);
        const userRef = doc(db, 'users', userId);
        
        batch.set(userRef, { score: increment(score) }, { merge: true });

        const eventRef = doc(collection(db, 'scoreEvents'));
        batch.set(eventRef, {
            userId: userId,
            points: score,
            timestamp: serverTimestamp(),
            gameType: 'Soru Bankası',
            context: context,
            attemptNumber: attemptCount + 1,
        });

        await batch.commit();
        return { success: true };
    } catch (error: any) {
        console.error("Error submitting Soru Bankasi score:", error);
        return { success: false, error: "Skor kaydedilirken bir hata oluştu." };
    }
}

// 7. SIRALAMA GETİR
export async function getCourseLeaderboard(courseId: string, studentClass: string, studentId: string): Promise<{ rank: number; total: number; error?: string }> {
    try {
        const studentQuery = query(collection(db, 'users'), where('class', '==', studentClass), where('role', '==', 'student'));
        const studentSnapshot = await getDocs(studentQuery);
        const studentIds = studentSnapshot.docs.map(doc => doc.id);
        const totalStudents = studentIds.length;

        if (totalStudents === 0) {
            return { rank: 0, total: 0 };
        }
        
        const progressPromises = studentIds.map(uid => getQuestionBankProgress(courseId, uid));
        const allProgress = await Promise.all(progressPromises);

        const studentScores = allProgress.map((progress, index) => {
            let totalScore = 0;
            Object.values(progress).forEach(topicProgress => {
                const allTestResults: TestResult[] = [
                    ...Object.values(topicProgress.easy || {}),
                    ...Object.values(topicProgress.medium || {}),
                    ...Object.values(topicProgress.hard || {})
                ];
                totalScore += allTestResults.reduce((sum, res) => sum + res.score, 0);
            });
            return { uid: studentIds[index], score: totalScore };
        });

        studentScores.sort((a, b) => b.score - a.score);
        
        const rank = studentScores.findIndex(s => s.uid === studentId) + 1;

        return { rank, total: totalStudents };

    } catch (e: any) {
        console.error("Error getting course leaderboard:", e);
        return { rank: 0, total: 0, error: "Sıralama alınamadı." };
    }
}

export async function getCourseQuestionBankStats(courseId: string, userId: string): Promise<QuestionBankStats> {
     const progress = await getQuestionBankProgress(courseId, userId);
     const courseResult = await getCourseForSoruBankasi(courseId);

    let passedTests = 0;
    let totalTests = 0;
    let totalScore = 0;

    if (courseResult.course?.units) {
        for (const unit of courseResult.course.units) {
            for (const topic of unit.topics) {
                const counts = await getQuestionCounts(topic.id);
                if (counts) {
                    const easyTests = Math.ceil((counts.easy || 0) / 10);
                    const mediumTests = Math.ceil((counts.medium || 0) / 10);
                    const hardTests = Math.ceil((counts.hard || 0) / 10);
                    totalTests += easyTests + mediumTests + hardTests;
                }
            }
        }
    }
    
    Object.values(progress).forEach(topicProgress => {
        const allTestResults: TestResult[] = [
            ...Object.values(topicProgress.easy || {}),
            ...Object.values(topicProgress.medium || {}),
            ...Object.values(topicProgress.hard || {})
        ];
        passedTests += allTestResults.filter(r => r.status === 'passed').length;
        totalScore += allTestResults.reduce((sum, res) => sum + res.score, 0);
    });
    
    return {
        courseId,
        courseName: courseResult.course?.title || '',
        totalTests,
        passedTests,
        completionPercentage: totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0,
        totalScore,
    };
}