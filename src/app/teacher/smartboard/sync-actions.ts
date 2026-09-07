'use server';

import fs from 'fs/promises';
import path from 'path';
import { getAdminDb } from '@/lib/firebase-admin';
import type { UserProfile } from '@/lib/types';
import { revalidatePath } from 'next/cache';

const GUEST_STUDENTS_FILE_PATH = path.join(process.cwd(), 'public', 'curriculum', 'guest-students.json');
const CLASSES_FILE_PATH = path.join(process.cwd(), 'public', 'curriculum', 'classes.json');

/**
 * Reads guest students from the local JSON file
 */
export async function getLocalGuestStudents(): Promise<UserProfile[]> {
    try {
        const content = await fs.readFile(GUEST_STUDENTS_FILE_PATH, 'utf-8');
        return JSON.parse(content);
    } catch (e) {
        return [];
    }
}

/**
 * Appends or updates a guest student in the local JSON file
 */
export async function saveLocalGuestStudent(student: UserProfile): Promise<boolean> {
    try {
        let students: UserProfile[] = [];
        try {
            const content = await fs.readFile(GUEST_STUDENTS_FILE_PATH, 'utf-8');
            students = JSON.parse(content);
        } catch {
            students = [];
        }

        const existingIndex = students.findIndex(s => s.uid === student.uid);
        if (existingIndex >= 0) {
            students[existingIndex] = { ...students[existingIndex], ...student };
        } else {
            students.push(student);
        }

        await fs.writeFile(GUEST_STUDENTS_FILE_PATH, JSON.stringify(students, null, 2), 'utf-8');
        return true;
    } catch (err) {
        console.error('saveLocalGuestStudent error:', err);
        return false;
    }
}

/**
 * Removes a guest student from the local JSON file
 */
export async function removeLocalGuestStudent(uid: string): Promise<boolean> {
    try {
        let students: UserProfile[] = [];
        try {
            const content = await fs.readFile(GUEST_STUDENTS_FILE_PATH, 'utf-8');
            students = JSON.parse(content);
        } catch {
            return true;
        }

        students = students.filter(s => s.uid !== uid);
        await fs.writeFile(GUEST_STUDENTS_FILE_PATH, JSON.stringify(students, null, 2), 'utf-8');
        return true;
    } catch (err) {
        console.error('removeLocalGuestStudent error:', err);
        return false;
    }
}

/**
 * Syncs all guest students and classes from Firestore into public/curriculum/*.json
 */
export async function syncSmartboardDataToFilesAction(): Promise<{ success: boolean; studentCount?: number; classCount?: number; error?: string }> {
    try {
        const db = getAdminDb();
        if (!db) {
            return { success: false, error: 'Veritabanı bağlantısı kurulamadı.' };
        }

        // 1. Sanal Öğrenciler
        const guestSnap = await db.collection('users').where('role', '==', 'guest').get();
        const guestStudents: UserProfile[] = guestSnap.docs.map(doc => {
            const data = doc.data();
            return {
                uid: doc.id,
                displayName: data.displayName || 'Öğrenci',
                class: data.class || '',
                role: 'guest',
                avatar: data.avatar || null,
                score: data.score || 0,
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt || null
            } as UserProfile;
        });

        // Ensure directory exists
        const dir = path.dirname(GUEST_STUDENTS_FILE_PATH);
        await fs.mkdir(dir, { recursive: true });

        await fs.writeFile(GUEST_STUDENTS_FILE_PATH, JSON.stringify(guestStudents, null, 2), 'utf8');

        // 2. Sınıflar
        let classCount = 0;
        try {
            const classSnap = await db.collection('classes').orderBy('name', 'asc').get();
            const classes = classSnap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            if (classes.length > 0) {
                await fs.writeFile(CLASSES_FILE_PATH, JSON.stringify(classes, null, 2), 'utf8');
                classCount = classes.length;
            }
        } catch (cErr) {
            console.warn('Class sync warning:', cErr);
        }

        revalidatePath('/teacher/smartboard');
        revalidatePath('/teacher/smartboard/bireysel');
        revalidatePath('/teacher/smartboard/takim');
        revalidatePath('/teacher/smartboard/fetih-oyunu');
        revalidatePath('/teacher/smartboard/carkifelek');

        return { 
            success: true, 
            studentCount: guestStudents.length, 
            classCount 
        };
    } catch (e: any) {
        console.error('syncSmartboardDataToFilesAction error:', e);
        return { success: false, error: e.message || 'Senkronizasyon hatası.' };
    }
}
