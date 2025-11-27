
'use server';

import { db, storage } from "@/lib/firebase";
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
        const images = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ImageAsset));
        return { success: true, data: images };
    } catch (e: any) {
        return { success: false, error: 'Görseller alınamadı.' };
    }
}

export async function addImageRecord(teacherId: string, title: string, url: string, fullPath: string): Promise<{ success: boolean, id?: string, error?: string }> {
     try {
        const docRef = await addDoc(collection(db, 'imageLibrary'), {
            teacherId,
            title,
            url,
            fullPath,
            createdAt: serverTimestamp()
        });
        return { success: true, id: docRef.id };
    } catch (e: any) {
        return { success: false, error: 'Görsel kaydı oluşturulamadı.' };
    }
}

export async function deleteImage(image: ImageAsset): Promise<{ success: boolean; error?: string }> {
    try {
        // Delete the file from Storage
        if (image.fullPath) {
            const storageRef = ref(storage, image.fullPath);
            await deleteObject(storageRef);
        }
        
        // Delete the record from Firestore
        await deleteDoc(doc(db, 'imageLibrary', image.id));
        
        return { success: true };
    } catch (e: any) {
         if (e.code === 'storage/object-not-found') {
            console.warn("File not found in storage, but deleting Firestore record anyway.");
            try {
                await deleteDoc(doc(db, 'imageLibrary', image.id));
                return { success: true };
            } catch (firestoreError: any) {
                 return { success: false, error: 'Görsel depolamada bulunamadı ancak Firestore kaydı da silinemedi: ' + firestoreError.message };
            }
        }
        return { success: false, error: 'Görsel silinemedi: ' + e.message };
    }
}

// This function is not a server action but a helper for the client to call.
// The actual server action will be `addImageRecord`.
export async function uploadImage(teacherId: string, file: File) {
    if (!teacherId || !file) {
        throw new Error("Kullanıcı ID'si veya dosya eksik.");
    }
    const fullPath = `images/${teacherId}/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, fullPath);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    return { url, fullPath };
}
