
'use server';

import { db, storage } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, addDoc, updateDoc, deleteDoc, serverTimestamp, orderBy } from "firebase/firestore";
import type { VideoAsset } from "@/lib/types";
import { ref, deleteObject } from "firebase/storage";
import { unstable_noStore as noStore } from 'next/cache';


export async function getImages(): Promise<{ success: boolean; data?: VideoAsset[]; error?: string }> {
    noStore();
    try {
        const q = query(collection(db, 'imageLibrary'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        const images = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), createdAt: doc.data().createdAt?.toDate().toISOString() } as VideoAsset));
        return { success: true, data: JSON.parse(JSON.stringify(images)) };
    } catch (e: any) {
        console.error("Error fetching images:", e);
        if (e.code === 'failed-precondition') {
             return { success: false, error: `Veritabanı indeksi eksik. Lütfen bu hatayı gidermek için geliştirici konsolundaki linki kullanın veya aşağıdaki linke tıklayın. Hata: ${e.message}`};
        }
        return { success: false, error: 'Görseller alınamadı.' };
    }
}

export async function addImageRecord(imageData: Omit<VideoAsset, 'id' | 'createdAt'>): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
        const docRef = await addDoc(collection(db, 'imageLibrary'), {
            ...imageData,
            createdAt: serverTimestamp()
        });
        return { success: true, id: docRef.id };
    } catch (e: any) {
        return { success: false, error: 'Görsel bilgisi veritabanına kaydedilemedi.' };
    }
}


export async function deleteImage(image: VideoAsset): Promise<{ success: boolean; error?: string }> {
    try {
        // Delete the Firestore document
        await deleteDoc(doc(db, 'imageLibrary', image.id));
        
        // Delete the file from Firebase Storage
        if (image.storagePath) {
            const storageRef = ref(storage, image.storagePath);
            try {
                await deleteObject(storageRef);
            } catch (storageError: any) {
                 // If the file doesn't exist in storage, that's okay, we can ignore it.
                if (storageError.code !== 'storage/object-not-found') {
                    throw storageError; // Re-throw other storage errors
                }
            }
        }

        return { success: true };
    } catch (e: any) {
        return { success: false, error: 'Görsel silinemedi.' };
    }
}

