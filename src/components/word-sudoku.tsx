'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
    RefreshCw, Lightbulb, Trophy, CheckCircle2, Zap, 
    Trash2, Heart, Sparkles, BrainCircuit, Star, 
    ChevronRight, Info, AlertTriangle, ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';

// --- OYUN AYARLARI VE KELİME GRUPLARI ---
const WORD_GROUPS = [
    {
        id: 'values',
        name: 'Değerlerimiz',
        icon: Heart,
        words: ['SAYGI', 'SEVGİ', 'SABIR', 'İHLAS'],
        color: 'text-rose-500',
        bg: 'bg-rose-50'
    },
    {
        id: 'worship',
        name: 'İbadetler',
        icon: Zap,
        words: ['NAMAZ', 'ORUÇ', 'ZEKAT', 'HAC'],
        color: 'text-amber-500',
        bg: 'bg-amber-50'
    },
    {
        id: 'concepts',
        name: 'Kavramlar',
        icon: BrainCircuit,
        words: ['İMAN', 'İSLAM', 'İHSAN', 'TEVHİD'],
        color: 'text-blue-500',
        bg: 'bg-blue-50'
    },
    {
        id: 'virtues',
        name: 'Ahlak',
        icon: Sparkles,
        words: ['ADALET', 'DOĞRU', 'ŞEFKAT', 'EDEP'],
        color: 'text-emerald-500',
        bg: 'bg-emerald-50'
    }
];

type CellValue = string | null;

export function WordSudoku() {
    const [selectedGroup, setSelectedGroup] = useState(WORD_GROUPS[0]);
    const [grid, setGrid] = useState<CellValue[][]>(Array(4).fill(null).map(() => Array(4).fill(null)));
    const [initialCells, setInitialCells] = useState<boolean[][]>(Array(4).fill(false).map(() => Array(4).fill(false)));
    const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
    const [isComplete, setIsAllComplete] = useState(false);
    const [hintsRemaining, setHintsRemaining] = useState(3);
    const [errors, setErrors] = useState<[number, number][]>([]);

    // Sudoku Çözücü (Oyun oluşturmak için)
    const solve = (board: CellValue[][], words: string[]): boolean => {
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                if (board[row][col] === null) {
                    const shuffledWords = [...words].sort(() => Math.random() - 0.5);
                    for (const word of shuffledWords) {
                        if (isValid(board, row, col, word)) {
                            board[row][col] = word;
                            if (solve(board, words)) return true;
                            board[row][col] = null;
                        }
                    }
                    return false;
                }
            }
        }
        return true;
    };

    const isValid = (board: CellValue[][], row: number, col: number, word: string) => {
        // Satır kontrolü
        for (let x = 0; x < 4; x++) if (board[row][x] === word) return false;
        // Sütun kontrolü
        for (let x = 0; x < 4; x++) if (board[x][col] === word) return false;
        // 2x2 Blok kontrolü
        const startRow = Math.floor(row / 2) * 2;
        const startCol = Math.floor(col / 2) * 2;
        for (let i = 0; i < 2; i++) {
            for (let j = 0; j < 2; j++) {
                if (board[startRow + i][startCol + j] === word) return false;
            }
        }
        return true;
    };

    const generateNewGame = useCallback(() => {
        const words = selectedGroup.words;
        const newGrid: CellValue[][] = Array(4).fill(null).map(() => Array(4).fill(null));
        solve(newGrid, words);

        const newInitial = Array(4).fill(false).map(() => Array(4).fill(false));
        const cellsToKeep = difficulty === 'easy' ? 8 : difficulty === 'medium' ? 6 : 4;
        
        const finalGrid: CellValue[][] = Array(4).fill(null).map(() => Array(4).fill(null));
        let count = 0;
        while (count < cellsToKeep) {
            const r = Math.floor(Math.random() * 4);
            const c = Math.floor(Math.random() * 4);
            if (finalGrid[r][c] === null) {
                finalGrid[r][c] = newGrid[r][c];
                newInitial[r][c] = true;
                count++;
            }
        }

        setGrid(finalGrid);
        setInitialCells(newInitial);
        setIsAllComplete(false);
        setHintsRemaining(3);
        setErrors([]);
    }, [difficulty, selectedGroup]);

    useEffect(() => {
        generateNewGame();
    }, [generateNewGame]);

    const handleCellClick = (row: number, col: number) => {
        if (initialCells[row][col] || isComplete) return;

        const words = selectedGroup.words;
        const currentVal = grid[row][col];
        const currentIndex = currentVal ? words.indexOf(currentVal) : -1;
        const nextIndex = (currentIndex + 1);
        
        const newGrid = [...grid.map(r => [...r])];
        newGrid[row][col] = nextIndex < words.length ? words[nextIndex] : null;
        
        setGrid(newGrid);
        checkErrors(newGrid);
        checkWin(newGrid);
    };

    const checkErrors = (currentGrid: CellValue[][]) => {
        const newErrors: [number, number][] = [];
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                const val = currentGrid[r][c];
                if (!val) continue;

                // Satır & Sütun çakışması
                for (let i = 0; i < 4; i++) {
                    if (i !== c && currentGrid[r][i] === val) newErrors.push([r, c]);
                    if (i !== r && currentGrid[i][c] === val) newErrors.push([r, c]);
                }

                // Blok çakışması
                const startRow = Math.floor(r / 2) * 2;
                const startCol = Math.floor(c / 2) * 2;
                for (let i = 0; i < 2; i++) {
                    for (let j = 0; j < 2; j++) {
                        const rr = startRow + i;
                        const cc = startCol + j;
                        if ((rr !== r || cc !== c) && currentGrid[rr][cc] === val) {
                            newErrors.push([r, c]);
                        }
                    }
                }
            }
        }
        setErrors(newErrors);
    };

    const checkWin = (currentGrid: CellValue[][]) => {
        const isFilled = currentGrid.every(row => row.every(cell => cell !== null));
        if (!isFilled) return;

        // Geçerlilik kontrolü
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                const val = currentGrid[r][c]!;
                // Satır
                if (currentGrid[r].filter(v => v === val).length > 1) return;
                // Sütun
                if (currentGrid.map(row => row[c]).filter(v => v === val).length > 1) return;
            }
        }

        setIsAllComplete(true);
        confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#4f46e5', '#10b981', '#f59e0b']
        });
        playSound('win');
    };

    const useHint = () => {
        if (hintsRemaining <= 0 || isComplete) return;

        // Boş veya hatalı bir hücre bul
        const emptyCells: [number, number][] = [];
        grid.forEach((row, r) => row.forEach((val, c) => {
            if (!initialCells[r][c] && (!val || errors.some(e => e[0] === r && e[1] === c))) {
                emptyCells.push([r, c]);
            }
        }));

        if (emptyCells.length === 0) return;

        const [r, c] = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        
        // Çözümü bulmak için geçici grid
        const solverGrid = [...grid.map(row => [...row])];
        if (solve(solverGrid, selectedGroup.words)) {
            const newGrid = [...grid.map(row => [...row])];
            newGrid[r][c] = solverGrid[r][c];
            setGrid(newGrid);
            setHintsRemaining(prev => prev - 1);
            checkErrors(newGrid);
            checkWin(newGrid);
            playSound('correct');
        }
    };

    const playSound = (type: 'correct' | 'win') => {
        try {
            const audio = new Audio(type === 'win' ? '/sounds/success.mp3' : '/sounds/pop.mp3');
            audio.volume = 0.3;
            audio.play().catch(() => {});
        } catch (e) {}
    };

    return (
        <Card className="bg-white/80 backdrop-blur-xl border border-white/60 shadow-2xl rounded-[3rem] overflow-hidden">
            <CardHeader className="bg-indigo-600 p-8 text-white relative">
                <div className="absolute top-0 left-0 w-full h-full bg-[url('/noise.png')] opacity-10 pointer-events-none" />
                <div className="flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
                    <div className="flex items-center gap-5">
                        <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-md">
                            <selectedGroup.icon className="h-10 w-10 text-white" />
                        </div>
                        <div>
                            <CardTitle className="text-3xl font-black tracking-tight uppercase">Kelime Sudoku</CardTitle>
                            <CardDescription className="text-indigo-100 font-medium text-base">Her satır, sütun ve 2x2'lik blokta kelimelerden sadece birer tane olmalı.</CardDescription>
                        </div>
                    </div>
                    <div className="flex bg-indigo-700/50 p-1.5 rounded-2xl border border-white/10">
                        {(['easy', 'medium', 'hard'] as const).map((d) => (
                            <Button
                                key={d}
                                variant="ghost"
                                size="sm"
                                onClick={() => setDifficulty(d)}
                                className={cn(
                                    "px-6 rounded-xl font-bold text-xs uppercase tracking-widest transition-all",
                                    difficulty === d ? "bg-white text-indigo-700 shadow-lg" : "text-white/60 hover:text-white hover:bg-white/10"
                                )}
                            >
                                {d === 'easy' ? 'Kolay' : d === 'medium' ? 'Orta' : 'Zor'}
                            </Button>
                        ))}
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-8 md:p-12">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                    
                    {/* SOL PANEL: KATEGORİLER */}
                    <div className="lg:col-span-3 space-y-4">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                            <List className="w-3 h-3" /> Kelime Grupları
                        </h3>
                        <div className="grid grid-cols-1 gap-2">
                            {WORD_GROUPS.map((group) => (
                                <button
                                    key={group.id}
                                    onClick={() => setSelectedGroup(group)}
                                    className={cn(
                                        "flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left group",
                                        selectedGroup.id === group.id 
                                            ? "bg-indigo-50 border-indigo-200 shadow-md translate-x-2" 
                                            : "bg-white border-slate-100 hover:border-indigo-100 text-slate-500"
                                    )}
                                >
                                    <div className={cn("p-2 rounded-xl transition-colors", selectedGroup.id === group.id ? "bg-indigo-600 text-white" : "bg-slate-100 group-hover:bg-indigo-50 group-hover:text-indigo-600")}>
                                        <group.icon className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={cn("font-bold text-sm", selectedGroup.id === group.id ? "text-indigo-900" : "text-slate-700")}>{group.name}</p>
                                        <p className="text-[10px] opacity-60 truncate">{group.words.join(', ')}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ORTA PANEL: SUDOKU GRID */}
                    <div className="lg:col-span-6 flex justify-center">
                        <div className="relative group">
                            {/* Parlama Efekti */}
                            <div className="absolute -inset-4 bg-indigo-500/10 rounded-[3.5rem] blur-2xl group-hover:bg-indigo-500/15 transition-all" />
                            
                            <div className="relative bg-slate-900 p-3 rounded-[2.5rem] shadow-2xl border-8 border-slate-800">
                                <div className="grid grid-cols-2 gap-2 bg-slate-800 p-2 rounded-2xl">
                                    {[0, 1, 2, 3].map((blockIdx) => {
                                        const startRow = Math.floor(blockIdx / 2) * 2;
                                        const startCol = (blockIdx % 2) * 2;
                                        
                                        return (
                                            <div key={blockIdx} className="grid grid-cols-2 gap-1.5 p-1.5 bg-slate-900/50 rounded-xl">
                                                {[0, 1, 2, 3].map((cellIdx) => {
                                                    const r = startRow + Math.floor(cellIdx / 2);
                                                    const c = startCol + (cellIdx % 2);
                                                    const isInitial = initialCells[r][c];
                                                    const isError = errors.some(e => e[0] === r && e[1] === c);
                                                    
                                                    return (
                                                        <button
                                                            key={`${r}-${c}`}
                                                            onClick={() => handleCellClick(r, c)}
                                                            className={cn(
                                                                "w-20 h-20 md:w-24 md:h-24 rounded-lg flex items-center justify-center text-xs md:text-sm font-black transition-all",
                                                                "border-2 border-slate-700/50 shadow-inner uppercase tracking-tighter",
                                                                isInitial 
                                                                    ? "bg-slate-800 text-indigo-300 border-indigo-500/30 cursor-default" 
                                                                    : grid[r][c] 
                                                                        ? (isError ? "bg-red-500/20 text-red-400 border-red-500/50 animate-shake-game" : "bg-white text-indigo-900 border-white shadow-xl scale-105 z-10") 
                                                                        : "bg-slate-950 text-slate-600 hover:bg-slate-800"
                                                            )}
                                                        >
                                                            {grid[r][c]}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SAĞ PANEL: KONTROLLER */}
                    <div className="lg:col-span-3 space-y-6">
                        <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 space-y-6 shadow-sm">
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-widest">
                                    <span>İpuçları</span>
                                    <span className="text-indigo-600">{hintsRemaining} Kaldı</span>
                                </div>
                                <div className="flex gap-1">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className={cn("h-1.5 flex-1 rounded-full transition-colors", i <= hintsRemaining ? "bg-indigo-500" : "bg-slate-200")} />
                                    ))}
                                </div>
                            </div>

                            <Button 
                                onClick={useHint} 
                                disabled={hintsRemaining <= 0 || isComplete}
                                variant="outline"
                                className="w-full h-14 bg-white hover:bg-indigo-50 border-2 border-indigo-100 text-indigo-700 rounded-2xl shadow-sm gap-3 group"
                            >
                                <Lightbulb className={cn("w-6 h-6 transition-transform group-hover:scale-110", hintsRemaining > 0 ? "text-yellow-500" : "text-slate-400")} />
                                <div className="text-left">
                                    <p className="font-black text-sm leading-none">İpucu Al</p>
                                    <p className="text-[10px] text-slate-500 mt-1">Otomatik doldurur</p>
                                </div>
                            </Button>

                            <Button 
                                onClick={generateNewGame}
                                className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-lg shadow-indigo-200 gap-3 group"
                            >
                                <RefreshCw className="w-6 h-6 group-hover:rotate-180 transition-transform duration-500" />
                                <div className="text-left">
                                    <p className="font-black text-sm leading-none">Yeni Oyun</p>
                                    <p className="text-[10px] text-indigo-200 mt-1">Haritayı sıfırla</p>
                                </div>
                            </Button>

                            <Separator className="bg-slate-200" />

                            <Button 
                                variant="ghost" 
                                onClick={generateNewGame}
                                className="w-full h-12 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl text-xs font-bold"
                            >
                                <Trash2 className="w-4 h-4 mr-2" /> Temizle ve Baştan Başla
                            </Button>
                        </div>

                        {/* OYUN BİLGİSİ */}
                        <div className="p-5 bg-indigo-900 rounded-[2rem] text-white shadow-xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform">
                                <Trophy className="w-20 h-20" />
                            </div>
                            <h4 className="font-black uppercase text-xs tracking-widest opacity-60 mb-3">Oyun Durumu</h4>
                            <div className="space-y-3 relative z-10">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Hatalı Hücre:</span>
                                    <Badge variant="destructive" className="font-mono">{errors.length}</Badge>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Kalan Boşluk:</span>
                                    <span className="font-black text-lg">
                                        {grid.flat().filter(v => v === null).length}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>

            {/* BAŞARI EKRANI OVERLAY */}
            {isComplete && (
                <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-indigo-950/80 backdrop-blur-md animate-in fade-in duration-500">
                    <div className="max-w-md w-full bg-white rounded-[3rem] p-10 text-center shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 via-cyan-500 to-indigo-600" />
                        
                        <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Trophy className="w-12 h-12 animate-bounce" />
                        </div>
                        
                        <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter mb-4">Harika!</h2>
                        <p className="text-slate-500 font-medium text-lg mb-8 leading-relaxed">
                            "{selectedGroup.name}" Sudokusunu başarıyla tamamladınız. Zihniniz pırıl pırıl!
                        </p>

                        <div className="flex flex-col gap-3">
                            <Button 
                                onClick={generateNewGame} 
                                className="w-full h-16 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-lg font-black shadow-xl"
                            >
                                <RefreshCw className="mr-3 h-6 w-6" /> TEKRAR OYNA
                            </Button>
                            <Button asChild variant="ghost" className="text-slate-400 font-bold">
                                <Link href="/extra">ANA DİZİNE DÖN</Link>
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function Separator({ className }: { className?: string }) {
    return <div className={cn("h-px w-full bg-slate-200", className)} />;
}
