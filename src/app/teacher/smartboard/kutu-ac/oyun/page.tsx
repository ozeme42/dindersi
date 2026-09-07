'use client';

import { useState, useEffect, useCallback, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getKutuAcQuestionsAction } from '../actions';
import type { Question } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { 
  Loader2, ArrowLeft, Package, CheckCheck, Play, Trophy, 
  Crown, RotateCcw, Home, Plus, Minus, AlertTriangle, Sparkles 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { FullscreenToggle } from '@/components/fullscreen-toggle';
import { QuestionDialog } from '@/components/question-dialog';
import { playSound } from '@/lib/audio-service';
import confetti from 'canvas-confetti';

// --- YARDIMCI FONKSİYONLAR ---
const shuffleArray = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

// --- TAKIM AYARLARI ---
const TEAMS = [
  { name: 'A Takımı', short: 'A', color: 'text-red-400', border: 'border-red-500', bg: 'bg-red-500/20', from: 'from-red-600', to: 'to-orange-600', shadow: 'shadow-red-500/40', activeGlow: 'shadow-[0_0_25px_rgba(239,68,68,0.4)] ring-2 ring-red-500/50' },
  { name: 'B Takımı', short: 'B', color: 'text-blue-400', border: 'border-blue-500', bg: 'bg-blue-500/20', from: 'from-blue-600', to: 'to-cyan-600', shadow: 'shadow-blue-500/40', activeGlow: 'shadow-[0_0_25px_rgba(59,130,246,0.4)] ring-2 ring-blue-500/50' },
  { name: 'C Takımı', short: 'C', color: 'text-emerald-400', border: 'border-emerald-500', bg: 'bg-emerald-500/20', from: 'from-emerald-600', to: 'to-green-600', shadow: 'shadow-emerald-500/40', activeGlow: 'shadow-[0_0_25px_rgba(16,185,129,0.4)] ring-2 ring-emerald-500/50' },
  { name: 'D Takımı', short: 'D', color: 'text-yellow-400', border: 'border-yellow-500', bg: 'bg-yellow-500/20', from: 'from-yellow-600', to: 'to-amber-600', shadow: 'shadow-yellow-500/40', activeGlow: 'shadow-[0_0_25px_rgba(234,179,8,0.4)] ring-2 ring-yellow-500/50' },
  { name: 'E Takımı', short: 'E', color: 'text-pink-400', border: 'border-pink-500', bg: 'bg-pink-500/20', from: 'from-pink-600', to: 'to-rose-600', shadow: 'shadow-pink-500/40', activeGlow: 'shadow-[0_0_25px_rgba(236,72,153,0.4)] ring-2 ring-pink-500/50' },
];

type KutuIcerik = { type: 'soru'; data: Question };

type Player = {
  id: number;
  name: string;
  score: number;
  teamConfig?: typeof TEAMS[0];
};

function KutuAcGame() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // URL parametreleri
  const courseName = searchParams.get('courseName') || '';
  const unitName = searchParams.get('unitName') || '';
  const topicName = searchParams.get('topicName') || '';
  const className = searchParams.get('className') || '';
  const questionCount = parseInt(searchParams.get('questionCount') || '999', 10);
  const backUrl = "/teacher/smartboard/kutu-ac";

  // Oyun Durumları
  const [gameState, setGameState] = useState<'setup' | 'loading' | 'playing' | 'finished'>('setup');
  
  const [selectedTeamCount, setSelectedTeamCount] = useState<number>(2);
  const [players, setPlayers] = useState<Player[]>([]);
  const [activePlayerIndex, setActivePlayerIndex] = useState(0);
  
  const [kutuIcerikleri, setKutuIcerikleri] = useState<KutuIcerik[]>([]);
  const [openedBoxes, setOpenedBoxes] = useState<Set<number>>(new Set());
  const [openedQuestion, setOpenedQuestion] = useState<{ number: number; question: Question } | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  
  const mainContentRef = useRef<HTMLDivElement>(null);

  // Konfeti tetikleyici
  useEffect(() => {
    if (gameState === 'finished') {
      try {
        playSound('win');
      } catch (e) {}
      
      try {
        confetti({
          particleCount: 80,
          spread: 80,
          origin: { y: 0.6 }
        });
      } catch (e) {}
    }
  }, [gameState]);

  // --- OYUN BAŞLATMA ---
  const startGame = async () => {
    setGameState('loading');
    setError(null);

    const params = {
      courseId: searchParams.get('courseId') || undefined,
      unitId: searchParams.get('unitId') || undefined,
      topicId: searchParams.get('topicId') || undefined,
      questionCount: questionCount, 
    };

    const result = await getKutuAcQuestionsAction(params);

    if (result.error && (!result.questions || result.questions.length === 0)) {
      setError(result.error || "Bu konu için soru bulunamadı.");
      setGameState('setup');
      return;
    }

    const baseQuestions = result.questions.length > 0 ? result.questions : [];
    if (baseQuestions.length === 0) {
      setError("Oyun için soru yüklenemedi.");
      setGameState('setup');
      return;
    }

    // Smartboard için en az 16 kutu olmasını garanti et (sorular tekrarlanarak)
    const targetBoxCount = Math.max(16, Math.min(questionCount === 999 ? 20 : questionCount, 30));
    const boxQuestions: Question[] = [];
    for (let i = 0; i < targetBoxCount; i++) {
      const q = baseQuestions[i % baseQuestions.length];
      boxQuestions.push({
        ...q,
        id: `${q.id}_box_${i}`
      });
    }

    const sorular: KutuIcerik[] = boxQuestions.map(q => ({ type: 'soru', data: q }));
    setKutuIcerikleri(shuffleArray(sorular));

    const newPlayers: Player[] = Array.from({ length: selectedTeamCount }, (_, i) => ({
      id: i + 1,
      name: `${String.fromCharCode(65 + i)} Takımı`,
      score: 0,
      teamConfig: TEAMS[i % TEAMS.length]
    }));

    setPlayers(newPlayers);
    setActivePlayerIndex(0); // A Takımı ile başla
    setOpenedBoxes(new Set());
    setOpenedQuestion(null);
    setGameState('playing');
  };

  const restartGame = () => {
    setGameState('setup');
    setPlayers([]);
    setKutuIcerikleri([]);
    setOpenedBoxes(new Set());
    setActivePlayerIndex(0);
    setError(null);
  };

  const handleNextTurn = useCallback(() => {
    if (players.length > 0) {
      setActivePlayerIndex(prev => (prev + 1) % players.length);
    }
    setIsProcessing(false);
  }, [players.length]);

  const handleBoxClick = (boxIndex: number) => {
    if (isProcessing || openedBoxes.has(boxIndex + 1)) return;
    
    setIsProcessing(true);
    try {
      playSound('pop');
    } catch (e) {}

    const content = kutuIcerikleri[boxIndex];
    setOpenedBoxes(prev => new Set(prev).add(boxIndex + 1));

    if (content && content.type === 'soru') {
      setOpenedQuestion({ number: boxIndex + 1, question: content.data });
    } else {
      handleNextTurn();
    }
  };
  
  const handleAnswerQuestion = useCallback((questionNumber: number, isCorrect: boolean, scoreChange: number) => {
    setOpenedQuestion(null);
    
    if (isCorrect) {
      setPlayers(prev => prev.map((p, index) => 
        index === activePlayerIndex ? { ...p, score: p.score + (scoreChange > 0 ? scoreChange : 10) } : p
      ));
    }
    
    handleNextTurn();
  }, [activePlayerIndex, handleNextTurn]);

  const handleModalClose = useCallback(() => {
    setOpenedQuestion(null);
    setIsProcessing(false); 
  }, []);

  const adjustScore = (playerIndex: number, delta: number) => {
    setPlayers(prev => prev.map((p, idx) => 
      idx === playerIndex ? { ...p, score: Math.max(0, p.score + delta) } : p
    ));
  };

  useEffect(() => {
    if (gameState === 'playing' && kutuIcerikleri.length > 0 && openedBoxes.size >= kutuIcerikleri.length) {
      setGameState('finished');
    }
  }, [openedBoxes, kutuIcerikleri, gameState]);
  
  // --- EKRAN 1: TAKIM SEÇİMİ (SETUP) ---
  if (gameState === 'setup') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-3xl w-full bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-10 shadow-2xl relative z-10">
          {/* Top Info Badge */}
          {(topicName || unitName || className) && (
            <div className="flex flex-wrap items-center justify-center gap-2 mb-6 text-xs text-slate-400">
              {className && <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-purple-300 font-semibold">{className}</span>}
              {courseName && <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10">{courseName}</span>}
              {topicName && <span className="px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-bold max-w-xs truncate">{topicName}</span>}
            </div>
          )}

          <div className="text-center space-y-3 mb-10">
            <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg shadow-purple-500/30 mb-2">
              <Package className="h-12 w-12 text-white" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-black text-white uppercase tracking-tight">Kutu Aç</h1>
            <p className="text-slate-400 text-base sm:text-lg">Akıllı tahtada yarışacak takım sayısını seçin.</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
            {[2, 3, 4, 5].map((count) => (
              <button
                key={count}
                onClick={() => setSelectedTeamCount(count)}
                className={cn(
                  "relative h-28 sm:h-32 rounded-2xl border-2 transition-all duration-300 flex flex-col items-center justify-center gap-3 group active:scale-95",
                  selectedTeamCount === count 
                    ? "border-purple-500 bg-purple-500/20 shadow-[0_0_30px_rgba(168,85,247,0.35)] scale-[1.02]" 
                    : "border-slate-800 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-800/80"
                )}
              >
                <div className="flex -space-x-2">
                  {Array.from({ length: count }).map((_, i) => (
                    <div 
                      key={i} 
                      className={cn(
                        "w-7 h-7 rounded-full border-2 border-slate-900 flex items-center justify-center text-xs font-bold text-white shadow-sm", 
                        TEAMS[i].bg.replace('/20', '')
                      )}
                    >
                      {TEAMS[i].short}
                    </div>
                  ))}
                </div>
                <span className={cn("text-xl sm:text-2xl font-black", selectedTeamCount === count ? "text-white" : "text-slate-400")}>
                  {count} Takım
                </span>
                {selectedTeamCount === count && (
                  <div className="absolute top-2.5 right-2.5 text-purple-400">
                    <CheckCheck className="w-5 h-5" />
                  </div>
                )}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href={backUrl} className="w-full sm:w-auto">
              <Button variant="ghost" size="lg" className="w-full text-slate-400 hover:text-white hover:bg-white/10 h-14 px-8 text-lg rounded-xl">
                <ArrowLeft className="mr-2 h-5 w-5" /> Geri Dön
              </Button>
            </Link>
            <Button 
              onClick={startGame} 
              size="lg" 
              className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white h-14 px-12 text-lg font-black rounded-xl shadow-lg hover:shadow-indigo-500/25 transition-all active:scale-95"
            >
              <Play className="mr-2 h-6 w-6 fill-current" /> Oyunu Başlat
            </Button>
          </div>

          {error && (
            <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-300 text-center font-semibold text-sm flex items-center justify-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (gameState === 'loading') {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-slate-950 gap-4 text-white">
        <Loader2 className="h-16 w-16 animate-spin text-purple-500" />
        <span className="text-xl font-bold tracking-wide">Sorular ve kutular hazırlanıyor...</span>
      </div>
    );
  }

  // --- EKRAN 2: OYUN ALANI VE BİTİŞ EKRANI ---
  return (
    <div ref={mainContentRef} className="flex flex-col h-screen bg-slate-950 text-white overflow-hidden p-2 sm:p-3 gap-2.5 relative select-none">
       {/* HEADER */}
       <header className="flex-shrink-0 flex items-center justify-between z-10 bg-slate-900/80 backdrop-blur-md border border-white/10 p-2 px-4 rounded-2xl h-14 shadow-lg">
         <div className="flex items-center gap-3">
           <div className="p-1.5 bg-purple-500/20 rounded-lg border border-purple-500/30">
             <Package className="h-5 w-5 text-purple-400"/>
           </div>
           <div>
             <h1 className="text-base font-black text-white uppercase tracking-wider">Kutu Aç</h1>
             {topicName && <span className="text-[10px] text-slate-400 hidden sm:inline-block max-w-[200px] truncate">{topicName}</span>}
           </div>
         </div>

         {/* Durum / Sıra Bilgisi */}
         <div className="hidden md:flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10">
           <span className="text-xs text-slate-400 font-semibold">Sıradaki Takım:</span>
           <span className={cn("text-sm font-black uppercase", players[activePlayerIndex]?.teamConfig?.color)}>
             {players[activePlayerIndex]?.name}
           </span>
         </div>

         <div className="flex items-center gap-2">
           <Button 
             variant="ghost" 
             size="sm" 
             className="h-9 px-3 text-slate-400 hover:text-white hover:bg-white/10 text-xs font-bold"
             onClick={() => setShowExitConfirm(true)}
           >
             <ArrowLeft className="w-4 h-4 mr-1" /> Çıkış
           </Button>
           <Button 
             variant="destructive" 
             size="sm" 
             className="h-9 px-3 text-xs font-bold bg-rose-600/80 hover:bg-rose-600" 
             onClick={() => setShowFinishConfirm(true)}
           >
             Oyunu Bitir
           </Button>
           <FullscreenToggle elementRef={mainContentRef} />
         </div>
       </header>

       {/* BÜYÜK SKORBOARD (TAM GENİŞLİK) */}
       <section className="flex-shrink-0 w-full bg-slate-900/60 rounded-2xl border border-white/10 p-2 shadow-md">
        <div className="flex w-full gap-2">
          {players.map((p, i) => {
            const isActive = i === activePlayerIndex;
            return (
              <div 
                key={p.id} 
                className={cn(
                  "flex-1 relative flex flex-col items-center justify-center py-2.5 px-2 rounded-xl border-2 transition-all duration-300 min-w-0 group", 
                  isActive 
                    ? `${p.teamConfig?.border} bg-white/10 shadow-lg ${p.teamConfig?.activeGlow} -translate-y-0.5 z-10` 
                    : "border-transparent bg-white/5 opacity-60 hover:opacity-90"
                )}
              >
                {/* Active Indicator Badge */}
                {isActive && (
                  <div className="absolute -top-2.5 px-2 py-0.5 bg-purple-600 text-[9px] font-black uppercase tracking-wider rounded-full text-white shadow-md">
                    SIRA SİZDE
                  </div>
                )}

                <span className={cn("text-sm sm:text-base lg:text-lg font-black uppercase tracking-wider truncate max-w-full", isActive ? p.teamConfig?.color : "text-slate-400")}>
                  {p.name}
                </span>

                <div className="flex items-center gap-2 my-1">
                  <span className={cn("text-3xl sm:text-4xl lg:text-5xl font-black leading-none", isActive ? "text-white" : "text-slate-300")}>
                    {p.score}
                  </span>
                </div>

                {/* Manuel Puan Ekle / Çıkar Butonları */}
                <div className="flex items-center gap-1 mt-1 opacity-70 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); adjustScore(i, -5); }}
                    title="-5 Puan"
                    className="w-6 h-6 rounded-md bg-white/10 hover:bg-rose-600 hover:text-white text-slate-400 flex items-center justify-center text-xs font-bold transition-all"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); adjustScore(i, 5); }}
                    title="+5 Puan"
                    className="w-6 h-6 rounded-md bg-white/10 hover:bg-emerald-600 hover:text-white text-slate-400 flex items-center justify-center text-xs font-bold transition-all"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
       </section>

       {/* OYUN ALANI (SCROLL EKLENDİ) */}
       <main className="flex-grow min-h-0 relative rounded-2xl overflow-y-auto bg-black/30 border border-white/10 p-3 custom-scrollbar">
         
         {/* Kutu Grid Yapısı */}
         <div className="grid gap-2.5 sm:gap-3 w-full pb-16 grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8">
           {kutuIcerikleri.map((_, i) => {
             const kutucukNo = i + 1;
             const isOpened = openedBoxes.has(kutucukNo);
             return (
               <button
                 key={kutucukNo}
                 onClick={() => handleBoxClick(i)}
                 disabled={isOpened || isProcessing}
                 className={cn(
                   "w-full rounded-2xl flex items-center justify-center shadow-lg transition-all duration-200 relative overflow-hidden group aspect-[4/3]",
                   "text-2xl sm:text-3xl lg:text-4xl font-black select-none",
                   isOpened 
                     ? "bg-slate-900/60 text-slate-600 border border-slate-800 cursor-not-allowed scale-[0.98]" 
                     : "bg-gradient-to-br from-indigo-600 to-purple-700 border-b-4 border-indigo-900 hover:brightness-115 active:border-b-0 active:translate-y-1 hover:shadow-indigo-500/30"
                 )}
               >
                 {isOpened ? (
                   <CheckCheck className="w-8 h-8 text-emerald-500/50" />
                 ) : (
                   <span className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] text-white group-hover:scale-110 transition-transform">
                     {kutucukNo}
                   </span>
                 )}
               </button>
             )
           })}
         </div>

         {/* --- DAHİLİ BİTİŞ EKRANI (FIXED) --- */}
         {gameState === 'finished' && (
           <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-8 animate-in fade-in duration-300">
             <div className="bg-slate-900 border border-white/10 p-6 sm:p-10 rounded-3xl shadow-2xl max-w-2xl w-full text-center relative overflow-hidden">
               <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-yellow-500 via-purple-500 to-indigo-500" />
               
               <div className="flex justify-center mb-6">
                 <div className="p-5 bg-yellow-500/20 rounded-full ring-4 ring-yellow-500/40 shadow-[0_0_50px_rgba(234,179,8,0.4)] animate-bounce">
                   <Trophy className="h-16 w-16 text-yellow-400" />
                 </div>
               </div>
               
               <h2 className="text-3xl sm:text-4xl font-black text-white mb-2 tracking-tight">OYUN BİTTİ!</h2>
               <p className="text-slate-400 mb-6 text-base sm:text-lg">Tebrikler, işte kutu aç yarışmasının final sıralaması:</p>

               <div className="space-y-3 mb-8 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                 {[...players].sort((a, b) => b.score - a.score).map((p, index) => (
                   <div 
                     key={p.id} 
                     className={cn(
                       "flex items-center justify-between p-4 rounded-2xl border-2 transition-all",
                       index === 0 
                         ? "bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/60 shadow-lg shadow-yellow-500/20" 
                         : "bg-white/5 border-white/10"
                     )}
                   >
                     <div className="flex items-center gap-4">
                       <div className={cn(
                         "w-11 h-11 rounded-xl flex items-center justify-center font-black text-lg shadow-md",
                         index === 0 ? "bg-yellow-500 text-yellow-950" : 
                         index === 1 ? "bg-slate-300 text-slate-900" :
                         index === 2 ? "bg-orange-700 text-orange-100" : "bg-slate-800 text-slate-400"
                       )}>
                         {index === 0 ? <Crown className="h-6 w-6"/> : index + 1}
                       </div>
                       <div className="text-left">
                         <div className={cn("font-black text-xl", p.teamConfig?.color)}>{p.name}</div>
                         {index === 0 && (
                           <div className="text-xs text-yellow-400 font-bold flex items-center gap-1">
                             <Sparkles className="w-3.5 h-3.5" /> ŞAMPİYON
                           </div>
                         )}
                       </div>
                     </div>
                     <div className="text-3xl sm:text-4xl font-black text-white">{p.score}</div>
                   </div>
                 ))}
               </div>

               <div className="flex justify-center gap-4">
                 <Link href={backUrl}>
                    <Button variant="outline" size="lg" className="h-14 border-white/10 hover:bg-white/10 text-slate-300 font-bold text-base rounded-xl px-6">
                        <Home className="mr-2 h-5 w-5" /> Ana Menü
                    </Button>
                 </Link>
                 <Button 
                   onClick={restartGame} 
                   size="lg" 
                   className="h-14 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-8 font-black text-lg rounded-xl shadow-lg hover:shadow-purple-500/30 active:scale-95"
                 >
                   <RotateCcw className="mr-2 h-6 w-6" /> Yeni Oyun
                 </Button>
               </div>
             </div>
           </div>
         )}
       </main>
      
      {/* Soru Modalı */}
      {openedQuestion && (
        <QuestionDialog
          isFullscreen={false}
          isOpen={!!openedQuestion}
          onClose={handleModalClose}
          questionData={openedQuestion}
          onAnswer={handleAnswerQuestion}
          timerDuration={15}
          pointsConfig={{ default: { points: 10 }}}
          showCorrectAnswerOnWrong={true}
        />
      )}

      {/* Çıkış Onay Modalı */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl text-center space-y-4">
            <h3 className="text-xl font-black text-white">Oyundan Çıkılsın mı?</h3>
            <p className="text-slate-300 text-sm">Açılan kutular ve mevcut skorlar sıfırlanacaktır.</p>
            <div className="flex gap-3 justify-center pt-2">
              <Button variant="ghost" onClick={() => setShowExitConfirm(false)} className="text-slate-400 hover:text-white">
                İptal
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => {
                  setShowExitConfirm(false);
                  router.push(backUrl);
                }}
              >
                Evet, Çık
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Oyunu Bitir Onay Modalı */}
      {showFinishConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl text-center space-y-4">
            <h3 className="text-xl font-black text-white">Oyunu Erken Bitir?</h3>
            <p className="text-slate-300 text-sm">Kalan kutular açılmadan oyun sonlandırılacak ve mevcut puanlara göre kazanan belirlenecektir.</p>
            <div className="flex gap-3 justify-center pt-2">
              <Button variant="ghost" onClick={() => setShowFinishConfirm(false)} className="text-slate-400 hover:text-white">
                Devam Et
              </Button>
              <Button 
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold" 
                onClick={() => {
                  setShowFinishConfirm(false);
                  setGameState('finished');
                }}
              >
                Oyunu Bitir
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SmartboardKutuAcOyunPageWrapper() {
  return (
    <Suspense fallback={<div className="h-screen w-screen flex items-center justify-center bg-slate-950 text-white"><Loader2 className="w-16 h-16 animate-spin text-purple-500"/></div>}>
      <KutuAcGame/>
    </Suspense>
  )
}
