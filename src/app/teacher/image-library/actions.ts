
'use server';

import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, addDoc, updateDoc, deleteDoc, serverTimestamp, orderBy, Timestamp } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import type { ImageAsset } from "@/lib/types";

const storage = getStorage();

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
                createdAt: (data.createdAt as Timestamp)?.toDate().toISOString() || new Date().toISOString()
            } as ImageAsset
        });
        return { success: true, data: JSON.parse(JSON.stringify(images)) };
    } catch (e: any) {
        return { success: false, error: 'Görseller alınamadı.' };
    }
}

export async function addOrUpdateImage(image: Partial<ImageAsset>, file?: File): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
        if (image.id) { // Editing existing image metadata
            const { id, ...dataToUpdate } = image;
            await updateDoc(doc(db, 'imageLibrary', id), dataToUpdate);
            return { success: true, id };
        } else if (file) { // Adding new image
            if (!image.teacherId) return { success: false, error: "Öğretmen ID'si eksik." };
            
            const storageRef = ref(storage, `imageLibrary/${image.teacherId}/${Date.now()}-${file.name}`);
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);

            const docRef = await addDoc(collection(db, 'imageLibrary'), {
                title: image.title,
                url: downloadURL,
                storagePath: snapshot.ref.fullPath,
                teacherId: image.teacherId,
                createdAt: serverTimestamp()
            });
            return { success: true, id: docRef.id };
        } else {
             return { success: false, error: "Yeni görsel için dosya seçilmedi." };
        }
    } catch (e: any) {
        console.error("Error saving image:", e);
        return { success: false, error: 'Görsel kaydedilemedi.' };
    }
}

export async function deleteImage(imageId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const imageRef = doc(db, 'imageLibrary', imageId);
        const imageSnap = await getDoc(imageRef);
        
        if (!imageSnap.exists()) {
            return { success: false, error: "Görsel bulunamadı." };
        }

        const storagePath = imageSnap.data()?.storagePath;
        
        // Delete from Firestore
        await deleteDoc(imageRef);

        // Delete from Storage if path exists
        if (storagePath) {
            const storageRef = ref(storage, storagePath);
            await deleteObject(storageRef).catch(error => {
                // If file doesn't exist in storage, we don't need to throw an error
                console.warn(`Could not delete file from storage (it may have been already deleted): ${storagePath}`, error);
            });
        }
        
        return { success: true };
    } catch (e: any) {
         console.error("Error deleting image:", e);
        return { success: false, error: 'Görsel silinemedi.' };
    }
}
