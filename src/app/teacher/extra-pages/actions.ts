'use server';

import fs from 'fs/promises';
import path from 'path';
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

const EXTRA_PAGES_DIR = path.join(process.cwd(), 'public', 'curriculum', 'extra-pages');
const EXTRA_INDEX_PATH = path.join(EXTRA_PAGES_DIR, 'index.json');

async function ensureDir() {
  try {
    await fs.mkdir(EXTRA_PAGES_DIR, { recursive: true });
  } catch {}
}

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

export async function getExtraPages(onlyPublished: boolean = false, includeFullHtml: boolean = true) {
  try {
    await ensureDir();
    let pages: any[] = [];

    // 1. Önce yerel dosya sisteminden oku (0 Firestore Read)
    try {
      const indexContent = await fs.readFile(EXTRA_INDEX_PATH, 'utf-8');
      pages = JSON.parse(indexContent);
    } catch {
      // Dosya yoksa veya okunamadıysa Firestore'dan çekip dosyaya yaz (fallback)
      const db = getAdminDb();
      const snapshot = await db.collection('extraPages').get();
      
      pages = snapshot.docs.map(doc => {
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

      // index.json ve tekil dosyaları kaydet
      const indexList = pages.map(p => {
        const isExternalLink = typeof p.htmlContent === 'string' && p.htmlContent.startsWith('URL::');
        return {
          id: p.id,
          title: p.title,
          category: p.category,
          description: p.description || '',
          isPublished: p.isPublished,
          htmlContent: isExternalLink ? p.htmlContent : '',
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        };
      });
      await fs.writeFile(EXTRA_INDEX_PATH, JSON.stringify(indexList, null, 2), 'utf-8');
    }

    let result = pages;
    if (onlyPublished) {
      result = result.filter(p => p.isPublished === true);
    }

    // Eğer tam HTML içeriği isteniyorsa (örn: yönetim panelinde düzenleme)
    // index.json'da htmlContent boş olabileceğinden, tekil dosyalardan yükle
    if (includeFullHtml) {
      result = await Promise.all(result.map(async (p) => {
        if (p.htmlContent && p.htmlContent.length > 0) return p;
        try {
          const docPath = path.join(EXTRA_PAGES_DIR, `${p.id}.json`);
          const raw = await fs.readFile(docPath, 'utf-8');
          const parsed = JSON.parse(raw);
          return { ...p, htmlContent: parsed.htmlContent || '' };
        } catch {
          return p;
        }
      }));
    }

    return { success: true, data: result };
  } catch (error: any) {
    console.error("Error fetching extra pages:", error);
    return { success: false, error: error.message };
  }
}

export async function getExtraPage(id: string) {
  try {
    await ensureDir();
    const docPath = path.join(EXTRA_PAGES_DIR, `${id}.json`);

    // 1. Önce yerel dosya sisteminden oku (0 Firestore Read)
    try {
      const raw = await fs.readFile(docPath, 'utf-8');
      const page = JSON.parse(raw);
      return { success: true, data: page };
    } catch {
      // 2. Dosya yoksa Firestore'dan çek ve yerel dosyayı oluştur
      const db = getAdminDb();
      const doc = await db.collection('extraPages').doc(id).get();
      if (!doc.exists) return { success: false, error: "Döküman bulunamadı." };
      const data = doc.data();
      const page = { 
          id: doc.id, 
          isPublished: data?.isPublished !== undefined ? data.isPublished : true,
          category: data?.category || 'Genel',
          ...serializeDoc(data) 
      };

      try {
        await fs.writeFile(docPath, JSON.stringify(page, null, 2), 'utf-8');
      } catch (writeErr) {
        console.warn('Could not cache single extra page to disk:', writeErr);
      }

      return { success: true, data: page };
    }
  } catch (error: any) {
    console.error("Error fetching single extra page:", error);
    return { success: false, error: error.message };
  }
}

export async function saveExtraPage(id: string | null, data: any) {
  try {
    await ensureDir();
    const nowIso = new Date().toISOString();
    const targetId = id || `page_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const pageData: any = {
      id: targetId,
      title: data.title,
      description: data.description || "",
      htmlContent: data.htmlContent,
      category: data.category || 'Genel',
      isPublished: data.isPublished !== undefined ? data.isPublished : true,
      updatedAt: nowIso,
    };

    if (!id) {
      pageData.createdAt = nowIso;
    } else {
      try {
        const oldRaw = await fs.readFile(path.join(EXTRA_PAGES_DIR, `${targetId}.json`), 'utf-8');
        const oldParsed = JSON.parse(oldRaw);
        pageData.createdAt = oldParsed.createdAt || nowIso;
      } catch {
        pageData.createdAt = nowIso;
      }
    }

    // 1. Yerel tekil dosyayı kaydet
    await fs.writeFile(path.join(EXTRA_PAGES_DIR, `${targetId}.json`), JSON.stringify(pageData, null, 2), 'utf-8');

    // 2. index.json dosyasını güncelle
    try {
      let indexList: any[] = [];
      try {
        const rawIndex = await fs.readFile(EXTRA_INDEX_PATH, 'utf-8');
        indexList = JSON.parse(rawIndex);
      } catch {}

      const isExternalLink = typeof pageData.htmlContent === 'string' && pageData.htmlContent.startsWith('URL::');
      const indexEntry = {
        id: targetId,
        title: pageData.title,
        category: pageData.category,
        description: pageData.description,
        isPublished: pageData.isPublished,
        htmlContent: isExternalLink ? pageData.htmlContent : '',
        createdAt: pageData.createdAt,
        updatedAt: pageData.updatedAt,
      };

      const existingIdx = indexList.findIndex(p => p.id === targetId);
      if (existingIdx >= 0) {
        indexList[existingIdx] = indexEntry;
      } else {
        indexList.unshift(indexEntry);
      }

      // Tarihe göre sırala
      indexList.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });

      await fs.writeFile(EXTRA_INDEX_PATH, JSON.stringify(indexList, null, 2), 'utf-8');
    } catch (idxErr) {
      console.warn('Could not update extra-pages index.json:', idxErr);
    }

    // 3. Firestore'a asenkron yedekle
    try {
      const db = getAdminDb();
      const firestoreData = {
        title: pageData.title,
        description: pageData.description,
        htmlContent: pageData.htmlContent,
        category: pageData.category,
        isPublished: pageData.isPublished,
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (id) {
        await db.collection('extraPages').doc(id).set(firestoreData, { merge: true });
      } else {
        (firestoreData as any).createdAt = FieldValue.serverTimestamp();
        await db.collection('extraPages').doc(targetId).set(firestoreData);
      }
    } catch (fsErr) {
      console.warn('Firestore backup sync warning:', fsErr);
    }

    revalidatePath('/extra');
    revalidatePath('/teacher/extra-pages');
    revalidatePath(`/extra/${targetId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteExtraPage(id: string) {
  try {
    await ensureDir();
    // 1. Yerel dosyayı sil
    try {
      await fs.unlink(path.join(EXTRA_PAGES_DIR, `${id}.json`));
    } catch {}

    // 2. index.json'dan çıkar
    try {
      const rawIndex = await fs.readFile(EXTRA_INDEX_PATH, 'utf-8');
      let indexList = JSON.parse(rawIndex);
      indexList = indexList.filter((p: any) => p.id !== id);
      await fs.writeFile(EXTRA_INDEX_PATH, JSON.stringify(indexList, null, 2), 'utf-8');
    } catch {}

    // 3. Firestore'dan sil
    try {
      const db = getAdminDb();
      await db.collection('extraPages').doc(id).delete();
    } catch (fsErr) {
      console.warn('Firestore delete sync warning:', fsErr);
    }

    revalidatePath('/extra');
    revalidatePath('/teacher/extra-pages');
    revalidatePath(`/extra/${id}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function moveExtraPage(id: string, newCategory: string) {
  try {
    await ensureDir();
    const nowIso = new Date().toISOString();

    // 1. Tekil dosyayı güncelle
    const docPath = path.join(EXTRA_PAGES_DIR, `${id}.json`);
    try {
      const raw = await fs.readFile(docPath, 'utf-8');
      const page = JSON.parse(raw);
      page.category = newCategory;
      page.updatedAt = nowIso;
      await fs.writeFile(docPath, JSON.stringify(page, null, 2), 'utf-8');
    } catch {}

    // 2. index.json'ı güncelle
    try {
      const rawIndex = await fs.readFile(EXTRA_INDEX_PATH, 'utf-8');
      const indexList = JSON.parse(rawIndex);
      const target = indexList.find((p: any) => p.id === id);
      if (target) {
        target.category = newCategory;
        target.updatedAt = nowIso;
        await fs.writeFile(EXTRA_INDEX_PATH, JSON.stringify(indexList, null, 2), 'utf-8');
      }
    } catch {}

    // 3. Firestore'u güncelle
    try {
      const db = getAdminDb();
      await db.collection('extraPages').doc(id).update({ 
        category: newCategory,
        updatedAt: FieldValue.serverTimestamp()
      });
    } catch (fsErr) {
      console.warn('Firestore move sync warning:', fsErr);
    }

    revalidatePath('/extra');
    revalidatePath('/teacher/extra-pages');
    revalidatePath(`/extra/${id}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function renameExtraPageCategory(oldName: string, newName: string) {
    try {
        await ensureDir();
        const nowIso = new Date().toISOString();

        // 1. index.json dosyasını güncelle
        let affectedIds: string[] = [];
        try {
          const rawIndex = await fs.readFile(EXTRA_INDEX_PATH, 'utf-8');
          const indexList = JSON.parse(rawIndex);
          indexList.forEach((p: any) => {
            const cat = p.category || 'Genel';
            if (cat === oldName || cat.startsWith(oldName + '/')) {
              p.category = cat.replace(oldName, newName);
              p.updatedAt = nowIso;
              affectedIds.push(p.id);
            }
          });
          await fs.writeFile(EXTRA_INDEX_PATH, JSON.stringify(indexList, null, 2), 'utf-8');
        } catch {}

        // 2. Etkilenen tekil dökümanları güncelle
        for (const docId of affectedIds) {
          try {
            const docPath = path.join(EXTRA_PAGES_DIR, `${docId}.json`);
            const raw = await fs.readFile(docPath, 'utf-8');
            const page = JSON.parse(raw);
            const cat = page.category || 'Genel';
            if (cat === oldName || cat.startsWith(oldName + '/')) {
              page.category = cat.replace(oldName, newName);
              page.updatedAt = nowIso;
              await fs.writeFile(docPath, JSON.stringify(page, null, 2), 'utf-8');
            }
          } catch {}
        }

        // 3. Firestore'u güncelle
        try {
          const db = getAdminDb();
          const batch = db.batch();
          const snapshot = await db.collection('extraPages').get();
          snapshot.docs.forEach(doc => {
            const cat = doc.data().category || 'Genel';
            if (cat === oldName || cat.startsWith(oldName + '/')) {
              const newCat = cat.replace(oldName, newName);
              batch.update(doc.ref, { category: newCat });
            }
          });
          await batch.commit();
        } catch (fsErr) {
          console.warn('Firestore rename category warning:', fsErr);
        }

        revalidatePath('/extra');
        revalidatePath('/teacher/extra-pages');
        return { success: true, count: affectedIds.length };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteExtraPageCategory(categoryName: string) {
    try {
        await ensureDir();
        const nowIso = new Date().toISOString();

        // 1. index.json dosyasını güncelle
        let affectedIds: string[] = [];
        try {
          const rawIndex = await fs.readFile(EXTRA_INDEX_PATH, 'utf-8');
          const indexList = JSON.parse(rawIndex);
          indexList.forEach((p: any) => {
            const cat = p.category || 'Genel';
            if (cat === categoryName || cat.startsWith(categoryName + '/')) {
              p.category = 'Genel';
              p.updatedAt = nowIso;
              affectedIds.push(p.id);
            }
          });
          await fs.writeFile(EXTRA_INDEX_PATH, JSON.stringify(indexList, null, 2), 'utf-8');
        } catch {}

        // 2. Etkilenen tekil dökümanları güncelle
        for (const docId of affectedIds) {
          try {
            const docPath = path.join(EXTRA_PAGES_DIR, `${docId}.json`);
            const raw = await fs.readFile(docPath, 'utf-8');
            const page = JSON.parse(raw);
            const cat = page.category || 'Genel';
            if (cat === categoryName || cat.startsWith(categoryName + '/')) {
              page.category = 'Genel';
              page.updatedAt = nowIso;
              await fs.writeFile(docPath, JSON.stringify(page, null, 2), 'utf-8');
            }
          } catch {}
        }

        // 3. Firestore'u güncelle
        try {
          const db = getAdminDb();
          const batch = db.batch();
          const snapshot = await db.collection('extraPages').get();
          snapshot.docs.forEach(doc => {
            const cat = doc.data().category || 'Genel';
            if (cat === categoryName || cat.startsWith(categoryName + '/')) {
              batch.update(doc.ref, { category: 'Genel' });
            }
          });
          await batch.commit();
        } catch (fsErr) {
          console.warn('Firestore delete category warning:', fsErr);
        }

        revalidatePath('/extra');
        revalidatePath('/teacher/extra-pages');
        return { success: true, count: affectedIds.length };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}