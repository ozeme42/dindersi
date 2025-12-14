'use client';

import { useState, useEffect, useCallback, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getKutuAcQuestionsAction, submitKutuAcScoreAction } from '@/app/oyunlar/kutu-ac/actions';
import type { Question } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Package, PartyPopper, Repeat, Home, User, Users, Trophy, Crown, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { FullscreenToggle } from '@/components/fullscreen-toggle';
import { useAuth } from '@/context/auth-context';
import { QuestionDialog } from '@/components/question-dialog';
import { GameEndScreen } from '@/components/game-end-screen';
import { Badge } from "@/components/ui/badge";

const shuffleArray = <T,>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

type Player = {
    id: number;
    name: string;
    score: number;
};

function KutuAcGame() {
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    
    // Game Setup State
    const [playerCount, setPlayerCount] = useState<number | null>(null);
    const [players, setPlayers] = useState<Player[]>([]);
    const [activePlayerIndex, setActivePlayerIndex] = useState(0);

    // Game Logic State
    const [isLoading, setIsLoading] = useState(false);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [openedBoxes, setOpenedBoxes] = useState<Set<number>>(new Set());
    const [openedQuestion, setOpenedQuestion] = useState<{ number: number; question: Question } | null>(null);

    const [isFinished, setIsFinished] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isScoreSaved, setIsScoreSaved] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const backUrl = '/oyunlar/kutu-ac';
    const gameContext = `Kutu Aç - ${searchParams.get('topicName') || 'Genel'}`;

    useEffect(() => {
        const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const fetchQuestions = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        const params = {
            courseId: searchParams.get('courseId') || undefined,
            unitId: searchParams.get('unitId') || undefined,
            topicId: searchParams.get('topicId') || undefined,
        };
        const result = await getKutuAcQuestionsAction(params);
        if (result.error || result.questions.length === 0) {
            setError(result.error || "Bu konu için soru bulunamadı.");
        } else {
            setQuestions(shuffleArray(result.questions));
        }
        setIsLoading(false);
    }, [searchParams]);

    // Handle Player Count Selection
    const startGame = (count: number) => {
        setPlayerCount(count);
        const newPlayers: Player[] = [];
        if (count === 1) {
            newPlayers.push({ id: 1, name: user?.displayName || 'Oyuncu', score: 0 });
        } else {
            for (let i = 1; i <= count; i++) {
                newPlayers.push({ id: i, name: `Oyuncu ${i}`, score: 0 });
            }
        }
        setPlayers(newPlayers);
        fetchQuestions();
    };

    const handleAnswerQuestion = (questionNumber: number, isCorrect: boolean, scoreChange: number) => {
        setOpenedQuestion(null);
        setOpenedBoxes(prev => new Set(prev).add(questionNumber));
        
        if (isCorrect) {
            setPlayers(prev => prev.map((p, index) => 
                index === activePlayerIndex ? { ...p, score: p.score + scoreChange } : p
            ));
        }

        // Check finish condition
        if (openedBoxes.size + 1 >= questions.length) {
            setIsFinished(true);
        } else if (playerCount && playerCount > 1) {
             // Next player turn for multiplayer
             setActivePlayerIndex(prev => (prev + 1) % playerCount);
        }
    };

    const handleSaveAndExit = async () => {
        if (isSubmitting || players[0].score <= 0 || isScoreSaved || (playerCount && playerCount > 1)) {
            router.push(backUrl);
            return;
        }

        if (user?.role !== 'student') {
            router.push(backUrl);
            return;
        }

        setIsSubmitting(true);
        // Only save for single player
        const result = await submitKutuAcScoreAction(user.uid, players[0].score, gameContext);
        if (result.success) {
            toast({ title: "Başarılı!", description: "Puanların kaydedildi." });
            setIsScoreSaved(true);
        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive"});
            setIsSubmitting(false);
        }
    };

    const handleRestart = () => {
        setIsFinished(false);
        setPlayers(prev => prev.map(p => ({ ...p, score: 0 })));
        setOpenedBoxes(new Set());
        setOpenedQuestion(null);
        setIsScoreSaved(false);
        setActivePlayerIndex(0);
        setPlayerCount(null); // Go back to setup
    };

    // Setup Screen
    if (playerCount === null) {
         return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
                <div className="fixed inset-0 pointer-events-none z-0">
                    <div className="absolute top-[-20%] left-[-10%] w-[1000px] h-[1000px] bg-purple-600/10 rounded-full blur-[150px]" />
                    <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-blue-900/10 rounded-full blur-[150px]" />
                </div>
                
                <Card className="w-full max-w-lg bg-slate-900/80 backdrop-blur-xl border-white/10 shadow-2xl relative z-10">
                    <CardHeader className="text-center pb-2">
                        <div className="mx-auto p-4 bg-purple-500/20 rounded-full border border-purple-500/30 mb-4 shadow-lg shadow-purple-500/20">
                            <Package className="h-12 w-12 text-purple-400" />
                        </div>
                        <CardTitle className="text-3xl font-black text-white uppercase tracking-tight">Kutu Aç</CardTitle>
                        <CardDescription className="text-slate-400 font-medium">Kaç kişi oynayacak?</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4 p-6">
                        <Button onClick={() => startGame(1)} variant="outline" className="h-36 flex flex-col gap-3 border-2 border-white/10 bg-slate-900 text-white hover:bg-purple-600 hover:border-purple-500 hover:text-white transition-all group shadow-lg">
                            <User className="h-12 w-12 text-purple-400 group-hover:text-white transition-colors" />
                            <span className="font-black text-2xl tracking-wide">1 Kişilik</span>
                            <span className="text-sm font-medium text-slate-400 group-hover:text-purple-100">Puan Kaydedilir</span>
                        </Button>
                         <Button onClick={() => startGame(2)} variant="outline" className="h-36 flex flex-col gap-3 border-2 border-white/10 bg-slate-900 text-white hover:bg-blue-600 hover:border-blue-500 hover:text-white transition-all group shadow-lg">
                            <div className="flex -space-x-2"><User className="h-10 w-10 text-blue-400 group-hover:text-white" /><User className="h-10 w-10 text-blue-400 group-hover:text-white" /></div>
                            <span className="font-black text-2xl tracking-wide">2 Kişilik</span>
                            <span className="text-sm font-medium text-slate-400 group-hover:text-blue-100">VS Modu</span>
                        </Button>
                         <Button onClick={() => startGame(3)} variant="outline" className="h-36 flex flex-col gap-3 border-2 border-white/10 bg-slate-900 text-white hover:bg-emerald-600 hover:border-emerald-500 hover:text-white transition-all group shadow-lg">
                             <Users className="h-12 w-12 text-emerald-400 group-hover:text-white" />
                            <span className="font-black text-2xl tracking-wide">3 Kişilik</span>
                             <span className="text-sm font-medium text-slate-400 group-hover:text-emerald-100">Yarışma</span>
                        </Button>
                         <Button onClick={() => startGame(4)} variant="outline" className="h-36 flex flex-col gap-3 border-2 border-white/10 bg-slate-900 text-white hover:bg-orange-600 hover:border-orange-500 hover:text-white transition-all group shadow-lg">
                             <Users className="h-12 w-12 text-orange-400 group-hover:text-white" />
                            <span className="font-black text-2xl tracking-wide">4 Kişilik</span>
                             <span className="text-sm font-medium text-slate-400 group-hover:text-orange-100">Parti</span>
                        </Button>
                    </CardContent>
                    <CardFooter className="justify-center border-t border-white/5 pt-4">
                        <Button asChild variant="ghost" className="text-slate-400 hover:text-white hover:bg-white/5">
                            <Link href={backUrl}><ArrowLeft className="mr-2 h-4 w-4"/> İptal</Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
         )
    }

    if (isLoading) {
        return <div className="flex h-screen items-center justify-center bg-slate-950"><Loader2 className="h-12 w-12 animate-spin text-purple-500" /> <span className="ml-3 text-white font-bold animate-pulse">Kutular Hazırlanıyor...</span></div>;
    }

    if (error) {
        return (
            <div className={cn("w-full h-full min-h-screen flex items-center justify-center p-4 bg-slate-950")}>
                <Alert variant="destructive" className="max-w-lg bg-red-950/50 border-red-500/50 text-red-200">
                    <AlertTitle>Hata!</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                    <div className="mt-4"><Button asChild variant="outline" className="border-white/10 text-white hover:bg-white/10"><Link href={backUrl}><ArrowLeft className="mr-2 h-4 w-4"/>Geri Dön</Link></Button></div>
                </Alert>
            </div>
        );
    }
    
    if (isFinished) {
         const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
        const winner = sortedPlayers[0];

        if (playerCount === 1) {
            return (
                <GameEndScreen
                    score={players[0].score}
                    onSave={handleSaveAndExit}
                    isSaving={isSubmitting}
                    scoreSaved={isScoreSaved}
                    onRestart={handleRestart}
                    backUrl={backUrl}
                />
            )
        }

        return (
             <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
                <div className="fixed inset-0 pointer-events-none z-0">
                    <div className="absolute top-[-20%] left-[-10%] w-[1000px] h-[1000px] bg-purple-600/10 rounded-full blur-[150px]" />
                    <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-blue-900/10 rounded-full blur-[150px]" />
                </div>

                <Card className="w-full max-w-2xl bg-slate-900/80 backdrop-blur-xl border-white/10 shadow-2xl relative z-10">
                     <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-400 via-pink-500 to-red-500" />
                    <CardHeader className="text-center pb-2">
                        <CardTitle className="font-black text-4xl text-white uppercase tracking-wider flex flex-col items-center gap-4">
                             <div className="p-4 bg-yellow-500/20 rounded-full border border-yellow-500/30 shadow-lg shadow-yellow-500/20 animate-bounce">
                                <Trophy className="h-16 w-16 text-yellow-400 drop-shadow-md"/>
                             </div>
                             Oyun Bitti!
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex flex-col items-center gap-2">
                            {playerCount && playerCount > 1 ? (
                                winner ? (
                                    <>
                                        <p className="text-lg text-slate-300 font-medium uppercase tracking-widest">KAZANAN</p>
                                        <p className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 drop-shadow-sm">{winner.name}</p>
                                    </>
                                ) : <p className="text-3xl font-black text-slate-300">BERABERE!</p>
                            ) : (
                                <>
                                    <p className="text-lg text-slate-300 font-medium uppercase tracking-widest">TOPLAM PUAN</p>
                                    <p className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 drop-shadow-sm">{puanlar[teams[0]]}</p>
                                </>
                            )}
                        </div>
                        
                         <div className="bg-slate-950/50 rounded-xl border border-white/5 p-4">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Puan Tablosu</h4>
                            <div className="space-y-2">
                                {sortedPlayers.map((p, i) => (
                                    <div key={p.id} className="flex justify-between items-center p-3 rounded-lg bg-slate-900 border border-white/5 hover:bg-white/5 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <span className={cn("font-black text-lg w-6 text-center", i === 0 ? "text-yellow-400" : "text-slate-500")}>{i + 1}</span>
                                            <span className="font-medium text-white">{p.name}</span>
                                        </div>
                                        <span className="font-bold text-emerald-400">{p.score}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="flex-col sm:flex-row justify-center gap-4 bg-black/20 p-6 border-t border-white/5">
                         <Button onClick={handleRestart} size="lg" className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-900/20">
                             <Repeat className="mr-2 h-5 w-5" /> Tekrar Oyna
                         </Button>
                         <Button asChild variant="outline" size="lg" className="w-full sm:w-auto border-white/10 text-slate-300 hover:text-white hover:bg-white/5 bg-transparent">
                             <Link href={backUrl}><Home className="mr-2 h-5 w-5" /> Çıkış</Link>
                         </Button>
                         
                         {playerCount === 1 && !isScoreSaved && (
                            <Button onClick={handleSaveAndExit} disabled={isSubmitting} size="lg" className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-900/20">
                                {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin"/> : <Save className="mr-2 h-5 w-5"/>} 
                                Puanı Kaydet
                            </Button>
                         )}
                         {playerCount === 1 && isScoreSaved && (
                             <Button disabled size="lg" className="w-full sm:w-auto bg-emerald-800/50 text-white/50 font-bold border border-emerald-500/20">
                                <Check className="mr-2 h-5 w-5"/> Kaydedildi
                             </Button>
                         )}
                    </CardFooter>
                </Card>
            </div>
        );
    }

    const timerDuration = openedQuestion?.question.type === 'Doğru/Yanlış' ? 10 : 20;

    return (
        <div className={cn("w-full h-full min-h-screen bg-slate-950 font-sans text-slate-100 flex flex-col relative overflow-hidden", isFullscreen ? "p-4" : "p-4 sm:p-6 md:p-8")}>
            
            {/* Arka Plan */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[1000px] h-[1000px] bg-purple-900/10 rounded-full blur-[150px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-blue-900/10 rounded-full blur-[150px]" />
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.03]" />
            </div>

            <div className="w-full max-w-7xl mx-auto relative z-10 flex-grow flex flex-col">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4 border-b border-white/5 pb-4">
                    <div className="flex items-center gap-3">
                         <div className="p-2 bg-purple-500/20 rounded-lg border border-purple-500/30">
                            <Package className="h-6 w-6 text-purple-400" />
                        </div>
                        <div>
                             <h1 className="text-2xl font-black text-white tracking-tight uppercase">Kutu Aç</h1>
                             <p className="text-xs text-slate-400 font-medium">{openedBoxes.size} / {questions.length} kutu açıldı.</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <Button variant="destructive" size="sm" onClick={() => setIsFinished(true)}>Oyunu Bitir</Button>
                        <FullscreenToggle />
                    </div>
                </div>
                
                {/* Scoreboard Area */}
                <div className="mb-6">
                    {playerCount && playerCount > 1 ? (
                        <div className={cn("grid gap-4", `grid-cols-2 md:grid-cols-${playerCount > 4 ? 4 : playerCount}`)}>
                            {players.map((p, i) => (
                                <div 
                                    key={p.id} 
                                    className={cn(
                                        "p-3 rounded-xl border flex flex-col items-center justify-center transition-all duration-300",
                                        i === activePlayerIndex 
                                            ? "bg-purple-600/20 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.3)] scale-105 z-10" 
                                            : "bg-slate-900/40 border-white/10 opacity-70"
                                    )}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        {i === activePlayerIndex && <Crown className="h-3 w-3 text-yellow-400 animate-bounce" />}
                                        <span className={cn("text-sm font-bold", i === activePlayerIndex ? "text-white" : "text-slate-400")}>{p.name}</span>
                                    </div>
                                    <span className={cn("text-4xl font-black tabular-nums", i === activePlayerIndex ? "text-purple-400" : "text-slate-500")}>{p.score}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                         <div className="flex justify-center">
                            <div className="bg-slate-900/60 backdrop-blur-md px-8 py-3 rounded-2xl border border-purple-500/30 shadow-lg flex items-center gap-4">
                                <span className="text-slate-400 text-sm font-bold uppercase tracking-widest">SKOR</span>
                                <span className="text-4xl font-black text-white tabular-nums drop-shadow-md">{players[0]?.score || 0}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Game Grid */}
                <Card className="bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-2xl flex-grow flex flex-col overflow-hidden">
                     <CardHeader className="border-b border-white/5 pb-4">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-xl text-white font-bold flex items-center gap-2">
                                <span className="bg-purple-500/20 text-purple-400 p-1.5 rounded-lg border border-purple-500/30"><Target className="h-5 w-5"/></span>
                                Soru Seçimi
                            </CardTitle>
                            {playerCount && playerCount > 1 && (
                                <Badge variant="outline" className="bg-indigo-500/10 text-indigo-300 border-indigo-500/30 px-3 py-1 text-sm animate-pulse">
                                    Sıra: {players[activePlayerIndex]?.name}
                                </Badge>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 overflow-y-auto flex-grow min-h-[300px] pb-24">
                        <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3 md:gap-4">
                            {Array.from({ length: questions.length }).map((_, i) => {
                                const questionNumber = i + 1;
                                const isOpened = openedBoxes.has(questionNumber);
                                return (
                                    <div 
                                        key={i}
                                        id={`kutucuk-${questionNumber}`}
                                        onClick={() => !isOpened && setOpenedQuestion({ number: questionNumber, question: questions[i] })}
                                        className={cn(
                                            "aspect-square rounded-xl flex items-center justify-center text-2xl md:text-3xl font-black text-white cursor-pointer shadow-lg transition-all duration-500 relative overflow-hidden group border-b-[4px] active:border-b-0 active:translate-y-[4px]",
                                            isOpened 
                                                ? "bg-slate-900 border-slate-800 text-slate-700 shadow-none scale-95 opacity-50" 
                                                : "bg-gradient-to-br from-indigo-500 to-purple-600 border-indigo-700 hover:-translate-y-1 hover:shadow-purple-500/30"
                                        )}
                                    >
                                        {!isOpened && <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />}
                                        {isOpened ? <CheckCheck className="h-6 w-6 text-emerald-500/50" /> : questionNumber}
                                    </div>
                                )
                            })}
                        </div>
                    </CardContent>
                    <CardFooter className="bg-black/20 p-4 border-t border-white/5 text-center text-xs text-slate-500">
                        Soruları sırayla veya rastgele seçebilirsiniz. En çok puanı toplayan kazanır!
                    </CardFooter>
                </Card>
            </div>
            
            {openedQuestion && (
                <QuestionDialog
                    isFullscreen={isFullscreen}
                    isOpen={!!openedQuestion}
                    onClose={() => setOpenedQuestion(null)}
                    questionData={openedQuestion}
                    onAnswer={handleAnswerQuestion}
                    timerDuration={timerDuration}
                    pointsConfig={{ default: { points: 10 }}}
                    penaltyConfig={{ default: { penalty: 0 }}}
                    showCorrectAnswerOnWrong={true}
                />
            )}
        </div>
    );
}

```