
'use server';

import { db, storage } from '@/lib/firebase';
import { collection, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import { z } from 'zod';
import { adminApp } from '@/lib/firebase-admin'; // Needed for getting user

const UploadSchema = z.object({
  image: z.string().startsWith('data:image', "Geçersiz resim formatı."),
  name: z.string().min(1, "Dosya adı gerekli."),
  teacherId: z.string(),
});

export async function uploadImage(data: unknown) {
  const validation = UploadSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, error: validation.error.flatten().fieldErrors };
  }

  const { image, name, teacherId } = validation.data;
  const storageRef = ref(storage, `image-library/${teacherId}/${Date.now()}-${name}`);

  try {
    const snapshot = await uploadString(storageRef, image, 'data_url');
    const downloadURL = await getDownloadURL(snapshot.ref);

    const docRef = await addDoc(collection(db, 'imageLibrary'), {
      name: name,
      url: downloadURL,
      storagePath: snapshot.ref.fullPath,
      teacherId: teacherId,
      createdAt: serverTimestamp(),
    });

    return { success: true, id: docRef.id, url: downloadURL };
  } catch (error: any) {
    console.error("Error uploading image:", error);
    return { success: false, error: "Görsel yüklenirken bir hata oluştu." };
  }
}

export async function deleteImage(imageId: string, storagePath: string) {
    if (!imageId || !storagePath) {
        return { success: false, error: 'Eksik bilgi.' };
    }
    try {
        const imageDocRef = doc(db, 'imageLibrary', imageId);
        await deleteDoc(imageDocRef);

        const storageRef = ref(storage, storagePath);
        await deleteObject(storageRef);

        return { success: true };
    } catch (error: any) {
        console.error("Error deleting image:", error);
        // If doc is deleted but storage is not, we might have an orphan file.
        // For this app, we'll accept that risk and report a generic error.
        return { success: false, error: "Görsel silinirken bir hata oluştu." };
    }
}
