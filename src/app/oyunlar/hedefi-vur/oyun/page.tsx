'use client';

import React, { useState, useEffect, Suspense, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getHitTheTargetAction, submitHitTheTargetScoreAction, type HitTheTargetRound } from '../actions';
import { Loader2, Target, Zap, Sparkles, Clock, Flame, Crosshair, RefreshCw, Trophy, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { playSound } from '@/lib/audio-service';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, serverTimestamp, writeBatch, doc, increment } from 'firebase/firestore';
import { GameEndScreen } from '@/components/game-end-screen';
import Confetti from 'react-dom-confetti';
import { getGameBackUrl } from '@/lib/game-navigation';
import { WordwallShell, useWordwall } from '@/components/wordwall/wordwall-shell';

interface TargetOption {
    id: number;
    letter: string;
    text: string;
    isCorrect: boolean;
    isHit: boolean;
    isWrong: boolean;
}

const LETTERS = ['A', 'B', 'C', 'D'];

const TARGET_THEMES = [
    { ring: "border-rose-500", glow: "shadow-[0_0_25px_rgba(244,63,94,0.6)]", center: "from-rose-500 to-red-600", badge: "bg-rose-600 text-white" },
    { ring: "border-sky-500", glow: "shadow-[0_0_25px_rgba(14,165,233,0.6)]", center: "from-sky-500 to-blue-600", badge: "bg-sky-600 text-white" },
    { ring: "border-amber-500", glow: "shadow-[0_0_25px_rgba(245,158,11,0.6)]", center: "from-amber-500 to-orange-600", badge: "bg-amber-600 text-white" },
    { ring: "border-emerald-500", glow: "shadow-[0_0_25px_rgba(16,185,129,0.6)]", center: "from-emerald-500 to-green-600", badge: "bg-emerald-600 text-white" },
];

const STYLES = `
  @keyframes targetFloat {
    0%, 100% { transform: translateY(0px) scale(1); }
    50% { transform: translateY(-8px) scale(1.02); }
  }
  @keyframes laserBeam {
    0% { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(1.8); }
  }
  @keyframes bullseyePop {
    0% { transform: scale(0.6); opacity: 0; }
    50% { transform: scale(1.15); opacity: 1; }
    100% { transform: scale(1); opacity: 1; }
  }
  .float-target-0 { animation: targetFloat 3.2s ease-in-out infinite; }
  .float-target-1 { animation: targetFloat 3.8s ease-in-out infinite 0.5s; }
  .float-target-2 { animation: targetFloat 3.5s ease-in-out infinite 1s; }
  .float-target-3 { animation: targetFloat 4.1s ease-in-out infinite 1.5s; }
`;

function HedefiVurBoard({
    currentRound,
    roundIndex,
    totalRounds,
    options,
    timeLeft,
    streak,
    feedback,
    laserOrigin,
    onShoot,
}: {
    currentRound: HitTheTargetRound;
    roundIndex: number;
    totalRounds: number;
    options: TargetOption[];
    timeLeft: number;
    streak: number;
    feedback: { text: string; isCorrect: boolean } | null;
    laserOrigin: { x: number; y: number } | null;
    onShoot: (opt: TargetOption) => void;
}) {
    const { theme } = useWordwall();
    const rangeRef = useRef<HTMLDivElement>(null);

    const handleTargetClick = (opt: TargetOption, e: React.MouseEvent) => {
        onShoot(opt);
    };

    return (
        <div className="w-full h-full flex flex-col min-h-0 select-none overflow-hidden relative">
            <style jsx global>{STYLES}</style>

            {/* ÜST SORU / TANIM VİTRİNİ */}
            <div className="shrink-0 p-2 sm:p-3 z-30">
                <div className={cn(
                    "w-full max-w-4xl mx-auto p-3 sm:p-4 rounded-2xl border-2 shadow-xl backdrop-blur-md relative overflow-hidden transition-all duration-300",
                    theme.cardBg,
                    theme.cardBorder
                )}>
                    {/* Üst Bilgi Barı */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                            <span className={cn(
                                "text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border flex items-center gap-1.5",
                                theme.subPanelBg, theme.cardBorder, theme.subText
                            )}>
                                <Target className="w-3.5 h-3.5 text-rose-400" />
                                Hedef {roundIndex + 1} / {totalRounds}
                            </span>
                            {streak >= 2 && (
                                <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-orange-500/20 text-orange-400 border border-orange-500/40 animate-pulse">
                                    <Flame className="w-3.5 h-3.5" /> {streak}x Seri!
                                </span>
                            )}
                        </div>

                        {/* Geri Sayım Rozeti */}
                        <div className={cn(
                            "flex items-center gap-1.5 px-3 py-1 rounded-xl border font-black text-xs sm:text-sm tracking-wide transition-all shadow-sm",
                            timeLeft > 5
                                ? "bg-cyan-500/15 border-cyan-400/40 text-cyan-300"
                                : timeLeft > 2
                                    ? "bg-amber-500/20 border-amber-400/50 text-amber-300 animate-pulse"
                                    : "bg-rose-500/25 border-rose-400/60 text-rose-300 animate-bounce"
                        )}>
                            <Clock className={cn("w-4 h-4", timeLeft <= 3 && "animate-spin")} />
                            <span>{timeLeft} sn</span>
                        </div>
                    </div>

                    {/* Soru / Tanım Metni */}
                    <div className="py-1 px-1 text-center">
                        <p className={cn("text-base sm:text-xl md:text-2xl font-black leading-snug sm:leading-relaxed", theme.cardText)}>
                            {currentRound.definition}
                        </p>
                    </div>

                    {/* Kalan Süre Çubuğu */}
                    <div className="w-full bg-slate-800/80 h-2 rounded-full mt-2 overflow-hidden border border-white/10 relative">
                        <div 
                            className={cn(
                                "h-full transition-all duration-150 ease-linear",
                                timeLeft > 5 
                                    ? "bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400" 
                                    : timeLeft > 2 
                                        ? "bg-gradient-to-r from-amber-400 to-orange-400" 
                                        : "bg-gradient-to-r from-rose-500 to-red-600"
                            )}
                            style={{ width: `${(timeLeft / 15) * 100}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* ATIŞ POLİGONU / HEDEF ALANI */}
            <div 
                ref={rangeRef}
                className="flex-1 w-full min-h-0 relative flex items-center justify-center p-2 sm:p-4 overflow-hidden"
            >
                {/* 4 HEDEF TAHTASI GALERİSİ */}
                <div className="w-full max-w-4xl h-full max-h-[460px] grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 items-center justify-center relative z-20">
                    {options.map((opt, idx) => {
                        const targetTheme = TARGET_THEMES[idx % TARGET_THEMES.length];
                        const floatClass = `float-target-${idx}`;

                        return (
                            <div 
                                key={opt.id}
                                className={cn(
                                    "flex flex-col items-center justify-center cursor-pointer transition-all duration-200 group relative",
                                    floatClass,
                                    opt.isHit && "opacity-40 pointer-events-none scale-95",
                                    opt.isWrong && "animate-shake"
                                )}
                                onClick={(e) => handleTargetClick(opt, e)}
                            >
                                {/* HEDEF TAHTASI (BULLSEYE) */}
                                <div className={cn(
                                    "relative w-28 h-28 sm:w-36 sm:h-36 md:w-40 md:h-40 rounded-full border-4 flex items-center justify-center transition-transform duration-200 group-hover:scale-105 group-active:scale-95 shadow-2xl backdrop-blur-md bg-slate-950/70",
                                    targetTheme.ring,
                                    targetTheme.glow
                                )}>
                                    {/* Dış Halka Çizgileri */}
                                    <div className="absolute inset-2 rounded-full border-2 border-white/20 pointer-events-none" />
                                    <div className="absolute inset-5 rounded-full border-2 border-white/30 pointer-events-none" />
                                    
                                    {/* Merkez Bullseye Çekirdeği */}
                                    <div className={cn(
                                        "w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br flex items-center justify-center shadow-inner relative",
                                        targetTheme.center
                                    )}>
                                        <Crosshair className="w-6 h-6 sm:w-8 sm:h-8 text-white/90 animate-pulse" />
                                    </div>

                                    {/* Şık Harf Rozeti ([A], [B], [C], [D]) */}
                                    <div className={cn(
                                        "absolute -top-2 -left-2 sm:top-0 sm:left-0 w-8 h-8 rounded-full font-black text-sm flex items-center justify-center shadow-lg border-2 border-white/50",
                                        targetTheme.badge
                                    )}>
                                        {opt.letter}
                                    </div>

                                    {/* Vuruldu Efekti */}
                                    {opt.isHit && (
                                        <div className="absolute inset-0 rounded-full bg-emerald-500/40 backdrop-blur-xs flex items-center justify-center">
                                            <span className="text-white text-3xl font-black drop-shadow-md">✓</span>
                                        </div>
                                    )}

                                    {opt.isWrong && (
                                        <div className="absolute inset-0 rounded-full bg-rose-600/60 backdrop-blur-xs flex items-center justify-center">
                                            <span className="text-white text-3xl font-black drop-shadow-md">✕</span>
                                        </div>
                                    )}
                                </div>

                                {/* HEDEF METİN LEVHASI */}
                                <div className={cn(
                                    "mt-2 sm:mt-3 px-3 py-1.5 sm:py-2 rounded-xl border-2 text-center max-w-full shadow-lg transition-all backdrop-blur-md",
                                    opt.isWrong 
                                        ? "border-rose-500 bg-rose-950/80 text-rose-300 line-through opacity-70"
                                        : cn(theme.cardBg, theme.cardBorder, "group-hover:border-cyan-400")
                                )}>
                                    <span className={cn(
                                        "font-black text-xs sm:text-sm md:text-base leading-tight block truncate",
                                        theme.cardText
                                    )}>
                                        {opt.text}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* ANLIK GERİ BİLDİRİM BALONU */}
                {feedback && (
                    <div className={cn(
                        "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none px-6 py-3 rounded-2xl border-4 shadow-2xl text-center text-xl sm:text-2xl font-black animate-in zoom-in-75 duration-200",
                        feedback.isCorrect 
                            ? "bg-emerald-600 border-emerald-300 text-white shadow-emerald-500/60" 
                            : "bg-rose-600 border-rose-300 text-white shadow-rose-500/60"
                    )}>
                        {feedback.text}
                    </div>
                )}
            </div>

            {/* DOKUNMATİK VE KLAVYE DESTEKLİ HIZLI ATİŞ BUTONLARI */}
            <div className="relative z-40 p-2 sm:p-3 bg-black/80 backdrop-blur-md border-t border-white/10 flex items-stretch gap-2 max-w-4xl mx-auto w-full">
                {options.map((opt) => (
                    <button
                        key={opt.id}
                        type="button"
                        disabled={opt.isHit || opt.isWrong}
                        onClick={() => onShoot(opt)}
                        className={cn(
                            "flex-1 py-2 sm:py-3 px-2 sm:px-3 rounded-xl border-2 font-black transition-all active:scale-95 shadow-md flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 text-center min-w-0 cursor-pointer",
                            opt.isWrong
                                ? "opacity-30 border-rose-900 bg-rose-950/20 text-rose-400 line-through cursor-not-allowed"
                                : cn(theme.buttonIdle, theme.cardBorder, "hover:border-cyan-400 hover:text-cyan-300")
                        )}
                    >
                        <span className="text-[10px] sm:text-xs font-black uppercase px-2 py-0.5 rounded-md bg-white/10 shrink-0">
                            [{opt.letter}]
                        </span>
                        <span className="font-extrabold text-xs sm:text-sm truncate max-w-full">
                            {opt.text}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}

function HitTheTargetGame() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const { toast } = useToast();

    const [rounds, setRounds] = useState<HitTheTargetRound[]>([]);
    const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
    const [options, setOptions] = useState<TargetOption[]>([]);
    const [score, setScore] = useState(0);
    const [correctHits, setCorrectHits] = useState(0);
    const [streak, setStreak] = useState(0);
    const [timeLeft, setTimeLeft] = useState(15);
    const [gameState, setGameState] = useState<'loading' | 'home' | 'playing' | 'finished' | 'error'>('loading');
    const [error, setError] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<{ text: string; isCorrect: boolean } | null>(null);

    const [isSaving, setIsSaving] = useState(false);
    const [isScoreSaved, setIsScoreSaved] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);

    const isAnsweringRef = useRef(false);

    const mode = searchParams.get('mode');
    const topicId = searchParams.get('topicId');
    const isMission = mode === 'mission';

    const topicName = searchParams.get('topicName') || searchParams.get('courseName') || 'Hedefi Vur';
    const gameContext = `Hedefi Vur - ${searchParams.get('courseName') || 'Genel'} > ${topicName}`;
    const backUrl = getGameBackUrl({ user, searchParams, defaultBackUrl: '/oyunlar/hedefi-vur' });

    // Soru ve Veri Yükleme
    useEffect(() => {
        const fetchRounds = async () => {
            try {
                const params = {
                    courseId: searchParams.get('courseId') || undefined,
                    unitId: searchParams.get('unitId') || undefined,
                    topicId: searchParams.get('topicId') || undefined,
                };
                const result = await getHitTheTargetAction(params);
                if (result.error || !result.data || result.data.length === 0) {
                    setError(result.error || "Bu konu için soru bulunamadı.");
                    setGameState('error');
                } else {
                    setRounds(result.data);
                    setGameState('home');
                }
            } catch (err: any) {
                setError(err.message || "Veriler alınırken hata oluştu.");
                setGameState('error');
            }
        };
        fetchRounds();
    }, [searchParams]);

    // Raunt için seçenekleri hazırla
    const setupRound = useCallback((round: HitTheTargetRound) => {
        const words = round.words && round.words.length > 0 ? round.words : [round.target, "Ahlak", "İbadet", "İnanç"];
        const shuffledWords = [...words].sort(() => 0.5 - Math.random());
        
        const newOpts: TargetOption[] = shuffledWords.slice(0, 4).map((w, idx) => ({
            id: idx,
            letter: LETTERS[idx] || `${idx + 1}`,
            text: w,
            isCorrect: w.trim().toLocaleLowerCase('tr-TR') === round.target.trim().toLocaleLowerCase('tr-TR'),
            isHit: false,
            isWrong: false,
        }));

        setOptions(newOpts);
        setTimeLeft(15);
        setFeedback(null);
        isAnsweringRef.current = false;
    }, []);

    // Oyunu Başlat
    const startGame = () => {
        if (rounds.length === 0) return;
        setScore(0);
        setCorrectHits(0);
        setStreak(0);
        setCurrentRoundIndex(0);
        setIsScoreSaved(false);
        setupRound(rounds[0]);
        setGameState('playing');
        playSound('pop');
    };

    // Süre Sayacı
    useEffect(() => {
        if (gameState !== 'playing' || isAnsweringRef.current) return;

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    handleTimeOut();
                    return 0;
                }
                if (prev <= 4) {
                    playSound('timer');
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [gameState, currentRoundIndex]);

    // Süre Dolduğunda
    const handleTimeOut = () => {
        if (isAnsweringRef.current) return;
        isAnsweringRef.current = true;
        playSound('incorrect');
        setStreak(0);
        setFeedback({ text: "⏱️ SÜRE DOLDU!", isCorrect: false });

        setTimeout(() => {
            advanceRound();
        }, 900);
    };

    // Hedefe Atış Yap
    const handleShoot = (target: TargetOption) => {
        if (isAnsweringRef.current || gameState !== 'playing' || target.isHit || target.isWrong) return;

        playSound('click');

        if (target.isCorrect) {
            isAnsweringRef.current = true;
            playSound('correct');
            const streakBonus = streak >= 2 ? 5 : 0;
            const points = 10 + streakBonus;
            
            setScore(s => s + points);
            setCorrectHits(c => c + 1);
            setStreak(st => st + 1);
            setFeedback({ text: `🎯 TAM İSABET! +${points} P`, isCorrect: true });
            setShowConfetti(true);
            setTimeout(() => setShowConfetti(false), 1200);

            setOptions(prev => prev.map(o => o.id === target.id ? { ...o, isHit: true } : o));

            setTimeout(() => {
                advanceRound();
            }, 800);
        } else {
            playSound('incorrect');
            setStreak(0);
            setScore(s => Math.max(0, s - 2));
            setFeedback({ text: `❌ YANLIŞ HEDEF! (-2 P)`, isCorrect: false });
            setOptions(prev => prev.map(o => o.id === target.id ? { ...o, isWrong: true } : o));

            setTimeout(() => {
                setFeedback(null);
            }, 600);
        }
    };

    // Sıradaki Soruya Geç
    const advanceRound = () => {
        setFeedback(null);
        const nextIdx = currentRoundIndex + 1;
        if (nextIdx >= rounds.length) {
            setGameState('finished');
        } else {
            setCurrentRoundIndex(nextIdx);
            setupRound(rounds[nextIdx]);
        }
    };

    // Klavye Kontrolleri (1, 2, 3, 4 veya A, B, C, D)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (gameState !== 'playing' || isAnsweringRef.current) return;

            let targetIdx = -1;
            if (e.key === '1' || e.key === 'a' || e.key === 'A') targetIdx = 0;
            if (e.key === '2' || e.key === 'b' || e.key === 'B') targetIdx = 1;
            if (e.key === '3' || e.key === 'c' || e.key === 'C') targetIdx = 2;
            if (e.key === '4' || e.key === 'd' || e.key === 'D') targetIdx = 3;

            if (targetIdx !== -1 && options[targetIdx]) {
                e.preventDefault();
                handleShoot(options[targetIdx]);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [gameState, options]);

    // Skor Kaydı
    const minRequiredHits = Math.max(1, Math.ceil((rounds.length || 5) / 2));
    const isThresholdPassed = correctHits >= minRequiredHits;
    const finalScoreToSave = score;

    const handleSaveAndExit = async () => {
        if (!user || score <= 0 || isSaving || isScoreSaved) {
            router.push(backUrl);
            return;
        }
        setIsSaving(true);
        try {
            if (isMission && topicId) {
                const batch = writeBatch(db);
                const eventRef = doc(collection(db, 'scoreEvents'));
                batch.set(eventRef, {
                    userId: user.uid,
                    points: finalScoreToSave,
                    context: topicId,
                    gameType: 'Hedefi Vur',
                    timestamp: serverTimestamp(),
                    isMission: true,
                    completed: isThresholdPassed,
                });

                const userRef = doc(db, 'users', user.uid);
                batch.update(userRef, {
                    score: increment(finalScoreToSave),
                });

                await batch.commit();
                toast({ title: isThresholdPassed ? "Görev Başarılı!" : "Skor Kaydedildi", description: `${finalScoreToSave} XP kaydedildi.` });
            } else {
                const result = await submitHitTheTargetScoreAction(user.uid, finalScoreToSave, gameContext);
                if (result.success) {
                    toast({ title: 'Başarılı!', description: `Skorun (${finalScoreToSave} puan) başarıyla kaydedildi.` });
                } else {
                    toast({ title: 'Hata', description: result.error, variant: 'destructive' });
                }
            }
            setIsScoreSaved(true);
        } catch (e) {
            toast({ title: 'Hata', description: "Puan kaydedilemedi.", variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    if (gameState === 'loading') {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-slate-950 text-white">
                <Loader2 className="h-14 w-14 animate-spin text-rose-500" />
            </div>
        );
    }

    if (gameState === 'error') {
        return (
            <div className="flex h-screen w-full items-center justify-center p-4 bg-slate-950 text-white">
                <div className="text-center space-y-4 max-w-sm bg-slate-900 border border-red-500/30 p-8 rounded-3xl">
                    <p className="text-red-400 font-bold">{error}</p>
                    <button onClick={() => router.push(backUrl)} className="w-full py-3 bg-slate-800 hover:bg-slate-700 font-bold rounded-xl">Geri Dön</button>
                </div>
            </div>
        );
    }

    // Lobi Ekranı
    if (gameState === 'home') {
        return (
            <WordwallShell
                title="Hedefi Vur"
                subtitle={topicName}
                backUrl={backUrl}
                fitToScreen={true}
                contentClassName="w-full h-full min-h-0 overflow-hidden relative flex flex-col items-center justify-center p-4"
            >
                <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl border-2 shadow-2xl backdrop-blur-xl flex flex-col items-center text-center gap-6 bg-slate-900/90 border-rose-500/40">
                    <div className="w-18 h-18 rounded-full flex items-center justify-center bg-rose-500/20 text-rose-400 border border-rose-400/40">
                        <Target className="w-10 h-10 animate-bounce" />
                    </div>

                    <div>
                        <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-white">
                            Hedefi Vur
                        </h1>
                        <p className="text-sm font-medium mt-2 text-slate-300">
                            Tanımı dikkatlice oku, poligon levhalarından doğru kavramın olduğu hedefi vur!
                        </p>
                    </div>

                    <div className="w-full flex flex-col gap-3">
                        <button
                            type="button"
                            onClick={startGame}
                            className="w-full py-4 rounded-2xl bg-gradient-to-r from-rose-600 via-red-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-black text-lg shadow-xl cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            <Target className="w-5 h-5" /> Atışa Başla!
                        </button>
                    </div>

                    <div className="text-xs font-bold px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-slate-400 flex items-center gap-2">
                        <span>🎮 Kontroller:</span>
                        <span>Doğrudan hedefe dokun veya 1, 2, 3, 4 tuşlarını kullan</span>
                    </div>
                </div>
            </WordwallShell>
        );
    }

    const currentRound = rounds[currentRoundIndex];

    return (
        <WordwallShell
            title="Hedefi Vur"
            subtitle={topicName}
            currentQuestionIndex={currentRoundIndex + 1}
            totalQuestions={rounds.length}
            score={score}
            backUrl={backUrl}
            isFinished={gameState === 'finished'}
            fitToScreen={true}
            contentClassName="w-full h-full min-h-0 overflow-hidden relative select-none touch-none p-0 flex flex-col"
        >
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50">
                <Confetti active={showConfetti} config={{ elementCount: 120, spread: 360 }} />
            </div>

            {gameState === 'finished' ? (
                <div className="w-full max-w-xl mx-auto my-auto animate-in zoom-in-95 duration-300 p-4">
                    <GameEndScreen 
                        score={finalScoreToSave}
                        onSave={user ? handleSaveAndExit : undefined}
                        isSaving={isSaving}
                        scoreSaved={isScoreSaved}
                        onRestart={startGame}
                        backUrl={backUrl}
                        isSuccess={isThresholdPassed}
                        successThreshold={50}
                        isMission={isMission}
                        customMessage={
                            isMission 
                                ? (isThresholdPassed 
                                    ? `Tebrikler! ${correctHits}/${rounds.length} hedefi doğru vurarak %50 barajını geçtin.`
                                    : `Maalesef ${correctHits}/${rounds.length} hedef vurdun. Görevi geçmek için en az %50 başarı (${minRequiredHits} doğru hedef) sağlamalısın.`)
                                : undefined
                        }
                    />
                </div>
            ) : (
                <HedefiVurBoard
                    currentRound={currentRound}
                    roundIndex={currentRoundIndex}
                    totalRounds={rounds.length}
                    options={options}
                    timeLeft={timeLeft}
                    streak={streak}
                    feedback={feedback}
                    laserOrigin={null}
                    onShoot={handleShoot}
                />
            )}
        </WordwallShell>
    );
}

export default function HitTheTargetPage() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-slate-950"><Loader2 className="h-16 w-16 animate-spin text-rose-500" /></div>}>
            <HitTheTargetGame />
        </Suspense>
    );
}