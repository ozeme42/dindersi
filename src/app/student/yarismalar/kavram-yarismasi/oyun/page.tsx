
'use client';

import { useState, useEffect, Suspense, useMemo, useRef, useCallback } from "react";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { submitConceptQuizScoreAction, getConceptQuizAction } from '../actions';
import type { ConceptQuizQuestion } from '../actions';
import { Loader2, ArrowLeft, Timer, User, Users, Trophy, CheckCircle2, Lock, ArrowRight, Home, Repeat, XOctagon, Zap } from "lucide-react";
import { useSearchParams, useRouter } from 'next/navigation';
import { cn } from "@/lib/utils";
import { playSound, stopSound } from '@/lib/audio-service';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Confetti from 'react-dom-confetti';

function KavramYarismaGame() {
    const { user } = useAuth();
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const router = useRouter();

    // --- STATE ---
    const [gameState, setGameState] = useState<'loading' | 'error' | 'mode-select' | 'playing' | 'end'>('loading');
    const [gameMode, setGameMode] = useState<'single' | 'team' | null>(null);
    const [currentQIndex, setCurrentQIndex] = useState(0);

    const [scoreLeft, setScoreLeft] = useState(0);
    const [scoreRight, setScoreRight] = useState(0);

    const [leftLocked, setLeftLocked] = useState(false);
    const [rightLocked, setRightLocked] = useState(false);
    const [showNextButton, setShowNextButton] = useState(false);

    const [timeLeft, setTimeLeft] = useState(15);
    const [scoreDelta, setScoreDelta] = useState<string | null>(null);
    
    const [leftSelection, setLeftSelection] = useState<string | null>(null);
    const [rightSelection, setRightSelection] = useState<string | null>(null);

    const [correctCard, setCorrectCard] = useState<string | null>(null);
    const [winner, setWinner] = useState<'left' | 'right' | null>(null);

    const [isSaving, setIsSaving] = useState(false);
    const [scoreSaved, setScoreSaved] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);

    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const [questions, setQuestions] = useState<ConceptQuizQuestion[]>([]);
    const [error, setError] = useState<string | null>(null);

    const gameContext = `Kavram Yarışması (${gameMode === 'team' ? 'VS' : 'Tekli'}) - ${searchParams.get('topicName') || 'Genel'}`;

    // O anki potansiyel puan (Saniye x 5, minimum 5 puan)
    const currentPotentialScore = Math.max(5, timeLeft * 5);

    // --- VERİ ÇEKME ---
    const fetchGameData = useCallback(async () => {
        setGameState('loading');
        const params = {
            courseId: searchParams.get('courseId') || undefined,
            unitId: searchParams.get('unitId') || undefined,
            topicId: searchParams.get('topicId') || undefined,
        };

        if (!params.topicId) {
             setError("Geçerli bir konu ID'si gerekli.");
             setGameState('error');
             return;
        }

        const { questions: fetchedQuestions, error: fetchError } = await getConceptQuizAction(params);
        
        if (fetchError || !fetchedQuestions || fetchedQuestions.length === 0) {
            setError(fetchError || "Sorular yüklenemedi.");
            setGameState('error');
        } else {
            const shuffled = [...fetchedQuestions].sort(() => Math.random() - 0.5);
            setQuestions(shuffled);
            setGameState('mode-select');
        }
    }, [searchParams]);

    useEffect(() => {
        fetchGameData();
    }, [fetchGameData]);

    const currentQ = questions[currentQIndex];

    const startGame = useCallback((mode: 'single' | 'team') => {
        setGameMode(mode);
        setCurrentQIndex(0);
        setScoreLeft(0);
        setScoreRight(0);
        setScoreSaved(false);
        setGameState('playing');
        resetTurn();
    }, []);

    const resetTurn = useCallback(() => {
        setTimeLeft(15);
        setLeftLocked(false);
        setRightLocked(false);
        setLeftSelection(null);
        setRightSelection(null);
        setCorrectCard(null);
        setWinner(null);
        setShowNextButton(false);
        setShowConfetti(false);
        setScoreDelta(null);

        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    handleTimeUp();
                    return 0;
                }
                if (prev <= 6 && prev > 1) playSound('timer');
                return prev - 1;
            });
        }, 1000);
    }, []);

    const handleTimeUp = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        stopSound('timer');
        playSound('incorrect');
        
        setLeftLocked(true);
        setRightLocked(true);
        setShowNextButton(true);
        setScoreDelta('Süre Bitti');

        setCorrectCard(questions[currentQIndex]?.correctAnswer || null);

    }, [currentQIndex, questions]);


    const handleAnswer = (side: 'left' | 'right' | 'single', answer: string) => {
        if (showNextButton || !currentQ) return;
        
        if ((side === 'left' || side === 'single') && leftLocked) return;
        if (side === 'right' && rightLocked) return;

        if (side === 'left' || side === 'single') setLeftSelection(answer);
        else setRightSelection(answer);

        if (answer === currentQ.correctAnswer) {
            // --- DOĞRU CEVAP ---
            if (timerRef.current) clearInterval(timerRef.current);
            stopSound('timer');
            playSound('correct');
            
            // Puanlama (x5)
            const points = currentPotentialScore;
            
            if (side === 'left' || side === 'single') {
                setScoreLeft(prev => prev + points);
                setWinner('left');
                if (side === 'single') setScoreDelta(`+${points}`);
            } else {
                setScoreRight(prev => prev + points);
                setWinner('right');
            }

            setCorrectCard(answer);
            setShowNextButton(true);
            setShowConfetti(true);
            setTimeout(() => setShowConfetti(false), 2000);

        } else {
            // --- YANLIŞ CEVAP ---
            playSound('incorrect');
            const zoneId = side === 'right' ? 'p2-zone' : 'p1-zone';
            document.getElementById(zoneId)?.classList.add('shake');
            setTimeout(() => document.getElementById(zoneId)?.classList.remove('shake'), 500);
            
            if (side === 'single') {
                const penalty = 20;
                setScoreLeft(prev => Math.max(0, prev - penalty));
                setScoreDelta(`-${penalty}`);
                setTimeout(() => setScoreDelta(null), 1500);
                
                setLeftLocked(true);
                finalizeRoundFail();
            } else if (side === 'left') {
                setLeftLocked(true);
                if (rightLocked) finalizeRoundFail();
            } else {
                setRightLocked(true);
                if (leftLocked) finalizeRoundFail();
            }
        }
    };

    const finalizeRoundFail = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        stopSound('timer');
        setCorrectCard(questions[currentQIndex]?.correctAnswer);
        setShowNextButton(true);
    };

    const nextQuestion = () => {
        if (currentQIndex + 1 < questions.length) {
            setCurrentQIndex(prev => prev + 1);
            resetTurn();
        } else {
            endGame();
        }
    };

    const endGame = () => {
        if(timerRef.current) clearInterval(timerRef.current);
        stopSound('timer');
        if (currentQIndex + 1 >= questions.length) playSound('win'); 
        setGameState('end');
    };

    const resetGame = () => {
        setQuestions(prev => [...prev].sort(() => Math.random() - 0.5));
        setGameState('mode-select');
    };

    const handleSaveAndExit = async () => {
        if(timerRef.current) clearInterval(timerRef.current);
        const totalScore = scoreLeft;
        
        if (!user || scoreSaved || isSaving) {
            if (scoreSaved) return;
            if(totalScore === 0) {
                 router.push('/oyunlar/kavram-yarismasi');
                 return;
            }
        }
        
        setIsSaving(true);
        const result = await submitConceptQuizScoreAction(user.uid, totalScore, gameContext);
        if (result.success) {
            setScoreSaved(true);
            toast({ title: 'Başarılı!', description: `${totalScore} puan profiline eklendi.` });
            router.push('/oyunlar/kavram-yarismasi');
        } else {
            toast({ title: 'Hata', description: result.error, variant: 'destructive' });
        }
        setIsSaving(false);
    };

    // --- BİLEŞENLER ---

    const OptionButton = ({ player, option }: { player: 'left' | 'right' | 'single', option: string }) => {
        const isSingle = player === 'single';
        const isLeft = player === 'left';
        
        let baseClass = "";
        if (isSingle) {
             baseClass = 'bg-indigo-100 text-indigo-900 hover:bg-indigo-50 border-b-4 border-indigo-300 active:border-b-0 active:translate-y-1';
        } else if (isLeft) {
             baseClass = 'bg-blue-100 text-blue-900 hover:bg-blue-50 border-b-4 border-blue-300 active:border-b-0 active:translate-y-1';
        } else {
             baseClass = 'bg-red-100 text-red-900 hover:bg-red-50 border-b-4 border-red-300 active:border-b-0 active:translate-y-1';
        }

        const isCorrect = correctCard === option;
        let dynamicClass = baseClass;
        
        if(showNextButton && isCorrect) {
            dynamicClass = 'bg-green-500 text-white border-green-700 correct-blink';
        }

        return (
            <button 
                onClick={() => handleAnswer(player, option)} 
                className={`w-full h-full text-lg md:text-2xl font-bold rounded-xl shadow-md transition-all p-2 leading-tight break-words select-none ${dynamicClass}`}
            >
                {option}
            </button>
        );
    }

    if (gameState === 'loading') return <div className="h-screen w-screen flex items-center justify-center bg-slate-950"><Loader2 className="w-16 h-16 animate-spin text-indigo-500" /></div>;
    if (error) return <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-950 text-white"><p className="text-2xl mb-4">{error}</p><Button onClick={() => router.back()}>Geri Dön</Button></div>;

    // --- MOD SEÇİMİ ---
    if (gameState === 'mode-select') {
        return (
            <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
                <div className="absolute inset-0 grid grid-cols-2 opacity-20 pointer-events-none">
                    <div className="bg-gradient-to-br from-indigo-500 to-transparent"></div>
                    <div className="bg-gradient-to-bl from-rose-500 to-transparent"></div>
                </div>

                <div className="relative z-10 w-full max-w-4xl text-center space-y-8 animate-in zoom-in-95 duration-500">
                    <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-rose-400 drop-shadow-lg">
                        KAVRAM DÜELLOSU
                    </h1>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 mt-4">
                        <button 
                            onClick={() => startGame('single')}
                            className="group relative bg-slate-900/60 border-2 border-slate-700 hover:border-indigo-500 rounded-3xl p-4 md:p-8 transition-all hover:shadow-[0_0_40px_rgba(99,102,241,0.3)] hover:-translate-y-2"
                        >
                            <div className="absolute top-4 right-4 bg-indigo-500/20 text-indigo-300 text-xs font-bold px-3 py-1 rounded-full border border-indigo-500/30">
                                SIRALAMA
                            </div>
                            <div className="bg-indigo-500/10 w-16 h-16 md:w-24 md:h-24 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6 group-hover:scale-110 transition-transform border border-indigo-500/20">
                                <User className="w-8 h-8 md:w-12 md:h-12 text-indigo-400" />
                            </div>
                            <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">Tek Kişilik</h3>
                            <p className="text-slate-400 text-sm md:text-base">Puan topla, yanlış yaparsan puanın düşer.</p>
                        </button>

                        <button 
                            onClick={() => startGame('team')}
                            className="group relative bg-slate-900/60 border-2 border-slate-700 hover:border-rose-500 rounded-3xl p-4 md:p-8 transition-all hover:shadow-[0_0_40px_rgba(244,63,94,0.3)] hover:-translate-y-2"
                        >
                             <div className="absolute top-4 right-4 bg-rose-500/20 text-rose-300 text-xs font-bold px-3 py-1 rounded-full border border-rose-500/30">
                                VS MODU
                            </div>
                            <div className="bg-rose-500/10 w-16 h-16 md:w-24 md:h-24 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6 group-hover:scale-110 transition-transform border border-rose-500/20">
                                <Users className="w-8 h-8 md:w-12 md:h-12 text-rose-400" />
                            </div>
                            <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">Düello (VS)</h3>
                            <p className="text-slate-400 text-sm md:text-base">Arkadaşınla kapış. Puan kaydedilmez.</p>
                        </button>
                    </div>
                    
                    <Button variant="ghost" onClick={() => router.back()} className="text-slate-500 hover:text-white mt-8">
                        <ArrowLeft className="mr-2 h-5 w-5" /> Ana Menüye Dön
                    </Button>
                </div>
            </div>
        )
    }

    // --- OYUN SONU EKRANI ---
    if (gameState === 'end') {
        const isTeam = gameMode === 'team';
        let winnerText = "Oyun Bitti!";
        let winnerDesc = `Toplam Puan: ${scoreLeft}`;
        let WinnerIcon = Trophy;
        let iconColor = "text-yellow-400";

        if (isTeam) {
            if (scoreLeft > scoreRight) {
                winnerText = "MAVİ TAKIM KAZANDI!";
                winnerDesc = "Mavi takımın ezici üstünlüğü!";
                iconColor = "text-blue-400";
            } else if (scoreRight > scoreLeft) {
                winnerText = "KIRMIZI TAKIM KAZANDI!";
                winnerDesc = "Kırmızı takımın zaferi!";
                iconColor = "text-red-400";
            } else {
                winnerText = "BERABERE!";
                winnerDesc = "Dostluk kazandı.";
            }
        }

        return (
             <div className="flex h-screen items-center justify-center p-4 bg-slate-950">
                 <Card className="w-full max-w-lg text-center bg-slate-900 border-white/10 overflow-hidden shadow-2xl animate-in zoom-in-95">
                    <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-rose-600 p-1"></div>
                    <CardHeader className="pb-2">
                        <WinnerIcon className={`h-16 w-16 mx-auto mb-4 drop-shadow-lg ${iconColor}`}/>
                        <CardTitle className="text-3xl md:text-4xl text-white font-black">{winnerText}</CardTitle>
                        <CardDescription className="text-slate-300 text-xl mt-2">{winnerDesc}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
                         <div className="flex justify-center gap-8">
                            <div className="text-center p-4 rounded-2xl bg-slate-800/50 border border-white/5 min-w-[120px]">
                                <p className={`text-sm font-bold mb-1 ${isTeam ? 'text-blue-400' : 'text-indigo-400'}`}>{isTeam ? 'MAVİ' : 'PUAN'}</p>
                                <p className="text-5xl font-black text-white">{scoreLeft}</p>
                            </div>
                            {isTeam && (
                                <div className="text-center p-4 rounded-2xl bg-slate-800/50 border border-white/5 min-w-[120px]">
                                    <p className="text-sm font-bold text-red-400 mb-1">KIRMIZI</p>
                                    <p className="text-5xl font-black text-white">{scoreRight}</p>
                                </div>
                            )}
                         </div>
                    </CardContent>
                    <CardFooter className="flex-col gap-4 p-8 bg-slate-900/50">
                        {!isTeam && (
                             <Button 
                                onClick={handleSaveAndExit} 
                                disabled={isSaving || scoreSaved}
                                size="lg" 
                                className="w-full bg-emerald-600 hover:bg-emerald-500 font-bold text-lg h-14"
                            >
                                {isSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : scoreSaved ? <CheckCircle2 className="w-6 h-6 mr-2" /> : <Trophy className="w-6 h-6 mr-2" />}
                                {scoreSaved ? "Kaydedildi" : "Puanı Kaydet & Çık"}
                            </Button>
                        )}
                        <div className="flex w-full gap-4">
                            <Button onClick={resetGame} variant="outline" size="lg" className="flex-1 border-white/10 text-slate-300 hover:text-white hover:bg-white/5 h-12">
                                <Repeat className="mr-2 h-5 w-5"/> Tekrar
                            </Button>
                            <Button asChild variant="outline" size="lg" className="flex-1 border-white/10 text-slate-300 hover:text-white hover:bg-white/5 h-12">
                                <Link href="/oyunlar/kavram-yarismasi"><Home className="mr-2 h-5 w-5"/> Çıkış</Link>
                            </Button>
                        </div>
                    </CardFooter>
                 </Card>
            </div>
        );
    }

    const GlobalStyles = () => (
        <style jsx global>{`
            body { touch-action: manipulation; user-select: none; overflow: hidden; font-family: 'Segoe UI', sans-serif; }
            .player-zone { transition: background-color 0.3s; }
            .shake { animation: shake 0.5s; }
            @keyframes shake {
                0% { transform: translate(1px, 1px) rotate(0deg); } 10% { transform: translate(-1px, -2px) rotate(-1deg); } 20% { transform: translate(-3px, 0px) rotate(1deg); } 30% { transform: translate(3px, 2px) rotate(0deg); } 40% { transform: translate(1px, -1px) rotate(1deg); } 50% { transform: translate(-1px, 2px) rotate(-1deg); } 60% { transform: translate(-3px, 1px) rotate(0deg); } 100% { transform: translate(1px, -2px) rotate(-1deg); }
            }
            .correct-blink { animation: blinkGreen 0.5s 3; }
            @keyframes blinkGreen { 50% { background-color: #4ade80; color: white; border-color: #15803d; } }
            .animate-fade-in { animation: fadeIn 0.3s ease-in-out; }
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            
            .score-pop-up { animation: popUpFade 1s forwards; }
            @keyframes popUpFade {
                0% { opacity: 0; transform: translateY(10px) scale(0.8); }
                20% { opacity: 1; transform: translateY(0) scale(1.2); }
                100% { opacity: 0; transform: translateY(-30px) scale(1); }
            }
        `}</style>
    );

    return (
        <div className="h-screen w-screen bg-slate-900 text-white flex relative overflow-hidden">
            <GlobalStyles />
            
            <div className="absolute top-4 left-4 z-50 p-3 bg-black/20 hover:bg-black/40 rounded-full backdrop-blur-sm transition-colors border border-white/10 group">
                <button onClick={() => setGameState('mode-select')}>
                    <ArrowLeft className="w-6 h-6 text-white/70 group-hover:text-white" />
                </button>
            </div>

            {/* --- TEK KİŞİLİK MOD --- */}
            {gameMode === 'single' && (
                 <div id="p1-zone" className="w-full h-full bg-slate-900 flex flex-col relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/30 to-purple-900/30 pointer-events-none"></div>

                    <div className="p-4 md:p-6 bg-slate-800/80 backdrop-blur flex justify-between items-center shadow-lg z-10 border-b border-white/10">
                        
                        {/* SOL: Başlık */}
                        <div className="flex items-center gap-3">
                            <div className="bg-indigo-500/20 p-2 rounded-lg hidden md:block"><User className="w-6 h-6 text-indigo-400" /></div>
                            <span className="text-lg md:text-2xl font-bold text-indigo-100 hidden sm:inline">TEK KİŞİLİK</span>
                        </div>

                        {/* ORTA: SÜRE + KAZANILACAK PUAN */}
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 px-4 py-2 bg-slate-900/50 rounded-xl border border-indigo-500/30 min-w-[140px] justify-center">
                                <Timer className={cn("w-5 h-5", timeLeft <= 5 ? "text-rose-500 animate-pulse" : "text-indigo-400")} />
                                <span className={cn("font-mono text-2xl font-bold", timeLeft <= 5 ? "text-rose-500" : "text-white")}>
                                    {timeLeft}
                                </span>
                                {/* Anlık Kazanılacak Puan Göstergesi */}
                                {!leftLocked && !showNextButton && (
                                    <div className="ml-2 px-2 py-0.5 bg-emerald-500/20 rounded text-emerald-400 text-sm font-bold animate-in fade-in">
                                        +{currentPotentialScore}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* SAĞ: Sabit Toplam Skor ve Bitir */}
                        <div className="flex items-center gap-4 relative">
                             {/* Anlık Puan Artış/Azalış Animasyonu (Floating) */}
                             {scoreDelta && (
                                <div className={cn(
                                    "absolute top-8 right-24 text-2xl font-black whitespace-nowrap score-pop-up z-50 pointer-events-none drop-shadow-md",
                                    scoreDelta.startsWith('+') ? "text-emerald-400" : "text-rose-500"
                                )}>
                                    {scoreDelta}
                                </div>
                             )}

                             {/* Sabit Skor Kutusu */}
                             <div className="text-right mr-2 bg-slate-900/50 px-4 py-1 rounded-lg border border-white/10 min-w-[100px]">
                                <span className="block text-[10px] text-indigo-400 font-bold tracking-wider uppercase">Toplam Puan</span>
                                <span className="text-2xl font-black text-white leading-none">{scoreLeft}</span>
                             </div>
                             
                             <Button 
                                onClick={endGame} 
                                size="sm" 
                                variant="destructive"
                                className="bg-rose-900/50 hover:bg-rose-800 border border-rose-700/50"
                            >
                                <XOctagon className="w-4 h-4 mr-1" /> Bitir
                            </Button>
                        </div>
                    </div>
                    
                    <div className="flex-1 flex flex-col justify-center p-4 md:p-12 gap-6 relative z-0 max-w-5xl mx-auto w-full">
                        <div className="bg-white/5 p-6 md:p-10 rounded-3xl min-h-[160px] md:min-h-[220px] flex items-center justify-center backdrop-blur-md border border-white/10 shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-2 h-full bg-indigo-500"></div>
                            <p className="text-2xl md:text-4xl font-semibold text-center text-indigo-50 leading-relaxed drop-shadow-md">
                                {currentQ?.definition}
                            </p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-auto md:h-80">
                            {currentQ?.options.map(opt => (
                                <div key={`single-${opt}`} className="h-20 md:h-full">
                                    <OptionButton player="single" option={opt} />
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    {leftLocked && (
                        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center z-40 animate-fade-in">
                            <Lock className="w-24 h-24 text-rose-500 mb-6 animate-pulse" />
                            <span className="text-3xl font-bold text-rose-400">YANLIŞ CEVAP!</span>
                        </div>
                    )}

                    {showNextButton && (
                        <div className="absolute inset-0 bg-emerald-900/40 backdrop-blur-[2px] flex flex-col items-center justify-center z-40 animate-fade-in pointer-events-none">
                            <CheckCircle2 className="w-32 h-32 text-emerald-400 mb-4 drop-shadow-[0_0_20px_rgba(52,211,153,0.5)]" />
                            <span className="text-5xl font-black text-white drop-shadow-md">DOĞRU!</span>
                        </div>
                    )}
                 </div>
            )}

            {/* --- TAKIMLI MOD --- */}
            {gameMode === 'team' && (
                <>
                    {/* SOL (MAVİ) */}
                    <div id="p1-zone" className="flex-1 bg-blue-950/50 border-r-2 border-white/10 flex flex-col relative overflow-hidden">
                        <div className="p-4 bg-blue-900/80 backdrop-blur flex justify-between items-center shadow-lg z-10 border-b border-white/5">
                            <div className="flex items-center gap-2">
                                <User className="w-6 h-6 text-blue-300" />
                                <span className="text-xl md:text-2xl font-bold text-blue-100 hidden md:inline">MAVİ</span>
                            </div>
                            <span className="text-4xl md:text-5xl font-black text-white drop-shadow-lg">{scoreLeft}</span>
                        </div>
                        
                        <div className="flex-1 flex flex-col justify-center p-4 md:p-8 gap-4 md:gap-6 relative z-0">
                            <div className="bg-white/5 p-4 md:p-6 rounded-2xl min-h-[140px] md:min-h-[180px] flex items-center justify-center backdrop-blur-sm border border-white/10 shadow-xl">
                                <p className="text-xl md:text-3xl font-semibold text-center text-blue-50 leading-snug">{currentQ?.definition}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3 md:gap-4 h-48 md:h-64">
                                {currentQ?.options.map(opt => <OptionButton key={`left-${opt}`} player="left" option={opt} />)}
                            </div>
                        </div>
                        
                        {leftLocked && (
                            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center z-40 animate-fade-in">
                                <Lock className="w-20 h-20 text-red-500 mb-4" />
                            </div>
                        )}
                        
                        {winner === 'left' && showNextButton && (
                            <div className="absolute inset-0 bg-blue-600/30 backdrop-blur-[2px] flex flex-col items-center justify-center z-40 animate-fade-in">
                                <CheckCircle2 className="w-24 h-24 text-blue-300 mb-2" />
                            </div>
                        )}
                    </div>

                    {/* SAĞ (KIRMIZI) */}
                    <div id="p2-zone" className="flex-1 bg-red-950/50 flex flex-col relative overflow-hidden">
                        <div className="p-4 bg-red-900/80 backdrop-blur flex justify-between items-center shadow-lg z-10 border-b border-white/5">
                            <div className="flex items-center gap-2">
                                <User className="w-6 h-6 text-red-300" />
                                <span className="text-xl md:text-2xl font-bold text-red-100 hidden md:inline">KIRMIZI</span>
                            </div>
                            <span className="text-4xl md:text-5xl font-black text-white drop-shadow-lg">{scoreRight}</span>
                        </div>

                        <div className="flex-1 flex flex-col justify-center p-4 md:p-8 gap-4 md:gap-6 relative z-0">
                            <div className="bg-white/5 p-4 md:p-6 rounded-2xl min-h-[140px] md:min-h-[180px] flex items-center justify-center backdrop-blur-sm border border-white/10 shadow-xl">
                                <p className="text-xl md:text-3xl font-semibold text-center text-red-50 leading-snug">{currentQ?.definition}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3 md:gap-4 h-48 md:h-64">
                                {currentQ?.options.map(opt => <OptionButton key={`right-${opt}`} player="right" option={opt} />)}
                            </div>
                        </div>

                        {rightLocked && (
                            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center z-40 animate-fade-in">
                                <Lock className="w-20 h-20 text-red-500 mb-4" />
                            </div>
                        )}

                        {winner === 'right' && showNextButton && (
                            <div className="absolute inset-0 bg-red-600/30 backdrop-blur-[2px] flex flex-col items-center justify-center z-40 animate-fade-in">
                                <CheckCircle2 className="w-24 h-24 text-red-300 mb-2" />
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* MERKEZİ BUTON / SAYAÇ (SADECE TAKIM MODUNDA SAYAÇ GÖRÜNÜR) */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[60]">
                {showNextButton ? (
                    <Button 
                        onClick={nextQuestion} 
                        className="h-20 w-20 md:h-24 md:w-24 rounded-full bg-white text-slate-900 hover:bg-slate-200 border-4 border-slate-700 shadow-[0_0_30px_rgba(255,255,255,0.3)] pointer-events-auto animate-in zoom-in-50 duration-300 flex items-center justify-center"
                    >
                        <ArrowRight className="h-8 w-8 md:h-10 md:w-10" />
                    </Button>
                ) : (
                    // Tekli Modda Ortadaki Sayaç GİZLENİR, Sadece Takım Modunda Görünür
                    gameMode === 'team' && (
                        <div className={cn(
                            "bg-slate-900 text-slate-100 font-black text-3xl md:text-4xl w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center border-4 border-slate-700 shadow-2xl transform transition-all",
                            timeLeft <= 5 ? 'border-red-500 text-red-500 animate-pulse bg-red-950/30' : ''
                        )}>
                            {timeLeft}
                        </div>
                    )
                )}
            </div>

        </div>
    );
}

export default function KavramDuellosuOyunPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-900"><Loader2 className="w-16 h-16 animate-spin text-indigo-500" /></div>}>
            <KavramYarismaGame />
        </Suspense>
    )
}
