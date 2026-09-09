'use server';

import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, doc, Timestamp, runTransaction, limit, startAfter } from "firebase/firestore";
import type { ScoreEvent } from "@/lib/types";
import { unstable_noStore as noStore } from 'next/cache';
import fs from 'fs';
import path from 'path';

export type EnrichedScoreEvent = ScoreEvent & {
    userName?: string;
    attemptNumber?: number;
    completed?: boolean;
    displayTitle: string;
    displaySub?: string;
    normalizedGameType: string;
};

type SerializableTimestamp = {
    _seconds: number;
    _nanoseconds: number;
} | null;

interface TopicMeta {
    topicId: string;
    topicTitle: string;
    unitTitle: string;
    courseTitle: string;
    className: string;
}

let cachedTopicMap: Map<string, TopicMeta> | null = null;
let cachedTopicTitleMap: Map<string, TopicMeta> | null = null;

function normalizeTr(s: string): string {
    return (s || '')
        .replace(/İ/g, 'i')
        .replace(/I/g, 'ı')
        .replace(/[’'´`]/g, '')
        .toLowerCase()
        .trim();
}

function getCurriculumIndexes() {
    if (cachedTopicMap && cachedTopicTitleMap) {
        return { topicMap: cachedTopicMap, topicTitleMap: cachedTopicTitleMap };
    }

    const topicMap = new Map<string, TopicMeta>();
    const topicTitleMap = new Map<string, TopicMeta>();

    try {
        const manifestPath = path.join(process.cwd(), 'public', 'curriculum', 'manifest.json');
        if (fs.existsSync(manifestPath)) {
            const raw = fs.readFileSync(manifestPath, 'utf-8');
            const manifest = JSON.parse(raw);

            for (const cg of manifest.classGroups || []) {
                for (const c of cg.courses || []) {
                    for (const u of c.units || []) {
                        for (const t of u.topics || []) {
                            const info: TopicMeta = {
                                topicId: t.id,
                                topicTitle: t.title,
                                unitTitle: u.title,
                                courseTitle: c.title,
                                className: cg.name
                            };
                            topicMap.set(t.id, info);
                            const cleanTitle = t.title.replace(/^[\d.]+\s*/, '').trim();
                            topicTitleMap.set(normalizeTr(cleanTitle), info);
                            topicTitleMap.set(normalizeTr(t.title), info);
                        }
                    }
                }
            }
        }
    } catch (err) {
        console.error('Failed to load curriculum manifest in actions.ts:', err);
    }

    cachedTopicMap = topicMap;
    cachedTopicTitleMap = topicTitleMap;
    return { topicMap, topicTitleMap };
}

const GAME_TYPE_CANONICAL: Record<string, string> = {
    'Soru Bankası': 'soru-bankasi',
    'test': 'soru-bankasi',
    'soru-bankasi': 'soru-bankasi',

    'milyoner-yarismasi': 'milyoner-yarismasi',
    'Kim 1000 Puan İster?': 'milyoner-yarismasi',

    'kelime-avi': 'kelime-avi',
    'Kelime Avı': 'kelime-avi',
    'Kelime Oyunu': 'kelime-avi',

    'ilim-hazinesi': 'ilim-hazinesi',
    'İlim Hazinesi': 'ilim-hazinesi',

    'hedefi-vur': 'hedefi-vur',
    'Hedefi Vur': 'hedefi-vur',

    'adam-asmaca': 'adam-asmaca',
    'Adam Asmaca': 'adam-asmaca',

    'kavram-avi': 'kavram-avi',
    'Kavram Avı': 'kavram-avi',

    'cumle-olusturma': 'cumle-ustasi',
    'Cümle Oluşturma': 'cumle-ustasi',
    'Cümle Ustası': 'cumle-ustasi',
    'cumle-ustasi': 'cumle-ustasi',

    'eslestirme': 'eslestirme',
    'Eşleştirme': 'eslestirme',

    'dogru-yanlis-zinciri': 'dogru-yanlis-zinciri',
    'Doğru/Yanlış Zinciri': 'dogru-yanlis-zinciri',

    'bil-bakalim': 'bil-bakalim',
    'Bil Bakalım': 'bil-bakalim',

    'game_siber_sifre_kirici': 'siber-sifre-kirici',
    'siber-sifre-kirici': 'siber-sifre-kirici',
    'Siber Şifre Kırıcı': 'siber-sifre-kirici',

    'Gol Kralı': 'gol-krali',
    'gol-krali': 'gol-krali',

    'Yazı Tura': 'yazi-tura',
    'yazi-tura': 'yazi-tura',

    'Kavram Yarışması': 'kavram-yarismasi',
    'kavram-yarismasi': 'kavram-yarismasi',

    'topic-completion-reward': 'tamamlama',
    'Ders Tamamlama': 'tamamlama',

    'Açık Uçlu Cevaplama': 'acik-uclu',
    'acik-uclu': 'acik-uclu',

    'Kutu Aç': 'kutu-ac',
    'kutu-ac': 'kutu-ac',

    'Balon Avcısı': 'balon-avcisi',
    'balon-avcisi': 'balon-avcisi',

    'Labirent': 'labirent',
    'labirent': 'labirent',

    'Özet Okuma (Tinder Modu)': 'ozet-kartlari',
    'ozet-kartlari': 'ozet-kartlari',

    'Uzay Savunması': 'uzay-savunmasi',
    'uzay-savunmasi': 'uzay-savunmasi',

    'Hafıza Kartları': 'hafiza-kartlari',
    'hafiza-kartlari': 'hafiza-kartlari',

    'Tornado': 'tornado',
    'tornado': 'tornado',

    'Doğru Yol Koşucusu': 'dogru-yol-kosucusu',
    'dogru-yol-kosucusu': 'dogru-yol-kosucusu',

    'Çarkıfelek': 'carkifelek',
    'carkifelek': 'carkifelek',

    'manual_reward': 'manual_reward',
    'manual_penalty': 'manual_penalty',
    'daily_bonus': 'daily_bonus',
    'holiday_reward': 'holiday_reward',
};

function resolveEventDetails(
    data: any,
    topicMap: Map<string, TopicMeta>,
    topicTitleMap: Map<string, TopicMeta>
): { displayTitle: string; displaySub?: string; normalizedGameType: string } {
    let rawGameType = data.gameType || data.type || data.action || '';
    if (!rawGameType && typeof data.description === 'string' && data.description.includes('Siber Şifre Kırıcı')) {
        rawGameType = 'siber-sifre-kirici';
    }
    const normalizedGameType = GAME_TYPE_CANONICAL[rawGameType] || rawGameType || 'Etkinlik';

    const rawContext = (typeof data.context === 'string' ? data.context : '') ||
                       (typeof data.description === 'string' ? data.description : '') || '';
    const text = rawContext.trim();

    if (!text || ['all', 'genel', 'karma'].includes(normalizeTr(text))) {
        return {
            displayTitle: 'Genel Soru / Etkinlik Havuzu',
            displaySub: 'Tüm Konular (Karma)',
            normalizedGameType
        };
    }

    // 1. Topic ID match (e.g. QS6SmMl5nG9VgWL9LNEy or H3jmr9SzfiEk77swWSlj - medium - Test 2)
    const idMatch = text.match(/([a-zA-Z0-9_-]{18,24})/);
    if (idMatch && topicMap.has(idMatch[1])) {
        const topic = topicMap.get(idMatch[1])!;
        let title = topic.topicTitle;
        const sub = `${topic.className}. Sınıf ${topic.courseTitle} > ${topic.unitTitle}`;

        if (text.includes(' - ')) {
            const parts = text.split(' - ').map((s: string) => s.trim()).filter((s: string) => s !== idMatch[1]);
            if (parts.length > 0) {
                const diffMap: Record<string, string> = { easy: 'Kolay', medium: 'Orta', hard: 'Zor' };
                const translated = parts.map((p: string) => diffMap[p.toLowerCase()] || p);
                title += ` (${translated.join(' - ')})`;
            }
        }
        return { displayTitle: title, displaySub: sub, normalizedGameType };
    }

    // 2. Siber Şifre Kırıcı description pattern
    if (text.includes('Konu:')) {
        const parts = text.split('Konu:');
        const topicPart = parts[1].trim();
        const subPart = parts[0].replace(/oyunundan kazandı\.?/i, '').trim() || 'Siber Şifre Kırıcı';
        return { displayTitle: topicPart, displaySub: subPart, normalizedGameType };
    }

    // 3. Composite string with ' - '
    if (text.includes(' - ')) {
        const parts = text.split(' - ').map((s: string) => s.trim());
        const diffMap: Record<string, string> = { easy: 'Kolay', medium: 'Orta', hard: 'Zor' };
        const translated = parts.map((p: string) => diffMap[p.toLowerCase()] || p);

        // Check if parts[0] is Course (e.g. SİYER, DKAB)
        const firstNorm = normalizeTr(translated[0]);
        if (['siyer', 'dkab', 'din', 'temel dini bilgiler'].includes(firstNorm)) {
            const course = translated[0];
            const topicName = translated[1] || '';
            const extras = translated.slice(2);
            let title = topicName;
            if (extras.length > 0) {
                title += ` (${extras.join(' - ')})`;
            }
            const cleanTName = topicName.replace(/^[\d.]+\s*/, '').trim();
            const match = topicTitleMap.get(normalizeTr(cleanTName)) || topicTitleMap.get(normalizeTr(topicName));
            const sub = match ? `${match.className}. Sınıf ${match.courseTitle} > ${match.unitTitle}` : course;
            return { displayTitle: title, displaySub: sub, normalizedGameType };
        }

        // Check if parts[0] is an activity name and parts[1] is a topic or category
        if (translated.length >= 2) {
            const topicCandidate = translated[1];
            const cleanCandidate = topicCandidate.replace(/^[\d.]+\s*/, '').trim();
            const match = topicTitleMap.get(normalizeTr(cleanCandidate)) || topicTitleMap.get(normalizeTr(topicCandidate));
            if (match) {
                return {
                    displayTitle: match.topicTitle,
                    displaySub: `${match.className}. Sınıf ${match.courseTitle} > ${match.unitTitle}`,
                    normalizedGameType
                };
            }

            if (topicCandidate.includes('>')) {
                return {
                    displayTitle: topicCandidate,
                    displaySub: translated[0] || 'Genel Alıştırma',
                    normalizedGameType
                };
            }
        }

        // Otherwise: parts[0] is Topic, parts[1..] are extras
        const topicName = translated[0];
        const extras = translated.slice(1);
        let title = topicName;
        if (extras.length > 0) {
            title += ` (${extras.join(' - ')})`;
        }
        const cleanTName = topicName.replace(/^[\d.]+\s*/, '').trim();
        const tMatch = topicTitleMap.get(normalizeTr(cleanTName)) || topicTitleMap.get(normalizeTr(topicName));
        const sub = tMatch ? `${tMatch.className}. Sınıf ${tMatch.courseTitle} > ${tMatch.unitTitle}` : (data.description && data.description !== text ? data.description : undefined);
        return { displayTitle: title, displaySub: sub, normalizedGameType };
    }

    // 4. Standalone topic title match
    const clean = text.replace(/^[\d.]+\s*/, '').trim();
    const match = topicTitleMap.get(normalizeTr(clean)) || topicTitleMap.get(normalizeTr(text));
    if (match) {
        return {
            displayTitle: match.topicTitle,
            displaySub: `${match.className}. Sınıf ${match.courseTitle} > ${match.unitTitle}`,
            normalizedGameType
        };
    }

    return {
        displayTitle: text,
        displaySub: data.description && data.description !== text ? data.description : undefined,
        normalizedGameType
    };
}

export async function getScoreEvents(params: {
    cursor?: SerializableTimestamp | null,
    direction?: 'next' | 'prev',
    searchTerm?: string | null,
    showOnlyExcessiveAttempts?: boolean,
    filterGameType?: string
}): Promise<{ success: boolean; data?: EnrichedScoreEvent[]; error?: string, lastVisible?: SerializableTimestamp | null }> {
    noStore();
    const { cursor, searchTerm, showOnlyExcessiveAttempts, filterGameType } = params;
    const itemsPerPage = 20;

    try {
        const { topicMap, topicTitleMap } = getCurriculumIndexes();

        // 1. Kullanıcı İsimlerini Haritala (Performans için tek sorgu)
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const usersMap = new Map(usersSnapshot.docs.map(doc => [doc.id, doc.data().displayName]));

        const collectionRef = collection(db, 'scoreEvents');
        const hasFilters = (searchTerm && searchTerm.trim() !== '') || 
                           showOnlyExcessiveAttempts || 
                           (filterGameType && filterGameType !== 'all');

        // DURUM 1: HERHANGİ BİR FİLTRE AKTİFSE
        // Firestore composite index gereksinimini ve hatasını önlemek için sıralı çekip hafızada filtreliyoruz.
        if (hasFilters) {
            const finalQuery = query(collectionRef, orderBy('timestamp', 'desc'), limit(500));
            const snapshot = await getDocs(finalQuery);

            let allData: EnrichedScoreEvent[] = snapshot.docs.map(doc => {
                const data = doc.data();
                const ts = data.timestamp;
                const isoTimestamp = (ts && typeof ts.toDate === 'function') ? ts.toDate().toISOString() : (typeof ts === 'string' ? ts : new Date().toISOString());
                const { displayTitle, displaySub, normalizedGameType } = resolveEventDetails(data, topicMap, topicTitleMap);

                return {
                    ...data,
                    id: doc.id,
                    timestamp: isoTimestamp,
                    userName: usersMap.get(data.userId) || 'Bilinmeyen Kullanıcı',
                    displayTitle,
                    displaySub,
                    normalizedGameType,
                } as EnrichedScoreEvent;
            });

            // Filtreleme 1: Aşırı Denemeler (>10)
            if (showOnlyExcessiveAttempts) {
                allData = allData.filter(event => (event.attemptNumber || 0) > 10);
            }

            // Filtreleme 2: Etkinlik / Oyun Türü
            if (filterGameType && filterGameType !== 'all') {
                allData = allData.filter(event => 
                    event.normalizedGameType === filterGameType || 
                    event.gameType === filterGameType
                );
            }

            // Filtreleme 3: Arama Terimi
            if (searchTerm && searchTerm.trim() !== '') {
                const lowerTerm = normalizeTr(searchTerm);
                allData = allData.filter(event => {
                    const uName = normalizeTr(event.userName || '');
                    const dTitle = normalizeTr(event.displayTitle || '');
                    const dSub = normalizeTr(event.displaySub || '');
                    const gType = normalizeTr(event.gameType || '');
                    const nType = normalizeTr(event.normalizedGameType || '');
                    const ctx = typeof event.context === 'string' ? normalizeTr(event.context) : '';
                    const desc = typeof (event as any).description === 'string' ? normalizeTr((event as any).description) : '';

                    return uName.includes(lowerTerm) ||
                           dTitle.includes(lowerTerm) ||
                           dSub.includes(lowerTerm) ||
                           gType.includes(lowerTerm) ||
                           nType.includes(lowerTerm) ||
                           ctx.includes(lowerTerm) ||
                           desc.includes(lowerTerm);
                });
            }

            return {
                success: true,
                data: JSON.parse(JSON.stringify(allData)),
                lastVisible: null
            };
        } 
        
        // DURUM 2: FİLTRE YOK (Normal Sayfalama)
        else {
            let q = query(collectionRef, orderBy('timestamp', 'desc'));
            if (cursor && cursor._seconds) {
                const startAtTimestamp = new Timestamp(cursor._seconds, cursor._nanoseconds);
                q = query(q, startAfter(startAtTimestamp));
            }
            const finalQuery = query(q, limit(itemsPerPage));

            const snapshot = await getDocs(finalQuery);
            
            const data = snapshot.docs.map(doc => {
                const d = doc.data();
                const ts = d.timestamp;
                const isoTimestamp = (ts && typeof ts.toDate === 'function') ? ts.toDate().toISOString() : (typeof ts === 'string' ? ts : new Date().toISOString());
                const { displayTitle, displaySub, normalizedGameType } = resolveEventDetails(d, topicMap, topicTitleMap);

                return {
                    ...d,
                    id: doc.id,
                    timestamp: isoTimestamp,
                    userName: usersMap.get(d.userId) || 'Bilinmeyen Kullanıcı',
                    displayTitle,
                    displaySub,
                    normalizedGameType,
                } as EnrichedScoreEvent;
            });

            const lastDoc = snapshot.docs[snapshot.docs.length - 1];
            const rawLast = lastDoc ? lastDoc.data().timestamp : null;
            const lastVisible = (rawLast && typeof rawLast === 'object' && 'seconds' in rawLast) ? { _seconds: rawLast.seconds, _nanoseconds: rawLast.nanoseconds } : null;

            return {
                success: true,
                data: JSON.parse(JSON.stringify(data)),
                lastVisible
            };
        }

    } catch (error: any) {
        console.error("Error fetching score events:", error);
        return { success: false, error: 'Veri alınamadı: ' + error.message };
    }
}

export async function deleteScoreEvents(eventIds: string[]): Promise<{ success: boolean; error?: string }> {
    if (!eventIds || eventIds.length === 0) {
        return { success: false, error: "Silinecek olay seçilmedi." };
    }

    try {
        await runTransaction(db, async (transaction) => {
            const pointsToAdjust: Map<string, number> = new Map();
            const eventRefs = eventIds.map(id => doc(db, 'scoreEvents', id));
            
            const eventDocs = await Promise.all(eventRefs.map(ref => transaction.get(ref)));
            
            for (const eventDoc of eventDocs) {
                if (eventDoc.exists()) {
                    const eventData = eventDoc.data() as ScoreEvent;
                    const currentAdjustment = pointsToAdjust.get(eventData.userId) || 0;
                    pointsToAdjust.set(eventData.userId, currentAdjustment + eventData.points);
                }
            }
            
            const userRefs = Array.from(pointsToAdjust.keys()).map(userId => doc(db, 'users', userId));
            const userDocs = await Promise.all(userRefs.map(ref => transaction.get(ref)));
            const userDocMap = new Map(userDocs.map(d => [d.id, d]));

            for (const eventDoc of eventDocs) {
                if (eventDoc.exists()) {
                    transaction.delete(eventDoc.ref);
                }
            }

            for (const [userId, points] of pointsToAdjust.entries()) {
                const userDoc = userDocMap.get(userId);
                if (userDoc && userDoc.exists()) {
                    const currentScore = userDoc.data().score || 0;
                    transaction.update(userDoc.ref, { score: currentScore - points });
                }
            }
        });

        return { success: true };
    } catch (error: any) {
        console.error("Error deleting score events and adjusting scores:", error);
        return { success: false, error: "Puan olayları silinirken ve kullanıcı skorları güncellenirken bir hata oluştu." };
    }
}
