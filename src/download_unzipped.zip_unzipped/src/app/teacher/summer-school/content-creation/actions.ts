
'use server';

import { db } from "@/lib/firebase";
import { doc, addDoc, updateDoc, deleteDoc, collection, serverTimestamp, writeBatch } from "firebase/firestore";

// Simplified save function for Summer School
export async function saveSummerCurriculumItem(
    type: 'Ders' | 'Konu',
    mode: 'add' | 'edit',
    data: {
        name: string,
        id?: string,
        parentId?: string,
        externalLink?: string,
        sourceText?: string,
    }
) {
    const { name, id, parentId, externalLink, sourceText } = data;
    if (!name.trim()) {
        return { success: false, error: "İsim boş olamaz." };
    }

    try {
        if (mode === 'add') {
            let collectionPath: string;
            let dataToAdd: any = { createdAt: serverTimestamp() };

            if (type === 'Ders') {
                collectionPath = 'courses';
                dataToAdd.title = name;
                dataToAdd.isSummerSchool = true; // Mark as a summer school course
            } else if (type === 'Konu' && parentId) {
                collectionPath = `courses/${parentId}/topics`;
                dataToAdd.title = name;
                dataToAdd.steps = [];
                dataToAdd.sourceText = sourceText || '';
                if (externalLink) {
                    dataToAdd.externalLink = externalLink;
                }
            } else {
                throw new Error("Geçersiz veya eksik parametreler.");
            }
            
            await addDoc(collection(db, collectionPath), dataToAdd);
        } else { // edit mode
            if (!id) throw new Error("Düzenlenecek öğe ID'si eksik.");
            let docPath: string;
            let dataToUpdate: any = { title: name };

            if (type === 'Ders') {
                docPath = `courses/${id}`;
            } else if (type === 'Konu' && parentId) {
                docPath = `courses/${parentId}/topics/${id}`;
                dataToUpdate.sourceText = sourceText || '';
                 // Use null to remove the field if the link is cleared
                dataToUpdate.externalLink = externalLink || null;
            } else {
                throw new Error("Geçersiz veya eksik parametreler.");
            }
            
            await updateDoc(doc(db, docPath), dataToUpdate);
        }
        return { success: true };
    } catch (error: any) {
        console.error("Error saving summer curriculum item:", error);
        return { success: false, error: "İşlem sırasında bir hata oluştu." };
    }
}


// Delete function (can be reused, but keeping it separate for clarity)
export async function deleteSummerCurriculumItem(path: string) {
    try {
        await deleteDoc(doc(db, path));
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting summer item:", error);
        return { success: false, error: "Öğe silinirken bir hata oluştu." };
    }
}

// Bulk add for Summer School
export async function bulkAddSummerCurriculumItems(
    type: 'Ders' | 'Konu',
    names: string[],
    parentId?: string
) {
     if (names.length === 0) {
        return { success: false, error: "Eklenecek öğe bulunmuyor." };
    }
    
    try {
        const batch = writeBatch(db);
        let collectionPath: string;
        
        if (type === 'Ders') {
            collectionPath = 'courses';
        } else if (type === 'Konu' && parentId) {
            collectionPath = `courses/${parentId}/topics`;
        } else {
            throw new Error("Geçersiz veya eksik parametreler.");
        }

        names.forEach(name => {
            const docRef = doc(collection(db, collectionPath));
            let data: any = { title: name, createdAt: serverTimestamp() };
            if (type === 'Ders') data.isSummerSchool = true;
            if (type === 'Konu') data.steps = [];
            batch.set(docRef, data);
        });

        await batch.commit();
        return { success: true, count: names.length };
    } catch (error: any)
    {
        console.error("Error bulk saving summer items:", error);
        return { success: false, error: "Toplu ekleme sırasında bir hata oluştu." };
    }
}
