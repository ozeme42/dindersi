'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
    Trophy, RefreshCw, HelpCircle, CheckCircle2, 
    AlertCircle, Sparkles, BrainCircuit, Lightbulb, 
    RotateCcw, Info
} from 'lucide-react';
import { playSound } from '@/lib/audio-service';
import { Badge } from '@/components/ui/badge';

const WORDS = ['SAYGI', 'SEVGİ', 'SABIR', 'İHLAS'];

// 4x4 Sudoku Desenleri
const PATTERNS = [
    [
        [0, 1, 2, 3],
        [2, 3, 0, 1],
        [1, 0, 3, 2],
        [3, 2, 1, 0]
    ],
    [
        [3, 0, 1, 2],
        [1, 2, 3, 0],
        [0, 3, 2, 1],
        [2, 1, 0, 3]
    ]
];

type Difficulty = 'easy' | 'medium' | 'hard';

export function WordSudoku() {
    const [grid, setGrid] = useState<(number | null)[][]>([]);
    const [initialGrid, setInitialGrid] = useState<boolean[][]>([]);
    const [solution, setSetSolution] = useState<number[][]>([]);
    const [difficulty, setDifficulty] = useState<Difficulty>('easy');
    const [status, setStatus] = useState<'playing' | 'checking' | 'solved' | 'error'>('playing');
    const [hintsRemaining, setHintsRemaining] = useState(3);
    const [showErrors, setShowErrors] = useState(false);

    // Yeni oyun başlatma
    const generateNewGame = useCallback((level: Difficulty = difficulty) => {
        // Rastgele bir desen seç
        const basePattern = PATTERNS[Math.floor(Math.random() * PATTERNS.length)];
        
        // Kelimeleri karıştır
        const shuffledWordIndices = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
        
        // Çözümü oluştur
        const newSolution = basePattern.map(row => row.map(cell => shuffledWordIndices[cell]));
        setSetSolution(newSolution);

        // Zorluğa göre hücreleri boşalt
        const prefilledCount = level === 'easy' ? 8 : level === 'medium' ? 6 : 4;
        const newGrid: (number | null)[][] = newSolution.map(row => [...row].map(() => null));
        const newInitialGrid: boolean[][] = newSolution.map(row => [...row].map(() => false));
        
        let filled = 0;
        while (filled < prefilledCount) {
            const r = Math.floor(Math.random() * 4);
            const c = Math.floor(Math.random() * 4);
            if (newGrid[r][c] === null) {
                newGrid[r][c] = newSolution[r][c];
                newInitialGrid[r][c] = true;
                filled++;
            }
        }

        setGrid(newGrid);
        setInitialGrid(newInitialGrid);
        setStatus('playing');
        setHintsRemaining(3);
        setShowErrors(false);
        playSound('start');
    }, [difficulty]);

    useEffect(() => {
        generateNewGame();
    }, [generateNewGame]);

    const handleCellClick = (r: number, c: number) => {
        if (initialGrid[r][c] || status === 'solved') return;

        const nextGrid = grid.map(row => [...row]);
        const currentValue = nextGrid[r][c];
        
        // 0 -> 1 -> 2 -> 3 -> null döngüsü
        if (currentValue === null) nextGrid[r][c] = 0;
        else if (currentValue === 3) nextGrid[r][c] = null;
        else nextGrid[r][c] = currentValue + 1;

        setGrid(nextGrid);
        playSound('pop');
    };

    const checkSolution = () => {
        const isComplete = grid.every(row => row.every(cell => cell !== null));
        if (!isComplete) {
            toast({ title: "Eksik Kareler", description: "Lütfen tüm boşlukları doldurun.", variant: "destructive" });
            return;
        }

        const isCorrect = grid.every((row, r) => row.every((cell, c) => cell === solution[r][c]));

        if (isCorrect) {
            setStatus('solved');
            playSound('win');
        } else {
            setStatus('error');
            setShowErrors(true);
            playSound('incorrect');
            setTimeout(() => setStatus('playing'), 2000);
        }
    };

    const useHint = () => {
        if (hintsRemaining <= 0 || status === 'solved') return;

        // Rastgele boş veya yanlış bir kare bul
        const targets: {r: number, c: number}[] = [];
        grid.forEach((row, r) => row.forEach((cell, c) => {
            if (!initialGrid[r][c] && cell !== solution[r][c]) {
                targets.push({r, c});
            }
        }));

        if (targets.length > 0) {
            const random = targets[Math.floor(Math.random() * targets.length)];
            const nextGrid = grid.map(row => [...row]);
            nextGrid[random.r][random.c] = solution[random.r][random.c];
            setGrid(nextGrid);
            setHintsRemaining(prev => prev - 1);
            playSound('hint');
        }
    };

    const isCellInvalid = (r: number, c: number) => {
        if (!showErrors || initialGrid[r][c] || grid[r][c] === null) return false;
        return grid[r][c] !== solution[r][c];
    };

    return (
        <Card className="bg-white/80 backdrop-blur-xl border border-white/60 shadow-2xl rounded-[3rem] overflow-hidden">
            <CardHeader className="bg-indigo-600 p-8 text-white relative">
                <div className="absolute top-0 left-0 w-full h-full bg-[url('/noise.png')] opacity-10 pointer-events-none" />
                <div className="flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                            <BrainCircuit className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <CardTitle className="text-3xl font-black uppercase tracking-tighter">Kelime Sudoku</CardTitle>
                            <CardDescription className="text-indigo-100 font-medium">Değerlerimizi sütun ve satırlara doğru yerleştir.</CardDescription>
                        </div>
                    </div>
                    
                    <div className="flex bg-indigo-800/50 p-1.5 rounded-2xl border border-white/10">
                        {(['easy', 'medium', 'hard'] as Difficulty[]).map((level) => (
                            <button
                                key={level}
                                onClick={() => { setDifficulty(level); generateNewGame(level); }}
                                className={cn(
                                    "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                    difficulty === level ? "bg-white text-indigo-600 shadow-lg" : "text-indigo-200 hover:text-white"
                                )}
                            >
                                {level === 'easy' ? 'Kolay' : level === 'medium' ? 'Orta' : 'Zor'}
                            </button>
                        ))}
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-8 md:p-12">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                    
                    {/* SUDOKU GRID */}
                    <div className="lg:col-span-7 flex justify-center">
                        <div className="grid grid-cols-4 gap-2 md:gap-3 p-3 bg-slate-100 rounded-[2rem] border-4 border-slate-200 shadow-inner w-full max-w-[450px] aspect-square">
                            {grid.map((row, r) => row.map((cell, c) => (
                                <button
                                    key={`${r}-${c}`}
                                    onClick={() => handleCellClick(r, c)}
                                    className={cn(
                                        "relative rounded-2xl flex items-center justify-center transition-all duration-300 font-black text-[10px] md:text-sm select-none border-b-4 active:border-b-0 active:translate-y-1",
                                        initialGrid[r][c] 
                                            ? "bg-slate-800 border-slate-900 text-white cursor-not-allowed shadow-md" 
                                            : cell === null
                                                ? "bg-white border-slate-200 text-transparent hover:bg-indigo-50"
                                                : isCellInvalid(r, c)
                                                    ? "bg-red-500 border-red-700 text-white animate-shake-game"
                                                    : "bg-indigo-500 border-indigo-700 text-white shadow-lg",
                                        status === 'solved' && "bg-emerald-500 border-emerald-700 pointer-events-none"
                                    )}
                                >
                                    {cell !== null ? WORDS[cell] : ''}
                                    
                                    {/* Bölge Çizgileri (4x4 Sudoku için orta bölücüler) */}
                                    {c === 1 && <div className="absolute -right-2 top-0 bottom-0 w-1 bg-slate-300 pointer-events-none hidden" />}
                                    {r === 1 && <div className="absolute -bottom-2 left-0 right-0 h-1 bg-slate-300 pointer-events-none hidden" />}
                                </button>
                            )))}
                        </div>
                    </div>

                    {/* CONTROLS & INFO */}
                    <div className="lg:col-span-5 space-y-8">
                        <div className="space-y-4">
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Info className="w-4 h-4" /> Kurallar
                            </h4>
                            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-3">
                                <p className="text-sm text-slate-600 font-medium leading-relaxed">
                                    <span className="text-indigo-600 font-bold">•</span> Her satırda her kelime <strong>yalnızca 1 kez</strong> bulunmalıdır.
                                </p>
                                <p className="text-sm text-slate-600 font-medium leading-relaxed">
                                    <span className="text-indigo-600 font-bold">•</span> Her sütunda her kelime <strong>yalnızca 1 kez</strong> bulunmalıdır.
                                </p>
                                <p className="text-sm text-slate-600 font-medium leading-relaxed">
                                    <span className="text-indigo-600 font-bold">•</span> Boş karelere tıklayarak kelimeleri değiştirin.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            {status === 'solved' ? (
                                <div className="bg-emerald-50 border-2 border-emerald-200 p-6 rounded-[2rem] text-center animate-pop-in">
                                    <Trophy className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                                    <h3 className="text-2xl font-black text-emerald-700 uppercase">Tebrikler!</h3>
                                    <p className="text-emerald-600 font-medium mb-6">Mükemmel bir odaklanma.</p>
                                    <Button onClick={() => generateNewGame()} className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold">
                                        YENİ OYUN <RotateCcw className="ml-2 w-4 h-4" />
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-2 gap-3">
                                        <Button 
                                            variant="outline" 
                                            onClick={useHint} 
                                            disabled={hintsRemaining <= 0 || status === 'solved'}
                                            className="h-16 flex-col gap-1 rounded-2xl border-slate-200 hover:bg-amber-50 hover:border-amber-300 text-slate-600 hover:text-amber-700 transition-all"
                                        >
                                            <Lightbulb className={cn("w-5 h-5", hintsRemaining > 0 ? "text-amber-500" : "text-slate-300")} />
                                            <span className="text-[10px] font-black uppercase">İpucu ({hintsRemaining})</span>
                                        </Button>
                                        <Button 
                                            variant="outline" 
                                            onClick={() => generateNewGame()} 
                                            className="h-16 flex-col gap-1 rounded-2xl border-slate-200 hover:bg-indigo-50 hover:text-indigo-700 transition-all"
                                        >
                                            <RefreshCw className="w-5 h-5 text-indigo-500" />
                                            <span className="text-[10px] font-black uppercase">Yenile</span>
                                        </Button>
                                    </div>
                                    <Button 
                                        onClick={checkSolution}
                                        disabled={status === 'solved'}
                                        className={cn(
                                            "h-16 rounded-2xl text-lg font-black uppercase tracking-widest shadow-xl transition-all",
                                            status === 'error' ? "bg-red-600 hover:bg-red-500" : "bg-indigo-600 hover:bg-indigo-500"
                                        )}
                                    >
                                        {status === 'checking' ? <Loader2 className="animate-spin" /> : 
                                         status === 'error' ? <AlertCircle className="mr-2" /> : <CheckCircle2 className="mr-2" />}
                                        {status === 'error' ? 'HATA VAR!' : 'KONTROL ET'}
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </CardContent>

            <CardFooter className="bg-slate-50 p-6 border-t border-slate-100 flex justify-center gap-6">
                {WORDS.map((word, i) => (
                    <div key={word} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-indigo-500 shadow-sm" />
                        <span className="text-[10px] font-black text-slate-500 tracking-wider uppercase">{word}</span>
                    </div>
                ))}
            </CardFooter>
        </Card>
    );
}
