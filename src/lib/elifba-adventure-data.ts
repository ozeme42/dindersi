// Büyük Elifba Macerası — Pedagojik Oyun Motoru ve Veri Modeli
// Kolaydan Zora 24 Aşama • 5 Tematik Diyar • 3 Fazlı Ustalık Döngüsü (Keşfet -> Pekiştir -> Ustalık Sınavı)

export interface AdventureItem {
    id: string;
    name: string;
    imgSrc: string;
    audSrc: string;
    arabic?: string;
    tip?: string;
    hideLabelInQuiz?: boolean;
}

export type StageDifficulty = 'kolay' | 'orta' | 'ileri' | 'ustalik';

export interface AdventureStage {
    id: number;
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
    islandId: number;
    islandName: string;
    items: AdventureItem[];
    reviewPoolIds?: number[]; // Aralıklı tekrar (Spaced Repetition) için önceki aşama ID'leri
}

export interface AdventureIsland {
    id: number;
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
}

export interface AdventurePlayerData {
    name: string;
    avatar: string;
    unlockedStage: number;
    stageStars: Record<number, number>;
    stageScores: Record<number, number>;
    stageMastered: Record<number, StageMasteryProgress>;
    badges: string[];
    xp: number;
    streak: number;
    teacherFreeMode: boolean;
}

export const AVATAR_CHOICES = ['🦁', '🦉', '🦊', '🐼', '🐥', '🚀', '🌙', '🌟'];

export interface PlayerRank {
    title: string;
    icon: string;
    minStars: number;
    color: string;
}

export const PLAYER_RANKS: PlayerRank[] = [
    { title: 'Minik Kaşif', icon: '🌱', minStars: 0, color: 'text-emerald-600' },
    { title: 'Harf Yolcusu', icon: '🧭', minStars: 12, color: 'text-sky-600' },
    { title: 'Hareke Yıldızı', icon: '⭐', minStars: 28, color: 'text-amber-600' },
    { title: 'Kaide Ustası', icon: '🕌', minStars: 45, color: 'text-indigo-600' },
    { title: "Kur'an Şampiyonu", icon: '👑', minStars: 60, color: 'text-purple-600' }
];

export function getPlayerRank(totalStars: number): PlayerRank {
    let current = PLAYER_RANKS[0];
    for (const rank of PLAYER_RANKS) {
        if (totalStars >= rank.minStars) current = rank;
    }
    return current;
}

// 5 Tematik Diyar (Kolaydan Zora)
export const ADVENTURE_ISLANDS: AdventureIsland[] = [
    {
        id: 1,
        name: "1. Diyar: Harfler Sahili",
        shortName: "Harfler Sahili",
        subtitle: "Elif'ten Ye'ye 28 Temel Kur'an Harfini Azar Azar Keşfet (Adım 1 - 9)",
        icon: "🏝️",
        themeColor: "sky",
        gradient: "from-sky-500 via-cyan-500 to-blue-600",
        nodeBg: "bg-sky-500 border-sky-700",
        nodeShadow: "shadow-[0_6px_0_#0369a1]",
        badgeBg: "bg-sky-100 text-sky-800 border-sky-300",
        stages: [1, 2, 3, 4, 5, 6, 7, 8, 9]
    },
    {
        id: 2,
        name: "2. Diyar: Harekeler Vadisi",
        shortName: "Harekeler Vadisi",
        subtitle: "Üstün, Esre ve Ötre ile Harfleri Kelimeye Dönüştür (Adım 10 - 16)",
        icon: "🌿",
        themeColor: "emerald",
        gradient: "from-emerald-500 via-teal-500 to-green-600",
        nodeBg: "bg-emerald-500 border-emerald-700",
        nodeShadow: "shadow-[0_6px_0_#047857]",
        badgeBg: "bg-emerald-100 text-emerald-800 border-emerald-300",
        stages: [10, 11, 12, 13, 14, 15, 16]
    },
    {
        id: 3,
        name: "3. Diyar: Bitişme & Med Ormanı",
        shortName: "Med Ormanı",
        subtitle: "Harflerin Bitişme Halleri ve Uzatma (Med) Kuralları (Adım 17 - 19)",
        icon: "🌲",
        themeColor: "teal",
        gradient: "from-teal-500 via-emerald-600 to-cyan-700",
        nodeBg: "bg-teal-500 border-teal-700",
        nodeShadow: "shadow-[0_6px_0_#0f766e]",
        badgeBg: "bg-teal-100 text-teal-800 border-teal-300",
        stages: [17, 18, 19]
    },
    {
        id: 4,
        name: "4. Diyar: Cezm & Şedde Kalesi",
        shortName: "Cezm & Şedde",
        subtitle: "Sükun ile Tutturma ve Şedde ile Çift Vurgu Gücü (Adım 20 - 21)",
        icon: "🏰",
        themeColor: "amber",
        gradient: "from-amber-500 via-orange-500 to-rose-500",
        nodeBg: "bg-amber-500 border-amber-700",
        nodeShadow: "shadow-[0_6px_0_#b45309]",
        badgeBg: "bg-amber-100 text-amber-800 border-amber-300",
        stages: [20, 21]
    },
    {
        id: 5,
        name: "5. Diyar: Tenvin & Kur'an Zirvesi",
        shortName: "Kur'an Zirvesi",
        subtitle: "Tenvinler, İleri Kaideler ve Büyük Şampiyonluk Sınavı (Adım 22 - 24)",
        icon: "👑",
        themeColor: "purple",
        gradient: "from-violet-600 via-purple-600 to-fuchsia-600",
        nodeBg: "bg-purple-600 border-purple-800",
        nodeShadow: "shadow-[0_6px_0_#6b21a8]",
        badgeBg: "bg-purple-100 text-purple-800 border-purple-300",
        stages: [22, 23, 24]
    }
];

// 24 Aşamalı Kolaydan Zora Öğrenme Yolculuğu
export const ADVENTURE_STAGES: AdventureStage[] = [
    // ──────── DİYAR 1: HARFLER SAHİLİ (1 - 9) ────────
    {
        id: 1,
        title: "Elif, Be, Te ve Peltek Se",
        shortTitle: "Elif - Se",
        desc: "İlk 4 harfi tanı; nokta sayısına ve yerine dikkat et!",
        difficulty: 'kolay',
        hasExactReading: true,
        passingScorePercent: 80,
        requiredRepeats: 3,
        badgeId: "badge_1",
        badgeName: "İlk Filiz",
        badgeIcon: "🌱",
        islandId: 1,
        islandName: "Harfler Sahili",
        items: [
            { id: '1', name: 'Elif', imgSrc: '/elifba/dosyalar/1.png', audSrc: '/elifba/dosyalar/1.mp3', arabic: 'ا', tip: 'Dümdüz bir çubuk gibidir, noktasızdır. "E" sesiyle başlar.' },
            { id: '2', name: 'Be', imgSrc: '/elifba/dosyalar/2.png', audSrc: '/elifba/dosyalar/2.mp3', arabic: 'ب', tip: 'Tekneye benzer, altında TEK noktası vardır. Dudakları birleştirip "Be" de!' },
            { id: '3', name: 'Te', imgSrc: '/elifba/dosyalar/3.png', audSrc: '/elifba/dosyalar/3.mp3', arabic: 'ت', tip: 'Be’ye benzer ama İKİ noktası üstündedir. İki gözü yukarıda gibi düşün!' },
            { id: '4', name: 'Peltek Se', imgSrc: '/elifba/dosyalar/4.png', audSrc: '/elifba/dosyalar/4.mp3', arabic: 'ث', tip: 'Üstünde ÜÇ nokta vardır. Dil ucunu üst dişlere hafifçe değdirip peltek "Se" de!' }
        ]
    },
    {
        id: 2,
        title: "Cim, Ha, Hı ve Dal",
        shortTitle: "Cim - Dal",
        desc: "Kardeş harfler Cim-Ha-Hı ve köşeli Dal harfi!",
        difficulty: 'kolay',
        hasExactReading: true,
        passingScorePercent: 80,
        requiredRepeats: 3,
        badgeId: "badge_2",
        badgeName: "Nokta Avcısı",
        badgeIcon: "🔍",
        islandId: 1,
        islandName: "Harfler Sahili",
        reviewPoolIds: [1],
        items: [
            { id: '5', name: 'Cim', imgSrc: '/elifba/dosyalar/5.png', audSrc: '/elifba/dosyalar/5.mp3', arabic: 'ج', tip: 'Karnının ortasında TEK noktası vardır. "C" sesi verir.' },
            { id: '6', name: 'Ha', imgSrc: '/elifba/dosyalar/6.png', audSrc: '/elifba/dosyalar/6.mp3', arabic: 'ح', tip: 'Cim’in kardeşidir ama HİÇ noktası yoktur! Boğazın ortasından temiz "Ha" de.' },
            { id: '7', name: 'Hı', imgSrc: '/elifba/dosyalar/7.png', audSrc: '/elifba/dosyalar/7.mp3', arabic: 'خ', tip: 'Noktası TEPESİNDEDİR! Boğazdan hafif hırıltılı ve kalın "Hı" çıkar.' },
            { id: '8', name: 'Dal', imgSrc: '/elifba/dosyalar/8.png', audSrc: '/elifba/dosyalar/8.mp3', arabic: 'د', tip: 'Noktasız, dirsek gibi kıvrık bir harftir. Yumuşak "D" sesi verir.' }
        ]
    },
    {
        id: 3,
        title: "Peltek Zel, Ra, Ze ve Sin",
        shortTitle: "Zel - Sin",
        desc: "Peltek ve keskin sesler ile dişli Sin harfini ayırt et!",
        difficulty: 'kolay',
        hasExactReading: true,
        passingScorePercent: 80,
        requiredRepeats: 3,
        badgeId: "badge_3",
        badgeName: "Ses Kaşifi",
        badgeIcon: "⚡",
        islandId: 1,
        islandName: "Harfler Sahili",
        reviewPoolIds: [1, 2],
        items: [
            { id: '9', name: 'Peltek Zel', imgSrc: '/elifba/dosyalar/9.png', audSrc: '/elifba/dosyalar/9.mp3', arabic: 'ذ', tip: 'Dal’a benzer ama üstünde nokta vardır. Dil ucunu dişlere değdirip peltek "Zel" de!' },
            { id: '10', name: 'Ra', imgSrc: '/elifba/dosyalar/10.png', audSrc: '/elifba/dosyalar/10.mp3', arabic: 'ر', tip: 'Kızak gibi kayar, noktasızdır. Dil ucuyla "Ra" şeklinde okunur.' },
            { id: '11', name: 'Ze', imgSrc: '/elifba/dosyalar/11.png', audSrc: '/elifba/dosyalar/11.mp3', arabic: 'ز', tip: 'Ra’nın noktalısıdır! Arı vızıltısı gibi keskin "Ze" sesi çıkar.' },
            { id: '12', name: 'Sin', imgSrc: '/elifba/dosyalar/12.png', audSrc: '/elifba/dosyalar/12.mp3', arabic: 'س', tip: 'Üç küçük dişi ve büyük çanağı vardır, noktasızdır. İnce "Sin" sesi!' }
        ]
    },
    {
        id: 4,
        title: "🏆 Kontrol Kapısı: İlk 12 Harf",
        shortTitle: "İlk 12 Harf Sınavı",
        desc: "Öğrendiğin ilk 12 harfi karıştırmadan tanıdığını kanıtla!",
        difficulty: 'orta',
        isGate: true,
        hasExactReading: true,
        passingScorePercent: 80,
        requiredRepeats: 1,
        badgeId: "badge_4",
        badgeName: "İlk Kapı Muhafızı",
        badgeIcon: "🛡️",
        islandId: 1,
        islandName: "Harfler Sahili",
        items: [
            { id: '2', name: 'Be', imgSrc: '/elifba/dosyalar/2.png', audSrc: '/elifba/dosyalar/2.mp3', arabic: 'ب', tip: 'Tek nokta altta: Be' },
            { id: '3', name: 'Te', imgSrc: '/elifba/dosyalar/3.png', audSrc: '/elifba/dosyalar/3.mp3', arabic: 'ت', tip: 'İki nokta üstte: Te' },
            { id: '4', name: 'Peltek Se', imgSrc: '/elifba/dosyalar/4.png', audSrc: '/elifba/dosyalar/4.mp3', arabic: 'ث', tip: 'Üç nokta üstte: Peltek Se' },
            { id: '5', name: 'Cim', imgSrc: '/elifba/dosyalar/5.png', audSrc: '/elifba/dosyalar/5.mp3', arabic: 'ج', tip: 'Nokta karnında: Cim' },
            { id: '6', name: 'Ha', imgSrc: '/elifba/dosyalar/6.png', audSrc: '/elifba/dosyalar/6.mp3', arabic: 'ح', tip: 'Noktasız boğaz harfi: Ha' },
            { id: '7', name: 'Hı', imgSrc: '/elifba/dosyalar/7.png', audSrc: '/elifba/dosyalar/7.mp3', arabic: 'خ', tip: 'Nokta tepesinde hırıltılı: Hı' },
            { id: '8', name: 'Dal', imgSrc: '/elifba/dosyalar/8.png', audSrc: '/elifba/dosyalar/8.mp3', arabic: 'د', tip: 'Noktasız dirsek: Dal' },
            { id: '9', name: 'Peltek Zel', imgSrc: '/elifba/dosyalar/9.png', audSrc: '/elifba/dosyalar/9.mp3', arabic: 'ذ', tip: 'Üstü noktalı dirsek: Peltek Zel' },
            { id: '10', name: 'Ra', imgSrc: '/elifba/dosyalar/10.png', audSrc: '/elifba/dosyalar/10.mp3', arabic: 'ر', tip: 'Noktasız kızak: Ra' },
            { id: '11', name: 'Ze', imgSrc: '/elifba/dosyalar/11.png', audSrc: '/elifba/dosyalar/11.mp3', arabic: 'ز', tip: 'Üstü noktalı kızak: Ze' },
            { id: '12', name: 'Sin', imgSrc: '/elifba/dosyalar/12.png', audSrc: '/elifba/dosyalar/12.mp3', arabic: 'س', tip: 'Noktasız üç diş: Sin' }
        ]
    },
    {
        id: 5,
        title: "Şın, Sad, Dad ve Tı",
        shortTitle: "Şın - Tı",
        desc: "Kalın ve ıslıklı Kur'an harfleriyle tanış!",
        difficulty: 'orta',
        hasExactReading: true,
        passingScorePercent: 80,
        requiredRepeats: 3,
        badgeId: "badge_5",
        badgeName: "Kalın Ses Ustası",
        badgeIcon: "🌊",
        islandId: 1,
        islandName: "Harfler Sahili",
        reviewPoolIds: [3],
        items: [
            { id: '13', name: 'Şın', imgSrc: '/elifba/dosyalar/13.png', audSrc: '/elifba/dosyalar/13.mp3', arabic: 'ش', tip: 'Sin’e benzer ama üstünde ÜÇ noktası vardır. "Ş" sesi çıkar.' },
            { id: '14', name: 'Sad', imgSrc: '/elifba/dosyalar/14.png', audSrc: '/elifba/dosyalar/14.mp3', arabic: 'ص', tip: 'Balon gibi yuvarlak gövdeli, noktasız KALIN "Sa" sesidir.' },
            { id: '15', name: 'Dad', imgSrc: '/elifba/dosyalar/15.png', audSrc: '/elifba/dosyalar/15.mp3', arabic: 'ض', tip: 'Sad’ın tepesi noktalısıdır! Arapçaya özgü kalın "Dad" sesi.' },
            { id: '16', name: 'Tı', imgSrc: '/elifba/dosyalar/16.png', audSrc: '/elifba/dosyalar/16.mp3', arabic: 'ط', tip: 'Çubuklu şapka gibidir, noktasız KALIN "Ta" sesi verir.' }
        ]
    },
    {
        id: 6,
        title: "Peltek Zı, Ayn, Gayn ve Fe",
        shortTitle: "Zı - Fe",
        desc: "Boğaz derinliği ve kalın peltek Zı harfini öğren!",
        difficulty: 'orta',
        hasExactReading: true,
        passingScorePercent: 80,
        requiredRepeats: 3,
        badgeId: "badge_6",
        badgeName: "Mahreç Yıldızı",
        badgeIcon: "🌸",
        islandId: 1,
        islandName: "Harfler Sahili",
        reviewPoolIds: [5],
        items: [
            { id: '17', name: 'Peltek Zı', imgSrc: '/elifba/dosyalar/17.png', audSrc: '/elifba/dosyalar/17.mp3', arabic: 'ظ', tip: 'Tı harfine benzer ama üstünde nokta vardır. Kalın peltek "Za" de!' },
            { id: '18', name: 'Ayn', imgSrc: '/elifba/dosyalar/18.png', audSrc: '/elifba/dosyalar/18.mp3', arabic: 'ع', tip: 'Ters 3 rakamına benzer, noktasızdır. Boğaz ortasını hafif sıkarak okunur.' },
            { id: '19', name: 'Gayn', imgSrc: '/elifba/dosyalar/19.png', audSrc: '/elifba/dosyalar/19.mp3', arabic: 'غ', tip: 'Ayn’ın tepesi noktalısıdır! Kalın ve yumuşak "Ğa" sesi verir.' },
            { id: '20', name: 'Fe', imgSrc: '/elifba/dosyalar/20.png', audSrc: '/elifba/dosyalar/20.mp3', arabic: 'ف', tip: 'Tek gözlüdür ve üzerinde TEK nokta vardır. Üst dişlerle alt dudaktan "F" de.' }
        ]
    },
    {
        id: 7,
        title: "Kaf, Kef, Lam ve Mim",
        shortTitle: "Kaf - Mim",
        desc: "Kalın Kaf ve ince Kef farkını mükemmel kavra!",
        difficulty: 'orta',
        hasExactReading: true,
        passingScorePercent: 80,
        requiredRepeats: 3,
        badgeId: "badge_7",
        badgeName: "Bilgi Kalesi",
        badgeIcon: "💎",
        islandId: 1,
        islandName: "Harfler Sahili",
        reviewPoolIds: [6],
        items: [
            { id: '21', name: 'Kaf', imgSrc: '/elifba/dosyalar/21.png', audSrc: '/elifba/dosyalar/21.mp3', arabic: 'ق', tip: 'İki noktası vardır, çanağı derindir. Boğaz kökünden KALIN "Ka" çıkar.' },
            { id: '22', name: 'Kef', imgSrc: '/elifba/dosyalar/22.png', audSrc: '/elifba/dosyalar/22.mp3', arabic: 'ك', tip: 'İçinde küçük "S" işareti bulunur. İnce ve nazik "Ke" sesi verir.' },
            { id: '23', name: 'Lam', imgSrc: '/elifba/dosyalar/23.png', audSrc: '/elifba/dosyalar/23.mp3', arabic: 'ل', tip: 'Baston şeklindedir, noktasızdır. Bildiğimiz "L" sesi!' },
            { id: '24', name: 'Mim', imgSrc: '/elifba/dosyalar/24.png', audSrc: '/elifba/dosyalar/24.mp3', arabic: 'م', tip: 'Yuvarlak başlı ve aşağı inen kuyrukludur. Dudaklardan "M" sesi!' }
        ]
    },
    {
        id: 8,
        title: "Nun, Vav, He, Lâmelif ve Ye",
        shortTitle: "Nun - Ye",
        desc: "Son harfleri de öğrenerek alfabeyi tamamla!",
        difficulty: 'orta',
        hasExactReading: true,
        passingScorePercent: 80,
        requiredRepeats: 3,
        badgeId: "badge_8",
        badgeName: "Alfabe Kaşifi",
        badgeIcon: "🅰️",
        islandId: 1,
        islandName: "Harfler Sahili",
        reviewPoolIds: [7],
        items: [
            { id: '25', name: 'Nun', imgSrc: '/elifba/dosyalar/25.png', audSrc: '/elifba/dosyalar/25.mp3', arabic: 'ن', tip: 'Çanak içinde TEK nokta taşır. "N" sesi verir.' },
            { id: '26', name: 'Vav', imgSrc: '/elifba/dosyalar/26.png', audSrc: '/elifba/dosyalar/26.mp3', arabic: 'و', tip: '9 rakamına benzer. Dudakları öne uzatarak "V" de!' },
            { id: '27', name: 'He', imgSrc: '/elifba/dosyalar/27.png', audSrc: '/elifba/dosyalar/27.mp3', arabic: 'ه', tip: 'Gözlüklü veya fiyonk gibidir. Göğüsten gelen yumuşak "H" sesi!' },
            { id: '28', name: 'Lâmelif', imgSrc: '/elifba/dosyalar/28.png', audSrc: '/elifba/dosyalar/28.mp3', arabic: 'لا', tip: 'Lam (ل) ve Elif (ا) harflerinin kucaklaşmış halidir.' },
            { id: '29', name: 'Ye', imgSrc: '/elifba/dosyalar/29.png', audSrc: '/elifba/dosyalar/29.mp3', arabic: 'ي', tip: 'Ördeğe benzer, altında İKİ yan yana nokta bulunur. "Y" sesi verir.' }
        ]
    },
    {
        id: 9,
        title: "🏆 Diyar 1 Şampiyonu: Tüm Harfler",
        shortTitle: "28 Harf Finali",
        desc: "Benzer harfleri (Kalın/İnce, Noktalı/Noktasız) ayırt etme sınavı!",
        difficulty: 'ustalik',
        isGate: true,
        hasExactReading: true,
        passingScorePercent: 85,
        requiredRepeats: 1,
        badgeId: "badge_9",
        badgeName: "Harfler Sahili Fatihi",
        badgeIcon: "🏝️",
        islandId: 1,
        islandName: "Harfler Sahili",
        items: [
            { id: '13', name: 'Şın', imgSrc: '/elifba/dosyalar/13.png', audSrc: '/elifba/dosyalar/13.mp3', arabic: 'ش', tip: 'Üç noktalı: Şın' },
            { id: '14', name: 'Sad', imgSrc: '/elifba/dosyalar/14.png', audSrc: '/elifba/dosyalar/14.mp3', arabic: 'ص', tip: 'Noktasız kalın: Sad' },
            { id: '15', name: 'Dad', imgSrc: '/elifba/dosyalar/15.png', audSrc: '/elifba/dosyalar/15.mp3', arabic: 'ض', tip: 'Üstü noktalı kalın: Dad' },
            { id: '16', name: 'Tı', imgSrc: '/elifba/dosyalar/16.png', audSrc: '/elifba/dosyalar/16.mp3', arabic: 'ط', tip: 'Noktasız kalın: Tı' },
            { id: '17', name: 'Peltek Zı', imgSrc: '/elifba/dosyalar/17.png', audSrc: '/elifba/dosyalar/17.mp3', arabic: 'ظ', tip: 'Noktalı kalın peltek: Zı' },
            { id: '18', name: 'Ayn', imgSrc: '/elifba/dosyalar/18.png', audSrc: '/elifba/dosyalar/18.mp3', arabic: 'ع', tip: 'Noktasız boğaz: Ayn' },
            { id: '19', name: 'Gayn', imgSrc: '/elifba/dosyalar/19.png', audSrc: '/elifba/dosyalar/19.mp3', arabic: 'غ', tip: 'Noktalı: Gayn' },
            { id: '21', name: 'Kaf', imgSrc: '/elifba/dosyalar/21.png', audSrc: '/elifba/dosyalar/21.mp3', arabic: 'ق', tip: 'İki noktalı kalın: Kaf' },
            { id: '22', name: 'Kef', imgSrc: '/elifba/dosyalar/22.png', audSrc: '/elifba/dosyalar/22.mp3', arabic: 'ك', tip: 'İnce: Kef' },
            { id: '25', name: 'Nun', imgSrc: '/elifba/dosyalar/25.png', audSrc: '/elifba/dosyalar/25.mp3', arabic: 'ن', tip: 'Üstünde tek nokta: Nun' },
            { id: '29', name: 'Ye', imgSrc: '/elifba/dosyalar/29.png', audSrc: '/elifba/dosyalar/29.mp3', arabic: 'ي', tip: 'Altında iki nokta: Ye' }
        ]
    },

    // ──────── DİYAR 2: HAREKELER VADİSİ (10 - 16) ────────
    {
        id: 10,
        title: "Üstün Harekesi (E - A Sesi)",
        shortTitle: "Üstün Harfler",
        desc: "Harfin üstündeki eğik çizgi ince harfi 'E', kalın harfi 'A' okutur!",
        difficulty: 'kolay',
        hasExactReading: true,
        passingScorePercent: 80,
        requiredRepeats: 3,
        badgeId: "badge_10",
        badgeName: "Üstün Kahramanı",
        badgeIcon: "🎈",
        islandId: 2,
        islandName: "Harekeler Vadisi",
        items: [
            { id: 'u1', name: 'E', imgSrc: '/elifba/ustun1/ustun1/1.png', audSrc: '/elifba/ustun1/ustun1/1.m4a', arabic: 'اَ', tip: 'Elif üzerinde üstün: İnce "E"' },
            { id: 'u2', name: 'Be', imgSrc: '/elifba/ustun1/ustun1/2.png', audSrc: '/elifba/ustun1/ustun1/2.m4a', arabic: 'بَ', tip: 'Be üzerinde üstün: "Be"' },
            { id: 'u3', name: 'Te', imgSrc: '/elifba/ustun1/ustun1/3.png', audSrc: '/elifba/ustun1/ustun1/3.m4a', arabic: 'تَ', tip: 'Te üzerinde üstün: "Te"' },
            { id: 'u5', name: 'Ce', imgSrc: '/elifba/ustun1/ustun1/5.png', audSrc: '/elifba/ustun1/ustun1/5.m4a', arabic: 'جَ', tip: 'Cim üzerinde üstün: "Ce"' },
            { id: 'u10', name: 'Ra', imgSrc: '/elifba/ustun1/ustun1/10.png', audSrc: '/elifba/ustun1/ustun1/10.m4a', arabic: 'رَ', tip: 'Ra harfi üstünle KALIN okunur: "Ra"!' },
            { id: 'u14', name: 'Sa', imgSrc: '/elifba/ustun1/ustun1/14.png', audSrc: '/elifba/ustun1/ustun1/14.m4a', arabic: 'صَ', tip: 'Kalın Sad üstünle "Sa" diye okunur!' },
            { id: 'u21', name: 'Ka', imgSrc: '/elifba/ustun1/ustun1/21.png', audSrc: '/elifba/ustun1/ustun1/21.m4a', arabic: 'قَ', tip: 'Kalın Kaf üstünle "Ka" diye okunur!' },
            { id: 'u23', name: 'Le', imgSrc: '/elifba/ustun1/ustun1/23.png', audSrc: '/elifba/ustun1/ustun1/23.m4a', arabic: 'لَ', tip: 'İnce Lam üstünle "Le" diye okunur!' }
        ]
    },
    {
        id: 11,
        title: "İlk Kelimeler: Üstünlü Kelimeler",
        shortTitle: "Üstün Kelimeler",
        desc: "3 harfi üstünle birbirine bağlayarak ilk Kur'an kelimelerini oku!",
        difficulty: 'orta',
        hasExactReading: true,
        passingScorePercent: 80,
        requiredRepeats: 3,
        badgeId: "badge_11",
        badgeName: "İlk Kelime Ustası",
        badgeIcon: "📖",
        islandId: 2,
        islandName: "Harekeler Vadisi",
        reviewPoolIds: [10],
        items: [
            { id: 'darabe', name: 'Darabe', imgSrc: '/elifba/ustun/ustun/darabe.png', audSrc: '/elifba/ustun/ustun/darabe.mp3', arabic: 'ضَرَبَ', tip: 'Dad (Da) + Ra (Ra) + Be (Be) -> Darabe' },
            { id: 'kesebe', name: 'Kesebe', imgSrc: '/elifba/ustun/ustun/kesebe.png', audSrc: '/elifba/ustun/ustun/kesebe.mp3', arabic: 'كَسَبَ', tip: 'Kef (Ke) + Sin (Se) + Be (Be) -> Kesebe' },
            { id: 'nezele', name: 'Nezele', imgSrc: '/elifba/ustun/ustun/nezele.png', audSrc: '/elifba/ustun/ustun/nezele.mp3', arabic: 'نَزَلَ', tip: 'Nun (Ne) + Ze (Ze) + Lam (Le) -> Nezele' },
            { id: 'zehebe', name: 'Zehebe', imgSrc: '/elifba/ustun/ustun/zehebe.png', audSrc: '/elifba/ustun/ustun/zehebe.mp3', arabic: 'ذَهَبَ', tip: 'Peltek Zel (Ze) + He (He) + Be (Be) -> Zehebe' },
            { id: 'vecede', name: 'Vecede', imgSrc: '/elifba/ustun/ustun/vecede.png', audSrc: '/elifba/ustun/ustun/vecede.mp3', arabic: 'وَجَدَ', tip: 'Vav (Ve) + Cim (Ce) + Dal (De) -> Vecede' },
            { id: 'emera', name: 'Emera', imgSrc: '/elifba/ustun/ustun/emera.png', audSrc: '/elifba/ustun/ustun/emera.mp3', arabic: 'اَمَرَ', tip: 'Elif (E) + Mim (Me) + Ra (Ra) -> Emera' },
            { id: 'sadeka', name: 'Sadaka', imgSrc: '/elifba/ustun/ustun/sadeka.png', audSrc: '/elifba/ustun/ustun/sadeka.mp3', arabic: 'صَدَقَ', tip: 'Sad (Sa) + Dal (De) + Kaf (Ka) -> Sadaka' },
            { id: 'ceale', name: 'Ceale', imgSrc: '/elifba/ustun/ustun/ceale.png', audSrc: '/elifba/ustun/ustun/ceale.mp3', arabic: 'جَعَلَ', tip: 'Cim (Ce) + Ayn (A) + Lam (Le) -> Ceale' }
        ]
    },
    {
        id: 12,
        title: "Esre Harekesi (İ - I Sesi)",
        shortTitle: "Esre Harfler",
        desc: "Harfin ALTINA yazılan çizgi ince harfi 'İ', kalın harfi 'I' okutur!",
        difficulty: 'kolay',
        hasExactReading: true,
        passingScorePercent: 80,
        requiredRepeats: 3,
        badgeId: "badge_12",
        badgeName: "Esre Yıldızı",
        badgeIcon: "💧",
        islandId: 2,
        islandName: "Harekeler Vadisi",
        items: [
            { id: 'e1', name: 'İ', imgSrc: '/elifba/esre1/esre1/1.png', audSrc: '/elifba/esre1/esre1/1.m4a', arabic: 'اِ', tip: 'Çizgi harfin altında: "İ" sesi!' },
            { id: 'e2', name: 'Bi', imgSrc: '/elifba/esre1/esre1/2.png', audSrc: '/elifba/esre1/esre1/2.m4a', arabic: 'بِ', tip: 'Be altında esre: "Bi"' },
            { id: 'e3', name: 'Ti', imgSrc: '/elifba/esre1/esre1/3.png', audSrc: '/elifba/esre1/esre1/3.m4a', arabic: 'تِ', tip: 'Te altında esre: "Ti"' },
            { id: 'e5', name: 'Ci', imgSrc: '/elifba/esre1/esre1/5.png', audSrc: '/elifba/esre1/esre1/5.m4a', arabic: 'جِ', tip: 'Cim altında esre: "Ci"' },
            { id: 'e8', name: 'Di', imgSrc: '/elifba/esre1/esre1/8.png', audSrc: '/elifba/esre1/esre1/8.m4a', arabic: 'دِ', tip: 'Dal altında esre: "Di"' },
            { id: 'e10', name: 'Ri', imgSrc: '/elifba/esre1/esre1/10.png', audSrc: '/elifba/esre1/esre1/10.m4a', arabic: 'رِ', tip: 'Ra esreli olduğunda ince "Ri" okunur!' },
            { id: 'e14', name: 'Sı', imgSrc: '/elifba/esre1/esre1/14.png', audSrc: '/elifba/esre1/esre1/14.m4a', arabic: 'صِ', tip: 'Kalın Sad esreyle "Sı" sesine yaklaşır!' },
            { id: 'e23', name: 'Li', imgSrc: '/elifba/esre1/esre1/23.png', audSrc: '/elifba/esre1/esre1/23.m4a', arabic: 'لِ', tip: 'Lam altında esre: "Li"' }
        ]
    },
    {
        id: 13,
        title: "Esreli Kelimeler Okuma",
        shortTitle: "Esre Kelimeler",
        desc: "Sesi dikkatle dinle, harflerin üstündeki ve altındaki harekeleri takip et!",
        difficulty: 'orta',
        hasExactReading: false,
        passingScorePercent: 80,
        requiredRepeats: 3,
        badgeId: "badge_13",
        badgeName: "Esre Bilgini",
        badgeIcon: "🌊",
        islandId: 2,
        islandName: "Harekeler Vadisi",
        items: [
            { id: 'ew1', name: 'Esreli Kelime #1', imgSrc: '/elifba/esre/esre/esre1.png', audSrc: '/elifba/esre/esre/esre1.mp3', tip: 'Alttaki çizgiye dikkat ederek harfleri birleştir!' },
            { id: 'ew2', name: 'Esreli Kelime #2', imgSrc: '/elifba/esre/esre/esre2.png', audSrc: '/elifba/esre/esre/esre2.mp3', tip: 'Sesi dinle ve görseldeki hareke yerlerini takip et.' },
            { id: 'ew3', name: 'Esreli Kelime #3', imgSrc: '/elifba/esre/esre/esre3.png', audSrc: '/elifba/esre/esre/esre3.mp3', tip: 'Kalın ve ince harflerin "i/ı" geçişlerine dikkat et!' },
            { id: 'ew4', name: 'Esreli Kelime #4', imgSrc: '/elifba/esre/esre/esre4.png', audSrc: '/elifba/esre/esre/esre4.mp3', tip: 'Heceleri tek tek oku, sonra hızlan.' },
            { id: 'ew5', name: 'Esreli Kelime #5', imgSrc: '/elifba/esre/esre/esre5.png', audSrc: '/elifba/esre/esre/esre5.mp3', tip: 'Çok güzel! Esre her zaman harfin altındadır.' },
            { id: 'ew6', name: 'Esreli Kelime #6', imgSrc: '/elifba/esre/esre/esre6.png', audSrc: '/elifba/esre/esre/esre6.mp3', tip: 'Sesi tekrar dinleyip gözünle kelimeyi takip et.' }
        ]
    },
    {
        id: 14,
        title: "Ötre Harekesi (Ü - U Sesi)",
        shortTitle: "Ötre Harfler",
        desc: "Harfin üzerindeki minik 'vav' işareti dudakları büzerek 'Ü/U' okutur!",
        difficulty: 'kolay',
        hasExactReading: true,
        passingScorePercent: 80,
        requiredRepeats: 3,
        badgeId: "badge_14",
        badgeName: "Ötre Ustası",
        badgeIcon: "🍩",
        islandId: 2,
        islandName: "Harekeler Vadisi",
        items: [
            { id: 'o1', name: 'Ü', imgSrc: '/elifba/otre1/otre1/1.png', audSrc: '/elifba/otre1/otre1/1.m4a', arabic: 'اُ', tip: 'Elif üzerinde ötre: "Ü" sesi!' },
            { id: 'o2', name: 'Bü', imgSrc: '/elifba/otre1/otre1/2.png', audSrc: '/elifba/otre1/otre1/2.m4a', arabic: 'بُ', tip: 'Be üzerinde ötre: "Bü"' },
            { id: 'o3', name: 'Tü', imgSrc: '/elifba/otre1/otre1/3.png', audSrc: '/elifba/otre1/otre1/3.m4a', arabic: 'تُ', tip: 'Te üzerinde ötre: "Tü"' },
            { id: 'o5', name: 'Cü', imgSrc: '/elifba/otre1/otre1/5.png', audSrc: '/elifba/otre1/otre1/5.m4a', arabic: 'جُ', tip: 'Cim üzerinde ötre: "Cü"' },
            { id: 'o8', name: 'Dü', imgSrc: '/elifba/otre1/otre1/8.png', audSrc: '/elifba/otre1/otre1/8.m4a', arabic: 'دُ', tip: 'Dal üzerinde ötre: "Dü"' },
            { id: 'o10', name: 'Ru', imgSrc: '/elifba/otre1/otre1/10.png', audSrc: '/elifba/otre1/otre1/10.m4a', arabic: 'رُ', tip: 'Ra harfi ötreyle KALIN "Ru" okunur!' },
            { id: 'o14', name: 'Su', imgSrc: '/elifba/otre1/otre1/14.png', audSrc: '/elifba/otre1/otre1/14.m4a', arabic: 'صُ', tip: 'Kalın Sad ötreyle "Su" diye okunur!' },
            { id: 'o23', name: 'Lü', imgSrc: '/elifba/otre1/otre1/23.png', audSrc: '/elifba/otre1/otre1/23.m4a', arabic: 'لُ', tip: 'Lam üzerinde ötre: "Lü"' }
        ]
    },
    {
        id: 15,
        title: "Ötreli & Karma Kelimeler",
        shortTitle: "Ötre Kelimeler",
        desc: "Üstün, esre ve ötrenin bir arada bulunduğu kelimeleri akıcı oku!",
        difficulty: 'orta',
        hasExactReading: false,
        passingScorePercent: 80,
        requiredRepeats: 3,
        badgeId: "badge_15",
        badgeName: "Üç Hareke Bilgini",
        badgeIcon: "🧁",
        islandId: 2,
        islandName: "Harekeler Vadisi",
        items: [
            { id: 'ow1', name: 'Ötreli Kelime #1', imgSrc: '/elifba/otre/otre/otre1.png', audSrc: '/elifba/otre/otre/otre1.mp3', tip: 'Küçük vav (ötre) gördüğün yerde dudaklarını topla!' },
            { id: 'ow2', name: 'Ötreli Kelime #2', imgSrc: '/elifba/otre/otre/otre2.png', audSrc: '/elifba/otre/otre/otre2.mp3', tip: 'Sesi dinle ve hangi harfin ötre, hangisinin esre/üstün olduğuna bak.' },
            { id: 'ow3', name: 'Ötreli Kelime #3', imgSrc: '/elifba/otre/otre/otre3.png', audSrc: '/elifba/otre/otre/otre3.mp3', tip: 'Üç harekeyi hızlıca seçebilmek Kur\'an okumanın anahtarıdır!' },
            { id: 'ow4', name: 'Ötreli Kelime #4', imgSrc: '/elifba/otre/otre/otre4.png', audSrc: '/elifba/otre/otre/otre4.mp3', tip: 'Hızlıca söyleyip tekrar et!' },
            { id: 'ow5', name: 'Ötreli Kelime #5', imgSrc: '/elifba/otre/otre/otre5.png', audSrc: '/elifba/otre/otre/otre5.mp3', tip: 'Her harfin kendi harekesini bozmadan oku.' },
            { id: 'ow6', name: 'Ötreli Kelime #6', imgSrc: '/elifba/otre/otre/otre6.png', audSrc: '/elifba/otre/otre/otre6.mp3', tip: 'Harika! Dinle ve aynı tonlamayla tekrar et.' }
        ]
    },
    {
        id: 16,
        title: "🏆 Hareke Ustası Kapısı: Be - Bi - Bü",
        shortTitle: "Hareke Ayırt Etme",
        desc: "Aynı harfi Üstün, Esre ve Ötre ile birbirinden ayırt edebiliyor musun?",
        difficulty: 'ustalik',
        isGate: true,
        hasExactReading: true,
        passingScorePercent: 85,
        requiredRepeats: 1,
        badgeId: "badge_16",
        badgeName: "Harekeler Vadisi Fatihi",
        badgeIcon: "🌿",
        islandId: 2,
        islandName: "Harekeler Vadisi",
        items: [
            { id: 'u2', name: 'Be', imgSrc: '/elifba/ustun1/ustun1/2.png', audSrc: '/elifba/ustun1/ustun1/2.m4a', arabic: 'بَ', tip: 'Üstteki çizgi: Be' },
            { id: 'e2', name: 'Bi', imgSrc: '/elifba/esre1/esre1/2.png', audSrc: '/elifba/esre1/esre1/2.m4a', arabic: 'بِ', tip: 'Alttaki çizgi: Bi' },
            { id: 'o2', name: 'Bü', imgSrc: '/elifba/otre1/otre1/2.png', audSrc: '/elifba/otre1/otre1/2.m4a', arabic: 'بُ', tip: 'Üstteki kuyruk: Bü' },
            { id: 'u3', name: 'Te', imgSrc: '/elifba/ustun1/ustun1/3.png', audSrc: '/elifba/ustun1/ustun1/3.m4a', arabic: 'تَ', tip: 'Üstünlü Te: Te' },
            { id: 'e3', name: 'Ti', imgSrc: '/elifba/esre1/esre1/3.png', audSrc: '/elifba/esre1/esre1/3.m4a', arabic: 'تِ', tip: 'Esreli Te: Ti' },
            { id: 'o3', name: 'Tü', imgSrc: '/elifba/otre1/otre1/3.png', audSrc: '/elifba/otre1/otre1/3.m4a', arabic: 'تُ', tip: 'Ötreli Te: Tü' },
            { id: 'u5', name: 'Ce', imgSrc: '/elifba/ustun1/ustun1/5.png', audSrc: '/elifba/ustun1/ustun1/5.m4a', arabic: 'جَ', tip: 'Üstünlü Cim: Ce' },
            { id: 'e5', name: 'Ci', imgSrc: '/elifba/esre1/esre1/5.png', audSrc: '/elifba/esre1/esre1/5.m4a', arabic: 'جِ', tip: 'Esreli Cim: Ci' },
            { id: 'o5', name: 'Cü', imgSrc: '/elifba/otre1/otre1/5.png', audSrc: '/elifba/otre1/otre1/5.m4a', arabic: 'جُ', tip: 'Ötreli Cim: Cü' }
        ]
    },

    // ──────── DİYAR 3: BİTİŞME & MED ORMANI (17 - 19) ────────
    {
        id: 17,
        title: "Harflerin Başta, Ortada ve Sonda Halleri",
        shortTitle: "Bitişme Şekilleri",
        desc: "Kelime içinde el ele tutuşan harfleri şeklinden hemen tanı!",
        difficulty: 'orta',
        hasExactReading: true,
        passingScorePercent: 80,
        requiredRepeats: 2,
        badgeId: "badge_17",
        badgeName: "Bitişme Uzmanı",
        badgeIcon: "🤝",
        islandId: 3,
        islandName: "Bitişme & Med Ormanı",
        items: [
            { id: 'bit2', name: 'Be (Bitişme)', imgSrc: '/elifba/dosyalar/2-2.png', audSrc: '/elifba/dosyalar/2-1.mp3', tip: 'Be başta, ortada ve sonda hep ALTINDAKİ tek noktayla tanınır!' },
            { id: 'bit3', name: 'Te (Bitişme)', imgSrc: '/elifba/dosyalar/3-2.png', audSrc: '/elifba/dosyalar/3-1.mp3', tip: 'Te nerede olursa olsun ÜSTÜNDE İKİ nokta taşır.' },
            { id: 'bit5', name: 'Cim (Bitişme)', imgSrc: '/elifba/dosyalar/5-2.png', audSrc: '/elifba/dosyalar/5-1.mp3', tip: 'Cim birleşince kuyruğu gider, başının altındaki tek noktası kalır!' },
            { id: 'bit12', name: 'Sin (Bitişme)', imgSrc: '/elifba/dosyalar/12-2.png', audSrc: '/elifba/dosyalar/12-1.mp3', tip: 'Sin birleşince çanağını bırakır, 3 minik dişi kalır.' },
            { id: 'bit18', name: 'Ayn (Bitişme)', imgSrc: '/elifba/dosyalar/18-2.png', audSrc: '/elifba/dosyalar/18-1.mp3', tip: 'Ayn ortada ve sonda üçgen gibi kapanır!' },
            { id: 'bit24', name: 'Mim (Bitişme)', imgSrc: '/elifba/dosyalar/24-2.png', audSrc: '/elifba/dosyalar/24-1.mp3', tip: 'Mim hep yuvarlak küçük bir başla gösterilir.' },
            { id: 'bit27', name: 'He (Bitişme)', imgSrc: '/elifba/dosyalar/27-2.png', audSrc: '/elifba/dosyalar/27-1.mp3', tip: 'He ortada fiyonk/kelebek şeklini alır!' },
            { id: 'bit28', name: 'Ye (Bitişme)', imgSrc: '/elifba/dosyalar/28-2.png', audSrc: '/elifba/dosyalar/28-1.mp3', tip: 'Ye başta ve ortada Be’ye benzer ama ALTINDA İKİ nokta vardır!' }
        ]
    },
    {
        id: 18,
        title: "Med Harfi: Elif ile Uzatma (Â / Ê)",
        shortTitle: "Med Elif",
        desc: "Üstünlü harften sonra harekesiz Elif gelirse 1 elif miktarı (2 parmak) uzat!",
        difficulty: 'orta',
        hasExactReading: false,
        passingScorePercent: 80,
        requiredRepeats: 3,
        badgeId: "badge_18",
        badgeName: "Uzatma Ustası",
        badgeIcon: "🚀",
        islandId: 3,
        islandName: "Bitişme & Med Ormanı",
        items: [
            { id: 'me1', name: 'Med Elif #1', imgSrc: '/elifba/medelif/medelif/medelif1.png', audSrc: '/elifba/medelif/medelif/medelif1.mp3', tip: 'Harekesiz Elif önceki üstünü yukarı doğru uzatır!' },
            { id: 'me2', name: 'Med Elif #2', imgSrc: '/elifba/medelif/medelif/medelif2.png', audSrc: '/elifba/medelif/medelif/medelif2.mp3', tip: 'Sesi acele etmeden "kââ" şeklinde 1 elif miktarı çek.' },
            { id: 'me3', name: 'Med Elif #3', imgSrc: '/elifba/medelif/medelif/medelif3.png', audSrc: '/elifba/medelif/medelif/medelif3.mp3', tip: 'Elif üzerinde hiçbir hareke yoksa uzatma görevi görür.' },
            { id: 'me4', name: 'Med Elif #4', imgSrc: '/elifba/medelif/medelif/medelif4.png', audSrc: '/elifba/medelif/medelif/medelif4.mp3', tip: 'Sesi dinle ve uzatılan heceyi fark et!' },
            { id: 'me5', name: 'Med Elif #5', imgSrc: '/elifba/medelif/medelif/medelif5.png', audSrc: '/elifba/medelif/medelif/medelif5.mp3', tip: 'Kısa hecelerle uzun hece arasındaki farka kulak ver!' },
            { id: 'me6', name: 'Med Elif #6', imgSrc: '/elifba/medelif/medelif/medelif6.png', audSrc: '/elifba/medelif/medelif/medelif6.mp3', tip: 'Çok iyi! Uzatmayı abartmadan dengeli oku.' }
        ]
    },
    {
        id: 19,
        title: "Med Vav (Û) & Med Yâ (Î) ile Uzatma",
        shortTitle: "Med Vav & Yâ",
        desc: "Ötreli harfi Vav ile 'Û/Ü'; Esreli harfi Yâ ile 'Î/I' diye uzat!",
        difficulty: 'ileri',
        hasExactReading: false,
        passingScorePercent: 80,
        requiredRepeats: 3,
        badgeId: "badge_19",
        badgeName: "Med Ormanı Bilgini",
        badgeIcon: "🌲",
        islandId: 3,
        islandName: "Bitişme & Med Ormanı",
        items: [
            { id: 'mv1', name: 'Med Vav #1', imgSrc: '/elifba/medvav/medvav/medvav1.png', audSrc: '/elifba/medvav/medvav/medvav1.mp3', tip: 'Ötre + harekesiz Vav -> Dudaklar büzülerek uzatılır (Û/Ü)!' },
            { id: 'mv2', name: 'Med Vav #2', imgSrc: '/elifba/medvav/medvav/medvav2.png', audSrc: '/elifba/medvav/medvav/medvav2.mp3', tip: 'Vav harfinin üzerinde cezm veya hareke yoksa uzatır.' },
            { id: 'mv3', name: 'Med Vav #3', imgSrc: '/elifba/medvav/medvav/medvav3.png', audSrc: '/elifba/medvav/medvav/medvav3.mp3', tip: 'Uzatma miktarı bir parmağı kaldırıp indirecek kadardır.' },
            { id: 'my1', name: 'Med Yâ #1', imgSrc: '/elifba/medye/medye/medye1.png', audSrc: '/elifba/medye/medye/medye1.mp3', tip: 'Esre + harekesiz Yâ -> Aşağı doğru çekerek uzatılır (Î/I)!' },
            { id: 'my2', name: 'Med Yâ #2', imgSrc: '/elifba/medye/medye/medye2.png', audSrc: '/elifba/medye/medye/medye2.mp3', tip: 'Altında iki noktalı Yâ harekesizse esreyi uzatır.' },
            { id: 'my3', name: 'Med Yâ #3', imgSrc: '/elifba/medye/medye/medye3.png', audSrc: '/elifba/medye/medye/medye3.mp3', tip: 'Sesi dinle; uzun okunan "i" hecesini bul!' }
        ]
    },

    // ──────── DİYAR 4: CEZM & ŞEDDE KALESİ (20 - 21) ────────
    {
        id: 20,
        title: "Cezm (Sükun) ile Kapalı Heceler",
        shortTitle: "Cezm Kuralı",
        desc: "Küçük daire işareti ( ْ ) önceki harfi kendi sesine tutturur: Eb, Et, El, Em!",
        difficulty: 'ileri',
        hasExactReading: true,
        passingScorePercent: 80,
        requiredRepeats: 3,
        badgeId: "badge_20",
        badgeName: "Cezm Muhafızı",
        badgeIcon: "🔒",
        islandId: 4,
        islandName: "Cezm & Şedde Kalesi",
        items: [
            { id: 'czh1', name: 'Eb', imgSrc: '/elifba/dosyalar/1-8.png', audSrc: '/elifba/dosyalar/1-7.mp3', arabic: 'اَبْ', tip: 'E + b (dur) = "Eb"' },
            { id: 'czh2', name: 'Et', imgSrc: '/elifba/dosyalar/2-8.png', audSrc: '/elifba/dosyalar/2-7.mp3', arabic: 'اَتْ', tip: 'E + t (dur) = "Et"' },
            { id: 'czh3', name: 'Es (Peltek)', imgSrc: '/elifba/dosyalar/3-8.png', audSrc: '/elifba/dosyalar/3-7.mp3', arabic: 'اَثْ', tip: 'E + peltek s = "Es"' },
            { id: 'czh7', name: 'Ed', imgSrc: '/elifba/dosyalar/7-8.png', audSrc: '/elifba/dosyalar/7-7.mp3', arabic: 'اَدْ', tip: 'E + d = "Ed"' },
            { id: 'czh9', name: 'Er', imgSrc: '/elifba/dosyalar/9-8.png', audSrc: '/elifba/dosyalar/9-7.mp3', arabic: 'اَرْ', tip: 'E + r = "Er"' },
            { id: 'czh22', name: 'El', imgSrc: '/elifba/dosyalar/22-8.png', audSrc: '/elifba/dosyalar/22-7.mp3', arabic: 'اَلْ', tip: 'E + l = "El" (Kur\'an\'da en çok geçen hece!)' },
            { id: 'czh23', name: 'Em', imgSrc: '/elifba/dosyalar/23-8.png', audSrc: '/elifba/dosyalar/23-7.mp3', arabic: 'اَمْ', tip: 'E + m = "Em"' },
            { id: 'czh24', name: 'En', imgSrc: '/elifba/dosyalar/24-8.png', audSrc: '/elifba/dosyalar/24-7.mp3', arabic: 'اَنْ', tip: 'E + n = "En"' }
        ]
    },
    {
        id: 21,
        title: "Cezm & Şedde Kelimeleri",
        shortTitle: "Cezm & Şedde",
        desc: "Cezm ile durdur, Şedde ( ّ ) gördüğün harfi iki kez kuvvetlice oku!",
        difficulty: 'ileri',
        isGate: true,
        hasExactReading: false,
        passingScorePercent: 80,
        requiredRepeats: 3,
        badgeId: "badge_21",
        badgeName: "Kale Fatihi",
        badgeIcon: "💥",
        islandId: 4,
        islandName: "Cezm & Şedde Kalesi",
        items: [
            { id: 'czw1', name: 'Cezmli Kelime #1', imgSrc: '/elifba/cezm/cezm/cez1.png', audSrc: '/elifba/cezm/cezm/cez1.mp3', tip: 'Cezmli harfte ses kesilir ve birleştirilir!' },
            { id: 'czw2', name: 'Cezmli Kelime #2', imgSrc: '/elifba/cezm/cezm/cez2.png', audSrc: '/elifba/cezm/cezm/cez2.mp3', tip: 'Sesi dinle, hangi harfin üzerinde durulduğunu yakala.' },
            { id: 'czw3', name: 'Cezmli Kelime #3', imgSrc: '/elifba/cezm/cezm/cez3.png', audSrc: '/elifba/cezm/cezm/cez3.mp3', tip: 'Cezmli harfe asla ekstra "e/i" sesi ekleme!' },
            { id: 'sdw1', name: 'Şeddeli Kelime #1', imgSrc: '/elifba/sedde/sedde/cez16.png', audSrc: '/elifba/sedde/sedde/cez16.mp3', tip: 'Şedde (w şekli): Harfi önce tut, sonra harekesiyle tekrar oku!' },
            { id: 'sdw2', name: 'Şeddeli Kelime #2', imgSrc: '/elifba/sedde/sedde/cez17.png', audSrc: '/elifba/sedde/sedde/cez17.mp3', tip: 'Şedde harfi iki kat güçlendirir!' },
            { id: 'sdw3', name: 'Şeddeli Kelime #3', imgSrc: '/elifba/sedde/sedde/cez18.png', audSrc: '/elifba/sedde/sedde/cez18.mp3', tip: 'Dikkatle dinle; çift okunan harfi seç!' }
        ]
    },

    // ──────── DİYAR 5: TENVİN & KUR'AN ZİRVESİ (22 - 24) ────────
    {
        id: 22,
        title: "Tenvinler: İki Üstün, İki Esre, İki Ötre",
        shortTitle: "Tenvinler (-en/-in/-ün)",
        desc: "Çift harekeler kelimenin sonuna 'n' sesi ekler: En-An, İn-In, Ün-Un!",
        difficulty: 'ileri',
        hasExactReading: false,
        passingScorePercent: 80,
        requiredRepeats: 3,
        badgeId: "badge_22",
        badgeName: "Tenvin Bilgini",
        badgeIcon: "🌟",
        islandId: 5,
        islandName: "Tenvin & Kur'an Zirvesi",
        items: [
            { id: 'tu1', name: 'İki Üstün (-en / -an)', imgSrc: '/elifba/ikiustun/ikiustun/ikiustun1.png', audSrc: '/elifba/ikiustun/ikiustun/ikiustun1.mp3', tip: 'Üstteki İKİ çizgi "-en / -an" sesi verir!' },
            { id: 'tu2', name: 'İki Üstün Örnek #2', imgSrc: '/elifba/ikiustun/ikiustun/ikiustun2.png', audSrc: '/elifba/ikiustun/ikiustun/ikiustun2.mp3', tip: 'İki üstünün yanında genelde yardımcı bir Elif bulunur.' },
            { id: 'te1', name: 'İki Esre (-in / -ın)', imgSrc: '/elifba/ikiesre/ikiesre/ikiesre1.png', audSrc: '/elifba/ikiesre/ikiesre/ikiesre1.mp3', tip: 'Alttaki İKİ çizgi "-in / -ın" sesi verir!' },
            { id: 'te2', name: 'İki Esre Örnek #2', imgSrc: '/elifba/ikiesre/ikiesre/ikiesre2.png', audSrc: '/elifba/ikiesre/ikiesre/ikiesre2.mp3', tip: 'Son sesi "-in" olarak biten kelimeyi bul!' },
            { id: 'to1', name: 'İki Ötre (-ün / -un)', imgSrc: '/elifba/ikiotre/ikiotre/ikiotre1.png', audSrc: '/elifba/ikiotre/ikiotre/ikiotre1.mp3', tip: 'Üstteki çift vav "-ün / -un" sesi verir!' },
            { id: 'to2', name: 'İki Ötre Örnek #2', imgSrc: '/elifba/ikiotre/ikiotre/ikiotre2.png', audSrc: '/elifba/ikiotre/ikiotre/ikiotre2.mp3', tip: 'Sonu "-ün / -un" ile biten kelimeyi dinle ve seç.' }
        ]
    },
    {
        id: 23,
        title: "İleri Pratik: Karma Kelime Okuma",
        shortTitle: "Karma Okuma",
        desc: "Medler, cezm, şedde ve tenvinlerin birleştiği kelimelerde hız kazan!",
        difficulty: 'ustalik',
        hasExactReading: false,
        passingScorePercent: 80,
        requiredRepeats: 2,
        badgeId: "badge_23",
        badgeName: "Kur'an Yolcusu",
        badgeIcon: "📜",
        islandId: 5,
        islandName: "Tenvin & Kur'an Zirvesi",
        items: [
            { id: 'krm1', name: 'Üstünlü Kelime (Kesebe)', imgSrc: '/elifba/ustun/ustun/kesebe.png', audSrc: '/elifba/ustun/ustun/kesebe.mp3', tip: 'Üç üstünlü hızlı okuma!' },
            { id: 'krm2', name: 'Med Elif Kelimesi', imgSrc: '/elifba/medelif/medelif/medelif4.png', audSrc: '/elifba/medelif/medelif/medelif4.mp3', tip: 'Elifle uzatmaya dikkat!' },
            { id: 'krm3', name: 'Cezmli Kelime', imgSrc: '/elifba/cezm/cezm/cez4.png', audSrc: '/elifba/cezm/cezm/cez4.mp3', tip: 'Cezmle harfi tuttur!' },
            { id: 'krm4', name: 'Şeddeli Kelime', imgSrc: '/elifba/sedde/sedde/cez19.png', audSrc: '/elifba/sedde/sedde/cez19.mp3', tip: 'Şeddeli harfi çift oku!' },
            { id: 'krm5', name: 'İki Esreli Kelime', imgSrc: '/elifba/ikiesre/ikiesre/ikiesre3.png', audSrc: '/elifba/ikiesre/ikiesre/ikiesre3.mp3', tip: 'Tenvin (-in) sesini vurgula!' },
            { id: 'krm6', name: 'İki Ötreli Kelime', imgSrc: '/elifba/ikiotre/ikiotre/ikiotre3.png', audSrc: '/elifba/ikiotre/ikiotre/ikiotre3.mp3', tip: 'Tenvin (-ün) sesini temiz çıkar!' }
        ]
    },
    {
        id: 24,
        title: "👑 Büyük Final: Kur'an Şampiyonluğu",
        shortTitle: "Şampiyonluk Finali",
        desc: "Tüm 5 diyardan karma Ustalık Sınavını geç ve Başarı Sertifikanı kazan!",
        difficulty: 'ustalik',
        isGate: true,
        hasExactReading: false,
        passingScorePercent: 85,
        requiredRepeats: 1,
        badgeId: "badge_24",
        badgeName: "Altın Elifba Şampiyonu",
        badgeIcon: "👑",
        islandId: 5,
        islandName: "Tenvin & Kur'an Zirvesi",
        items: [
            { id: 'fin1', name: 'Peltek Se Harfi', imgSrc: '/elifba/dosyalar/4.png', audSrc: '/elifba/dosyalar/4.mp3', tip: '3 nokta üstte: Peltek Se' },
            { id: 'fin2', name: 'Kalın Kaf Harfi', imgSrc: '/elifba/dosyalar/21.png', audSrc: '/elifba/dosyalar/21.mp3', tip: '2 nokta üstte kalın Kaf' },
            { id: 'fin3', name: 'Üstünlü Kelime (Darabe)', imgSrc: '/elifba/ustun/ustun/darabe.png', audSrc: '/elifba/ustun/ustun/darabe.mp3', tip: 'Üstünlü kelime okuma' },
            { id: 'fin4', name: 'Esreli Kelime', imgSrc: '/elifba/esre/esre/esre1.png', audSrc: '/elifba/esre/esre/esre1.mp3', tip: 'Esre kuralı' },
            { id: 'fin5', name: 'Ötreli Kelime', imgSrc: '/elifba/otre/otre/otre1.png', audSrc: '/elifba/otre/otre/otre1.mp3', tip: 'Ötre kuralı' },
            { id: 'fin6', name: 'Med Elif', imgSrc: '/elifba/medelif/medelif/medelif1.png', audSrc: '/elifba/medelif/medelif/medelif1.mp3', tip: 'Med Elif uzatması' },
            { id: 'fin7', name: 'Cezm (Sükun)', imgSrc: '/elifba/cezm/cezm/cez1.png', audSrc: '/elifba/cezm/cezm/cez1.mp3', tip: 'Cezm tutturması' },
            { id: 'fin8', name: 'Şedde (İkileme)', imgSrc: '/elifba/sedde/sedde/cez16.png', audSrc: '/elifba/sedde/sedde/cez16.mp3', tip: 'Şedde çift okuması' },
            { id: 'fin9', name: 'İki Üstün (Tenvin)', imgSrc: '/elifba/ikiustun/ikiustun/ikiustun1.png', audSrc: '/elifba/ikiustun/ikiustun/ikiustun1.mp3', tip: 'Tenvin kuralı' }
        ]
    }
];

export const MASCOT_QUOTES = [
    "Önce Keşfet ve Bol Tekrar yap, sonra Pekiştirme Oyununda eğlen, en son Ustalık Sınavıyla kilidi aç! 🌟",
    "Her harfi 3 kez sesli tekrar etmen hafızana altın harflerle kazınmasını sağlar! 🗣️",
    "Takıldığın yerde '0.75x Yavaş' butonuna basıp harfin mahrecini dikkatle dinle! 🎧",
    "Kur'an harflerini öğrenmek çok kıymetlidir; her bir harf için on sevap vardır! ✨",
    "Hatalar öğrenmenin en iyi arkadaşıdır. Yanlış yaptığın harfi tekrar dinleyip hemen pekiştir! 🐥",
    "Tüm diyarları tamamladığında ismine özel Altın Başarı Sertifikası seni bekliyor! 🎓"
];

// Gelişmiş Web Audio API Sentezleyicisi (Kombo perdesi artan premium oyun sesleri)
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
            // Kombo arttıkça perdesi yükselen tatmin edici iki notalı zil
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
const STORAGE_KEY_DATA = 'elifbam_adventure_progress_v2';
const LEGACY_STORAGE_KEY_DATA = 'elifbam_adventure_progress';

export function loadAdventurePlayerData(): AdventurePlayerData {
    const defaultData: AdventurePlayerData = {
        name: "Küçük Hafız",
        avatar: "🦉",
        unlockedStage: 1,
        stageStars: {},
        stageScores: {},
        stageMastered: {},
        badges: [],
        xp: 0,
        streak: 0,
        teacherFreeMode: false
    };

    if (typeof window === 'undefined') return defaultData;

    try {
        const savedName = localStorage.getItem(STORAGE_KEY_NAME);
        if (savedName) defaultData.name = savedName;

        const savedV2 = localStorage.getItem(STORAGE_KEY_DATA);
        if (savedV2) {
            const parsed = JSON.parse(savedV2);
            return {
                ...defaultData,
                ...parsed,
                name: savedName || parsed.name || defaultData.name
            };
        }

        // V1 verisi varsa koruyarak taşı
        const legacy = localStorage.getItem(LEGACY_STORAGE_KEY_DATA);
        if (legacy) {
            const parsed = JSON.parse(legacy);
            return {
                ...defaultData,
                unlockedStage: typeof parsed.unlockedStage === 'number' ? Math.min(24, Math.max(1, parsed.unlockedStage)) : 1,
                stageStars: parsed.stageStars || {},
                stageScores: parsed.stageScores || {},
                badges: Array.isArray(parsed.badges) ? parsed.badges : []
            };
        }
    } catch (e) {
        console.error("Player data load error:", e);
    }
    return defaultData;
}

export function saveAdventurePlayerData(data: AdventurePlayerData): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(STORAGE_KEY_NAME, data.name);
        localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(data));
    } catch (e) {
        console.error("Player data save error:", e);
    }
}
