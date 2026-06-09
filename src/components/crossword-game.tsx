'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Maximize, Minimize, CheckCircle2, Circle, Eye, Sparkles } from 'lucide-react';
import { cn } from "@/lib/utils";
import confetti from 'canvas-confetti';

type Word = {
    id: number;
    answer: string;
    clue: string;
    direction: 'across' | 'down';
    row: number;
    col: number;
};

const WORDS: Word[] = [
    { id: 1, answer: 'İMAN', clue: "Allah'ın varlığına ve birliğine kalpten inanmak.", direction: 'across', row: 2, col: 2 },
    { id: 1, answer: 'İSLAM', clue: "Allah tarafından gönderilen son ilahi din.", direction: 'down', row: 2, col: 2 },
    { id: 2, answer: 'AYET', clue: "Kur'an-ı Kerim'in her bir cümlesi.", direction: 'down', row: 2, col: 4 },
    { id: 3, answer: 'NEBİ', clue: "Kendisine yeni bir kitap verilmeyen peygamber.", direction: 'down', row: 2, col: 5 },
    { id: 4, answer: 'MELEK', clue: "Nurdan yaratılmış, gözle görülmeyen varlıklar.", direction: 'across', row: 6, col: 2 },
    { id: 5, answer: 'KİTAP', clue: "Allah'ın peygamberlere gönderdiği ilahi mesajların tamamı.", direction: 'down', row: 6, col: 6 },
    { id: 6, answer: 'TÖVBE', clue: "İşlenen bir günahtan pişmanlık duyup Allah'tan af dilemek.", direction: 'down', row: 6, col: 13 },
    { id: 7, answer: 'CENNET', clue: "İyilerin ahirette ödüllendirileceği ebedi mutluluk yurdu.", direction: 'down', row: 9, col: 7 },
    { id: 8, answer: 'PEYGAMBER', clue: "Allah'ın mesajlarını insanlara iletmekle görevli elçi.", direction: 'across', row: 10, col: 6 },
    { id: 9, answer: 'RAMAZAN', clue: "Müslümanların oruç tuttuğu mübarek ay.", direction: 'down', row: 10, col: 14 }
];

const GRID_ROWS = 18;
const GRID_COLS = 17;

type CellData = {
    letter: string;
    number?: number;
    words: number[];
};

export function CrosswordGame() {
    const [revealedWords, setRevealedWords] = useState<Set<number>>(new Set());
    const [isFullscreen, setIsFullscreen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

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

    // Grid'i hazırla
    const grid = useMemo(() => {
        const newGrid: (CellData | null)[][] = Array(GRID_ROWS).fill(null).map(() => Array(GRID_COLS).fill(null));

        WORDS.forEach((word, wordIndex) => {
            for (let i = 0; i < word.answer.length; i++) {
                const r = word.direction === 'across' ? word.row : word.row + i;
                const c = word.direction === 'across' ? word.col + i : word.col;
                
                if (!newGrid[r][c]) {
                    newGrid[r][c] = { letter: word.answer[i], words: [wordIndex] };
                } else {
                    newGrid[r][c]!.words.push(wordIndex);
                }
                
                // Numarayı sadece başlangıç hücresine koy (Aynı hücreden başlayan iki kelime varsa numara ezilmez çünkü id aynı)
                if (i === 0) {
                    newGrid[r][c]!.number = word.id;
                }
            }
        });
        return newGrid;
    }, []);

    const toggleWord = (wordIndex: number) => {
        setRevealedWords(prev => {
            const next = new Set(prev);
            if (next.has(wordIndex)) {
                // If it's revealed, do we want to hide it? Maybe not for classroom.
                // next.delete(wordIndex);
            } else {
                next.add(wordIndex);
                playSound('pop');
                
                // Eğer tüm kelimeler açıldıysa tebrik et
                if (next.size === WORDS.length) {
                    setTimeout(() => {
                        playSound('win');
                        confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 } });
                    }, 500);
                }
            }
            return next;
        });
    };

    const revealAll = () => {
        const allIndices = new Set(WORDS.map((_, i) => i));
        setRevealedWords(allIndices);
        playSound('win');
        confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 } });
    };

    const resetGame = () => {
        setRevealedWords(new Set());
    };

    const handleCellClick = (cell: CellData | null) => {
        if (!cell) return;
        const unrevealed = cell.words.filter(wIdx => !revealedWords.has(wIdx));
        if (unrevealed.length > 0) {
            toggleWord(unrevealed[0]);
        }
    };

    const acrossWords = WORDS.map((w, i) => ({ ...w, index: i })).filter(w => w.direction === 'across');
    const downWords = WORDS.map((w, i) => ({ ...w, index: i })).filter(w => w.direction === 'down');

    const renderClues = (title: string, wordsList: (Word & { index: number })[]) => (
        <div className="space-y-3 flex-1 min-w-[250px]">
            <h3 className={cn("font-black uppercase tracking-widest text-sm mb-4 border-b pb-2", isFullscreen ? "text-indigo-400 border-slate-700" : "text-indigo-600 border-slate-200")}>
                {title}
            </h3>
            <div className="space-y-2">
                {wordsList.map(w => {
                    const isRevealed = revealedWords.has(w.index);
                    return (
                        <button 
                            key={w.index}
                            onClick={() => toggleWord(w.index)}
                            className={cn(
                                "w-full text-left p-3 rounded-xl transition-all duration-300 flex gap-3 group items-start",
                                isRevealed 
                                    ? (isFullscreen ? "bg-emerald-900/40 border border-emerald-500/30" : "bg-emerald-50 border border-emerald-200") 
                                    : (isFullscreen ? "bg-slate-800 border border-slate-700 hover:bg-slate-700" : "bg-white border border-slate-200 hover:border-indigo-300 shadow-sm")
                            )}
                        >
                            <div className="mt-0.5 flex-shrink-0">
                                {isRevealed 
                                    ? <CheckCircle2 className={cn("w-5 h-5", isFullscreen ? "text-emerald-400" : "text-emerald-500")} /> 
                                    : <Circle className={cn("w-5 h-5", isFullscreen ? "text-slate-500" : "text-slate-300 group-hover:text-indigo-400")} />
                                }
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={cn("font-black text-sm", isRevealed ? (isFullscreen ? "text-emerald-400" : "text-emerald-600") : (isFullscreen ? "text-slate-300" : "text-slate-700"))}>
                                        {w.id}. {isRevealed ? w.answer : "__________"}
                                    </span>
                                </div>
                                <p className={cn("text-xs font-medium leading-relaxed", isRevealed ? (isFullscreen ? "text-emerald-200/70" : "text-emerald-700/70") : (isFullscreen ? "text-slate-400" : "text-slate-500"))}>
                                    {w.clue}
                                </p>
                            </div>
                        </button>
                    )
                })}
            </div>
        </div>
    );

    return (
        <div 
            ref={containerRef} 
            className={cn(
                "animate-in fade-in duration-700 transition-all font-sans",
                isFullscreen ? "fixed inset-0 z-[99999] p-4 md:p-8 flex items-center justify-center bg-slate-900 overflow-y-auto" : "w-full mx-auto"
            )}
        >
            <Card className={cn(
                "border shadow-2xl rounded-[2rem] flex flex-col relative w-full max-w-7xl mx-auto transition-colors duration-500 overflow-hidden",
                isFullscreen ? "min-h-full bg-slate-800 border-slate-700" : "bg-white border-slate-200"
            )}>
                
                {/* HEADER */}
                <CardHeader className={cn(
                    "p-4 md:p-6 relative flex-shrink-0 z-20 border-b transition-colors duration-500",
                    isFullscreen ? "bg-slate-900/80 border-slate-700 text-white" : "bg-slate-100 border-slate-200"
                )}>
                    <div className="flex justify-between items-center relative z-10">
                        <div className="flex items-center gap-4">
                            <div className={cn(
                                "w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner transition-colors",
                                isFullscreen ? "bg-indigo-900/50 text-indigo-400" : "bg-indigo-100 text-indigo-600"
                            )}>
                                <Sparkles className="h-6 w-6" />
                            </div>
                            <div>
                                <CardTitle className={cn("text-2xl font-black uppercase tracking-tight transition-colors", isFullscreen ? "text-white" : "text-slate-800")}>
                                    Çengel Bulmaca
                                </CardTitle>
                                <CardDescription className={cn(isFullscreen ? "text-slate-400" : "text-slate-500")}>
                                    Soruları okuyup cevapları bularak kareleri tamamlayın.
                                </CardDescription>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" onClick={toggleFullscreen} className={cn("rounded-xl transition-colors", isFullscreen ? "text-slate-300 hover:text-white hover:bg-slate-800" : "text-slate-400 hover:text-slate-700 hover:bg-slate-100")}>
                                {isFullscreen ? <Minimize className="h-6 w-6" /> : <Maximize className="h-6 w-6" />}
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                {/* CONTENT */}
                <CardContent className={cn(
                    "flex-1 flex flex-col xl:flex-row gap-8 p-4 md:p-8",
                    isFullscreen ? "bg-slate-800" : "bg-slate-50/50"
                )}>
                    
                    {/* GRID BÖLÜMÜ */}
                    <div className="flex-1 flex items-center justify-center overflow-x-auto p-4">
                        <div 
                            className={cn("grid gap-1 p-4 rounded-3xl shadow-inner border max-w-full", isFullscreen ? "bg-slate-900/50 border-slate-700" : "bg-slate-200/50 border-slate-300")}
                            style={{ 
                                gridTemplateColumns: `repeat(${GRID_COLS}, minmax(1.5rem, 3rem))`,
                                gridTemplateRows: `repeat(${GRID_ROWS}, minmax(1.5rem, 3rem))`
                            }}
                        >
                            {grid.flatMap((row, r) => row.map((cell, c) => (
                                <button 
                                    key={`${r}-${c}`} 
                                    onClick={() => handleCellClick(cell)}
                                    disabled={!cell}
                                    className={cn(
                                        "aspect-square relative rounded-md transition-all duration-300 flex items-center justify-center overflow-hidden cursor-pointer",
                                        cell 
                                            ? (isFullscreen ? "bg-slate-700 border border-slate-600 hover:bg-slate-600 shadow-sm" : "bg-white border border-slate-300 hover:border-indigo-400 hover:shadow-md shadow-sm") 
                                            : "bg-transparent border-transparent opacity-0 pointer-events-none"
                                    )}
                                >
                                    {cell && (
                                        <>
                                            {cell.number && (
                                                <span className={cn("absolute top-0.5 left-1 font-black", isFullscreen ? "text-slate-400" : "text-slate-500")} style={{ fontSize: '0.65rem' }}>
                                                    {cell.number}
                                                </span>
                                            )}
                                            {cell.words.some(wIdx => revealedWords.has(wIdx)) && (
                                                <span className={cn(
                                                    "font-black text-xl md:text-2xl animate-in fade-in zoom-in spin-in-1 duration-300",
                                                    isFullscreen ? "text-white" : "text-slate-800"
                                                )}>
                                                    {cell.letter}
                                                </span>
                                            )}
                                        </>
                                    )}
                                </button>
                            )))}
                        </div>
                    </div>

                    {/* İPUÇLARI BÖLÜMÜ */}
                    <div className={cn(
                        "w-full xl:w-[400px] flex flex-col gap-6 p-6 rounded-3xl border flex-shrink-0 max-h-[80vh] overflow-y-auto custom-scrollbar",
                        isFullscreen ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200 shadow-sm"
                    )}>
                        {renderClues("Soldan Sağa", acrossWords)}
                        {renderClues("Yukarıdan Aşağıya", downWords)}
                        
                        <div className="pt-4 border-t border-slate-200 flex flex-col gap-3 mt-auto">
                            <Button 
                                onClick={revealAll}
                                className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-[0_5px_15px_rgba(79,70,229,0.3)] transition-all"
                            >
                                <Eye className="w-5 h-5 mr-2" /> TÜMÜNÜ GÖSTER
                            </Button>
                            
                            {revealedWords.size > 0 && (
                                <Button 
                                    onClick={resetGame}
                                    variant="outline"
                                    className={cn("w-full h-12 font-bold rounded-xl transition-all", isFullscreen ? "border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white" : "border-slate-200 text-slate-600 hover:bg-slate-50")}
                                >
                                    SIFIRLA
                                </Button>
                            )}
                        </div>
                    </div>

                </CardContent>
            </Card>
        </div>
    );
}

function playSound(type: 'pop' | 'win') {
    if (typeof window === 'undefined') return;
    try {
        const audio = new Audio();
        if (type === 'pop') { audio.src = "https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3"; audio.volume = 0.5; }
        if (type === 'win') { audio.src = "https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3"; audio.volume = 0.5; }
        audio.play().catch(() => {});
    } catch (e) {
        console.warn("Ses çalınamadı:", e);
    }
}
