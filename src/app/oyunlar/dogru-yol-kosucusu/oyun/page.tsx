'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { RefreshCw, Heart, Loader2, Users, User, Rocket, Star, ArrowLeft, Flame, Zap, CheckCircle2, XCircle, Trophy, Play, FastForward, Clock } from 'lucide-react';
import { getDogruYolKosucusuAction, submitDogruYolKosucusuScoreAction, type DogruYolQuestion } from '../actions';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { GameEndScreen } from '@/components/game-end-screen';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getGameBackUrl, getTeacherActivitiesUrl } from '@/lib/game-navigation';
import { WordwallShell, useWordwall } from '@/components/wordwall/wordwall-shell';
import { playSound } from '@/lib/audio-service';

interface QuestionGate {
    question: DogruYolQuestion;
    leftOption: string;
    rightOption: string;
    correctLane: 0 | 1;
}

const RUNNER_STYLES = `
  @keyframes roadLines {
    0% { background-position: 0 0; }
    100% { background-position: 0 80px; }
  }
  @keyframes gridScroll {
    0% { transform: perspective(300px) rotateX(60deg) translateY(0); }
    100% { transform: perspective(300px) rotateX(60deg) translateY(60px); }
  }
  @keyframes gateApproaching {
    0% { transform: scale(0.35) translateY(-60px); opacity: 0.4; }
    100% { transform: scale(1) translateY(0); opacity: 1; }
  }
  @keyframes jetPulse {
    0%, 100% { transform: scaleY(1); opacity: 0.8; }
    50% { transform: scaleY(1.3); opacity: 1; }
  }
  @keyframes popFeedback {
    0% { transform: translate(-50%, -40%) scale(0.6); opacity: 0; }
    30% { transform: translate(-50%, -50%) scale(1.15); opacity: 1; }
    80% { transform: translate(-50%, -55%) scale(1); opacity: 1; }
    100% { transform: translate(-50%, -70%) scale(0.8); opacity: 0; }
  }
  .road-scroller {
    background-image: repeating-linear-gradient(
      to bottom,
      rgba(255, 255, 255, 0.7) 0px,
      rgba(255, 255, 255, 0.7) 35px,
      transparent 35px,
      transparent 70px
    );
    background-size: 6px 70px;
    animation: roadLines 0.5s linear infinite;
  }
  .feedback-pop {
    animation: popFeedback 0.9s ease-out forwards;
  }
`;

function DoğruYolBoard({
    gameState,
    gameMode,
    startGame,
    currentGate,
    questionIndex,
    totalQuestions,
    p1Lane,
    setP1Lane,
    p2Lane,
    setP2Lane,
    p1Scores,
    p2Scores,
    p1Lives,
    p2Lives,
    distanceProgress,
    streak,
    feedbackP1,
    feedbackP2,
    triggerGatePass,
    setGameState,
    router,
    backUrl,
}: {
    gameState: 'home' | 'playing' | 'win';
    gameMode: 'solo' | 'duel';
    startGame: (mode: 'solo' | 'duel') => void;
    currentGate: QuestionGate | null;
    questionIndex: number;
    totalQuestions: number;
    p1Lane: 0 | 1;
    setP1Lane: (lane: 0 | 1) => void;
    p2Lane: 0 | 1;
    setP2Lane: (lane: 0 | 1) => void;
    p1Scores: number;
    p2Scores: number;
    p1Lives: number;
    p2Lives: number;
    distanceProgress: number; // 0 to 100
    streak: number;
    feedbackP1: { text: string; isCorrect: boolean } | null;
    feedbackP2: { text: string; isCorrect: boolean } | null;
    triggerGatePass: () => void;
    setGameState: (s: any) => void;
    router: any;
    backUrl: string;
}) {
    const { theme } = useWordwall();

    // Lobi Ekranı
    if (gameState === 'home') {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center p-4 my-auto">
                <div className={cn(
                    "w-full max-w-xl p-6 sm:p-8 rounded-3xl border-2 shadow-2xl backdrop-blur-xl flex flex-col items-center text-center gap-6",
                    theme.cardBg,
                    theme.cardBorder
                )}>
                    <div className="w-16 h-16 rounded-full flex items-center justify-center bg-cyan-500/20 text-cyan-400 border border-cyan-400/40">
                        <Rocket className="w-8 h-8 animate-bounce" />
                    </div>

                    <div>
                        <h1 className={cn("text-3xl sm:text-4xl font-black uppercase tracking-tight", theme.cardText)}>
                            Doğru Kapı
                        </h1>
                        <p className={cn("text-sm sm:text-base font-medium mt-2 max-w-md mx-auto", theme.subText)}>
                            Yukarıdaki soruyu oku, doğru cevabın olduğu kapıya yönel ve engelleri aş!
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                        <button
                            type="button"
                            onClick={() => startGame('solo')}
                            className={cn(
                                "p-6 rounded-2xl border-2 font-black transition-all duration-200 flex flex-col items-center text-center gap-3 cursor-pointer shadow-lg hover:scale-105 active:scale-95",
                                theme.buttonIdle
                            )}
                        >
                            <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                                <User className="w-8 h-8" />
                            </div>
                            <div>
                                <div className={cn("text-xl font-black", theme.cardText)}>Tek Kişilik</div>
                                <div className={cn("text-xs font-semibold opacity-70 mt-1", theme.subText)}>
                                    Bireysel rekor ve seri bonusu
                                </div>
                            </div>
                        </button>

                        <button
                            type="button"
                            onClick={() => startGame('duel')}
                            className={cn(
                                "p-6 rounded-2xl border-2 font-black transition-all duration-200 flex flex-col items-center text-center gap-3 cursor-pointer shadow-lg hover:scale-105 active:scale-95",
                                theme.buttonIdle
                            )}
                        >
                            <div className="w-14 h-14 rounded-2xl bg-orange-500/20 text-orange-400 flex items-center justify-center">
                                <Users className="w-8 h-8" />
                            </div>
                            <div>
                                <div className={cn("text-xl font-black", theme.cardText)}>2 Kişilik Düello</div>
                                <div className={cn("text-xs font-semibold opacity-70 mt-1", theme.subText)}>
                                    Sol Takım vs Sağ Takım
                                </div>
                            </div>
                        </button>
                    </div>

                    <div className={cn("text-xs font-bold px-4 py-2 rounded-xl border flex items-center gap-2", theme.subPanelBg, theme.cardBorder, theme.subText)}>
                        <span>🎮 Kontroller:</span>
                        <span>A / D veya Sol / Sağ Ok Tuşları, Ekrana Dokunma</span>
                    </div>
                </div>
            </div>
        );
    }

    // Düello Sonuç Ekranı
    if (gameState === 'win' && gameMode === 'duel') {
        const isP1Win = p1Scores > p2Scores || (p1Scores === p2Scores && p1Lives >= p2Lives);
        const isTie = p1Scores === p2Scores && p1Lives === p2Lives;

        return (
            <div className="w-full max-w-lg mx-auto my-auto p-4 flex flex-col items-center justify-center">
                <div className={cn(
                    "w-full text-center border-2 p-6 sm:p-8 rounded-3xl shadow-2xl backdrop-blur-xl flex flex-col items-center gap-6",
                    theme.cardBg,
                    theme.cardBorder
                )}>
                    <Trophy className="w-16 h-16 text-amber-400 animate-bounce" />
                    <h2 className={cn("text-3xl font-black uppercase tracking-tight", theme.cardText)}>
                        DÜELLO BİTTİ!
                    </h2>
                    
                    <div className="text-xl font-black">
                        {isTie ? (
                            <span className="text-amber-400">DOSTLUK KAZANDI! (BERABERE)</span>
                        ) : isP1Win ? (
                            <span className="text-cyan-400">SOL TAKIM (MAVİ) KAZANDI!</span>
                        ) : (
                            <span className="text-orange-400">SAĞ TAKIM (TURUNCU) KAZANDI!</span>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 w-full">
                        <div className={cn("p-4 rounded-2xl border-2 text-center", isP1Win && !isTie ? "border-cyan-400 bg-cyan-950/50 text-cyan-300 ring-2 ring-cyan-400" : theme.subPanelBg)}>
                            <span className="text-xs font-black uppercase block text-cyan-400">Sol Takım</span>
                            <span className="text-3xl font-black block my-1">{p1Scores} P</span>
                            <span className="text-xs font-bold opacity-75">{p1Lives} Can Kaldı</span>
                        </div>

                        <div className={cn("p-4 rounded-2xl border-2 text-center", !isP1Win && !isTie ? "border-orange-400 bg-orange-950/50 text-orange-300 ring-2 ring-orange-400" : theme.subPanelBg)}>
                            <span className="text-xs font-black uppercase block text-orange-400">Sağ Takım</span>
                            <span className="text-3xl font-black block my-1">{p2Scores} P</span>
                            <span className="text-xs font-bold opacity-75">{p2Lives} Can Kaldı</span>
                        </div>
                    </div>

                    <div className="flex gap-3 w-full">
                        <Button 
                            onClick={() => startGame('duel')} 
                            className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md"
                        >
                            <RefreshCw className="w-4 h-4 mr-2" /> Yeniden Yarış
                        </Button>
                        <Button 
                            variant="outline" 
                            onClick={() => router.push(backUrl)} 
                            className={cn("h-12 px-6 rounded-xl font-bold border", theme.cardBorder, theme.cardText)}
                        >
                            Çıkış
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    if (!currentGate) return null;

    // Pist Bölgesi Render
    const renderTrack = (player: 1 | 2) => {
        const lane = player === 1 ? p1Lane : p2Lane;
        const setLane = player === 1 ? setP1Lane : setP2Lane;
        const scores = player === 1 ? p1Scores : p2Scores;
        const lives = player === 1 ? p1Lives : p2Lives;
        const feedback = player === 1 ? feedbackP1 : feedbackP2;
        const isPlayer1 = player === 1;

        // Yaklaşma oranı ve pozisyon: Kapılar ilk %75 boyunca ekranda sabit ve net okunabilir kalır
        const progress = (100 - distanceProgress) / 100; // 0 (yeni soru) -> 1 (kapı geçişi)
        
        let approachTop: number;
        let approachScale: number;
        if (progress < 0.75) {
            // İlk %75'lik kısımda (~11 saniye) kapı merkezde net ve sakin okunabilir kalır
            const p = progress / 0.75;
            approachTop = 14 + p * 20;       // %14'ten %34'e yavaşça yaklaşır
            approachScale = 0.82 + p * 0.13; // 0.82'den 0.95'e büyür (yazılar hep büyük ve okunaklı)
        } else {
            // Son %25'lik kısımda veya 'Hemen Geç' basıldığında araca doğru hızla geçer
            const p = (progress - 0.75) / 0.25;
            approachTop = 34 + p * 34;       // %34'ten %68'e iner
            approachScale = 0.95 + p * 0.15; // 0.95'ten 1.10'a büyür
        }

        return (
            <div className={cn(
                "relative flex-1 h-full min-h-0 overflow-hidden flex flex-col justify-between select-none touch-none",
                gameMode === 'duel' && (isPlayer1 ? "border-r-2 border-dashed border-white/20" : "")
            )}>
                {/* 3D Perspektif Yol Zemini */}
                <div className="absolute inset-0 z-0 bg-gradient-to-b from-slate-950 via-slate-900 to-black overflow-hidden pointer-events-none">
                    {/* Arka plan yol şeritleri */}
                    <div className="absolute inset-x-[10%] top-0 bottom-0 border-x-2 border-white/20 bg-slate-950/80 shadow-2xl">
                        {/* Orta kesik çizgi */}
                        <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-1.5 road-scroller" />
                    </div>
                </div>

                {/* Düello Oyuncu HUD Bilgisi */}
                {gameMode === 'duel' && (
                    <div className="relative z-30 flex items-center justify-between px-3 py-1.5 bg-black/40 backdrop-blur-sm border-b border-white/10">
                        <div className="flex items-center gap-1.5">
                            <span className={cn("text-xs font-black uppercase px-2 py-0.5 rounded-lg border", isPlayer1 ? "bg-cyan-500/20 text-cyan-400 border-cyan-400/40" : "bg-orange-500/20 text-orange-400 border-orange-400/40")}>
                                {isPlayer1 ? "Sol Takım" : "Sağ Takım"}
                            </span>
                            <span className="text-lg font-black text-white">{scores} P</span>
                        </div>
                        <div className="flex items-center gap-1">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <Heart 
                                    key={i} 
                                    className={cn("w-4 h-4", i < lives ? "text-rose-500 fill-rose-500" : "text-slate-600 opacity-40")} 
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* YAKLAŞAN HEDEF KAPILARI (SOL & SAĞ ŞERİT) */}
                <div 
                    className="absolute inset-x-[10%] sm:inset-x-[12%] z-20 flex gap-3 sm:gap-6 transition-all duration-75 pointer-events-auto"
                    style={{
                        top: `${approachTop}%`,
                        transform: `scale(${approachScale})`,
                        transformOrigin: 'center center',
                    }}
                >
                    {/* SOL KAPI */}
                    <div 
                        onClick={() => {
                            if (lane === 0) {
                                triggerGatePass();
                            } else {
                                setLane(0);
                                playSound('click');
                            }
                        }}
                        className={cn(
                            "flex-1 p-3 sm:p-4 rounded-2xl border-2 sm:border-4 transition-all duration-150 flex flex-col items-center justify-center text-center cursor-pointer shadow-2xl relative overflow-hidden backdrop-blur-md min-h-[75px] sm:min-h-[110px]",
                            lane === 0 
                                ? (isPlayer1 ? "border-cyan-400 bg-cyan-950/95 ring-4 ring-cyan-400/50 shadow-[0_0_25px_rgba(6,182,212,0.6)]" : "border-orange-400 bg-orange-950/95 ring-4 ring-orange-400/50 shadow-[0_0_25px_rgba(249,115,22,0.6)]")
                                : "border-slate-700 bg-slate-900/85 opacity-80 hover:opacity-100 hover:border-slate-500"
                        )}
                    >
                        <div className="flex items-center gap-1.5 mb-1.5">
                            <span className={cn(
                                "text-[10px] sm:text-xs font-black uppercase px-2.5 py-0.5 rounded-full border",
                                lane === 0 ? "bg-white text-slate-950 border-white" : "bg-black/50 text-slate-300 border-slate-700"
                            )}>
                                [A] SOL ŞERİT
                            </span>
                            {lane === 0 && <span className="text-[10px] font-black text-cyan-300">★ SEÇİLDİ</span>}
                        </div>
                        <span className="text-sm sm:text-lg md:text-xl font-black text-white leading-tight drop-shadow-md">
                            {currentGate.leftOption}
                        </span>
                    </div>

                    {/* SAĞ KAPI */}
                    <div 
                        onClick={() => {
                            if (lane === 1) {
                                triggerGatePass();
                            } else {
                                setLane(1);
                                playSound('click');
                            }
                        }}
                        className={cn(
                            "flex-1 p-3 sm:p-4 rounded-2xl border-2 sm:border-4 transition-all duration-150 flex flex-col items-center justify-center text-center cursor-pointer shadow-2xl relative overflow-hidden backdrop-blur-md min-h-[75px] sm:min-h-[110px]",
                            lane === 1 
                                ? (isPlayer1 ? "border-cyan-400 bg-cyan-950/95 ring-4 ring-cyan-400/50 shadow-[0_0_25px_rgba(6,182,212,0.6)]" : "border-orange-400 bg-orange-950/95 ring-4 ring-orange-400/50 shadow-[0_0_25px_rgba(249,115,22,0.6)]")
                                : "border-slate-700 bg-slate-900/85 opacity-80 hover:opacity-100 hover:border-slate-500"
                        )}
                    >
                        <div className="flex items-center gap-1.5 mb-1.5">
                            <span className={cn(
                                "text-[10px] sm:text-xs font-black uppercase px-2.5 py-0.5 rounded-full border",
                                lane === 1 ? "bg-white text-slate-950 border-white" : "bg-black/50 text-slate-300 border-slate-700"
                            )}>
                                [B] SAĞ ŞERİT
                            </span>
                            {lane === 1 && <span className="text-[10px] font-black text-cyan-300">★ SEÇİLDİ</span>}
                        </div>
                        <span className="text-sm sm:text-lg md:text-xl font-black text-white leading-tight drop-shadow-md">
                            {currentGate.rightOption}
                        </span>
                    </div>
                </div>

                {/* KOŞUCU / ARAÇ GRAFİĞİ */}
                <div 
                    className="absolute bottom-[22%] z-30 transition-all duration-200 -translate-x-1/2 flex flex-col items-center"
                    style={{ left: lane === 0 ? '30%' : '70%' }}
                >
                    {/* Jet Alevi / Parıltı */}
                    <div 
                        className={cn(
                            "w-4 h-8 rounded-full blur-[4px] -mb-1",
                            isPlayer1 ? "bg-cyan-400 shadow-[0_0_20px_#22d3ee]" : "bg-orange-400 shadow-[0_0_20px_#fb923c]"
                        )} 
                        style={{ animation: 'jetPulse 0.4s ease-in-out infinite' }}
                    />
                    
                    {/* Araç Gövdesi */}
                    <div className={cn(
                        "w-12 h-16 sm:w-14 sm:h-20 rounded-2xl border-2 flex items-center justify-center shadow-2xl relative",
                        isPlayer1 
                            ? "bg-gradient-to-b from-cyan-500 to-blue-700 border-cyan-300 text-white shadow-[0_0_25px_rgba(6,182,212,0.6)]" 
                            : "bg-gradient-to-b from-orange-500 to-red-700 border-orange-300 text-white shadow-[0_0_25px_rgba(249,115,22,0.6)]"
                    )}>
                        <Rocket className="w-7 h-7 sm:w-8 sm:h-8 rotate-[-45deg] filter drop-shadow-md" />
                    </div>

                    <span className="text-[9px] font-black uppercase tracking-wider text-white/80 bg-black/60 px-2 py-0.5 rounded-full mt-1">
                        {lane === 0 ? "SOL" : "SAĞ"}
                    </span>
                </div>

                {/* GERİ BİLDİRİM AÇILIR BALONU (+10 DOĞRU / -1 CAN) */}
                {feedback && (
                    <div className={cn(
                        "absolute top-1/2 left-1/2 z-50 feedback-pop pointer-events-none px-6 py-3 rounded-2xl border-2 shadow-2xl text-center text-xl sm:text-2xl font-black",
                        feedback.isCorrect 
                            ? "bg-emerald-600 border-emerald-300 text-white shadow-emerald-500/50" 
                            : "bg-rose-600 border-rose-300 text-white shadow-rose-500/50"
                    )}>
                        {feedback.text}
                    </div>
                )}

                {/* DOKUNMATİK VE OKUNABİLİR ŞERİT KONTROLLERİ */}
                <div className="relative z-40 p-2 sm:p-3 bg-black/80 backdrop-blur-md border-t border-white/10 flex items-stretch gap-2">
                    <button
                        type="button"
                        onClick={() => {
                            if (lane === 0) {
                                triggerGatePass();
                            } else {
                                setLane(0);
                                playSound('click');
                            }
                        }}
                        className={cn(
                            "flex-1 py-2 sm:py-3 px-2 sm:px-3 rounded-xl border-2 font-black transition-all active:scale-95 shadow-md flex flex-col items-center justify-center gap-1 text-center min-w-0",
                            lane === 0 
                                ? (isPlayer1 ? "bg-cyan-600 border-cyan-300 text-white shadow-[0_0_15px_rgba(6,182,212,0.6)] ring-2 ring-cyan-400" : "bg-orange-600 border-orange-300 text-white shadow-[0_0_15px_rgba(249,115,22,0.6)] ring-2 ring-orange-400")
                                : cn(theme.buttonIdle, theme.cardBorder, "opacity-75 hover:opacity-100")
                        )}
                    >
                        <span className={cn(
                            "text-[10px] sm:text-xs font-black uppercase px-2 py-0.5 rounded-md",
                            lane === 0 ? "bg-black/40 text-white" : "bg-slate-800/80 text-slate-300"
                        )}>
                            {lane === 0 ? "✓ [A] SOL ŞERİT" : "◀ [A] SOL ŞERİT"}
                        </span>
                        <span className="font-extrabold text-xs sm:text-sm md:text-base leading-tight truncate w-full px-1">
                            {currentGate.leftOption}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => triggerGatePass()}
                        className="px-3 sm:px-4 py-2 sm:py-3 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs sm:text-sm flex flex-col items-center justify-center gap-0.5 shadow-lg active:scale-95 transition-transform shrink-0 border border-yellow-300"
                        title="Seçili şeritle hemen geç (Boşluk / Enter)"
                    >
                        <Zap className="w-4 h-4 fill-slate-950" />
                        <span className="font-black text-[11px] sm:text-xs whitespace-nowrap">KAPIYA GİR</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            if (lane === 1) {
                                triggerGatePass();
                            } else {
                                setLane(1);
                                playSound('click');
                            }
                        }}
                        className={cn(
                            "flex-1 py-2 sm:py-3 px-2 sm:px-3 rounded-xl border-2 font-black transition-all active:scale-95 shadow-md flex flex-col items-center justify-center gap-1 text-center min-w-0",
                            lane === 1 
                                ? (isPlayer1 ? "bg-cyan-600 border-cyan-300 text-white shadow-[0_0_15px_rgba(6,182,212,0.6)] ring-2 ring-cyan-400" : "bg-orange-600 border-orange-300 text-white shadow-[0_0_15px_rgba(249,115,22,0.6)] ring-2 ring-orange-400")
                                : cn(theme.buttonIdle, theme.cardBorder, "opacity-75 hover:opacity-100")
                        )}
                    >
                        <span className={cn(
                            "text-[10px] sm:text-xs font-black uppercase px-2 py-0.5 rounded-md",
                            lane === 1 ? "bg-black/40 text-white" : "bg-slate-800/80 text-slate-300"
                        )}>
                            {lane === 1 ? "SAĞ ŞERİT [B] ✓" : "SAĞ ŞERİT [B] ▶"}
                        </span>
                        <span className="font-extrabold text-xs sm:text-sm md:text-base leading-tight truncate w-full px-1">
                            {currentGate.rightOption}
                        </span>
                    </button>
                </div>
            </div>
        );
    };

    const secondsLeft = Math.max(0, Math.ceil((distanceProgress / 100) * 15));

    return (
        <div className="w-full h-full flex flex-col min-h-0 overflow-hidden relative select-none">
            <style jsx global>{RUNNER_STYLES}</style>

            {/* SABİT VE OKUNABİLİR ÜST SORU VİTRİNİ */}
            <div className="shrink-0 p-2 sm:p-3 z-30">
                <div className={cn(
                    "w-full max-w-4xl mx-auto p-3 sm:p-4 rounded-2xl border-2 shadow-xl backdrop-blur-md relative overflow-hidden transition-all duration-300",
                    theme.cardBg,
                    theme.cardBorder
                )}>
                    {/* Üst Bilgi Barı: Soru No + Geri Sayım Sayacı + Hemen Geç */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                            <span className={cn("text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border", theme.subPanelBg, theme.cardBorder, theme.subText)}>
                                Soru {questionIndex + 1} / {totalQuestions}
                            </span>
                            {streak >= 2 && gameMode === 'solo' && (
                                <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-orange-500/20 text-orange-400 border border-orange-500/40 animate-pulse">
                                    <Flame className="w-3.5 h-3.5" /> {streak}x Seri!
                                </span>
                            )}
                        </div>

                        {/* Süre Sayacı (Geri Sayım Rozeti) */}
                        <div className={cn(
                            "flex items-center gap-1.5 px-3 py-1 rounded-xl border font-black text-xs sm:text-sm tracking-wide transition-all shadow-sm",
                            secondsLeft > 5
                                ? "bg-cyan-500/15 border-cyan-400/40 text-cyan-300"
                                : secondsLeft > 2
                                    ? "bg-amber-500/20 border-amber-400/50 text-amber-300 animate-pulse"
                                    : "bg-rose-500/25 border-rose-400/60 text-rose-300 animate-bounce"
                        )}>
                            <Clock className={cn("w-4 h-4", secondsLeft <= 3 && "animate-spin")} />
                            <span>{secondsLeft} sn</span>
                        </div>

                        {/* Hızlandır / Hemen Geç Butonu */}
                        <button
                            type="button"
                            onClick={triggerGatePass}
                            className="px-3 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs flex items-center gap-1.5 transition-all active:scale-95 shadow-md border border-yellow-300"
                            title="Kapıya hemen geç (Boşluk veya Enter)"
                        >
                            <Zap className="w-3.5 h-3.5 fill-slate-950" />
                            <span>Hemen Geç</span>
                        </button>
                    </div>

                    {/* Soru / Tanım Metni - Belirgin ve Rahat Okunabilir */}
                    <div className="py-1 px-1">
                        <p className={cn("text-base sm:text-lg md:text-xl font-black leading-snug sm:leading-relaxed text-center", theme.cardText)}>
                            {currentGate.question.q}
                        </p>
                    </div>

                    {/* Kalan Süre İlerleme Çubuğu */}
                    <div className="w-full bg-slate-800/80 h-2 rounded-full mt-2 overflow-hidden border border-white/10 relative">
                        <div 
                            className={cn(
                                "h-full transition-all duration-75 ease-linear",
                                secondsLeft > 5 
                                    ? "bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400" 
                                    : secondsLeft > 2 
                                        ? "bg-gradient-to-r from-amber-400 to-orange-400" 
                                        : "bg-gradient-to-r from-rose-500 to-red-600"
                            )}
                            style={{ width: `${distanceProgress}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* PİST ALANI (SOLO VEYA ÇİFT KULVARLI DÜELLO) */}
            <div className="flex-1 w-full min-h-0 flex overflow-hidden relative">
                {renderTrack(1)}
                {gameMode === 'duel' && renderTrack(2)}
            </div>
        </div>
    );
}

function GameContent() {
    const router = useRouter();
    const { user } = useAuth();
    const { toast } = useToast();
    const searchParams = useSearchParams();

    const [gameState, setGameState] = useState<'loading' | 'home' | 'playing' | 'win' | 'gameover' | 'error'>('loading');
    const [gameMode, setGameMode] = useState<'solo' | 'duel'>('solo');
    const [questions, setQuestions] = useState<DogruYolQuestion[]>([]);
    const [error, setError] = useState<string | null>(null);

    // Soru ve Kapı Yönetimi
    const [questionIndex, setQuestionIndex] = useState(0);
    const [currentGate, setCurrentGate] = useState<QuestionGate | null>(null);
    const [distanceProgress, setDistanceProgress] = useState(100); // 100% -> 0%
    const isPassingRef = useRef(false);

    // Oyuncu Pozisyonları (0: Sol Şerit, 1: Sağ Şerit)
    const [p1Lane, setP1Lane] = useState<0 | 1>(0);
    const [p2Lane, setP2Lane] = useState<0 | 1>(1);

    // Skorlar ve Canlar
    const [p1Scores, setP1Scores] = useState(0);
    const [p2Scores, setP2Scores] = useState(0);
    const [p1Lives, setP1Lives] = useState(5);
    const [p2Lives, setP2Lives] = useState(3);
    const [streak, setStreak] = useState(0);

    // Anlık Geri Bildirimler
    const [feedbackP1, setFeedbackP1] = useState<{ text: string; isCorrect: boolean } | null>(null);
    const [feedbackP2, setFeedbackP2] = useState<{ text: string; isCorrect: boolean } | null>(null);

    // Skor Kaydı
    const [isSaving, setIsSaving] = useState(false);
    const [isScoreSaved, setIsScoreSaved] = useState(false);

    const topicName = searchParams.get('topicName') || searchParams.get('courseName') || 'Doğru Kapı';
    const gameContext = `Doğru Kapı - ${searchParams.get('courseName') || 'Genel'} > ${topicName}`;
    const backUrl = getGameBackUrl({ user, searchParams, defaultBackUrl: '/oyunlar/dogru-yol-kosucusu' });

    // Veri Yükleme
    const fetchGameData = useCallback(async () => {
        try {
            const params = {
                courseId: searchParams.get('courseId') || undefined,
                unitId: searchParams.get('unitId') || undefined,
                topicId: searchParams.get('topicId') || undefined,
                isStatic: searchParams.get('isStatic') === 'true',
            };
            const result = await getDogruYolKosucusuAction(params);
            if (result.error || result.questions.length === 0) {
                setError(result.error || "Bu konu için uygun soru bulunamadı.");
                setGameState('error');
            } else {
                setQuestions(result.questions);
                setGameState('home');
            }
        } catch (err: any) {
            setError(err.message || "Veri yüklenemedi.");
            setGameState('error');
        }
    }, [searchParams]);

    useEffect(() => { fetchGameData(); }, [fetchGameData]);

    // Sorudan Kapı Üret
    const setupGateForQuestion = useCallback((q: DogruYolQuestion) => {
        const isLeftCorrect = Math.random() > 0.5;
        const gate: QuestionGate = {
            question: q,
            leftOption: isLeftCorrect ? q.correct : q.wrong,
            rightOption: isLeftCorrect ? q.wrong : q.correct,
            correctLane: isLeftCorrect ? 0 : 1,
        };
        setCurrentGate(gate);
        setDistanceProgress(100);
        isPassingRef.current = false;
    }, []);

    // Oyunu Başlat
    const startGame = (mode: 'solo' | 'duel') => {
        if (questions.length === 0) return;
        setGameMode(mode);
        setP1Scores(0);
        setP2Scores(0);
        setP1Lives(mode === 'solo' ? 5 : 3);
        setP2Lives(3);
        setStreak(0);
        setP1Lane(0);
        setP2Lane(1);
        setQuestionIndex(0);
        setIsSaving(false);
        setIsScoreSaved(false);
        setFeedbackP1(null);
        setFeedbackP2(null);
        setupGateForQuestion(questions[0]);
        setGameState('playing');
        playSound('pop');
    };

    // Kapı Geçiş Kontrolü (Değerlendirme)
    const handleGatePass = useCallback(() => {
        if (!currentGate || isPassingRef.current || gameState !== 'playing') return;
        isPassingRef.current = true;
        setDistanceProgress(0);

        const correctLane = currentGate.correctLane;
        const p1Correct = p1Lane === correctLane;
        const p2Correct = p2Lane === correctLane;

        // Player 1 Değerlendirme
        if (p1Correct) {
            playSound('correct');
            const streakBonus = streak >= 2 ? 5 : 0;
            const points = 10 + streakBonus;
            setP1Scores(s => s + points);
            setStreak(st => st + 1);
            setFeedbackP1({ text: `+${points} DOĞRU!`, isCorrect: true });
        } else {
            playSound('incorrect');
            setStreak(0);
            setP1Lives(l => Math.max(0, l - 1));
            setFeedbackP1({ text: `-1 CAN`, isCorrect: false });
        }

        // Player 2 (Düello Modunda)
        if (gameMode === 'duel') {
            if (p2Correct) {
                setP2Scores(s => s + 10);
                setFeedbackP2({ text: `+10 DOĞRU!`, isCorrect: true });
            } else {
                setP2Lives(l => Math.max(0, l - 1));
                setFeedbackP2({ text: `-1 CAN`, isCorrect: false });
            }
        }

        // 800ms sonra bir sonraki soruya veya oyun sonuna geç
        setTimeout(() => {
            setFeedbackP1(null);
            setFeedbackP2(null);

            // Can Kontrolü
            const nextP1Lives = p1Correct ? p1Lives : p1Lives - 1;
            const nextP2Lives = p2Correct ? p2Lives : p2Lives - 1;

            if (gameMode === 'solo' && nextP1Lives <= 0) {
                setGameState('gameover');
                return;
            }

            if (gameMode === 'duel' && (nextP1Lives <= 0 || nextP2Lives <= 0)) {
                setGameState('win');
                return;
            }

            // Soru Sonu Kontrolü
            const nextIdx = questionIndex + 1;
            if (nextIdx >= questions.length) {
                if (gameMode === 'solo') {
                    setGameState('gameover');
                } else {
                    setGameState('win');
                }
                return;
            }

            // Sıradaki Soru
            setQuestionIndex(nextIdx);
            setupGateForQuestion(questions[nextIdx]);
        }, 900);

    }, [currentGate, p1Lane, p2Lane, p1Lives, p2Lives, streak, gameMode, gameState, questionIndex, questions, setupGateForQuestion]);

    // Klavye Kontrolleri
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (gameState !== 'playing') return;

            // A ve D Tuşları (veya Sol/Sağ ok solo modda)
            if (e.key === 'a' || e.key === 'A') setP1Lane(0);
            if (e.key === 'd' || e.key === 'D') setP1Lane(1);

            if (gameMode === 'solo') {
                if (e.key === 'ArrowLeft') setP1Lane(0);
                if (e.key === 'ArrowRight') setP1Lane(1);
            } else {
                if (e.key === 'ArrowLeft') setP2Lane(0);
                if (e.key === 'ArrowRight') setP2Lane(1);
            }

            // Space tuşu ile kapıya hemen vur
            if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                handleGatePass();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [gameState, gameMode, handleGatePass]);

    // Dalga Hızı / Mesafe Sayacı (Her soru için 15 saniyelik rahat okuma ve karar verme süresi)
    useEffect(() => {
        if (gameState !== 'playing' || isPassingRef.current) return;

        const TOTAL_DURATION_MS = 15000; // 15 saniye rahat okuma süresi
        const INTERVAL_MS = 50;
        const STEP = 100 / (TOTAL_DURATION_MS / INTERVAL_MS); // Her 50ms'de ~%0.333

        const interval = setInterval(() => {
            setDistanceProgress(prev => {
                if (prev <= STEP * 1.5) {
                    clearInterval(interval);
                    handleGatePass();
                    return 0;
                }
                return Math.max(0, prev - STEP);
            });
        }, INTERVAL_MS);

        return () => clearInterval(interval);
    }, [gameState, questionIndex, handleGatePass]);

    // Skor Kaydı (Bireysel)
    const handleSaveAndExit = async () => {
        if (!user || isSaving || isScoreSaved || p1Scores <= 0) {
            router.push(backUrl);
            return;
        }
        setIsSaving(true);
        const result = await submitDogruYolKosucusuScoreAction(user.uid, p1Scores, gameContext);
        if (result.success) {
            setIsScoreSaved(true);
            toast({ title: "Başarılı!", description: "Skor sisteme kaydedildi." });
        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive" });
        }
        setIsSaving(false);
    };

    if (gameState === 'loading') {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-slate-950 text-white">
                <Loader2 className="w-14 h-14 animate-spin text-cyan-400" />
            </div>
        );
    }
    
    if (gameState === 'error') {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-950 text-white text-center p-4">
                <div className="bg-slate-900 border border-red-500/30 p-8 rounded-3xl max-w-sm">
                    <p className="text-red-400 font-bold mb-4">{error}</p>
                    <Button onClick={() => router.push(backUrl)} className="w-full bg-slate-800 hover:bg-slate-700">
                        Geri Dön
                    </Button>
                </div>
            </div>
        );
    }

    const isFinished = gameState === 'gameover';

    return (
        <WordwallShell
            title="Doğru Kapı"
            subtitle={topicName}
            score={p1Scores}
            lives={p1Lives}
            maxLives={gameMode === 'solo' ? 5 : 3}
            backUrl={backUrl}
            isFinished={isFinished}
            fitToScreen={true}
            contentClassName="w-full h-full min-h-0 overflow-hidden relative select-none touch-none p-0 flex flex-col"
        >
            {isFinished ? (
                <div className="w-full max-w-xl mx-auto my-auto animate-in zoom-in-95 duration-300">
                    <GameEndScreen
                        score={p1Scores}
                        onSave={handleSaveAndExit}
                        isSaving={isSaving}
                        scoreSaved={isScoreSaved}
                        onRestart={() => startGame('solo')}
                        backUrl={backUrl}
                    />
                </div>
            ) : (
                <DoğruYolBoard
                    gameState={gameState}
                    gameMode={gameMode}
                    startGame={startGame}
                    currentGate={currentGate}
                    questionIndex={questionIndex}
                    totalQuestions={questions.length}
                    p1Lane={p1Lane}
                    setP1Lane={setP1Lane}
                    p2Lane={p2Lane}
                    setP2Lane={setP2Lane}
                    p1Scores={p1Scores}
                    p2Scores={p2Scores}
                    p1Lives={p1Lives}
                    p2Lives={p2Lives}
                    distanceProgress={distanceProgress}
                    streak={streak}
                    feedbackP1={feedbackP1}
                    feedbackP2={feedbackP2}
                    triggerGatePass={handleGatePass}
                    setGameState={setGameState}
                    router={router}
                    backUrl={backUrl}
                />
            )}
        </WordwallShell>
    );
}

export default function DogruYolKosucusuPage() {
    return (
        <Suspense fallback={<div className="h-screen w-full flex items-center justify-center bg-slate-950"><Loader2 className="w-16 h-16 animate-spin text-cyan-400" /></div>}>
            <GameContent />
        </Suspense>
    );
}