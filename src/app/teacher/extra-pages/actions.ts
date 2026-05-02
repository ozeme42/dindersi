'use server';

import { getAdminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';

export type ExtraPage = {
  id?: string;
  title: string;
  content: string;
  category: string;
  isPublished: boolean;
  createdAt?: any;
  updatedAt?: any;
  description?: string;
};

// Firestore verisini düz JS objesine çevirir (Tarihleri serialize eder)
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

/**
 * Tüm ekstra sayfaları getirir.
 */
export async function getExtraPages(onlyPublished: boolean = false) {
  try {
    const db = getAdminDb();
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

/**
 * Sayfayı kaydeder veya günceller.
 */
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
 * Bir sayfayı başka bir kategoriye/klasöre taşır.
 */
export async function moveExtraPage(id: string, newCategory: string) {
  try {
    const db = getAdminDb();
    await db.collection('extraPages').doc(id).update({ 
      category: newCategory,
      updatedAt: FieldValue.serverTimestamp()
    });
    revalidatePath('/extra');
    revalidatePath('/teacher/extra-pages');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Bir kategorinin adını toplu olarak değiştirir (Alt yollar dahil).
 */
export async function renameExtraPageCategory(oldName: string, newName: string) {
  try {
    const db = getAdminDb();
    const snapshot = await db.collection('extraPages').get();
    
    const batch = db.batch();
    let count = 0;

    snapshot.docs.forEach(doc => {
      const cat = doc.data().category || 'Genel';
      
      // Tam eşleşme veya alt klasör eşleşmesi (A -> B olursa A/C -> B/C olur)
      if (cat === oldName) {
        batch.update(doc.ref, { category: newName });
        count++;
      } else if (cat.startsWith(oldName + '/')) {
        const updatedCat = newName + cat.substring(oldName.length);
        batch.update(doc.ref, { category: updatedCat });
        count++;
      }
    });
    
    if (count > 0) {
      await batch.commit();
    }
    
    revalidatePath('/extra');
    revalidatePath('/teacher/extra-pages');
    return { success: true, count };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Bir kategoriyi siler (O kategorideki sayfaları 'Genel' kategorisine taşır).
 */
export async function deleteExtraPageCategory(categoryName: string) {
  if (categoryName === 'Genel') return { success: false, error: "'Genel' kategorisi silinemez." };
  
  try {
    const db = getAdminDb();
    const snapshot = await db.collection('extraPages').get();
    
    const batch = db.batch();
    let count = 0;

    snapshot.docs.forEach(doc => {
      const cat = doc.data().category || 'Genel';
      if (cat === categoryName || cat.startsWith(categoryName + '/')) {
        batch.update(doc.ref, { category: 'Genel' });
        count++;
      }
    });
    
    if (count > 0) {
      await batch.commit();
    }
    
    revalidatePath('/extra');
    revalidatePath('/teacher/extra-pages');
    return { success: true, count };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
