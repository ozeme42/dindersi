

'use server';

import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc, serverTimestamp } from "firebase/firestore";
import type { Assignment, UserProfile, ScoreEvent } from "@/lib/types";
import { unstable_noStore as noStore } from 'next/cache';

export type StudentProgress = {
    student: UserProfile;
    scoreEvent: ScoreEvent | null;
};

export type AssignmentDetails = {
    assignment: Assignment;
    studentProgress: StudentProgress[];
}

export async function getAssignmentDetails(assignmentId: string): Promise<{ success: boolean; data?: AssignmentDetails; error?: string }> {
    noStore();
    if (!assignmentId) return { success: false, error: 'Ödev ID\'si bulunamadı.' };

    try {
        const assignmentRef = doc(db, 'assignments', assignmentId);
        const assignmentSnap = await getDoc(assignmentRef);

        if (!assignmentSnap.exists()) {
            return { success: false, error: 'Ödev bulunamadı.' };
        }

        const assignment = { id: assignmentSnap.id, ...assignmentSnap.data() } as Assignment;

        if (!assignment.assignedTo || assignment.assignedTo.length === 0) {
            return { success: true, data: { assignment, studentProgress: [] } };
        }

        const studentsSnapshot = await getDocs(query(collection(db, 'users'), where('__name__', 'in', assignment.assignedTo)));
        const students = studentsSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
        
        let scoreEventsQuery;
        if (assignment.assignmentType === 'deneme') {
            const context = `Deneme ID: ${assignment.id}`;
            scoreEventsQuery = query(
                collection(db, 'scoreEvents'),
                where('userId', 'in', assignment.assignedTo),
                where('gameType', '==', 'Deneme'),
                where('context', '==', context)
            );
        } else {
            scoreEventsQuery = query(
                collection(db, 'scoreEvents'),
                where('userId', 'in', assignment.assignedTo)
            );
        }
        
        const scoreEventsSnapshot = await getDocs(scoreEventsQuery);
        const eventsByStudent = new Map<string, ScoreEvent>();
        scoreEventsSnapshot.forEach(doc => {
            const event = { id: doc.id, ...doc.data() } as ScoreEvent;
            // Since a student can only take an exam once, we don't need an array.
            eventsByStudent.set(event.userId, event);
        });

        const studentProgress = students.map(student => {
            const event = eventsByStudent.get(student.uid) || null;
            return {
                student: student,
                scoreEvent: event ? {...event, timestamp: (event.timestamp as any).toDate().toISOString()} : null,
            };
        });

        return { success: true, data: JSON.parse(JSON.stringify({ assignment, studentProgress })) };

    } catch (error: any) {
        console.error("Error fetching assignment details:", error);
         if (error.code === 'failed-precondition') {
             return { success: false, error: `Veritabanı indeksi eksik. Geliştirici konsolundaki linki kullanarak indeksi oluşturun. Hata: ${error.message}` };
        }
        return { success: false, error: 'Ödev detayları alınırken bir hata oluştu.' };
    }
}
