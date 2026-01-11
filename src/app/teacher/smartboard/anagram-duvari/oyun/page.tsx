'use client';

import { useState, useEffect, Suspense, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Eye, Trophy, ArrowLeft, Wand2 } from "lucide-react";
import Link from "next/link";
import { getAnagramWallWords } from '../actions';
import { cn } from "@/lib/utils";
import { playSound } from "@/lib/audio-service";
import Confetti from 'react-dom-confetti';

// Renk Paleti (Kartlar için rastgele seçilecek)
const CARD_COLORS = [
    { bg: "bg-red-500", border: "border-red-400", shadow: "shadow-red-900/50" },
    { bg: "bg-orange-500", border: "border-orange-400", shadow: "shadow-orange-900/50" },
    { bg: "bg-amber-500", border: "border-amber-400", shadow: "shadow-amber-900/50" },
    { bg: "bg-green-500", border: "border-green-400", shadow: "shadow-green-900/50" },
    { bg: "bg-emerald-500", border: "border-emerald-400", shadow: "shadow-emerald-900/50" },
    { bg: "bg-teal-500", border: "border-teal-400", shadow: "shadow-teal-900/50" },
    { bg: "bg-cyan-500", border: "border-cyan-400", shadow: "shadow-cyan-900/50" },
    { bg: "bg-blue-500", border: "border-blue-400", shadow: "shadow-blue-900/50" },
    { bg: "bg-indigo-500", border: "border-indigo-400", shadow: "shadow-indigo-900/50" },
    { bg: "bg-violet-500", border: "border-violet-400", shadow: "shadow-violet-900/50" },
    { bg: "bg-fuchsia-500", border: "border-fuchsia-400", shadow: "shadow-fuchsia-900/50" },
    { bg: "bg-pink-500", border: "border-pink-400", shadow: "shadow-pink-900/50" },
    { bg: "bg-rose-500", border: "border-rose-400", shadow: "shadow-rose-900/50" },
];

type AnagramCard = {
    id: string;
    original: string;
    scrambled: string;
    isSolved: boolean;
    rotation: number; // Hafif eğiklik için
    colorIndex: number;
};

// Kelime Karıştırma Fonksiyonu
function scrambleWord(word: string): string {
    const arr = word.split('');
    let currentIndex = arr.length, randomIndex;

    // Fisher-Yates Shuffle
    while (currentIndex > 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [arr[currentIndex], arr[randomIndex]] = [arr[randomIndex], arr[currentIndex]];
    }
    
    const scrambled = arr.join('');
    // Eğer şans eseri aynısı olursa tekrar karıştır
    if (scrambled === word && word.length > 1) return scrambleWord(word);
    return scrambled;
}

function AnagramWallComponent() {
    const searchParams = useSearchParams();
    
    const [cards, setCards] = useState<AnagramCard[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAllSolved, setIsAllSolved] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);

    // Veri Çekme
    useEffect(() => {
        const fetchWords = async () => {
            setIsLoading(true);
            const params = {
                courseId: searchParams.get('courseId') || undefined,
                unitId: searchParams.get('unitId') || undefined,
                topicId: searchParams.get('topicId') || undefined,
            };
            const result = await getAnagramWallWords(params);
            
            if (result.words && result.words.length > 0) {
                // Maksimum 15-20 kelime alalım ki ekran çok boğulmasın
                const selectedWords = result.words.slice(0, 18);
                
                const gameCards: AnagramCard[] = selectedWords.map((word, index) => ({
                    id: `word-${index}`,
                    original: word,
                    scrambled: scrambleWord(word.toUpperCase()),
                    isSolved: false,
                    rotation: Math.random() * 6 - 3, // -3 ile +3 derece arası eğiklik
                    colorIndex: index % CARD_COLORS.length
                }));
                
                setCards(gameCards.sort(() => Math.random() - 0.5)); // Kartların yerini de karıştır
            }
            setIsLoading(false);
        };
        fetchWords();
    }, [searchParams]);

    // Tümünün çözülüp çözülmediğini kontrol et
    useEffect(() => {
        if (cards.length > 0 && cards.every(c => c.isSolved)) {
            setIsAllSolved(true);
            setShowConfetti(true);
            playSound('win');
        }
    }, [cards]);

    // Karta Tıklama (Çözme)
    const handleCardClick = (id: string) => {
        const card = cards.find(c => c.id === id);
        if (!card || card.isSolved) return;

        playSound('correct');
        setCards(prev => prev.map(c => 
            c.id === id ? { ...c, isSolved: true } : c
        ));
    };

    // Tümünü Göster (Hoca için kısayol)
    const revealAll = () => {
        setCards(prev => prev.map(c => ({ ...c, isSolved: true })));
    };

    // Yeniden Başlat
    const resetGame = () => {
        setIsAllSolved(false);
        setShowConfetti(false);
        // Sadece durumlarını sıfırla, tekrar karıştırmak istersek scramble da çalıştırabiliriz
        setCards(prev => prev.map(c => ({
            ...c,
            isSolved: false,
            scrambled: scrambleWord(c.original) // Yeniden karıştır
        })).sort(() => Math.random() - 0.5)); // Yerleri de değiştir
    };

    if (isLoading) return <div className="h-screen w-screen flex items-center justify-center bg-slate-900"><Loader2 className="w-16 h-16 animate-spin text-purple-500" /></div>;

    // Kalan Kelime Sayısı
    const solvedCount = cards.filter(c => c.isSolved).length;
    const totalCount = cards.length;

    return (
        <div className="min-h-screen w-screen bg-slate-950 text-white flex flex-col relative overflow-hidden">
            {/* Arkaplan Deseni */}
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-10 pointer-events-none"></div>
            
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100]">
                 <Confetti active={showConfetti} config={{ elementCount: 200, spread: 360 }} />
            </div>

            {/* Üst Bar */}
            <div className="h-20 flex items-center justify-between px-6 z-10 border-b border-white/10 bg-slate-900/80 backdrop-blur-md sticky top-0">
                <div className="flex items-center gap-4">
                    <Link href="/teacher/smartboard">
                        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                            <ArrowLeft className="w-6 h-6" />
                        </Button>
                    </Link>
                    <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
                        ANAGRAM DUVARI
                    </h1>
                </div>

                <div className="flex items-center gap-4">
                    <div className="bg-slate-800 px-4 py-2 rounded-lg border border-white/10 flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-yellow-500" />
                        <span className="font-mono font-bold text-xl">
                            {solvedCount} <span className="text-slate-500">/</span> {totalCount}
                        </span>
                    </div>

                    <Button onClick={resetGame} variant="outline" size="icon" title="Yeniden Karıştır">
                        <RefreshCw className="w-5 h-5" />
                    </Button>
                    <Button onClick={revealAll} variant="outline" size="icon" title="Tümünü Çöz">
                        <Wand2 className="w-5 h-5" />
                    </Button>
                </div>
            </div>

            {/* Kart Alanı (Masonry Grid Benzeri Yapı) */}
            <div className="flex-1 p-6 overflow-y-auto">
                {/* Grid yapısını responsive ve "dolu" görünecek şekilde ayarlıyoruz.
                   auto-fit: Ekran genişliğine göre sığabildiği kadar kart koyar.
                   minmax: Kartlar çok küçülmesin diye minimum genişlik veriyoruz.
                */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 auto-rows-fr">
                    {cards.map((card, idx) => {
                        const style = CARD_COLORS[card.colorIndex];
                        
                        return (
                            <div 
                                key={card.id}
                                onClick={() => handleCardClick(card.id)}
                                className={cn(
                                    "relative h-40 cursor-pointer group perspective-1000 select-none transition-transform duration-300 hover:scale-105 hover:z-20",
                                    card.isSolved ? "z-10" : ""
                                )}
                                style={{ transform: `rotate(${card.isSolved ? 0 : card.rotation}deg)` }}
                            >
                                {/* Kartın İçeriği (3D Flip Efekti Olabilir veya Basit Dönüşüm) */}
                                <div className={cn(
                                    "w-full h-full rounded-2xl shadow-xl border-b-4 flex items-center justify-center p-2 text-center transition-all duration-500",
                                    card.isSolved 
                                        ? "bg-white border-white text-slate-900 shadow-[0_0_30px_rgba(255,255,255,0.4)] transform scale-105" 
                                        : `${style.bg} ${style.border} text-white ${style.shadow} opacity-90 hover:opacity-100`
                                )}>
                                    <span className={cn(
                                        "font-black tracking-widest break-all leading-none drop-shadow-md",
                                        // Kelime uzunluğuna göre font boyutu ayarı
                                        card.original.length > 10 ? "text-2xl" : "text-4xl sm:text-5xl"
                                    )}>
                                        {card.isSolved ? card.original : card.scrambled}
                                    </span>
                                    
                                    {/* Çözülmemişse Üzerinde İpucu İkonu (Hoverda) */}
                                    {!card.isSolved && (
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-20 transition-opacity">
                                            <Eye className="w-12 h-12 text-black" />
                                        </div>
                                    )}

                                    {/* Çözüldüyse Tik İkonu */}
                                    {card.isSolved && (
                                        <div className="absolute -top-3 -right-3 bg-green-500 text-white rounded-full p-1 shadow-lg animate-in zoom-in spin-in-180">
                                            <Trophy className="w-5 h-5" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Tebrik Mesajı (Tümü bitince) */}
            {isAllSolved && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-in fade-in duration-500">
                    <div className="bg-slate-900 p-10 rounded-3xl border border-white/20 text-center shadow-2xl transform scale-110">
                        <Trophy className="w-32 h-32 text-yellow-400 mx-auto mb-6 animate-bounce" />
                        <h2 className="text-5xl font-black text-white mb-4">TEBRİKLER!</h2>
                        <p className="text-slate-300 text-xl mb-8">Tüm kelimeleri buldunuz.</p>
                        <Button onClick={resetGame} size="lg" className="h-16 px-12 text-2xl font-bold bg-purple-600 hover:bg-purple-500 rounded-full">
                            TEKRAR OYNA
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function AnagramWallPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-900"><Loader2 className="w-16 h-16 animate-spin text-purple-500" /></div>}>
            <AnagramWallComponent />
        </Suspense>
    