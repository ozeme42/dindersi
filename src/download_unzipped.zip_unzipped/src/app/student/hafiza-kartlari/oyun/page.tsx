
"use client";

import React, { useState, useEffect, Suspense, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getMemoryGameAction, submitMemoryGameScoreAction, type MemoryCardPair } from '../actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Home, ArrowLeft, Layers } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { playSound } from '@/lib/audio-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Loader2, Repeat, CheckCircle2, Save } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { FullscreenToggle } from '@/components/fullscreen-toggle';


type CardItem = {
    id: number;
    pairId: number;
    type: 'concept' | 'definition';
    text: string;
};

const shuffleArray = <T,>(array: T[]): T[] => {
    return array.slice().sort(() => Math.random() - 0.5);
};

const MemoryGame = () => {
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    
    const [cards, setCards] = useState<CardItem[]>([]);
    const mainContentRef = useRef<HTMLDivElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    
    const [choiceOne, setChoiceOne] = useState<CardItem | null>(null);
    const [choiceTwo, setChoiceTwo] = useState<CardItem | null>(null);

    const [matchedPairIds, setMatchedPairIds] = useState<number[]>([]);
    const [disabled, setDisabled] = useState(false);

    const [gameState, setGameState] = useState<'playing' | 'finished'>('playing');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [score, setScore] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    
    const isStatic = searchParams.get('static') === 'true';
    const gameContext = `Hafıza Kartları - ${searchParams.get('topicName')}`;

    const resetTurn = useCallback(() => {
        setChoiceOne(null);
        setChoiceTwo(null);
        setDisabled(false);
    }, []);

    const initializeGame = useCallback((items: MemoryCardPair[]) => {
        const gameCards: CardItem[] = [];
        items.forEach((pair, index) => {
            gameCards.push({ id: index * 2, text: pair.concept, pairId: index, type: 'concept' });
            gameCards.push({ id: index * 2 + 1, text: pair.definition, pairId: index, type: 'definition' });
        });
        setCards(shuffleArray(gameCards));
        setChoiceOne(null);
        setChoiceTwo(null);
        setMatchedPairIds([]);
        setDisabled(false);
        setScore(0);
        setGameState('playing');
    }, []);

    useEffect(() => {
        const fetchGameData = async () => {
            setIsLoading(true);
            const params = {
                courseId: searchParams.get('courseId') || undefined,
                unitId: searchParams.get('unitId') || undefined,
                topicId: searchParams.get('topicId') || undefined,
            };
            const { items, error } = await getMemoryGameAction(params);

            if (error || !items || items.length === 0) {
                setError(error || "Bu konu için uygun veri bulunamadı.");
                setIsLoading(false);
                return;
            }
            
            initializeGame(items);
            setIsLoading(false);
        };

        fetchGameData();
    }, [searchParams, initializeGame]);


    const handleChoice = (card: CardItem) => {
        if (disabled || card.id === choiceOne?.id) return;
        choiceOne ? setChoiceTwo(card) : setChoiceOne(card);
    };

     useEffect(() => {
        if (choiceOne && choiceTwo) {
            setDisabled(true);
            if (choiceOne.pairId === choiceTwo.pairId) {
                // Correct match
                setScore(prev => prev + 25);
                setMatchedPairIds(prev => [...prev, choiceOne.pairId]);
                setTimeout(resetTurn, 800);
            } else {
                // Incorrect match
                playSound('incorrect');
                setTimeout(resetTurn, 1000);
            }
        }
    }, [choiceOne, choiceTwo, resetTurn]);

     useEffect(() => {
        if (cards.length > 0 && matchedPairIds.length === cards.length / 2) {
            setGameState('finished');
        }
    }, [matchedPairIds, cards]);
    
    useEffect(() => {
        const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);


    const handleSaveAndExit = async () => {
        if (isSaving || !user || score <= 0) {
             router.push('/student/activities');
             return;
        };

        setIsSaving(true);
        const result = await submitMemoryGameScoreAction(user.uid, score, gameContext);
        
        if (result.success) {
            toast({ title: 'Başarılı!', description: 'Puanın başarıyla kaydedildi.' });
        } else {
            toast({ title: 'Hata', description: result.error, variant: 'destructive' });
        }
        setIsSaving(false);
        router.push('/student/activities');
    };
    
    const restartGame = useCallback(() => {
        const uniquePairs = cards
            .filter((card, index, self) => index === self.findIndex(c => c.pairId === card.pairId && c.type === 'concept'))
            .map(card => {
                const definitionCard = cards.find(c => c.pairId === card.pairId && c.type === 'definition');
                return {
                    concept: card.text,
                    definition: definitionCard?.text || ''
                };
            });
        initializeGame(uniquePairs);
    }, [cards, initializeGame]);
    
    const backUrl = '/student/hafiza-kartlari';

    if (isLoading) {
        return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin" /></div>;
    }

    if (error) {
        return (
            <div className="flex h-screen w-full items-center justify-center p-4">
                 <Alert variant="destructive" className="max-w-lg">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Hata!</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                    <div className="mt-4">
                        <Button asChild variant="outline">
                            <Link href={backUrl}><ArrowLeft className="mr-2 h-4 w-4" /> Geri Dön</Link>
                        </Button>
                    </div>
                </Alert>
            </div>
        );
    }
    
    if (gameState === 'finished') {
        return (
             <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
                <Card className="w-full max-w-md text-center">
                    <CardHeader>
                        <CardTitle className="text-3xl font-bold">Tebrikler!</CardTitle>
                        <CardDescription>Hafıza Kartları oyununu tamamladın.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <CheckCircle2 className="h-20 w-20 text-green-500 mx-auto mb-4" />
                        <p className="text-xl">Kazandığın Puan: <span className="font-bold text-primary">{score}</span></p>
                    </CardContent>
                    <CardFooter className="flex-col gap-2">
                        <Button className="w-full" onClick={handleSaveAndExit} disabled={isSaving || score <= 0}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                            Puanı Kaydet ve Çık
                        </Button>
                        <Button className="w-full" variant="secondary" onClick={restartGame}><Repeat className="mr-2 h-4 w-4" /> Tekrar Oyna</Button>
                    </CardFooter>
                </Card>
            </div>
        )
    }

    return (
         <div ref={mainContentRef} className="flex h-screen w-full flex-col items-center justify-center p-4 bg-rose-50 dark:bg-rose-900/50">
             <div className={cn("w-full max-w-5xl text-center", isFullscreen && "px-8 h-full flex flex-col")}>
                 <div className={cn("flex-shrink-0 flex justify-between items-center mb-6", isFullscreen && "mb-2")}>
                    <div className="text-left">
                        <h1 className="text-3xl sm:text-4xl font-bold">Hafıza Kartları</h1>
                        <p className="text-muted-foreground">Eşleşen kavram ve tanım kartlarını bulun.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-lg font-bold text-primary">{score}</p>
                            <p className="text-xs text-muted-foreground">PUAN</p>
                        </div>
                         <FullscreenToggle elementRef={mainContentRef}/>
                    </div>
                </div>

                 <div className={cn("flex items-center justify-center", isFullscreen && "flex-grow min-h-0")}>
                    <div className="grid w-full place-content-center gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
                        {cards.map((card, index) => {
                            const isFlipped = matchedPairIds.includes(card.pairId) || choiceOne?.id === card.id || choiceTwo?.id === card.id;

                             return (
                                <div 
                                    key={card.id} 
                                    className="aspect-[3/4] [perspective:1000px] cursor-pointer"
                                    onClick={() => handleChoice(card)}
                                >
                                    <div className={cn(
                                        "relative w-full h-full text-center transition-transform duration-500 [transform-style:preserve-3d]",
                                        isFlipped && "[transform:rotateY(180deg)]"
                                    )}>
                                        {/* Front */}
                                        <div className={cn("absolute w-full h-full [backface-visibility:hidden] bg-rose-500 flex items-center justify-center transition-all group-hover:bg-rose-600 rounded-lg")}>
                                            <Layers className={cn("text-white", isFullscreen ? "h-16 w-16" : "h-8 w-8")} />
                                        </div>
                                        {/* Back */}
                                        <div className={cn(
                                            "absolute w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-lg flex items-center justify-center p-2 text-sm font-semibold overflow-hidden",
                                            matchedPairIds.includes(card.pairId) ? "bg-green-500 text-white" : (card.type === 'concept' ? "bg-blue-200 text-blue-900" : "bg-yellow-200 text-yellow-900")
                                        )}>
                                            <p className={cn("md:text-base", isFullscreen ? "text-lg" : "text-sm")}>
                                                {card.text}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

const MatchingGamePage = () => {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin" /></div>}>
            <MemoryGame />
        </Suspense>
    );
};

export default MatchingGamePage;
