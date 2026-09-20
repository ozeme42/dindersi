'use client';

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getAcikUcluCevaplaAction, submitAcikUcluCevaplaScoreAction } from '../actions';
import { useAuth } from '@/context/auth-context';
import type { Question } from '@/lib/types';
import { Loader2, ArrowLeft, CheckCircle2, AlertTriangle, Send, XCircle, Trophy, Pencil, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { playSound } from '@/lib/audio-service';
import { GameEndScreen } from '@/components/game-end-screen';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { getGameBackUrl } from '@/lib/game-navigation';
import { WordwallShell, useWordwall } from '@/components/wordwall/wordwall-shell';

function OpenEndedGameBoard({
    currentQuestion,
    currentQuestionIndex,
    totalQuestions,
    userAnswer,
    setUserAnswer,
    isAnswered,
    isCorrect,
    onSubmitAnswer,
    onNextQuestion,
}: {
    currentQuestion: Question;
    currentQuestionIndex: number;
    totalQuestions: number;
    userAnswer: string;
    setUserAnswer: (v: string) => void;
    isAnswered: boolean;
    isCorrect: boolean | null;
    onSubmitAnswer: () => void;
    onNextQuestion: () => void;
}) {
    const { theme } = useWordwall();

    return (
        <div className="w-full max-w-3xl mx-auto flex flex-col items-center gap-4 sm:gap-6 my-auto">
            {/* Soru Kartı */}
            <div className={cn(
                "w-full rounded-2xl sm:rounded-3xl border-2 p-5 sm:p-8 backdrop-blur-xl flex flex-col items-center text-center gap-4 transition-all duration-300 relative",
                theme.cardBg,
                theme.cardBorder,
                theme.cardShadow
            )}>
                <div className={cn(
                    "px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5",
                    theme.badgeCounter
                )}>
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>Soru {currentQuestionIndex + 1} / {totalQuestions}</span>
                </div>

                <h2 className={cn("text-lg sm:text-2xl md:text-3xl font-black leading-snug", theme.cardText)}>
                    {currentQuestion.text}
                </h2>
            </div>

            {/* Cevap Giriş Alanı */}
            <div className="w-full relative">
                <div className={cn(
                    "rounded-2xl border-2 p-2 sm:p-3 transition-all duration-300 backdrop-blur-md",
                    theme.cardBg,
                    isAnswered 
                        ? (isCorrect ? "border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]" : "border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.3)]")
                        : theme.cardBorder
                )}>
                    <Textarea
                        value={userAnswer}
                        onChange={(e) => setUserAnswer(e.target.value)}
                        placeholder="Cevabınızı buraya yazın..."
                        disabled={isAnswered}
                        className={cn(
                            "min-h-[120px] sm:min-h-[150px] w-full text-base sm:text-xl p-3 sm:p-4 rounded-xl resize-none font-bold border-0 focus:ring-0 focus:outline-none transition-all",
                            theme.subPanelBg,
                            theme.cardText,
                            "placeholder:opacity-50"
                        )}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                if (!isAnswered && userAnswer.trim()) {
                                    onSubmitAnswer();
                                }
                            }
                        }}
                    />
                    
                    {/* Durum İkonu */}
                    <div className="flex justify-end items-center pt-2 px-2">
                        {isAnswered ? (
                            isCorrect ? (
                                <div className="flex items-center gap-1.5 text-emerald-400 font-black text-sm">
                                    <CheckCircle2 className="h-5 w-5" />
                                    <span>Doğru Cevap! (+25 Puan)</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-1.5 text-rose-400 font-black text-sm">
                                    <XCircle className="h-5 w-5" />
                                    <span>Yanlış Cevap</span>
                                </div>
                            )
                        ) : (
                            <div className={cn("text-xs font-bold opacity-60 flex items-center gap-1", theme.subText)}>
                                <Pencil className="h-3.5 w-3.5" />
                                <span>Enter tuşuna basarak gönderebilirsiniz</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Yanlış ise Doğru Cevap Kutusu */}
                {isAnswered && !isCorrect && (
                    <div className={cn(
                        "mt-3 rounded-xl border-2 p-4 text-center animate-in slide-in-from-top-3 duration-200",
                        theme.cardBg,
                        "border-rose-500/50"
                    )}>
                        <span className="text-xs font-black text-rose-400 uppercase tracking-wider block mb-1">
                            DOĞRU CEVAP
                        </span>
                        <p className={cn("text-base sm:text-lg font-black", theme.cardText)}>
                            {currentQuestion.correctAnswer}
                        </p>
                    </div>
                )}

                {/* Buton */}
                <div className="mt-4 sm:mt-6">
                    {isAnswered ? (
                        <button
                            type="button"
                            onClick={onNextQuestion}
                            className={cn(
                                "w-full py-3.5 sm:py-4 px-6 rounded-xl font-black text-base sm:text-xl border-2 shadow-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer active:scale-95",
                                theme.buttonSelected
                            )}
                        >
                            <span>{currentQuestionIndex === totalQuestions - 1 ? 'SONUÇLARI GÖR' : 'SIRADAKİ SORU'}</span>
                            <ArrowLeft className="h-5 w-5 rotate-180" />
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={onSubmitAnswer}
                            disabled={!userAnswer.trim()}
                            className={cn(
                                "w-full py-3.5 sm:py-4 px-6 rounded-xl font-black text-base sm:text-xl border-2 shadow-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer active:scale-95",
                                userAnswer.trim()
                                    ? theme.buttonIdle
                                    : "opacity-40 cursor-not-allowed border-slate-500 bg-slate-800 text-slate-400"
                            )}
                        >
                            <span>CEVABI GÖNDER</span>
                            <Send className="h-5 w-5" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

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

    const gameContext = useMemo(() => ({
        courseName: searchParams.get('courseName') || 'Bilinmeyen Ders',
        unitName: searchParams.get('unitName') || 'Bilinmeyen Ünite',
        topicName: searchParams.get('topicName') || 'Bilinmeyen Konu',
    }), [searchParams]);
    
    const contextString = `Açık Uçlu Cevaplama - ${gameContext.courseName} > ${gameContext.topicName}`;
    const backUrl = getGameBackUrl({ user, searchParams, defaultBackUrl: '/oyunlar/acik-uclu-cevapla' });

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

    const normalizeAnswer = (text: string) => {
        if (!text) return "";
        return text
            .toLocaleLowerCase('tr-TR')
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()'"?]/g,"")
            .replace(/\s+/g, ' ')
            .trim();
    };

    const handleSubmitAnswer = () => {
        if (!userAnswer.trim() || isAnswered) return;
        
        const currentQuestion = questions[currentQuestionIndex];
        const normalizedCorrectAnswer = normalizeAnswer(currentQuestion.correctAnswer || '');
        const normalizedUserAnswer = normalizeAnswer(userAnswer);
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
    };

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

    if (gameState === 'loading') {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 text-white">
                <Loader2 className="h-14 w-14 animate-spin text-indigo-400" />
                <span className="font-black text-lg uppercase tracking-wider text-slate-300">Sorular Hazırlanıyor...</span>
            </div>
        );
    }

    if (gameState === 'error') {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white">
                <div className="bg-slate-900 border border-red-500/40 p-8 rounded-3xl max-w-md w-full text-center shadow-2xl">
                    <div className="bg-red-500/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-red-400">
                        <AlertTriangle className="h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-black mb-2">Hata Oluştu</h3>
                    <p className="text-slate-400 mb-6 font-medium text-sm">{error}</p>
                    <Button asChild className="w-full bg-slate-800 hover:bg-slate-700 text-white rounded-xl h-12 font-bold">
                        <Link href={backUrl}><ArrowLeft className="mr-2 h-4 w-4" /> Geri Dön</Link>
                    </Button>
                </div>
            </div>
        );
    }

    const currentQuestion = questions[currentQuestionIndex];

    return (
        <WordwallShell
            title="Açık Uçlu Cevaplama"
            subtitle={gameContext.topicName}
            currentQuestionIndex={currentQuestionIndex + 1}
            totalQuestions={questions.length}
            score={score}
            backUrl={backUrl}
            isFinished={gameState === 'finished'}
            fitToScreen={true}
            contentClassName="w-full h-full min-h-0 overflow-y-auto custom-scrollbar p-2 sm:p-4 flex flex-col justify-center items-center"
        >
            {gameState === 'finished' ? (
                <div className="w-full max-w-xl mx-auto my-auto animate-in zoom-in-95 duration-300">
                    <GameEndScreen 
                        score={score}
                        onSave={handleSaveAndExit}
                        isSaving={isSaving}
                        scoreSaved={isScoreSaved}
                        onRestart={restartGame}
                        backUrl={backUrl}
                    />
                </div>
            ) : currentQuestion ? (
                <OpenEndedGameBoard
                    currentQuestion={currentQuestion}
                    currentQuestionIndex={currentQuestionIndex}
                    totalQuestions={questions.length}
                    userAnswer={userAnswer}
                    setUserAnswer={setUserAnswer}
                    isAnswered={isAnswered}
                    isCorrect={isCorrect}
                    onSubmitAnswer={handleSubmitAnswer}
                    onNextQuestion={handleNextQuestion}
                />
            ) : null}
        </WordwallShell>
    );
};

const OpenEndedGamePage = () => {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-slate-950"><Loader2 className="h-12 w-12 animate-spin text-indigo-500" /></div>}>
            <OpenEndedGame />
        </Suspense>
    );
};

export default OpenEndedGamePage;