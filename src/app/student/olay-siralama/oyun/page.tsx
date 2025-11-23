
"use client"

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { getOlaySiralamaAction, submitOlaySiralamaScoreAction, type SortingGameItem } from '../actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, ArrowLeft, AlertTriangle, ArrowDownUp, CheckCircle, GripVertical } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { playSound } from '@/lib/audio-service';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type SortableItemData = {
    id: string;
    text: string;
};

function SortableListItem({ item, isDragging }: { item: SortableItemData, isDragging: boolean }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });
    const style = { transform: CSS.Transform.toString(transform), transition };
    return (
        <div ref={setNodeRef} style={style} className={cn("p-4 bg-muted rounded-lg flex items-center gap-3 shadow-sm", isDragging && "opacity-50")}>
            <Button variant="ghost" {...attributes} {...listeners} className="cursor-grab touch-none p-2"><GripVertical className="h-5 w-5 text-muted-foreground"/></Button>
            <span className="flex-1">{item.text}</span>
        </div>
    );
};

function EventSortingGame() {
    const searchParams = useSearchParams();
    const { user } = useAuth();
    
    const [originalItems, setOriginalItems] = useState<string[]>([]);
    const [sortableItems, setSortableItems] = useState<SortableItemData[]>([]);
    const [title, setTitle] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [score, setScore] = useState(0);
    const [isFinished, setIsFinished] = useState(false);
    
    const [isAnswered, setIsAnswered] = useState(false);
    const [activeId, setActiveId] = useState<string | null>(null);

    const isStatic = searchParams.get('static') === 'true';
    const gameContext = `Olay Sıralama - ${searchParams.get('topicName')}`;

    useEffect(() => {
        const fetchGameData = async () => {
            const params = {
                courseId: searchParams.get('courseId') || undefined,
                unitId: searchParams.get('unitId') || undefined,
                topicId: searchParams.get('topicId') || undefined,
            };
            const result = await getOlaySiralamaAction(params);

            if (result.error || !result.data || result.data.length === 0) {
                setError(result.error || "Bu oyun için uygun veri bulunamadı.");
            } else {
                const gameData = result.data[0]; // Assuming one sorting game per topic for now
                setTitle(gameData.title);
                setOriginalItems(gameData.items as string[]);
                setSortableItems(shuffleArray(gameData.items as string[]).map((item, i) => ({ id: `item-${i}`, text: item })));
            }
            setIsLoading(false);
        };
        fetchGameData();
    }, [searchParams, isStatic]);
    
    const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
    
    const handleDragStart = (event: DragEndEvent) => setActiveId(event.active.id as string);
    
    const handleDragEnd = (event: DragEndEvent) => {
        setActiveId(null);
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = sortableItems.findIndex(item => item.id === active.id);
            const newIndex = sortableItems.findIndex(item => item.id === over.id);
            setSortableItems(items => arrayMove(items, oldIndex, newIndex));
        }
    };
    
    const checkOrder = async () => {
        const isCorrect = sortableItems.every((item, index) => item.text === originalItems[index]);
        if(isCorrect) {
            playSound('correct');
            const newScore = 50;
            setScore(newScore);
            if(user && newScore > 0 && !isStatic) {
                await submitOlaySiralamaScoreAction(user.uid, newScore, gameContext);
            }
        } else {
            playSound('incorrect');
        }
        setIsAnswered(true);
        setIsFinished(true);
    };

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
                    <CardHeader>
                        <CardTitle>{score > 0 ? "Tebrikler!" : "Tekrar Dene"}</CardTitle>
                        <CardDescription>Olay Sıralama etkinliğini tamamladınız.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-bold text-primary">{score}</p>
                        <p className="text-muted-foreground">Toplam Puan</p>
                    </CardContent>
                    <CardFooter className="flex-col gap-2">
                        <Button onClick={() => window.location.reload()} className="w-full">Tekrar Oyna</Button>
                        <Button variant="outline" asChild className="w-full">
                           <Link href={backUrl}>Etkinlik Merkezine Dön</Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex h-screen w-full items-center justify-center p-4 bg-sky-50 dark:bg-sky-900/50">
                <Card className="w-full max-w-2xl">
                    <CardHeader>
                        <CardTitle className="text-3xl font-bold font-headline text-center">{title || "Olayları Sırala"}</CardTitle>
                        <CardDescription className="text-center">Cümleleri veya olayları doğru sıraya koymak için sürükleyip bırakın.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <div className="space-y-3">
                             <SortableContext items={sortableItems} strategy={verticalListSortingStrategy}>
                                {sortableItems.map(item => <SortableListItem key={item.id} item={item} isDragging={activeId === item.id} />)}
                            </SortableContext>
                         </div>
                    </CardContent>
                     <CardFooter className="flex justify-end">
                        <Button onClick={checkOrder} disabled={isAnswered}>
                            <CheckCircle className="mr-2 h-4 w-4" /> Sırayı Kontrol Et
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </DndContext>
    );
}

function shuffleArray<T>(array: T[]): T[] {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

export default function EventSortingPage() {
    return <Suspense><EventSortingGame /></Suspense>;
}
