'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    Trophy, RotateCcw, Sparkles, BrainCircuit, Heart, 
    ListChecks, Trash2, HelpCircle, Lock, Gamepad2, 
    CheckCircle2, AlertCircle, Info, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';

// --- TİPLER VE SABİTLER ---

type Difficulty = 'Kolay' | 'Orta' | 'Zor';

interface Category {
    id: string;
    name: string;
    icon: React.ReactNode;
    words: string[];
    color: string;
}

const CATEGORIES: Category[] = [
    { 
        id: 'degerler', 
        name: 'Değerler', 
        icon: <Heart className="w-4 h-4" />, 
        words: ['SEVGİ', 'SAYGI', 'SABIR', 'İHLAS'],
        color: 'text-rose-500'
    },
    { 
        id: 'ibadetler', 
        name: 'İbadetler', 
        icon: <Sparkles className="w-4 h-4" />, 
        words: ['NAMAZ', 'ORUÇ', 'HAC', 'ZEKAT'],
        color: 'text-amber-500'
    },
    { 
        id: 'kavramlar', 
        name: 'Kavramlar', 
        icon: <BrainCircuit className="w-4 h-4" />, 
        words: ['İMAN', 'İSLAM', 'İHSAN', 'TEVHİD'],
        color: 'text-indigo-500'
    },
    { 
        id: 'ahlak', 
        name: 'Ahlak', 
        icon: <ListChecks className="w-4 h-4" />, 
        words: ['ADALET', 'DOĞRU', 'ŞEFKAT', 'EDEP'],
        color: 'text-emerald-500'
    },
];

// 4x4 Sudoku Çözücü ve Oluşturucu Mantığı
const isValid = (grid: string[][], row: number, col: number, word: string) => {
    for (let i = 0; i < 4; i++) {
        if (grid[row][i] === word || grid[i][col] === word) return false;
    }
    const startRow = Math.floor(row / 2) * 2;
    const startCol = Math.floor(col / 2) * 2;
    for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
            if (grid[startRow + i][startCol + j] === word) return false;
        }
    }
    return true;
};

const solveSudoku = (grid: string[][], words: string[]): boolean => {
    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
            if (grid[row][col] === '') {
                for (const word of words) {
                    if (isValid(grid, row, col, word)) {
                        grid[row][col] = word;
                        if (solveSudoku(grid, words)) return true;
                        grid[row][col] = '';
                    }
                }
                return false;
            }
        }
    }
    return true;
};

const generatePuzzle = (words: string[], difficulty: Difficulty) => {
    const grid = Array(4).fill(null).map(() => Array(4).fill(''));
    solveSudoku(grid, [...words].sort(() => Math.random() - 0.5));

    const hintsCount = difficulty === 'Kolay' ? 8 : difficulty === 'Orta' ? 6 : 4;
    const puzzle = grid.map(row => [...row]);
    const fixedCells: boolean[][] = Array(4).fill(null).map(() => Array(4).fill(false));
    
    let removed = 0;
    const positions = [];
    for (let r = 0; row < 4; r++) for (let c = 0; c < 4; c++) positions.push([r, c]);
    const shuffledPositions = positions.sort(() => Math.random() - 0.5);

    for (let i = 0; i < 16 - hintsCount; i++) {
        const [r, c] = shuffledPositions[i];
        puzzle[r][c] = '';
    }

    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
            if (puzzle[r][c] !== '') fixedCells[r][c] = true;
        }
    }

    return { puzzle, solution: grid, fixedCells };
};

// --- ANA BİLEŞEN ---

export function WordSudoku() {
    const [category, setCategory] = useState<Category>(CATEGORIES[0]);
    const [difficulty, setDifficulty] = useState<Difficulty>('Orta');
    const [grid, setGrid] = useState<string[][]>([]);
    const [solution, setSolution] = useState<string[][]>([]);
    const [fixedCells, setFixedCells] = useState<boolean[][]>([]);
    const [errors, setErrors] = useState<boolean[][]>(Array(4).fill(null).map(() => Array(4).fill(false)));
    const [isComplete, setIsComplete] = useState(false);
    const [hintsLeft, setHintsLeft] = useState(3);

    const initGame = useCallback(() => {
        const { puzzle, solution, fixedCells } = generatePuzzle(category.words, difficulty);
        setGrid(puzzle);
        setSolution(solution);
        setFixedCells(fixedCells);
        setErrors(Array(4).fill(null).map(() => Array(4).fill(false)));
        setIsComplete(false);
        setHintsLeft(3);
    }, [category, difficulty]);

    useEffect(() => {
        initGame();
    }, [initGame]);

    const handleCellClick = (r: number, c: number) => {
        if (fixedCells[r][c] || isComplete) return;

        const currentWord = grid[r][c];
        const currentIndex = category.words.indexOf(currentWord);
        const nextIndex = (currentIndex + 1) % (category.words.length + 1);
        const nextWord = nextIndex === category.words.length ? '' : category.words[nextIndex];

        const newGrid = grid.map(row => [...row]);
        newGrid[r][c] = nextWord;
        setGrid(newGrid);

        // Hata kontrolü
        const newErrors = Array(4).fill(null).map(() => Array(4).fill(false));
        if (nextWord !== '' && nextWord !== solution[r][c]) {
            newErrors[r][c] = true;
            playSound('incorrect');
        } else if (nextWord !== '') {
            playSound('pop');
        }
        setErrors(newErrors);

        // Tamamlanma kontrolü
        const isAllFilled = newGrid.every(row => row.every(cell => cell !== ''));
        const isCorrect = newGrid.every((row, ri) => row.every((cell, ci) => cell === solution[ri][ci]));
        
        if (isAllFilled && isCorrect) {
            setIsComplete(true);
            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#4f46e5', '#10b981', '#fbbf24']
            });
            playSound('win');
        }
    };

    const getHint = () => {
        if (hintsLeft <= 0 || isComplete) return;

        const emptyPositions = [];
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                if (grid[r][c] === '' || grid[r][c] !== solution[r][c]) {
                    emptyPositions.push([r, c]);
                }
            }
        }

        if (emptyPositions.length > 0) {
            const [r, c] = emptyPositions[Math.floor(Math.random() * emptyPositions.length)];
            const newGrid = grid.map(row => [...row]);
            newGrid[r][c] = solution[r][c];
            setGrid(newGrid);
            setHintsLeft(prev => prev - 1);
            playSound('correct');
        }
    };

    return (
        <Card className="bg-white/80 backdrop-blur-xl border border-white/60 shadow-2xl rounded-[2.5rem] overflow-hidden">
            <CardHeader className="bg-indigo-600 p-6 md:p-8 text-white relative">
                <div className="absolute top-0 left-0 w-full h-full bg-[url('/noise.png')] opacity-10 pointer-events-none" />
                <div className="flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/30 shadow-lg">
                            <Gamepad2 className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <CardTitle className="text-2xl font-black uppercase tracking-tight">Kelime Sudoku</CardTitle>
                            <CardDescription className="text-indigo-100 font-medium">Zihnini aç, kavramları yerleştir!</CardDescription>
                        </div>
                    </div>
                    <div className="flex gap-2 bg-black/20 p-1.5 rounded-2xl border border-white/10">
                        {['Kolay', 'Orta', 'Zor'].map((d) => (
                            <button
                                key={d}
                                onClick={() => setDifficulty(d as Difficulty)}
                                className={cn(
                                    "px-4 py-2 rounded-xl text-xs font-black transition-all uppercase tracking-widest",
                                    difficulty === d ? "bg-white text-indigo-600 shadow-md" : "text-white/60 hover:text-white"
                                )}
                            >
                                {d}
                            </button>
                        ))}
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-6 md:p-10">
                <div className="flex flex-col lg:flex-row gap-10 items-start justify-center">
                    
                    {/* SOL PANEL: AYARLAR VE KATEGORİLER */}
                    <div className="w-full lg:w-64 space-y-6 shrink-0">
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Kategoriler</Label>
                            <div className="grid grid-cols-1 gap-2">
                                {CATEGORIES.map(cat => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setCategory(cat)}
                                        className={cn(
                                            "flex items-center gap-3 p-3 rounded-2xl border transition-all text-left group",
                                            category.id === cat.id 
                                                ? "bg-indigo-50 border-indigo-200 shadow-sm" 
                                                : "bg-white border-slate-100 hover:border-indigo-200 hover:bg-slate-50"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                                            category.id === cat.id ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-400 group-hover:bg-indigo-100"
                                        )}>
                                            {cat.icon}
                                        </div>
                                        <span className={cn("font-bold text-sm", category.id === cat.id ? "text-indigo-900" : "text-slate-500")}>
                                            {cat.name}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                             <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase">İpucu Hakkı</span>
                                <span className="font-bold text-indigo-600">{hintsLeft}</span>
                             </div>
                             <Progress value={(hintsLeft / 3) * 100} className="h-1.5 bg-slate-200" />
                             <Button 
                                variant="outline" 
                                onClick={getHint} 
                                disabled={hintsLeft === 0 || isComplete}
                                className="w-full mt-4 h-10 rounded-xl border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-bold text-xs"
                             >
                                <HelpCircle className="w-3.5 h-3.5 mr-2" /> İpucu Al
                             </Button>
                        </div>
                    </div>

                    {/* ORTA PANEL: SUDOKU IZGARASI */}
                    <div className="flex-1 flex justify-center">
                        <div className="relative p-2 bg-slate-900 rounded-[2rem] shadow-2xl">
                             {/* 2x2 BLOKLARI AYIRAN TEMEL GRID */}
                            <div className="grid grid-cols-2 gap-3 p-1">
                                {[0, 1, 2, 3].map((blockIdx) => {
                                    const startRow = Math.floor(blockIdx / 2) * 2;
                                    const startCol = (blockIdx % 2) * 2;
                                    
                                    return (
                                        <div key={blockIdx} className="grid grid-cols-2 gap-1.5">
                                            {[0, 1, 2, 3].map((cellInBlock) => {
                                                const r = startRow + Math.floor(cellInBlock / 2);
                                                const c = startCol + (cellInBlock % 2);
                                                const isFixed = fixedCells[r][c];
                                                const isError = errors[r][c];
                                                
                                                return (
                                                    <button
                                                        key={`${r}-${c}`}
                                                        onClick={() => handleCellClick(r, c)}
                                                        className={cn(
                                                            "w-16 h-16 md:w-24 md:h-24 rounded-xl flex items-center justify-center transition-all duration-300 relative group overflow-hidden",
                                                            "text-[10px] md:text-sm font-black text-center px-1 break-words leading-tight",
                                                            isFixed 
                                                                ? "bg-slate-800 text-white cursor-not-allowed border-b-4 border-slate-950" 
                                                                : "bg-white text-indigo-600 border-b-4 border-slate-200 hover:scale-95 active:scale-90 active:border-b-0",
                                                            isError && "bg-red-50 text-red-600 border-red-200 animate-shake-game",
                                                            isComplete && !isFixed && "bg-emerald-50 text-emerald-600 border-emerald-200"
                                                        )}
                                                    >
                                                        {grid[r][c]}
                                                        {isFixed && (
                                                            <div className="absolute top-1 right-1 opacity-20 group-hover:opacity-40">
                                                                <Lock className="w-3 h-3" />
                                                            </div>
                                                        )}
                                                        {isComplete && <div className="absolute inset-0 bg-emerald-500/5 pointer-events-none" />}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    )
                                })}
                            </div>

                            {/* Tamamlanma Rozeti */}
                            {isComplete && (
                                <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                                    <div className="bg-emerald-500 text-white p-6 rounded-3xl shadow-2xl animate-in zoom-in duration-500 flex flex-col items-center">
                                        <Trophy className="w-16 h-16 mb-2 animate-bounce" />
                                        <span className="text-2xl font-black">HARİKA!</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* SAĞ PANEL: KELİME ANAHTARI */}
                    <div className="w-full lg:w-48 space-y-4 shrink-0">
                         <div className="bg-white border-2 border-slate-100 rounded-3xl p-5 shadow-sm">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-50 pb-2">Kelimeler</h4>
                            <div className="space-y-2">
                                {category.words.map((w, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <div className="w-6 h-6 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-[10px]">{i + 1}</div>
                                        <span className="text-xs font-bold text-slate-700">{w}</span>
                                    </div>
                                ))}
                            </div>
                         </div>

                         <div className="p-4 space-y-3">
                             <Button 
                                onClick={initGame} 
                                className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold shadow-lg"
                             >
                                <RotateCcw className="w-4 h-4 mr-2" /> Yenile
                             </Button>
                             
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" className="w-full text-slate-400 hover:text-red-600 text-[10px] font-bold uppercase tracking-widest">
                                        <Trash2 className="w-3.5 h-3.5 mr-2" /> Sıfırla
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="bg-slate-900 border-white/10 text-white">
                                    <AlertDialogHeader>
                                        <RadixAlertDialogTitle>Emin misiniz?</RadixAlertDialogTitle>
                                        <AlertDialogDescription className="text-slate-400">Tüm ilerlemeniz silinecek ve oyun baştan başlayacak.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel className="bg-transparent text-slate-400">İptal</AlertDialogCancel>
                                        <AlertDialogAction onClick={initGame} className="bg-red-600 hover:bg-red-500">Sıfırla</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                             </AlertDialog>
                         </div>
                    </div>

                </div>
            </CardContent>

            <CardFooter className="bg-slate-50 border-t border-slate-100 p-4 flex justify-center">
                 <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2">
                    <Info className="w-3 h-3" /> Her satır, sütun ve 2x2 blokta her kelimeden birer tane olmalı.
                 </p>
            </CardFooter>
        </Card>
    );
}

// AlertDialog alt bileşenleri için gerekli olan Radix UI aliası
const RadixAlertDialogTitle = AlertDialogTitle;
