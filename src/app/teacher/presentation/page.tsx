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
                "h-screen w-screen bg-slate-50 text-slate-900 overflow-hidden flex flex-col font-sans relative transition-colors duration-500",
                !isFullscreen && "p-4 md:p-6"
            )}
        >
             {/* Arka Plan Efektleri (Light Mode Uyumlu) */}
             <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[1000px] h-[1000px] bg-purple-300/20 rounded-full blur-[150px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-blue-300/20 rounded-full blur-[150px]" />
            </div>

            {/* Header / Üst Bar */}
            <header className={cn(
                "flex-shrink-0 z-20 flex items-center justify-between transition-all duration-300",
                isFullscreen 
                    ? "absolute top-0 left-0 right-0 p-2 bg-white/80 backdrop-blur-md border-b border-slate-200 opacity-0 hover:opacity-100 focus-within:opacity-100 shadow-sm" 
                    : "mb-4 bg-white/60 backdrop-blur-xl border border-slate-200 rounded-2xl p-4 shadow-sm"
            )}>
                <div className="flex items-center gap-4 overflow-hidden">
                    <div className={cn("p-2.5 rounded-xl shadow-md flex-shrink-0 transition-all", isFullscreen ? "bg-transparent shadow-none p-0" : "bg-white border border-slate-100")}>
                        <Presentation className={cn("text-purple-600", isFullscreen ? "h-5 w-5" : "h-6 w-6")}/>
                    </div>
                    <div className="overflow-hidden">
                        <h1 className={cn("font-black tracking-tight text-slate-800 uppercase truncate leading-none", isFullscreen ? "text-lg" : "text-2xl")}>
                            {content.title}
                        </h1>
                        {!isFullscreen && <p className="text-xs text-slate-500 font-bold mt-1 truncate tracking-wide">{courseName} • {unitName}</p>}
                    </div>
                </div>
                 
                 <div className="flex items-center gap-3 flex-shrink-0">
                    <FullscreenToggle elementRef={mainContentRef} className="bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 h-10 w-10 rounded-xl shadow-sm" />
                    {!isFullscreen && (
                        <Button asChild variant="ghost" size="icon" className="text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl h-10 w-10">
                            <Link href="/teacher/ders-akisi"><ArrowLeft className="h-5 w-5" /></Link>
                        </Button>
                    )}
                 </div>
            </header>
            
            {/* İçerik Alanı */}
            <div className="flex-grow flex flex-col min-h-0 relative z-10">
                 <div className={cn(
                    "w-full h-full overflow-hidden transition-all duration-300",
                    // Fullscreen değilse kağıt/kart efekti ver
                    isFullscreen 
                        ? "rounded-none bg-white" 
                        : "rounded-3xl border-4 border-white shadow-2xl bg-white ring-1 ring-slate-200/50"
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