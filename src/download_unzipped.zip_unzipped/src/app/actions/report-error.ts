
'use server';

import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

type ErrorReportPayload = {
    message: string;
    pathname: string;
    userId: string;
    userName: string;
    itemData?: string; // JSON string of the item being reported
};

export async function submitErrorReport(payload: ErrorReportPayload): Promise<{ success: boolean; error?: string }> {
    if (!payload.message || !payload.userId) {
        return { success: false, error: 'Eksik bilgi.' };
    }

    try {
        await addDoc(collection(db, 'errorReports'), {
            ...payload,
            createdAt: serverTimestamp(),
            status: 'new', // 'new', 'in-progress', 'resolved'
        });
        return { success: true };
    } catch (error: any) {
        console.error("Error submitting error report:", error);
        return { success: false, error: 'Rapor gönderilirken bir veritabanı hatası oluştu.' };
    }
}
