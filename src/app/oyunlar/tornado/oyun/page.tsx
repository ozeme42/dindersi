
'use client';

import { useState, useEffect, useCallback, Suspense, useMemo, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getTornadoGameQuestions, submitTornadoScoreAction } from '../actions';
import type { Question } from "@/lib/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Wind, PartyPopper, Repeat, Home, Check, AlertTriangle, Trophy, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from 'next/link';
import { QuestionDialog } from "@/components/question-dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";

const KUTU_SAYISI = 30;
const SORU_SAYISI = 15;

type KutuIcerik =
    | { type: 'soru'; data: Question }
    | { type: 'bos'; mesaj: string; puan: number; renk: string; ikon: string; }
    | { type: 'odul'; mesaj: string; puan: number; renk: string; ikon: string; }
    | { type: 'ceza'; mesaj: string; puan: number; renk: string; ikon: string; }
    | { type: 'ekstra'; mesaj: string; efekt: 'PAS' | 'TEKRAR_OYNA' | 'BIR_TUR_BEKLE'; renk: string; ikon: string; };

function TornadoGame() {
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();

    const [takimSayisi, setTakimSayisi] = useState(1);
    const [gameState, setGameState] = useState<'setup' | 'playing' | 'finished' | 'error'>('setup');
    const [soruBankasi, setSoruBankasi] = useState<Question[]>([]);
    const [kutuIcerikleri, setKutuIcerikleri] = useState<KutuIcerik[]>([]);
    const [puanlar, setPuanlar] = useState<Record<string, number>>({});
    const [siraIndeksi, setSiraIndeksi] = useState(0);
    const [acilanKutular, setAcilanKutular] = useState<Set<number>>(new Set());
    
    const [isProcessing, setIsProcessing] = useState(false);
    const [cezaliGruplar, setCezaliGruplar] = useState<Set<string>>(new Set());
    const [openedQuestion, setOpenedQuestion] = useState<{ number: number; question: Question; } | null>(null);
    const [mesaj, setMesaj] = useState<{metin: string, renk: string} | null>(null);
    const [winner, setWinner] = useState<string | null>(null);
    const [isFinished, setIsFinished] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const isMultiplayer = useMemo(() => {
        const teamCountParam = searchParams.get('teamCount');
        return teamCountParam ? parseInt(teamCountParam) > 1 : false;
    }, [searchParams]);

    const GRUPLAR = useMemo(() => {
        const teamCount = parseInt(searchParams.get('teamCount') || '1', 10);
        if (teamCount > 1) {
            return ['A', 'B', 'C', 'D'].slice(0, teamCount);
        }
        return ['Tek Kişi'];
    }, [searchParams]);
    
    const activityCenterLink = '/oyunlar';

    const ozelKutular: KutuIcerik[] = [
        { type: 'bos', mesaj: '&#9898; Boş Kutu!', puan: 0, renk: 'var(--bos-renk)', ikon: '&#9898;' },
        { type: 'bos', mesaj: '&#9898; Boş Kutu!', puan: 0, renk: 'var(--bos-renk)', ikon: '&#9898;' },
        { type: 'bos', mesaj: '&#9898; Boş Kutu!', puan: 0, renk: 'var(--bos-renk)', ikon: '&#9898;' },
        { type: 'odul', mesaj: '&#11088; +15 Puan!', puan: 15, renk: 'var(--odul-renk)', ikon: '&#11088;' },
        { type: 'odul', mesaj: '&#11088; +15 Puan!', puan: 15, renk: 'var(--odul-renk)', ikon: '&#11088;' },
        { type: 'odul', mesaj: '&#11088; +15 Puan!', puan: 15, renk: 'var(--odul-renk)', ikon: '&#11088;' },
        { type: 'odul', mesaj: '🌟 +25 Puan!', puan: 25, renk: 'var(--odul-renk)', ikon: '🌟' },
        { type: 'odul', mesaj: '🌟 +25 Puan!', puan: 25, renk: 'var(--odul-renk)', ikon: '🌟' },
        { type: 'ceza', mesaj: '&#10071; -10 Puan!', puan: -10, renk: 'var(--ceza-renk)', ikon: '&#10071;' },
        { type: 'ceza', mesaj: '&#10071; -10 Puan!', puan: -10, renk: 'var(--ceza-renk)', ikon: '&#10071;' },
        { type: 'ceza', mesaj: '&#10071; -10 Puan!', puan: -10, renk: 'var(--ceza-renk)', ikon: '&#10071;' },
        { type: 'ceza', mesaj: '💥 -20 Puan!', puan: -20, renk: 'var(--ceza-renk)', ikon: '💥' },
        { type: 'ceza', mesaj: '💥 -20 Puan!', puan: -20, renk: 'var(--ceza-renk)', ikon: '💥' },
        { type: 'ekstra', mesaj: '&#9193; Pas!', efekt: 'PAS', renk: 'var(--bos-renk)', ikon: '&#9193;' },
        { type: 'ekstra', mesaj: '🔄 Tekrar Oyna!', efekt: 'TEKRAR_OYNA', renk: 'var(--vurgu-renk)', ikon: '🔄' },
        { type: 'ekstra', mesaj: '🛑 Bir Tur Bekle!', efekt: 'BIR_TUR_BEKLE', renk: 'var(--ceza-renk)', ikon: '🛑' },
    ];

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
    
    const handleAnswerQuestion = useCallback((questionNumber: number, isCorrect: boolean, scoreChange: number) => {
        setOpenedQuestion(null);
        
        setPuanlar(prevPuanlar => {
            const aktifGrup = GRUPLAR[siraIndeksi];
            const newScore = Math.max(0, (prevPuanlar[aktifGrup] || 0) + scoreChange);
            return { ...prevPuanlar, [aktifGrup]: newScore };
        });
        
        setTimeout(() => {
            siraDegistir(false);
        }, 50);

    }, [siraIndeksi, GRUPLAR, siraDegistir]);

    const kutucukSecildi = useCallback((kutucukNo: number) => {
        if (isProcessing || acilanKutular.has(kutucukNo + 1)) return;
        
        const icerik = kutuIcerikleri[kutucukNo];
        if (!icerik) return;

        setIsProcessing(true);
        setAcilanKutular(prev => new Set(prev).add(kutucukNo + 1));

        if (icerik.type === 'soru') {
            setOpenedQuestion({ number: kutucukNo + 1, question: icerik.data });
        } else {
            ozelKutuEtkisiUygula(icerik);
        }
    }, [isProcessing, acilanKutular, kutuIcerikleri, ozelKutuEtkisiUygula]);
    
     const oyunuBaslat = useCallback(() => {
        if (soruBankasi.length === 0) {
            setError(`Oyun için soru bulunamadı.`);
            setGameState('error');
            return;
        }

        const initialPuanlar: Record<string, number> = {};
        GRUPLAR.forEach(grup => { initialPuanlar[grup] = 0; });
        setPuanlar(initialPuanlar);

        const shuffledQuestions = [...soruBankasi].sort(() => 0.5 - Math.random());
        const questionCount = Math.min(SORU_SAYISI, shuffledQuestions.length);
        
        const sorular: KutuIcerik[] = shuffledQuestions.slice(0, questionCount).map(q => ({ type: 'soru', data: q }));
        const ozelKutuSayisi = KUTU_SAYISI - sorular.length;
        const specialBoxesToAdd = [...ozelKutular].sort(() => 0.5 - Math.random()).slice(0, ozelKutuSayisi);
        let icerikHavuzu: KutuIcerik[] = [...sorular, ...specialBoxesToAdd];
        
        while (icerikHavuzu.length < KUTU_SAYISI) {
            icerikHavuzu.push({ type: 'bos', mesaj: '&#9898; Boş Kutu!', puan: 0, renk: 'var(--bos-renk)', ikon: '&#9898;' });
        }
        
        setKutuIcerikleri(icerikHavuzu.sort(() => Math.random() - 0.5));
        setSiraIndeksi(0);
        setAcilanKutular(new Set());
        setCezaliGruplar(new Set());
        setGameState('playing');
        setIsFinished(false);
    }, [soruBankasi, GRUPLAR, ozelKutular]);


    useEffect(() => {
        const teamCountParam = searchParams.get('teamCount');
        const teamCount = parseInt(teamCountParam || '1', 10);
        setTakimSayisi(teamCount > 0 ? teamCount : 1);
        
        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            const params = {
                courseId: searchParams.get('courseId') || undefined,
                unitId: searchParams.get('unitId') || undefined,
                topicId: searchParams.get('topicId') || undefined,
                questionCount: KUTU_SAYISI,
            };
            const result = await getTornadoGameQuestions(params);
            if (result.error || result.questions.length < SORU_SAYISI) {
                setError(result.error || `Bu oyun için yeterli soru bulunamadı (En az ${SORU_SAYISI} gerekli).`);
                setGameState('error');
            } else {
                setSoruBankasi(result.questions);
                setGameState('setup');
            }
            setIsLoading(false);
        };
        fetchData();
    }, [searchParams]);
    
    useEffect(() => {
        if (!isLoading && !error && gameState === 'setup' && soruBankasi.length > 0) {
            oyunuBaslat();
        }
    }, [isLoading, error, gameState, soruBankasi, oyunuBaslat]);
    
     useEffect(() => {
        if (acilanKutular.size >= KUTU_SAYISI) {
            handleEndGame();
        }
    }, [acilanKutular]);
    
    const handleEndGame = () => {
        const sortedScores = Object.entries(puanlar).sort(([, a], [, b]) => b - a);
        if (sortedScores.length > 0 && (sortedScores.length === 1 || sortedScores[0][1] > sortedScores[1][1])) {
            setWinner(sortedScores[0][0]);
        } else {
            setWinner(null); // Draw
        }
        setIsFinished(true); // Mark local state as finished
        setGameState('finished');
    }
    
    useEffect(() => {
        if (gameState === 'finished' && !isMultiplayer) {
            handleSaveAndExit();
        }
    }, [gameState, isMultiplayer]);

    const handleSaveAndExit = async () => {
        if (isSubmitting || isMultiplayer) {
             router.push(activityCenterLink);
             return;
        };

        const finalPuan = puanlar[GRUPLAR[0]] || 0;
        if (user?.role !== 'student' || finalPuan <= 0) {
            router.push(activityCenterLink);
            return;
        }

        setIsSubmitting(true);
        const context = `Tornado - ${searchParams.get('topicName') || 'Genel'}`;
        
        const result = await submitTornadoScoreAction(user.uid, finalPuan, context);
        if (result.success) {
            toast({ title: "Başarılı!", description: "Puanların kaydedildi." });
            router.push(activityCenterLink);
        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive"});
            setIsSubmitting(false); // Allow retry
        }
    };


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
                        <Button asChild variant="outline"><Link href={activityCenterLink}><ArrowLeft className="mr-2 h-4 w-4"/> Geri Dön</Link></Button>
                    </div>
                </Alert>
            </div>
        );
    }
    
    if (gameState === 'finished') {
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
                             <p className="text-xl">Toplam Puanın: <span className="font-bold text-primary">{puanlar[GRUPLAR[0]] || 0}</span></p>
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
                         {isSubmitting && <div className="mt-4 flex items-center justify-center text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Puan kaydediliyor...</div>}
                    </CardContent>
                    <CardFooter className="flex-col gap-4">
                        <Button size="lg" onClick={oyunuBaslat}><Repeat className="mr-2 h-5 w-5"/> Tekrar Oyna</Button>
                        <Button asChild variant="outline"><Link href={activityCenterLink}><Home className="mr-2 h-5 w-5"/> Panele Dön</Link></Button>
                    </CardFooter>
                </Card>
            </div>
        )
    }
    
    return (
        <div id="ana-kapsayici" className="w-full max-w-7xl mx-auto bg-gray-900 rounded-2xl shadow-2xl p-2 sm:p-3 flex flex-col" style={{ height: '100vh', overflowY: 'auto' }}>
             <style jsx global>{`
                :root {
                    --arka-plan: #1a202c; --ana-renk: #2b6cb0; --vurgu-renk: #4fd1c5; --basari-renk: #48bb78;
                    --hata-renk: #f56565; --odul-renk: #f6e05e; --ceza-renk: #f56565; --bos-renk: #a0aec0;
                }
                body { background-color: var(--arka-plan); font-family: 'Inter', sans-serif; }
                #ana-kapsayici { height: auto; min-height: 100vh; overflow-y: auto; }
                :fullscreen #ana-kapsayici { height: 100vh !important; overflow-y: auto !important; }
             `}</style>
            
            <div className="flex items-center justify-between mb-2 relative px-2">
                <Button asChild variant="outline" size="sm"><Link href={activityCenterLink}><ArrowLeft className="mr-2 h-4 w-4"/>Çık</Link></Button>
                <h1 className="text-xl sm:text-3xl lg:text-4xl font-extrabold text-center text-teal-300">Tornado Oyunu</h1>
                <div />
            </div>

            <div id="puan-durumu-alani" className={cn("grid gap-2 mb-2", `grid-cols-2 md:grid-cols-${takimSayisi}`)}>
                {GRUPLAR.map((grup, index) => {
                    const renkler = ['#3182ce', '#e53e3e', '#38a169', '#d69e2e'];
                    const isActive = GRUPLAR[siraIndeksi] === grup && !cezaliGruplar.has(grup);
                    return (
                        <div key={grup} 
                            id={`grup-puan-gostergesi-${grup.toLowerCase()}`}
                            className={cn("text-center p-1 rounded-lg bg-gray-900 border-b-4", isActive && 'ring-4 ring-teal-400')}
                            style={{ borderColor: renkler[index], opacity: cezaliGruplar.has(grup) ? 0.5 : 1 }}
                        >
                            <span className="text-sm sm:text-base font-bold text-teal-300">{grup}{isMultiplayer ? ' GRUBU' : ''}</span>
                            <span id={`grup-${grup.toLowerCase()}-puan`} className="text-2xl sm:text-3xl font-extrabold block text-white">{puanlar[grup] || 0}</span>
                        </div>
                    );
                })}
            </div>

             <div className="flex-grow grid grid-cols-6 grid-rows-5 gap-1 p-2">
                {Array.from({ length: KUTU_SAYISI }).map((_, i) => {
                    const kutucukNo = i + 1;
                    const isOpened = acilanKutular.has(kutucukNo);
                    return (
                        <div key={kutucukNo}
                            id={`kutucuk-${kutucukNo}`}
                            onClick={() => kutucukSecildi(i)}
                            className={cn(
                                "flex items-center justify-center rounded-lg text-white font-extrabold text-2xl sm:text-3xl transition-all duration-300",
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
            
            {isMultiplayer && <p className="text-center text-teal-300 text-lg mb-2">Sıradaki Takım: <span className="font-bold">{GRUPLAR[siraIndeksi]}</span></p>}
            
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
                    isFullscreen={false}
                />
            )}
        </div>
    );
}

export default function StudentTornadoOyunPage() {
    return <Suspense fallback={<div className="flex h-screen items-center justify-center bg-gray-900"><Loader2 className="h-12 w-12 animate-spin text-white"/></div>}><TornadoGame/></Suspense>
}
