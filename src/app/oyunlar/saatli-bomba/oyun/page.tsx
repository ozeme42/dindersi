'use client';

import React, { useState, useEffect, Suspense, useCallback, useRef, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
    Bomb, Flame, Scissors, Zap, ShieldCheck, Heart, Sparkles, 
    RotateCcw, Trophy, ArrowLeft, Volume2, VolumeX, AlertTriangle, 
    CheckCircle2, XCircle, Play, Timer, Skull, ZoomIn, ZoomOut
} from 'lucide-react';
import { getSaatliBombaQuestionsAction, submitSaatliBombaScoreAction, type BombQuestion } from '../actions';
import { WordwallShell, useWordwall } from '@/components/wordwall/wordwall-shell';
import { GameEndScreen } from '@/components/game-end-screen';
import { playSound } from '@/lib/audio-service';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getGameBackUrl } from '@/lib/game-navigation';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';

const WIRE_STYLES = [
    {
        id: 'red',
        name: 'KIRMIZI',
        border: 'border-red-500',
        bg: 'from-red-600 via-rose-500 to-red-700',
        glow: 'shadow-[0_0_20px_rgba(239,68,68,0.5)]',
        accent: 'bg-red-500',
        text: 'text-white',
        ring: 'ring-red-400',
        jack: 'border-red-600 bg-red-950',
    },
    {
        id: 'blue',
        name: 'MAVİ',
        border: 'border-blue-500',
        bg: 'from-blue-600 via-sky-500 to-blue-700',
        glow: 'shadow-[0_0_20px_rgba(59,130,246,0.5)]',
        accent: 'bg-blue-500',
        text: 'text-white',
        ring: 'ring-blue-400',
        jack: 'border-blue-600 bg-blue-950',
    },
    {
        id: 'amber',
        name: 'SARI',
        border: 'border-amber-400',
        bg: 'from-amber-500 via-yellow-400 to-amber-600',
        glow: 'shadow-[0_0_20px_rgba(245,158,11,0.5)]',
        accent: 'bg-amber-400',
        text: 'text-slate-950 font-black',
        ring: 'ring-amber-300',
        jack: 'border-amber-500 bg-amber-950',
    },
    {
        id: 'green',
        name: 'YEŞİL',
        border: 'border-emerald-500',
        bg: 'from-emerald-600 via-green-500 to-emerald-700',
        glow: 'shadow-[0_0_20px_rgba(16,185,129,0.5)]',
        accent: 'bg-emerald-500',
        text: 'text-white',
        ring: 'ring-emerald-400',
        jack: 'border-emerald-600 bg-emerald-950',
    },
];

const QUESTION_TIME_SECONDS = 18;

function SaatliBombaContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user } = useAuth();
    const { toast } = useToast();

    // Query Params
    const courseId = searchParams.get('courseId') || undefined;
    const unitId = searchParams.get('unitId') || undefined;
    const topicId = searchParams.get('topicId') || undefined;
    const gameName = searchParams.get('gameName') || 'Saatli Bomba';

    // Game States
    const [gameState, setGameState] = useState<'loading' | 'start' | 'playing' | 'defused' | 'exploded' | 'gameover'>('loading');
    const [questions, setQuestions] = useState<BombQuestion[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [streak, setStreak] = useState(0);
    const [lives, setLives] = useState(3);
    const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_SECONDS);
    const [cutWireIndex, setCutWireIndex] = useState<number | null>(null);
    const [fontScale, setFontScale] = useState<number>(115); // Akıllı tahta için varsayılan büyük font
    const [isShaking, setIsShaking] = useState(false);

    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const isProcessingRef = useRef(false);

    // Font boyutu yerel depolama
    useEffect(() => {
        try {
            const savedFont = localStorage.getItem('saatli_bomba_font_scale');
            if (savedFont) setFontScale(Number(savedFont));
        } catch (e) {}
    }, []);

    const changeFontScale = (delta: number) => {
        setFontScale(prev => {
            const next = Math.max(90, Math.min(160, prev + delta));
            try { localStorage.setItem('saatli_bomba_font_scale', String(next)); } catch (e) {}
            return next;
        });
    };

    // Soruları Yükle
    const loadQuestions = useCallback(async () => {
        setGameState('loading');
        try {
            const res = await getSaatliBombaQuestionsAction({ courseId, unitId, topicId });
            if (res.questions && res.questions.length > 0) {
                setQuestions(res.questions);
                setGameState('start');
            } else {
                toast({
                    title: "Soru Bulunamadı",
                    description: res.error || "Bu konu için uygun soru veya kavram verisi bulunamadı.",
                    variant: "destructive"
                });
                setGameState('start');
            }
        } catch (err) {
            console.error("Saatli bomba soru yükleme hatası:", err);
            setGameState('start');
        }
    }, [courseId, unitId, topicId, toast]);

    useEffect(() => {
        loadQuestions();
    }, [loadQuestions]);

    const currentQuestion = questions[currentIndex];

    // Oyunu Başlat
    const startGame = () => {
        if (!questions.length) return;
        setScore(0);
        setStreak(0);
        setLives(3);
        setCurrentIndex(0);
        setCutWireIndex(null);
        setTimeLeft(QUESTION_TIME_SECONDS);
        isProcessingRef.current = false;
        setGameState('playing');
        playSound('start');
    };

    // Zamanlayıcı Döngüsü
    useEffect(() => {
        if (gameState !== 'playing') {
            if (timerRef.current) clearInterval(timerRef.current);
            return;
        }

        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    if (timerRef.current) clearInterval(timerRef.current);
                    handleTimeOut();
                    return 0;
                }
                // Son 5 saniyede heyecan artırıcı tik-tak sesi
                if (prev <= 6) {
                    playSound('timer');
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [gameState, currentIndex]);

    // Süre Bittiğinde Patlama
    const handleTimeOut = () => {
        if (isProcessingRef.current) return;
        isProcessingRef.current = true;

        playSound('timeUp');
        playSound('fail');
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 700);

        setStreak(0);
        const nextLives = lives - 1;
        setLives(nextLives);
        setGameState('exploded');

        setTimeout(() => {
            if (nextLives <= 0 || currentIndex + 1 >= questions.length) {
                finishGame();
            } else {
                nextQuestion();
            }
        }, 2200);
    };

    // Kablo Kesme Eylemi
    const handleCutWire = (optIndex: number, optionText: string) => {
        if (gameState !== 'playing' || isProcessingRef.current || !currentQuestion) return;
        isProcessingRef.current = true;
        setCutWireIndex(optIndex);
        playSound('click');

        if (timerRef.current) clearInterval(timerRef.current);

        const isCorrect = optionText.trim().toLowerCase() === currentQuestion.correctAnswer.trim().toLowerCase();

        if (isCorrect) {
            // BAŞARI: Bomba İmha Edildi!
            playSound('win');
            try {
                confetti({
                    particleCount: 50,
                    spread: 70,
                    origin: { y: 0.6 }
                });
            } catch (e) {}

            const timeBonus = timeLeft * 5;
            const earnedPoints = 100 + timeBonus + (streak * 20);
            setScore(prev => prev + earnedPoints);
            setStreak(prev => prev + 1);
            setGameState('defused');

            setTimeout(() => {
                if (currentIndex + 1 >= questions.length) {
                    finishGame();
                } else {
                    nextQuestion();
                }
            }, 1400);

        } else {
            // HATA: Yanlış Kablo Kesildi, Bomba Patladı!
            playSound('fail');
            setIsShaking(true);
            setTimeout(() => setIsShaking(false), 700);

            setStreak(0);
            const nextLives = lives - 1;
            setLives(nextLives);
            setGameState('exploded');

            setTimeout(() => {
                if (nextLives <= 0 || currentIndex + 1 >= questions.length) {
                    finishGame();
                } else {
                    nextQuestion();
                }
            }, 2200);
        }
    };

    // Sonraki Soruya Geç
    const nextQuestion = () => {
        setCurrentIndex(prev => prev + 1);
        setCutWireIndex(null);
        setTimeLeft(QUESTION_TIME_SECONDS);
        isProcessingRef.current = false;
        setGameState('playing');
    };

    // Oyunu Tamamla
    const finishGame = async () => {
        if (timerRef.current) clearInterval(timerRef.current);
        setGameState('gameover');
        playSound('win');

        if (user && score > 0) {
            try {
                const context = topicId || unitId || courseId || 'Genel Kavramlar';
                await submitSaatliBombaScoreAction(user.uid, score, context);
            } catch (e) {
                console.error("Skor kaydedilemedi:", e);
            }
        }
    };

    const backUrl = getGameBackUrl({ user, searchParams, defaultBackUrl: '/oyunlar' });

    // =========================================================================
    // 1. GİRİŞ EKRANI
    // =========================================================================
    if (gameState === 'start') {
        return (
            <div className="w-full h-full flex items-center justify-center p-3 sm:p-6">
                <div className="w-full max-w-xl bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border-4 border-amber-500/50 rounded-3xl p-6 sm:p-8 shadow-2xl text-center relative overflow-hidden backdrop-blur-xl">
                    {/* Tehlike Şeritleri */}
                    <div className="absolute top-0 left-0 right-0 h-3 bg-[repeating-linear-gradient(45deg,#f59e0b,#f59e0b_12px,#0f172a_12px,#0f172a_24px)]" />

                    <div className="mx-auto w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-red-500/20 border-2 border-red-500/60 flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(239,68,68,0.4)] animate-pulse">
                        <Bomb className="w-12 h-12 sm:w-14 sm:h-14 text-red-500" />
                    </div>

                    <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-2 drop-shadow-md">
                        SAATLİ BOMBA
                    </h1>
                    <div className="inline-block px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-xs uppercase tracking-widest mb-4">
                        Kablo Kesme • Kavram İmha Operasyonu
                    </div>

                    <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6">
                        Her tur 18 saniyelik bir saatli bomba aktif olur. Bomba ekranındaki tanıma uyan kavramın 
                        <strong className="text-amber-400"> doğru renkli kablosunu keserek</strong> bombayı patlamadan imha et!
                    </p>

                    <div className="grid grid-cols-3 gap-3 mb-6 bg-slate-950/70 p-4 rounded-2xl border border-slate-800 text-center">
                        <div className="flex flex-col items-center">
                            <Heart className="w-6 h-6 text-red-500 fill-red-500 mb-1" />
                            <span className="text-xs text-slate-400">Can Hakkı</span>
                            <span className="font-bold text-white text-sm">3 Can</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <Timer className="w-6 h-6 text-amber-400 mb-1" />
                            <span className="text-xs text-slate-400">Süre</span>
                            <span className="font-bold text-white text-sm">18 Saniye</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <Scissors className="w-6 h-6 text-emerald-400 mb-1" />
                            <span className="text-xs text-slate-400">Hedef</span>
                            <span className="font-bold text-white text-sm">Doğru Kablo</span>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={startGame}
                        className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-red-600 via-amber-600 to-red-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-lg sm:text-xl shadow-[0_0_30px_rgba(239,68,68,0.5)] border-2 border-red-400/60 active:scale-95 transition-all flex items-center justify-center gap-3 cursor-pointer"
                    >
                        <Play className="w-6 h-6 fill-white" />
                        <span>GÖREVİ BAŞLAT (Bombayı Kur)</span>
                    </button>
                </div>
            </div>
        );
    }

    // =========================================================================
    // 2. OYUN SONU EKRANI
    // =========================================================================
    if (gameState === 'gameover') {
        const totalQs = questions.length;
        const rank = score >= totalQs * 100 
            ? "Kıdemli Bomba İmha Uzmanı 🎖️" 
            : score >= totalQs * 50 
                ? "Cesur Bomba Dedektifi 🕵️" 
                : "Çaylak İstihbaratçı 🛡️";

        return (
            <GameEndScreen
                score={score}
                onRestart={startGame}
                onPlayAgain={startGame}
                backUrl={backUrl}
                customMessage={`Operasyon Tamamlandı! Rütben: ${rank}`}
            />
        );
    }

    if (gameState === 'loading' || !currentQuestion) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-white gap-3">
                <Bomb className="w-12 h-12 text-red-500 animate-bounce" />
                <span className="text-lg font-bold">Saatli Bomba yükleniyor...</span>
            </div>
        );
    }

    // =========================================================================
    // 3. AKTİF OYUN EKRANI: BOMBA KONSOLU
    // =========================================================================
    const isCriticalTime = timeLeft <= 5;

    return (
        <div className={cn(
            "w-full h-full max-w-4xl mx-auto flex flex-col items-center justify-between transition-transform duration-300 select-none",
            isShaking && "animate-bomb-shake"
        )}>
            {/* INLINE CSS FOR SCREEN SHAKE & WIRE SPARK */}
            <style jsx global>{`
                @keyframes bombShake {
                    0%, 100% { transform: translate(0, 0) rotate(0deg); }
                    15% { transform: translate(-10px, 8px) rotate(-1.5deg); }
                    30% { transform: translate(10px, -8px) rotate(1.5deg); }
                    45% { transform: translate(-10px, -6px) rotate(-1deg); }
                    60% { transform: translate(8px, 8px) rotate(1deg); }
                    75% { transform: translate(-6px, 4px) rotate(-0.5deg); }
                    90% { transform: translate(6px, -4px) rotate(0.5deg); }
                }
                .animate-bomb-shake {
                    animation: bombShake 0.65s cubic-bezier(.36,.07,.19,.97) both;
                }
            `}</style>

            {/* ═══ BOMBA ANA KONSOL KASASI ═══ */}
            <div className={cn(
                "w-full flex-1 flex flex-col justify-between bg-slate-950 border-4 sm:border-[6px] border-slate-800 rounded-3xl sm:rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative overflow-hidden p-3 sm:p-5 transition-colors duration-500",
                gameState === 'defused' && "border-emerald-500/80 shadow-[0_0_40px_rgba(16,185,129,0.4)]",
                gameState === 'exploded' && "border-red-600 shadow-[0_0_50px_rgba(239,68,68,0.7)] bg-red-950/20"
            )}>
                {/* Üst Tehlike Şeridi */}
                <div className="absolute top-0 left-0 right-0 h-2 sm:h-3 bg-[repeating-linear-gradient(45deg,#f59e0b,#f59e0b_12px,#0f172a_12px,#0f172a_24px)] opacity-80" />

                {/* ═══ KONSOL ÜST PANELİ: SAYAÇ + CANLAR + SKOR ═══ */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-3 pt-1">
                    {/* Canlar */}
                    <div className="flex items-center gap-1 bg-slate-900/90 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl border border-slate-800 shadow-inner">
                        {[1, 2, 3].map(heartIdx => (
                            <Heart
                                key={heartIdx}
                                className={cn(
                                    "w-5 h-5 sm:w-6 sm:h-6 transition-all duration-300",
                                    heartIdx <= lives
                                        ? "text-red-500 fill-red-500 drop-shadow-[0_0_6px_rgba(239,68,68,0.7)] scale-100"
                                        : "text-slate-700 fill-slate-800 scale-90 opacity-40"
                                )}
                            />
                        ))}
                    </div>

                    {/* DİJİTAL LED GERİ SAYIM SAYACI (C4 TİMER) */}
                    <div className={cn(
                        "flex items-center gap-1.5 px-3 py-1 sm:px-5 sm:py-1.5 rounded-2xl border-2 font-mono font-black text-xl sm:text-3xl tracking-widest transition-all",
                        isCriticalTime
                            ? "bg-red-950/90 border-red-500 text-red-500 shadow-[0_0_25px_rgba(239,68,68,0.8)] animate-pulse"
                            : "bg-slate-900/95 border-amber-500/50 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                    )}>
                        <Timer className={cn("w-5 h-5 sm:w-6 sm:h-6", isCriticalTime && "animate-spin")} />
                        <span>00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}</span>
                    </div>

                    {/* Skor & Seri Rozeti */}
                    <div className="flex items-center gap-2">
                        {streak > 1 && (
                            <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-500/20 border border-orange-500/40 text-orange-400 text-xs font-bold animate-bounce">
                                <Flame className="w-3.5 h-3.5 fill-orange-400" />
                                <span>{streak}x Seri!</span>
                            </div>
                        )}
                        <div className="bg-slate-900/90 px-3 py-1 sm:px-4 sm:py-1.5 rounded-xl border border-slate-800 shadow-inner flex items-center gap-1.5 font-black text-amber-400 text-sm sm:text-base">
                            <Trophy className="w-4 h-4 text-amber-400" />
                            <span>{score} P</span>
                        </div>
                    </div>
                </div>

                {/* ═══ KONSOL ORTA EKRANI: KAVRAM TANIMI / GÖREV ═══ */}
                <div className="my-2 sm:my-3 relative flex-1 flex flex-col justify-center">
                    <div className={cn(
                        "w-full rounded-2xl p-4 sm:p-6 transition-all duration-300 relative border-2 text-center",
                        "bg-gradient-to-b from-slate-950 via-slate-900/90 to-slate-950 shadow-inner",
                        gameState === 'defused' 
                            ? "border-emerald-500/80 bg-emerald-950/20 shadow-[0_0_30px_rgba(16,185,129,0.3)]" 
                            : gameState === 'exploded' 
                                ? "border-red-600 bg-red-950/40 shadow-[0_0_30px_rgba(239,68,68,0.4)]"
                                : "border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.15)]"
                    )}>
                        {/* Terminal Üst Başlığı */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                <span className={cn("w-2 h-2 rounded-full", gameState === 'defused' ? "bg-emerald-400 animate-ping" : "bg-red-500 animate-pulse")} />
                                <span>BOMBA #{currentIndex + 1} / {questions.length}</span>
                            </div>

                            {/* Akıllı Tahta Yazı Boyutu Ayarlayıcı */}
                            <div className="flex items-center gap-1 bg-slate-800/80 rounded-lg p-0.5 border border-slate-700">
                                <button
                                    type="button"
                                    onClick={() => changeFontScale(-10)}
                                    className="p-1 text-slate-300 hover:text-white rounded hover:bg-slate-700 active:scale-90"
                                    title="Yazıyı Küçült"
                                >
                                    <ZoomOut className="w-3.5 h-3.5" />
                                </button>
                                <span className="text-[10px] text-slate-400 font-mono px-1">%{fontScale}</span>
                                <button
                                    type="button"
                                    onClick={() => changeFontScale(10)}
                                    className="p-1 text-slate-300 hover:text-white rounded hover:bg-slate-700 active:scale-90"
                                    title="Yazıyı Büyüt"
                                >
                                    <ZoomIn className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>

                        {/* Durum Bildirimi veya Kavram Tanımı */}
                        {gameState === 'defused' ? (
                            <div className="py-4 animate-in zoom-in-75 duration-300 flex flex-col items-center justify-center gap-1">
                                <div className="px-4 py-1 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-300 font-black text-sm uppercase tracking-widest mb-1 flex items-center gap-1.5 shadow-[0_0_20px_rgba(16,185,129,0.5)]">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                    <span>BOMBA İMHA EDİLDİ!</span>
                                </div>
                                <h3 className="text-2xl sm:text-3xl font-black text-emerald-400 tracking-tight">
                                    {currentQuestion.correctAnswer}
                                </h3>
                                <p className="text-xs text-emerald-200/80 font-semibold">+100 Puan + {timeLeft * 5} Zaman Bonusu</p>
                            </div>
                        ) : gameState === 'exploded' ? (
                            <div className="py-4 animate-in zoom-in-75 duration-300 flex flex-col items-center justify-center gap-1">
                                <div className="px-4 py-1 rounded-full bg-red-600/30 border border-red-500 text-red-300 font-black text-sm uppercase tracking-widest mb-1 flex items-center gap-1.5 shadow-[0_0_25px_rgba(239,68,68,0.7)] animate-bounce">
                                    <Flame className="w-4 h-4 text-red-400 fill-red-400" />
                                    <span>BOMBA PATLADI!</span>
                                </div>
                                <div className="text-xs sm:text-sm text-slate-300">
                                    Doğru Kavram: <strong className="text-emerald-400 font-black text-base sm:text-lg underline underline-offset-4">{currentQuestion.correctAnswer}</strong>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col justify-center min-h-[90px] sm:min-h-[110px]">
                                <p 
                                    className="font-bold text-slate-100 leading-snug drop-shadow-sm transition-all"
                                    style={{ fontSize: `${fontScale}%` }}
                                >
                                    {currentQuestion.definition}
                                </p>
                                <span className="mt-2 text-[11px] font-semibold text-amber-400/90 tracking-wide">
                                    ✂️ Doğru kavramın kablosuna dokunarak kes!
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* ═══ KONSOL ALT PANELİ: 4 RENKLİ KALIN KABLO (WIRES) ═══ */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 pt-1">
                    {currentQuestion.options.map((optionText, optIdx) => {
                        const style = WIRE_STYLES[optIdx % WIRE_STYLES.length];
                        const isCut = cutWireIndex === optIdx;
                        const isCorrectOption = optionText.trim().toLowerCase() === currentQuestion.correctAnswer.trim().toLowerCase();
                        const isRevealedWrong = gameState === 'exploded' && !isCorrectOption;
                        const isRevealedCorrect = (gameState === 'defused' || gameState === 'exploded') && isCorrectOption;

                        return (
                            <button
                                key={optIdx}
                                type="button"
                                disabled={gameState !== 'playing'}
                                onClick={() => handleCutWire(optIdx, optionText)}
                                className={cn(
                                    "group relative w-full h-14 sm:h-16 rounded-2xl flex items-center justify-between px-3 sm:px-4 transition-all duration-200 cursor-pointer border-2 shadow-lg overflow-hidden active:scale-[0.98]",
                                    // Kablo kaplaması ve rengi
                                    style.bg,
                                    style.border,
                                    style.glow,
                                    gameState === 'playing' && "hover:brightness-110 hover:shadow-2xl hover:scale-[1.01]",
                                    // Kesilmiş durum
                                    isCut && "opacity-90 ring-4 ring-white",
                                    // Patlama/Çözülme sonrası görsel vurgu
                                    isRevealedCorrect && "ring-4 ring-emerald-400 brightness-125 shadow-[0_0_30px_rgba(16,185,129,0.9)] z-10",
                                    isRevealedWrong && "opacity-35 grayscale contrast-75",
                                    gameState !== 'playing' && "cursor-default"
                                )}
                            >
                                {/* Sol Terminal Vidalı Soket */}
                                <div className={cn(
                                    "w-4 h-8 sm:w-5 sm:h-10 rounded-md border flex flex-col items-center justify-around flex-shrink-0 shadow-inner",
                                    style.jack
                                )}>
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300 shadow-sm" />
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300 shadow-sm" />
                                </div>

                                {/* Kablo Orta Hattı ve Metin */}
                                <div className="flex-1 px-3 flex items-center justify-center gap-2 relative">
                                    {/* Kesilme Efekti Çizgisi */}
                                    {isCut ? (
                                        <div className="flex items-center gap-2 animate-in zoom-in-50 duration-150">
                                            <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-black/60 text-amber-300 font-bold border border-amber-400/50 flex items-center gap-1">
                                                <Scissors className="w-3.5 h-3.5 rotate-90 text-amber-300 animate-spin" />
                                                KESİLDİ!
                                            </span>
                                            <span className={cn("font-black text-base sm:text-xl truncate tracking-wide", style.text)}>
                                                {optionText}
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 w-full justify-center">
                                            <Scissors className={cn(
                                                "w-4 h-4 opacity-75 group-hover:scale-125 group-hover:opacity-100 transition-all flex-shrink-0",
                                                style.id === 'amber' ? 'text-slate-900' : 'text-white'
                                            )} />
                                            <span className={cn(
                                                "font-black text-base sm:text-xl truncate tracking-wide text-center",
                                                style.text
                                            )}>
                                                {optionText}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Sağ Terminal Vidalı Soket */}
                                <div className={cn(
                                    "w-4 h-8 sm:w-5 sm:h-10 rounded-md border flex flex-col items-center justify-around flex-shrink-0 shadow-inner",
                                    style.jack
                                )}>
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300 shadow-sm" />
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300 shadow-sm" />
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

export default function SaatliBombaOyunPage() {
    return (
        <Suspense fallback={
            <div className="w-screen h-screen flex flex-col items-center justify-center bg-slate-950 text-white gap-3">
                <Bomb className="w-12 h-12 text-red-500 animate-spin" />
                <span className="text-lg font-bold">Saatli Bomba Açılıyor...</span>
            </div>
        }>
            <WordwallShell
                title="Saatli Bomba"
                subtitle="Kablo Kes • Bombayı İmha Et"
                showTimer={false}
                fitToScreen={true}
                contentClassName="w-full h-full min-h-0 flex flex-col items-center justify-center p-1 sm:p-3 overflow-hidden"
            >
                <SaatliBombaContent />
            </WordwallShell>
        </Suspense>
    );
}
