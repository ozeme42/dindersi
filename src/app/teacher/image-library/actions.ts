
'use server';

import { db, storage } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, addDoc, updateDoc, deleteDoc, serverTimestamp, orderBy } from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import type { ImageAsset } from "@/lib/types";
import { unstable_noStore as noStore } from 'next/cache';

export async function addImageRecord(imageData: Omit<ImageAsset, 'id' | 'createdAt'>): Promise<{ success: boolean; error?: string }> {
    if (!imageData.teacherId || !imageData.url || !imageData.path) {
        return { success: false, error: 'Eksik bilgi.' };
    }
    try {
        await addDoc(collection(db, 'imageLibrary'), {
            ...imageData,
            createdAt: serverTimestamp(),
        });
        return { success: true };
    } catch (e: any) {
        console.error("Error adding image record:", e);
        return { success: false, error: 'Veritabanına resim kaydı eklenemedi.' };
    }
}

export async function getImages(teacherId: string): Promise<{ success: boolean; data?: ImageAsset[]; error?: string }> {
    noStore();
    if (!teacherId) return { success: false, error: "Öğretmen ID'si bulunamadı." };
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
                createdAt: data.createdAt?.toDate().toISOString(),
            } as ImageAsset;
        });
        return { success: true, data: JSON.parse(JSON.stringify(images)) };
    } catch (e: any) {
        console.error('Error fetching images:', e);
        return { success: false, error: 'Görseller alınamadı.' };
    }
}

export async function deleteImage(image: ImageAsset): Promise<{ success: boolean; error?: string }> {
    if (!image.id || !image.path) {
        return { success: false, error: 'Geçersiz resim bilgisi.' };
    }

    try {
        // Delete from Firestore
        await deleteDoc(doc(db, 'imageLibrary', image.id));
        
        // Delete from Storage
        const imageRef = ref(storage, image.path);
        await deleteObject(imageRef).catch((error) => {
            // It's okay if the object doesn't exist in storage, we can ignore that error.
            if (error.code !== 'storage/object-not-found') {
                throw error; // Re-throw other errors
            }
        });

        return { success: true };
    } catch (e: any) {
        console.error("Error deleting image:", e);
        return { success: false, error: 'Resim silinemedi.' };
    }
}
