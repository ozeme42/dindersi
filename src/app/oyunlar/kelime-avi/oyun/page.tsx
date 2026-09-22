'use client';

import { useState, useEffect, useCallback, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getKelimeAviAction, submitKelimeAviScoreAction } from '../actions';
import { Button } from '@/components/ui/button';
import { Loader2, Search, Trophy, XOctagon, ChevronDown, ChevronUp, Settings2, Plus, Minus, Type, Scan, GripHorizontal, MousePointerClick, CheckCircle, RotateCcw, Home, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { GameEndScreen } from '@/components/game-end-screen';
import { playSound } from '@/lib/audio-service';
import { GENERIC_TURKISH_WORDS } from '@/lib/generic-words';
import { FullscreenToggle } from '@/components/fullscreen-toggle';
import { db } from '@/lib/firebase';
import { collection, serverTimestamp, writeBatch, doc, increment } from 'firebase/firestore';
import { WordwallShell, useWordwall } from '@/components/wordwall/wordwall-shell';
import { getGameBackUrl } from '@/lib/game-navigation';

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
    const { theme } = useWordwall();
    const [isOpen, setIsOpen] = useState(false);
    
    const dynamicStyle = {
        fontSize: `${fontSize * 0.85}rem`,
        lineHeight: '1.2'
    };

    const DesktopView = (
        <div className={cn(
            "hidden lg:flex flex-shrink-0 border-2 backdrop-blur-md rounded-2xl h-full overflow-hidden flex-col transition-all duration-500",
            theme.cardBg,
            theme.cardBorder,
            theme.cardShadow,
            words.length > 14 ? "w-[360px] xl:w-[400px]" : "w-60 xl:w-68"
        )}>
            <h3 className={cn("font-black text-sm sm:text-base p-3 flex items-center gap-2 border-b flex-shrink-0", theme.subPanelBg, theme.cardDivider, theme.accentText)}>
                <Search className="h-4 w-4 sm:h-5 sm:w-5"/> Kelimeler ({foundWords.size}/{words.length})
            </h3>
            
            <div className="flex-grow overflow-y-auto p-3 no-scrollbar">
                <div className={cn("grid gap-1.5", words.length > 14 ? "grid-cols-2" : "grid-cols-1")}>
                    {words.map(word => (
                        <div 
                            key={word} 
                            style={dynamicStyle}
                            className={cn(
                                "transition-all duration-300 font-black p-2 rounded-xl border flex items-center justify-between uppercase tracking-tight shadow-sm",
                                foundWords.has(word) 
                                    ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400 line-through opacity-70" 
                                    : cn(theme.themePillIdle, "border")
                            )}
                        >
                            <span className="truncate pr-1">{word.toLocaleUpperCase('tr-TR')}</span>
                            {foundWords.has(word) && <span className="bg-emerald-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] flex-shrink-0">✓</span>}
                        </div>
                    ))}
                </div>
            </div>

            <div className={cn("p-2.5 sm:p-3 border-t flex-shrink-0", theme.subPanelBg, theme.cardDivider)}>
                <div className={cn("flex items-start gap-2 text-xs font-bold leading-relaxed", theme.subText)}>
                    <MousePointerClick className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                    <span>İlk ve son harfe dokun.</span>
                </div>
            </div>
        </div>
    );

    const MobileView = (
        <div className="lg:hidden w-full flex-shrink-0 z-20 px-2 mt-1">
            <button 
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={cn("w-full border shadow-md rounded-xl p-2.5 flex items-center justify-between font-bold text-sm cursor-pointer", theme.themePillIdle)}
            >
                <div className="flex items-center gap-2">
                    <Search className="h-4 w-4"/>
                    <span>Kelimeler ({foundWords.size}/{words.length})</span>
                </div>
                {isOpen ? <ChevronUp className="h-4 w-4"/> : <ChevronDown className="h-4 w-4"/>}
            </button>
            
            {isOpen && (
                <div className={cn("absolute top-12 left-2 right-2 border-2 shadow-2xl p-3 animate-in slide-in-from-top-2 z-50 rounded-2xl max-h-[50vh] flex flex-col backdrop-blur-xl", theme.cardBg, theme.cardBorder, theme.cardShadow)}>
                    <div className="grid grid-cols-2 gap-1.5 overflow-y-auto custom-scrollbar flex-grow pb-2">
                        {words.map(word => (
                            <div 
                                key={word} 
                                style={{ fontSize: `${fontSize * 0.7}rem` }}
                                className={cn(
                                    "transition-all duration-300 font-black p-1.5 rounded-lg border text-center truncate uppercase",
                                    foundWords.has(word) 
                                        ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400 line-through" 
                                        : theme.themePillIdle
                                )}
                            >
                                {word.toLocaleUpperCase('tr-TR')}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );

    return <>{DesktopView}{MobileView}</>;
};

const EditorToolbar = ({ fontSize, setFontSize, gridScale, setGridScale }: any) => {
    const { theme, isFullscreen } = useWordwall();
    const [isToolbarOpen, setIsToolbarOpen] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStartPos = useRef({ x: 0, y: 0 });

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;
            setPosition({ x: e.clientX - dragStartPos.current.x, y: e.clientY - dragStartPos.current.y });
        };
        const handleMouseUp = () => setIsDragging(false);

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
        <div className="fixed z-[100] transition-all duration-100 ease-out" style={{ left: '50%', bottom: isFullscreen ? '0.75rem' : '2.5rem', transform: `translate(calc(-50% + ${position.x}px), ${position.y}px)`, cursor: isDragging ? 'grabbing' : 'default', maxWidth: '90vw' }}>
             <div className={cn("flex items-center gap-1 sm:gap-2 p-1.5 sm:p-2 rounded-full border shadow-2xl backdrop-blur-xl transition-all duration-300", theme.subPanelBg, theme.cardBorder, !isToolbarOpen && "w-auto px-2.5 py-2")}>
                <div 
                    onMouseDown={(e) => handleDragStart(e.clientX, e.clientY)}
                    onTouchStart={(e) => handleDragStart(e.touches[0].clientX, e.touches[0].clientY)}
                    className={cn("cursor-grab active:cursor-grabbing opacity-50 hover:opacity-100 flex-shrink-0 touch-none", isToolbarOpen ? "pl-2 pr-2 py-2 border-r border-white/10" : "p-1")}
                >
                    <GripHorizontal className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                {isToolbarOpen && (
                    <div className="flex items-center gap-2 sm:gap-3 px-1 sm:px-2 animate-in fade-in zoom-in duration-300 overflow-x-auto no-scrollbar max-w-[70vw] sm:max-w-none">
                        <div className="flex items-center gap-1 flex-shrink-0">
                            <Type className="h-3 w-3 sm:h-4 sm:w-4 opacity-50 mr-0.5" />
                            <Button variant="ghost" size="icon" onClick={() => setFontSize((s:number) => Math.max(0.5, s - 0.1))} className="h-7 w-7 sm:h-8 sm:w-8 rounded-full"><Minus className="h-3 w-3 sm:h-4 sm:w-4"/></Button>
                            <span className="text-xs font-bold w-6 sm:w-8 text-center">{Math.round(fontSize * 10)}</span>
                            <Button variant="ghost" size="icon" onClick={() => setFontSize((s:number) => Math.min(3.0, s + 0.1))} className="h-7 w-7 sm:h-8 sm:w-8 rounded-full"><Plus className="h-3 w-3 sm:h-4 sm:w-4"/></Button>
                        </div>
                        <div className="w-px h-5 sm:h-6 bg-white/10 flex-shrink-0"></div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                            <Scan className="h-3 w-3 sm:h-4 sm:w-4 opacity-50 mr-0.5" />
                            <Button variant="ghost" size="icon" onClick={() => setGridScale((s:number) => Math.max(0.5, s - 0.1))} className="h-7 w-7 sm:h-8 sm:w-8 rounded-full"><Minus className="h-3 w-3 sm:h-4 sm:w-4"/></Button>
                            <span className="text-xs font-bold w-8 sm:w-10 text-center">{Math.round(gridScale * 100)}%</span>
                            <Button variant="ghost" size="icon" onClick={() => setGridScale((s:number) => Math.min(1.5, s + 0.1))} className="h-7 w-7 sm:h-8 sm:w-8 rounded-full"><Plus className="h-3 w-3 sm:h-4 sm:w-4"/></Button>
                        </div>
                        <div className="ml-1 pl-1 border-l border-white/10 flex-shrink-0">
                            <Button variant="ghost" size="icon" onClick={() => setIsToolbarOpen(false)} className="h-7 w-7 sm:h-8 sm:w-8 rounded-full opacity-60"><ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" /></Button>
                        </div>
                    </div>
                )}
                {!isToolbarOpen && (
                    <div className="animate-in fade-in zoom-in duration-300 ml-1">
                          <Button variant="ghost" size="icon" onClick={() => setIsToolbarOpen(true)} className="h-7 w-7 sm:h-8 sm:w-8 rounded-full"><Settings2 className="h-4 w-4" /></Button>
                    </div>
                )}
             </div>
        </div>
    );
};

const Grid = ({ grid, onSelectCell, selection, foundPaths, fontSize, gridScale }: any) => {
    const { theme, isFullscreen } = useWordwall();
    return (
        <div className="flex items-center justify-center w-full h-full overflow-hidden p-1 relative">
            <div 
                className={cn(
                    "relative aspect-square border-2 rounded-xl lg:rounded-3xl shadow-xl overflow-hidden p-1 sm:p-2 transition-transform duration-200 ease-out origin-center backdrop-blur-xl",
                    theme.cardBg,
                    theme.cardBorder,
                    theme.cardShadow
                )}
                style={{ width: isFullscreen ? 'min(100%, calc(100vh - 75px))' : 'min(100%, calc(100vh - 140px))', height: 'min(100%, calc(100vw - 32px))', transform: `scale(${gridScale})` }}
            >
                <div className="grid gap-0.5 h-full w-full select-none" style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${GRID_SIZE}, minmax(0, 1fr))` }}>
                    {grid.flat().map((letter: string, i: number) => {
                        const r = Math.floor(i / GRID_SIZE);
                        const c = i % GRID_SIZE;
                        const isSelected = selection.some((cell:any) => cell.r === r && cell.c === c);
                        const isFound = foundPaths.some((path:any) => path.some((cell:any) => cell.r === r && cell.c === c));
                        const pathColors = ["bg-teal-600 border-teal-500", "bg-rose-600 border-rose-500", "bg-indigo-600 border-indigo-500", "bg-amber-600 border-amber-500", "bg-emerald-600 border-emerald-500", "bg-purple-600 border-purple-500"];
                        let foundColorClass = "";
                        if (isFound) {
                            const foundPathIndex = foundPaths.findIndex((path:any) => path.some((cell:any) => cell.r === r && cell.c === c));
                            foundColorClass = pathColors[foundPathIndex % pathColors.length];
                        }
                        return (
                            <button 
                                key={`${r}-${c}`} 
                                type="button"
                                onClick={() => onSelectCell({ r, c })} 
                                className={cn(
                                    "flex items-center justify-center rounded-sm sm:rounded-md font-black transition-all duration-150 touch-manipulation active:scale-90 border-[1px] cursor-pointer",
                                    isSelected 
                                        ? "bg-amber-400 text-slate-950 border-amber-300 scale-105 z-10 shadow-lg" 
                                        : isFound 
                                            ? cn(foundColorClass, "text-white scale-100 border-transparent shadow-inner font-black") 
                                            : cn(theme.themePillIdle, "hover:scale-105 active:scale-95")
                                )} 
                                style={{ fontSize: `calc(${fontSize} * clamp(0.6rem, 2.5vmin, 1.5rem))` }}
                            >
                                {letter}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

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

    const mode = searchParams.get('mode');
    const topicId = searchParams.get('topicId');
    const isMission = mode === 'mission';

    const gameContext = `Kelime Avı - ${searchParams.get('courseName')} > ${searchParams.get('topicName')}`;
    const backUrl = getGameBackUrl({ user, searchParams, defaultBackUrl: '/oyunlar/kelime-avi' });

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

    const isAllWordsFound = wordsToFind.length > 0 && foundWords.size === wordsToFind.length;

    const saveScore = async () => {
        if (!user || isSaving || isScoreSaved) return;
        setIsSaving(true);

        try {
            if (isMission && topicId) {
                // --- GÖREV MODU KAYDI (LİDERLİK TABLOSU DÜZELTİLDİ) ---
                const batch = writeBatch(db);
                
                // 1. Etkinlik Kaydı (scoreEvents)
                const eventRef = doc(collection(db, 'scoreEvents'));
                batch.set(eventRef, {
                    userId: user.uid,
                    points: score,
                    context: topicId, 
                    gameType: 'kelime-avi', 
                    timestamp: serverTimestamp(),
                    isMission: true,
                    completed: isAllWordsFound
                });

                // 2. Kullanıcı Profilini Güncelleme (users -> score)
                const userRef = doc(db, 'users', user.uid);
                batch.update(userRef, {
                    score: increment(score)
                });

                // Batch'i uygula
                await batch.commit();

                if (isAllWordsFound) {
                    toast({ title: "Görev Başarılı!", description: "Tüm kelimeleri buldun ve puanın kaydedildi.", className: "bg-green-600 text-white" });
                } else {
                    toast({ title: "Puan Kaydedildi", description: "Ancak görev tamamlanmadı.", className: "bg-yellow-600 text-white" });
                }
            } else {
                // --- NORMAL MOD ---
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
                    
                    setScore(prev => prev + 10);
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

    const topicName = searchParams.get('topicName') || searchParams.get('courseName') || 'Kelime Avı';

    return (
        <WordwallShell
            title="Kelime Avı"
            subtitle={topicName}
            currentQuestionIndex={foundWords.size}
            totalQuestions={wordsToFind.length}
            score={score}
            backUrl={backUrl}
            isFinished={gameState === 'finished'}
            fitToScreen={true}
            contentClassName="w-full h-full min-h-0 overflow-hidden p-1 sm:p-2.5 md:p-3 flex flex-col"
        >
            {gameState === 'finished' ? (
                <div className="w-full max-w-xl mx-auto my-auto animate-in zoom-in-95 duration-300">
                    <GameEndScreen 
                        score={score} 
                        onSave={user ? saveScore : undefined} 
                        isSaving={isSaving} 
                        scoreSaved={isScoreSaved} 
                        onRestart={handleRestart} 
                        backUrl={backUrl} 
                        isSuccess={isAllWordsFound}
                        isMission={isMission}
                        customMessage={
                            isMission 
                                ? (isAllWordsFound 
                                    ? "Tebrikler! Tüm kelimeleri bularak görevi başarıyla tamamladın." 
                                    : "Maalesef tüm kelimeleri bulamadın. Görevi geçmek için tüm kelimeleri bulmalısın.")
                                : undefined
                        }
                    />
                </div>
            ) : (
                <div className="w-full h-full min-h-0 flex flex-col lg:flex-row items-center justify-center gap-2 sm:gap-4 overflow-hidden">
                    <div className="flex-none w-full lg:w-auto lg:h-full">
                        <WordList words={wordsToFind} foundWords={foundWords} fontSize={fontSize} />
                    </div>
                    <div className="flex-1 w-full h-full min-h-0 flex items-center justify-center overflow-hidden">
                        <Grid grid={grid} onSelectCell={handleSelectCell} selection={selection} foundPaths={foundPaths} fontSize={fontSize} gridScale={gridScale} />
                    </div>
                </div>
            )}
            <EditorToolbar fontSize={fontSize} setFontSize={setFontSize} gridScale={gridScale} setGridScale={setGridScale} />
        </WordwallShell>
    );
}

export default function Page() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-slate-50"><Loader2 className="h-12 w-12 animate-spin text-indigo-500" /></div>}>
            <WordSearchGame />
        </Suspense>
    );
}