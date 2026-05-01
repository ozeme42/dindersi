
'use server';

import { getAdminDb } from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';

/**
 * Tüm ekstra sayfaları getirir.
 */
export async function getExtraPages(onlyPublished = false) {
  try {
    const db = getAdminDb();
    let query = db.collection('extraPages').orderBy('createdAt', 'desc');
    
    if (onlyPublished) {
      query = query.where('isPublished', '==', true);
    }
    
    const snap = await query.get();
    const pages = snap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate()?.toISOString() || null,
        updatedAt: data.updatedAt?.toDate()?.toISOString() || null,
      };
    });
    
    return { success: true, pages };
  } catch (error: any) {
    console.error("Error fetching extra pages:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Tek bir sayfayı ID üzerinden getirir.
 */
export async function getExtraPage(id: string) {
  try {
    const db = getAdminDb();
    const doc = await db.collection('extraPages').doc(id).get();
    
    if (!doc.exists) {
      return { success: false, error: "Sayfa bulunamadı." };
    }
    
    const data = doc.data();
    return {
      success: true,
      page: {
        id: doc.id,
        ...data,
        createdAt: data?.createdAt?.toDate()?.toISOString() || null,
        updatedAt: data?.updatedAt?.toDate()?.toISOString() || null,
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Sayfayı kaydeder veya günceller.
 */
export async function saveExtraPage(id: string | null, data: any) {
  try {
    const db = getAdminDb();
    const col = db.collection('extraPages');
    
    const docData = {
      ...data,
      category: data.category || 'Genel',
      updatedAt: new Date(),
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
    };

    if (id) {
      await col.doc(id).update(docData);
    } else {
      await col.add(docData);
    }
    
    revalidatePath('/extra');
    revalidatePath('/teacher/extra-pages');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Sayfayı siler.
 */
export async function deleteExtraPage(id: string) {
  try {
    const db = getAdminDb();
    await db.collection('extraPages').doc(id).delete();
    
    revalidatePath('/extra');
    revalidatePath('/teacher/extra-pages');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Bir kategorinin adını tüm sayfalarda toplu olarak değiştirir.
 */
export async function renameExtraPageCategory(oldName: string, newName: string) {
  try {
    const db = getAdminDb();
    const batch = db.batch();
    const snap = await db.collection('extraPages').where('category', '==', oldName).get();
    
    snap.docs.forEach(doc => {
      batch.update(doc.ref, { category: newName });
    });
    
    await batch.commit();
    
    revalidatePath('/extra');
    revalidatePath('/teacher/extra-pages');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
