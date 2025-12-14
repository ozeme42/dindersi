
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

// Bu fonksiyon istemci tarafında halledildiği için kaldırıldı veya kullanılmıyor.
// Sunucu eylemi olarak yeniden tanımlıyoruz.
export async function saveImageRecord(data: Partial<ImageAsset>, teacherId: string): Promise<{ success: boolean; error?: string; }> {
    if (!teacherId) return { success: false, error: 'Kullanıcı kimliği bulunamadı.' };
    if (!data.title || !data.url || !data.storagePath) return { success: false, error: 'Eksik görsel bilgileri.' };

    try {
        if (data.id) {
            // Update existing document
            const { id, ...updateData } = data;
            const docRef = doc(db, 'imageLibrary', id);
            await updateDoc(docRef, {
                title: updateData.title,
                url: updateData.url,
                storagePath: updateData.storagePath,
            });
        } else {
            // Create new document
            await addDoc(collection(db, 'imageLibrary'), {
                title: data.title,
                url: data.url,
                storagePath: data.storagePath,
                teacherId: teacherId,
                createdAt: serverTimestamp()
            });
        }
        return { success: true };
    } catch (e: any) {
        console.error("Error saving image record to Firestore:", e);
        return { success: false, error: "Görsel bilgisi veritabanına kaydedilemedi." };
    }
}


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
                // Client-side SDK'dan storage nesnesi alınamıyor, bu yüzden bu işlem client'ta yapılmalı.
                // Ancak path'i loglayabiliriz. Bu fonksiyon idealde client'tan çağrılmalı.
                console.log(`Deletion requested for storage path: ${storagePath}. This should be handled on the client.`);
            } catch (storageError: any) {
                console.warn(`Storage delete instruction failed for ${storagePath} but Firestore entry was removed. Error: ${storageError.message}`);
            }
        }
        
        return { success: true };
    } catch (e: any) {
        console.error("Error deleting image from Firestore:", e);
        return { success: false, error: 'Görsel veritabanından silinemedi.' };
    }
}
