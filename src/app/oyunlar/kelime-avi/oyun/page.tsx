'use client';

import { useState, useEffect, useCallback, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getKelimeAviAction, submitKelimeAviScoreAction } from '../actions';
import { Button } from '@/components/ui/button';
import { Loader2, Search, ZoomIn, ZoomOut, RotateCw, ArrowLeft, Trophy, XOctagon, ChevronDown, ChevronUp, Settings2, Plus, Minus, Type, Scan, GripHorizontal, MousePointerClick, CheckCircle, RotateCcw, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { GameEndScreen } from '@/components/game-end-screen';
import { playSound } from '@/lib/audio-service';
import { GENERIC_TURKISH_WORDS } from '@/lib/generic-words';
import { FullscreenToggle } from '@/components/fullscreen-toggle';
import { db } from '@/lib/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

// --- ORTAK ARKA PLAN ---
const MagnificentLightBackground = () => (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-slate-50">
        <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-indigo-200/40 rounded-full blur-[120px] animate-pulse-slow mix-blend-multiply" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-sky-200/40 rounded-full blur-[120px] animate-pulse-slow delay-700 mix-blend-multiply" />
        <div className="absolute top-[40%] left-[50%] w-[400px] h-[400px] bg-purple-200/30 rounded-full blur-[100px] animate-pulse-slow delay-1000 mix-blend-multiply" />
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.015] mix-blend-overlay"></div>
    </div>
);

// --- OYUN MANTIĞI ---
const GRID_SIZE = 14;
const DIRECTIONS = [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: -1, y: 1 }];

const generateGrid = (words: string[]) => {
    let grid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(''));
    let placedWords = new Set<string>();

    for (const word of words) {
        let placed = false;
        let attempts = 0;
        while (!placed && attempts < 100) {
            const direction = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
            const row = Math.floor(Math.random() * GRID_SIZE);
            const col = Math.floor(Math.random() * GRID_SIZE);

            let canPlace = true;
            for (let i = 0; i < word.length; i++) {
                const newRow = row + i * direction.y;
                const newCol = col + i * direction.x;
                if (newRow < 0 || newRow >= GRID_SIZE || newCol < 0 || newCol >= GRID_SIZE ||
                    (grid[newRow][newCol] !== '' && grid[newRow][newCol] !== word[i])) {
                    canPlace = false;
                    break;
                }
            }

            if (canPlace) {
                for (let i = 0; i < word.length; i++) {
                    const newRow = row + i * direction.y;
                    const newCol = col + i * direction.x;
                    grid[newRow][newCol] = word[i];
                }
                placed = true;
                placedWords.add(word);
            }
            attempts++;
        }
    }

    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (grid[r][c] === '') {
                 grid[r][c] = GENERIC_TURKISH_WORDS[Math.floor(Math.random() * GENERIC_TURKISH_WORDS.length)].charAt(0).toLocaleUpperCase('tr-TR');
            }
        }
    }
    return { grid, placedWords: Array.from(placedWords) };
};

type Cell = { r: number, c: number };

// --- BİLEŞENLER ---

const WordList = ({ words, foundWords, fontSize }: { words: string[], foundWords: Set<string>, fontSize: number }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    const dynamicStyle = {
        fontSize: `${fontSize * 0.85}rem`,
        lineHeight: '1.2'
    };

    const DesktopView = (
        <div className={cn(
            "hidden lg:flex flex-shrink-0 bg-white/80 backdrop-blur-md border border-white/60 shadow-lg rounded-2xl h-full overflow-hidden flex-col transition-all duration-500",
            words.length > 14 ? "w-[400px] xl:w-[450px]" : "w-64 xl:w-72"
        )}>
            <h3 className="font-black text-lg p-4 text-indigo-600 flex items-center gap-2 bg-white/90 border-b border-indigo-100 flex-shrink-0">
                <Search className="h-5 w-5"/> Kelimeler ({foundWords.size}/{words.length})
            </h3>
            
            <div className="flex-grow overflow-y-auto p-4 custom-scrollbar">
                <div className={cn("grid gap-2", words.length > 14 ? "grid-cols-2" : "grid-cols-1")}>
                    {words.map(word => (
                        <div 
                            key={word} 
                            style={dynamicStyle}
                            className={cn(
                                "transition-all duration-300 font-black p-2 rounded-xl border flex items-center justify-between uppercase tracking-tight shadow-sm",
                                foundWords.has(word) 
                                    ? "bg-emerald-50 border-emerald-200 text-emerald-600 line-through opacity-70" 
                                    : "bg-white border-slate-200 text-slate-700 hover:border-indigo-200"
                            )}
                        >
                            <span className="truncate pr-1">{word.toLocaleUpperCase('tr-TR')}</span>
                            {foundWords.has(word) && <span className="bg-emerald-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] flex-shrink-0">✓</span>}
                        </div>
                    ))}
                </div>
            </div>

            <div className="p-4 bg-indigo-50/50 border-t border-indigo-100 flex-shrink-0">
                <div className="flex items-start gap-3 text-xs text-indigo-700 font-bold leading-relaxed">
                    <MousePointerClick className="h-4 w-4 mt-0.5 text-indigo-500 flex-shrink-0" />
                    <span>Kelimeleri bulmak için ilk ve son harflerine tıkla.</span>
                </div>
            </div>
        </div>
    );

    const MobileView = (
        <div className="lg:hidden w-full flex-shrink-0 z-20 px-4 mt-2">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-white/90 backdrop-blur-md border border-white/60 shadow-md rounded-xl p-3 flex items-center justify-between font-bold text-indigo-900"
            >
                <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-indigo-500"/>
                    <span>Kelimeler ({foundWords.size}/{words.length})</span>
                </div>
                {isOpen ? <ChevronUp className="h-5 w-5"/> : <ChevronDown className="h-5 w-5"/>}
            </button>
            
            {isOpen && (
                <div className="absolute top-16 left-4 right-4 bg-white/95 backdrop-blur-xl border border-white/60 shadow-2xl p-4 animate-in slide-in-from-top-2 z-50 rounded-2xl max-h-[60vh] flex flex-col">
                    <div className="grid grid-cols-2 gap-2 overflow-y-auto custom-scrollbar flex-grow pb-4">
                        {words.map(word => (
                            <div 
                                key={word} 
                                style={{ fontSize: `${fontSize * 0.7}rem` }}
                                className={cn(
                                    "transition-all duration-300 font-black p-2 rounded-lg border text-center truncate uppercase",
                                    foundWords.has(word) 
                                        ? "bg-emerald-50 border-emerald-200 text-emerald-600 line-through" 
                                        : "bg-white border-slate-200 text-slate-700 shadow-sm"
                                )}
                            >
                                {word.toLocaleUpperCase('tr-TR')}
                            </div>
                        ))}
                    </div>
                    <div className="pt-3 border-t border-slate-100 text-[10px] text-indigo-600 font-bold flex items-center gap-2 justify-center">
                        <MousePointerClick className="h-3 w-3" />
                        <span>Kelimeleri bulmak için ilk ve son harflerine tıkla.</span>
                    </div>
                </div>
            )}
        </div>
    );

    return <>{DesktopView}{MobileView}</>;
};

const EditorToolbar = ({ fontSize, setFontSize, gridScale, setGridScale }: any) => {
    const [isToolbarOpen, setIsToolbarOpen] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStartPos = useRef({ x: 0, y: 0 });

    useEffect(() => {
        // MOUSE EVENTLERİ
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;
            setPosition({ x: e.clientX - dragStartPos.current.x, y: e.clientY - dragStartPos.current.y });
        };
        const handleMouseUp = () => setIsDragging(false);

        // TOUCH EVENTLERİ (Akıllı Tahta için)
        const handleTouchMove = (e: TouchEvent) => {
            if (!isDragging) return;
            if (e.cancelable) e.preventDefault();
            const touch = e.touches[0];
            setPosition({ x: touch.clientX - dragStartPos.current.x, y: touch.clientY - dragStartPos.current.y });
        };
        const handleTouchEnd = () => setIsDragging(false);

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            window.addEventListener('touchmove', handleTouchMove, { passive: false });
            window.addEventListener('touchend', handleTouchEnd);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleTouchEnd);
        };
    }, [isDragging]);

    const handleDragStart = (clientX: number, clientY: number) => {
        setIsDragging(true);
        dragStartPos.current = { x: clientX - position.x, y: clientY - position.y };
    };

    return (
        <div className="fixed z-[100] transition-all duration-100 ease-out" style={{ left: '50%', bottom: '2rem', transform: `translate(calc(-50% + ${position.x}px), ${position.y}px)`, cursor: isDragging ? 'grabbing' : 'default', maxWidth: '90vw' }}>
             <div className={cn("flex items-center gap-1 sm:gap-2 p-2 rounded-full bg-white/95 border border-white/50 shadow-2xl backdrop-blur-xl ring-1 ring-slate-900/10 transition-all duration-300", !isToolbarOpen && "w-auto px-3 py-3")}>
                <div 
                    onMouseDown={(e) => handleDragStart(e.clientX, e.clientY)}
                    onTouchStart={(e) => handleDragStart(e.touches[0].clientX, e.touches[0].clientY)}
                    className={cn("cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 flex-shrink-0 touch-none", isToolbarOpen ? "pl-2 sm:pl-3 pr-2 py-3 border-r border-slate-200" : "p-1")}
                >
                    <GripHorizontal className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                {isToolbarOpen && (
                    <div className="flex items-center gap-2 sm:gap-4 px-1 sm:px-2 animate-in fade-in zoom-in duration-300 overflow-x-auto no-scrollbar max-w-[70vw] sm:max-w-none">
                        <div className="flex items-center gap-1 flex-shrink-0">
                            <Type className="h-3 w-3 sm:h-4 sm:w-4 text-slate-400 mr-0.5" />
                            <Button variant="ghost" size="icon" onClick={() => setFontSize((s:number) => Math.max(0.5, s - 0.1))} className="h-8 w-8 sm:h-9 sm:w-9 rounded-full hover:bg-slate-100"><Minus className="h-3 w-3 sm:h-4 sm:w-4"/></Button>
                            <span className="text-xs font-bold w-6 sm:w-8 text-center">{Math.round(fontSize * 10)}</span>
                            <Button variant="ghost" size="icon" onClick={() => setFontSize((s:number) => Math.min(3.0, s + 0.1))} className="h-8 w-8 sm:h-9 sm:w-9 rounded-full hover:bg-slate-100"><Plus className="h-3 w-3 sm:h-4 sm:w-4"/></Button>
                        </div>
                        <div className="w-px h-6 sm:h-8 bg-slate-200 flex-shrink-0"></div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                            <Scan className="h-3 w-3 sm:h-4 sm:w-4 text-slate-400 mr-0.5" />
                            <Button variant="ghost" size="icon" onClick={() => setGridScale((s:number) => Math.max(0.5, s - 0.1))} className="h-8 w-8 sm:h-9 sm:w-9 rounded-full hover:bg-slate-100"><Minus className="h-3 w-3 sm:h-4 sm:w-4"/></Button>
                            <span className="text-xs font-bold w-8 sm:w-10 text-center">{Math.round(gridScale * 100)}%</span>
                            <Button variant="ghost" size="icon" onClick={() => setGridScale((s:number) => Math.min(1.5, s + 0.1))} className="h-8 w-8 sm:h-9 sm:w-9 rounded-full hover:bg-slate-100"><Plus className="h-3 w-3 sm:h-4 sm:w-4"/></Button>
                        </div>
                        <div className="ml-1 pl-2 border-l border-slate-200 flex-shrink-0">
                            <Button variant="ghost" size="icon" onClick={() => setIsToolbarOpen(false)} className="h-8 w-8 sm:h-9 sm:w-9 rounded-full text-slate-400"><ChevronDown className="h-4 w-4 sm:h-5 sm:w-5" /></Button>
                        </div>
                    </div>
                )}
                {!isToolbarOpen && (
                    <div className="animate-in fade-in zoom-in duration-300 ml-1">
                          <Button variant="ghost" size="icon" onClick={() => setIsToolbarOpen(true)} className="h-9 w-9 rounded-full bg-indigo-100 text-indigo-600 hover:bg-indigo-200"><Settings2 className="h-5 w-5" /></Button>
                    </div>
                )}
             </div>
        </div>
    );
};

const Grid = ({ grid, onSelectCell, selection, foundPaths, fontSize, gridScale }: any) => (
    <div className="flex items-center justify-center w-full h-full overflow-hidden p-1 relative">
        <div 
            className="relative aspect-square bg-white/60 backdrop-blur-md border-2 border-white/50 rounded-xl lg:rounded-3xl shadow-xl overflow-hidden p-1 sm:p-2 ring-1 ring-slate-900/5 transition-transform duration-200 ease-out origin-center"
            style={{ width: 'min(100%, 100vh - 120px)', height: 'min(100%, 100vw - 32px)', transform: `scale(${gridScale})` }}
        >
            <div className="grid gap-0.5 h-full w-full select-none" style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${GRID_SIZE}, minmax(0, 1fr))` }}>
                {grid.flat().map((letter: string, i: number) => {
                    const r = Math.floor(i / GRID_SIZE);
                    const c = i % GRID_SIZE;
                    const isSelected = selection.some((cell:any) => cell.r === r && cell.c === c);
                    const isFound = foundPaths.some((path:any) => path.some((cell:any) => cell.r === r && cell.c === c));
                    const pathColors = ["bg-teal-500 border-teal-600", "bg-rose-500 border-rose-600", "bg-indigo-500 border-indigo-600", "bg-amber-500 border-amber-600", "bg-emerald-500 border-emerald-600", "bg-purple-500 border-purple-600"];
                    let foundColorClass = "";
                    if (isFound) {
                        const foundPathIndex = foundPaths.findIndex((path:any) => path.some((cell:any) => cell.r === r && cell.c === c));
                        foundColorClass = pathColors[foundPathIndex % pathColors.length];
                    }
                    return (
                        <button key={`${r}-${c}`} onClick={() => onSelectCell({ r, c })} className={cn("flex items-center justify-center rounded-sm sm:rounded-md font-black transition-all duration-150 touch-manipulation active:scale-90 border-[1px]", isSelected ? "bg-yellow-400 text-yellow-900 border-yellow-600 scale-105 z-10 shadow-lg" : isFound ? cn(foundColorClass, "text-white scale-100 border-transparent shadow-inner") : "bg-white/80 text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-indigo-200 hover:text-indigo-600")} style={{ fontSize: `calc(${fontSize} * clamp(0.6rem, 2.5vmin, 1.5rem))` }}>
                            {letter}
                        </button>
                    );
                })}
            </div>
        </div>
    </div>
);

function WordSearchGame() {
    const { user } = useAuth();
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const router = useRouter();
    const mainContentRef = useRef<HTMLDivElement>(null);
    const [gameState, setGameState] = useState<'loading' | 'playing' | 'finished' | 'error'>('loading');
    const [grid, setGrid] = useState<string[][]>([]);
    const [wordsToFind, setWordsToFind] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [selection, setSelection] = useState<Cell[]>([]);
    const [foundWords, setFoundWords] = useState<Set<string>>(new Set());
    const [foundPaths, setFoundPaths] = useState<Cell[][]>([]);
    const [score, setScore] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const [isScoreSaved, setIsScoreSaved] = useState(false);
    const [fontSize, setFontSize] = useState(1); 
    const [gridScale, setGridScale] = useState(1.0);

    // GÖREV MODU PARAMETRELERİ
    const mode = searchParams.get('mode');
    const topicId = searchParams.get('topicId');
    // Threshold artık kullanılmıyor ama kod güvenliği için kalsın
    const isMission = mode === 'mission';

    const gameContext = `Kelime Avı - ${searchParams.get('courseName')} > ${searchParams.get('topicName')}`;

    const fetchGameData = useCallback(async () => {
        setGameState('loading');
        const params = {
            courseId: searchParams.get('courseId') || undefined,
            unitId: searchParams.get('unitId') || undefined,
            topicId: searchParams.get('topicId') || undefined,
        };
        const result = await getKelimeAviAction(params);
        if (result.error || !result.concepts) {
            setError(result.error || "Kelime bulunamadı.");
            setGameState('error');
        } else {
            const { grid: newGrid, placedWords } = generateGrid(result.concepts);
            setGrid(newGrid);
            setWordsToFind(placedWords.sort());
            setGameState('playing');
        }
    }, [searchParams]);

    useEffect(() => { fetchGameData(); }, [fetchGameData]);

    const handleRestart = () => {
        setScore(0);
        setFoundWords(new Set());
        setFoundPaths([]);
        setIsScoreSaved(false);
        setGameState('playing');
        fetchGameData();
    };

    // YENİ BAŞARI KONTROLÜ
    const isAllWordsFound = wordsToFind.length > 0 && foundWords.size === wordsToFind.length;

    // PUAN KAYDETME FONKSİYONU
    const saveScore = async () => {
        if (!user || isSaving || isScoreSaved) return;
        setIsSaving(true);

        try {
            if (isMission && topicId) {
                // --- GÖREV MODU KAYDI ---
                // Sadece tüm kelimeler bulunduysa kaydet
                await addDoc(collection(db, 'scoreEvents'), {
                    userId: user.uid,
                    points: score,
                    context: topicId, // Görev sayfası bu ID'ye bakarak kilidi açacak
                    gameType: 'kelime-avi', // Görev tipi
                    timestamp: serverTimestamp(),
                    isMission: true,
                    completed: isAllWordsFound // Ek bilgi
                });

                if (isAllWordsFound) {
                    toast({ title: "Görev Başarılı!", description: "Bir sonraki görevin kilidi açıldı.", className: "bg-green-600 text-white" });
                } else {
                    toast({ title: "Görev Tamamlanamadı", description: "Tüm kelimeleri bulmalısın.", variant: "destructive" });
                }
            } else {
                // --- NORMAL (ARCADE) MOD KAYDI ---
                await submitKelimeAviScoreAction(user!.uid, score, gameContext);
            }
            
            setIsScoreSaved(true);
        } catch (err) {
            console.error(err);
            toast({ title: "Hata", description: "Puan kaydedilemedi.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleSelectCell = (cell: Cell) => {
        if (selection.length === 0) setSelection([cell]);
        else {
            const start = selection[0];
            const dx = Math.sign(cell.c - start.c);
            const dy = Math.sign(cell.r - start.r);
            if (Math.abs(cell.c - start.c) === Math.abs(cell.r - start.r) || start.c === cell.c || start.r === cell.r) {
                const line: Cell[] = [];
                let r = start.r, c = start.c;
                while (true) {
                    line.push({ r, c });
                    if (r === cell.r && c === cell.c) break;
                    r += dy; c += dx;
                    if(line.length > GRID_SIZE) break; 
                }
                const word = line.map(c => grid[c.r][c.c]).join('');
                const rev = word.split('').reverse().join('');
                const found = wordsToFind.find(w => (w === word || w === rev) && !foundWords.has(w));
                if (found) {
                    playSound('correct');
                    setFoundWords(prev => new Set(prev).add(found));
                    setFoundPaths(prev => [...prev, line]);
                    setScore(prev => prev + found.length * 10);
                }
            }
            setSelection([]);
        }
    };
    
    useEffect(() => {
        if (wordsToFind.length > 0 && foundWords.size === wordsToFind.length) {
            setTimeout(() => setGameState('finished'), 500);
        }
    }, [foundWords, wordsToFind]);

    return (
        <div ref={mainContentRef} className="h-[100dvh] w-screen bg-slate-50 text-slate-900 flex flex-col overflow-hidden relative">
            <MagnificentLightBackground />
            <div className="flex-none z-30 w-full bg-white/80 backdrop-blur-xl border-b border-white/60 shadow-sm h-16 sm:h-20 flex items-center">
                <div className="container mx-auto px-4 w-full">
                    <div className="flex justify-between items-center gap-2">
                        <div className="flex items-center gap-3 overflow-hidden">
                             <div className="h-9 w-9 sm:h-10 sm:w-10 bg-teal-100 text-teal-600 flex items-center justify-center shrink-0 rounded-xl shadow-sm border border-teal-200"><Search className="h-5 w-5" /></div>
                            <h1 className="text-sm sm:text-lg font-black text-slate-800 truncate">Kelime Avı</h1>
                            {isMission && <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200">GÖREV MODU</span>}
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="bg-white border border-slate-200 rounded-xl px-2 py-1 sm:px-3 sm:py-1.5 flex items-center gap-2 shadow-sm">
                                <Trophy className="h-4 w-4 text-amber-500" />
                                <span className="font-black text-slate-800 tabular-nums">{score}</span>
                            </div>
                            <Button onClick={() => setGameState('finished')} variant="ghost" size="icon" className="text-red-500 rounded-xl bg-white border border-red-100"><XOctagon className="h-5 w-5" /></Button>
                            <FullscreenToggle elementRef={mainContentRef} className="bg-white border border-slate-200 text-slate-600 rounded-xl" />
                        </div>
                    </div>
                </div>
            </div>
            <main className="flex-grow w-full h-full flex flex-col lg:flex-row overflow-hidden relative z-10">
                <div className="flex-none lg:h-full lg:p-4 lg:pr-0">
                    <WordList words={wordsToFind} foundWords={foundWords} fontSize={fontSize} />
                </div>
                <div className="flex-grow w-full h-full flex flex-col items-center justify-center p-2 lg:p-4 pb-24 md:pb-8">
                    <Grid grid={grid} onSelectCell={handleSelectCell} selection={selection} foundPaths={foundPaths} fontSize={fontSize} gridScale={gridScale} />
                </div>
            </main>
            <EditorToolbar fontSize={fontSize} setFontSize={setFontSize} gridScale={gridScale} setGridScale={setGridScale} />
            
            {/* --- BİTİŞ EKRANI (GÖREV MODU İÇİN ÖZEL) --- */}
            {gameState === 'finished' && (
                isMission ? (
                    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in">
                        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl border-4 border-white/20 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-white -z-10"></div>
                            
                            <div className="mb-6 flex justify-center">
                                {isAllWordsFound ? (
                                    <div className="p-4 bg-green-100 rounded-full border-4 border-green-200 shadow-xl animate-bounce">
                                        <Trophy className="h-16 w-16 text-green-600" />
                                    </div>
                                ) : (
                                    <div className="p-4 bg-red-100 rounded-full border-4 border-red-200 shadow-xl">
                                        <XOctagon className="h-16 w-16 text-red-500" />
                                    </div>
                                )}
                            </div>

                            <h2 className="text-3xl font-black text-slate-800 mb-2">
                                {isAllWordsFound ? "GÖREV BAŞARILI!" : "GÖREV BAŞARISIZ"}
                            </h2>
                            
                            <p className="text-slate-500 mb-6 font-medium">
                                {isAllWordsFound 
                                    ? `Tebrikler! Tüm kelimeleri buldun.` 
                                    : `Maalesef tüm kelimeleri bulamadın.`}
                            </p>

                            <div className="space-y-3">
                                {/* Sadece tüm kelimeler bulunduysa kaydetme butonu göster */}
                                {!isScoreSaved && isAllWordsFound && (
                                    <Button onClick={saveScore} disabled={isSaving} className="w-full h-12 text-lg font-bold bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200">
                                        {isSaving ? <Loader2 className="animate-spin mr-2"/> : "Kaydet ve Devam Et"}
                                    </Button>
                                )}
                                
                                {isScoreSaved && isAllWordsFound && (
                                    <Button onClick={() => router.push('/student/gorevler')} className="w-full h-12 text-lg font-bold bg-green-600 hover:bg-green-700 shadow-lg shadow-green-200">
                                        <CheckCircle className="mr-2 h-5 w-5"/> Görevlere Dön
                                    </Button>
                                )}

                                {/* Başarısız olunduysa veya zaten kaydedildiyse tekrar dene */}
                                {(!isAllWordsFound || isScoreSaved) && (
                                    <Button onClick={handleRestart} variant="outline" className="w-full h-12 text-lg font-bold border-2 border-slate-200 text-slate-600 hover:bg-slate-50">
                                        <RotateCcw className="mr-2 h-5 w-5"/> Tekrar Dene
                                    </Button>
                                )}
                                
                                <Button onClick={() => router.push('/student')} variant="ghost" className="w-full text-slate-400 hover:text-slate-600">
                                    <Home className="mr-2 h-4 w-4"/> Ana Menü
                                </Button>
                            </div>
                        </div>
                    </div>
                ) : (
                    // NORMAL (ARCADE) MOD BİTİŞ EKRANI
                    <GameEndScreen 
                        score={score} 
                        onSave={saveScore} 
                        isSaving={isSaving} 
                        scoreSaved={isScoreSaved} 
                        onRestart={handleRestart} 
                        backUrl="/" 
                    />
                )
            )}
        </div>
    );
}

export default function Page() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-slate-50"><Loader2 className="h-12 w-12 animate-spin text-indigo-500" /></div>}>
            <WordSearchGame />
        </Suspense>
    );
}