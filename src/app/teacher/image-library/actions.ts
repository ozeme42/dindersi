
'use server';

import { db } from "@/lib/firebase";
import { storage } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, addDoc, updateDoc, deleteDoc, serverTimestamp, orderBy } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import type { ImageAsset } from "@/lib/types";
import { unstable_noStore as noStore } from 'next/cache';

export async function getImages(teacherId: string): Promise<{ success: boolean; data?: ImageAsset[]; error?: string }> {
    noStore();
    try {
        const q = query(
            collection(db, 'imageLibrary'), 
            where('teacherId', '==', teacherId),
            orderBy('createdAt', 'desc') // Sort by creation date, newest first
        );
        const snapshot = await getDocs(q);
        const images = snapshot.docs.map(doc => {
            const data = doc.data();
            return { 
                id: doc.id, 
                ...data,
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
            } as ImageAsset
        });
        return { success: true, data: images };
    } catch (e: any) {
        console.error("Error getting images: ", e);
        if (e.code === 'failed-precondition') {
             return { success: false, error: `Veritabanı indeksi eksik. Lütfen bu hatayı gidermek için geliştirici konsolundaki linki kullanın. Hata: ${e.message}`};
        }
        return { success: false, error: 'Görseller alınamadı.' };
    }
}


export async function addImageRecord(record: Omit<ImageAsset, 'id' | 'createdAt'>): Promise<{ success: boolean, id?: string, error?: string }> {
    try {
        const docRef = await addDoc(collection(db, 'imageLibrary'), {
            ...record,
            createdAt: serverTimestamp()
        });
        return { success: true, id: docRef.id };
    } catch (e: any) {
        return { success: false, error: 'Veritabanı kaydı oluşturulurken hata oluştu.' };
    }
}


export async function deleteImage(image: ImageAsset): Promise<{ success: boolean; error?: string }> {
    try {
        // Delete the Firestore document
        await deleteDoc(doc(db, 'imageLibrary', image.id));
        
        // Delete the file from Storage
        try {
            const storageRef = ref(storage, image.storagePath);
            await deleteObject(storageRef);
        } catch (storageError: any) {
            // If the file doesn't exist in storage (e.g., already deleted), that's okay.
            // We still want to proceed if the main error was just "object-not-found".
            if (storageError.code !== 'storage/object-not-found') {
                // If it's a different error (like permissions), we re-throw it.
                throw storageError;
            }
            console.warn(`File at ${image.storagePath} not found in Storage, but proceeding with Firestore deletion.`);
        }

        return { success: true };
    } catch (e: any) {
        console.error("Error deleting image:", e);
        return { success: false, error: 'Görsel silinirken bir hata oluştu.' };
    }
}
