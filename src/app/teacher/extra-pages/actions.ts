'use server';

import { getAdminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';

export type ExtraPage = {
  id?: string;
  title: string;
  htmlContent: string;
  category: string;
  isPublished: boolean;
  createdAt?: any;
  updatedAt?: any;
  description?: string;
};

function serializeDoc(data: any) {
  if (!data) return data;
  const serialized = { ...data };
  for (const key in serialized) {
    if (serialized[key] && typeof serialized[key].toDate === 'function') {
      serialized[key] = serialized[key].toDate().toISOString();
    }
  }
  return serialized;
}

export async function getExtraPages(onlyPublished: boolean = false) {
  try {
    const db = getAdminDb();
    // Not: Firestore kısıtlamalarına takılmamak için tümünü çekip bellekte işliyoruz.
    // Bu sayede alanı eksik olan eski dökümanlar listeden kaybolmuyor.
    const snapshot = await db.collection('extraPages').get();
    
    let pages = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        category: data.category || 'Genel',
        isPublished: data.isPublished !== undefined ? data.isPublished : true,
        title: data.title || 'İsimsiz Sayfa',
        ...serializeDoc(data)
      };
    });

    // Tarihe göre sırala
    pages.sort((a: any, b: any) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    if (onlyPublished) {
      pages = pages.filter(p => p.isPublished === true);
    }

    return { success: true, data: pages };
  } catch (error: any) {
    console.error("Error fetching extra pages:", error);
    return { success: false, error: error.message };
  }
}

export async function getExtraPage(id: string) {
  try {
    const db = getAdminDb();
    const doc = await db.collection('extraPages').doc(id).get();
    if (!doc.exists) return { success: false, error: "Döküman bulunamadı." };
    const data = doc.data();
    return { 
        success: true, 
        data: { 
            id: doc.id, 
            isPublished: data?.isPublished !== undefined ? data.isPublished : true,
            category: data?.category || 'Genel',
            ...serializeDoc(data) 
        } 
    };
  } catch (error: any) {
    console.error("Error fetching single extra page:", error);
    return { success: false, error: error.message };
  }
}

export async function saveExtraPage(id: string | null, data: any) {
  try {
    const db = getAdminDb();
    const pageData = {
      title: data.title,
      description: data.description || "",
      htmlContent: data.htmlContent,
      category: data.category || 'Genel',
      isPublished: data.isPublished,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (id) {
      await db.collection('extraPages').doc(id).update(pageData);
    } else {
      (pageData as any).createdAt = FieldValue.serverTimestamp();
      await db.collection('extraPages').add(pageData);
    }

    revalidatePath('/extra');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteExtraPage(id: string) {
  try {
    const db = getAdminDb();
    await db.collection('extraPages').doc(id).delete();
    revalidatePath('/extra');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function moveExtraPage(id: string, newCategory: string) {
  try {
    const db = getAdminDb();
    await db.collection('extraPages').doc(id).update({ 
      category: newCategory,
      updatedAt: FieldValue.serverTimestamp()
    });
    revalidatePath('/extra');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function renameExtraPageCategory(oldName: string, newName: string) {
    try {
        const db = getAdminDb();
        const batch = db.batch();
        const snapshot = await db.collection('extraPages').get();
        
        let count = 0;
        snapshot.docs.forEach(doc => {
            const cat = doc.data().category || 'Genel';
            if (cat === oldName || cat.startsWith(oldName + '/')) {
                const newCat = cat.replace(oldName, newName);
                batch.update(doc.ref, { category: newCat });
                count++;
            }
        });
        
        await batch.commit();
        revalidatePath('/extra');
        return { success: true, count };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteExtraPageCategory(categoryName: string) {
    try {
        const db = getAdminDb();
        const batch = db.batch();
        const snapshot = await db.collection('extraPages').get();
        
        let count = 0;
        snapshot.docs.forEach(doc => {
            const cat = doc.data().category || 'Genel';
            if (cat === categoryName || cat.startsWith(categoryName + '/')) {
                batch.update(doc.ref, { category: 'Genel' });
                count++;
            }
        });
        
        await batch.commit();
        revalidatePath('/extra');
        return { success: true, count };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}