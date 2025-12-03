
"use client";

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { getQuestionsFromBank } from '@/lib/quiz-actions';
import type { Question } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, ArrowLeft, FolderKanban, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { updateScore } from '../../actions';
import { useAuth } from '@/context/auth-context';
import { playSound } from '@/lib/audio-service';
import { DndContext, useDroppable, useDraggable, closestCenter } from '@dnd-kit/core';

type DraggableItem = {
    id: string;
    text: string;
    category: string;
};

const Draggable = ({ id, text, isDragging }: { id: string, text: string, isDragging: boolean }) => {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({ id });
    const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
    return <Button ref={setNodeRef} style={style} {...listeners} {...attributes} className={cn("touch-none", isDragging && "opacity-50")}>{text}</Button>;
};

const Droppable = ({ id, children, categoryName, isOver }: { id: string, children: React.ReactNode, categoryName: string, isOver: boolean }) => {
    const { setNodeRef } = useDroppable({ id });
    return (
        <div ref={setNodeRef} className={cn("p-4 border-2 border-dashed rounded-lg min-h-[100px] space-y-2", isOver ? "bg-primary/20 border-primary" : "bg-muted")}>
            <h3 className="font-bold text-lg text-center">{categoryName}</h3>
            {children}
        </div>
    );
};

function CategorizationGame() {
    const searchParams = useSearchParams();
    const { user } = useAuth();

    const [items, setItems] = useState<DraggableItem[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [placedItems, setPlacedItems] = useState<Record<string, DraggableItem[]>>({});
    const [unplacedItems, setUnplacedItems] = useState<DraggableItem[]>([]);
    
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [score, setScore] = useState(0);
    const [isFinished, setIsFinished] = useState(false);
    
    const [activeId, setActiveId] = useState<string | null>(null);
    const [overContainer, setOverContainer] = useState<string | null>(null);

    const isStatic = searchParams.get('static') === 'true';

    useEffect(() => {
        const fetchGameData = async () => {
            const params = {
                courseId: searchParams.get('courseId') || undefined,
                unitId: searchParams.get('unitId') || undefined,
                topicId: searchParams.get('topicId') || undefined,
                questionCount: 8,
                questionTypes: ['mcq'],
                isStatic,
            };
            const result = await getQuestionsFromBank(params);

            if (result.error || !result.questions || result.questions.length < 2) {
                setError(result.error || "Bu oyun için yeterli soru (en az 2) bulunamadı.");
            } else {
                const cats = [result.questions[0].topic, result.questions[1].topic].filter((t, i, a) => a.indexOf(t) === i);
                if (cats.length < 2) {
                     setError("Bu oyun için en az 2 farklı konudan soru gerekmektedir.");
                     setIsLoading(false);
                     return;
                }
                setCategories(cats);
                const gameItems = result.questions.map(q => ({
                    id: q.id!,
                    text: q.correctAnswer!,
                    category: q.topic!
                }));
                setItems(gameItems);
                setUnplacedItems(gameItems);
                
                const initialPlaced: Record<string, DraggableItem[]> = {};
                cats.forEach(c => initialPlaced[c] = []);
                setPlacedItems(initialPlaced);
            }
            setIsLoading(false);
        };
        fetchGameData();
    }, [searchParams, isStatic]);

    const handleDragStart = (event: any) => setActiveId(event.active.id);
    
    const handleDragOver = (event: any) => setOverContainer(event.over?.id || null);

    const handleDragEnd = async (event: any) => {
        const { active, over } = event;
        setActiveId(null);
        setOverContainer(null);
        if (!over) return;
    
        const item = unplacedItems.find(i => i.id === active.id) || Object.values(placedItems).flat().find(i => i.id === active.id);
        if (!item) return;

        // Move item back to unplaced
        if (over.id === 'unplaced') {
            setPlacedItems(prev => {
                const newPlaced = { ...prev };
                for (const cat in newPlaced) {
                    newPlaced[cat] = newPlaced[cat].filter(i => i.id !== item.id);
                }
                return newPlaced;
            });
            if (!unplacedItems.some(i => i.id === item.id)) {
                 setUnplacedItems(prev => [...prev, item]);
            }
            return;
        }

        const isCorrect = item.category === over.id;
        if(isCorrect) playSound('correct'); else playSound('incorrect');

        setScore(prev => prev + (isCorrect ? 10 : -5));
        
        // Optimistically move the item
        setUnplacedItems(prev => prev.filter(i => i.id !== active.id));
        setPlacedItems(prev => {
            const newPlaced = { ...prev };
             for (const cat in newPlaced) { // Remove from old category if it exists
                newPlaced[cat] = newPlaced[cat].filter(i => i.id !== item.id);
            }
            if (!newPlaced[over.id]) newPlaced[over.id] = [];
            if (!newPlaced[over.id].some(i => i.id === item.id)) {
                newPlaced[over.id].push(item);
            }
            return newPlaced;
        });

    };
    
    useEffect(() => {
        if(unplacedItems.length === 0 && items.length > 0) {
            const allCorrect = Object.entries(placedItems).every(([category, items]) => items.every(item => item.category === category));
            if(allCorrect) {
                 if (user && score > 0 && !isStatic) {
                    updateScore(user.uid, score, "kategorilere-ayir", `Konu: ${searchParams.get('topicName')}`);
                 }
                setIsFinished(true);
            }
        }
    }, [unplacedItems, placedItems, items, isFinished, score, user, isStatic, searchParams]);

    const backUrl = isStatic ? '/statik' : '/teacher/activities';

    if (isLoading) return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
    
    if (error) return (
        <div className="flex h-screen w-full items-center justify-center p-4">
            <Alert variant="destructive" className="max-w-lg"><AlertTriangle className="h-4 w-4" /><AlertTitle>Oyun Yüklenemedi</AlertTitle><AlertDescription>{error}</AlertDescription><div className="mt-4"><Button asChild variant="secondary"><Link href={backUrl}>Geri Dön</Link></Button></div></Alert>
        </div>
    );

    if (isFinished) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Card className="w-full max-w-md text-center">
                    <CardHeader><CardTitle>Tebrikler!</CardTitle><CardDescription>Kategorilere Ayırma oyununu tamamladınız.</CardDescription></CardHeader>
                    <CardContent><p className="text-4xl font-bold text-primary">{score}</p><p className="text-muted-foreground">Toplam Puan</p></CardContent>
                    <CardFooter className="flex-col gap-2"><Button onClick={() => window.location.reload()} className="w-full">Tekrar Oyna</Button><Button variant="outline" asChild className="w-full"><Link href={backUrl}>Etkinlik Merkezine Dön</Link></Button></CardFooter>
                </Card>
            </div>
        );
    }

    return (
        <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragOver={handleDragOver} collisionDetection={closestCenter}>
            <div className="flex h-screen w-full flex-col items-center justify-center p-4 bg-lime-50 dark:bg-lime-900/50">
                <Card className="w-full max-w-6xl">
                    <CardHeader>
                        <div className="flex justify-between items-center">
                             <CardTitle className="text-3xl font-bold font-headline">Kategorilere Ayır</CardTitle>
                             <div className="text-lg font-bold text-primary">Puan: {score}</div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <Droppable id="unplaced" categoryName="Kavramlar" isOver={overContainer === 'unplaced'}>
                             <div className="flex flex-wrap gap-2 justify-center">
                                {unplacedItems.map(item => <Draggable key={item.id} id={item.id} text={item.text} isDragging={activeId === item.id} />)}
                                {unplacedItems.length === 0 && <p className="text-muted-foreground">Tüm kavramlar yerleştirildi!</p>}
                            </div>
                        </Droppable>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {categories.map(category => (
                                <Droppable key={category} id={category} categoryName={category} isOver={overContainer === category}>
                                    {placedItems[category]?.map(item => (
                                         <Draggable key={item.id} id={item.id} text={item.text} isDragging={activeId === item.id}/>
                                    ))}
                                </Droppable>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </DndContext>
    );
}

export default function CategorizationPage() {
    return <Suspense><CategorizationGame /></Suspense>;
}
