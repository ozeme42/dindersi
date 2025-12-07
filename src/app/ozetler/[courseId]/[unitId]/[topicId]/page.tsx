'use client';
import { useState, useEffect, Suspense, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, LayoutTemplate, AlertTriangle } from 'lucide-react';
import type { Topic } from '@/lib/types';
import Link from 'next/link';
import { useParams, notFound } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { cn } from '@/lib/utils';
import { FullscreenToggle } from '@/components/fullscreen-toggle';

async function getTopicOzet(courseId: string, unitId: string, topicId: string): Promise<Topic | null> {
    try {
        const topicRef = doc(db, 'courses', courseId, 'units', unitId, 'topics', topicId);
        const topicSnap = await getDoc(topicRef);
        if (topicSnap.exists()) {
            return topicSnap.data() as Topic;
        }
        return null;
    } catch (e) {
        console.error("Error fetching topic for ozet:", e);
        return null;
    }
}

function OzetlerDisplayPage({ topic }: { topic: Topic | null }) {
    const mainContentRef = useRef<HTMLDivElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    
    const backUrl = `/`;

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);
    
    if (!topic || !topic.htmlContent) {
        return (
            <div className="min-h-screen bg-slate-800 flex flex-col items-center justify-center p-8 text-center">
                <div className="bg-slate-700 p-8 rounded-3xl border border-red-400/30 max-w-md w-full backdrop-blur-sm shadow-xl">
                    <AlertTriangle className="h-12 w-12 text-red-300 mx-auto mb-4" />
                    <p className="text-red-300 mb-6 font-medium text-lg">Bu konu için interaktif özet içeriği bulunamadı.</p>
                    <Button asChild className="bg-white text-slate-900 hover:bg-slate-200 border-0 w-full font-bold">
                        <Link href={backUrl}><ArrowLeft className="mr-2 h-4 w-4"/> Ana Sayfaya Dön</Link>
                    </Button>
                </div>
            </div>
        )
    }
    
    return (
        <div 
            ref={mainContentRef} 
            className={cn(
                "w-full min-h-screen bg-slate-800 flex flex-col relative overflow-hidden transition-all", 
                !isFullscreen ? "pb-24 md:pb-8" : "pb-0"
            )}
        >
             {!isFullscreen && (
                <div className="fixed inset-0 pointer-events-none z-0 opacity-50">
                    <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-cyan-400/20 rounded-full blur-[120px]" />
                    <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-violet-400/20 rounded-full blur-[120px]" />
                </div>
            )}

            <div className={cn(
                "sticky top-0 z-30 w-full border-b border-white/20 bg-slate-700/90 backdrop-blur-xl transition-all shadow-md",
                !isFullscreen && "pt-4"
            )}>
                 <div className="container mx-auto px-4 pb-4">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 overflow-hidden">
                            {!isFullscreen && (
                                <Button asChild size="sm" className="shrink-0 bg-white text-slate-900 hover:bg-cyan-300 hover:text-slate-950 font-extrabold rounded-xl h-10 px-4 shadow-lg border-2 border-white/50 transition-all">
                                    <Link href={backUrl} className="flex items-center gap-2">
                                        <ArrowLeft className="h-5 w-5 stroke-[3px]"/>
                                        <span className="hidden sm:inline">Geri</span>
                                    </Link>
                                </Button>
                            )}
                            <h1 className="text-lg md:text-xl font-black text-white truncate drop-shadow-md tracking-wide">
                                {topic?.title || 'Özet'}
                            </h1>
                        </div>
                        <div className="flex items-center gap-2 [&_button]:!bg-white [&_button]:!text-slate-900 [&_button]:!border-2 [&_button]:!border-white/50 [&_button]:!h-10 [&_button]:!w-10 [&_button]:!rounded-xl [&_button]:!shadow-lg [&_button:hover]:!bg-cyan-300">
                             <FullscreenToggle elementRef={mainContentRef} />
                        </div>
                    </div>
                 </div>
            </div>
            
            <div className={cn(
                "flex-grow flex flex-col min-h-0 relative z-10 transition-all duration-300",
                !isFullscreen ? "container mx-auto px-4 pt-6" : "p-0"
            )}>
                <div className={cn(
                    "w-full transition-all duration-300 flex flex-col bg-white",
                    !isFullscreen ? "h-[80vh] rounded-2xl border-4 border-slate-600/50 shadow-2xl overflow-hidden" : "h-full rounded-none"
                )}>
                    
                    {!isFullscreen && (
                        <div className="h-10 bg-slate-200 border-b border-slate-300 flex items-center px-4 gap-2 shrink-0">
                            <div className="flex gap-2">
                                <div className="w-3.5 h-3.5 rounded-full bg-red-500 border border-red-600/30 shadow-sm" />
                                <div className="w-3.5 h-3.5 rounded-full bg-amber-500 border border-amber-600/30 shadow-sm" />
                                <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 border border-emerald-600/30 shadow-sm" />
                            </div>
                            
                            <div className="ml-4 flex-1 flex justify-center">
                                <div className="bg-white border border-slate-300 rounded-lg px-6 py-1 text-xs text-slate-600 font-bold flex items-center gap-2 shadow-sm">
                                    <LayoutTemplate className="w-3.5 h-3.5 text-cyan-600" />
                                    <span>Özet Modülü</span>
                                </div>
                            </div>
                        </div>
                    )}
                    <iframe
                        srcDoc={topic.htmlContent}
                        className="w-full flex-grow border-0 bg-white"
                        title={topic.title}
                        sandbox="allow-scripts allow-same-origin"
                    />
                </div>
            </div>
        </div>
    );
}


export default async function Page({ params }: { params: { slug: string[] } }) {
    const [courseId, unitId, topicId] = params.slug;
    
    if (!courseId || !unitId || !topicId) {
        notFound();
    }

    const topic = await getTopicOzet(courseId, unitId, topicId);
    
    if (!topic) {
        notFound();
    }
    
    return <OzetlerDisplayPage topic={topic} />;
}
