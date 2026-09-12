'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
    Maximize, Minimize, ChevronLeft, ChevronRight, Sparkles, 
    Link2, CheckCircle2, XCircle, Lightbulb, RotateCcw, ArrowRight, BookOpen
} from 'lucide-react';
import { cn } from "@/lib/utils";
import confetti from 'canvas-confetti';

export type AnalogyQuestion = {
    id: number;
    wordA: string;
    wordB: string;
    wordC: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
    category: string;
};

const ANALOGY_DATA: AnalogyQuestion[] = [
    {
        id: 1,
        wordA: "Namaz",
        wordB: "Abdest",
        wordC: "Oruç",
        options: ["İftar", "Niyet", "Teravih", "Sahur"],
        correctAnswer: "Niyet",
        explanation: "Namazın geçerli olması için ön şart nasıl 'Abdest' ise, orucun başlaması ve geçerli olması için de 'Niyet' şarttır.",
        category: "İbadetler"
    },
    {
        id: 2,
        wordA: "Mekke",
        wordB: "Kâbe",
        wordC: "Medine",
        options: ["Hira Mağarası", "Mescid-i Nebevî", "Arafat", "Mescid-i Aksâ"],
        correctAnswer: "Mescid-i Nebevî",
        explanation: "Mekke'nin kalbi ve simgesi nasıl Kâbe ise, Medine'nin kalbi ve Peygamberimizin kabrini barındıran simge mescid Mescid-i Nebevî'dir.",
        category: "Mekanlar"
    },
    {
        id: 3,
        wordA: "Tevrat",
        wordB: "Hz. Musa",
        wordC: "İncil",
        options: ["Hz. İsa", "Hz. Davud", "Hz. İbrahim", "Hz. Yahya"],
        correctAnswer: "Hz. İsa",
        explanation: "Tevrat nasıl Hz. Musa'ya (a.s.) vahyedilen ilahi kitap ise, İncil de Hz. İsa'ya (a.s.) vahyedilen ilahi kitaptır.",
        category: "İlahi Kitaplar"
    },
    {
        id: 4,
        wordA: "Zekat",
        wordB: "Zengin",
        wordC: "Sadaka",
        options: ["Yalnızca Fakir", "Herkes", "Yalnızca Tüccar", "Yalnızca Yaşlılar"],
        correctAnswer: "Herkes",
        explanation: "Zekat nisap miktarı mala sahip zenginlere farz bir ibadet iken, sadaka az veya çok imkanı olan herkesin yapabileceği nafile/gönüllü bir hayırdır.",
        category: "İbadetler"
    },
    {
        id: 5,
        wordA: "Cebrail",
        wordB: "Vahiy",
        wordC: "Mikail",
        options: ["Ölüm", "Kıyamet Sûru", "Tabiat Olayları", "Cennet Kapısı"],
        correctAnswer: "Tabiat Olayları",
        explanation: "Cebrail (a.s.) vahiy getirmekle görevli melek iken, Mikail (a.s.) rüzgar, yağmur gibi tabiat olaylarını ve rızıkları idare etmekle görevlidir.",
        category: "Melekler"
    },
    {
        id: 6,
        wordA: "Ramazan",
        wordB: "Oruç",
        wordC: "Zilhicce",
        options: ["Hac ve Kurban", "Aşure", "Mevlid", "Fitre"],
        correctAnswer: "Hac ve Kurban",
        explanation: "Ramazan ayı nasıl oruç ibadetiyle özdeşleşmiş mübarek bir ay ise, Zilhicce ayı da Hac ve Kurban ibadetlerinin ifa edildiği aydır.",
        category: "Zamanlar"
    },
    {
        id: 7,
        wordA: "İmsak",
        wordB: "Başlangıç",
        wordC: "İftar",
        options: ["Bitiş", "Ödül", "Dua", "Gece"],
        correctAnswer: "Bitiş",
        explanation: "İmsak vakti orucun başlama vaktini ifade ederken, iftar vakti orucun açıldığı/bittiği vakti ifade eder.",
        category: "İbadetler"
    },
    {
        id: 8,
        wordA: "Kurban",
        wordB: "Hz. İbrahim",
        wordC: "Gemi",
        options: ["Hz. Nuh", "Hz. Yunus", "Hz. Eyyub", "Hz. Salih"],
        correctAnswer: "Hz. Nuh",
        explanation: "Kurban teslimiyeti nasıl Hz. İbrahim (a.s.) ile sembolleşmişse, büyük tufandan kurtuluş gemisi de Hz. Nuh (a.s.) ile sembolleşmiştir.",
        category: "Peygamberler"
    },
    {
        id: 9,
        wordA: "Adalet",
        wordB: "Hz. Ömer",
        wordC: "Haya / Edep",
        options: ["Hz. Osman", "Hz. Ali", "Hz. Hamza", "Hz. Ebubekir"],
        correctAnswer: "Hz. Osman",
        explanation: "Eşsiz adaletiyle Hz. Ömer anılırken; edebi, hayası ve meleklerin dahi utandığı nezaketiyle Hz. Osman (r.a.) anılır.",
        category: "Ahlak"
    },
    {
        id: 10,
        wordA: "Ezan",
        wordB: "Hz. Bilal-i Habeşi",
        wordC: "Kur'an Yazıcılığı",
        options: ["Zeyd bin Sabit", "Ebu Hüreyre", "Mus'ab bin Umeyr", "Cafer-i Tayyar"],
        correctAnswer: "Zeyd bin Sabit",
        explanation: "İlk ezanı okuyan ulu müezzin Hz. Bilal iken; Kur'an ayetlerini vahiy katibi olarak kaydedip mushaf heyetine başkanlık eden genç sahabi Zeyd bin Sabit'tir.",
        category: "Sahabeler"
    },
    {
        id: 11,
        wordA: "İhlas",
        wordB: "Samimiyet",
        wordC: "Riya",
        options: ["Gösteriş", "Korku", "Cimrilik", "Yalan"],
        correctAnswer: "Gösteriş",
        explanation: "İhlas ibadeti sırf Allah rızası için 'samimiyetle' yapmak iken, riya ise insanlara beğendirmek için 'gösteriş' yapmaktır (zıt anlam).",
        category: "Kavramlar"
    },
    {
        id: 12,
        wordA: "Dünya",
        wordB: "Tarla",
        wordC: "Ahiret",
        options: ["Hasat Yeri", "Pazar", "Yolculuk", "Zindan"],
        correctAnswer: "Hasat Yeri",
        explanation: "Hadis-i şerifte buyrulduğu gibi 'Dünya ahiretin tarlasıdır'. Eken dünyada eker, biçen (hasadını alan) ise ahirette alır.",
        category: "Ahiret İnancı"
    },
    {
        id: 13,
        wordA: "Göz",
        wordB: "Görmek (Basar)",
        wordC: "Kulak",
        options: ["İşitmek (Semi)", "Bilmek (İlim)", "Dilemek (İrade)", "Yaratmak (Tekvin)"],
        correctAnswer: "İşitmek (Semi)",
        explanation: "Allah'ın görme sıfatı Basar ile nasıl göz arasında bir bağ kurulursa, Semi sıfatı da her şeyi işitme sıfatıdır.",
        category: "Allah'ın Sıfatları"
    },
    {
        id: 14,
        wordA: "Uhud",
        wordB: "Okçular Tepesi",
        wordC: "Hendek",
        options: ["Savunma Çukuru", "Mancınık", "Kale Kuşatması", "Su Kuyusu"],
        correctAnswer: "Savunma Çukuru",
        explanation: "Uhud Savaşı'nın kilit stratejik noktası Okçular Tepesi iken, Hendek Savaşı'nın kilit stratejisi şehrin etrafına kazılan savunma çukurudur.",
        category: "Siyer"
    },
    {
        id: 15,
        wordA: "Zebur",
        wordB: "Hz. Davud",
        wordC: "Kur'an-ı Kerim",
        options: ["Hz. Muhammed (s.a.v.)", "Hz. Adem", "Hz. Nuh", "Hz. İsa"],
        correctAnswer: "Hz. Muhammed (s.a.v.)",
        explanation: "Zebur ilahi kitabı Hz. Davud'a (a.s.) verilmiş, son ilahi kitap olan Kur'an-ı Kerim ise Hz. Muhammed'e (s.a.v.) indirilmiştir.",
        category: "İlahi Kitaplar"
    },
    {
        id: 16,
        wordA: "Kıraat",
        wordB: "Okumak",
        wordC: "Rüku",
        options: ["Eğilmek", "Oturmak", "Secdeye Varmak", "Elleri Bağlamak"],
        correctAnswer: "Eğilmek",
        explanation: "Namazın rükünlerinden Kıraat ayakta Kur'an 'okumayı' ifade ederken, Rüku ise eller dizlere konularak saygıyla 'eğilmeyi' ifade eder.",
        category: "İbadetler"
    },
    {
        id: 17,
        wordA: "Fatiha",
        wordB: "İlk Sure",
        wordC: "Nas",
        options: ["Son Sure", "En Uzun Sure", "En Kısa Sure", "Mekki Sure"],
        correctAnswer: "Son Sure",
        explanation: "Fatiha Suresi Kur'an-ı Kerim'in tertip sırasına göre 1. (ilk) suresi iken, Nas Suresi 114. (son) suresidir.",
        category: "Kur'an Bilgisi"
    },
    {
        id: 18,
        wordA: "Güneş",
        wordB: "Gündüz",
        wordC: "Hilal",
        options: ["Ramazan / Gece", "Bahar", "Öğle", "Sıcaklık"],
        correctAnswer: "Ramazan / Gece",
        explanation: "Gündüzün alameti gökyüzünde güneş iken; kameri ayların, gecenin ve bilhassa Ramazan'ın alameti Hilal'dir.",
        category: "Kavramlar"
    },
    {
        id: 19,
        wordA: "Cennet",
        wordB: "Mükafat",
        wordC: "Cehennem",
        options: ["Ceza", "Karanlık", "Yok Oluş", "Yalnızlık"],
        correctAnswer: "Ceza",
        explanation: "Cennet dünyada iyilik yapan, inanan kullara ebedi 'mükafat' yurdu iken; Cehennem inkarcı ve zalimler için 'ceza' yurdudur.",
        category: "Ahiret İnancı"
    },
    {
        id: 20,
        wordA: "Tevhid",
        wordB: "Birlik",
        wordC: "Şirk",
        options: ["Ortak Koşmak", "İnkar Etmek", "Korkmak", "Şüphelenmek"],
        correctAnswer: "Ortak Koşmak",
        explanation: "Tevhid Allah'ın tek ve bir olduğunu kabul etmek iken; Şirk Allah'a zatında, sıfatlarında veya mabud oluşunda ortak (eş) koşmaktır.",
        category: "İnanç Esasları"
    }
];

export function ConceptAnalogyGame() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [isAnswered, setIsAnswered] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [score, setScore] = useState(0);

    const containerRef = useRef<HTMLDivElement>(null);
    const currentQ = ANALOGY_DATA[currentIndex];

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

    const handleSelectOption = (opt: string) => {
        if (isAnswered) return;
        setSelectedOption(opt);
        setIsAnswered(true);

        if (opt === currentQ.correctAnswer) {
            setScore(s => s + 10);
            confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
        }
    };

    const handleNext = () => {
        setSelectedOption(null);
        setIsAnswered(false);
        setCurrentIndex(prev => (prev + 1) % ANALOGY_DATA.length);
    };

    const handlePrev = () => {
        setSelectedOption(null);
        setIsAnswered(false);
        setCurrentIndex(prev => (prev - 1 + ANALOGY_DATA.length) % ANALOGY_DATA.length);
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
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-600 flex items-center justify-center shadow-inner">
                                <Link2 className="h-7 w-7" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <CardTitle className="text-2xl font-black uppercase tracking-tight text-slate-800 dark:text-white">
                                        Kavram Analojisi
                                    </CardTitle>
                                    <Badge className="bg-teal-100 text-teal-800 border-none font-black text-xs px-2.5 py-0.5">
                                        Mantık Bağı
                                    </Badge>
                                </div>
                                <CardDescription className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
                                    İlk iki kavram arasındaki ilişkiyi çöz, soru işaretli boşluğu doğru kavramla tamamla!
                                </CardDescription>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <Badge className="bg-teal-600 text-white font-black text-sm px-3.5 py-1.5 rounded-xl shadow-sm">
                                Skor: {score} P
                            </Badge>
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
                    
                    {/* Soru Kategorisi ve İlerleme */}
                    <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                        <Badge variant="outline" className="border-teal-300 text-teal-700 dark:text-teal-300 uppercase px-3 py-1 font-black">
                            {currentQ.category}
                        </Badge>
                        <span>Soru {currentIndex + 1} / {ANALOGY_DATA.length}</span>
                    </div>

                    {/* ANALOJİ FORMÜLÜ BÖLÜMÜ (A : B :: C : ?) */}
                    <div className="bg-gradient-to-r from-teal-50 via-cyan-50 to-blue-50 dark:from-slate-800 dark:to-slate-800/60 p-6 md:p-10 rounded-[2.5rem] border-2 border-teal-200/80 dark:border-teal-900/60 shadow-lg">
                        <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8">
                            
                            {/* 1. Çift (A : B) */}
                            <div className="flex items-center gap-3 bg-white dark:bg-slate-900 px-6 py-4 rounded-2xl border-2 border-teal-300 dark:border-teal-700 shadow-md">
                                <span className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white">
                                    {currentQ.wordA}
                                </span>
                                <span className="text-xl font-black text-teal-500">:</span>
                                <span className="text-2xl md:text-3xl font-black text-teal-600 dark:text-teal-400">
                                    {currentQ.wordB}
                                </span>
                            </div>

                            {/* Analoji Ayıracı (::) */}
                            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-teal-500 text-white shadow-md shadow-teal-500/30">
                                <span className="text-lg font-black tracking-widest">::</span>
                            </div>

                            {/* 2. Çift (C : ?) */}
                            <div className="flex items-center gap-3 bg-white dark:bg-slate-900 px-6 py-4 rounded-2xl border-2 border-dashed border-teal-400 dark:border-teal-600 shadow-md">
                                <span className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white">
                                    {currentQ.wordC}
                                </span>
                                <span className="text-xl font-black text-teal-500">:</span>
                                <span className={cn(
                                    "text-2xl md:text-3xl font-black px-4 py-1 rounded-xl transition-all",
                                    isAnswered 
                                        ? "bg-teal-500 text-white shadow-sm" 
                                        : "text-amber-500 bg-amber-50 dark:bg-amber-950/40 animate-pulse"
                                )}>
                                    {isAnswered ? currentQ.correctAnswer : "?"}
                                </span>
                            </div>

                        </div>

                        <p className="text-center text-xs md:text-sm text-slate-500 dark:text-slate-400 font-bold mt-6 uppercase tracking-wider">
                            "{currentQ.wordA}" ile "{currentQ.wordB}" arasındaki ilişki, "{currentQ.wordC}" ile aşağıdakilerden hangisi arasındadır?
                        </p>
                    </div>

                    {/* SEÇENEKLER (4 ŞIK) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl mx-auto w-full">
                        {currentQ.options.map((opt, idx) => {
                            const isSelected = selectedOption === opt;
                            const isCorrect = opt === currentQ.correctAnswer;
                            const letters = ['A', 'B', 'C', 'D'];

                            let btnStyle = "bg-white hover:bg-slate-50 border-slate-200 text-slate-800 dark:bg-slate-800 dark:border-slate-700 dark:text-white hover:border-teal-400";
                            if (isAnswered) {
                                if (isCorrect) {
                                    btnStyle = "bg-emerald-500 border-emerald-600 text-white shadow-lg shadow-emerald-500/20";
                                } else if (isSelected) {
                                    btnStyle = "bg-rose-500 border-rose-600 text-white shadow-lg shadow-rose-500/20";
                                } else {
                                    btnStyle = "opacity-40 border-slate-200 dark:border-slate-800";
                                }
                            }

                            return (
                                <button
                                    key={idx}
                                    disabled={isAnswered}
                                    onClick={() => handleSelectOption(opt)}
                                    className={cn(
                                        "h-20 p-5 rounded-2xl border-2 font-black text-xl flex items-center justify-between transition-all duration-300 hover:scale-[1.02] shadow-sm select-none",
                                        btnStyle
                                    )}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm",
                                            isAnswered && (isCorrect || isSelected)
                                                ? "bg-white/20 text-white" 
                                                : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                                        )}>
                                            {letters[idx]}
                                        </div>
                                        <span>{opt}</span>
                                    </div>

                                    {isAnswered && isCorrect && <CheckCircle2 className="w-6 h-6 text-white" />}
                                    {isAnswered && isSelected && !isCorrect && <XCircle className="w-6 h-6 text-white" />}
                                </button>
                            );
                        })}
                    </div>

                    {/* MANTIK AÇIKLAMASI */}
                    {isAnswered && (
                        <div className="p-5 md:p-6 bg-teal-50 dark:bg-teal-950/40 border-2 border-teal-300 dark:border-teal-800 rounded-2xl flex items-start gap-3.5 animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-3xl mx-auto w-full">
                            <Lightbulb className="w-6 h-6 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-black text-teal-900 dark:text-teal-200 text-sm uppercase tracking-wider mb-1">
                                    Bağlantı Mantığı:
                                </h4>
                                <p className="text-slate-700 dark:text-slate-300 font-medium text-sm md:text-base leading-relaxed">
                                    {currentQ.explanation}
                                </p>
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
                        {currentIndex + 1} / {ANALOGY_DATA.length}
                    </div>

                    <Button 
                        onClick={handleNext}
                        className="h-12 px-8 bg-teal-600 hover:bg-teal-700 text-white font-black rounded-xl shadow-md transition-all"
                    >
                        Sonraki <ChevronRight className="w-5 h-5 ml-1" />
                    </Button>
                </CardFooter>

            </Card>
        </div>
    );
}
