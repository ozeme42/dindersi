
'use client';

import { useState, useEffect, Suspense, useMemo, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Loader2, Wind, PartyPopper, Repeat, Home, ArrowLeft, Check, AlertTriangle, Trophy, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { getTornadoGameQuestions } from "../actions";
import type { Question } from "@/lib/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from "next/link";
import { QuestionDialog } from "@/components/question-dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from "@/hooks/use-toast";

const KUTU_SAYISI = 30;
const SORU_SAYISI = 15;

type KutuIcerik =
    | { type: 'soru'; data: Question }
    | { type: 'bos'; mesaj: string; puan: number; renk: string; ikon: string; }
    | { type: 'odul'; mesaj: string; puan: number; renk: string; ikon: string; }
    | { type: 'ceza'; mesaj: string; puan: number; renk: string; ikon: string; }
    | { type: 'ekstra'; mesaj: string; efekt: 'PAS' | 'TEKRAR_OYNA' | 'BIR_TUR_BEKLE'; renk: string; ikon: string; };

function TornadoGame() {
    const router = useRouter();
    const { toast } = useToast();
    
    const [takimSayisi, setTakimSayisi] = useState(2);
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

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const searchParams = useSearchParams();

    const GRUPLAR = useMemo(() => ['A', 'B', 'C', 'D'].slice(0, takimSayisi), [takimSayisi]);
    
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
        if (tekrarOyna) {
            setIsProcessing(false);
            toast({ title: 'Şanslı Gün!', description: `${GRUPLAR[siraIndeksi]} Grubu bir daha oynuyor!` });
            return; // Aynı takımda kal
        }

        let sonrakiSira = (siraIndeksi + 1) % GRUPLAR.length;
        let denemeSayisi = 0;

        while (cezaliGruplar.has(GRUPLAR[sonrakiSira]) && denemeSayisi < GRUPLAR.length) {
            const cezaliGrup = GRUPLAR[sonrakiSira];
            // Remove penalty for the skipped turn
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
    }, [siraIndeksi, GRUPLAR, cezaliGruplar, toast]);

    const ozelKutuEtkisiUygula = useCallback((icerik: KutuIcerik) => {
        const aktifGrup = GRUPLAR[siraIndeksi];
        setMesaj({ metin: icerik.mesaj, renk: icerik.renk });
        
        if (icerik.puan) {
            setPuanlar(prev => ({ ...prev, [aktifGrup]: Math.max(0, (prev[aktifGrup] || 0) + icerik.puan!) }));
        }

        let tekrarOyna = false;
        if (icerik.type === 'ekstra') {
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
    }, [GRUPLAR, siraIndeksi, siraDegistir, toast]);
    
     const handleAnswerQuestion = useCallback((questionNumber: number, isCorrect: boolean, scoreChange: number) => {
        setOpenedQuestion(null);
        
        setPuanlar(prevPuanlar => {
            const aktifGrup = GRUPLAR[siraIndeksi];
            const newScore = Math.max(0, (prevPuanlar[aktifGrup] || 0) + scoreChange);
            return { ...prevPuanlar, [aktifGrup]: newScore };
        });
        
        setTimeout(() => {
            setIsProcessing(false);
            siraDegistir(false);
        }, 50);

    }, [siraIndeksi, GRUPLAR, siraDegistir]);

    const kutucukSecildi = useCallback((kutucukNo: number) => {
        if (isProcessing || acilanKutular.has(kutucukNo + 1)) return;

        setIsProcessing(true);
        const icerik = kutuIcerikleri[kutucukNo];
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
    }, [soruBankasi, GRUPLAR]);

    useEffect(() => {
        const teamCountParam = searchParams.get('teamCount');
        const teamCount = parseInt(teamCountParam || '2', 10);
        setTakimSayisi(teamCount > 1 ? teamCount : 2);
        
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
    }, [acilanKutular, KUTU_SAYISI]);
    
    const handleEndGame = () => {
        const sortedScores = Object.entries(puanlar).sort(([, a], [, b]) => b - a);
        if (sortedScores.length > 0 && (sortedScores.length === 1 || sortedScores[0][1] > sortedScores[1][1])) {
            setWinner(sortedScores[0][0]);
        } else {
            setWinner(null); // Draw
        }
        setGameState('finished');
    }

    if (isLoading) {
        return <div className="flex h-screen items-center justify-center bg-gray-900"><Loader2 className="h-12 w-12 animate-spin text-white"/></div>
    }

    if (error) {
         return (
            <div className="w-full h-full min-h-screen p-4 flex items-center justify-center bg-gray-900">
                <Alert variant="destructive" className="max-w-lg bg-card text-card-foreground">
                    <AlertTitle>Hata!</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                     <div className="mt-4">
                        <Button asChild variant="outline">
                            <Link href="/teacher/smartboard/tornado"><ArrowLeft className="mr-2 h-4 w-4"/> Kuruluma Geri Dön</Link>
                        </Button>
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
                        {winner ? (
                             <p className="text-2xl">Kazanan: <span className="font-bold text-primary">{winner} Grubu</span></p>
                        ) : <p className="text-2xl">Berabere!</p>}
                        
                        <div className="mt-4 space-y-2">
                            {Object.entries(puanlar).sort(([,a],[,b]) => b-a).map(([grup, puan]) => (
                                <div key={grup} className="flex justify-between p-2 rounded-md bg-muted">
                                    <span>{grup} Grubu</span>
                                    <span className="font-semibold">{puan} Puan</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                    <CardFooter className="flex-col gap-4">
                        <Button size="lg" onClick={oyunuBaslat}><Repeat className="mr-2 h-5 w-5"/> Tekrar Oyna</Button>
                        <Button asChild variant="outline"><Link href="/teacher/smartboard"><Home className="mr-2 h-5 w-5"/> Ana Menü</Link></Button>
                    </CardFooter>
                </Card>
            </div>
        )
    }
    
    return (
        <div id="ana-kapsayici" className="w-full max-w-7xl mx-auto bg-gray-900 rounded-2xl shadow-2xl p-2 sm:p-3 flex flex-col h-screen">
             <style jsx global>{`
                :root {
                    --arka-plan: #1a202c; --ana-renk: #2b6cb0; --vurgu-renk: #4fd1c5; --basari-renk: #48bb78;
                    --hata-renk: #f56565; --odul-renk: #f6e05e; --ceza-renk: #f56565; --bos-renk: #a0aec0;
                }
                body { background-color: var(--arka-plan); font-family: 'Inter', sans-serif; }
                #ana-kapsayici { height: 100vh; overflow-y: hidden; }
                :fullscreen #ana-kapsayici { height: 100vh !important; overflow-y: hidden !important; }
             `}</style>
            
            <div className="flex items-center justify-center mb-2 relative">
                <h1 className="text-xl sm:text-3xl lg:text-4xl font-extrabold text-center text-teal-300">Tornado Oyunu</h1>
            </div>

            <div id="puan-durumu-alani" className={`grid grid-cols-2 md:grid-cols-${takimSayisi} gap-2 mb-2`}>
                {GRUPLAR.map((grup, index) => {
                    const renkler = ['#3182ce', '#e53e3e', '#38a169', '#d69e2e'];
                    const isActive = GRUPLAR[siraIndeksi] === grup && !cezaliGruplar.has(grup);
                    return (
                        <div key={grup} 
                            id={`grup-puan-gostergesi-${grup.toLowerCase()}`}
                            className={cn("text-center p-1 rounded-lg bg-gray-900 border-b-4", isActive && 'ring-4 ring-teal-400')}
                            style={{ borderColor: renkler[index], opacity: cezaliGruplar.has(grup) ? 0.5 : 1 }}
                        >
                            <span className="text-sm sm:text-base font-bold text-teal-300">{grup} GRUBU</span>
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
            
            <p className="text-center text-teal-300 text-lg mb-2">Sıradaki Takım: <span className="font-bold">{GRUPLAR[siraIndeksi]}</span></p>

            
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
                        setIsProcessing(false); 
                        siraDegistir();
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

export default function TornadoOyunPage() {
    return <Suspense fallback={<div className="flex h-screen items-center justify-center bg-gray-900"><Loader2 className="h-12 w-12 animate-spin text-white"/></div>}><TornadoGame/></Suspense>
}

    