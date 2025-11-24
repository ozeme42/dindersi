
"use client";

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import { submitBilBakalimScoreAction, getBilBakalimAction } from '../actions';
import type { Question } from "@/lib/types";
import { Loader2, AlertTriangle, ArrowLeft, PartyPopper, Repeat, Home } from "lucide-react";
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { playSound } from '@/lib/audio-service';

const GameScreen = ({ gameState, children }: { gameState: string, children: React.ReactNode }) => {
    const isVisible = gameState === 'start' || gameState === 'flipping' || gameState === 'result' || gameState === 'finished';
    if (!isVisible) return null;
    return (
        <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-8 text-center relative overflow-hidden w-full">
            {children}
        </div>
    );
};

const QuestionScreen = ({ gameState, children }: { gameState: string, children: React.ReactNode }) => {
    const isVisible = gameState === 'question' || gameState === 'feedback';
    if (!isVisible) return null;
    return (
         <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-8 border-t-8 border-indigo-500 relative w-full">
            {children}
         </div>
    );
}

function GuessItGame() {
    const { user } = useAuth();
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const router = useRouter();

    const [questions, setQuestions] = useState<Question[]>([]);
    const [questionQueue, setQuestionQueue] = useState<Question[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [gameState, setGameState] = useState('playing');
    const [score, setScore] = useState(0);
    const [isFinished, setIsFinished] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [isAnswered, setIsAnswered] = useState(false);

    const isStatic = searchParams.get('static') === 'true';
    const gameContext = `Bil Bakalım - ${searchParams.get('topicName')}`;

    useEffect(() => {
        const fetchQuestions = async () => {
            const params = {
                courseId: searchParams.get('courseId') || undefined,
                unitId: searchParams.get('unitId') || undefined,
                topicId: searchParams.get('topicId') || undefined,
            };
            const result = await getBilBakalimAction(params);
            if (result.error) {
                setError(result.error);
            } else if (result.questions && result.questions.length > 0) {
                setQuestions(result.questions);
                setQuestionQueue(result.questions);
            } else {
                setError("Bu konu için uygun soru bulunamadı.");
            }
            setIsLoading(false);
        };
        fetchQuestions();
    }, [searchParams, isStatic]);
    
    const currentQuestion = questionQueue.length > 0 ? questionQueue[0] : null;

    const handleAnswer = (answer: string) => {
        if (isAnswered || !currentQuestion) return;

        const isCorrect = answer === currentQuestion.correctAnswer;
        setSelectedAnswer(answer);
        setIsAnswered(true);
        
        if (isCorrect) {
            playSound('correct');
            setScore(prev => prev + 10);
            setTimeout(() => {
                const newQueue = questionQueue.slice(1);
                setQuestionQueue(newQueue);
                if (newQueue.length === 0) {
                    setIsFinished(true);
                } else {
                    setIsAnswered(false);
                    setSelectedAnswer(null);
                }
            }, 1200);
        } else {
            playSound('incorrect');
            setScore(prev => Math.max(0, prev - 5));
            setTimeout(() => {
                const wrongQuestion = questionQueue[0];
                const newQueue = [...questionQueue.slice(1), wrongQuestion];
                setQuestionQueue(newQueue);
                setIsAnswered(false);
                setSelectedAnswer(null);
            }, 1200);
        }
    };
    
    useEffect(() => {
        const handleFinish = async () => {
             if (user && score > 0 && !isStatic) {
                await submitBilBakalimScoreAction(user.uid, score, gameContext);
             }
        }
        if (isFinished) {
            handleFinish();
        }
    }, [isFinished, user, score, isStatic, gameContext]);
    
    const backUrl = '/student/bil-bakalim';
    
    if (isLoading) return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
    
    if (error) return (
        <div className="flex h-screen w-full items-center justify-center p-4">
             <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative max-w-md" role="alert">
                <strong className="font-bold">Hata! </strong>
                <span className="block sm:inline ml-2">{error}</span>
                 <div className="mt-4">
                    <Button asChild variant="outline">
                        <Link href={backUrl}>Geri Dön</Link>
                    </Button>
                </div>
            </div>
        </div>
    );

    if (isFinished) {
        return (
            <div className="flex h-screen w-full items-center justify-center p-4">
                <GameScreen gameState="finished">
                    <div className="text-6xl mb-4">🎉</div>
                    <h2 className="text-3xl font-bold text-gray-800 mb-2 header-font">Tebrikler!</h2>
                    <p className="text-gray-600 mb-6">Tüm kavramları öğrendin.</p>
                    
                    <div className="bg-rose-50 p-4 rounded-xl mb-6">
                        <p className="text-sm font-bold text-rose-500 uppercase tracking-wider">Toplam Skorun</p>
                        <p className="text-4xl font-black text-rose-600 header-font">{score}</p>
                    </div>

                    <div className="flex flex-col gap-2">
                        <Button onClick={() => window.location.reload()} className="w-full py-3">Tekrar Oyna</Button>
                         <Button asChild variant="outline" className="w-full py-3"><Link href={backUrl}>Ana Menü</Link></Button>
                    </div>
                </GameScreen>
            </div>
        );
    }
    
    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-rose-50 dark:bg-slate-900 font-body">
            
            <div className="w-full max-w-2xl flex justify-between items-center mb-4 sm:mb-6">
                 <h1 className="text-xl sm:text-2xl font-bold text-rose-600 header-font">Bil Bakalım?</h1>
                <div className="bg-white px-4 py-2 rounded-full shadow-sm text-sm font-bold text-gray-600 border border-rose-100">
                    Puan: <span className="text-rose-600 text-lg">{score}</span>
                </div>
            </div>

            <div className="w-full max-w-2xl">
                <QuestionScreen gameState="question">
                    {currentQuestion && (
                        <>
                            <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-6 text-center min-h-[60px] flex items-center justify-center">
                                {currentQuestion.question}
                            </h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {currentQuestion.options?.map((option, index) => {
                                    const isCorrect = option === currentQuestion.correctAnswer;
                                    const isSelected = option === selectedAnswer;

                                    let buttonClass = 'bg-white border-gray-200 text-gray-700 hover:bg-rose-50 hover:border-rose-300';
                                    if(isAnswered) {
                                        if (isCorrect) buttonClass = 'bg-green-500 border-green-700 text-white animate-pop';
                                        else if (isSelected) buttonClass = 'bg-red-500 border-red-700 text-white animate-shake';
                                        else buttonClass = 'bg-gray-100 border-gray-200 text-gray-400 opacity-70';
                                    }

                                    return (
                                        <button
                                            key={index}
                                            onClick={() => handleAnswer(option)}
                                            disabled={isAnswered}
                                            className={`w-full py-4 px-4 rounded-xl font-bold text-left text-base sm:text-lg border-b-4 transition-all concept-btn ${buttonClass}`}
                                        >
                                            <span className="font-bold mr-2">{['A','B','C','D'][index]})</span> {option}
                                        </button>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </QuestionScreen>
            </div>
            <div className="mt-8 text-center opacity-40 text-xs text-gray-500">
                Pekiştirme Etkinliği
            </div>
        </div>
    );
}

export default function GuessItPage() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
            <GuessItGame />
        </Suspense>
    );
}
