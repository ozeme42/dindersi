
'use client';

import { useState, useEffect, useCallback, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getKutuAcQuestionsAction } from '@/app/oyunlar/kutu-ac/actions';
import type { Question } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Package, PartyPopper, Repeat, Home, CheckCheck, Wind } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { FullscreenToggle } from '@/components/fullscreen-toggle';
import { useAuth } from '@/context/auth-context';
import { QuestionDialog } from '@/components/question-dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

const shuffleArray = <T,>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

// This is a more robust type to handle all variations of questions coming from different parts of the app
type GameQuestion = Partial<Question> & {
    id: string; // Ensure id is always present
    text?: string;
    type: 'Çoktan Seçmeli' | 'Doğru/Yanlış' | 'Boşluk Doldurma';
    difficulty: 'Kolay' | 'Orta' | 'Zor';
    question?: string; // For MCQ from student-side
    statement?: string; // for TF from student-side
    isTrue?: boolean; // for TF from student-side
    sentenceWithBlank?: string; // for FITB from student-side
    soru?: string; // For Tornado 'soru'
    secenekler?: Record<string, string>; // For Tornado 'secenekler'
    cevap?: string; // For Tornado 'cevap'
};


type KutuIcerik =
    | { type: 'soru'; data: GameQuestion }
    | { type: 'bos'; mesaj: string; puan: number; renk: string; ikon: string; }
    | { type: 'odul'; mesaj: string; puan: number; renk: string; ikon: string; }
    | { type: 'ceza'; mesaj: string; puan: number; renk: string; ikon: string; }
    | { type: 'ekstra'; mesaj: string; efekt: 'PAS' | 'TEKRAR_OYNA' | 'BIR_TUR_BEKLE'; renk: string; ikon: string; };

const KUTU_SAYISI = 30;
const SORU_SAYISI = 15;


function KutuAcGame() {
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isLoading, setIsLoading] = useState(true);
    const [questions, setQuestions] = useState<GameQuestion[]>([]);
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();
    
    const [openedBoxes, setOpenedBoxes] = useState<Set<number>>(new Set());
    const [openedQuestion, setOpenedQuestion] = useState<{ number: number; question: GameQuestion } | null>(null);
    const [score, setScore] = useState(0);

    const [isFinished, setIsFinished] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isScoreSaved, setIsScoreSaved] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    
    // Çok oyunculu için eklenen state'ler
    const [teamCount, setTeamCount] = useState(1);
    const [puanlar, setPuanlar] = useState<Record<string, number>>({});
    const [siraIndeksi, setSiraIndeksi] = useState(0);
    const [kutuIcerikleri, setKutuIcerikleri] = useState<KutuIcerik[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [cezaliGruplar, setCezaliGruplar] = useState<Set<string>>(new Set());
    const [mesaj, setMesaj] = useState<{metin: string, renk: string} | null>(null);
    const [winner, setWinner] = useState<string | null>(null);

    const isMultiplayer = useMemo(() => teamCount > 1, [teamCount]);
    const GRUPLAR = useMemo(() => {
        if (!isMultiplayer) return ['Tek Kişi'];
        return ['A', 'B', 'C', 'D'].slice(0, teamCount);
    }, [isMultiplayer, teamCount]);


    const backUrl = '/teacher/smartboard/kutu-ac';
    
     const ozelKutular: KutuIcerik[] = [
        { type: 'bos', mesaj: '&#9898; Boş Kutu!', puan: 0, renk: 'var(--bos-renk)', ikon: '&#9898;' },
        { type: 'bos', mesaj: '&#9898; Boş Kutu!', puan: 0, renk: 'var(--bos-renk)', ikon: '&#9898;' },
        { type: 'bos', mesaj: '&#9898; Boş Kutu!', puan: 0, renk: 'var(--bos-renk)', ikon: '&#9898;' },
        { type: 'odul', mesaj: '&#11088; +15 Puan!', puan: 15, renk: 'var(--odul-renk)', ikon: '&#11088;' },
        { type: 'odul', mesaj: '&#11088; +15 Puan!', puan: 15, renk: 'var(--odul-renk)', ikon: '&#11088;' },
        { type: 'odul', mesaj: '🌟 +25 Puan!', puan: 25, renk: 'var(--odul-renk)', ikon: '🌟' },
        { type: 'ceza', mesaj: '&#10071; -10 Puan!', puan: -10, renk: 'var(--ceza-renk)', ikon: '&#10071;' },
        { type: 'ceza', mesaj: '&#10071; -10 Puan!', puan: -10, renk: 'var(--ceza-renk)', ikon: '&#10071;' },
        { type: 'ceza', mesaj: '💥 -20 Puan!', puan: -20, renk: 'var(--ceza-renk)', ikon: '💥' },
        { type: 'ekstra', mesaj: '&#9193; Pas!', efekt: 'PAS', renk: 'var(--bos-renk)', ikon: '&#9193;' },
        { type: 'ekstra', mesaj: '🔄 Tekrar Oyna!', efekt: 'TEKRAR_OYNA', renk: 'var(--vurgu-renk)', ikon: '🔄' },
        { type: 'ekstra', mesaj: '🛑 Bir Tur Bekle!', efekt: 'BIR_TUR_BEKLE', renk: 'var(--ceza-renk)', ikon: '🛑' },
    ];


    const oyunuBaslat = useCallback((soruBankasi: GameQuestion[]) => {
        if (soruBankasi.length === 0) {
            setError(`Oyun için soru bulunamadı.`);
            setGameState('error');
            return;
        }

        const initialPuanlar: Record<string, number> = {};
        GRUPLAR.forEach(grup => { initialPuanlar[grup] = 0; });
        setPuanlar(initialPuanlar);

        const shuffledQuestions = [...soruBankasi].sort(() => 0.5 - Math.random());
        const questionCount = isMultiplayer ? Math.min(SORU_SAYISI, shuffledQuestions.length) : shuffledQuestions.length;
        
        const sorular: KutuIcerik[] = shuffledQuestions.slice(0, questionCount).map(q => ({ type: 'soru', data: q }));
        
        let icerikHavuzu: KutuIcerik[] = [...sorular];
        if (isMultiplayer) {
            const ozelKutuSayisi = KUTU_SAYISI - sorular.length;
            const specialBoxesToAdd = [...ozelKutular].sort(() => 0.5 - Math.random()).slice(0, ozelKutuSayisi);
            icerikHavuzu = [...sorular, ...specialBoxesToAdd];
        }
        
        setKutuIcerikleri(icerikHavuzu.sort(() => Math.random() - 0.5));
        setSiraIndeksi(0);
        setOpenedBoxes(new Set());
        setCezaliGruplar(new Set());
        setIsFinished(false);
        setWinner(null);
    }, [GRUPLAR, isMultiplayer, ozelKutular]);


    const fetchQuestions = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        const tc = parseInt(searchParams.get('teamCount') || '1', 10);
        setTeamCount(tc > 1 ? tc : 1);

        const params = {
            courseId: searchParams.get('courseId') || undefined,
            unitId: searchParams.get('unitId') || undefined,
            topicId: searchParams.get('topicId') || undefined,
            questionCount: tc > 1 ? KUTU_SAYISI : undefined,
        };
        const result = await getKutuAcQuestionsAction(params);
        if (result.error || result.questions.length === 0) {
            setError(result.error || "Bu konu için soru bulunamadı.");
        } else {
            setQuestions(result.questions as GameQuestion[]);
            oyunuBaslat(result.questions as GameQuestion[]);
        }
        setIsLoading(false);
    }, [searchParams, oyunuBaslat]);

    useEffect(() => {
        fetchQuestions();
    }, [fetchQuestions]);
    
     const siraDegistir = useCallback((tekrarOyna = false) => {
        if (!isMultiplayer) {
            setIsProcessing(false);
            return;
        }

        if (tekrarOyna) {
            setIsProcessing(false);
            toast({ title: 'Şanslı Gün!', description: `${GRUPLAR[siraIndeksi]} Grubu bir daha oynuyor!` });
            return;
        }
        
        let sonrakiSira = (siraIndeksi + 1) % GRUPLAR.length;
        let denemeSayisi = 0;

        while (cezaliGruplar.has(GRUPLAR[sonrakiSira]) && denemeSayisi < GRUPLAR.length) {
            const cezaliGrup = GRUPLAR[sonrakiSira];
            setCezaliGruplar(prev => {
                const newSet = new Set(prev);
                newSet.delete(cezaliGrup);
                return newSet;
            });
            toast({ title: 'Ceza Bitti', description: `${cezaliGrup} Grubu'nun cezası bitti, bir sonraki turda oyuna dönecek.` });
            sonrakiSira = (sonrakiSira + 1) % GRUPLAR.length;
            denemeSayisi++;
        }
        
        setSiraIndeksi(sonrakiSira);
        setIsProcessing(false);

    }, [siraIndeksi, GRUPLAR, cezaliGruplar, toast, isMultiplayer]);

    const ozelKutuEtkisiUygula = useCallback((icerik: KutuIcerik) => {
        const aktifGrup = GRUPLAR[siraIndeksi];
        setMesaj({ metin: icerik.mesaj, renk: icerik.renk });
        
        if (icerik.puan) {
            setPuanlar(prev => ({ ...prev, [aktifGrup]: Math.max(0, (prev[aktifGrup] || 0) + icerik.puan!) }));
        }

        let tekrarOyna = false;
        if (isMultiplayer && icerik.type === 'ekstra') {
            if (icerik.efekt === 'BIR_TUR_BEKLE') {
                toast({ title: 'Ceza!', description: `${aktifGrup} Grubu bir sonraki tur bekleyecek.`, variant: 'destructive' });
                setCezaliGruplar(prev => new Set(prev).add(aktifGrup));
            }
            if (icerik.efekt === 'TEKRAR_OYNA') {
                tekrarOyna = true;
            }
        }

        setTimeout(() => {
            setMesaj(null);
            siraDegistir(tekrarOyna);
        }, 2000);
    }, [GRUPLAR, siraIndeksi, siraDegistir, toast, isMultiplayer]);

    const kutucukSecildi = useCallback((kutucukNo: number) => {
        if (isProcessing || openedBoxes.has(kutucukNo + 1)) return;
        
        const icerik = kutuIcerikleri[kutucukNo];
        if (!icerik) return;

        setIsProcessing(true);
        setOpenedBoxes(prev => new Set(prev).add(kutucukNo + 1));

        if (icerik.type === 'soru') {
            setOpenedQuestion({ number: kutucukNo + 1, question: icerik.data });
        } else {
            ozelKutuEtkisiUygula(icerik);
        }
    }, [isProcessing, openedBoxes, kutuIcerikleri, ozelKutuEtkisiUygula]);
    
    const handleEndGame = useCallback(() => {
        const sortedScores = Object.entries(puanlar).sort(([, a], [, b]) => b - a);
       if (isMultiplayer) {
           if (sortedScores.length > 0 && (sortedScores.length === 1 || sortedScores[0][1] > sortedScores[1][1])) {
               setWinner(sortedScores[0][0]);
           } else {
               setWinner(null); // Draw
           }
       }
       setIsFinished(true);
   }, [isMultiplayer, puanlar]);

    useEffect(() => {
        if (openedBoxes.size >= kutuIcerikleri.length && kutuIcerikleri.length > 0 && !isFinished) {
            handleEndGame();
        }
    }, [openedBoxes, kutuIcerikleri.length, isFinished, handleEndGame]);

    const handleAnswerQuestion = useCallback((questionNumber: number, isCorrect: boolean, scoreChange: number) => {
        setOpenedQuestion(null);
        
        if (isMultiplayer) {
            const aktifGrup = GRUPLAR[siraIndeksi];
            setPuanlar(prevPuanlar => {
                const newScore = Math.max(0, (prevPuanlar[aktifGrup] || 0) + scoreChange);
                return { ...prevPuanlar, [aktifGrup]: newScore };
            });
             setTimeout(() => {
                siraDegistir(false);
            }, 50);
        } else {
             if(isCorrect) setScore(s => s + scoreChange);
             setIsProcessing(false);
        }
    }, [siraIndeksi, GRUPLAR, siraDegistir, isMultiplayer]);

    const handleRestart = () => {
        oyunuBaslat(questions);
    };

    const handleSaveAndExit = () => router.push('/teacher/smartboard');


    if (isLoading) {
        return <div className="flex h-screen items-center justify-center bg-gray-900"><Loader2 className="h-12 w-12 animate-spin text-white"/></div>;
    }

    if (error) {
         return (
            <div className="w-full h-full min-h-screen p-4 flex items-center justify-center bg-gray-900">
                <Alert variant="destructive" className="max-w-lg bg-card text-card-foreground">
                    <AlertTitle>Hata!</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                     <div className="mt-4">
                        <Button asChild variant="outline"><Link href={backUrl}><ArrowLeft className="mr-2 h-4 w-4"/>Geri Dön</Link></Button>
                    </div>
                </Alert>
            </div>
        );
    }
    
    if (isFinished) {
         return (
            <div className="flex items-center justify-center min-h-screen bg-gray-900">
                <Card className="w-full max-w-md text-center">
                    <CardHeader>
                        <CardTitle className="font-headline text-3xl">Oyun Bitti!</CardTitle>
                    </CardHeader>
                    <CardContent>
                         {isMultiplayer ? (
                            winner ? (
                                <p className="text-2xl">Kazanan: <span className="font-bold text-primary">{winner} Grubu</span></p>
                            ) : <p className="text-2xl">Berabere!</p>
                        ) : (
                             <p className="text-xl">Toplam Puanın: <span className="font-bold text-primary">{score}</span></p>
                        )}
                        {isMultiplayer && (
                             <div className="mt-4 space-y-2">
                                {Object.entries(puanlar).sort(([,a],[,b]) => b-a).map(([grup, puan]) => (
                                    <div key={grup} className="flex justify-between p-2 rounded-md bg-muted">
                                        <span>{grup} Grubu</span>
                                        <span className="font-semibold">{puan} Puan</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="flex-col sm:flex-row justify-center gap-4">
                        <Button size="lg" onClick={handleRestart}><Repeat className="mr-2 h-5 w-5"/> Tekrar Oyna</Button>
                        <Button asChild variant="outline"><Link href={backUrl}><Home className="mr-2 h-5 w-5"/> Ana Menü</Link></Button>
                    </CardFooter>
                </Card>
            </div>
        )
    }
    
    const timerDuration = openedQuestion?.question.type === 'Doğru/Yanlış' ? 10 : 20;

    return (
        <div id="ana-kapsayici" className="w-full max-w-7xl h-screen mx-auto bg-gray-900 rounded-2xl shadow-2xl p-2 sm:p-3 flex flex-col">
             <style jsx global>{`
                :root { --arka-plan: #1a202c; --ana-renk: #2b6cb0; --vurgu-renk: #4fd1c5; --basari-renk: #48bb78; --hata-renk: #f56565; --odul-renk: #f6e05e; --ceza-renk: #f56565; --bos-renk: #a0aec0; }
                body { background-color: var(--arka-plan); font-family: 'Inter', sans-serif; }
                #ana-kapsayici { height: 100vh; overflow-y: hidden; }
                :fullscreen #ana-kapsayici { height: 100vh !important; overflow-y: hidden !important; }
             `}</style>
            
            <div className="flex items-center justify-between mb-2 relative px-2 shrink-0">
                <Button asChild variant="outline" size="sm"><Link href={backUrl}><ArrowLeft className="mr-2 h-4 w-4"/>Çık</Link></Button>
                <h1 className="text-xl sm:text-3xl lg:text-4xl font-extrabold text-center text-teal-300">Kutu Açma Oyunu</h1>
                 <Button onClick={() => handleEndGame()} variant="destructive" size="sm">Oyunu Bitir</Button>
            </div>

            {isMultiplayer && (
                 <div id="puan-durumu-alani" className={cn("grid gap-2 mb-2 shrink-0", `grid-cols-2 md:grid-cols-${teamCount}`)}>
                    {GRUPLAR.map((grup, index) => {
                        const renkler = ['#3182ce', '#e53e3e', '#38a169', '#d69e2e'];
                        const isActive = GRUPLAR[siraIndeksi] === grup && !cezaliGruplar.has(grup);
                        return (
                            <div key={grup} 
                                id={`grup-puan-gostergesi-${grup.toLowerCase()}`}
                                className={cn("text-center p-1 rounded-lg bg-gray-900 border-b-4", isActive && 'ring-4 ring-teal-400')}
                                style={{ borderColor: renkler[index], opacity: cezaliGruplar.has(grup) ? 0.5 : 1 }}
                            >
                                <span className="text-sm sm:text-base font-bold text-teal-300">{grup}{' GRUBU'}</span>
                                <span id={`grup-${grup.toLowerCase()}-puan`} className="text-2xl sm:text-3xl font-extrabold block text-white">{puanlar[grup] || 0}</span>
                            </div>
                        );
                    })}
                </div>
            )}
           
            <div className="flex-grow min-h-0">
              <ScrollArea className="h-full">
                <div className={cn("grid gap-1 p-2", isMultiplayer ? "grid-cols-6 grid-rows-5" : "grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8")}>
                    {kutuIcerikleri.map((_, i) => {
                        const kutucukNo = i + 1;
                        const isOpened = openedBoxes.has(kutucukNo);
                        return (
                            <div key={kutucukNo}
                                id={`kutucuk-${kutucukNo}`}
                                onClick={() => kutucukSecildi(i)}
                                className={cn(
                                    "flex items-center justify-center rounded-lg text-white font-extrabold text-2xl sm:text-3xl transition-all duration-300 aspect-square",
                                    isOpened
                                        ? "bg-gray-700/50 cursor-not-allowed"
                                        : "bg-teal-600 cursor-pointer hover:bg-teal-500 hover:scale-105"
                                )}
                            >
                                {isOpened ? <CheckCheck className="h-8 w-8 text-green-400" /> : kutucukNo}
                            </div>
                        )
                    })}
                </div>
              </ScrollArea>
            </div>
            
            {isMultiplayer && <p className="text-center text-teal-300 text-lg my-2 shrink-0">Sıradaki Takım: <span className="font-bold">{GRUPLAR[siraIndeksi]}</span></p>}
            
            {mesaj && (
                 <AlertDialog open={!!mesaj}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-center text-2xl" style={{color: mesaj.renk}} dangerouslySetInnerHTML={{ __html: mesaj.metin }} />
                        </AlertDialogHeader>
                    </AlertDialogContent>
                </AlertDialog>
            )}
            
            {openedQuestion && (
                <QuestionDialog
                    isOpen={!!openedQuestion}
                    onClose={() => {
                        setOpenedQuestion(null);
                        siraDegistir(false);
                    }}
                    questionData={openedQuestion}
                    onAnswer={handleAnswerQuestion}
                    timerDuration={15}
                    pointsConfig={{ 'Kolay': 10, 'Orta': 20, 'Zor': 30 }}
                    penaltyConfig={{ 'Kolay': 5, 'Orta': 10, 'Zor': 15 }}
                    isFullscreen={isFullscreen}
                />
            )}
        </div>
    );
}

export default function KutuAcOyunPage() {
    return <Suspense fallback={<div className="flex h-screen items-center justify-center bg-gray-900"><Loader2 className="h-12 w-12 animate-spin text-white"/></div>}><KutuAcGame/></Suspense>
}

    