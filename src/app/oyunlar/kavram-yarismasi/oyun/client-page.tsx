
'use client';

import { useState, useEffect, useCallback, Suspense, useMemo } from "react";
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, BrainCircuit, Trophy, PartyPopper, Repeat, Home } from "lucide-react";
import Link from 'next/link';
import { cn } from "@/lib/utils";
import { playSound } from '@/lib/audio-service';
import { GameEndScreen } from '@/components/game-end-screen';
import { submitConceptQuizScoreAction, type ConceptQuizQuestion } from '@/app/oyunlar/kavram-yarismasi/actions';

function ConceptQuizGame({ initialQuestions, initialError, context }: { initialQuestions: ConceptQuizQuestion[] | null, initialError?: string, context: { courseName: string, topicName: string } }) {
    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();

    const [questions, setQuestions] = useState<ConceptQuizQuestion[]>([]);
    const [gameState, setGameState] = useState<'playing' | 'finished'>('playing');
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [isAnswered, setIsAnswered] = useState(false);
    
    const [isSaving, setIsSaving] = useState(false);
    const [isScoreSaved, setIsScoreSaved] = useState(false);

    useEffect(() => {
        if (initialQuestions) {
            setQuestions(initialQuestions);
        } else if (initialError) {
            toast({ title: 'Hata', description: initialError, variant: 'destructive' });
        }
    }, [initialQuestions, initialError, toast]);
    
    const currentQuestion = questions[currentQuestionIndex];
    const gameContext = `Kavram Yarışması - ${context.courseName} > ${context.topicName}`;
    const backUrl = '/oyunlar/kavram-yarismasi';

    const handleAnswer = (option: string) => {
        if (isAnswered) return;
        setIsAnswered(true);
        if (option === currentQuestion.correctAnswer) {
            setScore(prev => prev + 10);
            playSound('correct');
        } else {
            playSound('incorrect');
        }
    };
    
    const handleNext = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            setIsAnswered(false);
        } else {
            setGameState('finished');
        }
    };
    
    const handleSaveAndExit = async () => {
        if (isSaving || isScoreSaved || !user || score <= 0) {
            router.push(backUrl);
            return;
        }
        setIsSaving(true);
        const result = await submitConceptQuizScoreAction(user.uid, score, gameContext);
        if (result.success) {
            setIsScoreSaved(true);
            toast({ title: "Başarılı!", description: "Puanınız kaydedildi." });
        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive" });
        }
        setIsSaving(false);
    };

    const handleRestart = () => {
        setScore(0);
        setCurrentQuestionIndex(0);
        setQuestions(prev => [...prev].sort(() => 0.5 - Math.random()));
        setIsAnswered(false);
        setGameState('playing');
        setIsScoreSaved(false);
    };
    
    if (initialError) {
        return <div className="text-red-500 text-center p-8">{initialError}</div>;
    }
    
    if (questions.length === 0) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-16 w-16 animate-spin text-pink-500"/></div>
    }

    if (gameState === 'finished') {
        return <GameEndScreen score={score} onSave={handleSaveAndExit} isSaving={isSaving} scoreSaved={isScoreSaved} onRestart={handleRestart} backUrl={backUrl} />;
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white p-4">
            <div className="w-full max-w-3xl space-y-8">
                <div className="text-center space-y-2">
                    <h1 className="text-2xl font-bold text-pink-400">Kavram Yarışması</h1>
                    <p className="text-slate-400">Soru {currentQuestionIndex + 1} / {questions.length}</p>
                </div>
                <Card className="bg-slate-900/50 border-pink-500/20">
                    <CardHeader>
                        <CardTitle className="text-xl md:text-2xl text-center text-slate-100">{currentQuestion.definition}</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {currentQuestion.options.map(opt => (
                            <Button 
                                key={opt} 
                                onClick={() => handleAnswer(opt)}
                                disabled={isAnswered}
                                className={cn(
                                    "h-24 text-lg",
                                    isAnswered && (opt === currentQuestion.correctAnswer ? "bg-green-600 hover:bg-green-500" : "bg-red-600 hover:bg-red-500"),
                                    isAnswered && (opt !== currentQuestion.correctAnswer) && "opacity-50"
                                )}
                            >
                                {opt}
                            </Button>
                        ))}
                    </CardContent>
                </Card>
                {isAnswered && (
                    <div className="text-center">
                        <Button onClick={handleNext} size="lg" className="bg-indigo-600 hover:bg-indigo-500">
                           {currentQuestionIndex === questions.length - 1 ? 'Bitir' : 'Sonraki Soru'}
                        </Button>
                    </div>
                )}
                 <div className="text-center text-4xl font-black text-yellow-400">{score}</div>
            </div>
        </div>
    );
}

export default KavramYarismaOyunClientPage;
