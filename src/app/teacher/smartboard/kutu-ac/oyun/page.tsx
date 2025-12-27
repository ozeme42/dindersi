'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getKutuAcQuestionsAction, submitKutuAcScoreAction } from '@/app/oyunlar/kutu-ac/actions';
import type { Question } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Package, Trophy, Crown, Target, CheckCheck, Sparkles, Users, User, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { FullscreenToggle } from '@/components/fullscreen-toggle';
import { useAuth } from '@/context/auth-context';
import { QuestionDialog } from '@/components/question-dialog';
import { GameEndScreen } from '@/components/game-end-screen';
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from 'framer-motion';

// --- Yardımcı Animasyon Varyantları ---
const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
};

// --- Logic ---
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
            const playerNamesParam = searchParams.get('players');
            const playerNames = playerNamesParam ? playerNamesParam.split(',') : [];
            if(playerNames.length > 0) {
                playerNames.forEach((name, index) => {
                    newPlayers.push({ id: index + 1, name: name, score: 0 });
                });
            } else {
                for (let i = 1; i <= count; i++) {
                    newPlayers.push({ id: i, name: `Oyuncu ${i}`, score: 0 });
                }
            }
        }
        setPlayers(newPlayers);
        fetchQuestions();
    };
    
    useEffect(() => {
        const teamCountParam = searchParams.get('teamCount');
        if(teamCountParam) {
            startGame(parseInt(teamCountParam, 10));
        }
    }, [searchParams]);

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
        setPlayerCount(null);
        const teamCountParam = searchParams.get('teamCount');
        if (teamCountParam) {
            startGame(parseInt(teamCountParam, 10));
        }
    };

    // --- Modern Background Component ---
    const AnimatedBackground = () => (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
            <div className="absolute top-[-20%] left-[-10%] w-[80vw] h-[80vw] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse duration-[10s]" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] bg-fuchsia-600/20 rounded-full blur-[120px] animate-pulse delay-1000 duration-[15s]" />
            <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.05] bg-repeat" />
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950/50 via-slate-950/80 to-slate-950" />
        </div>
    );

    // --- Loading Screen ---
    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-slate-950 relative overflow-hidden">
                <AnimatedBackground />
                <div className="z-10 flex flex-col items-center gap-4">
                    <div className="relative">
                        <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-50 animate-pulse"></div>
                        <Loader2 className="h-16 w-16 animate-spin text-indigo-400 relative z-10" />
                    </div>
                    <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 to-purple-300 animate-pulse">
                        Kutular Hazırlanıyor...
                    </span>
                </div>
            </div>
        );
    }

    // --- Error Screen ---
    if (error) {
        return (
            <div className="w-full h-full min-h-screen flex items-center justify-center p-4 bg-slate-950 relative">
                <AnimatedBackground />
                <Alert variant="destructive" className="max-w-lg bg-red-950/40 backdrop-blur-md border-red-500/30 text-red-200 shadow-2xl z-10">
                    <AlertTitle className="text-2xl font-bold flex items-center gap-2">
                        <Zap className="h-6 w-6"/> Hata!
                    </AlertTitle>
                    <AlertDescription className="text-lg mt-2">{error}</AlertDescription>
                    <div className="mt-6">
                        <Button asChild variant="outline" className="border-white/10 text-white hover:bg-white/10 w-full h-12 text-lg">
                            <Link href={backUrl}><ArrowLeft className="mr-2 h-5 w-5"/>Geri Dön</Link>
                        </Button>
                    </div>
                </Alert>
            </div>
        );
    }

    // --- Setup Screen ---
    if (playerCount === null) {
        const modeOptions = [
            { 
                count: 1, 
                label: "Tek Kişilik", 
                sub: "Kendini Dene", 
                icon: User, 
                // Tailwind'in okuyabilmesi için tam sınıf isimleri
                className: "hover:bg-slate-800/60 hover:border-indigo-500/50 hover:shadow-[0_0_30px_rgba(99,102,241,0.2)]",
                iconClass: "text-indigo-400 group-hover:text-indigo-300",
                subClass: "group-hover:text-indigo-300"
            },
            { 
                count: 2, 
                label: "VS Modu", 
                sub: "Düello Zamanı", 
                icon: Users, 
                className: "hover:bg-slate-800/60 hover:border-blue-500/50 hover:shadow-[0_0_30px_rgba(59,130,246,0.2)]",
                iconClass: "text-blue-400 group-hover:text-blue-300",
                subClass: "group-hover:text-blue-300"
            },
            { 
                count: 3, 
                label: "Yarışma", 
                sub: "Rekabet Kızışıyor", 
                icon: Trophy, 
                className: "hover:bg-slate-800/60 hover:border-emerald-500/50 hover:shadow-[0_0_30px_rgba(16,185,129,0.2)]",
                iconClass: "text-emerald-400 group-hover:text-emerald-300",
                subClass: "group-hover:text-emerald-300"
            },
            { 
                count: 4, 
                label: "Parti Modu", 
                sub: "Kalabalık Eğlence", 
                icon: Sparkles, 
                className: "hover:bg-slate-800/60 hover:border-fuchsia-500/50 hover:shadow-[0_0_30px_rgba(217,70,239,0.2)]",
                iconClass: "text-fuchsia-400 group-hover:text-fuchsia-300",
                subClass: "group-hover:text-fuchsia-300"
            }
        ];

         return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
                <AnimatedBackground />
                
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-5xl z-10"
                >
                    <div className="text-center mb-12 space-y-4">
                        <motion.div 
                            initial={{ y: -20 }} animate={{ y: 0 }}
                            className="inline-flex p-4 bg-indigo-500/10 rounded-3xl border border-indigo-500/20 backdrop-blur-xl shadow-[0_0_30px_rgba(99,102,241,0.2)] mb-4"
                        >
                            <Package className="h-16 w-16 text-indigo-400 drop-shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                        </motion.div>
                        <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-indigo-100 to-indigo-900 tracking-tighter drop-shadow-2xl">
                            KUTU AÇ
                        </h1>
                        <p className="text-slate-400 text-xl font-medium tracking-wide">Maceraya kaç kişi katılacak?</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 px-4">
                        {modeOptions.map((mode, idx) => (
                            <motion.button
                                key={mode.count}
                                whileHover={{ scale: 1.05, y: -5 }}
                                whileTap={{ scale: 0.95 }}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                onClick={() => startGame(mode.count)}
                                className={cn(
                                    "relative group overflow-hidden rounded-3xl border border-white/5 bg-slate-900/40 backdrop-blur-md p-8",
                                    "flex flex-col items-center gap-4 text-center transition-all duration-300",
                                    mode.className
                                )}
                            >
                                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <mode.icon className={cn("h-12 w-12 transition-transform duration-300 group-hover:scale-110", mode.iconClass)} />
                                <div className="relative z-10">
                                    <h3 className="text-2xl font-bold text-white mb-1">{mode.label}</h3>
                                    <p className={cn("text-sm font-medium text-slate-500", mode.subClass)}>{mode.sub}</p>
                                </div>
                            </motion.button>
                        ))}
                    </div>

                    <div className="mt-12 text-center">
                        <Button asChild variant="ghost" className="text-slate-500 hover:text-white hover:bg-white/5 rounded-full px-8">
                            <Link href={backUrl}><ArrowLeft className="mr-2 h-4 w-4"/> İptal Et ve Çık</Link>
                        </Button>
                    </div>
                </motion.div>
            </div>
         )
    }

    // --- Game Over Screen ---
    if (isFinished) {
        const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
        const winner = sortedPlayers[0];

        if (playerCount === 1) {
            return (
                <div className="relative min-h-screen bg-slate-950 flex flex-col justify-center">
                     <AnimatedBackground />
                     <div className="z-10">
                        <GameEndScreen
                            score={players[0].score}
                            onSave={handleSaveAndExit}
                            isSaving={isSubmitting}
                            scoreSaved={isScoreSaved}
                            onRestart={handleRestart}
                            backUrl={backUrl}
                        />
                     </div>
                </div>
            )
        }

        // Multiplayer Result
        return (
             <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
                <AnimatedBackground />
                <div className="absolute inset-0 bg-black/40 z-0" />

                <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-full max-w-3xl bg-slate-900/60 backdrop-blur-2xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-3xl relative z-10 overflow-hidden"
                >
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
                    
                    <div className="p-12 text-center">
                        <motion.div 
                            initial={{ y: -50, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className="inline-flex p-6 bg-yellow-500/20 rounded-full border border-yellow-500/40 shadow-[0_0_30px_rgba(234,179,8,0.3)] mb-8"
                        >
                            <Trophy className="h-20 w-20 text-yellow-400 drop-shadow-lg" />
                        </motion.div>
                        
                        <h2 className="text-6xl font-black text-white uppercase tracking-tighter mb-2">Oyun Bitti!</h2>
                        
                        {winner ? (
                            <div className="mb-10">
                                <p className="text-slate-400 font-bold tracking-widest uppercase text-sm mb-2">KAZANAN</p>
                                <p className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-400 to-yellow-600 drop-shadow-sm">
                                    {winner.name}
                                </p>
                            </div>
                        ) : (
                            <p className="text-4xl font-black text-slate-300 mb-10">BERABERE!</p>
                        )}

                        <div className="bg-black/30 rounded-2xl p-6 mb-8 border border-white/5">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Puan Durumu</h4>
                            <div className="space-y-3">
                                {sortedPlayers.map((p, i) => (
                                    <div key={p.id} className="flex justify-between items-center p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <span className={cn(
                                                "font-black text-xl w-8 h-8 flex items-center justify-center rounded-lg", 
                                                i === 0 ? "bg-yellow-500 text-black" : "bg-slate-800 text-slate-500"
                                            )}>{i + 1}</span>
                                            <span className="font-bold text-lg text-white">{p.name}</span>
                                        </div>
                                        <span className="font-mono font-bold text-2xl text-indigo-400">{p.score}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row justify-center gap-4">
                             <Button onClick={handleRestart} size="lg" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-14 px-8 rounded-xl shadow-lg shadow-indigo-900/40 text-lg">
                                 <Zap className="mr-2 h-5 w-5" /> Tekrar Oyna
                             </Button>
                             <Button asChild variant="outline" size="lg" className="border-white/10 text-slate-300 hover:text-white hover:bg-white/5 bg-transparent h-14 px-8 rounded-xl text-lg">
                                 <Link href={backUrl}><ArrowLeft className="mr-2 h-5 w-5" /> Çıkış</Link>
                             </Button>
                        </div>
                    </div>
                </motion.div>
            </div>
        );
    }

    const timerDuration = openedQuestion?.question.type === 'Doğru/Yanlış' ? 10 : 20;

    // --- MAIN GAME UI ---
    return (
        <div className={cn(
            "w-full h-full min-h-screen bg-slate-950 font-sans text-slate-100 flex flex-col relative overflow-hidden transition-all duration-500",
            isFullscreen ? "p-4" : "p-4 sm:p-6 md:p-8"
        )}>
            <AnimatedBackground />

            {/* Header Area */}
            <div className="w-full max-w-7xl mx-auto relative z-10 flex-grow flex flex-col">
                <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 bg-slate-900/40 backdrop-blur-md p-4 rounded-2xl border border-white/5 shadow-lg">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="p-3 bg-indigo-500/20 rounded-xl border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                            <Package className="h-6 w-6 text-indigo-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-white tracking-tight uppercase">Kutu Aç</h1>
                            <div className="flex items-center gap-2">
                                <div className="h-2 w-24 bg-slate-800 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-1000" 
                                        style={{ width: `${(openedBoxes.size / questions.length) * 100}%` }}
                                    />
                                </div>
                                <p className="text-xs text-slate-400 font-mono font-medium">{openedBoxes.size} / {questions.length}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                        <Button variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-950/30" size="sm" onClick={() => setIsFinished(true)}>
                            Oyunu Bitir
                        </Button>
                        <div className="h-6 w-px bg-white/10" />
                        <FullscreenToggle />
                    </div>
                </header>
                
                {/* Scoreboard Area - Modern Floating Cards */}
                <div className="mb-8">
                    {playerCount && playerCount > 1 ? (
                        <div className={cn("grid gap-4 md:gap-6", `grid-cols-2 md:grid-cols-${Math.min(playerCount, 4)}`)}>
                            <AnimatePresence>
                            {players.map((p, i) => (
                                <motion.div 
                                    key={p.id}
                                    layout
                                    animate={{ 
                                        scale: i === activePlayerIndex ? 1.05 : 1,
                                        opacity: i === activePlayerIndex ? 1 : 0.7,
                                        y: i === activePlayerIndex ? -5 : 0
                                    }}
                                    className={cn(
                                        "relative p-4 rounded-2xl border transition-all duration-500 overflow-hidden",
                                        i === activePlayerIndex 
                                            ? "bg-gradient-to-br from-indigo-900/80 to-purple-900/80 border-indigo-400/50 shadow-[0_0_20px_rgba(99,102,241,0.3)] ring-1 ring-indigo-400/30" 
                                            : "bg-slate-900/40 border-white/5"
                                    )}
                                >
                                    {/* Active Player Background Effect */}
                                    {i === activePlayerIndex && (
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-[shimmer_2s_infinite] skew-x-12" />
                                    )}

                                    <div className="relative z-10 flex flex-col items-center">
                                        <div className="flex items-center gap-2 mb-2">
                                            {i === activePlayerIndex && <Crown className="h-4 w-4 text-yellow-400 drop-shadow-md animate-bounce" />}
                                            <span className={cn("text-sm font-bold uppercase tracking-wider", i === activePlayerIndex ? "text-white" : "text-slate-400")}>{p.name}</span>
                                        </div>
                                        <span className={cn("text-4xl md:text-5xl font-black tabular-nums tracking-tight", i === activePlayerIndex ? "text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]" : "text-slate-500")}>
                                            {p.score}
                                        </span>
                                    </div>
                                </motion.div>
                            ))}
                            </AnimatePresence>
                        </div>
                    ) : (
                         <div className="flex justify-center">
                            <motion.div 
                                initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                                className="bg-slate-900/80 backdrop-blur-xl px-10 py-4 rounded-3xl border border-white/10 shadow-2xl flex items-center gap-6 relative overflow-hidden group"
                            >
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50" />
                                <div className="flex flex-col items-end">
                                    <span className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em]">SKOR</span>
                                    <span className="text-5xl font-black text-white tabular-nums tracking-tighter drop-shadow-lg">{players[0]?.score || 0}</span>
                                </div>
                                <div className="h-12 w-px bg-white/10" />
                                <Trophy className="h-8 w-8 text-yellow-500/80" />
                            </motion.div>
                        </div>
                    )}
                </div>

                {/* Game Board - The Grid */}
                <div className="flex-grow flex flex-col">
                     <div className="flex items-center justify-between mb-4 px-2">
                         <div className="flex items-center gap-3">
                             <div className="bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                                 <Target className="h-5 w-5 text-emerald-400"/>
                             </div>
                             <h3 className="text-xl font-bold text-white">Soru Seçimi</h3>
                         </div>
                         {playerCount && playerCount > 1 && (
                            <Badge variant="outline" className="bg-indigo-500/10 text-indigo-300 border-indigo-500/30 px-4 py-1.5 text-sm animate-pulse shadow-[0_0_10px_rgba(99,102,241,0.2)]">
                                Sıra: <span className="font-bold ml-1 text-white">{players[activePlayerIndex]?.name}</span>
                            </Badge>
                         )}
                     </div>

                    <motion.div 
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-2xl rounded-3xl p-6 md:p-8 flex-grow overflow-hidden"
                    >
                        <div className="h-full overflow-y-auto pr-2 custom-scrollbar">
                            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3 md:gap-4 pb-12">
                                {questions.map((q, i) => {
                                    const questionNumber = i + 1;
                                    const isOpened = openedBoxes.has(questionNumber);
                                    
                                    return (
                                        <motion.button
                                            key={i}
                                            variants={itemVariants}
                                            whileHover={!isOpened ? { scale: 1.05, y: -5, boxShadow: "0 10px 30px -10px rgba(99,102,241,0.5)" } : {}}
                                            whileTap={!isOpened ? { scale: 0.95 } : {}}
                                            onClick={() => !isOpened && setOpenedQuestion({ number: questionNumber, question: q })}
                                            className={cn(
                                                "aspect-[4/3] sm:aspect-square rounded-xl flex items-center justify-center relative overflow-hidden transition-all duration-300 group outline-none focus:ring-2 focus:ring-indigo-400/50 focus:ring-offset-2 focus:ring-offset-slate-900",
                                                isOpened 
                                                    ? "bg-slate-900/50 border border-slate-800/50 cursor-default opacity-40 grayscale" 
                                                    : "bg-gradient-to-br from-indigo-600 to-violet-700 border-t border-l border-white/20 shadow-lg cursor-pointer"
                                            )}
                                        >
                                            {/* Card Shine Effect */}
                                            {!isOpened && <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />}
                                            
                                            {/* Bottom Glow */}
                                            {!isOpened && <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/50 to-transparent" />}

                                            {isOpened ? (
                                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                                                    <CheckCheck className="h-8 w-8 text-emerald-500" />
                                                </motion.div>
                                            ) : (
                                                <span className="text-2xl md:text-3xl font-black text-white drop-shadow-md z-10 group-hover:scale-110 transition-transform">
                                                    {questionNumber}
                                                </span>
                                            )}
                                        </motion.button>
                                    )
                                })}
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
            
            {openedQuestion && (
                <QuestionDialog
                    isOpen={!!openedQuestion}
                    onClose={() => {
                        setOpenedQuestion(null);
                        // Sadece multiplayer modunda sırayı kapatınca değiştir (cevap verilmediyse)
                        if (playerCount && playerCount > 1) {
                            setActivePlayerIndex(prev => (prev + 1) % playerCount);
                        }
                    }}
                    questionData={openedQuestion}
                    onAnswer={handleAnswerQuestion}
                    timerDuration={timerDuration}
                    pointsConfig={{ default: { points: 10 }}}
                    penaltyConfig={{ default: { penalty: 0 }}}
                    showCorrectAnswerOnWrong={true}
                    isFullscreen={isFullscreen}
                />
            )}
        </div>
    );
}

export default function SmartboardKutuAcOyunPage() {
    return (
        <Suspense fallback={
            <div className="flex h-screen items-center justify-center bg-slate-950">
                <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
            </div>
        }>
            <KutuAcGame/>
        </Suspense>
    )
}