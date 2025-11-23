'use client';

import { useState, useEffect, Suspense, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft } from 'lucide-react';
import type { Topic } from '@/lib/types';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { cn } from '@/lib/utils';
import { FullscreenToggle } from '@/components/fullscreen-toggle';

function OzetlerDisplayPage() {
    const params = useParams();
    const [courseId, unitId, topicId] = params.slug as string[];
    
    const [topic, setTopic] = useState<Topic | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const mainContentRef = useRef<HTMLDivElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const fetchContent = useCallback(async () => {
        if (!topicId || !courseId || !unitId) {
            setError("Eksik bilgi: Gerekli konu detayları bulunamadı.");
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const topicRef = doc(db, 'courses', courseId, 'units', unitId, 'topics', topicId);
            const topicSnap = await getDoc(topicRef);
            
            if (topicSnap.exists()) {
                const topicData = topicSnap.data() as Topic;
                if (topicData.htmlContent) {
                    setTopic(topicData);
                } else {
                    setError('Bu konu için interaktif özet içeriği bulunamadı.');
                }
            } else {
                 setError('Konu bulunamadı.');
            }
        } catch (e: any) {
            setError('İçerik alınırken bir hata oluştu.');
        } finally {
            setIsLoading(false);
        }
    }, [topicId, courseId, unitId]);

    useEffect(() => {
        fetchContent();
    }, [fetchContent]);

    if (isLoading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary"/></div>;
    }
    
    const backUrl = `/student/ozetler`;
    
    if (error || !topic || !topic.htmlContent) {
        return (
             <div className="flex h-screen items-center justify-center text-center p-8">
                <div>
                    <p className="text-destructive mb-4">{error || "Bu konu için içerik bulunmuyor."}</p>
                     <Button asChild variant="outline"><Link href={backUrl}>Özet Listesine Dön</Link></Button>
                </div>
            </div>
        )
    }
    
    return (
        <div 
            ref={mainContentRef} 
            className={cn(
                "w-full h-full min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col", 
                !isFullscreen && "p-4 sm:p-6 md:p-8"
            )}
        >
            <div className={cn(
                "flex-shrink-0",
                !isFullscreen && "container mx-auto max-w-7xl"
            )}>
                 <div className={cn(
                    "flex justify-between items-center", 
                    isFullscreen ? "mb-1 px-2 py-1" : "mb-6 md:mb-12 text-center flex-col"
                )}>
                    <div className={cn("flex-1 overflow-hidden w-full", isFullscreen && "text-left")}>
                        <h1 className={cn("font-bold font-headline truncate", isFullscreen ? "text-xl" : "text-4xl")}>{topic?.title || 'Özet'}</h1>
                    </div>
                    <div className={cn("flex gap-2 justify-center", isFullscreen ? "ml-4" : "mt-4")}>
                        <Button variant="outline" asChild size={isFullscreen ? 'sm' : 'default'}>
                            <Link href={backUrl}>
                                <ArrowLeft className="mr-2 h-4 w-4"/> Özet Listesine Dön
                            </Link>
                        </Button>
                        <FullscreenToggle elementRef={mainContentRef} />
                    </div>
                </div>
            </div>
            
            <div className={cn("flex-grow flex flex-col min-h-0", !isFullscreen && "container mx-auto max-w-7xl")}>
                <div className={cn("w-full", isFullscreen ? "h-full" : "h-[80vh]")}>
                    <iframe
                        srcDoc={topic.htmlContent}
                        className="w-full h-full border-0 rounded-lg"
                        title={topic.title}
                        sandbox="allow-scripts allow-same-origin"
                    />
                </div>
            </div>
        </div>
    );
}

export default function Page() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-screen"><Loader2 className="h-12 w-12 animate-spin text-primary"/></div>}>
            <OzetlerDisplayPage />
        </Suspense>
    )
}
