'use client';

import { useState, useEffect, useCallback, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getMazeQuestionsAction, submitMazeScoreAction } from '../actions';
import type { Question } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowRight, ArrowLeft, Flag, HelpCircle, ArrowUp, ArrowDown, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { playSound } from '@/lib/audio-service';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { QuestionDialog } from '@/components/question-dialog';
import { GameEndScreen } from '@/components/game-end-screen';
import { getGameBackUrl } from '@/lib/game-navigation';
import { WordwallShell, useWordwall } from '@/components/wordwall/wordwall-shell';

const generateMaze = (width: number, height: number, questionDensity: number): { grid: number[][], questions: [number, number][] } => {
    const grid = Array(height).fill(null).map(() => Array(width).fill(1));
    const questions: [number, number][] = [];

    const carve = (x: number, y: number) => {
        const directions = [[0, -2], [0, 2], [-2, 0], [2, 0]].sort(() => Math.random() - 0.5);
        grid[y][x] = 0;

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
    grid[height - 2][width - 2] = 3;

    const pathCells: [number, number][] = [];
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (grid[y][x] === 0 && !(x === 1 && y === 1)) {
                pathCells.push([y, x]);
            }
        }
    }
    
    pathCells.sort(() => Math.random() - 0.5);
    const numQuestions = Math.floor(pathCells.length * questionDensity);
    for (let i = 0; i < numQuestions && i < pathCells.length; i++) {
        const [qy, qx] = pathCells[i];
        grid[qy][qx] = 2;
        questions.push([qy, qx]);
    }
    
    return { grid, questions };
};

interface LabirentBoardProps {
    maze: number[][] | null;
    playerPosition: { x: number; y: number };
    answeredQuestions: Set<string>;
    MAZE_WIDTH: number;
    handleMove: (dir: 'up' | 'down' | 'left' | 'right') => void;
    openedQuestion: { number: number; question: Question } | null;
    setOpenedQuestion: (val: any) => void;
    handleAnswerQuestion: (qIndex: number, isCorrect: boolean, score: number) => void;
}

function LabirentBoard({
    maze,
    playerPosition,
    answeredQuestions,
    MAZE_WIDTH,
    handleMove,
    openedQuestion,
    setOpenedQuestion,
    handleAnswerQuestion,
}: LabirentBoardProps) {
    const { theme } = useWordwall();

    return (
        <div className="w-full h-full min-h-0 flex flex-col lg:flex-row items-center justify-center gap-2 sm:gap-4 overflow-hidden my-auto">
            {/* Labirent Grid Kartı */}
            <div className={cn(
                "relative aspect-[21/15] w-full max-w-3xl border-2 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden p-1.5 sm:p-3 backdrop-blur-xl flex-1 min-h-0 max-h-[75vh]",
                theme.cardBg,
                theme.cardBorder,
                theme.cardShadow
            )}>
                <div 
                    className="grid w-full h-full gap-[1px] sm:gap-[2px]" 
                    style={{ gridTemplateColumns: `repeat(${MAZE_WIDTH}, 1fr)` }}
                >
                    {maze?.map((row, y) => row.map((cell, x) => (
                        <div key={`${y}-${x}`} className={cn(
                            "flex items-center justify-center rounded-[2px] sm:rounded-md transition-colors duration-200",
                            cell === 1 && cn(theme.subPanelBg, "border border-white/5 shadow-inner"),
                            cell === 0 && "bg-transparent",
                            cell === 2 && "bg-amber-500/10",
                            cell === 3 && "bg-emerald-500/20"
                        )}>
                            {/* Oyuncu */}
                            {playerPosition.x === x && playerPosition.y === y && (
                                <div className="w-3/4 h-3/4 rounded-full bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.9)] animate-pulse relative z-10">
                                    <div className="absolute inset-0 bg-white rounded-full animate-ping opacity-60" />
                                </div>
                            )}
                            
                            {/* Soru İkonu */}
                            {cell === 2 && !answeredQuestions.has(`${y}-${x}`) && (
                                <HelpCircle className="h-4/5 w-4/5 text-amber-400 animate-bounce drop-shadow-[0_0_6px_rgba(245,158,11,0.6)]" />
                            )}
                            
                            {/* Cevaplanmış Soru */}
                            {cell === 2 && answeredQuestions.has(`${y}-${x}`) && (
                                <div className="w-1/2 h-1/2 rounded-full bg-slate-500/40 border border-slate-500/60" />
                            )}
                            
                            {/* Bitiş Bayrağı */}
                            {cell === 3 && (
                                <Flag className="h-4/5 w-4/5 text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                            )}
                        </div>
                    )))}
                </div>
            </div>

            {/* Sağ Panel: D-Pad Kontrolleri */}
            <div className={cn(
                "flex flex-col items-center justify-center shrink-0 p-2 sm:p-4 rounded-2xl sm:rounded-3xl border-2 shadow-xl backdrop-blur-md",
                theme.subPanelBg,
                theme.cardBorder
            )}>
                <div className="grid grid-cols-3 grid-rows-3 gap-1.5 sm:gap-2 w-32 h-32 sm:w-40 sm:h-40">
                    <div className="col-start-2 row-start-1 flex justify-center">
                        <button
                            type="button"
                            className={cn(
                                "w-10 h-10 sm:w-12 sm:h-12 rounded-xl border-2 shadow-md flex items-center justify-center transition-all active:scale-90 cursor-pointer",
                                theme.buttonIdle
                            )} 
                            onClick={() => handleMove('up')}
                        >
                            <ArrowUp className="h-5 w-5 sm:h-6 sm:w-6" />
                        </button>
                    </div>
                    <div className="col-start-1 row-start-2 flex justify-center">
                        <button 
                            type="button"
                            className={cn(
                                "w-10 h-10 sm:w-12 sm:h-12 rounded-xl border-2 shadow-md flex items-center justify-center transition-all active:scale-90 cursor-pointer",
                                theme.buttonIdle
                            )} 
                            onClick={() => handleMove('left')}
                        >
                            <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6" />
                        </button>
                    </div>
                    <div className="col-start-3 row-start-2 flex justify-center">
                        <button 
                            type="button"
                            className={cn(
                                "w-10 h-10 sm:w-12 sm:h-12 rounded-xl border-2 shadow-md flex items-center justify-center transition-all active:scale-90 cursor-pointer",
                                theme.buttonIdle
                            )} 
                            onClick={() => handleMove('right')}
                        >
                            <ArrowRight className="h-5 w-5 sm:h-6 sm:w-6" />
                        </button>
                    </div>
                    <div className="col-start-2 row-start-3 flex justify-center">
                        <button 
                            type="button"
                            className={cn(
                                "w-10 h-10 sm:w-12 sm:h-12 rounded-xl border-2 shadow-md flex items-center justify-center transition-all active:scale-90 cursor-pointer",
                                theme.buttonIdle
                            )} 
                            onClick={() => handleMove('down')}
                        >
                            <ArrowDown className="h-5 w-5 sm:h-6 sm:w-6" />
                        </button>
                    </div>
                    
                    <div className="col-start-2 row-start-2 flex justify-center items-center">
                        <div className={cn("w-3 h-3 rounded-full opacity-40", theme.subPanelBg)} />
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
    
    const topicName = searchParams.get('topicName') || searchParams.get('courseName') || 'Labirent';
    const gameContext = `Labirent - ${searchParams.get('courseName') || ''} - ${topicName}`;
    const backUrl = getGameBackUrl({ user, searchParams, defaultBackUrl: '/oyunlar/labirent' });

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
            const { grid, questions: qLocations } = generateMaze(MAZE_WIDTH, MAZE_HEIGHT, 0.15);
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
            playSound('pop');
            
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
        return (
            <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
                <Loader2 className="h-14 w-14 animate-spin text-blue-500" />
            </div>
        );
    }
    
    if (error) {
        return (
            <div className="w-full h-full min-h-screen flex items-center justify-center p-4 bg-slate-950 text-white">
                <Alert variant="destructive" className="max-w-md bg-slate-900 border-red-500/30 text-center">
                    <AlertTitle className="text-lg font-bold mb-2">Hata!</AlertTitle>
                    <AlertDescription className="text-slate-400 mb-6 text-sm">{error}</AlertDescription>
                    <Button asChild variant="secondary" className="w-full">
                        <Link href={backUrl}><ArrowLeft className="mr-2 h-4 w-4"/>Geri Dön</Link>
                    </Button>
                </Alert>
            </div>
        );
    }

    const answeredQuestionCount = answeredQuestions.size;
    const totalQuestionCount = questionLocations.length;

    return (
        <WordwallShell
            title="Labirent"
            subtitle={topicName}
            currentQuestionIndex={answeredQuestionCount}
            totalQuestions={totalQuestionCount}
            score={score}
            backUrl={backUrl}
            isFinished={isFinished}
            fitToScreen={true}
            contentClassName="w-full h-full min-h-0 overflow-hidden p-1 sm:p-3 flex flex-col items-center justify-center"
        >
            {isFinished ? (
                <div className="w-full max-w-xl mx-auto my-auto animate-in zoom-in-95 duration-300">
                    <GameEndScreen
                        score={score}
                        onSave={handleSaveAndExit}
                        isSaving={isSubmitting}
                        scoreSaved={isScoreSaved}
                        onRestart={fetchGame}
                        backUrl={backUrl}
                    />
                </div>
            ) : (
                <LabirentBoard
                    maze={maze}
                    playerPosition={playerPosition}
                    answeredQuestions={answeredQuestions}
                    MAZE_WIDTH={MAZE_WIDTH}
                    handleMove={handleMove}
                    openedQuestion={openedQuestion}
                    setOpenedQuestion={setOpenedQuestion}
                    handleAnswerQuestion={handleAnswerQuestion}
                />
            )}
        </WordwallShell>
    );
}

export default function LabirentOyunPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-950"><Loader2 className="h-16 w-16 animate-spin text-blue-500" /></div>}>
            <MazeGame />
        </Suspense>
    );
}
