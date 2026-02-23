'use client';

import { useState, useEffect, Suspense, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getHitTheTargetAction, submitHitTheTargetScoreAction, type HitTheTargetRound } from '../actions';
import { Button } from '@/components/ui/button';
import { Loader2, Trophy, Home, Save, Timer, Target, Zap, Sparkles, XOctagon, CheckCircle, RotateCcw, Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { playSound, stopSound } from '@/lib/audio-service';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, serverTimestamp, writeBatch, doc, increment } from 'firebase/firestore';
import { GameEndScreen } from '@/components/game-end-screen';
import { FullscreenToggle } from '@/components/fullscreen-toggle';
import Confetti from 'react-dom-confetti';

// --- TİPLER ---
type TargetInfo = {
    id: number;
    text: string;
    isCorrect: boolean;
    x: number;
    y: number;
    vx: number; 
    vy: number; 
    isHit: boolean;
    colorClass: string;
    size: number; 
};

const TARGET_COLORS = [
    "bg-sky-500/90 border-sky-300 shadow-[0_0_15px_rgba(14,165,233,0.8)] text-white",
    "bg-fuchsia-500/90 border-fuchsia-300 shadow-[0_0_15px_rgba(217,70,239,0.8)] text-white",
    "bg-emerald-500/90 border-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.8)] text-white",
    "bg-amber-500/90 border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.8)] text-white",
    "bg-rose-500/90 border-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.8)] text-white",
];

// --- GÖRSEL BİLEŞENLER ---

const GameBackground = () => (
    <div className="fixed inset-0 pointer-events-none z-0 bg-slate-950 overflow-hidden">
        <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-indigo-900/20 rounded-full blur-[150px] animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] bg-purple-900/20 rounded-full blur-[150px] animate-pulse delay-1000" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_70%,transparent_100%)]" />
    </div>
);

// --- KOMPAKT HUD ---
const GameHUD = ({ score, time, round, totalRounds, onFinish, containerRef }: { score: number, time: number, round: number, totalRounds: number, onFinish: () => void, containerRef: any }) => {
    return (
        <div className="w-full z-50 p-2 pointer-events-none shrink-0 relative bg-slate-950/50 backdrop-blur-sm border-b border-white/5">
            <div className="max-w-4xl mx-auto flex justify-between items-center pointer-events-auto bg-slate-900/80 backdrop-blur-md rounded-full border border-white/10 p-1.5 pl-4 pr-1.5 shadow-xl ring-1 ring-black/20">
                
                {/* SOL: Puan ve Süre */}
                <div className="flex items-center gap-3 md:gap-6">
                    {/* Puan */}
                    <div className="flex items-center gap-1.5">
                        <Trophy className="w-4 h-4 text-yellow-400" />
                        <span className="text-lg font-black text-white font-mono leading-none pt-0.5">{score}</span>
                    </div>
                    
                    {/* Süre */}
                    <div className={cn(
                        "flex items-center gap-1.5 transition-colors duration-300",
                        time <= 5 ? "text-red-400 animate-pulse" : "text-sky-400"
                    )}>
                        <Timer className="w-4 h-4" />
                        <span className="text-lg font-black font-mono leading-none pt-0.5">{time}s</span>
                    </div>
                </div>
                
                {/* SAĞ: Tur, Tam Ekran, Bitir */}
                <div className="flex items-center gap-1.5">
                    <div className="px-3 py-1 bg-white/5 rounded-full border border-white/5 hidden sm:flex">
                        <span className="text-[10px] text-slate-400 font-bold uppercase mr-1 pt-0.5">TUR</span>
                        <span className="text-sm font-black text-white font-mono">{round}/{totalRounds}</span>
                    </div>

                    <FullscreenToggle elementRef={containerRef} className="h-8 w-8 rounded-full bg-transparent hover:bg-white/10 text-slate-400 hover:text-white" />

                    <Button 
                        onClick={onFinish} 
                        size="icon"
                        className="h-8 w-8 rounded-full bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 transition-all"
                        title="Oyunu Bitir"
                    >
                        <XOctagon className="h-4 w-4 fill-current" />
                    </Button>
                </div>
            </div>
        </div>
    );
};

// --- ÇIKIŞ ONAY MODALI (Pause Menu) ---
const PauseMenu = ({ 
    score, 
    threshold, 
    isMission, 
    onResume, 
    onQuit 
}: { 
    score: number, 
    threshold: number, 
    isMission: boolean, 
    onResume: () => void, 
    onQuit: () => void 
}) => {
    const progress = Math.min(100, Math.max(0, (score / threshold) * 100));
    const isPassed = score >= threshold;

    return (
        <div className="absolute inset-0 z-[60] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-white/10 w-full max-w-sm rounded-3xl p-6 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sky-500 to-purple-500"></div>
                
                <h2 className="text-2xl font-black text-white text-center mb-6 flex items-center justify-center gap-2">
                    <Pause className="w-6 h-6 text-sky-400"/> OYUN DURAKLATILDI
                </h2>

                {isMission && (
                    <div className="bg-slate-800/50 rounded-2xl p-4 mb-6 border border-white/5">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">GÖREV DURUMU</span>
                            <span className={cn("text-xs font-bold px-2 py-0.5 rounded", isPassed ? "bg-green-500/20 text-green-400" : "bg-amber-500/20 text-amber-400")}>
                                {isPassed ? "BAŞARILI" : "DEVAM EDİYOR"}
                            </span>
                        </div>
                        
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-2xl font-black text-white">{score}</span>
                            <span className="text-sm font-medium text-slate-500 mb-1">/ {threshold} Puan Gerekli</span>
                        </div>

                        <div className="h-3 w-full bg-slate-700 rounded-full overflow-hidden">
                            <div 
                                className={cn("h-full transition-all duration-500", isPassed ? "bg-green-500" : "bg-amber-500")} 
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        {!isPassed && (
                            <p className="text-xs text-slate-400 mt-2 text-center">
                                Görevi tamamlamak için <span className="text-white font-bold">{threshold - score}</span> puan daha toplamalısın.
                            </p>
                        )}
                    </div>
                )}

                <div className="space-y-3">
                    <Button onClick={onResume} className="w-full h-12 text-lg font-bold bg-white text-slate-900 hover:bg-slate-200 rounded-xl">
                        <Play className="w-5 h-5 mr-2 fill-current"/> DEVAM ET
                    </Button>
                    <Button onClick={onQuit} variant="outline" className="w-full h-12 text-slate-400 border-slate-700 hover:bg-slate-800 hover:text-white rounded-xl">
                        <XOctagon className="w-5 h-5 mr-2"/> OYUNU BİTİR
                    </Button>
                </div>
            </div>
        </div>
    );
};

// --- ANA OYUN ---

function HitTheTargetGame() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user } = useAuth();
    const { toast } = useToast();
    
    const gameAreaRef = useRef<HTMLDivElement>(null);
    const mainContainerRef = useRef<HTMLDivElement>(null);
    const requestRef = useRef<number>();
    
    const [rounds, setRounds] = useState<HitTheTargetRound[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
    const [targets, setTargets] = useState<TargetInfo[]>([]);
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(30);
    
    const [gameState, setGameState] = useState<'loading' | 'playing' | 'paused' | 'round_end' | 'finished'>('loading');
    const [isPaused, setIsPaused] = useState(true);
    const [showPauseMenu, setShowPauseMenu] = useState(false);

    const [isSaving, setIsSaving] = useState(false);
    const [isScoreSaved, setIsScoreSaved] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    
    const [clickEffect, setClickEffect] = useState<{x: number, y: number, id: number} | null>(null);

    const mode = searchParams.get('mode');
    const topicId = searchParams.get('topicId');
    const threshold = parseInt(searchParams.get('threshold') || '500');
    const isMission = mode === 'mission';

    const gameContext = `Hedefi Vur - ${searchParams.get('topicName') || 'Genel'}`;
    const backUrl = isMission ? '/student/gorevler' : '/oyunlar/hedefi-vur';

    const generateTargets = useCallback((round: HitTheTargetRound) => {
        if (!round || !gameAreaRef.current) return;
        
        const area = gameAreaRef.current.getBoundingClientRect();
        const safeWidth = area.width * 0.8;
        const safeHeight = area.height * 0.8;
        const offsetX = area.width * 0.1;
        const offsetY = area.height * 0.1;

        // 1. Doğru cevabı temizle ve hazırla
        const correctTarget = round.target.trim();
        
        // 2. Yanlış cevapları havuzdan al (Doğru cevabı hariç tutarak)
        let distractors = round.words
            .map(w => w.trim())
            .filter(w => w !== correctTarget && w.length > 0);

        // 3. Yanlış cevapları karıştır ve sınırla
        distractors.sort(() => Math.random() - 0.5);
        const maxDistractors = 6;
        const selectedDistractors = distractors.slice(0, maxDistractors);
        
        // 4. KRİTİK ADIM: Doğru cevabı havuza KESİN olarak ekle
        let finalPool = [correctTarget, ...selectedDistractors];
        
        // 5. Havuzu karıştır (böylece doğru cevap hep ilk sırada gelmez)
        finalPool.sort(() => Math.random() - 0.5);

        const isMobile = window.innerWidth < 768;
        const baseSize = isMobile ? 80 : 110;

        const newTargets = finalPool.map((word, i) => ({
            id: i,
            text: word,
            isCorrect: word === correctTarget, 
            x: Math.random() * safeWidth + offsetX,
            y: Math.random() * safeHeight + offsetY,
            vx: (Math.random() - 0.5) * (isMobile ? 1.5 : 2.5), 
            vy: (Math.random() - 0.5) * (isMobile ? 1.5 : 2.5),
            isHit: false,
            colorClass: TARGET_COLORS[i % TARGET_COLORS.length],
            size: word === correctTarget ? baseSize + 10 : baseSize 
        }));
        
        setTargets(newTargets);
    }, []);

    useEffect(() => {
        const fetchGameData = async () => {
            setGameState('loading');
            const params = {
                courseId: searchParams.get('courseId') || undefined,
                unitId: searchParams.get('unitId') || undefined,
                topicId: searchParams.get('topicId') || undefined,
            };
            const result = await getHitTheTargetAction(params);
            
            if (result.error || !result.data || result.data.length === 0) {
                setError(result.error || "Bu konu için uygun oyun verisi bulunamadı.");
            } else {
                let extendedRounds = [...result.data, ...result.data, ...result.data];
                extendedRounds = extendedRounds.sort(() => Math.random() - 0.5);
                setRounds(extendedRounds);
                setGameState('playing');
            }
            setIsLoading(false);
        };
        fetchGameData();
    }, [searchParams]);

    const handleRoundEnd = useCallback((success: boolean) => {
        setIsPaused(true);
        setGameState('round_end');

        setTimeout(() => {
            if (currentRoundIndex < rounds.length - 1) {
                const nextIndex = currentRoundIndex + 1;
                setCurrentRoundIndex(nextIndex);
                generateTargets(rounds[nextIndex]);
                setTimeLeft(30);
                setGameState('playing');
                setIsPaused(false);
            } else {
                setGameState('finished');
                playSound('win');
                const maxPossibleScore = rounds.length * 5;
                if (score >= maxPossibleScore / 2) {
                    setShowConfetti(true);
                }
            }
        }, 1500);
    }, [currentRoundIndex, rounds, generateTargets, score]);
    
    const handleManualPause = () => {
        setIsPaused(true);
        setShowPauseMenu(true);
    };

    const handleResume = () => {
        setShowPauseMenu(false);
        setIsPaused(false);
    };

    const handleManualQuit = () => {
        setShowPauseMenu(false);
        setGameState('finished');
    };

    useEffect(() => {
        if (gameState !== 'playing' || isPaused || showPauseMenu) return;

        const timerInterval = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    handleRoundEnd(false);
                    return 0;
                }
                if (prev <= 6) playSound('timer');
                return prev - 1;
            });
        }, 1000);

        const animate = () => {
            setTargets(prev => prev.map(t => {
                if (t.isHit) return t;

                let newX = t.x + t.vx;
                let newY = t.y + t.vy;
                let newVx = t.vx;
                let newVy = t.vy;

                const bounds = { w: 800, h: 500 }; 
                if (gameAreaRef.current) {
                    bounds.w = gameAreaRef.current.clientWidth;
                    bounds.h = gameAreaRef.current.clientHeight;
                }

                const radius = t.size / 2;
                if (newX < radius || newX > bounds.w - radius) newVx *= -1;
                if (newY < radius || newY > bounds.h - radius) newVy *= -1;

                return { ...t, x: newX, y: newY, vx: newVx, vy: newVy };
            }));
            requestRef.current = requestAnimationFrame(animate);
        };
        requestRef.current = requestAnimationFrame(animate);

        return () => {
            clearInterval(timerInterval);
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            stopSound('timer');
        };
    }, [gameState, isPaused, showPauseMenu, handleRoundEnd]);

    useEffect(() => {
        if (gameState === 'playing' && rounds.length > 0 && targets.length === 0 && gameAreaRef.current) {
            generateTargets(rounds[0]);
            setIsPaused(false);
        }
    }, [gameState, rounds, targets.length, generateTargets]);

    const handleHit = (target: TargetInfo, e: React.MouseEvent | React.TouchEvent) => {
        if (target.isHit || isPaused || showPauseMenu) return;
        
        let clientX, clientY;
        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = (e as React.MouseEvent).clientX;
            clientY = (e as React.MouseEvent).clientY;
        }

        const parentRect = gameAreaRef.current?.getBoundingClientRect();
        
        if (parentRect) {
            setClickEffect({ 
                x: clientX - parentRect.left,
                y: clientY - parentRect.top,
                id: Date.now() 
            });
            setTimeout(() => setClickEffect(null), 600);
        }

        setTargets(prev => prev.map(t => t.id === target.id ? { ...t, isHit: true } : t));

        if (target.isCorrect) {
            playSound('correct'); 
            setScore(prev => prev + 5); 
            handleRoundEnd(true);
        } else {
            playSound('incorrect'); 
            setScore(prev => Math.max(0, prev - 2)); 
        }
    };

    const maxScore = rounds.length * 5;
    const successThreshold = Math.ceil(maxScore / 2);
    const isSuccess = score >= successThreshold;
    const finalScoreToSave = Math.ceil(score / 2);

    const handleSaveAndExit = async () => {
        if (!user || score <= 0 || isSaving || isScoreSaved) {
            router.push(backUrl);
            return;
        }
        
        setIsSaving(true);

        try {
            if (isMission && topicId) {
                // --- GÖREV MODU KAYDI (LİDERLİK TABLOSU İÇİN GÜNCELLENDİ) ---
                const batch = writeBatch(db);

                // 1. Etkinlik Kaydı (scoreEvents)
                const eventRef = doc(collection(db, 'scoreEvents'));
                batch.set(eventRef, {
                    userId: user.uid,
                    points: finalScoreToSave,
                    context: topicId,
                    gameType: 'hedefi-vur',
                    timestamp: serverTimestamp(),
                    isMission: true,
                    completed: isSuccess
                });

                // 2. Kullanıcı Profilini Güncelleme (users -> score)
                const userRef = doc(db, 'users', user.uid);
                batch.update(userRef, {
                    score: increment(finalScoreToSave)
                });

                // İşlemleri Kaydet
                await batch.commit();

                if (isSuccess) {
                    toast({ title: "Görev Başarılı!", description: `Tebrikler! ${finalScoreToSave} XP kazandın ve kaydedildi.`, className: "bg-green-600 text-white" });
                } else {
                    toast({ title: "Görev Tamamlanamadı", description: "Başarı oranını %50'nin üzerine çıkarmalısın.", variant: "destructive" });
                }
            } else {
                // --- NORMAL MOD KAYDI ---
                const result = await submitHitTheTargetScoreAction(user.uid, finalScoreToSave, gameContext);
                if (result.success) {
                    toast({ title: 'Başarılı!', description: `Skorun (${finalScoreToSave} puan) başarıyla kaydedildi.` });
                } else {
                    toast({ title: 'Hata', description: result.error, variant: 'destructive' });
                }
            }
            
            setIsScoreSaved(true);
        } catch (e) {
            console.error(e);
            toast({ title: 'Hata', description: "Puan kaydedilemedi.", variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleRestart = () => {
        setScore(0);
        setCurrentRoundIndex(0);
        setGameState('loading');
        setIsScoreSaved(false);
        setShowConfetti(false);
        window.location.reload(); 
    };

    if (isLoading) return <div className="flex h-[100dvh] w-full items-center justify-center bg-slate-950"><Loader2 className="h-16 w-16 animate-spin text-sky-500" /></div>;
    if (error) return <div className="flex h-[100dvh] w-full items-center justify-center p-4 bg-slate-950 text-white">{error}</div>;

    if (gameState === 'finished') {
        if(isMission) {
             return (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in">
                        <Confetti active={showConfetti} config={{ angle: 90, spread: 360, startVelocity: 40, elementCount: 100, decay: 0.9 }} />
                        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl border-4 border-white/20 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-white -z-10"></div>
                            
                            <div className="mb-6 flex justify-center">
                                {isSuccess ? (
                                    <div className="p-4 bg-green-100 rounded-full border-4 border-green-200 shadow-xl animate-bounce">
                                        <Trophy className="h-16 w-16 text-green-600" />
                                    </div>
                                ) : (
                                    <div className="p-4 bg-red-100 rounded-full border-4 border-red-200 shadow-xl">
                                        <XOctagon className="h-16 w-16 text-red-500" />
                                    </div>
                                )}
                            </div>

                            <h2 className="text-3xl font-black text-slate-800 mb-2">
                                {isSuccess ? "GÖREV BAŞARILI!" : "GÖREV TAMAMLANMADI"}
                            </h2>
                            
                            <p className="text-slate-500 mb-2 font-medium">
                                {isSuccess ? "Tebrikler! Barajı geçtin." : "Maalesef barajı geçemedin."}
                            </p>
                            <p className="text-2xl font-black text-emerald-600 mb-6">{finalScoreToSave} PUAN</p>

                            <div className="space-y-3">
                                {!isScoreSaved && (
                                    <Button onClick={handleSaveAndExit} disabled={isSaving} className="w-full h-12 text-lg font-bold bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200">
                                        {isSaving ? <Loader2 className="animate-spin mr-2"/> : "Kaydet ve Devam Et"}
                                    </Button>
                                )}
                                
                                {isScoreSaved && (
                                    <Button onClick={() => router.push('/student/gorevler')} className="w-full h-12 text-lg font-bold bg-green-600 hover:bg-green-700 shadow-lg shadow-green-200">
                                        <CheckCircle className="mr-2 h-5 w-5"/> Görevlere Dön
                                    </Button>
                                )}
                                
                                {(!isSuccess || isScoreSaved) && (
                                    <Button onClick={handleRestart} variant="outline" className="w-full h-12 font-bold">
                                        <RotateCcw className="mr-2 h-4 w-4"/> Tekrar Dene
                                    </Button>
                                )}

                                <Button onClick={() => router.push(user ? '/student' : '/')} variant="ghost" className="w-full text-slate-400 hover:text-slate-600">
                                    <Home className="mr-2 h-4 w-4"/> Ana Menü
                                </Button>
                            </div>
                        </div>
                    </div>
            );
        }

        return (
            <GameEndScreen 
                score={finalScoreToSave}
                onSave={user ? handleSaveAndExit : undefined}
                isSaving={isSaving}
                scoreSaved={isScoreSaved}
                onRestart={handleRestart}
                backUrl={user ? backUrl : '/'}
            />
        );
    }

    const currentRound = rounds[currentRoundIndex];

    return (
        <div 
            ref={mainContainerRef}
            className="h-[100dvh] bg-slate-950 text-slate-100 relative overflow-hidden flex flex-col select-none touch-none"
        >
            <GameBackground />
            
            <GameHUD 
                score={score} 
                time={timeLeft} 
                round={currentRoundIndex + 1} 
                totalRounds={rounds.length} 
                onFinish={() => setGameState('finished')}
                containerRef={mainContainerRef}
            />

            {/* PAUSE MENU MODAL */}
            {showPauseMenu && (
                <PauseMenu 
                    score={score}
                    threshold={successThreshold}
                    isMission={isMission}
                    onResume={handleResume}
                    onQuit={handleManualQuit}
                />
            )}

            <main className="flex-grow flex flex-col p-2 md:p-4 relative z-10 w-full h-full max-w-6xl mx-auto">
                
                {/* Soru Paneli */}
                <div className="bg-slate-900/80 backdrop-blur-xl border border-sky-500/30 px-4 py-3 rounded-2xl text-center shadow-lg shrink-0 mb-2 transition-all duration-300">
                    <div className="flex items-center justify-center gap-2 mb-1 text-sky-400 font-bold tracking-widest text-[10px] uppercase">
                        <Target className="w-3 h-3" /> HEDEFİ BUL {isMission && <span className="text-white ml-2 bg-indigo-600 px-2 rounded-full shadow-sm">GÖREV</span>}
                    </div>
                    <p className="text-lg md:text-2xl lg:text-3xl font-black text-white leading-tight drop-shadow-md line-clamp-2">
                        {currentRound?.definition}
                    </p>
                </div>

                {/* Oyun Alanı */}
                <div 
                    ref={gameAreaRef} 
                    className="relative flex-grow w-full bg-slate-900/20 border-2 border-white/5 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-[2px] cursor-crosshair"
                >
                    {targets.map(target => (
                        !target.isHit && (
                            <div 
                                key={target.id}
                                className={cn(
                                    "absolute flex items-center justify-center rounded-full transition-transform font-black text-center select-none active:scale-90 shadow-2xl",
                                    "border-[3px] hover:scale-110",
                                    target.colorClass
                                )}
                                style={{ 
                                    width: target.size,
                                    height: target.size,
                                    transform: `translate(${target.x}px, ${target.y}px)`,
                                    fontSize: target.size / 5 
                                }}
                                onPointerDown={(e) => handleHit(target, e)}
                            >
                                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/30 to-transparent pointer-events-none" />
                                <span className="relative z-10 drop-shadow-md px-1 leading-tight pointer-events-none">{target.text}</span>
                            </div>
                        )
                    ))}

                    {clickEffect && (
                        <div className="absolute pointer-events-none z-50" style={{ left: clickEffect.x, top: clickEffect.y }}>
                            <div className="absolute -translate-x-1/2 -translate-y-1/2">
                                <Zap className="w-12 h-12 text-yellow-400 animate-bounce" />
                                <Sparkles className="absolute top-0 left-0 w-full h-full text-white animate-ping opacity-70" />
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

export default function HitTheTargetPage() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-slate-950"><Loader2 className="h-16 w-16 animate-spin text-sky-500" /></div>}>
            <HitTheTargetGame />
        </Suspense>
    );
}