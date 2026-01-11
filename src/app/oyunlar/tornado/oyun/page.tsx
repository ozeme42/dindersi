'use client';

import { useState, useEffect, useCallback, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getTornadoGameQuestions, submitTornadoScoreAction } from '../actions';
import type { Question } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Wind, PartyPopper, Repeat, Home, Check, AlertTriangle, Trophy, CheckCheck, Users, User, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { QuestionDialog } from '@/components/question-dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
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

    // Game Setup State
    const [teamCount, setTeamCount] = useState<number | null>(null);
    const [teams, setTeams] = useState<string[]>([]);

    // Game Logic State
    const [gameState, setGameState] = useState<'setup' | 'loading' | 'playing' | 'finished' | 'error'>('setup');
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

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // DEĞİŞİKLİK BURADA: Kullanıcı giriş yapmışsa oyun merkezine, yapmamışsa ana sayfaya yönlendirir.
    const exitLink = user ? '/oyunlar/tornado' : '/';

    useEffect(() => {
        const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

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

    const initGame = async (count: number) => {
        setTeamCount(count);
        setIsLoading(true);
        setError(null);
        
        // Tek kişilik modda kullanıcının adını kullan
        const generatedTeams = count > 1 
            ? ['A Takımı', 'B Takımı', 'C Takımı', 'D Takımı'].slice(0, count)
            : [user?.displayName || 'Oyuncu'];
        
        setTeams(generatedTeams);

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
            setIsLoading(false);
            return;
        }

        setSoruBankasi(result.questions);
        
        const initialPuanlar: Record<string, number> = {};
        generatedTeams.forEach(grup => { initialPuanlar[grup] = 0; });
        setPuanlar(initialPuanlar);

        const shuffledQuestions = [...result.questions].sort(() => 0.5 - Math.random());
        const questionCount = Math.min(SORU_SAYISI, shuffledQuestions.length);
        
        const sorular: KutuIcerik[] = shuffledQuestions.slice(0, questionCount).map(q => ({ type: 'soru', data: q }));
        const ozelKutuSayisi = KUTU_SAYISI - sorular.length;
        const specialBoxesToAdd = [...ozelKutular].sort(() => 0.5 - Math.random()).slice(0, ozelKutuSayisi);
        let icerikHavuzu: KutuIcerik[] = [...sorular, ...specialBoxesToAdd];
        
        while (icerikHavuzu.length < KUTU_SAYISI) {
            icerikHavuzu.push({ type: 'bos', mesaj: '⚪ Boş Kutu!', puan: 0, renk: '#a0aec0', ikon: '⚪' });
        }
        
        setKutuIcerikleri(icerikHavuzu.sort(() => Math.random() - 0.5));
        setSiraIndeksi(0);
        setAcilanKutular(new Set());
        setCezaliGruplar(new Set());
        setIsFinished(false);
        setIsSubmitting(false);
        setIsScoreSaved(false);
        setGameState('playing');
        setIsLoading(false);
    };

    const siraDegistir = useCallback((tekrarOyna = false) => {
        if (!teamCount || teamCount <= 1) {
            setIsProcessing(false);
            return;
        }

        if (tekrarOyna) {
            setIsProcessing(false);
            toast({ title: 'Şanslı Gün!', description: `${teams[siraIndeksi]} bir daha oynuyor!` });
            return;
        }
        
        let sonrakiSira = (siraIndeksi + 1) % teams.length;
        let denemeSayisi = 0;

        while (cezaliGruplar.has(teams[sonrakiSira]) && denemeSayisi < teams.length) {
            const cezaliGrup = teams[sonrakiSira];
            setCezaliGruplar(prev => {
                const newSet = new Set(prev);
                newSet.delete(cezaliGrup);
                return newSet;
            });
            toast({ title: 'Ceza Bitti', description: `${cezaliGrup}'nın cezası bitti, bir sonraki turda oyuna dönecek.` });
            sonrakiSira = (sonrakiSira + 1) % teams.length;
            denemeSayisi++;
        }
        
        setSiraIndeksi(sonrakiSira);
        setIsProcessing(false);

    }, [siraIndeksi, teams, cezaliGruplar, toast, teamCount]);

    const ozelKutuEtkisiUygula = useCallback((icerik: KutuIcerik) => {
        const aktifGrup = teams[siraIndeksi];
        setMesaj({ metin: icerik.mesaj, renk: icerik.renk });
        
        if (icerik.puan) {
            setPuanlar(prev => ({ ...prev, [aktifGrup]: Math.max(0, (prev[aktifGrup] || 0) + icerik.puan!) }));
        }

        let tekrarOyna = false;
        if (teamCount && teamCount > 1 && icerik.type === 'ekstra') {
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
    }, [teams, siraIndeksi, siraDegistir, toast, teamCount]);
    
    const handleAnswerQuestion = useCallback((questionNumber: number, isCorrect: boolean, scoreChange: number) => {
        setOpenedQuestion(null);
        
        setPuanlar(prevPuanlar => {
            const aktifGrup = teams[siraIndeksi];
            const pointsToAdd = isCorrect ? scoreChange : 0; 
            const newScore = Math.max(0, (prevPuanlar[aktifGrup] || 0) + pointsToAdd);
            return { ...prevPuanlar, [aktifGrup]: newScore };
        });
        
        setTimeout(() => {
            siraDegistir(false);
        }, 50);

    }, [siraIndeksi, teams, siraDegistir]);

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
    
    const handleFinishGame = useCallback(() => {
        const sortedScores = Object.entries(puanlar).sort(([, a], [, b]) => b - a);
        if (sortedScores.length > 0 && (sortedScores.length === 1 || sortedScores[0][1] > sortedScores[1][1])) {
            setWinner(sortedScores[0][0]);
        } else {
            setWinner(null);
        }
        setIsFinished(true);
        setGameState('finished');
    }, [puanlar]);

    useEffect(() => {
        if (gameState === 'playing' && acilanKutular.size >= KUTU_SAYISI) {
            handleFinishGame();
        }
    }, [acilanKutular, gameState, handleFinishGame]);
    
    const handleSaveAndExit = async () => {
        if (isSubmitting || isScoreSaved) {
             return;
        };

        const finalPuan = puanlar[teams[0]] || 0;
        
        if (user?.role !== 'student' || (teamCount && teamCount > 1)) {
            router.push(exitLink);
            return;
        }

        if (finalPuan <= 0) {
             toast({ title: "Puan Yok", description: "Puanınız 0 olduğu için kaydedilmedi.", variant: "default"});
             router.push(exitLink);
             return;
        }

        setIsSubmitting(true);
        const context = `Tornado - ${searchParams.get('topicName') || 'Genel'}`;
        
        const result = await submitTornadoScoreAction(user.uid, finalPuan, context);
        if (result.success) {
            toast({ title: "Başarılı!", description: "Puanların kaydedildi." });
            setIsScoreSaved(true);
        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive"});
            setIsSubmitting(false);
        }
    };

    if (gameState === 'setup') {
         return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
                <div className="fixed inset-0 pointer-events-none z-0">
                    <div className="absolute top-[-20%] left-[-10%] w-[1000px] h-[1000px] bg-indigo-900/10 rounded-full blur-[150px]" />
                    <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-purple-900/10 rounded-full blur-[150px]" />
                </div>
                
                <Card className="w-full max-w-lg bg-slate-900/80 backdrop-blur-xl border-white/10 shadow-2xl relative z-10">
                    <CardHeader className="text-center pb-2">
                        <div className="mx-auto p-4 bg-indigo-500/20 rounded-full border border-indigo-500/30 mb-4 shadow-lg shadow-indigo-500/20">
                            <Wind className="h-12 w-12 text-indigo-400" />
                        </div>
                        <CardTitle className="text-3xl font-black text-white uppercase tracking-tight">Tornado</CardTitle>
                        <CardDescription className="text-slate-400 font-medium">Kaç takım yarışacak?</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4 p-6">
                        <Button onClick={() => initGame(1)} variant="outline" className="h-32 flex flex-col gap-3 border-2 border-white/10 bg-slate-900 text-white hover:bg-cyan-600 hover:border-cyan-500 hover:text-white transition-all group shadow-lg">
                            <User className="h-10 w-10 text-cyan-400 group-hover:text-white transition-colors" />
                            <span className="font-black text-xl tracking-wide">1 Kişilik</span>
                            <span className="text-xs opacity-60 font-medium group-hover:text-cyan-100">Puan Kaydedilir</span>
                        </Button>
                         <Button onClick={() => initGame(2)} variant="outline" className="h-32 flex flex-col gap-3 border-2 border-white/10 bg-slate-900 text-white hover:bg-purple-600 hover:border-purple-500 hover:text-white transition-all group shadow-lg">
                            <Users className="h-10 w-10 text-purple-400 group-hover:text-white" />
                            <span className="font-black text-xl tracking-wide">2 Takım</span>
                        </Button>
                         <Button onClick={() => initGame(3)} variant="outline" className="h-32 flex flex-col gap-3 border-2 border-white/10 bg-slate-900 text-white hover:bg-emerald-600 hover:border-emerald-500 hover:text-white transition-all group shadow-lg">
                             <Users className="h-10 w-10 text-emerald-400 group-hover:text-white" />
                            <span className="font-black text-xl tracking-wide">3 Takım</span>
                        </Button>
                         <Button onClick={() => initGame(4)} variant="outline" className="h-32 flex flex-col gap-3 border-2 border-white/10 bg-slate-900 text-white hover:bg-orange-600 hover:border-orange-500 hover:text-white transition-all group shadow-lg">
                             <Users className="h-10 w-10 text-orange-400 group-hover:text-white" />
                            <span className="font-black text-xl tracking-wide">4 Takım</span>
                        </Button>
                    </CardContent>
                    <CardFooter className="justify-center border-t border-white/5 pt-4">
                        <Button asChild variant="ghost" className="text-slate-400 hover:text-white hover:bg-white/5">
                            {/* DEĞİŞİKLİK: exitLink kullanıldı */}
                            <Link href={exitLink}><ArrowLeft className="mr-2 h-4 w-4"/> İptal</Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
         )
    }

    if (isLoading) {
        return <div className="flex h-screen items-center justify-center bg-slate-950"><Loader2 className="h-12 w-12 animate-spin text-indigo-500" /> <span className="ml-3 text-white font-bold animate-pulse">Tornado Hazırlanıyor...</span></div>;
    }

    if (error) {
        return (
            <div className={cn("w-full h-full min-h-screen flex items-center justify-center p-4 bg-slate-950")}>
                <Alert variant="destructive" className="max-w-lg bg-red-950/50 border-red-500/50 text-red-200">
                    <AlertTitle>Hata!</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                    {/* DEĞİŞİKLİK: exitLink kullanıldı */}
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
                            {teamCount && teamCount > 1 ? (
                                winner ? (
                                    <>
                                        <p className="text-lg text-slate-300 font-medium uppercase tracking-widest">KAZANAN</p>
                                        <p className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 drop-shadow-sm">{winner}</p>
                                    </>
                                ) : <p className="text-3xl font-black text-slate-300">BERABERE!</p>
                            ) : (
                                <>
                                    <p className="text-lg text-slate-300 font-medium uppercase tracking-widest">TOPLAM PUAN</p>
                                    <p className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 drop-shadow-sm">{puanlar[teams[0]]}</p>
                                </>
                            )}
                        </div>
                        
                         <div className="bg-slate-950/50 rounded-xl border border-white/5 p-4">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Puan Tablosu</h4>
                            <div className="space-y-2">
                                {Object.entries(puanlar).sort(([,a],[,b]) => b-a).map(([grup, puan], i) => (
                                    <div key={grup} className="flex justify-between items-center p-3 rounded-lg bg-slate-900 border border-white/5 hover:bg-white/5 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <span className={cn("font-black text-lg w-6 text-center", i === 0 ? "text-yellow-400" : "text-slate-500")}>{i + 1}</span>
                                            <span className="font-medium text-white">{grup}</span>
                                        </div>
                                        <span className="font-bold text-emerald-400">{puan}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="flex-col sm:flex-row justify-center gap-4 bg-black/20 p-6 border-t border-white/5">
                         <Button onClick={() => setGameState('setup')} size="lg" className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-900/20">
                             <Repeat className="mr-2 h-5 w-5" /> Tekrar Oyna
                         </Button>
                         <Button asChild variant="outline" size="lg" className="w-full sm:w-auto border-white/10 text-slate-300 hover:text-white hover:bg-white/5 bg-transparent">
                             {/* DEĞİŞİKLİK: exitLink kullanıldı */}
                             <Link href={exitLink}><Home className="mr-2 h-5 w-5" /> Çıkış</Link>
                         </Button>
                         
                         {/* Sadece Tek Kişilik Modda Kaydet Butonu Göster */}
                         {teamCount === 1 && !isScoreSaved && (
                            <Button onClick={handleSaveAndExit} disabled={isSubmitting} size="lg" className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-900/20">
                                {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin"/> : <Save className="mr-2 h-5 w-5"/>} 
                                Puanı Kaydet
                            </Button>
                         )}
                         {teamCount === 1 && isScoreSaved && (
                             <Button disabled size="lg" className="w-full sm:w-auto bg-emerald-800/50 text-white/50 font-bold border border-emerald-500/20">
                                <Check className="mr-2 h-5 w-5"/> Kaydedildi
                             </Button>
                         )}
                    </CardFooter>
                </Card>
            </div>
        );
    }
    
    return (
        <div className={cn("w-full h-full min-h-screen bg-slate-950 font-sans text-slate-100 flex flex-col relative overflow-hidden", isFullscreen ? "p-4" : "p-4 sm:p-6 md:p-8")}>
            
            {/* Arka Plan */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[1000px] h-[1000px] bg-indigo-900/10 rounded-full blur-[150px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-purple-900/10 rounded-full blur-[150px]" />
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.03]" />
            </div>

            <div className="w-full max-w-7xl mx-auto relative z-10 flex-grow flex flex-col">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4 border-b border-white/5 pb-4">
                    <div className="flex items-center gap-3">
                         <div className="p-2 bg-indigo-500/20 rounded-lg border border-indigo-500/30">
                            <Wind className="h-6 w-6 text-indigo-400" />
                        </div>
                        <div>
                             <h1 className="text-2xl font-black text-white tracking-tight uppercase">Tornado</h1>
                             <p className="text-xs text-slate-400 font-medium">{acilanKutular.size} / {KUTU_SAYISI} kutu açıldı.</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        {/* Manuel Bitirme Butonu */}
                        <Button variant="destructive" size="sm" onClick={handleFinishGame}>Oyunu Bitir</Button>
                        <FullscreenToggle />
                    </div>
                </div>
                
                {/* Scoreboard Area */}
                <div className="mb-6">
                    {teamCount === 1 ? (
                         <div className="flex justify-center">
                            <div className="bg-slate-900/60 backdrop-blur-md px-8 py-3 rounded-2xl border border-teal-500/30 shadow-lg flex items-center gap-4">
                                <span className="text-slate-400 text-sm font-bold uppercase tracking-widest">SKOR</span>
                                <span className="text-4xl font-black text-white tabular-nums drop-shadow-md">{puanlar[teams[0]] || 0}</span>
                            </div>
                        </div>
                    ) : (
                        <div className={cn("grid gap-4", `grid-cols-2 md:grid-cols-${Math.min(teams.length, 4)}`)}>
                            {teams.map((grup, index) => {
                                const colors = ['border-blue-500 bg-blue-500/10', 'border-purple-500 bg-purple-500/10', 'border-emerald-500 bg-emerald-500/10', 'border-orange-500 bg-orange-500/10'];
                                const textColors = ['text-blue-400', 'text-purple-400', 'text-emerald-400', 'text-orange-400'];
                                const isActive = teams[siraIndeksi] === grup && !cezaliGruplar.has(grup);
                                
                                return (
                                    <div key={grup} 
                                        className={cn(
                                            "text-center p-3 rounded-xl border transition-all duration-300",
                                            colors[index % colors.length],
                                            isActive ? "ring-2 ring-white scale-105 shadow-lg z-10" : "opacity-70 border-transparent bg-slate-900/50"
                                        )}
                                    >
                                        <div className="flex items-center justify-center gap-2 mb-1">
                                            {isActive && <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                                            </span>}
                                            <span className={cn("text-sm font-bold uppercase tracking-wider", textColors[index % textColors.length])}>{grup}</span>
                                        </div>
                                        <span className="text-3xl font-black block text-white drop-shadow-md">{puanlar[grup] || 0}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Game Grid */}
                <Card className="bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-2xl flex-grow flex flex-col overflow-hidden">
                    <CardContent className="p-6 overflow-y-auto flex-grow min-h-[300px] pb-24">
                        <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
                            {Array.from({ length: KUTU_SAYISI }).map((_, i) => {
                                const kutucukNo = i + 1;
                                const isOpened = acilanKutular.has(kutucukNo);
                                return (
                                    <div 
                                        key={kutucukNo}
                                        id={`kutucuk-${kutucukNo}`}
                                        onClick={() => kutucukSecildi(i)}
                                        className={cn(
                                            "aspect-square rounded-xl flex items-center justify-center text-xl md:text-2xl font-black text-white cursor-pointer shadow-lg transition-all duration-500 relative overflow-hidden group border-b-[4px] active:border-b-0 active:translate-y-[4px]",
                                            isOpened 
                                                ? "bg-slate-900 border-slate-800 text-slate-700 shadow-none scale-95 opacity-50 cursor-default" 
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
                            <AlertDialogTitle className="text-center text-3xl font-black" style={{color: mesaj.renk}}>
                                <div dangerouslySetInnerHTML={{ __html: mesaj.metin }} />
                            </AlertDialogTitle>
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
    return <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-950"><Loader2 className="h-12 w-12 animate-spin text-purple-500" /></div>}><TornadoGame/></Suspense>
}