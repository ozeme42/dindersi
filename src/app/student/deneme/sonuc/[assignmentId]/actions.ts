
'use server';

import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc, Timestamp } from 'firebase/firestore';
import type { Assignment, ScoreEvent, Question, UserProfile } from '@/lib/types';
import { unstable_noStore as noStore } from 'next/cache';

export type ExamResultDetails = {
    assignment: Assignment;
    questions: Question[];
    studentAnswers: (string | boolean | null)[];
    scoreEvent: ScoreEvent;
};

export async function getExamResultDetails(assignmentId: string, userId: string): Promise<{ success: boolean; data?: ExamResultDetails; error?: string }> {
    noStore();
    if (!assignmentId || !userId) {
        return { success: false, error: 'Eksik bilgi.' };
    }

    try {
        const assignmentRef = doc(db, 'assignments', assignmentId);
        const assignmentSnap = await getDoc(assignmentRef);

        if (!assignmentSnap.exists()) {
            return { success: false, error: 'Deneme sınavı bulunamadı.' };
        }
        
        const assignmentData = assignmentSnap.data();
        const assignment: Assignment = { 
            id: assignmentSnap.id, 
            ...assignmentData,
            createdAt: (assignmentData.createdAt as Timestamp)?.toDate().toISOString(),
            dueDate: assignmentData.dueDate ? (assignmentData.dueDate as Timestamp).toDate().toISOString() : undefined,
        } as Assignment;


        const scoreEventQuery = query(
            collection(db, 'scoreEvents'),
            where('userId', '==', userId),
            where('gameType', '==', 'Deneme'),
            where('context', '==', `Deneme ID: ${assignmentId}`)
        );
        const scoreEventSnapshot = await getDocs(scoreEventQuery);
        
        if (scoreEventSnapshot.empty) {
            return { success: false, error: 'Bu deneme için bir sonuç kaydı bulunamadı.' };
        }

        const scoreEventDoc = scoreEventSnapshot.docs[0];
        const scoreEventData = scoreEventDoc.data();
        const scoreEvent: ScoreEvent = {
            id: scoreEventDoc.id,
            ...scoreEventData,
            timestamp: (scoreEventData.timestamp as Timestamp)?.toDate().toISOString(),
        } as ScoreEvent;
        
        if (!assignment.questionIds || assignment.questionIds.length === 0) {
            return { success: false, error: 'Denemede soru bulunamadı.' };
        }

        const questionDocs = await Promise.all(
            assignment.questionIds.map(id => getDoc(doc(db, 'examQuestions', id)))
        );

        const questions = questionDocs
            .map(docSnap => docSnap.exists() ? ({ id: docSnap.id, ...docSnap.data() } as Question) : null)
            .filter((q): q is Question => q !== null);
            
        // Ensure the order of questions matches the order of answers
        const questionsMap = new Map(questions.map(q => [q.id, q]));
        const orderedQuestions = assignment.questionIds.map(id => questionsMap.get(id)).filter(Boolean) as Question[];

        const finalData: ExamResultDetails = {
            assignment,
            questions: orderedQuestions,
            studentAnswers: scoreEvent.answers || [],
            scoreEvent: scoreEvent
        };

        return { 
            success: true, 
            data: JSON.parse(JSON.stringify(finalData))
        };

    } catch (e: any) {
        console.error("Error fetching exam result details:", e);
        return { success: false, error: 'Sınav sonuçları alınırken bir hata oluştu.' };
    }
}
