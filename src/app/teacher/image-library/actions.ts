
'use server';

import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, addDoc, updateDoc, deleteDoc, serverTimestamp, orderBy } from "firebase/firestore";
import type { ImageAsset } from "@/lib/types";

export async function getImages(teacherId: string): Promise<{ success: boolean; data?: ImageAsset[]; error?: string }> {
    try {
        const q = query(
            collection(db, 'imageLibrary'),
            where('teacherId', '==', teacherId),
            orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        const images = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ImageAsset));
        return { success: true, data: images };
    } catch (e: any) {
        return { success: false, error: 'Görseller alınamadı.' };
    }
}

export async function addOrUpdateImage(image: Partial<ImageAsset>): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
        const dataToSave: Partial<Omit<ImageAsset, 'id'>> = {
            ...image,
            type: 'imageLibrary', // Ensure type is always set
        };
        
        if (image.id) {
            const { id, ...rest } = dataToSave;
            await updateDoc(doc(db, 'imageLibrary', id as string), rest);
            return { success: true, id };
        } else {
            const docRef = await addDoc(collection(db, 'imageLibrary'), {
                ...dataToSave,
                createdAt: serverTimestamp()
            });
            return { success: true, id: docRef.id };
        }
    } catch (e: any) {
        return { success: false, error: 'Görsel kaydedilemedi.' };
    }
}

export async function deleteImage(imageId: string): Promise<{ success: boolean; error?: string }> {
    try {
        await deleteDoc(doc(db, 'imageLibrary', imageId));
        return { success: true };
    } catch (e: any) {
        return { success: false, error: 'Görsel silinemedi.' };
    }
}
