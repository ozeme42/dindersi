
'use client';

import { useState, useEffect, useMemo, useCallback, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getAcikUcluCevaplaAction, submitAcikUcluCevaplaScoreAction } from '../actions';
import { useAuth } from '@/context/auth-context';
import type { Question } from '@/lib/types';
import { Loader2, ArrowLeft, CheckCircle2, AlertTriangle, Send, XCircle, Lightbulb, Trophy, Keyboard, Sparkles, XOctagon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { Textarea } from '@/components/ui/textarea';
import { playSound } from '@/lib/audio-service';
import { GameEndScreen } from '@/components/game-end-screen';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { FullscreenToggle } from '@/components/fullscreen-toggle';

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
    const backUrl = '/oyunlar/acik-uclu-cevapla';

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

    const handleSubmitAnswer = () => {
        if (!userAnswer.trim() || isAnswered) return;
        
        const currentQuestion = questions[currentQuestionIndex];
        const correctAnswer = (currentQuestion.correctAnswer || '').trim().toLocaleLowerCase('tr-TR');
        const submittedAnswer = userAnswer.trim().toLocaleLowerCase('tr-TR');
        
        const correct = correctAnswer === submittedAnswer;

        setIsAnswered(true);
        setIsCorrect(correct);
        
        if (correct) {
            playSound('correct');
            setScore(prev => prev + 200);
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
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-cyan-500" />
                <span className="text-slate-400 font-medium animate-pulse">Soru Hazırlanıyor...</span>
            </div>
        );
    }

    // --- HATA ---
    if (gameState === 'error') {
         return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
                 <div className="bg-slate-900 border border-red-500/30 p-8 rounded-3xl max-w-md w-full text-center shadow-2xl">
                    <div className="bg-red-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertTriangle className="h-8 w-8 text-red-500" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Hata Oluştu</h3>
                    <p className="text-slate-400 mb-6">{error}</p>
                    <Button asChild className="w-full bg-slate-800 text-white hover:bg-slate-700">
                        <Link href={backUrl}><ArrowLeft className="mr-2 h-4 w-4" /> Geri Dön</Link>
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
                "w-full min-h-screen bg-slate-950 text-slate-100 flex flex-col relative overflow-hidden transition-all selection:bg-cyan-500/30",
                !isFullscreen && "pb-24 md:pb-8"
            )}
        >
             {/* Arka Plan Efektleri */}
             <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[120px]" />
            </div>

            {/* --- HEADER (HUD) --- */}
            <div className="sticky top-0 z-30 w-full bg-slate-900/80 backdrop-blur-xl border-b border-white/5 shadow-lg">
                <div className="container mx-auto px-4 py-3 md:py-4">
                    <div className="flex justify-between items-center gap-4">
                        {/* Sol: Başlık */}
                        <div className="flex items-center gap-3 overflow-hidden">
                             <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-violet-500/30 flex items-center justify-center shrink-0">
                                <Keyboard className="text-violet-400 h-5 w-5 md:h-6 md:w-6" />
                            </div>
                            <div className="flex flex-col">
                                <h1 className="text-sm md:text-lg font-bold text-white truncate">Açık Uçlu</h1>
                                <div className="flex items-center gap-2 text-xs md:text-sm text-slate-400 font-mono">
                                    <span>SORU {currentQuestionIndex + 1}/{questions.length}</span>
                                </div>
                            </div>
                        </div>

                        {/* Sağ: Puan ve Kontroller */}
                        <div className="flex items-center gap-2 md:gap-3">
                            
                            {/* --- YENİ EKLENEN BITIR TUŞU --- */}
                            <Button 
                                onClick={() => setGameState('finished')}
                                variant="ghost"
                                className="h-9 px-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg font-bold text-xs md:text-sm transition-colors border border-red-500/10"
                            >
                                <XOctagon className="h-4 w-4 mr-1.5" />
                                <span className="hidden sm:inline">BİTİR</span>
                            </Button>

                            {/* Puan Rozeti */}
                            <div className="bg-slate-950/50 border border-white/10 rounded-lg px-3 py-1.5 md:px-4 md:py-2 flex items-center gap-2">
                                <Trophy className="h-4 w-4 md:h-5 md:w-5 text-yellow-500" />
                                <span className="font-bold font-mono text-white text-sm md:text-lg">{score}</span>
                            </div>
                            
                            <FullscreenToggle elementRef={mainContentRef} className="bg-slate-800 border-white/10 text-slate-300 hover:text-white h-9 w-9 md:h-11 md:w-11 rounded-xl" />
                        </div>
                    </div>
                </div>
                {/* İlerleme Çubuğu */}
                <div className="w-full h-1 bg-slate-800">
                     <div 
                        className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 shadow-[0_0_10px_rgba(168,85,247,0.5)] transition-all duration-500 ease-out"
                        style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                    />
                </div>
            </div>

            {/* --- İÇERİK ALANI --- */}
            <div className={cn(
                "flex-grow flex flex-col items-center justify-center p-4 relative z-10",
                isFullscreen ? "h-full" : "container mx-auto max-w-3xl pt-8 md:pt-12"
            )}>
                
                {/* Soru Kartı */}
                <div className="w-full space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500">
                    <div className="relative bg-slate-900/60 backdrop-blur-md border border-white/10 p-6 md:p-10 rounded-3xl shadow-2xl overflow-hidden group">
                        {/* Dekoratif Işık */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                        
                        <div className="flex items-start gap-4 relative z-10">
                            <div className="shrink-0 mt-1">
                                <Lightbulb className="h-6 w-6 md:h-8 md:w-8 text-yellow-400 fill-yellow-400/20" />
                            </div>
                            <p className="text-xl md:text-2xl font-bold text-white leading-relaxed">
                                {currentQuestion.text}
                            </p>
                        </div>
                    </div>

                    {/* Cevap Alanı */}
                    <div className="space-y-4">
                        <div className="relative">
                            <Textarea
                                value={userAnswer}
                                onChange={(e) => setUserAnswer(e.target.value)}
                                placeholder="Cevabınızı buraya yazın..."
                                disabled={isAnswered}
                                className={cn(
                                    "min-h-[160px] md:min-h-[200px] w-full text-lg md:text-xl p-6 rounded-2xl transition-all duration-300 resize-none font-medium",
                                    "bg-slate-950/80 border-2",
                                    isAnswered 
                                        ? isCorrect 
                                            ? "border-emerald-500/50 text-emerald-400 bg-emerald-950/20" 
                                            : "border-red-500/50 text-red-400 bg-red-950/20"
                                        : "border-white/10 text-slate-100 placeholder:text-slate-600 focus:border-violet-500 focus:shadow-[0_0_20px_rgba(139,92,246,0.2)]"
                                )}
                            />
                             {/* Yazarken çıkan parıltı ikonu */}
                             {!isAnswered && userAnswer.length > 0 && (
                                <div className="absolute bottom-4 right-4 animate-bounce">
                                    <Sparkles className="h-5 w-5 text-violet-400" />
                                </div>
                             )}
                        </div>

                        {/* Geri Bildirim Alanı */}
                        {isAnswered && (
                            <div className={cn(
                                "p-4 md:p-5 rounded-2xl flex items-center justify-center gap-3 text-lg font-bold border animate-in zoom-in duration-300 shadow-lg",
                                isCorrect 
                                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-emerald-900/20" 
                                    : "bg-red-500/10 border-red-500/30 text-red-400 shadow-red-900/20"
                            )}>
                                {isCorrect ? (
                                    <>
                                        <CheckCircle2 className="h-6 w-6 md:h-7 md:w-7"/>
                                        <span>Harika! Doğru Cevap</span>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center gap-1">
                                        <div className="flex items-center gap-2">
                                            <XCircle className="h-6 w-6 md:h-7 md:w-7"/>
                                            <span>Yanlış Cevap</span>
                                        </div>
                                        <span className="text-sm font-normal text-slate-400">Doğru Cevap: <span className="text-white font-bold">{currentQuestion.correctAnswer}</span></span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Butonlar */}
                        <div className="pt-2">
                             {isAnswered ? (
                                <Button 
                                    onClick={handleNextQuestion} 
                                    className="w-full h-14 md:h-16 text-lg md:text-xl font-bold rounded-2xl bg-white text-slate-900 hover:bg-cyan-50 shadow-lg shadow-white/10 transition-all hover:scale-[1.02]"
                                >
                                    {currentQuestionIndex === questions.length - 1 ? 'Oyunu Bitir' : 'Sıradaki Soru'}
                                    <ArrowLeft className="ml-2 h-5 w-5 rotate-180" />
                                </Button>
                            ) : (
                                <Button 
                                    onClick={handleSubmitAnswer} 
                                    disabled={!userAnswer.trim()} 
                                    className={cn(
                                        "w-full h-14 md:h-16 text-lg md:text-xl font-bold rounded-2xl transition-all shadow-lg",
                                        userAnswer.trim()
                                            ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-violet-900/30 hover:shadow-violet-500/40 hover:scale-[1.02]"
                                            : "bg-slate-800 text-slate-500 border border-white/5 cursor-not-allowed"
                                    )}
                                >
                                    Cevabı Gönder <Send className="ml-2 h-5 w-5" />
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
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-slate-950"><Loader2 className="h-12 w-12 animate-spin text-cyan-500" /></div>}>
            <OpenEndedGame />
        </Suspense>
    );
}

export default OpenEndedGamePage;
