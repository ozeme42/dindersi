'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
    Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { 
    Heart, Sparkles, BrainCircuit, CheckCircle2, Lock, 
    Trash2, Plus, RotateCcw, HelpCircle, Trophy, Scale, 
    Maximize, Minimize, PartyPopper, Book, Feather, Users
} from 'lucide-react';
import { cn } from "@/lib/utils";
import confetti from 'canvas-confetti';

// --- SABİTLER VE YENİ KATEGORİLER ---

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
    },
    { 
        id: 'peygamberler', 
        name: 'Peygamberler', 
        icon: <Users className="h-4 w-4" />, 
        words: ['ADEM', 'NUH', 'MUSA', 'İSA'],
        color: 'text-cyan-500',
        bg: 'bg-cyan-500/10'
    },
    { 
        id: 'melekler', 
        name: 'Melekler', 
        icon: <Feather className="h-4 w-4" />, 
        words: ['CEBRAİL', 'MİKAİL', 'İSRAFİL', 'AZRAİL'],
        color: 'text-purple-500',
        bg: 'bg-purple-500/10'
    },
    { 
        id: 'kitaplar', 
        name: 'İlahi Kitaplar', 
        icon: <Book className="h-4 w-4" />, 
        words: ['TEVRAT', 'ZEBUR', 'İNCİL', 'KURAN'],
        color: 'text-blue-500',
        bg: 'bg-blue-500/10'
    }
];

// Zorluk seviyeleri 4x4 (Toplam 16 hücre) mantığına göre ayarlandı.
const DIFFICULTY_LEVELS = [
    { id: 'easy', name: 'Kolay', emptyCells: 6 },     // 10 ipucu
    { id: 'medium', name: 'Orta', emptyCells: 9 },    // 7 ipucu
    { id: 'hard', name: 'Zor', emptyCells: 11 },      // 5 ipucu
    { id: 'expert', name: 'Uzman', emptyCells: 12 }   // 4 ipucu (Çözülebilir min. sınır)
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
    const [difficulty, setDifficulty] = useState(DIFFICULTY_LEVELS[1]); // Varsayılan: Orta
    const [grid, setGrid] = useState<string[][]>(Array(4).fill(null).map(() => Array(4).fill('')));
    const [initialGrid, setInitialGrid] = useState<string[][]>(Array(4).fill(null).map(() => Array(4).fill('')));
    const [solvedGrid, setSolvedGrid] = useState<string[][]>([]);
    
    const [isFinished, setIsAllSolved] = useState(false);
    const [hintsRemaining, setHintsRemaining] = useState(3);
    const [errorCount, setErrorCount] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch((err) => {
                console.error(`Tam ekran hatası: ${err.message}`);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    };

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

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
            alert("Lütfen önce tüm boşlukları doldurun!");
            return;
        }

        const isCorrect = grid.every((row, r) => row.every((cell, c) => cell === solvedGrid[r][c]));
        
        if (isCorrect) {
            setIsAllSolved(true);
            confetti({ particleCount: 200, spread: 90, origin: { y: 0.5 } });
            playSound('win');
        } else {
            playSound('incorrect');
            alert("Bazı kavramlar yanlış yerleştirilmiş, tekrar kontrol et.");
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

    return (
        <div className={cn(
            "animate-in fade-in duration-700 transition-all",
            isFullscreen ? "fixed inset-0 z-50 bg-slate-900 overflow-y-auto p-4 md:p-8 flex items-center justify-center" : "w-full 2xl:max-w-[85vw] mx-auto"
        )}>
            <Card className={cn(
                "bg-white/95 backdrop-blur-xl border border-slate-200 shadow-2xl rounded-[2rem] md:rounded-[3rem] overflow-hidden flex flex-col transition-all",
                isFullscreen ? "w-full max-w-[1600px] min-h-[90vh]" : "w-full"
            )}>
                <CardHeader className="bg-indigo-600 p-4 md:p-6 text-white relative flex-shrink-0">
                    <div className="absolute top-0 left-0 w-full h-full bg-[url('/noise.png')] opacity-10 pointer-events-none" />
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 relative z-10">
                        <div className="flex items-center justify-between w-full md:w-auto">
                            <div>
                                <CardTitle className="text-xl md:text-2xl font-black uppercase tracking-tight flex items-center gap-2">
                                    <RotateCcw className="h-6 w-6" /> Kelime Sudoku
                                </CardTitle>
                                <CardDescription className="text-indigo-100 font-medium text-sm">
                                    Zihnini aç, kavramları yerleştir!
                                </CardDescription>
                            </div>
                            {/* Mobil Tam Ekran Butonu */}
                            <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="md:hidden text-white hover:bg-white/20">
                                {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
                            </Button>
                        </div>

                        <div className="flex flex-wrap justify-center gap-2 bg-black/20 p-1.5 rounded-2xl w-full md:w-auto">
                            {DIFFICULTY_LEVELS.map(level => (
                                <button
                                    key={level.id}
                                    onClick={() => setDifficulty(level)}
                                    className={cn(
                                        "px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex-1 md:flex-none",
                                        difficulty.id === level.id ? "bg-white text-indigo-600 shadow-sm" : "text-white/70 hover:text-white hover:bg-white/10"
                                    )}
                                >
                                    {level.name}
                                </button>
                            ))}
                            {/* Masaüstü Tam Ekran Butonu */}
                            <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="hidden md:flex text-white hover:bg-white/20 ml-2 rounded-xl">
                                {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-4 md:p-8 flex-grow flex flex-col justify-center">
                    <div className="flex flex-col lg:flex-row gap-6 xl:gap-12 h-full">
                        
                        {/* SOL PANEL: KATEGORİLER VE İPUCU */}
                        <div className="w-full lg:w-72 space-y-6 flex flex-col justify-center">
                            <section className="space-y-3">
                                <Label className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Kategoriler</Label>
                                <div className="grid grid-cols-2 lg:grid-cols-1 gap-2 max-h-[300px] lg:max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                                    {CATEGORIES.map(cat => (
                                        <button
                                            key={cat.id}
                                            onClick={() => setCategory(cat)}
                                            className={cn(
                                                "group flex items-center gap-3 p-3 rounded-2xl border transition-all text-left",
                                                category.id === cat.id 
                                                    ? `border-${cat.id === 'degerler' ? 'rose' : cat.id === 'ibadetler' ? 'amber' : cat.id === 'kavramlar' ? 'indigo' : cat.id === 'ahlak' ? 'emerald' : cat.id === 'peygamberler' ? 'cyan' : cat.id === 'melekler' ? 'purple' : 'blue'}-500 ${cat.bg} shadow-md scale-[1.02]` 
                                                    : "bg-white border-slate-100 hover:border-slate-300 text-slate-500 hover:bg-slate-50"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-10 h-10 rounded-xl flex items-center justify-center transition-colors shrink-0",
                                                category.id === cat.id ? "bg-white shadow-sm" : "bg-slate-100"
                                            )}>
                                                {React.cloneElement(cat.icon as React.ReactElement, { 
                                                    className: cn("w-5 h-5", category.id === cat.id ? cat.color : "text-slate-400") 
                                                })}
                                            </div>
                                            <span className={cn("font-bold text-sm lg:text-base tracking-tight", category.id === cat.id ? "text-slate-900" : "text-slate-500")}>
                                                {cat.name}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </section>

                            <section className="p-5 bg-slate-50 rounded-3xl border border-slate-100 mt-auto">
                                <div className="flex items-center justify-between mb-3">
                                    <Label className="text-xs font-black uppercase text-slate-400">Kalan İpucu</Label>
                                    <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border-none font-black text-sm px-3">{hintsRemaining}</Badge>
                                </div>
                                <Progress value={(hintsRemaining / 3) * 100} className="h-2 rounded-full" />
                                <Button 
                                    variant="outline" 
                                    onClick={takeHint} 
                                    disabled={hintsRemaining <= 0 || isFinished}
                                    className="w-full mt-5 h-12 border-indigo-200 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700 rounded-2xl font-bold text-sm transition-colors"
                                >
                                    <HelpCircle className="w-5 h-5 mr-2" /> İpucu Kullan
                                </Button>
                            </section>
                        </div>

                        {/* ORTA PANEL: SUDOKU GRID (ESNEK & TAM EKRAN UYUMLU) */}
                        <div className="flex-1 flex flex-col items-center justify-center w-full min-h-[350px]">
                            <div className="bg-slate-900 p-3 md:p-4 rounded-[2.5rem] shadow-2xl border-4 border-slate-800 w-full max-w-[600px] aspect-square flex flex-col">
                                <div className="grid grid-cols-2 gap-3 flex-1 h-full">
                                    {[0, 1, 2, 3].map((blockIdx) => {
                                        const startRow = Math.floor(blockIdx / 2) * 2;
                                        const startCol = (blockIdx % 2) * 2;
                                        return (
                                            <div key={blockIdx} className="grid grid-cols-2 gap-2 bg-slate-800/50 p-2 rounded-2xl h-full">
                                                {[0, 1, 2, 3].map((cellIdx) => {
                                                    const r = startRow + Math.floor(cellIdx / 2);
                                                    const c = startCol + (cellIdx % 2);
                                                    
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
                                                                "w-full h-full rounded-xl flex items-center justify-center text-center p-1 transition-all duration-300 relative group overflow-hidden",
                                                                "text-xs sm:text-sm md:text-lg lg:text-xl font-black uppercase leading-tight tracking-tighter break-all",
                                                                isInitial 
                                                                    ? "bg-slate-700 text-slate-300 border border-slate-600 cursor-default" 
                                                                    : value === ''
                                                                        ? "bg-slate-800/80 hover:bg-slate-700 text-white border-2 border-dashed border-slate-600 hover:border-indigo-500"
                                                                        : isCorrect 
                                                                            ? "bg-indigo-600 text-white border-2 border-indigo-400 shadow-[0_0_20px_rgba(79,70,229,0.5)]"
                                                                            : "bg-red-500 text-white border-2 border-red-400"
                                                            )}
                                                        >
                                                            {isInitial && <Lock className="absolute top-2 right-2 w-3 h-3 md:w-4 md:h-4 opacity-20" />}
                                                            {value}
                                                            {!value && !isInitial && <Plus className="w-6 h-6 opacity-0 group-hover:opacity-30 text-white transition-opacity absolute" />}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* SAĞ PANEL: KELİME ANAHTARI VE AKSİYONLAR */}
                        <div className="w-full lg:w-64 space-y-6 flex flex-col justify-center">
                            <div className="bg-slate-50 rounded-3xl p-5 border border-slate-100">
                                <Label className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-4 block text-center">Bu Turun Kavramları</Label>
                                <div className="grid grid-cols-2 gap-3">
                                    {category.words.map((word, idx) => (
                                        <div key={word} className="bg-white border border-slate-200 p-3 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm">
                                            <span className="text-[9px] font-black text-slate-400 mb-1">KAVRAM {idx + 1}</span>
                                            <span className={cn("font-black text-xs md:text-sm tracking-tight break-all", category.color)}>{word}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-2 space-y-4 mt-auto">
                                <Button 
                                    onClick={checkSolution}
                                    disabled={isFinished}
                                    className="w-full h-16 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg uppercase tracking-widest rounded-2xl shadow-xl shadow-indigo-500/30 active:scale-95 transition-all"
                                >
                                    <CheckCircle2 className="w-7 h-7 mr-3" /> KONTROL ET
                                </Button>
                                
                                <Button 
                                    variant="ghost" 
                                    onClick={initGame}
                                    className="w-full h-14 text-slate-500 hover:text-rose-600 hover:bg-rose-50 font-bold rounded-2xl transition-colors"
                                >
                                    <Trash2 className="w-5 h-5 mr-2" /> Tahtayı Temizle
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>

                <CardFooter className="bg-slate-50 p-4 md:p-5 flex justify-between items-center border-t border-slate-200 flex-shrink-0 rounded-b-[2rem] md:rounded-b-[3rem]">
                     <p className="text-xs md:text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-indigo-500" /> Hata Sayısı: <span className="text-slate-900 text-base">{errorCount}</span>
                     </p>
                     <div className="flex items-center gap-4">
                         <span className="text-xs md:text-sm font-black text-indigo-600 uppercase tracking-tighter">Din Dersi Atölyesi | Zeka Köşesi</span>
                     </div>
                </CardFooter>
            </Card>

            {/* BAŞARI DİALOGU */}
            {isFinished && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-500">
                    <Card className="max-w-lg w-full bg-white border-none shadow-[0_0_80px_rgba(79,70,229,0.4)] rounded-[3rem] overflow-hidden animate-in zoom-in-95 duration-500">
                        <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-10 text-center relative overflow-hidden">
                             <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay" />
                             <PartyPopper className="w-24 h-24 text-white mx-auto mb-6 animate-bounce relative z-10 drop-shadow-lg" />
                             <CardTitle className="text-4xl md:text-5xl font-black text-white uppercase relative z-10 tracking-tight">MÜKEMMEL!</CardTitle>
                        </div>
                        <CardContent className="p-8 md:p-10 text-center space-y-6">
                            <p className="text-slate-600 font-medium text-lg md:text-xl">Tüm kavramları doğru yerleştirdin. Harika bir zihin egzersiziydi!</p>
                            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 grid grid-cols-2 gap-6">
                                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                                    <p className="text-xs text-slate-400 font-bold uppercase mb-1">Toplam Hata</p>
                                    <p className="text-3xl font-black text-slate-900">{errorCount}</p>
                                </div>
                                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                                    <p className="text-xs text-slate-400 font-bold uppercase mb-1">Kategori</p>
                                    <p className="text-lg md:text-xl font-black text-indigo-600 uppercase tracking-tighter leading-none flex items-center justify-center h-full pb-1">{category.name}</p>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="p-8 md:p-10 pt-0">
                            <Button onClick={initGame} className="w-full h-16 bg-indigo-600 hover:bg-indigo-700 text-lg font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-indigo-500/20 active:scale-95 transition-all">
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
        audio.volume = 0.4;
        audio.play().catch(() => {});
    } catch (e) {
        console.warn("Ses çalınamadı:", e);
    }
}