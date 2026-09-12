'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
    Maximize, Minimize, ChevronLeft, ChevronRight, Eye, PartyPopper, 
    Sparkles, HelpCircle, Trophy, RotateCcw, Users, Award, CheckCircle2,
    Lock, Unlock, ShieldAlert, BookOpen
} from 'lucide-react';
import { cn } from "@/lib/utils";
import confetti from 'canvas-confetti';

export type MysteryItem = {
    id: number;
    title: string; // Cevap
    category: 'Peygamberler' | 'Sahabeler' | 'Kutsal Mekanlar' | 'Tarihi Şahsiyetler';
    clues: [string, string, string, string, string]; // 50, 40, 30, 20, 10 puan
    description: string; // Biyografik/tarihi detay
};

const MYSTERY_DATA: MysteryItem[] = [
    {
        id: 1,
        title: "Hz. Nuh (a.s.)",
        category: "Peygamberler",
        clues: [
            "Tarihte ilk defa büyük bir gemi inşa eden peygamberim.",
            "Kavmimi tam 950 yıl boyunca gece gündüz tevhid inancına davet ettim.",
            "Kendi öz oğlum Kenan dahi bana inanmadı ve dağa sığınmak istedi.",
            "Tufan hadisesi ile tüm inkârcı kavmim sular altında kaldı.",
            "Gemim, Cûdî Dağı'na oturduktan sonra inananlarla yeni bir hayat kurduk."
        ],
        description: "Ulul Azm peygamberlerden biridir. İnsanlığın ikinci atası olarak anılır. Sabrı ve azmi ile Kur'an'da övgüyle zikredilir."
    },
    {
        id: 2,
        title: "Hz. Bilal-i Habeşi (r.a.)",
        category: "Sahabeler",
        clues: [
            "İslam'ın ilk dönemlerinde köle iken Müslüman oldum ve ağır işkencelere uğradım.",
            "Kızgın kumlara yatırılıp göğsüme taş konduğunda sadece 'Ahad, Ahad' dedim.",
            "Hz. Ebubekir beni efendimden satın alarak hürriyetime kavuşturdu.",
            "Peygamber Efendimiz (s.a.v.) beni İslam'ın ilk müezzini olarak tayin etti.",
            "Mekke fethedildiğinde Kâbe'nin damına çıkarak ilk ezanı ben okudum."
        ],
        description: "Habeşistan asıllı ulu sahabi. Güzel ve gür sesiyle Peygamberimizin müezzini olmuş, sadakati ve teslimiyetiyle tarihe geçmiştir."
    },
    {
        id: 3,
        title: "Mescid-i Aksâ",
        category: "Kutsal Mekanlar",
        clues: [
            "Müslümanların yeryüzündeki ilk kıblesi olma şerefine sahibim.",
            "Kudüs şehrinin kalbinde, etrafı mübarek kılınmış mukaddes bir beldeyim.",
            "Peygamberimiz (s.a.v.) İsrâ ve Miraç mucizesinde beni ziyaret etmiştir.",
            "Mescid-i Haram ve Mescid-i Nebevî'den sonra yeryüzündeki en faziletli üçüncü mescidim.",
            "İçerisinde Kubbetü's-Sahra ve Kıble Mescidi'ni barındıran geniş bir haremim."
        ],
        description: "İslam'ın ilk kıblesi ve en mukaddes üç hareminden biridir. Kur'an-ı Kerim'de 'çevresini mübarek kıldığımız' ifadesiyle övülmüştür."
    },
    {
        id: 4,
        title: "Hz. Yusuf (a.s.)",
        category: "Peygamberler",
        clues: [
            "Kur'an-ı Kerim'de hayatım 'kıssaların en güzeli' (Ahsenü'l-Kasas) olarak anlatılır.",
            "Küçük yaşta kardeşlerimin kıskançlığı sebebiyle ıssız bir kuyuya atıldım.",
            "Mısır'a köle olarak satıldım, iftiraya uğrayarak uzun yıllar zindanda kaldım.",
            "Allah bana rüyaları yorumlama (tabir) ilmini lütfetti.",
            "Yedi yıllık büyük kıtlık döneminde Mısır'ın hazine bakanı ve yöneticisi oldum."
        ],
        description: "İffeti, sabrı ve affediciliği ile örnek peygamberdir. Kendisine kötülük yapan kardeşlerini 'Bugün size kınama yoktur' diyerek bağışlamıştır."
    },
    {
        id: 5,
        title: "Hz. Hatice (r.a.)",
        category: "Sahabeler",
        clues: [
            "Cahiliye döneminde bile tertemiz ahlakımdan dolayı 'Tâhire' lakabıyla anılırdım.",
            "Mekke'nin en saygın, asil ve başarılı ticaret kervanlarına sahip kadınıydım.",
            "Peygamber Efendimiz'e (s.a.v.) ilk iman eden, O'nun ilk eşi ve hayat arkadaşıyım.",
            "İlk vahiy geldiğinde Efendimiz'i teselli edip 'Allah seni asla utandırmaz' dedim.",
            "Bütün mal varlığımı İslam davasının yayılması yolunda fedakârca harcadım."
        ],
        description: "Müminlerin annesi, Peygamberimizin en büyük destekçisi ve ilk Müslüman. Cebrail (a.s.) tarafından kendisine Allah'ın selamı iletilmiştir."
    },
    {
        id: 6,
        title: "Hz. Süleyman (a.s.)",
        category: "Peygamberler",
        clues: [
            "Hem büyük bir peygamber hem de tarihte eşi benzeri görülmemiş bir hükümdardım.",
            "Rüzgâr emrime verilmişti ve cinler benim emrimde saraylar inşa ederdi.",
            "Kuşların, karıncaların ve hayvanların dilini anlayıp onlarla konuşabilirdim.",
            "Sebe melikesi Belkıs'ı mektupla tevhid inancına ve Hak yola davet ettim.",
            "Kudüs'teki Mescid-i Aksâ'yı (Beytü'l-Makdis) cinlerin yardımıyla inşa ettirdim."
        ],
        description: "Hz. Davud'un (a.s.) oğludur. Kendisine bahşedilen eşsiz saltanata rağmen son derece mütevazı ve şükreden bir kul olarak yaşamıştır."
    },
    {
        id: 7,
        title: "Hz. Hamza (r.a.)",
        category: "Sahabeler",
        clues: [
            "Kureyş'in en cesur, en güçlü ve usta okçu avcılarından biriydim.",
            "Müşriklerin Peygamberimiz'e hakaret ettiğini duyunca yayımı Ebu Cehil'in kafasına vurdum.",
            "Peygamberimiz'in hem amcası hem sütkardeşi hem de en sadık dava koruyucusuydum.",
            "İslam ordusunun başında 'Allah'ın Aslanı' unvanıyla düşmanların korkulu rüyası oldum.",
            "Uhud Savaşı'nda Vahşi'nin mızrağıyla şehit düştüm ve 'Seyyidü'ş-Şüheda' (Şehitlerin Efendisi) oldum."
        ],
        description: "Cesareti ve mertliğiyle dillere destan sahabe. Şehitlerin efendisi (Seyyidü'ş-Şühedâ) unvanına layık görülmüştür."
    },
    {
        id: 8,
        title: "Sevr Mağarası",
        category: "Kutsal Mekanlar",
        clues: [
            "Mekke'nin güneyinde sarp ve dik yamaçlara sahip yüksek bir dağın zirvesindeyim.",
            "Hicret yolculuğu esnasında Peygamberimiz ve Hz. Ebubekir'e üç gün boyunca ev sahipliği yaptım.",
            "Müşrikler kapıma kadar geldiklerinde örümcek ağ örmüş, güvercin yuva yapmıştı.",
            "Kur'an'da 'İkinin ikincisi mağaradayken...' ayetiyle şereflendirildim.",
            "Peygamberimiz burada arkadaşına 'Korkma, şüphesiz Allah bizimle beraberdir' buyurdu."
        ],
        description: "Hicret mucizesinin en önemli şahitlerindendir. Tevekkül, dostluk ve ilahi korumanın ebedi sembolüdür."
    },
    {
        id: 9,
        title: "Hz. Ali (r.a.)",
        category: "Sahabeler",
        clues: [
            "Çocuk yaşta İslam'ı kabul eden ilk genç Müslümanım.",
            "Hicret gecesi Peygamberimiz'in yatağına canı pahasına yatarak müşrikleri yanılttım.",
            "Hayber Kalesi'nin fethinde devasa demir kapıyı tek başıma kalkan yaptım.",
            "Peygamberimiz benim için 'Ben ilmin şehriyim, o ise kapısıdır' buyurmuştur.",
            "Dört büyük halifenin dördüncüsü ve Efendimiz'in damadı, 'Haydar-ı Kerrar' unvanlı yiğitim."
        ],
        description: "Cesareti, adaleti ve engin ilmi ile bilinen dördüncü halifedir. Peygamberimizin kızı Hz. Fatıma ile evlenmiş, Hz. Hasan ve Hüseyin'in babasıdır."
    },
    {
        id: 10,
        title: "Hz. Yunus (a.s.)",
        category: "Peygamberler",
        clues: [
            "Ninova halkını yıllarca Allah'ın birliğine davet ettim ama bana inanmadılar.",
            "Kavmime öfkelenerek Allah'tan izin çıkmadan şehri terk edip bir gemiye bindim.",
            "Fırtına çıkınca kura çekildi ve beni hırçın dalgaların içine attılar.",
            "Karanlıklar içinde devasa bir balık tarafından yutuldum.",
            "'Lâ ilâhe illâ ente sübhâneke innî küntü mine'z-zâlimîn' duam sayesinde karaya çıkarıldım."
        ],
        description: "Kur'an'da 'Zü'n-Nûn' (Balık Sahibi) olarak geçer. Yaptığı içten tövbe ve zikir, tüm müminlere sıkıntılardan kurtuluş duası olmuştur."
    },
    {
        id: 11,
        title: "Hz. Meryem (a.s.)",
        category: "Tarihi Şahsiyetler",
        clues: [
            "Kur'an-ı Kerim'de adı açıkça geçen TEK kadınım ve adıma bir sure vardır.",
            "Annem Hanne beni daha doğmadan önce Beytü'l-Makdis'e hizmet için adadı.",
            "Hz. Zekeriya'nın (a.s.) himayesinde mabette ibadetle tertemiz bir ömür sürdüm.",
            "Cebrail (a.s.) bana gelerek babasız bir erkek çocukla müjdelendiğimi bildirdi.",
            "Büyük bir mucize eseri olarak Hz. İsa'yı (a.s.) dünyaya getirdim."
        ],
        description: "İffet ve hayânın timsali olan ulu hanımefendi. Peygamberimiz tarafından cennet kadınlarının en üstünlerinden biri olarak müjdelenmiştir."
    },
    {
        id: 12,
        title: "Hz. Halid bin Velid (r.a.)",
        category: "Sahabeler",
        clues: [
            "Hayatım boyunca katıldığım 100'den fazla savaşın hiçbirinde mağlup olmadım.",
            "Müslüman olduktan sonra askeri dehamı tamamen İslam ordularının zaferine adadım.",
            "Mute Savaşı'nda arka arkaya komutanlar şehit düşünce sancağı alıp orduyu kurtardım.",
            "Peygamberimiz bu kahramanlığımdan dolayı bana 'Seyfullah' (Allah'ın Kılıcı) unvanını verdi.",
            "Yermük Savaşı'nda Bizans ordusunu dize getirerek Suriye'nin fethini tamamladım."
        ],
        description: "Tarihin gördüğü en büyük askeri stratejistlerden biridir. Peygamberimizin 'Allah'ın kılıçlarından bir kılıç' övgüsüne mazhar olmuştur."
    },
    {
        id: 13,
        title: "Kâbe-i Muazzama",
        category: "Kutsal Mekanlar",
        clues: [
            "Yeryüzünde insanlar için kurulan ilk ibadethaneyim (Beytullah).",
            "Hz. İbrahim ve oğlu Hz. İsmail tarafından temelleri üzerine yeniden inşa edildim.",
            "Dünyadaki tüm Müslümanlar her gün 5 vakit namazda yönünü bana döner.",
            "Tavaf ibadeti sadece benim etrafımda yedi şavt olarak gerçekleştirilir.",
            "Doğu köşemde cennetten indirildiğine inanılan Hacerü'l-Esved taşını taşırım."
        ],
        description: "Tevhid inancının yeryüzündeki merkezi. Yılın her günü milyonlarca müminin aşkla tavaf ettiği kıblemizdir."
    },
    {
        id: 14,
        title: "Hz. Musa (a.s.)",
        category: "Peygamberler",
        clues: [
            "Henüz bir bebekken annem beni sandığa koyup Nil Nehri'ne bıraktı.",
            "Beni öldürmek isteyen zalim Firavun'un sarayında büyütüldüm.",
            "Elimdeki asa mucize eseri büyük bir yılana dönüşür, elim bembeyaz parlardı.",
            "Kızıldeniz'i asasıyla ikiye bölerek kavmini Firavun'un ordusundan kurtardım.",
            "Tur Dağı'nda Allah ile vasıtasız konuştuğum için 'Kelîmullah' lakabını aldım."
        ],
        description: "Ulul Azm peygamberlerdendir. Kendisine Tevrat indirilmiş, Firavun'un zulmüne karşı tevhidin sembolü olmuştur."
    },
    {
        id: 15,
        title: "Hz. Selman-ı Farisi (r.a.)",
        category: "Sahabeler",
        clues: [
            "İran'ın İsfahan şehrinde Mecusi bir ailenin çocuğu olarak doğdum.",
            "Hak dini bulmak için Hristiyan rahiplerin peşinden diyar diyar dolaştım.",
            "Köle tüccarları tarafından kandırılıp Medineli bir Yahudi'ye hurma işçisi olarak satıldım.",
            "Hendek Savaşı'nda Medine'nin etrafına geniş hendekler kazma fikrini ben verdim.",
            "Peygamberimiz benim için 'Selman bizdendir, Ehl-i Beyt'tendir' buyurmuştur."
        ],
        description: "Hakkı arayışın ve samimiyetin timsali büyük sahabi. Hendek stratejisiyle Medine'nin müşrik ordularına karşı korunmasını sağlamıştır."
    },
    {
        id: 16,
        title: "Hz. İbrahim (a.s.)",
        category: "Peygamberler",
        clues: [
            "Gök cisimlerine tapan kavmime karşı güneşi, ayı ve yıldızları sorgulayarak tevhidi buldum.",
            "Babil hükümdarı Nemrut'un putlarını balta ile kırıp paramparça ettim.",
            "Mancınıkla devasa bir ateşe atıldım ama ateş bana serin ve selamet oldu.",
            "Kâbe'yi oğluyla beraber inşa eden ve 'Halîlullah' (Allah'ın Dostu) unvanını alan peygamberim.",
            "Kurban ibadeti ve hac ibadetinin pek çok menasiki benim hatıramı taşır."
        ],
        description: "Tevhid mücadelesinin öncüsü, Hanif dinin imamı. Yahudilik, Hristiyanlık ve İslam'ın ortak atası olarak hürmet görür."
    },
    {
        id: 17,
        title: "Hz. Ebubekir (r.a.)",
        category: "Sahabeler",
        clues: [
            "Peygamber Efendimiz'in en yakın dostu, sırdaşı ve hicret arkadaşıyım.",
            "Miraç hadisesini duyunca tereddütsüz 'O söylediyse doğrudur' dediğim için 'Sıddık' unvanı aldım.",
            "İslam'ın ilk halifesi seçildim ve dinden dönenlerle kararlılıkla mücadele ettim.",
            "Kur'an-ı Kerim ayetlerini ilk defa bir heyet kurarak Mushaf (iki kapak arasına) haline getirdim.",
            "Tebük Seferi'nde malımın ve servetimin TAMAMINI orduya infak ettim."
        ],
        description: "Sadakatin zirvesi, Hulefa-i Raşidin'in ilki. Cennetle müjdelenen on sahabeden biridir."
    },
    {
        id: 18,
        title: "Hira Mağarası",
        category: "Kutsal Mekanlar",
        clues: [
            "Mekke yakınlarındaki Nur Dağı'nın (Cebel-i Nur) zirvesinde yer alan dar bir kovuğum.",
            "Peygamberimiz 40 yaşından önce cahiliyenin kötülüklerinden kaçıp bana tefekküre gelirdi.",
            "Ramazan ayının Kadir Gecesi'nde insanlık tarihinin en büyük olayına şahitlik ettim.",
            "Cebrail (a.s.) ilk defa yeryüzüne inip burada 'OKU! Yaratan Rabbinin adıyla oku!' dedi.",
            "Kur'an-ı Kerim'in ilk ayetleri (Alak Suresi 1-5) benim bağrımda nazil oldu."
        ],
        description: "İslam nurunun yeryüzünü aydınlatmaya başladığı mukaddes başlangıç noktasıdır."
    },
    {
        id: 19,
        title: "Hz. Ömer (r.a.)",
        category: "Sahabeler",
        clues: [
            "İslam'dan önce çok sert mizaçlı biriydim, Taha Suresi'ni dinleyince kalbim yumuşayıp Müslüman oldum.",
            "Müslümanlığım Kabe'de açıktan ilk cemaatle namaz kılınmasına vesile oldu.",
            "Hak ile batılı kesin çizgilerle birbirinden ayıran 'el-Fâruk' lakabını aldım.",
            "İslam'ın ikinci halifesiyim; adaletim tarihlere destan oldu, Dicle kıyısındaki koyundan kendimi sorumlu tuttum.",
            "Hicri takvimi başlattım, posta teşkilatı ve adliye sistemini kurdum."
        ],
        description: "Adaletin simgesi olan ikinci halife. Kudüs, İran ve Mısır O'nun hilafeti döneminde İslam topraklarına katılmıştır."
    },
    {
        id: 20,
        title: "Hz. Lokman (a.s.)",
        category: "Tarihi Şahsiyetler",
        clues: [
            "Peygamber olup olmadığım tartışmalıdır fakat Allah bana derin bir 'Hikmet' bahşetmiştir.",
            "Kur'an-ı Kerim'in 31. suresine benim ismim verilmiştir.",
            "Oğluma verdiğim 'Yavrucuğum! Allah'a şirk koşma, namazı kıl, gururlanıp insanlardan yüz çevirme' nasihatlerim meşhurdur.",
            "Şifalı bitkilerin dilinden anlayan büyük bir hekim ve bilge olarak bilinirim.",
            "Mütevazı yürümeyi ve ses tonunu alçaltmayı öğütleyen hikmetli sözlerim nesilden nesile aktarılmıştır."
        ],
        description: "Hikmetli öğütleriyle tanınan Kur'an bilgesi. Lokman Hekim olarak da anılır."
    }
];

const CLUE_POINTS = [50, 40, 30, 20, 10];

export function MysteryClueGame() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedCategory, setSelectedCategory] = useState<string>('Tümü');
    const [revealedClues, setRevealedClues] = useState<boolean[]>([false, false, false, false, false]);
    const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    
    // Takım Modu
    const [isTeamMode, setIsTeamMode] = useState(false);
    const [teamAScore, setTeamAScore] = useState(0);
    const [teamBScore, setTeamBScore] = useState(0);

    const containerRef = useRef<HTMLDivElement>(null);

    // Kategoriye göre filtrelenmiş veriler
    const filteredList = MYSTERY_DATA.filter(item => 
        selectedCategory === 'Tümü' ? true : item.category === selectedCategory
    );

    const currentItem = filteredList[currentIndex] || filteredList[0];

    // Tam Ekran Kontrolü
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen().catch(err => console.error(err));
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
        }
    };

    useEffect(() => {
        const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // Soru değişince state'leri sıfırla
    const resetQuestionState = () => {
        setRevealedClues([false, false, false, false, false]);
        setIsAnswerRevealed(false);
    };

    const handleNext = () => {
        resetQuestionState();
        setCurrentIndex(prev => (prev + 1) % filteredList.length);
    };

    const handlePrev = () => {
        resetQuestionState();
        setCurrentIndex(prev => (prev - 1 + filteredList.length) % filteredList.length);
    };

    const handleCategoryChange = (cat: string) => {
        setSelectedCategory(cat);
        setCurrentIndex(0);
        resetQuestionState();
    };

    // Tek bir ipucunu aç
    const toggleClue = (index: number) => {
        setRevealedClues(prev => {
            const next = [...prev];
            next[index] = !next[index];
            return next;
        });
    };

    // Sıradaki ilk kapalı ipucunu aç
    const revealNextClue = () => {
        const nextIndex = revealedClues.findIndex(r => !r);
        if (nextIndex !== -1) {
            setRevealedClues(prev => {
                const next = [...prev];
                next[nextIndex] = true;
                return next;
            });
        }
    };

    // Mevcut açılan son ipucuna göre kazanılabilecek puan
    const currentPotentialScore = () => {
        let lastIndex = -1;
        for (let i = 0; i < revealedClues.length; i++) {
            if (revealedClues[i]) lastIndex = i;
        }
        if (lastIndex === -1) return 50;
        return CLUE_POINTS[lastIndex];
    };

    const handleRevealAnswer = () => {
        setIsAnswerRevealed(true);
        setRevealedClues([true, true, true, true, true]);
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
    };

    const awardTeam = (team: 'A' | 'B') => {
        const pts = currentPotentialScore();
        if (team === 'A') setTeamAScore(s => s + pts);
        else setTeamBScore(s => s + pts);
        handleRevealAnswer();
    };

    const categories = ['Tümü', 'Peygamberler', 'Sahabeler', 'Kutsal Mekanlar', 'Tarihi Şahsiyetler'];

    return (
        <div 
            ref={containerRef} 
            className={cn(
                "animate-in fade-in duration-700 transition-all font-sans bg-slate-50",
                isFullscreen ? "fixed inset-0 z-[99999] p-4 md:p-8 flex items-center justify-center bg-slate-950" : "w-full mx-auto"
            )}
        >
            <Card className={cn(
                "border shadow-2xl rounded-[2rem] overflow-hidden flex flex-col relative w-full max-w-6xl mx-auto transition-colors duration-500",
                isFullscreen ? "h-full bg-slate-900 border-slate-800 text-white" : "min-h-[750px] bg-white border-slate-200"
            )}>
                
                {/* HEADER */}
                <CardHeader className={cn(
                    "p-4 md:p-6 relative flex-shrink-0 z-20 border-b",
                    isFullscreen ? "bg-slate-900/90 border-slate-800" : "bg-slate-50 border-slate-200"
                )}>
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center shadow-inner">
                                <HelpCircle className="h-7 w-7" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <CardTitle className="text-2xl font-black uppercase tracking-tight text-slate-800 dark:text-white">
                                        Kimim Ben?
                                    </CardTitle>
                                    <Badge className="bg-amber-100 text-amber-800 border-none font-black text-xs px-2.5 py-0.5">
                                        5 İpucu
                                    </Badge>
                                </div>
                                <CardDescription className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
                                    En az ipucuyla gizli şahsiyeti veya mekânı tahmin edin!
                                </CardDescription>
                            </div>
                        </div>

                        {/* Takım Skorbordu & Araçlar */}
                        <div className="flex items-center gap-3">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setIsTeamMode(!isTeamMode)}
                                className={cn(
                                    "rounded-xl font-bold h-10 transition-all",
                                    isTeamMode ? "bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                                )}
                            >
                                <Users className="w-4 h-4 mr-1.5" /> 
                                {isTeamMode ? "Takım Modu Açık" : "Takım Yarışması"}
                            </Button>

                            {isTeamMode && (
                                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-black">
                                    <div className="px-3 py-1 bg-red-500 text-white rounded-xl flex items-center gap-1.5">
                                        <span>Takım A:</span>
                                        <span className="text-sm">{teamAScore}</span>
                                    </div>
                                    <div className="px-3 py-1 bg-blue-500 text-white rounded-xl flex items-center gap-1.5">
                                        <span>Takım B:</span>
                                        <span className="text-sm">{teamBScore}</span>
                                    </div>
                                    <button 
                                        onClick={() => { setTeamAScore(0); setTeamBScore(0); }} 
                                        title="Skorları Sıfırla" 
                                        className="p-1 hover:text-rose-500 transition-colors"
                                    >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            )}

                            <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={toggleFullscreen} 
                                className="rounded-xl h-10 w-10 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                            >
                                {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
                            </Button>
                        </div>
                    </div>

                    {/* Kategori Filtreleri */}
                    <div className="flex items-center gap-2 overflow-x-auto pt-3 pb-1 no-scrollbar">
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => handleCategoryChange(cat)}
                                className={cn(
                                    "px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap",
                                    selectedCategory === cat 
                                        ? "bg-slate-900 text-white shadow-md dark:bg-indigo-600" 
                                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
                                )}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </CardHeader>

                {/* CONTENT */}
                <CardContent className="flex-1 p-4 md:p-8 flex flex-col justify-between space-y-6 overflow-y-auto">
                    
                    {/* Üst Bilgi Barı */}
                    <div className="flex items-center justify-between bg-indigo-50/50 dark:bg-indigo-950/30 p-3.5 rounded-2xl border border-indigo-100/80 dark:border-indigo-900/50">
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 border-indigo-200 font-black text-xs uppercase px-3 py-1">
                                {currentItem.category}
                            </Badge>
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                Soru {currentIndex + 1} / {filteredList.length}
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest hidden sm:inline">
                                Kazanılabilecek Puan:
                            </span>
                            <Badge className="bg-amber-500 text-white font-black text-sm px-3 py-1 shadow-sm">
                                {currentPotentialScore()} Puan
                            </Badge>
                        </div>
                    </div>

                    {/* 5 İPUCU KARTLARI */}
                    <div className="grid grid-cols-1 gap-3.5">
                        {currentItem.clues.map((clue, idx) => {
                            const isRevealed = revealedClues[idx];
                            const points = CLUE_POINTS[idx];

                            return (
                                <div
                                    key={idx}
                                    onClick={() => toggleClue(idx)}
                                    className={cn(
                                        "group relative rounded-2xl border-2 p-4 md:p-5 transition-all duration-300 cursor-pointer flex items-center justify-between gap-4 select-none",
                                        isRevealed 
                                            ? "bg-white dark:bg-slate-800 border-indigo-400 dark:border-indigo-600 shadow-md translate-x-1" 
                                            : "bg-slate-100/70 dark:bg-slate-800/40 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-300 hover:bg-slate-100"
                                    )}
                                >
                                    <div className="flex items-center gap-4 flex-1">
                                        <div className={cn(
                                            "w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center font-black text-sm transition-transform group-hover:scale-105 shrink-0",
                                            isRevealed ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20" : "bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                                        )}>
                                            {idx + 1}
                                        </div>

                                        <div className="flex-1">
                                            {isRevealed ? (
                                                <p className="text-base md:text-xl font-bold text-slate-800 dark:text-slate-100 leading-snug animate-in fade-in slide-in-from-left-2 duration-300">
                                                    {clue}
                                                </p>
                                            ) : (
                                                <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 font-bold text-sm md:text-base">
                                                    <Lock className="w-4 h-4" />
                                                    <span>{idx + 1}. İpucu Kapalı (Açmak için dokunun)</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <Badge 
                                        variant="secondary" 
                                        className={cn(
                                            "font-black text-xs md:text-sm px-3 py-1 rounded-lg shrink-0",
                                            isRevealed ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300" : "bg-slate-200 dark:bg-slate-700 text-slate-500"
                                        )}
                                    >
                                        {points} P
                                    </Badge>
                                </div>
                            );
                        })}
                    </div>

                    {/* CEVAP VE AÇIKLAMA BÖLÜMÜ */}
                    {isAnswerRevealed ? (
                        <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/20 border-2 border-emerald-400 dark:border-emerald-600 shadow-xl animate-in zoom-in-95 duration-500 space-y-3 text-center">
                            <Badge className="bg-emerald-500 text-white font-black px-4 py-1 uppercase tracking-widest text-[11px]">
                                Doğru Cevap
                            </Badge>
                            <h3 className="text-4xl md:text-6xl font-black text-emerald-800 dark:text-emerald-300 tracking-tight">
                                {currentItem.title}
                            </h3>
                            <p className="text-slate-600 dark:text-slate-300 font-medium text-base md:text-lg max-w-3xl mx-auto leading-relaxed pt-2">
                                {currentItem.description}
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
                            <Button
                                size="lg"
                                onClick={revealNextClue}
                                className="h-14 px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-base uppercase tracking-wider rounded-2xl shadow-lg shadow-indigo-500/20 transition-all hover:scale-105"
                            >
                                <Unlock className="w-5 h-5 mr-2" /> Sıradaki İpucunu Aç
                            </Button>

                            <Button
                                size="lg"
                                variant="outline"
                                onClick={handleRevealAnswer}
                                className="h-14 px-8 border-2 border-amber-400 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 font-black text-base uppercase tracking-wider rounded-2xl transition-all"
                            >
                                <Eye className="w-5 h-5 mr-2" /> Cevabı Aç
                            </Button>
                        </div>
                    )}

                    {/* Takım Puan Butonları (Aktifse) */}
                    {isTeamMode && !isAnswerRevealed && (
                        <div className="p-4 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in duration-300">
                            <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Bu İpuçlarıyla Hangi Takım Bildi?
                            </span>
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                <Button 
                                    onClick={() => awardTeam('A')}
                                    className="flex-1 sm:flex-none h-11 px-6 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl text-sm"
                                >
                                    Takım A (+{currentPotentialScore()} P)
                                </Button>
                                <Button 
                                    onClick={() => awardTeam('B')}
                                    className="flex-1 sm:flex-none h-11 px-6 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-sm"
                                >
                                    Takım B (+{currentPotentialScore()} P)
                                </Button>
                            </div>
                        </div>
                    )}

                </CardContent>

                {/* FOOTER */}
                <CardFooter className={cn(
                    "p-4 md:p-6 border-t flex justify-between items-center flex-shrink-0 z-20",
                    isFullscreen ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200"
                )}>
                    <Button 
                        onClick={handlePrev}
                        variant="outline"
                        className="h-12 px-6 font-black rounded-xl border-slate-200 text-slate-600 hover:bg-white dark:border-slate-700 dark:text-slate-300"
                    >
                        <ChevronLeft className="w-5 h-5 mr-1" /> Önceki
                    </Button>

                    <div className="text-xs font-black uppercase tracking-widest text-slate-400">
                        {currentIndex + 1} / {filteredList.length}
                    </div>

                    <Button 
                        onClick={handleNext}
                        className="h-12 px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-md transition-all"
                    >
                        Sonraki <ChevronRight className="w-5 h-5 ml-1" />
                    </Button>
                </CardFooter>

            </Card>
        </div>
    );
}
