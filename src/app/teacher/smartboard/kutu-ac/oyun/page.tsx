'use client';

import { useState, useEffect, useCallback, Suspense, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getKutuAcQuestionsAction } from '@/app/oyunlar/kutu-ac/actions';
import type { Question } from "@/lib/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Package, PartyPopper, Repeat, Home, CheckCheck, Trophy, Crown, Medal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { FullscreenToggle } from "@/components/fullscreen-toggle";
import { useAuth } from "@/context/auth-context";
import { QuestionDialog } from "@/components/question-dialog";

const KUTU_SAYISI = 30;

const shuffleArray = <T,>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

function KutuAcGame() {
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isLoading, setIsLoading] = useState(true);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();
    
    const [openedBoxes, setOpenedBoxes] = useState<Set<number>>(new Set());
    const [openedQuestion, setOpenedQuestion] = useState<{ number: number; question: Question } | null>(null);
    const [isFinished, setIsFinished] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const [takimSayisi, setTakimSayisi] = useState(1);
    const [puanlar, setPuanlar] = useState<Record<string, number>>({});
    const [siraIndeksi, setSiraIndeksi] = useState(0);

    const isMultiplayer = useMemo(() => takimSayisi > 1, [takimSayisi]);
    const GRUPLAR = useMemo(() => {
        if (!isMultiplayer) return ['Tek Kişi'];
        return ['A', 'B', 'C', 'D'].slice(0, takimSayisi);
    }, [isMultiplayer, takimSayisi]);

    const teamColors = ['text-blue-400', 'text-red-400', 'text-green-400', 'text-yellow-400'];
    const teamBorderColors = ['border-blue-500', 'border-red-500', 'border-green-500', 'border-yellow-500'];
    const teamBgColors = ['bg-blue-500/10', 'bg-red-500/10', 'bg-green-500/10', 'bg-yellow-500/10'];

    const activityCenterLink = useMemo(() => {
        return '/teacher/smartboard';
    }, []);

    useEffect(() => {
        const teamCountParam = searchParams.get('teamCount');
        const teamCount = parseInt(teamCountParam || '1', 10);
        setTakimSayisi(teamCount > 0 ? teamCount : 1);
    }, [searchParams]);

    useEffect(() => {
        const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const fetchQuestions = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        const params = {
            courseId: searchParams.get('courseId') || undefined,
            unitId: searchParams.get('unitId') || undefined,
            topicId: searchParams.get('topicId') || undefined,
        };
        const result = await getKutuAcQuestionsAction(params);
        if (result.error || result.questions.length === 0) {
            setError(result.error || "Bu konu için soru bulunamadı.");
        } else {
            setQuestions(shuffleArray(result.questions));
        }
        setIsLoading(false);
    }, [searchParams]);

    useEffect(() => {
        fetchQuestions();
        const initialPuanlar: Record<string, number> = {};
        GRUPLAR.forEach(grup => { initialPuanlar[grup] = 0; });
        setPuanlar(initialPuanlar);
    }, [fetchQuestions, GRUPLAR]);

    const handleAnswerQuestion = (questionNumber: number, isCorrect: boolean, scoreChange: number) => {
        setOpenedQuestion(null);
        setOpenedBoxes(prev => new Set(prev).add(questionNumber));
        
        const aktifGrup = GRUPLAR[siraIndeksi];
        if (isCorrect) {
            setPuanlar(prev => ({...prev, [aktifGrup]: Math.max(0, (prev[aktifGrup] || 0) + scoreChange)}));
        }

        if (openedBoxes.size + 1 >= Math.min(KUTU_SAYISI, questions.length)) {
            setIsFinished(true);
        }

        if(isMultiplayer) {
            setSiraIndeksi((siraIndeksi + 1) % GRUPLAR.length);
        }
    };
    
    const handleRestart = () => {
        setIsFinished(false);
        setOpenedBoxes(new Set());
        setOpenedQuestion(null);
        const initialPuanlar: Record<string, number> = {};
        GRUPLAR.forEach(grup => { initialPuanlar[grup] = 0; });
        setPuanlar(initialPuanlar);
        setSiraIndeksi(0);
        fetchQuestions();
    };

    if (isLoading) {
        return <div className="flex h-screen items-center justify-center bg-slate-950"><Loader2 className="h-16 w-16 animate-spin text-cyan-500" /> <span className="ml-4 text-slate-400 text-xl font-bold animate-pulse">Oyun Yükleniyor...</span></div>;
    }

    if (error) {
        return (
            <div className={cn("w-full h-full min-h-screen flex items-center justify-center p-4 bg-slate-950")}>
                <div className="bg-slate-900 border border-red-500/30 text-white px-8 py-6 rounded-3xl relative max-w-md text-center shadow-2xl">
                    <h2 className="text-2xl font-bold mb-2 text-red-400">Hata!</h2>
                    <p className="text-slate-400 mb-6">{error}</p>
                    <Button asChild className="w-full bg-slate-800 hover:bg-slate-700 text-white h-12 rounded-xl">
                        <Link href={activityCenterLink}><ArrowLeft className="mr-2 h-4 w-4"/>Çık</Link>
                    </Button>
                </div>
            </div>
        );
    }
    
    if (isFinished) {
        const sortedTeams = Object.entries(puanlar).sort(([,a], [,b]) => b - a);

        return (
             <div className={cn("w-full h-full min-h-screen flex items-center justify-center p-4 bg-slate-950")}>
                <Card className={cn("w-full bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500", isFullscreen ? "h-screen rounded-none border-none flex flex-col justify-center" : "max-w-2xl")}>
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-purple-500 to-pink-500" />
                    <CardHeader className="text-center pb-2 pt-8">
                        <div className="mx-auto bg-slate-800 p-6 rounded-full mb-4 shadow-lg ring-4 ring-slate-800/50 inline-block">
                             <Trophy className={cn("text-yellow-400 animate-bounce", isFullscreen ? "h-24 w-24" : "h-16 w-16")}/>
                        </div>
                        <CardTitle className={cn("font-black text-white mt-4 uppercase tracking-wider", isFullscreen ? "text-6xl" : "text-4xl")}>Oyun Bitti!</CardTitle>
                        <CardDescription className="text-slate-400 text-xl font-medium mt-2">Tüm kutular açıldı, işte sonuçlar.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 px-8 md:px-12 py-6">
                         {isMultiplayer ? (
                            <div className="space-y-4">
                                {sortedTeams.map(([team, score], index) => (
                                    <div key={team} className={cn(
                                        "flex items-center justify-between p-4 rounded-2xl border transition-all",
                                        index === 0 ? "bg-yellow-500/20 border-yellow-500/50 scale-105 shadow-lg shadow-yellow-900/20" : "bg-slate-800/50 border-white/5"
                                    )}>
                                        <div className="flex items-center gap-4">
                                            <div className={cn(
                                                "w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg",
                                                index === 0 ? "bg-yellow-500 text-black" : 
                                                index === 1 ? "bg-slate-400 text-black" : 
                                                index === 2 ? "bg-orange-700 text-white" : "bg-slate-700 text-slate-400"
                                            )}>
                                                {index + 1}
                                            </div>
                                            <span className={cn("font-bold text-xl", index === 0 ? "text-yellow-400" : "text-white")}>{team} Takımı</span>
                                        </div>
                                        <span className="font-black text-2xl text-white">{score} Puan</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 bg-slate-800/50 rounded-3xl border border-white/10">
                                <p className="text-slate-400 uppercase tracking-widest font-bold text-sm mb-2">Toplam Skor</p>
                                <p className={cn("font-black text-cyan-400 drop-shadow-[0_0_20px_rgba(34,211,238,0.4)]", isFullscreen ? "text-8xl" : "text-7xl")}>{puanlar['Tek Kişi'] || 0}</p>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="flex-col gap-4 pt-4 pb-10 px-8 md:px-12">
                        <Button onClick={handleRestart} className="w-full h-16 text-2xl font-bold rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-900/20 transition-transform hover:scale-[1.02]">
                           <Repeat className="mr-3 h-6 w-6" /> Tekrar Oyna
                        </Button>
                         <Button asChild className="w-full h-14 text-lg font-bold rounded-2xl border-white/10 hover:bg-white/10 text-slate-300 hover:text-white transition-colors" variant="outline">
                           <Link href={activityCenterLink}><Home className="mr-3 h-5 w-5"/>Panele Dön</Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        )
    }

    const timerDuration = openedQuestion?.question.type === 'Doğru/Yanlış' ? 10 : 20;

    return (
        <div className={cn("w-full h-full min-h-screen flex flex-col bg-slate-950 text-white overflow-hidden relative", isFullscreen ? "" : "p-4 md:p-8")}>
            
            {/* Arka Plan Efektleri */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-purple-900/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-cyan-900/20 rounded-full blur-[120px]" />
            </div>

            <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col h-full">
                
                {/* Header */}
                <div className="flex justify-between items-center mb-6 bg-slate-900/80 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-lg">
                    <h1 className="text-2xl md:text-4xl font-black flex items-center gap-3 tracking-tight">
                        <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
                            <Package className="h-6 w-6 md:h-8 md:w-8 text-white" />
                        </div>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">KUTU AÇ</span>
                    </h1>
                    <div className="flex items-center gap-3">
                        <Button asChild variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-white/10 rounded-xl"><Link href={activityCenterLink}><ArrowLeft className="h-6 w-6"/></Link></Button>
                        <FullscreenToggle className="bg-slate-800 text-slate-300 hover:text-white border-0 h-10 w-10 rounded-xl" />
                    </div>
                </div>

                 {/* Takım Skorları */}
                 <div className={cn("grid gap-4 mb-8", `grid-cols-2 md:grid-cols-${takimSayisi > 4 ? 4 : takimSayisi}`)}>
                    {GRUPLAR.map((grup, index) => {
                        const isActive = GRUPLAR[siraIndeksi] === grup;
                        const colorClass = teamColors[index % teamColors.length];
                        const borderClass = teamBorderColors[index % teamBorderColors.length];
                        const bgClass = teamBgColors[index % teamBgColors.length];
                        
                        return (
                            <div key={grup} className={cn(
                                "relative overflow-hidden p-4 rounded-2xl border-2 transition-all duration-300",
                                "bg-slate-900/50 backdrop-blur-sm",
                                isActive ? `${borderClass} ${bgClass} scale-105 shadow-lg z-10` : "border-white/5 opacity-80 hover:opacity-100"
                            )}>
                                {isActive && <div className={cn("absolute top-2 right-2 w-2 h-2 rounded-full animate-pulse", colorClass.replace('text-', 'bg-'))} />}
                                <span className={cn("text-xs md:text-sm font-bold uppercase tracking-wider mb-1 block", isActive ? colorClass : "text-slate-500")}>
                                    {grup}{isMultiplayer ? ' TAKIMI' : ''}
                                </span>
                                <span className={cn("text-3xl md:text-4xl font-black block text-white tabular-nums tracking-tight")}>
                                    {puanlar[grup] || 0}
                                </span>
                            </div>
                        );
                    })}
                </div>

                 {/* Oyun Alanı (Grid) */}
                 <div className="flex-grow flex items-center justify-center">
                    <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3 md:gap-4 w-full">
                        {Array.from({ length: Math.min(KUTU_SAYISI, questions.length) }).map((_, i) => {
                            const questionNumber = i + 1;
                            const isOpened = openedBoxes.has(questionNumber);
                            return (
                                <div 
                                    key={i}
                                    className={cn(
                                        "aspect-square rounded-2xl flex items-center justify-center text-2xl md:text-4xl font-black text-white cursor-pointer shadow-lg transition-all duration-300 relative overflow-hidden group select-none",
                                        isOpened 
                                            ? "bg-slate-800/50 border-2 border-white/5 cursor-default" 
                                            : "bg-gradient-to-br from-indigo-600 to-purple-700 hover:from-indigo-500 hover:to-purple-600 hover:scale-110 hover:shadow-purple-500/30 hover:z-10 border-b-4 border-indigo-900 active:border-b-0 active:translate-y-1"
                                    )}
                                    onClick={() => !isOpened && questions[i] && setOpenedQuestion({ number: questionNumber, question: questions[i] })}
                                >
                                    {/* Parlama Efekti */}
                                    {!isOpened && <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />}
                                    
                                    {isOpened ? (
                                        <CheckCheck className="h-8 w-8 text-emerald-500 animate-in zoom-in duration-300" />
                                    ) : (
                                        <span className="drop-shadow-md">{questionNumber}</span>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>

                <div className="mt-8 text-center">
                    <Button onClick={() => setIsFinished(true)} variant="ghost" className="text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                        Oyunu Bitir
                    </Button>
                </div>
            </div>
             
             {/* Soru Modalı */}
             {openedQuestion && (
                <QuestionDialog
                    isFullscreen={isFullscreen}
                    isOpen={!!openedQuestion}
                    onClose={() => setOpenedQuestion(null)}
                    questionData={openedQuestion}
                    onAnswer={handleAnswerQuestion}
                    timerDuration={timerDuration}
                    pointsConfig={{ 'Kolay': 10, 'Orta': 20, 'Zor': 30 }}
                />
            )}
        </div>
    );
}

export default function SmartboardKutuAcOyunPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-950"><Loader2 className="h-16 w-16 animate-spin text-cyan-500" /></div>}>
            <KutuAcGame />
        </Suspense>
    )
}