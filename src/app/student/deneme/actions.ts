'use server';

import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import type { Assignment } from '@/lib/types';
import { unstable_noStore as noStore } from 'next/cache';

export async function getStudentExams(studentId: string): Promise<{ success: boolean; data?: (Assignment & { solvedEvent?: any })[]; error?: string }> {
    noStore();
    try {
        const assignmentsQuery = query(
            collection(db, 'assignments'),
            where('assignedTo', 'array-contains', studentId),
            orderBy('createdAt', 'desc')
        );

        const solvedEventsQuery = query(
            collection(db, 'scoreEvents'),
            where('userId', '==', studentId),
            where('gameType', '==', 'deneme')
        );

        const [assignmentsSnapshot, solvedEventsSnapshot] = await Promise.all([
            getDocs(assignmentsQuery),
            getDocs(solvedEventsQuery)
        ]);

        const solvedMap = new Map();
        solvedEventsSnapshot.forEach(doc => {
            const eventData = doc.data();
            if (eventData.context?.assignmentId) {
                solvedMap.set(eventData.context.assignmentId, eventData);
            }
        });
        
        const assignments = assignmentsSnapshot.docs.map(doc => {
            const assignmentData = doc.data() as Assignment;
            const solvedEvent = solvedMap.get(doc.id);
            return {
                id: doc.id,
                ...assignmentData,
                solvedEvent: solvedEvent ? JSON.parse(JSON.stringify(solvedEvent)) : null,
                createdAt: (assignmentData.createdAt as any).toDate().toISOString(),
                dueDate: (assignmentData.dueDate as any)?.toDate().toISOString() || null,
            };
        });

        return { success: true, data: assignments };
    } catch (e: any) {
        console.error("Error getting student exams:", e);
        return { success: false, error: "Ödevler alınamadı." };
    }
}
