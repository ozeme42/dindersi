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
import confetti from 'canvas-confetti';

// --- OYUN MANTIĞI ---
const DIRECTIONS = [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: -1, y: 1 }];

const generateGridWithSize = (words: string[], size: number) => {
    let grid = Array(size).fill(null).map(() => Array(size).fill(''));
    let placedWords = new Set<string>();

    // Önce uzun kelimeleri yerleştir (yerleşme başarısını maksimize eder)
    const sortedWords = [...words].sort((a, b) => b.length - a.length);

    for (const word of sortedWords) {
        if (word.length > size) continue;
        let placed = false;
        let attempts = 0;
        while (!placed && attempts < 150) {
            const direction = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
            const row = Math.floor(Math.random() * size);
            const col = Math.floor(Math.random() * size);

            let canPlace = true;
            for (let i = 0; i < word.length; i++) {
                const newRow = row + i * direction.y;
                const newCol = col + i * direction.x;
                if (newRow < 0 || newRow >= size || newCol < 0 || newCol >= size ||
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

    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (grid[r][c] === '') {
                 grid[r][c] = GENERIC_TURKISH_WORDS[Math.floor(Math.random() * GENERIC_TURKISH_WORDS.length)].charAt(0).toLocaleUpperCase('tr-TR');
            }
        }
    }
    return { grid, placedWords: Array.from(placedWords) };
};

// Akıllı Tahta & Ekran Boyutuna Uyumlu Dinamik Izgara Üretici
const generateAdaptiveGrid = (words: string[]) => {
    if (!words || words.length === 0) {
        return generateGridWithSize([], 12);
    }
    const maxWordLen = words.reduce((max, w) => Math.max(max, w.length), 0);
    // En uzun kelimeden en az 1 fazla olsun, 10 ile 14 arası başlasın
    let targetSize = Math.min(14, Math.max(10, maxWordLen + 1));
    
    let result = generateGridWithSize(words, targetSize);
    
    // Eğer tüm kelimeler sığmadıysa ve boyut 14'e ulaşmadıysa boyutu büyüt
    while (result.placedWords.length < Math.min(words.length, 10) && targetSize < 14) {
        targetSize++;
        result = generateGridWithSize(words, targetSize);
    }
    return result;
};

type Cell = { r: number, c: number };

// --- BİLEŞENLER ---

const WordList = ({ words, foundWords, fontSize }: { words: string[], foundWords: Set<string>, fontSize: number }) => {
    const { theme } = useWordwall();
    const [isOpen, setIsOpen] = useState(false);
    
    // Akıllı tahta için büyük, net ve orantılı yazı boyutu
    const dynamicStyle = {
        fontSize: `clamp(1rem, calc(${fontSize} * 1.2rem), 1.75rem)`,
        lineHeight: '1.25'
    };

    const DesktopView = (
        <div className={cn(
            "hidden lg:flex flex-shrink-0 border-2 backdrop-blur-md rounded-2xl h-full max-h-full overflow-hidden flex-col transition-all duration-300 shadow-2xl",
            theme.cardBg,
            theme.cardBorder,
            theme.cardShadow,
            words.length > 10 ? "w-[340px] xl:w-[420px]" : "w-64 xl:w-76"
        )}>
            <h3 className={cn("font-black text-sm sm:text-base md:text-lg p-3 sm:p-3.5 flex items-center justify-between border-b flex-shrink-0", theme.subPanelBg, theme.cardDivider, theme.accentText)}>
                <span className="flex items-center gap-2">
                    <Search className="h-5 w-5"/> Kelimeler
                </span>
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2.5 py-0.5 rounded-full text-xs sm:text-sm font-black">
                    {foundWords.size} / {words.length}
                </span>
            </h3>
            
            <div className="flex-grow overflow-y-auto p-3 sm:p-4 custom-scrollbar">
                <div className={cn("grid gap-2 sm:gap-2.5", words.length > 10 ? "grid-cols-2" : "grid-cols-1")}>
                    {words.map(word => {
                        const isFound = foundWords.has(word);
                        return (
                            <div 
                                key={word} 
                                style={dynamicStyle}
                                className={cn(
                                    "transition-all duration-300 font-black p-2.5 sm:p-3 rounded-xl border-2 flex items-center justify-between uppercase tracking-tight shadow-sm select-none",
                                    isFound 
                                        ? "bg-emerald-500/25 border-emerald-500/50 text-emerald-400 line-through opacity-75 shadow-inner" 
                                        : cn(theme.themePillIdle, "hover:scale-[1.02] border-white/20")
                                )}
                            >
                                <span className="truncate pr-1">{word.toLocaleUpperCase('tr-TR')}</span>
                                {isFound && (
                                    <span className="bg-emerald-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-black flex-shrink-0 shadow-xs">
                                        ✓
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className={cn("p-2.5 sm:p-3 border-t flex-shrink-0", theme.subPanelBg, theme.cardDivider)}>
                <div className={cn("flex items-center gap-2 text-xs sm:text-sm font-black leading-snug", theme.subText)}>
                    <MousePointerClick className="h-4 w-4 flex-shrink-0 text-amber-400" />
                    <span>İlk ve son harfe dokunarak seçin.</span>
                </div>
            </div>
        </div>
    );

    const MobileView = (
        <div className="lg:hidden w-full flex-shrink-0 z-20 px-2 mt-1">
            <button 
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={cn("w-full border-2 shadow-md rounded-xl p-2.5 sm:p-3 flex items-center justify-between font-black text-sm sm:text-base cursor-pointer", theme.themePillIdle)}
            >
                <div className="flex items-center gap-2">
                    <Search className="h-5 w-5"/>
                    <span>Kelimeler ({foundWords.size}/{words.length})</span>
                </div>
                {isOpen ? <ChevronUp className="h-5 w-5"/> : <ChevronDown className="h-5 w-5"/>}
            </button>
            
            {isOpen && (
                <div className={cn("absolute top-12 left-2 right-2 border-2 shadow-2xl p-3 animate-in slide-in-from-top-2 z-50 rounded-2xl max-h-[50vh] flex flex-col backdrop-blur-xl", theme.cardBg, theme.cardBorder, theme.cardShadow)}>
                    <div className="grid grid-cols-2 gap-2 overflow-y-auto custom-scrollbar flex-grow pb-2">
                        {words.map(word => {
                            const isFound = foundWords.has(word);
                            return (
                                <div 
                                    key={word} 
                                    style={{ fontSize: `clamp(0.9rem, calc(${fontSize} * 1rem), 1.4rem)` }}
                                    className={cn(
                                        "transition-all duration-300 font-black p-2 rounded-xl border-2 text-center truncate uppercase shadow-xs",
                                        isFound 
                                            ? "bg-emerald-500/25 border-emerald-500/50 text-emerald-400 line-through opacity-75" 
                                            : theme.themePillIdle
                                    )}
                                >
                                    {word.toLocaleUpperCase('tr-TR')}
                                </div>
                            );
                        })}
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
        <div 
            className="fixed z-[100] transition-all duration-100 ease-out" 
            style={{ 
                left: '50%', 
                bottom: isFullscreen ? '0.75rem' : '2.5rem', 
                transform: `translate(calc(-50% + ${position.x}px), ${position.y}px)`, 
                cursor: isDragging ? 'grabbing' : 'default', 
                maxWidth: '90vw' 
            }}
        >
             <div className={cn("flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 rounded-2xl border-2 shadow-2xl backdrop-blur-xl transition-all duration-300", theme.subPanelBg, theme.cardBorder)}>
                <div 
                    onMouseDown={(e) => handleDragStart(e.clientX, e.clientY)}
                    onTouchStart={(e) => handleDragStart(e.touches[0].clientX, e.touches[0].clientY)}
                    className="cursor-grab active:cursor-grabbing opacity-60 hover:opacity-100 flex-shrink-0 touch-none p-1.5"
                    title="Konumu Değiştir"
                >
                    <GripHorizontal className="h-5 w-5" />
                </div>

                {/* Hızlı Yazı Boyutu Butonları (Her Zaman Doğrudan Erişilebilir) */}
                <div className="flex items-center gap-1 px-1 border-l border-white/10">
                    <span className="text-xs font-black opacity-75 mr-1 hidden sm:inline">Yazı:</span>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => setFontSize((s: number) => Math.max(0.7, s - 0.1))} 
                        className="h-8 w-8 rounded-xl font-black text-sm hover:bg-white/10 cursor-pointer"
                        title="Yazıyı Küçült"
                    >
                        A-
                    </Button>
                    <span className="text-xs font-black min-w-8 text-center select-none">
                        %{Math.round(fontSize * 100)}
                    </span>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => setFontSize((s: number) => Math.min(2.5, s + 0.1))} 
                        className="h-8 w-8 rounded-xl font-black text-sm hover:bg-white/10 cursor-pointer"
                        title="Yazıyı Büyüt"
                    >
                        A+
                    </Button>
                </div>

                {/* Detay Ayar Aç/Kapa Butonu */}
                <div className="border-l border-white/10 pl-1">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => setIsToolbarOpen(!isToolbarOpen)} 
                        className="h-8 w-8 rounded-xl opacity-75 hover:opacity-100 cursor-pointer"
                        title={isToolbarOpen ? "Ayarları Kapat" : "Izgara & Detay Ayarları"}
                    >
                        {isToolbarOpen ? <ChevronDown className="h-4 w-4" /> : <Settings2 className="h-4 w-4" />}
                    </Button>
                </div>

                {isToolbarOpen && (
                    <div className="flex items-center gap-2 sm:gap-3 pl-2 border-l border-white/15 animate-in fade-in zoom-in duration-200">
                        {/* Izgara Ölçeği */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                            <Scan className="h-4 w-4 opacity-60 mr-0.5" />
                            <Button variant="ghost" size="icon" onClick={() => setGridScale((s:number) => Math.max(0.7, s - 0.1))} className="h-8 w-8 rounded-xl"><Minus className="h-3.5 w-3.5"/></Button>
                            <span className="text-xs font-black w-8 text-center select-none">{Math.round(gridScale * 100)}%</span>
                            <Button variant="ghost" size="icon" onClick={() => setGridScale((s:number) => Math.min(1.5, s + 0.1))} className="h-8 w-8 rounded-xl"><Plus className="h-3.5 w-3.5"/></Button>
                        </div>

                        {/* Sıfırla */}
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => { setFontSize(1.25); setGridScale(1.0); }}
                            className="text-xs font-black h-8 px-2.5 rounded-xl hover:bg-white/10 opacity-75 hover:opacity-100 cursor-pointer"
                            title="Varsayılan Boyuta Dön"
                        >
                            <RotateCcw className="h-3.5 w-3.5 mr-1" />
                            <span>Sıfırla</span>
                        </Button>
                    </div>
                )}
             </div>
        </div>
    );
};

const Grid = ({ grid, onSelectCell, selection, foundPaths, fontSize, gridScale }: any) => {
    const { theme, isFullscreen } = useWordwall();
    const gridSize = grid.length || 14;

    return (
        <div className="flex items-center justify-center w-full h-full overflow-hidden p-1 sm:p-2 relative select-none">
            <div 
                className={cn(
                    "relative aspect-square border-2 rounded-2xl lg:rounded-3xl shadow-2xl overflow-hidden p-1.5 sm:p-2.5 transition-transform duration-200 ease-out origin-center backdrop-blur-xl max-h-full max-w-full flex items-center justify-center",
                    theme.cardBg,
                    theme.cardBorder,
                    theme.cardShadow
                )}
                style={{ 
                    height: '100%', 
                    maxHeight: isFullscreen ? 'calc(100vh - 60px)' : 'calc(100vh - 120px)',
                    width: 'auto',
                    aspectRatio: '1 / 1',
                    transform: `scale(${gridScale})` 
                }}
            >
                <div 
                    className="grid gap-1 sm:gap-1.5 h-full w-full select-none" 
                    style={{ 
                        gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`, 
                        gridTemplateRows: `repeat(${gridSize}, minmax(0, 1fr))` 
                    }}
                >
                    {grid.flat().map((letter: string, i: number) => {
                        const r = Math.floor(i / gridSize);
                        const c = i % gridSize;
                        const isSelected = selection.some((cell:any) => cell.r === r && cell.c === c);
                        const isFound = foundPaths.some((path:any) => path.some((cell:any) => cell.r === r && cell.c === c));
                        const pathColors = [
                            "bg-teal-600 border-teal-400 shadow-teal-700/50", 
                            "bg-rose-600 border-rose-400 shadow-rose-700/50", 
                            "bg-indigo-600 border-indigo-400 shadow-indigo-700/50", 
                            "bg-amber-600 border-amber-400 shadow-amber-700/50", 
                            "bg-emerald-600 border-emerald-400 shadow-emerald-700/50", 
                            "bg-purple-600 border-purple-400 shadow-purple-700/50"
                        ];
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
                                    "flex items-center justify-center rounded-lg sm:rounded-xl font-black transition-all duration-150 touch-manipulation active:scale-90 border-[2px] cursor-pointer shadow-xs",
                                    isSelected 
                                        ? "bg-amber-400 text-slate-950 border-amber-300 scale-105 z-10 shadow-lg ring-4 ring-yellow-300 animate-pulse font-black" 
                                        : isFound 
                                            ? cn(foundColorClass, "text-white scale-100 border-white/30 shadow-md font-black") 
                                            : cn(theme.themePillIdle, "hover:scale-105 active:scale-95 hover:brightness-110")
                                )} 
                                style={{ 
                                    fontSize: `calc(${fontSize} * clamp(1.15rem, ${gridSize <= 11 ? '4.6vmin' : '3.6vmin'}, 3.4rem))` 
                                }}
                            >
                                <span className="leading-none drop-shadow-xs">{letter}</span>
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

    // Akıllı tahta için varsayılan büyük font (%125) ve kalıcı localStorage hafızası
    const [fontSize, setFontSizeState] = useState<number>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('kelime_avi_font_size');
            if (saved) {
                const parsed = parseFloat(saved);
                if (!isNaN(parsed) && parsed >= 0.7 && parsed <= 2.5) return parsed;
            }
        }
        return 1.25; // Akıllı tahta için varsayılan büyük font (%125)
    }); 

    const [gridScale, setGridScaleState] = useState<number>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('kelime_avi_grid_scale');
            if (saved) {
                const parsed = parseFloat(saved);
                if (!isNaN(parsed) && parsed >= 0.7 && parsed <= 1.5) return parsed;
            }
        }
        return 1.0;
    });

    const setFontSize = useCallback((updater: number | ((prev: number) => number)) => {
        setFontSizeState(prev => {
            const val = typeof updater === 'function' ? updater(prev) : updater;
            const clamped = Math.max(0.7, Math.min(2.5, Number(val.toFixed(2))));
            try { localStorage.setItem('kelime_avi_font_size', String(clamped)); } catch (e) {}
            return clamped;
        });
    }, []);

    const setGridScale = useCallback((updater: number | ((prev: number) => number)) => {
        setGridScaleState(prev => {
            const val = typeof updater === 'function' ? updater(prev) : updater;
            const clamped = Math.max(0.7, Math.min(1.5, Number(val.toFixed(2))));
            try { localStorage.setItem('kelime_avi_grid_scale', String(clamped)); } catch (e) {}
            return clamped;
        });
    }, []);

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
            const { grid: newGrid, placedWords } = generateAdaptiveGrid(result.concepts);
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
        setSelection([]);
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
                    if (line.length > grid.length) break; 
                }
                const word = line.map(c => grid[c.r][c.c]).join('');
                const rev = word.split('').reverse().join('');
                const found = wordsToFind.find(w => (w === word || w === rev) && !foundWords.has(w));
                if (found) {
                    playSound('correct');
                    setFoundWords(prev => new Set(prev).add(found));
                    setFoundPaths(prev => [...prev, line]);
                    setScore(prev => prev + 10);
                } else {
                    playSound('incorrect');
                }
            } else {
                playSound('click');
            }
            setSelection([]);
        }
    };
    
    useEffect(() => {
        if (wordsToFind.length > 0 && foundWords.size === wordsToFind.length) {
            playSound('win');
            confetti({
                particleCount: 150,
                spread: 90,
                origin: { y: 0.6 }
            });
            setTimeout(() => setGameState('finished'), 600);
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
                <div className="w-full h-full min-h-0 flex flex-col lg:flex-row items-stretch justify-center gap-2 sm:gap-4 lg:gap-6 max-w-[1700px] mx-auto overflow-hidden">
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