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
    // NOT: Tüm dökümanları çekip bellekte işliyoruz ki eksik alanı olan dökümanlar Firestore query filtresine takılıp kaybolmasın.
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
    return { success: true, data: { id: doc.id, ...serializeDoc(doc.data()) } };
  } catch (error: any) {
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