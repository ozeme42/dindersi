'use server';

import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, addDoc, updateDoc, deleteDoc, serverTimestamp, orderBy } from "firebase/firestore";
import type { VideoAsset } from "@/lib/types";

export async function getVideos(teacherId: string): Promise<{ success: boolean; data?: VideoAsset[]; error?: string }> {
    try {
        const q = query(
            collection(db, 'videoLibrary'),
            where('teacherId', '==', teacherId),
            orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        const videos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VideoAsset));
        return { success: true, data: videos };
    } catch (e: any) {
        return { success: false, error: 'Videolar alınamadı.' };
    }
}

export async function addOrUpdateVideo(video: Partial<VideoAsset>): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
        if (video.id) {
            const { id, ...dataToUpdate } = video;
            await updateDoc(doc(db, 'videoLibrary', id), dataToUpdate);
            return { success: true, id };
        } else {
            const docRef = await addDoc(collection(db, 'videoLibrary'), {
                ...video,
                createdAt: serverTimestamp()
            });
            return { success: true, id: docRef.id };
        }
    } catch (e: any) {
        return { success: false, error: 'Video kaydedilemedi.' };
    }
}

export async function deleteVideo(videoId: string): Promise<{ success: boolean; error?: string }> {
    try {
        await deleteDoc(doc(db, 'videoLibrary', videoId));
        return { success: true };
    } catch (e: any) {
        return { success: false, error: 'Video silinemedi.' };
    }
}