'use server';

import { getAdminDb } from "@/lib/firebase-admin";
import { db } from "@/lib/firebase"; 
import { collection, query, where, getDocs, orderBy, limit, addDoc, deleteDoc, updateDoc, doc, Timestamp as ClientTimestamp, serverTimestamp } from 'firebase/firestore'; 
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { unstable_noStore as noStore } from 'next/cache';
import type { UserProfile, ScoreEvent, Announcement } from "@/lib/types";
import { eachMonthOfInterval, endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import { tr } from "date-fns/locale";

// --- TİP TANIMLARI ---
type LeaderboardEntry = UserProfile & { score: number };
export type HallOfFamePeriod = { periodName: string; winners: LeaderboardEntry[]; };
export type ClassLeaderboardEntry = { name: string; totalScore: number; studentCount: number; };

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

// ==========================================
// 1. LEADERBOARD VERİLERİ (OKUMA)
// ==========================================

export async function getLiveLeaderboard(): Promise<LeaderboardEntry[]> {
    noStore();
    try {
        const usersQuery = query(collection(db, 'users'), where('role', '==', 'student'), orderBy('score', 'desc'), limit(100));
        const usersSnapshot = await getDocs(usersQuery);
        return serialize(usersSnapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id, score: doc.data().score || 0 })));
    } catch (e) { return []; }
}

export async function getHallOfFameData(): Promise<{ seasons: HallOfFamePeriod[], monthly: HallOfFamePeriod[] }> {
    noStore();
    const adminDb = getAdminDb();
    
    // Arşivlenmiş Sezonlar
    const seasonsSnap = await adminDb.collection('archivedSeasons').orderBy('createdAt', 'desc').get();
    const seasons = seasonsSnap.docs.map(doc => ({ 
        periodName: doc.data().seasonName, 
        winners: doc.data().leaderboard.slice(0, 10) 
    } as HallOfFamePeriod));

    // Aylık Hesaplama
    const monthlyWinners: HallOfFamePeriod[] = [];
    const now = new Date();
    const startDate = subMonths(now, 6);
    const months = eachMonthOfInterval({ start: startDate, end: now });

    const usersSnapshot = await getDocs(query(collection(db, 'users'), where("role", "==", "student")));
    const studentsMap = new Map();
    usersSnapshot.forEach(doc => studentsMap.set(doc.id, { uid: doc.id, ...doc.data() }));

    for (const month of months) {
        const monthStart = startOfMonth(month);
        const monthEnd = endOfMonth(month);
        const monthlyEventsQuery = query(collection(db, 'scoreEvents'), where("timestamp", ">=", ClientTimestamp.fromDate(monthStart)), where("timestamp", "<=", ClientTimestamp.fromDate(monthEnd)));
        
        try {
            const eventsSnapshot = await getDocs(monthlyEventsQuery);
            const scoresByStudent = new Map<string, number>();
            eventsSnapshot.forEach(eventDoc => {
                const event = eventDoc.data();
                if (event.gameType === 'holiday_reward' || event.gameType?.startsWith('smartboard_')) return;
                const currentScore = scoresByStudent.get(event.userId) || 0;
                scoresByStudent.set(event.userId, currentScore + event.points);
            });

            if (scoresByStudent.size > 0) {
                const leaderboard = Array.from(scoresByStudent.entries())
                    .map(([uid, score]) => ({ student: studentsMap.get(uid), score }))
                    .filter((entry): entry is { student: UserProfile; score: number } => !!entry.student && entry.score > 0)
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 3)
                    .map(entry => ({...entry.student, score: entry.score }));

                if (leaderboard.length > 0) {
                    monthlyWinners.push({ periodName: format(monthStart, 'MMMM yyyy', { locale: tr }), winners: leaderboard });
                }
            }
        } catch (e) { }
    }
    
    return { seasons: serialize(seasons), monthly: serialize(monthlyWinners.reverse()) };
}

export async function getSchoolLeaderboard(): Promise<ClassLeaderboardEntry[]> {
    noStore();
    try {
        const studentsQuery = query(collection(db, 'users'), where("role", "==", "student"));
        const studentsSnapshot = await getDocs(studentsQuery);
        const scoresBySchool: Record<string, { totalScore: number, studentCount: number }> = {};
        studentsSnapshot.forEach(doc => {
            const student = doc.data() as UserProfile;
            const schoolName = student.schoolName;
            if (schoolName) {
                if (!scoresBySchool[schoolName]) scoresBySchool[schoolName] = { totalScore: 0, studentCount: 0 };
                scoresBySchool[schoolName].totalScore += (student.score || 0);
                scoresBySchool[schoolName].studentCount += 1;
            }
        });
        const list = Object.entries(scoresBySchool).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.totalScore - a.totalScore);
        return JSON.parse(JSON.stringify(list));
    } catch (e) { return []; }
}

export async function getGradeLeaderboard(): Promise<ClassLeaderboardEntry[]> {
    noStore();
    try {
        const studentsQuery = query(collection(db, 'users'), where("role", "==", "student"));
        const studentsSnapshot = await getDocs(studentsQuery);
        const scoresByClass: Record<string, { totalScore: number, studentCount: number }> = {};
        studentsSnapshot.forEach(doc => {
            const student = doc.data() as UserProfile;
            const className = student.class?.split(' - ')[0]; 
            if (className) {
                if (!scoresByClass[className]) scoresByClass[className] = { totalScore: 0, studentCount: 0 };
                scoresByClass[className].totalScore += (student.score || 0);
                scoresByClass[className].studentCount += 1;
            }
        });
        const list = Object.entries(scoresByClass).map(([name, data]) => ({ name: `${name}. Sınıflar`, ...data })).sort((a, b) => b.totalScore - a.totalScore);
        return JSON.parse(JSON.stringify(list));
    } catch (e) { return []; }
}

export async function getBranchLeaderboard(): Promise<ClassLeaderboardEntry[]> {
    noStore();
    try {
        const studentsQuery = query(collection(db, 'users'), where("role", "==", "student"));
        const studentsSnapshot = await getDocs(studentsQuery);
        const scoresByBranch: Record<string, { totalScore: number, studentCount: number }> = {};
        studentsSnapshot.forEach(doc => {
            const student = doc.data() as UserProfile;
            const branchName = student.class;
            if (branchName) {
                if (!scoresByBranch[branchName]) scoresByBranch[branchName] = { totalScore: 0, studentCount: 0 };
                scoresByBranch[branchName].totalScore += (student.score || 0);
                scoresByBranch[branchName].studentCount += 1;
            }
        });
        const list = Object.entries(scoresByBranch).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.totalScore - a.totalScore);
        return JSON.parse(JSON.stringify(list));
    } catch (e) { return []; }
}

// ==========================================
// 2. SEZON YÖNETİMİ
// ==========================================

export async function getLeaderboardSettings() {
    const adminDb = getAdminDb();
    try {
        const docSnap = await adminDb.collection('settings').doc('leaderboard').get();
        const data = docSnap.exists ? docSnap.data() : {};
        return {
            seasonName: data?.seasonName || 'Liderlik Tablosu',
            holidayMode: data?.holidayMode || false,
            holidayMessage: data?.holidayMessage || '',
            rewards: data?.rewards || { first: 500, second: 250, third: 100 },
            seasonStartDate: data?.seasonStartDate || null,
            seasonEndDate: data?.seasonEndDate || null
        };
    } catch (error) { return null; }
}

export async function saveLeaderboardSettings(settings: any) {
    const adminDb = getAdminDb();
    try {
        const dataToSave = {
            seasonName: settings.seasonName,
            holidayMode: settings.holidayMode,
            holidayMessage: settings.holidayMessage,
            rewards: settings.rewards,
            seasonStartDate: settings.seasonStartDate || null,
            seasonEndDate: settings.seasonEndDate || null,
            updatedAt: new Date().toISOString()
        };
        await adminDb.collection('settings').doc('leaderboard').set(dataToSave, { merge: true });
        return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
}

export async function finishHolidayAndStartSeason(seasonName: string, rewards: any) {
    const adminDb = getAdminDb();
    try {
        // Mevcut puanları arşivle
        const usersSnap = await adminDb.collection('users').where('role', '==', 'student').orderBy('score', 'desc').limit(100).get();
        const leaderboard = usersSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
        const top3 = leaderboard.slice(0, 3);
        
        await adminDb.collection('archivedSeasons').add({ seasonName: seasonName + " (Tatil Dönemi)", leaderboard, createdAt: new Date(), type: 'holiday_cup' });
        
        // Puanları sıfırla ve ödülleri dağıt
        const batch = adminDb.batch();
        const allStudents = await adminDb.collection('users').where('role', '==', 'student').get();
        let ops = 0;
        
        for (const doc of allStudents.docs) {
            let score = 0;
            let msg = "Yeni Sezon";
            if (top3[0] && doc.id === top3[0].uid) { score = rewards.first; msg = "Tatil 1.si Ödülü"; }
            else if (top3[1] && doc.id === top3[1].uid) { score = rewards.second; msg = "Tatil 2.si Ödülü"; }
            else if (top3[2] && doc.id === top3[2].uid) { score = rewards.third; msg = "Tatil 3.sü Ödülü"; }
            
            batch.update(doc.ref, { score });
            ops++;
            if (score > 0) {
                const ref = adminDb.collection('scoreEvents').doc();
                batch.set(ref, { userId: doc.id, points: score, gameType: 'holiday_reward', context: msg, timestamp: FieldValue.serverTimestamp() });
                ops++;
            }
            if (ops >= 450) { await batch.commit(); ops = 0; }
        }
        if (ops > 0) await batch.commit();
        
        // Tatil modunu kapat
        await adminDb.collection('settings').doc('leaderboard').update({ holidayMode: false });
        return { success: true, message: "Yeni sezon başlatıldı." };
    } catch (e: any) { return { success: false, error: e.message }; }
}

// ==========================================
// 3. DUYURU YÖNETİMİ
// ==========================================

export async function getAnnouncements(category: string) {
    try {
        const q = query(collection(db, 'announcements'), where('category', '==', category), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        const data = snap.docs.map(d => ({ id: d.id, ...d.data(), createdAt: (d.data().createdAt as ClientTimestamp).toDate().toISOString() }));
        return { success: true, data: serialize(data) };
    } catch (e) { return { success: false }; }
}

export async function createAnnouncement(data: any) {
    try { await addDoc(collection(db, 'announcements'), { ...data, createdAt: serverTimestamp() }); return { success: true }; } catch (e) { return { success: false }; }
}

export async function updateAnnouncement(id: string, data: { title: string; content: string; category: string }): Promise<{ success: boolean; error?: string }> {
    try {
        const docRef = doc(db, 'announcements', id);
        await updateDoc(docRef, {
            ...data,
            updatedAt: serverTimestamp()
        });
        return { success: true };
    } catch (e: any) {
        return { success: false, error: "Duyuru güncellenemedi: " + e.message };
    }
}

export async function deleteAnnouncement(id: string) {
    try { await deleteDoc(doc(db, 'announcements', id)); return { success: true }; } catch (e) { return { success: false }; }
}