'use client';

import { Suspense, useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, ArrowLeft, Presentation } from 'lucide-react';
import { doc, getDoc, collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Topic, Unit, LessonStep } from '@/lib/types';
import { LessonContentViewer } from '@/components/lesson-content-viewer';
import { FullscreenToggle } from '@/components/fullscreen-toggle';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';

function PresentationPageContent() {
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const courseId = searchParams.get('courseId');
    const unitId = searchParams.get('unitId');
    const topicId = searchParams.get('topicId');
    const courseName = searchParams.get('courseName');
    const unitName = searchParams.get('unitName');

    const [content, setContent] = useState<(Topic | Unit) & { steps?: LessonStep[] } | null>(null);
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
            let contentRef;
            if (topicId) {
                contentRef = doc(db, 'courses', courseId, 'units', unitId, 'topics', topicId);
            } else {
                contentRef = doc(db, 'courses', courseId, 'units', unitId);
            }

            const contentSnap = await getDoc(contentRef);
            
            if (contentSnap.exists()) {
                 const data = contentSnap.data();
                 const contentId = contentSnap.id;
                 let steps = data.steps || [];

                 // If it's a unit-level presentation without its own steps, aggregate from topics
                 if (!topicId && steps.length === 0) {
                     const topicsSnapshot = await getDocs(query(collection(db, `courses/${courseId}/units/${unitId}/topics`), orderBy("title")));
                     steps = topicsSnapshot.docs.flatMap(doc => (doc.data().steps || []));
                 }
                 
                 // Static flow fallback
                 try {
                     const flowRes = await fetch(`/curriculum/flows/${contentId}.json`);
                     if (flowRes.ok) {
                         const staticSteps = await flowRes.json();
                         if (staticSteps.length > 0 && steps.length === 0) {
                            steps = staticSteps;
                         }
                     }
                 } catch (e) {
                     // It's okay if flow file doesn't exist.
                 }
                
                let finalSteps = steps;
                // If user is not a teacher, filter out unpublished steps
                if (user?.role !== 'teacher' && user?.role !== 'superadmin') {
                    finalSteps = steps.filter((s: any) => s.isPublished ?? true);
                }

                 setContent({ id: contentId, title: data.title, steps: finalSteps });
            }
        } catch (error) {
            console.error("Error fetching content for presentation:", error);
        } finally {
            setIsLoading(false);
        }
    }, [courseId, unitId, topicId, user]);

    useEffect(() => {
        fetchContent();
    }, [fetchContent]);

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50">
                <Loader2 className="h-12 w-12 animate-spin text-purple-600" />
            </div>
        );
    }
    
    if (!content) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-500">
                <div className="text-center">
                    <p className="text-xl font-bold mb-4 text-slate-800">Sunum içeriği bulunamadı.</p>
                    <Button asChild variant="outline" className="border-slate-300 text-slate-600 hover:bg-slate-100 hover:text-slate-900">
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
                "h-screen w-screen bg-slate-100/50 text-slate-900 overflow-hidden flex flex-col font-sans relative transition-colors duration-500",
                !isFullscreen && "p-4 md:p-6 lg:p-8"
            )}
        >
             {/* Modern Animated Ambient Background */}
             <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] bg-fuchsia-400/20 rounded-full blur-[120px] mix-blend-multiply animate-pulse" style={{ animationDuration: '8s' }} />
                <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] bg-cyan-400/20 rounded-full blur-[120px] mix-blend-multiply animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
                <div className="absolute top-[20%] left-[30%] w-[40vw] h-[40vw] bg-amber-300/10 rounded-full blur-[100px] mix-blend-multiply animate-pulse" style={{ animationDuration: '12s', animationDelay: '4s' }} />
            </div>

            {/* Header / Üst Bar - Glassmorphism */}
            <header className={cn(
                "flex-shrink-0 z-20 flex items-center justify-between transition-all duration-500 ease-out",
                isFullscreen 
                    ? "absolute top-0 left-0 right-0 p-4 bg-white/40 backdrop-blur-2xl border-b border-white/50 opacity-0 hover:opacity-100 focus-within:opacity-100 shadow-sm transform -translate-y-2 hover:translate-y-0" 
                    : "mb-6 bg-white/60 backdrop-blur-2xl border border-white/80 rounded-[2rem] p-4 px-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)]"
            )}>
                <div className="flex items-center gap-5 overflow-hidden">
                    <div className={cn(
                        "flex items-center justify-center shadow-inner transition-all duration-300", 
                        isFullscreen ? "bg-transparent p-0" : "bg-gradient-to-br from-indigo-500 to-purple-600 p-3 rounded-2xl"
                    )}>
                        <Presentation className={cn("text-white", isFullscreen ? "h-6 w-6 text-purple-600" : "h-7 w-7")}/>
                    </div>
                    <div className="overflow-hidden flex flex-col justify-center">
                        <h1 className={cn(
                            "font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-slate-800 to-slate-600 uppercase truncate leading-tight drop-shadow-sm", 
                            isFullscreen ? "text-xl" : "text-3xl"
                        )}>
                            {content.title}
                        </h1>
                        {!isFullscreen && <p className="text-sm text-slate-500 font-bold mt-0.5 truncate tracking-wider uppercase opacity-80">{courseName} <span className="mx-1 text-purple-400">•</span> {unitName}</p>}
                    </div>
                </div>
                 
                 <div className="flex items-center gap-4 flex-shrink-0">
                    <FullscreenToggle elementRef={mainContentRef} className="bg-white/80 backdrop-blur-md border border-white text-slate-600 hover:text-purple-600 hover:bg-white h-12 w-12 rounded-2xl shadow-sm transition-all hover:scale-105 hover:shadow-md" />
                    {!isFullscreen && (
                        <Button asChild variant="ghost" size="icon" className="bg-white/80 backdrop-blur-md border border-white text-slate-600 hover:text-rose-600 hover:bg-white rounded-2xl h-12 w-12 transition-all hover:scale-105 hover:shadow-md">
                            <Link href="/teacher/ders-akisi"><ArrowLeft className="h-6 w-6" /></Link>
                        </Button>
                    )}
                 </div>
            </header>
            
            {/* İçerik Alanı */}
            <div className="flex-grow flex flex-col min-h-0 relative z-10">
                 <div className={cn(
                    "w-full h-full overflow-hidden transition-all duration-500 ease-in-out",
                    // Fullscreen değilse şık kart efekti ver
                    isFullscreen 
                        ? "rounded-none bg-transparent" 
                        : "rounded-[3rem] border-4 border-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] bg-white/90 backdrop-blur-md ring-1 ring-slate-900/5"
                )}>
                    <LessonContentViewer
                        topic={content as Topic}
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
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-50"><Loader2 className="h-12 w-12 animate-spin text-purple-600" /></div>}>
            <PresentationPageContent />
        </Suspense>
    )
}