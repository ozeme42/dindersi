
'use server';

import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, orderBy, Query, and } from "firebase/firestore";
import type { Question, ActivityItem, Course, Unit, Topic, SchoolClass, VideoAsset, ImageAsset } from "@/lib/types";

export type LibraryFilter = {
    classId?: string | null;
    courseId?: string | null;
    unitId?: string | null;
    topicId?: string | null;
    type: 'questions' | 'activities' | 'videos' | 'imageLibrary';
    questionTypes?: Question['type'][];
    activityTypes?: ActivityItem['type'][];
};

async function getAllTopicIdsUnderPath(filter: LibraryFilter): Promise<string[]> {
    if (filter.topicId && filter.topicId !== 'all') {
        return [filter.topicId];
    }
    
    // This helper function seems complex and might not be necessary if we filter directly.
    // Let's simplify the logic inside getLibraryItems.
    return [];
}


export async function getLibraryItems(filters: LibraryFilter): Promise<{ items: (Question | ActivityItem | VideoAsset | ImageAsset)[], error?: string }> {
    try {
        if (filters.type === 'videos') {
            const videosQuery = query(collection(db, 'videoLibrary'), orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(videosQuery);
            const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VideoAsset));
            return { items: JSON.parse(JSON.stringify(items)) };
        }
        
        if (filters.type === 'imageLibrary') {
            const imagesQuery = query(collection(db, 'imageLibrary'), orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(imagesQuery);
            const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ImageAsset));
            return { items: JSON.parse(JSON.stringify(items)) };
        }

        const isQuestions = filters.type === 'questions';
        const collectionName = isQuestions ? "questions" : "activityItems";
        let baseQuery: Query = collection(db, collectionName);

        const conditions = [];

        if (filters.topicId && filters.topicId !== 'all') {
            conditions.push(where("topicId", "==", filters.topicId));
        } else if (filters.unitId && filters.unitId !== 'all') {
            conditions.push(where("unitId", "==", filters.unitId));
        } else if (filters.courseId && filters.courseId !== 'all') {
            conditions.push(where("courseId", "==", filters.courseId));
        } else if (filters.classId && filters.classId !== 'all') {
            // This part is tricky without a direct classId on questions/activities.
            // A better approach might be to pre-fetch courseIds for the class.
            // For now, we'll assume this might require a more complex query or denormalization.
            // Let's stick to the direct filters which are more reliable.
        }

        // Apply type filters
        if (isQuestions && filters.questionTypes && filters.questionTypes.length > 0) {
            conditions.push(where("type", "in", filters.questionTypes));
        }

        if (!isQuestions && filters.activityTypes && filters.activityTypes.length > 0) {
            conditions.push(where("type", "in", filters.activityTypes));
        }
        
        // Construct the final query
        if (conditions.length > 0) {
            baseQuery = query(baseQuery, and(...conditions));
        }
        
        const snapshot = await getDocs(baseQuery);
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Question | ActivityItem));
        
        return { items: JSON.parse(JSON.stringify(items)) };
        
    } catch (e: any) {
        console.error("Error fetching library items:", e);
        if (e.code === 'failed-precondition') {
             return { 
                error: `Veritabanı indeksi eksik. Lütfen bu hatayı gidermek için geliştirici konsolundaki linki kopyalayıp tarayıcınızda açın. Ayrıca, geliştirme sunucunuzun konsolunda (terminalde) tıklanabilir bir link bulabilirsiniz.\n\n---\n${e.message}\n---`, 
                items: [] 
            };
        }
        return { error: "Kütüphane verileri alınırken bir hata oluştu.", items: [] };
    }
}
