'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
    Trophy, RotateCcw, Lightbulb, CheckCircle2, AlertCircle, 
    Lock, BrainCircuit, Heart, Sparkles, Star, Trash2, 
    HelpCircle, Check, ShieldCheck
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';

// --- KATEGORİLER VE KELİMELER ---
const CATEGORIES = [
    { 
        id: 'values', 
        name: 'Değerler', 
        icon: Heart, 
        words: ['SEVGİ', 'SAYGI', 'SABIR', 'İHLAS'],
        color: 'text-rose-500',
        bg: 'bg-rose-500/10'
    },
    { 
        id: 'worship', 
        name: 'İbadetler', 
        icon: Sparkles, 
        words: ['NAMAZ', 'ORUÇ', 'HAC', 'ZEKAT'],
        color: 'text-emerald-500',
        bg: 'bg-emerald-500/10'
    },
    { 
        id: 'concepts', 
        name: 'Kavramlar', 
        icon: BrainCircuit, 
        words: ['İMAN', 'İSLAM', 'İHSAN', 'TEVHİD'],
        color: 'text-indigo-500',
        bg: 'bg-indigo-500/10'
    },
    { 
        id: 'virtues', 
        name: 'Ahlak', 
        icon: ShieldCheck, 
        words: ['ADALET', 'DOĞRU', 'ŞEFKAT', 'EDEP'],
        color: 'text-amber-500',
        bg: 'bg-amber-500/10'
    }
];

// 4x4 Örnek Şablonlar (0: Boş, 1-4: Kelime İndeksi)
const PUZZLES = {
    easy: [
        [1, 0, 0, 4],
        [0, 0, 3, 0],
        [0, 2, 0, 0],
        [4, 0, 0, 1]
    ],
    medium: [
        [0, 2, 0, 0],
        [0, 0, 1, 0],
        [0, 4, 0, 0],
        [1, 0, 0, 2]
    ],
    hard: [
        [0, 0, 3, 0],
        [4, 0, 0, 0],
        [0, 0, 0, 1],
        [0, 2, 0, 0]
    ]
};

export function WordSudoku() {
    const [selectedCat, setSelectedCat] = useState(CATEGORIES[0]);
    const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
    const [grid, setGrid] = useState<number[][]>([]);
    const [initialGrid, setInitialGrid] = useState<number[][]>([]);
    const [isSolved, setIsSolved] = useState(false);
    const [hintsUsed, setHintsUsed] = useState(0);
    const [errors, setErrors] = useState<Set<string>>(new Set());

    // Oyunu Başlat
    const initGame = useCallback(() => {
        const template = PUZZLES[difficulty];
        const newGrid = template.map(row => [...row]);
        setGrid(newGrid);
        setInitialGrid(template.map(row => [...row]));
        setIsSolved(false);
        setHintsUsed(0);
        setErrors(new Set());
    }, [difficulty]);

    useEffect(() => {
        initGame();
    }, [initGame]);

    // Hücreye tıklandığında kelimeyi değiştir (Döngüsel)
    const handleCellClick = (r: number, c: number) => {
        if (initialGrid[r][c] !== 0 || isSolved) return;

        const nextVal = (grid[r][c] % 4) + 1;
        const newGrid = grid.map((row, ri) => 
            row.map((val, ci) => ri === r && ci === c ? nextVal : val)
        );
        
        setGrid(newGrid);
        validateCell(r, c, nextVal, newGrid);
    };

    // Hücre doğrulaması (Satır, Sütun, 2x2 Blok kontrolü)
    const validateCell = (r: number, c: number, val: number, currentGrid: number[][]) => {
        const newErrors = new Set(errors);
        const cellId = `${r}-${c}`;
        newErrors.delete(cellId);

        // Satır kontrolü
        for (let i = 0; i < 4; i++) {
            if (i !== c && currentGrid[r][i] === val) newErrors.add(cellId);
        }
        // Sütun kontrolü
        for (let i = 0; i < 4; i++) {
            if (i !== r && currentGrid[i][c] === val) newErrors.add(cellId);
        }
        // 2x2 Blok kontrolü
        const startR = Math.floor(r / 2) * 2;
        const startC = Math.floor(c / 2) * 2;
        for (let i = startR; i < startR + 2; i++) {
            for (let j = startC; j < startC + 2; j++) {
                if ((i !== r || j !== c) && currentGrid[i][j] === val) newErrors.add(cellId);
            }
        }

        setErrors(newErrors);
    };

    // Tümünü Kontrol Et
    const checkSolution = () => {
        const isComplete = grid.every(row => row.every(cell => cell !== 0));
        if (!isComplete) {
            toast({ title: "Eksik Var!", description: "Lütfen tüm boşlukları doldurun.", variant: "destructive" });
            return;
        }

        if (errors.size === 0) {
            setIsSolved(true);
            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#4f46e5', '#10b981', '#fbbf24']
            });
        } else {
            toast({ title: "Hatalar Var", description: "Bazı kelimeler kurallara uymuyor.", variant: "destructive" });
        }
    };

    const toast = ({ title, description, variant }: any) => {
        // Basit bir toast simülasyonu veya sistem toast'u buraya bağlanabilir
        console.log(`${title}: ${description}`);
    };

    return (
        <Card className="bg-white/90 backdrop-blur-xl border border-white/60 shadow-2xl rounded-[2.5rem] overflow-hidden">
            <CardHeader className="bg-indigo-600 p-8 text-white relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-[url('/noise.png')] opacity-10 pointer-events-none" />
                <div className="flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
                    <div className="flex items-center gap-5">
                        <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-md border border-white/30 shadow-lg">
                            <BrainCircuit className="w-10 h-10 text-white" />
                        </div>
                        <div>
                            <CardTitle className="text-3xl font-black tracking-tight uppercase">Kelime Sudoku</CardTitle>
                            <CardDescription className="text-indigo-100 font-medium opacity-90">
                                Her satır, sütun ve 2x2'lik blokta kelimeler sadece bir kez geçmeli.
                            </CardDescription>
                        </div>
                    </div>
                    <div className="flex bg-black/20 p-1.5 rounded-2xl border border-white/10">
                        {(['easy', 'medium', 'hard'] as const).map(d => (
                            <button
                                key={d}
                                onClick={() => setDifficulty(d)}
                                className={cn(
                                    "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                                    difficulty === d ? "bg-white text-indigo-600 shadow-lg" : "text-white/60 hover:text-white"
                                )}
                            >
                                {d === 'easy' ? 'KOLAY' : d === 'medium' ? 'ORTA' : 'ZOR'}
                            </button>
                        ))}
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-8 lg:p-12">
                <div className="flex flex-col lg:flex-row gap-12 items-start justify-center">
                    
                    {/* SOL: AYARLAR VE KATEGORİLER */}
                    <div className="w-full lg:w-72 space-y-6">
                        <section className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Kelime Grubu</Label>
                            <div className="grid grid-cols-1 gap-2">
                                {CATEGORIES.map(cat => (
                                    <button
                                        key={cat.id}
                                        onClick={() => { setSelectedCat(cat); initGame(); }}
                                        className={cn(
                                            "flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all text-left group",
                                            selectedCat.id === cat.id 
                                                ? `${cat.border || 'border-indigo-500'} ${cat.bg} ${cat.color}` 
                                                : "border-slate-100 bg-white text-slate-400 hover:border-slate-200"
                                        )}
                                    >
                                        <cat.icon className={cn("w-5 h-5", selectedCat.id === cat.id ? "animate-pulse" : "opacity-50")} />
                                        <span className="font-bold text-sm uppercase tracking-tight">{cat.name}</span>
                                    </button>
                                ))}
                            </div>
                        </section>

                        <section className="p-5 rounded-3xl bg-slate-50 border border-slate-100 space-y-3">
                            <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider">
                                <Lightbulb className="w-4 h-4" /> Kelime Anahtarı
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                                {selectedCat.words.map((w, i) => (
                                    <div key={i} className="flex items-center gap-3 text-sm font-bold text-slate-600 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                                        <span className="w-6 h-6 flex items-center justify-center bg-slate-100 rounded text-[10px] text-slate-400">{i + 1}</span>
                                        {w}
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>

                    {/* ORTA: SUDOKU GRİD */}
                    <div className="relative">
                        <div className="bg-slate-900 p-4 rounded-[2.5rem] shadow-2xl border-4 border-slate-800">
                            <div className="grid grid-cols-4 gap-0">
                                {grid.map((row, r) => (
                                    row.map((val, c) => {
                                        const isFixed = initialGrid[r][c] !== 0;
                                        const isError = errors.has(`${r}-${c}`);
                                        const word = val === 0 ? '' : selectedCat.words[val - 1];
                                        
                                        // Blok Sınırları İçin Stratejik Boşluklar
                                        const marginRight = (c === 1) ? 'mr-4' : 'mr-1.5';
                                        const marginBottom = (r === 1) ? 'mb-4' : 'mb-1.5';
                                        const isLastCol = c === 3;
                                        const isLastRow = r === 3;

                                        return (
                                            <button
                                                key={`${r}-${c}`}
                                                onClick={() => handleCellClick(r, c)}
                                                disabled={isFixed || isSolved}
                                                className={cn(
                                                    "w-20 h-20 md:w-24 md:h-24 rounded-2xl flex flex-col items-center justify-center transition-all duration-200 text-center relative",
                                                    !isLastCol && marginRight,
                                                    !isLastRow && marginBottom,
                                                    isFixed 
                                                        ? "bg-slate-800 text-slate-400 cursor-not-allowed border border-white/5" 
                                                        : "bg-white text-slate-800 hover:bg-slate-50 border-b-4 border-slate-200 active:border-b-0 active:translate-y-1 shadow-md",
                                                    isError && "bg-red-50 text-red-600 border-red-200 animate-shake-game",
                                                    isSolved && "border-emerald-500 bg-emerald-50 text-emerald-700"
                                                )}
                                            >
                                                {isFixed && <Lock className="w-3 h-3 absolute top-2 right-2 opacity-30" />}
                                                <span className={cn(
                                                    "font-black tracking-tighter transition-all leading-tight",
                                                    word.length > 5 ? "text-[10px] md:text-xs" : "text-xs md:text-sm"
                                                )}>
                                                    {word}
                                                </span>
                                            </button>
                                        );
                                    })
                                ))}
                            </div>
                        </div>

                        {/* Kazanan Rozeti */}
                        {isSolved && (
                            <div className="absolute -top-6 -right-6 animate-tada z-20">
                                <div className="bg-yellow-400 p-4 rounded-full shadow-2xl border-4 border-white">
                                    <Trophy className="w-10 h-10 text-yellow-900" />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* SAĞ: KONTROL VE SKOR */}
                    <div className="w-full lg:w-64 space-y-4">
                        <Card className="bg-indigo-50 border-indigo-100 shadow-sm rounded-[2rem]">
                            <CardContent className="p-6 text-center">
                                <div className="p-3 bg-white rounded-2xl inline-block mb-3 shadow-sm border border-indigo-100">
                                    <Trophy className="w-8 h-8 text-indigo-500" />
                                </div>
                                <h4 className="font-black text-indigo-900 uppercase text-xs tracking-widest mb-1">Durum</h4>
                                <p className="text-3xl font-black text-indigo-600 tabular-nums">
                                    {grid.flat().filter(v => v !== 0).length} / 16
                                </p>
                            </CardContent>
                        </Card>

                        <div className="space-y-3">
                            <Button 
                                onClick={checkSolution} 
                                disabled={isSolved}
                                className="w-full h-16 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg shadow-xl shadow-indigo-200 group"
                            >
                                {isSolved ? (
                                    <>TAMAMLANDI <Check className="ml-2 w-6 h-6" /></>
                                ) : (
                                    <>KONTROL ET <CheckCircle2 className="ml-2 w-6 h-6 group-hover:scale-110 transition-transform" /></>
                                )}
                            </Button>
                            
                            <Button 
                                variant="outline" 
                                onClick={initGame}
                                className="w-full h-14 rounded-2xl border-2 border-slate-200 text-slate-600 font-bold hover:bg-slate-50"
                            >
                                <RotateCcw className="mr-2 w-5 h-5" /> YENİDEN BAŞLAT
                            </Button>

                            <Button 
                                variant="ghost" 
                                onClick={() => { if(confirm('Tüm ilerlemeniz silinecek. Emin misiniz?')) initGame(); }}
                                className="w-full h-12 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold"
                            >
                                <Trash2 className="w-4 h-4 mr-2" /> Temizle ve Baştan Başla
                            </Button>
                        </div>
                    </div>

                </div>
            </CardContent>

            {isSolved && (
                <CardFooter className="bg-emerald-500 p-6 flex flex-col items-center justify-center text-white text-center gap-2 animate-in slide-in-from-bottom-full duration-700">
                    <div className="flex items-center gap-4">
                        <PartyPopper className="w-10 h-10 animate-bounce" />
                        <h3 className="text-3xl font-black tracking-tighter uppercase">TEBRİKLER!</h3>
                        <PartyPopper className="w-10 h-10 animate-bounce" />
                    </div>
                    <p className="font-bold text-emerald-100">Bulmacayı hatasız bir şekilde tamamladın!</p>
                </CardFooter>
            )}
        </Card>
    );
}