// Büyük Elifba Macerası — Diyanet 30 Adım Tabanlı Pedagojik Oyun Motoru ve Veri Modeli
// Öğretmen Panelindeki DIYANET_ELIFBA_STAGES (cuz1..cuz28, dualar, cuz) ile birebir aynı müfredat!
// Kalabalık adımlar bunaltmaması için 4-6 öğeli Mini Turlara bölünür; 3 Fazlı Ustalık Döngüsü (Keşfet -> Pekiştir -> Ustalık Sınavı) ile işlenir.

import {
    DIYANET_ELIFBA_STAGES,
    DIYANET_SECTIONS,
    getStageItemMeta,
    isDiyanetStageCompleted,
    getDiyanetStepNumber,
    type ElifbaStage
} from './elifba-curriculum';
import { ELIFBA_UNITS } from './elifba-data';
import type { UserProfile } from './types';

export interface AdventureItem {
    id: string;
    name: string;
    imgSrc: string;
    audSrc: string;
    arabic?: string;
    tip?: string;
    subLabel?: string;
    hideLabelInQuiz?: boolean;
}

export interface AdventureMiniRound {
    roundIndex: number; // 1-based
    title: string;
    items: AdventureItem[];
}

export type StageDifficulty = 'kolay' | 'orta' | 'ileri' | 'ustalik';

export interface AdventureStage {
    id: number; // 1..30 (Diyanet Adım Numarası)
    curriculumId: string; // 'cuz1'..'cuz28', 'dualar', 'cuz'
    title: string;
    shortTitle: string;
    desc: string;
    difficulty: StageDifficulty;
    isGate?: boolean;
    hasExactReading: boolean;
    passingScorePercent: number;
    requiredRepeats: number;
    badgeId: string;
    badgeName: string;
    badgeIcon: string;
    islandId: number; // 1..4 (DIYANET_SECTIONS sırası)
    islandName: string;
    items: AdventureItem[];
    miniRounds: AdventureMiniRound[];
    reviewPoolIds?: number[];
}

export interface AdventureIsland {
    id: number; // 1..4
    sectionId: 'section1' | 'section2' | 'section3' | 'section4';
    name: string;
    shortName: string;
    subtitle: string;
    icon: string;
    themeColor: string;
    gradient: string;
    nodeBg: string;
    nodeShadow: string;
    badgeBg: string;
    stages: number[];
}

export interface StageMasteryProgress {
    learnDone: boolean;
    reinforceDone: boolean;
    examPassed: boolean;
    bestAccuracy: number;
    completedRounds?: number[]; // Tamamlanan mini tur indeksleri (1-based)
}

export interface AdventurePlayerData {
    name: string;
    avatar: string;
    unlockedStage: number; // 1..30
    stageStars: Record<number, number>;
    stageScores: Record<number, number>;
    stageMastered: Record<number, StageMasteryProgress>;
    badges: string[];
    xp: number;
    streak: number;
    teacherFreeMode: boolean;
    lastStageTitle?: string;
    lastActivityAt?: string;
    curriculumVersion?: string;
    syncedFromGuestUid?: string;
    syncedFromGuestName?: string;
    lastSyncedAt?: string;
}

export const CURRENT_CURRICULUM_VERSION = 'diyanet_30';

export const AVATAR_CHOICES = ['🦁', '🦉', '🦊', '🐼', '🐥', '🚀', '🌙', '🌟'];

export interface PlayerRank {
    title: string;
    icon: string;
    minStars: number;
    color: string;
}

export const PLAYER_RANKS: PlayerRank[] = [
    { title: 'Minik Kaşif', icon: '🌱', minStars: 0, color: 'text-emerald-600' },
    { title: 'Harf Yolcusu', icon: '🧭', minStars: 15, color: 'text-sky-600' },
    { title: 'Hareke Yıldızı', icon: '⭐', minStars: 35, color: 'text-amber-600' },
    { title: 'Kaide Ustası', icon: '🕌', minStars: 60, color: 'text-indigo-600' },
    { title: "Kur'an Şampiyonu", icon: '👑', minStars: 80, color: 'text-purple-600' }
];

export function getPlayerRank(totalStars: number): PlayerRank {
    let current = PLAYER_RANKS[0];
    for (const rank of PLAYER_RANKS) {
        if (totalStars >= rank.minStars) current = rank;
    }
    return current;
}

// Öğretmen Panelindeki 4 Resmi Diyanet Bölümü -> Macera Diyarı Temaları
const SECTION_STYLE_MAP: Record<
    'section1' | 'section2' | 'section3' | 'section4',
    {
        id: number;
        shortName: string;
        icon: string;
        themeColor: string;
        gradient: string;
        nodeBg: string;
        nodeShadow: string;
        badgeBg: string;
    }
> = {
    section1: {
        id: 1,
        shortName: '1. Harf & Hareke',
        icon: '🏝️',
        themeColor: 'emerald',
        gradient: 'from-emerald-500 via-teal-500 to-cyan-600',
        nodeBg: 'bg-emerald-500 border-emerald-700',
        nodeShadow: 'shadow-[0_6px_0_#047857]',
        badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-300'
    },
    section2: {
        id: 2,
        shortName: '2. Cezm, Med & Şedde',
        icon: '🏔️',
        themeColor: 'sky',
        gradient: 'from-sky-500 via-blue-600 to-indigo-600',
        nodeBg: 'bg-sky-500 border-sky-700',
        nodeShadow: 'shadow-[0_6px_0_#0369a1]',
        badgeBg: 'bg-sky-100 text-sky-800 border-sky-300'
    },
    section3: {
        id: 3,
        shortName: '3. Tenvin & Kaideler',
        icon: '🏰',
        themeColor: 'amber',
        gradient: 'from-amber-500 via-orange-500 to-rose-500',
        nodeBg: 'bg-amber-500 border-amber-700',
        nodeShadow: 'shadow-[0_6px_0_#b45309]',
        badgeBg: 'bg-amber-100 text-amber-800 border-amber-300'
    },
    section4: {
        id: 4,
        shortName: "4. Dualar & Kur'an",
        icon: '👑',
        themeColor: 'purple',
        gradient: 'from-violet-600 via-purple-600 to-fuchsia-600',
        nodeBg: 'bg-purple-600 border-purple-800',
        nodeShadow: 'shadow-[0_6px_0_#6b21a8]',
        badgeBg: 'bg-purple-100 text-purple-800 border-purple-300'
    }
};

export const ADVENTURE_ISLANDS: AdventureIsland[] = DIYANET_SECTIONS.map(sec => {
    const stStyle = SECTION_STYLE_MAP[sec.id];
    const [startStep, endStep] = sec.stepRange;
    const stages: number[] = [];
    for (let i = startStep; i <= endStep; i++) stages.push(i);

    return {
        id: stStyle.id,
        sectionId: sec.id,
        name: sec.title,
        shortName: stStyle.shortName,
        subtitle: sec.subtitle,
        icon: stStyle.icon,
        themeColor: stStyle.themeColor,
        gradient: stStyle.gradient,
        nodeBg: stStyle.nodeBg,
        nodeShadow: stStyle.nodeShadow,
        badgeBg: stStyle.badgeBg,
        stages
    };
});

// Okuma adının kelimesi/harfi birebir yazılı olan aşamalar (Eşleştirme oyunu için uygun)
const EXACT_READING_STAGE_IDS = new Set([
    'cuz1',
    'cuz2',
    'cuz3',
    'cuz4',
    'cuz7',
    'cuz8',
    'cuz9',
    'cuz18',
    'dualar'
]);

const STAGE_BADGES: Record<number, { icon: string; name: string }> = {
    1: { icon: '🌱', name: 'Harf Kaşifi' },
    2: { icon: '🎵', name: 'Hareke Sesi' },
    3: { icon: '🤝', name: 'Bitişme Ustası' },
    4: { icon: '🎈', name: 'Üstün 1 Yıldızı' },
    5: { icon: '📖', name: 'Üstün 2 Okuyucusu' },
    6: { icon: '✨', name: 'Üstün 3 Bilgini' },
    7: { icon: '💧', name: 'Esre Kahramanı' },
    8: { icon: '🛡️', name: '1. Bölüm Fatihi' },
    9: { icon: '🔒', name: 'Cezimli Sesler' },
    10: { icon: '⚡', name: 'Cezm Ustası' },
    11: { icon: '🎯', name: 'Cezm Talimcisi' },
    12: { icon: '🚀', name: 'Uzatma Kaşifi' },
    13: { icon: '📏', name: 'Med Elif Yıldızı' },
    14: { icon: '🌊', name: 'Med Yâ Yıldızı' },
    15: { icon: '🌀', name: 'Med Vâv Yıldızı' },
    16: { icon: '🧭', name: 'Med Talimcisi' },
    17: { icon: '💥', name: 'Şeddeli Okuyuş' },
    18: { icon: '🔔', name: 'Şedde Kahramanı' },
    19: { icon: '🏰', name: '2. Bölüm Fatihi' },
    20: { icon: '🌟', name: 'İki Üstün Ustası' },
    21: { icon: '💎', name: 'İki Esre Ustası' },
    22: { icon: '🧁', name: 'İki Ötre Ustası' },
    23: { icon: '🖌️', name: 'Çeker Kaidesi' },
    24: { icon: '📜', name: 'Şekil Elif Ustası' },
    25: { icon: '🪶', name: 'Zamir Hâ Bilgini' },
    26: { icon: '🌙', name: 'El Takısı Uzmanı' },
    27: { icon: '🔍', name: 'Okunmayan Harfler' },
    28: { icon: '🕌', name: '3. Bölüm Fatihi' },
    29: { icon: '🤲', name: 'Namaz Duaları Ustası' },
    30: { icon: '👑', name: "Kur'an Şampiyonu" }
};

/**
 * Verilen öğeleri dengeli 4-6 öğeli mini turlara böler (tek kalan 1-2 öğe bırakmaz).
 */
function buildBalancedChunks<T>(items: T[], targetSize: number = 5): T[][] {
    if (items.length === 0) return [];
    if (items.length <= 6) return [items];

    const chunkCount = Math.ceil(items.length / targetSize);
    const baseSize = Math.floor(items.length / chunkCount);
    const remainder = items.length % chunkCount;

    const chunks: T[][] = [];
    let cursor = 0;
    for (let i = 0; i < chunkCount; i++) {
        const size = baseSize + (i < remainder ? 1 : 0);
        chunks.push(items.slice(cursor, cursor + size));
        cursor += size;
    }
    return chunks;
}

/**
 * Bir Diyanet Elifba Aşamasının tüm sesli/görselli öğelerini ve 5-6'lı mini turlarını oluşturur.
 */
function buildItemsAndRoundsForStage(stage: ElifbaStage): {
    items: AdventureItem[];
    miniRounds: AdventureMiniRound[];
} {
    // Adım 29: Namaz Duaları (8 Dua, anlamlı gruplama)
    if (stage.id === 'dualar') {
        const duaUnits = ELIFBA_UNITS.filter(u => u.type === 'dua');
        const allItems: AdventureItem[] = [];
        const miniRounds: AdventureMiniRound[] = [];
        let roundCounter = 1;

        for (const unit of duaUnits) {
            const unitItems: AdventureItem[] = unit.items.map(it => ({
                id: `${unit.id}_${it.index}`,
                name: `${unit.shortTitle} • ${it.index}. Bölüm`,
                imgSrc: it.img,
                audSrc: it.audio,
                tip: unit.meaning ? `${unit.title} — ${unit.meaning.slice(0, 120)}...` : unit.description,
                subLabel: unit.shortTitle
            }));
            allItems.push(...unitItems);

            if (unitItems.length <= 6) {
                miniRounds.push({
                    roundIndex: roundCounter++,
                    title: unit.shortTitle,
                    items: unitItems
                });
            } else {
                const subChunks = buildBalancedChunks(unitItems, 5);
                subChunks.forEach((ch, idx) => {
                    miniRounds.push({
                        roundIndex: roundCounter++,
                        title: `${unit.shortTitle} (${idx + 1}. Parça)`,
                        items: ch
                    });
                });
            }
        }

        return { items: allItems, miniRounds };
    }

    // Adım 30: Kur'an-ı Kerim / Cüz Okuma (Diyanet Müfredatının Tüm Kaidelerinden Özet Final)
    if (stage.id === 'cuz') {
        const capstoneSources: { stageId: string; itemIndex: number; label: string; tip: string }[] = [
            { stageId: 'cuz1', itemIndex: 4, label: 'Peltek Se (Harf)', tip: 'Üstünde 3 nokta: Peltek Se' },
            { stageId: 'cuz1', itemIndex: 21, label: 'Kalın Kaf (Harf)', tip: 'İki noktalı kalın boğaz harfi Kaf' },
            { stageId: 'cuz2', itemIndex: 5, label: 'Cim (Harekeli)', tip: 'Üstün, esre ve ötre: Ce - Ci - Cü' },
            { stageId: 'cuz4', itemIndex: 14, label: 'Sa (Üstün)', tip: 'Kalın Sad harfi üstünle Sa okunur' },
            { stageId: 'cuz7', itemIndex: 2, label: 'Bi (Esre)', tip: 'Be esreyle Bi sesini verir' },
            { stageId: 'cuz8', itemIndex: 10, label: 'Ru (Ötre)', tip: 'Ra harfi ötreyle kalın Ru okunur' },
            { stageId: 'cuz9', itemIndex: 22, label: 'El (Cezm)', tip: 'Elif + Lam cezm = El hecesi' },
            { stageId: 'cuz13', itemIndex: 1, label: 'Med Elif Örneği', tip: 'Harekesiz Elif önceki üstünü 1 elif uzatır' },
            { stageId: 'cuz15', itemIndex: 1, label: 'Med Vâv Örneği', tip: 'Ötreden sonra harekesiz Vav uzatma yapar' },
            { stageId: 'cuz18', itemIndex: 22, label: 'Elle (Şedde)', tip: 'Şeddeli harf iki kez kuvvetlice okunur' },
            { stageId: 'cuz20', itemIndex: 1, label: 'İki Üstün (Tenvin)', tip: 'Çift üstün -en / -an sesi verir' },
            { stageId: 'cuz28', itemIndex: 1, label: 'Lafzatullah / Mukattaa', tip: "Kur'an okuma öncesi son ileri kaide" }
        ];

        const capItems: AdventureItem[] = capstoneSources
            .map((src, idx) => {
                const meta = getStageItemMeta(src.stageId, src.itemIndex);
                if (!meta.img || !meta.audio) return null;
                return {
                    id: `cuz30_${idx + 1}`,
                    name: src.label || meta.name,
                    imgSrc: meta.img,
                    audSrc: meta.audio,
                    arabic: meta.arabic,
                    tip: src.tip || meta.desc
                };
            })
            .filter(Boolean) as AdventureItem[];

        const capChunks = buildBalancedChunks(capItems, 6);
        const miniRounds = capChunks.map((ch, i) => ({
            roundIndex: i + 1,
            title: i === 0 ? 'Harf & Hareke Tekrarı' : 'Kaide & Tecvid Tekrarı',
            items: ch
        }));

        return { items: capItems, miniRounds };
    }

    // Adım 1..28: Standart Diyanet Dersleri (cuz1..cuz28)
    const unit = ELIFBA_UNITS.find(u => u.id === stage.id);
    if (!unit) return { items: [], miniRounds: [] };

    const items: AdventureItem[] = unit.items.map(it => {
        const meta = getStageItemMeta(stage.id, it.index);
        const cleanTitle = stage.shortTitle.replace(/^Adım \d+:\s*/, '');
        const fallbackName = `${cleanTitle} • #${it.index}`;
        const displayName =
            meta.name && !(meta.name === 'Elif' && (stage.id !== 'cuz1' || it.index > 1))
                ? meta.name
                : fallbackName;

        return {
            id: `${stage.id}_${it.index}`,
            name: displayName,
            imgSrc: it.img,
            audSrc: it.audio,
            arabic: meta.arabic,
            tip: meta.desc || stage.description
        };
    });

    const chunks = buildBalancedChunks(items, 5);
    const miniRounds: AdventureMiniRound[] = chunks.map((ch, idx) => ({
        roundIndex: idx + 1,
        title: `${idx + 1}. Tur (${ch.length} Örnek)`,
        items: ch
    }));

    return { items, miniRounds };
}

// Öğretmen Panelindeki 30 Diyanet Adımının Oyunlaştırılmış Halini Oluştur
export const ADVENTURE_STAGES: AdventureStage[] = DIYANET_ELIFBA_STAGES.map(stage => {
    const stepNum = stage.stepNumber;
    const islandStyle = SECTION_STYLE_MAP[stage.section];
    const badge = STAGE_BADGES[stepNum] || { icon: '📘', name: stage.shortTitle };
    const { items, miniRounds } = buildItemsAndRoundsForStage(stage);

    const isGate = stepNum === 8 || stepNum === 19 || stepNum === 28 || stepNum === 30;
    const difficulty: StageDifficulty =
        stepNum === 30 || isGate
            ? 'ustalik'
            : stepNum <= 8
            ? stepNum <= 4
                ? 'kolay'
                : 'orta'
            : stepNum <= 19
            ? 'orta'
            : 'ileri';

    const cleanShortTitle = stage.shortTitle.replace(/^Adım \d+:\s*/, '');
    const cleanFullTitle = stage.title.replace(/^Adım \d+:\s*/, '');

    const reviewPoolIds: number[] = [];
    if (stepNum > 1 && stepNum < 29) {
        if (stepNum > 2) reviewPoolIds.push(stepNum - 2);
        reviewPoolIds.push(stepNum - 1);
    }

    return {
        id: stepNum,
        curriculumId: stage.id,
        title: cleanFullTitle,
        shortTitle: cleanShortTitle,
        desc: stage.description,
        difficulty,
        isGate,
        hasExactReading: EXACT_READING_STAGE_IDS.has(stage.id),
        passingScorePercent: isGate ? 85 : 80,
        requiredRepeats: miniRounds.length > 2 ? 2 : 3,
        badgeId: `diyanet_badge_${stage.id}`,
        badgeName: badge.name,
        badgeIcon: badge.icon,
        islandId: islandStyle.id,
        islandName: stage.sectionTitle,
        items,
        miniRounds,
        reviewPoolIds: reviewPoolIds.length > 0 ? reviewPoolIds : undefined
    };
});

export const TOTAL_ADVENTURE_STAGES = ADVENTURE_STAGES.length; // 30

export const MASCOT_QUOTES = [
    "Bu adımlar öğretmeninin Kur'an Takip Panelindeki gerçek Diyanet 30 Adımı ile birebir aynıdır! 🌟",
    "Uzun adımlar seni yormasın diye 5'li mini turlara bölündü. Her turu kolayca bitirebilirsin! 🐥",
    "Her harf veya kelimeyi bol tekrar edersen kalıcı öğrenirsin! 🗣️",
    "Takıldığın yerde '0.75x Yavaş' butonuna basıp mahrecini dikkatle dinle! 🎧",
    "Kur'an harflerini öğrenmek çok kıymetlidir; her bir harf için on sevap vardır! ✨",
    "30 Diyanet Adımını bitirdiğinde Kur'an Şampiyonu sertifikan seni bekliyor! 🎓"
];

// Gelişmiş Web Audio API Sentezleyicisi (Kombo perdesi artan oyun sesleri)
export const playAdventureTone = (
    type: 'correct' | 'wrong' | 'fanfare' | 'chirp' | 'click' | 'unlock' | 'pop',
    combo: number = 0
) => {
    try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') ctx.resume();

        const now = ctx.currentTime;

        if (type === 'correct') {
            const pitchBoost = Math.min(combo, 6) * 40;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(523.25 + pitchBoost, now);
            osc.frequency.exponentialRampToValueAtTime(783.99 + pitchBoost, now + 0.11);
            gain.gain.setValueAtTime(0.22, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.28);
        } else if (type === 'wrong') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(240, now);
            osc.frequency.exponentialRampToValueAtTime(140, now + 0.22);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.24);
        } else if (type === 'fanfare') {
            const notes = [
                { f: 523.25, d: 0.12, t: 0 },
                { f: 659.25, d: 0.12, t: 0.11 },
                { f: 783.99, d: 0.14, t: 0.22 },
                { f: 1046.5, d: 0.45, t: 0.34 }
            ];
            notes.forEach(n => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(n.f, now + n.t);
                gain.gain.setValueAtTime(0.24, now + n.t);
                gain.gain.exponentialRampToValueAtTime(0.001, now + n.t + n.d);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now + n.t);
                osc.stop(now + n.t + n.d);
            });
        } else if (type === 'unlock') {
            const notes = [440, 554.37, 659.25, 880];
            notes.forEach((f, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(f, now + idx * 0.08);
                gain.gain.setValueAtTime(0.2, now + idx * 0.08);
                gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.25);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now + idx * 0.08);
                osc.stop(now + idx * 0.08 + 0.25);
            });
        } else if (type === 'chirp') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(680, now);
            osc.frequency.exponentialRampToValueAtTime(1320, now + 0.08);
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.17);
            gain.gain.setValueAtTime(0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.005, now + 0.21);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.21);
        } else if (type === 'pop') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(500, now);
            osc.frequency.exponentialRampToValueAtTime(900, now + 0.06);
            gain.gain.setValueAtTime(0.14, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.08);
        } else if (type === 'click') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(750, now);
            gain.gain.setValueAtTime(0.07, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.05);
        }
    } catch {
        // Sessizce devam et
    }
};

const STORAGE_KEY_NAME = 'elifbam_adventure_player_name';
const STORAGE_KEY_DATA = 'elifbam_adventure_progress_v3_diyanet';

export function getDefaultAdventurePlayerData(defaultName: string = 'Küçük Hafız'): AdventurePlayerData {
    return {
        name: defaultName || 'Küçük Hafız',
        avatar: '🦉',
        unlockedStage: 1,
        stageStars: {},
        stageScores: {},
        stageMastered: {},
        badges: [],
        xp: 0,
        streak: 0,
        teacherFreeMode: false,
        curriculumVersion: CURRENT_CURRICULUM_VERSION
    };
}

export function loadAdventurePlayerData(userId?: string, defaultName?: string): AdventurePlayerData {
    const defaultData = getDefaultAdventurePlayerData(defaultName);
    if (typeof window === 'undefined') return defaultData;

    try {
        if (userId) {
            const scopedRaw = localStorage.getItem(`${STORAGE_KEY_DATA}_${userId}`);
            if (scopedRaw) {
                const parsed = JSON.parse(scopedRaw);
                if (parsed.curriculumVersion === CURRENT_CURRICULUM_VERSION) {
                    return {
                        ...defaultData,
                        ...parsed,
                        name: parsed.name || defaultName || defaultData.name
                    };
                }
            }
            return defaultData;
        }

        const savedName = localStorage.getItem(STORAGE_KEY_NAME);
        if (savedName) defaultData.name = savedName;

        const savedV3 = localStorage.getItem(STORAGE_KEY_DATA);
        if (savedV3) {
            const parsed = JSON.parse(savedV3);
            if (parsed.curriculumVersion === CURRENT_CURRICULUM_VERSION) {
                return {
                    ...defaultData,
                    ...parsed,
                    name: savedName || parsed.name || defaultData.name
                };
            }
        }
    } catch (e) {
        console.error('Player data load error:', e);
    }
    return defaultData;
}

export function saveAdventurePlayerData(data: AdventurePlayerData, userId?: string): void {
    if (typeof window === 'undefined') return;
    try {
        const payload = { ...data, curriculumVersion: CURRENT_CURRICULUM_VERSION };
        if (userId) {
            localStorage.setItem(`${STORAGE_KEY_DATA}_${userId}`, JSON.stringify(payload));
            return;
        }
        localStorage.setItem(STORAGE_KEY_NAME, payload.name);
        localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(payload));
    } catch (e) {
        console.error('Player data save error:', e);
    }
}

export function computeAdventureStats(data?: Partial<AdventurePlayerData> | null) {
    const isCompatible = !data || !data.unlockedStage || data.curriculumVersion === CURRENT_CURRICULUM_VERSION;
    if (!data || !isCompatible) {
        return {
            totalStars: 0,
            completedCount: 0,
            maxStars: ADVENTURE_STAGES.length * 3,
            percent: 0
        };
    }
    const stageStars = data.stageStars || {};
    const stageMastered = data.stageMastered || {};
    const totalStars = Object.values(stageStars).reduce((acc, s) => acc + (Number(s) || 0), 0);
    const completedCount = ADVENTURE_STAGES.filter(
        st => stageMastered[st.id]?.examPassed || (Number(stageStars[st.id]) || 0) > 0
    ).length;
    const maxStars = ADVENTURE_STAGES.length * 3; // 90
    const percent = Math.round((completedCount / ADVENTURE_STAGES.length) * 100);
    return { totalStars, completedCount, maxStars, percent };
}

export function toCloudAdventurePayload(data: AdventurePlayerData, lastStageTitle?: string) {
    const normalized: AdventurePlayerData = {
        ...data,
        curriculumVersion: CURRENT_CURRICULUM_VERSION
    };
    const stats = computeAdventureStats(normalized);
    const payload: Record<string, any> = {
        name: normalized.name || 'Küçük Hafız',
        avatar: normalized.avatar || '🦉',
        unlockedStage: Math.min(ADVENTURE_STAGES.length, Math.max(1, Number(normalized.unlockedStage) || 1)),
        totalStars: stats.totalStars,
        completedCount: stats.completedCount,
        xp: Number(normalized.xp) || 0,
        streak: Number(normalized.streak) || 0,
        badges: Array.isArray(normalized.badges) ? normalized.badges : [],
        stageStars: normalized.stageStars || {},
        stageScores: normalized.stageScores || {},
        stageMastered: normalized.stageMastered || {},
        teacherFreeMode: Boolean(normalized.teacherFreeMode),
        lastStageTitle: lastStageTitle || normalized.lastStageTitle || `Adım ${normalized.unlockedStage || 1}`,
        lastActivityAt: new Date().toISOString(),
        curriculumVersion: CURRENT_CURRICULUM_VERSION
    };

    if (normalized.syncedFromGuestUid) payload.syncedFromGuestUid = normalized.syncedFromGuestUid;
    if (normalized.syncedFromGuestName) payload.syncedFromGuestName = normalized.syncedFromGuestName;
    if (normalized.lastSyncedAt) payload.lastSyncedAt = normalized.lastSyncedAt;

    return payload as NonNullable<UserProfile['elifbaAdventure']>;
}

export function mergeAdventureProgress(
    local: AdventurePlayerData,
    cloud?: Partial<AdventurePlayerData> | null
): AdventurePlayerData {
    if (!cloud) return { ...local, curriculumVersion: CURRENT_CURRICULUM_VERSION };

    // Eski 24 adımlı sürüm kalıntısı varsa sadece isim/avatar/serbest mod bilgisini taşı,
    // adım haritasını temiz Diyanet 30 Adım ile başlat
    if (cloud.curriculumVersion !== CURRENT_CURRICULUM_VERSION) {
        return {
            ...local,
            name: cloud.name || local.name,
            avatar: cloud.avatar || local.avatar,
            teacherFreeMode: Boolean(cloud.teacherFreeMode ?? local.teacherFreeMode),
            curriculumVersion: CURRENT_CURRICULUM_VERSION
        };
    }

    const mergedStars: Record<number, number> = { ...(local.stageStars || {}) };
    for (const [k, v] of Object.entries(cloud.stageStars || {})) {
        const id = Number(k);
        mergedStars[id] = Math.max(Number(mergedStars[id]) || 0, Number(v) || 0);
    }

    const mergedScores: Record<number, number> = { ...(local.stageScores || {}) };
    for (const [k, v] of Object.entries(cloud.stageScores || {})) {
        const id = Number(k);
        mergedScores[id] = Math.max(Number(mergedScores[id]) || 0, Number(v) || 0);
    }

    const mergedMastered: Record<number, StageMasteryProgress> = { ...(local.stageMastered || {}) };
    for (const [k, v] of Object.entries(cloud.stageMastered || {})) {
        const id = Number(k);
        const cur = mergedMastered[id] || {
            learnDone: false,
            reinforceDone: false,
            examPassed: false,
            bestAccuracy: 0,
            completedRounds: []
        };
        const mergedRounds = Array.from(
            new Set([...(cur.completedRounds || []), ...(v?.completedRounds || [])])
        ).sort((a, b) => a - b);

        mergedMastered[id] = {
            learnDone: Boolean(cur.learnDone || v?.learnDone),
            reinforceDone: Boolean(cur.reinforceDone || v?.reinforceDone),
            examPassed: Boolean(cur.examPassed || v?.examPassed),
            bestAccuracy: Math.max(Number(cur.bestAccuracy) || 0, Number(v?.bestAccuracy) || 0),
            completedRounds: mergedRounds
        };
    }

    const badges = Array.from(new Set([...(local.badges || []), ...(cloud.badges || [])]));
    const useCloudMeta =
        (cloud.lastActivityAt && (!local.lastActivityAt || cloud.lastActivityAt >= local.lastActivityAt)) ||
        (!local.xp && Number(cloud.xp) > 0);

    return {
        name: (useCloudMeta ? cloud.name : local.name) || cloud.name || local.name || 'Küçük Hafız',
        avatar: (useCloudMeta ? cloud.avatar : local.avatar) || cloud.avatar || local.avatar || '🦉',
        unlockedStage: Math.min(
            TOTAL_ADVENTURE_STAGES,
            Math.max(Number(local.unlockedStage) || 1, Number(cloud.unlockedStage) || 1)
        ),
        stageStars: mergedStars,
        stageScores: mergedScores,
        stageMastered: mergedMastered,
        badges,
        xp: Math.max(Number(local.xp) || 0, Number(cloud.xp) || 0),
        streak: Math.max(Number(local.streak) || 0, Number(cloud.streak) || 0),
        teacherFreeMode: Boolean(cloud.teacherFreeMode ?? local.teacherFreeMode),
        lastStageTitle: cloud.lastStageTitle || local.lastStageTitle,
        lastActivityAt: cloud.lastActivityAt || local.lastActivityAt,
        curriculumVersion: CURRENT_CURRICULUM_VERSION,
        syncedFromGuestUid: cloud.syncedFromGuestUid || local.syncedFromGuestUid,
        syncedFromGuestName: cloud.syncedFromGuestName || local.syncedFromGuestName,
        lastSyncedAt: cloud.lastSyncedAt || local.lastSyncedAt
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// ÖĞRETMEN PANELİ (SANAL ÖĞRENCİ <-> KAYITLI ÖĞRENCİ) EŞİTLEME YARDIMCILARI
// ─────────────────────────────────────────────────────────────────────────────

export function normalizeStudentMatchName(name?: string): string {
    if (!name) return '';
    return name
        .trim()
        .toLocaleLowerCase('tr')
        .replace(/[ıİ]/g, 'i')
        .replace(/ş/g, 's')
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export function findMatchingGuestStudent(
    registeredStudent: UserProfile,
    guestStudents: UserProfile[]
): UserProfile | null {
    if (!guestStudents || guestStudents.length === 0) return null;

    // 1. Önceden bağlanmış bir sanal öğrenci varsa onu döndür
    const linkedUid = registeredStudent.elifbaAdventure?.syncedFromGuestUid;
    if (linkedUid) {
        const linked = guestStudents.find(g => g.uid === linkedUid);
        if (linked) return linked;
    }

    // 2. Birebir Türkçe küçük harf isim eşleşmesi
    const exactReg = (registeredStudent.displayName || '').trim().toLocaleLowerCase('tr');
    if (exactReg) {
        const exactMatch = guestStudents.find(
            g => (g.displayName || '').trim().toLocaleLowerCase('tr') === exactReg
        );
        if (exactMatch) return exactMatch;
    }

    // 3. Karakter yumuşatılmış isim eşleşmesi
    const foldedReg = normalizeStudentMatchName(registeredStudent.displayName);
    if (foldedReg) {
        const foldedMatch = guestStudents.find(
            g => normalizeStudentMatchName(g.displayName) === foldedReg
        );
        if (foldedMatch) return foldedMatch;
    }

    return null;
}

export interface QuranProgressLike {
    studentUid: string;
    studentName?: string;
    currentStageId?: string;
    cuzPage?: number;
    stages?: Record<string, { status: string; score?: number }>;
}

/**
 * Sanal öğrencinin Öğretmen Panelindeki (quran_progress) okuma kaydını
 * Kayıtlı Öğrencinin Elifba Macerası (30 Adım) yapısına dönüştürür.
 */
export function buildAdventureFromQuranProgress(
    existingAdv: Partial<AdventurePlayerData> | undefined,
    quranProgress: QuranProgressLike | undefined,
    guestStudent: UserProfile,
    fallbackStudentName: string
): AdventurePlayerData {
    const isCompat = existingAdv?.curriculumVersion === CURRENT_CURRICULUM_VERSION;
    const base: AdventurePlayerData = isCompat
        ? {
              ...getDefaultAdventurePlayerData(fallbackStudentName),
              ...existingAdv,
              stageStars: { ...(existingAdv?.stageStars || {}) },
              stageScores: { ...(existingAdv?.stageScores || {}) },
              stageMastered: { ...(existingAdv?.stageMastered || {}) },
              badges: [...(existingAdv?.badges || [])]
          }
        : {
              ...getDefaultAdventurePlayerData(fallbackStudentName),
              name: existingAdv?.name || fallbackStudentName || 'Öğrenci',
              avatar: existingAdv?.avatar || '🦉',
              teacherFreeMode: Boolean(existingAdv?.teacherFreeMode)
          };

    if (!quranProgress) return base;

    const hasCuzPage = Boolean(quranProgress.cuzPage && quranProgress.cuzPage > 0);
    let highestCompletedStep = 0;

    for (const stage of ADVENTURE_STAGES) {
        const step = stage.id;
        const completedInTracker =
            isDiyanetStageCompleted(quranProgress.stages, stage.curriculumId) ||
            (hasCuzPage && step < 30);

        if (completedInTracker) {
            highestCompletedStep = Math.max(highestCompletedStep, step);
            const rawScore = quranProgress.stages?.[stage.curriculumId]?.score;
            const score = typeof rawScore === 'number' && rawScore > 0 ? Math.round(rawScore) : 100;
            const stars = score >= 95 ? 3 : score >= 80 ? 2 : 1;

            const prevMaster = base.stageMastered[step];
            base.stageMastered[step] = {
                learnDone: true,
                reinforceDone: true,
                examPassed: true,
                bestAccuracy: Math.max(score, prevMaster?.bestAccuracy || 0),
                completedRounds: stage.miniRounds.map(r => r.roundIndex)
            };
            base.stageStars[step] = Math.max(stars, base.stageStars[step] || 0);
            base.stageScores[step] = Math.max(score, base.stageScores[step] || 0);

            if (!base.badges.includes(stage.badgeId)) {
                base.badges.push(stage.badgeId);
            }
        }
    }

    const trackerStep = getDiyanetStepNumber(quranProgress.currentStageId || 'cuz1', quranProgress.cuzPage);
    const derivedUnlock = Math.min(
        TOTAL_ADVENTURE_STAGES,
        Math.max(1, base.unlockedStage || 1, highestCompletedStep + 1, trackerStep)
    );
    base.unlockedStage = derivedUnlock;

    // XP'yi gerçekçi şekilde senkronize et (mevcuttan düşükse tamamlanan adım başı 60 XP)
    const completedTotal = ADVENTURE_STAGES.filter(s => base.stageMastered[s.id]?.examPassed).length;
    base.xp = Math.max(base.xp || 0, completedTotal * 60);

    base.syncedFromGuestUid = guestStudent.uid;
    base.syncedFromGuestName = guestStudent.displayName;
    base.lastSyncedAt = new Date().toISOString();
    base.lastStageTitle = `Adım ${derivedUnlock} (Sanal Kayıttan Eşitlendi)`;

    return base;
}

/**
 * Bir sanal öğrencinin quran_progress kaydında kaç Diyanet adımını tamamladığını hesaplar.
 */
export function summarizeQuranProgressForMatch(prog?: QuranProgressLike) {
    if (!prog) return { completedCount: 0, activeStep: 1, completedCurriculumIds: [] as string[] };

    const hasCuzPage = Boolean(prog.cuzPage && prog.cuzPage > 0);
    const completedCurriculumIds: string[] = [];

    for (const st of DIYANET_ELIFBA_STAGES) {
        if (isDiyanetStageCompleted(prog.stages, st.id) || (hasCuzPage && st.stepNumber < 30)) {
            completedCurriculumIds.push(st.id);
        }
    }

    const activeStep = getDiyanetStepNumber(prog.currentStageId || 'cuz1', prog.cuzPage);
    return {
        completedCount: completedCurriculumIds.length,
        activeStep,
        completedCurriculumIds
    };
}
