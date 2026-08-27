

'use server';

import type { Topic, Unit, Course, SchoolClass } from "@/lib/types";
import fs from 'fs/promises';
import path from 'path';

export type EnrichedTopic = Topic & { questionCount?: number, hasFlowContent?: boolean };
export type EnrichedUnit = Unit & { topics: EnrichedTopic[], questionCount?: number, htmlContent?: string, steps?: any[], hasFlowContent?: boolean };
export type EnrichedCourse = Course & { units: EnrichedUnit[], className?: string };
export type EnrichedClass = SchoolClass & { courses: EnrichedCourse[] };

function extractLeadingNumbers(title: string): number[] {
    if (!title) return [];
    const clean = title.trim();
    
    // "Ünite 1", "Ünite 2" kalıbı
    const uniteMatch = clean.match(/^Ünite\s+(\d+)/i);
    if (uniteMatch) {
        return [parseInt(uniteMatch[1], 10)];
    }

    // "1.", "1.1", "1.1.2", "1-", "5. Sınıf" vb. kalıplar
    const match = clean.match(/^(\d+(?:[\.\-]\d+)*)/);
    if (match) {
        return match[1].split(/[\.\-]/).filter(Boolean).map(n => parseInt(n, 10));
    }
    
    return [];
}

function compareTitlesByLeadingNumber(titleA: string = '', titleB: string = ''): number {
    const numsA = extractLeadingNumbers(titleA);
    const numsB = extractLeadingNumbers(titleB);

    if (numsA.length > 0 && numsB.length > 0) {
        for (let i = 0; i < Math.max(numsA.length, numsB.length); i++) {
            const a = numsA[i] ?? 0;
            const b = numsB[i] ?? 0;
            if (a !== b) return a - b;
        }
    } else if (numsA.length > 0) {
        return -1;
    } else if (numsB.length > 0) {
        return 1;
    }

    return titleA.localeCompare(titleB, 'tr', { numeric: true, sensitivity: 'base' });
}

// 30 saniyelik bellek içi önbellek (Next.js 2MB unstable_cache sınır hatasını önler)
let memoryCache: { data: EnrichedClass[]; timestamp: number } | null = null;
const CACHE_TTL_MS = 30 * 1000;

export async function getFlowData(): Promise<EnrichedClass[]> {
    const now = Date.now();
    if (memoryCache && (now - memoryCache.timestamp < CACHE_TTL_MS)) {
        return memoryCache.data;
    }

    try {
        const mPath = path.join(process.cwd(), 'public', 'curriculum', 'manifest.json');
        const manifestContent = await fs.readFile(mPath, 'utf-8');
        const manifest = JSON.parse(manifestContent);
        
        const cleanClassGroups: EnrichedClass[] = (manifest.classGroups || [])
            .map((cg: any) => ({
                id: cg.name || cg.id,
                name: cg.name,
                courses: (cg.courses || []).map((c: any) => ({
                    id: c.id,
                    title: c.title,
                    classId: c.classId || cg.name,
                    className: `${cg.name}. Sınıf`,
                    units: (c.units || [])
                        .map((u: any) => ({
                            id: u.id,
                            title: u.title,
                            hasFlowContent: !!(u.hasFlowContent || (u.topics && u.topics.some((t: any) => t.hasFlowContent))),
                            topics: (u.topics || [])
                                .map((t: any) => ({
                                    id: t.id,
                                    title: t.title,
                                    hasFlowContent: !!t.hasFlowContent
                                }))
                                .sort((tA: any, tB: any) => compareTitlesByLeadingNumber(tA.title, tB.title))
                        }))
                        .sort((uA: any, uB: any) => compareTitlesByLeadingNumber(uA.title, uB.title))
                }))
            }))
            .sort((cgA: any, cgB: any) => compareTitlesByLeadingNumber(cgA.name, cgB.name));

        memoryCache = { data: cleanClassGroups, timestamp: now };
        return cleanClassGroups;
    } catch (error) {
        console.error("Error loading flow data from manifest:", error);
        return [];
    }
}
