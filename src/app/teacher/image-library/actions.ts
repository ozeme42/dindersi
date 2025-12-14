
'use server';

import { db } from "@/lib/firebase";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp, 
  orderBy, 
  Timestamp,
  getDoc 
} from "firebase/firestore";
// DİKKAT: Storage importlarını buradan kaldırdık (Delete hariç, o bazen çalışır ama client'tan tetiklemek daha iyidir. Şimdilik burada kalsın)
import { getStorage, ref, deleteObject } from "firebase/storage";
import type { ImageAsset } from "@/lib/types";

// firebase/storage'ı client-side kullanacağımız için bu fonksiyona artık gerek yok.
// Bu dosyadaki tüm sunucu aksiyonları client tarafına taşındı.

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

export async function deleteImage(imageId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const imageRef = doc(db, 'imageLibrary', imageId);
        const imageSnap = await getDoc(imageRef);
        
        if (!imageSnap.exists()) return { success: false, error: "Görsel bulunamadı." };

        const storagePath = imageSnap.data()?.storagePath;
        
        // Firestore'dan sil
        await deleteDoc(imageRef);

        if (storagePath) {
            try {
                const storage = getStorage();
                const storageRef = ref(storage, storagePath);
                await deleteObject(storageRef);
            } catch (storageError: any) {
                console.warn(`Storage delete failed for ${storagePath} but Firestore entry was removed. Error: ${storageError.message}`);
                // Don't fail the whole operation if storage deletion fails, but log it.
            }
        }
        
        return { success: true };
    } catch (e: any) {
        console.error("Error deleting image from Firestore:", e);
        return { success: false, error: 'Görsel veritabanından silinemedi.' };
    }
}
