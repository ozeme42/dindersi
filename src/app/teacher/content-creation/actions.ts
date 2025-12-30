

'use server';

import { db } from "@/lib/firebase";
import { doc, addDoc, updateDoc, deleteDoc, collection, serverTimestamp, writeBatch, Timestamp } from "firebase/firestore";

// Simplified save function
export async function saveCurriculumItem(
    type: 'Sınıf' | 'Ders' | 'Ünite' | 'Konu',
    mode: 'add' | 'edit',
    data: {
        name: string,
        id?: string, // for edit mode
        parentId?: string, // classId for Course, courseId for Unit, unitId for Topic
        courseId?: string, // only for Konu type to build path
        branches?: string[], // only for class
        externalLink?: string,
        sourceText?: string,
    }
) {
    const { name, id, parentId, courseId, branches, externalLink, sourceText } = data;
    if (!name.trim()) {
        return { success: false, error: "İsim boş olamaz." };
    }

    try {
        if (mode === 'add') {
            let collectionPath: string;
            let dataToAdd: any = { createdAt: serverTimestamp(), isPublished: true }; // Default to published on creation

            if (type === 'Sınıf') {
                collectionPath = 'classes';
                dataToAdd.name = name;
                dataToAdd.branches = [];
            } else if (type === 'Ders' && parentId) {
                collectionPath = 'courses';
                dataToAdd.title = name;
                dataToAdd.classId = parentId;
            } else if (type === 'Ünite' && parentId) {
                collectionPath = `courses/${parentId}/units`;
                dataToAdd.title = name;
            } else if (type === 'Konu' && parentId && courseId) {
                collectionPath = `courses/${courseId}/units/${parentId}/topics`;
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
            let dataToUpdate: any = {};

            if (type === 'Sınıf') {
                docPath = `classes/${id}`;
                dataToUpdate.name = name;
                if (branches !== undefined) dataToUpdate.branches = branches;
            } else if (type === 'Ders') {
                docPath = `courses/${id}`;
                dataToUpdate.title = name;
            } else if (type === 'Ünite' && parentId) {
                docPath = `courses/${parentId}/units/${id}`;
                dataToUpdate.title = name;
            } else if (type === 'Konu' && parentId && courseId) {
                docPath = `courses/${courseId}/units/${parentId}/topics/${id}`;
                dataToUpdate.title = name;
                // Use null to remove the field if the link is cleared
                dataToUpdate.externalLink = externalLink || null;
                dataToUpdate.sourceText = sourceText || '';
            } else {
                throw new Error("Geçersiz veya eksik parametreler.");
            }
            
            await updateDoc(doc(db, docPath), dataToUpdate);
        }
        return { success: true };
    } catch (error: any) {
        console.error("Error saving curriculum item:", error);
        return { success: false, error: "İşlem sırasında bir hata oluştu." };
    }
}

export async function togglePublishState(path: string, currentPublishedState: boolean): Promise<{ success: boolean; error?: string }> {
    if (!path) {
        return { success: false, error: "Geçersiz yol." };
    }
    try {
        const docRef = doc(db, path);
        await updateDoc(docRef, { isPublished: !currentPublishedState });
        return { success: true };
    } catch (error: any) {
        console.error("Error toggling publish state:", error);
        return { success: false, error: "Yayın durumu güncellenirken bir hata oluştu." };
    }
}


// Delete function
export async function deleteCurriculumItem(path: string) {
    // Note: This does not delete subcollections, which is a limitation of Firestore SDKs.
    // For a production app, a Firebase Function would be needed for recursive deletes.
    // For this app's purpose, this is sufficient.
    try {
        await deleteDoc(doc(db, path));
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting item:", error);
        return { success: false, error: "Öğe silinirken bir hata oluştu." };
    }
}

// Bulk add
export async function bulkAddCurriculumItems(
    type: 'Sınıf' | 'Ders' | 'Ünite' | 'Konu',
    names: string[],
    parentId?: string,
) {
     if (names.length === 0) {
        return { success: false, error: "Eklenecek öğe bulunmuyor." };
    }
    
    try {
        const batch = writeBatch(db);
        let collectionPath: string;
        let parentData: any = {};

        if (type === 'Sınıf') {
            collectionPath = 'classes';
        } else if (type === 'Ders' && parentId) {
            collectionPath = 'courses';
            parentData.classId = parentId;
        } else if (type === 'Ünite' && parentId) {
            collectionPath = `courses/${parentId}/units`;
        } else if (type === 'Konu' && parentId) {
            const [courseId, unitId] = parentId.split('/');
            collectionPath = `courses/${courseId}/units/${unitId}/topics`;
        } else {
            throw new Error("Geçersiz veya eksik parametreler.");
        }

        names.forEach(name => {
            const docRef = doc(collection(db, collectionPath));
            let data: any = { createdAt: serverTimestamp(), isPublished: true }; // Default to published
            
            if (type === 'Sınıf') {
                data.name = name;
                data.branches = [];
            } else {
                data.title = name;
            }
             if (type === 'Konu') {
                data.steps = [];
                data.sourceText = '';
            }
            batch.set(docRef, { ...data, ...parentData });
        });

        await batch.commit();
        return { success: true, count: names.length };
    } catch (error: any)
    {
        console.error("Error bulk saving items:", error);
        return { success: false, error: "Toplu ekleme sırasında bir hata oluştu." };
    }
}
