
"use client";

import { useState, useEffect, useCallback, Suspense, useRef, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getWordSearchAction, submitWordSearchScoreAction } from '../actions';
import type { WordSearchPuzzle } from '../actions';
import { useAuth } from '@/context/auth-context';
import { Loader2, ArrowLeft, Lightbulb, CheckCircle2, AlertTriangle, PartyPopper, Repeat, Home, Save, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';
import { playSound } from '@/lib/audio-service';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';


type Position = { row: number; col: number };

function WordSearchGame() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const { toast } = useToast();
    
    const [puzzle, setPuzzle] = useState<WordSearchPuzzle | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const [foundWords, setFoundWords] = useState<Set<string>>(new Set());
    const [selectionStart, setSelectionStart] = useState<Position | null>(null);
    const [lines, setLines] = useState<{ start: Position; end: Position }[]>([]);
    const [errorAnim, setErrorAnim] = useState(false);
    
    const [score, setScore] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const [gameState, setGameState] = useState<'playing' | 'finished'>('playing');

    const courseName = searchParams.get('courseName') || 'Bilinmeyen Ders';
    const topicName = searchParams.get('topicName') || 'Bilinmeyen Konu';
    const isStatic = searchParams.get('static') === 'true';
    const gameContext = useMemo(() => `Kelime Avı - ${courseName} > ${topicName}`, [courseName, topicName]);

    useEffect(() => {
        const fetchGameData = async () => {
            setIsLoading(true);
            const params = {
                courseId: searchParams.get('courseId') || undefined,
                unitId: searchParams.get('unitId') || undefined,
                topicId: searchParams.get('topicId') || undefined,
            };

            const { puzzle: fetchedPuzzle, error: fetchError } = await getWordSearchAction(params);
            if (fetchError) {
                setError(fetchError);
            } else if (fetchedPuzzle) {
                setPuzzle(fetchedPuzzle);
            }
            setIsLoading(false);
        };

        fetchGameData();
    }, [searchParams]);

    const getWordFromSelection = (start: Position, end: Position): string => {
        if (!puzzle) return '';
        let word = '';
        
        const dr = end.row - start.row;
        const dc = end.col - start.col;
        
        if (dr !== 0 && dc !== 0 && Math.abs(dr) !== Math.abs(dc)) {
            return '';
        }

        const steps = Math.max(Math.abs(dr), Math.abs(dc));
        const rowStep = dr === 0 ? 0 : dr / steps;
        const colStep = dc === 0 ? 0 : dc / steps;

        for (let i = 0; i <= steps; i++) {
            const row = start.row + i * rowStep;
            const col = start.col + i * colStep;
            word += puzzle.grid[row]?.[col] || '';
        }
        return word;
    };
    
    const getCellsBetween = (start: Position, end: Position): Position[] => {
        let cells: Position[] = [];
        const dr = end.row - start.row;
        const dc = end.col - start.col;

        if (dr !== 0 && dc !== 0 && Math.abs(dr) !== Math.abs(dc)) {
            return [];
        }

        const steps = Math.max(Math.abs(dr), Math.abs(dc));
        const rowStep = dr === 0 ? 0 : dr / steps;
        const colStep = dc === 0 ? 0 : dc / steps;

        for (let i = 0; i <= steps; i++) {
            cells.push({ row: start.row + i * rowStep, col: start.col + i * colStep });
        }
        return cells;
    };

    const handleCellClick = (row: number, col: number) => {
        if (gameState !== 'playing') return;

        if (!selectionStart) {
            setSelectionStart({ row, col });
        } else {
            const start = selectionStart;
            const end = { row, col };

            if (start.row === end.row && start.col === end.col) {
                setSelectionStart(null);
                return;
            }

            const selectedWord = getWordFromSelection(start, end);
            const reversedWord = selectedWord.split('').reverse().join('');
            
            const found = puzzle?.words.find(word => (word === selectedWord || word === reversedWord) && !foundWords.has(word));

            if (found) {
                const newFoundWords = new Set(foundWords).add(found);
                setFoundWords(newFoundWords);
                setScore(prev => prev + 10);
                setLines([...lines, { start, end }]);
                playSound('correct');
                
                if (newFoundWords.size === puzzle?.words.length) {
                    setGameState('finished');
                }
            } else {
                playSound('incorrect');
                setErrorAnim(true);
                setTimeout(() => setErrorAnim(false), 300);
            }

            setSelectionStart(null);
        }
    };
    
    const handleSaveAndExit = async () => {
        if (!user || score <= 0 || isSaving) {
            router.push('/student/activities');
            return;
        }
        setIsSaving(true);
        const result = await submitWordSearchScoreAction(user.uid, score, gameContext);
        if(result.success) {
            toast({ title: "Başarılı", description: "Puanın kaydedildi."});
        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive" });
        }
        router.push('/student/activities');
        setIsSaving(false);
    }
    
    const backUrl = isStatic ? '/statik' : '/student/kelime-avi';

    if (isLoading) {
        return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
    }
    
    if (error) {
        return (
            <div className="flex h-screen items-center justify-center p-4">
                <Alert variant="destructive" className="max-w-lg">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Oyun Yüklenemedi!</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                    <div className="mt-4">
                         <Button asChild variant="secondary">
                            <Link href="/student/kelime-avi">Geri Dön</Link>
                        </Button>
                    </div>
                </Alert>
            </div>
        );
    }
    
    if (!puzzle) return <p>Bulmaca yüklenemedi.</p>;


    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col items-center p-4">
             <Card className="w-full max-w-4xl">
                 <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                             <CardTitle className="text-3xl font-bold font-headline text-primary">Kelime Avı</CardTitle>
                             <CardDescription>{topicName}</CardDescription>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <p className="font-bold text-2xl text-primary">{score}</p>
                                <p className="text-xs text-muted-foreground">PUAN</p>
                            </div>
                            <Button asChild variant="outline">
                                <Link href={backUrl}><ArrowLeft className="mr-2 h-4 w-4"/> Etkinlik Merkezine Dön</Link>
                            </Button>
                        </div>
                    </div>
                 </CardHeader>
                 <CardContent className="flex flex-col md:flex-row gap-4">
                     <div 
                        className={cn(
                            "relative grid gap-1 bg-white dark:bg-gray-800 p-2 rounded-md shadow-inner cursor-crosshair",
                            errorAnim && 'animate-shake-game'
                        )}
                        style={{ gridTemplateColumns: `repeat(${puzzle.grid[0].length}, minmax(0, 1fr))` }}
                     >
                         {puzzle.grid.map((row, rIndex) => 
                            row.map((letter, cIndex) => {
                                const isFound = lines.some(line => {
                                    const allCoords = getCellsBetween(line.start, line.end);
                                    return allCoords.some(c => c.row === rIndex && c.col === cIndex);
                                });
                                const isStartSelection = selectionStart?.row === rIndex && selectionStart?.col === cIndex;
                                return (
                                <div 
                                    key={`${rIndex}-${cIndex}`}
                                    onClick={() => handleCellClick(rIndex, cIndex)}
                                    className={cn(
                                        "w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center font-bold text-lg border rounded-sm transition-all select-none",
                                        "bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600",
                                        isFound && "bg-green-500 text-white border-green-600",
                                        isStartSelection && "ring-4 ring-offset-2 ring-primary bg-primary/20"
                                    )}
                                >
                                    {letter}
                                </div>
                            )})
                         )}
                     </div>
                     <div className="w-full md:w-64 flex-shrink-0">
                         <Card className="h-full">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg">Kelimeler</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-1">
                                    {puzzle.words.map(word => (
                                        <li key={word} className={cn("flex items-center gap-2 transition-all", foundWords.has(word) && "text-green-500 font-bold line-through")}>
                                            {foundWords.has(word) ? <CheckCircle2 className="h-4 w-4"/> : <Lightbulb className="h-4 w-4 text-yellow-500"/>}
                                            {word}
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                         </Card>
                     </div>
                 </CardContent>
                 <CardFooter className="flex justify-between items-center">
                    <Progress value={(foundWords.size / puzzle.words.length) * 100} className="w-1/2"/>
                    <p className="text-muted-foreground text-sm">{foundWords.size} / {puzzle.words.length} kelime bulundu</p>
                 </CardFooter>
             </Card>
             
             {gameState === 'finished' && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-10">
                    <Card className="text-center p-8">
                        <CardHeader>
                            <CardTitle className="text-4xl font-bold text-green-500">Tebrikler!</CardTitle>
                            <CardDescription>Tüm kelimeleri buldun ve oyunu tamamladın.</CardDescription>
                        </CardHeader>
                         <CardContent>
                            <p className="text-2xl">Kazandığın Puan: <span className="font-bold text-primary">{score}</span></p>
                        </CardContent>
                        <CardFooter className="flex justify-center gap-4">
                            <Button onClick={() => window.location.reload()}><Repeat className="mr-2 h-4 w-4" /> Tekrar Oyna</Button>
                            <Button variant="secondary" onClick={handleSaveAndExit} disabled={isSaving}>
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                                Puanı Kaydet ve Çık
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            )}
        </div>
    )
}

export default function KelimeAviGamePage() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
            <WordSearchGame />
        </Suspense>
    )
}
