

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
  getDoc,
  writeBatch
} from "firebase/firestore";
import type { ImageAsset, Folder } from "@/lib/types";

export async function saveImageRecord(data: Partial<ImageAsset>, teacherId: string): Promise<{ success: boolean; error?: string; }> {
    if (!teacherId) return { success: false, error: 'Kullanıcı kimliği bulunamadı.' };
    if (!data.title || !data.url || !data.storagePath) return { success: false, error: 'Eksik görsel bilgileri.' };

    try {
        const dataToSave = {
            title: data.title,
            url: data.url,
            storagePath: data.storagePath,
            teacherId: teacherId,
            folderId: data.folderId || null,
            folderName: data.folderName || null,
        };

        if (data.id) {
            // Update existing document
            const docRef = doc(db, 'imageLibrary', data.id);
            await updateDoc(docRef, dataToSave);
        } else {
            // Create new document
            await addDoc(collection(db, 'imageLibrary'), {
                ...dataToSave,
                createdAt: serverTimestamp()
            });
        }
        return { success: true };
    } catch (e: any) {
        console.error("Error saving image record to Firestore:", e);
        return { success: false, error: "Görsel bilgisi veritabanına kaydedilemedi." };
    }
}

export async function getImagesAndFolders(teacherId: string): Promise<{ success: boolean; images?: ImageAsset[]; folders?: Folder[]; error?: string }> {
    try {
        const imageQuery = query(
            collection(db, 'imageLibrary'),
            where('teacherId', '==', teacherId),
            orderBy('createdAt', 'desc')
        );
        const folderQuery = query(
            collection(db, 'imageFolders'),
            where('teacherId', '==', teacherId),
            orderBy('name', 'asc')
        );

        const [imageSnapshot, folderSnapshot] = await Promise.all([
            getDocs(imageQuery),
            getDocs(folderQuery),
        ]);

        const images = imageSnapshot.docs.map(doc => {
            const data = doc.data();
            return { 
                id: doc.id, 
                ...data,
                createdAt: (data.createdAt as Timestamp)?.toDate().toISOString() || new Date().toISOString()
            } as ImageAsset
        });

        const folders = folderSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Folder));

        return { success: true, images: JSON.parse(JSON.stringify(images)), folders: JSON.parse(JSON.stringify(folders)) };

    } catch (e: any) {
        console.error("Error getting library content:", e);
        if (e.code === 'failed-precondition') {
             const urlRegex = /(https?:\/\/[^\s]+)/g;
             const url = e.message.match(urlRegex)?.[0] || '#';
             return { 
                success: false, 
                error: `Veritabanı indeksi eksik. Lütfen bu hatayı gidermek için <a href="${url}" target="_blank" rel="noopener noreferrer" class="underline font-bold">bu linke tıklayarak</a> gerekli indeksi oluşturun.`
            };
        }
        return { success: false, error: 'Arşiv içeriği alınamadı.' };
    }
}

export async function createFolder(name: string, teacherId: string): Promise<{ success: boolean, error?: string }> {
    if (!name.trim()) return { success: false, error: "Klasör adı boş olamaz."};
    try {
        await addDoc(collection(db, 'imageFolders'), {
            name,
            teacherId,
            createdAt: serverTimestamp()
        });
        return { success: true };
    } catch (e: any) {
         return { success: false, error: "Klasör oluşturulamadı." };
    }
}

export async function moveImageToFolder(imageId: string, folderId: string | null, folderName: string | null): Promise<{ success: boolean; error?: string }> {
    if (!imageId) return { success: false, error: 'Görsel ID\'si eksik.'};
    try {
        await updateDoc(doc(db, 'imageLibrary', imageId), {
            folderId: folderId,
            folderName: folderName
        });
        return { success: true };
    } catch (e: any) {
        return { success: false, error: "Görsel taşınamadı." };
    }
}

export async function deleteFolder(folderId: string): Promise<{ success: boolean; error?: string }> {
    if (!folderId) return { success: false, error: "Klasör ID'si eksik."};
    const dbBatch = writeBatch(db);
    try {
        // Find all images in this folder and move them to root
        const imagesInFolderQuery = query(collection(db, 'imageLibrary'), where('folderId', '==', folderId));
        const imagesSnapshot = await getDocs(imagesInFolderQuery);
        
        imagesSnapshot.forEach(imageDoc => {
            dbBatch.update(doc(db, 'imageLibrary', imageDoc.id), { folderId: null, folderName: null });
        });
        
        // Delete the folder document
        dbBatch.delete(doc(db, 'imageFolders', folderId));

        await dbBatch.commit();

        return { success: true };
    } catch (e: any) {
        return { success: false, error: "Klasör silinirken bir hata oluştu." };
    }
}


export async function deleteImage(imageId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const imageRef = doc(db, 'imageLibrary', imageId);
        const imageSnap = await getDoc(imageRef);
        
        if (!imageSnap.exists()) return { success: false, error: "Görsel bulunamadı." };

        const storagePath = imageSnap.data()?.storagePath;
        
        await deleteDoc(imageRef);

        if (storagePath) {
            console.log(`Deletion requested for storage path: ${storagePath}. This should be handled on the client to use the client SDK for deletion.`);
        }
        
        return { success: true };
    } catch (e: any) {
        console.error("Error deleting image from Firestore:", e);
        return { success: false, error: 'Görsel veritabanından silinemedi.' };
    }
}
