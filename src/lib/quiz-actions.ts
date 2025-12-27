
'use server';

import type { Question, GetQuizInput, GetQuizOutput, ActivityItem } from "@/lib/types";
import path from 'path';
import fs from 'fs/promises';
import { db } from "@/lib/firebase"; // Import db from firebase
import { collection, query, where, getDocs, limit as firestoreLimit, Query, and } from "firebase/firestore"; // Import necessary firestore functions

// This is a type guard to check if an object is a valid Question.
function isQuestion(obj: any): obj is Question {
    return obj && typeof obj.type === 'string';
}

// Centralized function to fetch questions - DYNAMIC DB-BASED
export async function getQuestionsFromBank(params: GetQuizInput): Promise<GetQuizOutput> {
    const { courseId, unitId, topicId, questionCount = 100, difficulty, questionTypes } = params;

    try {
        const collectionName = (questionTypes && (questionTypes.includes('definition') || questionTypes.includes('concept') || questionTypes.includes('sentence')))
            ? "activityItems"
            : "questions";

        let q: Query = collection(db, collectionName);
        let queryConstraints: any[] = [];
        
        // HIERARCHICAL FILTERING LOGIC
        // Start from the most specific context and build the query.

        // 1. Topic Level (Most specific)
        if (topicId && topicId !== 'all') {
            queryConstraints.push(where("topicId", "==", topicId));
        } 
        // 2. Unit Level
        else if (unitId && unitId !== 'all') {
            queryConstraints.push(where("unitId", "==", unitId));
             // When a specific unit is chosen, it must also belong to the correct course.
            if (courseId && courseId !== 'all') {
                queryConstraints.push(where("courseId", "==", courseId));
            }
        } 
        // 3. Course Level (Least specific)
        else if (courseId && courseId !== 'all') {
            queryConstraints.push(where("courseId", "==", courseId));
        }

        // Apply additional filters for difficulty and type
        if (difficulty && difficulty.length > 0) {
            queryConstraints.push(where("difficulty", "in", difficulty));
        }
        if (questionTypes && questionTypes.length > 0) {
            const typeMap: { [key: string]: string } = { 'mcq': 'Çoktan Seçmeli', 'tf': 'Doğru/Yanlış', 'fitb': 'Boşluk Doldurma' };
            const mappedTypes = questionTypes.map(qt => typeMap[qt] || qt);
            queryConstraints.push(where("type", "in", mappedTypes));
        }
        
        // Construct the final query only if there are constraints.
        if (queryConstraints.length > 0) {
            // Use and() to combine all where clauses
            q = query(q, and(...queryConstraints));
        }
        
        const querySnapshot = await getDocs(q);
        
        const allQuestions = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return { id: doc.id, ...data } as Question | ActivityItem;
        });

        const shuffled = allQuestions.sort(() => 0.5 - Math.random());
        const selectedQuestions = shuffled.slice(0, questionCount);
        
        const questionsWithShuffledOptions = selectedQuestions.map(question => {
            if ('type' in question && (question.type === 'Çoktan Seçmeli' || question.type === 'Boşluk Doldurma') && question.options) {
                // Create a shallow copy to avoid mutating the original array
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
 * Fetches all activity items for a given course or unit when "all" is selected.
 * This is crucial for static builds where we can't perform complex queries.
 * REWRITTEN to be simpler and more robust.
 */
export async function getStaticQuestionsForGame(params: {
  courseId?: string;
  unitId?: string;
  topicId?: string;
}): Promise<ActivityItem[]> {
    const { courseId, unitId, topicId } = params;

    try {
        let fileToRead;

        // Determine which pre-aggregated file to read based on the most specific ID available.
        if (topicId && topicId !== 'all') {
            fileToRead = `${topicId}.json`;
        } else if (unitId && unitId !== 'all') {
            fileToRead = `${unitId}.json`;
        } else if (courseId && courseId !== 'all') {
            fileToRead = `${courseId}.json`;
        } else {
            console.warn("getStaticQuestionsForGame called without a specific enough context (course, unit, or topic). It should have at least a courseId.");
            return [];
        }

        const filePath = path.join(process.cwd(), 'public', 'curriculum', 'activity-items', fileToRead);
        const fileContent = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(fileContent) as ActivityItem[];
        
    } catch (e: any) {
        if (e.code === 'ENOENT') {
            console.warn(`No aggregated activity file found for the selection. Path: public/curriculum/activity-items/${params.topicId || params.unitId || params.courseId}.json`);
            return [];
        }
        console.error(`Major error in getStaticQuestionsForGame:`, e);
        return [];
    }
}

