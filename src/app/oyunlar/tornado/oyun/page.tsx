'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getTornadoGameQuestions, submitTornadoScoreAction } from '../actions';
import type { Question } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Wind, Repeat, Home, Check, Trophy, CheckCheck, Users, User, Save, Sparkles, Layers, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { QuestionDialog } from '@/components/question-dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { getGameBackUrl, getTeacherActivitiesUrl } from '@/lib/game-navigation';
import { WordwallShell, useWordwall } from '@/components/wordwall/wordwall-shell';
import { GameEndScreen } from '@/components/game-end-screen';

const KUTU_SAYISI = 30;
const SORU_SAYISI = 15;

type KutuIcerik =
    | { type: 'soru'; data: Question }
    | { type: 'bos'; mesaj: string; puan: number; renk: string; ikon: string; }
    | { type: 'odul'; mesaj: string; puan: number; renk: string; ikon: string; }
    | { type: 'ceza'; mesaj: string; puan: number; renk: string; ikon: string; }
    | { type: 'ekstra'; mesaj: string; efekt: 'PAS' | 'TEKRAR_OYNA' | 'BIR_TUR_BEKLE'; renk: string; ikon: string; };

const OZEL_KUTULAR: KutuIcerik[] = [
    { type: 'bos', mesaj: '⚪ Boş Kutu!', puan: 0, renk: '#94a3b8', ikon: '⚪' },
    { type: 'bos', mesaj: '⚪ Boş Kutu!', puan: 0, renk: '#94a3b8', ikon: '⚪' },
    { type: 'bos', mesaj: '⚪ Boş Kutu!', puan: 0, renk: '#94a3b8', ikon: '⚪' },
    { type: 'odul', mesaj: '⭐ +15 Puan!', puan: 15, renk: '#eab308', ikon: '⭐' },
    { type: 'odul', mesaj: '⭐ +15 Puan!', puan: 15, renk: '#eab308', ikon: '⭐' },
    { type: 'odul', mesaj: '⭐ +15 Puan!', puan: 15, renk: '#eab308', ikon: '⭐' },
    { type: 'odul', mesaj: '🌟 +25 Puan!', puan: 25, renk: '#f59e0b', ikon: '🌟' },
    { type: 'odul', mesaj: '🌟 +25 Puan!', puan: 25, renk: '#f59e0b', ikon: '🌟' },
    { type: 'ceza', mesaj: '❗ -10 Puan!', puan: -10, renk: '#ef4444', ikon: '❗' },
    { type: 'ceza', mesaj: '❗ -10 Puan!', puan: -10, renk: '#ef4444', ikon: '❗' },
    { type: 'ceza', mesaj: '❗ -10 Puan!', puan: -10, renk: '#ef4444', ikon: '❗' },
    { type: 'ceza', mesaj: '💥 -20 Puan!', puan: -20, renk: '#dc2626', ikon: '💥' },
    { type: 'ceza', mesaj: '💥 -20 Puan!', puan: -20, renk: '#dc2626', ikon: '💥' },
    { type: 'ekstra', mesaj: '⏩ Pas!', efekt: 'PAS', renk: '#94a3b8', ikon: '⏩' },
    { type: 'ekstra', mesaj: '🔄 Tekrar Oyna!', efekt: 'TEKRAR_OYNA', renk: '#06b6d4', ikon: '🔄' },
    { type: 'ekstra', mesaj: '🛑 Bir Tur Bekle!', efekt: 'BIR_TUR_BEKLE', renk: '#f43f5e', ikon: '🛑' },
];

function TornadoBoard({
    gameState,
    teamCount,
    teams,
    puanlar,
    siraIndeksi,
    acilanKutular,
    cezaliGruplar,
    kutucukSecildi,
    handleFinishGame,
    initGame,
    setGameState,
    exitLink,
    user,
    searchParams,
    isSubmitting,
    isScoreSaved,
    handleSaveAndExit,
    winner,
}: {
    gameState: 'setup' | 'loading' | 'playing' | 'finished' | 'error';
    teamCount: number | null;
    teams: string[];
    puanlar: Record<string, number>;
    siraIndeksi: number;
    acilanKutular: Set<number>;
    cezaliGruplar: Set<string>;
    kutucukSecildi: (index: number) => void;
    handleFinishGame: () => void;
    initGame: (count: number) => void;
    setGameState: (state: 'setup' | 'loading' | 'playing' | 'finished' | 'error') => void;
    exitLink: string;
    user: any;
    searchParams: any;
    isSubmitting: boolean;
    isScoreSaved: boolean;
    handleSaveAndExit: () => void;
    winner: string | null;
}) {
    const { theme } = useWordwall();
    const router = useRouter();

    if (gameState === 'setup') {
        return (
            <div className="w-full h-full flex items-center justify-center p-4">
                <div className={cn("w-full max-w-lg p-6 sm:p-8 rounded-2xl border-2 shadow-2xl backdrop-blur-xl text-center", theme.cardBg, theme.cardBorder, theme.cardText)}>
                    <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-indigo-500/20 border border-indigo-500/30">
                        <Wind className="h-8 w-8 text-indigo-400" />
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight mb-2">Tornado</h2>
                    <p className={cn("text-sm sm:text-base font-medium mb-6", theme.subText)}>Kaç takım veya kişi yarışacak?</p>
                    
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6">
                        <button 
                            onClick={() => initGame(1)} 
                            className={cn(
                                "h-28 sm:h-32 flex flex-col items-center justify-center gap-2 rounded-xl border-2 font-black transition-all hover:scale-105 active:scale-95 shadow-md",
                                theme.buttonIdle,
                                theme.cardText
                            )}
                        >
                            <User className="h-8 w-8 text-cyan-400" />
                            <span className="text-base sm:text-lg">1 Kişilik</span>
                            <span className="text-[11px] opacity-70 font-semibold">Puan Kaydedilir</span>
                        </button>
                        <button 
                            onClick={() => initGame(2)} 
                            className={cn(
                                "h-28 sm:h-32 flex flex-col items-center justify-center gap-2 rounded-xl border-2 font-black transition-all hover:scale-105 active:scale-95 shadow-md",
                                theme.buttonIdle,
                                theme.cardText
                            )}
                        >
                            <Users className="h-8 w-8 text-purple-400" />
                            <span className="text-base sm:text-lg">2 Takım</span>
                            <span className="text-[11px] opacity-70 font-semibold">Grup Düellosu</span>
                        </button>
                        <button 
                            onClick={() => initGame(3)} 
                            className={cn(
                                "h-28 sm:h-32 flex flex-col items-center justify-center gap-2 rounded-xl border-2 font-black transition-all hover:scale-105 active:scale-95 shadow-md",
                                theme.buttonIdle,
                                theme.cardText
                            )}
                        >
                            <Users className="h-8 w-8 text-emerald-400" />
                            <span className="text-base sm:text-lg">3 Takım</span>
                            <span className="text-[11px] opacity-70 font-semibold">Sınıf Mücadelesi</span>
                        </button>
                        <button 
                            onClick={() => initGame(4)} 
                            className={cn(
                                "h-28 sm:h-32 flex flex-col items-center justify-center gap-2 rounded-xl border-2 font-black transition-all hover:scale-105 active:scale-95 shadow-md",
                                theme.buttonIdle,
                                theme.cardText
                            )}
                        >
                            <Users className="h-8 w-8 text-amber-400" />
                            <span className="text-base sm:text-lg">4 Takım</span>
                            <span className="text-[11px] opacity-70 font-semibold">Büyük Turnuva</span>
                        </button>
                    </div>

                    <Button asChild variant="ghost" className="text-slate-400 hover:text-white">
                        <Link href={exitLink}><Home className="mr-2 h-4 w-4"/> Ana Sayfaya Dön</Link>
                    </Button>
                </div>
            </div>
        );
    }

    if (gameState === 'finished') {
        const sortedScores = Object.entries(puanlar).sort(([, a], [, b]) => b - a);
        return (
            <div className="w-full h-full flex items-center justify-center p-4">
                <div className={cn("w-full max-w-lg p-6 sm:p-8 rounded-2xl border-2 shadow-2xl backdrop-blur-xl text-center", theme.cardBg, theme.cardBorder, theme.cardText)}>
                    <Trophy className="h-16 w-16 mx-auto text-amber-400 animate-bounce mb-3" />
                    <h2 className="text-3xl font-black uppercase tracking-wider mb-2">Oyun Bitti!</h2>

                    <div className="my-4">
                        {teamCount && teamCount > 1 ? (
                            winner ? (
                                <div>
                                    <p className={cn("text-xs font-bold uppercase tracking-widest mb-1", theme.subText)}>KAZANAN TAKIM</p>
                                    <p className="text-3xl sm:text-4xl font-black text-amber-400">{winner}</p>
                                </div>
                            ) : (
                                <p className="text-2xl font-black text-amber-400">BERABERE!</p>
                            )
                        ) : (
                            <div>
                                <p className={cn("text-xs font-bold uppercase tracking-widest mb-1", theme.subText)}>TOPLAM PUAN</p>
                                <p className="text-4xl sm:text-5xl font-black text-emerald-400">{puanlar[teams[0]] || 0}</p>
                            </div>
                        )}
                    </div>

                    {/* Skor Tablosu */}
                    <div className={cn("rounded-xl border p-3.5 mb-6 text-left space-y-2", theme.subPanelBg, theme.cardBorder)}>
                        <h4 className={cn("text-xs font-bold uppercase tracking-wider mb-2", theme.subText)}>Puan Sıralaması</h4>
                        {sortedScores.map(([grup, puan], i) => (
                            <div key={grup} className={cn("flex justify-between items-center p-2.5 rounded-lg border", theme.cardBg, theme.cardBorder)}>
                                <div className="flex items-center gap-2.5">
                                    <span className={cn("font-black text-base w-5 text-center", i === 0 ? "text-amber-400" : "opacity-60")}>
                                        {i + 1}
                                    </span>
                                    <span className="font-bold text-sm sm:text-base">{grup}</span>
                                </div>
                                <span className="font-black text-emerald-400 text-base sm:text-lg">{puan}</span>
                            </div>
                        ))}
                    </div>

                    <div className="flex flex-col sm:flex-row justify-center gap-3">
                        <Button 
                            onClick={() => setGameState('setup')} 
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-12 rounded-xl flex-1 shadow-md"
                        >
                            <Repeat className="mr-2 h-4 w-4" /> Tekrar Oyna
                        </Button>
                        
                        {teamCount === 1 && !isScoreSaved && (
                            <Button 
                                onClick={handleSaveAndExit} 
                                disabled={isSubmitting} 
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 rounded-xl flex-1 shadow-md"
                            >
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>} 
                                Puanı Kaydet
                            </Button>
                        )}
                        {teamCount === 1 && isScoreSaved && (
                            <Button disabled className="bg-emerald-800/50 text-white/60 font-bold h-12 rounded-xl flex-1 border border-emerald-500/30">
                                <Check className="mr-2 h-4 w-4"/> Kaydedildi
                            </Button>
                        )}

                        <Button 
                            variant="outline" 
                            className={cn("h-12 rounded-xl font-bold border", theme.cardBorder, theme.cardText)} 
                            onClick={() => router.push(exitLink)}
                        >
                            <Home className="mr-2 h-4 w-4" /> Çıkış
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full flex flex-col min-h-0 overflow-hidden relative select-none">
            {/* Skor Paneli */}
            <div className="shrink-0 mb-3">
                {teamCount === 1 ? (
                    <div className="flex items-center justify-between px-2 sm:px-4 py-2">
                        <div className={cn("px-5 py-2 rounded-xl border shadow-md flex items-center gap-3", theme.subPanelBg, theme.cardBorder)}>
                            <span className={cn("text-xs font-bold uppercase tracking-wider", theme.subText)}>Puanınız:</span>
                            <span className="text-2xl sm:text-3xl font-black text-amber-400 tabular-nums">{puanlar[teams[0]] || 0}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={cn("text-xs font-medium px-3 py-1.5 rounded-lg border", theme.subPanelBg, theme.cardBorder, theme.subText)}>
                                {acilanKutular.size} / {KUTU_SAYISI} Kutu Açıldı
                            </span>
                            <Button variant="destructive" size="sm" onClick={handleFinishGame} className="h-8 text-xs font-bold rounded-lg">
                                Bitir
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-2">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-1">
                            {teams.map((grup, index) => {
                                const isActive = teams[siraIndeksi] === grup && !cezaliGruplar.has(grup);
                                return (
                                    <div 
                                        key={grup} 
                                        className={cn(
                                            "text-center p-2.5 rounded-xl border transition-all duration-300",
                                            theme.subPanelBg,
                                            theme.cardBorder,
                                            isActive ? "ring-2 ring-amber-400 scale-[1.02] shadow-lg" : "opacity-75"
                                        )}
                                    >
                                        <div className="flex items-center justify-center gap-1.5 mb-0.5">
                                            {isActive && <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />}
                                            <span className="text-xs font-bold uppercase tracking-wider truncate">{grup}</span>
                                        </div>
                                        <span className="text-xl sm:text-2xl font-black block text-amber-400">{puanlar[grup] || 0}</span>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="flex items-center justify-between px-2">
                            <span className={cn("text-xs font-semibold", theme.subText)}>
                                {acilanKutular.size} / {KUTU_SAYISI} Kutu Açıldı
                            </span>
                            <Button variant="destructive" size="sm" onClick={handleFinishGame} className="h-7 text-xs font-bold rounded-lg">
                                Oyunu Bitir
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Kutular Tablosu (30 Kutu) */}
            <div className={cn("flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 rounded-2xl border-2 shadow-inner", theme.cardBg, theme.cardBorder)}>
                <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-10 gap-2 sm:gap-3 max-w-5xl mx-auto">
                    {Array.from({ length: KUTU_SAYISI }).map((_, i) => {
                        const kutucukNo = i + 1;
                        const isOpened = acilanKutular.has(kutucukNo);
                        return (
                            <button
                                key={kutucukNo}
                                id={`kutucuk-${kutucukNo}`}
                                onClick={() => kutucukSecildi(i)}
                                disabled={isOpened}
                                className={cn(
                                    "aspect-square rounded-xl flex items-center justify-center text-lg sm:text-xl md:text-2xl font-black transition-all duration-300 border-2 shadow-md relative overflow-hidden",
                                    isOpened 
                                        ? "opacity-30 cursor-default border-dashed border-slate-600 bg-black/20" 
                                        : cn("hover:scale-105 active:scale-95 cursor-pointer", theme.buttonIdle, theme.cardText, theme.cardBorder)
                                )}
                            >
                                {isOpened ? (
                                    <CheckCheck className="h-6 w-6 text-emerald-400" />
                                ) : (
                                    <span>{kutucukNo}</span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

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
    const [mesaj, setMesaj] = useState<{ metin: string; renk: string } | null>(null);
    const [winner, setWinner] = useState<string | null>(null);
    
    const [isFinished, setIsFinished] = useState(false); 
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isScoreSaved, setIsScoreSaved] = useState(false);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const exitLink = getGameBackUrl({ user, searchParams, defaultBackUrl: '/oyunlar/tornado' });
    const topicName = searchParams.get('topicName') || searchParams.get('title') || undefined;

    const initGame = async (count: number) => {
        setTeamCount(count);
        setIsLoading(true);
        setError(null);
        
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

        if (result.error || (result.questions && result.questions.length < 5)) {
            setError(result.error || `Bu oyun için yeterli soru bulunamadı (En az 5 gerekli).`);
            setGameState('error');
            setIsLoading(false);
            return;
        }

        const questions = result.questions || [];
        setSoruBankasi(questions);
        
        const initialPuanlar: Record<string, number> = {};
        generatedTeams.forEach(grup => { initialPuanlar[grup] = 0; });
        setPuanlar(initialPuanlar);

        const shuffledQuestions = [...questions].sort(() => 0.5 - Math.random());
        const questionCount = Math.min(SORU_SAYISI, shuffledQuestions.length);
        
        const sorular: KutuIcerik[] = shuffledQuestions.slice(0, questionCount).map(q => ({ type: 'soru', data: q }));
        const ozelKutuSayisi = KUTU_SAYISI - sorular.length;
        const specialBoxesToAdd = [...OZEL_KUTULAR].sort(() => 0.5 - Math.random()).slice(0, ozelKutuSayisi);
        let icerikHavuzu: KutuIcerik[] = [...sorular, ...specialBoxesToAdd];
        
        while (icerikHavuzu.length < KUTU_SAYISI) {
            icerikHavuzu.push({ type: 'bos', mesaj: '⚪ Boş Kutu!', puan: 0, renk: '#94a3b8', ikon: '⚪' });
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
        if (icerik.type === 'soru') return;
        const aktifGrup = teams[siraIndeksi];
        setMesaj({ metin: icerik.mesaj, renk: icerik.renk });
        
        if ('puan' in icerik && icerik.puan) {
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
        }

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

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-950">
                <Loader2 className="h-12 w-12 animate-spin text-indigo-500" /> 
                <span className="ml-3 text-white font-bold animate-pulse">Tornado Hazırlanıyor...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="w-full h-full min-h-screen flex items-center justify-center p-4 bg-slate-950">
                <Alert variant="destructive" className="max-w-lg bg-red-950/50 border-red-500/50 text-red-200">
                    <AlertTitle>Hata!</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                    <div className="mt-4">
                        <Button asChild variant="outline" className="border-white/10 text-white hover:bg-white/10">
                            <Link href={exitLink}><Home className="mr-2 h-4 w-4"/>Geri Dön</Link>
                        </Button>
                    </div>
                </Alert>
            </div>
        );
    }

    const currentScore = teamCount === 1 ? (puanlar[teams[0]] || 0) : Math.max(0, ...Object.values(puanlar));

    return (
        <WordwallShell
            title="Tornado"
            subtitle={topicName || (teamCount && teamCount > 1 ? `${teamCount} Takım Yarışı` : 'Gizemli Kutular')}
            score={currentScore}
            backUrl={exitLink}
            isFinished={isFinished}
            fitToScreen={true}
            contentClassName="w-full h-full min-h-0 overflow-hidden relative flex flex-col p-2 sm:p-4"
        >
            <TornadoBoard
                gameState={gameState}
                teamCount={teamCount}
                teams={teams}
                puanlar={puanlar}
                siraIndeksi={siraIndeksi}
                acilanKutular={acilanKutular}
                cezaliGruplar={cezaliGruplar}
                kutucukSecildi={kutucukSecildi}
                handleFinishGame={handleFinishGame}
                initGame={initGame}
                setGameState={setGameState}
                exitLink={exitLink}
                user={user}
                searchParams={searchParams}
                isSubmitting={isSubmitting}
                isScoreSaved={isScoreSaved}
                handleSaveAndExit={handleSaveAndExit}
                winner={winner}
            />

            {/* Message Dialog */}
            {mesaj && (
                 <AlertDialog open={!!mesaj}>
                    <AlertDialogContent className="bg-slate-900 border-white/10 text-white max-w-sm rounded-2xl shadow-2xl">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-center text-2xl sm:text-3xl font-black py-4" style={{ color: mesaj.renk }}>
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
        </WordwallShell>
    );
}

export default function StudentTornadoOyunPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-950"><Loader2 className="h-12 w-12 animate-spin text-purple-500" /></div>}>
            <TornadoGame/>
        </Suspense>
    );
}