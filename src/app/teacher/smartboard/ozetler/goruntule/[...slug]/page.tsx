
'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Loader2, ArrowLeft, LayoutTemplate, BookOpen } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Unit, Topic } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FullscreenToggle } from '@/components/fullscreen-toggle';
import Link from 'next/link';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

async function getContent(courseId: string, unitId: string, topicId?: string): Promise<{ title: string, htmlContent: string } | null> {
    try {
        let docRef;
        if (topicId) {
            docRef = doc(db, 'courses', courseId, 'units', unitId, 'topics', topicId);
        } else {
            docRef = doc(db, 'courses', courseId, 'units', unitId);
        }
        
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.htmlContent) {
                return { title: data.title, htmlContent: data.htmlContent };
            }
        }
        return null;
    } catch (e) {
        console.error("Error fetching content:", e);
        return null;
    }
}


function OzetDisplayPage() {
    const params = useParams();
    const [courseId, unitId, topicId] = params.slug as string[];

    const [content, setContent] = useState<{title: string, htmlContent: string} | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const mainContentRef = useRef<HTMLDivElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    
    const backUrl = `/teacher/smartboard/ozetler?courseId=${courseId}`;

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    useEffect(() => {
        if (!courseId || !unitId) {
            setError("Geçersiz URL. Gerekli parametreler eksik.");
            setIsLoading(false);
            return;
        }

        const fetchUnit = async () => {
            setIsLoading(true);
            const fetchedContent = await getContent(courseId, unitId, topicId || undefined);
            if (fetchedContent) {
                setContent(fetchedContent);
            } else {
                setError('Bu içerik için interaktif özet bulunamadı.');
            }
            setIsLoading(false);
        };

        fetchUnit();
    }, [courseId, unitId, topicId]);
    
    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-800 flex justify-center items-center">
                <Loader2 className="h-12 w-12 animate-spin text-cyan-400"/>
            </div>
        );
    }
    
    if (error || !content) {
        return (
            <div className="min-h-screen bg-slate-800 flex flex-col items-center justify-center p-8 text-center">
                <div className="bg-slate-700 p-8 rounded-3xl border border-red-400/30 max-w-md w-full backdrop-blur-sm shadow-xl">
                    <p className="text-red-300 mb-6 font-medium text-lg">{error || "Bu içerik bulunamadı."}</p>
                    <Button asChild className="bg-white text-slate-900 hover:bg-slate-200 border-0 w-full font-bold">
                        <Link href={backUrl}><ArrowLeft className="mr-2 h-4 w-4"/> Geri Dön</Link>
                    </Button>
                </div>
            </div>
        )
    }
    
    return (
        <div 
            ref={mainContentRef} 
            className={cn(
                "w-full h-screen bg-slate-950 text-white flex flex-col overflow-hidden relative font-sans", 
                !isFullscreen && "p-4 md:p-6"
            )}
        >
             {!isFullscreen && (
                <div className="fixed inset-0 pointer-events-none z-0">
                    <div className="absolute top-[-20%] left-[-10%] w-[1000px] h-[1000px] bg-rose-900/10 rounded-full blur-[150px]" />
                    <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-indigo-900/10 rounded-full blur-[150px]" />
                </div>
            )}

            <header className={cn(
                "flex-shrink-0 z-20 flex items-center justify-between transition-all duration-300",
                isFullscreen 
                    ? "absolute top-0 left-0 right-0 p-2 bg-slate-900/80 backdrop-blur-md border-b border-white/10 opacity-0 hover:opacity-100 focus-within:opacity-100" 
                    : "mb-6 bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-lg"
            )}>
                <div className="flex items-center gap-4 overflow-hidden">
                    <div className={cn("p-2.5 rounded-xl shadow-lg", isFullscreen ? "bg-transparent p-0" : "bg-gradient-to-br from-rose-500 to-indigo-600")}>
                        <BookOpen className={cn("text-white", isFullscreen ? "h-5 w-5" : "h-6 w-6")}/>
                    </div>
                    <div className="overflow-hidden">
                        <h1 className={cn("font-black tracking-tight text-white uppercase truncate", isFullscreen ? "text-lg" : "text-2xl")}>
                            {content?.title || 'Özet'}
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" asChild size="sm" className="hidden md:flex border-white/10 text-slate-300 hover:text-white hover:bg-white/5 h-9">
                        <Link href={`/teacher/content-creation/edit-unit/${unitId}?courseId=${courseId}`}>
                             Düzenle
                        </Link>
                    </Button>
                    <FullscreenToggle elementRef={mainContentRef} className="bg-slate-800 text-slate-300 hover:text-white border-0 h-9 w-9 rounded-lg" />
                    {!isFullscreen && (
                        <Button variant="ghost" asChild size="icon" className="text-slate-400 hover:text-white hover:bg-white/10 rounded-lg h-9 w-9">
                            <Link href={backUrl}><ArrowLeft className="h-5 w-5"/></Link>
                        </Button>
                    )}
                </div>
            </header>
            
            <div className="flex-grow flex flex-col min-h-0 relative z-10">
                <div className={cn(
                    "w-full h-full overflow-hidden transition-all duration-300",
                    isFullscreen ? "rounded-none" : "rounded-2xl border-4 border-slate-800 shadow-2xl bg-white ring-1 ring-white/10"
                )}>
                    <iframe
                        srcDoc={content.htmlContent}
                        className="w-full h-full border-0 block bg-white"
                        title={content.title}
                        sandbox="allow-scripts allow-same-origin"
                    />
                </div>
            </div>
        </div>
    );
}


export default function Page() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-screen bg-slate-950"><Loader2 className="h-12 w-12 animate-spin text-rose-500"/></div>}>
            <OzetDisplayPage />
        </Suspense>
    )
}
