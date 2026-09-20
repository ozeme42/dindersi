'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from "@/context/auth-context";
import { getCarkifelekQuestions, submitCarkifelekScoreAction } from '../actions';
import type { Question } from "@/lib/types";
import { 
    Loader2, Trophy, Zap, CheckCircle2, X, Sparkles, Flame, Skull, Gift, 
    CircleOff, Users, User, Target, Timer as TimerIcon, Crown, PartyPopper, 
    Bomb, Ghost, ArrowLeft 
} from "lucide-react";
import { Button } from '@/components/ui/button';
import { GameEndScreen } from '@/components/game-end-screen';
import { playSound } from '@/lib/audio-service';
import { useToast } from '@/hooks/use-toast';
import { cn } from "@/lib/utils";
import Confetti from 'react-dom-confetti';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getGameBackUrl } from "@/lib/game-navigation";
import { WordwallShell, useWordwall } from '@/components/wordwall/wordwall-shell';

// --- DİLİM AYARLARI ---
type SliceType = 'easy' | 'hard' | '2x' | 'pass' | 'bankrupt' | 'joker' | 'sabotage' | 'steal';

interface WheelSlice {
    label: string;
    type: SliceType;
    color: string;
    textColor: string;
    points: number;
    icon: any;
}

const SLICES: WheelSlice[] = [
    { label: 'KOLAY', type: 'easy', color: '#3B82F6', textColor: 'white', points: 10, icon: Sparkles }, 
    { label: 'ZOR', type: 'hard', color: '#EC4899', textColor: 'white', points: 20, icon: Flame },   
    { label: '2x PUAN', type: '2x', color: '#F59E0B', textColor: 'white', points: 40, icon: Zap },      
    { label: 'BOMBA', type: 'sabotage', color: '#9333EA', textColor: 'white', points: 0, icon: Bomb },        
    { label: 'HIRSIZ', type: 'steal', color: '#14B8A6', textColor: 'white', points: 0, icon: Ghost }, 
    { label: 'İFLAS', type: 'bankrupt', color: '#EF4444', textColor: 'white', points: 0, icon: Skull },   
    { label: 'KOLAY', type: 'easy', color: '#0EA5E9', textColor: 'white', points: 10, icon: Sparkles }, 
    { label: 'PAS', type: 'pass', color: '#64748B', textColor: 'white', points: 0, icon: CircleOff },        
    { label: 'ZOR', type: 'hard', color: '#F43F5E', textColor: 'white', points: 20, icon: Flame },        
    { label: 'JOKER', type: 'joker', color: '#10B981', textColor: 'white', points: 50, icon: Gift },     
];

const TOTAL_SLICES = SLICES.length;
const SLICE_DEGREE = 360 / TOTAL_SLICES;

const wheelStyles = `
  .wheel-wrapper {
    position: relative;
    width: min(76vmin, 340px);
    height: min(76vmin, 340px);
    border-radius: 50%;
    background: #1e293b;
    padding: 8px;
    box-shadow: 0 0 35px rgba(0, 0, 0, 0.5), inset 0 0 20px rgba(0,0,0,0.5);
    border: 4px solid #475569;
    margin: 0 auto;
  }
  
  .wheel-container { 
    width: 100%; height: 100%; 
    border-radius: 50%; 
    position: relative;
    overflow: hidden;
    transition: transform 4s cubic-bezier(0.15, 0.85, 0.35, 1.05); 
    border: 2px solid white;
  }

  @media (min-width: 768px) {
    .wheel-wrapper { 
        width: 440px; 
        height: 440px; 
        padding: 12px; 
        border-width: 6px; 
    }
    .wheel-container { border-width: 4px; }
  }

  .slice-text-container {
    position: absolute;
    top: 50%; left: 50%;
    width: 0; height: 0;
  }
  
  .slice-text {
    position: absolute;
    left: -40px; bottom: 0;
    width: 80px;
    height: 140px;
    transform-origin: bottom center;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;
    padding-top: 15px;
    text-align: center;
    color: white;
    text-shadow: 0 1px 2px rgba(0,0,0,0.8);
    pointer-events: none;
  }

  @media (min-width: 768px) {
    .slice-text { 
        left: -50px;
        width: 100px;
        height: 195px; 
        padding-top: 25px; 
    }
  }

  .pointer {
    position: absolute; 
    top: -18px; left: 50%; 
    transform: translateX(-50%);
    width: 36px; height: 46px; 
    background: radial-gradient(circle at 30% 30%, #ef4444, #991b1b);
    clip-path: polygon(100% 0, 50% 100%, 0 0);
    z-index: 50; 
    filter: drop-shadow(0 4px 6px rgba(0,0,0,0.5));
  }

  @media (min-width: 768px) {
    .pointer { width: 44px; height: 54px; top: -22px; }
  }

  .center-knob {
    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
    width: 48px; height: 48px; 
    background: radial-gradient(circle at 30% 30%, #f8fafc, #cbd5e1);
    border-radius: 50%;
    z-index: 40; 
    box-shadow: 0 0 15px rgba(0,0,0,0.5);
    display: flex; align-items: center; justify-content: center;
    border: 4px solid #475569;
  }

  @media (min-width: 768px) {
    .center-knob { width: 64px; height: 64px; border-width: 5px; }
  }

  .shake-animation {
    animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
  }

  @keyframes shake {
    10%, 90% { transform: translate3d(-1px, 0, 0); }
    20%, 80% { transform: translate3d(2px, 0, 0); }
    30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
    40%, 60% { transform: translate3d(4px, 0, 0); }
  }
`;

function CarkifelekBoard({
    gameState,
    gameMode,
    setGameMode,
    handleStartGame,
    teamScores,
    currentTeamTurn,
    teamCount,
    isComboActive,
    spinWheel,
    rotation,
    wheelGradientStops,
    currentSlice,
    stealInfo,
    currentQuestion,
    feedback,
    timeLeft,
    sabotageTarget,
    setSabotageTarget,
    setCurrentQuestion,
    setGameState,
    questionsHard,
    questionsEasy,
    selectedOption,
    handleAnswer,
    score,
    showConfetti,
    backUrl,
    handleSaveAndExit,
    isSaving,
    isScoreSaved,
}: any) {
    const { theme } = useWordwall();

    // 1. SETUP MODU
    if (gameState === 'setup') {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center p-3 sm:p-6 my-auto">
                <div className={cn(
                    "w-full max-w-md p-6 sm:p-8 rounded-3xl border-2 backdrop-blur-xl shadow-2xl flex flex-col items-center gap-6",
                    theme.cardBg,
                    theme.cardBorder,
                    theme.cardShadow
                )}>
                    <div className="text-center">
                        <h1 className={cn("text-3xl sm:text-4xl font-black uppercase tracking-tight", theme.cardText)}>
                            Oyun Modu Seç
                        </h1>
                        <p className={cn("text-xs sm:text-sm font-bold mt-1 opacity-70", theme.subText)}>
                            Bireysel oyna veya sınıfta takımlarla yarış!
                        </p>
                    </div>

                    {gameMode === 'single' ? (
                        <div className="flex flex-col gap-4 w-full">
                            <button
                                type="button"
                                onClick={() => handleStartGame('single')}
                                className={cn(
                                    "p-4 sm:p-5 rounded-2xl border-2 font-black transition-all duration-200 flex items-center gap-4 cursor-pointer shadow-lg hover:scale-[1.02] active:scale-95",
                                    theme.buttonIdle
                                )}
                            >
                                <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                                    <User className="w-6 h-6" />
                                </div>
                                <div className="text-left">
                                    <div className={cn("text-lg font-black", theme.cardText)}>Tek Kişilik</div>
                                    <div className="text-xs opacity-60">Kendi rekorunu kır, XP topla</div>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => setGameMode('team')}
                                className={cn(
                                    "p-4 sm:p-5 rounded-2xl border-2 font-black transition-all duration-200 flex items-center gap-4 cursor-pointer shadow-lg hover:scale-[1.02] active:scale-95",
                                    theme.buttonIdle
                                )}
                            >
                                <div className="w-12 h-12 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                                    <Users className="w-6 h-6" />
                                </div>
                                <div className="text-left">
                                    <div className={cn("text-lg font-black", theme.cardText)}>Takım Savaşı</div>
                                    <div className="text-xs opacity-60">2-5 Takımlı kıyasıya rekabet!</div>
                                </div>
                            </button>
                        </div>
                    ) : (
                        <div className="w-full flex flex-col gap-4">
                            <div className="text-center font-black text-sm uppercase tracking-wider">
                                Kaç Takım Yarışacak?
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {[2, 3, 4, 5].map(num => (
                                    <button
                                        key={num}
                                        type="button"
                                        onClick={() => handleStartGame('team', num)}
                                        className={cn(
                                            "py-4 rounded-xl border-2 font-black text-2xl transition-all duration-200 cursor-pointer shadow-md hover:scale-105 active:scale-95",
                                            theme.buttonIdle
                                        )}
                                    >
                                        {num} Takım
                                    </button>
                                ))}
                            </div>
                            <button
                                type="button"
                                onClick={() => setGameMode('single')}
                                className="mt-2 text-xs font-bold text-center opacity-60 hover:opacity-100 transition-opacity"
                            >
                                ← Geri Dön
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // 2. BİTİŞ MODU
    if (gameState === 'finished') {
        if (gameMode === 'single') {
            return (
                <div className="w-full max-w-xl mx-auto my-auto animate-in zoom-in-95 duration-300">
                    <GameEndScreen 
                        score={score} 
                        onSave={handleSaveAndExit} 
                        isSaving={isSaving} 
                        scoreSaved={isScoreSaved} 
                        onRestart={() => window.location.reload()} 
                        backUrl={backUrl} 
                    />
                </div>
            );
        }

        const maxScore = Math.max(...teamScores.slice(0, teamCount));
        const winners = teamScores.slice(0, teamCount).map((s: number, i: number) => s === maxScore ? i + 1 : null).filter(Boolean);

        return (
            <div className="w-full max-w-xl mx-auto my-auto flex flex-col items-center gap-4 p-4">
                <PartyPopper className="h-14 w-14 text-amber-400 animate-bounce" />
                <h1 className={cn("text-2xl sm:text-3xl font-black text-center", theme.cardText)}>
                    {winners.length > 1 ? "Beraberlik!" : `Tebrikler ${winners[0]}. Takım!`}
                </h1>

                <div className={cn(
                    "w-full rounded-2xl border-2 p-4 backdrop-blur-xl shadow-2xl flex flex-col gap-2",
                    theme.cardBg,
                    theme.cardBorder
                )}>
                    {teamScores.slice(0, teamCount).map((s: number, index: number) => {
                        const isWinner = s === maxScore && s > 0;
                        return (
                            <div
                                key={index}
                                className={cn(
                                    "flex justify-between items-center p-3 rounded-xl font-black text-base border transition-all",
                                    isWinner 
                                        ? cn(theme.buttonSelected, "shadow-md")
                                        : cn(theme.subPanelBg, theme.cardBorder)
                                )}
                            >
                                <span>{index + 1}. Takım</span>
                                <span>{s} Puan</span>
                            </div>
                        );
                    })}
                </div>

                <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className={cn(
                        "w-full py-3.5 px-6 rounded-xl font-black text-base border-2 shadow-xl cursor-pointer active:scale-95 transition-all mt-2",
                        theme.buttonSelected
                    )}
                >
                    Rövanş Maçı Yap
                </button>
            </div>
        );
    }

    // 3. OYUN ALANI (Wheel + Modals)
    return (
        <div className="w-full h-full min-h-0 flex flex-col items-center justify-between p-1 sm:p-3 overflow-hidden relative">
            <style jsx global>{wheelStyles}</style>

            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50">
                <Confetti active={showConfetti} config={{ elementCount: 200, spread: 360, startVelocity: 40 }} />
            </div>

            {/* TAKIM SKORLARI HUD (Takım Modundaysa) */}
            {gameMode === 'team' && (
                <div className={cn(
                    "flex-shrink-0 flex items-center gap-2 p-1.5 sm:p-2 rounded-2xl border-2 backdrop-blur-md max-w-full overflow-x-auto custom-scrollbar mb-1",
                    theme.subPanelBg,
                    theme.cardBorder
                )}>
                    {teamScores.slice(0, teamCount).map((s: number, i: number) => {
                        const isCurrentTurn = currentTeamTurn === i;
                        return (
                            <div
                                key={i}
                                className={cn(
                                    "flex-shrink-0 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl flex items-center gap-2 font-black text-xs sm:text-sm border transition-all",
                                    isCurrentTurn 
                                        ? cn(theme.buttonSelected, "scale-105 shadow-sm") 
                                        : "opacity-60 border-transparent"
                                )}
                            >
                                <span>{i + 1}.T</span>
                                <span className="text-amber-400">{s}P</span>
                                {isComboActive && isCurrentTurn && <Flame className="w-3.5 h-3.5 text-orange-400" />}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ÇARK CONTAINER */}
            <div className="flex-1 flex flex-col items-center justify-center min-h-0 w-full overflow-hidden my-auto">
                <div className="wheel-wrapper">
                    <div className="pointer" />
                    <div
                        className="wheel-container"
                        style={{
                            transform: `rotate(${rotation}deg)`,
                            background: `conic-gradient(from 0deg, ${wheelGradientStops})`
                        }}
                    >
                        {SLICES.map((slice, index) => {
                            const angle = index * SLICE_DEGREE + (SLICE_DEGREE / 2);
                            const Icon = slice.icon;
                            return (
                                <div
                                    key={index}
                                    className="slice-text-container"
                                    style={{ transform: `rotate(${angle}deg)` }}
                                >
                                    <div className="slice-text">
                                        <Icon className="w-5 h-5 md:w-7 md:h-7 mb-1 opacity-90 drop-shadow-md" />
                                        <span className="font-black text-[9px] md:text-xs tracking-tight block max-w-[65px] leading-tight drop-shadow-md">
                                            {slice.label}
                                        </span>
                                        {slice.points > 0 && (
                                            <span className="text-[8px] md:text-[10px] font-bold opacity-90 mt-0.5">
                                                {slice.points}P
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="center-knob">
                        <Zap className="h-5 w-5 md:h-7 md:w-7 text-slate-700 fill-current" />
                    </div>
                </div>

                {/* ÇEVİR BUTONU */}
                {gameState === 'idle' && (
                    <div className="mt-3 sm:mt-5 animate-in slide-in-from-bottom-3 duration-300 z-30">
                        <button
                            type="button"
                            onClick={spinWheel}
                            className={cn(
                                "px-8 sm:px-12 py-3 sm:py-4 rounded-full font-black text-base sm:text-xl border-2 shadow-xl transition-all cursor-pointer active:scale-95 flex items-center gap-2.5",
                                theme.buttonSelected
                            )}
                        >
                            <Zap className="w-5 h-5" />
                            <span>{gameMode === 'team' ? `${currentTeamTurn + 1}. Takım Çevir!` : "Çarkı Çevir!"}</span>
                        </button>
                    </div>
                )}
            </div>

            {/* SABOTAJ MODALI */}
            {gameState === 'sabotage_select' && (
                <div className="fixed inset-0 z-[100] bg-black/80 flex flex-col items-center justify-center p-4 backdrop-blur-md animate-in zoom-in-95">
                    <div className={cn(
                        "p-6 sm:p-8 rounded-3xl border-2 max-w-lg w-full text-center flex flex-col items-center gap-4",
                        theme.cardBg,
                        theme.cardBorder
                    )}>
                        <Bomb className="w-16 h-16 text-purple-400 animate-bounce" />
                        <h2 className={cn("text-2xl sm:text-3xl font-black uppercase tracking-tight", theme.cardText)}>
                            Hedefini Seç!
                        </h2>
                        <p className={cn("text-xs sm:text-sm font-bold opacity-70", theme.subText)}>
                            Zor soruyu kime kitleyeceksin? Bilemezlerse -30 Puan kaybederler!
                        </p>
                        <div className="grid grid-cols-2 gap-3 w-full mt-2">
                            {teamScores.slice(0, teamCount).map((_: any, idx: number) => {
                                if (idx === currentTeamTurn) return null;
                                return (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => {
                                            playSound('click');
                                            setSabotageTarget(idx);
                                            const pool = questionsHard;
                                            const q = pool[Math.floor(Math.random() * pool.length)] || questionsEasy[0];
                                            setCurrentQuestion(q);
                                            setGameState('question');
                                        }}
                                        className={cn(
                                            "p-4 rounded-xl border-2 font-black text-base transition-all cursor-pointer flex items-center justify-between shadow-md active:scale-95",
                                            theme.buttonIdle
                                        )}
                                    >
                                        <span>{idx + 1}. Takım</span>
                                        <Target className="w-5 h-5 text-purple-400" />
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* SONUÇ MESAJI MODALI (Pas, İflas, Joker, Steal) */}
            {gameState === 'result' && currentSlice && (
                <div className="fixed inset-0 flex items-center justify-center z-[110] p-4 bg-black/75 backdrop-blur-sm animate-in zoom-in-95">
                    <div className={cn(
                        "border-2 p-6 sm:p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center flex flex-col items-center gap-3",
                        theme.cardBg,
                        theme.cardBorder
                    )}>
                        <div className="p-4 rounded-full bg-white/10 shadow-inner">
                            <currentSlice.icon className="w-14 h-14" style={{ color: currentSlice.color }} />
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-black uppercase" style={{ color: currentSlice.color }}>
                            {currentSlice.label}
                        </h2>
                        <p className={cn("text-sm sm:text-base font-bold leading-relaxed", theme.cardText)}>
                            {currentSlice.type === 'pass' && "Bu turu pas geçiyorsun."}
                            {currentSlice.type === 'bankrupt' && "Eyvah! Puanlar sıfırlandı!"}
                            {currentSlice.type === 'joker' && "+50 Puan hediye kazandın!"}
                            {currentSlice.type === 'steal' && (stealInfo ? `${stealInfo.from + 1}. Takım'dan ${stealInfo.amount} puan çaldın!` : "Çalacak puan bulunamadı.")}
                        </p>
                    </div>
                </div>
            )}

            {/* SORU MODALI */}
            {(gameState === 'question' || gameState === 'feedback') && currentQuestion && currentSlice && (
                <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in zoom-in-95 duration-200">
                    <div className={cn(
                        "border-2 rounded-2xl sm:rounded-3xl p-4 sm:p-8 w-full max-w-3xl shadow-2xl relative overflow-hidden flex flex-col transition-all max-h-[92dvh]",
                        theme.cardBg,
                        theme.cardBorder,
                        theme.cardShadow,
                        feedback === 'correct' && "border-emerald-500 shadow-[0_0_50px_rgba(16,185,129,0.4)]",
                        feedback === 'wrong' && "border-rose-500 shadow-[0_0_50px_rgba(244,63,94,0.4)]"
                    )}>
                        {/* Header */}
                        <div className="flex items-center justify-between gap-3 mb-4 flex-shrink-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs sm:text-sm font-black px-3 py-1 rounded-full uppercase text-white shadow-md flex items-center gap-1.5" style={{ backgroundColor: currentSlice.color }}>
                                    <currentSlice.icon className="w-3.5 h-3.5" /> {currentSlice.label}
                                </span>
                                {currentSlice.type !== 'sabotage' && (
                                    <span className={cn("px-3 py-1 rounded-full text-xs sm:text-sm font-black flex items-center gap-1", theme.badgeCounter)}>
                                        +{currentSlice.type === '2x' ? 40 : currentSlice.points} P
                                        {isComboActive && <Flame className="w-3.5 h-3.5 text-amber-400" />}
                                    </span>
                                )}
                                {currentSlice.type === 'sabotage' && sabotageTarget !== null && (
                                    <span className="text-xs font-black text-rose-400 bg-rose-500/20 border border-rose-500/40 px-3 py-1 rounded-full animate-pulse flex items-center gap-1.5">
                                        <Bomb className="w-3.5 h-3.5" /> {sabotageTarget + 1}. TAKIM
                                    </span>
                                )}
                            </div>

                            {timeLeft !== null && feedback === null && (
                                <div className={cn(
                                    "flex items-center gap-2 px-3.5 py-1 rounded-full font-black text-base sm:text-xl shadow-md",
                                    timeLeft <= 5 ? "bg-rose-600 text-white animate-pulse" : cn(theme.subPanelBg, theme.cardText, "border")
                                )}>
                                    <TimerIcon className="w-4 h-4" />
                                    <span>{timeLeft}s</span>
                                </div>
                            )}
                        </div>

                        {/* Soru Metni */}
                        <div className="overflow-y-auto custom-scrollbar flex-1 mb-4 text-center px-2 py-2">
                            <h3 className={cn("text-base sm:text-2xl md:text-3xl font-black leading-snug", theme.cardText)}>
                                {currentQuestion.text}
                            </h3>
                        </div>

                        {/* Feedback Banner */}
                        {feedback && feedback !== 'timeout' && (
                            <div className="w-full mb-3 flex items-center justify-center animate-in slide-in-from-top-3 duration-200">
                                {feedback === 'correct' ? (
                                    <div className="bg-emerald-600 text-white px-5 py-1.5 rounded-full font-black text-sm sm:text-lg shadow-lg flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" /> DOĞRU CEVAP!
                                    </div>
                                ) : (
                                    <div className="bg-rose-600 text-white px-5 py-1.5 rounded-full font-black text-sm sm:text-lg shadow-lg flex items-center gap-2">
                                        <X className="w-4 h-4 sm:w-5 sm:h-5" /> YANLIŞ CEVAP!
                                    </div>
                                )}
                            </div>
                        )}

                        {feedback === 'timeout' && (
                            <div className="w-full mb-3 flex items-center justify-center animate-in zoom-in duration-200">
                                <div className="bg-rose-600 text-white px-5 py-1.5 rounded-full font-black text-sm sm:text-lg shadow-lg flex items-center gap-2 animate-bounce">
                                    <TimerIcon className="w-4 h-4 sm:w-5 sm:h-5" /> SÜRE DOLDU!
                                </div>
                            </div>
                        )}

                        {/* Seçenekler */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 flex-shrink-0">
                            {currentQuestion.options?.map((opt: string, idx: number) => {
                                const isSelected = selectedOption === opt;
                                const isCorrect = opt === currentQuestion.correctAnswer;
                                let btnStyle = theme.buttonIdle;

                                if (feedback !== null) {
                                    if (isCorrect) {
                                        btnStyle = "bg-emerald-600 border-emerald-400 text-white shadow-[0_0_20px_rgba(16,185,129,0.5)] scale-[1.01]";
                                    } else if (isSelected) {
                                        btnStyle = "bg-rose-600 border-rose-400 text-white shadow-[0_0_20px_rgba(244,63,94,0.5)]";
                                    } else {
                                        btnStyle = "opacity-30 border-transparent";
                                    }
                                }

                                return (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => handleAnswer(opt)}
                                        disabled={feedback !== null}
                                        className={cn(
                                            "p-3 sm:p-4 rounded-xl sm:rounded-2xl font-black text-xs sm:text-base border-2 text-left flex items-center gap-2.5 sm:gap-3 transition-all duration-200 cursor-pointer shadow-md",
                                            feedback === null && "hover:scale-[1.01] active:scale-95",
                                            btnStyle
                                        )}
                                    >
                                        <span className={cn(
                                            "w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center font-black text-xs sm:text-sm shrink-0 border transition-colors",
                                            feedback !== null && isCorrect ? "bg-white text-emerald-800" : theme.badgeCounter
                                        )}>
                                            {String.fromCharCode(65 + idx)}
                                        </span>
                                        <span className="flex-1 break-words line-clamp-2">{opt}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function CarkifelekGameClient() {
    const { user } = useAuth();
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const router = useRouter();

    const [score, setScore] = useState(0);
    const [rotation, setRotation] = useState(0);
    const [gameState, setGameState] = useState<'loading' | 'setup' | 'idle' | 'spinning' | 'result' | 'question' | 'feedback' | 'finished' | 'sabotage_select'>('loading');
    
    const [questionsEasy, setQuestionsEasy] = useState<Question[]>([]);
    const [questionsHard, setQuestionsHard] = useState<Question[]>([]);
    const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
    const [currentSlice, setCurrentSlice] = useState<WheelSlice | null>(null);
    const [feedback, setFeedback] = useState<'correct' | 'wrong' | 'timeout' | null>(null);
    
    const [gameMode, setGameMode] = useState<'single' | 'team'>('single');
    const [teamCount, setTeamCount] = useState<number>(2);
    const [teamScores, setTeamScores] = useState<number[]>([0, 0, 0, 0, 0]);
    const [currentTeamTurn, setCurrentTeamTurn] = useState<number>(0);
    const [streak, setStreak] = useState<number[]>([0, 0, 0, 0, 0]);
    
    const [sabotageTarget, setSabotageTarget] = useState<number | null>(null);
    const [stealInfo, setStealInfo] = useState<{from: number, amount: number} | null>(null);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);

    const [isSaving, setIsSaving] = useState(false);
    const [isScoreSaved, setIsScoreSaved] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const topicName = searchParams.get('topicName') || 'Ders Soruları';
    const gameContext = `Çarkıfelek - ${searchParams.get('courseName') || 'Ders'} > ${topicName}`;
    const backUrl = getGameBackUrl({ user, searchParams, defaultBackUrl: '/oyunlar/carkifelek' });

    const wheelGradientStops = useMemo(() => {
        return SLICES.map((slice, i) => {
            const start = i * SLICE_DEGREE;
            const end = start + SLICE_DEGREE;
            return `${slice.color} ${start}deg ${end}deg`;
        }).join(', ');
    }, []);

    useEffect(() => {
        const fetchQuestions = async () => {
            setGameState('loading');
            const params = {
                courseId: searchParams.get('courseId') || undefined,
                unitId: searchParams.get('unitId') || undefined,
                topicId: searchParams.get('topicId') || undefined,
                isStatic: searchParams.get('isStatic') === 'true',
            };
            const { questions, error } = await getCarkifelekQuestions(params);
            if (error || !questions) {
                setError(error || "Sorular yüklenemedi.");
                setGameState('finished');
            } else {
                setQuestionsEasy(questions.easy);
                setQuestionsHard(questions.hard);
                setGameState('setup');
            }
        };
        fetchQuestions();
    }, [searchParams]);

    const handleTimeout = () => {
        playSound('incorrect');
        setFeedback('timeout');
        
        if (currentSlice?.type === 'sabotage' && sabotageTarget !== null) {
            const newScores = [...teamScores];
            newScores[sabotageTarget] = Math.max(0, newScores[sabotageTarget] - 30);
            setTeamScores(newScores);
        }

        setTimeout(() => {
            setFeedback(null);
            nextTurn();
        }, 2500);
    };

    useEffect(() => {
        if (gameState !== 'question' || !currentQuestion) return;

        let initialTime = 30;
        if (currentQuestion.type === 'tf') initialTime = 15;

        setTimeLeft(initialTime);

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev === null || prev <= 0) {
                    clearInterval(timer);
                    handleTimeout();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [gameState, currentQuestion]);

    const handleStartGame = (mode: 'single' | 'team', count: number = 2) => {
        setGameMode(mode);
        setTeamCount(count);
        setTeamScores(new Array(count).fill(0));
        setStreak(new Array(count).fill(0));
        setCurrentTeamTurn(0);
        setScore(0);
        setGameState('idle');
    };

    const nextTurn = () => {
        setSabotageTarget(null);
        setStealInfo(null);
        setSelectedOption(null);
        if (gameMode === 'team') {
            setCurrentTeamTurn((prev) => (prev + 1) % teamCount);
        }
        setGameState('idle');
    };

    const spinWheel = () => {
        if (gameState !== 'idle') return;
        setGameState('spinning');
        playSound('coin-flip'); 

        const winningIndex = Math.floor(Math.random() * TOTAL_SLICES);
        const winningSlice = SLICES[winningIndex];
        
        const sliceCenterAngle = (winningIndex * SLICE_DEGREE) + (SLICE_DEGREE / 2);
        const currentFullRotations = Math.floor(rotation / 360);
        
        const spins = 5 + Math.floor(Math.random() * 6);
        const targetRotation = ((currentFullRotations + spins) * 360) - sliceCenterAngle;
        
        const jitter = Math.floor(Math.random() * 34) - 17;
        const finalRotation = targetRotation + jitter;

        setRotation(finalRotation);

        setTimeout(() => {
            setCurrentSlice(winningSlice);
            playSound('pop');
            processSliceResult(winningSlice);
        }, 4000); 
    };

    const processSliceResult = (slice: WheelSlice) => {
        if (slice.type === 'pass') {
            playSound('lose');
            setGameState('result');
            setTimeout(nextTurn, 2500);
        } else if (slice.type === 'bankrupt') {
            playSound('lose');
            if (gameMode === 'single') {
                setScore(0);
            } else {
                const newScores = [...teamScores];
                newScores[currentTeamTurn] = 0;
                setTeamScores(newScores);
                const newStreaks = [...streak];
                newStreaks[currentTeamTurn] = 0;
                setStreak(newStreaks);
            }
            setGameState('result');
            setTimeout(nextTurn, 3000);
        } else if (slice.type === 'joker') {
            playSound('win');
            if (gameMode === 'single') {
                setScore(s => s + slice.points);
            } else {
                const newScores = [...teamScores];
                newScores[currentTeamTurn] += slice.points;
                setTeamScores(newScores);
            }
            setShowConfetti(true);
            setGameState('result');
            setTimeout(() => { 
                setShowConfetti(false); 
                nextTurn();
            }, 3000);
        } else if (slice.type === 'steal') {
            playSound('win'); 
            if (gameMode === 'team') {
                let highestScore = -1;
                let targetIdx = -1;
                teamScores.forEach((s, idx) => {
                    if (idx !== currentTeamTurn && s > highestScore) {
                        highestScore = s;
                        targetIdx = idx;
                    }
                });
                
                if (targetIdx !== -1 && highestScore > 0) {
                    const amount = Math.min(30, highestScore);
                    const newScores = [...teamScores];
                    newScores[targetIdx] -= amount;
                    newScores[currentTeamTurn] += amount;
                    setTeamScores(newScores);
                    setStealInfo({ from: targetIdx, amount });
                } else {
                    setStealInfo(null);
                }
            } else {
                setScore(s => s + 30);
            }
            setGameState('result');
            setTimeout(nextTurn, 4000);
        } else if (slice.type === 'sabotage') {
            if (gameMode === 'team') {
                setGameState('sabotage_select');
            } else {
                setGameState('result');
                setTimeout(nextTurn, 2500);
            }
        } else {
            const pool = slice.type === 'easy' ? questionsEasy : questionsHard;
            const finalPool = slice.type === '2x' ? questionsHard : pool;
            
            if (finalPool.length === 0) {
                if (gameMode === 'single') setScore(s => s + slice.points);
                else {
                    const newScores = [...teamScores];
                    newScores[currentTeamTurn] += slice.points;
                    setTeamScores(newScores);
                }
                setGameState('idle');
                return;
            }

            const q = finalPool[Math.floor(Math.random() * finalPool.length)];
            setCurrentQuestion(q);
            setGameState('question');
        }
    };

    const handleAnswer = (option: string) => {
        if (!currentQuestion || !currentSlice) return;
        
        setSelectedOption(option);
        const isCorrect = option === currentQuestion.correctAnswer;
        
        if (isCorrect) {
            playSound('correct');
            setFeedback('correct');
            
            if (currentSlice.type === 'sabotage' && sabotageTarget !== null) {
                const newScores = [...teamScores];
                newScores[sabotageTarget] += 30;
                setTeamScores(newScores);
            } else {
                let pointsToAdd = currentSlice.points;
                if (currentSlice.type === '2x') pointsToAdd = 40; 
                
                if (gameMode === 'single') {
                    setScore(prev => prev + pointsToAdd);
                } else {
                    const newScores = [...teamScores];
                    const newStreaks = [...streak];
                    const isCombo = newStreaks[currentTeamTurn] >= 2;
                    const multiplier = isCombo ? 1.5 : 1;
                    
                    newScores[currentTeamTurn] += Math.floor(pointsToAdd * multiplier);
                    newStreaks[currentTeamTurn] += 1;
                    
                    setTeamScores(newScores);
                    setStreak(newStreaks);
                }
            }
            setShowConfetti(true);
        } else {
            playSound('incorrect');
            setFeedback('wrong');
            
            if (currentSlice.type === 'sabotage' && sabotageTarget !== null) {
                const newScores = [...teamScores];
                newScores[sabotageTarget] = Math.max(0, newScores[sabotageTarget] - 30);
                setTeamScores(newScores);
            } else {
                if (gameMode === 'team') {
                    const newStreaks = [...streak];
                    newStreaks[currentTeamTurn] = 0;
                    setStreak(newStreaks);
                }
            }
        }

        setTimeout(() => {
            setFeedback(null);
            setSelectedOption(null);
            setShowConfetti(false);
            nextTurn();
        }, 3000);
    };

    const handleSaveAndExit = async () => {
        if (isSaving || isScoreSaved || !user || score <= 0) {
            router.push(backUrl);
            return;
        }
        setIsSaving(true);
        const result = await submitCarkifelekScoreAction(user.uid, score, gameContext);
        if (result.success) {
            setIsScoreSaved(true);
            toast({ title: 'Tebrikler!', description: `${score} puan kazandın!` });
            router.push(backUrl);
        } else {
            toast({ title: 'Hata', description: result.error, variant: 'destructive' });
        }
        setIsSaving(false);
    };

    if (gameState === 'loading') {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
                <Loader2 className="h-14 w-14 animate-spin text-purple-500" />
            </div>
        );
    }

    const currentStreakValue = gameMode === 'team' ? streak[currentTeamTurn] : 0;
    const isComboActive = currentStreakValue >= 2;

    return (
        <WordwallShell
            title="Çarkıfelek"
            subtitle={topicName}
            score={gameMode === 'single' ? score : (teamScores[currentTeamTurn] || 0)}
            backUrl={backUrl}
            isFinished={gameState === 'finished'}
            fitToScreen={true}
            contentClassName="w-full h-full min-h-0 overflow-hidden p-1 sm:p-2.5 flex flex-col justify-center items-center"
        >
            <CarkifelekBoard
                gameState={gameState}
                gameMode={gameMode}
                setGameMode={setGameMode}
                handleStartGame={handleStartGame}
                teamScores={teamScores}
                currentTeamTurn={currentTeamTurn}
                teamCount={teamCount}
                isComboActive={isComboActive}
                spinWheel={spinWheel}
                rotation={rotation}
                wheelGradientStops={wheelGradientStops}
                currentSlice={currentSlice}
                stealInfo={stealInfo}
                currentQuestion={currentQuestion}
                feedback={feedback}
                timeLeft={timeLeft}
                sabotageTarget={sabotageTarget}
                setSabotageTarget={setSabotageTarget}
                setCurrentQuestion={setCurrentQuestion}
                setGameState={setGameState}
                questionsHard={questionsHard}
                questionsEasy={questionsEasy}
                selectedOption={selectedOption}
                handleAnswer={handleAnswer}
                score={score}
                showConfetti={showConfetti}
                backUrl={backUrl}
                handleSaveAndExit={handleSaveAndExit}
                isSaving={isSaving}
                isScoreSaved={isScoreSaved}
            />
        </WordwallShell>
    );
}

export default function CarkifelekGamePage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-950"><Loader2 className="h-16 w-16 animate-spin text-purple-500" /></div>}>
            <CarkifelekGameClient />
        </Suspense>
    );
}