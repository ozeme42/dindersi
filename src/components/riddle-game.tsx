'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
    Maximize, Minimize, ChevronLeft, ChevronRight, Sparkles, 
    Brain, Eye, HelpCircle, Lightbulb, Timer, Play, Pause, RotateCcw,
    CheckCircle2, BookOpen, Quote
} from 'lucide-react';
import { cn } from "@/lib/utils";
import confetti from 'canvas-confetti';

export type RiddleItem = {
    id: number;
    question: string;
    answer: string;
    hint: string;
    explanation: string;
    category: string;
};

const RIDDLES_DATA: RiddleItem[] = [
    {
        id: 1,
        question: "Dört büyük halife döneminde yaşadı, Peygamberimiz'i (s.a.v.) canından çok sevdi ama sahabe sayılamadı. Kimdir ve neden?",
        answer: "Veysel Karanî (Üveys el-Karanî)",
        hint: "Yemen'de yaşadı, hasta annesine bakmak için Medine'ye gittiğinde Efendimiz evde yoktu.",
        explanation: "Sahabe sayılmanın şartı: Peygamber Efendimiz'i (s.a.v.) iman ederek dünya gözüyle hayattayken bizzat görmüş olmaktır. Veysel Karani O'nun döneminde yaşayıp iman ettiği halde yüzünü göremediği için sahabe değil, 'Tabiîn'in en hayırlısı' kabul edilir.",
        category: "Tarih & Siyer"
    },
    {
        id: 2,
        question: "Öyle bir namaz vardır ki içinde ne rüku ne de secde vardır; sadece ayakta (kıyamda) kılınır. Bu hangi namazdır?",
        answer: "Cenaze Namazı",
        hint: "Vefat eden Müslüman din kardeşimiz için yapılan bir duadır.",
        explanation: "Cenaze namazı, vefat eden kimse için kılınan farz-ı kifaye bir namaz ve duadır. Dört tekbirden oluşur; rüku ve secdesi yoktur, tamamen ayakta kılınır.",
        category: "Fıkıh & İbadet"
    },
    {
        id: 3,
        question: "Yüce kitabımız Kur'an-ı Kerim'de adı açıkça zikredilen TEK kadın kimdir?",
        answer: "Hz. Meryem (a.s.)",
        hint: "Hz. İsa'nın annesidir ve Kur'an'ın 19. suresi onun adını taşır.",
        explanation: "Kur'an'da Hz. Havva, Hz. Asiye gibi pek çok mübarek hanımdan bahsedilir ancak ismi açıkça telaffuz edilen ve adına müstakil bir sure bulunan tek hanım Hz. Meryem'dir.",
        category: "Kur'an Bilgisi"
    },
    {
        id: 4,
        question: "Öyle bir ibadettir ki dünyada sadece tek bir şehirde ve tek bir alanda yapılabilir; başka hiçbir ülkede veya şehirde yapılamaz. Hangi ibadettir?",
        answer: "Hac ve Tavaf İbadeti",
        hint: "Kâbe ve Arafat'ta gerçekleştirilir.",
        explanation: "Namaz, oruç, zekat gibi ibadetler dünyanın her yerinde ifa edilebilirken; Hac ibadeti (ve Kâbe'yi tavaf) yalnızca Mekke-i Mükerreme'deki mukaddes topraklarda yapılabilir.",
        category: "İbadetler"
    },
    {
        id: 5,
        question: "Gecesi gündüzünden daha hayırlı olan, tek bir gecesi bin aydan daha hayırlı kılınan mübarek vakit hangisidir?",
        answer: "Kadir Gecesi",
        hint: "Ramazan ayının son on gününde gizlenmiştir ve Kur'an bu gecede indirilmiştir.",
        explanation: "Kadir Suresi'nde açıkça belirtildiği üzere: 'Kadir Gecesi bin aydan daha hayırlıdır'. Bin ay yaklaşık 83 yıl 4 aylık bir insan ömrüne denk gelmektedir.",
        category: "Mübarek Vakitler"
    },
    {
        id: 6,
        question: "Kur'an-ı Kerim'de başında 'Besmele' bulunmayan TEK sure hangisidir?",
        answer: "Tevbe Suresi (Berâe)",
        hint: "Kur'an-ı Kerim'in 9. suresidir, müşriklere karşı kesin bir ültimatomla başlar.",
        explanation: "Tevbe Suresi müşriklerin antlaşmaları bozmaları üzerine inmiş, savaş ve kesin uyarı içermektedir. Besmele ise rahmet ve eman ifade ettiğinden, bu surenin başında Besmele yer almaz.",
        category: "Kur'an Bilgisi"
    },
    {
        id: 7,
        question: "Peki başında besmele olmayan Tevbe Suresi'ne rağmen Kur'an'daki toplam Besmele sayısı neden eksik kalmayıp yine tam 114 tanedir?",
        answer: "Neml Suresi'nde iki defa Besmele geçer (30. ayet).",
        hint: "Hz. Süleyman'ın Sebe melikesi Belkıs'a gönderdiği mektubun başında bir Besmele daha vardır.",
        explanation: "Neml Suresi'nin 30. ayetinde Hz. Süleyman'ın mektubu anlatılırken: 'İnnehû min Süleymâne ve innehû bismillâhirrahmânirrahîm' denilerek Besmele bir ayet olarak geçer ve toplam 114 tamamlanır.",
        category: "Kur'an Bilgisi"
    },
    {
        id: 8,
        question: "Öyle bir kurban vardır ki, yeni bir evlat dünyaya geldiğinde Allah'a bir şükran nişanesi olarak kesilir. Adı nedir?",
        answer: "Akîka Kurbanı",
        hint: "Çocuğun doğumundan sonra kesilmesi müstehaptır.",
        explanation: "Yeni doğan çocuk için Allah'a şükretmek amacıyla kesilen kurbana 'Akika' kurbanı denir. Peygamberimiz torunları Hz. Hasan ve Hz. Hüseyin için de akika kurbanı kesmiştir.",
        category: "Fıkıh & İbadet"
    },
    {
        id: 9,
        question: "Allah Teâlâ'nın Kur'an-ı Kerim'de doğrudan vahiy (ilham) ettiğini bildirdiği, dağlarda ve ağaçlarda yuva kurup insanlara şifa kaynağı üreten hayvan hangisidir?",
        answer: "Bal Arısı (Nahl)",
        hint: "Kur'an'ın 16. suresine ismini vermiştir.",
        explanation: "Nahl Suresi 68-69. ayetlerinde: 'Rabbin bal arısına vahyetti: Dağlardan, ağaçlardan evler edin... onların karınlarından renkleri çeşit çeşit bir şerbet çıkar ki onda insanlar için şifa vardır.' buyrulur.",
        category: "Kur'an ve Canlılar"
    },
    {
        id: 10,
        question: "Müslümanlar cuma günü camide namazdan önce bir konuşma dinlerler, bayram günlerinde ise namazdan sonra dinlerler. Bu konuşmanın adı nedir?",
        answer: "Hutbe",
        hint: "Minberden hatip veya imam tarafından okunur.",
        explanation: "Cuma namazında hutbe namazın sıhhat şartı olup namazdan ÖNCE okunur; bayram namazlarında ise hutbe sünnet olup namazdan SONRA okunur.",
        category: "İbadetler"
    },
    {
        id: 11,
        question: "Peygamber Efendimiz'in (s.a.v.) vefatından sonra Kur'an ayetlerinin dağınık parçalardan toplanıp ilk kez tek bir kitap (Mushaf) haline getirilmesini teklif eden ulu sahabi kimdir?",
        answer: "Hz. Ömer (r.a.)",
        hint: "Yemame Savaşı'nda birçok hafız sahabi şehit düşünce Halife Hz. Ebubekir'e başvurmuştur.",
        explanation: "Yemâme Savaşı'nda çok sayıda kurrâ/hafız sahabi şehit düşünce Hz. Ömer, Kur'an'ın kaybolması endişesiyle Hz. Ebubekir'e gitmiş ve Zeyd bin Sabit başkanlığında ilk mushafın toplanmasını sağlamıştır.",
        category: "Tarih & Kur'an"
    },
    {
        id: 12,
        question: "Öyle bir namaz vakti vardır ki, farzından ÖNCE sünneti kılınır, sonra farzı kılınır ama farzından SONRA sünneti KILINMAZ. Hangi vakit namazıdır?",
        answer: "Sabah Namazı ve İkindi Namazı",
        hint: "Günün ilk vaktidir veya ikindi vaktidir.",
        explanation: "Sabah namazında 2 rekat sünnet önce, 2 rekat farz sonra kılınır; farzdan sonra nafile kılınmaz. Aynı şekilde ikindi namazında da 4 rekat sünnet önce kılınır, farzından sonra kerahat vakti girdiğinden nafile namaz kılınmaz.",
        category: "Fıkıh & Namaz"
    },
    {
        id: 13,
        question: "Peygamberimiz'in Medine'ye hicret ettiğinde devesi Kasva'nın çöktüğü arsaya inşa edilen ve Peygamberimiz'in kabrinin de içinde bulunduğu kutlu mescid hangisidir?",
        answer: "Mescid-i Nebevî (Mescid-i Nebî)",
        hint: "Medine-i Münevvere'dedir ve yeşil kubbesi (Kubbe-i Hadra) ile tanınır.",
        explanation: "Mescid-i Nebevi hicretin hemen ardından inşa edilmiş; ibadet, eğitim (Ashab-ı Suffe) ve devlet yönetiminin merkezi olmuştur. İçinde Peygamberimizin kabr-i şerifi olan Ravza-i Mutahhara bulunur.",
        category: "Kutsal Mekanlar"
    },
    {
        id: 14,
        question: "Öyle bir oruç türü vardır ki, kişinin kendi isteğiyle yerine getirmeyi Allah'a söz verdiği (adadığı) bir ibadettir. Gerçekleşince tutması vacip olur. Adı nedir?",
        answer: "Adak (Nezir) Orucu",
        hint: "'Şu işim olursa 3 gün oruç tutacağım' demek gibi.",
        explanation: "Kişinin dinen mecbur olmadığı halde bir dileğin gerçekleşmesi şartına bağlı olarak veya mutlak olarak tutmayı adadığı oruçtur. Şart gerçekleştiğinde tutulması vacip hale gelir.",
        category: "Fıkıh & İbadet"
    },
    {
        id: 15,
        question: "Kur'an-ı Kerim'de her ayetinde 'Allah' lafzı geçen tek mübarek sure hangisidir?",
        answer: "Mücâdele Suresi",
        hint: "Kur'an'ın 58. suresidir ve 22 ayettir.",
        explanation: "28. cüzde yer alan Mücadele Suresi'nin 22 ayetinin istisnasız HER BİRİNDE 'Allah' lafza-i celali en az bir defa (bazılarında birden fazla) geçmektedir.",
        category: "Kur'an Bilgisi"
    }
];

export function RiddleGame() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [showHint, setShowHint] = useState(false);
    const [isRevealed, setIsRevealed] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Geri Sayım Sayacı (30 saniye düşünme süresi)
    const [timeLeft, setTimeLeft] = useState(30);
    const [isTimerRunning, setIsTimerRunning] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const currentRiddle = RIDDLES_DATA[currentIndex];

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

    // Timer mantığı
    useEffect(() => {
        if (isTimerRunning && timeLeft > 0) {
            timerRef.current = setTimeout(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            setIsTimerRunning(false);
        }
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [isTimerRunning, timeLeft]);

    const resetRiddleState = () => {
        setShowHint(false);
        setIsRevealed(false);
        setTimeLeft(30);
        setIsTimerRunning(false);
    };

    const handleNext = () => {
        resetRiddleState();
        setCurrentIndex(prev => (prev + 1) % RIDDLES_DATA.length);
    };

    const handlePrev = () => {
        resetRiddleState();
        setCurrentIndex(prev => (prev - 1 + RIDDLES_DATA.length) % RIDDLES_DATA.length);
    };

    const toggleTimer = () => {
        setIsTimerRunning(!isTimerRunning);
    };

    const resetTimer = () => {
        setTimeLeft(30);
        setIsTimerRunning(false);
    };

    const handleReveal = () => {
        setIsRevealed(true);
        setIsTimerRunning(false);
        confetti({ particleCount: 130, spread: 75, origin: { y: 0.6 } });
    };

    return (
        <div 
            ref={containerRef} 
            className={cn(
                "animate-in fade-in duration-700 transition-all font-sans bg-slate-50",
                isFullscreen ? "fixed inset-0 z-[99999] p-4 md:p-8 flex items-center justify-center bg-slate-950" : "w-full mx-auto"
            )}
        >
            <Card className={cn(
                "border shadow-2xl rounded-[2rem] overflow-hidden flex flex-col relative w-full max-w-5xl mx-auto transition-colors duration-500",
                isFullscreen ? "h-full bg-slate-900 border-slate-800 text-white" : "min-h-[720px] bg-white border-slate-200"
            )}>
                
                {/* HEADER */}
                <CardHeader className={cn(
                    "p-4 md:p-6 relative flex-shrink-0 z-20 border-b",
                    isFullscreen ? "bg-slate-900/90 border-slate-800" : "bg-slate-50 border-slate-200"
                )}>
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center shadow-inner">
                                <Brain className="h-7 w-7" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <CardTitle className="text-2xl font-black uppercase tracking-tight text-slate-800 dark:text-white">
                                        Zeka ve Mantık Soruları
                                    </CardTitle>
                                    <Badge className="bg-amber-100 text-amber-800 border-none font-black text-xs px-2.5 py-0.5">
                                        Bilmeceler
                                    </Badge>
                                </div>
                                <CardDescription className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
                                    Düşündürücü, fıkhi ve tarihi merak uyandıran zihin bulmacaları!
                                </CardDescription>
                            </div>
                        </div>

                        {/* Sayaç ve Araçlar */}
                        <div className="flex items-center gap-3">
                            <div className={cn(
                                "flex items-center gap-2 px-3.5 py-1.5 rounded-2xl border transition-all text-sm font-black",
                                timeLeft <= 10 && timeLeft > 0 
                                    ? "bg-rose-50 border-rose-300 text-rose-600 animate-pulse dark:bg-rose-950/40" 
                                    : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                            )}>
                                <Timer className="w-4 h-4" />
                                <span className="tabular-nums w-7 text-center">{timeLeft}s</span>
                                <button onClick={toggleTimer} className="p-1 hover:text-amber-500 transition-colors">
                                    {isTimerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                                </button>
                                <button onClick={resetTimer} className="p-1 hover:text-slate-900 dark:hover:text-white transition-colors">
                                    <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                            </div>

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
                </CardHeader>

                {/* CONTENT */}
                <CardContent className="flex-1 p-6 md:p-10 flex flex-col justify-between space-y-8 overflow-y-auto">
                    
                    {/* Kategori Bilgisi */}
                    <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                        <Badge variant="outline" className="border-amber-300 text-amber-700 dark:text-amber-300 uppercase px-3 py-1 font-black">
                            {currentRiddle.category}
                        </Badge>
                        <span>Soru {currentIndex + 1} / {RIDDLES_DATA.length}</span>
                    </div>

                    {/* SORU KARTI */}
                    <div className="p-8 md:p-12 rounded-[2.5rem] bg-gradient-to-br from-amber-500/5 via-orange-500/5 to-yellow-500/10 border-2 border-amber-300/60 dark:border-amber-700/40 shadow-xl relative overflow-hidden text-center flex flex-col items-center justify-center">
                        <div className="w-14 h-14 rounded-2xl bg-amber-500 text-white flex items-center justify-center mb-6 shadow-md shadow-amber-500/20">
                            <Quote className="w-7 h-7 rotate-180" />
                        </div>

                        <h2 className="text-2xl md:text-4xl font-black text-slate-800 dark:text-white leading-relaxed max-w-3xl">
                            "{currentRiddle.question}"
                        </h2>
                    </div>

                    {/* İPUCU BÖLÜMÜ */}
                    {showHint && !isRevealed && (
                        <div className="p-5 bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-800 rounded-2xl flex items-center gap-3 animate-in fade-in duration-300 max-w-2xl mx-auto w-full">
                            <Lightbulb className="w-6 h-6 text-amber-500 shrink-0" />
                            <p className="text-amber-900 dark:text-amber-200 text-sm md:text-base font-bold">
                                İpucu: {currentRiddle.hint}
                            </p>
                        </div>
                    )}

                    {/* CEVAP VE AÇIKLAMA */}
                    {isRevealed ? (
                        <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/20 border-2 border-emerald-400 dark:border-emerald-600 shadow-xl animate-in zoom-in-95 duration-500 space-y-4 text-center max-w-3xl mx-auto w-full">
                            <Badge className="bg-emerald-500 text-white font-black px-4 py-1 uppercase tracking-widest text-[11px]">
                                Cevap
                            </Badge>
                            <h3 className="text-3xl md:text-5xl font-black text-emerald-800 dark:text-emerald-300 tracking-tight">
                                {currentRiddle.answer}
                            </h3>
                            <div className="pt-2 border-t border-emerald-200/60 dark:border-emerald-800/60">
                                <p className="text-slate-600 dark:text-slate-300 font-medium text-base leading-relaxed">
                                    {currentRiddle.explanation}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Button
                                size="lg"
                                variant="outline"
                                onClick={() => setShowHint(!showHint)}
                                className="h-14 px-8 border-2 border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 font-black text-base uppercase tracking-wider rounded-2xl transition-all"
                            >
                                <Lightbulb className={cn("w-5 h-5 mr-2", showHint ? "text-amber-500 fill-amber-500" : "")} /> 
                                {showHint ? "İpucunu Kapat" : "İpucu Al"}
                            </Button>

                            <Button
                                size="lg"
                                onClick={handleReveal}
                                className="h-14 px-10 bg-amber-500 hover:bg-amber-600 text-white font-black text-base uppercase tracking-wider rounded-2xl shadow-lg shadow-amber-500/30 transition-all hover:scale-105"
                            >
                                <Eye className="w-5 h-5 mr-2" /> Cevabı Göster
                            </Button>
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
                        {currentIndex + 1} / {RIDDLES_DATA.length}
                    </div>

                    <Button 
                        onClick={handleNext}
                        className="h-12 px-8 bg-amber-600 hover:bg-amber-700 text-white font-black rounded-xl shadow-md transition-all"
                    >
                        Sonraki <ChevronRight className="w-5 h-5 ml-1" />
                    </Button>
                </CardFooter>

            </Card>
        </div>
    );
}
