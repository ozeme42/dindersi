

'use server';

import { db, auth } from "@/lib/firebase";
import { collection, query, getDocs, doc, setDoc, deleteDoc, serverTimestamp, orderBy } from "firebase/firestore";
import type { Question } from "@/lib/types";
import { unstable_noStore as noStore } from 'next/cache';

/**
 * Adds a question to the current user's personal review list.
 * Uses setDoc with the question ID as the document ID to prevent duplicates.
 */
export async function addQuestionToReviewList(userId: string, question: Question): Promise<{ success: boolean; error?: string }> {
  if (!userId) {
    return { success: false, error: 'Kullanıcı girişi yapılmamış.' };
  }
  if (!question || !question.id || question.id.startsWith('new-')) {
    return { success: false, error: 'Geçersiz soru ID\'si.' };
  }

  try {
    const reviewItemRef = doc(db, `users/${userId}/reviewItems`, question.id);
    
    // Create a new object to ensure all fields from the question are preserved correctly
    // This prevents issues where object spread might lose properties during the process.
    const dataToSave = {
        ...question,
        addedAt: serverTimestamp()
    };

    await setDoc(reviewItemRef, dataToSave);
    return { success: true };
  } catch (error: any) {
    console.error("Error adding question to review list:", error);
    return { success: false, error: "Soru tekrar listesine eklenirken bir hata oluştu." };
  }
}

/**
 * Removes a question from the current user's review list.
 */
export async function removeQuestionFromReviewList(userId: string, questionId: string): Promise<{ success: boolean; error?: string }> {
    if (!userId) {
        return { success: false, error: 'Kullanıcı girişi yapılmamış.' };
    }
     if (!questionId) {
        return { success: false, error: 'Geçersiz soru ID\'si.' };
    }
    
    try {
        const reviewItemRef = doc(db, `users/${userId}/reviewItems`, questionId);
        await deleteDoc(reviewItemRef);
        return { success: true };
    } catch (error: any) {
        console.error("Error removing question from review list:", error);
        return { success: false, error: "Soru tekrar listesinden kaldırılırken bir hata oluştu." };
    }
}


/**
 * Fetches all questions from the current user's review list.
 */
export async function getReviewQuestions(userId: string): Promise<{ questions?: Question[]; error?: string }> {
    noStore();
    if (!userId) {
        return { error: "Kullanıcı girişi yapılmamış." };
    }
    
    try {
        const reviewItemsRef = collection(db, `users/${userId}/reviewItems`);
        const q = query(reviewItemsRef, orderBy('addedAt', 'asc'));
        const querySnapshot = await getDocs(q);

        const questions = querySnapshot.docs.map(doc => doc.data() as Question);
        
        return { questions: JSON.parse(JSON.stringify(questions)) };
    } catch (error: any) {
        console.error("Error fetching review questions:", error);
        return { error: "Tekrar edilecek sorular alınırken bir hata oluştu." };
    }
}
