
'use server';

import { db, storage } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, addDoc, updateDoc, deleteDoc, serverTimestamp, orderBy } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import type { ImageAsset } from "@/lib/types";

export async function addImageRecord(imageData: Omit<ImageAsset, 'id' | 'createdAt'>): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
        const docRef = await addDoc(collection(db, 'imageLibrary'), {
            ...imageData,
            createdAt: serverTimestamp()
        });
        return { success: true, id: docRef.id };
    } catch (e: any) {
        console.error("Error adding image record:", e);
        return { success: false, error: "Görsel bilgisi veritabanına kaydedilemedi." };
    }
}


export async function getImages(teacherId: string): Promise<{ success: boolean; data?: ImageAsset[]; error?: string }> {
    try {
        if (!teacherId) return { success: false, error: "Öğretmen bilgisi bulunamadı." };

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
                createdAt: (data.createdAt as any)?.toDate ? (data.createdAt as any).toDate().toISOString() : new Date().toISOString(),
            } as ImageAsset
        });
        return { success: true, data: images };
    } catch (e: any) {
        console.error("Error getting images:", e);
        return { success: false, error: 'Görseller alınamadı.' };
    }
}


export async function deleteImage(image: ImageAsset): Promise<{ success: boolean; error?: string }> {
    try {
        // Delete the file from Cloud Storage
        const storageRef = ref(storage, image.fullPath);
        await deleteObject(storageRef);

        // Delete the document from Firestore
        await deleteDoc(doc(db, 'imageLibrary', image.id));
        
        return { success: true };
    } catch (e: any) {
        console.error("Error deleting image:", e);
        // Handle cases where the file might already be deleted from storage but the db record exists
        if ((e as any).code === 'storage/object-not-found') {
            try {
                await deleteDoc(doc(db, 'imageLibrary', image.id));
                return { success: true };
            } catch (dbError) {
                 console.error("Error deleting image Firestore record after storage error:", dbError);
                 return { success: false, error: 'Görsel depolamada bulunamadı ama veritabanından da silinemedi.' };
            }
        }
        return { success: false, error: 'Görsel silinemedi.' };
    }
}
