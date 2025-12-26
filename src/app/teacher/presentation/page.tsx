
'use client';

import { Suspense, useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, ArrowLeft, Presentation } from 'lucide-react';
import { doc, getDoc, collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Topic, Unit } from '@/lib/types';
import { LessonContentViewer } from '@/components/lesson-content-viewer';
import { FullscreenToggle } from '@/components/fullscreen-toggle';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { cn } from '@/lib/utils';

function PresentationPageContent() {
    const searchParams = useSearchParams();
    const courseId = searchParams.get('courseId');
    const unitId = searchParams.get('unitId');
    const topicId = searchParams.get('topicId');
    const courseName = searchParams.get('courseName');
    const unitName = searchParams.get('unitName');

    const [topic, setTopic] = useState<Topic | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const mainContentRef = useRef<HTMLElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

     useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, []);

    const fetchContent = useCallback(async () => {
        setIsLoading(true);
        if (!courseId || !unitId) {
            setIsLoading(false);
            return;
        }

        try {
            if (topicId) {
                // Fetch single topic
                const topicRef = doc(db, 'courses', courseId, 'units', unitId, 'topics', topicId);
                const topicSnap = await getDoc(topicRef);
                if (topicSnap.exists()) {
                    setTopic({ id: topicSnap.id, ...topicSnap.data() } as Topic);
                }
            } else {
                // Fetch all topics in the unit and merge their steps for a full unit presentation
                const unitRef = doc(db, `courses/${courseId}/units/${unitId}`);
                const unitSnap = await getDoc(unitRef);
                if (unitSnap.exists()) {
                    const unitData = unitSnap.data() as Unit;
                    setTopic({
                        id: unitId,
                        title: unitData.title,
                        steps: (unitData.steps || []), // No filtering for teacher presentation
                    });
                }
            }
        } catch (error) {
            console.error("Error fetching content for presentation:", error);
        } finally {
            setIsLoading(false);
        }
    }, [courseId, unitId, topicId, unitName]);

    useEffect(() => {
        fetchContent();
    }, [fetchContent]);

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-950">
                <Loader2 className="h-12 w-12 animate-spin text-purple-500" />
            </div>
        );
    }
    
    if (!topic) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-400">
                <div className="text-center">
                    <p className="text-xl font-bold mb-4">Sunum içeriği bulunamadı.</p>
                    <Button asChild variant="outline" className="border-white/10 text-white hover:bg-white/5">
                        <Link href="/teacher/ders-akisi">Geri Dön</Link>
                    </Button>
                </div>
            </div>
        );
    }

    // Teacher presentation doesn't track progress, so we provide dummy functions.
    const noOp = () => {};

    return (
        <main 
            ref={mainContentRef} 
            className={cn(
                "h-screen w-screen bg-slate-950 text-white overflow-hidden flex flex-col font-sans relative",
                !isFullscreen && "p-4 md:p-6"
            )}
        >
             <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[1000px] h-[1000px] bg-purple-900/10 rounded-full blur-[150px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-indigo-900/10 rounded-full blur-[150px]" />
            </div>

            <header className={cn(
                "flex-shrink-0 z-20 flex items-center justify-between transition-all duration-300",
                isFullscreen 
                    ? "absolute top-0 left-0 right-0 p-2 bg-slate-900/80 backdrop-blur-md border-b border-white/10 opacity-0 hover:opacity-100 focus-within:opacity-100" 
                    : "mb-4 bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-lg"
            )}>
                <div className="flex items-center gap-4 overflow-hidden">
                    <div className={cn("p-2.5 rounded-xl shadow-lg flex-shrink-0", isFullscreen ? "bg-transparent p-0" : "bg-gradient-to-br from-purple-500 to-indigo-600")}>
                        <Presentation className={cn("text-white", isFullscreen ? "h-5 w-5" : "h-6 w-6")}/>
                    </div>
                    <div className="overflow-hidden">
                        <h1 className={cn("font-black tracking-tight text-white uppercase truncate leading-none", isFullscreen ? "text-lg" : "text-2xl")}>
                            {topic.title}
                        </h1>
                        {!isFullscreen && <p className="text-xs text-slate-400 font-medium mt-1 truncate">{courseName} • {unitName}</p>}
                    </div>
                </div>
                 
                 <div className="flex items-center gap-2 flex-shrink-0">
                    <FullscreenToggle elementRef={mainContentRef} className="bg-slate-800 text-slate-300 hover:text-white border-0 h-9 w-9 rounded-lg" />
                    {!isFullscreen && (
                        <Button asChild variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-white/10 rounded-lg h-9 w-9">
                            <Link href="/teacher/ders-akisi"><ArrowLeft className="h-5 w-5" /></Link>
                        </Button>
                    )}
                 </div>
            </header>
            
            <div className="flex-grow flex flex-col min-h-0 relative z-10">
                 <div className={cn(
                    "w-full h-full overflow-hidden transition-all duration-300 bg-white dark:bg-slate-900",
                    isFullscreen ? "rounded-none" : "rounded-2xl border-4 border-slate-800 shadow-2xl ring-1 ring-white/10"
                )}>
                    <LessonContentViewer
                        topic={topic} // Pass all steps, no filtering
                        courseId={courseId!}
                        unitId={unitId!}
                        courseTitle={courseName!}
                        unitTitle={unitName!}
                        onTopicComplete={noOp}
                        progress={undefined}
                        onProgressUpdate={noOp}
                        onMultiAnswer={noOp}
                        onAllTfAnswered={noOp}
                        isFullscreen={isFullscreen}
                    />
                </div>
            </div>
        </main>
    );
}


export default function PresentationPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-950"><Loader2 className="h-12 w-12 animate-spin text-purple-500" /></div>}>
            <PresentationPageContent />
        </Suspense>
    )
}
