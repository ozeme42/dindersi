

'use server';

import type { Question, GetQuizInput, GetQuizOutput, ActivityItem } from "@/lib/types";
import path from 'path';
import fs from 'fs/promises';
import { db } from "@/lib/firebase"; 
import { collection, query, where, getDocs, limit as firestoreLimit, Query, and, collectionGroup } from "firebase/firestore";

// This is a type guard to check if an object is a valid Question.
function isQuestion(obj: any): obj is Question {
    return obj && typeof obj.type === 'string';
}

// In-Memory Cache with 15-minute TTL to reduce Firestore reads to near zero
interface CacheEntry {
    data: (Question | ActivityItem)[];
    timestamp: number;
}
const MEMORY_CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

function getFromCache(key: string): (Question | ActivityItem)[] | null {
    const entry = MEMORY_CACHE.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
        MEMORY_CACHE.delete(key);
        return null;
    }
    return entry.data;
}

function setInCache(key: string, data: (Question | ActivityItem)[]) {
    if (MEMORY_CACHE.size > 500) {
        const oldestKey = MEMORY_CACHE.keys().next().value;
        if (oldestKey) MEMORY_CACHE.delete(oldestKey);
    }
    MEMORY_CACHE.set(key, { data, timestamp: Date.now() });
}

// Helper to filter and shuffle questions
function filterAndShuffleQuestions(
    items: (Question | ActivityItem)[],
    questionCount: number,
    difficulty?: Question['difficulty'][],
    questionTypes?: string[]
): (Question | ActivityItem)[] {
    let filtered = items;

    const mappedTypes = questionTypes?.map(qt => ({ 'mcq': 'Çoktan Seçmeli', 'tf': 'Doğru/Yanlış', 'fitb': 'Boşluk Doldurma' }[qt] || qt));

    if (mappedTypes && mappedTypes.length > 0) {
        filtered = filtered.filter(item => {
            if ('type' in item) {
                return mappedTypes.includes(item.type);
            }
            return false;
        });
    }

    if (difficulty && difficulty.length > 0) {
        filtered = filtered.filter(item => {
            if ('difficulty' in item && item.difficulty) {
                return difficulty.includes(item.difficulty);
            }
            return true;
        });
    }

    const shuffled = [...filtered].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, questionCount);

    return selected.map(question => {
        if ('type' in question && (question.type === 'Çoktan Seçmeli' || question.type === 'Boşluk Doldurma') && 'options' in question && question.options) {
            const newOptions = [...question.options];
            newOptions.sort(() => Math.random() - 0.5);
            return { ...question, options: newOptions };
        }
        return question;
    });
}

// Centralized function to fetch questions - CACHED & STATIC-FIRST
export async function getQuestionsFromBank(params: GetQuizInput): Promise<GetQuizOutput> {
    const { courseId, unitId, topicId, questionCount = 100, difficulty, questionTypes, isStatic } = params;

    // 1. STATİK ÖNCELİK (0 FIRESTORE READS):
    // Önce yerel JSON dosyalarını kontrol et. Eğer yerel veri varsa Firestore'a HİÇ gitme!
    try {
        const staticItems = await getStaticGameData({ topicId, unitId, courseId });
        if (staticItems && staticItems.length > 0) {
            const selectedItems = filterAndShuffleQuestions(staticItems, questionCount, difficulty, questionTypes);
            if (selectedItems.length > 0) {
                return { questions: JSON.parse(JSON.stringify(selectedItems)) };
            }
        }
    } catch (err) {
        console.warn("Static data fetch warning, falling back to cache/DB:", err);
    }

    // 2. IN-MEMORY CACHE (0 FIRESTORE READS):
    // Eğer aynı konu için son 15 dakika içinde veritabanından çekilmiş veri varsa doğrudan bellekten dön!
    const cacheKey = `${courseId || 'all'}_${unitId || 'all'}_${topicId || 'all'}_${(questionTypes || []).join('-')}`;
    const cachedItems = getFromCache(cacheKey);
    if (cachedItems && cachedItems.length > 0) {
        const selectedItems = filterAndShuffleQuestions(cachedItems, questionCount, difficulty, questionTypes);
        if (selectedItems.length > 0) {
            return { questions: JSON.parse(JSON.stringify(selectedItems)) };
        }
    }

    // 3. GÜVENLİ FIRESTORE SORGUSU (GÜVENLİ LIMIT İLE KOTA KORUMASI):
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
        
        // KOTA KORUMASI: Asla limitsiz sorgu atma! İhtiyaç olanın en fazla 2 katını veya max 40 belge çek.
        const safeLimit = Math.min(Math.max(questionCount * 2, 20), 40);
        conditions.push(firestoreLimit(safeLimit));

        if (conditions.length > 0) {
            q = query(q, and(...conditions));
        }
        
        const querySnapshot = await getDocs(q);
        const allQuestions = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return { id: doc.id, ...data } as Question | ActivityItem;
        });

        // Belleğe kaydet ki sonraki 15 dakika gelen öğrenciler veritabanını tüketmesin
        if (allQuestions.length > 0) {
            setInCache(cacheKey, allQuestions);
        }

        const selectedQuestions = filterAndShuffleQuestions(allQuestions, questionCount, difficulty, questionTypes);

        if (selectedQuestions.length === 0) {
            return { questions: [], error: "Belirtilen kriterlere uygun soru/veri bulunamadı." };
        }

        return { questions: JSON.parse(JSON.stringify(selectedQuestions)) };

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

    const FILE_CACHE = new Map<string, any[]>();
    let CACHED_MANIFEST: any = null;

    const readJsonFile = async (filePath: string): Promise<any[] | null> => {
        if (FILE_CACHE.has(filePath)) {
            return FILE_CACHE.get(filePath) || null;
        }
        try {
            const fileContent = await fs.readFile(filePath, 'utf-8');
            const parsed = JSON.parse(fileContent);
            FILE_CACHE.set(filePath, parsed);
            return parsed;
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
            if (!CACHED_MANIFEST) {
                const manifestPath = path.join(process.cwd(), 'public', 'curriculum', 'manifest.json');
                const manifestContent = await fs.readFile(manifestPath, 'utf-8');
                CACHED_MANIFEST = JSON.parse(manifestContent);
            }
            const manifest = CACHED_MANIFEST;
            
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
