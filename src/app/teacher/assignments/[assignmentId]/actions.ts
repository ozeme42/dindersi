

'use server';

import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc, documentId, orderBy, Timestamp } from "firebase/firestore";
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

        const assignmentData = assignmentSnap.data();
        const assignment: Assignment = { 
            id: assignmentSnap.id, 
            ...assignmentData,
            createdAt: (assignmentData.createdAt as Timestamp)?.toDate().toISOString(),
            startDate: assignmentData.startDate ? (assignmentData.startDate as Timestamp).toDate().toISOString() : undefined,
            dueDate: assignmentData.dueDate ? (assignmentData.dueDate as Timestamp).toDate().toISOString() : undefined,
        } as Assignment;

        let studentIds: string[] = [];

        // If assignedTo is populated, use it. Otherwise, fetch all students for a general exam.
        if (assignment.assignedTo && assignment.assignedTo.length > 0) {
            studentIds = assignment.assignedTo;
        } else {
             const allStudentsSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'student')));
             studentIds = allStudentsSnap.docs.map(doc => doc.id);
        }

        if (studentIds.length === 0) {
            return { success: true, data: { assignment, studentProgress: [] } };
        }

        // Chunk student fetching to avoid 'in' query limits
        const studentProgress: StudentProgress[] = [];
        const studentChunks: string[][] = [];
        for (let i = 0; i < studentIds.length; i += 30) {
            studentChunks.push(studentIds.slice(i, i + 30));
        }

        for (const chunk of studentChunks) {
            if (chunk.length === 0) continue;
            const studentsSnapshot = await getDocs(query(collection(db, 'users'), where(documentId(), 'in', chunk)));
            const students = studentsSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
            
            const context = `Deneme ID: ${assignment.id}`;
            const eventsByStudent = new Map<string, ScoreEvent>();

            const scoreEventsQuery = query(
                collection(db, 'scoreEvents'),
                where('userId', 'in', chunk),
                where('gameType', '==', 'Deneme'),
                where('context', '==', context)
            );
            
            const scoreEventsSnapshot = await getDocs(scoreEventsQuery);
            scoreEventsSnapshot.forEach(doc => {
                const eventData = doc.data();
                const event = { 
                    id: doc.id, 
                    ...eventData,
                    timestamp: (eventData.timestamp as Timestamp)?.toDate().toISOString()
                } as ScoreEvent;
                eventsByStudent.set(event.userId, event);
            });
            

            const progressChunk = students.map(student => {
                const event = eventsByStudent.get(student.uid) || null;
                return {
                    student: student,
                    scoreEvent: event
                };
            }); // Keep all students, even those who haven't attempted.
            studentProgress.push(...progressChunk);
        }

        return { success: true, data: JSON.parse(JSON.stringify({ assignment, studentProgress })) };

    } catch (error: any) {
        console.error("Error fetching assignment details:", error);
         if (error.code === 'failed-precondition') {
             const urlRegex = /(https?:\/\/[^\s]+)/g;
             const url = error.message.match(urlRegex)?.[0] || '#';
             return { success: false, error: `Veritabanı indeksi eksik. Lütfen bu hatayı gidermek için <a href="${url}" target="_blank" rel="noopener noreferrer" class="underline font-bold">bu linke tıklayarak</a> gerekli indeksi oluşturun.` };
        }
        return { success: false, error: 'Ödev detayları alınırken bir hata oluştu.' };
    }
}
