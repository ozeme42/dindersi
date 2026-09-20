'use client';

import { useState, useEffect, useCallback, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getKutuAcQuestionsAction, submitKutuAcScoreAction } from '../actions';
import type { Question } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Package, Trophy, Crown, Target, Sparkles, MonitorPlay, Zap, XOctagon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { FullscreenToggle } from '@/components/fullscreen-toggle';
import { useAuth } from '@/context/auth-context';
import { QuestionDialog } from '@/components/question-dialog';
import { GameEndScreen } from '@/components/game-end-screen';
import { WordwallShell, useWordwall } from '@/components/wordwall/wordwall-shell';
import { getGameBackUrl } from '@/lib/game-navigation';
import { playSound } from '@/lib/audio-service';

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
    const mainContentRef = useRef<HTMLDivElement>(null);

    const backUrl = getGameBackUrl({ user, searchParams, defaultBackUrl: '/oyunlar/kutu-ac' }); 

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
            // --- TÜM SORULARI AL ---
            // Herhangi bir .slice() veya limit koymuyoruz.
            // Sadece karıştırıp (shuffle) state'e atıyoruz.
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
                score: 0,
                teamConfig: TEAMS[0] 
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
        const totalScore = players[0]?.score || 0;
        if (isSubmitting || totalScore <= 0 || isScoreSaved || (playerCount && playerCount > 1)) {
            router.push(backUrl);
            return;
        }

        setIsSubmitting(true);
        const result = await submitKutuAcScoreAction(user!.uid, totalScore, gameContext);
        if (result.success) {
            toast({ title: "Başarılı", description: "Puanınız kaydedildi." });
            setIsScoreSaved(true);
            router.push(backUrl);
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
                     <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-400 via-pink-500 to-red-500" />
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
    const activeTeamConfig = activePlayer?.teamConfig || TEAMS[0];

function KutuAcBoxesBoard({
    questions,
    openedBoxes,
    onOpenBox,
    players,
    activePlayerIndex,
    playerCount,
}: {
    questions: Question[];
    openedBoxes: Set<number>;
    onOpenBox: (num: number, q: Question) => void;
    players: Player[];
    activePlayerIndex: number;
    playerCount: number | null;
}) {
    const { theme, soundEnabled } = useWordwall();
    const activePlayer = players[activePlayerIndex];
    const activeTeamConfig = activePlayer?.teamConfig || TEAMS[0];
    const totalBoxes = questions.length;
    const [isLandscape, setIsLandscape] = useState(true);

    useEffect(() => {
        const updateOrientation = () => {
            if (typeof window !== 'undefined') {
                setIsLandscape(window.innerWidth >= 640 || window.innerWidth > window.innerHeight);
            }
        };
        updateOrientation();
        window.addEventListener('resize', updateOrientation);
        return () => window.removeEventListener('resize', updateOrientation);
    }, []);

    // Akıllı tahta ve mobilde ekranı TAM DOLDURACAK ve ASLA taşmayacak satır/sütun hesabı
    const getGridDimensions = () => {
        if (isLandscape) {
            if (totalBoxes <= 6) return { cols: 3, rows: 2 };
            if (totalBoxes <= 8) return { cols: 4, rows: 2 };
            if (totalBoxes <= 10) return { cols: 5, rows: 2 };
            if (totalBoxes <= 12) return { cols: 4, rows: 3 };
            if (totalBoxes <= 15) return { cols: 5, rows: 3 };
            if (totalBoxes <= 16) return { cols: 4, rows: 4 };
            if (totalBoxes <= 20) return { cols: 5, rows: 4 };
            if (totalBoxes <= 24) return { cols: 6, rows: 4 };
            if (totalBoxes <= 30) return { cols: 6, rows: 5 };
            return { cols: 8, rows: Math.ceil(totalBoxes / 8) };
        } else {
            if (totalBoxes <= 6) return { cols: 2, rows: 3 };
            if (totalBoxes <= 8) return { cols: 2, rows: 4 };
            if (totalBoxes <= 10) return { cols: 2, rows: 5 };
            if (totalBoxes <= 12) return { cols: 3, rows: 4 };
            if (totalBoxes <= 15) return { cols: 3, rows: 5 };
            if (totalBoxes <= 16) return { cols: 4, rows: 4 };
            if (totalBoxes <= 20) return { cols: 4, rows: 5 };
            return { cols: 4, rows: Math.ceil(totalBoxes / 4) };
        }
    };

    const { cols, rows } = getGridDimensions();

    const gridInlineStyle: React.CSSProperties = {
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
        gap: isLandscape ? 'clamp(6px, 1vw, 14px)' : '6px',
        width: '100%',
        height: '100%',
        minHeight: 0,
        minWidth: 0,
    };

    return (
        <div className="w-full h-full min-h-0 min-w-0 flex-1 flex flex-col justify-between overflow-hidden">
            {/* KUTU IZGARASI (WORDWALL 3D MYSTERY BOXES - TAM EKRAN) */}
            <div className={cn(
                "w-full h-full min-h-0 min-w-0 rounded-2xl sm:rounded-3xl p-2 sm:p-3 md:p-4 border-2 backdrop-blur-xl shadow-2xl transition-all flex flex-col justify-between overflow-hidden",
                theme.cardBg,
                theme.cardBorder,
                theme.cardShadow
            )}>
                <div className={cn("flex-shrink-0 flex items-center justify-between gap-2 mb-1.5 sm:mb-2 pb-1.5 sm:pb-2 border-b", theme.cardDivider)}>
                    <span className={cn("text-xs sm:text-sm font-black uppercase tracking-wider flex items-center gap-2", theme.accentText)}>
                        <Package className="w-4 h-4" />
                        <span>Kutular ({openedBoxes.size} / {questions.length} Açıldı)</span>
                    </span>
                    {playerCount && playerCount > 1 && activeTeamConfig && (
                        <div className={cn("px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 animate-pulse", activeTeamConfig.bg, activeTeamConfig.border, activeTeamConfig.color)}>
                            <Zap className="w-3 h-3 fill-current" />
                            <span>Sıra: {activePlayer.name}</span>
                        </div>
                    )}
                </div>

                <div style={gridInlineStyle}>
                    {questions.map((q, i) => {
                        const questionNumber = i + 1;
                        const isOpened = openedBoxes.has(questionNumber);
                        return (
                            <button 
                                key={i}
                                type="button"
                                disabled={isOpened}
                                onClick={() => {
                                    if (!isOpened) {
                                        if (soundEnabled) playSound('pop');
                                        onOpenBox(questionNumber, q);
                                    }
                                }}
                                className={cn(
                                    "relative group w-full h-full min-h-0 min-w-0 rounded-xl sm:rounded-2xl flex items-center justify-center font-black transition-all select-none cursor-pointer",
                                    "border-2 border-b-[5px] sm:border-b-[7px] active:translate-y-1 active:border-b-2 shadow-lg",
                                    theme.buttonBase,
                                    isOpened 
                                        ? cn("opacity-40 grayscale scale-95 border-b-2 cursor-default", theme.buttonDisabled) 
                                        : cn(theme.buttonIdle, "hover:-translate-y-0.5 shadow-lg hover:brightness-105 active:scale-95")
                                )}
                            >
                                <span 
                                    style={{ fontSize: 'clamp(18px, 3vw, 42px)' }}
                                    className={cn("relative z-10 font-mono font-black", theme.isDark && "drop-shadow-md")}
                                >
                                    {isOpened ? "✓" : questionNumber}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

    return (
        <WordwallShell
            title="Kutu Açmaca"
            subtitle={searchParams.get('topicName') || 'Ders Soruları'}
            currentQuestionIndex={openedBoxes.size}
            totalQuestions={questions.length}
            score={players[0]?.score || 0}
            backUrl={backUrl}
            isFinished={isFinished}
            fitToScreen={true}
            contentClassName="w-full h-full min-h-0 overflow-hidden p-1.5 sm:p-2.5 md:p-3"
        >
            <KutuAcBoxesBoard
                questions={questions}
                openedBoxes={openedBoxes}
                onOpenBox={(num, q) => setOpenedQuestion({ number: num, question: q })}
                players={players}
                activePlayerIndex={activePlayerIndex}
                playerCount={playerCount}
            />

            {/* SORU PENCERESİ */}
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
        </WordwallShell>
    );
}

export default function KutuAcOyunPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-950"><Loader2 className="h-12 w-12 animate-spin text-purple-500" /></div>}>
            <KutuAcGame />
        </Suspense>
    )
}