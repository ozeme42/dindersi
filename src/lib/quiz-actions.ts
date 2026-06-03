

'use server';

import type { Question, GetQuizInput, GetQuizOutput, ActivityItem } from "@/lib/types";
import path from 'path';
import fs from 'fs/promises';
import { db } from "@/lib/firebase"; 
import { collection, query, where, getDocs, limit as firestoreLimit, Query, and, collectionGroup, doc, getDoc } from "firebase/firestore";

// This is a type guard to check if an object is a valid Question.
function isQuestion(obj: any): obj is Question {
    return obj && typeof obj.type === 'string';
}

// Centralized function to fetch questions - DYNAMIC DB-BASED
export async function getQuestionsFromBank(params: GetQuizInput): Promise<GetQuizOutput> {
    const { courseId, unitId, topicId, questionCount = 100, difficulty, questionTypes, isStatic = true, excludeSolvedByUserId } = params;

    // Eğer statik mod ise, getStaticQuestionsForGame'i çağır
    if (isStatic) {
        // Here, we call a new function dedicated to reading static files for both questions and activities
        const staticItems = await getStaticGameData({ courseId, unitId, topicId });
        
        let filteredItems: (Question | ActivityItem)[] = staticItems;

        // Map short types like 'mcq' to full names if needed
        const mappedTypes = questionTypes?.map(qt => ({ 'mcq': 'Çoktan Seçmeli', 'tf': 'Doğru/Yanlış', 'fitb': 'Boşluk Doldurma' }[qt] || qt));

        if (mappedTypes && mappedTypes.length > 0) {
            filteredItems = filteredItems.filter(item => {
                 if('type' in item) {
                    return mappedTypes.includes(item.type);
                 }
                 return false;
            });
        }
        if (difficulty && difficulty.length > 0) {
            filteredItems = filteredItems.filter(item => {
                if('difficulty' in item && item.difficulty) { // Check if difficulty exists
                    return difficulty.includes(item.difficulty);
                }
                return true; // Keep activity items that don't have difficulty
            });
        }

        if (excludeSolvedByUserId) {
            try {
                const solvedRef = doc(db, 'users', excludeSolvedByUserId, 'questionBankProgress', 'solved');
                const solvedSnap = await getDoc(solvedRef);
                if (solvedSnap.exists()) {
                    const solvedIds: string[] = solvedSnap.data()?.ids || [];
                    if (solvedIds.length > 0) {
                        filteredItems = filteredItems.filter(q => {
                            if ('id' in q && q.id) {
                                return !solvedIds.includes(q.id);
                            }
                            // Generate a simple hash/id for static items without ID based on their text
                            const textId = 'text' in q ? q.text : ('term' in q ? q.term : '');
                            return !solvedIds.includes(textId); // Just a fallback if static items lack 'id'
                        });
                    }
                }
            } catch (e) {
                console.error("Error fetching solved questions for filtering:", e);
            }
        }

        const shuffled = filteredItems.sort(() => 0.5 - Math.random());
        const selectedItems = shuffled.slice(0, questionCount);

        const itemsWithShuffledOptions = selectedItems.map(question => {
            if ('type' in question && (question.type === 'Çoktan Seçmeli' || question.type === 'Boşluk Doldurma' || question.type === 'mcq' || question.type === 'fitb') && 'options' in question && question.options) {
                const newOptions = [...question.options];
                newOptions.sort(() => Math.random() - 0.5);
                return { ...question, options: newOptions };
            }
            return question;
        });

        return { questions: JSON.parse(JSON.stringify(itemsWithShuffledOptions)) };
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
        
        let allQuestions = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return { id: doc.id, ...data } as Question | ActivityItem;
        });

        // KULLANICININ DAHA ÖNCE ÇÖZDÜĞÜ SORULARI FİLTRELE
        if (excludeSolvedByUserId) {
            try {
                const solvedRef = doc(db, 'users', excludeSolvedByUserId, 'questionBankProgress', 'solved');
                const solvedSnap = await getDoc(solvedRef);
                if (solvedSnap.exists()) {
                    const solvedIds: string[] = solvedSnap.data()?.ids || [];
                    if (solvedIds.length > 0) {
                        allQuestions = allQuestions.filter(q => !solvedIds.includes(q.id));
                    }
                }
            } catch (e) {
                console.error("Error fetching solved questions for filtering:", e);
            }
        }

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
 * Fetches data from static JSON files for games. It can read from both `activities` and `questions` directories.
 * If topicId is 'all', it aggregates data from all topics within the given unit.
 */
export async function getStaticGameData(params: {
  courseId?: string;
  unitId?: string;
  topicId?: string;
}): Promise<(ActivityItem | Question)[]> {
    const { unitId, topicId } = params;

    const readJsonFile = async (filePath: string): Promise<any[] | null> => {
        try {
            const fileContent = await fs.readFile(filePath, 'utf-8');
            return JSON.parse(fileContent);
        } catch (e: any) {
            if (e.code !== 'ENOENT') console.error(`Error reading ${filePath}:`, e);
            return null;
        }
    };
    
    const readDataForTopic = async (topicIdToFetch: string): Promise<(ActivityItem | Question)[]> => {
        const activityPath = path.join(process.cwd(), 'public', 'curriculum', 'activities', `${topicIdToFetch}.json`);
        const questionPath = path.join(process.cwd(), 'public', 'curriculum', 'questions', `${topicIdToFetch}.json`);

        const [activityData, questionData] = await Promise.all([
            readJsonFile(activityPath),
            readJsonFile(questionPath)
        ]);

        return [...(activityData || []), ...(questionData || [])];
    }

    if (topicId && topicId !== 'all') {
        return readDataForTopic(topicId);
    } else if (unitId && unitId !== 'all') {
        let allUnitItems: (ActivityItem | Question)[] = [];
        try {
            const manifestPath = path.join(process.cwd(), 'public', 'curriculum', 'manifest.json');
            const manifestContent = await fs.readFile(manifestPath, 'utf-8');
            const manifest = JSON.parse(manifestContent);
            
            let targetUnit;
            for (const group of manifest.classGroups) {
                for (const course of group.courses) {
                    const foundUnit = course.units.find((u: any) => u.id === unitId);
                    if (foundUnit) {
                        targetUnit = foundUnit;
                        break;
                    }
                }
                if (targetUnit) break;
            }

            if (targetUnit && targetUnit.topics) {
                const topicDataPromises = targetUnit.topics.map((topic: any) => readDataForTopic(topic.id));
                const allTopicsData = await Promise.all(topicDataPromises);
                allUnitItems = allTopicsData.flat();
            }
        } catch(e) {
            console.error("Error reading manifest to get topics for unit:", e);
        }
        return allUnitItems;
    } else if (params.courseId && params.courseId !== 'all') {
        let allCourseItems: (ActivityItem | Question)[] = [];
        try {
            const manifestPath = path.join(process.cwd(), 'public', 'curriculum', 'manifest.json');
            const manifestContent = await fs.readFile(manifestPath, 'utf-8');
            const manifest = JSON.parse(manifestContent);
            
            let targetCourse;
            for (const group of manifest.classGroups) {
                const foundCourse = group.courses.find((c: any) => c.id === params.courseId);
                if (foundCourse) {
                    targetCourse = foundCourse;
                    break;
                }
            }

            if (targetCourse && targetCourse.units) {
                const allTopicIds: string[] = [];
                for (const unit of targetCourse.units) {
                    if (unit.topics) {
                        allTopicIds.push(...unit.topics.map((t: any) => t.id));
                    }
                }
                const topicDataPromises = allTopicIds.map(id => readDataForTopic(id));
                const allTopicsData = await Promise.all(topicDataPromises);
                allCourseItems = allTopicsData.flat();
            }
        } catch(e) {
            console.error("Error reading manifest to get topics for course:", e);
        }
        return allCourseItems;
    }

    return [];
}


// --- This function is now a specific wrapper around getStaticGameData ---
export async function getStaticQuestionsForGame(params: {
  courseId?: string;
  unitId?: string;
  topicId?: string;
  dataType?: 'activities' | 'questions' | 'all';
}): Promise<(ActivityItem | Question)[]> {
    const { dataType = 'all', ...restParams } = params;
    
    const allData = await getStaticGameData(restParams);

    if (dataType === 'all') {
        return allData;
    }
    
    return allData.filter(item => {
        if ('text' in item && typeof item.text === 'string') { // Likely a Question
             if (dataType === 'questions') return true;
        } else { // Likely an ActivityItem
             if (dataType === 'activities') return true;
        }
        return false;
    });
}
