'use client';

import { useState, useEffect, useMemo, useCallback, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getAcikUcluCevaplaAction, submitAcikUcluCevaplaScoreAction } from '../actions';
import { useAuth } from '@/context/auth-context';
import type { Question } from '@/lib/types';
import { Loader2, ArrowLeft, CheckCircle2, AlertTriangle, Send, XCircle, Lightbulb, Trophy, Sparkles, XOctagon, PenTool, Pencil, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { playSound } from '@/lib/audio-service';
import { GameEndScreen } from '@/components/game-end-screen';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { FullscreenToggle } from '@/components/fullscreen-toggle';
import Link from 'next/link';

// --- ORTAK ARKA PLAN (Light Theme) ---
const MagnificentLightBackground = () => (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-slate-50">
        <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-indigo-200/40 rounded-full blur-[120px] animate-pulse-slow mix-blend-multiply" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-sky-200/40 rounded-full blur-[120px] animate-pulse-slow delay-700 mix-blend-multiply" />
        <div className="absolute top-[40%] left-[50%] w-[400px] h-[400px] bg-purple-200/30 rounded-full blur-[100px] animate-pulse-slow delay-1000 mix-blend-multiply" />
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.015] mix-blend-overlay"></div>
    </div>
);

const OpenEndedGame = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();

    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [gameState, setGameState] = useState<'loading' | 'playing' | 'finished' | 'error'>('loading');
    const [error, setError] = useState<string | null>(null);
    const [score, setScore] = useState(0);
    const [userAnswer, setUserAnswer] = useState('');
    const [isAnswered, setIsAnswered] = useState(false);
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isScoreSaved, setIsScoreSaved] = useState(false);
    
    // Fullscreen & Refs
    const mainContentRef = useRef<HTMLDivElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const gameContext = useMemo(() => ({
        courseName: searchParams.get('courseName') || 'Bilinmeyen Ders',
        unitName: searchParams.get('unitName') || 'Bilinmeyen Ünite',
        topicName: searchParams.get('topicName') || 'Bilinmeyen Konu',
    }), [searchParams]);
    
    const contextString = `Açık Uçlu Cevaplama - ${gameContext.courseName} > ${gameContext.topicName}`;
    
    const backUrl = useMemo(() => {
        const courseId = searchParams.get('courseId');
        const unitId = searchParams.get('unitId');
        const topicId = searchParams.get('topicId');
        if (courseId && unitId && topicId) {
             const params = new URLSearchParams({
                courseName: gameContext.courseName,
                unitName: gameContext.unitName,
                topicName: gameContext.topicName,
            });
            return `/konu/${courseId}/${unitId}/${topicId}?${params.toString()}`;
        }
        return '/';
    }, [searchParams, gameContext]);


    const fetchQuestions = useCallback(async () => {
        setGameState('loading');
        const params = {
            courseId: searchParams.get('courseId') || undefined,
            unitId: searchParams.get('unitId') || undefined,
            topicId: searchParams.get('topicId') || undefined,
        };
        const { questions: fetchedQuestions, error: fetchError } = await getAcikUcluCevaplaAction(params);

        if (fetchError) {
            setError(fetchError);
             setGameState('error');
        } else if (fetchedQuestions.length > 0) {
            setQuestions(fetchedQuestions as Question[]);
            setGameState('playing');
        } else {
            setError("Bu kriterlere uygun soru bulunamadı.");
            setGameState('error');
        }
    }, [searchParams]);


    useEffect(() => {
        fetchQuestions();
    }, [fetchQuestions]);

    // --- YARDIMCI FONKSİYON: Cevabı Normalize Et ---
    const normalizeAnswer = (text: string) => {
        if (!text) return "";
        return text
            .toLocaleLowerCase('tr-TR') // Türkçe küçük harfe çevir (İ->i, I->ı)
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Şapka ve aksanları kaldır (â->a, û->u, ş->s vb. esneklik sağlar)
            .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()'"?]/g,"") // Noktalama işaretlerini temizle
            .replace(/\s+/g, ' ') // Birden fazla boşluğu teke indir
            .trim(); // Baştaki ve sondaki boşlukları sil
    };

    const handleSubmitAnswer = () => {
        if (!userAnswer.trim() || isAnswered) return;
        
        const currentQuestion = questions[currentQuestionIndex];
        
        // Hem doğru cevabı hem kullanıcı cevabını normalize et
        const normalizedCorrectAnswer = normalizeAnswer(currentQuestion.correctAnswer || '');
        const normalizedUserAnswer = normalizeAnswer(userAnswer);
        
        // Karşılaştır
        const correct = normalizedCorrectAnswer === normalizedUserAnswer;

        setIsAnswered(true);
        setIsCorrect(correct);
        
        if (correct) {
            playSound('correct');
            setScore(prev => prev + 25);
        } else {
            playSound('incorrect');
        }
    };
    
    const handleNextQuestion = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            setUserAnswer('');
            setIsAnswered(false);
            setIsCorrect(null);
        } else {
            setGameState('finished');
        }
    }

    const restartGame = () => {
        setScore(0);
        setCurrentQuestionIndex(0);
        setIsScoreSaved(false);
        setGameState('loading');
        setUserAnswer('');
        setIsAnswered(false);
        setIsCorrect(null);
        fetchQuestions();
    };

    const handleSaveAndExit = async () => {
        if (isSaving || isScoreSaved || !user || score <= 0) {
            router.push(backUrl);
            return;
        }
        setIsSaving(true);
        const result = await submitAcikUcluCevaplaScoreAction(user.uid, score, contextString);
        if (result.success) {
            setIsScoreSaved(true);
            toast({ title: 'Başarılı!', description: 'Puanınız kaydedildi.' });
        } else {
            toast({ title: 'Hata', description: result.error, variant: 'destructive' });
        }
        setIsSaving(false);
    };

    // --- YÜKLENİYOR ---
    if (gameState === 'loading') {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
                <MagnificentLightBackground />
                <div className="relative z-10 flex flex-col items-center">
                    <div className="relative">
                        <div className="absolute inset-0 bg-purple-500 blur-xl opacity-20 animate-pulse"></div>
                        <Loader2 className="h-16 w-16 animate-spin text-purple-600 relative z-10" />
                    </div>
                    <span className="text-slate-600 font-black text-xl mt-6 animate-pulse tracking-widest uppercase">Soru Hazırlanıyor...</span>
                </div>
            </div>
        );
    }

    // --- HATA ---
    if (gameState === 'error') {
         return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
                <MagnificentLightBackground />
                 <div className="bg-white/80 backdrop-blur-xl border border-red-100 p-8 rounded-[2rem] max-w-md w-full text-center shadow-2xl relative z-10">
                    <div className="bg-red-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                        <AlertTriangle className="h-10 w-10 text-red-500" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-800 mb-2">Hata Oluştu</h3>
                    <p className="text-slate-500 mb-8 font-medium">{error}</p>
                    <Button asChild className="w-full bg-slate-900 text-white hover:bg-slate-800 rounded-xl h-14 font-bold text-lg shadow-lg hover:scale-[1.02] transition-transform">
                        <Link href={backUrl}><ArrowLeft className="mr-2 h-5 w-5" /> Geri Dön</Link>
                    </Button>
                </div>
            </div>
        );
    }

    // --- BİTİŞ ---
    if (gameState === 'finished') {
        return (
             <GameEndScreen 
                score={score}
                onSave={handleSaveAndExit}
                isSaving={isSaving}
                scoreSaved={isScoreSaved}
                onRestart={restartGame}
                backUrl={backUrl}
            />
        );
    }

    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) return null;

    return (
        <div 
            ref={mainContentRef} 
            className={cn(
                "w-full min-h-screen bg-slate-50 text-slate-900 flex flex-col relative overflow-hidden transition-all",
                !isFullscreen && "pb-8"
            )}
        >
             <MagnificentLightBackground />

            {/* --- HEADER (HUD) --- */}
            <div className="fixed top-0 left-0 right-0 z-50 px-4 py-4 pointer-events-none">
                <div className="container mx-auto max-w-6xl">
                    <div className="flex justify-between items-start">
                        {/* Sol: Geri & Bilgi */}
                        <div className="flex flex-col gap-2 pointer-events-auto">
                            <Button 
                                onClick={() => setGameState('finished')}
                                variant="ghost"
                                className="h-12 w-12 rounded-full bg-white/80 backdrop-blur-md border border-slate-200 text-slate-500 hover:text-red-500 hover:bg-red-50 shadow-lg transition-all"
                            >
                                <XOctagon className="h-6 w-6" />
                            </Button>
                            
                            {/* İlerleme */}
                            <div className="bg-white/80 backdrop-blur-md border border-slate-200 rounded-2xl px-4 py-2 shadow-lg flex items-center gap-3">
                                <div className="flex flex-col">
                                    <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest">SORU</span>
                                    <span className="text-xl font-black text-indigo-600 leading-none">
                                        {currentQuestionIndex + 1}<span className="text-slate-300 text-base">/{questions.length}</span>
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Sağ: Puan */}
                        <div className="flex flex-col gap-2 items-end pointer-events-auto">
                            <div className="bg-white/80 backdrop-blur-md border border-slate-200 rounded-2xl p-2 pl-4 pr-4 shadow-lg flex items-center gap-3">
                                <div className="text-right">
                                    <div className="text-[10px] uppercase font-black text-slate-400 tracking-widest">PUAN</div>
                                    <div className="text-2xl font-black text-amber-500 leading-none">{score}</div>
                                </div>
                                <div className="h-10 w-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
                                    <Trophy className="h-6 w-6" />
                                </div>
                            </div>
                            <FullscreenToggle elementRef={mainContentRef} className="bg-white/80 backdrop-blur-md border border-slate-200 text-slate-600 h-10 w-10 rounded-xl shadow-lg hover:bg-indigo-50 hover:text-indigo-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* --- İÇERİK ALANI --- */}
            <div className={cn(
                "flex-grow flex flex-col items-center justify-center p-4 relative z-10",
                isFullscreen ? "pt-20" : "pt-24 md:pt-32"
            )}>
                <div className="w-full max-w-4xl mx-auto space-y-8 animate-in fade-in zoom-in duration-500">
                    
                    {/* SORU KARTI */}
                    <div className="relative group">
                         {/* Arka plan efektleri */}
                         <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-[2.5rem] opacity-20 blur-lg group-hover:opacity-30 transition duration-1000"></div>
                        
                        <div className="relative bg-white/80 backdrop-blur-xl border-2 border-white p-8 md:p-12 rounded-[2.5rem] shadow-2xl flex flex-col items-center text-center gap-6">
                            <div className="absolute -top-6 bg-gradient-to-br from-violet-500 to-indigo-600 text-white w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30 rotate-3 group-hover:rotate-6 transition-transform duration-500">
                                <MessageSquare className="h-7 w-7" />
                            </div>
                            
                            <h2 className="text-2xl md:text-4xl font-black text-slate-800 leading-tight mt-2">
                                {currentQuestion.text}
                            </h2>
                            
                            <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 w-1/2 animate-pulse" />
                            </div>
                        </div>
                    </div>

                    {/* CEVAP ALANI & GERİ BİLDİRİM */}
                    <div className="relative max-w-2xl mx-auto w-full">
                        {/* INPUT */}
                        <div className="relative group">
                            <div className={cn(
                                "absolute -inset-0.5 rounded-[2rem] blur opacity-30 transition duration-500",
                                isAnswered 
                                    ? (isCorrect ? "bg-emerald-500 opacity-50" : "bg-red-500 opacity-50")
                                    : "bg-gradient-to-r from-indigo-500 to-purple-500 group-hover:opacity-50"
                            )}></div>
                            
                            <div className="relative bg-white rounded-[2rem] p-1.5">
                                <Textarea
                                    value={userAnswer}
                                    onChange={(e) => setUserAnswer(e.target.value)}
                                    placeholder="Cevabınızı buraya yazın..."
                                    disabled={isAnswered}
                                    className={cn(
                                        "min-h-[160px] md:min-h-[180px] w-full text-lg md:text-xl p-6 rounded-[1.7rem] resize-none font-medium border-0 focus:ring-0 bg-slate-50 focus:bg-white transition-all",
                                        "placeholder:text-slate-400 text-slate-800",
                                        // Yazı alanı durumları
                                        !isAnswered && "focus:shadow-inner",
                                        isAnswered && isCorrect && "bg-emerald-50 text-emerald-900",
                                        isAnswered && !isCorrect && "bg-red-50 text-red-900"
                                    )}
                                />
                                {/* İkon */}
                                <div className="absolute bottom-6 right-6 pointer-events-none">
                                    {isAnswered ? (
                                        isCorrect ? <CheckCircle2 className="h-8 w-8 text-emerald-500 animate-bounce" /> : <XCircle className="h-8 w-8 text-red-500 animate-pulse" />
                                    ) : (
                                        <Pencil className={cn("h-6 w-6 text-slate-300 transition-colors", userAnswer && "text-indigo-500")} />
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* GERİ BİLDİRİM PANELİ (Yanlışsa doğru cevabı göster) */}
                        {isAnswered && !isCorrect && (
                            <div className="mt-4 bg-white/90 backdrop-blur-md border border-red-100 rounded-2xl p-6 shadow-xl animate-in slide-in-from-top-4 duration-300 text-center">
                                <span className="text-xs font-bold text-red-400 uppercase tracking-widest mb-1 block">DOĞRU CEVAP</span>
                                <p className="text-lg font-black text-slate-800">{currentQuestion.correctAnswer}</p>
                            </div>
                        )}

                        {/* AKSİYON BUTONU */}
                        <div className="mt-8">
                            {isAnswered ? (
                                <Button 
                                    onClick={handleNextQuestion} 
                                    className="w-full h-16 md:h-20 text-xl md:text-2xl font-black rounded-3xl bg-slate-900 hover:bg-slate-800 text-white shadow-2xl shadow-slate-400/50 hover:scale-[1.02] active:scale-95 transition-all group"
                                >
                                    {currentQuestionIndex === questions.length - 1 ? 'SONUÇLARI GÖR' : 'SIRADAKİ SORU'}
                                    <ArrowLeft className="ml-3 h-6 w-6 rotate-180 group-hover:translate-x-1 transition-transform" />
                                </Button>
                            ) : (
                                <Button 
                                    onClick={handleSubmitAnswer} 
                                    disabled={!userAnswer.trim()} 
                                    className={cn(
                                        "w-full h-16 md:h-20 text-xl md:text-2xl font-black rounded-3xl shadow-2xl transition-all",
                                        userAnswer.trim()
                                            ? "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-indigo-500/40 hover:scale-[1.02] active:scale-95"
                                            : "bg-slate-200 text-slate-400 cursor-not-allowed"
                                    )}
                                >
                                    CEVABI GÖNDER <Send className={cn("ml-3 h-6 w-6 transition-transform", userAnswer.trim() && "group-hover:-translate-y-1 group-hover:translate-x-1")} />
                                </Button>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

const OpenEndedGamePage = () => {
     return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-slate-50"><Loader2 className="h-12 w-12 animate-spin text-indigo-500" /></div>}>
            <OpenEndedGame />
        </Suspense>
    );
}

export default OpenEndedGamePage;