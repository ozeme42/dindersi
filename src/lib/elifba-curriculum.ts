import { ELIFBA_UNITS, ElifbaUnit } from './elifba-data';

export interface ElifbaStage {
    id: string;
    stepNumber: number; // 1 to 30
    section: 'section1' | 'section2' | 'section3' | 'section4';
    sectionTitle: string;
    title: string;
    shortTitle: string;
    category: 'letters' | 'harekes' | 'rules' | 'med' | 'tanwin' | 'advanced' | 'dualar' | 'quran';
    badgeColor: string;
    icon?: string;
    description: string;
    itemCount: number;
    imgExt: string;
    audioExt: string;
    folder: string;
    subFolder: string;
    items: string[];
}

export interface DiyanetSection {
    id: 'section1' | 'section2' | 'section3' | 'section4';
    number: number;
    title: string;
    subtitle: string;
    stepRange: [number, number];
    badgeColor: string;
}

export const DIYANET_SECTIONS: DiyanetSection[] = [
    {
        id: 'section1',
        number: 1,
        title: 'I. Bölüm: Harfler ve Harekeler',
        subtitle: 'Temel Okuma Becerileri (Adım 1 - 8)',
        stepRange: [1, 8],
        badgeColor: 'from-emerald-500 to-teal-600'
    },
    {
        id: 'section2',
        number: 2,
        title: 'II. Bölüm: Cezm, Med ve Şedde',
        subtitle: 'Tutturma, Uzatma ve Çift Okuma (Adım 9 - 19)',
        stepRange: [9, 19],
        badgeColor: 'from-sky-500 to-indigo-600'
    },
    {
        id: 'section3',
        number: 3,
        title: 'III. Bölüm: Tenvin ve İleri Kaideler',
        subtitle: 'Tenvinler, Zamir, El Takısı ve Mukattaa (Adım 20 - 28)',
        stepRange: [20, 28],
        badgeColor: 'from-amber-500 to-orange-600'
    },
    {
        id: 'section4',
        number: 4,
        title: "IV. Bölüm: Dualar ve Kur'an-ı Kerim",
        subtitle: "Namaz Duaları ve Cüz/Kur'an Sayfa Takibi (Adım 29 - 30)",
        stepRange: [29, 30],
        badgeColor: 'from-rose-500 to-purple-600'
    }
];

// Eski aşama ID'leri ile resmi Diyanet aşama ID'leri arasındaki eşleştirme
export const LEGACY_STAGE_ALIASES: Record<string, string> = {
    'harfler': 'cuz1',
    'ustun1': 'cuz4',
    'ustun': 'cuz5',
    'esre1': 'cuz7',
    'esre': 'cuz7',
    'otre1': 'cuz8',
    'otre': 'cuz8',
    'cezm': 'cuz10',
    'medelif': 'cuz13',
    'medye': 'cuz14',
    'medvav': 'cuz15',
    'sedde': 'cuz18',
    'ikiustun': 'cuz20',
    'ikiesre': 'cuz21',
    'ikiotre': 'cuz22',
    'cuz': 'cuz'
};

// Diyanet Elifba 30 Aşaması
export const DIYANET_ELIFBA_STAGES: ElifbaStage[] = [
    // ──────── I. BÖLÜM: HARFLER VE HAREKELER (1 - 8) ────────
    {
        id: 'cuz1',
        stepNumber: 1,
        section: 'section1',
        sectionTitle: 'I. Bölüm: Harfler ve Harekeler',
        title: 'Adım 1: Harfler (28 Temel Harf)',
        shortTitle: 'Adım 1: Harfler',
        category: 'letters',
        badgeColor: 'from-emerald-500 to-green-600',
        description: "Kur'an-ı Kerim'in 28 temel harfini tanıma ve mahreç okunuşları",
        itemCount: 29,
        imgExt: '',
        audioExt: '',
        folder: 'dosyalar',
        subFolder: '',
        items: ELIFBA_UNITS.find(u => u.id === 'cuz1')?.items.map(i => i.alt || String(i.index)) || []
    },
    {
        id: 'cuz2',
        stepNumber: 2,
        section: 'section1',
        sectionTitle: 'I. Bölüm: Harfler ve Harekeler',
        title: 'Adım 2: Harflerin Harekelerle Okunuşu',
        shortTitle: 'Adım 2: Harekeli Okunuş',
        category: 'harekes',
        badgeColor: 'from-teal-500 to-emerald-600',
        description: 'Üstün, esre ve ötre harekeleriyle harflerin kalın ve ince telaffuzları',
        itemCount: 28,
        imgExt: '',
        audioExt: '',
        folder: 'dosyalar',
        subFolder: '',
        items: ELIFBA_UNITS.find(u => u.id === 'cuz2')?.items.map(i => i.alt || String(i.index)) || []
    },
    {
        id: 'cuz3',
        stepNumber: 3,
        section: 'section1',
        sectionTitle: 'I. Bölüm: Harfler ve Harekeler',
        title: 'Adım 3: Harflerin Başta, Ortada ve Sondaki Durumları',
        shortTitle: 'Adım 3: Bitişme Şekilleri',
        category: 'letters',
        badgeColor: 'from-cyan-500 to-teal-600',
        description: 'Kelimeler birleşirken harflerin başta, ortada ve sonda yazılış biçimleri',
        itemCount: 28,
        imgExt: '',
        audioExt: '',
        folder: 'dosyalar',
        subFolder: '',
        items: ELIFBA_UNITS.find(u => u.id === 'cuz3')?.items.map(i => i.alt || String(i.index)) || []
    },
    {
        id: 'cuz4',
        stepNumber: 4,
        section: 'section1',
        sectionTitle: 'I. Bölüm: Harfler ve Harekeler',
        title: 'Adım 4: Üstün (Fetha) - 1',
        shortTitle: 'Adım 4: Üstün 1',
        category: 'harekes',
        badgeColor: 'from-blue-500 to-cyan-600',
        description: 'Fetha (Üstün) harekesi ile tekli harf okuma çalışmaları',
        itemCount: 18,
        imgExt: '',
        audioExt: '',
        folder: 'dosyalar',
        subFolder: '',
        items: ELIFBA_UNITS.find(u => u.id === 'cuz4')?.items.map(i => i.alt || String(i.index)) || []
    },
    {
        id: 'cuz5',
        stepNumber: 5,
        section: 'section1',
        sectionTitle: 'I. Bölüm: Harfler ve Harekeler',
        title: 'Adım 5: Üstün (Fetha) - 2',
        shortTitle: 'Adım 5: Üstün 2',
        category: 'harekes',
        badgeColor: 'from-sky-500 to-blue-600',
        description: 'Üstünlü harflerle 2 ve 3 harfli kelime birleştirme alıştırmaları',
        itemCount: 14,
        imgExt: '',
        audioExt: '',
        folder: 'dosyalar',
        subFolder: '',
        items: ELIFBA_UNITS.find(u => u.id === 'cuz5')?.items.map(i => i.alt || String(i.index)) || []
    },
    {
        id: 'cuz6',
        stepNumber: 6,
        section: 'section1',
        sectionTitle: 'I. Bölüm: Harfler ve Harekeler',
        title: 'Adım 6: Üstün (Fetha) - 3',
        shortTitle: 'Adım 6: Üstün 3',
        category: 'harekes',
        badgeColor: 'from-indigo-500 to-sky-600',
        description: 'Üstünlü akıcı kelime okuma ve pekiştirme çalışmaları',
        itemCount: 14,
        imgExt: '',
        audioExt: '',
        folder: 'dosyalar',
        subFolder: '',
        items: ELIFBA_UNITS.find(u => u.id === 'cuz6')?.items.map(i => i.alt || String(i.index)) || []
    },
    {
        id: 'cuz7',
        stepNumber: 7,
        section: 'section1',
        sectionTitle: 'I. Bölüm: Harfler ve Harekeler',
        title: 'Adım 7: Esre (Kesra)',
        shortTitle: 'Adım 7: Esre',
        category: 'harekes',
        badgeColor: 'from-purple-500 to-indigo-600',
        description: 'Kesra harekesi ile ince (i) ve kalın (ı) sesler ile kelime okunuşları',
        itemCount: 28,
        imgExt: '',
        audioExt: '',
        folder: 'dosyalar',
        subFolder: '',
        items: ELIFBA_UNITS.find(u => u.id === 'cuz7')?.items.map(i => i.alt || String(i.index)) || []
    },
    {
        id: 'cuz8',
        stepNumber: 8,
        section: 'section1',
        sectionTitle: 'I. Bölüm: Harfler ve Harekeler',
        title: 'Adım 8: Ötre (Damme)',
        shortTitle: 'Adım 8: Ötre',
        category: 'harekes',
        badgeColor: 'from-pink-500 to-rose-600',
        description: 'Damme harekesi ile ince (ü) ve kalın (u) sesler ile 3 harekenin karışık okunuşu',
        itemCount: 28,
        imgExt: '',
        audioExt: '',
        folder: 'dosyalar',
        subFolder: '',
        items: ELIFBA_UNITS.find(u => u.id === 'cuz8')?.items.map(i => i.alt || String(i.index)) || []
    },

    // ──────── II. BÖLÜM: CEZM, MED VE ŞEDDE (9 - 19) ────────
    {
        id: 'cuz9',
        stepNumber: 9,
        section: 'section2',
        sectionTitle: 'II. Bölüm: Cezm, Med ve Şedde',
        title: 'Adım 9: Harflerin Cezimli Okunuşu',
        shortTitle: 'Adım 9: Cezimli Okunuş',
        category: 'rules',
        badgeColor: 'from-amber-500 to-orange-600',
        description: 'Cezm (Sükun) ile harfleri birbirine tutturarak çıkarma alıştırmaları',
        itemCount: 27,
        imgExt: '',
        audioExt: '',
        folder: 'dosyalar',
        subFolder: '',
        items: ELIFBA_UNITS.find(u => u.id === 'cuz9')?.items.map(i => i.alt || String(i.index)) || []
    },
    {
        id: 'cuz10',
        stepNumber: 10,
        section: 'section2',
        sectionTitle: 'II. Bölüm: Cezm, Med ve Şedde',
        title: 'Adım 10: Cezm (Sükun)',
        shortTitle: 'Adım 10: Cezm',
        category: 'rules',
        badgeColor: 'from-orange-500 to-amber-600',
        description: 'Cezimli kelimeleri doğru duraklayarak ve tutarak okuma',
        itemCount: 28,
        imgExt: '',
        audioExt: '',
        folder: 'dosyalar',
        subFolder: '',
        items: ELIFBA_UNITS.find(u => u.id === 'cuz10')?.items.map(i => i.alt || String(i.index)) || []
    },
    {
        id: 'cuz11',
        stepNumber: 11,
        section: 'section2',
        sectionTitle: 'II. Bölüm: Cezm, Med ve Şedde',
        title: 'Adım 11: Alıştırmalar 1 (Cezm)',
        shortTitle: 'Adım 11: Alıştırmalar 1',
        category: 'rules',
        badgeColor: 'from-yellow-600 to-amber-600',
        description: 'Cezm ve 3 harekenin bir arada kullanıldığı kelime okuma talimi',
        itemCount: 28,
        imgExt: '',
        audioExt: '',
        folder: 'dosyalar',
        subFolder: '',
        items: ELIFBA_UNITS.find(u => u.id === 'cuz11')?.items.map(i => i.alt || String(i.index)) || []
    },
    {
        id: 'cuz12',
        stepNumber: 12,
        section: 'section2',
        sectionTitle: 'II. Bölüm: Cezm, Med ve Şedde',
        title: 'Adım 12: Harflerin Uzatılarak Okunuşu',
        shortTitle: 'Adım 12: Uzatma Giriş',
        category: 'med',
        badgeColor: 'from-teal-500 to-emerald-600',
        description: 'Med harfleri (Elif, Vav, Ye) ile harfleri bir elif miktarı uzatma mantığı',
        itemCount: 28,
        imgExt: '',
        audioExt: '',
        folder: 'dosyalar',
        subFolder: '',
        items: ELIFBA_UNITS.find(u => u.id === 'cuz12')?.items.map(i => i.alt || String(i.index)) || []
    },
    {
        id: 'cuz13',
        stepNumber: 13,
        section: 'section2',
        sectionTitle: 'II. Bölüm: Cezm, Med ve Şedde',
        title: 'Adım 13: Med Harfi: Elif ( ا )',
        shortTitle: 'Adım 13: Med Elif',
        category: 'med',
        badgeColor: 'from-emerald-600 to-teal-600',
        description: "Üstünden sonra gelen hareketsiz elif ile 'aa' sesiyle uzatma",
        itemCount: 28,
        imgExt: '',
        audioExt: '',
        folder: 'dosyalar',
        subFolder: '',
        items: ELIFBA_UNITS.find(u => u.id === 'cuz13')?.items.map(i => i.alt || String(i.index)) || []
    },
    {
        id: 'cuz14',
        stepNumber: 14,
        section: 'section2',
        sectionTitle: 'II. Bölüm: Cezm, Med ve Şedde',
        title: 'Adım 14: Med Harfi: Yâ ( ى )',
        shortTitle: 'Adım 14: Med Yâ',
        category: 'med',
        badgeColor: 'from-cyan-600 to-blue-600',
        description: "Esreden sonra gelen hareketsiz ye ile 'ii / ıı' sesiyle uzatma",
        itemCount: 28,
        imgExt: '',
        audioExt: '',
        folder: 'dosyalar',
        subFolder: '',
        items: ELIFBA_UNITS.find(u => u.id === 'cuz14')?.items.map(i => i.alt || String(i.index)) || []
    },
    {
        id: 'cuz15',
        stepNumber: 15,
        section: 'section2',
        sectionTitle: 'II. Bölüm: Cezm, Med ve Şedde',
        title: 'Adım 15: Med Harfi: Vâv ( و )',
        shortTitle: 'Adım 15: Med Vâv',
        category: 'med',
        badgeColor: 'from-blue-600 to-indigo-600',
        description: "Ötreden sonra gelen hareketsiz vav ile 'uu / üü' sesiyle uzatma",
        itemCount: 28,
        imgExt: '',
        audioExt: '',
        folder: 'dosyalar',
        subFolder: '',
        items: ELIFBA_UNITS.find(u => u.id === 'cuz15')?.items.map(i => i.alt || String(i.index)) || []
    },
    {
        id: 'cuz16',
        stepNumber: 16,
        section: 'section2',
        sectionTitle: 'II. Bölüm: Cezm, Med ve Şedde',
        title: 'Adım 16: Alıştırmalar 2 (Med Harfleri)',
        shortTitle: 'Adım 16: Alıştırmalar 2',
        category: 'med',
        badgeColor: 'from-violet-600 to-purple-600',
        description: 'Üç med harfinin kelimelerde karışık alıştırmaları ve karşılaştırmaları',
        itemCount: 28,
        imgExt: '',
        audioExt: '',
        folder: 'dosyalar',
        subFolder: '',
        items: ELIFBA_UNITS.find(u => u.id === 'cuz16')?.items.map(i => i.alt || String(i.index)) || []
    },
    {
        id: 'cuz17',
        stepNumber: 17,
        section: 'section2',
        sectionTitle: 'II. Bölüm: Cezm, Med ve Şedde',
        title: 'Adım 17: Harflerin Şeddeli Okunuşu',
        shortTitle: 'Adım 17: Şeddeli Okunuş',
        category: 'rules',
        badgeColor: 'from-rose-500 to-red-600',
        description: 'Şeddeli harfleri biri sakin biri harekeli olarak çift okuma mantığı',
        itemCount: 27,
        imgExt: '',
        audioExt: '',
        folder: 'dosyalar',
        subFolder: '',
        items: ELIFBA_UNITS.find(u => u.id === 'cuz17')?.items.map(i => i.alt || String(i.index)) || []
    },
    {
        id: 'cuz18',
        stepNumber: 18,
        section: 'section2',
        sectionTitle: 'II. Bölüm: Cezm, Med ve Şedde',
        title: 'Adım 18: Şedde',
        shortTitle: 'Adım 18: Şedde',
        category: 'rules',
        badgeColor: 'from-red-600 to-rose-700',
        description: 'Şeddeli kelimeleri doğru ritim ve vurgu ile okuma talimi',
        itemCount: 28,
        imgExt: '',
        audioExt: '',
        folder: 'dosyalar',
        subFolder: '',
        items: ELIFBA_UNITS.find(u => u.id === 'cuz18')?.items.map(i => i.alt || String(i.index)) || []
    },
    {
        id: 'cuz19',
        stepNumber: 19,
        section: 'section2',
        sectionTitle: 'II. Bölüm: Cezm, Med ve Şedde',
        title: 'Adım 19: Alıştırmalar 3 (Şedde)',
        shortTitle: 'Adım 19: Alıştırmalar 3',
        category: 'rules',
        badgeColor: 'from-rose-600 to-pink-600',
        description: 'Şedde, cezm ve med harflerinin birleştiği zengin kelimeleri okuma',
        itemCount: 28,
        imgExt: '',
        audioExt: '',
        folder: 'dosyalar',
        subFolder: '',
        items: ELIFBA_UNITS.find(u => u.id === 'cuz19')?.items.map(i => i.alt || String(i.index)) || []
    },

    // ──────── III. BÖLÜM: TENVİN VE İLERİ KAİDELER (20 - 28) ────────
    {
        id: 'cuz20',
        stepNumber: 20,
        section: 'section3',
        sectionTitle: 'III. Bölüm: Tenvin ve İleri Kaideler',
        title: 'Adım 20: Tenvin: İki Üstün (-en / -an)',
        shortTitle: 'Adım 20: İki Üstün',
        category: 'tanwin',
        badgeColor: 'from-amber-600 to-yellow-600',
        description: "Kelime sonundaki iki üstün ile '-en / -an' sesi çıkarma",
        itemCount: 28,
        imgExt: '',
        audioExt: '',
        folder: 'dosyalar',
        subFolder: '',
        items: ELIFBA_UNITS.find(u => u.id === 'cuz20')?.items.map(i => i.alt || String(i.index)) || []
    },
    {
        id: 'cuz21',
        stepNumber: 21,
        section: 'section3',
        sectionTitle: 'III. Bölüm: Tenvin ve İleri Kaideler',
        title: 'Adım 21: Tenvin: İki Esre (-in / -ın)',
        shortTitle: 'Adım 21: İki Esre',
        category: 'tanwin',
        badgeColor: 'from-yellow-600 to-amber-700',
        description: "Kelime sonundaki iki esre ile '-in / -ın' sesi çıkarma",
        itemCount: 28,
        imgExt: '',
        audioExt: '',
        folder: 'dosyalar',
        subFolder: '',
        items: ELIFBA_UNITS.find(u => u.id === 'cuz21')?.items.map(i => i.alt || String(i.index)) || []
    },
    {
        id: 'cuz22',
        stepNumber: 22,
        section: 'section3',
        sectionTitle: 'III. Bölüm: Tenvin ve İleri Kaideler',
        title: 'Adım 22: Tenvin: İki Ötre (-ün / -un)',
        shortTitle: 'Adım 22: İki Ötre',
        category: 'tanwin',
        badgeColor: 'from-orange-600 to-red-600',
        description: "Kelime sonundaki iki ötre ile '-ün / -un' sesi çıkarma",
        itemCount: 28,
        imgExt: '',
        audioExt: '',
        folder: 'dosyalar',
        subFolder: '',
        items: ELIFBA_UNITS.find(u => u.id === 'cuz22')?.items.map(i => i.alt || String(i.index)) || []
    },
    {
        id: 'cuz23',
        stepNumber: 23,
        section: 'section3',
        sectionTitle: 'III. Bölüm: Tenvin ve İleri Kaideler',
        title: 'Adım 23: Çeker (Asâ)',
        shortTitle: 'Adım 23: Çeker',
        category: 'med',
        badgeColor: 'from-emerald-600 to-teal-700',
        description: 'Dik üstün ve dik esre ile harfi uzatarak okuma (Çeker kaidesi)',
        itemCount: 28,
        imgExt: '',
        audioExt: '',
        folder: 'dosyalar',
        subFolder: '',
        items: ELIFBA_UNITS.find(u => u.id === 'cuz23')?.items.map(i => i.alt || String(i.index)) || []
    },
    {
        id: 'cuz24',
        stepNumber: 24,
        section: 'section3',
        sectionTitle: 'III. Bölüm: Tenvin ve İleri Kaideler',
        title: 'Adım 24: Vav ve Ya Şeklinde Yazılan Elif',
        shortTitle: 'Adım 24: Şekil Elif',
        category: 'advanced',
        badgeColor: 'from-purple-600 to-indigo-700',
        description: 'Vav ve ya harfi şeklinde yazıldığı halde Elif gibi uzatılan özel kelimeler',
        itemCount: 28,
        imgExt: '',
        audioExt: '',
        folder: 'dosyalar',
        subFolder: '',
        items: ELIFBA_UNITS.find(u => u.id === 'cuz24')?.items.map(i => i.alt || String(i.index)) || []
    },
    {
        id: 'cuz25',
        stepNumber: 25,
        section: 'section3',
        sectionTitle: 'III. Bölüm: Tenvin ve İleri Kaideler',
        title: 'Adım 25: Zamir (Hâ Harfi)',
        shortTitle: 'Adım 25: Zamir (Hâ)',
        category: 'advanced',
        badgeColor: 'from-indigo-600 to-violet-700',
        description: 'Kelime sonundaki zamir olan hâ harfinin uzatılarak veya uzatılmadan okunuşu',
        itemCount: 28,
        imgExt: '',
        audioExt: '',
        folder: 'dosyalar',
        subFolder: '',
        items: ELIFBA_UNITS.find(u => u.id === 'cuz25')?.items.map(i => i.alt || String(i.index)) || []
    },
    {
        id: 'cuz26',
        stepNumber: 26,
        section: 'section3',
        sectionTitle: 'III. Bölüm: Tenvin ve İleri Kaideler',
        title: 'Adım 26: El Takısı (Lâm-ı Tarif)',
        shortTitle: 'Adım 26: El Takısı',
        category: 'rules',
        badgeColor: 'from-cyan-600 to-sky-700',
        description: 'Şemsî ve Kamerî harfler: El takısının okunduğu ve şeddeli okunduğu durumlar',
        itemCount: 28,
        imgExt: '',
        audioExt: '',
        folder: 'dosyalar',
        subFolder: '',
        items: ELIFBA_UNITS.find(u => u.id === 'cuz26')?.items.map(i => i.alt || String(i.index)) || []
    },
    {
        id: 'cuz27',
        stepNumber: 27,
        section: 'section3',
        sectionTitle: 'III. Bölüm: Tenvin ve İleri Kaideler',
        title: 'Adım 27: Okunmayan Elif ve Elif-Lâm',
        shortTitle: 'Adım 27: Okunmayan Harfler',
        category: 'rules',
        badgeColor: 'from-amber-600 to-orange-700',
        description: 'Yazıldığı halde telaffuz edilmeyen elif ve elif-lam birleşim kuralları',
        itemCount: 28,
        imgExt: '',
        audioExt: '',
        folder: 'dosyalar',
        subFolder: '',
        items: ELIFBA_UNITS.find(u => u.id === 'cuz27')?.items.map(i => i.alt || String(i.index)) || []
    },
    {
        id: 'cuz28',
        stepNumber: 28,
        section: 'section3',
        sectionTitle: 'III. Bölüm: Tenvin ve İleri Kaideler',
        title: 'Adım 28: Lafzatullah, Hurûf-u Mukattaa, Med Harfleri',
        shortTitle: 'Adım 28: Lafzatullah & Mukattaa',
        category: 'advanced',
        badgeColor: 'from-pink-600 to-rose-700',
        description: "Allah lafzının kalın/ince okunuşu, sûre başı mukattaa harfleri ve med kaideleri",
        itemCount: 28,
        imgExt: '',
        audioExt: '',
        folder: 'dosyalar',
        subFolder: '',
        items: ELIFBA_UNITS.find(u => u.id === 'cuz28')?.items.map(i => i.alt || String(i.index)) || []
    },

    // ──────── IV. BÖLÜM: DUALAR VE KUR'AN-I KERİM (29 - 30) ────────
    {
        id: 'dualar',
        stepNumber: 29,
        section: 'section4',
        sectionTitle: "IV. Bölüm: Dualar ve Kur'an-ı Kerim",
        title: 'Adım 29: Namaz Duaları ve Sureler',
        shortTitle: 'Adım 29: Dualar & Sureler',
        category: 'dualar',
        badgeColor: 'from-rose-500 via-pink-600 to-purple-600',
        description: 'Sübhaneke, Tahiyyat, Salli-Barik, Rabbena ve Kunut duaları talimi',
        itemCount: 33, // 8 namaz duasının toplam 33 parçası
        imgExt: '',
        audioExt: '',
        folder: 'dosyalar',
        subFolder: '',
        items: ELIFBA_UNITS.filter(u => u.type === 'dua').flatMap(u => u.items.map(i => i.alt || `${u.shortTitle} #${i.index}`))
    },
    {
        id: 'cuz',
        stepNumber: 30,
        section: 'section4',
        sectionTitle: "IV. Bölüm: Dualar ve Kur'an-ı Kerim",
        title: "Adım 30: Kur'an-ı Kerim / Cüz Okuma",
        shortTitle: "Adım 30: Kur'an & Cüz",
        category: 'quran',
        badgeColor: 'from-emerald-600 via-teal-600 to-cyan-600',
        description: "Elifba tamamlandıktan sonra 30 Cüz ve 604 sayfa Kur'an-ı Kerim takibi",
        itemCount: 30,
        imgExt: '',
        audioExt: '',
        folder: '',
        subFolder: '',
        items: []
    }
];

// Geriye dönük uyumluluk için ELIFBA_STAGES, 30 Diyanet aşamasını temsil eder
export const ELIFBA_STAGES: ElifbaStage[] = DIYANET_ELIFBA_STAGES;

export const CATEGORY_LABELS: Record<ElifbaStage['category'], { label: string; color: string }> = {
    letters: { label: 'Harfler', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
    harekes: { label: 'Harekeler', color: 'bg-sky-500/20 text-sky-300 border-sky-500/30' },
    rules: { label: 'Kurallar (Cezm/Şedde)', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
    med: { label: 'Med Harfleri & Çeker', color: 'bg-teal-500/20 text-teal-300 border-teal-500/30' },
    tanwin: { label: 'Tenvinler', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
    advanced: { label: 'Özel Kaideler', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
    dualar: { label: 'Namaz Duaları', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
    quran: { label: "Kur'an & Cüz", color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
};

/**
 * 28 Derslik Elifba ve 8 Namaz Duasını ElifbaStage formatına dönüştürür.
 */
export const EXTENDED_ELIFBA_STAGES: ElifbaStage[] = ELIFBA_UNITS.map(u => {
    const isCuz = u.type === 'cuz';
    const stepNumber = isCuz ? u.number : 29;
    const section = stepNumber <= 8 ? 'section1' : stepNumber <= 19 ? 'section2' : stepNumber <= 28 ? 'section3' : 'section4';
    const sectionTitle = DIYANET_SECTIONS.find(s => s.id === section)?.title || '';

    return {
        id: u.id,
        stepNumber,
        section,
        sectionTitle,
        title: u.title,
        shortTitle: u.shortTitle,
        category: u.category as any,
        badgeColor: u.badgeColor,
        description: u.description,
        itemCount: u.itemCount,
        imgExt: '',
        audioExt: '',
        folder: 'dosyalar',
        subFolder: '',
        items: u.items.map(i => i.alt || String(i.index))
    };
});

/**
 * Tüm aşamalar (30 Diyanet Aşaması + 8 Münferit Namaz Duası)
 */
export const ALL_ELIFBA_STAGES: ElifbaStage[] = [
    ...DIYANET_ELIFBA_STAGES,
    ...EXTENDED_ELIFBA_STAGES.filter(s => s.id.startsWith('dua'))
];

/**
 * Eski veya yeni aşama ID'sini Diyanet Adım Numarasına (1 - 30) dönüştürür.
 */
export function getDiyanetStepNumber(stageId: string, cuzPage?: number): number {
    if ((cuzPage && cuzPage > 0) || stageId === 'cuz') {
        return 30;
    }
    const resolvedId = LEGACY_STAGE_ALIASES[stageId] || stageId;
    if (resolvedId.startsWith('dua')) {
        return 29;
    }
    const stage = DIYANET_ELIFBA_STAGES.find(s => s.id === resolvedId);
    return stage ? stage.stepNumber : 1;
}

/**
 * Belirli bir adım numarasına (1 - 30) ait Diyanet aşamasını döndürür.
 */
export function getDiyanetStageByStep(stepNumber: number): ElifbaStage | undefined {
    return DIYANET_ELIFBA_STAGES.find(s => s.stepNumber === stepNumber);
}

/**
 * Mevcut aşamadan bir sonraki Diyanet aşamasını bulur.
 */
export function getNextDiyanetStage(currentStageId: string): ElifbaStage | null {
    const currentStep = getDiyanetStepNumber(currentStageId);
    if (currentStep >= 30) return null;
    return getDiyanetStageByStep(currentStep + 1) || null;
}

/**
 * Eski aşama kimliğini (örn. 'harfler', 'ustun1') yeni Diyanet aşama ID'sine dönüştürür.
 */
export function mapLegacyStageIdToDiyanet(stageId: string): string {
    return LEGACY_STAGE_ALIASES[stageId] || stageId;
}

/**
 * Bir aşamanın tamamlanıp tamamlanmadığını eski ve yeni kimlikleri hesaba katarak kontrol eder.
 */
export function isDiyanetStageCompleted(stages: Record<string, { status: string }> | undefined, stageId: string): boolean {
    if (!stages) return false;
    // Doğrudan kontrol
    if (stages[stageId]?.status === 'completed') return true;

    // Legacy alias kontrolü
    for (const [legacyId, mappedId] of Object.entries(LEGACY_STAGE_ALIASES)) {
        if (mappedId === stageId && stages[legacyId]?.status === 'completed') {
            return true;
        }
    }
    return false;
}

/**
 * Belirli bir aşama ve kart index'i için public URL'lerini döndürür.
 * 30 Diyanet aşaması, 28 Cüz dersi, 8 Namaz duası ve klasik aşamaların tümünü destekler.
 * @param stageId Aşama ID'si (örn. 'cuz1'..'cuz28', 'dualar', 'dua1'..'dua8', 'ustun1', vb.)
 * @param itemIndex 1'den başlayan kart sırası (örn. 1, 2, ... 28)
 */
export function getStageItemAssetUrls(stageId: string, itemIndex: number): { img: string; audio: string; name: string } | null {
    const resolvedId = mapLegacyStageIdToDiyanet(stageId);

    // 1. Dualar toplu aşaması ('dualar')
    if (resolvedId === 'dualar') {
        const allDuaItems = ELIFBA_UNITS.filter(u => u.type === 'dua').flatMap(u => u.items);
        if (allDuaItems.length === 0) return null;
        const idx = Math.max(1, Math.min(itemIndex, allDuaItems.length)) - 1;
        const item = allDuaItems[idx];
        return {
            name: item.alt || `Dua Parçası #${idx + 1}`,
            img: item.img,
            audio: item.audio
        };
    }

    // 2. Münferit bir ELIFBA_UNITS dersi (cuz1..cuz28 veya dua1..dua8)
    const unit = ELIFBA_UNITS.find(u => u.id === resolvedId || u.id === stageId);
    if (unit && unit.items && unit.items.length > 0) {
        const idx = Math.max(1, Math.min(itemIndex, unit.items.length)) - 1;
        const item = unit.items[idx];
        return {
            name: item.alt || `${unit.shortTitle} #${idx + 1}`,
            img: item.img,
            audio: item.audio
        };
    }

    // 3. Klasik klasör yapısına sahip eski aşamalar (yedek kontrol)
    const classicFolders: Record<string, { folder: string; imgExt: string; audioExt: string }> = {
        'harfler': { folder: 'harfler/harfler', imgExt: '.png', audioExt: '.mp3' },
        'ustun1': { folder: 'ustun1/ustun1', imgExt: '.jpg', audioExt: '.m4a' },
        'ustun': { folder: 'ustun/ustun', imgExt: '.png', audioExt: '.mp3' },
        'esre1': { folder: 'esre1/esre1', imgExt: '.jpg', audioExt: '.m4a' },
        'esre': { folder: 'esre/esre', imgExt: '.png', audioExt: '.mp3' },
        'otre1': { folder: 'otre1/otre1', imgExt: '.jpg', audioExt: '.m4a' },
        'otre': { folder: 'otre/otre', imgExt: '.png', audioExt: '.mp3' },
        'cezm': { folder: 'cezm/cezm', imgExt: '.png', audioExt: '.mp3' },
        'sedde': { folder: 'sedde/sedde', imgExt: '.png', audioExt: '.mp3' },
        'medelif': { folder: 'medelif/medelif', imgExt: '.png', audioExt: '.mp3' },
        'medvav': { folder: 'medvav/medvav', imgExt: '.png', audioExt: '.mp3' },
        'medye': { folder: 'medye/medye', imgExt: '.png', audioExt: '.mp3' },
        'ikiustun': { folder: 'ikiustun/ikiustun', imgExt: '.png', audioExt: '.mp3' },
        'ikiesre': { folder: 'ikiesre/ikiesre', imgExt: '.png', audioExt: '.mp3' },
        'ikiotre': { folder: 'ikiotre/ikiotre', imgExt: '.png', audioExt: '.mp3' },
    };

    const classic = classicFolders[stageId];
    if (classic) {
        const base = `/elifba/${classic.folder}/${itemIndex}`;
        return {
            name: `Örnek #${itemIndex}`,
            img: `${base}${classic.imgExt}`,
            audio: `${base}${classic.audioExt}`
        };
    }

    return null;
}
