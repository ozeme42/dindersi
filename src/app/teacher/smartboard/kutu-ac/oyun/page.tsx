
'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getKutuAcQuestionsAction, submitKutuAcScoreAction } from '@/app/oyunlar/kutu-ac/actions';
import type { Question } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Package, Users, Trophy, Crown, Target, Sparkles, MonitorPlay, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { FullscreenToggle } from '@/components/fullscreen-toggle';
import { useAuth } from '@/context/auth-context';
import { QuestionDialog } from '@/components/question-dialog';
import { GameEndScreen } from '@/components/game-end-screen';
import { Badge } from "@/components/ui/badge";

// Soruları karıştıran yardımcı fonksiyon
const shuffleArray = <T,>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

// Takım Renk ve İsim Ayarları
const TEAMS = [
    { name: 'A Takımı', short: 'A', color: 'text-red-400', border: 'border-red-500', bg: 'bg-red-500/20', from: 'from-red-600', to: 'to-orange-600', shadow: 'shadow-red-500/40' },
    { name: 'B Takımı', short: 'B', color: 'text-blue-400', border: 'border-blue-500', bg: 'bg-blue-500/20', from: 'from-blue-600', to: 'to-cyan-600', shadow: 'shadow-blue-500/40' },
    { name: 'C Takımı', short: 'C', color: 'text-emerald-400', border: 'border-emerald-500', bg: 'bg-emerald-500/20', from: 'from-emerald-600', to: 'to-green-600', shadow: 'shadow-emerald-500/40' },
    { name: 'D Takımı', short: 'D', color: 'text-yellow-400', border: 'border-yellow-500', bg: 'bg-yellow-500/20', from: 'from-yellow-600', to: 'to-amber-600', shadow: 'shadow-yellow-500/40' },
];

type Player = {
    id: number;
    name: string;
    score: number;
    teamConfig?: typeof TEAMS[0];
};

function KutuAcGame() {
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    
    // Oyun Durumları
    const [playerCount, setPlayerCount] = useState<number | null>(null);
    const [players, setPlayers] = useState<Player[]>([]);
    const [activePlayerIndex, setActivePlayerIndex] = useState(0);

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

    const startGame = (count: number) => {
        setPlayerCount(count);
        const newPlayers: Player[] = [];
        
        if (count === 1) {
            newPlayers.push({ 
                id: 1, 
                name: user?.displayName || 'Yarışmacı', 
                score: 0 
            });
        } else {
            for (let i = 0; i < count; i++) {
                newPlayers.push({ 
                    id: i + 1, 
                    name: TEAMS[i].name,
                    score: 0,
                    teamConfig: TEAMS[i]
                });
            }
        }
        setPlayers(newPlayers);
        setActivePlayerIndex(0);
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

        if (openedBoxes.size + 1 >= questions.length) {
            setIsFinished(true);
        } else if (playerCount && playerCount > 1) {
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
        const result = await submitKutuAcScoreAction(user.uid, players[0].score, gameContext);
        if (result.success) {
            toast({ title: "Başarılı", description: "Puanınız kaydedildi." });
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
        setPlayerCount(null);
    };

    // --- RENDER ---

    // 1. SEÇİM EKRANI
    if (playerCount === null) {
         return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px]" />
                
                <Card className="w-full max-w-5xl bg-slate-900/80 backdrop-blur-xl border-white/10 shadow-2xl relative z-10">
                    <CardHeader className="text-center pb-8 pt-8">
                        <div className="mx-auto w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-4">
                            <Package className="h-10 w-10 text-white" />
                        </div>
                        <CardTitle className="text-4xl sm:text-5xl font-black text-white uppercase tracking-tighter">
                            Kutu Aç
                        </CardTitle>
                        <CardDescription className="text-lg text-slate-400 font-medium mt-2">
                            Yarışma formatını seçiniz
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-8">
                        <Button onClick={() => startGame(1)} variant="outline" className="h-56 flex flex-col items-center justify-center gap-4 border-2 border-white/5 bg-slate-900/50 hover:bg-purple-600 hover:border-purple-500 text-white transition-all group hover:-translate-y-2">
                            <div className="p-4 rounded-full bg-white/5 group-hover:bg-white/20">
                                <MonitorPlay className="h-8 w-8 text-slate-300 group-hover:text-white" />
                            </div>
                            <div className="text-center">
                                <span className="block font-black text-xl">TEK YARIŞMACI</span>
                                <span className="text-xs font-medium text-slate-500 group-hover:text-purple-100 mt-1">Bireysel Puan</span>
                            </div>
                        </Button>

                        <Button onClick={() => startGame(2)} variant="outline" className="h-56 flex flex-col items-center justify-center gap-4 border-2 border-white/5 bg-slate-900/50 hover:bg-red-600 hover:border-red-500 text-white transition-all group hover:-translate-y-2">
                            <div className="flex -space-x-3">
                                <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center border-2 border-slate-900 text-xs font-bold">A</div>
                                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center border-2 border-slate-900 text-xs font-bold">B</div>
                            </div>
                            <div className="text-center">
                                <span className="block font-black text-xl">2 TAKIM</span>
                                <span className="text-xs font-medium text-slate-500 group-hover:text-red-100 mt-1">A vs B</span>
                            </div>
                        </Button>

                        <Button onClick={() => startGame(3)} variant="outline" className="h-56 flex flex-col items-center justify-center gap-4 border-2 border-white/5 bg-slate-900/50 hover:bg-emerald-600 hover:border-emerald-500 text-white transition-all group hover:-translate-y-2">
                            <div className="flex -space-x-3">
                                <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center border-2 border-slate-900 text-xs font-bold">A</div>
                                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center border-2 border-slate-900 text-xs font-bold">B</div>
                                <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center border-2 border-slate-900 text-xs font-bold">C</div>
                            </div>
                            <div className="text-center">
                                <span className="block font-black text-xl">3 TAKIM</span>
                                <span className="text-xs font-medium text-slate-500 group-hover:text-emerald-100 mt-1">Üçlü Yarış</span>
                            </div>
                        </Button>
                        
                        <Button onClick={() => startGame(4)} variant="outline" className="h-56 flex flex-col items-center justify-center gap-4 border-2 border-white/5 bg-slate-900/50 hover:bg-yellow-600 hover:border-yellow-500 text-white transition-all group hover:-translate-y-2">
                            <Trophy className="h-10 w-10 text-slate-300 group-hover:text-white" />
                            <div className="text-center">
                                <span className="block font-black text-xl">4 TAKIM</span>
                                <span className="text-xs font-medium text-slate-500 group-hover:text-yellow-100 mt-1">Turnuva Modu</span>
                            </div>
                        </Button>
                    </CardContent>
                    
                    <CardFooter className="justify-center py-6 bg-black/20">
                        <Button asChild variant="link" className="text-slate-400 hover:text-white">
                            <Link href={backUrl}><ArrowLeft className="mr-2 h-4 w-4"/> İptal</Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
         )
    }

    if (isLoading) {
        return <div className="flex h-screen items-center justify-center bg-slate-950"><Loader2 className="h-12 w-12 animate-spin text-purple-500" /></div>;
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950">
                <Alert variant="destructive" className="max-w-lg bg-red-950/30 border-red-500/30 text-red-200">
                    <AlertTitle>Hata</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                    <Button asChild variant="outline" className="mt-4 border-red-500/30 text-red-200"><Link href={backUrl}>Geri Dön</Link></Button>
                </Alert>
            </div>
        );
    }
    
    // 2. BİTİŞ EKRANI
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
             <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 overflow-hidden relative">
                <div className="absolute inset-0 bg-[url('/confetti.svg')] opacity-10 bg-repeat animate-slide-up"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-yellow-500/10 rounded-full blur-[150px]"></div>

                <Card className="w-full max-w-2xl bg-slate-900/90 backdrop-blur-xl border-white/10 shadow-2xl relative z-10">
                    <CardHeader className="text-center pb-2 pt-12">
                        <div className="mx-auto w-24 h-24 bg-gradient-to-b from-yellow-300 to-yellow-600 rounded-full p-1 shadow-lg shadow-yellow-500/30 mb-6 animate-bounce">
                            <div className="w-full h-full bg-slate-900 rounded-full flex items-center justify-center">
                                <Trophy className="h-12 w-12 text-yellow-500" />
                            </div>
                        </div>
                        <CardTitle className="font-black text-5xl text-white uppercase tracking-wider mb-2">
                            Şampiyon
                        </CardTitle>
                        <div className={`text-4xl font-bold ${winner.teamConfig?.color || 'text-white'}`}>
                            {winner.name}
                        </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-6 p-8">
                        <div className="space-y-3">
                            {sortedPlayers.map((p, i) => (
                                <div key={p.id} className={cn(
                                    "flex justify-between items-center p-4 rounded-xl border transition-all",
                                    i === 0 ? "bg-gradient-to-r from-yellow-500/20 to-transparent border-yellow-500/30" : "bg-white/5 border-white/5"
                                )}>
                                    <div className="flex items-center gap-4">
                                        <div className={cn("w-8 h-8 rounded-full flex items-center justify-center font-bold", i === 0 ? "bg-yellow-500 text-black" : "bg-slate-800 text-slate-500")}>
                                            {i + 1}
                                        </div>
                                        <span className={cn("font-bold text-lg", p.teamConfig?.color || "text-white")}>{p.name}</span>
                                    </div>
                                    <span className="font-mono font-bold text-2xl text-white">{p.score}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                    
                    <CardFooter className="justify-center gap-4 bg-black/20 p-8">
                         <Button onClick={handleRestart} size="lg" className="bg-white text-black hover:bg-slate-200 font-bold min-w-[150px]">
                             Tekrar Oyna
                         </Button>
                         <Button asChild variant="outline" size="lg" className="border-white/10 text-slate-300 hover:text-white hover:bg-white/5 min-w-[150px]">
                             <Link href={backUrl}>Çıkış</Link>
                         </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    const timerDuration = openedQuestion?.question.type === 'Doğru/Yanlış' ? 10 : 20;
    const activePlayer = players[activePlayerIndex];
    const activeTeamConfig = activePlayer?.teamConfig;

    // 3. OYUN EKRANI
    return (
        <div className={cn(
            "w-full h-full min-h-screen bg-slate-950 font-sans text-slate-100 flex flex-col relative overflow-hidden transition-all",
            isFullscreen ? "p-0" : "p-4"
        )}>
            {/* Arka Plan */}
            <div className="fixed inset-0 pointer-events-none z-0 transition-colors duration-1000">
                {playerCount && playerCount > 1 && activeTeamConfig ? (
                    <>
                        <div className={`absolute top-[-20%] left-1/2 -translate-x-1/2 w-[60vw] h-[60vw] ${activeTeamConfig.bg.replace('/20', '/10')} rounded-full blur-[150px] transition-all duration-1000`} />
                    </>
                ) : (
                    <div className="absolute top-[-20%] left-[-10%] w-[80vw] h-[80vw] bg-indigo-900/10 rounded-full blur-[150px]" />
                )}
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03]" />
            </div>

            <div className="w-full h-full mx-auto relative z-10 flex-grow flex flex-col">
                
                {/* HEADER */}
                <header className="flex justify-between items-center mb-4 gap-4 bg-slate-900/40 backdrop-blur-md p-3 rounded-xl border border-white/5 shadow-lg">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow-lg shadow-purple-500/20">
                            <Package className="h-5 w-5 text-white" />
                        </div>
                        <div>
                             <h1 className="text-xl font-black text-white tracking-tight uppercase">Kutu Aç</h1>
                             <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                <Sparkles className="w-3 h-3 text-yellow-500" />
                                <span>{openedBoxes.size} / {questions.length} Kutu</span>
                             </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 text-xs" onClick={() => setIsFinished(true)}>Bitir</Button>
                        <FullscreenToggle />
                    </div>
                </header>

                 {/* SKOR TABLOSU */}
                <div className="w-full flex justify-center mb-4">
                    {playerCount && playerCount > 1 ? (
                        <div className="flex flex-wrap justify-center gap-4 w-full">
                            {players.map((p, i) => {
                                const isActive = i === activePlayerIndex;
                                const config = p.teamConfig!;
                                return (
                                    <div key={p.id} className={cn("relative overflow-hidden rounded-xl p-3 sm:p-4 border transition-all duration-500 flex flex-col items-center flex-1 min-w-[160px] max-w-[280px]", isActive ? `bg-slate-900 ${config.border} shadow-[0_0_25px_-5px_rgba(0,0,0,0.5)] ${config.shadow} z-10 scale-105` : "bg-slate-900/40 border-white/5 opacity-60 grayscale-[0.5]")}>
                                        {isActive && <div className="absolute -top-1 left-1/2 -translate-x-1/2"><Crown className="w-6 h-6 text-yellow-400 fill-yellow-400 animate-bounce drop-shadow-md" /></div>}
                                        <div className={cn("text-xs sm:text-sm font-black uppercase tracking-widest mb-1 mt-2", config.color)}>{p.name}</div>
                                        <div className={cn("text-3xl sm:text-4xl font-black tabular-nums transition-all", isActive ? "text-white" : "text-slate-500")}>{p.score}</div>
                                        {isActive && <div className={cn("absolute bottom-0 left-0 h-1.5 w-full bg-gradient-to-r", config.from, config.to)}></div>}
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                         <div className="bg-slate-900/60 backdrop-blur-xl border border-purple-500/30 rounded-xl px-12 py-4 text-center shadow-xl flex items-center gap-6">
                            <div><span className="text-slate-400 text-sm font-bold uppercase">Yarışmacı</span><span className="text-purple-300 font-bold text-lg block">{players[0]?.name}</span></div>
                            <div className="w-px h-12 bg-white/10"></div>
                            <div><span className="text-slate-400 text-sm font-bold uppercase">Puan</span><div className="text-5xl font-black text-white">{players[0]?.score || 0}</div></div>
                        </div>
                    )}
                </div>
                
                {/* OYUN ALANI */}
                <div className="flex-grow flex flex-col h-full min-h-0">
                     <Card className="bg-slate-900/60 backdrop-blur-xl border-white/10 shadow-2xl flex-grow flex flex-col overflow-hidden">
                        <CardHeader className="border-b border-white/5 py-3 px-4 flex flex-row items-center justify-between bg-black/20">
                            <CardTitle className="text-sm text-white font-bold flex items-center gap-2"><Target className="h-4 w-4 text-indigo-400"/> Soru Tablosu</CardTitle>
                            {playerCount && playerCount > 1 && <div className={cn("px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-2 animate-pulse", activeTeamConfig?.bg, activeTeamConfig?.border, activeTeamConfig?.color)}><Zap className="w-3 h-3 fill-current" /> Sıra: {activePlayer.name}</div>}
                        </CardHeader>
                        <CardContent className="p-2 sm:p-4 overflow-y-auto flex-grow">
                            <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 sm:gap-3">
                                {questions.map((q, i) => {
                                    const questionNumber = i + 1;
                                    const isOpened = openedBoxes.has(questionNumber);
                                    return (
                                        <button key={i} disabled={isOpened} onClick={() => !isOpened && setOpenedQuestion({ number: questionNumber, question: q })} className={cn("relative group aspect-square rounded-lg flex items-center justify-center text-xl sm:text-2xl font-black transition-all duration-300", isOpened ? "bg-slate-800/50 border border-slate-700/50 text-slate-600 shadow-none scale-95 cursor-default" : "bg-gradient-to-b from-slate-700 to-slate-800 border-b-[4px] border-slate-900 text-white shadow-lg hover:-translate-y-0.5 hover:from-indigo-600 hover:to-indigo-700 hover:border-indigo-900 active:border-b-0 active:translate-y-[2px]")}>
                                            {!isOpened && <div className="absolute inset-0 rounded-lg bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>}
                                            <span className="relative z-10 drop-shadow-sm">{isOpened ? "✓" : questionNumber}</span>
                                        </button>
                                    )
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </div>
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
                    showCorrectAnswerOnWrong={true}
                />
            )}
        </div>
    );
}

export default function KutuAcOyunPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-950"><Loader2 className="h-12 w-12 animate-spin text-purple-500" /></div>}>
            <KutuAcGame />
        </Suspense>
    )
}
