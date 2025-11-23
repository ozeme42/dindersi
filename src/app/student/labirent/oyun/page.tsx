

'use client';

import { useState, useEffect, useCallback, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getMazeQuestionsAction, submitMazeScoreAction } from '../actions';
import type { Question } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowRight, ArrowLeft, Milestone, PartyPopper, Repeat, Home, Flag, HelpCircle, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { playSound } from '@/lib/audio-service';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { QuestionDialog } from '@/components/question-dialog';
import { Badge } from '@/components/ui/badge';

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
    const [finalBonus, setFinalBonus] = useState(0);
    const [isFinished, setIsFinished] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const MAZE_WIDTH = 21;
    const MAZE_HEIGHT = 15;

    const activityCenterLink = useMemo(() => {
        if (user?.role === 'teacher' || user?.role === 'superadmin') {
            return '/teacher/activities';
        }
        return '/student/labirent';
    }, [user]);

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
            setFinalBonus(0);
            setIsFinished(false);
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
            
            const newCell = maze[newPos.y][newPos.x];
            if (newCell === 2 && !answeredQuestions.has(`${newPos.y}-${newPos.x}`)) {
                const questionIndex = questionLocations.findIndex(([qy, qx]) => qy === newPos.y && qx === newPos.x);
                if (questionIndex !== -1 && questions[questionIndex]) {
                     setOpenedQuestion({ number: questionIndex, question: questions[questionIndex] });
                }
            } else if (newCell === 3) {
                 playSound('correct');
                 const bonus = Math.max(0, 200 - (mistakeCount * 25));
                 setFinalBonus(bonus);
                 setScore(prev => prev + 50 + bonus); // Finish base score + bonus
                 setIsFinished(true);
            }
        }
    }, [maze, playerPosition, openedQuestion, isFinished, questions, questionLocations, answeredQuestions, mistakeCount]);

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

    const handleAnswerQuestion = (qIndex: number, isCorrect: boolean) => {
        setOpenedQuestion(null);
        if (isCorrect) {
            setAnsweredQuestions(prev => new Set(prev).add(`${questionLocations[qIndex][0]}-${questionLocations[qIndex][1]}`));
            setScore(prev => prev + 10);
            toast({ title: 'Doğru Cevap!', description: '+10 Puan kazandın. Yola devam!' });
        } else {
            setMistakeCount(prev => prev + 1);
            toast({ title: 'Yanlış Cevap!', description: 'Labirentin başına döndün.', variant: 'destructive'});
            setPlayerPosition({ x: 1, y: 1 });
        }
    };
    
    const handleSaveAndExit = async () => {
        if (isSubmitting) return;

        if (user?.role !== 'student' || score <= 0) {
            router.push(activityCenterLink);
            return;
        }

        setIsSubmitting(true);
        const context = `${searchParams.get('courseName') || ''} - ${searchParams.get('topicName') || ''}`
        
        const result = await submitMazeScoreAction(user.uid, score, context);
        if (result.success) {
            toast({ title: "Başarılı!", description: "Puanların kaydedildi." });
            router.push(activityCenterLink);
        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive"});
            setIsSubmitting(false); // Allow retry
        }
    };
    
    if (isLoading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /> <span className="ml-2">Oyun Yükleniyor...</span></div>;
    }
    
    if (error) {
        return (
            <div className="w-full h-full min-h-screen flex items-center justify-center p-4">
                <Alert variant="destructive" className="max-w-lg"><AlertTitle>Hata!</AlertTitle><AlertDescription>{error}</AlertDescription><div className="mt-4"><Button asChild variant="outline"><Link href={activityCenterLink}><ArrowLeft className="mr-2 h-4 w-4"/>Geri Dön</Link></Button></div></Alert>
            </div>
        );
    }
    
    if (isFinished) {
        return (
             <div className="w-full h-full min-h-screen flex items-center justify-center p-4">
                <Card className="w-full text-center max-w-md">
                    <CardHeader>
                        <div className="mx-auto bg-amber-100 rounded-full p-3 w-fit"><PartyPopper className="h-10 w-10 text-amber-500"/></div>
                        <CardTitle className="font-headline text-2xl md:text-3xl mt-4">Labirent Tamamlandı!</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {user?.role === 'student' && (
                            <div className="text-center space-y-2">
                                <p className="text-muted-foreground">Bitiş Puanı: <span className="font-bold text-foreground">50</span></p>
                                <p className="text-muted-foreground">Performans Bonusu: <span className="font-bold text-foreground">{finalBonus}</span> ({mistakeCount} hata)</p>
                                <hr className="my-2"/>
                                <p className="text-lg">Kazandığın Toplam Puan:</p>
                                <p className="text-5xl font-bold text-primary">{score}</p>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="flex-col gap-2 pt-6">
                        {user?.role === 'student' ? (
                            <Button onClick={handleSaveAndExit} className="w-full" disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Home className="mr-2 h-4 w-4"/>}
                                {isSubmitting ? 'Kaydediliyor...' : 'Puanı Kaydet ve Çık'}
                            </Button>
                        ) : (
                             <Button asChild className="w-full"><Link href={activityCenterLink}><Home className="mr-2 h-4 w-4"/>Etkinlik Merkezine Dön</Link></Button>
                        )}
                        <Button onClick={fetchGame} variant="secondary" className="w-full">
                           <Repeat className="mr-2 h-4 w-4" /> Yeni Labirent
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        )
    }

    return (
        <div className="w-full h-screen flex flex-col md:flex-row items-center justify-center p-4 bg-gray-200 dark:bg-gray-900 gap-8">
            <div className="flex-grow flex flex-col items-center gap-4">
                <h1 className="text-3xl font-bold font-headline text-foreground">Labirent Oyunu</h1>
                <p className="text-muted-foreground text-center">Ok tuşlarını kullanarak hareket et. <HelpCircle className="inline h-4 w-4"/> kutularındaki soruları cevapla ve <Flag className="inline h-4 w-4"/> bayrağına ulaş!</p>
                <Badge variant="secondary" className="text-lg">Skor: {score}</Badge>
                
                <div className="aspect-[21/15] w-full max-w-2xl bg-card p-2 rounded-lg shadow-lg overflow-hidden">
                    <div className="grid w-full h-full" style={{ gridTemplateColumns: `repeat(${MAZE_WIDTH}, 1fr)` }}>
                        {maze?.map((row, y) => row.map((cell, x) => (
                            <div key={`${y}-${x}`} className={cn(
                                "flex items-center justify-center",
                                cell === 1 && "bg-slate-800", // Wall
                                cell === 0 && "bg-slate-200 dark:bg-slate-700", // Path
                                cell === 2 && "bg-blue-300 dark:bg-blue-800", // Question
                                cell === 3 && "bg-green-400 dark:bg-green-700" // Finish
                            )}>
                                {playerPosition.x === x && playerPosition.y === y && <div className="w-3/4 h-3/4 rounded-full bg-primary animate-pulse" />}
                                {cell === 2 && !answeredQuestions.has(`${y}-${x}`) && <HelpCircle className="h-2/3 w-2/3 text-blue-800 dark:text-blue-200" />}
                                {cell === 2 && answeredQuestions.has(`${y}-${x}`) && <div className="w-3/4 h-3/4 rounded-full bg-slate-400 dark:bg-slate-600" />}
                                {cell === 3 && <Flag className="h-2/3 w-2/3 text-white" />}
                            </div>
                        )))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-3 grid-rows-3 gap-2 w-48 h-48 flex-shrink-0">
                <div className="col-start-2 row-start-1 flex justify-center">
                    <Button size="icon" className="w-14 h-14" onClick={() => handleMove('up')}><ArrowUp className="h-8 w-8"/></Button>
                </div>
                <div className="col-start-1 row-start-2 flex justify-center">
                    <Button size="icon" className="w-14 h-14" onClick={() => handleMove('left')}><ArrowLeft className="h-8 w-8"/></Button>
                </div>
                <div className="col-start-3 row-start-2 flex justify-center">
                    <Button size="icon" className="w-14 h-14" onClick={() => handleMove('right')}><ArrowRight className="h-8 w-8"/></Button>
                </div>
                <div className="col-start-2 row-start-3 flex justify-center">
                    <Button size="icon" className="w-14 h-14" onClick={() => handleMove('down')}><ArrowDown className="h-8 w-8"/></Button>
                </div>
            </div>
            {openedQuestion && (
                <QuestionDialog
                    isFullscreen={false}
                    isOpen={!!openedQuestion}
                    onClose={() => setOpenedQuestion(null)}
                    questionData={openedQuestion}
                    onAnswer={(qIndex, isCorrect) => handleAnswerQuestion(qIndex, isCorrect)}
                    showCorrectAnswerOnWrong={false}
                />
            )}
        </div>
    );
}

export default function LabirentOyunPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
            <MazeGame />
        </Suspense>
    )
}
