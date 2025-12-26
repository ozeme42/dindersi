'use server';

import fs from 'fs/promises';
import path from 'path';

// Helper to ensure the directory exists
async function ensureDirExists(filePath: string) {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
}

export async function getStaticData(dataType: string, id: string): Promise<{ success: boolean; data?: any; error?: string }> {
    if (!dataType || !id) {
        return { success: false, error: "Veri tipi veya ID belirtilmedi." };
    }

    // Map dataType to a file path
    const relativePath = path.join('public', 'curriculum', dataType, `${id}.json`);
    const filePath = path.join(process.cwd(), relativePath);

    try {
        await ensureDirExists(filePath);
        const fileContent = await fs.readFile(filePath, 'utf-8');
        return { success: true, data: JSON.parse(fileContent) };
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            return { success: true, data: dataType.includes('soru') ? [] : {} }; // Return empty array for question lists, empty object otherwise
        }
        return { success: false, error: 'Dosya okunurken hata oluştu.' };
    }
}

export async function saveStaticData(dataType: string, id: string, data: any): Promise<{ success: boolean; error?: string }> {
    if (!dataType || !id) {
        return { success: false, error: "Veri tipi veya ID belirtilmedi." };
    }

    const relativePath = path.join('public', 'curriculum', dataType, `${id}.json`);
    const filePath = path.join(process.cwd(), relativePath);

    try {
        await ensureDirExists(filePath);
        const fileContent = JSON.stringify(data, null, 2); // Pretty-print
        await fs.writeFile(filePath, fileContent, 'utf-8');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: 'Dosya yazılırken hata oluştu.' };
    }
}

export async function getStaticHtmlContent(dataType: string, id: string): Promise<{ success: boolean; data?: string; error?: string }> {
     if (!dataType || !id) {
        return { success: false, error: "Veri tipi veya ID belirtilmedi." };
    }
    const relativePath = path.join('public', 'curriculum', dataType, `${id}.html`);
    const filePath = path.join(process.cwd(), relativePath);

     try {
        await ensureDirExists(filePath);
        const fileContent = await fs.readFile(filePath, 'utf-8');
        return { success: true, data: fileContent };
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            return { success: true, data: '' }; // Return empty string for new/empty files
        }
        return { success: false, error: 'HTML dosyası okunurken hata oluştu.' };
    }
}

export async function saveStaticHtmlContent(dataType: string, id: string, content: string): Promise<{ success: boolean; error?: string }> {
     if (!dataType || !id) {
        return { success: false, error: "Veri tipi veya ID belirtilmedi." };
    }
    const relativePath = path.join('public', 'curriculum', dataType, `${id}.html`);
    const filePath = path.join(process.cwd(), relativePath);

     try {
        await ensureDirExists(filePath);
        await fs.writeFile(filePath, content, 'utf-8');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: 'HTML dosyası yazılırken hata oluştu.' };
    }
}
