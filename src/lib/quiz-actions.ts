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
        const staticItems = await getStaticQuestionsForGame({ courseId, unitId, topicId });
        
        let filteredItems = staticItems;
        const mappedTypes = questionTypes?.map(qt => ({ 'mcq': 'Çoktan Seçmeli', 'tf': 'Doğru/Yanlış', 'fitb': 'Boşluk Doldurma' }[qt] || qt));

        if (mappedTypes && mappedTypes.length > 0) {
            filteredItems = filteredItems.filter(item => mappedTypes.includes(item.type));
        }

        // Shuffle all found items
        const shuffled = filteredItems.sort(() => 0.5 - Math.random());
        // Take the requested number of items
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
 * Fetches all activity items for a given context, starting with the most specific.
 * If a topic file is not found or empty, it tries to read the unit file.
 */
export async function getStaticQuestionsForGame(params: {
  courseId?: string;
  unitId?: string;
  topicId?: string;
}): Promise<ActivityItem[]> {
    const { courseId, unitId, topicId } = params;

    const readJsonFile = async (filePath: string): Promise<any[] | null> => {
        try {
            const fileContent = await fs.readFile(filePath, 'utf-8');
            const data = JSON.parse(fileContent);
            return Array.isArray(data) ? data : null;
        } catch (e: any) {
            if (e.code === 'ENOENT') {
                return null; // File not found is an expected case, not an error.
            }
            console.error(`Error reading or parsing ${filePath}:`, e);
            return null; // Treat other errors as if file is not available.
        }
    };

    const baseDir = path.join(process.cwd(), 'public', 'curriculum', 'activity-items');

    // 1. Try to read the specific topic file.
    if (topicId && topicId !== 'all') {
        const topicPath = path.join(baseDir, `${topicId}.json`);
        const topicData = await readJsonFile(topicPath);
        // If topic data exists and is not empty, return it.
        // Also, return it if no unitId is provided (can't fall back).
        if ((topicData && topicData.length > 0) || !unitId) {
            return topicData || [];
        }
    }
    
    // 2. If topic data is missing or empty, fall back to the whole unit file.
    // This is crucial for games that need a larger pool of distractors.
    if (unitId && unitId !== 'all') {
        const unitPath = path.join(baseDir, `${unitId}.json`);
        const unitData = await readJsonFile(unitPath);
        if (unitData) return unitData;
    }

    // 3. Fallback to the entire course file if necessary.
    if (courseId && courseId !== 'all') {
        const coursePath = path.join(baseDir, `${courseId}.json`);
        const courseData = await readJsonFile(coursePath);
        if (courseData) return courseData;
    }

    console.warn(`No aggregated activity file found for the selection. Context:`, params);
    return [];
}
