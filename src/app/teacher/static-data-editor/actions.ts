'use server';

import fs from 'fs/promises';
import path from 'path';
import type { ActivityItem } from '@/lib/types';

const dataPath = path.join(process.cwd(), 'public', 'curriculum', 'activities');

/**
 * Reads the content of a specific topic's static JSON data file.
 * @param topicId The ID of the topic to read.
 * @returns An object with success status and data or an error message.
 */
export async function getStaticActivityData(topicId: string): Promise<{ success: boolean; data?: ActivityItem[]; error?: string }> {
    if (!topicId) {
        return { success: false, error: "Konu ID'si belirtilmedi." };
    }

    const filePath = path.join(dataPath, `${topicId}.json`);

    try {
        await fs.mkdir(dataPath, { recursive: true });
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const data: ActivityItem[] = JSON.parse(fileContent);
        return { success: true, data };
    } catch (error: any) {
        // If the file doesn't exist, it's not an error; it just means it's a new file.
        if (error.code === 'ENOENT') {
            return { success: true, data: [] };
        }
        console.error(`Error reading static file for topic ${topicId}:`, error);
        return { success: false, error: 'Dosya okunurken bir hata oluştu.' };
    }
}

/**
 * Saves the provided data to a specific topic's static JSON data file.
 * This will overwrite the existing file.
 * @param topicId The ID of the topic to save data for.
 * @param data The array of ActivityItem data to save.
 * @returns An object with success status or an error message.
 */
export async function saveStaticActivityData(topicId: string, data: ActivityItem[]): Promise<{ success: boolean; error?: string }> {
    if (!topicId) {
        return { success: false, error: "Konu ID'si belirtilmedi." };
    }

    const filePath = path.join(dataPath, `${topicId}.json`);

    try {
        await fs.mkdir(dataPath, { recursive: true });
        const fileContent = JSON.stringify(data, null, 2); // Pretty-print JSON
        await fs.writeFile(filePath, fileContent, 'utf-8');
        return { success: true };
    } catch (error: any) {
        console.error(`Error writing static file for topic ${topicId}:`, error);
        return { success: false, error: 'Dosya yazılırken bir hata oluştu.' };
    }
}
