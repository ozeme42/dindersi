
'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getKelimeAviAction, submitKelimeAviScoreAction } from '../actions';
import { Button } from '@/components/ui/button';
import { Loader2, Search, Ghost } from 'lucide-react';
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
    <div className="w-full lg:w-64 flex-shrink-0 bg-slate-900/50 backdrop-blur-md border border-white/10 rounded-2xl p-4">
        <h3 className="font-bold text-lg mb-2 text-teal-300 flex items-center gap-2">
            <Search className="h-5 w-5"/> Aranacak Kelimeler
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
            {words.map(word => (
                <div key={word} className={cn("transition-all duration-300 text-sm font-semibold p-2 rounded-md", foundWords.has(word) ? "line-through text-slate-500 bg-slate-800/50" : "text-slate-200")}>
                    {word}
                </div>
            ))}
        </div>
    </div>
);

const Grid = ({ grid, onSelect, selection, foundPaths }: { grid: string[][], onSelect: (cell: Cell) => void, selection: Cell[], foundPaths: Cell[][] }) => (
    <div className="grid gap-1 p-2 bg-slate-900/50 backdrop-blur-md border border-white/10 rounded-2xl aspect-square" style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))` }}>
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
                    onMouseDown={() => onSelect({ r, c })}
                    onMouseEnter={(e) => e.buttons === 1 && onSelect({ r, c })}
                    className={cn(
                        "flex items-center justify-center rounded-md aspect-square select-none touch-none text-xs sm:text-base font-bold transition-all duration-150",
                        isSelected ? "bg-yellow-400 text-slate-900 scale-110" : "bg-slate-800 text-slate-300 hover:bg-slate-700",
                        isFound && `${colorClasses[foundPathIndex % colorClasses.length]} text-white scale-105 shadow-lg`
                    )}
                >
                    {letter}
                </button>
            );
        })}
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

    const handleSelect = (cell: Cell) => {
        setSelection(prev => {
            if (prev.some(c => c.r === cell.r && c.c === cell.c)) return prev;
            return [...prev, cell];
        });
    };

    const checkSelection = useCallback(() => {
        if (selection.length < 2) return;
        const selectedWord = selection.map(cell => grid[cell.r][cell.c]).join('');
        
        if (wordsToFind.includes(selectedWord) && !foundWords.has(selectedWord)) {
            playSound('correct');
            setFoundWords(prev => new Set(prev).add(selectedWord));
            setFoundPaths(prev => [...prev, selection]);
            setScore(prev => prev + selectedWord.length * 10);
        }
    }, [selection, grid, wordsToFind, foundWords]);
    
    useEffect(() => {
        const handleMouseUp = () => {
            checkSelection();
            setSelection([]);
        };
        window.addEventListener('mouseup', handleMouseUp);
        return () => window.removeEventListener('mouseup', handleMouseUp);
    }, [checkSelection]);
    
    useEffect(() => {
        if (wordsToFind.length > 0 && foundWords.size === wordsToFind.length) {
            const timeoutId = setTimeout(() => setGameState('finished'), 500);
            return () => clearTimeout(timeoutId);
        }
    }, [foundWords, wordsToFind]);

    const handleSaveAndExit = async () => {
        if (isSaving || isScoreSaved || !user || score <= 0) {
            router.push('/oyunlar/kelime-avi');
            return;
        }
        setIsSaving(true);
        const result = await submitKelimeAviScoreAction(user.uid, score, gameContext);
        if (result.success) {
            setIsScoreSaved(true);
            toast({ title: 'Başarılı!', description: 'Puanınız kaydedildi.' });
        } else {
            toast({ title: 'Hata', description: result.error, variant: 'destructive' });
        }
        setIsSaving(false);
    };
    
    const handleRestart = () => {
        setScore(0);
        setFoundWords(new Set());
        setFoundPaths([]);
        setIsScoreSaved(false);
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
                        <Link href="/oyunlar/kelime-avi">Geri Dön</Link>
                    </Button>
                </div>
            </div>
        );
    }
    if (gameState === 'finished') {
        return <GameEndScreen score={score} onSave={handleSaveAndExit} isSaving={isSaving} scoreSaved={isScoreSaved} onRestart={handleRestart} backUrl="/oyunlar/kelime-avi" />;
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center p-4 lg:p-8 gap-6">
            <h1 className="text-3xl font-bold text-teal-300">Kelime Avı</h1>
            <div className="w-full max-w-5xl flex flex-col lg:flex-row gap-6">
                <WordList words={wordsToFind} foundWords={foundWords} />
                <div className="flex-grow">
                    <Grid grid={grid} onSelect={handleSelect} selection={selection} foundPaths={foundPaths} />
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
