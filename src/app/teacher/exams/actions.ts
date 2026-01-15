

'use server';

import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc, serverTimestamp, Timestamp, addDoc, updateDoc, deleteDoc, orderBy } from "firebase/firestore";
import type { Assignment, UserProfile, ScoreEvent, Question, SchoolClass, Course, Unit, Topic } from "@/lib/types";
import { unstable_noStore as noStore } from 'next/cache';


export async function getTeacherExams(teacherId: string): Promise<{ success: boolean; data?: Assignment[]; error?: string }> {
    noStore();
    if (!teacherId) {
        return { success: false, error: 'Öğretmen ID\'si bulunamadı.' };
    }

    try {
        const q = query(
            collection(db, "assignments"),
            where("teacherId", "==", teacherId),
            where("assignmentType", "==", "deneme"),
            orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(q);
        const assignments = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return { 
                id: doc.id, 
                ...data,
                // Convert Timestamps to ISO strings for client-side safety
                createdAt: (data.createdAt as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
                startDate: data.startDate ? (data.startDate as Timestamp).toDate().toISOString() : undefined,
                dueDate: data.dueDate ? (data.dueDate as Timestamp).toDate().toISOString() : undefined,
            } as Assignment
        });
        return { success: true, data: JSON.parse(JSON.stringify(assignments)) };
    } catch (error: any) {
        console.error("Error fetching exams:", error);
         if (error.code === 'failed-precondition') {
             const urlRegex = /(https?:\/\/[^\s]+)/g;
             const url = error.message.match(urlRegex)?.[0] || '#';
             return { success: false, error: `Veritabanı indeksi eksik. Lütfen bu hatayı gidermek için <a href="${url}" target="_blank" rel="noopener noreferrer" class="underline font-bold">bu linke tıklayarak</a> gerekli indeksi oluşturun.` };
        }
        return { success: false, error: "Deneme sınavları listesi alınamadı." };
    }
}

export async function createExam(data: Omit<Assignment, 'id' | 'createdAt'>): Promise<{ success: boolean, error?: string }> {
    try {
        const dataToSave: any = {
            ...data,
            assignmentType: 'deneme',
            createdAt: serverTimestamp(),
        };

        // Convert dates to Firestore Timestamps before saving
        if (data.startDate) {
            dataToSave.startDate = Timestamp.fromDate(new Date(data.startDate));
        } else {
            delete dataToSave.startDate;
        }

        if (data.dueDate) {
            dataToSave.dueDate = Timestamp.fromDate(new Date(data.dueDate));
        } else {
            delete dataToSave.dueDate;
        }
        
        await addDoc(collection(db, 'assignments'), dataToSave);
        return { success: true };
    } catch (error: any) {
        console.error("Error creating exam:", error);
        return { success: false, error: 'Deneme sınavı oluşturulurken bir hata oluştu.' };
    }
}

export async function updateExam(assignmentId: string, data: Partial<Omit<Assignment, 'id' | 'createdAt'>>): Promise<{ success: boolean, error?: string }> {
    if (!assignmentId) return { success: false, error: 'Deneme ID\'si eksik.'};
    try {
        const dataToUpdate: any = { ...data };

        // Convert dates to Firestore Timestamps before saving
        if (data.startDate) {
            dataToUpdate.startDate = Timestamp.fromDate(new Date(data.startDate));
        }

        if (data.dueDate) {
            dataToUpdate.dueDate = Timestamp.fromDate(new Date(data.dueDate));
        }
        
        const examRef = doc(db, 'assignments', assignmentId);
        await updateDoc(examRef, dataToUpdate);
        return { success: true };
    } catch (error: any) {
        console.error("Error updating exam:", error);
        return { success: false, error: 'Deneme sınavı güncellenirken bir hata oluştu.' };
    }
}


export async function deleteExam(assignmentId: string): Promise<{ success: boolean; error?: string }> {
    try {
        await deleteDoc(doc(db, "assignments", assignmentId));
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting exam:", error);
        return { success: false, error: "Deneme sınavı silinirken bir hata oluştu." };
    }
}

export async function getExamCreationData(): Promise<{
  classes: SchoolClass[];
  courses: (Course & { units: (Unit & { topics: Topic[] })[] })[];
  students: UserProfile[];
  examQuestions: Question[];
  error?: string;
}> {
    noStore();
    try {
        const [classesSnap, allCoursesSnap, studentsSnap, examQuestionsSnap] = await Promise.all([
            getDocs(query(collection(db, 'classes'), orderBy("createdAt", "asc"))),
            getDocs(query(collection(db, 'courses'))),
            getDocs(query(collection(db, 'users'), where("role", "==", "student"))),
            getDocs(query(collection(db, 'examQuestions'), orderBy('text')))
        ]);
        
        const classes = classesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolClass));
        const coursesData = allCoursesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
        
        const courseIdToClassId = new Map(coursesData.map(c => [c.id, c.classId]));
        
        const courses = await Promise.all(coursesData.map(async (courseData) => {
            const unitsSnapshot = await getDocs(query(collection(db, `courses/${courseData.id}/units`), orderBy("title")));
            const unitsWithTopics = await Promise.all(unitsSnapshot.docs.map(async (unitDoc) => {
                const unit = { id: unitDoc.id, ...unitDoc.data() } as (Unit & { topics: Topic[] });
                const topicsSnapshot = await getDocs(query(collection(db, `courses/${courseData.id}/units/${unit.id}/topics`), orderBy('title')));
                unit.topics = topicsSnapshot.docs.map(topicDoc => ({ id: topicDoc.id, ...topicDoc.data() } as Topic));
                return unit;
            }));
            return { ...courseData, units: unitsWithTopics };
        }));

        const examQuestions = examQuestionsSnap.docs.map(doc => {
            const data = doc.data() as Question;
            const classIdForQuestion = courseIdToClassId.get(data.courseId);
            
            return {
                id: doc.id,
                ...data,
                classId: classIdForQuestion || '',
            } as Question
        });
        
        const students = studentsSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));

        return JSON.parse(JSON.stringify({ classes, courses, students, examQuestions }));

    } catch(e) {
        console.error("Error fetching exam creation data:", e);
        return { error: 'Veriler alınamadı.', classes: [], courses: [], students: [], examQuestions: [] };
    }
}
