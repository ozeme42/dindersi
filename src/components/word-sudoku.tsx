
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
    Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    Heart, Sparkles, BrainCircuit, Scale, Trophy, Lightbulb, 
    RotateCcw, Trash2, Settings, CheckCircle2, XCircle, Info, Star
} from 'lucide-react';
import { cn } from '@/lib/utils';
import canvasConfetti from 'canvas-confetti';

// --- KATEGORİLER VE KELİME GRUPLARI ---
const CATEGORIES = [
    { id: 'degerler', name: 'Değerler', icon: Heart, words: ["SEVGİ", "SAYGI", "SABIR", "İHLAS"], color: "text-rose-500", bg: "bg-rose-50" },
    { id: 'ibadetler', name: 'İbadetler', icon: Sparkles, words: ["NAMAZ", "ORUÇ", "HAC", "ZEKAT"], color: "text-amber-500", bg: "bg-amber-50" },
    { id: 'kavramlar', name: 'Kavramlar', icon: BrainCircuit, words: ["İMAN", "İSLAM", "İHSAN", "TEVHİD"], color: "text-indigo-500", bg: "bg-indigo-50" },
    { id: 'ahlak', name: 'Ahlak', icon: Scale, words: ["ADALET", "DOĞRU", "ŞEFKAT", "EDEP"], color: "text-emerald-500", bg: "bg-emerald-50" },
];

const LEVELS = [
    { id: 'easy', name: 'Kolay', hints: 8 },
    { id: 'medium', name: 'Orta', hints: 6 },
    { id: 'hard', name: 'Zor', hints: 4 },
];

type Cell = {
    value: string | null;
    isFixed: boolean;
    isError?: boolean;
};

export function WordSudoku() {
    const [category, setCategory] = useState(CATEGORIES[0]);
    const [level, setLevel] = useState(LEVELS[0]);
    const [grid, setGrid] = useState<Cell[][]>([]);
    const [solution, setSolution] = useState<string[][]>([]);
    const [isSolved, setIsSolved] = useState(false);
    const [hintsLeft, setHintsLeft] = useState(3);

    // --- SUDOKU MANTIĞI ---
    const generatePuzzle = useCallback(() => {
        // 4x4 Temel Geçerli Sudoku Şablonu (Sayılar 0-3 arası)
        const base = [
            [0, 1, 2, 3],
            [2, 3, 0, 1],
            [1, 0, 3, 2],
            [3, 2, 1, 0]
        ];

        // Kelimeleri karıştır
        const shuffledWords = [...category.words].sort(() => Math.random() - 0.5);
        
        // Şablonu kelimelere dök
        const solved = base.map(row => row.map(index => shuffledWords[index]));
        setSolution(solved);

        // Seviyeye göre hücreleri gizle
        const newGrid: Cell[][] = solved.map(row => row.map(val => ({ value: val, isFixed: true })));
        const cellsToRemove = 16 - (level.id === 'easy' ? 8 : level.id === 'medium' ? 6 : 4);
        
        let removed = 0;
        while (removed < cellsToRemove) {
            const r = Math.floor(Math.random() * 4);
            const c = Math.floor(Math.random() * 4);
            if (newGrid[r][c].isFixed) {
                newGrid[r][c].value = null;
                newGrid[r][c].isFixed = false;
                removed++;
            }
        }

        setGrid(newGrid);
        setIsSolved(false);
        setHintsLeft(3);
    }, [category, level]);

    useEffect(() => {
        generatePuzzle();
    }, [generatePuzzle]);

    const handleCellClick = (r: number, c: number) => {
        if (grid[r][c].isFixed || isSolved) return;

        setGrid(prev => {
            const newGrid = prev.map(row => [...row]);
            const currentVal = newGrid[r][c].value;
            const currentIndex = currentVal ? category.words.indexOf(currentVal) : -1;
            const nextIndex = (currentIndex + 1) % (category.words.length + 1);
            
            newGrid[r][c].value = nextIndex === category.words.length ? null : category.words[nextIndex];
            newGrid[r][c].isError = false;
            return newGrid;
        });
    };

    const checkSolution = () => {
        let hasError = false;
        const newGrid = grid.map((row, r) => row.map((cell, c) => {
            if (cell.value && cell.value !== solution[r][c]) {
                hasError = true;
                return { ...cell, isError: true };
            }
            return { ...cell, isError: false };
        }));

        setGrid(newGrid);

        const isFull = newGrid.every(row => row.every(cell => cell.value !== null));
        if (isFull && !hasError) {
            setIsSolved(true);
            canvasConfetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#6366f1', '#a855f7', '#ec4899']
            });
        } else if (hasError) {
            // Hata varsa ses çalabiliriz (opsiyonel)
        }
    };

    const getHint = () => {
        if (hintsLeft <= 0 || isSolved) return;
        
        const emptyCells: {r: number, c: number}[] = [];
        grid.forEach((row, r) => row.forEach((cell, c) => {
            if (!cell.value) emptyCells.push({r, c});
        }));

        if (emptyCells.length > 0) {
            const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            setGrid(prev => {
                const n = prev.map(row => [...row]);
                n[randomCell.r][randomCell.c].value = solution[randomCell.r][randomCell.c];
                n[randomCell.r][randomCell.c].isFixed = true; // İpucu sabitlensin
                return n;
            });
            setHintsLeft(prev => prev - 1);
        }
    };

    return (
        <Card className="bg-white/80 backdrop-blur-xl border border-white/60 shadow-2xl rounded-[3rem] overflow-hidden transition-all duration-500">
            <CardHeader className="bg-indigo-600 p-6 md:p-10 text-white relative">
                <div className="absolute top-0 left-0 w-full h-full bg-[url('/noise.png')] opacity-10 pointer-events-none" />
                <div className="flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
                    <div className="space-y-2 text-center md:text-left">
                        <Badge className="bg-indigo-400/30 text-white border-white/20 px-3 py-1 mb-2 uppercase tracking-widest text-[10px] font-black">Zeka Köşesi</Badge>
                        <CardTitle className="text-4xl md:text-5xl font-black tracking-tighter uppercase italic">Kelime Sudoku</CardTitle>
                        <CardDescription className="text-indigo-100 font-medium text-base">Satır, sütun ve 2x2 bloklarda kelimeleri çakışmadan dizin.</CardDescription>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="bg-white/10 backdrop-blur-md p-2 rounded-2xl border border-white/20 flex gap-1">
                            {LEVELS.map(l => (
                                <Button 
                                    key={l.id} 
                                    onClick={() => setLevel(l)} 
                                    variant={level.id === l.id ? 'default' : 'ghost'}
                                    className={cn(
                                        "rounded-xl h-10 px-4 font-bold text-xs uppercase transition-all",
                                        level.id === l.id ? "bg-white text-indigo-600 shadow-lg" : "text-white/60 hover:text-white hover:bg-white/10"
                                    )}
                                >
                                    {l.name}
                                </Button>
                            ))}
                        </div>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-6 md:p-10">
                <div className="flex flex-col lg:flex-row gap-10">
                    {/* SOL: Kontroller */}
                    <div className="w-full lg:w-72 space-y-6">
                        <section className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Kelime Grubu</Label>
                            <div className="grid grid-cols-1 gap-2">
                                {CATEGORIES.map(cat => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setCategory(cat)}
                                        className={cn(
                                            "flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left group",
                                            category.id === cat.id 
                                                ? "bg-white border-indigo-500 shadow-xl shadow-indigo-500/10" 
                                                : "bg-slate-50 border-transparent hover:border-slate-200"
                                        )}
                                    >
                                        <div className={cn("p-2.5 rounded-xl transition-colors", category.id === cat.id ? "bg-indigo-500 text-white" : "bg-white text-slate-400 group-hover:text-indigo-500")}>
                                            <cat.icon className="w-5 h-5" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className={cn("font-bold text-sm", category.id === cat.id ? "text-slate-900" : "text-slate-500")}>{cat.name}</span>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{cat.words.slice(0, 2).join(', ')}...</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </section>

                        <div className="pt-4 space-y-3 border-t border-slate-100">
                             <Button 
                                onClick={getHint} 
                                disabled={hintsLeft <= 0 || isSolved}
                                variant="outline" 
                                className="w-full h-14 rounded-2xl border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 font-bold gap-3"
                            >
                                <Lightbulb className={cn("w-5 h-5", hintsLeft > 0 ? "fill-amber-400" : "")} />
                                İpucu Al ({hintsLeft})
                            </Button>

                            <Button 
                                onClick={generatePuzzle} 
                                variant="ghost" 
                                className="w-full h-12 rounded-2xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 font-bold text-xs gap-2"
                            >
                                <RotateCcw className="w-4 h-4" /> Yeni Oyun Karıştır
                            </Button>
                        </div>
                    </div>

                    {/* SAĞ: Sudoku Izgarası */}
                    <div className="flex-1 flex flex-col items-center justify-center">
                        <div className="bg-slate-900 p-2 md:p-4 rounded-[2.5rem] shadow-2xl relative">
                            {/* Ana Izgara */}
                            <div className="grid grid-cols-4 gap-1 md:gap-2">
                                {grid.map((row, rIndex) => (
                                    row.map((cell, cIndex) => (
                                        <div 
                                            key={`${rIndex}-${cIndex}`}
                                            onClick={() => handleCellClick(rIndex, cIndex)}
                                            className={cn(
                                                "relative flex items-center justify-center border-2 transition-all duration-300",
                                                "w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 rounded-xl md:rounded-2xl",
                                                "text-[9px] sm:text-[10px] md:text-xs font-black text-center select-none uppercase tracking-tighter",
                                                cell.isFixed ? "bg-slate-800 text-slate-500 border-white/5" : "bg-white cursor-pointer hover:bg-indigo-50 border-white/10",
                                                // Blok Sınırları (2x2)
                                                cIndex === 1 && "mr-2 md:mr-4",
                                                rIndex === 1 && "mb-2 md:mb-4",
                                                // Durumlar
                                                cell.isError && "bg-red-100 border-red-500 text-red-600 animate-shake-game",
                                                isSolved && !cell.isFixed && "text-indigo-600 font-bold"
                                            )}
                                        >
                                            <div className="px-1 break-words leading-tight">
                                                {cell.value || ""}
                                            </div>
                                            {cell.isFixed && !isSolved && (
                                                <div className="absolute top-1.5 right-2 opacity-20"><Lock className="w-2.5 h-2.5" /></div>
                                            )}
                                        </div>
                                    ))
                                ))}
                            </div>
                        </div>

                        {/* Alt Bilgi */}
                        <div className="mt-8 flex items-center gap-6">
                            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
                                <Info className="w-4 h-4" />
                                <span>Değiştirmek için hücrelere tıklayın.</span>
                            </div>
                            <Button 
                                onClick={checkSolution}
                                disabled={isSolved}
                                className="h-14 px-10 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg shadow-xl shadow-indigo-600/20"
                            >
                                <CheckCircle2 className="mr-2 h-6 w-6" /> KONTROL ET
                            </Button>
                        </div>
                    </div>
                </div>
            </CardContent>

            {/* BAŞARI MESAJI */}
            {isSolved && (
                <div className="bg-emerald-500 p-4 text-center text-white font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3 animate-in slide-in-from-bottom-full duration-500">
                    <Trophy className="w-6 h-6" /> TEBRİKLER! BULMACAYI ÇÖZDÜNÜZ <Trophy className="w-6 h-6" />
                </div>
            )}
        </Card>
    );
}
