'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
    Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { 
    Heart, Sparkles, BrainCircuit, CheckCircle2, Lock, 
    Trash2, RotateCcw, HelpCircle, Trophy, Scale, 
    Maximize, Minimize, PartyPopper, Book, Feather, Users, 
    MousePointerClick, Grid3X3, Grid2X2, Menu, X
} from 'lucide-react';
import { cn } from "@/lib/utils";
import confetti from 'canvas-confetti';

// --- KATEGORİLER ---
const CATEGORIES = [
    { 
        id: 'degerler', 
        name: 'Değerler', 
        icon: <Heart className="h-5 w-5" />, 
        words: ['SAYGI', 'SEVGİ', 'SABIR', 'İHLAS', 'ŞÜKÜR', 'ŞEFKAT', 'GÜVEN', 'VEFA', 'EDEP'],
        color: 'text-rose-500',
        bg: 'bg-rose-500/10'
    },
    { 
        id: 'ibadetler', 
        name: 'İbadetler', 
        icon: <Sparkles className="h-5 w-5" />, 
        words: ['NAMAZ', 'ORUÇ', 'HAC', 'ZEKAT', 'DUA', 'TÖVBE', 'KURBAN', 'SADAKA', 'ZİKİR'],
        color: 'text-amber-500',
        bg: 'bg-amber-500/10'
    },
    { 
        id: 'kavramlar', 
        name: 'Kavramlar', 
        icon: <BrainCircuit className="h-5 w-5" />, 
        words: ['İMAN', 'İSLAM', 'İHSAN', 'TEVHİD', 'ŞİRK', 'SÜNNET', 'FARZ', 'HELAL', 'HARAM'],
        color: 'text-indigo-500',
        bg: 'bg-indigo-500/10'
    },
    { 
        id: 'ahlak', 
        name: 'Ahlak', 
        icon: <Scale className="h-5 w-5" />, 
        words: ['ADALET', 'DOĞRU', 'CÖMERT', 'HAYA', 'İFFET', 'CESUR', 'TEVAZU', 'SADIK', 'MERHAMET'],
        color: 'text-emerald-500',
        bg: 'bg-emerald-500/10'
    },
    { 
        id: 'peygamberler', 
        name: 'Peygamberler', 
        icon: <Users className="h-5 w-5" />, 
        words: ['ADEM', 'NUH', 'İBRAHİM', 'MUSA', 'İSA', 'YUSUF', 'DAVUD', 'YUNUS', 'MUHAMMED'],
        color: 'text-cyan-500',
        bg: 'bg-cyan-500/10'
    },
    { 
        id: 'melekler', 
        name: 'Melekler', 
        icon: <Feather className="h-5 w-5" />, 
        words: ['CEBRAİL', 'MİKAİL', 'İSRAFİL', 'AZRAİL', 'KİRAMEN', 'KATİBİN', 'MÜNKER', 'NEKİR', 'RIDVAN'],
        color: 'text-purple-500',
        bg: 'bg-purple-500/10'
    },
    { 
        id: 'kitaplar', 
        name: 'Kitaplar ve Vahiy', 
        icon: <Book className="h-5 w-5" />, 
        words: ['TEVRAT', 'ZEBUR', 'İNCİL', 'KURAN', 'SUHUF', 'VAHİY', 'AYET', 'SURE', 'CÜZ'],
        color: 'text-blue-500',
        bg: 'bg-blue-500/10'
    }
];

const DIFFICULTIES = [
    { id: 'easy', name: 'Kolay', empty4: 6, empty9: 35 },     
    { id: 'medium', name: 'Orta', empty4: 8, empty9: 45 },    
    { id: 'hard', name: 'Zor', empty4: 10, empty9: 55 },      
    { id: 'expert', name: 'Uzman', empty4: 12, empty9: 62 }   
];

function generateSolvedGrid4x4() {
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

function generateSolvedGrid9x9() {
    const base = [
        [1,2,3, 4,5,6, 7,8,9],
        [4,5,6, 7,8,9, 1,2,3],
        [7,8,9, 1,2,3, 4,5,6],
        [2,3,1, 5,6,4, 8,9,7],
        [5,6,4, 8,9,7, 2,3,1],
        [8,9,7, 2,3,1, 5,6,4],
        [3,1,2, 6,4,5, 9,7,8],
        [6,4,5, 9,7,8, 3,1,2],
        [9,7,8, 3,1,2, 6,4,5]
    ];
    const nums = [1,2,3,4,5,6,7,8,9].sort(() => Math.random() - 0.5);
    let grid = base.map(row => row.map(cell => nums[cell - 1]));
    const shuffleBlocks = () => {
        const bands = [[0,1,2], [3,4,5], [6,7,8]];
        bands.forEach(band => band.sort(() => Math.random() - 0.5));
        bands.sort(() => Math.random() - 0.5);
        return bands.flat();
    };
    const rowOrder = shuffleBlocks();
    grid = rowOrder.map(r => grid[r]);
    const colOrder = shuffleBlocks();
    grid = grid.map(row => colOrder.map(c => row[c]));
    return grid;
}

export function WordSudoku() {
    const containerRef = useRef<HTMLDivElement>(null);

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [gridSize, setGridSize] = useState<4 | 9>(4);
    const [category, setCategory] = useState(CATEGORIES[0]);
    const [difficulty, setDifficulty] = useState(DIFFICULTIES[1]); 
    const [grid, setGrid] = useState<string[][]>([]);
    const [initialGrid, setInitialGrid] = useState<string[][]>([]);
    const [solvedGrid, setSolvedGrid] = useState<string[][]>([]);
    
    const [textScale, setTextScale] = useState(1);
    const [selectedCell, setSelectedCell] = useState<{r: number, c: number} | null>(null);
    const [isFinished, setIsAllSolved] = useState(false);
    
    const [hintsRemaining, setHintsRemaining] = useState(3);
    const [errorCount, setErrorCount] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const activeWords = category.words.slice(0, gridSize);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen().catch((err) => {
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

    const initGame = useCallback(() => {
        const baseGrid = gridSize === 4 ? generateSolvedGrid4x4() : generateSolvedGrid9x9();
        const mappedGrid = baseGrid.map(row => row.map(num => activeWords[num - 1]));
        setSolvedGrid(mappedGrid);

        const puzzleGrid = mappedGrid.map(row => [...row]);
        const cellsToRemove = gridSize === 4 ? difficulty.empty4 : difficulty.empty9;
        let removed = 0;
        
        while (removed < cellsToRemove) {
            const r = Math.floor(Math.random() * gridSize);
            const c = Math.floor(Math.random() * gridSize);
            if (puzzleGrid[r][c] !== '') {
                puzzleGrid[r][c] = '';
                removed++;
            }
        }
        
        setGrid(puzzleGrid.map(row => [...row]));
        setInitialGrid(puzzleGrid.map(row => [...row]));
        setIsAllSolved(false);
        setHintsRemaining(gridSize === 4 ? 3 : 5);
        setErrorCount(0);
        setSelectedCell(null);
    }, [gridSize, category, difficulty, activeWords]);

    useEffect(() => {
        initGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gridSize, category, difficulty]);

    const handleCellClick = (r: number, c: number) => {
        if (initialGrid[r][c] !== '' || isFinished) return;
        if (selectedCell?.r === r && selectedCell?.c === c) {
            setSelectedCell(null);
        } else {
            setSelectedCell({r, c});
        }
    };

    const handleWordSelect = (word: string) => {
        if (!selectedCell || isFinished) return;
        const { r, c } = selectedCell;

        const newGrid = grid.map((row, ri) => 
            row.map((cell, ci) => (ri === r && ci === c ? word : cell))
        );
        setGrid(newGrid);

        if (word !== '' && word !== solvedGrid[r][c]) {
            playSound('incorrect');
            setErrorCount(prev => prev + 1);
        } else if (word !== '') {
            playSound('correct');
        }
    };

    const checkSolution = () => {
        const isComplete = grid.every(row => row.every(cell => cell !== ''));
        if (!isComplete) {
            alert("Lütfen önce tüm boşlukları doldurun!");
            return;
        }
        const isCorrect = grid.every((row, r) => row.every((cell, c) => cell === solvedGrid[r][c]));
        
        if (isCorrect) {
            setIsAllSolved(true);
            setSelectedCell(null);
            confetti({ particleCount: 300, spread: 120, origin: { y: 0.6 } });
            playSound('win');
        } else {
            playSound('incorrect');
            alert("Bazı kavramlar yanlış yerleştirilmiş, kırmızı yananları tekrar kontrol et.");
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
            
            if (selectedCell?.r === randomCell.r && selectedCell?.c === randomCell.c) {
                setSelectedCell(null);
            }
        }
    };

    return (
        <div 
            ref={containerRef}
            className={cn(
                "transition-all bg-transparent font-sans",
                isFullscreen 
                    ? "fixed inset-0 z-[99999] bg-slate-950 flex flex-col w-screen h-screen m-0 p-2" 
                    : "w-full max-w-[1920px] mx-auto h-[95vh] md:h-[90vh] p-2 flex flex-col"
            )}
        >
            <Card className="bg-white/95 backdrop-blur-xl border-2 border-slate-200 shadow-2xl overflow-hidden flex flex-col w-full h-full relative rounded-2xl md:rounded-3xl">
                
                {/* --- YAN ÇEKMECE (SIDEBAR DRAWER) --- */}
                {isSidebarOpen && (
                    <div 
                        className="absolute inset-0 bg-slate-900/50 z-40 backdrop-blur-sm transition-opacity"
                        onClick={() => setIsSidebarOpen(false)}
                    />
                )}
                <div className={cn(
                    "absolute top-0 left-0 h-full w-72 md:w-80 bg-white z-50 shadow-[20px_0_40px_rgba(0,0,0,0.1)] transform transition-transform duration-300 ease-in-out flex flex-col border-r border-slate-200",
                    isSidebarOpen ? "translate-x-0" : "-translate-x-full"
                )}>
                    <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
                        <Label className="text-base font-black uppercase tracking-widest text-slate-700">Kategoriler</Label>
                        <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(false)} className="hover:bg-slate-200 rounded-xl text-slate-500">
                            <X className="w-5 h-5" />
                        </Button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                        {CATEGORIES.map(cat => {
                            const isSelected = category.id === cat.id;
                            const borderColor = 
                                cat.id === 'degerler' ? 'border-rose-500' :
                                cat.id === 'ibadetler' ? 'border-amber-500' :
                                cat.id === 'kavramlar' ? 'border-indigo-500' :
                                cat.id === 'ahlak' ? 'border-emerald-500' :
                                cat.id === 'peygamberler' ? 'border-cyan-500' :
                                cat.id === 'melekler' ? 'border-purple-500' : 'border-blue-500';

                            return (
                                <button
                                    key={cat.id}
                                    onClick={() => { setCategory(cat); setIsSidebarOpen(false); }}
                                    className={cn(
                                        "group w-full flex items-center gap-3 p-3 rounded-2xl border-2 transition-all text-left",
                                        isSelected 
                                            ? `${borderColor} ${cat.bg} shadow-md scale-[1.02]` 
                                            : "bg-white border-slate-100 hover:border-slate-300 text-slate-500 hover:bg-slate-50"
                                    )}
                                >
                                    <div className={cn(
                                        "w-8 h-8 rounded-xl flex items-center justify-center transition-colors shrink-0 shadow-sm",
                                        isSelected ? "bg-white" : "bg-slate-100"
                                    )}>
                                        {React.cloneElement(cat.icon as React.ReactElement, { className: cn("w-4 h-4", isSelected ? cat.color : "text-slate-400") })}
                                    </div>
                                    <span className={cn("font-black text-sm tracking-tight", isSelected ? "text-slate-900" : "text-slate-600")}>
                                        {cat.name}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* --- DERLİ TOPLU ÜST PANEL (HEADER) --- */}
                <CardHeader className="bg-indigo-600 py-2.5 px-3 md:px-5 shrink-0 text-white relative z-10 flex flex-col justify-center">
                    <div className="absolute top-0 left-0 w-full h-full bg-[url('/noise.png')] opacity-10 pointer-events-none" />
                    
                    <div className="flex flex-wrap lg:flex-nowrap justify-between items-center gap-2 relative z-10 w-full">
                        
                        {/* Sol Kısım: Menü Butonu ve Başlık */}
                        <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-max">
                            <Button 
                                onClick={() => setIsSidebarOpen(true)}
                                className="bg-white/10 hover:bg-white/20 text-white border border-white/20 shadow-sm rounded-lg px-2.5 py-3 md:py-4 flex gap-1.5 items-center transition-all"
                            >
                                <Menu className="w-4 h-4 md:w-5 md:h-5" />
                                <span className="text-[10px] md:text-xs font-bold tracking-widest uppercase hidden sm:block">Kategori</span>
                            </Button>
                            
                            <div className="flex flex-col text-left">
                                <CardTitle className="text-base md:text-xl font-black uppercase tracking-tight flex items-center gap-1.5">
                                    <RotateCcw className="h-4 w-4 md:h-5 md:w-5 animate-spin-slow hidden md:block" />
                                    Kelime Sudoku
                                </CardTitle>
                                <CardDescription className="text-indigo-100 font-bold text-[9px] md:text-[10px] mt-0.5">
                                    Aktif: <span className="text-yellow-300 ml-1">{category.name}</span>
                                </CardDescription>
                            </div>
                        </div>

                        {/* Sağ Kısım: Ayarlar ve Kontroller */}
                        <div className="flex items-center gap-1.5 w-full lg:w-auto justify-end overflow-x-auto pb-1 lg:pb-0 hide-scrollbar">
                            
                            {/* Font Ölçekleme */}
                            <div className="flex bg-indigo-900/40 p-1 rounded-lg shadow-inner border border-indigo-500/30 items-center shrink-0">
                                <button onClick={() => setTextScale(s => Math.max(s - 0.15, 0.5))} className="px-1.5 py-1 text-indigo-100 hover:text-white hover:bg-white/10 rounded-md font-black text-xs transition-all" title="Küçült">A-</button>
                                <span className="text-[9px] md:text-[10px] font-bold text-indigo-200 w-8 text-center">% {Math.round(textScale * 100)}</span>
                                <button onClick={() => setTextScale(s => Math.min(s + 0.15, 2.5))} className="px-1.5 py-1 text-indigo-100 hover:text-white hover:bg-white/10 rounded-md font-black text-xs transition-all" title="Büyüt">A+</button>
                            </div>

                            {/* Boyut Seçici */}
                            <div className="flex bg-indigo-900/40 p-1 rounded-lg shadow-inner border border-indigo-500/30 shrink-0">
                                <button onClick={() => setGridSize(4)} className={cn("flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest transition-all", gridSize === 4 ? "bg-white text-indigo-600 shadow-sm scale-105" : "text-indigo-100 hover:text-white hover:bg-white/10")}><Grid2X2 className="w-3 h-3" /> <span className="hidden md:inline">4x4</span></button>
                                <button onClick={() => setGridSize(9)} className={cn("flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest transition-all", gridSize === 9 ? "bg-white text-indigo-600 shadow-sm scale-105" : "text-indigo-100 hover:text-white hover:bg-white/10")}><Grid3X3 className="w-3 h-3" /> <span className="hidden md:inline">9x9</span></button>
                            </div>

                            {/* Zorluk Seviyeleri */}
                            <div className="flex gap-1 bg-black/20 p-1 rounded-lg shrink-0">
                                {DIFFICULTIES.map(level => (
                                    <button
                                        key={level.id}
                                        onClick={() => setDifficulty(level)}
                                        className={cn(
                                            "px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest transition-all",
                                            difficulty.id === level.id ? "bg-white text-indigo-600 shadow-sm" : "text-white/70 hover:text-white hover:bg-white/10"
                                        )}
                                    >
                                        {level.name}
                                    </button>
                                ))}
                            </div>
                            
                            <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="text-white hover:bg-white/20 h-7 w-7 md:h-8 md:w-8 rounded-lg shrink-0 bg-white/5 border border-white/10">
                                {isFullscreen ? <Minimize className="h-3 w-3 md:h-4 md:w-4" /> : <Maximize className="h-3 w-3 md:h-4 md:w-4" />}
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                {/* --- ANA İÇERİK ALANI (Taşmayı Engellemek İçin Özel Kısıtlamalar) --- */}
                {/* min-h-0: Flex child'ın ebeveyn dışına taşmasını kesin engeller. */}
                <CardContent className="flex-1 min-h-0 flex flex-col lg:flex-row p-2 gap-3 overflow-hidden relative justify-center">
                    
                    {/* ORTA PANEL: DEVASA SUDOKU GRID (Yüksekliğe Dayalı Boyutlandırma) */}
                    <div className="flex-1 min-w-0 min-h-0 flex items-center justify-center relative w-full h-full">
                        {/* 
                            Bu div yüksekliği %100 alıp, genişliği aspect-square ile yüksekliğe eşitler.
                            max-w-full ise genişliğin ekrandan taşmamasını sağlar. 
                            Sonuç: Kusursuz, ortalanmış, hiçbir yere taşmayan bir kare ızgara! 
                        */}
                        <div className="aspect-square w-auto h-full max-w-full bg-slate-900 p-1.5 md:p-3 rounded-2xl shadow-xl border-4 md:border-[6px] border-slate-800 flex flex-col justify-center mx-auto">
                            <div className={cn(
                                "grid flex-1 h-full w-full",
                                gridSize === 4 ? "grid-cols-2 gap-1.5 md:gap-2" : "grid-cols-3 gap-0.5 md:gap-1"
                            )}>
                                {[...Array(gridSize)].map((_, blockIdx) => {
                                    const blockCols = Math.sqrt(gridSize); 
                                    const startRow = Math.floor(blockIdx / blockCols) * blockCols;
                                    const startCol = (blockIdx % blockCols) * blockCols;
                                    
                                    return (
                                        <div key={blockIdx} className={cn(
                                            "grid bg-slate-800/60 rounded-lg h-full w-full",
                                            gridSize === 4 ? "grid-cols-2 gap-1 md:gap-1.5 p-1 md:p-1.5" : "grid-cols-3 gap-[2px] p-[2px]"
                                        )}>
                                            {[...Array(gridSize)].map((_, cellIdx) => {
                                                const r = startRow + Math.floor(cellIdx / blockCols);
                                                const c = startCol + (cellIdx % blockCols);
                                                
                                                if (!grid[r] || grid[r][c] === undefined) return null;
                                                
                                                const value = grid[r][c];
                                                const isInitial = initialGrid[r][c] !== '';
                                                const isCorrect = value === '' || value === solvedGrid[r][c];
                                                const isSelected = selectedCell?.r === r && selectedCell?.c === c;

                                                return (
                                                    <button
                                                        key={`${r}-${c}`}
                                                        onClick={() => handleCellClick(r, c)}
                                                        disabled={isInitial || isFinished}
                                                        className={cn(
                                                            "w-full h-full flex items-center justify-center text-center transition-all duration-200 relative group overflow-hidden select-none",
                                                            // Yazı tipleri taşmayacak şekilde makul seviyelere çekildi
                                                            gridSize === 4 
                                                                ? "rounded-md p-1 text-sm md:text-xl lg:text-3xl font-black uppercase tracking-tight break-all leading-none" 
                                                                : "rounded-sm p-0.5 text-[8px] sm:text-[9px] md:text-xs lg:text-sm font-bold uppercase tracking-tighter break-all leading-[1.1]",
                                                            isSelected && !isInitial && "ring-2 md:ring-4 ring-yellow-400 z-10 scale-[1.05] shadow-2xl",
                                                            isInitial 
                                                                ? "bg-slate-700 text-slate-300 border border-slate-600 cursor-default shadow-inner" 
                                                                : value === ''
                                                                    ? "bg-slate-800/90 hover:bg-slate-700 text-white border border-dashed border-slate-600"
                                                                    : isCorrect 
                                                                        ? "bg-indigo-600 text-white border border-indigo-400 shadow-[0_0_10px_rgba(79,70,229,0.4)]"
                                                                        : "bg-red-500 text-white border border-red-400 animate-pulse"
                                                        )}
                                                    >
                                                        {isInitial && <Lock className={cn("absolute opacity-20 text-slate-400 hidden sm:block", gridSize === 4 ? "top-1 right-1 w-3 h-3" : "top-0.5 right-0.5 w-1.5 h-1.5")} />}
                                                        <span style={{ fontSize: `${textScale}em` }}>{value}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* SAĞ PANEL: TEK SÜTUN KLAVYE & EYLEMLER */}
                    <div className="w-full lg:w-52 xl:w-60 flex flex-col gap-2 md:gap-3 overflow-y-auto shrink-0 z-10 custom-scrollbar pr-1 h-full">
                        
                        {/* İpucu Alanı */}
                        <div className="bg-white rounded-xl p-2.5 md:p-3 border-2 border-slate-100 shadow-sm shrink-0">
                            <div className="flex items-center justify-between mb-1.5 md:mb-2">
                                <Label className="text-[9px] md:text-[10px] font-black uppercase text-slate-400 tracking-wider">İpuçları</Label>
                                <Badge className="bg-indigo-100 text-indigo-700 border-none font-black text-[9px] md:text-[10px] px-1.5 py-0.5 rounded-md">{hintsRemaining} Kalan</Badge>
                            </div>
                            <Progress value={(hintsRemaining / (gridSize === 4 ? 3 : 5)) * 100} className="h-1.5 rounded-full bg-slate-100 mb-2" />
                            <Button 
                                variant="outline" onClick={takeHint} disabled={hintsRemaining <= 0 || isFinished}
                                className="w-full h-7 md:h-8 border-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-400 rounded-lg font-black text-[9px] md:text-[10px] transition-all"
                            >
                                <HelpCircle className="w-3 h-3 mr-1.5" /> İpucu Kullan
                            </Button>
                        </div>

                        {/* Klavye */}
                        <div className="bg-white rounded-xl p-2 md:p-2.5 border-2 border-slate-100 shadow-sm relative flex flex-col flex-1 min-h-0">
                            <div className="w-full bg-slate-50 border-b border-slate-100 p-1 md:p-1.5 mb-1.5 rounded-lg flex items-center justify-center gap-1.5 shrink-0">
                                <MousePointerClick className="w-3 h-3 text-indigo-500" />
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Kelime Seç</span>
                            </div>
                            
                            <div className="grid grid-cols-1 gap-1.5 overflow-y-auto pr-1 flex-1 hide-scrollbar">
                                {activeWords.map((word) => (
                                    <button 
                                        key={word} 
                                        onClick={() => handleWordSelect(word)}
                                        className={cn(
                                            "w-full rounded-lg border-2 font-black transition-all shadow-sm active:scale-95 text-center break-words leading-tight flex items-center justify-center",
                                            gridSize === 4 ? "p-2 md:p-3 text-xs md:text-sm min-h-[36px]" : "p-1.5 text-[9px] md:text-[10px] min-h-[28px]",
                                            category.color,
                                            "bg-white border-slate-200 hover:border-indigo-400 hover:bg-indigo-50",
                                            selectedCell ? "opacity-100" : "opacity-50 grayscale cursor-not-allowed"
                                        )}
                                        disabled={!selectedCell}
                                    >
                                        <span style={{ fontSize: `${textScale}em` }}>{word}</span>
                                    </button>
                                ))}
                                <button 
                                    onClick={() => handleWordSelect('')}
                                    className={cn(
                                        "w-full rounded-lg border-2 font-black transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1.5 mt-auto",
                                        gridSize === 4 ? "p-2 md:p-3 text-[9px] md:text-[10px] min-h-[36px]" : "p-1.5 text-[8px] md:text-[9px] min-h-[28px]",
                                        "bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200 hover:text-slate-800 hover:border-slate-400",
                                        selectedCell ? "opacity-100" : "opacity-50 cursor-not-allowed"
                                    )}
                                    disabled={!selectedCell}
                                >
                                    <Trash2 className="w-3 h-3" /> BOŞALT
                                </button>
                            </div>
                        </div>

                        {/* Alt Butonlar */}
                        <div className="space-y-1.5 shrink-0">
                            <Button 
                                onClick={checkSolution} disabled={isFinished}
                                className="w-full h-10 md:h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs md:text-sm uppercase tracking-widest rounded-lg shadow-md shadow-indigo-500/20 active:scale-95 transition-all"
                            >
                                <CheckCircle2 className="w-4 h-4 mr-1.5" /> KONTROL ET
                            </Button>
                            
                            <Button 
                                variant="ghost" onClick={initGame}
                                className="w-full h-7 md:h-8 text-slate-500 hover:text-rose-600 hover:bg-rose-50 font-bold rounded-lg transition-colors text-[9px] md:text-[10px]"
                            >
                                <RotateCcw className="w-3 h-3 mr-1.5" /> Yeniden Başlat
                            </Button>
                        </div>
                    </div>
                </CardContent>

                {/* --- ALT BİLGİ PANELİ (FOOTER) --- */}
                <CardFooter className="bg-slate-100 p-2 md:p-3 flex justify-between items-center border-t-2 border-slate-200 shrink-0 h-10 md:h-12">
                     <p className="text-[8px] md:text-[9px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-1.5">
                        <Trophy className="h-3 w-3 text-amber-500" /> Hata: <span className="text-slate-900 text-xs font-black ml-1">{errorCount}</span>
                     </p>
                     <span className="text-[7px] md:text-[8px] font-black text-indigo-600 uppercase tracking-widest bg-white px-2 py-1 rounded-md shadow-sm border border-slate-200">
                         Din Dersi Atölyesi
                     </span>
                </CardFooter>
            </Card>

            {/* --- BAŞARI EKRANI --- */}
            {isFinished && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-500">
                    <Card className="max-w-md lg:max-w-lg w-full bg-white border-none shadow-[0_0_100px_rgba(79,70,229,0.5)] rounded-3xl overflow-hidden animate-in zoom-in-95 duration-500">
                        <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-6 md:p-8 text-center relative overflow-hidden">
                             <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay" />
                             <PartyPopper className="w-16 h-16 md:w-20 md:h-20 text-white mx-auto mb-3 md:mb-4 animate-bounce relative z-10 drop-shadow-2xl" />
                             <CardTitle className="text-2xl md:text-4xl font-black text-white uppercase relative z-10 tracking-tight">Tebrikler!</CardTitle>
                        </div>
                        <CardContent className="p-5 md:p-8 text-center space-y-4 md:space-y-6">
                            <p className="text-slate-600 font-bold text-xs md:text-sm">Harika! {gridSize * gridSize} hücrelik Sudoku tahtasını kusursuz bir şekilde tamamladın.</p>
                            <div className="bg-slate-50 p-3 md:p-4 rounded-xl md:rounded-2xl border-2 border-slate-100 grid grid-cols-2 gap-3">
                                <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-100">
                                    <p className="text-[9px] md:text-[10px] text-slate-400 font-black uppercase tracking-wider mb-1">Yapılan Hata</p>
                                    <p className="text-xl md:text-2xl font-black text-slate-900">{errorCount}</p>
                                </div>
                                <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-100 flex flex-col justify-center">
                                    <p className="text-[9px] md:text-[10px] text-slate-400 font-black uppercase tracking-wider mb-1">Kategori</p>
                                    <p className="text-xs md:text-sm font-black text-indigo-600 uppercase tracking-tighter leading-tight">{category.name}</p>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="p-5 md:p-8 pt-0">
                            <Button onClick={initGame} className="w-full h-12 md:h-14 bg-indigo-600 hover:bg-indigo-700 text-xs md:text-sm font-black uppercase tracking-widest rounded-xl shadow-lg shadow-indigo-500/30 active:scale-95 transition-all">
                                YENİ BULMACA BAŞLAT
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            )}
        </div>
    );
}

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
        console.warn("Ses bileşeni yüklenemedi:", e);
    }
}