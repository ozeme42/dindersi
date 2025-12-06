
'use server';

import { db } from "@/lib/firebase";
import { doc, getDoc, collection, getDocs, query, where, orderBy, updateDoc, writeBatch, serverTimestamp, increment, getCountFromServer } from "firebase/firestore";
import type { Course, QuestionBankProgress, Question, UserProfile, TestResult, QuestionBankStats } from "@/lib/types";


export async function getCourseForSoruBankasi(courseId: string): Promise<{ course: (Course & { units: { id: string; title: string; topics: { id: string; title: string; }[] }[] }) | null, error?: string}> {
    try {
        const courseRef = doc(db, 'courses', courseId);
        const courseSnap = await getDoc(courseRef);

        if (!courseSnap.exists()) {
            return { course: null, error: 'Ders bulunamadı.' };
        }

        const courseData = { id: courseSnap.id, ...courseSnap.data() } as Course & { units: { id: string; title: string; topics: { id: string; title: string; }[] }[] };

        const unitsRef = collection(db, 'courses', courseId, 'units');
        const unitsQuery = query(unitsRef, orderBy("title"));
        const unitsSnap = await getDocs(unitsQuery);
        
        courseData.units = await Promise.all(unitsSnap.docs.map(async (unitDoc) => {
            const unit = { id: unitDoc.id, title: unitDoc.data().title, topics: [] };
            const topicsRef = collection(db, 'courses', courseId, 'units', unitDoc.id, 'topics');
            const topicsQuery = query(topicsRef, orderBy("title"));
            const topicsSnap = await getDocs(topicsQuery);
            unit.topics = topicsSnap.docs.map(topicDoc => ({ id: topicDoc.id, title: topicDoc.data().title }));
            return unit;
        }));
        
        return { course: JSON.parse(JSON.stringify(courseData)) };
    } catch (e: any) {
        console.error("Error getting course for Soru Bankasi: ", e);
        return { course: null, error: 'Ders bilgileri alınamadı.' };
    }
}


export async function getQuestionBankProgress(courseId: string, userId: string): Promise<QuestionBankProgress> {
    try {
        const progressRef = doc(db, 'users', userId, 'questionBankProgress', courseId);
        const docSnap = await getDoc(progressRef);
        if (docSnap.exists()) {
            return docSnap.data() as QuestionBankProgress;
        }
        return {};
    } catch (error) {
        console.error("Error fetching question bank progress:", error);
        return {};
    }
}


export async function getQuestionsForTest(topicId: string, difficulty: 'Kolay' | 'Orta' | 'Zor', testIndex: number): Promise<{ questions: Question[], error?: string }> {
    try {
        const q = query(
            collection(db, 'questions'), 
            where('topicId', '==', topicId),
            where('difficulty', '==', difficulty)
        );

        const snapshot = await getDocs(q);
        const allQuestions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Question));
        
        // This is not perfectly random but good enough for client-side slicing
        allQuestions.sort(() => Math.random() - 0.5); 
        
        const startIndex = testIndex * 10;
        const endIndex = startIndex + 10;

        if (allQuestions.length < startIndex) {
            return { questions: [], error: 'Bu test için yeterli soru bulunamadı.' };
        }

        return { questions: JSON.parse(JSON.stringify(allQuestions.slice(startIndex, endIndex))) };

    } catch (e: any) {
        console.error("Error getting questions for test:", e);
        return { questions: [], error: 'Sorular yüklenirken bir hata oluştu.' };
    }
}

export async function getQuestionCounts(topicId: string): Promise<{ easy: number, medium: number, hard: number } | null> {
    if (!topicId) return null;
    try {
        const easyQuery = query(collection(db, 'questions'), where('topicId', '==', topicId), where('difficulty', '==', 'Kolay'));
        const mediumQuery = query(collection(db, 'questions'), where('topicId', '==', topicId), where('difficulty', '==', 'Orta'));
        const hardQuery = query(collection(db, 'questions'), where('topicId', '==', topicId), where('difficulty', '==', 'Zor'));

        const [easySnapshot, mediumSnapshot, hardSnapshot] = await Promise.all([
            getDocs(easyQuery),
            getDocs(mediumQuery),
            getDocs(hardQuery)
        ]);

        return {
            easy: easySnapshot.size,
            medium: mediumSnapshot.size,
            hard: hardSnapshot.size
        };
    } catch (error) {
        console.error("Error getting question counts:", error);
        return { easy: 0, medium: 0, hard: 0 };
    }
}

export async function updateTopicTestProgress(userId: string, courseId: string, topicId: string, difficultyKey: 'easy' | 'medium' | 'hard', testIndex: number, result: TestResult): Promise<{ success: boolean; error?: string }> {
    try {
        const progressRef = doc(db, 'users', userId, 'questionBankProgress', courseId);
        
        const fieldPath = `${topicId}.${difficultyKey}.${testIndex}`;

        await updateDoc(progressRef, {
            [fieldPath]: result
        }).catch(async (error) => {
            if (error.code === 'not-found') {
                 // The document or nested object doesn't exist, so create it.
                await setDoc(progressRef, {
                    [topicId]: {
                        [difficultyKey]: {
                            [testIndex]: result
                        }
                    }
                }, { merge: true });
            } else {
                throw error;
            }
        })
        
        return { success: true };
    } catch (e: any) {
        console.error("Error updating test progress:", e);
        return { success: false, error: 'İlerleme kaydedilirken bir hata oluştu.' };
    }
}


export async function submitSoruBankasiScore(userId: string, score: number, context: string): Promise<{ success: boolean; error?: string }> {
    if (!userId || score <= 0) return { success: true };
    
    try {
        // Puan limiti kontrolü
        const attemptsQuery = query(
            collection(db, 'scoreEvents'),
            where('userId', '==', userId),
            where('gameType', '==', 'Soru Bankası'),
            where('context', '==', context)
        );
        const attemptsSnapshot = await getCountFromServer(attemptsQuery);
        if (attemptsSnapshot.data().count >= 10) {
            return { success: false, error: "Puan limiti aşıldı. Bu testten daha fazla puan kazanamazsınız." };
        }

        const batch = writeBatch(db);
        
        const userRef = doc(db, 'users', userId);
        batch.update(userRef, { score: increment(score) });

        const eventRef = doc(collection(db, 'scoreEvents'));
        batch.set(eventRef, {
            userId: userId,
            points: score,
            timestamp: serverTimestamp(),
            gameType: 'Soru Bankası',
            context: context,
        });

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Error submitting Soru Bankasi score:", error);
        return { success: false, error: "Skor kaydedilirken bir hata oluştu." };
    }
}


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

export async function getPreviousTestAttemptCount(userId: string, context: string): Promise<number> {
    try {
         const attemptsQuery = query(
            collection(db, 'scoreEvents'),
            where('userId', '==', userId),
            where('gameType', '==', 'Soru Bankası'),
            where('context', '==', context)
        );
        const attemptsSnapshot = await getCountFromServer(attemptsQuery);
        return attemptsSnapshot.data().count;
    } catch (error) {
        return 0;
    }
}

// Placeholder to satisfy student dashboard import
export async function getCourseQuestionBankStats(courseId: string, userId: string): Promise<QuestionBankStats> {
     const progress = await getQuestionBankProgress(courseId, userId);
     const course = await getCourseForSoruBankasi(courseId);

    let passedTests = 0;
    let totalTests = 0;
    let totalScore = 0;

    if (course.course?.units) {
        for (const unit of course.course.units) {
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
        courseName: course.course?.title || '',
        totalTests,
        passedTests,
        completionPercentage: totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0,
        totalScore,
    };
}
