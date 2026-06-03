'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from "@/context/auth-context";
import { submitYaziTuraScoreAction, getYaziTuraQuestionsAction } from '../actions';
import type { Question } from "@/lib/types";
import { Loader2, ArrowLeft, Target, Sparkles, Flame, Trophy, Users, User, Play, Plus, Trash2 } from "lucide-react";
import { Button } from '@/components/ui/button';
import { GameEndScreen } from '@/components/game-end-screen';
import { playSound } from '@/lib/audio-service';
import { useToast } from '@/hooks/use-toast';
import { cn } from "@/lib/utils";
import Confetti from 'react-dom-confetti';

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

  @keyframes spotlight-sweep {
    0% { transform: translateX(-100%) skewX(-30deg); opacity: 0; }
    50% { opacity: 0.5; }
    100% { transform: translateX(200%) skewX(-30deg); opacity: 0; }
  }
  
  @keyframes camera-flash {
    0% { opacity: 0; transform: scale(0.8); }
    10% { opacity: 1; transform: scale(1.2); }
    100% { opacity: 0; transform: scale(1); }
  }

  .premium-ball { 
    width: 64px; height: 64px; 
    border-radius: 50%; 
    background: radial-gradient(circle at 30% 30%, #ffffff, #e5e7eb 40%, #9ca3af 80%, #4b5563 100%);
    box-shadow: inset -5px -5px 15px rgba(0,0,0,0.5), 0 15px 25px rgba(0,0,0,0.6);
    position: absolute; 
    bottom: 15%; left: 50%; 
    transform: translateX(-50%); 
    z-index: 50;
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  
  .premium-ball::before {
    content: '';
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    width: 24px; height: 24px;
    background: #1f2937;
    clip-path: polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%);
    opacity: 0.8;
  }
  
  .premium-ball.ready { cursor: pointer; }
  .premium-ball.ready:hover { 
    transform: translateX(-50%) scale(1.15) translateY(-5px); 
    box-shadow: inset -5px -5px 15px rgba(0,0,0,0.5), 0 25px 35px rgba(0,255,100,0.4), 0 0 40px rgba(255,255,255,0.5); 
  }
  
  .shoot-left { animation: ball-shoot-left 0.7s cubic-bezier(0.1, 0.9, 0.2, 1) forwards !important; }
  .shoot-right { animation: ball-shoot-right 0.7s cubic-bezier(0.1, 0.9, 0.2, 1) forwards !important; }
  .shoot-center { animation: ball-shoot-center 0.7s cubic-bezier(0.1, 0.9, 0.2, 1) forwards !important; }

  .save-left { animation: ball-save-left 0.7s cubic-bezier(0.2, 0.8, 0.4, 1) forwards !important; }
  .save-right { animation: ball-save-right 0.7s cubic-bezier(0.2, 0.8, 0.4, 1) forwards !important; }
  .save-center { animation: ball-save-center 0.7s cubic-bezier(0.2, 0.8, 0.4, 1) forwards !important; }

  .premium-keeper { 
    transition: all 0.2s; width: 100px; height: 140px; 
    position: absolute; bottom: 25%; left: 50%; 
    transform: translateX(-50%); z-index: 20; 
  }
  .dive-left { animation: keeper-dive-left 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
  .dive-right { animation: keeper-dive-right 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
  .dive-center { animation: keeper-save-center 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }

  .glass-panel {
    background: rgba(15, 23, 42, 0.7);
    backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  }

  .broadcast-slanted {
    clip-path: polygon(15px 0, 100% 0, calc(100% - 15px) 100%, 0 100%);
  }
  
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

export function PenaltyGameClient() {
    const { user } = useAuth();
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const router = useRouter();

    // Oyun Durumu
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
    
    const [flashes, setFlashes] = useState<{id: number, top: string, left: string}[]>([]);

    const gameContext = `Gol Kralı - ${searchParams.get('topicName') || 'Genel'}`;
    const backUrl = '/oyunlar'; 

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
    
    // Rastgele seyirci flaşları
    useEffect(() => {
        if (gameState === 'aiming' || gameState === 'result') {
            const interval = setInterval(() => {
                if (Math.random() > 0.6) {
                    const newFlash = {
                        id: Date.now(),
                        top: `${10 + Math.random() * 30}%`,
                        left: `${Math.random() * 100}%`
                    };
                    setFlashes(prev => [...prev.slice(-4), newFlash]);
                }
            }, 500);
            return () => clearInterval(interval);
        }
    }, [gameState]);

    const handleStartSinglePlayer = () => {
        setIsTeamMode(false);
        setGameState('aiming');
    };

    const handleStartTeamMode = () => {
        setIsTeamMode(true);
        setGameState('team_setup');
    };

    const addTeam = () => {
        if (teams.length >= 6) return; // Max 6 takım
        const newIdx = teams.length;
        setTeams([...teams, { id: Date.now().toString(), name: `${newIdx + 1}. Takım`, goals: 0, color: TEAM_COLORS[newIdx % TEAM_COLORS.length] }]);
    };

    const removeTeam = (id: string) => {
        if (teams.length <= 2) return; // Min 2 takım
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
        
        // Takımlı modda sadece kolay sorulardan veya rastgele seçilsin, seri (streak) hesabı yok.
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
                    newTeams[currentTeamIndex].goals += 1; // Sadece gol (skor) artar
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
                if (isTeamMode) {
                    // Takımlı modda yanlışta hiçbir şey olmuyor (puan düşmüyor)
                } else {
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
        // isTeamMode ise veya user yoksa skor GÖNDERİLMEZ. Sadece ana ekrana dönülür.
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
        <div className="flex h-screen items-center justify-center bg-[#020617]">
            <div className="relative">
                <Loader2 className="h-20 w-20 animate-spin text-cyan-500" />
                <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full"></div>
            </div>
        </div>
    );
    if (error) return <div className="flex h-screen items-center justify-center bg-black text-rose-500 font-bold text-xl">{error}</div>;

    // --- MOD SEÇİM EKRANI ---
    if (gameState === 'mode_select') return (
        <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4">
            <div className="max-w-3xl w-full glass-panel rounded-3xl p-8 md:p-12 text-center border-t-4 border-cyan-500">
                <Trophy className="w-20 h-20 text-yellow-400 mx-auto mb-6 animate-pulse" />
                <h1 className="text-4xl md:text-5xl font-black text-white italic mb-4 uppercase tracking-tighter">GOL KRALI</h1>
                <p className="text-slate-400 text-lg mb-12">Maça nasıl çıkmak istersiniz? Toplam {totalQuestionsInitial} soru var.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <button onClick={handleStartSinglePlayer} className="group relative overflow-hidden bg-slate-800/80 border-2 border-slate-600 hover:border-cyan-400 p-8 rounded-2xl transition-all hover:scale-105">
                        <div className="absolute inset-0 bg-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <User className="w-12 h-12 text-cyan-400 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-white mb-2">Bireysel Oyna</h2>
                        <p className="text-slate-400 text-sm">Tek başına rekor kırmaya çalış.</p>
                    </button>
                    <button onClick={handleStartTeamMode} className="group relative overflow-hidden bg-slate-800/80 border-2 border-slate-600 hover:border-purple-400 p-8 rounded-2xl transition-all hover:scale-105">
                        <div className="absolute inset-0 bg-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <Users className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-white mb-2">Takım Maçı (Sınıf İçi)</h2>
                        <p className="text-slate-400 text-sm">Sınıfı takımlara böl ve sırayla penaltı at.</p>
                    </button>
                </div>
            </div>
        </div>
    );

    // --- TAKIM KURULUM EKRANI ---
    if (gameState === 'team_setup') return (
        <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4">
            <div className="max-w-2xl w-full glass-panel rounded-3xl p-8 border-t-4 border-purple-500 text-center">
                <Users className="w-16 h-16 text-purple-400 mx-auto mb-6" />
                <h1 className="text-3xl font-black text-white italic mb-4 uppercase tracking-tight">Takımları Belirle</h1>
                <p className="text-slate-400 mb-8">Oyuna katılacak takımları oluşturun. (Maksimum 6 Takım)</p>
                
                <div className="flex flex-col gap-4 mb-8 max-h-[40vh] overflow-y-auto p-2">
                    {teams.map((team, idx) => (
                        <div key={team.id} className="flex items-center gap-4 bg-slate-900/80 p-4 rounded-xl border border-slate-700">
                            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center font-black text-white shrink-0", TEAM_BG_COLORS[idx % TEAM_BG_COLORS.length])}>
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
                                className="flex-1 bg-transparent border-b-2 border-slate-600 focus:border-white outline-none text-xl font-bold text-white p-2 transition-colors min-w-0"
                            />
                            {teams.length > 2 && (
                                <button onClick={() => removeTeam(team.id)} className="p-2 text-rose-500 hover:bg-rose-500/20 rounded-lg shrink-0 transition-colors">
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
                
                {teams.length < 6 && (
                    <Button onClick={addTeam} variant="outline" className="w-full mb-8 border-dashed border-2 border-slate-600 text-slate-300 hover:text-white hover:border-slate-400 bg-transparent h-14">
                        <Plus className="mr-2 w-5 h-5" /> Yeni Takım Ekle
                    </Button>
                )}
                
                <Button onClick={handleConfirmTeams} className="w-full h-16 text-xl font-black bg-purple-600 hover:bg-purple-500 text-white rounded-2xl shadow-[0_0_20px_rgba(147,51,234,0.4)]">
                    MAÇA BAŞLA <Play className="ml-2 w-6 h-6" />
                </Button>
            </div>
        </div>
    );

    // --- MAÇ SONU EKRANI ---
    if (gameState === 'finished') {
        if (isTeamMode) {
            const sortedTeams = [...teams].sort((a,b) => b.goals - a.goals);
            const highestScore = sortedTeams[0].goals;
            const winners = sortedTeams.filter(t => t.goals === highestScore);
            const isTie = winners.length > 1;
            
            return (
                <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4 relative overflow-hidden">
                    <Confetti active={true} config={{ elementCount: 500, spread: 360, startVelocity: 60 }} />
                    <div className="max-w-4xl w-full glass-panel rounded-[3rem] p-8 md:p-12 text-center border-t-8 border-yellow-400 shadow-[0_0_100px_rgba(250,204,21,0.2)] max-h-[90vh] overflow-y-auto">
                        <Trophy className="w-20 h-20 md:w-24 md:h-24 text-yellow-400 mx-auto mb-6 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
                        <h1 className="text-4xl md:text-6xl font-black italic text-white uppercase tracking-tighter mb-4">MAÇ BİTTİ!</h1>
                        
                        {isTie ? (
                            <div className="mb-10">
                                <h2 className="text-2xl text-slate-300 font-bold mb-4">BERABERLİK! Dostluk Kazandı.</h2>
                                <div className="flex flex-wrap justify-center gap-4">
                                    {winners.map(w => (
                                        <span key={w.id} className={cn("text-3xl font-black italic drop-shadow-lg", w.color)}>{w.name}</span>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="mb-10">
                                <h2 className="text-xl text-slate-400 font-bold mb-2">ŞAMPİYON</h2>
                                <p className={cn("text-5xl md:text-6xl font-black italic drop-shadow-lg", sortedTeams[0].color)}>
                                    {sortedTeams[0].name}
                                </p>
                            </div>
                        )}

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
                            {sortedTeams.map((t, i) => (
                                <div key={t.id} className={cn(
                                    "bg-slate-900/80 rounded-2xl p-4 md:p-6 border relative overflow-hidden flex flex-col items-center justify-center",
                                    i === 0 ? "border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)] scale-105" : "border-slate-700"
                                )}>
                                    {i === 0 && <div className="absolute top-2 right-2"><Trophy className="w-5 h-5 text-yellow-500" /></div>}
                                    <h3 className="text-sm md:text-xl font-bold text-white mb-2 text-center truncate w-full">{t.name}</h3>
                                    <div className="text-4xl font-black text-yellow-400">{t.goals} <span className="text-xs text-slate-400">GOL</span></div>
                                </div>
                            ))}
                        </div>
                        
                        <div className="flex gap-4 justify-center">
                            <Button onClick={() => window.location.reload()} variant="outline" className="h-14 px-8 border-white/20 text-white hover:bg-white/10 rounded-xl text-lg font-bold">Yeni Maç</Button>
                            <Button onClick={() => router.push(backUrl)} className="h-14 px-8 bg-white text-black hover:bg-slate-200 rounded-xl text-lg font-bold">Ana Menü</Button>
                        </div>
                    </div>
                </div>
            )
        } else {
            return <GameEndScreen score={score} onSave={handleSaveAndExit} isSaving={isSaving} scoreSaved={isScoreSaved} onRestart={() => window.location.reload()} backUrl={backUrl} />;
        }
    }

    // --- OYUN İÇİ ARAYÜZ (TEK VEYA TAKIMLI) ---
    const remainingQuestions = questionsEasy.length + questionsHard.length;
    const currentStreakValue = isTeamMode ? 0 : streak;

    return (
        <div className="min-h-screen bg-[#020617] relative overflow-hidden font-sans select-none flex flex-col">
            <style jsx global>{premiumFootballStyles}</style>

            {/* --- PREMIUM STADYUM ARKA PLANI --- */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 w-full h-1/2 bg-gradient-to-b from-[#0f172a] via-[#064e3b] to-transparent"></div>
                <div className="absolute -top-[20%] left-[20%] w-[150%] h-[50%] bg-cyan-400/10 blur-[100px] rounded-[100%] rotate-12"></div>
                <div className="absolute top-0 left-0 w-full h-full">
                    <div className="absolute top-0 left-[-20%] w-[100px] h-[150%] bg-gradient-to-r from-transparent via-white/5 to-transparent" style={{ animation: 'spotlight-sweep 8s infinite ease-in-out' }}></div>
                    <div className="absolute top-0 right-[-20%] w-[100px] h-[150%] bg-gradient-to-r from-transparent via-white/5 to-transparent" style={{ animation: 'spotlight-sweep 12s infinite ease-in-out reverse' }}></div>
                </div>
                {flashes.map(flash => (
                    <div key={flash.id} className="absolute w-2 h-2 bg-white rounded-full shadow-[0_0_20px_10px_rgba(255,255,255,0.8)]" style={{ top: flash.top, left: flash.left, animation: 'camera-flash 0.5s ease-out forwards' }}></div>
                ))}
                <div className="absolute bottom-0 w-full h-[60%] bg-[repeating-linear-gradient(0deg,#064e3b,#064e3b_60px,#022c22_60px,#022c22_120px)] opacity-90 perspective-[1000px]">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                    <div className="absolute bottom-[20%] left-[5%] right-[5%] h-[300px] border-x-4 border-t-4 border-white/60 skew-x-[30deg] blur-[1px]"></div>
                    <div className="absolute bottom-[20%] left-[50%] -translate-x-1/2 w-[16px] h-[16px] bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.8)]"></div>
                    <div className="absolute bottom-[20%] left-[50%] -translate-x-1/2 w-[300px] h-[150px] border-4 border-white/30 rounded-t-full rounded-b-none translate-y-[-100%]"></div>
                </div>
            </div>

            {/* --- LED SCOREBOARD (JUMBOTRON) --- */}
            <div className="relative z-20 w-full p-2 md:p-6 pt-safe">
                <div className="max-w-6xl mx-auto glass-panel rounded-[2rem] p-3 md:p-4 flex justify-between items-center border-t-2 border-t-cyan-500/50">
                    
                    {/* SOL KISIM (Geri Dön) */}
                    <div className="flex items-center gap-2 md:gap-4 shrink-0">
                        <Button variant="ghost" className="text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full h-10 w-10 p-0" onClick={() => setGameState('finished')}>
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </div>
                    
                    {/* ORTA/GENİŞ KISIM (Skorlar) */}
                    <div className="flex-1 overflow-x-auto flex justify-center items-center gap-2 md:gap-4 px-2">
                        {isTeamMode ? (
                            teams.map((t, i) => (
                                <div key={t.id} className={cn(
                                    "flex flex-col items-center px-3 py-1 rounded-xl transition-all min-w-[80px]",
                                    currentTeamIndex === i ? "bg-white/10 scale-110 shadow-lg border border-white/20" : "opacity-50 scale-90"
                                )}>
                                    <span className={cn("text-[9px] md:text-[10px] font-black uppercase tracking-widest truncate max-w-[80px] md:max-w-[120px]", t.color)}>
                                        {t.name}
                                    </span>
                                    <h1 className="text-2xl md:text-3xl font-black text-white">{t.goals}</h1>
                                </div>
                            ))
                        ) : (
                            <div className="flex items-center gap-4 md:gap-8">
                                <div className="flex flex-col items-center">
                                    <span className="text-[10px] md:text-xs text-cyan-400 font-black uppercase tracking-widest flex items-center gap-1">
                                        <Trophy className="h-3 w-3" /> GOL KRALI
                                    </span>
                                    <h1 className="text-sm md:text-xl font-black italic text-white drop-shadow-md truncate max-w-[100px] md:max-w-[150px]">{user?.displayName || 'OYUNCU'}</h1>
                                </div>
                                {currentStreakValue >= 3 && (
                                    <div className="hidden md:flex items-center gap-1 bg-orange-500/20 px-3 py-1 rounded-full border border-orange-500/50 animate-pulse">
                                        <Flame className="h-4 w-4 text-orange-400" />
                                        <span className="text-orange-400 font-black italic text-xs">{currentStreakValue} SERİ!</span>
                                    </div>
                                )}
                                <div className="text-center bg-black/40 px-3 py-1 rounded-xl">
                                    <div className="text-2xl font-black text-emerald-400">{goals}</div>
                                    <div className="text-[9px] text-slate-400 uppercase font-bold">GOL</div>
                                </div>
                                <div className="text-center bg-black/40 px-3 py-1 rounded-xl">
                                    <div className="text-2xl font-black text-rose-400">{misses}</div>
                                    <div className="text-[9px] text-slate-400 uppercase font-bold">KAÇAN</div>
                                </div>
                                <div className="bg-gradient-to-b from-blue-900 to-black px-4 py-1 rounded-2xl border border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                                    <span className="block text-[8px] text-blue-300 font-black uppercase tracking-widest text-center">SKOR</span>
                                    <span className="text-2xl md:text-3xl font-black text-white">{score}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* SAĞ KISIM (Kalan Soru) */}
                    <div className="text-center shrink-0 border-l border-white/10 pl-2 md:pl-4">
                        <div className="text-xl md:text-2xl font-black text-white">{remainingQuestions}</div>
                        <div className="text-[8px] md:text-[9px] text-slate-400 uppercase font-bold">KALAN SORU</div>
                    </div>
                </div>

                {/* SIRA BİLDİRİM BARI (Takımlı Mod için) */}
                {isTeamMode && (gameState === 'aiming' || gameState === 'question') && (
                    <div className="absolute bottom-[-10px] left-1/2 -translate-x-1/2 bg-black/80 px-6 py-1 rounded-full border border-white/20 shadow-lg z-50">
                        <span className={cn("text-xs md:text-sm font-black uppercase tracking-widest animate-pulse", teams[currentTeamIndex].color)}>
                            SIRA KİMDE: {teams[currentTeamIndex].name}
                        </span>
                    </div>
                )}
            </div>

            {/* --- OYUN ALANI --- */}
            <div className="flex-grow relative z-10 flex flex-col justify-end pb-[10%] w-full h-full min-h-[500px] md:min-h-[600px]">
                
                <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
                    <Confetti active={showConfetti} config={{ elementCount: 300, spread: 180, startVelocity: 60, colors: ['#3b82f6', '#10b981', '#ffffff', '#f59e0b'] }} />
                </div>

                {/* --- 3D KALE VE AĞLAR --- */}
                <div className="absolute bottom-[22%] left-1/2 -translate-x-1/2 w-[95%] md:w-[700px] h-[250px] md:h-[300px] z-10">
                    <div className="absolute inset-0 border-x-[16px] border-t-[16px] border-white rounded-t-xl shadow-[0_0_30px_rgba(255,255,255,0.4)] z-20"></div>
                    <div className="absolute inset-0 border-x-[16px] border-t-[16px] border-black/20 rounded-t-xl z-20 translate-x-[4px] translate-y-[4px]"></div>
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 z-10" style={{ backgroundSize: '10px 10px' }}></div>
                    <div className="absolute inset-0 bg-gradient-to-b from-black/60 to-transparent z-10"></div>
                    
                    {/* HEDEF BÖLGELERİ (Neon Target) */}
                    {gameState === 'aiming' && (
                        <>
                            <div onClick={() => handleAim('left')} className="absolute top-0 left-0 w-1/3 h-full cursor-pointer target-container z-30 flex flex-col items-center justify-center gap-4">
                                <div className="target-zone absolute inset-0"></div>
                                <div className="w-12 h-12 md:w-16 md:h-16 rounded-full border-4 border-cyan-400/50 flex items-center justify-center animate-pulse relative">
                                    <div className="absolute inset-0 rounded-full border-2 border-cyan-400 blur-[4px]"></div>
                                    <Target className="text-cyan-300 w-6 h-6 md:w-8 md:h-8" />
                                </div>
                            </div>
                            <div onClick={() => handleAim('center')} className="absolute top-0 left-1/3 w-1/3 h-full cursor-pointer target-container z-30 flex flex-col items-center justify-center gap-4">
                                <div className="target-zone absolute inset-0"></div>
                                <div className="w-12 h-12 md:w-16 md:h-16 rounded-full border-4 border-cyan-400/50 flex items-center justify-center animate-pulse relative">
                                    <div className="absolute inset-0 rounded-full border-2 border-cyan-400 blur-[4px]"></div>
                                    <Target className="text-cyan-300 w-6 h-6 md:w-8 md:h-8" />
                                </div>
                            </div>
                            <div onClick={() => handleAim('right')} className="absolute top-0 right-0 w-1/3 h-full cursor-pointer target-container z-30 flex flex-col items-center justify-center gap-4">
                                <div className="target-zone absolute inset-0"></div>
                                <div className="w-12 h-12 md:w-16 md:h-16 rounded-full border-4 border-cyan-400/50 flex items-center justify-center animate-pulse relative">
                                    <div className="absolute inset-0 rounded-full border-2 border-cyan-400 blur-[4px]"></div>
                                    <Target className="text-cyan-300 w-6 h-6 md:w-8 md:h-8" />
                                </div>
                            </div>
                        </>
                    )}

                    {/* KALECİ (Detaylı) */}
                    <div className={cn(
                        "premium-keeper flex flex-col items-center",
                        (gameState === 'kicking' && keeperDirection === 'left') && "dive-left",
                        (gameState === 'kicking' && keeperDirection === 'right') && "dive-right",
                        (gameState === 'kicking' && keeperDirection === 'dive-center') && "dive-center",
                        gameState === 'aiming' && "animate-bounce" 
                    )}>
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-[#ffcc99] rounded-full border-2 border-black/50 shadow-inner relative z-20">
                            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-6 h-2 md:w-8 md:h-3 bg-black/80 rounded-full"></div>
                        </div>
                        <div className="w-16 h-20 md:w-20 md:h-24 bg-gradient-to-b from-purple-600 to-indigo-800 rounded-2xl border border-white/20 shadow-lg -mt-2 z-10 flex flex-col items-center justify-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagonal-stripes.png')] opacity-10"></div>
                            <span className="text-white font-black text-xl md:text-2xl opacity-80 drop-shadow-md">1</span>
                        </div> 
                        <div className="w-[80%] flex justify-between -mt-2 z-0">
                            <div className="w-5 h-12 md:w-6 md:h-16 bg-gradient-to-b from-slate-800 to-black rounded-b-xl border border-white/10"></div>
                            <div className="w-5 h-12 md:w-6 md:h-16 bg-gradient-to-b from-slate-800 to-black rounded-b-xl border border-white/10"></div>
                        </div>
                    </div>
                </div>

                {/* --- PREMIUM TOP --- */}
                <div className={cn(
                    "premium-ball",
                    gameState === 'aiming' && "ready",
                    gameState === 'kicking' && shotResult === 'goal' && selectedTarget === 'left' && "shoot-left",
                    gameState === 'kicking' && shotResult === 'goal' && selectedTarget === 'right' && "shoot-right",
                    gameState === 'kicking' && shotResult === 'goal' && selectedTarget === 'center' && "shoot-center",
                    gameState === 'kicking' && shotResult === 'save' && selectedTarget === 'left' && "save-left",
                    gameState === 'kicking' && shotResult === 'save' && selectedTarget === 'right' && "save-right",
                    gameState === 'kicking' && shotResult === 'save' && selectedTarget === 'center' && "save-center"
                )}></div>

                {/* --- YÖNLENDİRME MESAJI --- */}
                {gameState === 'aiming' && (
                    <div className="absolute bottom-8 left-0 right-0 text-center animate-in fade-in slide-in-from-bottom-5 duration-700 pointer-events-none">
                        <span className="inline-block bg-cyan-950/80 backdrop-blur-md text-cyan-300 px-6 py-2 md:px-8 md:py-3 rounded-full text-xs md:text-lg font-black border border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.3)] uppercase tracking-widest">
                            {isTeamMode ? 'HEDEF SEÇ VE ŞUTUNU ÇEK' : 'HEDEFİ SEÇ VE ŞUTUNU ÇEK!'}
                        </span>
                    </div>
                )}

                {/* --- YAYINCI GRAFİĞİ (SORU MODALI) --- */}
                {gameState === 'question' && currentQuestion && (
                    <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end md:items-center justify-center md:p-6 pb-0">
                        <div className="w-full max-w-4xl animate-in slide-in-from-bottom-full duration-500 ease-out">
                            <div className="flex">
                                <div className="bg-blue-600 text-white font-black italic px-4 py-2 broadcast-slanted uppercase tracking-wider text-xs md:text-base flex items-center gap-2 shadow-lg">
                                    <Sparkles className="w-4 h-4" /> {isTeamMode ? `${teams[currentTeamIndex].name} KULLANIYOR` : 'KRİTİK PENALTI'}
                                </div>
                            </div>
                            
                            <div className="bg-gradient-to-br from-slate-900/95 to-[#020617]/95 border-t-4 border-blue-500 p-5 md:p-10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] md:rounded-b-2xl md:rounded-tr-2xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/4"></div>
                                
                                <h3 className="text-lg md:text-3xl font-black text-white mb-6 md:mb-8 leading-relaxed relative z-10 drop-shadow-md">
                                    {currentQuestion.text}
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 relative z-10">
                                    {currentQuestion.options?.map((opt, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => handleAnswer(opt)}
                                            className="group relative overflow-hidden py-3 px-4 md:py-4 md:px-6 bg-slate-800/80 hover:bg-blue-600 text-slate-200 hover:text-white rounded-xl font-bold text-sm md:text-lg transition-all duration-300 border border-slate-600 hover:border-blue-400 shadow-md text-left flex items-center"
                                        >
                                            <div className="absolute inset-0 w-1/4 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -skew-x-12 -translate-x-full group-hover:animate-[spotlight-sweep_0.5s_ease-in-out]"></div>
                                            <span className="w-6 h-6 md:w-8 md:h-8 rounded-lg bg-black/30 flex items-center justify-center mr-3 text-blue-400 group-hover:text-white font-black shrink-0 border border-white/5">
                                                {String.fromCharCode(65 + idx)}
                                            </span>
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- SONUÇ MODALI --- */}
                {gameState === 'result' && (
                    <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 animate-in zoom-in-50 duration-300">
                        <div className={cn("text-center p-6 md:p-12 rounded-[2rem] md:rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-4 backdrop-blur-xl relative overflow-hidden w-[90vw] md:w-auto", 
                            shotResult === 'goal' ? "bg-emerald-900/80 border-emerald-400" : "bg-rose-900/80 border-rose-400"
                        )}>
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                            
                            <h2 className={cn("text-4xl md:text-7xl font-black italic uppercase tracking-tighter mb-4 drop-shadow-[0_5px_10px_rgba(0,0,0,0.5)] relative z-10",
                                shotResult === 'goal' ? "text-emerald-300" : "text-rose-300"
                            )}>
                                {shotResult === 'goal' ? 'GOOOOL!' : 'KAÇTI!'}
                            </h2>
                            
                            {!isTeamMode && shotResult === 'goal' && currentStreakValue >= 3 && (
                                <div className="mb-4 inline-flex items-center gap-2 bg-orange-500 text-white px-4 py-1 rounded-full font-black text-xs md:text-sm uppercase tracking-widest border-2 border-yellow-300 shadow-[0_0_15px_#f59e0b] animate-pulse">
                                    <Flame className="w-4 h-4" /> {currentStreakValue} GOL SERİSİ! (+5 BONUS)
                                </div>
                            )}

                            <p className="text-lg md:text-2xl font-bold text-white mb-6 md:mb-8 relative z-10">
                                {isTeamMode 
                                    ? (shotResult === 'goal' ? 'Harika Vuruş! Takımına +1 Gol Kazandırdın.' : 'Kaleci köşeyi doğru tahmin etti.') 
                                    : (shotResult === 'goal' ? `Harika Vuruş! +${10 + (currentStreakValue >= 3 ? 5 : 0)} Puan` : 'Kaleci köşeyi doğru tahmin etti. -5 Puan.')}
                            </p>
                            
                            <Button 
                                onClick={nextTurn} 
                                className={cn("relative z-10 font-black text-base md:text-xl px-8 py-5 md:px-10 md:py-8 rounded-xl md:rounded-2xl shadow-xl transition-transform hover:scale-105 w-full md:w-auto",
                                    shotResult === 'goal' ? "bg-emerald-400 text-emerald-950 hover:bg-emerald-300" : "bg-rose-400 text-rose-950 hover:bg-rose-300"
                                )}
                            >
                                {isTeamMode ? 'Sıra Diğer Takımda' : (shotResult === 'goal' ? 'Sıradaki Penaltı' : 'Pes Etme, Tekrar Dene')}
                            </Button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}

export default function PenaltyGamePage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-[#020617]"><Loader2 className="h-16 w-16 animate-spin text-cyan-500" /></div>}>
            <PenaltyGameClient/>
        </Suspense>
    )
}