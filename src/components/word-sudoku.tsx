'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
    Heart, Sparkles, BrainCircuit, CheckCircle2, Lock, 
    Trash2, Plus, RotateCcw, HelpCircle, Trophy, Scale
} from 'lucide-react';
import { cn } from "@/lib/utils";
import confetti from 'canvas-confetti';

// --- SABİTLER ---

const CATEGORIES = [
    { 
        id: 'degerler', 
        name: 'Değerler', 
        icon: <Heart className="h-4 w-4" />, 
        words: ['SAYGI', 'SEVGİ', 'SABIR', 'İHLAS'],
        color: 'text-rose-500',
        bg: 'bg-rose-500/10'
    },
    { 
        id: 'ibadetler', 
        name: 'İbadetler', 
        icon: <Sparkles className="h-4 w-4" />, 
        words: ['NAMAZ', 'ORUÇ', 'HAC', 'ZEKAT'],
        color: 'text-amber-500',
        bg: 'bg-amber-500/10'
    },
    { 
        id: 'kavramlar', 
        name: 'Kavramlar', 
        icon: <BrainCircuit className="h-4 w-4" />, 
        words: ['İMAN', 'İSLAM', 'İHSAN', 'TEVHİD'],
        color: 'text-indigo-500',
        bg: 'bg-indigo-500/10'
    },
    { 
        id: 'ahlak', 
        name: 'Ahlak', 
        icon: <Scale className="h-4 w-4" />, 
        words: ['ADALET', 'DOĞRU', 'ŞEFKAT', 'EDEP'],
        color: 'text-emerald-500',
        bg: 'bg-emerald-500/10'
    }
];

const DIFFICULTY_LEVELS = [
    { id: 'easy', name: 'Kolay', emptyCells: 4 },
    { id: 'medium', name: 'Orta', emptyCells: 7 },
    { id: 'hard', name: 'Zor', emptyCells: 10 }
];

// --- SUDOKU GENERATOR (4x4) ---

function generateSolvedGrid() {
    const grid = Array(4).fill(null).map(() => Array(4).fill(0));
    
    const isValid = (grid: number[][], r: number, c: number, num: number) => {
        for (let x = 0; x < 4; x++) if (grid[r][x] === num || grid[x][c] === num) return false;
        const startRow = r - (r % 2), startCol = c - (c % 2);
        for (let i = 0; i < 2; i++)
            for (let j = 0; j < 2; j++)
                if (grid[i + startRow][j + startCol] === num) return false;
        return true;
    };

    const solve = (grid: number[][]) => {
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                if (grid[r][c] === 0) {
                    const nums = [1, 2, 3, 4].sort(() => Math.random() - 0.5);
                    for (const num of nums) {
                        if (isValid(grid, r, c, num)) {
                            grid[r][c] = num;
                            if (solve(grid)) return true;
                            grid[r][c] = 0;
                        }
                    }
                    return false;
                }
            }
        }
        return true;
    };

    solve(grid);
    return grid;
}

// --- ANA BİLEŞEN ---

export function WordSudoku() {
    const [category, setCategory] = useState(CATEGORIES[0]);
    const [difficulty, setDifficulty] = useState(DIFFICULTY_LEVELS[0]);
    const [grid, setGrid] = useState<string[][]>(Array(4).fill(null).map(() => Array(4).fill('')));
    const [initialGrid, setInitialGrid] = useState<string[][]>(Array(4).fill(null).map(() => Array(4).fill('')));
    const [solvedGrid, setSolvedGrid] = useState<string[][]>([]);
    
    const [isFinished, setIsAllSolved] = useState(false);
    const [hintsRemaining, setHintsRemaining] = useState(3);
    const [errorCount, setErrorCount] = useState(0);

    // Yeni Oyun Başlat
    const initGame = useCallback(() => {
        const baseGrid = generateSolvedGrid();
        const mappedGrid = baseGrid.map(row => row.map(num => category.words[num - 1]));
        setSolvedGrid(mappedGrid);

        const puzzleGrid = mappedGrid.map(row => [...row]);
        const cellsToRemove = difficulty.emptyCells;
        let removed = 0;
        while (removed < cellsToRemove) {
            const r = Math.floor(Math.random() * 4);
            const c = Math.floor(Math.random() * 4);
            if (puzzleGrid[r][c] !== '') {
                puzzleGrid[r][c] = '';
                removed++;
            }
        }
        
        setGrid(puzzleGrid.map(row => [...row]));
        setInitialGrid(puzzleGrid.map(row => [...row]));
        setIsAllSolved(false);
        setHintsRemaining(3);
        setErrorCount(0);
    }, [category, difficulty]);

    useEffect(() => {
        initGame();
    }, [initGame]);

    // Hücreye tıklandığında (Kelime döngüsü)
    const handleCellClick = (r: number, c: number) => {
        if (initialGrid[r][c] !== '' || isFinished) return;

        const currentVal = grid[r][c];
        const currentIndex = category.words.indexOf(currentVal);
        const nextIndex = (currentIndex + 1) % (category.words.length + 1);
        const nextVal = nextIndex === category.words.length ? '' : category.words[nextIndex];

        const newGrid = grid.map((row, ri) => 
            row.map((cell, ci) => (ri === r && ci === c ? nextVal : cell))
        );
        setGrid(newGrid);

        // Hata Kontrolü (Hızlı geri bildirim)
        if (nextVal !== '' && nextVal !== solvedGrid[r][c]) {
            playSound('incorrect');
            setErrorCount(prev => prev + 1);
        }
    };

    // Doğruluk Kontrolü
    const checkSolution = () => {
        const isComplete = grid.every(row => row.every(cell => cell !== ''));
        if (!isComplete) {
            toast({ title: "Eksik!", description: "Lütfen önce tüm boşlukları doldurun.", variant: "destructive" });
            return;
        }

        const isCorrect = grid.every((row, r) => row.every((cell, c) => cell === solvedGrid[r][c]));
        
        if (isCorrect) {
            setIsAllSolved(true);
            confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
            playSound('win');
        } else {
            playSound('incorrect');
            toast({ title: "Hata Var", description: "Bazı kavramlar yanlış yerleştirilmiş.", variant: "destructive" });
        }
    };

    const takeHint = () => {
        if (hintsRemaining <= 0 || isFinished) return;

        const emptyCells: {r: number, c: number}[] = [];
        grid.forEach((row, r) => row.forEach((cell, c) => {
            if (cell === '' || cell !== solvedGrid[r][c]) emptyCells.push({r, c});
        }));

        if (emptyCells.length > 0) {
            const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            const newGrid = grid.map((row, r) => 
                row.map((cell, c) => (r === randomCell.r && c === randomCell.c ? solvedGrid[r][c] : cell))
            );
            setGrid(newGrid);
            setHintsRemaining(prev => prev - 1);
            playSound('correct');
        }
    };

    const { toast } = { toast: (p: any) => console.log(p) }; // Simple fallback for local logic

    return (
        <div className="w-full max-w-5xl mx-auto animate-in fade-in duration-700">
            <Card className="bg-white/90 backdrop-blur-xl border border-white/60 shadow-2xl rounded-[3rem] overflow-hidden">
                <CardHeader className="bg-indigo-600 p-6 text-white relative">
                    <div className="absolute top-0 left-0 w-full h-full bg-[url('/noise.png')] opacity-10 pointer-events-none" />
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 relative z-10">
                        <div>
                            <CardTitle className="text-2xl font-black uppercase tracking-tight flex items-center gap-2">
                                <RotateCcw className="h-6 w-6" /> Kelime Sudoku
                            </CardTitle>
                            <CardDescription className="text-indigo-100 font-medium">Zihnini aç, kavramları yerleştir!</CardDescription>
                        </div>
                        <div className="flex gap-2 bg-black/20 p-1 rounded-xl">
                            {DIFFICULTY_LEVELS.map(level => (
                                <button
                                    key={level.id}
                                    onClick={() => setDifficulty(level)}
                                    className={cn(
                                        "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                        difficulty.id === level.id ? "bg-white text-indigo-600 shadow-sm" : "text-white/60 hover:text-white"
                                    )}
                                >
                                    {level.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-4 md:p-8">
                    <div className="flex flex-col lg:flex-row gap-8">
                        {/* SOL PANEL: AYARLAR VE KATEGORİLER */}
                        <div className="w-full lg:w-64 space-y-6 shrink-0">
                            <section className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Kategoriler</Label>
                                <div className="grid grid-cols-1 gap-2">
                                    {CATEGORIES.map(cat => (
                                        <button
                                            key={cat.id}
                                            onClick={() => setCategory(cat)}
                                            className={cn(
                                                "group flex items-center gap-3 p-3 rounded-2xl border transition-all text-left",
                                                category.id === cat.id 
                                                    ? `border-${cat.id === 'degerler' ? 'rose' : cat.id === 'ibadetler' ? 'amber' : cat.id === 'kavramlar' ? 'indigo' : 'emerald'}-500 ${cat.bg} shadow-md` 
                                                    : "bg-white border-slate-100 hover:border-slate-300 text-slate-500"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                                                category.id === cat.id ? "bg-white shadow-sm" : "bg-slate-50"
                                            )}>
                                                {React.cloneElement(cat.icon as React.ReactElement, { 
                                                    className: cn("w-5 h-5", category.id === cat.id ? cat.color : "text-slate-400") 
                                                })}
                                            </div>
                                            <span className={cn("font-bold text-sm", category.id === cat.id ? "text-slate-900" : "text-slate-400")}>{cat.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </section>

                            <section className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="flex items-center justify-between mb-2">
                                    <Label className="text-[10px] font-black uppercase text-slate-400">İpuçları</Label>
                                    <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-none font-black">{hintsRemaining}</Badge>
                                </div>
                                <Progress value={(hintsRemaining / 3) * 100} className="h-1.5" />
                                <Button 
                                    variant="outline" 
                                    onClick={takeHint} 
                                    disabled={hintsRemaining <= 0 || isFinished}
                                    className="w-full mt-4 h-10 border-indigo-200 text-indigo-600 hover:bg-indigo-50 rounded-xl font-bold text-xs"
                                >
                                    <HelpCircle className="w-4 h-4 mr-2" /> İpucu Al
                                </Button>
                            </section>
                        </div>

                        {/* ORTA: SUDOKU GRID */}
                        <div className="flex-1 flex flex-col items-center">
                            <div className="bg-slate-900 p-2 rounded-[2rem] shadow-2xl border-4 border-slate-800">
                                {/* SUDOKU GRID 4x4 - BLOKLAR BELİRGİNLEŞTİRİLDİ */}
                                <div className="grid grid-cols-2 gap-3 p-1">
                                    {[0, 1, 2, 3].map((blockIdx) => {
                                        const startRow = Math.floor(blockIdx / 2) * 2;
                                        const startCol = (blockIdx % 2) * 2;
                                        return (
                                            <div key={blockIdx} className="grid grid-cols-2 gap-2 bg-slate-800/40 p-2 rounded-xl">
                                                {[0, 1, 2, 3].map((cellIdx) => {
                                                    const r = startRow + Math.floor(cellIdx / 2);
                                                    const c = startCol + (cellIdx % 2);
                                                    
                                                    // Hata Kontrolü: r veya c dizin dışıysa render etme
                                                    if (!grid[r]) return null;
                                                    
                                                    const value = grid[r][c];
                                                    const isInitial = initialGrid[r][c] !== '';
                                                    const isCorrect = value === '' || value === solvedGrid[r][c];

                                                    return (
                                                        <button
                                                            key={`${r}-${c}`}
                                                            onClick={() => handleCellClick(r, c)}
                                                            disabled={isInitial || isFinished}
                                                            className={cn(
                                                                "w-16 h-16 md:w-24 md:h-24 rounded-2xl flex items-center justify-center text-center p-1 transition-all duration-300 relative group overflow-hidden",
                                                                "text-[10px] md:text-sm font-black uppercase leading-tight tracking-tighter",
                                                                isInitial 
                                                                    ? "bg-slate-700 text-slate-400 border border-slate-600 cursor-default" 
                                                                    : value === ''
                                                                        ? "bg-slate-800/50 hover:bg-slate-700 text-white border-2 border-dashed border-slate-700 hover:border-indigo-500/50"
                                                                        : isCorrect 
                                                                            ? "bg-indigo-600 text-white border-2 border-indigo-400 shadow-[0_0_15px_rgba(79,70,229,0.4)]"
                                                                            : "bg-red-500 text-white border-2 border-red-400 animate-shake-game"
                                                            )}
                                                        >
                                                            {isInitial && <Lock className="absolute top-2 right-2 w-3 h-3 opacity-30" />}
                                                            {value}
                                                            {!value && !isInitial && <Plus className="w-5 h-5 opacity-0 group-hover:opacity-20 text-white transition-opacity" />}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* SAĞ PANEL: KELİME ANAHTARI */}
                        <div className="w-full lg:w-48 space-y-4 shrink-0">
                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Kullanılacaklar</Label>
                            <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
                                {category.words.map((word, idx) => (
                                    <div key={word} className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm">
                                        <span className="text-[10px] font-black text-slate-300 mb-1">KAVRAM {idx + 1}</span>
                                        <span className={cn("font-black text-xs md:text-sm tracking-tight", category.color)}>{word}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="pt-6">
                                <Button 
                                    onClick={checkSolution}
                                    disabled={isFinished}
                                    className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-indigo-500/20 active:scale-95 transition-all"
                                >
                                    <CheckCircle2 className="w-6 h-6 mr-2" /> KONTROL ET
                                </Button>
                                
                                <Button 
                                    variant="ghost" 
                                    onClick={initGame}
                                    className="w-full mt-4 text-slate-400 hover:text-red-500 hover:bg-red-50 font-bold h-12 rounded-xl"
                                >
                                    <Trash2 className="w-4 h-4 mr-2" /> Temizle & Yenile
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>

                <CardFooter className="bg-slate-50 p-4 flex justify-between border-t border-slate-100">
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Trophy className="h-3 w-3" /> Hata Sayısı: <span className="text-slate-900">{errorCount}</span>
                     </p>
                     <div className="flex items-center gap-4">
                         <span className="text-[10px] font-black text-indigo-600 uppercase tracking-tighter">Din Dersi Atölyesi | Zeka Köşesi</span>
                     </div>
                </CardFooter>
            </Card>

            {/* BAŞARI DİALOGU */}
            {isFinished && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-500">
                    <Card className="max-w-md w-full bg-white border-none shadow-[0_0_50px_rgba(0,0,0,0.3)] rounded-[3rem] overflow-hidden animate-in zoom-in-95 duration-500">
                        <div className="bg-indigo-600 p-8 text-center relative overflow-hidden">
                             <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10" />
                             <PartyPopper className="w-20 h-20 text-white mx-auto mb-4 animate-bounce relative z-10" />
                             <CardTitle className="text-4xl font-black text-white uppercase relative z-10">MÜKEMMEL!</CardTitle>
                        </div>
                        <CardContent className="p-8 text-center space-y-4">
                            <p className="text-slate-600 font-medium text-lg">Tüm kavramları doğru yerleştirdin. Zihnin pırıl pırıl parlıyor!</p>
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 grid grid-cols-2 gap-4">
                                <div><p className="text-[10px] text-slate-400 font-bold uppercase">Hata</p><p className="text-2xl font-black text-slate-900">{errorCount}</p></div>
                                <div><p className="text-[10px] text-slate-400 font-bold uppercase">Kategori</p><p className="text-xs font-black text-indigo-600 uppercase">{category.name}</p></div>
                            </div>
                        </CardContent>
                        <CardFooter className="p-8 pt-0">
                            <Button onClick={initGame} className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-lg font-black uppercase tracking-widest rounded-2xl shadow-lg">
                                YENİ OYUN BAŞLAT
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            )}
        </div>
    );
}

// --- SES SERVİSİ FALLBACK ---
function playSound(type: 'correct' | 'incorrect' | 'win') {
    if (typeof window === 'undefined') return;
    try {
        const audio = new Audio();
        if (type === 'correct') audio.src = "https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3";
        else if (type === 'incorrect') audio.src = "https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3";
        else if (type === 'win') audio.src = "https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3";
        audio.volume = 0.3;
        audio.play().catch(() => {});
    } catch (e) {
        console.warn("Ses çalınamadı:", e);
    }
}
