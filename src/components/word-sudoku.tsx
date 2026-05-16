
'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
    Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { 
    RotateCcw, HelpCircle, CheckCircle2, Lock, Trash2, 
    Sparkles, Heart, BrainCircuit, BookOpen, ListChecks, 
    Maximize, Minimize, Plus
} from 'lucide-react';
import { cn } from "@/lib/utils";
import confetti from 'canvas-confetti';

const CATEGORIES = [
    { id: 'values', name: 'Değerler', words: ['SAYGI', 'SEVGİ', 'SABIR', 'İHLAS'], icon: Heart, color: 'bg-rose-500' },
    { id: 'worship', name: 'İbadetler', words: ['NAMAZ', 'ORUÇ', 'HAC', 'ZEKAT'], icon: Sparkles, color: 'bg-indigo-500' },
    { id: 'concepts', name: 'Kavramlar', words: ['İMAN', 'İSLAM', 'İHSAN', 'TEVHİD'], icon: BrainCircuit, color: 'bg-emerald-500' },
    { id: 'virtues', name: 'Ahlak', words: ['ADALET', 'DOĞRU', 'ŞEFKAT', 'EDEP'], icon: ListChecks, color: 'bg-amber-500' },
];

const PUZZLES = {
    values: {
        easy: [['SAYGI', '', '', 'SEVGİ'], ['', 'SABIR', 'İHLAS', ''], ['', 'SAYGI', 'SEVGİ', ''], ['İHLAS', '', '', 'SABIR']],
        medium: [['', 'SAYGI', '', ''], ['SABIR', '', '', 'İHLAS'], ['İHLAS', '', '', 'SAYGI'], ['', '', 'SABIR', '']],
        hard: [['', '', '', 'SABIR'], ['', 'İHLAS', '', ''], ['', 'SABIR', '', ''], ['SEVGİ', '', '', '']]
    },
    worship: {
        easy: [['NAMAZ', '', '', 'ORUÇ'], ['', 'HAC', 'ZEKAT', ''], ['', 'NAMAZ', 'ORUÇ', ''], ['ZEKAT', '', '', 'HAC']],
        medium: [['', 'NAMAZ', '', ''], ['HAC', '', '', 'ZEKAT'], ['ZEKAT', '', '', 'NAMAZ'], ['', '', 'HAC', '']],
        hard: [['', '', '', 'HAC'], ['', 'ZEKAT', '', ''], ['', 'HAC', '', ''], ['ORUÇ', '', '', '']]
    }
};

export function WordSudoku() {
    const [selectedCat, setSelectedCat] = useState(CATEGORIES[0]);
    const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
    const [grid, setGrid] = useState<string[][]>(Array(4).fill(null).map(() => Array(4).fill('')));
    const [initialGrid, setInitialGrid] = useState<string[][]>(Array(4).fill(null).map(() => Array(4).fill('')));
    const [hintsUsed, setHintsUsed] = useState(0);
    const [isFinished, setIsFinished] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const initGame = useCallback(() => {
        const catId = selectedCat.id === 'values' || selectedCat.id === 'worship' ? selectedCat.id : 'values';
        const puzzleData = (PUZZLES as any)[catId]?.[difficulty] || PUZZLES.values.easy;
        
        const newGrid = puzzleData.map((row: string[]) => [...row]);
        setGrid(newGrid);
        setInitialGrid(puzzleData.map((row: string[]) => [...row]));
        setHintsUsed(0);
        setIsFinished(false);
    }, [selectedCat, difficulty]);

    useEffect(() => {
        initGame();
    }, [initGame]);

    const handleCellClick = (r: number, c: number) => {
        if (initialGrid[r][c] !== '' || isFinished) return;

        const currentVal = grid[r][c];
        const currentIndex = selectedCat.words.indexOf(currentVal);
        const nextIndex = (currentIndex + 1) % (selectedCat.words.length + 1);
        
        const newGrid = [...grid];
        newGrid[r] = [...newGrid[r]];
        newGrid[r][c] = nextIndex === selectedCat.words.length ? '' : selectedCat.words[nextIndex];
        setGrid(newGrid);
    };

    const checkSolution = () => {
        const isValid = (arr: string[]) => {
            const words = arr.filter(w => w !== '');
            return words.length === 4 && new Set(words).size === 4;
        };

        for (let i = 0; i < 4; i++) {
            if (!isValid(grid[i])) return false;
            if (!isValid(grid.map(row => row[i]))) return false;
        }

        for (let r = 0; r < 4; r += 2) {
            for (let c = 0; c < 4; c += 2) {
                const block = [grid[r][c], grid[r][c+1], grid[r+1][c], grid[r+1][c+1]];
                if (!isValid(block)) return false;
            }
        }
        return true;
    };

    const handleFinish = () => {
        if (checkSolution()) {
            setIsFinished(true);
            confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
        } else {
            alert("Maalesef çözüm hatalı veya eksik. Kontrol edip tekrar deneyin!");
        }
    };

    return (
        <div className={cn(
            "w-full transition-all duration-500",
            isFullscreen ? "fixed inset-0 z-50 bg-slate-950 p-4 flex items-center justify-center overflow-y-auto" : "max-w-6xl mx-auto"
        )}>
            <Card className={cn(
                "bg-white border-slate-200 shadow-2xl rounded-[2.5rem] overflow-hidden flex flex-col",
                isFullscreen ? "w-full max-w-5xl h-fit" : "w-full"
            )}>
                <CardHeader className="bg-indigo-600 p-6 text-white relative">
                    <div className="absolute top-0 left-0 w-full h-full bg-[url('/noise.png')] opacity-10 pointer-events-none" />
                    <div className="flex justify-between items-center relative z-10">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                                <selectedCat.icon className="h-8 w-8" />
                            </div>
                            <div>
                                <CardTitle className="text-2xl font-black uppercase tracking-tight">Kelime Sudoku</CardTitle>
                                <CardDescription className="text-indigo-100 font-medium">Zihnini aç, kavramları yerleştir!</CardDescription>
                            </div>
                        </div>
                        <div className="flex gap-2">
                             <Button variant="ghost" size="icon" onClick={() => setIsFullscreen(!isFullscreen)} className="text-white hover:bg-white/20">
                                {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-6 md:p-10 flex flex-col lg:flex-row gap-10 bg-slate-50/50">
                    {/* Sol Panel: Ayarlar */}
                    <div className="w-full lg:w-72 space-y-6 flex-shrink-0">
                        <section className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Kelime Grubu</Label>
                            <div className="grid grid-cols-1 gap-2">
                                {CATEGORIES.map(cat => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setSelectedCat(cat)}
                                        className={cn(
                                            "flex items-center gap-3 p-3 rounded-xl border transition-all text-left group",
                                            selectedCat.id === cat.id 
                                                ? "bg-white border-indigo-500 shadow-md ring-1 ring-indigo-500/20" 
                                                : "bg-transparent border-slate-200 hover:border-indigo-300 hover:bg-white/50"
                                        )}
                                    >
                                        <div className={cn("p-2 rounded-lg text-white transition-transform group-hover:scale-110", cat.color)}>
                                            <cat.icon className="h-4 w-4" />
                                        </div>
                                        <span className={cn("font-bold text-sm", selectedCat.id === cat.id ? "text-indigo-600" : "text-slate-600")}>{cat.name}</span>
                                    </button>
                                ))}
                            </div>
                        </section>

                        <section className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Zorluk</Label>
                            <div className="flex p-1 bg-slate-200/50 rounded-xl">
                                {(['easy', 'medium', 'hard'] as const).map(lvl => (
                                    <button
                                        key={lvl}
                                        onClick={() => setDifficulty(lvl)}
                                        className={cn(
                                            "flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all",
                                            difficulty === lvl ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                        )}
                                    >
                                        {lvl === 'easy' ? 'Kolay' : lvl === 'medium' ? 'Orta' : 'Zor'}
                                    </button>
                                ))}
                            </div>
                        </section>
                    </div>

                    {/* Orta: Oyun Izgarası */}
                    <div className="flex-grow flex justify-center items-center">
                        <div className="grid grid-cols-2 gap-4 p-4 bg-slate-300/30 rounded-[2rem] border-2 border-slate-200 shadow-inner">
                            {[0, 1, 2, 3].map(blockIdx => {
                                const startRow = Math.floor(blockIdx / 2) * 2;
                                const startCol = (blockIdx % 2) * 2;
                                return (
                                    <div key={blockIdx} className="grid grid-cols-2 gap-2 bg-white/40 p-2 rounded-2xl border border-white shadow-sm">
                                        {[0, 1, 2, 3].map(cellIdx => {
                                            const r = startRow + Math.floor(cellIdx / 2);
                                            const c = startCol + (cellIdx % 2);
                                            const value = grid[r][c];
                                            const isInitial = initialGrid[r][c] !== '';
                                            return (
                                                <button
                                                    key={`${r}-${c}`}
                                                    onClick={() => handleCellClick(r, c)}
                                                    className={cn(
                                                        "w-16 h-16 md:w-20 md:h-20 rounded-xl flex items-center justify-center text-[10px] md:text-xs font-black transition-all relative group",
                                                        isInitial 
                                                            ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed" 
                                                            : value 
                                                                ? "bg-white text-indigo-600 border-2 border-indigo-500 shadow-md hover:scale-105" 
                                                                : "bg-white/50 border-2 border-dashed border-slate-300 text-slate-300 hover:bg-white hover:border-indigo-300"
                                                    )}
                                                >
                                                    {isInitial && <Lock className="absolute top-1 right-1 h-3 w-3 opacity-20" />}
                                                    {value || (!isInitial && <Plus className="opacity-0 group-hover:opacity-40" />)}
                                                </button>
                                            )
                                        })}
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Sağ: Kelime Anahtarı */}
                    <div className="w-full lg:w-48 flex flex-col gap-4 flex-shrink-0">
                        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                            <Label className="text-[10px] font-black uppercase text-slate-400 block text-center border-b pb-2">Kelime Listesi</Label>
                            {selectedCat.words.map((word, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <div className={cn("w-2 h-2 rounded-full", selectedCat.color)} />
                                    <span className="font-bold text-sm text-slate-700 tracking-tight">{word}</span>
                                </div>
                            ))}
                        </div>
                        <Button 
                            onClick={handleFinish}
                            className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-indigo-900/20"
                        >
                            Kontrol Et
                        </Button>
                        <Button 
                            variant="ghost" 
                            onClick={initGame}
                            className="w-full h-12 text-slate-400 hover:text-red-500 rounded-xl text-xs font-bold"
                        >
                            <Trash2 className="h-4 w-4 mr-2" /> Sıfırla
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {isFinished && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-500">
                    <Card className="max-w-md w-full bg-white border-none shadow-[0_0_80px_rgba(79,70,229,0.3)] rounded-[3rem] overflow-hidden text-center animate-in zoom-in-95 duration-500">
                        <div className="bg-indigo-600 p-10 text-white relative">
                             <PartyPopper className="w-16 h-16 mx-auto mb-4 animate-bounce" />
                             <CardTitle className="text-3xl font-black uppercase tracking-tight">Tebrikler!</CardTitle>
                        </div>
                        <CardContent className="p-8 space-y-4">
                            <p className="text-slate-600 font-medium text-lg">Zihnini başarıyla kullandın ve kavramları doğru yerleştirdin.</p>
                            <div className="flex justify-center gap-2">
                                {selectedCat.words.map(w => <Badge key={word} variant="secondary" className="bg-indigo-50 text-indigo-700">{w}</Badge>)}
                            </div>
                        </CardContent>
                        <CardFooter className="p-8 pt-0">
                            <Button onClick={initGame} className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase rounded-2xl shadow-lg">
                                Yeni Oyun
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            )}
        </div>
    );
}
