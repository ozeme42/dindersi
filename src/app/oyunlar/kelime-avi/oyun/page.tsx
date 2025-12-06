
'use client';

import { useState, useEffect, useCallback, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getKelimeAviAction, submitKelimeAviScoreAction } from '../actions';
import { Button } from '@/components/ui/button';
import { Loader2, Search, Ghost, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { GameEndScreen } from '@/components/game-end-screen';
import { playSound } from '@/lib/audio-service';
import { GENERIC_TURKISH_WORDS } from '@/lib/generic-words';

// --- GAME LOGIC & HELPERS ---
const GRID_SIZE = 14;
const DIRECTIONS = [
    { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: -1, y: 1 } 
];

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
                if (
                    newRow < 0 || newRow >= GRID_SIZE ||
                    newCol < 0 || newCol >= GRID_SIZE ||
                    (grid[newRow][newCol] !== '' && grid[newRow][newCol] !== word[i])
                ) {
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

    // Fill empty cells
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

// --- COMPONENTS ---
const WordList = ({ words, foundWords }: { words: string[], foundWords: Set<string> }) => (
    <div className="w-full lg:w-72 flex-shrink-0 bg-slate-900/50 backdrop-blur-md border border-white/10 rounded-2xl p-4">
        <h3 className="font-bold text-lg mb-2 text-teal-300 flex items-center gap-2">
            <Search className="h-5 w-5"/> Aranacak Kelimeler ({foundWords.size}/{words.length})
        </h3>
        <div className="grid grid-cols-2 gap-2">
            {words.map(word => (
                <div 
                    key={word} 
                    className={cn(
                        "transition-all duration-300 font-semibold p-2 rounded-md sm:text-base",
                        foundWords.has(word) ? "line-through text-slate-500 bg-slate-800/50" : "text-slate-200"
                    )}
                >
                    {word}
                </div>
            ))}
        </div>
    </div>
);

const Grid = ({ grid, onSelectCell, selection, foundPaths, fontSize }: { grid: string[][], onSelectCell: (cell: Cell) => void, selection: Cell[], foundPaths: Cell[][], fontSize: number }) => (
    <div className="p-2 bg-slate-900/50 backdrop-blur-md border border-white/10 rounded-2xl overflow-auto w-full h-full flex items-center justify-center">
        <div 
            className="grid gap-1" 
            style={{ 
                gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
                width: '100%',
                height: '100%',
            }}
        >
            {grid.flat().map((letter, i) => {
                const r = Math.floor(i / GRID_SIZE);
                const c = i % GRID_SIZE;
                const isSelected = selection.some(cell => cell.r === r && cell.c === c);
                const isFound = foundPaths.some(path => path.some(cell => cell.r === r && cell.c === c));
                const foundPathIndex = foundPaths.findIndex(path => path.some(cell => cell.r === r && cell.c === c));
                
                const colorClasses = ["bg-teal-500", "bg-emerald-500", "bg-sky-500", "bg-lime-500", "bg-cyan-500", "bg-green-500"];

                return (
                    <button
                        key={`${r}-${c}`}
                        onClick={() => onSelectCell({ r, c })}
                        className={cn(
                            "flex items-center justify-center rounded-md aspect-square select-none touch-none font-bold transition-all duration-150",
                            isSelected ? "bg-yellow-400 text-slate-900 scale-110 ring-2 ring-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700",
                            isFound && `${colorClasses[foundPathIndex % colorClasses.length]} text-white scale-105 shadow-lg`
                        )}
                         style={{ fontSize: `${fontSize}rem` }}
                    >
                        {letter}
                    </button>
                );
            })}
        </div>
    </div>
);


// --- MAIN GAME COMPONENT ---
function WordSearchGame() {
    const { user } = useAuth();
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const router = useRouter();

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
    const [fontSize, setFontSize] = useState(1); // rem unit
    const [containerSize, setContainerSize] = useState('max-w-5xl');
    
    const backUrl = '/oyunlar/kelime-avi';

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
            setError(result.error || "Bu konu için uygun kelime bulunamadı.");
            setGameState('error');
        } else {
            const { grid: newGrid, placedWords } = generateGrid(result.concepts);
            setGrid(newGrid);
            setWordsToFind(placedWords.sort());
            setGameState('playing');
        }
    }, [searchParams]);

    useEffect(() => {
        fetchGameData();
    }, [fetchGameData]);

    const getCellsInLine = (start: Cell, end: Cell): Cell[] | null => {
        const dx = Math.sign(end.c - start.c);
        const dy = Math.sign(end.r - start.r);
        
        const isDiagonal = Math.abs(end.c - start.c) === Math.abs(end.r - start.r);
        const isStraight = start.c === end.c || start.r === end.r;

        if (!isDiagonal && !isStraight) return null;

        const line: Cell[] = [];
        let { r, c } = start;
        while (r !== end.r + dy || c !== end.c + dx) {
            line.push({ r, c });
            r += dy;
            c += dx;
        }
        return line;
    }
    
    const handleSelectCell = (cell: Cell) => {
        if (selection.length === 0) {
            setSelection([cell]);
        } else if (selection.length === 1) {
            const startCell = selection[0];
            const endCell = cell;

            const line = getCellsInLine(startCell, endCell);
            if (!line) { 
                setSelection([cell]); // Invalid line, start new selection
                return;
            }
            
            const selectedWord = line.map(c => grid[c.r][c.c]).join('');
            const reversedSelectedWord = selectedWord.split('').reverse().join('');
            
            const found = wordsToFind.find(word => (word === selectedWord || word === reversedSelectedWord) && !foundWords.has(word));

            if (found) {
                playSound('correct');
                setFoundWords(prev => new Set(prev).add(found));
                setFoundPaths(prev => [...prev, line]);
                setScore(prev => prev + found.length * 10);
            }
            setSelection([]);
        } else {
            setSelection([cell]);
        }
    };
    
    useEffect(() => {
        if (wordsToFind.length > 0 && foundWords.size === wordsToFind.length) {
            const timeoutId = setTimeout(() => setGameState('finished'), 500);
            return () => clearTimeout(timeoutId);
        }
    }, [foundWords, wordsToFind]);

    const handleSaveAndExit = async () => {
        if (isSaving || isScoreSaved || !user || score <= 0) {
            router.push(backUrl);
            return;
        }
        setIsSaving(true);
        const result = await submitKelimeAviScoreAction(user.uid, score, gameContext);
        if (result.success) {
            setIsScoreSaved(true);
            toast({ title: 'Başarılı!', description: 'Puanınız kaydedildi.' });
        } else {
            toast({ title: 'Hata', description: result.error, variant: "destructive" });
        }
        setIsSaving(false);
    };
    
    const handleRestart = () => {
        setScore(0);
        setFoundWords(new Set());
        setFoundPaths([]);
        setIsScoreSaved(false);
        setFontSize(1);
        setContainerSize('max-w-5xl');
        fetchGameData();
    };

    if (gameState === 'loading') {
        return <div className="flex h-screen w-full items-center justify-center bg-slate-950"><Loader2 className="h-12 w-12 animate-spin text-teal-500" /></div>;
    }
    if (gameState === 'error') {
        return (
             <div className="flex h-screen w-full items-center justify-center p-4 bg-slate-950">
                 <div className="text-center space-y-4 max-w-md bg-red-950/50 p-6 rounded-3xl border border-red-500/30">
                    <Ghost className="h-16 w-16 text-red-500 mx-auto" />
                    <h3 className="text-xl font-bold text-red-100">Oyun Başlatılamadı</h3>
                    <p className="text-red-200/70">{error}</p>
                     <Button asChild variant="secondary" className="w-full">
                        <Link href={backUrl}>Geri Dön</Link>
                    </Button>
                </div>
            </div>
        );
    }
    if (gameState === 'finished') {
        return <GameEndScreen score={score} onSave={handleSaveAndExit} isSaving={isSaving} scoreSaved={isScoreSaved} onRestart={handleRestart} backUrl={backUrl} />;
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center p-4 lg:p-8 gap-6 pb-24 md:pb-8">
            <div className={cn("w-full flex flex-col gap-6 transition-all duration-300", containerSize)}>
                <div className="w-full flex justify-between items-center">
                    <h1 className="text-3xl font-bold text-teal-300">Kelime Avı</h1>
                    <div className="flex items-center gap-2">
                        <div className="text-xl font-bold">Puan: <span className="text-amber-400 font-mono">{score}</span></div>
                        <div className="flex flex-wrap gap-1 bg-slate-900/50 p-1 rounded-lg border border-white/10">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-white" onClick={() => setFontSize(z => Math.min(z + 0.2, 2.5))}><ZoomIn className="h-4 w-4"/></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-white" onClick={() => setFontSize(z => Math.max(z - 0.2, 0.4))}><ZoomOut className="h-4 w-4"/></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-white" onClick={() => setFontSize(1)}><RotateCw className="h-4 w-4"/></Button>
                            <div className="w-px h-6 bg-white/10 mx-1"></div>
                            <Button variant="ghost" className="h-8 text-xs px-2 text-white" onClick={() => setContainerSize('max-w-3xl')}>S</Button>
                            <Button variant="ghost" className="h-8 text-xs px-2 text-white" onClick={() => setContainerSize('max-w-5xl')}>M</Button>
                            <Button variant="ghost" className="h-8 text-xs px-2 text-white" onClick={() => setContainerSize('max-w-7xl')}>L</Button>
                        </div>
                        <Button variant="destructive" size="sm" onClick={() => setGameState('finished')}>Bitir</Button>
                    </div>
                </div>
                <div className="w-full flex flex-col lg:flex-row gap-6">
                    <WordList words={wordsToFind} foundWords={foundWords} />
                    <div className="flex-grow aspect-square relative">
                        <Grid grid={grid} onSelectCell={handleSelectCell} selection={selection} foundPaths={foundPaths} fontSize={fontSize} />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function Page() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-slate-950"><Loader2 className="h-12 w-12 animate-spin text-teal-500" /></div>}>
            <WordSearchGame />
        </Suspense>
    );
}
    

    


