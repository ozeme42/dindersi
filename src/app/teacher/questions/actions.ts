

'use server';

import fs from 'fs/promises';
import path from 'path';
import { db } from "@/lib/firebase";
import { doc, writeBatch, collection, addDoc, updateDoc, deleteDoc, serverTimestamp, Timestamp, getDocs, query, where } from "firebase/firestore";
import type { Question } from "@/lib/types";
import { z } from "zod";
import { generateQuestions } from "@/ai/flows/generate-questions-flow";
import type { GenerateQuestionsInput } from "@/ai/flows/generate-questions-flow";

export async function syncTopicQuestionsFiles(topicId?: string | null) {
    if (!topicId) return;
    try {
        const qSnap = await getDocs(query(collection(db, "questions"), where("topicId", "==", topicId)));
        const allQuestions = qSnap.docs.map(d => {
            const data = d.data();
            return {
                ...data,
                id: d.id,
                createdAt: (data.createdAt as Timestamp)?.toDate?.()?.toISOString?.() || 
                    (typeof data.createdAt === 'string' ? data.createdAt : new Date(0).toISOString())
            };
        });
        const jsonStr = JSON.stringify(allQuestions, null, 2);

        const dir = path.join(process.cwd(), 'public', 'curriculum', 'questions');
        await fs.mkdir(dir, { recursive: true }).catch(() => {});
        await fs.writeFile(path.join(dir, `${topicId}.json`), jsonStr, 'utf-8').catch(() => {});

        // question-counts.json dosyasını da güncelle
        try {
            const countsFilePath = path.join(process.cwd(), 'public', 'curriculum', 'question-counts.json');
            let counts: Record<string, number> = {};
            try {
                const existing = await fs.readFile(countsFilePath, 'utf-8');
                counts = JSON.parse(existing);
            } catch {}
            counts[topicId] = allQuestions.length;
            await fs.writeFile(countsFilePath, JSON.stringify(counts, null, 2), 'utf-8').catch(() => {});
        } catch {}
    } catch (err) {
        console.warn('Questions static file sync warning:', err);
    }
}

export async function saveQuestion(questionToSave: Question): Promise<{ success: boolean; error?: string; question?: Question }> {
    const { id, ...questionData } = questionToSave;
    try {
        let savedQuestion: Question;
        if (id && id.startsWith('new-')) {
            const newDocRef = await addDoc(collection(db, "questions"), {
                ...questionData,
                createdAt: serverTimestamp(),
            });
            const createdDate = new Date().toISOString();
            savedQuestion = { ...questionData, id: newDocRef.id, createdAt: createdDate } as Question;
        } else if (id) {
            await updateDoc(doc(db, "questions", id), questionData);
            savedQuestion = { ...questionToSave, createdAt: new Date().toISOString() };
        } else {
            return { success: false, error: "Geçersiz Soru ID'si" };
        }

        if (questionData.topicId) {
            await syncTopicQuestionsFiles(questionData.topicId);
        }

        return { success: true, question: savedQuestion };
    } catch (error: any) {
        console.error("Error saving question:", error);
        return { success: false, error: "Soru kaydedilirken bir hata oluştu." };
    }
}


export async function updateQuestionDifficulty(questionId: string, difficulty: Question['difficulty']) {
    if (!questionId || !difficulty) {
        return { success: false, error: "Geçersiz parametreler." };
    }
    try {
        const questionRef = doc(db, "questions", questionId);
        await updateDoc(questionRef, { difficulty });
        return { success: true };
    } catch (error) {
        console.error("Error updating question difficulty:", error);
        return { success: false, error: "Zorluk seviyesi güncellenirken bir hata oluştu." };
    }
}

export async function deleteBulkQuestions(questionIds: string[], topicId?: string | null): Promise<{ success: boolean; error?: string; count?: number }> {
    if (!questionIds || questionIds.length === 0) {
        return { success: false, error: "Silinecek soru seçilmedi." };
    }

    try {
        const chunks: string[][] = [];
        for (let i = 0; i < questionIds.length; i += 500) {
            chunks.push(questionIds.slice(i, i + 500));
        }

        for (const chunk of chunks) {
            const batch = writeBatch(db);
            chunk.forEach(id => {
                const docRef = doc(db, "questions", id);
                batch.delete(docRef);
            });
            await batch.commit();
        }

        if (topicId) {
            await syncTopicQuestionsFiles(topicId);
        }

        return { success: true, count: questionIds.length };

    } catch (error: any) {
        console.error("Error deleting bulk questions:", error);
        return { success: false, error: "Sorular silinirken bir hata oluştu." };
    }
}

const QuestionSchemaForImport = z.object({
    text: z.string(),
    type: z.enum(['Çoktan Seçmeli', 'Doğru/Yanlış', 'Boşluk Doldurma']),
    difficulty: z.enum(['Kolay', 'Orta', 'Zor']),
    options: z.array(z.string()).optional(),
    correctAnswer: z.string().optional(),
    isTrue: z.boolean().optional(),
});

const BulkQuestionsSchema = z.object({
  questions: z.array(QuestionSchemaForImport),
});

export async function saveBulkQuestions(input: unknown, context: { classId?: string, className?: string, courseId: string, unitId: string, topicId: string, topicName: string }): Promise<{ success: boolean; error?: string; count?: number }> {
    const validation = BulkQuestionsSchema.safeParse(input);
    if (!validation.success) {
      return { success: false, error: 'JSON verisi doğrulanamadı. Lütfen formattaki alanları ve veri tiplerini kontrol edin.' };
    }
    
    try {
        const batch = writeBatch(db);
        const questionsCollection = collection(db, "questions");

        validation.data.questions.forEach(question => {
            const docRef = doc(questionsCollection);
            const questionData = {
                ...question,
                ...context,
                topic: context.topicName,
                createdAt: serverTimestamp(),
            };
            batch.set(docRef, questionData);
        });
        
        await batch.commit();

        if (context.topicId) {
            await syncTopicQuestionsFiles(context.topicId);
        }

        return { success: true, count: validation.data.questions.length };

    } catch (error: any) {
        console.error("Error adding bulk questions:", error);
        return { success: false, error: "Sorular eklenirken bir hata oluştu." };
    }
}

export async function generateQuestionsWithAI(input: GenerateQuestionsInput) {
    try {
        const result = await generateQuestions(input);
        return result;
    } catch (error: any) {
        console.error("Error in AI Question Generation action:", error);
        return { error: error?.message || "Yapay zeka ile soru üretilirken bir hata oluştu." };
    }
}


const SaveGeneratedQuestionsInputSchema = z.object({
  questions: z.array(QuestionSchemaForImport),
});

export async function saveGeneratedQuestions(input: unknown, context: { classId?: string, className?: string, courseId: string, unitId: string, topicId: string, topicName: string }): Promise<{ success: boolean; error?: string, count?: number }> {
    const validation = SaveGeneratedQuestionsInputSchema.safeParse(input);
    if (!validation.success) {
        return { success: false, error: 'Oluşturulan sorular kaydedilemedi. Geçersiz veri.' };
    }

    const { questions } = validation.data;
    if (questions.length === 0) {
        return { success: false, error: "Kaydedilecek soru bulunmuyor." };
    }

    try {
        const batch = writeBatch(db);
        const questionsCollection = collection(db, "questions");

        questions.forEach(question => {
            const docRef = doc(questionsCollection);
            const questionData = {
                ...question,
                ...context,
                topic: context.topicName,
                createdAt: serverTimestamp(),
            };
            batch.set(docRef, questionData);
        });

        await batch.commit();

        if (context.topicId) {
            await syncTopicQuestionsFiles(context.topicId);
        }

        return { success: true, count: questions.length };

    } catch (error: any) {
        console.error("Error saving generated questions:", error);
        return { success: false, error: "Üretilen sorular veritabanına kaydedilirken bir hata oluştu." };
    }
}
