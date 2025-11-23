

'use server';

import { db } from "@/lib/firebase";
import { doc, updateDoc, deleteDoc, serverTimestamp, writeBatch, collection, addDoc, getDocs, query, where } from "firebase/firestore";
import { z } from "zod";
import type { AiActivityDataOutput } from "@/ai/flows/generate-activity-data-flow";
import type { CategorizationGameData, ActivityItem } from "@/lib/types";

export async function saveGeneratedActivityItems({ courseId, unitId, topicId, content }: { courseId: string; unitId: string; topicId: string; content: AiActivityDataOutput }) {
    if (!courseId || !unitId || !topicId) {
        return { success: false, error: "Konu bağlamı eksik." };
    }

    try {
        // 1. Fetch existing items for this topic to prevent duplicates
        const existingItemsQuery = query(collection(db, "activityItems"), where("topicId", "==", topicId));
        const querySnapshot = await getDocs(existingItemsQuery);
        
        const existingConcepts = new Set<string>();
        const existingDefinitions = new Set<string>();
        const existingSentences = new Set<string>();

        querySnapshot.forEach(doc => {
            const item = doc.data() as ActivityItem;
            if (item.type === 'concept') {
                existingConcepts.add((item.content.text || '').toLowerCase());
            } else if (item.type === 'definition') {
                const key = `${(item.content.term || '').toLowerCase()}|${(item.content.definition || '').toLowerCase()}`;
                existingDefinitions.add(key);
            } else if (item.type === 'sentence') {
                existingSentences.add((item.content.text || '').toLowerCase());
            }
        });

        // 2. Filter out duplicates from the new content
        const uniqueConcepts = content.concepts?.filter(c => !existingConcepts.has(c.toLowerCase()));
        const uniqueDefinitions = content.conceptDefinitions?.filter(d => {
            const key = `${(d.concept || '').toLowerCase()}|${(d.definition || '').toLowerCase()}`;
            return !existingDefinitions.has(key);
        });
        const uniqueSentences = content.summarySentences?.filter(s => !existingSentences.has(s.toLowerCase()));

        // 3. Batch write only the unique items
        const batch = writeBatch(db);
        const activityItemsCollection = collection(db, "activityItems");
        let addedCount = 0;

        uniqueConcepts?.forEach(conceptText => {
            const docRef = doc(activityItemsCollection);
            batch.set(docRef, {
                type: 'concept',
                content: { text: conceptText },
                courseId, unitId, topicId,
                createdAt: serverTimestamp(),
            });
            addedCount++;
        });

        uniqueDefinitions?.forEach(pair => {
            const docRef = doc(activityItemsCollection);
            batch.set(docRef, {
                type: 'definition',
                content: { term: pair.concept, definition: pair.definition },
                courseId, unitId, topicId,
                createdAt: serverTimestamp(),
            });
            addedCount++;
        });

        uniqueSentences?.forEach(sentenceText => {
            const docRef = doc(activityItemsCollection);
            batch.set(docRef, {
                type: 'sentence',
                content: { text: sentenceText },
                courseId, unitId, topicId,
                createdAt: serverTimestamp(),
            });
            addedCount++;
        });
        
        if (addedCount > 0) {
            await batch.commit();
        }

        return { success: true, count: addedCount };
    } catch (error: any) {
        console.error("Error saving generated activity items:", error);
        return { success: false, error: "Etkinlik verileri kaydedilirken bir hata oluştu." };
    }
}


export async function saveActivityItem(item: Partial<ActivityItem>): Promise<{ success: boolean, error?: string, id?: string }> {
    const { id, ...dataToSave } = item;
    try {
        // Ensure content.categories is an array of strings if it exists
        if (dataToSave.content?.categories && Array.isArray(dataToSave.content.categories)) {
            dataToSave.content.categories = dataToSave.content.categories.map(cat => (typeof cat === 'object' ? cat.value : cat));
        }

        if (id && !id.startsWith('new-')) {
            const docRef = doc(db, "activityItems", id);
            await updateDoc(docRef, dataToSave);
            return { success: true, id };
        } else {
            const docRef = await addDoc(collection(db, "activityItems"), {
                ...dataToSave,
                createdAt: serverTimestamp()
            });
            return { success: true, id: docRef.id };
        }
    } catch(error: any) {
        console.error("Error saving activity item:", error);
        return { success: false, error: "Veri kaydedilirken bir hata oluştu." };
    }
}


export async function deleteBulkActivityItems(itemIds: string[]): Promise<{ success: boolean; error?: string; count?: number }> {
    if (!itemIds || itemIds.length === 0) {
        return { success: false, error: "Silinecek veri seçilmedi." };
    }

    try {
        const chunks: string[][] = [];
        for (let i = 0; i < itemIds.length; i += 500) {
            chunks.push(itemIds.slice(i, i + 500));
        }

        for (const chunk of chunks) {
            const batch = writeBatch(db);
            chunk.forEach(id => {
                const docRef = doc(db, "activityItems", id);
                batch.delete(docRef);
            });
            await batch.commit();
        }

        return { success: true, count: itemIds.length };

    } catch (error: any) {
        console.error("Error deleting bulk activity items:", error);
        return { success: false, error: "Veriler silinirken bir hata oluştu." };
    }
}


const BulkImportContentSchema = z.object({
  concepts: z.array(z.string()).optional(),
  conceptDefinitions: z.array(z.object({concept: z.string().min(1), definition: z.string().min(1)})).optional(),
  summarySentences: z.array(z.string()).optional(),
  categorizationGames: z.array(z.custom<CategorizationGameData>()).optional(),
});


export async function importBulkActivityData(
    input: unknown,
    context: { courseId: string; unitId: string; topicId: string; }
): Promise<{ success: boolean; error?: string; count?: number }> {
    const validation = BulkImportContentSchema.safeParse(input);
    if (!validation.success) {
      return { success: false, error: 'JSON verisi doğrulanamadı. Lütfen formattaki alanları ve veri tiplerini kontrol edin.' };
    }
    
    try {
        const { concepts, conceptDefinitions, summarySentences, categorizationGames } = validation.data;
        const { courseId, unitId, topicId } = context;

        // Fetch existing items to prevent duplicates
        const existingItemsQuery = query(collection(db, "activityItems"), where("topicId", "==", topicId));
        const querySnapshot = await getDocs(existingItemsQuery);
        
        const existingConcepts = new Set<string>();
        const existingDefinitions = new Set<string>();
        const existingSentences = new Set<string>();
        const existingCategorizationTitles = new Set<string>();

        querySnapshot.forEach(doc => {
            const item = doc.data() as ActivityItem;
            if (item.type === 'concept') {
                existingConcepts.add((item.content.text || '').toLowerCase());
            } else if (item.type === 'definition') {
                const key = `${(item.content.term || '').toLowerCase()}|${(item.content.definition || '').toLowerCase()}`;
                existingDefinitions.add(key);
            } else if (item.type === 'sentence') {
                existingSentences.add((item.content.text || '').toLowerCase());
            } else if (item.type === 'categorization') {
                existingCategorizationTitles.add((item.content.title || '').toLowerCase());
            }
        });

        const batch = writeBatch(db);
        const activityItemsCollection = collection(db, "activityItems");
        let totalCount = 0;
            
        concepts?.forEach(conceptText => {
            if (!existingConcepts.has(conceptText.toLowerCase())) {
                const docRef = doc(activityItemsCollection);
                batch.set(docRef, { type: 'concept', content: { text: conceptText }, courseId, unitId, topicId, createdAt: serverTimestamp() });
                totalCount++;
                existingConcepts.add(conceptText.toLowerCase()); // Add to set to prevent duplicates within the same batch
            }
        });
        
        conceptDefinitions?.forEach(pair => {
            const definitionKey = `${(pair.concept || '').toLowerCase()}|${(pair.definition || '').toLowerCase()}`;
            const conceptText = pair.concept;
            
            // Add definition if it doesn't exist
            if (!existingDefinitions.has(definitionKey)) {
                const defDocRef = doc(activityItemsCollection);
                batch.set(defDocRef, { type: 'definition', content: { term: pair.concept, definition: pair.definition }, courseId, unitId, topicId, createdAt: serverTimestamp() });
                totalCount++;
                existingDefinitions.add(definitionKey);
            }

            // Also add the concept as a standalone 'concept' item if it doesn't exist
            if (conceptText && !existingConcepts.has(conceptText.toLowerCase())) {
                const conceptDocRef = doc(activityItemsCollection);
                batch.set(conceptDocRef, { type: 'concept', content: { text: conceptText }, courseId, unitId, topicId, createdAt: serverTimestamp() });
                totalCount++;
                existingConcepts.add(conceptText.toLowerCase()); // Add to set to prevent duplicates within the same batch
            }
        });

        summarySentences?.forEach(sentenceText => {
            if (!existingSentences.has(sentenceText.toLowerCase())) {
                const docRef = doc(activityItemsCollection);
                batch.set(docRef, { type: 'sentence', content: { text: sentenceText }, courseId, unitId, topicId, createdAt: serverTimestamp() });
                totalCount++;
                existingSentences.add(sentenceText.toLowerCase());
            }
        });
        
        categorizationGames?.forEach(game => {
            if (game.title && !existingCategorizationTitles.has(game.title.toLowerCase())) {
                const docRef = doc(activityItemsCollection);
                batch.set(docRef, { type: 'categorization', content: game, courseId, unitId, topicId, createdAt: serverTimestamp() });
                totalCount++;
                existingCategorizationTitles.add(game.title.toLowerCase());
            }
        });
        
        if (totalCount === 0) {
            return { success: true, count: 0, error: "Eklenecek yeni ve benzersiz veri bulunamadı. Tüm veriler zaten mevcut." };
        }

        await batch.commit();

        return { success: true, count: totalCount };

    } catch (error: any) {
        console.error("Error adding bulk activity data:", error);
        return { success: false, error: "Veriler eklenirken bir hata oluştu." };
    }
}
