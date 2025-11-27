
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

async function getSubCollectionIds(path: string, subCollectionName: 'units' | 'topics'): Promise<string[]> {
    try {
        const snapshot = await getDocs(collection(db, `${path}/${subCollectionName}`));
        return snapshot.docs.map(doc => doc.id);
    } catch (e) {
        return [];
    }
}

async function getAllTopicIdsUnderPath(filter: LibraryFilter): Promise<string[]> {
    if (filter.topicId && filter.topicId !== 'all') {
        return [filter.topicId];
    }
    
    if (filter.unitId && filter.unitId !== 'all' && filter.courseId && filter.courseId !== 'all') {
        return await getSubCollectionIds(`courses/${filter.courseId}/units/${filter.unitId}`, 'topics');
    }
    
    if (filter.courseId && filter.courseId !== 'all') {
        const unitIds = await getSubCollectionIds(`courses/${filter.courseId}`, 'units');
        const topicIdPromises = unitIds.map(unitId => getSubCollectionIds(`courses/${filter.courseId}/units/${unitId}`, 'topics'));
        return (await Promise.all(topicIdPromises)).flat();
    }
    
    if (filter.classId && filter.classId !== 'all') {
        const coursesQuery = query(collection(db, 'courses'), where('classId', '==', filter.classId));
        const coursesSnapshot = await getDocs(coursesQuery);
        const courseIds = coursesSnapshot.docs.map(doc => doc.id);
        
        const unitIdPromises = courseIds.map(courseId => getSubCollectionIds(`courses/${courseId}`, 'units'));
        const unitIdsArrays = await Promise.all(unitIdPromises);
        const allUnitIds = unitIdsArrays.flat();

        const topicIdPromises = courseIds.flatMap(courseId => {
            const courseUnitIds = allUnitIds.filter(uid => uid.startsWith(courseId)); // This is not how unit ids work, needs fixing if we depend on it
            return getSubCollectionIds(`courses/${courseId}`, 'units').then(unitIds => 
                Promise.all(unitIds.map(unitId => getSubCollectionIds(`courses/${courseId}/units/${unitId}`, 'topics')))
            );
        });
        
        return (await Promise.all(topicIdPromises)).flat(2);
    }
    
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

        const topicIds = await getAllTopicIdsUnderPath(filters);

        let finalConditions: any[] = [];
        
        if (topicIds.length > 0) {
            finalConditions.push(where("topicId", "in", topicIds.slice(0, 30)));
        } else if (filters.topicId === 'all' && filters.unitId === 'all' && filters.courseId === 'all' && filters.classId === 'all') {
            // No topic filter, fetch all
        } else if (filters.classId || filters.courseId || filters.unitId || filters.topicId) {
             // If we have filters but no topicIds found, it means no items match.
             return { items: [] };
        }

        if (isQuestions && filters.questionTypes && filters.questionTypes.length > 0) {
            finalConditions.push(where("type", "in", filters.questionTypes));
        }

        if (!isQuestions && filters.activityTypes && filters.activityTypes.length > 0) {
            finalConditions.push(where("type", "in", filters.activityTypes));
        }
        
        if (finalConditions.length > 0) {
            baseQuery = query(baseQuery, and(...finalConditions));
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
