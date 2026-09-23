export interface KuranPageAyah {
    number: number;
    arabic: string;
    turkish?: string;
    surahName?: string;
}

export interface KuranBookPage {
    id: string;
    grade: 5 | 6 | 7 | 8;
    pageNumber: number;
    title: string;
    surahInfo: string;
    description: string;
    imageSrc: string; // e.g. "/kuran/5/sayfa1.jpg"
    arabicPreview?: string;
    ayahs?: KuranPageAyah[];
}

export interface TilavetCriterion {
    id: string;
    number: number;
    name: string;
    shortCode: string;
    category: 'temel' | 'hareke_cezm' | 'tecvid' | 'vakif_akicilik';
    description: string;
    maxPoints: number; // 10
    guidelines: {
        full: string;     // 10 p
        partial: string;  // 5 p
        failed: string;   // 0 p
    };
}

// 10 Kriterli Bütüncül Tilavet ve Tecvid Rubriği (100 Puan)
export const TILAVET_RUBRIC_CRITERIA: TilavetCriterion[] = [
    {
        id: 'euzu_besmele',
        number: 1,
        name: 'Eûzü - Besmele',
        shortCode: 'Eûzü-Besmele',
        category: 'temel',
        description: 'Okumaya usulüne uygun, doğru telaffuz ve hürmetle başlama',
        maxPoints: 10,
        guidelines: {
            full: 'Eûzü ve Besmele tam, kurallı ve harf sesleri doğru okundu.',
            partial: 'Besmelede ufak hareke veya mahreç eksiği oldu.',
            failed: 'Eûzü veya Besmele unutuldu ya da hatalı okundu.'
        }
    },
    {
        id: 'harf_mahrec',
        number: 2,
        name: 'Harf Tanıma & Mahreç',
        shortCode: 'Harf & Mahreç',
        category: 'temel',
        description: 'Harflerin çıkış yerleri, peltekler (ث ، ذ ، ظ), boğaz ve kalın/ince harf ayrımı',
        maxPoints: 10,
        guidelines: {
            full: 'Tüm harflerin mahreçleri temiz, peltekler ve kalın/ince ayrımı kusursuz.',
            partial: '1-2 harfte (özellikle pelteklerde veya Ha/Hı/Ayn seslerinde) hafif sapma.',
            failed: 'Harfleri karıştırma veya Türkçe harf sesiyle ikame etme.'
        }
    },
    {
        id: 'harekeler',
        number: 3,
        name: 'Harekeler (Üstün, Esre, Ötre)',
        shortCode: 'Harekeler',
        category: 'hareke_cezm',
        description: 'Üstün (e/a), Esre (i/ı) ve Ötre (ü/u) seslerini net çıkarma, çekmeden okuma',
        maxPoints: 10,
        guidelines: {
            full: 'Harekeler net, uzatılması gerekmeyen harfler çekilmeden ritmik okundu.',
            partial: '1-2 yerde gereksiz hareke uzatması (ihtilâs) veya hareke karıştırması.',
            failed: 'Harekeleri sıklıkla yanlış okuma veya birbirine karıştırma.'
        }
    },
    {
        id: 'cezm',
        number: 4,
        name: 'Cezm (Sükun & Tutturma)',
        shortCode: 'Cezm',
        category: 'hareke_cezm',
        description: 'Cezmli harfi önceki harfe doğru bağlama, harf sektirmeme',
        maxPoints: 10,
        guidelines: {
            full: 'Cezmler temiz bağlandı, harfler sektirilmeden sabitlendi.',
            partial: '1-2 yerde cezmde hafif sektirme veya aşırı bekleme yapıldı.',
            failed: 'Cezm kurallarına uyulmadı, harekesiz harfler okunamadı.'
        }
    },
    {
        id: 'sedde',
        number: 5,
        name: 'Şedde (Kuvvetli Çift Okuma)',
        shortCode: 'Şedde',
        category: 'hareke_cezm',
        description: 'Şeddeli harfin hakkını vererek kuvvetli ve çift sesle okuma',
        maxPoints: 10,
        guidelines: {
            full: 'Şeddeli harfler tam kuvvetinde ve çiftliği hissedilecek şekilde okundu.',
            partial: 'Şedde biraz zayıf kaldı veya gereksiz uzatıldı.',
            failed: 'Şeddeler tek harf gibi düz geçildi.'
        }
    },
    {
        id: 'tenvin',
        number: 6,
        name: 'Tenvinler (-en, -in, -ün)',
        shortCode: 'Tenvinler',
        category: 'hareke_cezm',
        description: 'İki üstün, iki esre ve iki ötre seslerini ve gizli nunlamayı doğru yapma',
        maxPoints: 10,
        guidelines: {
            full: 'Tenvin sesleri berrak ve kelime sonu nunlamaları doğru icra edildi.',
            partial: 'Tenvinlerde hafif tereddüt veya ses netliği eksikliği.',
            failed: 'Tenvinler tek hareke gibi okundu veya nun sesi verilmedi.'
        }
    },
    {
        id: 'meddi_tabii',
        number: 7,
        name: 'Medd-i Tabîi (1 Elif Uzatma)',
        shortCode: 'Medd-i Tabîi',
        category: 'tecvid',
        description: 'Elif, Vav ve Ye ile 1 elif miktarı (bir parmak kaldıracak kadar) tabii uzatma',
        maxPoints: 10,
        guidelines: {
            full: 'Tüm 1 eliflik tabii uzatmalar dengeli ve ne eksik ne fazla okundu.',
            partial: '1-2 yerde uzatmayı erken kesme veya gereğinden fazla çekme.',
            failed: 'Med harfleri düz hareke gibi geçildi ya da çekilmedi.'
        }
    },
    {
        id: 'dort_elif',
        number: 8,
        name: '4 Elif Uzatmaları',
        shortCode: '4 Elif Uzatma',
        category: 'tecvid',
        description: 'Üzerinde med işareti (~) bulunan harflerde (Muttasıl, Munfasıl, Lâzım) 4 elif uzatma',
        maxPoints: 10,
        guidelines: {
            full: 'Med işaretli yerler hakkıyla 4 elif miktarı tutularak uzatıldı.',
            partial: 'Uzatma yapıldı ancak süre 2-3 elifte kısa bırakıldı.',
            failed: '4 eliflik uzatmalar atlandı veya 1 elif gibi geçildi.'
        }
    },
    {
        id: 'duraklar',
        number: 9,
        name: 'Duraklar & Vakıf Kuralları',
        shortCode: 'Durak & Vakıf',
        category: 'vakif_akicilik',
        description: 'Ayet sonlarında ve secavend işaretlerinde (م، ط، ج، ز، ص، قف، لا) kuralınca durma/geçme',
        maxPoints: 10,
        guidelines: {
            full: 'Duraklarda nefes, son harfi cezmleme ve tenvini elif yapma kurallarına tam uyuldu.',
            partial: '1 durakta nefes yetmeyip yanlış yerde duruldu veya durak kuralı atlandı.',
            failed: 'Durak kuralları bilinmiyor, harekeyle durulup geçildi.'
        }
    },
    {
        id: 'akicilik',
        number: 10,
        name: 'Akıcılık & Vasıl (Bağlama)',
        shortCode: 'Akıcılık & Vasıl',
        category: 'vakif_akicilik',
        description: 'Kelimeleri hecelemeden bağlayabilme, silsile, kendine güven ve ritim',
        maxPoints: 10,
        guidelines: {
            full: 'Okuma son derece akıcı, hecelemesiz ve dinleyene huzur veren ritimde.',
            partial: 'Zaman zaman duraksamalar veya hecelemeler yaşandı.',
            failed: 'Sürekli heceleme veya kelimeleri birbirine bağlayamama.'
        }
    }
];

// MEB Kur'an-ı Kerim Ders Kitapları Okuma Sayfaları Listesi
export const KURAN_BOOK_PAGES: KuranBookPage[] = [
    // ──────── 5. SINIF KUR'AN DERS KİTABI OKUMA SAYFALARI ────────
    {
        id: 'p5-1',
        grade: 5,
        pageNumber: 1,
        title: "Fâtiha Sûresi ve Âyetü'l-Kürsî",
        surahInfo: "Fâtiha Sûresi & Bakara Sûresi 255. Âyet",
        description: "Kur'an-ı Kerim'in açılışı ve en faziletli âyetlerinden Âyetü'l-Kürsî okuma talimi",
        imageSrc: "/kuran/5/sayfa1.jpg",
        arabicPreview: "بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّح۪يمِ ﴿١﴾ اَلْحَمْدُ لِلّٰهِ رَبِّ الْعَالَم۪ينَۙ ﴿٢﴾ اَلرَّحْمٰنِ الرَّح۪يمِۙ ﴿٣﴾ مَالِكِ يَوْمِ الدّ۪ينِۜ ﴿٤﴾ اِيَّاكَ نَعْبُدُ وَاِيَّاكَ نَسْتَع۪ينُۜ ﴿٥﴾ اِهْدِنَا الصِّرَاطَ الْمُسْتَق۪يمَۙ ﴿٦﴾ صِرَاطَ الَّذ۪ينَ اَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّٓالّ۪ينَ ﴿٧﴾",
        ayahs: [
            {
                number: 1,
                arabic: "بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّح۪يمِ ﴿١﴾",
                turkish: "Rahmân ve Rahîm olan Allah'ın adıyla.",
                surahName: "Fâtiha Sûresi"
            },
            {
                number: 2,
                arabic: "اَلْحَمْدُ لِلّٰهِ رَبِّ الْعَالَم۪ينَۙ ﴿٢﴾",
                turkish: "Hamd, âlemlerin Rabbi olan Allah'a mahsustur.",
                surahName: "Fâtiha Sûresi"
            },
            {
                number: 3,
                arabic: "اَلرَّحْمٰنِ الرَّح۪يمِۙ ﴿٣﴾",
                turkish: "O, Rahmândır ve Rahîmdir.",
                surahName: "Fâtiha Sûresi"
            },
            {
                number: 4,
                arabic: "مَالِكِ يَوْمِ الدّ۪ينِۜ ﴿٤﴾",
                turkish: "Ceza ve mükâfat gününün yegâne sahibidir.",
                surahName: "Fâtiha Sûresi"
            },
            {
                number: 5,
                arabic: "اِيَّاكَ نَعْبُدُ وَاِيَّاكَ نَسْتَع۪ينُۜ ﴿٥﴾",
                turkish: "Ancak sana kulluk eder ve yalnız senden yardım dileriz.",
                surahName: "Fâtiha Sûresi"
            },
            {
                number: 6,
                arabic: "اِهْدِنَا الصِّرَاطَ الْمُسْتَق۪يمَۙ ﴿٦﴾",
                turkish: "Bizi doğru yola ilet.",
                surahName: "Fâtiha Sûresi"
            },
            {
                number: 7,
                arabic: "صِرَاطَ الَّذ۪ينَ اَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّٓالّ۪ينَ ﴿٧﴾",
                turkish: "Kendilerine lütufta bulunduğun kimselerin yoluna; gazaba uğramışların ve sapmışların yoluna değil.",
                surahName: "Fâtiha Sûresi"
            }
        ]
    },
    {
        id: 'p5-2',
        grade: 5,
        pageNumber: 2,
        title: "İhlâs, Felak ve Nâs Sûreleri (Muavvizeteyn)",
        surahInfo: "İhlâs, Felak ve Nâs Sûreleri",
        description: "Tevhid inancı ve kötülüklerden Allah'a sığınma sûreleri tilavet alıştırması",
        imageSrc: "/kuran/5/sayfa2.jpg",
        arabicPreview: "قُلْ هُوَ اللّٰهُ اَحَدٌۚ ﴿١﴾ اَللّٰهُ الصَّمَدُۚ ﴿٢﴾ لَمْ يَلِدْ وَلَمْ يُولَدْۙ ﴿٣﴾",
        ayahs: [
            { number: 1, arabic: "قُلْ هُوَ اللّٰهُ اَحَدٌۚ ﴿١﴾", turkish: "De ki: O Allah birdir.", surahName: "İhlâs Sûresi" },
            { number: 2, arabic: "اَللّٰهُ الصَّمَدُۚ ﴿٢﴾", turkish: "Allah Samed'dir.", surahName: "İhlâs Sûresi" },
            { number: 3, arabic: "لَمْ يَلِدْ وَلَمْ يُولَدْۙ ﴿٣﴾", turkish: "O doğurmamış ve doğmamıştır.", surahName: "İhlâs Sûresi" },
            { number: 4, arabic: "وَلَمْ يَكُنْ لَهُ كُفُوًا اَحَدٌ ﴿٤﴾", turkish: "Hiçbir şey O'na denk değildir.", surahName: "İhlâs Sûresi" },
            { number: 5, arabic: "قُلْ اَعُوذُ بِرَبِّ الْفَلَقِۙ ﴿١﴾", turkish: "De ki: Sabahın Rabbine sığınırım,", surahName: "Felak Sûresi" },
            { number: 6, arabic: "مِنْ شَرِّ مَا خَلَقَۙ ﴿٢﴾", turkish: "Yarattığı şeylerin şerrinden,", surahName: "Felak Sûresi" },
            { number: 7, arabic: "وَمِنْ شَرِّ غَاسِقٍ اِذَا وَقَبَۙ ﴿٣﴾", turkish: "Karanlığı çöktüğü zaman gecenin şerrinden,", surahName: "Felak Sûresi" },
            { number: 8, arabic: "وَمِنْ شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِۙ ﴿٤﴾", turkish: "Düğümlere üfleyenlerin şerrinden,", surahName: "Felak Sûresi" },
            { number: 9, arabic: "وَمِنْ شَرِّ حَاسِدٍ اِذَا حَسَدَ ﴿٥﴾", turkish: "Ve haset ettiği zaman hasetçinin şerrinden.", surahName: "Felak Sûresi" },
            { number: 10, arabic: "قُلْ اَعُوذُ بِرَبِّ النَّاسِۙ ﴿١﴾", turkish: "De ki: İnsanların Rabbine sığınırım,", surahName: "Nâs Sûresi" },
            { number: 11, arabic: "مَلِكِ النَّاسِۙ ﴿٢﴾", turkish: "İnsanların mâlikine,", surahName: "Nâs Sûresi" },
            { number: 12, arabic: "اِلٰهِ النَّاسِۙ ﴿٣﴾", turkish: "İnsanların ilâhına,", surahName: "Nâs Sûresi" },
            { number: 13, arabic: "مِنْ شَرِّ الْوَسْوَاسِ الْخَنَّاسِۙ ﴿٤﴾", turkish: "O sinsi vesvesecinin şerrinden,", surahName: "Nâs Sûresi" },
            { number: 14, arabic: "اَلَّذ۪ي يُوَسْوِسُ ف۪ي صُدُورِ النَّاسِۙ ﴿٥﴾", turkish: "Ki insanların göğüslerine vesvese verir,", surahName: "Nâs Sûresi" },
            { number: 15, arabic: "مِنَ الْجِنَّةِ وَالنَّاسِ ﴿٦﴾", turkish: "Gerek cinlerden gerek insanlardan.", surahName: "Nâs Sûresi" }
        ]
    },
    {
        id: 'p5-3',
        grade: 5,
        pageNumber: 3,
        title: "Fîl, Kureyş ve Mâûn Sûreleri",
        surahInfo: "Fîl, Kureyş ve Mâûn Sûreleri",
        description: "Namaz sûreleri okunuşu ve şedde-cezm kuralları uygulaması",
        imageSrc: "/kuran/5/sayfa3.jpg",
        arabicPreview: "اَلَمْ تَرَ كَيْفَ فَعَلَ رَبُّكَ بِاَصْحَابِ الْف۪يلِۜ ﴿١﴾ اَلَمْ يَجْعَلْ كَيْدَهُمْ ف۪ي تَضْل۪يلٍۙ ﴿٢﴾"
    },
    {
        id: 'p5-4',
        grade: 5,
        pageNumber: 4,
        title: "Kevser, Kâfirûn ve Nasr Sûreleri",
        surahInfo: "Kevser, Kâfirûn ve Nasr Sûreleri",
        description: "Kısa namaz sûrelerinde medd-i tabii ve tenvin uygulamaları",
        imageSrc: "/kuran/5/sayfa4.jpg",
        arabicPreview: "اِنَّٓا اَعْطَيْنَاكَ الْكَوْثَرَۜ ﴿١﴾ فَصَلِّ لِرَبِّكَ وَانْحَرْۜ ﴿٢﴾"
    },
    {
        id: 'p5-5',
        grade: 5,
        pageNumber: 5,
        title: "Bakara Sûresi İlk 5 Âyet (Elif-Lâm-Mîm)",
        surahInfo: "Bakara Sûresi 1 - 5. Âyetler",
        description: "Mushaf tilavetine giriş: Mukattaa harfleri ve hidayet rehberi Kur'an âyetleri",
        imageSrc: "/kuran/5/sayfa5.jpg",
        arabicPreview: "الٓمٓۚ ﴿١﴾ ذٰلِكَ الْكِتَابُ لَا رَيْبَۚ ف۪يهِۚ هُدًى لِلْمُتَّق۪ينَۙ ﴿٢﴾",
        ayahs: [
            { number: 1, arabic: "الٓمٓۚ ﴿١﴾", turkish: "Elif. Lâm. Mîm.", surahName: "Bakara Sûresi" },
            { number: 2, arabic: "ذٰلِكَ الْكِتَابُ لَا رَيْبَۚ ف۪يهِۚ هُدًى لِلْمُتَّق۪ينَۙ ﴿٢﴾", turkish: "Bu kendisinde şüphe olmayan kitaptır; takva sahipleri için hidayettir.", surahName: "Bakara Sûresi" },
            { number: 3, arabic: "اَلَّذ۪ينَ يُؤْمِنُونَ بِالْغَيْبِ وَيُق۪يمُونَ الصَّلٰوةَ وَمِمَّا رَزَقْنَاهُمْ يُنْفِقُونَۙ ﴿٣﴾", turkish: "Onlar gaybe inanırlar, namazı kılarlar ve kendilerine rızık olarak verdiklerimizden infak ederler.", surahName: "Bakara Sûresi" },
            { number: 4, arabic: "وَالَّذ۪ينَ يُؤْمِنُونَ بِمَٓا اُنْزِلَ اِلَيْكَ وَمَٓا اُنْزِلَ مِنْ قَبْلِكَۚ وَبِالْاٰخِرَةِ هُمْ يُوقِنُونَۜ ﴿٤﴾", turkish: "Sana indirilene ve senden önce indirilene inanırlar, ahirete de kesin olarak iman ederler.", surahName: "Bakara Sûresi" },
            { number: 5, arabic: "اُو۬لٰٓئِكَ عَلٰى هُدًى مِنْ رَبِّهِمْ وَاُو۬لٰٓئِكَ هُمُ الْمُفْلِحُونَ ﴿٥﴾", turkish: "İşte onlar Rablerinden bir hidayet üzeredirler ve kurtuluşa erenler de onlardır.", surahName: "Bakara Sûresi" }
        ]
    },

    // ──────── 6. SINIF KUR'AN DERS KİTABI OKUMA SAYFALARI ────────
    {
        id: 'p6-1',
        grade: 6,
        pageNumber: 1,
        title: "Âmene'r-Rasûlü (Bakara 285-286)",
        surahInfo: "Bakara Sûresi 285 - 286. Âyetler",
        description: "Yatsı namazı sonrası okunan aşr-ı şerif: İman esasları ve dua âyetleri",
        imageSrc: "/kuran/6/sayfa1.jpg",
        arabicPreview: "اٰمَنَ الرَّسُولُ بِمَٓا اُنْزِلَ اِلَيْهِ مِنْ رَبِّه۪ وَالْمُؤْمِنُونَۜ"
    },
    {
        id: 'p6-2',
        grade: 6,
        pageNumber: 2,
        title: "Hüvallâhüllezî (Haşr Sûresi 21-24)",
        surahInfo: "Haşr Sûresi 21 - 24. Âyetler",
        description: "Sabah ve akşam namazları sonu aşrı: Esmâ-i Hüsnâ âyetleri talimi",
        imageSrc: "/kuran/6/sayfa2.jpg",
        arabicPreview: "لَوْ اَنْزَلْنَا هٰذَا الْقُرْاٰنَ عَلٰى جَبَلٍ لَرَاَيْتَهُ خَاشِعًا مُتَصَدِّعًا مِنْ خَشْيَةِ اللّٰهِۜ"
    },
    {
        id: 'p6-3',
        grade: 6,
        pageNumber: 3,
        title: "Duhâ, İnşirâh ve Tîn Sûreleri",
        surahInfo: "Duhâ, İnşirâh ve Tîn Sûreleri",
        description: "Peygamberimize teselli ve müjde veren sûrelerin tecvidli tilaveti",
        imageSrc: "/kuran/6/sayfa3.jpg",
        arabicPreview: "وَالضُّحٰىۙ ﴿١﴾ وَالَّيْلِ اِذَا سَجٰىۙ ﴿٢﴾ مَا وَدَّعَكَ رَبُّكَ وَمَا قَلٰىۜ ﴿٣﴾"
    },
    {
        id: 'p6-4',
        grade: 6,
        pageNumber: 4,
        title: "Alak ve Kadr Sûreleri",
        surahInfo: "Alak ve Kadr Sûreleri",
        description: "İlk inen âyetler (İkra) ve Kur'an'ın indirildiği Kadir Gecesi sûresi",
        imageSrc: "/kuran/6/sayfa4.jpg",
        arabicPreview: "اِقْرَاْ بِاسْمِ رَبِّكَ الَّذ۪ي خَلَقَۚ ﴿١﴾ خَلَقَ الْاِنْسَانَ مِنْ عَلَقٍۚ ﴿٢﴾"
    },
    {
        id: 'p6-5',
        grade: 6,
        pageNumber: 5,
        title: "Beyyine ve Zilzâl Sûreleri",
        surahInfo: "Beyyine ve Zilzâl Sûreleri",
        description: "Kıyamet sarsıntısı ve ihlaslı kulluk âyetlerinde durak ve vasıl uygulaması",
        imageSrc: "/kuran/6/sayfa5.jpg",
        arabicPreview: "اِذَا زُلْزِلَتِ الْاَرْضُ زِلْزَالَهَاۙ ﴿١﴾ وَاَخْرَجَتِ الْاَرْضُ اَثْقَالَهَاۙ ﴿٢﴾"
    },

    // ──────── 7. SINIF KUR'AN DERS KİTABI OKUMA SAYFALARI ────────
    {
        id: 'p7-1',
        grade: 7,
        pageNumber: 1,
        title: "Yâsîn Sûresi (1. Sayfa / 1-12. Âyetler)",
        surahInfo: "Yâsîn Sûresi 1 - 12. Âyetler",
        description: "Kur'an'ın kalbi Yâsîn-i Şerif tilaveti: 4 elif uzatma ve ihfa uygulamaları",
        imageSrc: "/kuran/7/sayfa1.jpg",
        arabicPreview: "يسٓۚ ﴿١﴾ وَالْقُرْاٰنِ الْحَك۪يمِۙ ﴿٢﴾ اِنَّكَ لَمِنَ الْمُرْسَل۪ينَۙ ﴿٣﴾"
    },
    {
        id: 'p7-2',
        grade: 7,
        pageNumber: 2,
        title: "Mülk Sûresi (Tebâreke 1-14. Âyetler)",
        surahInfo: "Mülk Sûresi 1 - 14. Âyetler",
        description: "Kabir azabından koruyan sûre: Mülk ve hükümranlık âyetleri",
        imageSrc: "/kuran/7/sayfa2.jpg",
        arabicPreview: "تَبَارَكَ الَّذ۪ي بِيَدِهِ الْمُلْكُۖ وَهُوَ عَلٰى كُلِّ شَيْءٍ قَد۪يرٌۙ ﴿١﴾"
    },
    {
        id: 'p7-3',
        grade: 7,
        pageNumber: 3,
        title: "Nebe Sûresi (Amme 1-30. Âyetler)",
        surahInfo: "Nebe Sûresi 1 - 30. Âyetler",
        description: "Amme Cüzü başlangıcı: Büyük haber ve ahiret hakikati âyetleri",
        imageSrc: "/kuran/7/sayfa3.jpg",
        arabicPreview: "عَمَّ يَتَسَٓاءَلُونَۚ ﴿١﴾ عَنِ النَّبَاِ الْعَظ۪يمِۙ ﴿٢﴾ الَّذ۪ي هُمْ ف۪يهِ مُخْتَلِفُونَۜ ﴿٣﴾"
    },
    {
        id: 'p7-4',
        grade: 7,
        pageNumber: 4,
        title: "Kıyâme ve İnsân Sûreleri",
        surahInfo: "Kıyâme Sûresi Seçme Âyetler",
        description: "Kur'an'ı aceleyle okumama (Lâ tühərrik bihî lisâneke) ve kıyamet tasvirleri",
        imageSrc: "/kuran/7/sayfa4.jpg",
        arabicPreview: "لَآ اُقْسِمُ بِيَوْمِ الْقِيٰمَةِۙ ﴿١﴾ وَلَآ اُقْسِمُ بِالنَّفْسِ اللَّوَّامَةِۜ ﴿٢﴾"
    },
    {
        id: 'p7-5',
        grade: 7,
        pageNumber: 5,
        title: "Âdiyât, Kâria ve Tekâsür Sûreleri",
        surahInfo: "Âdiyât, Kâria ve Tekâsür Sûreleri",
        description: "Hızlı tempolu kısa sûrelerde şedde ve tenvin kaideleri talimi",
        imageSrc: "/kuran/7/sayfa5.jpg",
        arabicPreview: "وَالْعَادِيَاتِ ضَبْحًاۙ ﴿١﴾ فَالْمُورِيَاتِ قَدْحًاۙ ﴿٢﴾ فَالْمُغ۪يرَاتِ صُبْحًاۙ ﴿٣﴾"
    },

    // ──────── 8. SINIF KUR'AN DERS KİTABI OKUMA SAYFALARI ────────
    {
        id: 'p8-1',
        grade: 8,
        pageNumber: 1,
        title: "Fetih Sûresi (1-9. Âyetler)",
        surahInfo: "Fetih Sûresi 1 - 9. Âyetler",
        description: "Apaçık zafer müjdesi: LGS hazırlık yılı bereket aşrı",
        imageSrc: "/kuran/8/sayfa1.jpg",
        arabicPreview: "اِنَّا فَتَحْنَا لَكَ فَتْحًا مُب۪ينًاۙ ﴿١﴾ لِيَغْفِرَ لَكَ اللّٰهُ مَا تَقَدَّمَ مِنْ ذَنْبِكَ وَمَا تَاَخَّرَ"
    },
    {
        id: 'p8-2',
        grade: 8,
        pageNumber: 2,
        title: "Rahmân Sûresi (1-27. Âyetler)",
        surahInfo: "Rahmân Sûresi 1 - 27. Âyetler",
        description: "Kur'an'ın gelini: 'Rabbinizin hangi nimetlerini yalanlayabilirsiniz' nakaratı",
        imageSrc: "/kuran/8/sayfa2.jpg",
        arabicPreview: "اَلرَّحْمٰنُۙ ﴿١﴾ عَلَّمَ الْقُرْاٰنَۜ ﴿٢﴾ خَلَقَ الْاِنْسَانَۙ ﴿٣﴾ عَلَّمَهُ الْبَيَانَ ﴿٤﴾"
    },
    {
        id: 'p8-3',
        grade: 8,
        pageNumber: 3,
        title: "Cuma Sûresi (9-11. Âyetler)",
        surahInfo: "Cuma Sûresi 9 - 11. Âyetler",
        description: "Cuma ezanı okunduğunda Allah'ın zikrine koşma ve alışverişi bırakma âyetleri",
        imageSrc: "/kuran/8/sayfa3.jpg",
        arabicPreview: "يَٓا اَيُّهَا الَّذ۪ينَ اٰمَنُٓوا اِذَا نُودِيَ لِلصَّلٰوةِ مِنْ يَوْمِ الْجُمُعَةِ فَاسْعَوْا اِلٰى ذِكْرِ اللّٰهِ"
    },
    {
        id: 'p8-4',
        grade: 8,
        pageNumber: 4,
        title: "Hucurât Sûresi (10-13. Âyetler)",
        surahInfo: "Hucurât Sûresi 10 - 13. Âyetler",
        description: "İslam ahlakı: Müminler kardeştir, gıybet ve alay yasağı, üstünlük takvadadır",
        imageSrc: "/kuran/8/sayfa4.jpg",
        arabicPreview: "اِنَّمَا الْمُؤْمِنُونَ اِخْوَةٌ فَاَصْلِحُوا بَيْنَ اَخَوَيْكُمْ وَاتَّقُوا اللّٰهَ لَعَلَّكُمْ تُرْحَمُونَ۟ ﴿١٠﴾"
    },
    {
        id: 'p8-5',
        grade: 8,
        pageNumber: 5,
        title: "Vâkıa Sûresi Seçme Âyetler",
        surahInfo: "Vâkıa Sûresi 1 - 26. Âyetler",
        description: "Cennet nimetleri ve önde olanlar (Sâbikûn) aşrı tilaveti",
        imageSrc: "/kuran/8/sayfa5.jpg",
        arabicPreview: "اِذَا وَقَعَتِ الْوَاقِعَةُۙ ﴿١﴾ لَيْسَ لِوَقْعَتِهَا كَاذِبَةٌۘ ﴿٢﴾ خَافِضَةٌ رَافِعَةٌۙ ﴿٣﴾"
    }
];

// Belirli bir sınıfın sayfalarını getir
export function getPagesByGrade(grade: number): KuranBookPage[] {
    return KURAN_BOOK_PAGES.filter(p => p.grade === grade);
}

// Belirli bir sayfa ID'sini getir
export function getPageById(id: string): KuranBookPage | undefined {
    return KURAN_BOOK_PAGES.find(p => p.id === id);
}

// Rubrik puanını hesapla (0-100)
export function calculateRubricScore(scores: Record<string, number>): number {
    let total = 0;
    TILAVET_RUBRIC_CRITERIA.forEach(c => {
        total += (scores[c.id] ?? 0);
    });
    return Math.min(100, Math.max(0, total));
}

// Puana göre başarı rozeti ve etiketi
export function getTilavetGradeBadge(score: number): { label: string; color: string; bg: string } {
    if (score >= 90) return { label: 'Pekiyi (Mükemmel)', color: 'text-emerald-300', bg: 'bg-emerald-500/20 border-emerald-500/40' };
    if (score >= 75) return { label: 'İyi (Akıcı)', color: 'text-cyan-300', bg: 'bg-cyan-500/20 border-cyan-500/40' };
    if (score >= 60) return { label: 'Orta (Geliştirilmeli)', color: 'text-amber-300', bg: 'bg-amber-500/20 border-amber-500/40' };
    return { label: 'Tekrar Edilmeli', color: 'text-rose-300', bg: 'bg-rose-500/20 border-rose-500/40' };
}

// Belirli bir sayfanın âyetlerini getir (yoksa varsayılan âyet listesi üret)
export function getPageAyahs(page: KuranBookPage, customCount?: number): KuranPageAyah[] {
    if (page.ayahs && page.ayahs.length > 0) {
        return page.ayahs;
    }
    const count = customCount || 7;
    return Array.from({ length: count }, (_, i) => ({
        number: i + 1,
        arabic: `${page.title} - ${i + 1}. Âyet`,
        surahName: page.title
    }));
}

// Tek bir âyetin rubrik puanını hesapla (0-100)
export function calculateAyahScore(criteriaScores: Record<string, number>): number {
    let total = 0;
    TILAVET_RUBRIC_CRITERIA.forEach(c => {
        total += (criteriaScores[c.id] ?? 0);
    });
    return Math.min(100, Math.max(0, total));
}

// Tüm âyetlerin genel sayfa ortalamasını hesapla (0-100)
export function calculateOverallAyahAverage(
    ayahScores: Record<number, { score: number; criteriaScores?: Record<string, number> }>
): { average: number; evaluatedCount: number; totalAssigned: number } {
    const scoredAyahs = Object.values(ayahScores).filter(a => {
        if (!a) return false;
        if (a.criteriaScores && Object.keys(a.criteriaScores).length > 0) return true;
        return typeof a.score === 'number' && a.score > 0;
    });

    if (scoredAyahs.length === 0) {
        return { average: 0, evaluatedCount: 0, totalAssigned: Object.keys(ayahScores).length };
    }

    const sum = scoredAyahs.reduce((acc, curr) => acc + (curr.score || 0), 0);
    const average = Math.round(sum / scoredAyahs.length);

    return {
        average: Math.min(100, Math.max(0, average)),
        evaluatedCount: scoredAyahs.length,
        totalAssigned: Object.keys(ayahScores).length
    };
}

