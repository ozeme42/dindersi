
'use server';

import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, doc, updateDoc, Timestamp, arrayUnion, serverTimestamp, runTransaction } from 'firebase/firestore';
import type { ErrorReport, ErrorReportConversationItem } from '@/lib/types';
import { unstable_noStore as noStore } from 'next/cache';

export async function getErrorReports(): Promise<{ success: boolean; data?: ErrorReport[]; error?: string }> {
    noStore();
    try {
        const q = query(collection(db, 'errorReports'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const reports = querySnapshot.docs.map(doc => {
            const data = doc.data();
            
            let conversation: ErrorReportConversationItem[] = [];
            // Check if conversation array exists and is valid
            if (Array.isArray(data.conversation) && data.conversation.length > 0) {
                conversation = data.conversation.map((msg: any) => ({
                    ...msg,
                    createdAt: (msg.createdAt instanceof Timestamp ? msg.createdAt.toDate().toISOString() : msg.createdAt),
                }));
            } else {
                 // If not, create a conversation from the legacy `message` field
                 conversation = [
                    { 
                        sender: 'student', 
                        message: data.message, 
                        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString() 
                    },
                     // Include legacy response if it exists
                    ...(data.response ? [{ 
                        sender: 'teacher' as const, 
                        message: data.response, 
                        createdAt: new Date().toISOString() // Use a placeholder date
                    }] : [])
                ];
            }


            return {
                id: doc.id,
                ...data,
                createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
                conversation: conversation,
            } as ErrorReport;
        });
        return { success: true, data: JSON.parse(JSON.stringify(reports)) };
    } catch (error: any) {
        console.error("Error fetching error reports:", error);
        return { success: false, error: 'Hata raporları alınırken bir veritabanı hatası oluştu.' };
    }
}

export async function addResponseToReport(reportId: string, status: ErrorReport['status'], response: string): Promise<{ success: boolean; error?: string }> {
    if (!reportId || !status) {
        return { success: false, error: 'Eksik parametre.' };
    }

    const reportRef = doc(db, 'errorReports', reportId);

    try {
        await runTransaction(db, async (transaction) => {
            const reportDoc = await transaction.get(reportRef);
            if (!reportDoc.exists()) {
                throw new Error("Rapor bulunamadı!");
            }

            const currentData = reportDoc.data();
            const createdAtDate = currentData.createdAt instanceof Timestamp ? currentData.createdAt.toDate() : new Date();

            // Start with the original message if conversation is missing
            const baseMessage = { 
                sender: 'student' as const, 
                message: currentData.message, 
                createdAt: createdAtDate.toISOString() 
            };
            
            const currentConversation = currentData.conversation && Array.isArray(currentData.conversation) && currentData.conversation.length > 0 
                ? currentData.conversation
                : [baseMessage];

            const newConversation = [
                ...currentConversation,
                {
                    sender: 'teacher',
                    message: response,
                    createdAt: new Date().toISOString(),
                }
            ];
            
            const updateData: any = { 
                status: status,
                conversation: newConversation,
                studentHasUnreadMessages: true,
            };

            transaction.update(reportRef, updateData);
        });

        return { success: true };
    } catch (error: any) {
        console.error("Error updating report status:", error);
        return { success: false, error: 'Rapor güncellenirken bir hata oluştu.' };
    }
}
