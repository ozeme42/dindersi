
'use client';

import { useState, useEffect, useCallback, Suspense, useMemo, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getTornadoGameQuestions, submitTornadoScoreAction } from '../actions';
import type { Question } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Wind, PartyPopper, Repeat, Home, Check, AlertTriangle, Trophy, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { QuestionDialog } from '@/components/question-dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { FullscreenToggle } from '@/components/fullscreen-toggle';

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
    
    // Oyun Durumları
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
    
    const [isFinished, setIsFinished] = useState(false); 
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isScoreSaved, setIsScoreSaved] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const exitLink = user ? '/oyunlar/tornado' : '/';

    useEffect(() => {
        const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const GRUPLAR = useMemo(() => ['A', 'B', 'C', 'D'].slice(0, takimSayisi), [takimSayisi]);
    
    const ozelKutular: KutuIcerik[] = [
        { type: 'bos', mesaj: '⚪ Boş Kutu!', puan: 0, renk: '#a0aec0', ikon: '⚪' },
        { type: 'bos', mesaj: '⚪ Boş Kutu!', puan: 0, renk: '#a0aec0', ikon: '⚪' },
        { type: 'bos', mesaj: '⚪ Boş Kutu!', puan: 0, renk: '#a0aec0', ikon: '⚪' },
        { type: 'odul', mesaj: '⭐ +15 Puan!', puan: 15, renk: '#ecc94b', ikon: '⭐' },
        { type: 'odul', mesaj: '⭐ +15 Puan!', puan: 15, renk: '#ecc94b', ikon: '⭐' },
        { type: 'odul', mesaj: '⭐ +15 Puan!', puan: 15, renk: '#ecc94b', ikon: '⭐' },
        { type: 'odul', mesaj: '🌟 +25 Puan!', puan: 25, renk: '#ecc94b', ikon: '🌟' },
        { type: 'odul', mesaj: '🌟 +25 Puan!', puan: 25, renk: '#ecc94b', ikon: '🌟' },
        { type: 'ceza', mesaj: '❗ -10 Puan!', puan: -10, renk: '#f56565', ikon: '❗' },
        { type: 'ceza', mesaj: '❗ -10 Puan!', puan: -10, renk: '#f56565', ikon: '❗' },
        { type: 'ceza', mesaj: '❗ -10 Puan!', puan: -10, renk: '#f56565', ikon: '❗' },
        { type: 'ceza', mesaj: '💥 -20 Puan!', puan: -20, renk: '#f56565', ikon: '💥' },
        { type: 'ceza', mesaj: '💥 -20 Puan!', puan: -20, renk: '#f56565', ikon: '💥' },
        { type: 'ekstra', mesaj: '⏩ Pas!', efekt: 'PAS', renk: '#a0aec0', ikon: '⏩' },
        { type: 'ekstra', mesaj: '🔄 Tekrar Oyna!', efekt: 'TEKRAR_OYNA', renk: '#4fd1c5', ikon: '🔄' },
        { type: 'ekstra', mesaj: '🛑 Bir Tur Bekle!', efekt: 'BIR_TUR_BEKLE', renk: '#f56565', ikon: '🛑' },
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
            icerikHavuzu.push({ type: 'bos', mesaj: '⚪ Boş Kutu!', puan: 0, renk: 'var(--bos-renk)', ikon: '⚪' });
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
    
     const handleEndGame = useCallback(() => {
        const sortedScores = Object.entries(puanlar).sort(([, a], [, b]) => b - a);
        if (sortedScores.length > 0 && (sortedScores.length === 1 || sortedScores[0][1] > sortedScores[1][1])) {
            setWinner(sortedScores[0][0]);
        } else {
            setWinner(null); // Draw
        }
        setGameState('finished');
    }, [puanlar]);

    useEffect(() => {
        if (gameState === 'playing' && acilanKutular.size >= KUTU_SAYISI) {
            handleEndGame();
        }
    }, [acilanKutular, KUTU_SAYISI, gameState, handleEndGame]);
    
    if (isLoading) {
        return <div className="flex h-screen items-center justify-center bg-slate-950"><Loader2 className="h-12 w-12 animate-spin text-indigo-500" /> <span className="ml-3 text-white font-bold animate-pulse">Tornado Hazırlanıyor...</span></div>;
    }

    if (error) {
        return (
             <div className="w-full h-full min-h-screen p-4 flex items-center justify-center bg-slate-950">
                <Alert variant="destructive" className="max-w-lg bg-red-950/50 border-red-500/50 text-red-200">
                    <AlertTitle>Hata!</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                    <div className="mt-4"><Button asChild variant="outline" className="border-white/10 text-white hover:bg-white/10"><Link href={exitLink}><ArrowLeft className="mr-2 h-4 w-4"/>Geri Dön</Link></Button></div>
                </Alert>
            </div>
        );
    }
    
    if (gameState === 'finished') {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 pb-24 relative overflow-hidden">
                <div className="fixed inset-0 pointer-events-none z-0">
                    <div className="absolute top-[-20%] left-[-10%] w-[1000px] h-[1000px] bg-purple-600/10 rounded-full blur-[150px]" />
                    <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-indigo-900/10 rounded-full blur-[150px]" />
                    <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03]" />
                </div>

                <Card className="w-full max-w-lg bg-slate-900/80 backdrop-blur-xl border-white/10 shadow-2xl relative z-10">
                     <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-400 via-pink-500 to-red-500" />
                    <CardHeader className="text-center pb-2">
                        <CardTitle className="font-black text-4xl text-white uppercase tracking-wider flex flex-col items-center gap-4">
                             <div className="p-4 bg-yellow-500/20 rounded-full border border-yellow-500/30 shadow-lg shadow-yellow-500/20 animate-bounce">
                                <Trophy className="h-16 w-16 text-yellow-400 drop-shadow-md"/>
                             </div>
                             Oyun Bitti!
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex flex-col items-center gap-2">
                            {winner ? (
                                <>
                                    <p className="text-lg text-slate-300 font-medium uppercase tracking-widest">KAZANAN</p>
                                    <p className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 drop-shadow-sm">{winner} Grubu</p>
                                </>
                            ) : <p className="text-3xl font-black text-slate-300">BERABERE!</p>}
                        </div>
                        
                         <div className="bg-slate-950/50 rounded-xl border border-white/5 p-4">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Puan Tablosu</h4>
                            <div className="space-y-2">
                                {Object.entries(puanlar).sort(([,a],[,b]) => b-a).map(([grup, puan], i) => (
                                    <div key={grup} className="flex justify-between items-center p-3 rounded-lg bg-slate-900 border border-white/5 hover:bg-white/5 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <span className={cn("font-black text-lg w-6 text-center", i === 0 ? "text-yellow-400" : i === 1 ? "text-slate-300" : i === 2 ? "text-orange-400" : "text-slate-600")}>{i + 1}</span>
                                            <span className="font-medium text-white">{grup} Grubu</span>
                                        </div>
                                        <span className="font-bold text-emerald-400">{puan}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="flex-col sm:flex-row justify-center gap-4 bg-black/20 p-6 border-t border-white/5">
                         <Button onClick={oyunuBaslat} size="lg" className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-900/20">
                             <Repeat className="mr-2 h-5 w-5" /> Tekrar Oyna
                         </Button>
                         <Button asChild variant="outline" size="lg" className="w-full sm:w-auto border-white/10 text-slate-300 hover:text-white hover:bg-white/5 bg-transparent">
                             <Link href={exitLink}><Home className="mr-2 h-5 w-5" /> Ana Menü</Link>
                         </Button>
                    </CardFooter>
                </Card>
            </div>
        )
    }
    
    return (
        <div id="ana-kapsayici" className={cn("w-full mx-auto bg-gray-900 shadow-2xl p-2 sm:p-3 flex flex-col h-screen", isFullscreen && "rounded-none !p-0")}>
             <style jsx global>{`
                :root {
                    --arka-plan: #1a202c; --ana-renk: #2b6cb0; --vurgu-renk: #4fd1c5; --basari-renk: #48bb78;
                    --hata-renk: #f56565; --odul-renk: #f6e05e; --ceza-renk: #f56565; --bos-renk: #a0aec0;
                }
             `}</style>
            
            <div className="flex items-center justify-between mb-2 relative">
                <h1 className="text-xl sm:text-3xl lg:text-4xl font-extrabold text-center text-teal-300">Tornado Oyunu</h1>
                <FullscreenToggle />
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

export default function StudentTornadoOyunPage() {
    return <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-950"><Loader2 className="h-12 w-12 animate-spin text-purple-500" /></div>}><TornadoGame/></Suspense>
}
```
- src/components/ui/dialog.tsx:
```tsx
"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}

```
- src/lib/firebase-admin.ts:
```ts
import { initializeApp, getApps, getApp, cert, ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

let adminApp: any;

try {
  if (getApps().length > 0) {
    adminApp = getApp();
  } else {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;
    
    if (!projectId || !clientEmail || !privateKeyRaw) {
        throw new Error("Firebase Admin SDK environment variables are not set.");
    }
    const privateKey = privateKeyRaw.replace(/\\n/g, '\n');
    
    const serviceAccount: ServiceAccount = { projectId, clientEmail, privateKey };
    
    adminApp = initializeApp({ credential: cert(serviceAccount) });
  }
} catch (error) {
    console.error("Firebase Admin SDK initialization error:", error);
    // You might want to handle this error more gracefully depending on your application's needs
    // For now, we will let subsequent calls fail if initialization fails.
}


export function getAdminDb() {
  if (!adminApp) throw new Error("Admin App not initialized");
  return getFirestore(adminApp);
}

export function getAdminAuth() {
  if (!adminApp) throw new Error("Admin App not initialized");
  return getAuth(adminApp);
}

```
- src/lib/utils.ts:
```ts
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function normalizeNameToEmailLocalPart(name: string): string {
  if (!name) return '';
  return name
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replace(/\s+/g, '.') // handle one or more spaces
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9.-]/g, '');
}

export const cleanForAnagram = (text: string): string => {
  if (!text) return '';
  // Metni tamamen büyük harfe çevir (Türkçe karakterlere duyarlı)
  const upperCaseText = text.toLocaleUpperCase('tr-TR');
  // Sadece izin verilen Türkçe alfabe harfleri, rakamlar, boşluklar ve şapkalı harfler dışındaki her şeyi sil
  const cleanedText = upperCaseText.replace(/[^A-ZĞÜŞİÖÇÂÎÛ0-9\s]/g, '');
  return cleanedText;
};

// Türkiye saatine göre tarih stringi (YYYY-MM-DD)
export function getTurkeyDateString(date: Date = new Date()): string {
    const trDate = new Date(date.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' }));
    return trDate.toISOString().split('T')[0];
}

```
- src/next.config.ts:
```ts
/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    // This is the correct placement for Next.js 14.1+
    // In older versions it might be top-level. 
    // The error log suggests it is not a valid experimental key, so we move it out.
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
   allowedDevOrigins: ["https://6000-firebase-degerleroyunu-1767537398519.cluster-6frnii43o5blcu522sivebzpii.cloudworkstations.dev", "https://9000-firebase-degerleroyunu-1767537398519.cluster-6frnii43o5blcu522sivebzpii.cloudworkstations.dev"],
};

module.exports = nextConfig;
```
- src/tailwind.config.ts:
```ts
import type { Config } from "tailwindcss"

const config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
	],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config

export default config
```
- tsconfig.json:
```json
{
  "compilerOptions": {
    "target": "ESNext",
    "lib": [
      "dom",
      "dom.iterable",
      "esnext"
    ],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": [
        "./src/*"
      ]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts"
  ],
  "exclude": [
    "node_modules"
  ]
}
```