'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
    RefreshCw, Lightbulb, Trophy, AlertCircle, 
    CheckCircle2, HelpCircle, Sparkles, Brain, RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';

// Kelime Sudoku Ayarları
const WORDS = ["SEVGİ", "SAYGI", "SABIR", "İHLAS"];
const GRID_SIZE = 4;

type Difficulty = 'easy' | 'medium' | 'hard';

export function WordSudoku() {
    const [grid, setGrid] = useState<(string | null)[][]>(Array(4).fill(null).map(() => Array(4).fill(null)));
    const [initialIndices, setInitialIndices] = useState<Set<string>>(new Set());
    const [difficulty, setDifficulty] = useState<Difficulty>('easy');
    const [hintsLeft, setHintsLeft] = useState(3);
    const [isSolved, setIsAllSolved] = useState(false);
    const [errors, setErrors] = useState<Set<string>>(new Set());

    // Geçerli bir sudoku tahtası oluşturur
    const generatePuzzle = useCallback((diff: Difficulty) => {
        // Basit bir 4x4 latin kare şablonu
        const base = [
            [0, 1, 2, 3],
            [2, 3, 0, 1],
            [1, 0, 3, 2],
            [3, 2, 1, 0]
        ];

        // Satır ve sütunları rastgele karıştır (Sudoku kurallarını bozmaz)
        const shuffle = (arr: number[]) => [...arr].sort(() => Math.random() - 0.5);
        const rowOrder = shuffle([0, 1, 2, 3]);
        const colOrder = shuffle([0, 1, 2, 3]);
        const wordOrder = shuffle([0, 1, 2, 3]);

        const fullGrid = Array(4).fill(null).map((_, r) => 
            Array(4).fill(null).map((_, c) => WORDS[wordOrder[base[rowOrder[r]][colOrder[c]]]])
        );

        // Zorluğa göre hücreleri gizle
        const newGrid = fullGrid.map(row => [...row]);
        const newInitialIndices = new Set<string>();
        const visibleCount = diff === 'easy' ? 8 : diff === 'medium' ? 6 : 4;
        
        const positions = [];
        for(let r=0; r<4; r++) for(let c=0; c<4; c++) positions.push([r, c]);
        const shuffledPos = positions.sort(() => Math.random() - 0.5);

        for(let i=0; i<16; i++) {
            const [r, c] = shuffledPos[i];
            if (i < visibleCount) {
                newInitialIndices.add(`${r}-${c}`);
            } else {
                (newGrid[r] as any)[c] = null;
            }
        }

        setGrid(newGrid);
        setInitialIndices(newInitialIndices);
        setHintsLeft(3);
        setIsAllSolved(false);
        setErrors(new Set());
    }, []);

    useEffect(() => {
        generatePuzzle(difficulty);
    }, [difficulty, generatePuzzle]);

    const checkSolution = () => {
        const newErrors = new Set<string>();
        let complete = true;

        for(let r=0; r<4; r++) {
            for(let c=0; c<4; c++) {
                const val = grid[r][c];
                if (!val) {
                    complete = false;
                    continue;
                }
                
                // Satır kontrolü
                for(let i=0; i<4; i++) if(i !== c && grid[r][i] === val) newErrors.add(`${r}-${c}`);
                // Sütun kontrolü
                for(let i=0; i<4; i++) if(i !== r && grid[i][c] === val) newErrors.add(`${r}-${c}`);
                // 2x2 Blok kontrolü
                const startR = Math.floor(r/2)*2;
                const startC = Math.floor(c/2)*2;
                for(let i=startR; i<startR+2; i++) {
                    for(let j=startC; j<startC+2; j++) {
                        if((i !== r || j !== c) && grid[i][j] === val) newErrors.add(`${r}-${c}`);
                    }
                }
            }
        }

        setErrors(newErrors);
        if (complete && newErrors.size === 0) {
            setIsAllSolved(true);
            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#4f46e5', '#10b981', '#f59e0b']
            });
        }
    };

    const handleCellClick = (r: number, c: number) => {
        if (initialIndices.has(`${r}-${c}`) || isSolved) return;

        const currentVal = grid[r][c];
        const currentIndex = currentVal ? WORDS.indexOf(currentVal) : -1;
        const nextIndex = (currentIndex + 1);
        
        const newGrid = [...grid];
        newGrid[r][c] = nextIndex < WORDS.length ? WORDS[nextIndex] : null;
        setGrid(newGrid);
        
        // Hata varsa temizle ve yeniden kontrol et
        if (errors.has(`${r}-${c}`)) {
            const nextErrors = new Set(errors);
            nextErrors.delete(`${r}-${c}`);
            setErrors(nextErrors);
        }
    };

    return (
        <Card className="bg-white/80 backdrop-blur-xl border border-white/60 shadow-2xl rounded-[3rem] overflow-hidden animate-in fade-in zoom-in duration-500">
            <CardHeader className="bg-indigo-600 p-8 text-white relative">
                <div className="absolute top-0 left-0 w-full h-full bg-[url('/noise.png')] opacity-10 pointer-events-none" />
                <div className="flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                            <Brain className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <CardTitle className="text-3xl font-black tracking-tight uppercase">Kelime Sudoku</CardTitle>
                            <CardDescription className="text-indigo-100 font-medium">Satır, sütun ve 2x2 bloklarda her kelime bir kez olmalı.</CardDescription>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 bg-black/20 p-1.5 rounded-2xl border border-white/10">
                        {(['easy', 'medium', 'hard'] as const).map((d) => (
                            <Button 
                                key={d}
                                variant="ghost" 
                                size="sm"
                                onClick={() => setDifficulty(d)}
                                className={cn(
                                    "rounded-xl px-4 font-bold text-[10px] uppercase tracking-widest h-9 transition-all",
                                    difficulty === d ? "bg-white text-indigo-600 shadow-lg" : "text-white/60 hover:text-white hover:bg-white/10"
                                )}
                            >
                                {d === 'easy' ? 'Kolay' : d === 'medium' ? 'Orta' : 'Zor'}
                            </Button>
                        ))}
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-8 md:p-12 flex flex-col lg:flex-row items-center justify-center gap-12">
                {/* SUDOKU GRID */}
                <div className="relative group">
                    <div className="absolute -inset-4 bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 blur-2xl rounded-[4rem] group-hover:opacity-100 transition-opacity opacity-0" />
                    <div className="grid grid-cols-4 gap-2 bg-slate-200 p-2 rounded-[2rem] shadow-inner relative z-10">
                        {grid.map((row, r) => (
                            row.map((cell, c) => {
                                const isInitial = initialIndices.has(`${r}-${c}`);
                                const hasError = errors.has(`${r}-${c}`);
                                const isRightBorder = c === 1;
                                const isBottomBorder = r === 1;

                                return (
                                    <div 
                                        key={`${r}-${c}`}
                                        onClick={() => handleCellClick(r, c)}
                                        className={cn(
                                            "w-16 h-16 sm:w-24 sm:h-24 flex items-center justify-center rounded-2xl text-[10px] sm:text-xs font-black transition-all duration-300 cursor-pointer select-none border-2",
                                            isInitial 
                                                ? "bg-slate-100 border-slate-300 text-slate-400 cursor-not-allowed" 
                                                : cell 
                                                    ? "bg-white border-white shadow-md text-indigo-600 scale-100 hover:scale-105 active:scale-95" 
                                                    : "bg-slate-50/50 border-dashed border-slate-300 hover:bg-white",
                                            hasError && "bg-red-50 border-red-500 text-red-600 animate-shake-game",
                                            isSolved && "bg-emerald-50 border-emerald-500 text-emerald-600",
                                            isRightBorder && "mr-1",
                                            isBottomBorder && "mb-1"
                                        )}
                                    >
                                        <span className="drop-shadow-sm">{cell || ""}</span>
                                    </div>
                                )
                            })
                        ))}
                    </div>
                </div>

                {/* KONTROLLER & BİLGİ */}
                <div className="flex flex-col gap-6 w-full max-w-sm">
                    {isSolved ? (
                        <div className="bg-emerald-50 border-2 border-emerald-200 rounded-[2rem] p-8 text-center space-y-4 animate-in zoom-in-95 duration-500">
                            <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-200">
                                <Trophy className="w-8 h-8 text-white" />
                            </div>
                            <h3 className="text-2xl font-black text-emerald-900 uppercase">TEBRİKLER!</h3>
                            <p className="text-emerald-700 font-medium">Zekan ve dikkatinle bulmacayı kusursuzca çözdün.</p>
                            <Button onClick={() => generatePuzzle(difficulty)} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-12 font-bold uppercase tracking-widest">YENİ BULMACA</Button>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-center">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Kelimeler</span>
                                    <div className="flex flex-wrap justify-center gap-1">
                                        {WORDS.map(w => <Badge key={w} variant="outline" className="text-[8px] border-indigo-100 bg-white">{w}</Badge>)}
                                    </div>
                                </div>
                                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-center">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">İpucu</span>
                                    <div className="flex justify-center gap-1">
                                        {Array.from({length: 3}).map((_, i) => (
                                            <Lightbulb key={i} className={cn("w-4 h-4", i < hintsLeft ? "text-amber-500 fill-amber-500" : "text-slate-200")} />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3 pt-4 border-t border-slate-100">
                                <Button 
                                    onClick={checkSolution}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-14 rounded-2xl text-lg font-black shadow-xl shadow-indigo-200 transition-all hover:-translate-y-1 active:translate-y-0"
                                >
                                    <CheckCircle2 className="mr-2 h-6 w-6" /> KONTROL ET
                                </Button>
                                <div className="grid grid-cols-2 gap-3">
                                    <Button variant="outline" onClick={() => generatePuzzle(difficulty)} className="rounded-xl h-12 border-slate-200 text-slate-600 font-bold">
                                        <RotateCcw className="mr-2 h-4 w-4" /> SIFIRLA
                                    </Button>
                                    <Button variant="outline" onClick={() => {
                                        if (hintsLeft > 0) {
                                            toast({ title: "Gelecek Özellik", description: "İpucu sistemi bir sonraki güncellemede eklenecek!" });
                                        }
                                    }} className="rounded-xl h-12 border-slate-200 text-slate-600 font-bold">
                                        <HelpCircle className="mr-2 h-4 w-4" /> YARDIM
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </CardContent>

            <CardFooter className="bg-slate-50/50 p-4 flex justify-center border-t border-slate-100">
                 <div className="flex items-center gap-2 text-slate-400">
                    <Sparkles className="w-3 h-3" />
                    <span className="text-[9px] font-bold uppercase tracking-[0.2em]">Din Dersi Atölyesi Zeka Köşesi</span>
                 </div>
            </CardFooter>
        </Card>
    );
}
