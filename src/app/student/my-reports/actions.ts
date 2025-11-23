
'use server';

import { db } from '@/lib/firebase';
import { doc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';

type ReplyPayload = {
    reportId: string;
    message: string;
    sender: 'student' | 'teacher';
};

export async function addStudentReplyToReport(payload: ReplyPayload): Promise<{ success: boolean; error?: string }> {
    if (!payload.reportId || !payload.message) {
        return { success: false, error: 'Eksik bilgi.' };
    }

    try {
        const reportRef = doc(db, 'errorReports', payload.reportId);
        
        await updateDoc(reportRef, {
            conversation: arrayUnion({
                sender: 'student',
                message: payload.message,
                createdAt: new Date().toISOString(),
            }),
            // Optionally update status back to 'in-progress' if student replies
            status: 'in-progress'
        });

        return { success: true };
    } catch (error: any) {
        console.error("Error adding student reply to report:", error);
        return { success: false, error: 'Cevap gönderilirken bir veritabanı hatası oluştu.' };
    }
}
