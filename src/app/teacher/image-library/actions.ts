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

// BU FONKSİYON ARTIK DOSYA DEĞİL, URL KABUL EDİYOR
export async function saveImageRecord(data: {
    id?: string;
    title: string;
    teacherId: string;
    url?: string;
    storagePath?: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
        // --- GÜNCELLEME ---
        if (data.id) {
            const updateData: any = { title: data.title };
            // Eğer yeni resim yüklendiyse URL ve Path'i de güncelle
            if (data.url && data.storagePath) {
                updateData.url = data.url;
                updateData.storagePath = data.storagePath;
            }
            await updateDoc(doc(db, 'imageLibrary', data.id), updateData);
            return { success: true, id: data.id };
        } 
        
        // --- YENİ KAYIT ---
        else {
            if (!data.url || !data.storagePath) {
                return { success: false, error: "Görsel URL'i eksik." };
            }

            const docRef = await addDoc(collection(db, 'imageLibrary'), {
                title: data.title,
                url: data.url,
                storagePath: data.storagePath,
                teacherId: data.teacherId,
                createdAt: serverTimestamp()
            });
            return { success: true, id: docRef.id };
        }
    } catch (e: any) {
        console.error("Database Error:", e);
        return { success: false, error: 'Veritabanı hatası: ' + e.message };
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

        // Not: Server Action içinden Client SDK ile Storage silmek de bazen hata verebilir. 
        // Eğer silmede hata alırsanız storage silme işlemini de page.tsx'e taşımanız gerekir.
        // Şimdilik deniyoruz:
        if (storagePath) {
            try {
                const storageRef = ref(storage, storagePath);
                await deleteObject(storageRef);
            } catch (storageError) {
                console.warn("Storage delete error (might require admin sdk):", storageError);
            }
        }
        
        return { success: true };
    } catch (e: any) {
        return { success: false, error: 'Görsel silinemedi.' };
    }
}