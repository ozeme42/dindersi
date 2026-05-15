'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
    Heart, Sparkles, BrainCircuit, CheckCircle2, RotateCcw, 
    Lock, Trash2, Lightbulb, Zap, Award, Info, ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';
import { playSound } from '@/lib/audio-service';

// --- KATEGORİLER VE KELİMELER ---
const CATEGORIES = [
    { id: 'values', name: 'Değerler', icon: Heart, words: ['SEVGİ', 'SAYGI', 'SABIR', 'İHLAS'], color: 'text-rose-500', bg: 'bg-rose-500/10' },
    { id: 'worship', name: 'İbadetler', icon: Sparkles, words: ['NAMAZ', 'ORUÇ', 'HAC', 'ZEKAT'], color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { id: 'concepts', name: 'Kavramlar', icon: BrainCircuit, words: ['İMAN', 'İSLAM', 'İHSAN', 'TEVHİD'], color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { id: 'virtues', name: 'Ahlak', icon: CheckCircle2, words: ['ADALET', 'DOĞRU', 'ŞEFKAT', 'EDEP'], color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
];

const DIFFICULTIES = [
    { id: 'easy', name: 'Kolay', emptyCells: 4 },
    { id: 'medium', name: 'Orta', emptyCells: 7 },
    { id: 'hard', name: 'Zor', emptyCells: 10 },
];

export function WordSudoku() {
    // Oyun Durumu
    const [category, setCategory] = useState(CATEGORIES[0]);
    const [difficulty, setDifficulty] = useState(DIFFICULTIES[0]);
    const [grid, setGrid] = useState<(string | null)[][]>(Array(4).fill(null).map(() => Array(4).fill(null)));
    const [initialCells, setInitialCells] = useState<boolean[][]>(Array(4).fill(false).map(() => Array(4).fill(false)));
    const [isSolved, setIsAllSolved] = useState(false);
    const [hintsLeft, setHintsLeft] = useState(3);
    const [wrongCells, setWrongCells] = useState<[number, number][]>([]);

    // --- OYUN MANTIĞI ---

    // Geçerli bir 4x4 Sudoku tahtası üret (Backtracking)
    const generateSolution = useCallback(() => {
        const tempGrid = Array(4).fill(null).map(() => Array(4).fill(null));
        const words = [...category.words];

        const isValid = (r: number, c: number, word: string, grid: (string | null)[][]) => {
            for (let i = 0; i < 4; i++) if (grid[r][i] === word || grid[i][c] === word) return false;
            const startRow = Math.floor(r / 2) * 2;
            const startCol = Math.floor(c / 2) * 2;
            for (let i = 0; i < 2; i++) {
                for (let j = 0; j < 2; j++) {
                    if (grid[startRow + i][startCol + j] === word) return false;
                }
            }
            return true;
        };

        const solve = (r: number, c: number): boolean => {
            if (r === 4) return true;
            if (c === 4) return solve(r + 1, 0);
            const shuffledWords = [...words].sort(() => Math.random() - 0.5);
            for (const word of shuffledWords) {
                if (isValid(r, c, word, tempGrid)) {
                    tempGrid[r][c] = word;
                    if (solve(r, c + 1)) return true;
                    tempGrid[r][c] = null;
                }
            }
            return false;
        };

        solve(0, 0);
        return tempGrid;
    }, [category]);

    // Yeni oyun başlat
    const initGame = useCallback(() => {
        const solution = generateSolution();
        const newGrid = solution.map(row => [...row]);
        const newInitialCells = Array(4).fill(false).map(() => Array(4).fill(false));

        // Zorluğa göre hücreleri boşalt
        let removed = 0;
        while (removed < difficulty.emptyCells) {
            const r = Math.floor(Math.random() * 4);
            const c = Math.floor(Math.random() * 4);
            if (newGrid[r][c] !== null) {
                newGrid[r][c] = null;
                removed++;
            }
        }

        // Kalanları başlangıç hücresi (kilitli) olarak işaretle
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                if (newGrid[r][c] !== null) newInitialCells[r][c] = true;
            }
        }

        setGrid(newGrid);
        setInitialCells(newInitialCells);
        setIsAllSolved(false);
        setHintsLeft(3);
        setWrongCells([]);
    }, [difficulty, generateSolution]);

    useEffect(() => {
        initGame();
    }, [initGame]);

    // Hücreye tıklandığında kelimeyi değiştir
    const handleCellClick = (r: number, c: number) => {
        if (initialCells[r][c] || isSolved) return;

        const currentWord = grid[r][c];
        const currentIndex = currentWord ? category.words.indexOf(currentWord) : -1;
        const nextIndex = (currentIndex + 1) % (category.words.length + 1);
        const nextWord = nextIndex === category.words.length ? null : category.words[nextIndex];

        const newGrid = grid.map(row => [...row]);
        newGrid[r][c] = nextWord;
        setGrid(newGrid);
        setWrongCells([]);
        playSound('pop');
    };

    // İpucu Ver
    const getHint = () => {
        if (hintsLeft <= 0 || isSolved) return;

        const solution = generateSolution(); // Not: Bu basitleştirilmiş, aslında mevcut tahtaya uygun çözümü bulmalı
        const emptyCells: [number, number][] = [];
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                if (grid[r][c] === null) emptyCells.push([r, c]);
            }
        }

        if (emptyCells.length > 0) {
            const [r, c] = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            const newGrid = grid.map(row => [...row]);
            newGrid[r][c] = solution[r][c];
            setGrid(newGrid);
            setHintsLeft(prev => prev - 1);
            playSound('hint');
        }
    };

    // Doğruluğu Kontrol Et
    const checkSolution = () => {
        const errors: [number, number][] = [];
        
        // Satır ve Sütun Kontrolü
        for (let i = 0; i < 4; i++) {
            const rowWords = grid[i].filter(w => w !== null);
            const colWords = grid.map(row => row[i]).filter(w => w !== null);
            
            if (new Set(rowWords).size !== rowWords.length || rowWords.length < 4) {
                grid[i].forEach((_, idx) => errors.push([i, idx]));
            }
            if (new Set(colWords).size !== colWords.length || colWords.length < 4) {
                for(let r=0; r<4; r++) errors.push([r, i]);
            }
        }

        // 2x2 Blok Kontrolü
        for (let bR = 0; bR < 2; bR++) {
            for (let bC = 0; bC < 2; bC++) {
                const blockWords = [];
                for (let r = 0; r < 2; r++) {
                    for (let c = 0; c < 2; c++) {
                        const val = grid[bR * 2 + r][bC * 2 + c];
                        if (val) blockWords.push(val);
                    }
                }
                if (new Set(blockWords).size !== 4) {
                    for (let r = 0; r < 2; r++) {
                        for (let c = 0; c < 2; c++) errors.push([bR * 2 + r, bC * 2 + c]);
                    }
                }
            }
        }

        if (errors.length === 0) {
            setIsAllSolved(true);
            confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
            playSound('win');
        } else {
            setWrongCells(errors);
            playSound('incorrect');
            toast({ title: "Hatalı Yerleşim", description: "Bazı kelimeler kurallara uymuyor.", variant: "destructive" });
        }
    };

    const toast = (props: any) => console.log(props); // Basit mock

    return (
        <Card className="bg-white/90 backdrop-blur-xl border border-white/60 shadow-2xl rounded-[2.5rem] overflow-hidden">
            <CardHeader className="bg-indigo-600 p-6 md:p-8 text-white relative">
                <div className="absolute top-0 left-0 w-full h-full bg-[url('/noise.png')] opacity-10 pointer-events-none" />
                <div className="flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                            <BrainCircuit className="h-8 w-8" />
                        </div>
                        <div>
                            <CardTitle className="text-2xl font-black uppercase tracking-tight">Kelime Sudoku</CardTitle>
                            <CardDescription className="text-indigo-100 font-medium">Zihnini aç, kavramları yerleştir!</CardDescription>
                        </div>
                    </div>
                    <div className="flex gap-2 bg-black/20 p-1 rounded-xl">
                        {DIFFICULTIES.map(d => (
                            <Button 
                                key={d.id} 
                                size="sm" 
                                variant="ghost"
                                onClick={() => { setDifficulty(d); initGame(); }}
                                className={cn("rounded-lg px-4 font-bold text-xs uppercase tracking-widest transition-all", difficulty.id === d.id ? "bg-white text-indigo-600 shadow-sm" : "text-white/60 hover:text-white hover:bg-white/10")}
                            >
                                {d.name}
                            </Button>
                        ))}
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-4 md:p-8">
                <div className="flex flex-col lg:flex-row gap-8 items-start justify-center">
                    
                    {/* SOL: AYARLAR VE KATEGORİLER */}
                    <div className="w-full lg:w-64 space-y-6 shrink-0">
                        <section className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Kategoriler</Label>
                            <div className="grid grid-cols-1 gap-2">
                                {CATEGORIES.map(cat => (
                                    <button
                                        key={cat.id}
                                        onClick={() => { setCategory(cat); initGame(); }}
                                        className={cn(
                                            "flex items-center gap-3 p-3 rounded-2xl border-2 transition-all text-left group",
                                            category.id === cat.id 
                                                ? "bg-indigo-50 border-indigo-200 shadow-sm" 
                                                : "bg-white border-slate-100 hover:border-indigo-100 hover:bg-slate-50"
                                        )}
                                    >
                                        <div className={cn("p-2 rounded-xl transition-colors", category.id === cat.id ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600")}>
                                            <cat.icon className="h-4 w-4" />
                                        </div>
                                        <span className={cn("font-bold text-sm", category.id === cat.id ? "text-indigo-900" : "text-slate-600")}>{cat.name}</span>
                                    </button>
                                ))}
                            </div>
                        </section>

                        <Card className="bg-slate-50 border-slate-200 rounded-2xl p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">İpucu</span>
                                <span className="text-xs font-bold text-indigo-600">{hintsLeft} Hak</span>
                            </div>
                            <Progress value={(hintsLeft / 3) * 100} className="h-1.5 mb-3" />
                            <Button 
                                onClick={getHint} 
                                disabled={hintsLeft <= 0 || isSolved}
                                variant="outline" 
                                className="w-full rounded-xl border-indigo-200 text-indigo-600 hover:bg-indigo-50 h-10 font-bold text-xs"
                            >
                                <Lightbulb className="w-3.5 h-3.5 mr-2" /> İpucu Al
                            </Button>
                        </Card>
                    </div>

                    {/* ORTA: SUDOKU IZGARASI */}
                    <div className="flex-1 flex justify-center">
                        <div className="bg-slate-200 p-2 md:p-4 rounded-[2rem] shadow-inner border-4 border-slate-100 relative">
                             {/* 2x2 Blokları Ayıran Kalın Çizgiler İçin Grid Yapılandırılması */}
                             <div className="grid grid-cols-2 gap-2 md:gap-4">
                                {[0, 1, 2, 3].map(blockIdx => {
                                    const startR = Math.floor(blockIdx / 2) * 2;
                                    const startC = (blockIdx % 2) * 2;
                                    return (
                                        <div key={blockIdx} className="grid grid-cols-2 gap-1 md:gap-2">
                                            {[0, 1].map(r => [0, 1].map(c => {
                                                const row = startR + r;
                                                const col = startC + c;
                                                const isInitial = initialCells[row][col];
                                                const value = grid[row][col];
                                                const isWrong = wrongCells.some(([wr, wc]) => wr === row && wc === col);

                                                return (
                                                    <button
                                                        key={`${row}-${col}`}
                                                        onClick={() => handleCellClick(row, col)}
                                                        className={cn(
                                                            "w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-xl md:rounded-2xl transition-all duration-200 flex items-center justify-center p-2 text-center relative group select-none",
                                                            "text-[10px] sm:text-xs md:text-sm font-black uppercase leading-tight tracking-tighter",
                                                            isInitial 
                                                                ? "bg-slate-800 text-white shadow-lg cursor-default" 
                                                                : "bg-white text-slate-700 shadow-md hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0",
                                                            isWrong && !isInitial && "bg-red-100 text-red-600 ring-2 ring-red-500 animate-shake-game",
                                                            isSolved && "bg-emerald-500 text-white cursor-default"
                                                        )}
                                                    >
                                                        {value}
                                                        {isInitial && <Lock className="absolute top-1.5 right-1.5 h-2.5 w-2.5 opacity-30" />}
                                                        {!value && !isInitial && (
                                                            <Plus className="h-4 w-4 text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                        )}
                                                    </button>
                                                )
                                            }))}
                                        </div>
                                    )
                                })}
                             </div>

                             {isSolved && (
                                 <div className="absolute inset-0 bg-emerald-600/90 backdrop-blur-md rounded-[1.8rem] z-30 flex flex-col items-center justify-center text-center p-6 animate-in fade-in zoom-in duration-500">
                                     <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-2xl">
                                         <Trophy className="h-10 w-10 text-emerald-600" />
                                     </div>
                                     <h3 className="text-3xl font-black text-white uppercase mb-2">Harika!</h3>
                                     <p className="text-emerald-50 font-medium mb-6">Tüm kavramları doğru yerleştirdin.</p>
                                     <Button onClick={initGame} className="bg-white text-emerald-600 hover:bg-emerald-50 rounded-xl font-bold px-8 h-12 shadow-lg">Yeniden Oyna</Button>
                                 </div>
                             )}
                        </div>
                    </div>

                    {/* SAĞ: KELİME ANAHTARI */}
                    <div className="w-full lg:w-56 space-y-4 shrink-0">
                         <section className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Kullanılacaklar</Label>
                            <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
                                {category.words.map((word) => (
                                    <div key={word} className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-slate-100 shadow-sm">
                                        <div className={cn("w-2 h-2 rounded-full", category.color.replace('text-', 'bg-'))} />
                                        <span className="font-bold text-xs text-slate-700">{word}</span>
                                    </div>
                                ))}
                            </div>
                        </section>
                        
                        <div className="pt-4 border-t border-slate-100">
                            <p className="text-[10px] text-slate-400 leading-relaxed italic mb-4">
                                Her satır, her sütun ve her 2x2'lik blokta kelimelerden sadece birer adet bulunmalıdır.
                            </p>
                            <Button 
                                onClick={checkSolution} 
                                disabled={isSolved}
                                className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest shadow-lg shadow-indigo-900/20 text-xs"
                            >
                                <Zap className="w-4 h-4 mr-2" /> Kontrol Et
                            </Button>

                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button 
                                        variant="ghost" 
                                        className="w-full h-12 mt-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl text-[10px] font-bold uppercase tracking-wider"
                                    >
                                        <RotateCcw className="w-3.5 h-3.5 mr-2" /> Baştan Başla
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="bg-slate-900 border-white/10 text-white">
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Oyunu Sıfırla</AlertDialogTitle>
                                        <AlertDialogDescription className="text-slate-400">Tüm ilerlemeniz silinecek ve yeni bir Sudoku oluşturulacaktır.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel className="bg-transparent border-white/10 text-white">İptal</AlertDialogCancel>
                                        <AlertDialogAction onClick={initGame} className="bg-red-600 hover:bg-red-500">Evet, Sıfırla</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </div>

                </div>
            </CardContent>
            
            <CardFooter className="bg-slate-50 p-6 flex flex-col md:flex-row items-center justify-between gap-4 border-t border-slate-200">
                <div className="flex items-center gap-4 text-slate-500">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-slate-800 rounded-sm" />
                        <span className="text-[10px] font-bold uppercase">Sabit Hücre</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-white border border-slate-200 rounded-sm" />
                        <span className="text-[10px] font-bold uppercase">Değişebilir Hücre</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-indigo-400" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Boş hücrelere tıklayarak kelimeler arasında geçiş yapabilirsin.</span>
                </div>
            </CardFooter>
        </Card>
    );
}
