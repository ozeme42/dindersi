'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
    BrainCircuit, Trophy, RefreshCw, Check, X, 
    Lock, Plus, Trash2, Sparkles, Heart, Brain, ShieldCheck,
    Info, Star, Zap, Lightbulb
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
    Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter 
} from '@/components/ui/card';
import { 
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, 
    AlertDialogTitle, AlertDialogTrigger 
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';

// --- KATEGORİ VE KELİME YAPILANDIRMASI ---
const CATEGORIES = [
    { 
        id: 'values', 
        name: 'Değerler', 
        icon: Heart, 
        color: 'text-rose-500', 
        words: ['SAYGI', 'SEVGİ', 'SABIR', 'İHLAS'] 
    },
    { 
        id: 'worship', 
        name: 'İbadetler', 
        icon: Sparkles, 
        color: 'text-amber-500', 
        words: ['NAMAZ', 'ORUÇ', 'HAC', 'ZEKAT'] 
    },
    { 
        id: 'concepts', 
        name: 'Kavramlar', 
        icon: BrainCircuit, 
        color: 'text-indigo-500', 
        words: ['İMAN', 'İSLAM', 'İHSAN', 'TEVHİD'] 
    },
    { 
        id: 'virtues', 
        name: 'Ahlak', 
        icon: ShieldCheck, 
        color: 'text-emerald-500', 
        words: ['ADALET', 'DOĞRU', 'ŞEFKAT', 'EDEP'] 
    }
];

// --- SUDOKU MANTIĞI ---
const isSafe = (grid: string[][], row: number, col: number, word: string) => {
    // Satır kontrolü
    for (let x = 0; x < 4; x++) if (grid[row][x] === word) return false;
    // Sütun kontrolü
    for (let x = 0; x < 4; x++) if (grid[x][col] === word) return false;
    // 2x2 Blok kontrolü
    let startRow = row - (row % 2), startCol = col - (col % 2);
    for (let i = 0; i < 2; i++)
        for (let j = 0; j < 2; j++)
            if (grid[i + startRow][j + startCol] === word) return false;
    return true;
};

const solveSudoku = (grid: string[][], words: string[]): boolean => {
    let row = -1, col = -1, isEmpty = true;
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            if (grid[i][j] === '') { row = i; col = j; isEmpty = false; break; }
        }
        if (!isEmpty) break;
    }
    if (isEmpty) return true;
    for (let word of words) {
        if (isSafe(grid, row, col, word)) {
            grid[row][col] = word;
            if (solveSudoku(grid, words)) return true;
            grid[row][col] = '';
        }
    }
    return false;
};

const generatePuzzle = (words: string[], difficulty: 'easy' | 'medium' | 'hard') => {
    let grid = Array(4).fill(null).map(() => Array(4).fill(''));
    solveSudoku(grid, words);

    const puzzle = grid.map(row => [...row]);
    const attempts = difficulty === 'easy' ? 4 : difficulty === 'medium' ? 7 : 10;
    let count = 0;
    while (count < attempts) {
        let r = Math.floor(Math.random() * 4);
        let c = Math.floor(Math.random() * 4);
        if (puzzle[r][c] !== '') {
            puzzle[r][c] = '';
            count++;
        }
    }
    return { solution: grid, puzzle };
};

export function WordSudoku() {
    const [category, setCategory] = useState(CATEGORIES[0]);
    const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
    const [grid, setGrid] = useState<string[][]>([]);
    const [initialGrid, setInitialGrid] = useState<string[][]>([]);
    const [solution, setSolution] = useState<string[][]>([]);
    const [hintsUsed, setHintsUsed] = useState(0);
    const [isComplete, setIsAllComplete] = useState(false);

    const initGame = useCallback(() => {
        const { solution, puzzle } = generatePuzzle(category.words, difficulty);
        setSolution(solution);
        setInitialGrid(puzzle.map(row => [...row]));
        setGrid(puzzle.map(row => [...row]));
        setHintsUsed(0);
        setIsAllComplete(false);
    }, [category, difficulty]);

    useEffect(() => {
        initGame();
    }, [initGame]);

    const handleCellClick = (r: number, c: number) => {
        if (initialGrid[r][c] !== '' || isComplete) return;

        const currentWord = grid[r][c];
        const currentIndex = category.words.indexOf(currentWord);
        const nextIndex = (currentIndex + 1) % (category.words.length + 1);
        
        const newGrid = grid.map(row => [...row]);
        newGrid[r][c] = nextIndex === category.words.length ? '' : category.words[nextIndex];
        setGrid(newGrid);
        playSound('pop');
    };

    const checkSolution = () => {
        let correct = true;
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                if (grid[r][c] !== solution[r][c]) {
                    correct = false;
                    break;
                }
            }
        }

        if (correct) {
            setIsAllComplete(true);
            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#6366f1', '#a855f7', '#ec4899']
            });
            playSound('win');
        } else {
            toast({ title: "Henüz Olmadı!", description: "Bazı kelimeler yanlış yerleşmiş görünüyor. Tekrar kontrol et.", variant: "destructive" });
            playSound('incorrect');
        }
    };

    const getHint = () => {
        if (hintsUsed >= 3 || isComplete) return;
        
        const emptyCells = [];
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                if (grid[r][c] === '') emptyCells.push({ r, c });
            }
        }

        if (emptyCells.length > 0) {
            const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            const newGrid = grid.map(row => [...row]);
            newGrid[randomCell.r][randomCell.c] = solution[randomCell.r][randomCell.c];
            setGrid(newGrid);
            setHintsUsed(h => h + 1);
            playSound('hint');
        }
    };

    const playSound = (type: string) => {
        // Audio service mock or actual call
        console.log("Playing sound:", type);
    };

    const toast = ({ title, description, variant }: any) => {
        // Shadcn toast mock
        console.log("Toast:", title, description);
    };

    return (
        <Card className="bg-white/80 backdrop-blur-xl border border-white/60 shadow-2xl rounded-[3rem] overflow-hidden">
            <CardHeader className="bg-indigo-600 p-8 text-white relative">
                <div className="absolute top-0 left-0 w-full h-full bg-[url('/noise.png')] opacity-10 pointer-events-none" />
                <div className="flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
                    <div className="flex items-center gap-5">
                        <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-md border border-white/30 shadow-inner">
                            <category.icon className="h-10 w-10 text-white" />
                        </div>
                        <div>
                            <CardTitle className="text-3xl font-black uppercase tracking-tight">Kelime Sudoku</CardTitle>
                            <CardDescription className="text-indigo-100 font-medium text-lg">Zihnini aç, kavramları yerleştir!</CardDescription>
                        </div>
                    </div>
                    <div className="flex gap-2 bg-black/20 p-1.5 rounded-2xl border border-white/10">
                        {(['easy', 'medium', 'hard'] as const).map(level => (
                            <Button 
                                key={level}
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setDifficulty(level)}
                                className={cn(
                                    "rounded-xl px-6 font-bold text-xs uppercase transition-all",
                                    difficulty === level ? "bg-white text-indigo-600 shadow-lg" : "text-white/60 hover:text-white"
                                )}
                            >
                                {level === 'easy' ? 'Kolay' : level === 'medium' ? 'Orta' : 'Zor'}
                            </Button>
                        ))}
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-8">
                <div className="flex flex-col lg:flex-row gap-12 items-start justify-center">
                    
                    {/* SOL: Ayarlar ve Kelime Grubu */}
                    <div className="w-full lg:w-72 space-y-8">
                        <section className="space-y-4">
                            <Label className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Kelime Grubu</Label>
                            <div className="grid grid-cols-1 gap-2.5">
                                {CATEGORIES.map(cat => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setCategory(cat)}
                                        className={cn(
                                            "flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all duration-300 group",
                                            category.id === cat.id 
                                                ? "bg-indigo-50 border-indigo-200 shadow-md translate-x-1" 
                                                : "bg-white border-slate-100 text-slate-400 hover:border-indigo-100 hover:bg-indigo-50/30"
                                        )}
                                    >
                                        <div className={cn("p-2 rounded-xl transition-colors", category.id === cat.id ? "bg-white text-indigo-600 shadow-sm" : "bg-slate-50 text-slate-300 group-hover:bg-white group-hover:text-indigo-400")}>
                                            <cat.icon className="h-5 w-5" />
                                        </div>
                                        <span className={cn("font-bold text-sm", category.id === cat.id ? "text-indigo-900" : "text-slate-500")}>{cat.name}</span>
                                    </button>
                                ))}
                            </div>
                        </section>

                        <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 space-y-4">
                            <div className="flex justify-between items-center text-xs font-black text-slate-400 uppercase tracking-widest">
                                <span>İpucu Durumu</span>
                                <span>{hintsUsed}/3</span>
                            </div>
                            <Progress value={(hintsUsed / 3) * 100} className="h-2 bg-slate-200" />
                            <Button 
                                variant="outline" 
                                className="w-full h-12 rounded-xl bg-white border-slate-200 text-indigo-600 font-bold gap-2"
                                onClick={getHint}
                                disabled={hintsUsed >= 3 || isComplete}
                            >
                                <Lightbulb className="h-4 w-4" /> İpucu Ver
                            </Button>
                        </div>
                    </div>

                    {/* ORTA: Sudoku Izgarası (Bloklar Belirginleştirildi) */}
                    <div className="relative group">
                        <div className="absolute -inset-4 bg-gradient-to-tr from-indigo-500/10 to-purple-500/10 rounded-[3rem] blur-2xl group-hover:opacity-100 opacity-50 transition-opacity" />
                        
                        {/* 2x2 Blokları Ayıran Izgara Yapısı */}
                        <div className="relative grid grid-cols-2 gap-4 p-4 bg-slate-100 rounded-[2.5rem] border-2 border-slate-200 shadow-inner">
                            {/* Her bir parça bir 2x2 bloğu temsil eder */}
                            {[0, 1, 2, 3].map((blockIdx) => {
                                const startRow = Math.floor(blockIdx / 2) * 2;
                                const startCol = (blockIdx % 2) * 2;
                                
                                return (
                                    <div key={blockIdx} className="grid grid-cols-2 gap-2">
                                        {[0, 1, 2, 3].map((cellIdx) => {
                                            const r = startRow + Math.floor(cellIdx / 2);
                                            const c = startCol + (cellIdx % 2);
                                            const value = grid[r][c];
                                            const isInitial = initialGrid[r][c] !== '';

                                            return (
                                                <button
                                                    key={`${r}-${c}`}
                                                    onClick={() => handleCellClick(r, c)}
                                                    className={cn(
                                                        "w-16 h-16 md:w-24 md:h-24 rounded-2xl flex items-center justify-center text-[10px] md:text-sm font-black transition-all duration-300 shadow-sm relative group",
                                                        isInitial 
                                                            ? "bg-slate-200 text-slate-800 cursor-not-allowed border-b-4 border-slate-300" 
                                                            : "bg-white text-indigo-600 hover:scale-105 border-b-4 border-indigo-100 hover:border-indigo-300",
                                                        !value && !isInitial && "hover:bg-indigo-50/50"
                                                    )}
                                                >
                                                    {value}
                                                    {isInitial && <Lock className="absolute top-1.5 right-1.5 h-3 w-3 opacity-20" />}
                                                    {!value && !isInitial && (
                                                        <Plus className="h-5 w-5 text-indigo-100 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* SAĞ: Kelime Listesi ve Durum */}
                    <div className="w-full lg:w-64 space-y-6">
                        <section className="space-y-4">
                            <Label className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Kullanılacak Kelimeler</Label>
                            <div className="grid grid-cols-1 gap-2">
                                {category.words.map((w) => {
                                    const isUsed = grid.flat().filter(cell => cell === w).length >= 4;
                                    return (
                                        <div key={w} className={cn(
                                            "flex items-center justify-between p-4 rounded-2xl border-2 transition-all font-bold text-sm",
                                            isUsed ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-white border-slate-100 text-slate-600"
                                        )}>
                                            <span>{w}</span>
                                            {isUsed && <Check className="h-4 w-4" />}
                                        </div>
                                    )
                                })}
                            </div>
                        </section>

                        <div className="pt-6 space-y-3">
                            <Button 
                                className="w-full h-16 bg-indigo-600 hover:bg-indigo-500 text-white text-lg font-black shadow-xl shadow-indigo-900/20 rounded-2xl"
                                onClick={checkSolution}
                                disabled={grid.flat().includes('') || isComplete}
                            >
                                <CheckCircle2 className="mr-2 h-6 w-6" /> KONTROL ET
                            </Button>
                            
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" className="w-full h-12 text-slate-400 hover:text-red-500 hover:bg-red-50/50 rounded-xl text-xs font-bold">
                                        <Trash2 className="w-4 h-4 mr-2" /> Temizle ve Baştan Başla
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="bg-slate-900 border-white/10 text-white">
                                    <AlertDialogHeader>
                                        <AlertDialogTitle className="text-red-400">Oyunu Sıfırla</AlertDialogTitle>
                                        <AlertDialogDescription className="text-slate-400">
                                            Tüm ilerlemeniz silinecek. Emin misiniz?
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel className="bg-transparent border-white/10 text-slate-300">İptal</AlertDialogCancel>
                                        <AlertDialogAction onClick={initGame} className="bg-red-600 hover:bg-red-500">Evet, Sıfırla</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </div>
                </div>
            </CardContent>

            {isComplete && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-indigo-600/95 animate-in fade-in zoom-in duration-500">
                    <div className="text-center space-y-6 max-w-lg p-8">
                        <Trophy className="h-32 w-32 text-yellow-400 mx-auto animate-bounce drop-shadow-[0_0_20px_rgba(250,204,21,0.5)]" />
                        <h2 className="text-5xl font-black text-white uppercase tracking-tighter">MÜKEMMEL!</h2>
                        <p className="text-xl text-indigo-100 font-medium leading-relaxed">
                            Kavramları hatasız yerleştirerek zekanı kanıtladın. Bir sonraki seviyeye hazır mısın?
                        </p>
                        <div className="flex gap-4 justify-center pt-8">
                            <Button onClick={initGame} size="lg" className="h-16 px-10 text-xl font-bold bg-white text-indigo-600 hover:bg-indigo-50 rounded-2xl shadow-2xl">
                                <Repeat className="mr-2 h-6 w-6" /> TEKRAR OYNA
                            </Button>
                        </div>
                    </div>
                </div>
            )}
            
            <CardFooter className="bg-slate-50 py-4 px-8 border-t border-slate-100">
                <div className="flex items-center gap-2 text-slate-400">
                    <Info className="h-4 w-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest leading-none">Kurallar: Her satır, sütun ve 2x2'lik blokta her kelimeden sadece birer tane bulunmalıdır.</span>
                </div>
            </CardFooter>
        </Card>
    );
}

const CheckCircle2 = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>
);
