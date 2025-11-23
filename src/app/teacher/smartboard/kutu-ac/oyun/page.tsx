
'use client';

import { useState, useEffect, useCallback, Suspense, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getKutuAcQuestionsAction } from '@/app/student/kutu-ac/actions';
import type { Question } from "@/lib/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Package, PartyPopper, Repeat, Home, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { FullscreenToggle } from "@/components/fullscreen-toggle";
import { useAuth } from "@/context/auth-context";
import { QuestionDialog } from "@/components/question-dialog";

const KUTU_SAYISI = 30;
const SORU_SAYISI = 15;

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

        // Move to the next team
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
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /> <span className="ml-2">Oyun Yükleniyor...</span></div>;
    }

    if (error) {
        return (
            <div className={cn("w-full h-full min-h-screen flex items-center justify-center p-4")}>
                <Alert variant="destructive" className="max-w-lg"><AlertTitle>Hata!</AlertTitle><AlertDescription>{error}</AlertDescription><div className="mt-4"><Button asChild variant="outline"><Link href={activityCenterLink}><ArrowLeft className="mr-2 h-4 w-4"/>Çık</Link></Button></div></Alert>
            </div>
        );
    }
    
    if (isFinished) {
        return (
             <div className={cn("w-full h-full min-h-screen flex items-center justify-center p-4")}>
                <Card className={cn("w-full text-center", isFullscreen ? "h-screen rounded-none border-none flex flex-col justify-center" : "max-w-md")}>
                    <CardHeader>
                        <div className="mx-auto bg-amber-100 rounded-full p-3 w-fit"><PartyPopper className={cn("h-10 w-10 text-amber-500", isFullscreen && "h-16 w-16")}/></div>
                        <CardTitle className={cn("font-headline text-2xl md:text-3xl mt-4", isFullscreen && "text-5xl")}>Tebrikler!</CardTitle>
                        <CardDescription>Tüm kutuları açtın.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         {isMultiplayer ? (
                            <div className="space-y-2">
                                <h3 className="font-semibold">Skor Tablosu</h3>
                                {Object.entries(puanlar).sort(([,a], [,b]) => b - a).map(([team, score]) => (
                                    <div key={team} className="flex justify-between p-2 bg-muted rounded-md">
                                        <span>{team} Takımı</span>
                                        <span className="font-bold">{score} Puan</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className={cn("text-lg md:text-xl", isFullscreen && "text-2xl")}>Toplam Puanın: <span className="font-bold text-primary">{puanlar['Tek Kişi'] || 0}</span></p>
                        )}
                    </CardContent>
                    <CardFooter className="flex-col gap-2 pt-6">
                        <Button onClick={handleRestart} variant="secondary" className="w-full">
                           <Repeat className="mr-2 h-4 w-4" /> Tekrar Oyna
                        </Button>
                         <Button asChild className="w-full" variant="outline">
                           <Link href={activityCenterLink}><Home className="mr-2 h-4 w-4"/>Panele Dön</Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        )
    }

    const timerDuration = openedQuestion?.question.type === 'Doğru/Yanlış' ? 10 : 20;

    return (
        <div className={cn("w-full h-full min-h-screen flex flex-col items-center justify-center p-2", isFullscreen ? "" : "md:p-8")}>
            <div className="w-full max-w-5xl mx-auto">
                <div className="flex justify-between items-center mb-2">
                    <h1 className="text-xl md:text-3xl font-bold font-headline flex items-center gap-2"><Package/> Kutu Aç</h1>
                    <div className="flex items-center gap-2">
                        <Button asChild variant="outline" size="sm"><Link href={activityCenterLink}><ArrowLeft className="mr-2 h-4 w-4"/>Çık</Link></Button>
                        <FullscreenToggle />
                    </div>
                </div>
                 <div className={cn("grid gap-2 mb-2", `grid-cols-2 md:grid-cols-${takimSayisi}`)}>
                    {GRUPLAR.map((grup, index) => {
                        const renkler = ['#3182ce', '#e53e3e', '#38a169', '#d69e2e'];
                        const isActive = GRUPLAR[siraIndeksi] === grup;
                        return (
                            <div key={grup} className={cn("text-center p-1 rounded-lg border-b-4", isActive && 'ring-2 ring-primary')}>
                                <span className="text-sm sm:text-base font-bold text-primary">{grup}{isMultiplayer ? ' TAKIMI' : ''}</span>
                                <span className="text-2xl sm:text-3xl font-extrabold block text-foreground">{puanlar[grup] || 0}</span>
                            </div>
                        );
                    })}
                </div>
                 <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 md:gap-4">
                    {Array.from({ length: Math.min(KUTU_SAYISI, questions.length) }).map((_, i) => {
                        const questionNumber = i + 1;
                        const isOpened = openedBoxes.has(questionNumber);
                        return (
                            <div 
                                key={i}
                                className={cn(
                                    "aspect-square rounded-lg flex items-center justify-center text-2xl md:text-4xl font-bold text-white cursor-pointer shadow-lg transition-all duration-300",
                                    "bg-gradient-to-br from-indigo-500 to-purple-600",
                                    isOpened ? "opacity-20 cursor-not-allowed" : "hover:scale-105 hover:shadow-2xl"
                                )}
                                onClick={() => !isOpened && questions[i] && setOpenedQuestion({ number: questionNumber, question: questions[i] })}
                            >
                                {isOpened ? <CheckCheck className="h-8 w-8 text-green-400" /> : questionNumber}
                            </div>
                        )
                    })}
                </div>
                <div className="mt-6 text-center">
                    <Button onClick={() => setIsFinished(true)} variant="secondary">
                        <PartyPopper className="mr-2 h-4 w-4" /> Oyunu Bitir
                    </Button>
                </div>
            </div>
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
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
            <KutuAcGame />
        </Suspense>
    )
}
