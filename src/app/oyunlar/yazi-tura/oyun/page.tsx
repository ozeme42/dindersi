'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from "@/context/auth-context";
import { submitYaziTuraScoreAction, getYaziTuraQuestionsAction } from '../actions';
import type { Question } from "@/lib/types";
import { Loader2, ArrowLeft, Target, Sparkles, Flame, Trophy, Users, User, Play, Plus, Trash2, Home, RotateCcw } from "lucide-react";
import { Button } from '@/components/ui/button';
import { GameEndScreen } from '@/components/game-end-screen';
import { playSound } from '@/lib/audio-service';
import { useToast } from '@/hooks/use-toast';
import { cn } from "@/lib/utils";
import Confetti from 'react-dom-confetti';
import { getGameBackUrl } from '@/lib/game-navigation';
import { WordwallShell, useWordwall } from '@/components/wordwall/wordwall-shell';

// --- PREMIUM STADYUM VE FUTBOL ANİMASYONLARI ---
const premiumFootballStyles = `
  @keyframes ball-shoot-left {
    0% { transform: translateX(-50%) translateY(0) scale(1); filter: drop-shadow(0 20px 20px rgba(0,0,0,0.5)); }
    100% { transform: translate(calc(-50% - 120px), -180px) scale(0.6) rotate(-720deg); filter: drop-shadow(0 5px 5px rgba(0,0,0,0.8)); }
  }
  @keyframes ball-shoot-right {
    0% { transform: translateX(-50%) translateY(0) scale(1); filter: drop-shadow(0 20px 20px rgba(0,0,0,0.5)); }
    100% { transform: translate(calc(-50% + 120px), -180px) scale(0.6) rotate(720deg); filter: drop-shadow(0 5px 5px rgba(0,0,0,0.8)); }
  }
  @keyframes ball-shoot-center {
    0% { transform: translateX(-50%) translateY(0) scale(1); filter: drop-shadow(0 20px 20px rgba(0,0,0,0.5)); }
    100% { transform: translate(-50%, -180px) scale(0.6) rotate(1080deg); filter: drop-shadow(0 5px 5px rgba(0,0,0,0.8)); }
  }

  @keyframes ball-save-left {
    0% { transform: translateX(-50%) translateY(0) scale(1); }
    40% { transform: translate(calc(-50% - 80px), -140px) scale(0.75) rotate(-360deg); }
    100% { transform: translate(calc(-50% - 150px), -50px) scale(0.85) rotate(-540deg); opacity: 0; }
  }
  @keyframes ball-save-right {
    0% { transform: translateX(-50%) translateY(0) scale(1); }
    40% { transform: translate(calc(-50% + 80px), -140px) scale(0.75) rotate(360deg); }
    100% { transform: translate(calc(-50% + 150px), -50px) scale(0.85) rotate(540deg); opacity: 0; }
  }
  @keyframes ball-save-center {
    0% { transform: translateX(-50%) translateY(0) scale(1); }
    40% { transform: translate(-50%, -140px) scale(0.75) rotate(540deg); }
    100% { transform: translate(calc(-50% + 60px), -50px) scale(0.85) rotate(720deg); opacity: 0; }
  }
  
  @keyframes keeper-dive-left {
    0% { transform: translateX(-50%) translateY(0); }
    40% { transform: translateX(-150%) translateY(-20px) rotate(-60deg); }
    100% { transform: translateX(-200%) translateY(40px) rotate(-85deg); }
  }
  @keyframes keeper-dive-right {
    0% { transform: translateX(-50%) translateY(0); }
    40% { transform: translateX(50%) translateY(-20px) rotate(60deg); }
    100% { transform: translateX(100%) translateY(40px) rotate(85deg); }
  }
  @keyframes keeper-save-center {
    0% { transform: translateX(-50%) translateY(0); }
    50% { transform: translateX(-50%) translateY(-40px) scale(1.1); }
    100% { transform: translateX(-50%) translateY(20px); }
  }

  .premium-ball { 
    width: 60px; height: 60px; 
    border-radius: 50%; 
    background: radial-gradient(circle at 30% 30%, #ffffff, #e5e7eb 40%, #9ca3af 80%, #4b5563 100%);
    box-shadow: inset -4px -4px 12px rgba(0,0,0,0.5), 0 12px 20px rgba(0,0,0,0.6);
    position: absolute; 
    bottom: 12%; left: 50%; 
    transform: translateX(-50%); 
    z-index: 50;
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  
  .premium-ball::before {
    content: '';
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    width: 22px; height: 22px;
    background: #1f2937;
    clip-path: polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%);
    opacity: 0.8;
  }
  
  .premium-ball.ready { cursor: pointer; }
  .premium-ball.ready:hover { 
    transform: translateX(-50%) scale(1.15) translateY(-5px); 
    box-shadow: inset -4px -4px 12px rgba(0,0,0,0.5), 0 20px 30px rgba(0,255,100,0.4), 0 0 35px rgba(255,255,255,0.5); 
  }
  
  .shoot-left { animation: ball-shoot-left 0.7s cubic-bezier(0.1, 0.9, 0.2, 1) forwards !important; }
  .shoot-right { animation: ball-shoot-right 0.7s cubic-bezier(0.1, 0.9, 0.2, 1) forwards !important; }
  .shoot-center { animation: ball-shoot-center 0.7s cubic-bezier(0.1, 0.9, 0.2, 1) forwards !important; }

  .save-left { animation: ball-save-left 0.7s cubic-bezier(0.2, 0.8, 0.4, 1) forwards !important; }
  .save-right { animation: ball-save-right 0.7s cubic-bezier(0.2, 0.8, 0.4, 1) forwards !important; }
  .save-center { animation: ball-save-center 0.7s cubic-bezier(0.2, 0.8, 0.4, 1) forwards !important; }

  .premium-keeper { 
    transition: all 0.2s; width: 90px; height: 130px; 
    position: absolute; bottom: 25%; left: 50%; 
    transform: translateX(-50%); z-index: 20; 
  }
  .dive-left { animation: keeper-dive-left 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
  .dive-right { animation: keeper-dive-right 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
  .dive-center { animation: keeper-save-center 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }

  .target-zone {
    background: radial-gradient(circle, rgba(56,189,248,0.4) 0%, rgba(56,189,248,0) 70%);
    opacity: 0;
    transition: all 0.3s;
  }
  .target-container:hover .target-zone {
    opacity: 1;
    transform: scale(1.2);
  }
`;

type Team = { id: string; name: string; goals: number; color: string; };

const TEAM_COLORS = ['text-rose-400', 'text-blue-400', 'text-emerald-400', 'text-amber-400', 'text-fuchsia-400', 'text-cyan-400'];
const TEAM_BG_COLORS = ['bg-rose-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-fuchsia-500', 'bg-cyan-500'];

function PenaltyGameBoard({
    gameState,
    setGameState,
    isTeamMode,
    teams,
    setTeams,
    currentTeamIndex,
    totalQuestionsInitial,
    handleStartSinglePlayer,
    handleStartTeamMode,
    addTeam,
    removeTeam,
    handleConfirmTeams,
    handleAim,
    selectedTarget,
    keeperDirection,
    shotResult,
    showConfetti,
    currentQuestion,
    handleAnswer,
    nextTurn,
    goals,
    misses,
    score,
    streak,
    remainingQuestions,
    backUrl,
}: {
    gameState: string;
    setGameState: (s: string) => void;
    isTeamMode: boolean;
    teams: Team[];
    setTeams: (t: Team[]) => void;
    currentTeamIndex: number;
    totalQuestionsInitial: number;
    handleStartSinglePlayer: () => void;
    handleStartTeamMode: () => void;
    addTeam: () => void;
    removeTeam: (id: string) => void;
    handleConfirmTeams: () => void;
    handleAim: (dir: 'left' | 'center' | 'right') => void;
    selectedTarget: 'left' | 'center' | 'right' | null;
    keeperDirection: 'left' | 'center' | 'right' | 'dive-center';
    shotResult: 'goal' | 'save';
    showConfetti: boolean;
    currentQuestion: Question | null;
    handleAnswer: (opt: string) => void;
    nextTurn: () => void;
    goals: number;
    misses: number;
    score: number;
    streak: number;
    remainingQuestions: number;
    backUrl: string;
}) {
    const { theme } = useWordwall();
    const router = useRouter();

    if (gameState === 'mode_select') {
        return (
            <div className="w-full h-full flex items-center justify-center p-4">
                <div className={cn("w-full max-w-2xl p-6 sm:p-10 rounded-2xl border-2 shadow-2xl backdrop-blur-xl text-center", theme.cardBg, theme.cardBorder, theme.cardText)}>
                    <Trophy className="w-16 h-16 text-amber-400 mx-auto mb-4 animate-bounce" />
                    <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight mb-2">GOL KRALI</h1>
                    <p className={cn("text-sm sm:text-base font-medium mb-8", theme.subText)}>
                        Penaltı sahasına hoş geldin! Toplam {totalQuestionsInitial} soru mevcut.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                        <button 
                            onClick={handleStartSinglePlayer} 
                            className={cn(
                                "p-6 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-3 hover:scale-105 active:scale-95 shadow-md",
                                theme.buttonIdle,
                                theme.cardText,
                                theme.cardBorder
                            )}
                        >
                            <User className="w-10 h-10 text-cyan-400" />
                            <h2 className="text-xl font-black">Bireysel Oyna</h2>
                            <p className={cn("text-xs font-semibold", theme.subText)}>Tek başına rekor kırmaya çalış.</p>
                        </button>

                        <button 
                            onClick={handleStartTeamMode} 
                            className={cn(
                                "p-6 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-3 hover:scale-105 active:scale-95 shadow-md",
                                theme.buttonIdle,
                                theme.cardText,
                                theme.cardBorder
                            )}
                        >
                            <Users className="w-10 h-10 text-purple-400" />
                            <h2 className="text-xl font-black">Takım Maçı</h2>
                            <p className={cn("text-xs font-semibold", theme.subText)}>Sınıfı takımlara böl, sırayla penaltı at.</p>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (gameState === 'team_setup') {
        return (
            <div className="w-full h-full flex items-center justify-center p-4">
                <div className={cn("w-full max-w-xl p-6 sm:p-8 rounded-2xl border-2 shadow-2xl backdrop-blur-xl text-center", theme.cardBg, theme.cardBorder, theme.cardText)}>
                    <Users className="w-12 h-12 text-purple-400 mx-auto mb-3" />
                    <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight mb-2">Takımları Belirle</h2>
                    <p className={cn("text-xs sm:text-sm font-medium mb-6", theme.subText)}>
                        Oyuna katılacak takımları oluşturun (En fazla 6 takım).
                    </p>

                    <div className="flex flex-col gap-2.5 mb-6 max-h-[35vh] overflow-y-auto p-1">
                        {teams.map((team, idx) => (
                            <div key={team.id} className={cn("flex items-center gap-3 p-3 rounded-xl border", theme.subPanelBg, theme.cardBorder)}>
                                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center font-black text-white shrink-0 text-sm", TEAM_BG_COLORS[idx % TEAM_BG_COLORS.length])}>
                                    {idx + 1}
                                </div>
                                <input 
                                    type="text"
                                    value={team.name}
                                    onChange={(e) => {
                                        const newTeams = [...teams];
                                        newTeams[idx].name = e.target.value;
                                        setTeams(newTeams);
                                    }}
                                    className="flex-1 bg-transparent border-b border-white/20 focus:border-white outline-none font-bold text-base sm:text-lg text-inherit p-1 min-w-0"
                                />
                                {teams.length > 2 && (
                                    <button onClick={() => removeTeam(team.id)} className="p-1.5 text-rose-400 hover:bg-rose-500/20 rounded-lg shrink-0 transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    {teams.length < 6 && (
                        <Button onClick={addTeam} variant="outline" className={cn("w-full mb-4 border-dashed border-2 h-12 font-bold", theme.cardBorder, theme.cardText)}>
                            <Plus className="mr-2 w-4 h-4" /> Yeni Takım Ekle
                        </Button>
                    )}

                    <Button onClick={handleConfirmTeams} className="w-full h-12 text-base sm:text-lg font-black bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-md gap-2">
                        MAÇA BAŞLA <Play className="w-5 h-5 fill-current" />
                    </Button>
                    <Button variant="ghost" onClick={() => setGameState('mode_select')} className="w-full mt-2 text-xs font-semibold opacity-70 hover:opacity-100">
                        <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Geri
                    </Button>
                </div>
            </div>
        );
    }

    if (gameState === 'finished' && isTeamMode) {
        const sortedTeams = [...teams].sort((a, b) => b.goals - a.goals);
        const highestScore = sortedTeams[0].goals;
        const winners = sortedTeams.filter(t => t.goals === highestScore);
        const isTie = winners.length > 1;

        return (
            <div className="w-full h-full flex items-center justify-center p-4">
                <div className={cn("w-full max-w-2xl p-6 sm:p-10 rounded-2xl border-2 shadow-2xl backdrop-blur-xl text-center", theme.cardBg, theme.cardBorder, theme.cardText)}>
                    <Trophy className="w-16 h-16 text-amber-400 mx-auto mb-3 animate-bounce" />
                    <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight mb-2">MAÇ BİTTİ!</h2>

                    {isTie ? (
                        <div className="mb-6">
                            <p className={cn("text-base font-bold mb-2", theme.subText)}>BERABERLİK! Dostluk Kazandı.</p>
                            <div className="flex flex-wrap justify-center gap-3">
                                {winners.map(w => (
                                    <span key={w.id} className="text-2xl font-black text-amber-400">{w.name}</span>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="mb-6">
                            <span className={cn("text-xs font-bold uppercase tracking-widest block mb-1", theme.subText)}>ŞAMPİYON TAKIM</span>
                            <p className="text-3xl sm:text-4xl font-black text-amber-400">{sortedTeams[0].name}</p>
                        </div>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                        {sortedTeams.map((t, i) => (
                            <div key={t.id} className={cn("p-4 rounded-xl border text-center relative", theme.subPanelBg, theme.cardBorder, i === 0 && "ring-2 ring-amber-400")}>
                                <h3 className="text-sm font-bold truncate mb-1">{t.name}</h3>
                                <div className="text-2xl font-black text-amber-400">{t.goals} <span className="text-xs opacity-60">GOL</span></div>
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-3 justify-center">
                        <Button onClick={() => window.location.reload()} className="h-12 px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex-1 shadow-md">
                            <RotateCcw className="mr-2 h-4 w-4" /> Yeni Maç
                        </Button>
                        <Button variant="outline" onClick={() => router.push(backUrl)} className={cn("h-12 px-6 rounded-xl font-bold border flex-1", theme.cardBorder, theme.cardText)}>
                            <Home className="mr-2 h-4 w-4" /> Çıkış
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full flex flex-col min-h-0 overflow-hidden relative select-none">
            <style jsx global>{premiumFootballStyles}</style>

            {/* STADYUM ÇİM & IŞIK EFEKTİ */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-40">
                <div className="absolute bottom-0 w-full h-[60%] bg-[repeating-linear-gradient(0deg,#064e3b,#064e3b_40px,#022c22_40px,#022c22_80px)]" />
            </div>

            {/* HUD BİLGİ ŞERİDİ */}
            <div className="shrink-0 z-20 px-2 py-2 flex items-center justify-between">
                {isTeamMode ? (
                    <div className="flex items-center gap-2 overflow-x-auto py-1">
                        {teams.map((t, i) => (
                            <div 
                                key={t.id} 
                                className={cn(
                                    "px-3 py-1.5 rounded-xl border transition-all flex items-center gap-2",
                                    theme.subPanelBg,
                                    theme.cardBorder,
                                    currentTeamIndex === i ? "ring-2 ring-amber-400 scale-105 shadow-md" : "opacity-60"
                                )}
                            >
                                <span className="text-xs font-bold uppercase tracking-wider truncate max-w-[90px]">{t.name}</span>
                                <span className="text-lg font-black text-amber-400">{t.goals}</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex items-center gap-3">
                        <div className={cn("px-3 py-1 rounded-xl border flex items-center gap-2", theme.subPanelBg, theme.cardBorder)}>
                            <span className="text-xs font-bold text-emerald-400">{goals} Gol</span>
                            <span className="opacity-30">|</span>
                            <span className="text-xs font-bold text-rose-400">{misses} Kaçan</span>
                        </div>
                        {streak >= 3 && (
                            <div className="flex items-center gap-1 bg-amber-500/20 text-amber-400 border border-amber-500/40 px-2.5 py-0.5 rounded-full text-xs font-black animate-pulse">
                                <Flame className="w-3.5 h-3.5" /> {streak} Seri!
                            </div>
                        )}
                    </div>
                )}

                <span className={cn("text-xs font-bold px-3 py-1 rounded-xl border", theme.subPanelBg, theme.cardBorder, theme.subText)}>
                    Kalan: {remainingQuestions}
                </span>
            </div>

            {/* OYUN ALANI: KALE, TOP, HEDEFLER */}
            <div className="flex-1 relative z-10 flex flex-col justify-end pb-8 w-full min-h-[360px]">
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 z-50">
                    <Confetti active={showConfetti} config={{ elementCount: 200, spread: 180, startVelocity: 45 }} />
                </div>

                {/* 3D KALE */}
                <div className="absolute bottom-[20%] left-1/2 -translate-x-1/2 w-[92%] max-w-[620px] h-[210px] sm:h-[250px] z-10">
                    <div className="absolute inset-0 border-x-[12px] border-t-[12px] border-white/90 rounded-t-xl shadow-[0_0_25px_rgba(255,255,255,0.4)] z-20" />
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px] z-10" />

                    {/* HEDEF TIKLAMA ALANLARI */}
                    {gameState === 'aiming' && (
                        <>
                            <div onClick={() => handleAim('left')} className="absolute top-0 left-0 w-1/3 h-full cursor-pointer target-container z-30 flex items-center justify-center">
                                <div className="target-zone absolute inset-0" />
                                <div className="w-12 h-12 rounded-full border-2 border-cyan-400/80 flex items-center justify-center animate-pulse bg-cyan-950/30">
                                    <Target className="text-cyan-300 w-6 h-6" />
                                </div>
                            </div>
                            <div onClick={() => handleAim('center')} className="absolute top-0 left-1/3 w-1/3 h-full cursor-pointer target-container z-30 flex items-center justify-center">
                                <div className="target-zone absolute inset-0" />
                                <div className="w-12 h-12 rounded-full border-2 border-cyan-400/80 flex items-center justify-center animate-pulse bg-cyan-950/30">
                                    <Target className="text-cyan-300 w-6 h-6" />
                                </div>
                            </div>
                            <div onClick={() => handleAim('right')} className="absolute top-0 right-0 w-1/3 h-full cursor-pointer target-container z-30 flex items-center justify-center">
                                <div className="target-zone absolute inset-0" />
                                <div className="w-12 h-12 rounded-full border-2 border-cyan-400/80 flex items-center justify-center animate-pulse bg-cyan-950/30">
                                    <Target className="text-cyan-300 w-6 h-6" />
                                </div>
                            </div>
                        </>
                    )}

                    {/* KALECİ */}
                    <div className={cn(
                        "premium-keeper flex flex-col items-center",
                        (gameState === 'kicking' && keeperDirection === 'left') && "dive-left",
                        (gameState === 'kicking' && keeperDirection === 'right') && "dive-right",
                        (gameState === 'kicking' && keeperDirection === 'dive-center') && "dive-center",
                        gameState === 'aiming' && "animate-bounce"
                    )}>
                        <div className="w-9 h-9 sm:w-11 sm:h-11 bg-[#ffcc99] rounded-full border-2 border-black/40 shadow-inner relative z-20" />
                        <div className="w-14 h-16 sm:w-18 sm:h-20 bg-gradient-to-b from-purple-600 to-indigo-800 rounded-2xl border border-white/20 shadow-md -mt-2 z-10 flex items-center justify-center text-white font-black text-lg">
                            1
                        </div>
                    </div>
                </div>

                {/* TOP */}
                <div className={cn(
                    "premium-ball",
                    gameState === 'aiming' && "ready",
                    gameState === 'kicking' && shotResult === 'goal' && selectedTarget === 'left' && "shoot-left",
                    gameState === 'kicking' && shotResult === 'goal' && selectedTarget === 'right' && "shoot-right",
                    gameState === 'kicking' && shotResult === 'goal' && selectedTarget === 'center' && "shoot-center",
                    gameState === 'kicking' && shotResult === 'save' && selectedTarget === 'left' && "save-left",
                    gameState === 'kicking' && shotResult === 'save' && selectedTarget === 'right' && "save-right",
                    gameState === 'kicking' && shotResult === 'save' && selectedTarget === 'center' && "save-center"
                )} />

                {/* YÖNLENDİRME */}
                {gameState === 'aiming' && (
                    <div className="absolute bottom-3 left-0 right-0 text-center pointer-events-none">
                        <span className={cn("inline-block px-5 py-2 rounded-full text-xs sm:text-sm font-black border shadow-lg uppercase tracking-wider", theme.subPanelBg, theme.cardBorder, theme.cardText)}>
                            {isTeamMode ? `${teams[currentTeamIndex]?.name}: HEDEF SEÇ VE ŞUTUNU ÇEK!` : 'HEDEFİ SEÇ VE ŞUTUNU ÇEK!'}
                        </span>
                    </div>
                )}

                {/* SORU MODALI */}
                {gameState === 'question' && currentQuestion && (
                    <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center p-2 sm:p-4">
                        <div className={cn("w-full max-w-2xl p-5 sm:p-8 rounded-2xl border-2 shadow-2xl animate-in slide-in-from-bottom duration-300", theme.cardBg, theme.cardBorder, theme.cardText)}>
                            <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 mb-3 uppercase tracking-wider">
                                <Sparkles className="w-4 h-4" />
                                <span>{isTeamMode ? `${teams[currentTeamIndex]?.name} KULLANIYOR` : 'KRİTİK PENALTI'}</span>
                            </div>

                            <h3 className="text-base sm:text-xl font-bold mb-6 leading-relaxed">
                                {currentQuestion.text}
                            </h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                                {currentQuestion.options?.map((opt, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleAnswer(opt)}
                                        className={cn(
                                            "p-3 sm:p-4 rounded-xl font-bold text-sm sm:text-base transition-all text-left flex items-center gap-3 border-2 shadow-sm active:translate-y-1 hover:scale-[1.02] cursor-pointer",
                                            theme.buttonIdle,
                                            theme.cardText,
                                            theme.cardBorder
                                        )}
                                    >
                                        <span className="w-6 h-6 rounded-lg bg-black/20 flex items-center justify-center font-black text-xs shrink-0">
                                            {String.fromCharCode(65 + idx)}
                                        </span>
                                        <span className="flex-1 leading-snug">{opt}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* SONUÇ MODALI */}
                {gameState === 'result' && (
                    <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className={cn(
                            "text-center p-6 sm:p-8 rounded-2xl border-2 shadow-2xl max-w-sm w-full animate-in zoom-in-95 duration-200",
                            shotResult === 'goal' ? "border-emerald-400 bg-emerald-950/90 text-white" : "border-rose-400 bg-rose-950/90 text-white"
                        )}>
                            <h2 className="text-4xl sm:text-5xl font-black uppercase tracking-tight mb-2">
                                {shotResult === 'goal' ? 'GOOOOL!' : 'KAÇTI!'}
                            </h2>
                            <p className="text-sm sm:text-base font-medium mb-6 opacity-90">
                                {shotResult === 'goal' 
                                    ? (isTeamMode ? 'Harika Vuruş! Takımına +1 Gol Kazandırdın.' : 'Harika Vuruş! +10 Puan.')
                                    : 'Kaleci köşeyi doğru tahmin etti.'}
                            </p>
                            <Button 
                                onClick={nextTurn}
                                className={cn(
                                    "w-full h-12 text-base font-black rounded-xl shadow-lg transition-transform active:scale-95",
                                    shotResult === 'goal' ? "bg-emerald-500 hover:bg-emerald-600 text-slate-950" : "bg-rose-500 hover:bg-rose-600 text-white"
                                )}
                            >
                                {isTeamMode ? 'Sıra Diğer Takımda' : 'Devam Et'}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function PenaltyGameClient() {
    const { user } = useAuth();
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const router = useRouter();

    const [gameState, setGameState] = useState('loading'); 
    
    // Tek Oyunculu State
    const [score, setScore] = useState(0);
    const [goals, setGoals] = useState(0);
    const [misses, setMisses] = useState(0);
    const [streak, setStreak] = useState(0);
    
    // Takımlı Oyun State
    const [isTeamMode, setIsTeamMode] = useState(false);
    const [teams, setTeams] = useState<Team[]>([
        { id: '1', name: '1. Takım', goals: 0, color: TEAM_COLORS[0] },
        { id: '2', name: '2. Takım', goals: 0, color: TEAM_COLORS[1] }
    ]);
    const [currentTeamIndex, setCurrentTeamIndex] = useState(0);
    
    // Soru Havuzu
    const [questionsEasy, setQuestionsEasy] = useState<Question[]>([]);
    const [questionsHard, setQuestionsHard] = useState<Question[]>([]);
    const [totalQuestionsInitial, setTotalQuestionsInitial] = useState(0);
    
    const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
    const [selectedTarget, setSelectedTarget] = useState<'left' | 'center' | 'right' | null>(null);
    const [keeperDirection, setKeeperDirection] = useState<'left' | 'center' | 'right' | 'dive-center'>('center');
    const [shotResult, setShotResult] = useState<'goal' | 'save'>('save');
    
    const [isSaving, setIsSaving] = useState(false);
    const [isScoreSaved, setIsScoreSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showConfetti, setShowConfetti] = useState(false);

    const topicName = searchParams.get('topicName') || searchParams.get('title') || undefined;
    const gameContext = `Gol Kralı - ${searchParams.get('topicName') || 'Genel'}`;
    const backUrl = getGameBackUrl({ user, searchParams, defaultBackUrl: '/oyunlar/yazi-tura' }); 

    useEffect(() => {
        const fetchQuestions = async () => {
            setGameState('loading');
            const params = {
                courseId: searchParams.get('courseId') || undefined,
                unitId: searchParams.get('unitId') || undefined,
                topicId: searchParams.get('topicId') || undefined,
            };
            const { questions, error } = await getYaziTuraQuestionsAction(params);
            if (error || !questions || (questions.easy.length === 0 && questions.hard.length === 0)) {
                setError(error || "Bu konu için yeterli soru bulunamadı.");
                setGameState('error');
            } else {
                setQuestionsEasy(questions.easy);
                setQuestionsHard(questions.hard);
                setTotalQuestionsInitial(questions.easy.length + questions.hard.length);
                setGameState('mode_select');
            }
        };
        fetchQuestions();
    }, [searchParams]);

    const handleStartSinglePlayer = () => {
        setIsTeamMode(false);
        setGameState('aiming');
    };

    const handleStartTeamMode = () => {
        setIsTeamMode(true);
        setGameState('team_setup');
    };

    const addTeam = () => {
        if (teams.length >= 6) return;
        const newIdx = teams.length;
        setTeams([...teams, { id: Date.now().toString(), name: `${newIdx + 1}. Takım`, goals: 0, color: TEAM_COLORS[newIdx % TEAM_COLORS.length] }]);
    };

    const removeTeam = (id: string) => {
        if (teams.length <= 2) return;
        setTeams(teams.filter(t => t.id !== id).map((t, idx) => ({ ...t, color: TEAM_COLORS[idx % TEAM_COLORS.length] })));
    };

    const handleConfirmTeams = () => {
        setGameState('aiming');
    };

    const handleAim = (direction: 'left' | 'center' | 'right') => {
        if (gameState !== 'aiming') return;
        
        if (questionsEasy.length === 0 && questionsHard.length === 0) {
            setGameState('finished');
            return;
        }

        setSelectedTarget(direction);
        playSound('click');
        
        const currentStreakValue = isTeamMode ? 0 : streak;
        const hardProbability = Math.min(0.2 + (currentStreakValue * 0.1), 0.8);
        
        let pool = Math.random() < hardProbability ? questionsHard : questionsEasy;
        if (pool.length === 0) pool = pool === questionsHard ? questionsEasy : questionsHard;
        
        const qIndex = Math.floor(Math.random() * pool.length);
        const q = pool[qIndex];
        
        if (pool === questionsHard) {
            setQuestionsHard(prev => prev.filter((_, i) => i !== qIndex));
        } else {
            setQuestionsEasy(prev => prev.filter((_, i) => i !== qIndex));
        }
        
        setCurrentQuestion(q);
        setGameState('question');
    };

    const handleAnswer = (option: string) => {
        if (!currentQuestion || !selectedTarget) return;
        
        const isCorrect = option === currentQuestion.correctAnswer;
        const directions: ('left'|'center'|'right')[] = ['left', 'center', 'right'];
        
        if (isCorrect) {
            const safeDirections = directions.filter(d => d !== selectedTarget);
            setKeeperDirection(safeDirections[Math.floor(Math.random() * safeDirections.length)]);
            setShotResult('goal');
        } else {
            setKeeperDirection(selectedTarget === 'center' ? 'dive-center' : selectedTarget);
            setShotResult('save');
        }

        setGameState('kicking'); 
        playSound('kick'); 

        setTimeout(() => {
            if (isCorrect) {
                playSound('goal'); 
                if (isTeamMode) {
                    const newTeams = [...teams];
                    newTeams[currentTeamIndex].goals += 1;
                    setTeams(newTeams);
                } else {
                    const streakBonus = streak >= 2 ? 5 : 0; 
                    setScore(prev => prev + 10 + streakBonus); 
                    setGoals(prev => prev + 1);
                    setStreak(prev => prev + 1);
                }
                setShowConfetti(true);
            } else {
                playSound('miss'); 
                if (!isTeamMode) {
                    setMisses(prev => prev + 1);
                    setStreak(0);
                    setScore(prev => Math.max(0, prev - 5)); 
                }
            }
            setGameState('result');
        }, 800); 
    };

    const nextTurn = () => {
        if (questionsEasy.length === 0 && questionsHard.length === 0) {
            setGameState('finished');
            return;
        }
        if (isTeamMode) {
            setCurrentTeamIndex((prev) => (prev + 1) % teams.length);
        }
        setGameState('aiming');
        setSelectedTarget(null);
        setKeeperDirection('center');
        setShowConfetti(false);
    };

    const handleSaveAndExit = async () => {
        if (!user || isTeamMode || score <= 0) {
            router.push(backUrl);
            return;
        }
        setIsSaving(true);
        const result = await submitYaziTuraScoreAction(user.uid, score, gameContext);
        if (result.success) {
            setIsScoreSaved(true);
            toast({ title: 'Maç Bitti!', description: `${score} puan hanene yazıldı.` });
            router.push(backUrl);
        } else {
            toast({ title: 'Hata', description: result.error, variant: 'destructive' });
        }
        setIsSaving(false);
    };

    if (gameState === 'loading') return (
        <div className="flex h-screen items-center justify-center bg-slate-950">
            <Loader2 className="h-16 w-16 animate-spin text-cyan-500" />
        </div>
    );
    
    if (error) return (
        <div className="flex h-screen items-center justify-center bg-slate-950 text-rose-500 font-bold text-xl p-4 text-center">
            {error}
        </div>
    );

    const isFinished = gameState === 'finished';

    return (
        <WordwallShell
            title="Gol Kralı"
            subtitle={topicName || (isTeamMode ? 'Takım Penaltı Maçı' : 'Penaltı Atışı')}
            score={isTeamMode ? Math.max(0, ...teams.map(t => t.goals)) : score}
            backUrl={backUrl}
            isFinished={isFinished}
            fitToScreen={true}
            contentClassName="w-full h-full min-h-0 overflow-hidden relative flex flex-col p-2 sm:p-4"
        >
            {isFinished && !isTeamMode ? (
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
            ) : (
                <PenaltyGameBoard
                    gameState={gameState}
                    setGameState={setGameState}
                    isTeamMode={isTeamMode}
                    teams={teams}
                    setTeams={setTeams}
                    currentTeamIndex={currentTeamIndex}
                    totalQuestionsInitial={totalQuestionsInitial}
                    handleStartSinglePlayer={handleStartSinglePlayer}
                    handleStartTeamMode={handleStartTeamMode}
                    addTeam={addTeam}
                    removeTeam={removeTeam}
                    handleConfirmTeams={handleConfirmTeams}
                    handleAim={handleAim}
                    selectedTarget={selectedTarget}
                    keeperDirection={keeperDirection}
                    shotResult={shotResult}
                    showConfetti={showConfetti}
                    currentQuestion={currentQuestion}
                    handleAnswer={handleAnswer}
                    nextTurn={nextTurn}
                    goals={goals}
                    misses={misses}
                    score={score}
                    streak={streak}
                    remainingQuestions={questionsEasy.length + questionsHard.length}
                    backUrl={backUrl}
                />
            )}
        </WordwallShell>
    );
}

export default function PenaltyGamePage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-950"><Loader2 className="h-16 w-16 animate-spin text-cyan-500" /></div>}>
            <PenaltyGameClient/>
        </Suspense>
    );
}