'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    RefreshCw, Lightbulb, Trophy, BrainCircuit, 
    CheckCircle2, AlertCircle, Sparkles, Star, ChevronRight, Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { playSound } from '@/lib/audio-service';
import confetti from 'canvas-confetti';

// --- KELİME GRUPLARI ---
const WORD_SETS = [
    { id: 'values', name: 'Değerler', words: ["SEVGİ", "SAYGI", "SABIR", "İHLAS"], icon: <Star className="w-4 h-4" /> },
    { id: 'worship', name: 'İbadetler', words: ["NAMAZ", "ORUÇ", "HAC", "ZEKAT"], icon: <CheckCircle2 className="w-4 h-4" /> },
    { id: 'concepts', name: 'Kavramlar', words: ["İMAN", "İSLAM", "İHSAN", "TEVHİD"], icon: <BrainCircuit className="w-4 h-4" /> },
    { id: 'virtues', name: 'Ahlak', words: ["ADALET", "DOĞRU", "ŞEFKAT", "EDEP"], icon: <Sparkles className="w-4 h-4" /> },
];

type Difficulty = 'easy' | 'medium' | 'hard';

export function WordSudoku() {
    const [selectedSetIndex, setSelectedSetIndex] = useState(0);
    const [difficulty, setDifficulty] = useState<Difficulty>('easy');
    const [grid, setGrid] = useState<(string | null)[][]>(Array(4).fill(null).map(() => Array(4).fill(null)));
    const [initialGrid, setInitialGrid] = useState<boolean[][]>(Array(4).fill(false).map(() => Array(4).fill(false)));
    const [isSolved, setIsSolved] = useState(false);
    const [hintsLeft, setHintsLeft] = useState(3);
    const [invalidCells, setInvalidCells] = useState<[number, number][]>([]);

    const activeSet = WORD_SETS[selectedSetIndex];
    const words = activeSet.words;

    // --- SUDOKU MANTIĞI ---
    const isValid = useCallback((grid: (string | null)[][], row: number, col: number, word: string) => {
        // Satır kontrolü
        for (let x = 0; x < 4; x++) if (grid[row][x] === word) return false;
        // Sütun kontrolü
        for (let x = 0; x < 4; x++) if (grid[x][col] === word) return false;
        // 2x2 Blok kontrolü
        const startRow = Math.floor(row / 2) * 2;
        const startCol = Math.floor(col / 2) * 2;
        for (let i = 0; i < 2; i++) {
            for (let j = 0; j < 2; j++) {
                if (grid[startRow + i][startCol + j] === word) return false;
            }
        }
        return true;
    }, []);

    const solveSudoku = useCallback((grid: (string | null)[][]): boolean => {
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                if (grid[row][col] === null) {
                    const shuffledWords = [...words].sort(() => Math.random() - 0.5);
                    for (const word of shuffledWords) {
                        if (isValid(grid, row, col, word)) {
                            grid[row][col] = word;
                            if (solveSudoku(grid)) return true;
                            grid[row][col] = null;
                        }
                    }
                    return false;
                }
            }
        }
        return true;
    }, [words, isValid]);

    const generatePuzzle = useCallback(() => {
        const newGrid = Array(4).fill(null).map(() => Array(4).fill(null));
        solveSudoku(newGrid);
        
        const filledCount = difficulty === 'easy' ? 8 : difficulty === 'medium' ? 6 : 4;
        const puzzleGrid = Array(4).fill(null).map(() => Array(4).fill(null));
        const initialMask = Array(4).fill(false).map(() => Array(4).fill(false));
        
        let count = 0;
        while (count < filledCount) {
            const r = Math.floor(Math.random() * 4);
            const c = Math.floor(Math.random() * 4);
            if (puzzleGrid[r][c] === null) {
                puzzleGrid[r][c] = newGrid[r][c];
                initialMask[r][c] = true;
                count++;
            }
        }
        
        setGrid(puzzleGrid);
        setInitialGrid(initialMask);
        setIsSolved(false);
        setHintsLeft(3);
        setInvalidCells([]);
    }, [difficulty, solveSudoku]);

    useEffect(() => {
        generatePuzzle();
    }, [generatePuzzle, selectedSetIndex]);

    const handleCellClick = (r: number, c: number) => {
        if (initialGrid[r][c] || isSolved) return;

        const currentWord = grid[r][c];
        const currentIndex = currentWord ? words.indexOf(currentWord) : -1;
        const nextIndex = (currentIndex + 1);
        
        const newGrid = grid.map(row => [...row]);
        if (nextIndex < words.length) {
            newGrid[r][c] = words[nextIndex];
        } else {
            newGrid[r][c] = null;
        }
        
        setGrid(newGrid);
        checkBoard(newGrid);
    };

    const checkBoard = (currentGrid: (string | null)[][]) => {
        const invalids: [number, number][] = [];
        let allFilled = true;

        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                const val = currentGrid[r][c];
                if (!val) {
                    allFilled = false;
                    continue;
                }
                // Kendisi hariç kontrol et
                const temp = currentGrid[r][c];
                currentGrid[r][c] = null;
                if (!isValid(currentGrid, r, c, temp!)) {
                    invalids.push([r, c]);
                }
                currentGrid[r][c] = temp;
            }
        }

        setInvalidCells(invalids);

        if (allFilled && invalids.length === 0) {
            setIsSolved(true);
            playSound('win');
            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#4f46e5', '#10b981', '#f59e0b']
            });
        }
    };

    const getHint = () => {
        if (hintsLeft <= 0 || isSolved) return;

        const emptyCells: [number, number][] = [];
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                if (grid[r][c] === null) emptyCells.push([r, c]);
            }
        }

        if (emptyCells.length === 0) return;

        // Çözümü bul (basitçe her boş hücre için geçerli olanı deniyoruz)
        const solved = grid.map(row => [...row]);
        if (solveSudoku(solved)) {
            const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            const [r, c] = randomCell;
            const newGrid = grid.map(row => [...row]);
            newGrid[r][c] = solved[r][c];
            setGrid(newGrid);
            setHintsLeft(prev => prev - 1);
            checkBoard(newGrid);
            playSound('pop');
        }
    };

    return (
        <Card className="bg-white/80 backdrop-blur-xl border border-white/60 shadow-2xl rounded-[3rem] overflow-hidden">
            <CardHeader className="bg-indigo-600 p-8 text-white relative">
                <div className="absolute top-0 left-0 w-full h-full bg-[url('/noise.png')] opacity-10 pointer-events-none" />
                <div className="flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md border border-white/30">
                            <BrainCircuit className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <CardTitle className="text-3xl font-black tracking-tight uppercase">Kelime Sudoku</CardTitle>
                            <CardDescription className="text-indigo-100 font-medium">Satır, sütun ve bloklarda her kelimeyi bir kez kullan!</CardDescription>
                        </div>
                    </div>
                    
                    <div className="flex flex-wrap justify-center gap-3">
                        <div className="bg-white/10 p-1 rounded-xl border border-white/20 flex">
                            {(['easy', 'medium', 'hard'] as const).map((d) => (
                                <button
                                    key={d}
                                    onClick={() => setDifficulty(d)}
                                    className={cn(
                                        "px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
                                        difficulty === d ? "bg-white text-indigo-600 shadow-lg" : "text-white/60 hover:text-white"
                                    )}
                                >
                                    {d === 'easy' ? 'Kolay' : d === 'medium' ? 'Orta' : 'Zor'}
                                </button>
                            ))}
                        </div>
                        <Button variant="outline" size="sm" onClick={generatePuzzle} className="bg-white/10 border-white/30 text-white hover:bg-white/20 rounded-xl font-bold">
                            <RefreshCw className="w-4 h-4 mr-2" /> Yenile
                        </Button>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-8 lg:p-12">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                    
                    {/* SOL: Kelime Grubu Seçimi */}
                    <div className="lg:col-span-3 space-y-4">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Kelime Grupları</h3>
                        <div className="grid grid-cols-1 gap-2">
                            {WORD_SETS.map((set, idx) => (
                                <button
                                    key={set.id}
                                    onClick={() => setSelectedSetIndex(idx)}
                                    className={cn(
                                        "flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left group",
                                        selectedSetIndex === idx 
                                            ? "bg-indigo-50 border-indigo-500 shadow-md translate-x-1" 
                                            : "bg-white border-slate-100 hover:border-indigo-200 text-slate-500"
                                    )}
                                >
                                    <div className={cn(
                                        "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                                        selectedSetIndex === idx ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600"
                                    )}>
                                        {set.icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={cn("font-bold text-sm", selectedSetIndex === idx ? "text-indigo-900" : "text-slate-700")}>{set.name}</p>
                                        <p className="text-[10px] opacity-60 truncate">{set.words.join(', ')}</p>
                                    </div>
                                    {selectedSetIndex === idx && <ChevronRight className="w-4 h-4 text-indigo-400" />}
                                </button>
                            ))}
                        </div>

                        <div className="mt-8 p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                            <div className="flex items-center gap-2 mb-3">
                                <Lightbulb className="w-4 h-4 text-amber-500" />
                                <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Nasıl Oynanır?</span>
                            </div>
                            <ul className="text-xs text-slate-500 space-y-3 font-medium leading-relaxed">
                                <li className="flex gap-2"><div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1 shrink-0" /> Boş hücrelere tıklayarak kelime yerleştir.</li>
                                <li className="flex gap-2"><div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1 shrink-0" /> Her satırda, her sütunda ve her 2x2'lik blokta kelimeler sadece bir kez bulunmalı.</li>
                                <li className="flex gap-2"><div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1 shrink-0" /> Hatalı yerleşimler kırmızı ile gösterilir.</li>
                            </ul>
                        </div>
                    </div>

                    {/* ORTA: Sudoku Izgarası */}
                    <div className="lg:col-span-6 flex flex-col items-center gap-8">
                        <div className="relative p-3 bg-slate-900 rounded-[2.5rem] shadow-2xl shadow-indigo-900/20">
                            <div className="grid grid-cols-4 gap-2 bg-slate-800 p-2 rounded-2xl border-4 border-slate-800">
                                {grid.map((row, rIdx) => (
                                    row.map((cell, cIdx) => {
                                        const isInitial = initialGrid[rIdx][cIdx];
                                        const isInvalid = invalidCells.some(([ir, ic]) => ir === rIdx && ic === cIdx);
                                        
                                        // Blok Sınırları Tasarımı
                                        const isBlockRight = cIdx === 1;
                                        const isBlockBottom = rIdx === 1;

                                        return (
                                            <button
                                                key={`${rIdx}-${cIdx}`}
                                                onClick={() => handleCellClick(rIdx, cIdx)}
                                                className={cn(
                                                    "w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-xl flex items-center justify-center text-[10px] sm:text-xs font-black transition-all duration-300 relative",
                                                    isInitial 
                                                        ? "bg-slate-700 text-white cursor-default" 
                                                        : "bg-white text-indigo-600 hover:bg-indigo-50 shadow-inner",
                                                    isInvalid && !isInitial && "bg-red-50 text-red-600 animate-shake-game",
                                                    isSolved && "bg-emerald-50 text-emerald-600 border-emerald-200",
                                                    // Blok Aralarını Belirginleştir
                                                    isBlockRight && "mr-2",
                                                    isBlockBottom && "mb-2"
                                                )}
                                            >
                                                <span className="uppercase tracking-tighter leading-none text-center px-1">
                                                    {cell || ""}
                                                </span>
                                                {isInitial && <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-white/20 rounded-full" />}
                                            </button>
                                        );
                                    })
                                ))}
                            </div>
                        </div>

                        {isSolved && (
                            <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-500">
                                <div className="bg-emerald-100 text-emerald-700 px-8 py-3 rounded-full flex items-center gap-3 font-black uppercase tracking-widest shadow-lg border-2 border-emerald-200">
                                    <Trophy className="w-6 h-6 animate-bounce" /> Harika! Bulmaca Çözüldü
                                </div>
                                <Button onClick={generatePuzzle} size="lg" className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl px-10 h-14 font-black text-lg shadow-xl shadow-indigo-900/20">
                                    YENİ BULMACA
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* SAĞ: Araçlar ve Durum */}
                    <div className="lg:col-span-3 space-y-6">
                        <div className="bg-indigo-50 rounded-[2rem] p-6 border border-indigo-100">
                            <div className="flex items-center justify-between mb-6">
                                <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest">Yardımcı Araçlar</h4>
                                <Badge variant="outline" className="bg-white border-indigo-200 text-indigo-600 font-black">{hintsLeft} İPUCU</Badge>
                            </div>
                            
                            <Button 
                                onClick={getHint} 
                                disabled={hintsLeft <= 0 || isSolved}
                                className="w-full h-14 bg-white hover:bg-white text-indigo-600 border-2 border-indigo-200 rounded-2xl shadow-sm hover:shadow-md transition-all group disabled:opacity-50"
                            >
                                <Lightbulb className={cn("w-5 h-5 mr-3 transition-transform group-hover:scale-110", hintsLeft > 0 ? "text-amber-500" : "text-slate-300")} />
                                <span className="font-bold">Bir Hücreyi Doldur</span>
                            </Button>

                            <Button 
                                variant="ghost" 
                                onClick={() => {
                                    const emptyGrid = grid.map((row, r) => row.map((cell, c) => initialGrid[r][c] ? cell : null));
                                    setGrid(emptyGrid);
                                    setInvalidCells([]);
                                    setIsSolved(false);
                                }}
                                className="w-full h-12 mt-3 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-100/50 rounded-xl text-xs font-bold"
                            >
                                <Trash2 className="w-4 h-4 mr-2" /> Temizle ve Baştan Başla
                            </Button>
                        </div>

                        <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                             <div className="flex items-center gap-2 mb-4">
                                <Layers className="w-4 h-4 text-indigo-400" />
                                <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Aktif Kelimeler</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {words.map(w => (
                                    <Badge key={w} className="bg-white border-slate-200 text-slate-700 font-bold px-3 py-1 text-[10px] uppercase shadow-sm">
                                        {w}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>

            <CardFooter className="bg-slate-50/50 p-6 border-t border-slate-100 flex justify-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Zeka Köşesi - Akıl Oyunları Serisi</p>
            </CardFooter>
        </Card>
    );
}