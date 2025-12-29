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

// Yardımcı Fonksiyon: Firestore 'undefined' sevmez, her şeyi null'a çevirelim veya temizleyelim.
const cleanDataForFirestore = (data: any) => {
    const cleaned: any = {};
    Object.keys(data).forEach(key => {
        if (data[key] === undefined) {
            cleaned[key] = null;
        } else {
            cleaned[key] = data[key];
        }
    });
    return cleaned;
};

export async function saveImageRecord(data: Partial<ImageAsset>, teacherId: string): Promise<{ success: boolean; error?: string; }> {
    console.log("--- saveImageRecord Başladı ---");
    console.log("Teacher ID:", teacherId);
    console.log("Gelen Data:", JSON.stringify(data, null, 2));

    if (!teacherId) {
        console.error("HATA: Teacher ID eksik.");
        return { success: false, error: 'Kullanıcı kimliği bulunamadı.' };
    }
    if (!data.title || !data.url) {
        console.error("HATA: Başlık veya URL eksik.");
        return { success: false, error: 'Eksik görsel bilgileri.' };
    }

    try {
        // Firestore'a göndermeden önce undefined değerleri temizle
        const rawData = {
            title: data.title,
            url: data.url,
            storagePath: data.storagePath || null,
            teacherId: teacherId,
            folderId: data.folderId || null,
            folderName: data.folderName || null,
        };

        const dataToSave = cleanDataForFirestore(rawData);
        console.log("Firestore'a Yazılacak Temiz Veri:", dataToSave);

        if (data.id) {
            // Update existing document
            console.log(`Doküman güncelleniyor: ${data.id}`);
            const docRef = doc(db, 'imageLibrary', data.id);
            await updateDoc(docRef, dataToSave);
            console.log("Güncelleme başarılı.");
        } else {
            // Create new document
            console.log("Yeni doküman oluşturuluyor...");
            const docRef = await addDoc(collection(db, 'imageLibrary'), {
                ...dataToSave,
                createdAt: serverTimestamp()
            });
            console.log(`Yeni doküman oluşturuldu. ID: ${docRef.id}`);
        }
        
        return { success: true };

    } catch (e: any) {
        // BURASI HATAYI GÖRECEĞİMİZ YER
        console.error("🔥 KRİTİK HATA (saveImageRecord):", e);
        return { success: false, error: `Veritabanı hatası: ${e.message}` };
    }
}

export async function saveBulkImageRecords(
    urls: { title: string; url: string }[],
    teacherId: string,
    folderId: string | null,
    folderName: string | null
): Promise<{ success: boolean; count?: number; error?: string }> {
    if (!teacherId) return { success: false, error: 'Kullanıcı kimliği bulunamadı.' };
    if (urls.length === 0) return { success: true, count: 0 };

    try {
        const batch = writeBatch(db);
        const imageLibraryCollection = collection(db, 'imageLibrary');
        
        urls.forEach(item => {
            const docRef = doc(imageLibraryCollection);
            batch.set(docRef, {
                title: item.title,
                url: item.url,
                storagePath: null,
                teacherId: teacherId,
                folderId: folderId || null,
                folderName: folderName || null,
                createdAt: serverTimestamp()
            });
        });

        await batch.commit();
        return { success: true, count: urls.length };

    } catch (e: any) {
        console.error("Bulk Save Error:", e);
        return { success: false, error: "Toplu görsel kaydı sırasında bir hata oluştu." };
    }
}


export async function getImagesAndFolders(teacherId: string): Promise<{ success: boolean; images?: ImageAsset[]; folders?: Folder[]; error?: string }> {
    console.log(`Veriler çekiliyor... TeacherID: ${teacherId}`);
    try {
        // DİKKAT: Bu sorgu için Firestore Index gerekebilir.
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
            // Tarih dönüşümünü güvenli yapalım
            let createdDate = new Date().toISOString();
            if (data.createdAt && typeof data.createdAt.toDate === 'function') {
                createdDate = data.createdAt.toDate().toISOString();
            } else if (data.createdAt) {
                 createdDate = new Date(data.createdAt).toISOString();
            }

            return { 
                id: doc.id, 
                ...data,
                createdAt: createdDate
            } as ImageAsset
        });

        const folders = folderSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Folder));
        
        console.log(`Veri çekme başarılı. Resim sayısı: ${images.length}`);
        
        // Seriliazasyon hatasını önlemek için stringify/parse yapıyoruz
        return { 
            success: true, 
            images: JSON.parse(JSON.stringify(images)), 
            folders: JSON.parse(JSON.stringify(folders)) 
        };

    } catch (e: any) {
        console.error("🔥 VERİ ÇEKME HATASI (getImagesAndFolders):", e);
        
        // İndeks Hatası Kontrolü
        if (e.code === 'failed-precondition' || e.message.includes('index')) {
             const urlRegex = /(https?:\/\/[^\s]+)/g;
             const url = e.message.match(urlRegex)?.[0];
             
             if (url) {
                 console.log("---------------------------------------------------");
                 console.log("LÜTFEN BU LİNKE TIKLAYARAK İNDEKS OLUŞTURUN:");
                 console.log(url);
                 console.log("---------------------------------------------------");
             }

             return { 
                success: false, 
                error: `Veritabanı indeksi eksik. Terminaldeki linke tıklayın veya <a href="${url || '#'}" target="_blank">buraya tıklayın</a>.`
            };
        }
        return { success: false, error: 'Arşiv içeriği alınamadı: ' + e.message };
    }
}

// ... Diğer fonksiyonlarınız (createFolder, moveImageToFolder, delete vs.) aynı kalabilir ...
// ... Ancak hata alıyorsanız createFolder için de benzer loglama yapabiliriz ...

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
         console.error("Folder Create Error:", e);
         return { success: false, error: "Klasör oluşturulamadı." };
    }
}

export async function moveImageToFolder(imageId: string, folderId: string | null, folderName: string | null): Promise<{ success: boolean; error?: string }> {
    if (!imageId) return { success: false, error: 'Görsel ID\'si eksik.'};
    try {
        await updateDoc(doc(db, 'imageLibrary', imageId), {
            folderId: folderId || null,
            folderName: folderName || null
        });
        return { success: true };
    } catch (e: any) {
        console.error("Move Image Error:", e);
        return { success: false, error: "Görsel taşınamadı." };
    }
}

export async function deleteFolder(folderId: string): Promise<{ success: boolean; error?: string }> {
    if (!folderId) return { success: false, error: "Klasör ID'si eksik."};
    const dbBatch = writeBatch(db);
    try {
        const imagesInFolderQuery = query(collection(db, 'imageLibrary'), where('folderId', '==', folderId));
        const imagesSnapshot = await getDocs(imagesInFolderQuery);
        
        imagesSnapshot.forEach(imageDoc => {
            dbBatch.update(doc(db, 'imageLibrary', imageDoc.id), { folderId: null, folderName: null });
        });
        
        dbBatch.delete(doc(db, 'imageFolders', folderId));
        await dbBatch.commit();
        return { success: true };
    } catch (e: any) {
        console.error("Delete Folder Error:", e);
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
            console.log(`Storage silme isteği client'a bırakıldı: ${storagePath}`);
        }
        
        return { success: true };
    } catch (e: any) {
        console.error("Error deleting image:", e);
        return { success: false, error: 'Görsel veritabanından silinemedi.' };
    }
}