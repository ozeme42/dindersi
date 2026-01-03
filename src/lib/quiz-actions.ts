'use server';

import type { Question, GetQuizInput, GetQuizOutput, ActivityItem } from "@/lib/types";
import path from 'path';
import fs from 'fs/promises';
import { db } from "@/lib/firebase"; 
import { collection, query, where, getDocs, limit as firestoreLimit, Query, and } from "firebase/firestore";

// This is a type guard to check if an object is a valid Question.
function isQuestion(obj: any): obj is Question {
    return obj && typeof obj.type === 'string';
}

// Centralized function to fetch questions - DYNAMIC DB-BASED
export async function getQuestionsFromBank(params: GetQuizInput): Promise<GetQuizOutput> {
    const { courseId, unitId, topicId, questionCount = 100, difficulty, questionTypes, isStatic } = params;

    // Eğer statik mod ise, getStaticQuestionsForGame'i çağır
    if (isStatic) {
        let items: (Question | ActivityItem)[] = [];
        
        // Önce soru bankasından çekmeyi dene
        const questionResult = await getStaticQuestionsForGame({ topicId });
        items = questionResult.map(q => ({...q, source: 'questions'} as any));

        // Eğer soru bulunamazsa, etkinlik verilerinden çekmeyi dene
        if (items.length === 0) {
            const activityResult = await getStaticQuestionsForGame({ topicId, dataType: 'activities' });
            items = activityResult.map(q => ({...q, source: 'activities'} as any));
        }

        const mappedTypes = questionTypes?.map(qt => ({ 'mcq': 'Çoktan Seçmeli', 'tf': 'Doğru/Yanlış', 'fitb': 'Boşluk Doldurma' }[qt] || qt));

        let filteredItems = items;

        if (difficulty && difficulty.length > 0) {
            filteredItems = filteredItems.filter(item => isQuestion(item) && difficulty.includes(item.difficulty));
        }
        
        if (mappedTypes && mappedTypes.length > 0) {
            filteredItems = filteredItems.filter(item => isQuestion(item) && mappedTypes.includes(item.type));
        }

        const shuffled = filteredItems.sort(() => 0.5 - Math.random());
        const selectedItems = shuffled.slice(0, questionCount);

        return { questions: JSON.parse(JSON.stringify(selectedItems)) };
    }
    
    // --- DYNAMIC DB LOGIC ---
    try {
        const isActivity = questionTypes && (questionTypes.includes('definition') || questionTypes.includes('concept') || questionTypes.includes('sentence'));
        const collectionName = isActivity ? "activityItems" : "questions";

        let q: Query = collection(db, collectionName);
        
        let conditions: any[] = [];

        if (topicId && topicId !== 'all') {
            conditions.push(where("topicId", "==", topicId));
        } else if (unitId && unitId !== 'all') {
            conditions.push(where("unitId", "==", unitId));
        } else if (courseId && courseId !== 'all') {
            conditions.push(where("courseId", "==", courseId));
        }
        
        if (difficulty && difficulty.length > 0) {
            conditions.push(where("difficulty", "in", difficulty));
        }
        if (questionTypes && questionTypes.length > 0) {
            const typeMap: { [key: string]: string } = { 'mcq': 'Çoktan Seçmeli', 'tf': 'Doğru/Yanlış', 'fitb': 'Boşluk Doldurma' };
            const mappedTypes = questionTypes.map(qt => typeMap[qt] || qt);
            conditions.push(where("type", "in", mappedTypes));
        }
        
        if (conditions.length > 0) {
            q = query(q, and(...conditions));
        }
        
        const querySnapshot = await getDocs(q);
        
        const allQuestions = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return { id: doc.id, ...data } as Question | ActivityItem;
        });

        const shuffled = allQuestions.sort(() => 0.5 - Math.random());
        const selectedQuestions = shuffled.slice(0, questionCount);
        
        const questionsWithShuffledOptions = selectedQuestions.map(question => {
            if ('type' in question && (question.type === 'Çoktan Seçmeli' || question.type === 'Boşluk Doldurma') && 'options' in question && question.options) {
                const newOptions = [...question.options];
                newOptions.sort(() => Math.random() - 0.5);
                return { ...question, options: newOptions };
            }
            return question;
        });

        if (questionsWithShuffledOptions.length === 0) {
            return { questions: [], error: "Belirtilen kriterlere uygun soru/veri bulunamadı." };
        }

        return { questions: JSON.parse(JSON.stringify(questionsWithShuffledOptions)) };

    } catch (e: any) {
        console.error("Error fetching questions from DB:", e);
        if (e.code === 'failed-precondition') {
             return { questions: [], error: `Veritabanı indeksi eksik veya oluşturuluyor. Hata: ${e.message}` };
        }
        return { questions: [], error: 'Sorular alınırken bir veritabanı hatası oluştu.' };
    }
}


/**
 * Fetches questions for a game from static JSON files.
 * It will try to fetch from a topic-specific file first, then fall back.
 */
export async function getStaticQuestionsForGame(params: {
  courseId?: string;
  unitId?: string;
  topicId?: string;
  dataType?: 'questions' | 'activities';
}): Promise<(Question | ActivityItem)[]> {
    const { topicId, dataType = 'questions' } = params;

    const readJsonFile = async (filePath: string): Promise<any[] | null> => {
        try {
            const fileContent = await fs.readFile(filePath, 'utf-8');
            return JSON.parse(fileContent);
        } catch (e: any) {
            if (e.code !== 'ENOENT') {
                console.error(`Error reading or parsing ${filePath}:`, e);
            }
            return null;
        }
    };
    
    // Determine directory based on dataType
    const dataDir = dataType === 'questions' ? 'questions' : 'activities';
    const baseDir = path.join(process.cwd(), 'public', 'curriculum', dataDir);

    if (topicId && topicId !== 'all') {
        const topicPath = path.join(baseDir, `${topicId}.json`);
        const topicData = await readJsonFile(topicPath);
        if (topicData) return topicData;
    }

    // Fallback or broader searches can be added here if needed,
    // for now, we just return empty if the specific file isn't found.
    return [];
}
