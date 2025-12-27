
'use server';

import type { Question, GetQuizInput, GetQuizOutput, ActivityItem } from "@/lib/types";
import path from 'path';
import fs from 'fs/promises';

// This is a type guard to check if an object is a valid Question.
function isQuestion(obj: any): obj is Question {
    return obj && typeof obj.type === 'string';
}

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
        } else {
            topicIdsToFetch = await getAllTopicIdsForContext(courseId, unitId);
        }

        if (topicIdsToFetch.length === 0) {
             return { questions: [], error: "Seçilen kritere uygun konu bulunamadı." };
        }

        const questionPromises = topicIdsToFetch.map(async (tId) => {
            const filePath = path.join(process.cwd(), 'public', 'curriculum', 'questions', `${tId}.json`);
            try {
                const fileContent = await fs.readFile(filePath, 'utf-8');
                return JSON.parse(fileContent) as Question[];
            } catch (e: any) {
                if (e.code !== 'ENOENT') {
                    console.warn(`Could not read/parse questions for topic ${tId}:`, e.message);
                }
                return [];
            }
        });

        allQuestions = (await Promise.all(questionPromises)).flat();
        
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
 */
export async function getStaticQuestionsForGame(params: {
  courseId?: string;
  unitId?: string;
  classId?: string;
}): Promise<ActivityItem[]> {
    const { courseId, unitId, classId } = params;

    try {
        const manifestPath = path.join(process.cwd(), 'public', 'curriculum', 'manifest.json');
        const manifestContent = await fs.readFile(manifestPath, 'utf-8');
        const manifest = JSON.parse(manifestContent);

        let topicIds: string[] = [];

        // 1. Find all courses that match the filter criteria
        let relevantCourses: any[] = [];
        for (const group of manifest.classGroups) {
            // Filter by class if classId is provided
            if (classId && group.id !== classId) {
                continue;
            }
            
            for (const course of group.courses) {
                // If a courseId is provided, only consider that course
                if (courseId && course.id === courseId) {
                    relevantCourses = [course]; // Found it, stop searching other courses
                    break;
                }
                // If no courseId, add all courses from the filtered class (or all classes if no classId)
                if (!courseId) {
                    relevantCourses.push(course);
                }
            }
            if (courseId && relevantCourses.length > 0) break; // Exit outer loop if specific course found
        }
        
        // 2. From the relevant courses, find the relevant units and topics
        for (const course of relevantCourses) {
            for (const unit of course.units) {
                // If a specific unit is chosen, only look at its topics
                if (unitId && unitId !== 'all' && unit.id !== unitId) {
                    continue;
                }
                
                // Add all topics from the matching unit(s)
                unit.topics.forEach((topic: { id: string }) => {
                    topicIds.push(topic.id);
                });
            }
        }
        
        // Remove duplicates
        const uniqueTopicIds = [...new Set(topicIds)];

        // 3. Fetch activity data for the collected topic IDs
        let allItems: ActivityItem[] = [];
        const activityPromises = uniqueTopicIds.map(async (topicId) => {
            const filePath = path.join(process.cwd(), 'public', 'curriculum', 'activities', `${topicId}.json`);
            try {
                const fileContent = await fs.readFile(filePath, 'utf-8');
                return JSON.parse(fileContent) as ActivityItem[];
            } catch (error: any) {
                if (error.code !== 'ENOENT') {
                    console.warn(`Could not read or parse activity file for topic ${topicId}:`, error);
                }
                return [];
            }
        });

        const results = await Promise.all(activityPromises);
        allItems = results.flat();
        
        return allItems;
    } catch (e) {
        console.error("Major error in getStaticQuestionsForGame:", e);
        return [];
    }
}
