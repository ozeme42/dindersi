
'use server';

import { getAdminDb } from "@/lib/firebase-admin";
import { unstable_noStore as noStore } from 'next/cache';
import { Timestamp } from "firebase-admin/firestore";

type ArchivedSeason = {
    id: string;
    seasonName: string;
    createdAt: string;
    leaderboard: {
        uid: string;
        displayName: string;
        class: string;
        score: number;
        avatar?: string;
    }[];
}

const serialize = (data: any): any => {
  if (!data) return data;
  if (Array.isArray(data)) return data.map(serialize);
  if (data instanceof Timestamp) return data.toDate().toISOString();
  if (typeof data === 'object' && Object.prototype.toString.call(data) === '[object Object]') {
    const newObj: { [key: string]: any } = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        newObj[key] = serialize(data[key]);
      }
    }
    return newObj;
  }
  return data;
};

export async function getArchivedSeasons(): Promise<ArchivedSeason[]> {
    noStore();
    const db = getAdminDb();
    try {
        const seasonsSnap = await db.collection('archivedSeasons').orderBy('createdAt', 'desc').get();
        if (seasonsSnap.empty) {
            return [];
        }
        
        const seasons = seasonsSnap.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                seasonName: data.seasonName,
                createdAt: serialize(data.createdAt),
                leaderboard: data.leaderboard || [],
            };
        });

        return seasons;

    } catch (error) {
        console.error("Error fetching archived seasons:", error);
        return [];
    }
}
