
'use client';

import { useState, useEffect, useCallback, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getMazeQuestionsAction, submitMazeScoreAction } from '../actions';
import type { Question } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowRight, ArrowLeft, PartyPopper, Home, Flag, HelpCircle, ArrowUp, ArrowDown, Repeat, Trophy, XOctagon, Gamepad2, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { playSound } from '@/lib/audio-service';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { QuestionDialog } from '@/components/question-dialog';
import { GameEndScreen } from '@/components/game-end-screen';
import { FullscreenToggle } from '@/components/fullscreen-toggle';

// Maze generation using Randomized Depth-First Search
const generateMaze = (width: number, height: number, questionDensity: number): { grid: number[][], questions: [number, number][] } => {
    const grid = Array(height).fill(null).map(() => Array(width).fill(1)); // 1 = wall
    const questions: [number, number][] = [];

    const carve = (x: number, y: number) => {
        const directions = [[0, -2], [0, 2], [-2, 0], [2, 0]].sort(() => Math.random() - 0.5);
        grid[y][x] = 0; // 0 = path

        for (const [dx, dy] of directions) {
            const nx = x + dx;
            const ny = y + dy;

            if (ny >= 0 && ny < height && nx >= 0 && nx < width && grid[ny][nx] === 1) {
                grid[y + dy / 2][x + dx / 2] = 0;
                carve(nx, ny);
            }
        }
    };
    
    carve(1, 1);

    // Place finish
    grid[height - 2][width - 2] = 3; // 3 = finish

    // Place questions randomly on path cells
    const pathCells: [number, number][] = [];
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (grid[y][x] === 0 && !(x === 1 && y === 1)) { // Don't put a question on the start
                pathCells.push([y, x]);
            }
        }
    }
    
    pathCells.sort(() => Math.random() - 0.5);
    const numQuestions = Math.floor(pathCells.length * questionDensity);
    for (let i = 0; i < numQuestions && i < pathCells.length; i++) {
        const [qy, qx] = pathCells[i];
        grid[qy][qx] = 2; // 2 = question
        questions.push([qy, qx]);
    }
    
    return { grid, questions };
};


function MazeGame() {
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();

    const [isLoading, setIsLoading] = useState(true);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [error, setError] = useState<string | null>(null);

    const [maze, setMaze] = useState<number[][] | null>(null);
    const [playerPosition, setPlayerPosition] = useState({ x: 1, y: 1 });
    const [openedQuestion, setOpenedQuestion] = useState<{ number: number, question: Question } | null>(null);
    const [questionLocations, setQuestionLocations] = useState<[number, number][]>([]);
    const [answeredQuestions, setAnsweredQuestions] = useState<Set<string>>(new Set());

    const [score, setScore] = useState(0);
    const [mistakeCount, setMistakeCount] = useState(0);
    const [isFinished, setIsFinished] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isScoreSaved, setIsScoreSaved] = useState(false);

    const MAZE_WIDTH = 21;
    const MAZE_HEIGHT = 15;
    
    const gameContext = `Labirent - ${searchParams.get('courseName') || ''} - ${searchParams.get('topicName') || ''}`
    const backUrl = '/oyunlar/labirent';


    const fetchGame = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        
        const params = {
            courseId: searchParams.get('courseId') || undefined,
            unitId: searchParams.get('unitId') || undefined,
            topicId: searchParams.get('topicId') || undefined,
        };
        
        const result = await getMazeQuestionsAction(params);
        if (result.error || result.questions.length === 0) {
            setError(result.error || "Bu konu için uygun soru bulunamadı.");
        } else {
            setQuestions(result.questions);
            const { grid, questions: qLocations } = generateMaze(MAZE_WIDTH, MAZE_HEIGHT, 0.15); // 15% question density
            setMaze(grid);
            setQuestionLocations(qLocations);
            setPlayerPosition({ x: 1, y: 1 });
            setAnsweredQuestions(new Set());
            setScore(0);
            setMistakeCount(0);
            setIsFinished(false);
            setIsScoreSaved(false);
        }
        setIsLoading(false);
    }, [searchParams]);

    useEffect(() => {
        fetchGame();
    }, [fetchGame]);

    const handleMove = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
        if (!maze || openedQuestion || isFinished) return;
    
        let { x, y } = playerPosition;
        let newPos = { x, y };

        if (direction === 'up' && y > 0 && maze[y - 1][x] !== 1) newPos = { x, y: y - 1 };
        else if (direction === 'down' && y < maze.length - 1 && maze[y + 1][x] !== 1) newPos = { x, y: y + 1 };
        else if (direction === 'left' && x > 0 && maze[y][x - 1] !== 1) newPos = { x: x - 1, y };
        else if (direction === 'right' && x < maze[0].length - 1 && maze[y][x + 1] !== 1) newPos = { x: x + 1, y };

        if (newPos.x !== x || newPos.y !== y) {
            setPlayerPosition(newPos);
            playSound('pop'); // Hareket sesi
            
            const newCell = maze[newPos.y][newPos.x];
            if (newCell === 2 && !answeredQuestions.has(`${newPos.y}-${newPos.x}`)) {
                const questionIndex = questionLocations.findIndex(([qy, qx]) => qy === newPos.y && qx === newPos.x);
                if (questionIndex !== -1 && questions[questionIndex]) {
                     setOpenedQuestion({ number: questionIndex, question: questions[questionIndex] });
                }
            } else if (newCell === 3) {
                 playSound('win');
                 setIsFinished(true);
            }
        }
    }, [maze, playerPosition, openedQuestion, isFinished, questions, questionLocations, answeredQuestions]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'ArrowUp': handleMove('up'); break;
                case 'ArrowDown': handleMove('down'); break;
                case 'ArrowLeft': handleMove('left'); break;
                case 'ArrowRight': handleMove('right'); break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleMove]);

    const handleAnswerQuestion = (qIndex: number, isCorrect: boolean, scoreChange: number) => {
        setOpenedQuestion(null);
        if (isCorrect) {
            playSound('correct');
            setAnsweredQuestions(prev => new Set(prev).add(`${questionLocations[qIndex][0]}-${questionLocations[qIndex][1]}`));
            setScore(prev => prev + scoreChange);
            toast({ title: 'Doğru Cevap!', description: `+${scoreChange} Puan kazandın. Yola devam!` });
        } else {
            playSound('incorrect');
            setMistakeCount(prev => prev + 1);
            toast({ title: 'Yanlış Cevap!', description: 'Labirentin başına döndün.', variant: 'destructive'});
            setPlayerPosition({ x: 1, y: 1 });
        }
    };
    
    const handleSaveAndExit = async () => {
        if (isSubmitting || isScoreSaved || !user || score <= 0) {
            router.push(backUrl);
            return;
        }

        setIsSubmitting(true);
        const result = await submitMazeScoreAction(user.uid, score, gameContext);
        if (result.success) {
            toast({ title: "Başarılı!", description: "Puanların kaydedildi." });
            setIsScoreSaved(true);
        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive"});
            setIsSubmitting(false); 
        }
    };
    
    if (isLoading) {
        return <div className="flex h-screen items-center justify-center bg-slate-950"><Loader2 className="h-16 w-16 animate-spin text-blue-500" /></div>;
    }
    
    if (error) {
        return (
            <div className="w-full h-full min-h-screen flex items-center justify-center p-4 bg-slate-950">
                <Alert variant="destructive" className="max-w-lg bg-slate-900 border-red-500/30 text-center">
                    <AlertTitle className="text-xl text-white font-bold mb-2">Hata!</AlertTitle>
                    <AlertDescription className="text-slate-400 mb-6">{error}</AlertDescription>
                    <Button asChild variant="secondary" className="w-full bg-slate-800 text-white hover:bg-slate-700 border-white/10">
                        <Link href={backUrl}><ArrowLeft className="mr-2 h-4 w-4"/>Geri Dön</Link>
                    </Button>
                </Alert>
            </div>
        );
    }
    
    if (isFinished) {
        return (
            <GameEndScreen
                score={score}
                onSave={handleSaveAndExit}
                isSaving={isSubmitting}
                scoreSaved={isScoreSaved}
                onRestart={fetchGame}
                backUrl={backUrl}
            />
        )
    }

    const answeredQuestionCount = answeredQuestions.size;
    const totalQuestionCount = questionLocations.length;

    return (
        <div className="w-full min-h-screen flex flex-col md:flex-row items-center justify-center p-4 bg-slate-950 text-white gap-8 relative pb-24 md:pb-4">
            
            {/* Arka Plan Efektleri */}
            <div className="fixed inset-0 pointer-events-none z-0 opacity-40">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse delay-1000" />
            </div>

            {/* Sol Panel: Oyun Alanı */}
            <div className="relative z-10 flex-grow flex flex-col items-center gap-4 w-full max-w-4xl flex-shrink-0">
                
                {/* HUD */}
                <div className="w-full bg-slate-900/80 backdrop-blur-md border border-white/10 p-3 rounded-2xl flex justify-between items-center shadow-lg shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-500/20 p-2 rounded-xl">
                            <Gamepad2 className="h-6 w-6 text-blue-400" />
                        </div>
                        <div>
                            <h1 className="font-bold text-lg text-white leading-tight">Labirent</h1>
                            <p className="text-slate-400 text-xs">Soruları çöz, çıkışa ulaş!</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden md:flex items-center gap-2 bg-slate-950/50 border border-yellow-500/20 px-3 py-1.5 rounded-xl">
                            <Trophy className="h-4 w-4 text-yellow-400" />
                            <span className="font-mono font-bold text-white">{score}</span>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-950/50 border border-blue-500/20 px-3 py-1.5 rounded-xl text-sm font-bold text-blue-300">
                            <HelpCircle className="h-4 w-4" /> {answeredQuestionCount}/{totalQuestionCount}
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setIsFinished(true)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                            <XOctagon className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
                
                {/* Labirent Grid */}
                <div className="relative aspect-[21/15] w-full bg-slate-900/60 backdrop-blur-sm border-2 border-white/10 rounded-3xl shadow-2xl overflow-hidden p-2 md:p-4">
                    <div className="grid w-full h-full gap-[1px] md:gap-[2px]" style={{ gridTemplateColumns: `repeat(${MAZE_WIDTH}, 1fr)` }}>
                        {maze?.map((row, y) => row.map((cell, x) => (
                            <div key={`${y}-${x}`} className={cn(
                                "flex items-center justify-center rounded-sm md:rounded-md transition-colors duration-300",
                                cell === 1 && "bg-slate-800 shadow-inner", // Duvar
                                cell === 0 && "bg-slate-900/50", // Yol
                                cell === 2 && "bg-blue-900/30", // Soru Alanı
                                cell === 3 && "bg-emerald-900/30" // Bitiş Alanı
                            )}>
                                {/* Oyuncu */}
                                {playerPosition.x === x && playerPosition.y === y && (
                                    <div className="w-3/4 h-3/4 rounded-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.8)] animate-pulse relative z-10">
                                        <div className="absolute inset-0 bg-white/50 rounded-full animate-ping opacity-50" />
                                    </div>
                                )}
                                
                                {/* Soru İkonu */}
                                {cell === 2 && !answeredQuestions.has(`${y}-${x}`) && (
                                    <HelpCircle className="h-3/4 w-3/4 text-yellow-400 animate-bounce drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]" />
                                )}
                                
                                {/* Cevaplanmış Soru */}
                                {cell === 2 && answeredQuestions.has(`${y}-${x}`) && (
                                    <div className="w-1/2 h-1/2 rounded-full bg-slate-700/50 border border-slate-600" />
                                )}
                                
                                {/* Bitiş Bayrağı */}
                                {cell === 3 && (
                                    <Flag className="h-3/4 w-3/4 text-emerald-500 drop-shadow-[0_0_10px_rgba(16,185,129,0.6)]" />
                                )}
                            </div>
                        )))}
                    </div>
                </div>
            </div>

            {/* Sağ Panel: Kontroller (D-Pad) */}
            <div className="relative z-10 flex flex-col items-center justify-center shrink-0 p-4 bg-slate-900/50 backdrop-blur-md rounded-3xl border border-white/5 shadow-xl">
                <div className="grid grid-cols-3 grid-rows-3 gap-2 w-40 h-40 md:w-48 md:h-48">
                    <div className="col-start-2 row-start-1 flex justify-center">
                        <Button size="icon" className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-slate-800 border border-white/10 hover:bg-blue-600 hover:border-blue-400 transition-all active:scale-95 shadow-lg" onClick={() => handleMove('up')}>
                            <ArrowUp className="h-8 w-8 text-white"/>
                        </Button>
                    </div>
                    <div className="col-start-1 row-start-2 flex justify-center">
                        <Button size="icon" className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-slate-800 border border-white/10 hover:bg-blue-600 hover:border-blue-400 transition-all active:scale-95 shadow-lg" onClick={() => handleMove('left')}>
                            <ArrowLeft className="h-8 w-8 text-white"/>
                        </Button>
                    </div>
                    <div className="col-start-3 row-start-2 flex justify-center">
                        <Button size="icon" className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-slate-800 border border-white/10 hover:bg-blue-600 hover:border-blue-400 transition-all active:scale-95 shadow-lg" onClick={() => handleMove('right')}>
                            <ArrowRight className="h-8 w-8 text-white"/>
                        </Button>
                    </div>
                    <div className="col-start-2 row-start-3 flex justify-center">
                        <Button size="icon" className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-slate-800 border border-white/10 hover:bg-blue-600 hover:border-blue-400 transition-all active:scale-95 shadow-lg" onClick={() => handleMove('down')}>
                            <ArrowDown className="h-8 w-8 text-white"/>
                        </Button>
                    </div>
                    
                    {/* Orta Nokta (Dekoratif) */}
                    <div className="col-start-2 row-start-2 flex justify-center items-center">
                        <div className="w-4 h-4 bg-slate-700 rounded-full shadow-inner" />
                    </div>
                </div>
            </div>

            {/* Soru Dialogu */}
            {openedQuestion && (
                <QuestionDialog
                    isFullscreen={false}
                    isOpen={!!openedQuestion}
                    onClose={() => setOpenedQuestion(null)}
                    questionData={openedQuestion}
                    onAnswer={(qIndex, isCorrect, score) => handleAnswerQuestion(qIndex, isCorrect, score)}
                    showCorrectAnswerOnWrong={false}
                    pointsConfig={{ default: { points: 10 }}}
                />
            )}
        </div>
    );
}

export default function LabirentOyunPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-950"><Loader2 className="h-16 w-16 animate-spin text-blue-500" /></div>}>
            <MazeGame />
        </Suspense>
    )
}
