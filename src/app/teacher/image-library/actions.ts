
'use server';

import { db, storage } from "@/lib/firebase";
import { collection, addDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import type { UploadedImage } from "@/lib/types";
import { doc } from "firebase/firestore";

export async function uploadImageAndSave(image: Partial<UploadedImage>, file?: File): Promise<{ success: boolean; id?: string; error?: string }> {
    if (!image.teacherId) return { success: false, error: "Öğretmen bilgisi eksik." };

    try {
        let downloadUrl = image.downloadUrl;

        // If a new file is provided, upload it to Storage
        if (file) {
            const storageRef = ref(storage, `images/${image.teacherId}/${Date.now()}_${file.name}`);
            const snapshot = await uploadBytes(storageRef, file, { contentType: file.type });
            downloadUrl = await getDownloadURL(snapshot.ref);
        }

        if (!downloadUrl) {
            return { success: false, error: "Görsel URL'si oluşturulamadı. Lütfen bir dosya seçtiğinizden emin olun." };
        }

        const dataToSave = {
            ...image,
            downloadUrl: downloadUrl,
            updatedAt: serverTimestamp(),
        };

        if (image.id) {
            // Update existing document
            const docRef = doc(db, "imageLibrary", image.id);
            await updateDoc(docRef, dataToSave);
            return { success: true, id: image.id };
        } else {
            // Create new document
            const docRef = await addDoc(collection(db, "imageLibrary"), {
                ...dataToSave,
                createdAt: serverTimestamp(),
            });
            return { success: true, id: docRef.id };
        }
    } catch (error: any) {
        console.error("Error uploading image and saving to Firestore:", error);
        return { success: false, error: "Görsel yüklenirken veya kaydedilirken bir hata oluştu." };
    }
}

export async function deleteImage(image: UploadedImage): Promise<{ success: boolean; error?: string }> {
    if (!image || !image.id || !image.downloadUrl) {
        return { success: false, error: "Geçersiz görsel bilgisi." };
    }

    try {
        // Delete the file from Cloud Storage
        const storageRef = ref(storage, image.downloadUrl);
        await deleteObject(storageRef);

        // Delete the document from Firestore
        await deleteDoc(doc(db, "imageLibrary", image.id));

        return { success: true };
    } catch (error: any) {
        // Handle cases where the file might not exist in storage but the DB entry does
        if (error.code === 'storage/object-not-found') {
            console.warn(`Storage object not found for ${image.downloadUrl}, deleting Firestore record anyway.`);
            try {
                await deleteDoc(doc(db, "imageLibrary", image.id));
                return { success: true };
            } catch (dbError: any) {
                console.error("Error deleting Firestore record after storage error:", dbError);
                return { success: false, error: "Depolama dosyası bulunamadı ve veritabanı kaydı silinemedi." };
            }
        }
        console.error("Error deleting image:", error);
        return { success: false, error: "Görsel silinirken bir hata oluştu." };
    }
}
