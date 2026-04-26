
'use server';

import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { unstable_noStore as noStore } from 'next/cache';

export type ExtraPage = {
    id: string;
    title: string;
    description?: string;
    htmlContent: string;
    isPublished: boolean;
    createdAt: string;
}

const serialize = (data: any): any => {
  if (data === null || data === undefined) return null;
  if (Array.isArray(data)) return data.map(serialize);
  if (data && typeof data === 'object' && typeof data.toDate === 'function') return data.toDate().toISOString();
  if (data && typeof data === 'object' && '_seconds' in data) return new Date(data._seconds * 1000).toISOString();
  if (data instanceof Date) return data.toISOString();
  if (typeof data === 'object') {
    const newObj: { [key: string]: any } = {};
    for (const key in data) if (Object.prototype.hasOwnProperty.call(data, key)) newObj[key] = serialize(data[key]);
    return newObj;
  }
  return data;
};

export async function getExtraPages(onlyPublished: boolean = false): Promise<{ success: boolean; data?: ExtraPage[]; error?: string }> {
    noStore();
    try {
        const db = getAdminDb();
        let q = db.collection('extraPages').orderBy('createdAt', 'desc');
        
        if (onlyPublished) {
            q = q.where('isPublished', '==', true);
        }

        const snap = await q.get();
        const data = snap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as ExtraPage[];

        return { success: true, data: serialize(data) };
    } catch (e: any) {
        console.error("Error fetching extra pages:", e);
        return { success: false, error: e.message };
    }
}

export async function saveExtraPage(data: Partial<ExtraPage>): Promise<{ success: boolean; error?: string }> {
    try {
        const db = getAdminDb();
        const { id, ...saveData } = data;

        if (id) {
            await db.collection('extraPages').doc(id).update({
                ...saveData,
                updatedAt: FieldValue.serverTimestamp()
            });
        } else {
            await db.collection('extraPages').add({
                ...saveData,
                createdAt: FieldValue.serverTimestamp(),
                isPublished: saveData.isPublished ?? true
            });
        }
        return { success: true };
    } catch (e: any) {
        console.error("Error saving extra page:", e);
        return { success: false, error: e.message };
    }
}

export async function deleteExtraPage(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        const db = getAdminDb();
        await db.collection('extraPages').doc(id).delete();
        return { success: true };
    } catch (e: any) {
        console.error("Error deleting extra page:", e);
        return { success: false, error: e.message };
    }
}

export async function toggleExtraPagePublish(id: string, currentState: boolean): Promise<{ success: boolean; error?: string }> {
    try {
        const db = getAdminDb();
        await db.collection('extraPages').doc(id).update({
            isPublished: !currentState
        });
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
