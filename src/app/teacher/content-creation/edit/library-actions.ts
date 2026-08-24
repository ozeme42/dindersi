'use server';

import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, orderBy, Query, limit } from "firebase/firestore";
import type { Question, ActivityItem, ImageAsset } from "@/lib/types";

export type LibraryFilter = {
    classId?: string | null;
    courseId?: string | null;
    unitId?: string | null;
    topicId?: string | null;
    type: 'questions' | 'activities' | 'images';
    questionTypes?: Question['type'][];
    activityTypes?: ActivityItem['type'][];
    searchTerm?: string;
};

export async function getLibraryItems(filters: LibraryFilter): Promise<{ items: (Question | ActivityItem | ImageAsset)[], error?: string }> {
    try {
        if (filters.type === 'images') {
            const imagesQuery = query(collection(db, 'imageLibrary'), orderBy('createdAt', 'desc'), limit(100));
            const snapshot = await getDocs(imagesQuery);
            const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ImageAsset));
            return { items: JSON.parse(JSON.stringify(items)) };
        }

        const isQuestions = filters.type === 'questions';
        const collectionName = isQuestions ? "questions" : "activityItems";
        
        let q: Query = collection(db, collectionName);
        
        // Eğer belirli bir topicId varsa doğrudan filtrele
        if (filters.topicId && filters.topicId !== 'all') {
            q = query(q, where("topicId", "==", filters.topicId));
        } else if (filters.unitId && filters.unitId !== 'all') {
            q = query(q, where("unitId", "==", filters.unitId));
        } else if (filters.courseId && filters.courseId !== 'all') {
            q = query(q, where("courseId", "==", filters.courseId));
        }

        // Soru / Etkinlik tipi filtresi
        if (isQuestions && filters.questionTypes && filters.questionTypes.length > 0) {
            q = query(q, where("type", "in", filters.questionTypes));
        } else if (!isQuestions && filters.activityTypes && filters.activityTypes.length > 0) {
            q = query(q, where("type", "in", filters.activityTypes));
        }

        const snapshot = await getDocs(q);
        let items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Question | ActivityItem));

        // Eğer arama kelimesi varsa sunucu tarafında filtrele
        if (filters.searchTerm && filters.searchTerm.trim()) {
            const term = filters.searchTerm.toLowerCase().trim();
            items = items.filter(item => {
                if ('text' in item && item.text) {
                    return item.text.toLowerCase().includes(term);
                }
                if ('content' in item && item.content) {
                    const c = item.content as any;
                    return (c.text && c.text.toLowerCase().includes(term)) ||
                           (c.term && c.term.toLowerCase().includes(term)) ||
                           (c.definition && c.definition.toLowerCase().includes(term));
                }
                return false;
            });
        }

        return { items: JSON.parse(JSON.stringify(items)) };
    } catch (e: any) {
        console.error("Error fetching library items:", e);
        // Fallback if compound index error occurs: fetch without where query and filter in memory
        try {
            const isQuestions = filters.type === 'questions';
            const collectionName = isQuestions ? "questions" : "activityItems";
            const snapshot = await getDocs(query(collection(db, collectionName), limit(200)));
            let items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Question | ActivityItem));
            
            if (filters.topicId && filters.topicId !== 'all') {
                items = items.filter((item: any) => item.topicId === filters.topicId);
            }
            if (isQuestions && filters.questionTypes && filters.questionTypes.length > 0) {
                items = items.filter((item: any) => filters.questionTypes?.includes(item.type));
            } else if (!isQuestions && filters.activityTypes && filters.activityTypes.length > 0) {
                items = items.filter((item: any) => filters.activityTypes?.includes(item.type));
            }
            return { items: JSON.parse(JSON.stringify(items)) };
        } catch (fallbackErr: any) {
            return { error: "Kütüphane verileri alınırken bir hata oluştu: " + fallbackErr.message, items: [] };
        }
    }
}
