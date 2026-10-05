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
        let name = item.alt;
        if (!name || (name === 'Elif' && (resolvedId !== 'cuz1' || itemIndex > 1))) {
            name = `${unit.shortTitle} #${idx + 1}`;
        }
        return {
            name,
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

// 29 Temel Harfin Otantik İsimleri ve Mahreçleri (Elifba Entegrasyonu)
export const CUZ1_LETTER_META: Record<number, { name: string; arabic: string; desc: string }> = {
    1: { name: 'Elif', arabic: 'ا', desc: 'Boğaz sonu - "E" sesi gibidir' },
    2: { name: 'Be', arabic: 'ب', desc: 'Alt ve üst dudak - "B" sesi gibidir' },
    3: { name: 'Te', arabic: 'ت', desc: 'Dil ucu ile ön diş dipleri - "T" sesi gibidir' },
    4: { name: 'Se (Peltek)', arabic: 'ث', desc: 'Dil ucu ile ön diş uçları - Peltek "S"' },
    5: { name: 'Cim', arabic: 'ج', desc: 'Dil ortası ve üst damak - "C" sesi' },
    6: { name: 'Ha', arabic: 'ح', desc: 'Boğaz ortası - Hırıltısız temiz "H"' },
    7: { name: 'Hı', arabic: 'خ', desc: 'Boğazın ağza en yakın kısmı - Hırıltılı "H"' },
    8: { name: 'Dal', arabic: 'د', desc: 'Dil ucu ile üst ön diş dipleri - "D" sesi' },
    9: { name: 'Zel (Peltek)', arabic: 'ذ', desc: 'Dil ucu ile ön diş uçları - Peltek "Z"' },
    10: { name: 'Ra', arabic: 'ر', desc: 'Dil ucu ile ön damak - "R" sesi' },
    11: { name: 'Ze', arabic: 'ز', desc: 'Dil ucu ile alt dişler - Keskin "Z" sesi' },
    12: { name: 'Sin', arabic: 'س', desc: 'Dil ucu ile alt dişler - Keskin "S" sesi' },
    13: { name: 'Şın', arabic: 'ش', desc: 'Dil ortası ve üst damak - Yumuşak "Ş" sesi' },
    14: { name: 'Sad', arabic: 'ص', desc: 'Dil ucu ile alt ön dişler - Kalın "S" sesi (Sa)' },
    15: { name: 'Dad', arabic: 'ض', desc: 'Dil kenarı ve üst azı dişler - Kalın harf' },
    16: { name: 'Tı', arabic: 'ط', desc: 'Dil ucu ile üst diş dipleri - Kalın "T" sesi (Ta)' },
    17: { name: 'Zı (Peltek)', arabic: 'ظ', desc: 'Dil ucu ve ön diş uçları - Kalın Peltek "Z"' },
    18: { name: 'Ayn', arabic: 'ع', desc: 'Boğaz ortası sıkılarak çıkarılan boğaz harfi' },
    19: { name: 'Gayn', arabic: 'غ', desc: 'Boğazın ağza en yakın kısmı - Yumuşak "G"' },
    20: { name: 'Fe', arabic: 'ف', desc: 'Üst ön dişler ve alt dudak - "F" sesi' },
    21: { name: 'Kaf', arabic: 'ق', desc: 'Dil kökü ve küçük dil - Kalın "K" sesi (Ka)' },
    22: { name: 'Kef', arabic: 'ك', desc: 'Dil kökü önü - İnce "K" sesi (Ke)' },
    23: { name: 'Lam', arabic: 'ل', desc: 'Dil ucu ve üst damak - "L" sesi' },
    24: { name: 'Mim', arabic: 'م', desc: 'Alt ve üst dudak kapanarak - "M" sesi' },
    25: { name: 'Nun', arabic: 'ن', desc: 'Dil ucu ve iki üst ön diş eti - "N" sesi' },
    26: { name: 'Vav', arabic: 'و', desc: 'Dudaklar ileri uzatılarak - "V" sesi' },
    27: { name: 'He', arabic: 'ه', desc: 'Boğaz sonu / Göğüs - Hafif "H" sesi' },
    28: { name: 'Lamelif', arabic: 'لا', desc: 'Lam (ل) ve Elif (ا) harflerinin birleşimi' },
    29: { name: 'Ye', arabic: 'ى', desc: 'Dil ortası ve üst damak - "Y" sesi' },
};

// Adım 2: Harflerin Harekelerle Okunuşu (28 Harf)
export const CUZ2_LETTER_META: Record<number, { name: string; arabic: string; desc: string }> = {
    1: { name: 'Elif (Harekeli)', arabic: 'اَ اِ اُ', desc: 'Elif harfinin harekelerle (E, İ, Ü) okunuşu' },
    2: { name: 'Be (Harekeli)', arabic: 'بَ بِ بُ', desc: 'Be harfinin harekelerle (Be, Bi, Bü) okunuşu' },
    3: { name: 'Te (Harekeli)', arabic: 'تَ تِ تُ', desc: 'Te harfinin harekelerle (Te, Ti, Tü) okunuşu' },
    4: { name: 'Se (Peltek - Harekeli)', arabic: 'ثَ ثِ ثُ', desc: 'Peltek Se harfinin harekelerle (Se, Si, Sü) okunuşu' },
    5: { name: 'Cim (Harekeli)', arabic: 'جَ جِ جُ', desc: 'Cim harfinin harekelerle (Ce, Ci, Cü) okunuşu' },
    6: { name: 'Ha (Harekeli)', arabic: 'حَ حِ حُ', desc: 'Ha harfinin harekelerle (Ha, Hı, Hu) okunuşu' },
    7: { name: 'Hı (Harekeli)', arabic: 'خَ خِ خُ', desc: 'Hırıltılı Hı harfinin harekelerle (Ha, Hı, Hu) okunuşu' },
    8: { name: 'Dal (Harekeli)', arabic: 'دَ دِ دُ', desc: 'Dal harfinin harekelerle (De, Di, Dü) okunuşu' },
    9: { name: 'Zel (Peltek - Harekeli)', arabic: 'ذَ ذِ ذُ', desc: 'Peltek Zel harfinin harekelerle (Ze, Zi, Zü) okunuşu' },
    10: { name: 'Ra (Harekeli)', arabic: 'رَ رِ رُ', desc: 'Ra harfinin harekelerle (Ra, Ri, Ru) okunuşu' },
    11: { name: 'Ze (Harekeli)', arabic: 'زَ زِ زُ', desc: 'Ze harfinin harekelerle (Ze, Zi, Zü) okunuşu' },
    12: { name: 'Sin (Harekeli)', arabic: 'سَ سِ سُ', desc: 'Sin harfinin harekelerle (Se, Si, Sü) okunuşu' },
    13: { name: 'Şın (Harekeli)', arabic: 'شَ شِ شُ', desc: 'Şın harfinin harekelerle (Şe, Şi, Şü) okunuşu' },
    14: { name: 'Sad (Harekeli)', arabic: 'صَ صِ صُ', desc: 'Kalın Sad harfinin harekelerle (Sa, Sı, Su) okunuşu' },
    15: { name: 'Dad (Harekeli)', arabic: 'ضَ ضِ ضُ', desc: 'Kalın Dad harfinin harekelerle (Da, Dı, Du) okunuşu' },
    16: { name: 'Tı (Harekeli)', arabic: 'طَ طِ طُ', desc: 'Kalın Tı harfinin harekelerle (Ta, Tı, Tu) okunuşu' },
    17: { name: 'Zı (Peltek - Harekeli)', arabic: 'ظَ ظِ ظُ', desc: 'Kalın Peltek Zı harfinin harekelerle (Za, Zı, Zu) okunuşu' },
    18: { name: 'Ayn (Harekeli)', arabic: 'عَ عِ عُ', desc: 'Boğaz harfi Ayn üstün, esre ve ötre ile okunuşu' },
    19: { name: 'Gayn (Harekeli)', arabic: 'غَ غِ غُ', desc: 'Kalın Gayn harfinin harekelerle (Ğa, Ğı, Ğu) okunuşu' },
    20: { name: 'Fe (Harekeli)', arabic: 'فَ فِ فُ', desc: 'Fe harfinin harekelerle (Fe, Fi, Fü) okunuşu' },
    21: { name: 'Kaf (Harekeli)', arabic: 'قَ قِ قُ', desc: 'Kalın Kaf harfinin harekelerle (Ka, Kı, Ku) okunuşu' },
    22: { name: 'Kef (Harekeli)', arabic: 'كَ كِ كُ', desc: 'İnce Kef harfinin harekelerle (Ke, Ki, Kü) okunuşu' },
    23: { name: 'Lam (Harekeli)', arabic: 'لَ لِ لُ', desc: 'Lam harfinin harekelerle (Le, Li, Lü) okunuşu' },
    24: { name: 'Mim (Harekeli)', arabic: 'مَ مِ مُ', desc: 'Mim harfinin harekelerle (Me, Mi, Mü) okunuşu' },
    25: { name: 'Nun (Harekeli)', arabic: 'نَ نِ نُ', desc: 'Nun harfinin harekelerle (Ne, Ni, Nü) okunuşu' },
    26: { name: 'Vav (Harekeli)', arabic: 'وَ وِ وُ', desc: 'Vav harfinin harekelerle (Ve, Vi, Vü) okunuşu' },
    27: { name: 'He (Harekeli)', arabic: 'هَ هِ هُ', desc: 'He harfinin harekelerle (He, Hi, Hü) okunuşu' },
    28: { name: 'Ye (Harekeli)', arabic: 'يَ يِ يُ', desc: 'Ye harfinin harekelerle (Ye, Yi, Yü) okunuşu' },
};

// Adım 3: Harflerin Başta, Ortada ve Sondaki Durumları (28 Harf)
export const CUZ3_LETTER_META: Record<number, { name: string; arabic: string; desc: string }> = {
    1: { name: 'Elif (Bitişme)', arabic: 'ا ـا', desc: 'Elif harfinin başta, ortada ve sonda yazılış biçimleri' },
    2: { name: 'Be (Bitişme)', arabic: 'بـ ـبـ ـب', desc: 'Be harfinin başta, ortada ve sonda yazılış biçimleri' },
    3: { name: 'Te (Bitişme)', arabic: 'تـ ـتـ ـت', desc: 'Te harfinin başta, ortada ve sonda yazılış biçimleri' },
    4: { name: 'Se (Peltek - Bitişme)', arabic: 'ثـ ـثـ ـث', desc: 'Peltek Se harfinin başta, ortada ve sonda yazılış biçimleri' },
    5: { name: 'Cim (Bitişme)', arabic: 'جـ ـجـ ـج', desc: 'Cim harfinin başta, ortada ve sonda yazılış biçimleri' },
    6: { name: 'Ha (Bitişme)', arabic: 'حـ ـحـ ـح', desc: 'Ha harfinin başta, ortada ve sonda yazılış biçimleri' },
    7: { name: 'Hı (Bitişme)', arabic: 'خـ ـخـ ـخ', desc: 'Hı harfinin başta, ortada ve sonda yazılış biçimleri' },
    8: { name: 'Dal (Bitişme)', arabic: 'د ـد', desc: 'Dal harfi kendinden sonraki harfle bitişmez' },
    9: { name: 'Zel (Peltek - Bitişme)', arabic: 'ذ ـذ', desc: 'Zel harfi kendinden sonraki harfle bitişmez' },
    10: { name: 'Ra (Bitişme)', arabic: 'ر ـر', desc: 'Ra harfi kendinden sonraki harfle bitişmez' },
    11: { name: 'Ze (Bitişme)', arabic: 'ز ـز', desc: 'Ze harfi kendinden sonraki harfle bitişmez' },
    12: { name: 'Sin (Bitişme)', arabic: 'سـ ـسـ ـس', desc: 'Sin harfinin başta, ortada ve sonda yazılış biçimleri' },
    13: { name: 'Şın (Bitişme)', arabic: 'شـ ـشـ ـش', desc: 'Şın harfinin başta, ortada ve sonda yazılış biçimleri' },
    14: { name: 'Sad (Bitişme)', arabic: 'صـ ـصـ ـص', desc: 'Sad harfinin başta, ortada ve sonda yazılış biçimleri' },
    15: { name: 'Dad (Bitişme)', arabic: 'ضـ ـضـ ـض', desc: 'Dad harfinin başta, ortada ve sonda yazılış biçimleri' },
    16: { name: 'Tı (Bitişme)', arabic: 'طـ ـطـ ـط', desc: 'Tı harfinin başta, ortada ve sonda yazılış biçimleri' },
    17: { name: 'Zı (Peltek - Bitişme)', arabic: 'ظـ ـظـ ـظ', desc: 'Zı harfinin başta, ortada ve sonda yazılış biçimleri' },
    18: { name: 'Ayn (Bitişme)', arabic: 'عـ ـعـ ـع', desc: 'Ayn harfinin başta, ortada ve sonda yazılış biçimleri' },
    19: { name: 'Gayn (Bitişme)', arabic: 'غـ ـغـ ـغ', desc: 'Gayn harfinin başta, ortada ve sonda yazılış biçimleri' },
    20: { name: 'Fe (Bitişme)', arabic: 'فـ ـفـ ـف', desc: 'Fe harfinin başta, ortada ve sonda yazılış biçimleri' },
    21: { name: 'Kaf (Bitişme)', arabic: 'قـ ـقـ ـق', desc: 'Kaf harfinin başta, ortada ve sonda yazılış biçimleri' },
    22: { name: 'Kef (Bitişme)', arabic: 'كـ ـكـ ـك', desc: 'Kef harfinin başta, ortada ve sonda yazılış biçimleri' },
    23: { name: 'Lam (Bitişme)', arabic: 'لـ ـلـ ـل', desc: 'Lam harfinin başta, ortada ve sonda yazılış biçimleri' },
    24: { name: 'Mim (Bitişme)', arabic: 'مـ ـمـ ـم', desc: 'Mim harfinin başta, ortada ve sonda yazılış biçimleri' },
    25: { name: 'Nun (Bitişme)', arabic: 'نـ ـنـ ـن', desc: 'Nun harfinin başta, ortada ve sonda yazılış biçimleri' },
    26: { name: 'Vav (Bitişme)', arabic: 'و ـو', desc: 'Vav harfi kendinden sonraki harfle bitişmez' },
    27: { name: 'He (Bitişme)', arabic: 'هـ ـهـ ـه', desc: 'He harfinin başta, ortada ve sonda yazılış biçimleri' },
    28: { name: 'Ye (Bitişme)', arabic: 'يـ ـيـ ـي', desc: 'Ye harfinin başta, ortada ve sonda yazılış biçimleri' },
};

// Adım 4: Üstün (Fetha) - 1 (18 Örnek)
export const CUZ4_LETTER_META: Record<number, { name: string; arabic: string; desc: string }> = {
    1: { name: 'E (Üstün)', arabic: 'اَ', desc: 'Elif üstün - ince "E" sesi' },
    2: { name: 'Be (Üstün)', arabic: 'بَ', desc: 'Be üstün - ince "Be" sesi' },
    3: { name: 'Te (Üstün)', arabic: 'تَ', desc: 'Te üstün - ince "Te" sesi' },
    4: { name: 'Se (Peltek Üstün)', arabic: 'ثَ', desc: 'Peltek Se üstün - ince peltek "Se" sesi' },
    5: { name: 'Ce (Üstün)', arabic: 'جَ', desc: 'Cim üstün - ince "Ce" sesi' },
    6: { name: 'Ha (Üstün)', arabic: 'حَ', desc: 'Boğaz Ha üstün - boğazdan temiz "Ha" sesi' },
    7: { name: 'Ha (Hı Üstün)', arabic: 'خَ', desc: 'Hırıltılı Hı üstün - kalın "Ha" sesi' },
    8: { name: 'De (Üstün)', arabic: 'دَ', desc: 'Dal üstün - ince "De" sesi' },
    9: { name: 'Ze (Peltek Üstün)', arabic: 'ذَ', desc: 'Peltek Zel üstün - ince peltek "Ze" sesi' },
    10: { name: 'Ra (Üstün)', arabic: 'رَ', desc: 'Ra üstün - kalın "Ra" sesi' },
    11: { name: 'Ze (Üstün)', arabic: 'زَ', desc: 'Keskin Ze üstün - ince "Ze" sesi' },
    12: { name: 'Se (Üstün)', arabic: 'سَ', desc: 'Sin üstün - ince "Se" sesi' },
    13: { name: 'Şe (Üstün)', arabic: 'شَ', desc: 'Şın üstün - ince "Şe" sesi' },
    14: { name: 'Sa (Üstün)', arabic: 'صَ', desc: 'Sad üstün - kalın "Sa" sesi' },
    15: { name: 'Da (Üstün)', arabic: 'ضَ', desc: 'Dad üstün - kalın "Da" sesi' },
    16: { name: 'Ta (Üstün)', arabic: 'طَ', desc: 'Tı üstün - kalın "Ta" sesi' },
    17: { name: 'Za (Peltek Üstün)', arabic: 'ظَ', desc: 'Zı üstün - kalın peltek "Za" sesi' },
    18: { name: 'A (Ayn Üstün)', arabic: 'عَ', desc: 'Ayn üstün - boğaz sıkılarak "A" sesi' },
};

// Adım 7: Esre (Kesra) (28 Harf)
export const CUZ7_LETTER_META: Record<number, { name: string; arabic: string; desc: string }> = {
    1: { name: 'İ (Esre)', arabic: 'إِ', desc: 'Elif esre - ince "İ" sesi' },
    2: { name: 'Bi (Esre)', arabic: 'بِ', desc: 'Be esre - ince "Bi" sesi' },
    3: { name: 'Ti (Esre)', arabic: 'تِ', desc: 'Te esre - ince "Ti" sesi' },
    4: { name: 'Si (Peltek Esre)', arabic: 'ثِ', desc: 'Peltek Se esre - peltek "Si" sesi' },
    5: { name: 'Ci (Esre)', arabic: 'جِ', desc: 'Cim esre - ince "Ci" sesi' },
    6: { name: 'Hi (Esre)', arabic: 'حِ', desc: 'Ha esre - temiz "Hi" sesi' },
    7: { name: 'Hı (Esre)', arabic: 'خِ', desc: 'Hı esre - kalın "Hı" sesi' },
    8: { name: 'Di (Esre)', arabic: 'دِ', desc: 'Dal esre - ince "Di" sesi' },
    9: { name: 'Zi (Peltek Esre)', arabic: 'ذِ', desc: 'Zel esre - peltek "Zi" sesi' },
    10: { name: 'Ri (Esre)', arabic: 'رِ', desc: 'Ra esre - ince "Ri" sesi' },
    11: { name: 'Zi (Esre)', arabic: 'زِ', desc: 'Ze esre - keskin "Zi" sesi' },
    12: { name: 'Si (Esre)', arabic: 'سِ', desc: 'Sin esre - ince "Si" sesi' },
    13: { name: 'Şi (Esre)', arabic: 'شِ', desc: 'Şın esre - ince "Şi" sesi' },
    14: { name: 'Sı (Esre)', arabic: 'صِ', desc: 'Sad esre - kalın "Sı" sesi' },
    15: { name: 'Dı (Esre)', arabic: 'ضِ', desc: 'Dad esre - kalın "Dı" sesi' },
    16: { name: 'Tı (Esre)', arabic: 'طِ', desc: 'Tı esre - kalın "Tı" sesi' },
    17: { name: 'Zı (Peltek Esre)', arabic: 'ظِ', desc: 'Zı esre - kalın peltek "Zı" sesi' },
    18: { name: "'I (Esre)", arabic: 'عِ', desc: 'Ayn esre - boğazdan "I-İ" arası ses' },
    19: { name: 'Ğı (Esre)', arabic: 'غِ', desc: 'Gayn esre - kalın "Ğı" sesi' },
    20: { name: 'Fi (Esre)', arabic: 'فِ', desc: 'Fe esre - ince "Fi" sesi' },
    21: { name: 'Kı (Esre)', arabic: 'قِ', desc: 'Kaf esre - kalın "Kı" sesi' },
    22: { name: 'Ki (Esre)', arabic: 'كِ', desc: 'Kef esre - ince "Ki" sesi' },
    23: { name: 'Li (Esre)', arabic: 'لِ', desc: 'Lam esre - ince "Li" sesi' },
    24: { name: 'Mi (Esre)', arabic: 'مِ', desc: 'Mim esre - ince "Mi" sesi' },
    25: { name: 'Ni (Esre)', arabic: 'نِ', desc: 'Nun esre - ince "Ni" sesi' },
    26: { name: 'Vi (Esre)', arabic: 'وِ', desc: 'Vav esre - ince "Vi" sesi' },
    27: { name: 'Hi (Esre)', arabic: 'هِ', desc: 'He esre - ince "Hi" sesi' },
    28: { name: 'Yi (Esre)', arabic: 'يِ', desc: 'Ye esre - ince "Yi" sesi' },
};

// Adım 8: Ötre (Damme) (28 Harf)
export const CUZ8_LETTER_META: Record<number, { name: string; arabic: string; desc: string }> = {
    1: { name: 'Ü (Ötre)', arabic: 'أُ', desc: 'Elif ötre - ince "Ü" sesi' },
    2: { name: 'Bü (Ötre)', arabic: 'بُ', desc: 'Be ötre - ince "Bü" sesi' },
    3: { name: 'Tü (Ötre)', arabic: 'تُ', desc: 'Te ötre - ince "Tü" sesi' },
    4: { name: 'Sü (Peltek Ötre)', arabic: 'ثُ', desc: 'Peltek Se ötre - peltek "Sü" sesi' },
    5: { name: 'Cü (Ötre)', arabic: 'جُ', desc: 'Cim ötre - ince "Cü" sesi' },
    6: { name: 'Hu (Ötre)', arabic: 'حُ', desc: 'Ha ötre - boğazdan "Hu" sesi' },
    7: { name: 'Hu (Hı Ötre)', arabic: 'خُ', desc: 'Hı ötre - hırıltılı kalın "Hu" sesi' },
    8: { name: 'Dü (Ötre)', arabic: 'دُ', desc: 'Dal ötre - ince "Dü" sesi' },
    9: { name: 'Zü (Peltek Ötre)', arabic: 'ذُ', desc: 'Zel ötre - peltek "Zü" sesi' },
    10: { name: 'Ru (Ötre)', arabic: 'رُ', desc: 'Ra ötre - kalın "Ru" sesi' },
    11: { name: 'Zü (Ötre)', arabic: 'زُ', desc: 'Ze ötre - keskin "Zü" sesi' },
    12: { name: 'Sü (Ötre)', arabic: 'سُ', desc: 'Sin ötre - ince "Sü" sesi' },
    13: { name: 'Şü (Ötre)', arabic: 'شُ', desc: 'Şın ötre - ince "Şü" sesi' },
    14: { name: 'Su (Ötre)', arabic: 'صُ', desc: 'Sad ötre - kalın "Su" sesi' },
    15: { name: 'Du (Ötre)', arabic: 'ضُ', desc: 'Dad ötre - kalın "Du" sesi' },
    16: { name: 'Tu (Ötre)', arabic: 'طُ', desc: 'Tı ötre - kalın "Tu" sesi' },
    17: { name: 'Zu (Peltek Ötre)', arabic: 'ظُ', desc: 'Zı ötre - kalın peltek "Zu" sesi' },
    18: { name: "'U (Ötre)", arabic: 'عُ', desc: 'Ayn ötre - boğazdan "U" sesi' },
    19: { name: 'Ğu (Ötre)', arabic: 'غُ', desc: 'Gayn ötre - kalın "Ğu" sesi' },
    20: { name: 'Fü (Ötre)', arabic: 'فُ', desc: 'Fe ötre - ince "Fü" sesi' },
    21: { name: 'Ku (Ötre)', arabic: 'قُ', desc: 'Kaf ötre - kalın "Ku" sesi' },
    22: { name: 'Kü (Ötre)', arabic: 'كُ', desc: 'Kef ötre - ince "Kü" sesi' },
    23: { name: 'Lü (Ötre)', arabic: 'لُ', desc: 'Lam ötre - ince "Lü" sesi' },
    24: { name: 'Mü (Ötre)', arabic: 'مُ', desc: 'Mim ötre - ince "Mü" sesi' },
    25: { name: 'Nü (Ötre)', arabic: 'نُ', desc: 'Nun ötre - ince "Nü" sesi' },
    26: { name: 'Vü (Ötre)', arabic: 'وُ', desc: 'Vav ötre - dudaktan "Vü" sesi' },
    27: { name: 'Hü (Ötre)', arabic: 'هُ', desc: 'He ötre - hafif göğüsten "Hü" sesi' },
    28: { name: 'Yü (Ötre)', arabic: 'يُ', desc: 'Ye ötre - ince "Yü" sesi' },
};

// Adım 9: Harflerin Cezimli Okunuşu (27 Harf)
export const CUZ9_LETTER_META: Record<number, { name: string; arabic: string; desc: string }> = {
    1: { name: 'Eb (Cezm)', arabic: 'اَبْ', desc: 'Elif üstün Be cezm - Eb' },
    2: { name: 'Et (Cezm)', arabic: 'اَتْ', desc: 'Elif üstün Te cezm - Et' },
    3: { name: 'Es (Peltek Cezm)', arabic: 'اَثْ', desc: 'Elif üstün Peltek Se cezm - Es' },
    4: { name: 'Ec (Cezm)', arabic: 'اَجْ', desc: 'Elif üstün Cim cezm - Ec' },
    5: { name: 'Eh (Cezm)', arabic: 'اَحْ', desc: 'Elif üstün Ha cezm - Eh' },
    6: { name: 'Eh (Hı Cezm)', arabic: 'اَخْ', desc: 'Elif üstün Hı cezm - Eh' },
    7: { name: 'Ed (Cezm)', arabic: 'اَدْ', desc: 'Elif üstün Dal cezm - Ed' },
    8: { name: 'Ez (Peltek Cezm)', arabic: 'اَذْ', desc: 'Elif üstün Zel cezm - Ez' },
    9: { name: 'Er (Cezm)', arabic: 'اَرْ', desc: 'Elif üstün Ra cezm - Er' },
    10: { name: 'Ez (Cezm)', arabic: 'اَزْ', desc: 'Elif üstün Ze cezm - Ez' },
    11: { name: 'Es (Cezm)', arabic: 'اَسْ', desc: 'Elif üstün Sin cezm - Es' },
    12: { name: 'Eş (Cezm)', arabic: 'اَشْ', desc: 'Elif üstün Şın cezm - Eş' },
    13: { name: 'Es (Sad Cezm)', arabic: 'اَصْ', desc: 'Elif üstün Sad cezm - Es (kalın)' },
    14: { name: 'Ed (Dad Cezm)', arabic: 'اَضْ', desc: 'Elif üstün Dad cezm - Ed (kalın)' },
    15: { name: 'Et (Tı Cezm)', arabic: 'اَطْ', desc: 'Elif üstün Tı cezm - Et (kalın)' },
    16: { name: 'Ez (Zı Cezm)', arabic: 'اَظْ', desc: 'Elif üstün Zı cezm - Ez (kalın peltek)' },
    17: { name: "E' (Ayn Cezm)", arabic: 'اَعْ', desc: 'Elif üstün Ayn cezm - boğaz tutularak E\'' },
    18: { name: 'Eğ (Gayn Cezm)', arabic: 'اَغْ', desc: 'Elif üstün Gayn cezm - Eğ' },
    19: { name: 'Ef (Cezm)', arabic: 'اَفْ', desc: 'Elif üstün Fe cezm - Ef' },
    20: { name: 'Ek (Kaf Cezm)', arabic: 'اَقْ', desc: 'Elif üstün Kaf cezm - Ek (kalın)' },
    21: { name: 'Ek (Kef Cezm)', arabic: 'اَكْ', desc: 'Elif üstün Kef cezm - Ek (ince)' },
    22: { name: 'El (Cezm)', arabic: 'اَلْ', desc: 'Elif üstün Lam cezm - El' },
    23: { name: 'Em (Cezm)', arabic: 'اَمْ', desc: 'Elif üstün Mim cezm - Em' },
    24: { name: 'En (Cezm)', arabic: 'اَنْ', desc: 'Elif üstün Nun cezm - En' },
    25: { name: 'Ev (Cezm)', arabic: 'اَوْ', desc: 'Elif üstün Vav cezm - Ev' },
    26: { name: 'Eh (He Cezm)', arabic: 'اَهْ', desc: 'Elif üstün He cezm - Eh' },
    27: { name: 'Ey (Cezm)', arabic: 'اَيْ', desc: 'Elif üstün Ye cezm - Ey' },
};

// Adım 18: Şedde 1 (27 Harf)
export const CUZ18_LETTER_META: Record<number, { name: string; arabic: string; desc: string }> = {
    1: { name: 'Ebbe (Şedde)', arabic: 'اَبَّ', desc: 'Elif üstün Be şedde - Ebbe' },
    2: { name: 'Ette (Şedde)', arabic: 'اَتَّ', desc: 'Elif üstün Te şedde - Ette' },
    3: { name: 'Esse (Peltek Şedde)', arabic: 'اَثَّ', desc: 'Elif üstün Peltek Se şedde - Esse' },
    4: { name: 'Ecce (Şedde)', arabic: 'اَجَّ', desc: 'Elif üstün Cim şedde - Ecce' },
    5: { name: 'Ehhe (Şedde)', arabic: 'اَحَّ', desc: 'Elif üstün Ha şedde - Ehhe' },
    6: { name: 'Ehhe (Hı Şedde)', arabic: 'اَخَّ', desc: 'Elif üstün Hı şedde - Ehhe' },
    7: { name: 'Edde (Şedde)', arabic: 'اَدَّ', desc: 'Elif üstün Dal şedde - Edde' },
    8: { name: 'Ezze (Peltek Şedde)', arabic: 'اَذَّ', desc: 'Elif üstün Zel şedde - Ezze' },
    9: { name: 'Erre (Şedde)', arabic: 'اَرَّ', desc: 'Elif üstün Ra şedde - Erre' },
    10: { name: 'Ezze (Şedde)', arabic: 'اَزَّ', desc: 'Elif üstün Ze şedde - Ezze' },
    11: { name: 'Esse (Şedde)', arabic: 'اَسَّ', desc: 'Elif üstün Sin şedde - Esse' },
    12: { name: 'Eşşe (Şedde)', arabic: 'اَشَّ', desc: 'Elif üstün Şın şedde - Eşşe' },
    13: { name: 'Essa (Sad Şedde)', arabic: 'اَصَّ', desc: 'Elif üstün Sad şedde - Essa' },
    14: { name: 'Edda (Dad Şedde)', arabic: 'اَضَّ', desc: 'Elif üstün Dad şedde - Edda' },
    15: { name: 'Etta (Tı Şedde)', arabic: 'اَطَّ', desc: 'Elif üstün Tı şedde - Etta' },
    16: { name: 'Ezza (Zı Şedde)', arabic: 'اَظَّ', desc: 'Elif üstün Zı şedde - Ezza' },
    17: { name: "E''a (Ayn Şedde)", arabic: 'اَعَّ', desc: 'Elif üstün Ayn şedde - E\'\'a' },
    18: { name: 'Eğğa (Gayn Şedde)', arabic: 'اَغَّ', desc: 'Elif üstün Gayn şedde - Eğğa' },
    19: { name: 'Effe (Şedde)', arabic: 'اَفَّ', desc: 'Elif üstün Fe şedde - Effe' },
    20: { name: 'Ekka (Kaf Şedde)', arabic: 'اَقَّ', desc: 'Elif üstün Kaf şedde - Ekka' },
    21: { name: 'Ekke (Kef Şedde)', arabic: 'اَكَّ', desc: 'Elif üstün Kef şedde - Ekke' },
    22: { name: 'Elle (Şedde)', arabic: 'اَلَّ', desc: 'Elif üstün Lam şedde - Elle' },
    23: { name: 'Emme (Şedde)', arabic: 'اَمَّ', desc: 'Elif üstün Mim şedde - Emme' },
    24: { name: 'Enne (Şedde)', arabic: 'اَنَّ', desc: 'Elif üstün Nun şedde - Enne' },
    25: { name: 'Evve (Şedde)', arabic: 'اَوَّ', desc: 'Elif üstün Vav şedde - Evve' },
    26: { name: 'Ehhe (He Şedde)', arabic: 'اَهَّ', desc: 'Elif üstün He şedde - Ehhe' },
    27: { name: 'Eyye (Şedde)', arabic: 'اَيَّ', desc: 'Elif üstün Ye şedde - Eyye' },
};

// Aşama ID'sine göre zengin harf / kural tablosu eşleştirmesi
export const STAGE_ITEM_META_REGISTRY: Record<string, Record<number, { name: string; arabic: string; desc: string }>> = {
    'cuz1': CUZ1_LETTER_META,
    'harfler': CUZ1_LETTER_META,
    'cuz2': CUZ2_LETTER_META,
    'cuz3': CUZ3_LETTER_META,
    'cuz4': CUZ4_LETTER_META,
    'ustun1': CUZ4_LETTER_META,
    'cuz7': CUZ7_LETTER_META,
    'esre1': CUZ7_LETTER_META,
    'esre': CUZ7_LETTER_META,
    'cuz8': CUZ8_LETTER_META,
    'otre1': CUZ8_LETTER_META,
    'otre': CUZ8_LETTER_META,
    'cuz9': CUZ9_LETTER_META,
    'cuz18': CUZ18_LETTER_META,
    'sedde': CUZ18_LETTER_META,
};

/**
 * Belirli bir aşama ve öğe numarası için zengin meta verileri döndürür.
 * (Arapça karakter, ad, mahreç açıklaması, resim ve ses bağlantıları)
 * ASLA geçersiz "Elif" kalıntısı döndürmez!
 */
export function getStageItemMeta(stageId: string, itemIndex: number): {
    name: string;
    arabic?: string;
    desc?: string;
    img?: string;
    audio?: string;
} {
    const resolvedId = mapLegacyStageIdToDiyanet(stageId);
    const asset = getStageItemAssetUrls(resolvedId, itemIndex);

    // 1. Aşama özel kayıt tablosundan zengin meta kontrolü
    const stageMetaTable = STAGE_ITEM_META_REGISTRY[resolvedId] || STAGE_ITEM_META_REGISTRY[stageId];
    if (stageMetaTable && stageMetaTable[itemIndex]) {
        const meta = stageMetaTable[itemIndex];
        return {
            name: meta.name,
            arabic: meta.arabic,
            desc: meta.desc,
            img: asset?.img,
            audio: asset?.audio
        };
    }

    // 2. Harf bazlı aşamalar (cuz1, cuz2, cuz3 veya legacy 'harfler') için CUZ1 fallback
    if ((resolvedId === 'cuz1' || resolvedId === 'cuz2' || resolvedId === 'cuz3' || stageId === 'harfler') && CUZ1_LETTER_META[itemIndex]) {
        const meta = CUZ1_LETTER_META[itemIndex];
        return {
            name: meta.name,
            arabic: meta.arabic,
            desc: meta.desc,
            img: asset?.img,
            audio: asset?.audio
        };
    }

    // 3. Genel aşamalar için güvenli başlık ve temiz fallback
    const stageObj = DIYANET_ELIFBA_STAGES.find(s => s.id === resolvedId || s.id === stageId);
    let resolvedName = asset?.name;
    // Eğer asset.name 'Elif' ise ve aşama cuz1'in ilk harfi değilse, kesinlikle hatalı kalıntı veridir!
    if (!resolvedName || (resolvedName === 'Elif' && (resolvedId !== 'cuz1' || itemIndex > 1))) {
        resolvedName = stageObj ? `${stageObj.shortTitle} • #${itemIndex}` : `Örnek #${itemIndex}`;
    }

    return {
        name: resolvedName,
        img: asset?.img,
        audio: asset?.audio
    };
}

