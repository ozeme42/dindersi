
'use client';

import { useState, useEffect, useCallback, Suspense, useRef, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getKutuAcQuestionsAction } from '../actions';
import type { Question } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Package, Users, Trophy, Crown, Target, Sparkles, MonitorPlay, Zap, XOctagon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { FullscreenToggle } from '@/components/fullscreen-toggle';
import { useAuth } from '@/context/auth-context';
import { QuestionDialog } from '@/components/question-dialog';
import { GameEndScreen } from '@/components/game-end-screen';
import { Badge } from "@/components/ui/badge";

const shuffleArray = <T,>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

const TEAMS = [
    { name: 'A Takımı', short: 'A', color: 'text-red-400', border: 'border-red-500', bg: 'bg-red-500/20', from: 'from-red-600', to: 'to-orange-600', shadow: 'shadow-red-500/40' },
    { name: 'B Takımı', short: 'B', color: 'text-blue-400', border: 'border-blue-500', bg: 'bg-blue-500/20', from: 'from-blue-600', to: 'to-cyan-600', shadow: 'shadow-blue-500/40' },
    { name: 'C Takımı', short: 'C', color: 'text-emerald-400', border: 'border-emerald-500', bg: 'bg-emerald-500/20', from: 'from-emerald-600', to: 'to-green-600', shadow: 'shadow-emerald-500/40' },
    { name: 'D Takımı', short: 'D', color: 'text-yellow-400', border: 'border-yellow-500', bg: 'bg-yellow-500/20', from: 'from-yellow-600', to: 'to-amber-600', shadow: 'shadow-yellow-500/40' },
];

type KutuIcerik = { type: 'soru'; data: Question };

type Player = {
    id: number;
    name: string;
    score: number;
    teamConfig?: typeof TEAMS[0];
};

function KutuAcGame() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    
    const [players, setPlayers] = useState<Player[]>([]);
    const [activePlayerIndex, setActivePlayerIndex] = useState(0);
    const [kutuIcerikleri, setKutuIcerikleri] = useState<KutuIcerik[]>([]);
    const [openedBoxes, setOpenedBoxes] = useState<Set<number>>(new Set());
    const [openedQuestion, setOpenedQuestion] = useState<{ number: number; question: Question } | null>(null);

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isFinished, setIsFinished] = useState(false);
    
    const mainContentRef = useRef<HTMLDivElement>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const teamCount = parseInt(searchParams.get('teamCount') || '1', 10);
    const questionCount = parseInt(searchParams.get('questionCount') || '20', 10);
    const backUrl = "/teacher/smartboard/kutu-ac";

    const fetchQuestions = useCallback(async () => {
        setIsLoading(true);
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
            setIsLoading(false);
            return;
        }

        const sorular: KutuIcerik[] = result.questions.map(q => ({ type: 'soru', data: q }));
        setKutuIcerikleri(shuffleArray(sorular));
        
        const newPlayers: Player[] = Array.from({ length: teamCount }, (_, i) => ({
            id: i + 1,
            name: teamCount === 1 ? 'Oyuncu' : `${String.fromCharCode(65 + i)} Takımı`,
            score: 0,
            teamConfig: TEAMS[i % TEAMS.length]
        }));
        setPlayers(newPlayers);
        
        setActivePlayerIndex(0);
        setOpenedBoxes(new Set());
        setOpenedQuestion(null);
        setIsFinished(false);
        setIsLoading(false);
    }, [searchParams, teamCount, questionCount]);

    useEffect(() => {
        fetchQuestions();
    }, [fetchQuestions]);

    const handleNextTurn = useCallback(() => {
        if (teamCount > 1) {
            setActivePlayerIndex(prev => (prev + 1) % players.length);
        }
        setIsProcessing(false);
    }, [players.length, teamCount]);

    const handleBoxClick = (boxIndex: number) => {
        if (isProcessing || openedBoxes.has(boxIndex + 1)) return;
        
        setIsProcessing(true);
        const content = kutuIcerikleri[boxIndex];
        setOpenedBoxes(prev => new Set(prev).add(boxIndex + 1));

        if (content.type === 'soru') {
            setOpenedQuestion({ number: boxIndex + 1, question: content.data });
        } else {
            // This part is simplified as we removed special boxes for now
            handleNextTurn();
        }
    };
    
    const handleAnswerQuestion = useCallback((questionNumber: number, isCorrect: boolean, scoreChange: number) => {
        setOpenedQuestion(null);
        if (isCorrect) {
            setPlayers(prev => prev.map((p, index) => 
                index === activePlayerIndex ? { ...p, score: p.score + scoreChange } : p
            ));
        }
        handleNextTurn();
    }, [activePlayerIndex, handleNextTurn]);

    useEffect(() => {
        if (!isLoading && kutuIcerikleri.length > 0 && openedBoxes.size >= kutuIcerikleri.length) {
            setIsFinished(true);
        }
    }, [openedBoxes, kutuIcerikleri, isLoading]);
    
    if (isLoading) return <div className="flex h-screen items-center justify-center bg-slate-950"><Loader2 className="h-12 w-12 animate-spin text-purple-500" /></div>;
    if (error) return <div className="text-center p-8 text-red-400">{error}</div>;

    const activePlayer = players[activePlayerIndex];
    const timerDuration = openedQuestion?.question.type === 'Doğru/Yanlış' ? 10 : 20;

    return (
        <div ref={mainContentRef} className="flex flex-col h-screen bg-slate-950 text-white overflow-hidden p-4 gap-4 relative">
             <header className="flex-shrink-0 flex items-center justify-between z-10 bg-slate-900/60 backdrop-blur-md border border-white/5 p-3 rounded-xl">
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

             <main className="flex-grow grid lg:grid-cols-4 gap-4 min-h-0">
                 <div className="lg:col-span-1 grid grid-cols-2 lg:grid-cols-1 gap-4 auto-rows-fr">
                     {players.map((p, i) => {
                         const isActive = i === activePlayerIndex;
                         return (
                             <div key={p.id} className={cn("relative p-4 rounded-xl border-2 transition-all duration-300 flex flex-col justify-center items-center gap-2", isActive ? `${p.teamConfig?.border} bg-white/5 scale-105 shadow-lg ${p.teamConfig?.shadow} z-10` : "bg-black/20 border-transparent")}>
                                 {isActive && <div className={cn("absolute top-2 right-2 w-3 h-3 rounded-full animate-pulse", p.teamConfig?.color.replace('text-', 'bg-'))}/>}
                                 <h3 className={cn("text-xl font-bold uppercase", isActive ? p.teamConfig?.color : "text-slate-400")}>{p.name}</h3>
                                 <p className="text-5xl font-black text-white">{p.score}</p>
                             </div>
                         )
                     })}
                 </div>

                 <div className="lg:col-span-3 bg-black/30 p-4 rounded-xl border border-white/5">
                     <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3 h-full">
                         {kutuIcerikleri.map((_, i) => {
                             const kutucukNo = i + 1;
                             const isOpened = openedBoxes.has(kutucukNo);
                             return (
                                 <button
                                    key={kutucukNo}
                                    id={`kutucuk-${kutucukNo}`}
                                    onClick={() => handleBoxClick(i)}
                                    disabled={isOpened || isLoading}
                                    className={cn(
                                        "aspect-square rounded-lg flex items-center justify-center text-xl sm:text-2xl font-black text-white shadow-lg transition-all duration-300",
                                        isOpened 
                                            ? "bg-slate-800/50 text-slate-600 border border-slate-700/50 cursor-not-allowed scale-95" 
                                            : "bg-gradient-to-br from-indigo-500 to-purple-600 border-b-4 border-indigo-800 hover:-translate-y-1 active:translate-y-0 active:border-b-0 hover:shadow-purple-500/30"
                                    )}
                                >
                                    {isOpened ? <CheckCheck className="h-8 w-8 text-green-500/50" /> : kutucukNo}
                                </button>
                             )
                         })}
                     </div>
                 </div>
             </main>
            
            {openedQuestion && (
                <QuestionDialog
                    isFullscreen={false}
                    isOpen={!!openedQuestion}
                    onClose={() => { setOpenedQuestion(null); handleNextTurn(); }}
                    questionData={openedQuestion}
                    onAnswer={handleAnswerQuestion}
                    timerDuration={15}
                    pointsConfig={{ default: { points: 10 }}}
                    showCorrectAnswerOnWrong={true}
                />
            )}
            
            {isFinished && (
                <GameEndScreen
                    score={Math.max(...players.map(p => p.score))}
                    onRestart={fetchQuestions}
                    backUrl={backUrl}
                    onSave={() => {}}
                    isSaving={false}
                    scoreSaved={true} // In smartboard mode, scores are not saved to student profiles
                />
            )}
        </div>
    );
}

export default function SmartboardKutuAcOyunPageWrapper() {
    return <Suspense fallback={<div className="h-screen w-screen flex items-center justify-center bg-slate-950"><Loader2 className="w-16 h-16 animate-spin text-purple-500"/></div>}><KutuAcGame/></Suspense>
}
