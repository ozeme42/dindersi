
'use server';

import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, Timestamp, doc, getDoc, writeBatch, serverTimestamp, increment } from 'firebase/firestore';
import type { Assignment, ScoreEvent, Question, UserProfile } from '@/lib/types';
import { unstable_noStore as noStore } from 'next/cache';

type EnrichedAssignment = Assignment & {
    solvedEvent?: ScoreEvent;
    rank?: number;
    totalParticipants?: number;
}

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
            solvedEvent = {
                 ...solvedEventData,
                id: scoreEventsSnapshot.docs.find(d => d.data().userId === userId)!.id,
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
    console.error(`CRITICAL: Error fetching exams for user ${userId}. Error Code: ${error.code}. Message: ${error.message}`);
     if (error.code === 'failed-precondition') {
        return { success: false, error: `Veritabanı indeksi eksik. Lütfen bu hatayı gidermek için geliştirici konsolundaki linki kullanın. Hata: ${error.message}`};
    }
    return { success: false, error: 'Deneme sınavları alınırken bir veritabanı hatası oluştu.' };
  }
}

export async function getDenemeQuestionsAction({ questionIds }: { questionIds: string[] }): Promise<{ questions: Question[]; error?: string }> {
    noStore();
    if (!questionIds || questionIds.length === 0) {
        return { error: 'Bu deneme için soru bulunamadı.', questions: [] };
    }

    try {
        const questionDocs = await Promise.all(
            questionIds.map(id => getDoc(doc(db, 'examQuestions', id)))
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
                    // Standardize the correct answer for TF questions
                    if (typeof question.isTrue === 'boolean') {
                       question.correctAnswer = question.isTrue ? "Doğru" : "Yanlış";
                    }
                 }
                
                return question;
            }
            return null;
        }).filter((q): q is Question => q !== null);

        // Ensure the order of questions matches the order of questionIds
        const questionMap = new Map(questions.map(q => [q.id, q]));
        const orderedQuestions = questionIds.map(id => questionMap.get(id)).filter(Boolean) as Question[];

        return { questions: JSON.parse(JSON.stringify(orderedQuestions)) };

    } catch (e: any) {
        console.error("Error fetching exam questions:", e);
        return { error: 'Deneme soruları alınırken bir hata oluştu.', questions: [] };
    }
}


export async function submitDenemeScoreAction(userId: string | null, score: number, context: string, answers: (string | boolean | null)[]): Promise<{ success: boolean; error?: string }> {
    if (!userId) {
        return { success: false, error: "Kullanıcı girişi yapılmamış." };
    }

    try {
        const batch = writeBatch(db);

        // 1. Update user's main score
        const userRef = doc(db, 'users', userId);
        batch.update(userRef, { score: increment(score) });

        // 2. Log the score event with answers
        const eventRef = doc(collection(db, 'scoreEvents'));
        batch.set(eventRef, {
            userId: userId,
            points: score,
            timestamp: serverTimestamp(),
            gameType: 'Deneme',
            context: context,
            answers: answers,
        });

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Error submitting Deneme score:", error);
        return { success: false, error: "Skor kaydedilirken bir hata oluştu." };
    }
}
