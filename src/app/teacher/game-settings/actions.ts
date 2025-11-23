
'use server';

import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { DEFAULT_GAME_SETTINGS } from '@/lib/game-config';

const settingsRef = doc(db, 'settings', 'game_config');

// Helper for deep merging settings objects. It ensures that nested properties from
// the default settings are present if they are missing from the database settings.
const isObject = (item: any): item is Record<string, any> => {
    return (item && typeof item === 'object' && !Array.isArray(item));
}

const mergeDeep = (target: any, source: any): any => {
    const output = { ...target };

    if (isObject(target) && isObject(source)) {
        Object.keys(source).forEach(key => {
            if (isObject(source[key])) {
                if (!(key in target)) {
                    Object.assign(output, { [key]: source[key] });
                } else {
                    output[key] = mergeDeep(target[key], source[key]);
                }
            } else {
                Object.assign(output, { [key]: source[key] });
            }
        });
    }
    return output;
}


export async function getGameSettings() {
    try {
        const docSnap = await getDoc(settingsRef);
        if (docSnap.exists()) {
            const dbSettings = docSnap.data();
            // Deep merge Firestore settings onto defaults. This prevents `undefined` values
            // for fields that exist in defaults but not in the DB, fixing the root cause
            // of the "uncontrolled to controlled" input error.
            const mergedSettings = mergeDeep(DEFAULT_GAME_SETTINGS, dbSettings);
            return mergedSettings;
        } else {
            // Doc doesn't exist, so initialize it with defaults
            await setDoc(settingsRef, DEFAULT_GAME_SETTINGS);
            return DEFAULT_GAME_SETTINGS;
        }
    } catch (error) {
        console.error("Error getting game settings, returning default:", error);
        return DEFAULT_GAME_SETTINGS;
    }
}

export async function saveGameSettings(newSettings: any) {
    try {
        // It's safer to save the whole settings object to prevent stale fields
        // if the default config changes. We don't merge here, we overwrite.
        await setDoc(settingsRef, newSettings);
        return { success: true };
    } catch (error) {
        console.error("Error saving game settings:", error);
        return { success: false, error: 'Ayarlar kaydedilirken bir hata oluştu.' };
    }
}
