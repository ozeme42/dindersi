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

        // Normalize activityTypes
        let mappedActivityTypes: string[] = [];
        if (filters.activityTypes && filters.activityTypes.length > 0) {
            for (const t of filters.activityTypes) {
                if (t === 'terms' as any || t === 'term' as any) {
                    mappedActivityTypes.push('concept', 'definition');
                } else if (t === 'sentences' as any || t === 'sentence' as any) {
                    mappedActivityTypes.push('sentence');
                } else {
                    mappedActivityTypes.push(t);
                }
            }
            mappedActivityTypes = Array.from(new Set(mappedActivityTypes));
        }

        // Soru / Etkinlik tipi filtresi
        if (isQuestions && filters.questionTypes && filters.questionTypes.length > 0) {
            q = query(q, where("type", "in", filters.questionTypes));
        } else if (!isQuestions && mappedActivityTypes.length > 0) {
            q = query(q, where("type", "in", mappedActivityTypes));
        }

        let items: (Question | ActivityItem)[] = [];
        try {
            const snapshot = await getDocs(q);
            items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Question | ActivityItem));
        } catch (queryErr) {
            console.warn("Firestore query failed, will fallback to local json:", queryErr);
        }

        // Local static JSON fallback if Firestore has 0 items
        if (items.length === 0 && filters.topicId && filters.topicId !== 'all') {
            try {
                const fs = await import('fs');
                const path = await import('path');
                const candidatePaths = [
                    path.join(process.cwd(), 'public', 'curriculum', 'activities', `${filters.topicId}.json`),
                    path.join(process.cwd(), 'public', 'curriculum', 'activityItems', `${filters.topicId}.json`),
                    path.join(process.cwd(), 'public', 'curriculum', 'activity-items', `${filters.topicId}.json`),
                ];
                if (isQuestions) {
                    candidatePaths.unshift(path.join(process.cwd(), 'public', 'curriculum', 'questions', `${filters.topicId}.json`));
                }

                for (const filePath of candidatePaths) {
                    if (fs.existsSync(filePath)) {
                        const fileData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                        if (Array.isArray(fileData) && fileData.length > 0) {
                            let localItems = fileData;
                            if (!isQuestions && mappedActivityTypes.length > 0) {
                                localItems = localItems.filter((it: any) => mappedActivityTypes.includes(it.type));
                            } else if (isQuestions && filters.questionTypes && filters.questionTypes.length > 0) {
                                localItems = localItems.filter((it: any) => filters.questionTypes?.includes(it.type));
                            }
                            items = localItems;
                            break;
                        }
                    }
                }
            } catch (err) {
                console.warn("Local activity/questions fallback read error:", err);
            }
        }

        // Eğer sadece tanım istenmişse ve kavramlar hariç tutulacaksa
        if (mappedActivityTypes.length === 1 && mappedActivityTypes.includes('definition')) {
            items = items.filter(item => {
                if (item.type === 'concept') return false;
                if (item.type === 'definition') {
                    const def = (item as any).content?.definition || (item as any).definition;
                    return !!(def && String(def).trim().length > 0);
                }
                return true;
            });
        } else if (mappedActivityTypes.length === 1 && mappedActivityTypes.includes('concept')) {
            items = items.filter(item => item.type === 'concept');
        }

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
        return { error: "Kütüphane verileri alınırken bir hata oluştu: " + e.message, items: [] };
    }
}
