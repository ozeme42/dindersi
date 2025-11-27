
'use server';

import { db, storage } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, addDoc, updateDoc, deleteDoc, serverTimestamp, orderBy } from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import type { ImageAsset } from "@/lib/types";

// This function now only handles the database record creation.
// The file upload itself will be handled on the client.
export async function addImageRecord(imageData: Omit<ImageAsset, 'id' | 'createdAt'>): Promise<{ success: boolean; id?: string; error?: string }> {
    if (!imageData.teacherId || !imageData.url || !imageData.path) {
        return { success: false, error: 'Eksik bilgi.' };
    }
    try {
        const docRef = await addDoc(collection(db, 'imageLibrary'), {
            ...imageData,
            createdAt: serverTimestamp()
        });
        return { success: true, id: docRef.id };
    } catch (e: any) {
        console.error("Error adding image record:", e);
        return { success: false, error: 'Görsel kaydı oluşturulamadı.' };
    }
}

export async function getImages(teacherId: string): Promise<{ success: boolean; data?: ImageAsset[]; error?: string }> {
    try {
        const q = query(
            collection(db, 'imageLibrary'),
            where('teacherId', '==', teacherId),
            orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        const images = snapshot.docs.map(doc => {
            const data = doc.data();
            return { 
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate().toISOString() || new Date().toISOString()
            } as ImageAsset;
        });
        return { success: true, data: images };
    } catch (e: any) {
        console.error("Error fetching images:", e);
        return { success: false, error: 'Görseller alınamadı.' };
    }
}

export async function deleteImage(image: ImageAsset): Promise<{ success: boolean; error?: string }> {
    if (!image || !image.id || !image.path) {
        return { success: false, error: 'Geçersiz görsel bilgisi.' };
    }
    try {
        // Create a reference to the file to delete
        const fileRef = ref(storage, image.path);

        // Delete the file from Firebase Storage
        await deleteObject(fileRef);
        
        // Delete the Firestore document
        await deleteDoc(doc(db, 'imageLibrary', image.id));
        
        return { success: true };
    } catch (e: any) {
         if (e.code === 'storage/object-not-found') {
            console.warn(`Storage object not found for ${image.path}, but deleting Firestore record.`);
            try {
                await deleteDoc(doc(db, 'imageLibrary', image.id));
                return { success: true };
            } catch (dbError) {
                console.error("Error deleting Firestore record after storage object not found:", dbError);
                return { success: false, error: 'Depolama nesnesi bulunamadı ve veritabanı kaydı silinirken hata oluştu.' };
            }
        }
        console.error("Error deleting image:", e);
        return { success: false, error: 'Görsel silinemedi.' };
    }
}
