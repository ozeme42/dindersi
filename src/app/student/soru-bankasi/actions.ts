

'use server';

import { db, auth } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, increment, orderBy, setDoc, getDoc, addDoc, serverTimestamp, writeBatch, limit } from 'firebase/firestore';
import type { Question, Course, Unit, Topic, QuestionBankProgress, TestResult, UserProfile, QuestionBankStats, ScoreEvent } from '@/lib/types';
import { unstable_noStore as noStore } from 'next/cache';

// Helper function to shuffle an array
const shuffleArray = <T>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};


export async function getCourseForSoruBankasi(courseId: string): Promise<{ course: Course | null; error?: string }> {
    noStore();
    try {
        const courseRef = doc(db, 'courses', courseId);
        const courseSnap = await getDoc(courseRef);

        if (!courseSnap.exists()) {
            return { error: 'Ders bulunamadı.' , course: null};
        }

        const courseData = { id: courseSnap.id, ...courseSnap.data() } as Course;
        
        const unitsRef = collection(db, 'courses', courseId, 'units');
        const unitsQuery = query(unitsRef, orderBy("title"));
        const unitsSnap = await getDocs(unitsQuery);
        const units: Unit[] = [];

        for (const unitDoc of unitsSnap.docs) {
            const unitData: Unit = { id: unitDoc.id, ...unitDoc.data(), topics: [] } as Unit;
            
            const topicsRef = collection(db, 'courses', courseId, 'units', unitDoc.id, 'topics');
            const topicsQuery = query(topicsRef, orderBy("title"));
            const topicsSnap = await getDocs(topicsQuery);
            
            unitData.topics = topicsSnap.docs.map(topicDoc => ({ id: topicDoc.id, ...topicDoc.data() } as Topic));
            units.push(unitData);
        }

        courseData.units = units;
        return { course: JSON.parse(JSON.stringify(courseData)) };
    } catch (e: any) {
        console.error("Error fetching course for question bank:", e);
        return { error: "Ders verileri alınırken bir hata oluştu.", course: null };
    }
}

export async function getQuestionCounts(topicId: string): Promise<{ easy: number; medium: number; hard: number; error?: string }> {
    noStore();
    try {
        if (!topicId) return { easy: 0, medium: 0, hard: 0 };
        const q = query(collection(db, "questions"), where("topicId", "==", topicId));
        const snapshot = await getDocs(q);

        const counts = { easy: 0, medium: 0, hard: 0 };
        snapshot.forEach(doc => {
            const data = doc.data() as Question;
            if (data.difficulty === 'Kolay') counts.easy++;
            else if (data.difficulty === 'Orta') counts.medium++;
            else if (data.difficulty === 'Zor') counts.hard++;
        });

        return counts;

    } catch (e: any) {
        console.error("Error getting question counts:", e);
        return { easy: 0, medium: 0, hard: 0, error: 'Soru sayıları alınamadı.'};
    }
}


export async function getQuestionsForTest(topicId: string, difficulty: Question['difficulty'], testIndex: number): Promise<{ questions: Question[], error?: string }> {
    noStore();
    try {
        const q = query(
            collection(db, "questions"),
            where("topicId", "==", topicId),
            where("difficulty", "==", difficulty),
            orderBy("text", "asc")
        );
        const querySnapshot = await getDocs(q);
        
        const allQuestions = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Question));
        
        if (allQuestions.length === 0) {
            return { error: "Bu seviye için soru bulunamadı.", questions: [] };
        }
        
        // Paginate
        const startIndex = testIndex * 10;
        const endIndex = startIndex + 10;
        const testQuestions = allQuestions.slice(startIndex, endIndex);

        if (testQuestions.length === 0) {
            return { error: "Bu test için soru bulunamadı.", questions: [] };
        }
        
        // Shuffle options for MCQ and FITB questions
        const questionsWithShuffledOptions = testQuestions.map(q => {
            if ((q.type === 'Çoktan Seçmeli' || q.type === 'Boşluk Doldurma') && q.options) {
                return { ...q, options: shuffleArray(q.options) };
            }
            return q;
        });

        return { questions: JSON.parse(JSON.stringify(questionsWithShuffledOptions)) };
    } catch(e: any) {
        console.error("Error fetching questions for test:", e);
        if (e.code === 'failed-precondition') {
             return { 
                error: `Veritabanı indeksi eksik. Lütfen bu hatayı gidermek için geliştirici konsolundaki linki kullanın. Hata: ${e.message}`, 
                questions: [] 
            };
        }
        return { error: "Test soruları alınırken bir hata oluştu.", questions: [] };
    }
}

export async function submitSoruBankasiScore(userId: string | null, score: number, context?: string): Promise<{ success: boolean; error?: string }> {
    if (!userId || score <= 0) {
        return { success: true };
    }
    try {
        const batch = writeBatch(db);
        const userRef = doc(db, 'users', userId);
        batch.update(userRef, { score: increment(score) });

        const eventRef = doc(collection(db, 'scoreEvents'));
        batch.set(eventRef, {
            userId: userId,
            points: score,
            timestamp: serverTimestamp(),
            gameType: 'Soru Bankası',
            context: context || 'Test Çözümü',
        });

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Error submitting Soru Bankası score:", error);
        return { success: false, error: "Skor kaydedilirken bir hata oluştu." };
    }
}

// Function to get the progress for a specific course
export async function getQuestionBankProgress(courseId: string, userId: string): Promise<QuestionBankProgress> {
    noStore();
    if (!userId) return {};

    const progressRef = doc(db, 'users', userId, 'questionBankProgress', courseId);
    const docSnap = await getDoc(progressRef);
    return docSnap.exists() ? docSnap.data() as QuestionBankProgress : {};
}

// Function to update progress for a topic
export async function updateTopicTestProgress(userId: string, courseId: string, topicId: string, difficulty: 'easy' | 'medium' | 'hard', testIndex: number, result: TestResult) {
    if (!userId) return { success: false, error: 'User not logged in' };

    const progressRef = doc(db, 'users', userId, 'questionBankProgress', courseId);
    
    try {
        const fieldPath = `${topicId}.${difficulty}.${testIndex}`;
        
        await setDoc(progressRef, { 
            [topicId]: {
                [difficulty]: {
                    [testIndex]: result
                }
            }
        }, { merge: true });

        return { success: true };
    } catch (e: any) {
        console.error("Error updating/setting progress:", e)
        return { success: false, error: 'İlerleme güncellenemedi.' };
    }
}

export async function getPreviousTestAttemptCount(userId: string, context: string): Promise<number> {
    noStore();
    if (!userId || !context) return 0;
    
    try {
        const q = query(
            collection(db, "scoreEvents"),
            where("userId", "==", userId),
            where("context", "==", context)
        );
        const snapshot = await getDocs(q);
        return snapshot.size;
    } catch (e) {
        console.error("Error getting previous attempts:", e);
        return 0;
    }
}


export async function getCourseQuestionBankStats(courseId: string, userId: string): Promise<QuestionBankStats> {
    noStore();
    if (!userId || !courseId) return { totalTests: 0, passedTests: 0, completionPercentage: 0, totalScore: 0 };
    
    try {
        // 1. Get all topics for the course to get all test counts
        const courseRef = doc(db, 'courses', courseId);
        const courseSnap = await getDoc(courseRef);
        if (!courseSnap.exists()) return { totalTests: 0, passedTests: 0, completionPercentage: 0, totalScore: 0 };

        const unitsSnap = await getDocs(query(collection(db, `courses/${courseId}/units`), orderBy("title")));
        let totalTests = 0;
        for (const unitDoc of unitsSnap.docs) {
            const topicsSnapshot = await getDocs(query(collection(db, `courses/${courseId}/units/${unitDoc.id}/topics`), orderBy("title")));
            for (const topicDoc of topicsSnapshot.docs) {
                const counts = await getQuestionCounts(topicDoc.id);
                totalTests += Math.ceil((counts.easy || 0) / 10);
                totalTests += Math.ceil((counts.medium || 0) / 10);
                totalTests += Math.ceil((counts.hard || 0) / 10);
            }
        }
        
        // 2. Get the student's progress for this course
        const progress = await getQuestionBankProgress(courseId, userId);
        let passedTests = 0;
        let totalScore = 0;
        for (const topicId in progress) {
            const topicProgress = progress[topicId];
            const allTestResults = [
                ...Object.values(topicProgress.easy || {}),
                ...Object.values(topicProgress.medium || {}),
                ...Object.values(topicProgress.hard || {})
            ];
            passedTests += allTestResults.filter(res => res.status === 'passed').length;
            totalScore += allTestResults.reduce((sum, res) => sum + res.score, 0);
        }

        const completionPercentage = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;
        
        return { totalTests, passedTests, completionPercentage, totalScore };
    } catch (error) {
        console.error("Error calculating question bank stats:", error);
        return { totalTests: 0, passedTests: 0, completionPercentage: 0, totalScore: 0 };
    }
}


export async function getCourseLeaderboard(courseId: string, className: string, currentUserId: string): Promise<{rank: number; total: number; error?: string}> {
    noStore();
    if (!currentUserId) return { rank: 0, total: 0, error: 'Kullanıcı girişi yapılmamış.' };

    try {
        const studentsQuery = query(collection(db, 'users'), where('class', '==', className));
        const studentsSnapshot = await getDocs(studentsQuery);
        const studentIds = studentsSnapshot.docs.map(doc => doc.id);

        if (studentIds.length === 0) return { rank: 0, total: 0 };

        const studentScores: { uid: string; score: number }[] = [];

        for (const studentId of studentIds) {
            const progressRef = doc(db, 'users', studentId, 'questionBankProgress', courseId);
            const progressSnap = await getDoc(progressRef);
            let totalScore = 0;
            if (progressSnap.exists()) {
                const progressData = progressSnap.data() as QuestionBankProgress;
                for (const topicId in progressData) {
                    const topicProgress = progressData[topicId];
                    if (topicProgress) {
                        const allTestResults = [
                            ...Object.values(topicProgress.easy || {}),
                            ...Object.values(topicProgress.medium || {}),
                            ...Object.values(topicProgress.hard || {})
                        ];
                        totalScore += allTestResults.reduce((sum, res) => sum + res.score, 0);
                    }
                }
            }
            studentScores.push({ uid: studentId, score: totalScore });
        }

        studentScores.sort((a, b) => b.score - a.score);

        const userRank = studentScores.findIndex(s => s.uid === currentUserId) + 1;
        
        return { rank: userRank, total: studentScores.length };

    } catch (e: any) {
        console.error("Error getting course leaderboard:", e);
        return { rank: 0, total: 0, error: 'Sıralama alınamadı.' };
    }
}

    