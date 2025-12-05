'use client';

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getQuestionsFromBank } from '@/lib/quiz-actions';
import { Loader2, HelpCircle, Lightbulb, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { GameEndScreen } from '@/components/game-end-screen';
import { saveScore } from '@/app/student/actions';
import { useAuth } from '@/context/auth-context';
import Confetti from 'react-dom-confetti';
import { playSound } from '@/lib/audio-service';
import type { Question } from '@/lib/types';
import { AppHeader } from '@/components/app-header';

type DefinitionItem = { term: string; definition: string; };

function GuessItGame() {
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const { toast } = useToast();

    const [definitions, setDefinitions] = useState<DefinitionItem[]>([]);
    const [terms, setTerms] = useState<string[]>([]);
    const [currentDefinition, setCurrentDefinition] = useState<DefinitionItem | null>(null);
    const [gameState, setGameState] = useState<'loading' | 'playing' | 'ended'>('loading');
    const [score, setScore] = useState(0);
    const [scoreSaved, setScoreSaved] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isConfettiActive, setIsConfettiActive] = useState(false);

    const questionCount = useMemo(() => parseInt(searchParams.get('questionCount') as string) || 10, [searchParams]);
    const difficulty = useMemo(() => searchParams.getAll('difficulty') as string[], [searchParams]);
    const courseId = useMemo(() => searchParams.get('courseId') || '', [searchParams]);
    const unitId = useMemo(() => searchParams.get('unitId') || '', [searchParams]);
    const topicId = useMemo(() => searchParams.get('topicId') || '', [searchParams]);

    const fetchGameData = useCallback(async () => {
        setGameState('loading');
        const { questions, error } = await getQuestionsFromBank({
            questionCount,
            difficulty,
            courseId,
            unitId,
            topicId,
            questionTypes: ['fitb'], // 'fitb' often have good term/definition pairs
        });

        if (error || questions.length === 0) {
            toast({
                title: 'Soru Yüklenemedi',
                description: error || 'Bu konu için uygun soru bulunamadı. Lütfen farklı bir konu seçin.',
                variant: 'destructive',
            });
            // Redirect or show error message
            setGameState('ended'); // End game if no questions
            return;
        }

        // We need pairs of term and definition. We can simulate this from FITB questions.
        const gameData: DefinitionItem[] = questions.map(q => ({
            definition: (q.text || '').replace(/___/g, '...'),
            term: q.correctAnswer || ''
        })).filter(item => item.term && item.definition);
        
        if (gameData.length < 2) {
             toast({
                title: 'Yetersiz Veri',
                description: 'Bu oyun için yeterli tanım/terim çifti bulunamadı. Lütfen başka bir konu seçin.',
                variant: 'destructive',
            });
            setGameState('ended');
            return;
        }

        setDefinitions(gameData);
        setTerms(gameData.map(d => d.term).sort(() => 0.5 - Math.random()));
        setCurrentDefinition(gameData[0]);
        setScore(0);
        setScoreSaved(false);
        setGameState('playing');
    }, [questionCount, difficulty, courseId, unitId, topicId, toast]);

    useEffect(() => {
        fetchGameData();
    }, [fetchGameData]);

    const handleAnswer = (selectedTerm: string) => {
        if (!currentDefinition) return;

        const isCorrect = selectedTerm === currentDefinition.term;

        if (isCorrect) {
            playSound('correct');
            setScore(prev => prev + 100);
            setIsConfettiActive(true);
            setTimeout(() => setIsConfettiActive(false), 300);

            const remainingDefinitions = definitions.slice(1);
            if (remainingDefinitions.length > 0) {
                setDefinitions(remainingDefinitions);
                setCurrentDefinition(remainingDefinitions[0]);
                // Keep the terms list the same to avoid confusion
            } else {
                setGameState('ended');
            }
        } else {
            playSound('incorrect');
            toast({
                title: 'Yanlış Cevap!',
                description: 'Tekrar dene.',
                variant: 'destructive',
            });
        }
    };

    const handleSaveScore = async () => {
        if (!user || score <= 0 || scoreSaved) return;
        setIsSaving(true);
        await saveScore({
            userId: user.uid,
            gameType: 'Bil Bakalım',
            score: score,
            context: `Konu: ${topicId || 'Genel'}`,
        });
        setScoreSaved(true);
        setIsSaving(false);
        toast({
            title: 'Puan Kaydedildi!',
            description: `${score} puan kazandın.`,
        });
    };

    if (gameState === 'loading') {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-gray-900 text-white">
                <Loader2 className="h-12 w-12 animate-spin" />
                <p className="ml-4 text-xl">Oyun verileri yükleniyor...</p>
            </div>
        );
    }

    if (gameState === 'ended') {
        return (
            <GameEndScreen
                score={score}
                onSave={handleSaveScore}
                isSaving={isSaving}
                scoreSaved={scoreSaved}
                onRestart={fetchGameData}
                backUrl="/student/bil-bakalim"
            />
        );
    }

    return (
        <div className="relative flex h-screen w-full flex-col items-center justify-center bg-gradient-to-br from-indigo-900 to-purple-900 p-4 md:p-8 text-white">
            <AppHeader />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                 <Confetti active={isConfettiActive} config={{
                    angle: 90,
                    spread: 360,
                    startVelocity: 40,
                    elementCount: 70,
                    dragFriction: 0.12,
                    duration: 3000,
                    stagger: 3,
                    width: "10px",
                    height: "10px",
                    perspective: "500px",
                    colors: ["#a864fd", "#29cdff", "#78ff44", "#ff718d", "#fdff6a"]
                }}/>
            </div>
            
            <main className="flex flex-col items-center justify-center w-full max-w-5xl">
                <div className="mb-8 w-full rounded-2xl bg-black/30 p-4 text-center shadow-lg border border-white/20">
                    <p className="text-sm uppercase tracking-widest text-purple-300">Bu Tanım Hangi Kavrama Ait?</p>
                    <p className="mt-2 text-xl md:text-2xl lg:text-3xl font-bold italic">
                        "{currentDefinition?.definition}"
                    </p>
                </div>

                <div className="grid w-full grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 md:gap-4">
                    {terms.map((term, index) => {
                        const isCorrect = term === currentDefinition?.term;
                        return (
                            <button
                                key={index}
                                onClick={() => handleAnswer(term)}
                                className="relative flex h-24 items-center justify-center rounded-lg bg-white/10 p-2 text-center text-lg font-semibold transition-all hover:scale-105 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-gray-900"
                            >
                                {term}
                                {isCorrect && <CheckCircle2 className="absolute top-1 right-1 w-4 h-4 lg:w-6 lg:h-6 text-white/50" />}
                            </button>
                        );
                    })}
                </div>
                 <div className="mt-8 text-xl font-bold">
                    Puan: <span className="text-yellow-400 font-mono">{score}</span>
                </div>
            </main>
        </div>
    );
}


export default function GuessItPage() {
    return (
        <Suspense fallback={
            <div className="flex h-screen w-full items-center justify-center bg-gray-900 text-white">
                <Loader2 className="h-12 w-12 animate-spin" />
            </div>
        }>
            <GuessItGame />
        </Suspense>
    );
}
