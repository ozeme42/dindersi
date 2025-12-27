
'use server';

import type { Question, GetQuizInput, GetQuizOutput, ActivityItem } from "@/lib/types";
import path from 'path';
import fs from 'fs/promises';

// This is a type guard to check if an object is a valid Question.
function isQuestion(obj: any): obj is Question {
    return obj && typeof obj.type === 'string';
}

// This function is now OBSOLETE as we will fetch directly from aggregated files.
// Kept for reference but will not be used by getStaticQuestionsForGame.
async function getAllTopicIdsForContext(courseId?: string, unitId?: string): Promise<string[]> {
    const manifestPath = path.join(process.cwd(), 'public', 'curriculum', 'manifest.json');
    try {
        const manifestContent = await fs.readFile(manifestPath, 'utf-8');
        const manifest = JSON.parse(manifestContent);

        let topicIds: string[] = [];
        
        const coursesToSearch = courseId ? manifest.classGroups.flatMap((g: any) => g.courses).filter((c: any) => c.id === courseId) : manifest.classGroups.flatMap((g: any) => g.courses);

        for (const course of coursesToSearch) {
                for (const unit of course.units) {
                    if (unitId && unit.id !== unitId) continue;
                    
                    unit.topics.forEach((topic: { id: string }) => {
                        topicIds.push(topic.id);
                    });
                }
            }
        return [...new Set(topicIds)];
    } catch (e) {
        console.error("Failed to read or parse manifest for topic IDs:", e);
        return [];
    }
}


// Centralized function to fetch questions - STATIC ONLY
export async function getQuestionsFromBank(params: GetQuizInput): Promise<GetQuizOutput> {
    const { courseId, unitId, topicId, questionCount = 100, difficulty, questionTypes } = params;

    try {
        let allQuestions: Question[] = [];
        
        let fileToRead;
        // Determine which pre-aggregated file to read.
        if (topicId && topicId !== 'all') {
             fileToRead = `${topicId}.json`;
        } else if (unitId && unitId !== 'all') {
            fileToRead = `${unitId}.json`;
        } else if (courseId && courseId !== 'all') {
            fileToRead = `${courseId}.json`;
        } else {
             // Fallback or error for "all-all-all" which is too broad
             return { questions: [], error: "Lütfen en azından bir ders seçin." };
        }

        const filePath = path.join(process.cwd(), 'public', 'curriculum', 'questions', fileToRead);

        try {
            const fileContent = await fs.readFile(filePath, 'utf-8');
            allQuestions = JSON.parse(fileContent) as Question[];
        } catch (e: any) {
            if (e.code === 'ENOENT') {
                // It's not an error if a specific file doesn't exist, just means no questions for that scope.
                return { questions: [] };
            }
            throw e; // Re-throw other errors
        }
        
        if (difficulty && difficulty.length > 0) {
            allQuestions = allQuestions.filter(q => difficulty.includes(q.difficulty));
        }
        if (questionTypes && questionTypes.length > 0) {
            const typeMap: { [key: string]: string } = { 'mcq': 'Çoktan Seçmeli', 'tf': 'Doğru/Yanlış', 'fitb': 'Boşluk Doldurma' };
            const mappedTypes = questionTypes.map(qt => typeMap[qt] || qt);
            allQuestions = allQuestions.filter(q => mappedTypes.includes(q.type));
        }

        const shuffled = allQuestions.sort(() => 0.5 - Math.random());
        const selectedQuestions = shuffled.slice(0, questionCount);
        
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
        console.error("Error fetching questions from static files:", e);
        return { questions: [], error: 'Sorular alınırken bir hata oluştu.' };
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
        // Determine which pre-aggregated file to read based on the selection.
        if (topicId && topicId !== 'all') {
            fileToRead = `${topicId}.json`;
        } else if (unitId && unitId !== 'all') {
            fileToRead = `${unitId}.json`;
        } else if (courseId && courseId !== 'all') {
            fileToRead = `${courseId}.json`;
        } else {
             // Broadest selection, should point to a course if context is available.
             if (courseId) {
                fileToRead = `${courseId}.json`;
             } else {
                console.warn("getStaticQuestionsForGame called without specific context. This might lead to fetching too much data or errors.");
                return [];
             }
        }

        const filePath = path.join(process.cwd(), 'public', 'curriculum', 'activity-items', fileToRead);
        const fileContent = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(fileContent) as ActivityItem[];
        
    } catch (e: any) {
        if (e.code === 'ENOENT') {
            console.warn(`No aggregated activity file found for the selection.`);
            return [];
        }
        console.error(`Major error in getStaticQuestionsForGame:`, e);
        return [];
    }
}
