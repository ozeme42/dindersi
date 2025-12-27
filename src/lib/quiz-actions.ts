
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

        for (const group of manifest.classGroups) {
            for (const course of group.courses) {
                if (courseId && course.id !== courseId) continue;
                
                for (const unit of course.units) {
                    if (unitId && unit.id !== unitId) continue;
                    
                    unit.topics.forEach((topic: { id: string }) => {
                        topicIds.push(topic.id);
                    });
                }
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
    const { courseId, unitId, topicId, questionCount = 10, difficulty, questionTypes } = params;

    try {
        let allQuestions: Question[] = [];
        let topicIdsToFetch: string[] = [];

        if (topicId && topicId !== 'all') {
            topicIdsToFetch = [topicId];
        } else if (unitId && unitId !== 'all') {
             // This branch might be less used now but kept for potential direct unit calls
            topicIdsToFetch = await getAllTopicIdsForContext(courseId, unitId);
        } else if (courseId && courseId !== 'all') {
             topicIdsToFetch = await getAllTopicIdsForContext(courseId);
        }

        if (topicIdsToFetch.length === 0 && !(topicId === 'all')) {
             return { questions: [], error: "Seçilen kritere uygun konu bulunamadı." };
        }

        const filePath = path.join(process.cwd(), 'public', 'curriculum', 'questions', `${topicId}.json`);

        try {
            const fileContent = await fs.readFile(filePath, 'utf-8');
            allQuestions = JSON.parse(fileContent) as Question[];
        } catch (e: any) {
            if (e.code !== 'ENOENT') {
                console.warn(`Could not read/parse questions for topic ${topicId}:`, e.message);
            }
             // If a specific topic file is not found, it's an error.
            return { questions: [], error: `Soru dosyası bulunamadı: ${topicId}.json` };
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
}): Promise<ActivityItem[]> {
    const { courseId, unitId } = params;

    try {
        let filePath;
        let contextDescription;

        // Determine which pre-aggregated file to read based on the selection.
        if (unitId && unitId !== 'all') {
            // A specific unit is selected.
            filePath = path.join(process.cwd(), 'public', 'curriculum', 'activity-items', `${unitId}.json`);
            contextDescription = `unit ${unitId}`;
        } else if (courseId) {
            // "All units" for a specific course is selected.
            filePath = path.join(process.cwd(), 'public', 'curriculum', 'activity-items', `${courseId}.json`);
            contextDescription = `course ${courseId}`;
        } else {
            console.warn("getStaticQuestionsForGame called without courseId or unitId. This is not optimal.");
            // Fallback to fetching everything, though this should be avoided.
            // This case is not fully supported by the new aggregation logic.
            // Returning empty to prevent incorrect data mixing.
            return [];
        }

        const fileContent = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(fileContent) as ActivityItem[];
        
    } catch (e: any) {
        if (e.code === 'ENOENT') {
            // This is expected if a course/unit has no activities.
            console.warn(`No aggregated activity file found.`);
            return [];
        }
        console.error(`Major error in getStaticQuestionsForGame for`, e);
        return [];
    }
}
