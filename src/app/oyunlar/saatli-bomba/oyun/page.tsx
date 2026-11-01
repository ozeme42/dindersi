'use client';

import React, { useState, useEffect, Suspense, useCallback, useRef, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
    Bomb, Flame, Scissors, Zap, ShieldCheck, Heart, Sparkles, 
    RotateCcw, Trophy, ArrowLeft, Volume2, VolumeX, AlertTriangle, 
    CheckCircle2, XCircle, Play, Timer, Skull, ZoomIn, ZoomOut,
    Users, User, Crown, Award, Swords, HelpCircle
} from 'lucide-react';
import { getSaatliBombaQuestionsAction, submitSaatliBombaScoreAction, type BombQuestion } from '../actions';
import { WordwallShell } from '@/components/wordwall/wordwall-shell';
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
        border: 'border-red-400 border-b-red-800',
        bg: 'from-red-600 via-rose-600 to-red-800',
        glow: 'shadow-[0_0_25px_rgba(239,68,68,0.5)]',
        accent: 'bg-red-500',
        text: 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]',
        ring: 'ring-red-400',
        jack: 'border-red-500 bg-red-950',
    },
    {
        id: 'blue',
        name: 'MAVİ',
        border: 'border-blue-400 border-b-blue-800',
        bg: 'from-blue-600 via-sky-600 to-blue-800',
        glow: 'shadow-[0_0_25px_rgba(59,130,246,0.5)]',
        accent: 'bg-blue-500',
        text: 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]',
        ring: 'ring-blue-400',
        jack: 'border-blue-500 bg-blue-950',
    },
    {
        id: 'purple',
        name: 'MOR',
        border: 'border-purple-400 border-b-purple-800',
        bg: 'from-purple-600 via-violet-600 to-purple-800',
        glow: 'shadow-[0_0_25px_rgba(168,85,247,0.5)]',
        accent: 'bg-purple-500',
        text: 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]',
        ring: 'ring-purple-400',
        jack: 'border-purple-500 bg-purple-950',
    },
    {
        id: 'green',
        name: 'YEŞİL',
        border: 'border-emerald-400 border-b-emerald-800',
        bg: 'from-emerald-600 via-green-600 to-emerald-800',
        glow: 'shadow-[0_0_25px_rgba(16,185,129,0.5)]',
        accent: 'bg-emerald-500',
        text: 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]',
        ring: 'ring-emerald-400',
        jack: 'border-emerald-500 bg-emerald-950',
    },
];

const DEFAULT_TEAMS = [
    { id: 0, name: 'Kırmızı Takım', color: 'red', bg: 'bg-red-500/20', border: 'border-red-500', text: 'text-red-400', badge: 'bg-red-600 text-white' },
    { id: 1, name: 'Mavi Takım', color: 'blue', bg: 'bg-blue-500/20', border: 'border-blue-500', text: 'text-blue-400', badge: 'bg-blue-600 text-white' },
    { id: 2, name: 'Yeşil Takım', color: 'green', bg: 'bg-emerald-500/20', border: 'border-emerald-500', text: 'text-emerald-400', badge: 'bg-emerald-600 text-white' },
    { id: 3, name: 'Mor Takım', color: 'purple', bg: 'bg-purple-500/20', border: 'border-purple-500', text: 'text-purple-400', badge: 'bg-purple-600 text-white' },
];

const QUESTION_TIME_SECONDS = 18;

// Fisher-Yates Dizilim Karıştırıcı
function shuffleArray<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

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

    // Game Mode State: 'solo' | 'team' | 'duel'
    const [gameMode, setGameMode] = useState<'solo' | 'team' | 'duel'>('duel');
    
    // Takım Modu Durumu
    const [teamCount, setTeamCount] = useState<number>(2);
    const [teamScores, setTeamScores] = useState<number[]>([0, 0, 0, 0]);
    const [activeTeamIndex, setActiveTeamIndex] = useState<number>(0);

    // Yan Yana Düello Durumu (P1 ve P2 Skorları & Seçenekleri)
    const [p1Score, setP1Score] = useState<number>(0);
    const [p2Score, setP2Score] = useState<number>(0);
    const [p1CutIndex, setP1CutIndex] = useState<number | null>(null);
    const [p2CutIndex, setP2CutIndex] = useState<number | null>(null);
    const [p1Status, setP1Status] = useState<'idle' | 'defused' | 'exploded'>('idle');
    const [p2Status, setP2Status] = useState<'idle' | 'defused' | 'exploded'>('idle');
    const [roundWinner, setRoundWinner] = useState<'p1' | 'p2' | 'timeout' | null>(null);

    // Genel Oyun Durumları
    const [gameState, setGameState] = useState<'loading' | 'start' | 'playing' | 'defused' | 'exploded' | 'gameover'>('loading');
    const [questions, setQuestions] = useState<BombQuestion[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [streak, setStreak] = useState(0);
    const [lives, setLives] = useState(3);
    const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_SECONDS);
    const [cutWireIndex, setCutWireIndex] = useState<number | null>(null);
    const [fontScale, setFontScale] = useState<number>(125);
    const [isShaking, setIsShaking] = useState(false);

    // Düelloda her oyuncuya FARKLI sıralamayla seçenek sunma
    const [p1Options, setP1Options] = useState<string[]>([]);
    const [p2Options, setP2Options] = useState<string[]>([]);

    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const isProcessingRef = useRef(false);

    // Font boyutu yerel depolama
    useEffect(() => {
        try {
            const savedFont = localStorage.getItem('saatli_bomba_font_scale');
            if (savedFont) {
                const parsed = Number(savedFont);
                if (parsed >= 90 && parsed <= 180) setFontScale(parsed);
            }
        } catch (e) {}
    }, []);

    const changeFontScale = (delta: number) => {
        setFontScale(prev => {
            const next = Math.max(90, Math.min(180, prev + delta));
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
    const currentTeam = DEFAULT_TEAMS[activeTeamIndex];

    // Her soru değiştiğinde P1 ve P2 için seçenekleri FARKLI sıralamayla hazırla
    useEffect(() => {
        if (!currentQuestion) return;
        const o1 = shuffleArray(currentQuestion.options);
        let o2 = shuffleArray(currentQuestion.options);
        // İki oyuncunun seçenek sırasının birebir aynı olmasını engelle
        if (o1.length > 1 && o1.every((val, idx) => val === o2[idx])) {
            o2 = [o2[o2.length - 1], ...o2.slice(0, o2.length - 1)];
        }
        setP1Options(o1);
        setP2Options(o2);
        setP1CutIndex(null);
        setP2CutIndex(null);
        setP1Status('idle');
        setP2Status('idle');
        setRoundWinner(null);
    }, [currentQuestion, currentIndex]);

    // Oyunu Başlat
    const startGame = () => {
        if (!questions.length) return;
        setScore(0);
        setStreak(0);
        setLives(3);
        setTeamScores([0, 0, 0, 0]);
        setActiveTeamIndex(0);
        setP1Score(0);
        setP2Score(0);
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
        setRoundWinner('timeout');
        setP1Status('exploded');
        setP2Status('exploded');
        setGameState('exploded');

        setTimeout(() => {
            if ((gameMode === 'solo' && lives - 1 <= 0) || currentIndex + 1 >= questions.length) {
                finishGame();
            } else {
                nextQuestion();
            }
        }, 2200);
    };

    // ═══ DÜELLO MODU: OYUNCU 1 VE OYUNCU 2'NİN HAMLELERİ ═══
    const handleDuelWireCut = (player: 'p1' | 'p2', optIndex: number, optionText: string) => {
        if (gameState !== 'playing' || !currentQuestion) return;
        if (player === 'p1' && (p1Status !== 'idle' || roundWinner !== null)) return;
        if (player === 'p2' && (p2Status !== 'idle' || roundWinner !== null)) return;

        playSound('click');
        const isCorrect = optionText.trim().toLowerCase() === currentQuestion.correctAnswer.trim().toLowerCase();

        if (isCorrect) {
            // İLK DOĞRU KESEN KAZANIR! Tur kilitlenir.
            if (timerRef.current) clearInterval(timerRef.current);
            isProcessingRef.current = true;
            playSound('win');

            try {
                confetti({
                    particleCount: 50,
                    spread: 70,
                    origin: { x: player === 'p1' ? 0.3 : 0.7, y: 0.6 }
                });
            } catch (e) {}

            if (player === 'p1') {
                setP1CutIndex(optIndex);
                setP1Status('defused');
                setP1Score(prev => prev + 1);
                setRoundWinner('p1');
            } else {
                setP2CutIndex(optIndex);
                setP2Status('defused');
                setP2Score(prev => prev + 1);
                setRoundWinner('p2');
            }

            setGameState('defused');

            setTimeout(() => {
                if (currentIndex + 1 >= questions.length) {
                    finishGame();
                } else {
                    nextQuestion();
                }
            }, 1600);

        } else {
            // YANLIŞ KABLO: O oyuncunun tarafı patlar, diğeri devam edebilir!
            playSound('fail');
            setIsShaking(true);
            setTimeout(() => setIsShaking(false), 600);

            if (player === 'p1') {
                setP1CutIndex(optIndex);
                setP1Status('exploded');
            } else {
                setP2CutIndex(optIndex);
                setP2Status('exploded');
            }

            // Eğer iki oyuncu da yanlış yaptıysa tur biter
            const otherFailed = player === 'p1' ? p2Status === 'exploded' : p1Status === 'exploded';
            if (otherFailed) {
                if (timerRef.current) clearInterval(timerRef.current);
                isProcessingRef.current = true;
                setRoundWinner('timeout');
                setGameState('exploded');

                setTimeout(() => {
                    if (currentIndex + 1 >= questions.length) {
                        finishGame();
                    } else {
                        nextQuestion();
                    }
                }, 2000);
            }
        }
    };

    // ═══ STANDART MODLAR: BİREYSEL VEYA TAKIMLI HAMLE ═══
    const handleCutWire = (optIndex: number, optionText: string) => {
        if (gameState !== 'playing' || isProcessingRef.current || !currentQuestion) return;
        isProcessingRef.current = true;
        setCutWireIndex(optIndex);
        playSound('click');

        if (timerRef.current) clearInterval(timerRef.current);

        const isCorrect = optionText.trim().toLowerCase() === currentQuestion.correctAnswer.trim().toLowerCase();

        if (isCorrect) {
            playSound('win');
            try {
                confetti({
                    particleCount: 60,
                    spread: 80,
                    origin: { y: 0.6 }
                });
            } catch (e) {}

            const timeBonus = timeLeft * 5;
            const earnedPoints = 100 + timeBonus + (streak * 20);

            if (gameMode === 'solo') {
                setScore(prev => prev + earnedPoints);
                setStreak(prev => prev + 1);
            } else {
                setTeamScores(prev => {
                    const next = [...prev];
                    next[activeTeamIndex] = (next[activeTeamIndex] || 0) + earnedPoints;
                    return next;
                });
                setScore(prev => prev + earnedPoints);
            }

            setGameState('defused');

            setTimeout(() => {
                if (currentIndex + 1 >= questions.length) {
                    finishGame();
                } else {
                    nextQuestion();
                }
            }, 1500);

        } else {
            playSound('fail');
            setIsShaking(true);
            setTimeout(() => setIsShaking(false), 700);

            setStreak(0);

            if (gameMode === 'solo') {
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
            } else {
                setGameState('exploded');
                setTimeout(() => {
                    if (currentIndex + 1 >= questions.length) {
                        finishGame();
                    } else {
                        nextQuestion();
                    }
                }, 2200);
            }
        }
    };

    // Sonraki Soruya Geç
    const nextQuestion = () => {
        setCurrentIndex(prev => prev + 1);
        setCutWireIndex(null);
        setTimeLeft(QUESTION_TIME_SECONDS);
        isProcessingRef.current = false;
        
        if (gameMode === 'team') {
            setActiveTeamIndex(prev => (prev + 1) % teamCount);
        }
        
        setGameState('playing');
    };

    // Oyunu Tamamla
    const finishGame = async () => {
        if (timerRef.current) clearInterval(timerRef.current);
        setGameState('gameover');
        playSound('win');

        if (user && score > 0 && gameMode === 'solo') {
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
    // 1. GİRİŞ & MOD SEÇİM EKRANI
    // =========================================================================
    if (gameState === 'start') {
        return (
            <div className="w-full h-full flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
                <div className="w-full max-w-xl bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border-4 border-amber-500/50 rounded-3xl p-5 sm:p-8 shadow-2xl text-center relative overflow-hidden backdrop-blur-xl my-auto">
                    {/* Tehlike Şeritleri */}
                    <div className="absolute top-0 left-0 right-0 h-3 bg-[repeating-linear-gradient(45deg,#f59e0b,#f59e0b_12px,#0f172a_12px,#0f172a_24px)]" />

                    <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-red-500/20 border-2 border-red-500/60 flex items-center justify-center mb-3 shadow-[0_0_30px_rgba(239,68,68,0.4)] animate-pulse">
                        <Bomb className="w-10 h-10 sm:w-12 sm:h-12 text-red-500" />
                    </div>

                    <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight mb-1 drop-shadow-md">
                        SAATLİ BOMBA
                    </h1>
                    <div className="inline-block px-3 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-xs uppercase tracking-widest mb-4">
                        Kablo Kesme • Kavram İmha Operasyonu
                    </div>

                    {/* MOD SEÇİMİ: DÜELLO vs TAKIMLI vs BİREYSEL */}
                    <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-slate-950/80 rounded-2xl border border-slate-800 mb-4">
                        <button
                            type="button"
                            onClick={() => setGameMode('duel')}
                            className={cn(
                                "py-2 px-1.5 rounded-xl font-black text-xs sm:text-sm flex flex-col sm:flex-row items-center justify-center gap-1 transition-all cursor-pointer",
                                gameMode === 'duel'
                                    ? "bg-gradient-to-r from-red-600 to-blue-600 text-white shadow-lg border border-cyan-400 scale-[1.02]"
                                    : "text-slate-400 hover:text-slate-200"
                            )}
                        >
                            <Swords className="w-4 h-4 text-amber-300" />
                            <span>Canlı Düello (2 Kişi)</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setGameMode('team')}
                            className={cn(
                                "py-2 px-1.5 rounded-xl font-black text-xs sm:text-sm flex flex-col sm:flex-row items-center justify-center gap-1 transition-all cursor-pointer",
                                gameMode === 'team'
                                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg border border-indigo-400 scale-[1.02]"
                                    : "text-slate-400 hover:text-slate-200"
                            )}
                        >
                            <Users className="w-4 h-4 text-indigo-300" />
                            <span>Takım Yarışı</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setGameMode('solo')}
                            className={cn(
                                "py-2 px-1.5 rounded-xl font-black text-xs sm:text-sm flex flex-col sm:flex-row items-center justify-center gap-1 transition-all cursor-pointer",
                                gameMode === 'solo'
                                    ? "bg-gradient-to-r from-amber-600 to-red-600 text-white shadow-lg border border-amber-400 scale-[1.02]"
                                    : "text-slate-400 hover:text-slate-200"
                            )}
                        >
                            <User className="w-4 h-4 text-amber-300" />
                            <span>Bireysel Mod</span>
                        </button>
                    </div>

                    {/* MOD BİLGİLENDİRME KUTUSU */}
                    {gameMode === 'duel' ? (
                        <div className="mb-5 bg-gradient-to-r from-red-950/40 via-slate-950/80 to-blue-950/40 p-4 rounded-2xl border border-cyan-500/40 text-left">
                            <div className="flex items-center gap-2 mb-2 justify-center">
                                <span className="px-2.5 py-1 rounded-lg bg-red-600 text-white text-xs font-black">🔴 1. Oyuncu (Sol)</span>
                                <span className="text-amber-400 font-black text-xs">VS</span>
                                <span className="px-2.5 py-1 rounded-lg bg-blue-600 text-white text-xs font-black">🔵 2. Oyuncu (Sağ)</span>
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed text-center">
                                İki öğrenci akıllı tahtaya çıkar. Aynı tanım sorulur ancak <strong className="text-amber-300">kablo dizilişleri her iki oyuncuda farklıdır</strong> (kopya çekilemez). Doğru kabloyu ilk kesen puanı kapar!
                            </p>
                            <div className="mt-2.5 py-1 px-3 bg-amber-500/10 rounded-xl border border-amber-500/30 text-[11px] text-amber-300 font-bold text-center">
                                🔄 Kalıcı Öğrenme: Her kavram oyun boyunca en az 3 kez farklı turlarda sorulur!
                            </div>
                        </div>
                    ) : gameMode === 'team' ? (
                        <div className="mb-5 bg-slate-950/70 p-4 rounded-2xl border border-slate-800 text-left">
                            <span className="text-xs font-bold text-slate-300 block mb-2 text-center">
                                Takım Sayısını Belirleyin:
                            </span>
                            <div className="grid grid-cols-3 gap-2">
                                {[2, 3, 4].map(num => (
                                    <button
                                        key={num}
                                        type="button"
                                        onClick={() => setTeamCount(num)}
                                        className={cn(
                                            "py-2 px-3 rounded-xl font-black text-xs sm:text-sm border transition-all cursor-pointer text-center",
                                            teamCount === num
                                                ? "bg-indigo-600 border-indigo-400 text-white shadow-md scale-105"
                                                : "bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200"
                                        )}
                                    >
                                        {num} Takım
                                    </button>
                                ))}
                            </div>
                            <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
                                {DEFAULT_TEAMS.slice(0, teamCount).map((t, idx) => (
                                    <span key={idx} className={cn("px-2.5 py-1 rounded-lg text-xs font-bold border", t.bg, t.border, t.text)}>
                                        {t.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 gap-3 mb-5 bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800 text-center">
                            <div className="flex flex-col items-center">
                                <Heart className="w-5 h-5 text-red-500 fill-red-500 mb-1" />
                                <span className="text-[11px] text-slate-400">Can Hakkı</span>
                                <span className="font-bold text-white text-xs sm:text-sm">3 Can</span>
                            </div>
                            <div className="flex flex-col items-center">
                                <Timer className="w-5 h-5 text-amber-400 mb-1" />
                                <span className="text-[11px] text-slate-400">Süre</span>
                                <span className="font-bold text-white text-xs sm:text-sm">18 Saniye</span>
                            </div>
                            <div className="flex flex-col items-center">
                                <Scissors className="w-5 h-5 text-emerald-400 mb-1" />
                                <span className="text-[11px] text-slate-400">Hedef</span>
                                <span className="font-bold text-white text-xs sm:text-sm">Doğru Kablo</span>
                            </div>
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={startGame}
                        className={cn(
                            "w-full py-4 px-6 rounded-2xl text-white font-black text-lg sm:text-xl border-2 active:scale-95 transition-all flex items-center justify-center gap-3 cursor-pointer shadow-xl",
                            gameMode === 'duel'
                                ? "bg-gradient-to-r from-red-600 via-amber-600 to-blue-600 hover:from-red-500 hover:to-blue-500 shadow-cyan-500/40 border-cyan-400/70"
                                : gameMode === 'team'
                                    ? "bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 shadow-indigo-500/40 border-indigo-400/60"
                                    : "bg-gradient-to-r from-red-600 via-amber-600 to-red-600 hover:from-red-500 hover:to-amber-500 shadow-red-500/40 border-red-400/60"
                        )}
                    >
                        <Play className="w-6 h-6 fill-white" />
                        <span>
                            {gameMode === 'duel' 
                                ? "YAN YANA DÜELLOYU BAŞLAT ⚡" 
                                : gameMode === 'team' 
                                    ? "TAKIM YARIŞMASINI BAŞLAT" 
                                    : "GÖREVİ BAŞLAT"}
                        </span>
                    </button>
                </div>
            </div>
        );
    }

    // =========================================================================
    // 2. OYUN SONU EKRANI (DÜELLO, TAKIM VEYA BİREYSEL ZAFER)
    // =========================================================================
    if (gameState === 'gameover') {
        if (gameMode === 'duel') {
            const isTie = p1Score === p2Score;
            const p1Won = p1Score > p2Score;

            return (
                <div className="w-full h-full flex items-center justify-center p-3 sm:p-6">
                    <div className="w-full max-w-xl bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border-4 border-cyan-500/60 rounded-3xl p-6 sm:p-8 shadow-2xl text-center backdrop-blur-xl animate-in zoom-in-75 duration-300">
                        <div className="mx-auto w-20 h-20 rounded-full bg-cyan-500/20 border-2 border-cyan-400 flex items-center justify-center mb-3 shadow-[0_0_30px_rgba(6,182,212,0.5)] animate-bounce">
                            <Trophy className="w-12 h-12 text-cyan-400" />
                        </div>

                        <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-2">
                            {isTie ? "🤝 BERABERLİK!" : p1Won ? "🏆 1. OYUNCU (KIRMIZI) ŞAMPİYON!" : "🏆 2. OYUNCU (MAVİ) ŞAMPİYON!"}
                        </h2>
                        <p className="text-sm text-slate-300 mb-6 font-semibold">
                            Kavramları en hızlı tespit edip bombayı patlamadan imha eden taraf kazandı!
                        </p>

                        {/* Skor Karşılaştırması */}
                        <div className="grid grid-cols-2 gap-3 mb-6">
                            <div className={cn("p-4 rounded-2xl border-2 text-center", p1Won ? "bg-red-500/20 border-red-500 scale-105 shadow-lg" : "bg-slate-950/70 border-slate-800")}>
                                <span className="text-xs text-red-300 font-bold block mb-1">1. OYUNCU (SOL)</span>
                                <span className="font-mono text-3xl sm:text-4xl font-black text-white">{p1Score} P</span>
                                {p1Won && <Crown className="w-6 h-6 text-amber-400 mx-auto mt-1" />}
                            </div>
                            <div className={cn("p-4 rounded-2xl border-2 text-center", !p1Won && !isTie ? "bg-blue-500/20 border-blue-500 scale-105 shadow-lg" : "bg-slate-950/70 border-slate-800")}>
                                <span className="text-xs text-blue-300 font-bold block mb-1">2. OYUNCU (SAĞ)</span>
                                <span className="font-mono text-3xl sm:text-4xl font-black text-white">{p2Score} P</span>
                                {!p1Won && !isTie && <Crown className="w-6 h-6 text-amber-400 mx-auto mt-1" />}
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={startGame}
                                className="flex-1 py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-black text-base shadow-lg border border-emerald-400 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                            >
                                <RotateCcw className="w-5 h-5" />
                                <span>Rövanş Maçı (Tekrar Oyna)</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => router.push(backUrl)}
                                className="py-3.5 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-base border border-slate-700 flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                                <ArrowLeft className="w-5 h-5" />
                                <span>Çıkış</span>
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        if (gameMode === 'team') {
            const activeTeamsWithScores = DEFAULT_TEAMS.slice(0, teamCount).map((t, idx) => ({
                ...t,
                score: teamScores[idx] || 0
            })).sort((a, b) => b.score - a.score);

            const isTie = activeTeamsWithScores[0].score === activeTeamsWithScores[1]?.score && activeTeamsWithScores[0].score > 0;
            const winningTeam = activeTeamsWithScores[0];

            return (
                <div className="w-full h-full flex items-center justify-center p-3 sm:p-6">
                    <div className="w-full max-w-xl bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border-4 border-amber-500/60 rounded-3xl p-6 sm:p-8 shadow-2xl text-center backdrop-blur-xl animate-in zoom-in-75 duration-300">
                        <div className="mx-auto w-20 h-20 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center mb-3 shadow-[0_0_30px_rgba(245,158,11,0.5)] animate-bounce">
                            <Trophy className="w-12 h-12 text-amber-400" />
                        </div>

                        <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-1">
                            {isTie ? "🤝 BERABERLİK!" : `🏆 ŞAMPİYON: ${winningTeam.name.toUpperCase()}!`}
                        </h2>
                        <p className="text-sm text-slate-300 mb-6 font-semibold">
                            {isTie ? "Her iki takım da eşit puan toplayarak harika bir mücadele verdi!" : `${winningTeam.name} üstün performansıyla bombayı en çok imha eden takım oldu!`}
                        </p>

                        <div className="space-y-2 mb-6">
                            {activeTeamsWithScores.map((t, idx) => (
                                <div 
                                    key={t.id} 
                                    className={cn(
                                        "p-3 rounded-2xl border-2 flex items-center justify-between shadow-md transition-all",
                                        idx === 0 ? "bg-amber-500/10 border-amber-500/80 scale-[1.02]" : "bg-slate-950/70 border-slate-800"
                                    )}
                                >
                                    <div className="flex items-center gap-2.5">
                                        <div className={cn("w-8 h-8 rounded-xl font-black text-sm flex items-center justify-center", idx === 0 ? "bg-amber-500 text-slate-950" : "bg-slate-800 text-slate-300")}>
                                            {idx === 0 ? <Crown className="w-5 h-5 fill-slate-950" /> : `#${idx + 1}`}
                                        </div>
                                        <span className={cn("font-black text-base sm:text-lg", t.text)}>{t.name}</span>
                                    </div>
                                    <span className="font-mono font-black text-xl text-amber-400">{t.score} P</span>
                                </div>
                            ))}
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={startGame}
                                className="flex-1 py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-black text-base shadow-lg border border-emerald-400 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                            >
                                <RotateCcw className="w-5 h-5" />
                                <span>Tekrar Oyna</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => router.push(backUrl)}
                                className="py-3.5 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-base border border-slate-700 flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                                <ArrowLeft className="w-5 h-5" />
                                <span>Çıkış</span>
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

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
    // 3. AKTİF OYUN EKRANI (DÜELLO VEYA STANDART MOD)
    // =========================================================================
    const isCriticalTime = timeLeft <= 5;

    return (
        <div className={cn(
            "w-full h-full max-w-6xl mx-auto flex flex-col items-center justify-between transition-transform duration-300 select-none",
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

            {/* ═══ BOMBA KASASI ═══ */}
            <div className={cn(
                "w-full flex-1 flex flex-col justify-between bg-slate-950 border-4 sm:border-[6px] border-slate-800 rounded-3xl sm:rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative overflow-hidden p-2.5 sm:p-4 transition-colors duration-500",
                gameState === 'defused' && "border-emerald-500/80 shadow-[0_0_40px_rgba(16,185,129,0.4)]",
                gameState === 'exploded' && "border-red-600 shadow-[0_0_50px_rgba(239,68,68,0.7)] bg-red-950/20"
            )}>
                {/* Üst Tehlike Şeridi */}
                <div className="absolute top-0 left-0 right-0 h-2 sm:h-2.5 bg-[repeating-linear-gradient(45deg,#f59e0b,#f59e0b_12px,#0f172a_12px,#0f172a_24px)] opacity-80" />

                {/* ═══ KONSOL ÜST PANELİ: SKORLAR + DİJİTAL SAYAÇ + YAZI BOYUTU ═══ */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5 pt-1 flex-wrap sm:flex-nowrap">
                    {/* Sol Gösterge: Düelloda P1 Skoru, Takımda Sıra, Solo'da Canlar */}
                    {gameMode === 'duel' ? (
                        <div className="flex items-center gap-2 bg-red-950/70 border-2 border-red-500/80 px-3 py-1 sm:px-4 sm:py-1.5 rounded-2xl shadow-md">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-xs sm:text-sm font-black text-red-300">1. OYUNCU:</span>
                            <span className="font-mono text-base sm:text-xl font-black text-white">{p1Score} P</span>
                        </div>
                    ) : gameMode === 'team' ? (
                        <div className={cn("px-3 py-1.5 rounded-xl border-2 font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-md animate-pulse", currentTeam.bg, currentTeam.border, currentTeam.text)}>
                            <Users className="w-4 h-4" />
                            <span>SIRA: {currentTeam.name.toUpperCase()}</span>
                        </div>
                    ) : (
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
                    )}

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

                    {/* Akıllı Tahta Yazı Boyutu Kontrolü */}
                    <div className="flex items-center gap-1 bg-slate-900/95 px-2 py-1 rounded-xl border border-slate-700/80 shadow-md">
                        <span className="text-[11px] font-bold text-amber-300 hidden md:inline">Yazı:</span>
                        <button
                            type="button"
                            onClick={() => changeFontScale(-10)}
                            className="px-2 py-1 text-slate-200 hover:text-white font-bold bg-slate-800 hover:bg-slate-700 rounded-lg active:scale-95 transition-all flex items-center gap-0.5 text-xs border border-slate-600/50 cursor-pointer"
                            title="Yazıyı Küçült"
                        >
                            <ZoomOut className="w-3.5 h-3.5" />
                            <span>A-</span>
                        </button>
                        <span className="text-xs text-white font-mono font-black px-1">%{fontScale}</span>
                        <button
                            type="button"
                            onClick={() => changeFontScale(10)}
                            className="px-2 py-1 text-slate-200 hover:text-white font-bold bg-slate-800 hover:bg-slate-700 rounded-lg active:scale-95 transition-all flex items-center gap-0.5 text-xs border border-slate-600/50 cursor-pointer"
                            title="Yazıyı Büyüt"
                        >
                            <ZoomIn className="w-3.5 h-3.5" />
                            <span>A+</span>
                        </button>
                    </div>

                    {/* Sağ Gösterge: Düelloda P2 Skoru, Takımda Liste, Solo'da Puan */}
                    {gameMode === 'duel' ? (
                        <div className="flex items-center gap-2 bg-blue-950/70 border-2 border-blue-500/80 px-3 py-1 sm:px-4 sm:py-1.5 rounded-2xl shadow-md">
                            <span className="font-mono text-base sm:text-xl font-black text-white">{p2Score} P</span>
                            <span className="text-xs sm:text-sm font-black text-blue-300">:2. OYUNCU</span>
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                        </div>
                    ) : gameMode === 'team' ? (
                        <div className="flex items-center gap-1.5">
                            {DEFAULT_TEAMS.slice(0, teamCount).map((t, idx) => (
                                <div 
                                    key={t.id}
                                    className={cn(
                                        "px-2.5 py-1 rounded-xl border font-black text-xs flex items-center gap-1 shadow-sm transition-all",
                                        t.bg, t.border, t.text,
                                        activeTeamIndex === idx && "ring-2 ring-white scale-105"
                                    )}
                                >
                                    <span>{t.name.split(' ')[0]}:</span>
                                    <span className="font-mono text-white">{teamScores[idx] || 0}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-slate-900/90 px-3 py-1 sm:px-4 sm:py-1.5 rounded-xl border border-slate-800 shadow-inner flex items-center gap-1.5 font-black text-amber-400 text-sm sm:text-base">
                            <Trophy className="w-4 h-4 text-amber-400" />
                            <span>{score} P</span>
                        </div>
                    )}
                </div>

                {/* ═══ ORTA PANEL: KAVRAM TANIMI / SORU METNİ ═══ */}
                <div className="my-2 relative flex flex-col justify-center">
                    <div className={cn(
                        "w-full rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 transition-all duration-300 relative border-2 text-center",
                        "bg-gradient-to-b from-slate-950 via-slate-900/95 to-slate-950 shadow-inner",
                        gameState === 'defused' 
                            ? "border-emerald-500/80 bg-emerald-950/20 shadow-[0_0_30px_rgba(16,185,129,0.3)]" 
                            : gameState === 'exploded' 
                                ? "border-red-600 bg-red-950/40 shadow-[0_0_30px_rgba(239,68,68,0.4)]"
                                : "border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.15)]"
                    )}>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                <span className={cn("w-2.5 h-2.5 rounded-full", gameState === 'defused' ? "bg-emerald-400 animate-ping" : "bg-red-500 animate-pulse")} />
                                <span>BOMBA #{currentIndex + 1} / {questions.length}</span>
                            </div>
                            <span className="text-xs text-amber-400/90 font-bold hidden sm:inline">
                                {gameMode === 'duel' ? "⚡ İlk doğru kabloyu kesen turu kazanır!" : "✂️ Doğru kavram kablosunu kes!"}
                            </span>
                        </div>

                        {gameState === 'defused' ? (
                            <div className="py-2 sm:py-3 animate-in zoom-in-75 duration-300 flex flex-col items-center justify-center gap-1">
                                <div className="px-5 py-1 rounded-full bg-emerald-500/20 border-2 border-emerald-400 text-emerald-300 font-black text-sm sm:text-base uppercase tracking-widest flex items-center gap-2 shadow-[0_0_25px_rgba(16,185,129,0.5)]">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                    <span>
                                        {gameMode === 'duel' 
                                            ? (roundWinner === 'p1' ? "1. OYUNCU İMHA ETTİ! 🔴" : "2. OYUNCU İMHA ETTİ! 🔵") 
                                            : "BOMBA İMHA EDİLDİ!"}
                                    </span>
                                </div>
                                <h3 className="text-2xl sm:text-4xl font-black text-emerald-400 tracking-tight drop-shadow-md">
                                    {currentQuestion.correctAnswer}
                                </h3>
                            </div>
                        ) : gameState === 'exploded' ? (
                            <div className="py-2 sm:py-3 animate-in zoom-in-75 duration-300 flex flex-col items-center justify-center gap-1">
                                <div className="px-5 py-1 rounded-full bg-red-600/30 border-2 border-red-500 text-red-300 font-black text-sm sm:text-base uppercase tracking-widest flex items-center gap-2 shadow-[0_0_25px_rgba(239,68,68,0.7)] animate-bounce">
                                    <Flame className="w-5 h-5 text-red-400 fill-red-400" />
                                    <span>BOMBA PATLADI!</span>
                                </div>
                                <div className="text-sm sm:text-base text-slate-200 mt-1">
                                    Doğru Kavram: <strong className="text-emerald-400 font-black text-xl sm:text-2xl underline underline-offset-4 ml-1">{currentQuestion.correctAnswer}</strong>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col justify-center min-h-[70px] sm:min-h-[90px] px-2 sm:px-6">
                                <p 
                                    className="font-black text-white text-base sm:text-2xl md:text-3xl leading-relaxed drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] transition-all break-words"
                                    style={{ fontSize: `${fontScale}%` }}
                                >
                                    {currentQuestion.definition}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* ═══ ALT PANEL: DÜELLO (YAN YANA İKİ OYUNCU) VEYA STANDART KABLOLAR ═══ */}
                {gameMode === 'duel' ? (
                    /* ══════════════════════════════════════════════════════════
                       DÜELLO ALANI: SOL (1. OYUNCU) vs SAĞ (2. OYUNCU)
                       Aynı sorular ama FARKLI sıralamayla seçenekler!
                       ══════════════════════════════════════════════════════════ */
                    <div className="grid grid-cols-2 gap-3 sm:gap-6 pt-1 flex-1">
                        {/* 🔴 SOL: 1. OYUNCU KASASI */}
                        <div className={cn(
                            "flex flex-col justify-between p-2 sm:p-3.5 rounded-2xl sm:rounded-3xl border-2 sm:border-3 transition-all",
                            "bg-gradient-to-b from-red-950/40 to-slate-950 border-red-500/60 shadow-lg",
                            p1Status === 'defused' && "border-emerald-400 ring-4 ring-emerald-400/80 shadow-[0_0_35px_rgba(16,185,129,0.5)]",
                            p1Status === 'exploded' && "border-red-600 opacity-60 grayscale"
                        )}>
                            <div className="flex items-center justify-between px-2 mb-2">
                                <div className="flex items-center gap-1.5 text-xs sm:text-sm font-black text-red-400">
                                    <span>🔴 1. OYUNCU (SOL)</span>
                                </div>
                                <span className={cn(
                                    "text-[11px] font-bold px-2 py-0.5 rounded-md",
                                    p1Status === 'defused' ? "bg-emerald-500/30 text-emerald-300" : p1Status === 'exploded' ? "bg-red-500/30 text-red-300" : "bg-black/40 text-slate-300"
                                )}>
                                    {p1Status === 'defused' ? "İMHA ETTİ! 🛡️" : p1Status === 'exploded' ? "PATLADI! 💥" : "HAZIR"}
                                </span>
                            </div>

                            {/* 1. Oyuncunun 4 Kablosu (Kendi Özel Sıralamasıyla) */}
                            <div className="space-y-2">
                                {p1Options.map((optText, optIdx) => {
                                    const style = WIRE_STYLES[optIdx % WIRE_STYLES.length];
                                    const isCut = p1CutIndex === optIdx;
                                    const isCorrect = optText.trim().toLowerCase() === currentQuestion.correctAnswer.trim().toLowerCase();
                                    const showHighlight = (gameState === 'defused' || gameState === 'exploded') && isCorrect;

                                    return (
                                        <button
                                            key={`p1-${optIdx}`}
                                            type="button"
                                            disabled={gameState !== 'playing' || p1Status !== 'idle'}
                                            onClick={() => handleDuelWireCut('p1', optIdx, optText)}
                                            className={cn(
                                                "group relative w-full min-h-[3.6rem] sm:min-h-[4.4rem] py-1.5 sm:py-2 px-2.5 sm:px-4 rounded-xl sm:rounded-2xl flex items-center justify-between transition-all duration-150 cursor-pointer border-2 shadow-md active:scale-[0.98]",
                                                style.bg,
                                                style.border,
                                                style.glow,
                                                p1Status === 'idle' && gameState === 'playing' && "hover:brightness-110 hover:scale-[1.01]",
                                                isCut && "ring-4 ring-white opacity-95",
                                                showHighlight && "ring-4 ring-emerald-400 brightness-125 z-10",
                                                p1Status === 'exploded' && !isCut && "opacity-30 grayscale",
                                                (gameState !== 'playing' || p1Status !== 'idle') && "cursor-default"
                                            )}
                                        >
                                            <div className={cn("w-3 h-8 sm:w-4 sm:h-10 rounded border flex flex-col items-center justify-around flex-shrink-0", style.jack)}>
                                                <div className="w-1 h-1 rounded-full bg-slate-300" />
                                                <div className="w-1 h-1 rounded-full bg-slate-300" />
                                            </div>

                                            <div className="flex-1 px-2 flex items-center justify-center bg-black/20 py-1 rounded-lg border border-white/10 mx-1.5">
                                                <span 
                                                    className="font-black text-center tracking-wide leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] break-words text-base sm:text-xl md:text-2xl text-white"
                                                    style={{ fontSize: `${Math.round(fontScale * 0.85)}%` }}
                                                >
                                                    {optText}
                                                </span>
                                            </div>

                                            <div className={cn("w-3 h-8 sm:w-4 sm:h-10 rounded border flex flex-col items-center justify-around flex-shrink-0", style.jack)}>
                                                <div className="w-1 h-1 rounded-full bg-slate-300" />
                                                <div className="w-1 h-1 rounded-full bg-slate-300" />
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 🔵 SAĞ: 2. OYUNCU KASASI */}
                        <div className={cn(
                            "flex flex-col justify-between p-2 sm:p-3.5 rounded-2xl sm:rounded-3xl border-2 sm:border-3 transition-all",
                            "bg-gradient-to-b from-blue-950/40 to-slate-950 border-blue-500/60 shadow-lg",
                            p2Status === 'defused' && "border-emerald-400 ring-4 ring-emerald-400/80 shadow-[0_0_35px_rgba(16,185,129,0.5)]",
                            p2Status === 'exploded' && "border-red-600 opacity-60 grayscale"
                        )}>
                            <div className="flex items-center justify-between px-2 mb-2">
                                <span className={cn(
                                    "text-[11px] font-bold px-2 py-0.5 rounded-md",
                                    p2Status === 'defused' ? "bg-emerald-500/30 text-emerald-300" : p2Status === 'exploded' ? "bg-red-500/30 text-red-300" : "bg-black/40 text-slate-300"
                                )}>
                                    {p2Status === 'defused' ? "İMHA ETTİ! 🛡️" : p2Status === 'exploded' ? "PATLADI! 💥" : "HAZIR"}
                                </span>
                                <div className="flex items-center gap-1.5 text-xs sm:text-sm font-black text-blue-400">
                                    <span>🔵 2. OYUNCU (SAĞ)</span>
                                </div>
                            </div>

                            {/* 2. Oyuncunun 4 Kablosu (Kendi Özel Farklı Sıralamasıyla) */}
                            <div className="space-y-2">
                                {p2Options.map((optText, optIdx) => {
                                    const style = WIRE_STYLES[optIdx % WIRE_STYLES.length];
                                    const isCut = p2CutIndex === optIdx;
                                    const isCorrect = optText.trim().toLowerCase() === currentQuestion.correctAnswer.trim().toLowerCase();
                                    const showHighlight = (gameState === 'defused' || gameState === 'exploded') && isCorrect;

                                    return (
                                        <button
                                            key={`p2-${optIdx}`}
                                            type="button"
                                            disabled={gameState !== 'playing' || p2Status !== 'idle'}
                                            onClick={() => handleDuelWireCut('p2', optIdx, optText)}
                                            className={cn(
                                                "group relative w-full min-h-[3.6rem] sm:min-h-[4.4rem] py-1.5 sm:py-2 px-2.5 sm:px-4 rounded-xl sm:rounded-2xl flex items-center justify-between transition-all duration-150 cursor-pointer border-2 shadow-md active:scale-[0.98]",
                                                style.bg,
                                                style.border,
                                                style.glow,
                                                p2Status === 'idle' && gameState === 'playing' && "hover:brightness-110 hover:scale-[1.01]",
                                                isCut && "ring-4 ring-white opacity-95",
                                                showHighlight && "ring-4 ring-emerald-400 brightness-125 z-10",
                                                p2Status === 'exploded' && !isCut && "opacity-30 grayscale",
                                                (gameState !== 'playing' || p2Status !== 'idle') && "cursor-default"
                                            )}
                                        >
                                            <div className={cn("w-3 h-8 sm:w-4 sm:h-10 rounded border flex flex-col items-center justify-around flex-shrink-0", style.jack)}>
                                                <div className="w-1 h-1 rounded-full bg-slate-300" />
                                                <div className="w-1 h-1 rounded-full bg-slate-300" />
                                            </div>

                                            <div className="flex-1 px-2 flex items-center justify-center bg-black/20 py-1 rounded-lg border border-white/10 mx-1.5">
                                                <span 
                                                    className="font-black text-center tracking-wide leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] break-words text-base sm:text-xl md:text-2xl text-white"
                                                    style={{ fontSize: `${Math.round(fontScale * 0.85)}%` }}
                                                >
                                                    {optText}
                                                </span>
                                            </div>

                                            <div className={cn("w-3 h-8 sm:w-4 sm:h-10 rounded border flex flex-col items-center justify-around flex-shrink-0", style.jack)}>
                                                <div className="w-1 h-1 rounded-full bg-slate-300" />
                                                <div className="w-1 h-1 rounded-full bg-slate-300" />
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                ) : (
                    /* ══════════════════════════════════════════════════════════
                       STANDART ALAN: BİREYSEL VEYA TAKIMLI KABLOLAR (2x2 GRID)
                       ══════════════════════════════════════════════════════════ */
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4 pt-2">
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
                                        "group relative w-full min-h-[4.2rem] sm:min-h-[5rem] md:min-h-[5.5rem] py-2 sm:py-3 px-3 sm:px-5 rounded-2xl sm:rounded-3xl flex items-center justify-between transition-all duration-200 cursor-pointer border-2 sm:border-3 shadow-xl active:scale-[0.98]",
                                        style.bg,
                                        style.border,
                                        style.glow,
                                        gameState === 'playing' && "hover:brightness-110 hover:shadow-2xl hover:scale-[1.01]",
                                        isCut && "opacity-95 ring-4 ring-white scale-[0.99]",
                                        isRevealedCorrect && "ring-4 ring-emerald-400 brightness-125 shadow-[0_0_35px_rgba(16,185,129,0.9)] z-10",
                                        isRevealedWrong && "opacity-30 grayscale contrast-75",
                                        gameState !== 'playing' && "cursor-default"
                                    )}
                                >
                                    <div className={cn("w-3.5 h-10 sm:w-5 sm:h-12 rounded-lg border-2 flex flex-col items-center justify-around flex-shrink-0 shadow-inner", style.jack)}>
                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-300 shadow-sm" />
                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-300 shadow-sm" />
                                    </div>

                                    <div className="flex-1 px-2 sm:px-4 flex items-center justify-center relative">
                                        {isCut ? (
                                            <div className="flex items-center justify-center gap-2 animate-in zoom-in-75 duration-150 flex-wrap bg-black/40 px-3 py-1.5 rounded-xl border border-white/20 shadow-md">
                                                <span className="font-mono text-xs sm:text-sm px-2 py-0.5 rounded-md bg-black/85 text-amber-300 font-black border border-amber-400/80 flex items-center gap-1 shadow-md">
                                                    <Scissors className="w-4 h-4 rotate-90 text-amber-300 animate-spin" />
                                                    KESİLDİ!
                                                </span>
                                                <span 
                                                    className={cn("font-black tracking-wide text-center leading-tight drop-shadow-md break-words", style.text)}
                                                    style={{ fontSize: `${Math.round(fontScale * 0.95)}%` }}
                                                >
                                                    {optionText}
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-center gap-2 sm:gap-3 w-full bg-black/20 px-3 py-1.5 rounded-xl border border-white/10 shadow-sm">
                                                <Scissors className="w-4 h-4 sm:w-5 sm:h-5 text-white/90 drop-shadow group-hover:scale-125 group-hover:text-white transition-all flex-shrink-0" />
                                                <span 
                                                    className={cn(
                                                        "font-black tracking-wide text-center leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] break-words text-lg sm:text-2xl md:text-3xl text-white",
                                                        style.text
                                                    )}
                                                    style={{ fontSize: `${Math.round(fontScale * 0.95)}%` }}
                                                >
                                                    {optionText}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    <div className={cn("w-3.5 h-10 sm:w-5 sm:h-12 rounded-lg border-2 flex flex-col items-center justify-around flex-shrink-0 shadow-inner", style.jack)}>
                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-300 shadow-sm" />
                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-300 shadow-sm" />
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
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
                contentClassName="w-full h-full min-h-0 flex flex-col items-center justify-center p-1 sm:p-2.5 overflow-hidden"
            >
                <SaatliBombaContent />
            </WordwallShell>
        </Suspense>
    );
}
