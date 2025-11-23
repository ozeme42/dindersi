
"use client";

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getMatchingGameAction, submitMatchingGameScoreAction, type MatchItem } from '../actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Home, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { playSound } from '@/lib/audio-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Loader2, Repeat, CheckCircle2, Save } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

type CardItem = {
    id: number;
    pairId: number;
    type: 'concept' | 'definition';
    text: string;
}

const shuffleArray = <T,>(array: T[]): T[] => {
    return array.slice().sort(() => Math.random() - 0.5);
};

const colorClasses = [
    'bg-green-500 border-green-700',
    'bg-blue-500 border-blue-700',
    'bg-purple-500 border-purple-700',
    'bg-pink-500 border-pink-700',
    'bg-orange-500 border-orange-700',
    'bg-teal-500 border-teal-700',
    'bg-indigo-500 border-indigo-700',
];

const MatchingGame = () => {
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    
    const [concepts, setConcepts] = useState<CardItem[]>([]);
    const [definitions, setDefinitions] = useState<CardItem[]>([]);
    
    const [choiceOne, setChoiceOne] = useState<CardItem | null>(null);
    const [choiceTwo, setChoiceTwo] = useState<CardItem | null>(null);

    const [matchedPairs, setMatchedPairs] = useState<number[]>([]);
    const [disabled, setDisabled] = useState(false);

    const [gameState, setGameState] = useState<'playing' | 'finished'>('playing');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [score, setScore] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    
    const isStatic = searchParams.get('static') === 'true';
    const gameContext = `Eşleştirme - ${searchParams.get('topicName')}`;

    const resetTurn = useCallback(() => {
        setChoiceOne(null);
        setChoiceTwo(null);
        setDisabled(false);
    }, []);

    useEffect(() => {
        const fetchGameData = async () => {
            setIsLoading(true);
            const params = {
                courseId: searchParams.get('courseId') || undefined,
                unitId: searchParams.get('unitId') || undefined,
                topicId: searchParams.get('topicId') || undefined,
            };
            const { items, error } = await getMatchingGameAction(params);

            if (error || !items || items.length === 0) {
                setError(error || "Bu konu için uygun veri bulunamadı.");
                setIsLoading(false);
                return;
            }
            
            const concepts = items.map((item, i) => ({ 
                id: i, 
                pairId: i, 
                type: 'concept', 
                text: item.concept,
            }));
            const definitions = shuffleArray(items.map((item, i) => ({ 
                id: i + items.length, 
                pairId: i, 
                type: 'definition', 
                text: item.definition,
            })));

            setConcepts(concepts);
            setDefinitions(definitions);
            resetTurn();
            setMatchedPairs([]);
            setScore(0);
            setIsLoading(false);
        };

        fetchGameData();
    }, [searchParams, resetTurn]);


    const handleChoice = (card: CardItem) => {
        if (disabled || matchedPairs.includes(card.pairId)) return;
        choiceOne ? setChoiceTwo(card) : setChoiceOne(card);
    };

    useEffect(() => {
        if (choiceOne && choiceTwo) {
            setDisabled(true);
            if (choiceOne.pairId === choiceTwo.pairId) {
                // Correct match
                playSound('correct');
                setScore(prev => prev + 25);
                setMatchedPairs(prev => [...prev, choiceOne.pairId]);
                setTimeout(resetTurn, 800);
            } else {
                // Incorrect match
                playSound('incorrect');
                setTimeout(resetTurn, 1000);
            }
        }
    }, [choiceOne, choiceTwo, resetTurn]);


     useEffect(() => {
        if (concepts.length > 0 && matchedPairs.length === concepts.length) {
            setGameState('finished');
        }
    }, [matchedPairs, concepts]);


    const handleSaveAndExit = async () => {
        if (isSaving || !user || score <= 0) {
             router.push('/student/activities');
             return;
        };

        setIsSaving(true);
        const result = await submitMatchingGameScoreAction(user.uid, score, gameContext);
        
        if (result.success) {
            toast({ title: 'Başarılı!', description: 'Puanın başarıyla kaydedildi.' });
        } else {
            toast({ title: 'Hata', description: result.error, variant: 'destructive' });
        }
        setIsSaving(false);
        router.push('/student/activities');
    };
    
    const restartGame = () => {
        setScore(0);
        setGameState('playing');
        setMatchedPairs([]);
        resetTurn();
        setDefinitions(shuffleArray(definitions));
    };
    
    const backUrl = '/student/eslestirme';

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
                        <CardDescription>Eşleştirme oyununu tamamladın.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <CheckCircle2 className="h-20 w-20 text-green-500 mx-auto mb-4" />
                        <p className="text-xl">Kazandığın Puan: <span className="font-bold text-primary">{score}</span></p>
                    </CardContent>
                    <CardFooter className="flex-col gap-2">
                        <Button className="w-full" onClick={handleSaveAndExit} disabled={isSaving || score <= 0}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                            Puanı Kaydet ve Çık
                        </Button>
                        <Button className="w-full" variant="secondary" onClick={restartGame}><Repeat className="mr-2 h-4 w-4" /> Tekrar Oyna</Button>
                    </CardFooter>
                </Card>
            </div>
        )
    }

    const isCardSelected = (card: CardItem) => choiceOne?.id === card.id || choiceTwo?.id === card.id;
    const isCardMatched = (card: CardItem) => matchedPairs.includes(card.pairId);

    const getItemStyle = (card: CardItem, side: 'left' | 'right') => {
        const isSelected = isCardSelected(card);
        const isMatched = isCardMatched(card);

        if (isMatched) {
            return `opacity-20 cursor-not-allowed scale-95 ${colorClasses[card.pairId % colorClasses.length]} text-white`;
        }
        if (isSelected) {
            return "ring-4 ring-blue-500 bg-blue-100 scale-105 z-10";
        }
        if (side === 'left') {
            return `${colorClasses[card.id % colorClasses.length]} text-white`;
        }
        return "bg-background hover:bg-muted/80";
    };


    return (
         <div className="p-4 sm:p-8 max-w-6xl mx-auto">
            <h1 className="text-3xl sm:text-4xl font-bold text-center mb-2">Eşleştirme Oyunu</h1>
            <p className="text-center text-muted-foreground mb-6">İlişkili kartlara tıklayarak eşleştirin.</p>
            <div className="text-center mb-6 text-2xl font-bold text-primary">Puan: {score}</div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 items-start">
                <div className="space-y-3">
                    <h3 className="text-center font-semibold text-muted-foreground">KAVRAMLAR</h3>
                    {concepts.map(item => (
                        <Button 
                            key={item.id}
                            onClick={() => handleChoice(item)}
                            disabled={isCardMatched(item) || disabled}
                            variant="outline"
                            className={cn(
                                "h-auto w-full justify-start text-left whitespace-normal p-3 transition-all",
                                "text-base md:text-lg",
                                getItemStyle(item, 'left')
                            )}
                        >
                           {item.text}
                        </Button>
                    ))}
                </div>

                <div className="space-y-3">
                    <h3 className="text-center font-semibold text-muted-foreground">TANIMLAR</h3>
                    {definitions.map(item => (
                         <Button 
                            key={item.id}
                            onClick={() => handleChoice(item)}
                            disabled={isCardMatched(item) || disabled}
                            variant="outline"
                             className={cn(
                                "h-auto w-full justify-start text-left whitespace-normal p-3 transition-all",
                                "text-base md:text-lg",
                                getItemStyle(item, 'right')
                            )}
                        >
                           {item.text}
                        </Button>
                    ))}
                </div>
            </div>
        </div>
    );
};

const MatchingGamePage = () => {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin" /></div>}>
            <MatchingGame />
        </Suspense>
    );
};

export default MatchingGamePage;
