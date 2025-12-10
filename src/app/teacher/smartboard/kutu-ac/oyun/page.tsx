'use client';

import { useState, useEffect, useCallback, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getKutuAcQuestionsAction } from '@/app/oyunlar/kutu-ac/actions';
import type { Question } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Package, PartyPopper, Repeat, Home, User, Users, Trophy, Crown, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { FullscreenToggle } from '@/components/fullscreen-toggle';
import { useAuth } from '@/context/auth-context';
import { QuestionDialog } from '@/components/question-dialog';
import { GameEndScreen } from '@/components/game-end-screen';
import { Badge } from "@/components/ui/badge";

const KUTU_SAYISI = 30;
const SORU_SAYISI = 15;

type KutuIcerik =
    | { type: 'soru'; data: Question }
    | { type: 'bos'; mesaj: string; puan: number; renk: string; ikon: string; }
    | { type: 'odul'; mesaj: string; puan: number; renk: string; ikon: string; }
    | { type: 'ceza'; mesaj: string; puan: number; renk: string; ikon: string; }
    | { type: 'ekstra'; mesaj: string; efekt: 'PAS' | 'TEKRAR_OYNA' | 'BIR_TUR_BEKLE'; renk: string; ikon: string; };


function KutuAcGame() {
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    
    // Game Setup State
    const [teamCount, setTeamCount] = useState<number>(1);
    const [teams, setTeams] = useState<string[]>([]);
    const [activePlayerIndex, setActivePlayerIndex] = useState(0);

    // Game Logic State
    const [isLoading, setIsLoading] = useState(true);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [kutuIcerikleri, setKutuIcerikleri] = useState<KutuIcerik[]>([]);
    const [puanlar, setPuanlar] = useState<Record<string, number>>({});
    const [error, setError] = useState<string | null>(null);
    const [openedBoxes, setOpenedBoxes] = useState<Set<number>>(new Set());
    const [openedQuestion, setOpenedQuestion] = useState<{ number: number; question: Question } | null>(null);

    const [isFinished, setIsFinished] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [cezaliGruplar, setCezaliGruplar] = useState<Set<string>>(new Set());
    const [mesaj, setMesaj] = useState<{metin: string, renk: string} | null>(null);
    const [winner, setWinner] = useState<string | null>(null);

    const [isFullscreen, setIsFullscreen] = useState(false);

    const backUrl = '/teacher/smartboard/kutu-ac';
    const gameContext = `Kutu Aç - ${searchParams.get('topicName') || 'Genel'}`;
    
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

    useEffect(() => {
        const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const fetchQuestionsAndSetup = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        
        const teamCountParam = parseInt(searchParams.get('teamCount') || '1', 10);
        const teamsArray = teamCountParam > 1 ? ['A Takımı', 'B Takımı', 'C Takımı', 'D Takımı'].slice(0, teamCountParam) : [user?.displayName || 'Oyuncu'];
        setTeams(teamsArray);
        setTakimSayisi(teamCountParam);
        
        const initialPuanlar: Record<string, number> = {};
        teamsArray.forEach(grup => { initialPuanlar[grup] = 0; });
        setPuanlar(initialPuanlar);

        const params = {
            courseId: searchParams.get('courseId') || undefined,
            unitId: searchParams.get('unitId') || undefined,
            topicId: searchParams.get('topicId') || undefined,
        };
        const result = await getKutuAcQuestionsAction(params);
        if (result.error || result.questions.length < 5) {
            setError(result.error || "Bu konu için yeterli soru bulunamadı (en az 5 gerekli).");
            setIsLoading(false);
            return;
        }
        
        const shuffledQuestions = [...result.questions].sort(() => 0.5 - Math.random());
        const questionCountForGame = Math.min(SORU_SAYISI, shuffledQuestions.length);
        const questionsForGame: KutuIcerik[] = shuffledQuestions.slice(0, questionCountForGame).map(q => ({ type: 'soru', data: q }));
        
        const specialBoxCount = KUTU_SAYISI - questionsForGame.length;
        const specialBoxesToAdd = [...ozelKutular].sort(() => 0.5 - Math.random()).slice(0, specialBoxCount);
        
        let contentPool: KutuIcerik[] = [...questionsForGame, ...specialBoxesToAdd];
        while (contentPool.length < KUTU_SAYISI) {
            contentPool.push({ type: 'bos', mesaj: '⚪ Boş Kutu!', puan: 0, renk: '#a0aec0', ikon: '⚪' });
        }
        
        setQuestions(result.questions);
        setKutuIcerikleri(contentPool.sort(() => 0.5 - Math.random()));
        setIsLoading(false);

    }, [searchParams, user]);
    
    useEffect(() => {
        fetchQuestionsAndSetup();
    }, [fetchQuestionsAndSetup]);

    const siraDegistir = useCallback((tekrarOyna = false) => {
        if (teamCount <= 1) {
            setIsProcessing(false);
            return;
        }

        if (tekrarOyna) {
            setIsProcessing(false);
            toast({ title: 'Şanslı Gün!', description: `${teams[activePlayerIndex]} bir daha oynuyor!` });
            return;
        }
        
        let sonrakiSira = (activePlayerIndex + 1) % teams.length;
        let denemeSayisi = 0;

        while (cezaliGruplar.has(teams[sonrakiSira]) && denemeSayisi < teams.length) {
            const cezaliGrup = teams[sonrakiSira];
            setCezaliGruplar(prev => { const newSet = new Set(prev); newSet.delete(cezaliGrup); return newSet; });
            toast({ title: 'Ceza Bitti', description: `${cezaliGrup}'nın cezası bitti, bir sonraki turda oyuna dönecek.` });
            sonrakiSira = (sonrakiSira + 1) % teams.length;
            denemeSayisi++;
        }
        
        setActivePlayerIndex(sonrakiSira);
        setIsProcessing(false);

    }, [activePlayerIndex, teams, cezaliGruplar, toast, teamCount]);
    
    const ozelKutuEtkisiUygula = useCallback((icerik: KutuIcerik) => {
        const aktifGrup = teams[activePlayerIndex];
        setMesaj({ metin: icerik.mesaj, renk: icerik.renk });
        
        if (icerik.puan) {
            setPuanlar(prev => ({ ...prev, [aktifGrup]: Math.max(0, (prev[aktifGrup] || 0) + icerik.puan!) }));
        }

        let tekrarOyna = false;
        if (teamCount > 1 && icerik.type === 'ekstra') {
            if (icerik.efekt === 'BIR_TUR_BEKLE') {
                toast({ title: 'Ceza!', description: `${aktifGrup} bir sonraki tur bekleyecek.`, variant: 'destructive' });
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
    }, [teams, activePlayerIndex, siraDegistir, toast, teamCount]);

    const handleAnswerQuestion = useCallback((questionNumber: number, isCorrect: boolean, scoreChange: number) => {
        setOpenedQuestion(null);
        
        setPuanlar(prevPuanlar => {
            const aktifGrup = teams[activePlayerIndex];
            const pointsToAdd = isCorrect ? scoreChange : 0; 
            const newScore = Math.max(0, (prevPuanlar[aktifGrup] || 0) + pointsToAdd);
            return { ...prevPuanlar, [aktifGrup]: newScore };
        });
        
        setTimeout(() => {
            siraDegistir(false);
        }, 50);

    }, [activePlayerIndex, teams, siraDegistir]);

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
    
    useEffect(() => {
        if (openedBoxes.size >= KUTU_SAYISI) {
            handleEndGame();
        }
    }, [openedBoxes]);
    
    const handleEndGame = useCallback(() => {
        const sortedScores = Object.entries(puanlar).sort(([, a], [, b]) => b - a);
        if (sortedScores.length > 0 && (sortedScores.length === 1 || sortedScores[0][1] > sortedScores[1][1])) {
            setWinner(sortedScores[0][0]);
        } else {
            setWinner(null);
        }
        setIsFinished(true);
    }, [puanlar]);

    const handleRestart = () => {
        setIsFinished(false);
        setOpenedBoxes(new Set());
        setOpenedQuestion(null);
        setActivePlayerIndex(0);
        fetchQuestionsAndSetup();
    };
    
    const timerDuration = openedQuestion?.question.type === 'Doğru/Yanlış' ? 10 : 20;

    if (isLoading) {
        return <div className="flex h-screen items-center justify-center bg-slate-950"><Loader2 className="h-12 w-12 animate-spin text-purple-500" /> <span className="ml-3 text-white font-bold animate-pulse">Kutular Hazırlanıyor...</span></div>;
    }
    if (error) {
        return (
            <div className={cn("w-full h-full min-h-screen flex items-center justify-center p-4 bg-slate-950")}>
                <Alert variant="destructive" className="max-w-lg bg-red-950/50 border-red-500/50 text-red-200">
                    <AlertTitle>Hata!</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                    <div className="mt-4"><Button asChild variant="outline" className="border-white/10 text-white hover:bg-white/10"><Link href={backUrl}><ArrowLeft className="mr-2 h-4 w-4"/>Geri Dön</Link></Button></div>
                </Alert>
            </div>
        );
    }
    
    if (isFinished) {
         const sortedTeams = Object.entries(puanlar).sort(([,a],[,b]) => b-a);
        return (
             <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
                <div className="fixed inset-0 pointer-events-none z-0">
                    <div className="absolute top-[-20%] left-[-10%] w-[1000px] h-[1000px] bg-purple-600/10 rounded-full blur-[150px]" />
                    <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-blue-900/10 rounded-full blur-[150px]" />
                </div>

                <Card className="w-full max-w-2xl bg-slate-900/80 backdrop-blur-xl border-white/10 shadow-2xl relative z-10">
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
                            {teamCount > 1 && (winner ? (
                                <>
                                    <p className="text-lg text-slate-300 font-medium uppercase tracking-widest">KAZANAN</p>
                                    <p className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 drop-shadow-sm">{winner}</p>
                                </>
                            ) : <p className="text-3xl font-black text-slate-300">BERABERE!</p>)}
                        </div>
                        
                         <div className="bg-slate-950/50 rounded-xl border border-white/5 p-4">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Puan Tablosu</h4>
                            <div className="space-y-2">
                                {sortedTeams.map(([grup, puan], i) => (
                                    <div key={grup} className="flex justify-between items-center p-3 rounded-lg bg-slate-900 border border-white/5 hover:bg-white/5 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <span className={cn("font-black text-lg w-6 text-center", i === 0 ? "text-yellow-400" : "text-slate-500")}>{i + 1}</span>
                                            <span className="font-medium text-white">{grup}{teamCount > 1 && ' Takımı'}</span>
                                        </div>
                                        <span className="font-bold text-emerald-400">{puan}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="flex-col sm:flex-row justify-center gap-4 bg-black/20 p-6 border-t border-white/5">
                         <Button onClick={handleRestart} size="lg" className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-900/20">
                             <Repeat className="mr-2 h-5 w-5" /> Tekrar Oyna
                         </Button>
                         <Button asChild variant="outline" size="lg" className="w-full sm:w-auto border-white/10 text-slate-300 hover:text-white hover:bg-white/5 bg-transparent">
                             <Link href={backUrl}><Home className="mr-2 h-5 w-5" /> Çıkış</Link>
                         </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return (
        <div className={cn("w-full h-full min-h-screen bg-slate-950 font-sans text-slate-100 flex flex-col relative overflow-hidden", isFullscreen ? "p-4" : "p-4 sm:p-6 md:p-8")}>
            
            {/* Arka Plan */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[1000px] h-[1000px] bg-purple-900/10 rounded-full blur-[150px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-blue-900/10 rounded-full blur-[150px]" />
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.03]" />
            </div>

            <div className="w-full max-w-7xl mx-auto relative z-10 flex-grow flex flex-col">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4 border-b border-white/5 pb-4">
                    <div className="flex items-center gap-3">
                         <div className="p-2 bg-purple-500/20 rounded-lg border border-purple-500/30">
                            <Package className="h-6 w-6 text-purple-400" />
                        </div>
                        <div>
                             <h1 className="text-2xl font-black text-white tracking-tight uppercase">Kutu Aç</h1>
                             <p className="text-xs text-slate-400 font-medium">{openedBoxes.size} / {KUTU_SAYISI} kutu açıldı.</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <Button variant="destructive" size="sm" onClick={handleEndGame}>Oyunu Bitir</Button>
                        <FullscreenToggle />
                    </div>
                </div>
                
                {/* Scoreboard Area */}
                <div className="mb-6">
                    <div className={cn("grid gap-4", `grid-cols-2 md:grid-cols-${teamCount > 4 ? 4 : teamCount}`)}>
                        {teams.map((grup, index) => {
                            const isActive = teams[activePlayerIndex] === grup && !cezaliGruplar.has(grup);
                            
                            return (
                                <div key={grup} 
                                    className={cn(
                                        "text-center p-3 rounded-xl border-2 flex flex-col items-center justify-center transition-all duration-300",
                                        teamBgColors[index % teamBgColors.length],
                                        isActive 
                                            ? `${teamBorderColors[index % teamBorderColors.length]} scale-105 shadow-lg z-10` 
                                            : "border-transparent opacity-70"
                                    )}
                                >
                                    <span className={cn("text-sm font-bold uppercase tracking-wider", isActive ? "text-white" : "text-slate-400")}>{grup}{teamCount > 1 && ' Takımı'}</span>
                                    <span className={cn("text-4xl font-black block tabular-nums tracking-tight", isActive ? "text-white" : "text-slate-200")}>
                                        {puanlar[grup] || 0}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Game Grid */}
                <Card className="bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-2xl flex-grow flex flex-col overflow-hidden">
                    <CardContent className="p-6 overflow-y-auto flex-grow min-h-[300px] pb-24">
                        <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
                            {Array.from({ length: KUTU_SAYISI }).map((_, i) => {
                                const kutucukNo = i + 1;
                                const isOpened = openedBoxes.has(kutucukNo);
                                return (
                                    <div 
                                        key={kutucukNo}
                                        id={`kutucuk-${kutucukNo}`}
                                        onClick={() => kutucukSecildi(i)}
                                        className={cn(
                                            "aspect-square rounded-xl flex items-center justify-center text-xl md:text-2xl font-black text-white cursor-pointer shadow-lg transition-all duration-500 relative overflow-hidden group border-b-[4px] active:border-b-0 active:translate-y-[4px]",
                                            isOpened 
                                                ? "bg-slate-900 border-slate-800 text-slate-700 shadow-none scale-95 opacity-50" 
                                                : "bg-gradient-to-br from-indigo-500 to-purple-600 border-indigo-700 hover:-translate-y-1 hover:shadow-purple-500/30"
                                        )}
                                    >
                                        {!isOpened && <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />}
                                        {isOpened ? <CheckCheck className="h-6 w-6 text-emerald-500/50" /> : kutucukNo}
                                    </div>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>
            </div>
            
            {/* Message Dialog */}
            {mesaj && (
                 <AlertDialog open={!!mesaj}>
                    <AlertDialogContent className="bg-slate-900 border-white/10 text-white max-w-sm">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-center text-3xl font-black" style={{color: mesaj.renk}} dangerouslySetInnerHTML={{ __html: mesaj.metin }} />
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
```
- src/app/teacher/smartboard/page.tsx:
```tsx

'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { 
  MonitorPlay, Sun, User, Users, Swords, ArrowRight, BrainCircuit, Settings, Trophy, GitBranch, Columns, LayoutTemplate, Package, Wind, Gamepad2, UserCog, Lightbulb, Zap 
} from 'lucide-react';
import React, { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

// Yeni, daha büyük ve okunaklı kart bileşeni
const SmartboardCard = ({ href, title, description, icon, colorClass, isExternal }: { href: string, title: string, description: string, icon: ReactNode, colorClass: string, isExternal?: boolean }) => {
    const linkContent = (
        <div className={cn(
            "h-full w-full rounded-[2.5rem] p-8 flex flex-col items-center justify-center text-center shadow-2xl transition-all duration-300 transform border-b-8 group-hover:border-b-0 group-hover:translate-y-2 relative overflow-hidden group",
            colorClass
        )}>
            {/* Arka Plan Işık Efekti */}
            <div className={cn("absolute inset-0 opacity-20 blur-3xl group-hover:opacity-40 transition-opacity", colorClass.includes('bg-') ? colorClass.replace('bg-', 'bg-') : 'bg-primary')}></div>
            
            {/* İkon */}
            <div className="p-6 rounded-3xl bg-white/10 mb-6 border border-white/20 relative z-10 group-hover:scale-110 transition-transform shadow-lg backdrop-blur-sm">
                {React.cloneElement(icon as React.ReactElement, { className: "h-16 w-16 text-white" })}
            </div>
            
            {/* Başlık */}
            <h3 className="font-black text-3xl md:text-4xl mt-2 text-white drop-shadow-md relative z-10 uppercase tracking-tight leading-tight">{title}</h3>
            
            {/* Açıklama */}
            <p className="mt-3 text-white/80 text-lg font-medium relative z-10 leading-snug">{description}</p>
            
            <div className="flex-grow" />
            
            {/* Detay Butonu/İkonu */}
            <div className="mt-8 flex items-center text-xl font-bold text-white relative z-10 bg-black/20 px-6 py-2 rounded-full border border-white/10 group-hover:bg-white/20 transition-colors">
                BAŞLAT <ArrowRight className="ml-3 h-6 w-6 group-hover:translate-x-2 transition-transform" />
            </div>
        </div>
    );
    
    if (isExternal) {
        return <a href={href} target="_blank" rel="noopener noreferrer" className="block group h-full">{linkContent}</a>
    }

    return (
        <Link href={href} className="block group h-full">
            {linkContent}
        </Link>
    )
};


export default function SmartboardPage() {
  
    // Yarışma Modları
    const yarışmalar = [
        {
            key: 'smartboard_bireysel',
            href: "/teacher/smartboard/bireysel",
            title: "Bireysel Yarışma",
            description: "Her öğrencinin kendi başına yarıştığı klasik, hızlı mod.",
            icon: <User />,
            colorClass: "bg-indigo-600 border-indigo-800 hover:bg-indigo-500",
        },
        {
            key: 'smartboard_takim',
            href: "/teacher/smartboard/takim",
            title: "Takım Yarışması",
            description: "Öğrencileri gruplandırıp takım ruhuyla rekabeti artırın.",
            icon: <Users />,
            colorClass: "bg-teal-600 border-teal-800 hover:bg-teal-500",
        },
        {
            key: 'smartboard_duello',
            href: "/teacher/smartboard/duello",
            title: "Düello",
            description: "İki öğrenciyi veya takımı doğrudan karşı karşıya getirin.",
            icon: <Swords />,
            colorClass: "bg-red-600 border-red-800 hover:bg-red-500",
        },
        {
            key: 'fetih_oyunu',
            href: "/teacher/smartboard/fetih-oyunu",
            title: "Fetih Oyunu",
            description: "Sorularla haritada ilerle, kaleyi fethet ve bölgeleri ele geçir.",
            icon: <GitBranch />,
            colorClass: "bg-emerald-600 border-emerald-800 hover:bg-emerald-500",
        },
        {
            key: 'tornado',
            href: "/teacher/smartboard/tornado",
            title: "Tornado",
            description: "Rastgele puanlar ve sürpriz sorularla şans faktörünü kullan.",
            icon: <Wind />,
            colorClass: "bg-cyan-600 border-cyan-800 hover:bg-cyan-500",
        },
        {
            key: 'kutu_ac',
            href: "/teacher/smartboard/kutu-ac",
            title: "Kutu Aç",
            description: "Kutuları açarak puan tablosunu doldur ve lider ol.",
            icon: <Package />,
            colorClass: "bg-purple-600 border-purple-800 hover:bg-purple-500",
        },
        {
            key: 'dort_secenek',
            href: "/teacher/smartboard/dort-secenek",
            title: "4 Seçenekli Test",
            description: "Klasik çoktan seçmeli soruyu tahtada interaktif çözme.",
            icon: <Gamepad2 />,
            colorClass: "bg-pink-600 border-pink-800 hover:bg-pink-500",
        },
    ];
    
    // Sunum & Araç Modları
    const sunumlar = [
        {
            key: 'ozetler',
            href: "/teacher/smartboard/ozetler",
            title: "Özetler ve İçerikler",
            description: "Konu özetlerini ve interaktif HTML içerikleri tam ekran sun.",
            icon: <LayoutTemplate />,
            colorClass: "bg-rose-600 border-rose-800 hover:bg-rose-500",
        },
        {
            key: 'yazilacaklar',
            href: "/teacher/smartboard/yazilacaklar",
            title: "Kavram & Not Panosu",
            description: "Kavramlar ve önemli notları sütunlara ayırarak net göster.",
            icon: <Columns />,
            colorClass: "bg-amber-600 border-amber-800 hover:bg-amber-500",
        },
        {
             key: 'sanal-tahta',
             href: "/teacher/smartboard/sanal-tahta",
             title: "Sanal Tahta",
             description: "Ders anlatımı için temel dijital beyaz tahta modülü.",
             icon: <Lightbulb />,
             colorClass: "bg-blue-600 border-blue-800 hover:bg-blue-500",
        },
        {
             key: 'anlik-geri-bildirim',
             href: "/teacher/smartboard/anlik-geri-bildirim",
             title: "Anlık Geri Bildirim",
             description: "Sınıfın nabzını anında ölçmek için hızlı soru/anket.",
             icon: <Zap />,
             colorClass: "bg-slate-700 border-slate-900 hover:bg-slate-600",
        },
        {
            key: 'carkifelek',
            href: "/teacher/smartboard/carkifelek",
            title: "Çarkıfelek",
            description: "Sınıftan rastgele bir öğrenci seçmek için çarkı çevirin.",
            icon: <Trophy />,
            colorClass: "bg-yellow-600 border-yellow-800 hover:bg-yellow-500",
        },
    ];

    return (
        <div className="flex flex-col items-center p-6 sm:p-10 md:p-16 space-y-16 min-h-screen bg-slate-950 text-white font-sans relative overflow-hidden">
            
             {/* Arka Plan Efektleri */}
             <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-indigo-900/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-purple-900/20 rounded-full blur-[120px]" />
            </div>

            {/* Ana Başlık */}
            <div className="text-center relative z-10 space-y-6">
                <div className="inline-flex items-center justify-center p-5 bg-white/5 rounded-full mb-2 border border-white/10 shadow-2xl backdrop-blur-md">
                    <MonitorPlay className="h-12 w-12 text-cyan-400"/>
                </div>
                <h1 className="font-black text-6xl md:text-8xl tracking-tight text-white drop-shadow-2xl">AKILLI <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">TAHTA</span></h1>
                <p className="text-slate-400 text-2xl md:text-3xl font-medium max-w-3xl mx-auto">Sınıf içi etkileşimi en üst seviyeye çıkarmak için bir mod seçin.</p>
            </div>
            
            <div className="w-full max-w-[1600px] space-y-16 relative z-10">
                
                {/* Yarışmalar Bölümü */}
                <section>
                    <h2 className="text-4xl font-black text-center mb-10 text-white flex items-center justify-center gap-4">
                        <div className="h-px w-16 bg-gradient-to-r from-transparent to-indigo-500"></div>
                        <span className="bg-indigo-500/10 px-6 py-2 rounded-xl border border-indigo-500/30 text-indigo-300 uppercase tracking-widest flex items-center gap-3">
                           <Trophy className="h-8 w-8" /> Yarışma Modları
                        </span>
                        <div className="h-px w-16 bg-gradient-to-l from-transparent to-indigo-500"></div>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                        {yarışmalar.map(({ key, ...buttonProps }) => (
                            <div key={key} className="aspect-[4/5] min-h-[380px]">
                                <SmartboardCard {...buttonProps} />
                            </div>
                        ))}
                    </div>
                </section>

                {/* Sunumlar ve Araçlar Bölümü */}
                <section>
                    <h2 className="text-4xl font-black text-center mb-10 text-white flex items-center justify-center gap-4">
                        <div className="h-px w-16 bg-gradient-to-r from-transparent to-rose-500"></div>
                        <span className="bg-rose-500/10 px-6 py-2 rounded-xl border border-rose-500/30 text-rose-300 uppercase tracking-widest flex items-center gap-3">
                           <MonitorPlay className="h-8 w-8" /> Sunumlar ve Araçlar
                        </span>
                        <div className="h-px w-16 bg-gradient-to-l from-transparent to-rose-500"></div>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                        {sunumlar.map(({ key, ...buttonProps }) => (
                            <div key={key} className="aspect-[4/5] min-h-[380px]">
                                <SmartboardCard {...buttonProps} />
                            </div>
                        ))}
                    </div>
                </section>
                
            </div>

            {/* Yönetim Butonları */}
            <div className="flex flex-col md:flex-row items-center justify-center gap-6 w-full max-w-4xl relative z-10 p-8 rounded-[2.5rem] bg-slate-900/80 backdrop-blur-xl border border-white/10 shadow-2xl">
                <Button asChild className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white text-xl font-bold shadow-lg shadow-amber-900/40 h-16 px-10 rounded-2xl transition-all border-b-4 border-orange-800 active:border-b-0 active:translate-y-1 w-full md:w-auto">
                    <Link href="/teacher/smartboard/leaderboard">
                        <Trophy className="mr-3 h-7 w-7" />
                        Turnuva Liderliği
                    </Link>
                </Button>
                <div className="h-px w-full md:w-px md:h-12 bg-white/10"></div>
                <Button asChild variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/10 text-lg font-bold h-14 px-8 rounded-xl w-full md:w-auto justify-start md:justify-center">
                    <Link href="/teacher/guest-students">
                        <UserCog className="mr-3 h-6 w-6 text-cyan-400" />
                        Sanal Öğrencileri Yönet
                    </Link>
                </Button>
                <Button asChild variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/10 text-lg font-bold h-14 px-8 rounded-xl w-full md:w-auto justify-start md:justify-center">
                    <Link href="/teacher/game-settings">
                        <Settings className="mr-3 h-6 w-6 text-purple-400" />
                        Oyun Ayarlarını Yönet
                    </Link>
                </Button>
            </div>
            
        </div>
    );
}

```
- src/app/teacher/smartboard/page.tsx:
```tsx

'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { 
  MonitorPlay, Sun, User, Users, Swords, ArrowRight, BrainCircuit, Settings, Trophy, GitBranch, Columns, LayoutTemplate, Package, Wind, Gamepad2, UserCog, Lightbulb, Zap 
} from 'lucide-react';
import React, { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

// Yeni, daha büyük ve okunaklı kart bileşeni
const SmartboardCard = ({ href, title, description, icon, colorClass, isExternal }: { href: string, title: string, description: string, icon: ReactNode, colorClass: string, isExternal?: boolean }) => {
    const linkContent = (
        <div className={cn(
            "h-full w-full rounded-[2.5rem] p-8 flex flex-col items-center justify-center text-center shadow-2xl transition-all duration-300 transform border-b-8 group-hover:border-b-0 group-hover:translate-y-2 relative overflow-hidden group",
            colorClass
        )}>
            {/* Arka Plan Işık Efekti */}
            <div className={cn("absolute inset-0 opacity-20 blur-3xl group-hover:opacity-40 transition-opacity", colorClass.includes('bg-') ? colorClass.replace('bg-', 'bg-') : 'bg-primary')}></div>
            
            {/* İkon */}
            <div className="p-6 rounded-3xl bg-white/10 mb-6 border border-white/20 relative z-10 group-hover:scale-110 transition-transform shadow-lg backdrop-blur-sm">
                {React.cloneElement(icon as React.ReactElement, { className: "h-16 w-16 text-white" })}
            </div>
            
            {/* Başlık */}
            <h3 className="font-black text-3xl md:text-4xl mt-2 text-white drop-shadow-md relative z-10 uppercase tracking-tight leading-tight">{title}</h3>
            
            {/* Açıklama */}
            <p className="mt-3 text-white/80 text-lg font-medium relative z-10 leading-snug">{description}</p>
            
            <div className="flex-grow" />
            
            {/* Detay Butonu/İkonu */}
            <div className="mt-8 flex items-center text-xl font-bold text-white relative z-10 bg-black/20 px-6 py-2 rounded-full border border-white/10 group-hover:bg-white/20 transition-colors">
                BAŞLAT <ArrowRight className="ml-3 h-6 w-6 group-hover:translate-x-2 transition-transform" />
            </div>
        </div>
    );
    
    if (isExternal) {
        return <a href={href} target="_blank" rel="noopener noreferrer" className="block group h-full">{linkContent}</a>
    }

    return (
        <Link href={href} className="block group h-full">
            {linkContent}
        </Link>
    )
};


export default function SmartboardPage() {
  
    // Yarışma Modları
    const yarışmalar = [
        {
            key: 'smartboard_bireysel',
            href: "/teacher/smartboard/bireysel",
            title: "Bireysel Yarışma",
            description: "Her öğrencinin kendi başına yarıştığı klasik, hızlı mod.",
            icon: <User />,
            colorClass: "bg-indigo-600 border-indigo-800 hover:bg-indigo-500",
        },
        {
            key: 'smartboard_takim',
            href: "/teacher/smartboard/takim",
            title: "Takım Yarışması",
            description: "Öğrencileri gruplandırıp takım ruhuyla rekabeti artırın.",
            icon: <Users />,
            colorClass: "bg-teal-600 border-teal-800 hover:bg-teal-500",
        },
        {
            key: 'smartboard_duello',
            href: "/teacher/smartboard/duello",
            title: "Düello",
            description: "İki öğrenciyi veya takımı doğrudan karşı karşıya getirin.",
            icon: <Swords />,
            colorClass: "bg-red-600 border-red-800 hover:bg-red-500",
        },
        {
            key: 'fetih_oyunu',
            href: "/teacher/smartboard/fetih-oyunu",
            title: "Fetih Oyunu",
            description: "Sorularla haritada ilerle, kaleyi fethet ve bölgeleri ele geçir.",
            icon: <GitBranch />,
            colorClass: "bg-emerald-600 border-emerald-800 hover:bg-emerald-500",
        },
        {
            key: 'tornado',
            href: "/teacher/smartboard/tornado",
            title: "Tornado",
            description: "Rastgele puanlar ve sürpriz sorularla şans faktörünü kullan.",
            icon: <Wind />,
            colorClass: "bg-cyan-600 border-cyan-800 hover:bg-cyan-500",
        },
        {
            key: 'kutu_ac',
            href: "/teacher/smartboard/kutu-ac",
            title: "Kutu Aç",
            description: "Kutuları açarak puan tablosunu doldur ve lider ol.",
            icon: <Package />,
            colorClass: "bg-purple-600 border-purple-800 hover:bg-purple-500",
        },
        {
            key: 'dort_secenek',
            href: "/teacher/smartboard/dort-secenek",
            title: "4 Seçenekli Test",
            description: "Klasik çoktan seçmeli soruyu tahtada interaktif çözme.",
            icon: <Gamepad2 />,
            colorClass: "bg-pink-600 border-pink-800 hover:bg-pink-500",
        },
    ];
    
    // Sunum & Araç Modları
    const sunumlar = [
        {
            key: 'ozetler',
            href: "/teacher/smartboard/ozetler",
            title: "Özetler ve İçerikler",
            description: "Konu özetlerini ve interaktif HTML içerikleri tam ekran sun.",
            icon: <LayoutTemplate />,
            colorClass: "bg-rose-600 border-rose-800 hover:bg-rose-500",
        },
        {
            key: 'yazilacaklar',
            href: "/teacher/smartboard/yazilacaklar",
            title: "Kavram & Not Panosu",
            description: "Kavramlar ve önemli notları sütunlara ayırarak net göster.",
            icon: <Columns />,
            colorClass: "bg-amber-600 border-amber-800 hover:bg-amber-500",
        },
        {
             key: 'sanal-tahta',
             href: "/teacher/smartboard/sanal-tahta",
             title: "Sanal Tahta",
             description: "Ders anlatımı için temel dijital beyaz tahta modülü.",
             icon: <Lightbulb />,
             colorClass: "bg-blue-600 border-blue-800 hover:bg-blue-500",
        },
        {
             key: 'anlik-geri-bildirim',
             href: "/teacher/smartboard/anlik-geri-bildirim",
             title: "Anlık Geri Bildirim",
             description: "Sınıfın nabzını anında ölçmek için hızlı soru/anket.",
             icon: <Zap />,
             colorClass: "bg-slate-700 border-slate-900 hover:bg-slate-600",
        },
        {
            key: 'carkifelek',
            href: "/teacher/smartboard/carkifelek",
            title: "Çarkıfelek",
            description: "Sınıftan rastgele bir öğrenci seçmek için çarkı çevirin.",
            icon: <Trophy />,
            colorClass: "bg-yellow-600 border-yellow-800 hover:bg-yellow-500",
        },
    ];

    return (
        <div className="flex flex-col items-center p-6 sm:p-10 md:p-16 space-y-16 min-h-screen bg-slate-950 text-white font-sans relative overflow-hidden">
            
             {/* Arka Plan Efektleri */}
             <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-indigo-900/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-purple-900/20 rounded-full blur-[120px]" />
            </div>

            {/* Ana Başlık */}
            <div className="text-center relative z-10 space-y-6">
                <div className="inline-flex items-center justify-center p-5 bg-white/5 rounded-full mb-2 border border-white/10 shadow-2xl backdrop-blur-md">
                    <MonitorPlay className="h-12 w-12 text-cyan-400"/>
                </div>
                <h1 className="font-black text-6xl md:text-8xl tracking-tight text-white drop-shadow-2xl">AKILLI <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">TAHTA</span></h1>
                <p className="text-slate-400 text-2xl md:text-3xl font-medium max-w-3xl mx-auto">Sınıf içi etkileşimi en üst seviyeye çıkarmak için bir mod seçin.</p>
            </div>
            
            <div className="w-full max-w-[1600px] space-y-16 relative z-10">
                
                {/* Yarışmalar Bölümü */}
                <section>
                    <h2 className="text-4xl font-black text-center mb-10 text-white flex items-center justify-center gap-4">
                        <div className="h-px w-16 bg-gradient-to-r from-transparent to-indigo-500"></div>
                        <span className="bg-indigo-500/10 px-6 py-2 rounded-xl border border-indigo-500/30 text-indigo-300 uppercase tracking-widest flex items-center gap-3">
                           <Trophy className="h-8 w-8" /> Yarışma Modları
                        </span>
                        <div className="h-px w-16 bg-gradient-to-l from-transparent to-indigo-500"></div>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                        {yarışmalar.map(({ key, ...buttonProps }) => (
                            <div key={key} className="aspect-[4/5] min-h-[380px]">
                                <SmartboardCard {...buttonProps} />
                            </div>
                        ))}
                    </div>
                </section>

                {/* Sunumlar ve Araçlar Bölümü */}
                <section>
                    <h2 className="text-4xl font-black text-center mb-10 text-white flex items-center justify-center gap-4">
                        <div className="h-px w-16 bg-gradient-to-r from-transparent to-rose-500"></div>
                        <span className="bg-rose-500/10 px-6 py-2 rounded-xl border border-rose-500/30 text-rose-300 uppercase tracking-widest flex items-center gap-3">
                           <MonitorPlay className="h-8 w-8" /> Sunumlar ve Araçlar
                        </span>
                        <div className="h-px w-16 bg-gradient-to-l from-transparent to-rose-500"></div>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                        {sunumlar.map(({ key, ...buttonProps }) => (
                            <div key={key} className="aspect-[4/5] min-h-[380px]">
                                <SmartboardCard {...buttonProps} />
                            </div>
                        ))}
                    </div>
                </section>
                
            </div>

            {/* Yönetim Butonları */}
            <div className="flex flex-col md:flex-row items-center justify-center gap-6 w-full max-w-4xl relative z-10 p-8 rounded-[2.5rem] bg-slate-900/80 backdrop-blur-xl border border-white/10 shadow-2xl">
                <Button asChild className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white text-xl font-bold shadow-lg shadow-amber-900/40 h-16 px-10 rounded-2xl transition-all border-b-4 border-orange-800 active:border-b-0 active:translate-y-1 w-full md:w-auto">
                    <Link href="/teacher/smartboard/leaderboard">
                        <Trophy className="mr-3 h-7 w-7" />
                        Turnuva Liderliği
                    </Link>
                </Button>
                <div className="h-px w-full md:w-px md:h-12 bg-white/10"></div>
                <Button asChild variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/10 text-lg font-bold h-14 px-8 rounded-xl w-full md:w-auto justify-start md:justify-center">
                    <Link href="/teacher/guest-students">
                        <UserCog className="mr-3 h-6 w-6 text-cyan-400" />
                        Sanal Öğrencileri Yönet
                    </Link>
                </Button>
                <Button asChild variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/10 text-lg font-bold h-14 px-8 rounded-xl w-full md:w-auto justify-start md:justify-center">
                    <Link href="/teacher/game-settings">
                        <Settings className="mr-3 h-6 w-6 text-purple-400" />
                        Oyun Ayarlarını Yönet
                    </Link>
                </Button>
            </div>
            
        </div>
    );
}

```
- src/app/teacher/smartboard/page.tsx:
```tsx

'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { 
  MonitorPlay, Sun, User, Users, Swords, ArrowRight, BrainCircuit, Settings, Trophy, GitBranch, Columns, LayoutTemplate, Package, Wind, Gamepad2, UserCog, Lightbulb, Zap 
} from 'lucide-react';
import React, { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

// Yeni, daha büyük ve okunaklı kart bileşeni
const SmartboardCard = ({ href, title, description, icon, colorClass, isExternal }: { href: string, title: string, description: string, icon: ReactNode, colorClass: string, isExternal?: boolean }) => {
    const linkContent = (
        <div className={cn(
            "h-full w-full rounded-[2.5rem] p-8 flex flex-col items-center justify-center text-center shadow-2xl transition-all duration-300 transform border-b-8 group-hover:border-b-0 group-hover:translate-y-2 relative overflow-hidden group",
            colorClass
        )}>
            {/* Arka Plan Işık Efekti */}
            <div className={cn("absolute inset-0 opacity-20 blur-3xl group-hover:opacity-40 transition-opacity", colorClass.includes('bg-') ? colorClass.replace('bg-', 'bg-') : 'bg-primary')}></div>
            
            {/* İkon */}
            <div className="p-6 rounded-3xl bg-white/10 mb-6 border border-white/20 relative z-10 group-hover:scale-110 transition-transform shadow-lg backdrop-blur-sm">
                {React.cloneElement(icon as React.ReactElement, { className: "h-16 w-16 text-white" })}
            </div>
            
            {/* Başlık */}
            <h3 className="font-black text-3xl md:text-4xl mt-2 text-white drop-shadow-md relative z-10 uppercase tracking-tight leading-tight">{title}</h3>
            
            {/* Açıklama */}
            <p className="mt-3 text-white/80 text-lg font-medium relative z-10 leading-snug">{description}</p>
            
            <div className="flex-grow" />
            
            {/* Detay Butonu/İkonu */}
            <div className="mt-8 flex items-center text-xl font-bold text-white relative z-10 bg-black/20 px-6 py-2 rounded-full border border-white/10 group-hover:bg-white/20 transition-colors">
                BAŞLAT <ArrowRight className="ml-3 h-6 w-6 group-hover:translate-x-2 transition-transform" />
            </div>
        </div>
    );
    
    if (isExternal) {
        return <a href={href} target="_blank" rel="noopener noreferrer" className="block group h-full">{linkContent}</a>
    }

    return (
        <Link href={href} className="block group h-full">
            {linkContent}
        </Link>
    )
};


export default function SmartboardPage() {
  
    // Yarışma Modları
    const yarışmalar = [
        {
            key: 'smartboard_bireysel',
            href: "/teacher/smartboard/bireysel",
            title: "Bireysel Yarışma",
            description: "Her öğrencinin kendi başına yarıştığı klasik, hızlı mod.",
            icon: <User />,
            colorClass: "bg-indigo-600 border-indigo-800 hover:bg-indigo-500",
        },
        {
            key: 'smartboard_takim',
            href: "/teacher/smartboard/takim",
            title: "Takım Yarışması",
            description: "Öğrencileri gruplandırıp takım ruhuyla rekabeti artırın.",
            icon: <Users />,
            colorClass: "bg-teal-600 border-teal-800 hover:bg-teal-500",
        },
        {
            key: 'smartboard_duello',
            href: "/teacher/smartboard/duello",
            title: "Düello",
            description: "İki öğrenciyi veya takımı doğrudan karşı karşıya getirin.",
            icon: <Swords />,
            colorClass: "bg-red-600 border-red-800 hover:bg-red-500",
        },
        {
            key: 'fetih_oyunu',
            href: "/teacher/smartboard/fetih-oyunu",
            title: "Fetih Oyunu",
            description: "Sorularla haritada ilerle, kaleyi fethet ve bölgeleri ele geçir.",
            icon: <GitBranch />,
            colorClass: "bg-emerald-600 border-emerald-800 hover:bg-emerald-500",
        },
        {
            key: 'tornado',
            href: "/teacher/smartboard/tornado",
            title: "Tornado",
            description: "Rastgele puanlar ve sürpriz sorularla şans faktörünü kullan.",
            icon: <Wind />,
            colorClass: "bg-cyan-600 border-cyan-800 hover:bg-cyan-500",
        },
        {
            key: 'kutu_ac',
            href: "/teacher/smartboard/kutu-ac",
            title: "Kutu Aç",
            description: "Kutuları açarak puan tablosunu doldur ve lider ol.",
            icon: <Package />,
            colorClass: "bg-purple-600 border-purple-800 hover:bg-purple-500",
        },
        {
            key: 'dort_secenek',
            href: "/teacher/smartboard/dort-secenek",
            title: "4 Seçenekli Test",
            description: "Klasik çoktan seçmeli soruyu tahtada interaktif çözme.",
            icon: <Gamepad2 />,
            colorClass: "bg-pink-600 border-pink-800 hover:bg-pink-500",
        },
    ];
    
    // Sunum & Araç Modları
    const sunumlar = [
        {
            key: 'ozetler',
            href: "/teacher/smartboard/ozetler",
            title: "Özetler ve İçerikler",
            description: "Konu özetlerini ve interaktif HTML içerikleri tam ekran sun.",
            icon: <LayoutTemplate />,
            colorClass: "bg-rose-600 border-rose-800 hover:bg-rose-500",
        },
        {
            key: 'yazilacaklar',
            href: "/teacher/smartboard/yazilacaklar",
            title: "Kavram & Not Panosu",
            description: "Kavramlar ve önemli notları sütunlara ayırarak net göster.",
            icon: <Columns />,
            colorClass: "bg-amber-600 border-amber-800 hover:bg-amber-500",
        },
        {
             key: 'sanal-tahta',
             href: "/teacher/smartboard/sanal-tahta",
             title: "Sanal Tahta",
             description: "Ders anlatımı için temel dijital beyaz tahta modülü.",
             icon: <Lightbulb />,
             colorClass: "bg-blue-600 border-blue-800 hover:bg-blue-500",
        },
        {
             key: 'anlik-geri-bildirim',
             href: "/teacher/smartboard/anlik-geri-bildirim",
             title: "Anlık Geri Bildirim",
             description: "Sınıfın nabzını anında ölçmek için hızlı soru/anket.",
             icon: <Zap />,
             colorClass: "bg-slate-700 border-slate-900 hover:bg-slate-600",
        },
        {
            key: 'carkifelek',
            href: "/teacher/smartboard/carkifelek",
            title: "Çarkıfelek",
            description: "Sınıftan rastgele bir öğrenci seçmek için çarkı çevirin.",
            icon: <Trophy />,
            colorClass: "bg-yellow-600 border-yellow-800 hover:bg-yellow-500",
        },
    ];

    return (
        <div className="flex flex-col items-center p-6 sm:p-10 md:p-16 space-y-16 min-h-screen bg-slate-950 text-white font-sans relative overflow-hidden">
            
             {/* Arka Plan Efektleri */}
             <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-indigo-900/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-purple-900/20 rounded-full blur-[120px]" />
            </div>

            {/* Ana Başlık */}
            <div className="text-center relative z-10 space-y-6">
                <div className="inline-flex items-center justify-center p-5 bg-white/5 rounded-full mb-2 border border-white/10 shadow-2xl backdrop-blur-md">
                    <MonitorPlay className="h-12 w-12 text-cyan-400"/>
                </div>
                <h1 className="font-black text-6xl md:text-8xl tracking-tight text-white drop-shadow-2xl">AKILLI <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">TAHTA</span></h1>
                <p className="text-slate-400 text-2xl md:text-3xl font-medium max-w-3xl mx-auto">Sınıf içi etkileşimi en üst seviyeye çıkarmak için bir mod seçin.</p>
            </div>
            
            <div className="w-full max-w-[1600px] space-y-16 relative z-10">
                
                {/* Yarışmalar Bölümü */}
                <section>
                    <h2 className="text-4xl font-black text-center mb-10 text-white flex items-center justify-center gap-4">
                        <div className="h-px w-16 bg-gradient-to-r from-transparent to-indigo-500"></div>
                        <span className="bg-indigo-500/10 px-6 py-2 rounded-xl border border-indigo-500/30 text-indigo-300 uppercase tracking-widest flex items-center gap-3">
                           <Trophy className="h-8 w-8" /> Yarışma Modları
                        </span>
                        <div className="h-px w-16 bg-gradient-to-l from-transparent to-indigo-500"></div>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                        {yarışmalar.map(({ key, ...buttonProps }) => (
                            <div key={key} className="aspect-[4/5] min-h-[380px]">
                                <SmartboardCard {...buttonProps} />
                            </div>
                        ))}
                    </div>
                </section>

                {/* Sunumlar ve Araçlar Bölümü */}
                <section>
                    <h2 className="text-4xl font-black text-center mb-10 text-white flex items-center justify-center gap-4">
                        <div className="h-px w-16 bg-gradient-to-r from-transparent to-rose-500"></div>
                        <span className="bg-rose-500/10 px-6 py-2 rounded-xl border border-rose-500/30 text-rose-300 uppercase tracking-widest flex items-center gap-3">
                           <MonitorPlay className="h-8 w-8" /> Sunumlar ve Araçlar
                        </span>
                        <div className="h-px w-16 bg-gradient-to-l from-transparent to-rose-500"></div>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                        {sunumlar.map(({ key, ...buttonProps }) => (
                            <div key={key} className="aspect-[4/5] min-h-[380px]">
                                <SmartboardCard {...buttonProps} />
                            </div>
                        ))}
                    </div>
                </section>
                
            </div>

            {/* Yönetim Butonları */}
            <div className="flex flex-col md:flex-row items-center justify-center gap-6 w-full max-w-4xl relative z-10 p-8 rounded-[2.5rem] bg-slate-900/80 backdrop-blur-xl border border-white/10 shadow-2xl">
                <Button asChild className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white text-xl font-bold shadow-lg shadow-amber-900/40 h-16 px-10 rounded-2xl transition-all border-b-4 border-orange-800 active:border-b-0 active:translate-y-1 w-full md:w-auto">
                    <Link href="/teacher/smartboard/leaderboard">
                        <Trophy className="mr-3 h-7 w-7" />
                        Turnuva Liderliği
                    </Link>
                </Button>
                <div className="h-px w-full md:w-px md:h-12 bg-white/10"></div>
                <Button asChild variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/10 text-lg font-bold h-14 px-8 rounded-xl w-full md:w-auto justify-start md:justify-center">
                    <Link href="/teacher/guest-students">
                        <UserCog className="mr-3 h-6 w-6 text-cyan-400" />
                        Sanal Öğrencileri Yönet
                    </Link>
                </Button>
                <Button asChild variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/10 text-lg font-bold h-14 px-8 rounded-xl w-full md:w-auto justify-start md:justify-center">
                    <Link href="/teacher/game-settings">
                        <Settings className="mr-3 h-6 w-6 text-purple-400" />
                        Oyun Ayarlarını Yönet
                    </Link>
                </Button>
            </div>
            
        </div>
    );
}

```
- src/app/teacher/smartboard/page.tsx:
```tsx

'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { 
  MonitorPlay, Sun, User, Users, Swords, ArrowRight, BrainCircuit, Settings, Trophy, GitBranch, Columns, LayoutTemplate, Package, Wind, Gamepad2, UserCog, Lightbulb, Zap 
} from 'lucide-react';
import React, { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

// Yeni, daha büyük ve okunaklı kart bileşeni
const SmartboardCard = ({ href, title, description, icon, colorClass, isExternal }: { href: string, title: string, description: string, icon: ReactNode, colorClass: string, isExternal?: boolean }) => {
    const linkContent = (
        <div className={cn(
            "h-full w-full rounded-[2.5rem] p-8 flex flex-col items-center justify-center text-center shadow-2xl transition-all duration-300 transform border-b-8 group-hover:border-b-0 group-hover:translate-y-2 relative overflow-hidden group",
            colorClass
        )}>
            {/* Arka Plan Işık Efekti */}
            <div className={cn("absolute inset-0 opacity-20 blur-3xl group-hover:opacity-40 transition-opacity", colorClass.includes('bg-') ? colorClass.replace('bg-', 'bg-') : 'bg-primary')}></div>
            
            {/* İkon */}
            <div className="p-6 rounded-3xl bg-white/10 mb-6 border border-white/20 relative z-10 group-hover:scale-110 transition-transform shadow-lg backdrop-blur-sm">
                {React.cloneElement(icon as React.ReactElement, { className: "h-16 w-16 text-white" })}
            </div>
            
            {/* Başlık */}
            <h3 className="font-black text-3xl md:text-4xl mt-2 text-white drop-shadow-md relative z-10 uppercase tracking-tight leading-tight">{title}</h3>
            
            {/* Açıklama */}
            <p className="mt-3 text-white/80 text-lg font-medium relative z-10 leading-snug">{description}</p>
            
            <div className="flex-grow" />
            
            {/* Detay Butonu/İkonu */}
            <div className="mt-8 flex items-center text-xl font-bold text-white relative z-10 bg-black/20 px-6 py-2 rounded-full border border-white/10 group-hover:bg-white/20 transition-colors">
                BAŞLAT <ArrowRight className="ml-3 h-6 w-6 group-hover:translate-x-2 transition-transform" />
            </div>
        </div>
    );
    
    if (isExternal) {
        return <a href={href} target="_blank" rel="noopener noreferrer" className="block group h-full">{linkContent}</a>
    }

    return (
        <Link href={href} className="block group h-full">
            {linkContent}
        </Link>
    )
};


export default function SmartboardPage() {
  
    // Yarışma Modları
    const yarışmalar = [
        {
            key: 'smartboard_bireysel',
            href: "/teacher/smartboard/bireysel",
            title: "Bireysel Yarışma",
            description: "Her öğrencinin kendi başına yarıştığı klasik, hızlı mod.",
            icon: <User />,
            colorClass: "bg-indigo-600 border-indigo-800 hover:bg-indigo-500",
        },
        {
            key: 'smartboard_takim',
            href: "/teacher/smartboard/takim",
            title: "Takım Yarışması",
            description: "Öğrencileri gruplandırıp takım ruhuyla rekabeti artırın.",
            icon: <Users />,
            colorClass: "bg-teal-600 border-teal-800 hover:bg-teal-500",
        },
        {
            key: 'smartboard_duello',
            href: "/teacher/smartboard/duello",
            title: "Düello",
            description: "İki öğrenciyi veya takımı doğrudan karşı karşıya getirin.",
            icon: <Swords />,
            colorClass: "bg-red-600 border-red-800 hover:bg-red-500",
        },
        {
            key: 'fetih_oyunu',
            href: "/teacher/smartboard/fetih-oyunu",
            title: "Fetih Oyunu",
            description: "Sorularla haritada ilerle, kaleyi fethet ve bölgeleri ele geçir.",
            icon: <GitBranch />,
            colorClass: "bg-emerald-600 border-emerald-800 hover:bg-emerald-500",
        },
        {
            key: 'tornado',
            href: "/teacher/smartboard/tornado",
            title: "Tornado",
            description: "Rastgele puanlar ve sürpriz sorularla şans faktörünü kullan.",
            icon: <Wind />,
            colorClass: "bg-cyan-600 border-cyan-800 hover:bg-cyan-500",
        },
        {
            key: 'kutu_ac',
            href: "/teacher/smartboard/kutu-ac",
            title: "Kutu Aç",
            description: "Kutuları açarak puan tablosunu doldur ve lider ol.",
            icon: <Package />,
            colorClass: "bg-purple-600 border-purple-800 hover:bg-purple-500",
        },
        {
            key: 'dort_secenek',
            href: "/teacher/smartboard/dort-secenek",
            title: "4 Seçenekli Test",
            description: "Klasik çoktan seçmeli soruyu tahtada interaktif çözme.",
            icon: <Gamepad2 />,
            colorClass: "bg-pink-600 border-pink-800 hover:bg-pink-500",
        },
    ];
    
    // Sunum & Araç Modları
    const sunumlar = [
        {
            key: 'ozetler',
            href: "/teacher/smartboard/ozetler",
            title: "Özetler ve İçerikler",
            description: "Konu özetlerini ve interaktif HTML içerikleri tam ekran sun.",
            icon: <LayoutTemplate />,
            colorClass: "bg-rose-600 border-rose-800 hover:bg-rose-500",
        },
        {
            key: 'yazilacaklar',
            href: "/teacher/smartboard/yazilacaklar",
            title: "Kavram & Not Panosu",
            description: "Kavramlar ve önemli notları sütunlara ayırarak net göster.",
            icon: <Columns />,
            colorClass: "bg-amber-600 border-amber-800 hover:bg-amber-500",
        },
        {
             key: 'sanal-tahta',
             href: "/teacher/smartboard/sanal-tahta",
             title: "Sanal Tahta",
             description: "Ders anlatımı için temel dijital beyaz tahta modülü.",
             icon: <Lightbulb />,
             colorClass: "bg-blue-600 border-blue-800 hover:bg-blue-500",
        },
        {
             key: 'anlik-geri-bildirim',
             href: "/teacher/smartboard/anlik-geri-bildirim",
             title: "Anlık Geri Bildirim",
             description: "Sınıfın nabzını anında ölçmek için hızlı soru/anket.",
             icon: <Zap />,
             colorClass: "bg-slate-700 border-slate-900 hover:bg-slate-600",
        },
        {
            key: 'carkifelek',
            href: "/teacher/smartboard/carkifelek",
            title: "Çarkıfelek",
            description: "Sınıftan rastgele bir öğrenci seçmek için çarkı çevirin.",
            icon: <Trophy />,
            colorClass: "bg-yellow-600 border-yellow-800 hover:bg-yellow-500",
        },
    ];

    return (
        <div className="flex flex-col items-center p-6 sm:p-10 md:p-16 space-y-16 min-h-screen bg-slate-950 text-white font-sans relative overflow-hidden">
            
             {/* Arka Plan Efektleri */}
             <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-indigo-900/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-purple-900/20 rounded-full blur-[120px]" />
            </div>

            {/* Ana Başlık */}
            <div className="text-center relative z-10 space-y-6">
                <div className="inline-flex items-center justify-center p-5 bg-white/5 rounded-full mb-2 border border-white/10 shadow-2xl backdrop-blur-md">
                    <MonitorPlay className="h-12 w-12 text-cyan-400"/>
                </div>
                <h1 className="font-black text-6xl md:text-8xl tracking-tight text-white drop-shadow-2xl">AKILLI <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">TAHTA</span></h1>
                <p className="text-slate-400 text-2xl md:text-3xl font-medium max-w-3xl mx-auto">Sınıf içi etkileşimi en üst seviyeye çıkarmak için bir mod seçin.</p>
            </div>
            
            <div className="w-full max-w-[1600px] space-y-16 relative z-10">
                
                {/* Yarışmalar Bölümü */}
                <section>
                    <h2 className="text-4xl font-black text-center mb-10 text-white flex items-center justify-center gap-4">
                        <div className="h-px w-16 bg-gradient-to-r from-transparent to-indigo-500"></div>
                        <span className="bg-indigo-500/10 px-6 py-2 rounded-xl border border-indigo-500/30 text-indigo-300 uppercase tracking-widest flex items-center gap-3">
                           <Trophy className="h-8 w-8" /> Yarışma Modları
                        </span>
                        <div className="h-px w-16 bg-gradient-to-l from-transparent to-indigo-500"></div>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                        {yarışmalar.map(({ key, ...buttonProps }) => (
                            <div key={key} className="aspect-[4/5] min-h-[380px]">
                                <SmartboardCard {...buttonProps} />
                            </div>
                        ))}
                    </div>
                </section>

                {/* Sunumlar ve Araçlar Bölümü */}
                <section>
                    <h2 className="text-4xl font-black text-center mb-10 text-white flex items-center justify-center gap-4">
                        <div className="h-px w-16 bg-gradient-to-r from-transparent to-rose-500"></div>
                        <span className="bg-rose-500/10 px-6 py-2 rounded-xl border border-rose-500/30 text-rose-300 uppercase tracking-widest flex items-center gap-3">
                           <MonitorPlay className="h-8 w-8" /> Sunumlar ve Araçlar
                        </span>
                        <div className="h-px w-16 bg-gradient-to-l from-transparent to-rose-500"></div>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                        {sunumlar.map(({ key, ...buttonProps }) => (
                            <div key={key} className="aspect-[4/5] min-h-[380px]">
                                <SmartboardCard {...buttonProps} />
                            </div>
                        ))}
                    </div>
                </section>
                
            </div>

            {/* Yönetim Butonları */}
            <div className="flex flex-col md:flex-row items-center justify-center gap-6 w-full max-w-4xl relative z-10 p-8 rounded-[2.5rem] bg-slate-900/80 backdrop-blur-xl border border-white/10 shadow-2xl">
                <Button asChild className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white text-xl font-bold shadow-lg shadow-amber-900/40 h-16 px-10 rounded-2xl transition-all border-b-4 border-orange-800 active:border-b-0 active:translate-y-1 w-full md:w-auto">
                    <Link href="/teacher/smartboard/leaderboard">
                        <Trophy className="mr-3 h-7 w-7" />
                        Turnuva Liderliği
                    </Link>
                </Button>
                <div className="h-px w-full md:w-px md:h-12 bg-white/10"></div>
                <Button asChild variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/10 text-lg font-bold h-14 px-8 rounded-xl w-full md:w-auto justify-start md:justify-center">
                    <Link href="/teacher/guest-students">
                        <UserCog className="mr-3 h-6 w-6 text-cyan-400" />
                        Sanal Öğrencileri Yönet
                    </Link>
                </Button>
                <Button asChild variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/10 text-lg font-bold h-14 px-8 rounded-xl w-full md:w-auto justify-start md:justify-center">
                    <Link href="/teacher/game-settings">
                        <Settings className="mr-3 h-6 w-6 text-purple-400" />
                        Oyun Ayarlarını Yönet
                    </Link>
                </Button>
            </div>
            
        </div>
    );
}

```
- src/app/teacher/smartboard/yazilacaklar/oyun/page.tsx:
```tsx
'use client';

import { useState, useEffect, Suspense, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Wand2, ArrowLeft, Download, Plus, Minus, Maximize, Minimize } from 'lucide-react';
import type { Topic, YazilacaklarContent, ActivityItem } from '@/lib/types';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FullscreenToggle } from '@/components/fullscreen-toggle';

// --- Veri Çekme Fonksiyonu ---
async function getDefinitionsForTopic(topicId: string): Promise<{ concept: string; definition: string; }[]> {
    if (!topicId) return [];
    try {
        const q = query(collection(db, "activityItems"), where("topicId", "==", topicId), where("type", "==", "definition"));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => {
            const item = doc.data() as ActivityItem;
            return {
                concept: item.content.term || '',
                definition: item.content.definition || ''
            };
        }).filter(item => item.concept && item.definition);
    } catch (error) {
        console.error("Error fetching definitions for topic:", error);
        return [];
    }
}

function YazilacaklarDisplayPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const topicId = searchParams.get('topicId');
    const courseId = searchParams.get('courseId');
    const unitId = searchParams.get('unitId');

    const [topic, setTopic] = useState<Topic | null>(null);
    const [content, setContent] = useState<YazilacaklarContent | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const mainContentRef = useRef<HTMLDivElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [fontSize, setFontSize] = useState(1.5); 

    const colorClasses = [
        'bg-indigo-900/40 border-indigo-500/50 text-indigo-100', 
        'bg-emerald-900/40 border-emerald-500/50 text-emerald-100', 
        'bg-rose-900/40 border-rose-500/50 text-rose-100', 
        'bg-amber-900/40 border-amber-500/50 text-amber-100', 
        'bg-cyan-900/40 border-cyan-500/50 text-cyan-100',
        'bg-fuchsia-900/40 border-fuchsia-500/50 text-fuchsia-100'
    ];

     useEffect(() => {
        const handleFullscreenChange = () => {
            const isCurrentlyFullscreen = !!document.fullscreenElement;
            setIsFullscreen(isCurrentlyFullscreen);
             if (!isCurrentlyFullscreen) {
                // Opsiyonel: Tam ekrandan çıkınca fontu resetlemek isterseniz burayı açın
                // setFontSize(1.5); 
            }
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const fetchContent = useCallback(async () => {
        if (!topicId || !courseId || !unitId) {
            setError("Eksik bilgi: Gerekli konu detayları bulunamadı.");
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const topicRef = doc(db, 'courses', courseId, 'units', unitId, 'topics', topicId);
            const topicSnap = await getDoc(topicRef);
            
            if (topicSnap.exists()) {
                const topicData = topicSnap.data() as Topic;
                setTopic(topicData);
                
                const definitions = await getDefinitionsForTopic(topicId);
                const notes = topicData.writingContent?.notes || [];

                if (definitions.length === 0 && notes.length === 0) {
                     router.push(`/teacher/ders-akisi/ozet/${topicId}?courseId=${courseId}&unitId=${unitId}`);
                } else {
                    setContent({ conceptDefinitions: definitions, notes: notes });
                }

            } else {
                 setError('Konu bulunamadı.');
            }
        } catch (e: any) {
            setError('İçerik alınırken bir hata oluştu.');
        } finally {
            setIsLoading(false);
        }
    }, [topicId, courseId, unitId, router]);

    useEffect(() => {
        fetchContent();
    }, [fetchContent]);

    const handleDownloadPDF = () => {
        if (!content || !topic) return;
        setIsDownloading(true);

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            let htmlContent = `
                <html>
                <head>
                    <title>${topic.title} - Yazılacaklar</title>
                    <style>
                        body { font-family: sans-serif; padding: 40px; font-size: 18px; }
                        h1 { text-align: center; font-size: 32px; margin-bottom: 30px; }
                        h2 { border-bottom: 2px solid #000; padding-bottom: 10px; margin-top: 30px; }
                        .concept-item { margin-bottom: 15px; page-break-inside: avoid; }
                        .concept-term { font-weight: bold; font-size: 20px; }
                        .note-item { margin-bottom: 15px; page-break-inside: avoid; display: flex; }
                        .bullet { margin-right: 10px; font-weight: bold; }
                    </style>
                </head>
                <body>
                    <h1>${topic.title}</h1>
            `;

            if (content.conceptDefinitions.length > 0) {
                htmlContent += `<h2>Kavramlar</h2>`;
                content.conceptDefinitions.forEach(item => {
                    htmlContent += `
                        <div class="concept-item">
                            <span class="concept-term">${item.concept}:</span> ${item.definition}
                        </div>
                    `;
                });
            }

             if (content.notes.length > 0) {
                htmlContent += `<h2>Önemli Notlar</h2>`;
                content.notes.forEach(note => {
                    htmlContent += `
                        <div class="note-item">
                            <span class="bullet">•</span>
                            <span>${note}</span>
                        </div>
                    `;
                });
            }

            htmlContent += `</body></html>`;

            printWindow.document.write(htmlContent);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => {
                 printWindow.print();
                 printWindow.close();
            }, 500);
        }
        
        setIsDownloading(false);
    };
    
    const backUrl = `/teacher/smartboard/yazilacaklar`;
    
    const increaseFontSize = () => setFontSize(fs => Math.min(fs + 0.2, 5.0));
    const decreaseFontSize = () => setFontSize(fs => Math.max(1.0, fs - 0.2));

    if (isLoading) {
        return <div className="flex h-screen items-center justify-center bg-slate-950"><Loader2 className="h-16 w-16 animate-spin text-cyan-500"/></div>;
    }
    if (error) {
         return (
            <div className="flex h-screen items-center justify-center text-center p-8 bg-slate-950 text-white">
                <div>
                    <p className="text-red-400 text-2xl mb-8 font-bold">{error}</p>
                    <Button asChild size="lg" className="text-xl px-8 py-6 bg-slate-800 hover:bg-slate-700 border border-slate-600"><Link href={backUrl}>Geri Dön</Link></Button>
                </div>
            </div>
        );
    }
    if (!content) {
        return (
             <div className="flex h-screen items-center justify-center text-center p-8 bg-slate-950 text-white">
                <div>
                    <p className="text-slate-400 text-2xl mb-8">Bu konu için içerik bulunamadı.</p>
                     <Button asChild size="lg" className="text-xl px-8 py-6 bg-slate-800 hover:bg-slate-700 border border-slate-600"><Link href={backUrl}>Geri Dön</Link></Button>
                </div>
            </div>
        )
    }
    
    // --- KAVRAMLAR İÇERİĞİ ---
    const KavramlarContent = (
        <div className="flex flex-col">
            <h2 className="text-center font-black text-4xl md:text-5xl text-cyan-400 mb-8 drop-shadow-lg tracking-wide uppercase">
                {topic?.title || 'Kavramlar'}
            </h2>
            {/* Dinamik Grid (Auto-fill) */}
            <div className="grid grid-cols-[repeat(auto-fill,minmax(350px,1fr))] gap-6 p-2">
                {content.conceptDefinitions.length > 0 ? content.conceptDefinitions.map((item, index) => (
                    <div key={index} className={cn(
                        "relative overflow-hidden rounded-3xl border-2 transition-all duration-300 hover:scale-[1.02] shadow-2xl flex flex-col",
                        colorClasses[index % colorClasses.length]
                    )}>
                        {/* Numara Rozeti */}
                        <div className="absolute top-0 right-0 bg-black/30 text-white/50 font-black text-6xl p-2 leading-none pointer-events-none select-none -mr-2 -mt-2 opacity-30">
                            {index + 1}
                        </div>
                        
                        <div className="p-6 flex flex-col h-full z-10 relative">
                            <h3 
                                className="font-black text-white mb-4 border-b border-white/10 pb-3 uppercase tracking-tight leading-tight"
                                style={{ fontSize: `${fontSize * 1.2}rem` }}
                            >
                                {item.concept}
                            </h3>
                            <div className="flex-grow">
                                <p 
                                    className="font-medium text-white/90 leading-snug"
                                    style={{ fontSize: `${fontSize}rem` }}
                                >
                                    {item.definition}
                                </p>
                            </div>
                        </div>
                    </div>
                )) : (
                    <div className="col-span-full flex items-center justify-center h-64 text-slate-500 text-2xl">
                        Bu konu için kayıtlı tanım bulunamadı.
                    </div>
                )}
            </div>
             {/* KAYDIRMA BOŞLUĞU: %85 ekran boyu boşluk */}
             <div className="h-[85vh]"></div>
        </div>
    );

    // --- NOTLAR İÇERİĞİ ---
    const NotlarContent = (
         <div className="flex flex-col">
            <h2 className="text-center font-black text-4xl md:text-5xl text-amber-400 mb-8 drop-shadow-lg tracking-wide uppercase">
                Önemli Notlar
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-2">
                {content.notes.length > 0 ? content.notes.map((note, index) => (
                    <div key={index} className={cn(
                        "flex items-start gap-5 p-6 rounded-3xl border-2 shadow-xl bg-slate-900/60 border-slate-700/50 backdrop-blur-sm transition-all hover:bg-slate-800/60",
                    )}>
                        <div className="flex-shrink-0 mt-0.5">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white font-black text-3xl shadow-lg border border-amber-400/30 flex items-center justify-center">
                                {index + 1}
                            </div>
                        </div>
                        <p 
                            className="font-medium text-slate-200 leading-snug pt-1"
                            style={{ fontSize: `${fontSize}rem` }}
                        >
                            {note}
                        </p>
                    </div>
                )) : (
                     <div className="col-span-full flex items-center justify-center h-64 text-slate-500 text-2xl">
                        Yapay zeka not üretemedi.
                    </div>
                )}
            </div>
             {/* KAYDIRMA BOŞLUĞU: %85 ekran boyu boşluk */}
             <div className="h-[85vh]"></div>
        </div>
    );
    
    return (
        <div 
            ref={mainContentRef} 
            className="w-full h-screen bg-slate-950 text-white flex flex-col overflow-hidden relative"
        >
             {/* Arka Plan Efekti */}
             <div className="absolute inset-0 z-0 pointer-events-none">
                 <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-cyan-600/5 rounded-full blur-[100px]" />
                 <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-violet-600/5 rounded-full blur-[100px]" />
             </div>

             {/* Üst Menü (Fullscreen değilken görünür) */}
             <header className={cn(
                 "flex-shrink-0 p-4 border-b border-white/10 bg-slate-900/80 backdrop-blur-md z-20 transition-all duration-300",
                 isFullscreen ? "h-0 p-0 overflow-hidden border-0 opacity-0 pointer-events-none" : "h-auto opacity-100"
             )}>
                 <div className="flex flex-col md:flex-row items-center justify-between gap-4 max-w-7xl mx-auto w-full">
                     <h1 className="font-bold text-2xl text-slate-200 hidden md:block">Akıllı Tahta Modu</h1>
                     
                      <div className="flex items-center gap-3">
                        <div className="flex items-center bg-slate-800 rounded-lg p-1 border border-white/10 mr-4">
                            <Button variant="ghost" size="icon" onClick={decreaseFontSize} className="h-10 w-10 text-slate-300 hover:text-white hover:bg-white/10"><Minus className="h-6 w-6"/></Button>
                            <span className="text-xs font-bold text-slate-500 w-12 text-center uppercase">Boyut</span>
                            <Button variant="ghost" size="icon" onClick={increaseFontSize} className="h-10 w-10 text-slate-300 hover:text-white hover:bg-white/10"><Plus className="h-6 w-6"/></Button>
                        </div>

                        <Button variant="outline" asChild className="border-white/10 hover:bg-white/10 hover:text-white text-slate-300">
                            <Link href={backUrl}>
                                <ArrowLeft className="mr-2 h-5 w-5"/> Geri
                            </Link>
                        </Button>
                         <Button variant="outline" asChild className="border-white/10 hover:bg-white/10 hover:text-white text-slate-300 hidden sm:flex">
                            <Link href={`/teacher/ders-akisi/ozet/${topicId}?courseId=${courseId}&unitId=${unitId}`}>
                                <Wand2 className="mr-2 h-5 w-5" /> Düzenle
                            </Link>
                        </Button>
                        <Button variant="secondary" onClick={handleDownloadPDF} disabled={isDownloading} className="hidden sm:flex">
                            {isDownloading ? <Loader2 className="mr-2 h-5 w-5 animate-spin"/> : <Download className="mr-2 h-5 w-5" />}
                            PDF
                        </Button>
                        <FullscreenToggle elementRef={mainContentRef} className="h-11 w-11 bg-indigo-600 hover:bg-indigo-500 text-white border-0 shadow-lg shadow-indigo-900/50" />
                    </div>
                </div>
            </header>
            
            {/* Ana İçerik - Native Scroll */}
            <main className="flex-grow overflow-y-auto relative z-10 p-4 md:p-8 scroll-smooth pb-0">
                <Tabs defaultValue="kavramlar" className="w-full flex flex-col items-center">
                    
                    {/* Sekme Butonları (Sabit Değil, En Üstte) */}
                    <div className="flex justify-center mb-8 w-full">
                         <TabsList className="grid grid-cols-2 w-full max-w-lg bg-slate-900/90 border border-white/20 p-1.5 rounded-full h-16 shadow-2xl backdrop-blur-xl">
                            <TabsTrigger value="kavramlar" className="rounded-full text-lg font-bold data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-slate-400 transition-all">
                                KAVRAMLAR
                            </TabsTrigger>
                            <TabsTrigger value="notlar" className="rounded-full text-lg font-bold data-[state=active]:bg-amber-600 data-[state=active]:text-white text-slate-400 transition-all">
                                ÖNEMLİ NOTLAR
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="kavramlar" className="w-full mt-0 data-[state=inactive]:hidden animate-in fade-in zoom-in-95 duration-300 focus:outline-none">
                        {KavramlarContent}
                    </TabsContent>
                    <TabsContent value="notlar" className="w-full mt-0 data-[state=inactive]:hidden animate-in fade-in zoom-in-95 duration-300 focus:outline-none">
                        {NotlarContent}
                    </TabsContent>
                </Tabs>
            </main>

            {/* FLOATING ACTION BAR (ŞEFFAF VE ŞIK) */}
            <div className={cn(
                "fixed bottom-8 left-1/2 -translate-x-1/2 z-50 transition-all duration-500",
                isFullscreen ? "translate-y-0 opacity-100" : "translate-y-32 opacity-0 pointer-events-none"
            )}>
                 {/* DÜZELTME: Arka plan bg-black/20 yapıldı (şeffaf).
                     backdrop-blur-md ile buzlu cam etkisi verildi.
                     Kenarlık inceltildi ve hover efekti eklendi.
                 */}
                 <div className="flex items-center gap-2 p-2 rounded-full bg-black/20 border border-white/10 shadow-2xl backdrop-blur-md transition-all hover:bg-black/40">
                    <Button variant="ghost" size="icon" onClick={decreaseFontSize} className="h-12 w-12 rounded-full text-white hover:bg-white/10">
                        <Minus className="h-6 w-6"/>
                    </Button>
                    <div className="w-px h-6 bg-white/20 mx-1"></div>
                    <span className="text-xs font-bold text-slate-300 uppercase px-2 shadow-black drop-shadow-md">Boyut</span>
                    <div className="w-px h-6 bg-white/20 mx-1"></div>
                    <Button variant="ghost" size="icon" onClick={increaseFontSize} className="h-12 w-12 rounded-full text-white hover:bg-white/10">
                        <Plus className="h-6 w-6"/>
                    </Button>
                    <div className="w-px h-8 bg-white/30 mx-2"></div>
                    {/* Çıkış butonu belirgin kalsın diye kırmızı/şeffaf karışımı */}
                    <FullscreenToggle elementRef={mainContentRef} className="h-12 w-12 rounded-full bg-red-600/80 hover:bg-red-500 text-white border border-red-400/30 shadow-lg" />
                 </div>
            </div>

        </div>
    );
}
```
- src/app/teacher/smartboard/yazilacaklar/page.tsx:
```tsx
'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Book, Library, ListTodo, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Course, Unit, Topic, SchoolClass } from "@/lib/types";
import { SelectionGrid } from "@/components/selection-grid";
import { Loader2 } from "lucide-react";

const steps = [
  { id: 1, name: "Sınıf Seçimi", icon: <Users className="h-5 w-5" /> },
  { id: 2, name: "Ders Seçimi", icon: <Book className="h-5 w-5" /> },
  { id: 3, name: "Ünite Seçimi", icon: <Library className="h-5 w-5" /> },
  { id: 4, name: "Konu Seçimi", icon: <ListTodo className="h-5 w-5" /> },
];

export default function YazilacaklarSetupPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  
  const [selection, setSelection] = useState({
    classId: "",
    courseId: "",
    unitId: "",
    topicId: "",
  });
  
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        const [coursesSnapshot, classesSnapshot] = await Promise.all([
          getDocs(query(collection(db, "courses"), orderBy("title"))),
          getDocs(query(collection(db, "classes"), orderBy("createdAt", "asc")))
        ]);
        setAllCourses(coursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course)));
        setClasses(classesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolClass)));
      } catch (error) {
        console.error("Error fetching initial data: ", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  const handleNext = () => currentStep < steps.length && setCurrentStep(currentStep + 1);
  const handleBack = () => {
    if (currentStep > 1) {
        if (currentStep === 2) setSelection(s => ({...s, classId: ''}));
        if (currentStep === 3) setSelection(s => ({...s, courseId: ''}));
        if (currentStep === 4) setSelection(s => ({...s, unitId: ''}));
        setCurrentStep(currentStep - 1);
    }
  };

  const handleSelectClass = (classId: string) => {
    setSelection(prev => ({ ...prev, classId, courseId: '', unitId: '', topicId: '' }));
    
    const firstClassId = classes.length > 0 ? classes[0].id : null;
    const isFirstClass = classId === firstClassId;
    const applicableCourses = allCourses.filter(course => course.isSummerSchool !== true && (course.classId === classId || (!course.classId && isFirstClass)));
    setCourses(applicableCourses);
    setUnits([]);
    setTopics([]);
    handleNext();
  };

  const handleSelectCourse = async (courseId: string) => {
    setSelection(prev => ({ ...prev, courseId, unitId: '', topicId: '' }));
    setIsLoading(true);
    const unitsRef = collection(db, `courses/${courseId}/units`);
    const q = query(unitsRef, orderBy("title"));
    const unitsSnapshot = await getDocs(q);
    setUnits(unitsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Unit)));
    setTopics([]);
    setIsLoading(false);
    handleNext();
  };

  const handleSelectUnit = async (unitId: string) => {
    setSelection(prev => ({ ...prev, unitId, topicId: '' }));
    setIsLoading(true);
    const topicsRef = collection(db, `courses/${selection.courseId}/units/${unitId}/topics`);
    const q = query(topicsRef, orderBy("title"));
    const topicsSnapshot = await getDocs(q);
    setTopics(topicsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Topic)));
    setIsLoading(false);
    handleNext();
  };
  
  const handleSelectTopic = (topicId: string) => {
     router.push(`/teacher/smartboard/yazilacaklar/oyun?courseId=${selection.courseId}&unitId=${selection.unitId}&topicId=${topicId}`);
  };
  
  const renderContent = () => {
    if (isLoading && currentStep > 1) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-teal-400"/></div>
    }
    
    switch(currentStep) {
        case 1:
            return <SelectionGrid items={classes} selectedId={selection.classId} onSelect={handleSelectClass} titleKey="name" isLoading={isLoading} />;
        case 2:
            return <SelectionGrid items={courses} selectedId={selection.courseId} onSelect={handleSelectCourse} titleKey="title" isLoading={isLoading} />;
        case 3:
            return <SelectionGrid items={units} selectedId={selection.unitId} onSelect={handleSelectUnit} disabled={!selection.courseId} titleKey="title" isLoading={isLoading} />;
        case 4:
            return <SelectionGrid items={topics} selectedId={selection.topicId} onSelect={handleSelectTopic} disabled={!selection.unitId} titleKey="title" isLoading={isLoading} />;
        default:
            return null;
     }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center p-4 sm:p-6 md:p-8 relative overflow-hidden">
      
      {/* Arka Plan Efektleri */}
      <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-teal-600/10 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[120px] animate-pulse delay-1000" />
      </div>

      <div className="relative z-10 w-full max-w-5xl space-y-8">
        
        {/* Başlık Alanı */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-500 drop-shadow-sm">
            Yazılacaklar
          </h1>
          <p className="text-slate-400 text-lg">İçeriği tahtada göstermek için seçim yapın.</p>
        </div>

        {/* Stepper (Adım Göstergesi) */}
        <div className="flex justify-center items-center px-4 w-full">
            <div className="relative flex items-center justify-between w-full max-w-3xl">
                {/* Bağlantı Çizgisi */}
                <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-800 -z-10 rounded-full"></div>
                <div 
                    className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-teal-500 to-emerald-500 -z-10 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
                ></div>

                {steps.map((step, index) => {
                    const isCompleted = currentStep > step.id;
                    const isActive = currentStep === step.id;
                    
                    return (
                        <div key={step.id} className="flex flex-col items-center gap-2 group cursor-default">
                            <div className={cn(
                                "w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center border-4 transition-all duration-300 z-10 shadow-lg",
                                isActive 
                                    ? "bg-slate-900 border-teal-500 text-teal-400 scale-125 shadow-teal-500/50" 
                                    : isCompleted 
                                        ? "bg-emerald-600 border-emerald-600 text-white scale-110" 
                                        : "bg-slate-900 border-slate-700 text-slate-600"
                            )}>
                                {isCompleted ? <Check className="w-6 h-6 stroke-[3]" /> : step.icon}
                            </div>
                            <span className={cn(
                                "text-xs md:text-sm font-bold transition-colors duration-300 absolute -bottom-8 whitespace-nowrap",
                                isActive ? "text-teal-400" : isCompleted ? "text-emerald-500" : "text-slate-600"
                            )}>
                                {step.name}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>

        {/* Ana İçerik Kartı */}
        <div className="mt-12">
            <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden min-h-[500px] flex flex-col">
                <div className="p-6 border-b border-white/5 bg-slate-900/80 flex items-center justify-between">
                     <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 border border-teal-500/30">
                            {currentStep}
                        </span>
                        {steps.find(s => s.id === currentStep)?.name} Seçimi
                     </h2>
                     <div className="h-2 w-2 rounded-full bg-teal-500 animate-pulse shadow-[0_0_10px_#14b8a6]"></div>
                </div>

                <div className="flex-grow p-6 md:p-8 flex items-center justify-center bg-slate-950/30">
                     {renderContent()}
                </div>

                <div className="p-6 border-t border-white/5 bg-slate-900/80 flex justify-between items-center">
                    {currentStep === 1 ? (
                        <Button asChild variant="ghost" className="text-slate-400 hover:text-white hover:bg-white/10 h-12 px-6 rounded-xl">
                            <Link href="/teacher/smartboard">
                                <ArrowLeft className="mr-2 h-5 w-5" /> Akıllı Tahtaya Dön
                            </Link>
                        </Button>
                    ) : (
                        <Button 
                            variant="outline" 
                            onClick={handleBack}
                            className="border-white/10 text-slate-300 hover:text-white hover:bg-white/5 h-12 px-6 rounded-xl"
                        >
                            <ArrowLeft className="mr-2 h-5 w-5" /> Geri
                        </Button>
                    )}
                    
                    <div className="text-xs text-slate-500 font-mono">
                        Adım {currentStep} / {steps.length}
                    </div>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
}

```
- src/hooks/use-local-storage.ts:
```ts

import { useState, useEffect } from 'react';

// Client-side a özgü bir hook olduğu için 'use client' yönergesi ekleniyor.
// Bu, Next.js App Router'da bu hook'un sadece istemci bileşenlerinde kullanılmasını sağlar.
// 'use client';

function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
    const [storedValue, setStoredValue] = useState<T>(() => {
        // Bu hook sadece client'ta çalışmalı, bu yüzden window kontrolü ekliyoruz.
        if (typeof window === 'undefined') {
            return initialValue;
        }
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.error(`Error reading localStorage key “${key}”:`, error);
            return initialValue;
        }
    });

    useEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                const item = JSON.stringify(storedValue);
                window.localStorage.setItem(key, item);
            } catch (error) {
                console.error(`Error setting localStorage key “${key}”:`, error);
            }
        }
    }, [key, storedValue]);

    return [storedValue, setStoredValue];
}

export default useLocalStorage;

```
- src/hooks/use-selection.ts:
```ts

import { useState, useCallback } from 'react';

export const useSelection = () => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleSelectId = useCallback((id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback((idsToSelect: string[]) => {
    setSelectedIds(prev => {
      const currentOnPage = new Set(idsToSelect);
      const allSelectedOnPage = idsToSelect.length > 0 && idsToSelect.every(id => prev.has(id));

      const newSet = new Set(prev);
      if (allSelectedOnPage) {
        currentOnPage.forEach(id => newSet.delete(id));
      } else {
        currentOnPage.forEach(id => newSet.add(id));
      }
      return newSet;
    });
  }, []);

  const resetSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  return {
    selectedIds,
    handleSelectId,
    handleSelectAll,
    resetSelection,
  };
};

```
- src/hooks/use-sort.ts:
```ts

import { useState, useMemo } from 'react';

type SortDirection = 'asc' | 'desc';

export function useSort<T>(items: T[], initialSortColumn: keyof T, initialSortDirection: SortDirection = 'asc') {
  const [sortColumn, setSortColumn] = useState<keyof T | null>(initialSortColumn);
  const [sortDirection, setSortDirection] = useState<SortDirection>(initialSortDirection);

  const sortedItems = useMemo(() => {
    if (!sortColumn) {
      return items;
    }

    const sorted = [...items].sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return aValue.localeCompare(bValue, 'tr');
      }

      if (aValue < bValue) {
        return -1;
      }
      if (aValue > bValue) {
        return 1;
      }
      return 0;
    });

    return sortDirection === 'asc' ? sorted : sorted.reverse();
  }, [items, sortColumn, sortDirection]);

  const handleSort = (column: keyof T) => {
    if (sortColumn === column) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  return { sortedItems, sortColumn, sortDirection, handleSort };
}

```
- next-env.d.ts:
```ts
/// <reference types="next" />
/// <reference types="next/image-types/global" />

// NOTE: This file should not be edited
// see https://nextjs.org/docs/basic-features/typescript for more information.

```
- postcss.config.mjs:
```js
/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};

export default config;

```