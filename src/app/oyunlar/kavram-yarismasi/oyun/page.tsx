'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { submitConceptQuizScoreAction, getConceptQuizAction } from '../actions';
import type { ConceptQuizQuestion } from '../actions';
import { Loader2, ArrowLeft, Timer, User, Users, Trophy, CheckCircle2, Lock, ArrowRight, Home, Repeat, XOctagon } from "lucide-react";
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
    const baseQuestionsRef = useRef<ConceptQuizQuestion[]>([]);
    const [error, setError] = useState<string | null>(null);

    const gameContext = `Kavram Yarışması (${gameMode === 'team' ? 'VS' : 'Tekli'}) - ${searchParams.get('topicName') || 'Genel'}`;

    const getBackUrl = useCallback(() => {
        if (!user) return '/oyunlar/kavram-yarismasi';
        if (user.role === 'teacher' || user.role === 'superadmin') {
            return '/teacher/smartboard';
        }
        const courseId = searchParams.get('courseId');
        const unitId = searchParams.get('unitId');
        const topicId = searchParams.get('topicId');
        if (courseId && unitId && topicId) {
             const params = new URLSearchParams({
                courseName: searchParams.get('courseName') || '',
                unitName: searchParams.get('unitName') || '',
                topicName: searchParams.get('topicName') || '',
            });
            return `/konu/${courseId}/${unitId}/${topicId}?${params.toString()}`;
        }
        return '/student';
    }, [user, searchParams]);

    // --- PUANLAMA MANTIĞI ---
    // Single Mod: Süre ile çarpılır (Max 75, Min 5)
    // Team Mod: handleAnswer içinde sabit 1 atanır, buradaki değer kullanılmaz.
    const currentPotentialScore = Math.max(5, timeLeft * 5);

    // --- ALGORİTMA: SORU VE ŞIK DÜZENLEME ---
    const prepareQuestions = (baseQs: ConceptQuizQuestion[]): ConceptQuizQuestion[] => {
        // 1. Her soruyu 3 kez çoğalt
        const tripledQuestions = baseQs.flatMap(q => [q, q, q]);

        // 2. Rastgele Karıştır
        let shuffled = [...tripledQuestions].sort(() => Math.random() - 0.5);

        // 3. ARDIŞIK AYNI SORUYU ENGELLEME
        for (let i = 1; i < shuffled.length; i++) {
            if (shuffled[i].correctAnswer === shuffled[i-1].correctAnswer) {
                for (let j = i + 1; j < shuffled.length; j++) {
                    if (shuffled[j].correctAnswer !== shuffled[i-1].correctAnswer) {
                        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
                        break;
                    }
                }
            }
        }

        // 4. ARDIŞIK AYNI ŞIK POZİSYONUNU ENGELLEME
        let lastCorrectIndex = -1;

        const finalQuestions = shuffled.map((q) => {
            let newOptions = [...q.options];
            newOptions.sort(() => Math.random() - 0.5);

            let currentCorrectIndex = newOptions.indexOf(q.correctAnswer);

            if (currentCorrectIndex === lastCorrectIndex && newOptions.length > 1) {
                const swapTarget = (currentCorrectIndex + 1) % newOptions.length;
                [newOptions[currentCorrectIndex], newOptions[swapTarget]] = [newOptions[swapTarget], newOptions[currentCorrectIndex]];
                currentCorrectIndex = swapTarget;
            }

            lastCorrectIndex = currentCorrectIndex;

            return {
                ...q,
                options: newOptions
            };
        });

        return finalQuestions;
    };

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
            baseQuestionsRef.current = fetchedQuestions;
            const processedQuestions = prepareQuestions(fetchedQuestions);
            setQuestions(processedQuestions);
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
            
            // --- PUANLAMA DEĞİŞİKLİĞİ ---
            // Takım Modu: Sabit 1 Puan (Süre etkisiz)
            // Tekli Mod: Süreye bağlı (currentPotentialScore)
            const points = gameMode === 'team' ? 1 : currentPotentialScore;
            
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
        if (baseQuestionsRef.current.length > 0) {
            const newProcessed = prepareQuestions(baseQuestionsRef.current);
            setQuestions(newProcessed);
        }
        setGameState('mode-select');
    };

    const handleSaveAndExit = async () => {
        if(timerRef.current) clearInterval(timerRef.current);
        const totalScore = scoreLeft;
        const backUrl = getBackUrl();
        
        if (!user || scoreSaved || isSaving || totalScore <= 0) {
            router.push(backUrl);
            return;
        }
        
        setIsSaving(true);
        const result = await submitConceptQuizScoreAction(user.uid, totalScore, gameContext);
        if (result.success) {
            setScoreSaved(true);
            toast({ title: 'Başarılı!', description: `${totalScore} puan profiline eklendi.` });
        } else {
            toast({ title: 'Hata', description: result.error, variant: 'destructive' });
        }
        setIsSaving(false);
        router.push(backUrl);
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
                className={`w-full h-full text-sm md:text-xl font-bold rounded-xl shadow-md transition-all p-2 leading-tight break-words select-none flex items-center justify-center text-center ${dynamicClass}`}
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

                <div className="relative z-10 w-full max-w-2xl text-center space-y-6 animate-in zoom-in-95 duration-500">
                    <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-rose-400 drop-shadow-lg">
                        KAVRAM DÜELLOSU
                    </h1>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                        <button 
                            onClick={() => startGame('single')}
                            className="group relative bg-slate-900/60 border-2 border-slate-700 hover:border-indigo-500 rounded-2xl p-6 transition-all hover:shadow-[0_0_30px_rgba(99,102,241,0.3)] hover:-translate-y-1"
                        >
                            <div className="absolute top-3 right-3 bg-indigo-500/20 text-indigo-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-500/30">
                                SIRALAMA
                            </div>
                            <div className="bg-indigo-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform border border-indigo-500/20">
                                <User className="w-8 h-8 text-indigo-400" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-1">Tek Kişilik</h3>
                            <p className="text-sm text-slate-400 leading-tight">Puan topla, yanlış yaparsan puanın düşer.</p>
                        </button>

                        <button 
                            onClick={() => startGame('team')}
                            className="group relative bg-slate-900/60 border-2 border-slate-700 hover:border-rose-500 rounded-2xl p-6 transition-all hover:shadow-[0_0_30px_rgba(244,63,94,0.3)] hover:-translate-y-1"
                        >
                             <div className="absolute top-3 right-3 bg-rose-500/20 text-rose-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-rose-500/30">
                                VS MODU
                            </div>
                            <div className="bg-rose-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform border border-rose-500/20">
                                <Users className="w-8 h-8 text-rose-400" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-1">Düello (VS)</h3>
                            <p className="text-sm text-slate-400 leading-tight">Arkadaşınla kapış. Her kavram 3 kez sorulur.</p>
                        </button>
                    </div>
                    
                    <Button variant="ghost" size="sm" onClick={() => router.back()} className="text-slate-500 hover:text-white mt-4 h-8 text-sm">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Ana Menüye Dön
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
        const backUrl = getBackUrl();
        
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
                                <Link href={backUrl}><Home className="mr-2 h-5 w-5"/> Çıkış</Link>
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
            
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-[100]">
                <Confetti active={showConfetti} config={{ particleCount: 150, spread: 360 }} />
            </div>

            <button onClick={() => setGameState('mode-select')} className="absolute top-3 left-3 z-50 p-2 bg-black/20 hover:bg-black/40 rounded-full backdrop-blur-sm transition-colors border border-white/10 group">
                <ArrowLeft className="w-5 h-5 text-white/70 group-hover:text-white" />
            </button>

            {/* --- TEK KİŞİLİK MOD (OPTIMIZED LAYOUT) --- */}
            {gameMode === 'single' && (
                 <div id="p1-zone" className="w-full h-full bg-slate-900 flex flex-col relative overflow-y-auto md:overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/30 to-purple-900/30 pointer-events-none fixed"></div>

                    {/* Header */}
                    <div className="p-3 md:p-6 bg-slate-800/80 backdrop-blur flex justify-between items-center shadow-lg z-10 border-b border-white/10 shrink-0 sticky top-0">
                        
                        <div className="flex items-center gap-2 md:gap-3">
                            <div className="bg-indigo-500/20 p-1.5 md:p-2 rounded-lg hidden md:block"><User className="w-5 h-5 md:w-6 md:h-6 text-indigo-400" /></div>
                            <span className="text-base md:text-2xl font-bold text-indigo-100 hidden sm:inline">TEK KİŞİLİK</span>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 px-3 py-1 md:px-4 md:py-2 bg-slate-900/50 rounded-xl border border-indigo-500/30 min-w-[100px] md:min-w-[140px] justify-center">
                                <Timer className={cn("w-4 h-4 md:w-5 md:h-5", timeLeft <= 5 ? "text-rose-500 animate-pulse" : "text-indigo-400")} />
                                <span className={cn("font-mono text-xl md:text-2xl font-bold", timeLeft <= 5 ? "text-rose-500" : "text-white")}>
                                    {timeLeft}
                                </span>
                                {!leftLocked && !showNextButton && (
                                    <div className="ml-1 px-1.5 py-0.5 bg-emerald-500/20 rounded text-emerald-400 text-xs md:text-sm font-bold animate-in fade-in">
                                        +{currentPotentialScore}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-2 md:gap-4 relative">
                             {scoreDelta && (
                                <div className={cn(
                                    "absolute top-8 right-16 md:right-24 text-xl md:text-2xl font-black whitespace-nowrap score-pop-up z-50 pointer-events-none drop-shadow-md",
                                    scoreDelta.startsWith('+') ? "text-emerald-400" : "text-rose-500"
                                )}>
                                    {scoreDelta}
                                </div>
                             )}

                             <div className="text-right mr-1 bg-slate-900/50 px-3 py-1 rounded-lg border border-white/10 min-w-[80px] md:min-w-[100px]">
                                <span className="block text-[8px] md:text-[10px] text-indigo-400 font-bold tracking-wider uppercase">Puan</span>
                                <span className="text-xl md:text-2xl font-black text-white leading-none">{scoreLeft}</span>
                             </div>
                             
                             <Button 
                                onClick={endGame} 
                                size="sm" 
                                variant="destructive"
                                className="bg-rose-900/50 hover:bg-rose-800 border border-rose-700/50 h-8 text-xs md:text-sm"
                            >
                                <XOctagon className="w-3 h-3 md:w-4 md:h-4 mr-1" /> Bitir
                            </Button>
                        </div>
                    </div>
                    
                    <div className="flex-1 flex flex-col justify-start md:justify-center p-3 md:p-12 gap-3 md:gap-6 relative z-0 max-w-5xl mx-auto w-full h-full">
                        
                        <div className="bg-white/5 p-4 md:p-10 rounded-2xl md:rounded-3xl min-h-[100px] md:min-h-[220px] flex items-center justify-center backdrop-blur-md border border-white/10 shadow-xl relative overflow-hidden group shrink-0">
                            <div className="absolute top-0 left-0 w-1.5 md:w-2 h-full bg-indigo-500"></div>
                            <p className="text-lg md:text-4xl font-semibold text-center text-indigo-50 leading-relaxed drop-shadow-md">
                                {currentQ?.definition}
                            </p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4 w-full pb-4 md:pb-0 md:h-80">
                            {currentQ?.options.map(opt => (
                                <div key={`single-${opt}`} className="h-14 md:h-full">
                                    <OptionButton player="single" option={opt} />
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    {leftLocked && (
                        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center z-40 animate-fade-in fixed">
                            <Lock className="w-16 h-16 md:w-24 md:h-24 text-rose-500 mb-4 animate-pulse" />
                            <span className="text-2xl md:text-3xl font-bold text-rose-400">YANLIŞ CEVAP!</span>
                        </div>
                    )}

                    {showNextButton && (
                        <div className="absolute inset-0 bg-emerald-900/40 backdrop-blur-[2px] flex flex-col items-center justify-center z-40 animate-fade-in pointer-events-none fixed">
                            <CheckCircle2 className="w-24 h-24 md:w-32 md:h-32 text-emerald-400 mb-4 drop-shadow-[0_0_20px_rgba(52,211,153,0.5)]" />
                            <span className="text-4xl md:text-5xl font-black text-white drop-shadow-md">DOĞRU!</span>
                        </div>
                    )}
                 </div>
            )}

            {/* --- TAKIMLI MOD --- */}
            {gameMode === 'team' && (
                <>
                    {/* SOL (MAVİ) */}
                    <div id="p1-zone" className="player-zone flex-1 bg-blue-950/50 border-r-2 border-white/10 flex flex-col relative overflow-hidden">
                        <div className="p-3 bg-blue-900/80 backdrop-blur flex justify-between items-center shadow-lg z-10 border-b border-white/5">
                            <div className="flex items-center gap-2">
                                <User className="w-5 h-5 text-blue-300" />
                                <span className="text-sm md:text-2xl font-bold text-blue-100 hidden md:inline">MAVİ TAKIM</span>
                            </div>
                            <span className="text-2xl md:text-5xl font-black text-white drop-shadow-lg">{scoreLeft}</span>
                        </div>
                        
                        <div className="flex-1 flex flex-col justify-center p-2 md:p-8 gap-2 md:gap-6 relative z-0">
                            <div className="bg-white/5 p-2 md:p-6 rounded-xl md:rounded-2xl min-h-[100px] md:min-h-[180px] flex items-center justify-center backdrop-blur-sm border border-white/10 shadow-xl">
                                <p className="text-sm md:text-3xl font-semibold text-center text-blue-50 leading-snug">{currentQ?.definition}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-2 md:gap-4 h-40 md:h-64">
                                {currentQ?.options.map(opt => <OptionButton key={`left-${opt}`} player="left" option={opt} />)}
                            </div>
                        </div>
                        
                        {p1Lock && (
                            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center z-40 animate-fade-in">
                                <Lock className="w-12 h-12 md:w-20 md:h-20 text-red-500 mb-4" />
                            </div>
                        )}
                        
                        {winner === 'left' && showNextButton && (
                            <div className="absolute inset-0 bg-blue-600/30 backdrop-blur-[2px] flex flex-col items-center justify-center z-40 animate-fade-in">
                                <CheckCircle2 className="w-16 h-16 md:w-24 md:h-24 text-blue-300 mb-2" />
                            </div>
                        )}
                    </div>

                    {/* SAĞ (KIRMIZI) */}
                    <div id="p2-zone" className="player-zone flex-1 bg-red-950/50 flex flex-col relative overflow-hidden">
                        <div className="p-3 bg-red-900/80 backdrop-blur flex justify-between items-center shadow-lg z-10 border-b border-white/5">
                            <div className="flex items-center gap-2">
                                <User className="w-5 h-5 text-red-300" />
                                <span className="text-sm md:text-2xl font-bold text-red-100 hidden md:inline">KIRMIZI TAKIM</span>
                            </div>
                            <span className="text-2xl md:text-5xl font-black text-white drop-shadow-lg">{scoreRight}</span>
                        </div>

                        <div className="flex-1 flex flex-col justify-center p-2 md:p-8 gap-2 md:gap-6 relative z-0">
                            <div className="bg-white/5 p-2 md:p-6 rounded-xl md:rounded-2xl min-h-[100px] md:min-h-[180px] flex items-center justify-center backdrop-blur-sm border border-white/10 shadow-xl">
                                <p className="text-sm md:text-3xl font-semibold text-center text-red-50 leading-snug">{currentQ?.definition}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-2 md:gap-4 h-40 md:h-64">
                                {currentQ?.options.map(opt => <OptionButton key={`right-${opt}`} player="right" option={opt} />)}
                            </div>
                        </div>

                        {p2Lock && (
                            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center z-40 animate-fade-in">
                                <Lock className="w-12 h-12 md:w-20 md:h-20 text-red-500 mb-4" />
                            </div>
                        )}

                        {winner === 'right' && showNextButton && (
                            <div className="absolute inset-0 bg-red-600/30 backdrop-blur-[2px] flex flex-col items-center justify-center z-40 animate-fade-in">
                                <CheckCircle2 className="w-16 h-16 md:w-24 md:h-24 text-red-300 mb-2" />
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* MERKEZİ BUTON / SAYAÇ */}
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[60]">
                {state.showNextButton ? (
                    <Button 
                        onClick={nextQuestion} 
                        className="h-16 w-16 md:h-24 md:w-24 rounded-full bg-white text-slate-900 hover:bg-slate-200 border-4 border-slate-700 shadow-[0_0_30px_rgba(255,255,255,0.3)] pointer-events-auto animate-in zoom-in-50 duration-300 flex items-center justify-center"
                    >
                        <ArrowRight className="h-6 w-6 md:h-10 md:w-10" />
                    </Button>
                ) : (
                    <div className={cn(
                        "bg-slate-900 text-slate-100 font-black text-2xl md:text-4xl w-14 h-14 md:w-24 md:h-24 rounded-full flex items-center justify-center border-4 border-slate-700 shadow-2xl transform transition-all",
                        timeLeft <= 5 ? 'border-red-500 text-red-500 animate-pulse bg-red-950/30' : ''
                    )}>
                        {timeLeft}
                    </div>
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
```
- src/app/teacher/smartboard/kavram-yarismasi/page.tsx:
```tsx

'use client';

import { OyunKurulum } from '@/components/oyun-kurulum';
import { BrainCircuit } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

export default function SmartboardKavramYarismasiPage() {
    const searchParams = useSearchParams();
    const gameName = searchParams.get('gameName') || "Kavram Yarışması";
    const gamePath = searchParams.get('gamePath') || "kavram-yarismasi";

    return <OyunKurulum 
        gameName={gameName}
        gameIcon={BrainCircuit} 
        gamePath={gamePath} 
        dataType="games" 
        targetPath={`/teacher/smartboard/${gamePath}`}
    />;
}
```
- src/app/teacher/smartboard/page.tsx:
```tsx
'use client';

import Link from 'next/link';
import React, { type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { 
  MonitorPlay, Sun, User, Users, Swords, ArrowRight, BrainCircuit, Settings, Trophy, GitBranch, Columns, LayoutTemplate, Package, Wind, Gamepad2, UserCog, Lightbulb, Zap 
} from 'lucide-react';
import { cn } from '@/lib/utils';

// GÜNCELLEME: Daha kompakt kart bileşeni
const SmartboardCard = ({ href, title, description, icon, colorClass, isExternal }: { href: string, title: string, description: string, icon: ReactNode, colorClass: string, isExternal?: boolean }) => {
    const linkContent = (
        <div className={cn(
            // GÜNCELLEME: rounded değeri, padding (p-8 -> p-5) azaltıldı
            "h-full w-full rounded-3xl p-5 flex flex-col items-center justify-center text-center shadow-2xl transition-all duration-300 transform border-b-[6px] group-hover:border-b-0 group-hover:translate-y-2 relative overflow-hidden group",
            colorClass
        )}>
            {/* Arka Plan Işık Efekti */}
            <div className={cn("absolute inset-0 opacity-20 blur-3xl group-hover:opacity-40 transition-opacity", colorClass.includes('bg-') ? colorClass.replace('bg-', 'bg-') : 'bg-primary')}></div>
            
            {/* İkon */}
            {/* GÜNCELLEME: İkon kapsayıcı ve margin küçültüldü */}
            <div className="p-4 rounded-2xl bg-white/10 mb-4 border border-white/20 relative z-10 group-hover:scale-110 transition-transform shadow-lg backdrop-blur-sm">
                {/* GÜNCELLEME: İkon boyutu h-16 -> h-8 olarak küçültüldü */}
                {React.cloneElement(icon as React.ReactElement, { className: "h-8 w-8 text-white" })}
            </div>
            
            {/* Başlık */}
            {/* GÜNCELLEME: Text boyutu text-4xl -> text-2xl olarak küçültüldü */}
            <h3 className="font-black text-xl md:text-2xl mt-1 text-white drop-shadow-md relative z-10 uppercase tracking-tight leading-tight">{title}</h3>
            
            {/* Açıklama */}
            {/* GÜNCELLEME: Text boyutu text-lg -> text-sm olarak küçültüldü */}
            <p className="mt-2 text-white/80 text-sm font-medium relative z-10 leading-snug line-clamp-3">{description}</p>
            
            <div className="flex-grow" />
            
            {/* Detay Butonu/İkonu */}
            {/* GÜNCELLEME: Buton boyutu ve margin küçültüldü */}
            <div className="mt-4 flex items-center text-sm font-bold text-white relative z-10 bg-black/20 px-4 py-1.5 rounded-full border border-white/10 group-hover:bg-white/20 transition-colors">
                BAŞLAT <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </div>
        </div>
    );
    
    if (isExternal) {
        return <a href={href} target="_blank" rel="noopener noreferrer" className="block group h-full">{linkContent}</a>
    }

    return (
        <Link href={href} className="block group h-full">
            {linkContent}
        </Link>
    )
};


export default function SmartboardPage() {
  
    // Yarışma Modları
    const yarışmalar = [
        {
            key: 'smartboard_bireysel',
            href: "/teacher/smartboard/bireysel",
            title: "Bireysel Yarışma",
            description: "Her öğrencinin kendi başına yarıştığı klasik mod.",
            icon: <User />,
            colorClass: "bg-indigo-600 border-indigo-800 hover:bg-indigo-500",
        },
        {
            key: 'smartboard_takim',
            href: "/teacher/smartboard/takim",
            title: "Takım Yarışması",
            description: "Öğrencileri gruplandırıp takım ruhuyla yarıştırın.",
            icon: <Users />,
            colorClass: "bg-teal-600 border-teal-800 hover:bg-teal-500",
        },
        {
            key: 'smartboard_duello',
            href: "/teacher/smartboard/duello",
            title: "Düello",
            description: "İki öğrenciyi veya takımı doğrudan karşılaştırın.",
            icon: <Swords />,
            colorClass: "bg-red-600 border-red-800 hover:bg-red-500",
        },
        {
            key: 'kavram_duellosu',
            href: "/teacher/smartboard/kavram-duellosu",
            title: "Kavram Düellosu",
            description: "Hızlı tempolu bilgi ve refleks yarışması.",
            icon: <BrainCircuit />,
            colorClass: "bg-fuchsia-600 border-fuchsia-800 hover:bg-fuchsia-500",
        },
        {
            key: 'fetih_oyunu',
            href: "/teacher/smartboard/fetih-oyunu",
            title: "Fetih Oyunu",
            description: "Sorularla haritada ilerle, kaleyi fethet.",
            icon: <GitBranch />,
            colorClass: "bg-emerald-600 border-emerald-800 hover:bg-emerald-500",
        },
        {
            key: 'tornado',
            href: "/teacher/smartboard/tornado",
            title: "Tornado",
            description: "Rastgele puanlar ve sürpriz sorular.",
            icon: <Wind />,
            colorClass: "bg-cyan-600 border-cyan-800 hover:bg-cyan-500",
        },
        {
            key: 'kutu_ac',
            href: "/teacher/smartboard/kutu-ac",
            title: "Kutu Aç",
            description: "Kutuları açarak puan topla ve lider ol.",
            icon: <Package />,
            colorClass: "bg-purple-600 border-purple-800 hover:bg-purple-500",
        },
    ];
    
    // Sunum & Araç Modları
    const sunumlar = [
        {
            key: 'ozetler',
            href: "/teacher/smartboard/ozetler",
            title: "Özetler & İçerik",
            description: "Konu özetlerini ve HTML içerikleri sun.",
            icon: <LayoutTemplate />,
            colorClass: "bg-rose-600 border-rose-800 hover:bg-rose-500",
        },
        {
            key: 'yazilacaklar',
            href: "/teacher/smartboard/yazilacaklar",
            title: "Kavram Panosu",
            description: "Kavramlar ve notları sütunlara ayırarak göster.",
            icon: <Columns />,
            colorClass: "bg-amber-600 border-amber-800 hover:bg-amber-500",
        },
        {
             key: 'sanal-tahta',
             href: "/teacher/smartboard/sanal-tahta",
             title: "Sanal Tahta",
             description: "Ders anlatımı için dijital beyaz tahta.",
             icon: <Lightbulb />,
             colorClass: "bg-blue-600 border-blue-800 hover:bg-blue-500",
        },
        {
             key: 'anlik-geri-bildirim',
             href: "/teacher/smartboard/anlik-geri-bildirim",
             title: "Anlık Geri Bildirim",
             description: "Sınıfın nabzını ölçmek için hızlı anket.",
             icon: <Zap />,
             colorClass: "bg-slate-700 border-slate-900 hover:bg-slate-600",
        },
        {
            key: 'carkifelek',
            href: "/teacher/smartboard/carkifelek",
            title: "Çarkıfelek",
            description: "Rastgele bir öğrenci seçmek için çarkı çevir.",
            icon: <Trophy />,
            colorClass: "bg-yellow-600 border-yellow-800 hover:bg-yellow-500",
        },
    ];

    return (
        <div className="flex flex-col items-center p-6 sm:p-8 space-y-12 min-h-screen bg-slate-950 text-white font-sans relative overflow-hidden">
            
             {/* Arka Plan Efektleri */}
             <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-900/20 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-900/20 rounded-full blur-[100px]" />
            </div>

            {/* Ana Başlık */}
            <div className="text-center relative z-10 space-y-4 pt-4">
                <Link href="/teacher" className="inline-block">
                    {/* GÜNCELLEME: Logo boyutu küçültüldü */}
                    <div className="inline-flex items-center justify-center p-4 bg-white/5 rounded-full mb-2 border border-white/10 shadow-2xl backdrop-blur-md cursor-pointer hover:bg-white/10 transition-colors">
                        <MonitorPlay className="h-8 w-8 text-cyan-400"/>
                    </div>
                </Link>
                {/* GÜNCELLEME: Başlık boyutu text-8xl -> text-5xl/6xl */}
                <h1 className="font-black text-4xl md:text-6xl tracking-tight text-white drop-shadow-2xl">AKILLI <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">TAHTA</span></h1>
                <p className="text-slate-400 text-lg md:text-xl font-medium max-w-2xl mx-auto">Sınıf içi etkileşimi artırmak için bir mod seçin.</p>
            </div>
            
            <div className="w-full max-w-[1400px] space-y-10 relative z-10">
                
                {/* Yarışmalar Bölümü */}
                <section>
                    {/* GÜNCELLEME: Kategori başlıkları küçültüldü */}
                    <h2 className="text-2xl font-black text-center mb-6 text-white flex items-center justify-center gap-4">
                        <div className="h-px w-10 bg-gradient-to-r from-transparent to-indigo-500"></div>
                        <span className="bg-indigo-500/10 px-4 py-1.5 rounded-lg border border-indigo-500/30 text-indigo-300 uppercase tracking-widest text-sm flex items-center gap-2">
                           <Trophy className="h-5 w-5" /> Yarışma Modları
                        </span>
                        <div className="h-px w-10 bg-gradient-to-l from-transparent to-indigo-500"></div>
                    </h2>
                    {/* GÜNCELLEME: Grid gap azaltıldı (gap-8 -> gap-5) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                        {yarışmalar.map(({ key, ...buttonProps }) => (
                            // GÜNCELLEME: Min yükseklik 380px -> 240px'e düşürüldü
                            <div key={key} className="aspect-[4/5] min-h-[240px]">
                                <SmartboardCard {...buttonProps} />
                            </div>
                        ))}
                    </div>
                </section>

                {/* Sunumlar ve Araçlar Bölümü */}
                <section>
                    <h2 className="text-2xl font-black text-center mb-6 text-white flex items-center justify-center gap-4">
                        <div className="h-px w-10 bg-gradient-to-r from-transparent to-rose-500"></div>
                        <span className="bg-rose-500/10 px-4 py-1.5 rounded-lg border border-rose-500/30 text-rose-300 uppercase tracking-widest text-sm flex items-center gap-2">
                           <MonitorPlay className="h-5 w-5" /> Sunumlar ve Araçlar
                        </span>
                        <div className="h-px w-10 bg-gradient-to-l from-transparent to-rose-500"></div>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                        {sunumlar.map(({ key, ...buttonProps }) => (
                            <div key={key} className="aspect-[4/5] min-h-[240px]">
                                <SmartboardCard {...buttonProps} />
                            </div>
                        ))}
                    </div>
                </section>
                
            </div>

            {/* Yönetim Butonları */}
            {/* GÜNCELLEME: Container padding azaltıldı, butonlar küçültüldü */}
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 w-full max-w-4xl relative z-10 p-5 rounded-3xl bg-slate-900/80 backdrop-blur-xl border border-white/10 shadow-2xl">
                {/* GÜNCELLEME: Buton h-16 -> h-12, font-xl -> font-base */}
                <Button asChild className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white text-base font-bold shadow-lg shadow-amber-900/40 h-12 px-6 rounded-xl transition-all border-b-4 border-orange-800 active:border-b-0 active:translate-y-1 w-full md:w-auto">
                    <Link href="/teacher/smartboard/leaderboard">
                        <Trophy className="mr-2 h-5 w-5" />
                        Turnuva Liderliği
                    </Link>
                </Button>
                <div className="h-px w-full md:w-px md:h-8 bg-white/10"></div>
                <Button asChild variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/5 text-base font-bold h-12 px-5 rounded-lg w-full md:w-auto justify-start md:justify-center">
                    <Link href="/teacher/guest-students">
                        <UserCog className="mr-2 h-5 w-5 text-cyan-400" />
                        Sanal Öğrenciler
                    </Link>
                </Button>
                <Button asChild variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/10 text-base font-bold h-12 px-5 rounded-lg w-full md:w-auto justify-start md:justify-center">
                    <Link href="/teacher/game-settings">
                        <Settings className="mr-2 h-5 w-5 text-purple-400" />
                        Oyun Ayarları
                    </Link>
                </Button>
            </div>
            
        </div>
    );
}

```