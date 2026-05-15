
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
    Trash2, Heart, Sparkles, BrainCircuit, BookOpen, 
    RefreshCw, Trophy, Lock, Lightbulb, Check, Palette,
    ChevronRight, Info
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import confetti from 'canvas-confetti';

// --- KATEGORİLER VE KELİMELER ---
const CATEGORIES = [
    { id: 'values', name: 'Değerler', words: ['SEVGİ', 'SAYGI', 'SABIR', 'İHLAS'], icon: Heart, color: 'text-rose-500', bg: 'bg-rose-50' },
    { id: 'worship', name: 'İbadetler', words: ['NAMAZ', 'ORUÇ', 'HAC', 'ZEKAT'], icon: Sparkles, color: 'text-amber-500', bg: 'bg-amber-50' },
    { id: 'concepts', name: 'Kavramlar', words: ['İMAN', 'İSLAM', 'İHSAN', 'TEVHİD'], icon: BrainCircuit, color: 'text-indigo-500', bg: 'bg-indigo-50' },
    { id: 'virtues', name: 'Ahlak', words: ['ADALET', 'DOĞRU', 'ŞEFKAT', 'EDEP'], icon: BookOpen, color: 'text-emerald-500', bg: 'bg-emerald-50' },
];

const DIFFICULTIES = [
    { id: 'easy', name: 'Kolay', emptyCells: 4 },
    { id: 'medium', name: 'Orta', emptyCells: 7 },
    { id: 'hard', name: 'Zor', emptyCells: 10 },
];

// --- SUDOKU MANTIĞI ---
const isValid = (board: string[][], row: number, col: number, word: string) => {
    for (let x = 0; x < 4; x++) if (board[row][x] === word) return false;
    for (let x = 0; x < 4; x++) if (board[x][col] === word) return false;
    let startRow = row - (row % 2), startCol = col - (col % 2);
    for (let i = 0; i < 2; i++)
        for (let j = 0; j < 2; j++)
            if (board[i + startRow][j + startCol] === word) return false;
    return true;
};

const solveSudoku = (board: string[][], words: string[]): boolean => {
    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
            if (board[row][col] === '') {
                for (let word of words) {
                    if (isValid(board, row, col, word)) {
                        board[row][col] = word;
                        if (solveSudoku(board, words)) return true;
                        board[row][col] = '';
                    }
                }
                return false;
            }
        }
    }
    return true;
};

const generateBoard = (words: string[], emptyCells: number) => {
    let board = Array(4).fill(null).map(() => Array(4).fill(''));
    solveSudoku(board, [...words].sort(() => Math.random() - 0.5));
    const solution = board.map(row => [...row]);
    let count = 0;
    while (count < emptyCells) {
        let r = Math.floor(Math.random() * 4), c = Math.floor(Math.random() * 4);
        if (board[r][c] !== '') { board[r][c] = ''; count++; }
    }
    return { initial: board, solution };
};

export function WordSudoku() {
    const { toast } = useToast();
    const [category, setCategory] = useState(CATEGORIES[0]);
    const [difficulty, setDifficulty] = useState(DIFFICULTIES[0]);
    const [board, setBoard] = useState<string[][]>([]);
    const [solution, setSolution] = useState<string[][]>([]);
    const [initialBoard, setInitialBoard] = useState<string[][]>([]);
    const [hintsUsed, setHintsUsed] = useState(0);
    const [isComplete, setIsAllComplete] = useState(false);

    const initGame = useCallback(() => {
        const { initial, solution } = generateBoard(category.words, difficulty.emptyCells);
        setBoard(initial);
        setInitialBoard(initial.map(r => [...row]));
        setSolution(solution);
        setHintsUsed(0);
        setIsAllComplete(false);
    }, [category, difficulty]);

    useEffect(() => { initGame(); }, [initGame]);

    const handleCellClick = (r: number, c: number) => {
        if (initialBoard[r][c] !== '' || isComplete) return;
        const currentWord = board[r][c];
        const currentIndex = category.words.indexOf(currentWord);
        const nextWord = currentIndex === category.words.length - 1 ? '' : category.words[currentIndex + 1];
        const newBoard = board.map((row, ri) => row.map((col, ci) => (ri === r && ci === c ? nextWord : col)));
        setBoard(newBoard);
        playSound('pop');
    };

    const playSound = (type: 'pop' | 'correct' | 'win') => {
        // Sistem sesleri çalınabilir
    };

    const checkSolution = () => {
        let correct = true;
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                if (board[r][c] !== solution[r][c]) correct = false;
            }
        }
        if (correct) {
            setIsAllComplete(true);
            confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
            toast({ title: "Tebrikler!", description: "Bulmacayı başarıyla çözdünüz!" });
        } else {
            toast({ title: "Henüz Bitmedi", description: "Bazı kelimeler yanlış yerleşmiş olabilir.", variant: "destructive" });
        }
    };

    const giveHint = () => {
        if (hintsUsed >= 3 || isComplete) return;
        let emptyCells: [number, number][] = [];
        board.forEach((row, r) => row.forEach((val, c) => { if (val === '') emptyCells.push([r, c]); }));
        if (emptyCells.length > 0) {
            const [r, c] = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            const newBoard = board.map((row, ri) => row.map((col, ci) => (ri === r && ci === c ? solution[r][c] : col)));
            setBoard(newBoard);
            setHintsUsed(prev => prev + 1);
        }
    };

    return (
        <Card className="bg-white/80 backdrop-blur-xl border border-white/60 shadow-2xl rounded-[2.5rem] overflow-hidden">
            <CardHeader className="bg-indigo-600 p-6 text-white relative">
                <div className="absolute top-0 left-0 w-full h-full bg-[url('/noise.png')] opacity-10 pointer-events-none" />
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                            <category.icon className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <CardTitle className="text-2xl font-black uppercase tracking-tight">Kelime Sudoku</CardTitle>
                            <CardDescription className="text-indigo-100 font-medium">Zihnini aç, kavramları yerleştir!</CardDescription>
                        </div>
                    </div>
                    <div className="flex gap-2 bg-black/20 p-1 rounded-xl">
                        {DIFFICULTIES.map(d => (
                            <button
                                key={d.id}
                                onClick={() => setDifficulty(d)}
                                className={cn(
                                    "px-4 py-1.5 rounded-lg text-xs font-black uppercase transition-all",
                                    difficulty.id === d.id ? "bg-white text-indigo-600 shadow-sm" : "text-white/60 hover:text-white"
                                )}
                            >
                                {d.name}
                            </button>
                        ))}
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-6 md:p-8">
                <div className="flex flex-col lg:flex-row gap-10 items-start justify-center">
                    
                    {/* SOL PANEL: AYARLAR */}
                    <div className="w-full lg:w-64 space-y-6 shrink-0">
                        <section className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Kelime Grubu</Label>
                            <div className="grid grid-cols-1 gap-2">
                                {CATEGORIES.map(cat => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setCategory(cat)}
                                        className={cn(
                                            "flex items-center gap-3 p-3 rounded-2xl border-2 transition-all text-left group",
                                            category.id === cat.id 
                                                ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm" 
                                                : "bg-white border-slate-100 text-slate-400 hover:border-indigo-100 hover:bg-slate-50"
                                        )}
                                    >
                                        <div className={cn("p-2 rounded-xl transition-colors", category.id === cat.id ? "bg-white" : "bg-slate-50 group-hover:bg-white")}>
                                            <cat.icon className="w-4 h-4" />
                                        </div>
                                        <span className="font-bold text-sm">{cat.name}</span>
                                    </button>
                                ))}
                            </div>
                        </section>

                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
                            <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase">
                                <span>İpucu Hakkı</span>
                                <span className="text-indigo-600">{3 - hintsUsed} / 3</span>
                            </div>
                            <Progress value={((3 - hintsUsed) / 3) * 100} className="h-1.5" />
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={giveHint} 
                                disabled={hintsUsed >= 3 || isComplete}
                                className="w-full h-10 rounded-xl bg-white border-slate-200 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600"
                            >
                                <Lightbulb className="w-4 h-4 mr-2" /> İpucu Kullan
                            </Button>
                        </div>
                    </div>

                    {/* ORTA: OYUN ALANI */}
                    <div className="flex-1 flex flex-col items-center max-w-md w-full">
                        <div className="w-full aspect-square bg-slate-200 p-1.5 rounded-[2rem] shadow-inner relative grid grid-cols-2 grid-rows-2 gap-2 border-4 border-slate-300/50">
                            {/* 4x4 Grid - 2x2 Blokları simüle etmek için 2x2 ana grid içinde 2x2 alt gridler kullanıyoruz */}
                            {[0, 1, 2, 3].map((blockIdx) => {
                                const startR = Math.floor(blockIdx / 2) * 2;
                                const startC = (blockIdx % 2) * 2;
                                return (
                                    <div key={blockIdx} className="grid grid-cols-2 grid-rows-2 gap-1.5 bg-white/40 p-1.5 rounded-2xl">
                                        {[0, 1, 2, 3].map((cellIdx) => {
                                            const r = startR + Math.floor(cellIdx / 2);
                                            const c = startC + (cellIdx % 2);
                                            const val = board[r][c];
                                            const isFixed = initialBoard[r][c] !== '';
                                            
                                            return (
                                                <button
                                                    key={`${r}-${c}`}
                                                    onClick={() => handleCellClick(r, c)}
                                                    className={cn(
                                                        "w-full h-full aspect-square rounded-xl flex items-center justify-center transition-all duration-300 relative group overflow-hidden",
                                                        isFixed 
                                                            ? "bg-slate-100 text-slate-800 cursor-not-allowed border-2 border-slate-200 shadow-sm" 
                                                            : val 
                                                                ? "bg-white text-indigo-600 border-2 border-indigo-200 shadow-md hover:border-indigo-400 active:scale-95" 
                                                                : "bg-white/80 hover:bg-white border-2 border-dashed border-slate-200 hover:border-indigo-200"
                                                    )}
                                                >
                                                    <span className={cn(
                                                        "font-black tracking-tighter transition-transform group-hover:scale-110",
                                                        val.length > 5 ? "text-[10px] md:text-xs" : "text-xs md:text-sm"
                                                    )}>
                                                        {val}
                                                    </span>
                                                    {isFixed && (
                                                        <div className="absolute top-1 right-1 opacity-20">
                                                            <Lock className="w-2 h-2" />
                                                        </div>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="w-full mt-8 flex flex-col sm:flex-row gap-3">
                            <Button 
                                onClick={checkSolution} 
                                disabled={isComplete}
                                className="flex-1 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-lg font-black shadow-xl shadow-indigo-900/20"
                            >
                                <Check className="w-6 h-6 mr-2" /> KONTROL ET
                            </Button>
                            <Button 
                                variant="outline" 
                                onClick={initGame} 
                                className="h-14 px-6 border-slate-200 text-slate-600 hover:bg-slate-50 rounded-2xl"
                            >
                                <RefreshCw className={cn("w-5 h-5", isLoading && "animate-spin")} />
                            </Button>
                        </div>
                        
                        <Button 
                            variant="ghost" 
                            onClick={initGame}
                            className="w-full h-12 mt-4 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl text-xs font-bold"
                        >
                            <Trash2 className="w-4 h-4 mr-2" /> Tümünü Temizle ve Yeni Başla
                        </Button>
                    </div>

                    {/* SAĞ: KELİME ANAHTARI */}
                    <div className="w-full lg:w-48 space-y-4 shrink-0">
                         <section className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm space-y-4">
                            <div className="flex items-center gap-2 text-indigo-600">
                                <Palette className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-wider">Kullanılacaklar</span>
                            </div>
                            <div className="flex flex-wrap lg:flex-col gap-2">
                                {category.words.map(w => (
                                    <div key={w} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-100 text-[11px] font-bold text-slate-700">
                                        <div className="w-2 h-2 rounded-full bg-indigo-400" />
                                        {w}
                                    </div>
                                ))}
                            </div>
                         </section>

                         <div className="p-5 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-3xl border border-indigo-100 text-center space-y-2">
                            <Info className="w-5 h-5 text-indigo-400 mx-auto" />
                            <p className="text-[10px] text-indigo-700 font-medium leading-relaxed">Her satırda, sütunda ve 2x2'lik blokta kelimelerden sadece 1 adet olmalıdır.</p>
                         </div>
                    </div>

                </div>
            </CardContent>

            {isComplete && (
                <div className="absolute inset-0 z-50 bg-indigo-600/10 backdrop-blur-sm flex flex-col items-center justify-center p-8 animate-in fade-in duration-500">
                    <div className="bg-white p-10 rounded-[3rem] shadow-2xl text-center border-4 border-emerald-400 max-w-sm w-full transform scale-110">
                        <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Trophy className="w-12 h-12 text-emerald-600" />
                        </div>
                        <h3 className="text-3xl font-black text-slate-900 mb-2 uppercase">HARİKA!</h3>
                        <p className="text-slate-500 font-medium mb-8">Tüm kavramları doğru yerleştirdin.</p>
                        <Button onClick={initGame} className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold">
                            YENİ OYUN BAŞLAT
                        </Button>
                    </div>
                </div>
            )}
        </Card>
    );
}

function Progress({ value, className }: { value: number, className?: string }) {
    return (
        <div className={cn("w-full bg-slate-200 rounded-full overflow-hidden", className)}>
            <div 
                className="h-full bg-indigo-500 transition-all duration-500" 
                style={{ width: `${value}%` }}
            />
        </div>
    );
}
