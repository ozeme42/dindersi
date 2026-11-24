// Elifba Macerası - Veri Modeli ve Ses Sentezleyicisi
// Kaynak: "Büyük Elifba Macerası - Aşamalı Yolculuk"

export interface AdventureItem {
    id: string;
    name: string;
    imgSrc: string;
    audSrc: string;
    arabic?: string;
    desc?: string;
}

export interface AdventureStage {
    id: number;
    title: string;
    desc: string;
    badgeId: string;
    badgeName: string;
    badgeIcon: string;
    islandId: number;
    islandName: string;
    items: AdventureItem[];
}

export interface AdventureIsland {
    id: number;
    name: string;
    subtitle: string;
    icon: string;
    color: string;
    gradient: string;
    stages: number[];
}

export interface AdventurePlayerData {
    name: string;
    unlockedStage: number;
    stageStars: Record<number, number>;
    stageScores: Record<number, number>;
    badges: string[];
}

// 4 Tematik Macera Adası
export const ADVENTURE_ISLANDS: AdventureIsland[] = [
    {
        id: 1,
        name: "1. Ada: Harfler Sahili",
        subtitle: "Elif'ten Ye'ye 28 Temel Kur'an Harfi (Aşama 1 - 7)",
        icon: "🏝️",
        color: "text-sky-600",
        gradient: "from-sky-500 to-blue-600",
        stages: [1, 2, 3, 4, 5, 6, 7]
    },
    {
        id: 2,
        name: "2. Ada: Harekeler Vadisi",
        subtitle: "Üstün, Esre ve Ötre ile İlk Kelimeler (Aşama 8 - 13)",
        icon: "🌿",
        color: "text-emerald-600",
        gradient: "from-emerald-500 to-teal-600",
        stages: [8, 9, 10, 11, 12, 13]
    },
    {
        id: 3,
        name: "3. Ada: Cezm & Şedde Tepesi",
        subtitle: "Med Uzatmaları, Cezm ve Şedde Kaideleri (Aşama 14 - 17)",
        icon: "🏔️",
        color: "text-amber-600",
        gradient: "from-amber-500 to-orange-600",
        stages: [14, 15, 16, 17]
    },
    {
        id: 4,
        name: "4. Ada: Tenvin & Kur'an Zirvesi",
        subtitle: "Tenvinler ve Büyük Kur'an Şampiyonluğu Finali (Aşama 18 - 19)",
        icon: "👑",
        color: "text-purple-600",
        gradient: "from-purple-500 to-pink-600",
        stages: [18, 19]
    }
];

// 19 Aşamalı Büyük Elifba Macerası Müfredatı
export const ADVENTURE_STAGES: AdventureStage[] = [
    {
        id: 1,
        title: "1. Bölüm: Elif - Se",
        desc: "Elif, Be, Te ve Peltek Se harfleri",
        badgeId: "badge_1",
        badgeName: "Filizlenen Tohum",
        badgeIcon: "🌱",
        islandId: 1,
        islandName: "Harfler Sahili",
        items: [
            { id: '1', name: 'Elif', imgSrc: '/elifba/harfler/harfler/1.png', audSrc: '/elifba/harfler/harfler/1.mp3', arabic: 'ا' },
            { id: '2', name: 'Be', imgSrc: '/elifba/harfler/harfler/2.png', audSrc: '/elifba/harfler/harfler/2.mp3', arabic: 'ب' },
            { id: '3', name: 'Te', imgSrc: '/elifba/harfler/harfler/3.png', audSrc: '/elifba/harfler/harfler/3.mp3', arabic: 'ت' },
            { id: '4', name: 'Peltek Se', imgSrc: '/elifba/harfler/harfler/4.png', audSrc: '/elifba/harfler/harfler/4.mp3', arabic: 'ث' }
        ]
    },
    {
        id: 2,
        title: "2. Bölüm: Cim - Dal",
        desc: "Cim, Ha, Hı ve Dal harfleri",
        badgeId: "badge_2",
        badgeName: "Yeşil Vadi",
        badgeIcon: "🌿",
        islandId: 1,
        islandName: "Harfler Sahili",
        items: [
            { id: '5', name: 'Cim', imgSrc: '/elifba/harfler/harfler/5.png', audSrc: '/elifba/harfler/harfler/5.mp3', arabic: 'ج' },
            { id: '6', name: 'Ha', imgSrc: '/elifba/harfler/harfler/6.png', audSrc: '/elifba/harfler/harfler/6.mp3', arabic: 'ح' },
            { id: '7', name: 'Hı', imgSrc: '/elifba/harfler/harfler/7.png', audSrc: '/elifba/harfler/harfler/7.mp3', arabic: 'خ' },
            { id: '8', name: 'Dal', imgSrc: '/elifba/harfler/harfler/8.png', audSrc: '/elifba/harfler/harfler/8.mp3', arabic: 'د' }
        ]
    },
    {
        id: 3,
        title: "3. Bölüm: Zel - Sin",
        desc: "Peltek Zel, Ra, Ze ve Sin harfleri",
        badgeId: "badge_3",
        badgeName: "Hızlı Kaşif",
        badgeIcon: "⚡",
        islandId: 1,
        islandName: "Harfler Sahili",
        items: [
            { id: '9', name: 'Peltek Zel', imgSrc: '/elifba/harfler/harfler/9.png', audSrc: '/elifba/harfler/harfler/9.mp3', arabic: 'ذ' },
            { id: '10', name: 'Ra', imgSrc: '/elifba/harfler/harfler/10.png', audSrc: '/elifba/harfler/harfler/10.mp3', arabic: 'ر' },
            { id: '11', name: 'Ze', imgSrc: '/elifba/harfler/harfler/11.png', audSrc: '/elifba/harfler/harfler/11.mp3', arabic: 'ز' },
            { id: '12', name: 'Sin', imgSrc: '/elifba/harfler/harfler/12.png', audSrc: '/elifba/harfler/harfler/12.mp3', arabic: 'س' }
        ]
    },
    {
        id: 4,
        title: "4. Bölüm: Şın - Tı",
        desc: "Şın, Sad, Dad ve Tı harfleri",
        badgeId: "badge_4",
        badgeName: "Mavi Nehir",
        badgeIcon: "🌊",
        islandId: 1,
        islandName: "Harfler Sahili",
        items: [
            { id: '13', name: 'Şın', imgSrc: '/elifba/harfler/harfler/13.png', audSrc: '/elifba/harfler/harfler/13.mp3', arabic: 'ش' },
            { id: '14', name: 'Sad', imgSrc: '/elifba/harfler/harfler/14.png', audSrc: '/elifba/harfler/harfler/14.mp3', arabic: 'ص' },
            { id: '15', name: 'Dad', imgSrc: '/elifba/harfler/harfler/15.png', audSrc: '/elifba/harfler/harfler/15.mp3', arabic: 'ض' },
            { id: '16', name: 'Tı', imgSrc: '/elifba/harfler/harfler/16.png', audSrc: '/elifba/harfler/harfler/16.mp3', arabic: 'ط' }
        ]
    },
    {
        id: 5,
        title: "5. Bölüm: Zı - Fe",
        desc: "Peltek Zı, Ayn, Gayn ve Fe harfleri",
        badgeId: "badge_5",
        badgeName: "Harf Dostu",
        badgeIcon: "🌸",
        islandId: 1,
        islandName: "Harfler Sahili",
        items: [
            { id: '17', name: 'Peltek Zı', imgSrc: '/elifba/harfler/harfler/17.png', audSrc: '/elifba/harfler/harfler/17.mp3', arabic: 'ظ' },
            { id: '18', name: 'Ayn', imgSrc: '/elifba/harfler/harfler/18.png', audSrc: '/elifba/harfler/harfler/18.mp3', arabic: 'ع' },
            { id: '19', name: 'Gayn', imgSrc: '/elifba/harfler/harfler/19.png', audSrc: '/elifba/harfler/harfler/19.mp3', arabic: 'غ' },
            { id: '20', name: 'Fe', imgSrc: '/elifba/harfler/harfler/20.png', audSrc: '/elifba/harfler/harfler/20.mp3', arabic: 'ف' }
        ]
    },
    {
        id: 6,
        title: "6. Bölüm: Kaf - Mim",
        desc: "Kaf, Kef, Lam ve Mim harfleri",
        badgeId: "badge_6",
        badgeName: "Bilgi Kalesi",
        badgeIcon: "🏰",
        islandId: 1,
        islandName: "Harfler Sahili",
        items: [
            { id: '21', name: 'Kaf', imgSrc: '/elifba/harfler/harfler/21.png', audSrc: '/elifba/harfler/harfler/21.mp3', arabic: 'ق' },
            { id: '22', name: 'Kef', imgSrc: '/elifba/harfler/harfler/22.png', audSrc: '/elifba/harfler/harfler/22.mp3', arabic: 'ك' },
            { id: '23', name: 'Lam', imgSrc: '/elifba/harfler/harfler/23.png', audSrc: '/elifba/harfler/harfler/23.mp3', arabic: 'ل' },
            { id: '24', name: 'Mim', imgSrc: '/elifba/harfler/harfler/24.png', audSrc: '/elifba/harfler/harfler/24.mp3', arabic: 'م' }
        ]
    },
    {
        id: 7,
        title: "7. Bölüm: Nun - Ye (Harfler Zirvesi)",
        desc: "Nun, Vav, He, Lamelif ve Ye harfleri",
        badgeId: "badge_7",
        badgeName: "Harf Ustası",
        badgeIcon: "🅰️",
        islandId: 1,
        islandName: "Harfler Sahili",
        items: [
            { id: '25', name: 'Nun', imgSrc: '/elifba/harfler/harfler/25.png', audSrc: '/elifba/harfler/harfler/25.mp3', arabic: 'ن' },
            { id: '26', name: 'Vav', imgSrc: '/elifba/harfler/harfler/26.png', audSrc: '/elifba/harfler/harfler/26.mp3', arabic: 'و' },
            { id: '27', name: 'He', imgSrc: '/elifba/harfler/harfler/27.png', audSrc: '/elifba/harfler/harfler/27.mp3', arabic: 'ه' },
            { id: '28', name: 'Lâmelif', imgSrc: '/elifba/harfler/harfler/28.png', audSrc: '/elifba/harfler/harfler/28.mp3', arabic: 'لا' },
            { id: '29', name: 'Ye', imgSrc: '/elifba/harfler/harfler/29.png', audSrc: '/elifba/harfler/harfler/29.mp3', arabic: 'ي' }
        ]
    },
    {
        id: 8,
        title: "8. Bölüm: Üstün (Harfler)",
        desc: "Harflerin üstünlü seslendirilmesi (E - A)",
        badgeId: "badge_8",
        badgeName: "Üstün Kahramanı",
        badgeIcon: "🎈",
        islandId: 2,
        islandName: "Harekeler Vadisi",
        items: [
            { id: 'u1', name: 'E', imgSrc: '/elifba/ustun1/ustun1/1.jpg', audSrc: '/elifba/ustun1/ustun1/1.m4a', arabic: 'اَ' },
            { id: 'u2', name: 'Be', imgSrc: '/elifba/ustun1/ustun1/2.jpg', audSrc: '/elifba/ustun1/ustun1/2.m4a', arabic: 'بَ' },
            { id: 'u3', name: 'Te', imgSrc: '/elifba/ustun1/ustun1/3.jpg', audSrc: '/elifba/ustun1/ustun1/3.m4a', arabic: 'تَ' },
            { id: 'u4', name: 'Se', imgSrc: '/elifba/ustun1/ustun1/4.jpg', audSrc: '/elifba/ustun1/ustun1/4.m4a', arabic: 'ثَ' },
            { id: 'u5', name: 'Ce', imgSrc: '/elifba/ustun1/ustun1/5.jpg', audSrc: '/elifba/ustun1/ustun1/5.m4a', arabic: 'جَ' },
            { id: 'u8', name: 'De', imgSrc: '/elifba/ustun1/ustun1/8.jpg', audSrc: '/elifba/ustun1/ustun1/8.m4a', arabic: 'دَ' },
            { id: 'u10', name: 'Ra', imgSrc: '/elifba/ustun1/ustun1/10.jpg', audSrc: '/elifba/ustun1/ustun1/10.m4a', arabic: 'رَ' },
            { id: 'u23', name: 'Le', imgSrc: '/elifba/ustun1/ustun1/23.jpg', audSrc: '/elifba/ustun1/ustun1/23.m4a', arabic: 'لَ' }
        ]
    },
    {
        id: 9,
        title: "9. Bölüm: Üstünlü Kelimeler",
        desc: "Üstünlü 3 harfli kelimeleri akıcı okuma",
        badgeId: "badge_9",
        badgeName: "Kelime Kaşifi",
        badgeIcon: "📖",
        islandId: 2,
        islandName: "Harekeler Vadisi",
        items: [
            { id: 'darabe', name: 'Darabe', imgSrc: '/elifba/ustun/ustun/darabe.png', audSrc: '/elifba/ustun/ustun/darabe.mp3', arabic: 'ضَرَبَ' },
            { id: 'kesebe', name: 'Kesebe', imgSrc: '/elifba/ustun/ustun/kesebe.png', audSrc: '/elifba/ustun/ustun/kesebe.mp3', arabic: 'كَسَبَ' },
            { id: 'nezele', name: 'Nezele', imgSrc: '/elifba/ustun/ustun/nezele.png', audSrc: '/elifba/ustun/ustun/nezele.mp3', arabic: 'نَزَلَ' },
            { id: 'zehebe', name: 'Zehebe', imgSrc: '/elifba/ustun/ustun/zehebe.png', audSrc: '/elifba/ustun/ustun/zehebe.mp3', arabic: 'ذَهَبَ' },
            { id: 'vecede', name: 'Vecede', imgSrc: '/elifba/ustun/ustun/vecede.png', audSrc: '/elifba/ustun/ustun/vecede.mp3', arabic: 'وَجَدَ' },
            { id: 'emera', name: 'Emera', imgSrc: '/elifba/ustun/ustun/emera.png', audSrc: '/elifba/ustun/ustun/emera.mp3', arabic: 'اَمَرَ' },
            { id: 'sadeka', name: 'Sadaka', imgSrc: '/elifba/ustun/ustun/sadeka.png', audSrc: '/elifba/ustun/ustun/sadeka.mp3', arabic: 'صَدَقَ' }
        ]
    },
    {
        id: 10,
        title: "10. Bölüm: Esre (Harfler)",
        desc: "Harflerin esreli okunuşları (İ - I)",
        badgeId: "badge_10",
        badgeName: "Esre Ustası",
        badgeIcon: "💧",
        islandId: 2,
        islandName: "Harekeler Vadisi",
        items: [
            { id: 'e1', name: 'İ', imgSrc: '/elifba/esre1/esre1/1.jpg', audSrc: '/elifba/esre1/esre1/1.m4a', arabic: 'اِ' },
            { id: 'e2', name: 'Bi', imgSrc: '/elifba/esre1/esre1/2.jpg', audSrc: '/elifba/esre1/esre1/2.m4a', arabic: 'بِ' },
            { id: 'e3', name: 'Ti', imgSrc: '/elifba/esre1/esre1/3.jpg', audSrc: '/elifba/esre1/esre1/3.m4a', arabic: 'تِ' },
            { id: 'e4', name: 'Si', imgSrc: '/elifba/esre1/esre1/4.jpg', audSrc: '/elifba/esre1/esre1/4.m4a', arabic: 'ثِ' },
            { id: 'e5', name: 'Ci', imgSrc: '/elifba/esre1/esre1/5.jpg', audSrc: '/elifba/esre1/esre1/5.m4a', arabic: 'جِ' },
            { id: 'e8', name: 'Di', imgSrc: '/elifba/esre1/esre1/8.jpg', audSrc: '/elifba/esre1/esre1/8.m4a', arabic: 'دِ' },
            { id: 'e10', name: 'Rı', imgSrc: '/elifba/esre1/esre1/10.jpg', audSrc: '/elifba/esre1/esre1/10.m4a', arabic: 'رِ' },
            { id: 'e23', name: 'Li', imgSrc: '/elifba/esre1/esre1/23.jpg', audSrc: '/elifba/esre1/esre1/23.m4a', arabic: 'لِ' }
        ]
    },
    {
        id: 11,
        title: "11. Bölüm: Esreli Kelimeler",
        desc: "Esre içeren kelimeleri doğru ve akıcı okuma",
        badgeId: "badge_11",
        badgeName: "Esre Bilgini",
        badgeIcon: "🌊",
        islandId: 2,
        islandName: "Harekeler Vadisi",
        items: [
            { id: 'esre1', name: 'Semia', imgSrc: '/elifba/esre/esre/esre1.png', audSrc: '/elifba/esre/esre/esre1.mp3', arabic: 'سَمِعَ' },
            { id: 'esre2', name: 'Hamide', imgSrc: '/elifba/esre/esre/esre2.png', audSrc: '/elifba/esre/esre/esre2.mp3', arabic: 'حَمِدَ' },
            { id: 'esre3', name: 'Alime', imgSrc: '/elifba/esre/esre/esre3.png', audSrc: '/elifba/esre/esre/esre3.mp3', arabic: 'عَلِمَ' },
            { id: 'esre4', name: 'Kerime', imgSrc: '/elifba/esre/esre/esre4.png', audSrc: '/elifba/esre/esre/esre4.mp3', arabic: 'كَرِمَ' },
            { id: 'esre5', name: 'Şeribe', imgSrc: '/elifba/esre/esre/esre5.png', audSrc: '/elifba/esre/esre/esre5.mp3', arabic: 'شَرِبَ' }
        ]
    },
    {
        id: 12,
        title: "12. Bölüm: Ötre (Harfler)",
        desc: "Harflerin ötreli seslendirilmesi (Ü - U)",
        badgeId: "badge_12",
        badgeName: "Ötre Ustası",
        badgeIcon: "🍩",
        islandId: 2,
        islandName: "Harekeler Vadisi",
        items: [
            { id: 'o1', name: 'Ü', imgSrc: '/elifba/otre1/otre1/1.jpg', audSrc: '/elifba/otre1/otre1/1.m4a', arabic: 'اُ' },
            { id: 'o2', name: 'Bü', imgSrc: '/elifba/otre1/otre1/2.jpg', audSrc: '/elifba/otre1/otre1/2.m4a', arabic: 'بُ' },
            { id: 'o3', name: 'Tü', imgSrc: '/elifba/otre1/otre1/3.jpg', audSrc: '/elifba/otre1/otre1/3.m4a', arabic: 'تُ' },
            { id: 'o4', name: 'Sü', imgSrc: '/elifba/otre1/otre1/4.jpg', audSrc: '/elifba/otre1/otre1/4.m4a', arabic: 'ثُ' },
            { id: 'o5', name: 'Cü', imgSrc: '/elifba/otre1/otre1/5.jpg', audSrc: '/elifba/otre1/otre1/5.m4a', arabic: 'جُ' },
            { id: 'o8', name: 'Dü', imgSrc: '/elifba/otre1/otre1/8.jpg', audSrc: '/elifba/otre1/otre1/8.m4a', arabic: 'دُ' },
            { id: 'o10', name: 'Ru', imgSrc: '/elifba/otre1/otre1/10.jpg', audSrc: '/elifba/otre1/otre1/10.m4a', arabic: 'رُ' },
            { id: 'o23', name: 'Lü', imgSrc: '/elifba/otre1/otre1/23.jpg', audSrc: '/elifba/otre1/otre1/23.m4a', arabic: 'لُ' }
        ]
    },
    {
        id: 13,
        title: "13. Bölüm: Ötreli Kelimeler",
        desc: "Ötre içeren kelimeleri doğru ve akıcı okuma",
        badgeId: "badge_13",
        badgeName: "Ötre Bilgini",
        badgeIcon: "🧁",
        islandId: 2,
        islandName: "Harekeler Vadisi",
        items: [
            { id: 'otre1', name: 'Hulika', imgSrc: '/elifba/otre/otre/otre1.png', audSrc: '/elifba/otre/otre/otre1.mp3', arabic: 'خُلِقَ' },
            { id: 'otre2', name: 'Kütibe', imgSrc: '/elifba/otre/otre/otre2.png', audSrc: '/elifba/otre/otre/otre2.mp3', arabic: 'كُتِبَ' },
            { id: 'otre3', name: 'Vudia', imgSrc: '/elifba/otre/otre/otre3.png', audSrc: '/elifba/otre/otre/otre3.mp3', arabic: 'وُضِعَ' },
            { id: 'otre4', name: 'Rusulü', imgSrc: '/elifba/otre/otre/otre4.png', audSrc: '/elifba/otre/otre/otre4.mp3', arabic: 'رُسُلُ' },
            { id: 'otre5', name: 'Kütübü', imgSrc: '/elifba/otre/otre/otre5.png', audSrc: '/elifba/otre/otre/otre5.mp3', arabic: 'كُتُبُ' }
        ]
    },
    {
        id: 14,
        title: "14. Bölüm: Med Elif (Uzatma)",
        desc: "Elif harfi ile bir elif miktarı uzatma",
        badgeId: "badge_14",
        badgeName: "Med Elif Ustası",
        badgeIcon: "🚀",
        islandId: 3,
        islandName: "Cezm & Şedde Tepesi",
        items: [
            { id: 'me1', name: 'Kâle', imgSrc: '/elifba/medelif/medelif/medelif1.png', audSrc: '/elifba/medelif/medelif/medelif1.mp3', arabic: 'قَالَ' },
            { id: 'me2', name: 'Kâne', imgSrc: '/elifba/medelif/medelif/medelif2.png', audSrc: '/elifba/medelif/medelif/medelif2.mp3', arabic: 'كَانَ' },
            { id: 'me3', name: 'Nâme', imgSrc: '/elifba/medelif/medelif/medelif3.png', audSrc: '/elifba/medelif/medelif/medelif3.mp3', arabic: 'نَامَ' },
            { id: 'me4', name: 'Kâme', imgSrc: '/elifba/medelif/medelif/medelif4.png', audSrc: '/elifba/medelif/medelif/medelif4.mp3', arabic: 'قَامَ' },
            { id: 'me5', name: 'Tâbe', imgSrc: '/elifba/medelif/medelif/medelif5.png', audSrc: '/elifba/medelif/medelif/medelif5.mp3', arabic: 'تَابَ' }
        ]
    },
    {
        id: 15,
        title: "15. Bölüm: Med Vav & Med Ye",
        desc: "Vav ve Ye harfleri ile ses uzatma kaideleri",
        badgeId: "badge_15",
        badgeName: "Uzatma Ustası",
        badgeIcon: "🚗",
        islandId: 3,
        islandName: "Cezm & Şedde Tepesi",
        items: [
            { id: 'mv1', name: 'Yekûlü', imgSrc: '/elifba/medvav/medvav/medvav1.png', audSrc: '/elifba/medvav/medvav/medvav1.mp3', arabic: 'يَقُولُ' },
            { id: 'mv2', name: 'Tebûrü', imgSrc: '/elifba/medvav/medvav/medvav2.png', audSrc: '/elifba/medvav/medvav/medvav2.mp3', arabic: 'تَبُورُ' },
            { id: 'my1', name: 'Kîle', imgSrc: '/elifba/medye/medye/medye1.png', audSrc: '/elifba/medye/medye/medye1.mp3', arabic: 'قِيلَ' },
            { id: 'my2', name: 'Dîne', imgSrc: '/elifba/medye/medye/medye2.png', audSrc: '/elifba/medye/medye/medye2.mp3', arabic: 'دِينَ' }
        ]
    },
    {
        id: 16,
        title: "16. Bölüm: Cezm (Sükun)",
        desc: "Harfleri tutturarak ve sakin okuma",
        badgeId: "badge_16",
        badgeName: "Cezm Muhafızı",
        badgeIcon: "🔒",
        islandId: 3,
        islandName: "Cezm & Şedde Tepesi",
        items: [
            { id: 'cz1', name: 'El', imgSrc: '/elifba/cezm/cezm/cez1.png', audSrc: '/elifba/cezm/cezm/cez1.mp3', arabic: 'اَلْ' },
            { id: 'cz2', name: 'Lem', imgSrc: '/elifba/cezm/cezm/cez2.png', audSrc: '/elifba/cezm/cezm/cez2.mp3', arabic: 'لَمْ' },
            { id: 'cz3', name: 'Men', imgSrc: '/elifba/cezm/cezm/cez3.png', audSrc: '/elifba/cezm/cezm/cez3.mp3', arabic: 'مَنْ' },
            { id: 'cz4', name: 'Kem', imgSrc: '/elifba/cezm/cezm/cez4.png', audSrc: '/elifba/cezm/cezm/cez4.mp3', arabic: 'كَمْ' },
            { id: 'cz5', name: 'An', imgSrc: '/elifba/cezm/cezm/cez5.png', audSrc: '/elifba/cezm/cezm/cez5.mp3', arabic: 'عَنْ' }
        ]
    },
    {
        id: 17,
        title: "17. Bölüm: Şedde (İkileme)",
        desc: "Harfi iki kere kuvvetlice ve pekiştirerek okuma",
        badgeId: "badge_17",
        badgeName: "Şedde Bükücü",
        badgeIcon: "💥",
        islandId: 3,
        islandName: "Cezm & Şedde Tepesi",
        items: [
            { id: 'sd1', name: 'İnne', imgSrc: '/elifba/sedde/sedde/cez16.png', audSrc: '/elifba/sedde/sedde/cez16.mp3', arabic: 'اِنَّ' },
            { id: 'sd2', name: 'Külle', imgSrc: '/elifba/sedde/sedde/cez17.png', audSrc: '/elifba/sedde/sedde/cez17.mp3', arabic: 'كُلَّ' },
            { id: 'sd3', name: 'Sümme', imgSrc: '/elifba/sedde/sedde/cez18.png', audSrc: '/elifba/sedde/sedde/cez18.mp3', arabic: 'ثُمَّ' },
            { id: 'sd4', name: 'Rabbî', imgSrc: '/elifba/sedde/sedde/cez19.png', audSrc: '/elifba/sedde/sedde/cez19.mp3', arabic: 'رَبِّي' },
            { id: 'sd5', name: 'Münne', imgSrc: '/elifba/sedde/sedde/cez20.png', audSrc: '/elifba/sedde/sedde/cez20.mp3', arabic: 'مُنَّ' }
        ]
    },
    {
        id: 18,
        title: "18. Bölüm: Tenvinler (En - İn - Ün)",
        desc: "İki Üstün, İki Esre ve İki Ötre sesleri",
        badgeId: "badge_18",
        badgeName: "Tenvin Bilgini",
        badgeIcon: "🌟",
        islandId: 4,
        islandName: "Tenvin & Kur'an Zirvesi",
        items: [
            { id: 'tu1', name: 'Kütuben', imgSrc: '/elifba/ikiustun/ikiustun/ikiustun1.png', audSrc: '/elifba/ikiustun/ikiustun/ikiustun1.mp3', arabic: 'كُتُبًا' },
            { id: 'tu2', name: 'Ebeden', imgSrc: '/elifba/ikiustun/ikiustun/ikiustun2.png', audSrc: '/elifba/ikiustun/ikiustun/ikiustun2.mp3', arabic: 'اَبَدًا' },
            { id: 'te1', name: 'Kelimâtin', imgSrc: '/elifba/ikiesre/ikiesre/ikiesre1.png', audSrc: '/elifba/ikiesre/ikiesre/ikiesre1.mp3', arabic: 'كَلِمَاتٍ' },
            { id: 'to1', name: 'Aliymün', imgSrc: '/elifba/ikiotre/ikiotre/ikiotre1.png', audSrc: '/elifba/ikiotre/ikiotre/ikiotre1.mp3', arabic: 'عَلِيمٌ' }
        ]
    },
    {
        id: 19,
        title: "19. Bölüm: 👑 Büyük Kur'an Şampiyonluğu Finali",
        desc: "Tüm müfredattan karma şampiyonluk soruları!",
        badgeId: "badge_19",
        badgeName: "Altın Elifba Şampiyonu",
        badgeIcon: "👑",
        islandId: 4,
        islandName: "Tenvin & Kur'an Zirvesi",
        items: [
            { id: 'f1', name: 'Elif', imgSrc: '/elifba/harfler/harfler/1.png', audSrc: '/elifba/harfler/harfler/1.mp3', arabic: 'ا' },
            { id: 'f2', name: 'Darabe', imgSrc: '/elifba/ustun/ustun/darabe.png', audSrc: '/elifba/ustun/ustun/darabe.mp3', arabic: 'ضَرَبَ' },
            { id: 'f3', name: 'Kâle', imgSrc: '/elifba/medelif/medelif/medelif1.png', audSrc: '/elifba/medelif/medelif/medelif1.mp3', arabic: 'قَالَ' },
            { id: 'f4', name: 'El', imgSrc: '/elifba/cezm/cezm/cez1.png', audSrc: '/elifba/cezm/cezm/cez1.mp3', arabic: 'اَلْ' },
            { id: 'f5', name: 'İnne', imgSrc: '/elifba/sedde/sedde/cez16.png', audSrc: '/elifba/sedde/sedde/cez16.mp3', arabic: 'اِنَّ' },
            { id: 'f6', name: 'Kütuben', imgSrc: '/elifba/ikiustun/ikiustun/ikiustun1.png', audSrc: '/elifba/ikiustun/ikiustun/ikiustun1.mp3', arabic: 'كُتُبًا' }
        ]
    }
];

// Maskot Hüdhüd (🐥) Teşvik Cümleleri
export const MASCOT_QUOTES = [
    "Kur'an harflerini öğrenmek çok kıymetli ve eğlenceli! 🌟",
    "Her doğru cevap seni şampiyonluk sertifikasına yaklaştırıyor! 🏆",
    "Takıldığın bir harf olursa 'Sesi Tekrar Dinle' butonuna bas! 🎧",
    "Macerayı tamamladığında ismine özel başarı sertifikanı yazdırabilirsin! 🎓",
    "Harikasın! Adım adım çok güzel ilerliyorsun, maşallah! 🐥",
    "Her harf için 10 sevap var! Gayretine bereket! ✨",
    "Yıldızları toplamaya devam et, rozet dolabın doluyor! 🏅"
];

// Web Audio API Sentezleyicisi (Tarayıcıda anında ve gecikmesiz ses)
export const playAdventureTone = (type: 'correct' | 'wrong' | 'fanfare' | 'chirp' | 'click') => {
    try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') {
            ctx.resume();
        }

        const now = ctx.currentTime;

        if (type === 'correct') {
            // Çift tonlu neşeli zil
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(523.25, now); // C5
            osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.12); // G5
            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.28);
        } else if (type === 'wrong') {
            // Boop sesi
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(220, now);
            osc.frequency.exponentialRampToValueAtTime(140, now + 0.2);
            gain.gain.setValueAtTime(0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.25);
        } else if (type === 'fanfare') {
            // 4 akorlu zafer fanfarı
            const notes = [
                { f: 523.25, d: 0.12, t: 0 },
                { f: 659.25, d: 0.12, t: 0.12 },
                { f: 783.99, d: 0.15, t: 0.24 },
                { f: 1046.5, d: 0.45, t: 0.39 }
            ];
            notes.forEach(n => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(n.f, now + n.t);
                gain.gain.setValueAtTime(0.28, now + n.t);
                gain.gain.exponentialRampToValueAtTime(0.001, now + n.t + n.d);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now + n.t);
                osc.stop(now + n.t + n.d);
            });
        } else if (type === 'chirp') {
            // Hüdhüd cikleme sesi
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(650, now);
            osc.frequency.exponentialRampToValueAtTime(1250, now + 0.08);
            osc.frequency.exponentialRampToValueAtTime(850, now + 0.18);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.22);
        } else if (type === 'click') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, now);
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.06);
        }
    } catch (e) {
        // Ses desteklenmiyorsa sessizce geç
    }
};

// LocalStorage Oyuncu Verisi Yardımcıları
const STORAGE_KEY_NAME = 'elifbam_adventure_player_name';
const STORAGE_KEY_DATA = 'elifbam_adventure_progress';

export function loadAdventurePlayerData(): AdventurePlayerData {
    const defaultData: AdventurePlayerData = {
        name: "Küçük Hafız",
        unlockedStage: 1,
        stageStars: {},
        stageScores: {},
        badges: []
    };

    if (typeof window === 'undefined') return defaultData;

    try {
        const savedName = localStorage.getItem(STORAGE_KEY_NAME);
        if (savedName) defaultData.name = savedName;

        const savedData = localStorage.getItem(STORAGE_KEY_DATA);
        if (savedData) {
            const parsed = JSON.parse(savedData);
            return {
                name: savedName || parsed.name || defaultData.name,
                unlockedStage: typeof parsed.unlockedStage === 'number' ? parsed.unlockedStage : 1,
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
        localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify({
            unlockedStage: data.unlockedStage,
            stageStars: data.stageStars,
            stageScores: data.stageScores,
            badges: data.badges
        }));
    } catch (e) {
        console.error("Player data save error:", e);
    }
}
