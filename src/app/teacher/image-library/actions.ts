
'use server';

import { db } from "@/lib/firebase";
import { storage } from "@/lib/firebase-storage";
import { collection, query, where, getDocs, doc, addDoc, updateDoc, deleteDoc, serverTimestamp, orderBy } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import type { ImageAsset } from "@/lib/types";

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
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
            } as ImageAsset;
        });
        return { success: true, data: JSON.parse(JSON.stringify(images)) };
    } catch (e: any) {
        console.error("Error getting images:", e);
        if (e.code === 'failed-precondition') {
             return { success: false, error: `Veritabanı indeksi eksik. Geliştirici konsolundaki linki kullanarak indeksi oluşturun. Hata: ${e.message}`};
        }
        return { success: false, error: 'Görseller alınamadı.' };
    }
}

export async function uploadImage(teacherId: string, formData: FormData): Promise<{ success: boolean; url?: string; path?: string; error?: string; }> {
    const file = formData.get('file') as File;
    if (!file) {
        return { success: false, error: 'Dosya bulunamadı.' };
    }
    
    const fileExtension = file.name.split('.').pop();
    const newFileName = `${teacherId}_${Date.now()}.${fileExtension}`;
    const storagePath = `image-library/${teacherId}/${newFileName}`;
    const storageRef = ref(storage, storagePath);

    try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        await uploadBytes(storageRef, buffer, { contentType: file.type });
        const downloadURL = await getDownloadURL(storageRef);

        return { success: true, url: downloadURL, path: storagePath };
    } catch (error: any) {
        console.error('Error uploading image:', error);
        return { success: false, error: 'Görsel yüklenirken bir hata oluştu: ' + error.message };
    }
}

export async function addImageRecord(image: Omit<ImageAsset, 'id' | 'createdAt'>): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
        const docRef = await addDoc(collection(db, 'imageLibrary'), {
            ...image,
            createdAt: serverTimestamp()
        });
        return { success: true, id: docRef.id };
    } catch (e: any) {
        return { success: false, error: 'Görsel veritabanına kaydedilemedi.' };
    }
}

export async function deleteImage(image: ImageAsset): Promise<{ success: boolean; error?: string }> {
    try {
        // First, delete the file from Storage
        if (image.storagePath) {
            const storageRef = ref(storage, image.storagePath);
            await deleteObject(storageRef);
        }
        // Then, delete the record from Firestore
        await deleteDoc(doc(db, 'imageLibrary', image.id));
        return { success: true };
    } catch (e: any) {
        console.error("Error deleting image:", e);
        if ((e as any).code === 'storage/object-not-found') {
            console.warn("Storage object not found, deleting Firestore record anyway.");
             await deleteDoc(doc(db, 'imageLibrary', image.id));
             return { success: true };
        }
        return { success: false, error: 'Görsel silinemedi.' };
    }
}
