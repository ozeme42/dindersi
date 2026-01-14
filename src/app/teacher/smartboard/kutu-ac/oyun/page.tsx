'use client';

import { useState, useEffect, useCallback, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { getKutuAcQuestionsAction } from '../actions';
import type { Question } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Package, CheckCheck, Play, Trophy, Crown, RotateCcw, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { FullscreenToggle } from '@/components/fullscreen-toggle';
import { QuestionDialog } from '@/components/question-dialog';

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
  { name: 'A Takımı', short: 'A', color: 'text-red-400', border: 'border-red-500', bg: 'bg-red-500/20', from: 'from-red-600', to: 'to-orange-600', shadow: 'shadow-red-500/40' },
  { name: 'B Takımı', short: 'B', color: 'text-blue-400', border: 'border-blue-500', bg: 'bg-blue-500/20', from: 'from-blue-600', to: 'to-cyan-600', shadow: 'shadow-blue-500/40' },
  { name: 'C Takımı', short: 'C', color: 'text-emerald-400', border: 'border-emerald-500', bg: 'bg-emerald-500/20', from: 'from-emerald-600', to: 'to-green-600', shadow: 'shadow-emerald-500/40' },
  { name: 'D Takımı', short: 'D', color: 'text-yellow-400', border: 'border-yellow-500', bg: 'bg-yellow-500/20', from: 'from-yellow-600', to: 'to-amber-600', shadow: 'shadow-yellow-500/40' },
  { name: 'E Takımı', short: 'E', color: 'text-pink-400', border: 'border-pink-500', bg: 'bg-pink-500/20', from: 'from-pink-600', to: 'to-rose-600', shadow: 'shadow-pink-500/40' },
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
  
  const mainContentRef = useRef<HTMLDivElement>(null);

  // Varsayılan olarak tüm soruları çekmek için yüksek limit
  const questionCount = parseInt(searchParams.get('questionCount') || '999', 10);
  const backUrl = "/teacher/smartboard/kutu-ac";

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

    if (result.error || result.questions.length === 0) {
      setError(result.error || "Bu konu için soru bulunamadı.");
      setGameState('setup');
      return;
    }

    const sorular: KutuIcerik[] = result.questions.map(q => ({ type: 'soru', data: q }));
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
    setActivePlayerIndex(0);
  };

  const handleNextTurn = useCallback(() => {
    if (players.length > 0) {
      setActivePlayerIndex(prev => {
        const nextIndex = (prev + 1) % players.length;
        return nextIndex;
      });
    }
    setIsProcessing(false);
  }, [players.length]);

  const handleBoxClick = (boxIndex: number) => {
    if (isProcessing || openedBoxes.has(boxIndex + 1)) return;
    
    setIsProcessing(true);
    const content = kutuIcerikleri[boxIndex];
    setOpenedBoxes(prev => new Set(prev).add(boxIndex + 1));

    if (content.type === 'soru') {
      setOpenedQuestion({ number: boxIndex + 1, question: content.data });
    } else {
      // Soru yoksa direkt sırayı geçir
      handleNextTurn();
    }
  };
  
  const handleAnswerQuestion = useCallback((questionNumber: number, isCorrect: boolean, scoreChange: number) => {
    // Soru cevaplandığında modalı kapat
    setOpenedQuestion(null);
    
    if (isCorrect) {
      setPlayers(prev => prev.map((p, index) => 
        index === activePlayerIndex ? { ...p, score: p.score + scoreChange } : p
      ));
    }
    
    // Sırayı bir sonraki takıma geçir
    handleNextTurn();
  }, [activePlayerIndex, handleNextTurn]);

  // Modal kapatıldığında (X'e basıldığında veya dışarı tıklandığında)
  // Sadece modalı kapatıyoruz, sırayı değiştirmiyoruz. 
  // Böylece yanlışlıkla kapatılırsa aynı takım tekrar deneyebilir veya "Cevapla" butonuyla ilerlenir.
  const handleModalClose = useCallback(() => {
      setOpenedQuestion(null);
      // Not: Burada handleNextTurn() ÇAĞIRMIYORUZ. Çift atlamayı engellemek için.
      // Eğer soru cevaplanmadan kapatılırsa sıra aynı takımda kalır (veya processing kilidini açarız).
      setIsProcessing(false); 
  }, []);

  useEffect(() => {
    if (gameState === 'playing' && kutuIcerikleri.length > 0 && openedBoxes.size >= kutuIcerikleri.length) {
      setGameState('finished');
    }
  }, [openedBoxes, kutuIcerikleri, gameState]);
  
  // --- EKRAN 1: TAKIM SEÇİMİ (SETUP) ---
  if (gameState === 'setup') {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 p-4">
        <div className="max-w-4xl w-full bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          <div className="text-center space-y-4 mb-12">
            <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg mb-4">
              <Package className="h-12 w-12 text-white" />
            </div>
            <h1 className="text-4xl font-black text-white uppercase tracking-tight">Kutu Aç</h1>
            <p className="text-slate-400 text-lg">Yarışacak takım sayısını seçerek oyuna başlayın.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {[2, 3, 4, 5].map((count) => (
              <button
                key={count}
                onClick={() => setSelectedTeamCount(count)}
                className={cn(
                  "relative h-32 rounded-xl border-2 transition-all duration-300 flex flex-col items-center justify-center gap-3 group",
                  selectedTeamCount === count 
                    ? "border-purple-500 bg-purple-500/20 shadow-[0_0_30px_-5px_rgba(168,85,247,0.4)]" 
                    : "border-slate-800 bg-slate-900/50 hover:border-slate-600 hover:bg-slate-800"
                )}
              >
                <div className="flex -space-x-3">
                  {Array.from({ length: count }).map((_, i) => (
                    <div key={i} className={cn("w-8 h-8 rounded-full border-2 border-slate-900 flex items-center justify-center text-xs font-bold text-white", TEAMS[i].bg.replace('/20', ''))}>
                      {TEAMS[i].short}
                    </div>
                  ))}
                </div>
                <span className={cn("text-2xl font-bold", selectedTeamCount === count ? "text-white" : "text-slate-400")}>
                  {count} Takım
                </span>
                {selectedTeamCount === count && (
                  <div className="absolute top-3 right-3 text-purple-400">
                    <CheckCheck className="w-5 h-5" />
                  </div>
                )}
              </button>
            ))}
          </div>

          <div className="flex justify-center gap-4">
            <Link href={backUrl}>
              <Button variant="ghost" size="lg" className="text-slate-400 hover:text-white hover:bg-white/10 h-14 px-8 text-lg">
                <ArrowLeft className="mr-2 h-5 w-5" /> Geri Dön
              </Button>
            </Link>
            <Button 
              onClick={startGame} 
              size="lg" 
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white h-14 px-12 text-lg rounded-xl shadow-lg hover:shadow-indigo-500/25 transition-all active:scale-95"
            >
              <Play className="mr-2 h-6 w-6 fill-current" /> Oyunu Başlat
            </Button>
          </div>
          {error && <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-center">{error}</div>}
        </div>
      </div>
    );
  }

  if (gameState === 'loading') {
    return <div className="flex h-screen items-center justify-center bg-slate-950"><Loader2 className="h-16 w-16 animate-spin text-purple-500" /></div>;
  }

  // --- EKRAN 2: OYUN ALANI VE BİTİŞ EKRANI ---
  return (
    <div ref={mainContentRef} className="flex flex-col h-screen bg-slate-950 text-white overflow-hidden p-3 gap-3 relative">
       {/* HEADER */}
       <header className="flex-shrink-0 flex items-center justify-between z-10 bg-slate-900/60 backdrop-blur-md border border-white/5 p-2 px-4 rounded-xl h-14">
         <div className="flex items-center gap-3">
           <Package className="h-5 w-5 text-purple-400"/>
           <h1 className="text-lg font-bold text-white uppercase tracking-wider">Kutu Aç</h1>
         </div>
          <div className="flex items-center gap-2">
            <Button variant="destructive" size="sm" className="h-9 px-4 font-semibold" onClick={() => setGameState('finished')}>
              Oyunu Bitir
            </Button>
            <FullscreenToggle elementRef={mainContentRef} />
          </div>
       </header>

       {/* BÜYÜK SKORBOARD (TAM GENİŞLİK) */}
       <section className="flex-shrink-0 w-full bg-slate-900/40 rounded-xl border border-white/5 p-2">
        <div className="flex w-full gap-2 h-full">
          {players.map((p, i) => {
            const isActive = i === activePlayerIndex;
            return (
              <div 
                key={p.id} 
                className={cn(
                  "flex-1 relative flex flex-col items-center justify-center py-4 rounded-lg border-2 transition-all duration-300 min-w-0", 
                  isActive 
                    ? `${p.teamConfig?.border} bg-white/5 shadow-lg ${p.teamConfig?.shadow} -translate-y-1 z-10` 
                    : "border-transparent bg-white/5 opacity-60"
                )}
              >
                <span className={cn("text-lg lg:text-xl font-bold uppercase tracking-wider truncate max-w-full px-2", isActive ? p.teamConfig?.color : "text-slate-400")}>
                  {p.name}
                </span>
                <span className={cn("text-4xl lg:text-5xl font-black leading-none mt-2", isActive ? "text-white" : "text-slate-300")}>
                  {p.score}
                </span>
              </div>
            )
          })}
        </div>
       </section>

       {/* OYUN ALANI (SCROLL EKLENDİ) */}
       <main className="flex-grow min-h-0 relative rounded-xl overflow-y-auto bg-black/20 border border-white/5 p-3 custom-scrollbar">
         
         {/* Grid Yapısı - Kutu Sayısı Arttıkça Aşağı Uzayacak */}
         <div className="grid gap-3 w-full pb-20 grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10">
           {kutuIcerikleri.map((_, i) => {
             const kutucukNo = i + 1;
             const isOpened = openedBoxes.has(kutucukNo);
             return (
               <button
                 key={kutucukNo}
                 onClick={() => handleBoxClick(i)}
                 disabled={isOpened || isProcessing}
                 className={cn(
                   "w-full min-h-[100px] rounded-xl flex items-center justify-center shadow-lg transition-all duration-200 relative overflow-hidden group aspect-[4/3]",
                   "text-2xl md:text-3xl lg:text-4xl font-black",
                   isOpened 
                     ? "bg-slate-800/40 text-slate-600 border border-slate-700/30 cursor-not-allowed" 
                     : "bg-gradient-to-br from-indigo-500 to-purple-600 border-b-4 border-indigo-800 hover:brightness-110 active:border-b-0 active:translate-y-1"
                 )}
               >
                 {isOpened ? (
                   <CheckCheck className="w-1/2 h-1/2 text-green-500/40" />
                 ) : (
                   <span className="drop-shadow-md text-white group-hover:scale-110 transition-transform">{kutucukNo}</span>
                 )}
               </button>
             )
           })}
         </div>

         {/* --- DAHİLİ BİTİŞ EKRANI (FIXED) --- */}
         {gameState === 'finished' && (
           <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-sm flex flex-col items-center justify-center p-8 animate-in fade-in duration-500">
             <div className="bg-slate-900 border border-white/10 p-8 rounded-3xl shadow-2xl max-w-3xl w-full text-center">
               <div className="flex justify-center mb-6">
                 <div className="p-4 bg-yellow-500/20 rounded-full ring-4 ring-yellow-500/50 shadow-[0_0_50px_-10px_rgba(234,179,8,0.5)]">
                   <Trophy className="h-16 w-16 text-yellow-400" />
                 </div>
               </div>
               
               <h2 className="text-4xl font-black text-white mb-2">OYUN BİTTİ!</h2>
               <p className="text-slate-400 mb-8 text-lg">İşte final sıralaması</p>

               <div className="space-y-3 mb-8 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                 {/* Oyuncuları Puana Göre Sırala ve Listele */}
                 {[...players].sort((a, b) => b.score - a.score).map((p, index) => (
                   <div 
                     key={p.id} 
                     className={cn(
                       "flex items-center justify-between p-4 rounded-xl border-2 transition-all",
                       index === 0 
                         ? "bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/50" 
                         : "bg-white/5 border-white/5"
                     )}
                   >
                     <div className="flex items-center gap-4">
                       <div className={cn(
                         "w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg",
                         index === 0 ? "bg-yellow-500 text-yellow-950" : 
                         index === 1 ? "bg-slate-300 text-slate-900" :
                         index === 2 ? "bg-orange-700 text-orange-100" : "bg-slate-800 text-slate-400"
                       )}>
                         {index === 0 ? <Crown className="h-5 w-5"/> : index + 1}
                       </div>
                       <div className="text-left">
                         <div className={cn("font-bold text-xl", p.teamConfig?.color)}>{p.name}</div>
                         {index === 0 && <div className="text-xs text-yellow-400 font-medium">ŞAMPİYON</div>}
                       </div>
                     </div>
                     <div className="text-3xl font-black text-white">{p.score}</div>
                   </div>
                 ))}
               </div>

               <div className="flex justify-center gap-4">
                 <Link href={backUrl}>
                    <Button variant="outline" size="lg" className="h-14 border-white/10 hover:bg-white/5 text-slate-300">
                        <Home className="mr-2 h-5 w-5" /> Ana Menü
                    </Button>
                 </Link>
                 <Button 
                   onClick={restartGame} 
                   size="lg" 
                   className="h-14 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-8 font-bold text-lg shadow-lg hover:shadow-purple-500/25"
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
    </div>
  );
}

export default function SmartboardKutuAcOyunPageWrapper() {
  return (
    <Suspense fallback={<div className="h-screen w-screen flex items-center justify-center bg-slate-950"><Loader2 className="w-16 h-16 animate-spin text-purple-500"/></div>}>
      <KutuAcGame/>
    </Suspense>
  )
}