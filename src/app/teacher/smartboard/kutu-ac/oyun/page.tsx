
'use client';

import { useState, useEffect, useCallback, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getTornadoGameQuestions } from '@/app/teacher/smartboard/tornado/actions'; // Use the same action
import type { Question } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Package, Users, Trophy, Crown, Zap, XOctagon, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { FullscreenToggle } from '@/components/fullscreen-toggle';
import { QuestionDialog } from '@/components/question-dialog';

// Define the content of special boxes
const ozelKutular: KutuIcerik[] = [
    { type: 'bos', mesaj: '⚪ Boş Kutu!', puan: 0, renk: '#a0aec0', ikon: '⚪' },
    { type: 'odul', mesaj: '⭐ +15 Puan!', puan: 15, renk: '#ecc94b', ikon: '⭐' },
    { type: 'odul', mesaj: '🌟 +25 Puan!', puan: 25, renk: '#ecc94b', ikon: '🌟' },
    { type: 'ceza', mesaj: '❗ -10 Puan!', puan: -10, renk: '#f56565', ikon: '❗' },
    { type: 'ceza', mesaj: '💥 -20 Puan!', puan: -20, renk: '#f56565', ikon: '💥' },
    { type: 'ekstra', mesaj: '🔄 Tekrar Oyna!', efekt: 'TEKRAR_OYNA', renk: '#4fd1c5', ikon: '🔄' },
];

type KutuIcerik =
    | { type: 'soru'; data: Question }
    | { type: 'bos'; mesaj: string; puan: number; renk: string; ikon: string; }
    | { type: 'odul'; mesaj: string; puan: number; renk: string; ikon: string; }
    | { type: 'ceza'; mesaj: string; puan: number; renk: string; ikon: string; }
    | { type: 'ekstra'; mesaj: string; efekt: 'PAS' | 'TEKRAR_OYNA' | 'BIR_TUR_BEKLE'; renk: string; ikon: string; };

type Player = {
    id: number;
    name: string;
    score: number;
    teamConfig?: { color: string; from: string; to: string; };
};

function KutuAcGame() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { toast } = useToast();
    
    const [players, setPlayers] = useState<Player[]>([]);
    const [activePlayerIndex, setActivePlayerIndex] = useState(0);
    const [kutuIcerikleri, setKutuIcerikleri] = useState<KutuIcerik[]>([]);
    const [openedBoxes, setOpenedBoxes] = useState<Set<number>>(new Set());
    const [openedQuestion, setOpenedQuestion] = useState<{ number: number; question: Question } | null>(null);
    
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isFinished, setIsFinished] = useState(false);
    
    const [mesaj, setMesaj] = useState<{metin: string, renk: string} | null>(null);
    const mainContentRef = useRef<HTMLDivElement>(null);

    const teamCount = parseInt(searchParams.get('teamCount') || '1', 10);
    const backUrl = "/teacher/smartboard/kutu-ac";

    const fetchAndSetupGame = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        
        const params = {
            courseId: searchParams.get('courseId') || undefined,
            unitId: searchParams.get('unitId') || undefined,
            topicId: searchParams.get('topicId') || undefined,
        };
        const result = await getTornadoGameQuestions(params);

        if (result.error || result.questions.length === 0) {
            setError(result.error || "Bu konu için soru bulunamadı.");
            setIsLoading(false);
            return;
        }

        const sorular: KutuIcerik[] = result.questions.map(q => ({ type: 'soru', data: q }));
        const ozelKutuSayisi = Math.floor(sorular.length / 3);
        const specialBoxesToAdd = [...ozelKutular].sort(() => 0.5 - Math.random()).slice(0, ozelKutuSayisi);
        
        let icerikHavuzu: KutuIcerik[] = [...sorular, ...specialBoxesToAdd];
        setKutuIcerikleri(icerikHavuzu.sort(() => Math.random() - 0.5));
        
        // Setup players
        const teamConfigs = [
            { color: 'text-blue-400', from: 'from-blue-600', to: 'to-cyan-600' },
            { color: 'text-red-400', from: 'from-red-600', to: 'to-orange-600' },
            { color: 'text-emerald-400', from: 'from-emerald-600', to: 'to-green-600' },
            { color: 'text-yellow-400', from: 'from-yellow-600', to: 'to-amber-600' },
        ];
        const newPlayers: Player[] = Array.from({ length: teamCount }, (_, i) => ({
            id: i + 1,
            name: teamCount === 1 ? 'Oyuncu' : `${String.fromCharCode(65 + i)} Takımı`,
            score: 0,
            teamConfig: teamConfigs[i % teamConfigs.length]
        }));
        setPlayers(newPlayers);

        // Reset game state
        setActivePlayerIndex(0);
        setOpenedBoxes(new Set());
        setOpenedQuestion(null);
        setIsFinished(false);
        setMesaj(null);
        setIsLoading(false);

    }, [searchParams, teamCount]);

    useEffect(() => {
        fetchAndSetupGame();
    }, [fetchAndSetupGame]);

    const handleNextTurn = useCallback((repeatTurn = false) => {
        if (repeatTurn) {
            toast({ title: 'Tekrar Oyna!', description: `${players[activePlayerIndex].name} şanslı, bir kutu daha açıyor!`, className: 'bg-green-600 text-white border-none' });
        } else {
            setActivePlayerIndex(prev => (prev + 1) % players.length);
        }
        setIsLoading(false); // Enable box clicks again
    }, [activePlayerIndex, players.length, toast]);

    const applySpecialBoxEffect = useCallback((content: KutuIcerik) => {
        const activePlayer = players[activePlayerIndex];
        setMesaj({ metin: content.mesaj, renk: content.renk });

        if ('puan' in content && content.puan !== 0) {
            setPlayers(prev => prev.map((p, index) => 
                index === activePlayerIndex ? { ...p, score: Math.max(0, p.score + content.puan) } : p
            ));
        }

        setTimeout(() => {
            setMesaj(null);
            handleNextTurn('efekt' in content && content.efekt === 'TEKRAR_OYNA');
        }, 1500);
    }, [players, activePlayerIndex, handleNextTurn]);
    
    const handleBoxClick = (boxIndex: number) => {
        if (isLoading || openedBoxes.has(boxIndex)) return;
        
        setIsLoading(true); // Disable clicks
        const content = kutuIcerikleri[boxIndex];
        setOpenedBoxes(prev => new Set(prev).add(boxIndex));

        if (content.type === 'soru') {
            setOpenedQuestion({ number: boxIndex, question: content.data });
        } else {
            applySpecialBoxEffect(content);
        }
    };
    
    const handleAnswerQuestion = (questionNumber: number, isCorrect: boolean, scoreChange: number) => {
        setOpenedQuestion(null);
        if (isCorrect) {
            setPlayers(prev => prev.map((p, index) => 
                index === activePlayerIndex ? { ...p, score: p.score + scoreChange } : p
            ));
        }
        handleNextTurn();
    };
    
    useEffect(() => {
        if (!isLoading && kutuIcerikleri.length > 0 && openedBoxes.size === kutuIcerikleri.length) {
            setIsFinished(true);
        }
    }, [openedBoxes, kutuIcerikleri, isLoading]);


    // --- RENDER ---
    if (isLoading && !openedQuestion) return <div className="flex h-screen items-center justify-center bg-slate-950"><Loader2 className="h-12 w-12 animate-spin text-purple-500" /></div>;
    if (error) return <div className="text-center p-8 text-red-400">{error}</div>;

    const activePlayer = players[activePlayerIndex];
    const timerDuration = openedQuestion?.question.type === 'Doğru/Yanlış' ? 10 : 20;

    return (
         <div ref={mainContentRef} className="flex flex-col h-screen bg-slate-950 text-white overflow-hidden p-4 gap-4 relative">
             {/* Arka Plan */}
             <div className="absolute inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px]" />
            </div>

             {/* Header */}
             <header className="flex-shrink-0 flex items-center justify-between z-10 bg-slate-900/60 backdrop-blur-md border border-white/5 p-3 rounded-2xl">
                 <div className="flex items-center gap-3">
                     <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow-lg"><Package className="h-5 w-5"/></div>
                     <h1 className="text-xl font-black text-white uppercase tracking-tight">Kutu Aç</h1>
                 </div>
                  <div className="flex items-center gap-2">
                     <Button variant="destructive" size="sm" onClick={() => setIsFinished(true)}>Oyunu Bitir</Button>
                     <FullscreenToggle elementRef={mainContentRef} />
                     <Button asChild variant="ghost" size="icon"><Link href={backUrl}><ArrowLeft className="h-5 w-5"/></Link></Button>
                 </div>
             </header>

             {/* Ana İçerik */}
             <main className="flex-grow grid lg:grid-cols-4 gap-4 min-h-0">
                 {/* Player Scores */}
                 <div className="lg:col-span-1 grid grid-cols-2 lg:grid-cols-1 gap-4 auto-rows-fr">
                     {players.map((p, i) => {
                         const isActive = i === activePlayerIndex;
                         return (
                             <div key={p.id} className={cn("relative p-4 rounded-xl border-2 transition-all duration-300 flex flex-col justify-center items-center gap-2", isActive ? `${p.teamConfig?.border} bg-white/5 scale-105 shadow-lg ${p.teamConfig?.shadow}` : "bg-black/20 border-transparent")}>
                                 {isActive && <div className={cn("absolute top-2 right-2 w-3 h-3 rounded-full animate-pulse", p.teamConfig?.color.replace('text-', 'bg-'))}/>}
                                 <h3 className={cn("text-xl font-bold uppercase", isActive ? p.teamConfig?.color : "text-slate-400")}>{p.name}</h3>
                                 <p className="text-5xl font-black text-white">{p.score}</p>
                             </div>
                         )
                     })}
                 </div>

                 {/* Game Grid */}
                 <div className="lg:col-span-3 bg-black/30 p-4 rounded-xl border border-white/5">
                     <div className="grid grid-cols-6 gap-3 h-full">
                         {kutuIcerikleri.map((_, i) => (
                             <button
                                key={i}
                                onClick={() => handleBoxClick(i)}
                                disabled={openedBoxes.has(i) || isLoading}
                                className={cn(
                                    "aspect-square rounded-lg flex items-center justify-center text-2xl font-black text-white transition-all duration-300 transform",
                                    openedBoxes.has(i) 
                                        ? "bg-slate-800/50 text-slate-600 border border-slate-700 cursor-not-allowed scale-95" 
                                        : "bg-gradient-to-br from-indigo-500 to-purple-600 border-b-4 border-indigo-800 hover:-translate-y-1 active:translate-y-0 active:border-b-0 shadow-lg"
                                )}
                             >
                                 {openedBoxes.has(i) ? <CheckCheck className="h-8 w-8 text-green-500/50" /> : i + 1}
                             </button>
                         ))}
                     </div>
                 </div>
             </main>
             
            {/* Mesaj Dialogu */}
             {mesaj && (
                 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
                     <div className="text-center p-8 rounded-2xl" style={{ backgroundColor: `${mesaj.renk}80` }}>
                         <div className="text-8xl" dangerouslySetInnerHTML={{ __html: mesaj.ikon }} />
                         <p className="text-4xl font-black mt-4 text-white" dangerouslySetInnerHTML={{ __html: mesaj.metin }} />
                     </div>
                 </div>
            )}
            
            {/* Soru Dialogu */}
            {openedQuestion && (
                <QuestionDialog
                    isFullscreen={isFullscreen}
                    isOpen={!!openedQuestion}
                    onClose={() => { setOpenedQuestion(null); handleNextTurn(); }}
                    questionData={openedQuestion}
                    onAnswer={handleAnswerQuestion}
                    timerDuration={timerDuration}
                    pointsConfig={{ default: { points: 10 }}}
                    showCorrectAnswerOnWrong={true}
                />
            )}
            
            {/* Oyun Bitiş Ekranı */}
            {isFinished && (
                <GameEndScreen
                    score={players.length === 1 ? players[0].score : Math.max(...players.map(p => p.score))}
                    onRestart={fetchAndSetupGame}
                    backUrl={backUrl}
                    onSave={() => {}} // Not applicable for teacher-led game
                    isSaving={false} // Not applicable
                />
            )}
        </div>
    );
}

export default function KutuAcOyunPageWrapper() {
    return <Suspense fallback={<div className="h-screen w-screen flex items-center justify-center bg-slate-950"><Loader2 className="w-16 h-16 animate-spin text-purple-500"/></div>}><KutuAcGame/></Suspense>
}
