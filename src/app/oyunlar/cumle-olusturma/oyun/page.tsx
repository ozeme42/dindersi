'use client';

import { useState, useEffect, useCallback, Suspense, useMemo } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useSearchParams, useRouter } from 'next/navigation';
import { getCumleOlusturmaAction, submitCumleOlusturmaScoreAction, type ScrambledSentenceData } from '@/app/oyunlar/actions';
import { Button } from '@/components/ui/button';
import { Loader2, Shuffle, ArrowRight, Save, Repeat, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { playSound } from '@/lib/audio-service';
import { Progress } from '@/components/ui/progress';
import { GameEndScreen } from '@/components/game-end-screen';


const Word = ({ word, id }: { word: string; id: string }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
    const style = { transform: CSS.Transform.toString(transform), transition };
    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}
            className="px-4 py-2 bg-slate-700 text-white rounded-lg shadow-md cursor-grab touch-none select-none text-lg font-semibold border-b-4 border-slate-900 active:cursor-grabbing active:border-b-0 active:translate-y-1 transition-all">
            {word}
        </div>
    );
};


function shuffleArray(array: string[]): string[] {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    // Ensure the shuffled sentence is not the same as the original
    if (newArray.join(' ') === array.join(' ')) {
        return shuffleArray(array);
    }
    return newArray;
}


function SentenceScrambleGame() {
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();

    const [sentences, setSentences] = useState<ScrambledSentenceData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
    const [words, setWords] = useState<string[]>([]);
    const [isAnswered, setIsAnswered] = useState(false);
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
    const [score, setScore] = useState(0);
    const [gameState, setGameState] = useState<'playing' | 'finished'>('playing');
    const [isSaving, setIsSaving] = useState(false);
    const [isScoreSaved, setIsScoreSaved] = useState(false);

    const gameContext = `Cümle Oluşturma - ${searchParams.get('courseName')} > ${searchParams.get('topicName')}`;

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const fetchSentences = useCallback(async () => {
        setIsLoading(true);
        const params = {
            courseId: searchParams.get('courseId') || undefined,
            unitId: searchParams.get('unitId') || undefined,
            topicId: searchParams.get('topicId') || undefined,
        };
        const result = await getCumleOlusturmaAction(params);
        if (result.error || !result.data) {
            setError(result.error || 'Cümleler yüklenemedi.');
        } else {
            setSentences(result.data);
        }
        setIsLoading(false);
    }, [searchParams]);

    useEffect(() => {
        fetchSentences();
    }, [fetchSentences]);

    useEffect(() => {
        if (sentences.length > 0) {
            const sentence = sentences[currentSentenceIndex].correctSentence;
            setWords(shuffleArray(sentence.split(' ')));
        }
    }, [sentences, currentSentenceIndex]);

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setWords((items) => {
                const oldIndex = items.indexOf(active.id as string);
                const newIndex = items.indexOf(over.id as string);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    }

    const checkAnswer = () => {
        const userAnswer = words.join(' ');
        const correctAnswer = sentences[currentSentenceIndex].correctSentence;
        const correct = userAnswer === correctAnswer;
        setIsCorrect(correct);
        setIsAnswered(true);
        if (correct) {
            setScore(prev => prev + 50);
            playSound('correct');
        } else {
            playSound('incorrect');
        }
    };

    const nextSentence = () => {
        if (currentSentenceIndex < sentences.length - 1) {
            setCurrentSentenceIndex(prev => prev + 1);
            setIsAnswered(false);
            setIsCorrect(null);
        } else {
            setGameState('finished');
        }
    };

    const handleSaveAndExit = async () => {
        if (isSaving || isScoreSaved || !user) {
            router.push('/oyunlar/cumle-olusturma');
            return;
        }
        setIsSaving(true);
        const result = await submitCumleOlusturmaScoreAction(user.uid, score, gameContext);
        if (result.success) {
            setIsScoreSaved(true);
            toast({ title: 'Başarılı!', description: 'Puanınız kaydedildi.' });
        } else {
            toast({ title: 'Hata', description: result.error, variant: 'destructive' });
        }
        setIsSaving(false);
    }
    
    const handleRestart = () => {
        setCurrentSentenceIndex(0);
        setScore(0);
        setGameState('playing');
        setIsAnswered(false);
        setIsCorrect(null);
        setIsScoreSaved(false);
        // Reshuffle all sentences
        setSentences(prev => [...prev].sort(() => Math.random() - 0.5));
    }

    if (isLoading) return <div className="flex h-screen w-full items-center justify-center bg-slate-900"><Loader2 className="h-12 w-12 animate-spin text-white" /></div>;
    if (error) return <div className="flex h-screen w-full items-center justify-center bg-slate-900 text-red-400 p-4">{error}</div>;
    if (sentences.length === 0) return <div className="flex h-screen w-full items-center justify-center bg-slate-900 text-white p-4">Bu konu için cümle bulunamadı.</div>;

    if (gameState === 'finished') {
        return (
            <GameEndScreen 
                score={score}
                onSave={handleSaveAndExit}
                isSaving={isSaving}
                scoreSaved={isScoreSaved}
                onRestart={handleRestart}
                backUrl="/oyunlar/cumle-olusturma"
            />
        );
    }

    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <div className="flex flex-col min-h-screen bg-slate-800 text-white p-4 md:p-8 items-center justify-center">
                <div className="w-full max-w-4xl">
                    <h1 className="text-3xl font-bold text-center mb-2 text-cyan-400">Cümle Oluşturma</h1>
                    <p className="text-center text-slate-400 mb-4">Kelimeleri sürükleyerek anlamlı bir cümle oluşturun.</p>
                    <div className="flex justify-between items-center mb-4">
                        <span className="font-bold">Puan: {score}</span>
                        <span className="text-sm text-slate-300">Cümle {currentSentenceIndex + 1} / {sentences.length}</span>
                    </div>
                     <Progress value={((currentSentenceIndex + 1) / sentences.length) * 100} className="w-full mb-6" />

                    <div className="bg-slate-900 p-6 rounded-lg shadow-lg min-h-[100px] flex flex-wrap gap-3 items-center justify-center border-2 border-slate-700">
                        <SortableContext items={words} strategy={sortableKeyboardCoordinates}>
                            {words.map(word => <Word key={word} id={word} word={word} />)}
                        </SortableContext>
                    </div>

                    <div className="mt-6 text-center">
                        {isAnswered ? (
                            <div className="space-y-4">
                                <p className={cn("text-xl font-bold", isCorrect ? "text-green-400" : "text-red-400")}>
                                    {isCorrect ? "Tebrikler, doğru!" : "Yanlış! Doğru cümle:"}
                                </p>
                                {!isCorrect && (
                                    <p className="font-mono p-2 bg-slate-700 rounded-md text-lg">{sentences[currentSentenceIndex].correctSentence}</p>
                                )}
                                <Button onClick={nextSentence} className="bg-cyan-500 hover:bg-cyan-600 text-white text-lg px-8 py-6">
                                    {currentSentenceIndex === sentences.length - 1 ? "Oyunu Bitir" : "Sıradaki Cümle"} <ArrowRight className="ml-2 h-5 w-5" />
                                </Button>
                            </div>
                        ) : (
                            <Button onClick={checkAnswer} className="bg-green-500 hover:bg-green-600 text-white text-lg px-8 py-6">
                                <Shuffle className="mr-2 h-5 w-5" /> Kontrol Et
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </DndContext>
    );
}

export default function Page() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-slate-900"><Loader2 className="h-12 w-12 animate-spin text-white" /></div>}>
            <SentenceScrambleGame />
        </Suspense>
    );
}
