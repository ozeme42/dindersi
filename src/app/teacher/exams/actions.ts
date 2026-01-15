

'use server';

import { db } from "@/lib/firebase";
import { 
    collection, query, where, getDocs, doc, 
    serverTimestamp, Timestamp, addDoc, updateDoc, 
    deleteDoc, orderBy 
} from "firebase/firestore";
import type { Assignment, UserProfile, Question, SchoolClass, Course, Unit, Topic } from "@/lib/types";
import { unstable_noStore as noStore } from 'next/cache';

/**
 * Denemeleri Getirir (Öğretmen veya Admin için)
 * @param teacherId - Sorgulanan öğretmen ID'si
 * @param isAdmin - Eğer true ise tüm denemeleri getirir
 */
export async function getTeacherExams(teacherId: string, isAdmin: boolean = false): Promise<{ success: boolean; data?: Assignment[]; error?: string }> {
    noStore();
    
    try {
        let q;
        const assignmentCollection = collection(db, "assignments");
        
        if (isAdmin) {
            // Süper Admin için: Tüm denemeleri getir
            q = query(
                assignmentCollection,
                where("assignmentType", "==", "deneme")
                // orderBy'ı şimdilik kaldırıyoruz, istemci tarafında sıralayacağız
            );
        } else {
            // Normal Öğretmen için: Sadece kendi denemelerini getir
            if (!teacherId) return { success: false, error: 'Öğretmen ID\'si bulunamadı.' };
            
            q = query(
                assignmentCollection,
                where("teacherId", "==", teacherId),
                where("assignmentType", "==", "deneme")
                // orderBy'ı şimdilik kaldırıyoruz
            );
        }

        const querySnapshot = await getDocs(q);
        
        const assignments = querySnapshot.docs.map(doc => {
            const data = doc.data();
            
            // Tarih dönüşümleri için güvenli yardımcı fonksiyon
            const convertDate = (val: any) => {
                if (val instanceof Timestamp) return val.toDate().toISOString();
                if (val && typeof val === 'string') return val;
                return null;
            };

            return { 
                id: doc.id, 
                ...data,
                createdAt: convertDate(data.createdAt) || new Date().toISOString(),
                startDate: convertDate(data.startDate),
                dueDate: convertDate(data.dueDate),
            } as Assignment;
        });

        // İstemci tarafında sıralama (En yeni en üstte)
        assignments.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
        });

        return { success: true, data: JSON.parse(JSON.stringify(assignments)) };
    } catch (error: any) {
        console.error("Error fetching exams:", error);
        
        // Firestore Index Hatası Kontrolü
        if (error.code === 'failed-precondition') {
            const url = error.message.match(/(https?:\/\/[^\s]+)/)?.[0] || '#';
            return { success: false, error: `Veritabanı indeksi eksik. Lütfen bu hatayı gidermek için geliştirici konsolundaki linki kullanın veya aşağıdaki linke tıklayın. Hata: ${error.message}` };
        }
        
        return { success: false, error: "Denemeler listelenirken teknik bir sorun oluştu." };
    }
}

/**
 * Yeni Deneme Oluştur
 */
export async function createExam(data: Omit<Assignment, 'id' | 'createdAt'>): Promise<{ success: boolean, error?: string }> {
    try {
        const dataToSave: any = {
            ...data,
            assignmentType: 'deneme',
            createdAt: serverTimestamp(),
        };

        if (data.startDate) dataToSave.startDate = Timestamp.fromDate(new Date(data.startDate));
        if (data.dueDate) dataToSave.dueDate = Timestamp.fromDate(new Date(data.dueDate));
        
        await addDoc(collection(db, 'assignments'), dataToSave);
        return { success: true };
    } catch (error: any) {
        console.error("Error creating exam:", error);
        return { success: false, error: 'Deneme sınavı oluşturulurken hata oluştu.' };
    }
}

/**
 * Deneme Güncelle
 */
export async function updateExam(assignmentId: string, data: Partial<Omit<Assignment, 'id' | 'createdAt'>>): Promise<{ success: boolean, error?: string }> {
    if (!assignmentId) return { success: false, error: 'ID eksik.'};
    try {
        const dataToUpdate: any = { ...data };
        if (data.startDate) dataToUpdate.startDate = Timestamp.fromDate(new Date(data.startDate));
        if (data.dueDate) dataToUpdate.dueDate = Timestamp.fromDate(new Date(data.dueDate));
        
        const examRef = doc(db, 'assignments', assignmentId);
        await updateDoc(examRef, dataToUpdate);
        return { success: true };
    } catch (error: any) {
        console.error("Error updating exam:", error);
        return { success: false, error: 'Güncelleme yapılamadı.' };
    }
}

/**
 * Deneme Sil
 */
export async function deleteExam(assignmentId: string): Promise<{ success: boolean; error?: string }> {
    try {
        await deleteDoc(doc(db, "assignments", assignmentId));
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting exam:", error);
        return { success: false, error: "Silme işlemi başarısız." };
    }
}

/**
 * Sınav Oluşturma Ekranı İçin Gerekli Veriler
 */
export async function getExamCreationData(): Promise<any> {
    noStore();
    try {
        const [classesSnap, coursesSnap, studentsSnap, examQuestionsSnap] = await Promise.all([
            getDocs(query(collection(db, 'classes'), orderBy("createdAt", "asc"))),
            getDocs(query(collection(db, 'courses'))),
            getDocs(query(collection(db, 'users'), where("role", "==", "student"))),
            getDocs(query(collection(db, 'questions'))) // `examQuestions` yerine `questions` kullanıyoruz
        ]);
        
        const classes = classesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const students = studentsSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
        
        // Bu bölümü JSON güvenliği için parse/stringify yapıyoruz
        return JSON.parse(JSON.stringify({ 
            classes, 
            students,
            examQuestions: examQuestionsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
        }));
    } catch(e) {
        console.error("Data Fetch Error:", e);
        return { error: 'Veriler yüklenemedi.' };
    }
}
