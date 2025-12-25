

'use server';

import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, limit as firestoreLimit } from "firebase/firestore";
import type { Question, GetQuizInput, GetQuizOutput, ActivityItem } from "@/lib/types";
import path from 'path';
import fs from 'fs/promises';

// This is a type guard to check if an object is a valid Question.
function isQuestion(obj: any): obj is Question {
    return obj && typeof obj.type === 'string';
}

const isStaticBuild = process.env.NEXT_PUBLIC_STATIC_BUILD === 'true';

// Centralized function to fetch questions
export async function getQuestionsFromBank(params: GetQuizInput): Promise<GetQuizOutput> {
    const { courseId, unitId, topicId, questionCount = 10, difficulty, questionTypes } = params;

    try {
        let allQuestions: Question[] = [];

        // In a static build, we can only fetch by topicId from a pre-generated file.
        // If no topicId is provided, we cannot fetch data.
        if (isStaticBuild) {
            if (topicId && topicId !== 'all') {
                 try {
                    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/curriculum/questions/${topicId}.json`);
                    if (res.ok) {
                        allQuestions = await res.json();
                    } else if (res.status !== 404) {
                        console.warn(`Static question data for topic ${topicId} not found or failed to load. Status: ${res.status}`);
                    }
                 } catch(e) {
                     console.warn(`Could not fetch static questions for ${topicId}:`, e);
                 }
            } else {
                // In static mode, if no topicId is given, we can't fetch questions.
                // This is a limitation of the static build approach.
                // The UI should ideally prevent this state.
                return { questions: [], error: "Statik modda, soru getirmek için bir konu seçimi zorunludur." };
            }
        } else if (!isStaticBuild) {
            // In dynamic mode, query Firestore.
            let conditions = [];
            if (topicId && topicId !== 'all') {
                conditions.push(where("topicId", "==", topicId));
            } else if (unitId && unitId !== 'all') {
                conditions.push(where("unitId", "==", unitId));
            } else if (courseId && courseId !== 'all') {
                conditions.push(where("courseId", "==", courseId));
            }

            const questionsRef = collection(db, "questions");
            const finalQuery = conditions.length > 0 
                ? query(questionsRef, ...conditions) 
                : query(questionsRef, firestoreLimit(100)); // Limit open queries
            
            const querySnapshot = await getDocs(finalQuery);
            allQuestions = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Question));
        }

        // Apply client-side filtering for difficulty and type after fetching
        if (difficulty && difficulty.length > 0) {
            allQuestions = allQuestions.filter(q => difficulty.includes(q.difficulty));
        }
        if (questionTypes && questionTypes.length > 0) {
            const typeMap: { [key: string]: string } = { 'mcq': 'Çoktan Seçmeli', 'tf': 'Doğru/Yanlış', 'fitb': 'Boşluk Doldurma' };
            const mappedTypes = questionTypes.map(qt => typeMap[qt] || qt);
            allQuestions = allQuestions.filter(q => mappedTypes.includes(q.type));
        }

        // Shuffle and select the required number of questions
        const shuffled = allQuestions.sort(() => 0.5 - Math.random());
        const selectedQuestions = shuffled.slice(0, questionCount);
        
        // Final processing (e.g., shuffling options)
        const questionsWithShuffledOptions = selectedQuestions.map(question => {
            const standardizedQuestion: Question = {
                ...question,
                text: question.text || (question as any).statement || '',
                options: question.options || (question.type === 'Doğru/Yanlış' ? ['Doğru', 'Yanlış'] : []),
                correctAnswer: question.correctAnswer || (question.type === 'Doğru/Yanlış' ? (question.isTrue ? 'Doğru' : 'Yanlış') : '')
            };
            if ((standardizedQuestion.type === 'Çoktan Seçmeli' || standardizedQuestion.type === 'Boşluk Doldurma') && standardizedQuestion.options) {
                standardizedQuestion.options = [...standardizedQuestion.options].sort(() => Math.random() - 0.5);
            }
            return standardizedQuestion;
        });

        if (questionsWithShuffledOptions.length === 0) {
            return { questions: [], error: "Belirtilen kriterlere uygun soru bulunamadı." };
        }

        return { questions: JSON.parse(JSON.stringify(questionsWithShuffledOptions)) };

    } catch (e: any) {
        console.error("Error fetching questions:", e);
        if (e.code === 'failed-precondition') {
            return { questions: [], error: `Veritabanı indeksi eksik. Geliştirici konsolundaki linki kullanarak indeksi oluşturun. Hata: ${e.message}` };
        }
        return { questions: [], error: 'Sorular alınırken bir veritabanı hatası oluştu.' };
    }
}

/**
 * Fetches all activity items for a given course or unit when "all" is selected.
 * This is crucial for static builds where we can't perform complex queries.
 */
export async function getStaticQuestionsForGame(params: {
  courseId?: string;
  unitId?: string;
}): Promise<ActivityItem[]> {
    const { courseId, unitId } = params;

    const manifestPath = path.join(process.cwd(), 'public', 'curriculum', 'manifest.json');
    const manifestContent = await fs.readFile(manifestPath, 'utf-8');
    const manifest = JSON.parse(manifestContent);

    let topicIds: string[] = [];

    // Find all topics under the specified course or unit
    for (const group of manifest.classGroups) {
        for (const course of group.courses) {
            if (courseId && course.id !== courseId) continue;
            
            for (const unit of course.units) {
                if (unitId && unitId !== 'all' && unit.id !== unitId) continue;
                
                unit.topics.forEach((topic: { id: string }) => {
                    topicIds.push(topic.id);
                });
            }
        }
    }
    
    // Remove duplicates
    topicIds = [...new Set(topicIds)];

    let allItems: ActivityItem[] = [];

    // Fetch and combine activity items from all relevant topic files
    for (const topicId of topicIds) {
        const filePath = path.join(process.cwd(), 'public', 'curriculum', 'activities', `${topicId}.json`);
        try {
            const fileContent = await fs.readFile(filePath, 'utf-8');
            const items: ActivityItem[] = JSON.parse(fileContent);
            allItems = allItems.concat(items);
        } catch (error: any) {
            // ENOENT means file not found, which is okay, just skip it.
            if (error.code !== 'ENOENT') {
                console.warn(`Could not read or parse activity file for topic ${topicId}:`, error);
            }
        }
    }
    
    return allItems;
}
