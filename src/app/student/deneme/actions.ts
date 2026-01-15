'use server';

import { db } from "@/lib/firebase";
import { 
    collection, query, where, getDocs, orderBy, 
    Timestamp, doc, getDoc, writeBatch, 
    serverTimestamp, increment 
} from "firebase/firestore";
import type { Assignment, ScoreEvent, Question } from "@/lib/types";
import { unstable_noStore as noStore } from 'next/cache';

// --- TİP TANIMLAMALARI ---
type EnrichedAssignment = Assignment & {
    solvedEvent?: ScoreEvent;
    rank?: number;
    totalParticipants?: number;
}

/**
 * Öğrencinin denemelerini listeler ve çözülme durumlarını zenginleştirir.
 */
export async function getStudentExams(userId?: string): Promise<{ success: boolean; data?: EnrichedAssignment[]; error?: string }> {
    noStore();

    if (!userId) {
        return { success: false, error: 'Kullanıcı girişi yapılmamış.' };
    }

    try {
        const assignmentsQuery = query(
            collection(db, 'assignments'),
            where("assignedTo", "array-contains", userId),
            where("assignmentType", "==", "deneme"),
            orderBy("createdAt", "desc")
        );

        const assignmentsSnapshot = await getDocs(assignmentsQuery);
        const enrichedExams: EnrichedAssignment[] = [];

        for (const assignmentDoc of assignmentsSnapshot.docs) {
            const assignmentData = assignmentDoc.data();
            const assignment: Assignment = {
                ...assignmentData,
                id: assignmentDoc.id,
                createdAt: (assignmentData.createdAt as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
                startDate: assignmentData.startDate ? (assignmentData.startDate as Timestamp).toDate().toISOString() : undefined,
                dueDate: assignmentData.dueDate ? (assignmentData.dueDate as Timestamp).toDate().toISOString() : undefined,
            } as Assignment;

            const context = `Deneme ID: ${assignment.id}`;
            const scoreEventsQuery = query(
                collection(db, 'scoreEvents'),
                where("gameType", "==", "Deneme"),
                where("context", "==", context)
            );

            const scoreEventsSnapshot = await getDocs(scoreEventsQuery);
            const allParticipantsEvents = scoreEventsSnapshot.docs.map(doc => doc.data() as ScoreEvent);
            
            const solvedEventData = allParticipantsEvents.find(e => e.userId === userId) || null;

            let rank: number | undefined = undefined;
            const totalParticipants = allParticipantsEvents.length;
            
            let solvedEvent: EnrichedAssignment['solvedEvent'] = undefined;
            if(solvedEventData) {
                allParticipantsEvents.sort((a, b) => (b.points || 0) - (a.points || 0));
                rank = allParticipantsEvents.findIndex(e => e.userId === userId) + 1;
                
                const studentDocId = scoreEventsSnapshot.docs.find(d => d.data().userId === userId)?.id;
                
                solvedEvent = {
                    ...solvedEventData,
                    id: studentDocId || '',
                    timestamp: (solvedEventData.timestamp as any)?.toDate().toISOString()
                }
            }
            
            enrichedExams.push({
                ...assignment,
                solvedEvent: solvedEvent,
                rank,
                totalParticipants,
            });
        }

        return { success: true, data: JSON.parse(JSON.stringify(enrichedExams)) };
        
    } catch (error: any) {
        console.error(`Error fetching exams for user ${userId}:`, error);
        if (error.code === 'failed-precondition') {
            return { success: false, error: `Veritabanı indeksi eksik.`};
        }
        return { success: false, error: 'Deneme sınavları alınırken bir hata oluştu.' };
    }
}

/**
 * Deneme sorularını getirir.
 */
export async function getDenemeQuestionsAction({ questionIds }: { questionIds: string[] }): Promise<{ questions: Question[]; error?: string }> {
    noStore();
    if (!questionIds || questionIds.length === 0) {
        return { error: 'Bu deneme için soru bulunamadı.', questions: [] };
    }

    try {
        const questionDocs = await Promise.all(
            questionIds.map(id => getDoc(doc(db, 'questions', id)))
        );

        const questions = questionDocs.map(docSnap => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                const question: Question = {
                    id: docSnap.id,
                    text: data.text || data.statement || '',
                    type: data.type,
                    options: data.options,
                    difficulty: data.difficulty,
                    courseId: data.courseId,
                    unitId: data.unitId,
                    topicId: data.topicId,
                    topic: data.topic,
                    correctAnswer: data.correctAnswer,
                    isTrue: data.isTrue
                };

                if (question.type === 'Doğru/Yanlış') {
                    if (typeof question.isTrue === 'boolean') {
                        question.correctAnswer = question.isTrue ? "Doğru" : "Yanlış";
                    }
                }
                return question;
            }
            return null;
        }).filter((q): q is Question => q !== null);

        const questionMap = new Map(questions.map(q => [q.id, q]));
        const orderedQuestions = questionIds.map(id => questionMap.get(id)).filter(Boolean) as Question[];

        return { questions: JSON.parse(JSON.stringify(orderedQuestions)) };

    } catch (e: any) {
        console.error("Error fetching exam questions:", e);
        return { error: 'Deneme soruları alınırken bir hata oluştu.', questions: [] };
    }
}

/**
 * Sınav sonucunu kaydeder ve Aşamalı Ödül Baremlerine göre Bonus XP verir.
 */
export async function submitDenemeScoreAction(
    userId: string | null, 
    score: number, 
    context: string, 
    answers: (string | boolean | null)[],
    correctCount: number, // Deneme başarı hesaplaması için
    totalCount: number    // Deneme başarı hesaplaması için
): Promise<{ success: boolean; awardedBonus?: number; error?: string }> {
    if (!userId) {
        return { success: false, error: "Kullanıcı girişi yapılmamış." };
    }

    try {
        const batch = writeBatch(db);
        const assignmentId = context.replace("Deneme ID: ", "");
        let awardedBonus = 0;

        // 1. Deneme bilgilerinden baremleri çekelim
        const assignmentRef = doc(db, 'assignments', assignmentId);
        const assignmentSnap = await getDoc(assignmentRef);
        
        if (assignmentSnap.exists()) {
            const assignmentData = assignmentSnap.data() as Assignment;
            const thresholds = assignmentData.rewardThresholds || [];

            if (thresholds.length > 0) {
                const successRate = (correctCount / totalCount) * 100;
                // Baremleri yüksekten düşüğe dizip öğrencinin girdiği en yüksek baremi bulalım
                const sortedThresholds = [...thresholds].sort((a, b) => b.rate - a.rate);
                const earnedThreshold = sortedThresholds.find(t => successRate >= t.rate);

                if (earnedThreshold) {
                    awardedBonus = earnedThreshold.points;
                }
            }
        }

        const totalPoints = score + awardedBonus;

        // 2. Kullanıcının ana puanını güncelle (Normal Skor + Bonus)
        if (totalPoints > 0) {
            const userRef = doc(db, 'users', userId);
            batch.update(userRef, { score: increment(totalPoints) });
        }

        // 3. Sınav Skor Olayını Kaydet
        const eventRef = doc(collection(db, 'scoreEvents'));
        batch.set(eventRef, {
            userId: userId,
            points: score,
            timestamp: serverTimestamp(),
            gameType: 'Deneme',
            context: context,
            answers: answers,
        });

        // 4. Bonus kazanıldıysa ayrı bir olay olarak kaydet (Tarihçe için)
        if (awardedBonus > 0) {
            const bonusRef = doc(collection(db, 'scoreEvents'));
            batch.set(bonusRef, {
                userId: userId,
                points: awardedBonus,
                timestamp: serverTimestamp(),
                gameType: 'Deneme Bonusu',
                context: `${context} - Başarı Ödülü`,
            });
        }

        await batch.commit();
        return { success: true, awardedBonus };

    } catch (error: any) {
        console.error("Error submitting Deneme score:", error);
        return { success: false, error: "Skor kaydedilirken bir hata oluştu." };
    }
}

/**
 * Alternatif ödül fonksiyonu (Manuel tetikleme gerekirse)
 */
export async function awardDenemeBonus(userId: string, assignmentId: string, correctCount: number, totalQuestions: number) {
    try {
        const assignmentRef = doc(db, "assignments", assignmentId);
        const assignmentSnap = await getDoc(assignmentRef);
        if (!assignmentSnap.exists()) return { success: false };
        
        const thresholds = assignmentSnap.data().rewardThresholds || [];
        const successRate = (correctCount / totalQuestions) * 100;
        const sortedThresholds = [...thresholds].sort((a, b) => b.rate - a.rate);
        const earnedThreshold = sortedThresholds.find(t => successRate >= t.rate);

        if (earnedThreshold) {
            const userRef = doc(db, "users", userId);
            await updateDoc(userRef, { score: increment(earnedThreshold.points) });
            return { success: true, points: earnedThreshold.points };
        }
        return { success: true, points: 0 };
    } catch (e) { return { success: false }; }
}