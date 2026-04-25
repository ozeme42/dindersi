'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Loader2, ArrowLeft, BookOpen, Plus, Minus } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FullscreenToggle } from '@/components/fullscreen-toggle';
import Link from 'next/link';

function OzetDisplayPage() {
    const params = useParams();
    const [courseId, unitId, topicId] = params.slug as string[];

    const [content, setContent] = useState<{title: string, htmlContent: string} | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const mainContentRef = useRef<HTMLDivElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(1.0);
    
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

        const fetchData = async () => {
            setIsLoading(true);
            try {
                const docRef = topicId 
                    ? doc(db, 'courses', courseId, 'units', unitId, 'topics', topicId)
                    : doc(db, 'courses', courseId, 'units', unitId);
                
                const docSnap = await getDoc(docRef);

                if (!docSnap.exists()) {
                    setError("İçerik bulunamadı.");
                    setIsLoading(false);
                    return;
                }

                const data = docSnap.data();

                if (!data.htmlContent) {
                    setError("Bu içerik için interaktif özet henüz eklenmemiş.");
                    setIsLoading(false);
                    return;
                }

                setContent({ title: data.title, htmlContent: data.htmlContent });

            } catch (e: any) {
                console.error(e);
                setError("Veri çekilirken bir hata oluştu.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [courseId, unitId, topicId]);
    
    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-screen bg-slate-950">
                <Loader2 className="h-12 w-12 animate-spin text-rose-500"/>
            </div>
        );
    }
    
    if (error || !content) {
        return (
            <div className="flex h-screen items-center justify-center text-center p-8 bg-slate-950 text-white font-sans">
                <div className="bg-slate-900 p-8 rounded-3xl border border-red-500/20 max-w-md w-full shadow-2xl">
                    <p className="text-red-400 text-xl mb-8 font-bold">{error || "Bu içerik bulunamadı."}</p>
                    <Button asChild size="lg" className="w-full bg-slate-800 hover:bg-slate-700">
                        <Link href={backUrl}><ArrowLeft className="mr-2 h-5 w-5"/> Geri Dön</Link>
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
                     <div className="flex items-center bg-slate-800/80 rounded-lg p-1 border border-white/10 mr-2">
                        <Button variant="ghost" size="icon" onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.1))} className="h-8 w-8 text-white hover:bg-white/10 rounded-md"><Minus className="h-4 w-4"/></Button>
                        <span className="text-[10px] font-bold text-slate-400 w-10 text-center">ZOOM</span>
                        <Button variant="ghost" size="icon" onClick={() => setZoomLevel(z => Math.min(2.5, z + 0.1))} className="h-8 w-8 text-white hover:bg-white/10 rounded-md"><Plus className="h-4 w-4"/></Button>
                    </div>
                    
                    {!isFullscreen && (
                        <Button variant="outline" asChild size="sm" className="hidden md:flex border-white/10 text-slate-300 hover:text-white hover:bg-white/5 h-9">
                            <Link href={`/teacher/content-creation/edit?courseId=${courseId}&unitId=${unitId}&topicId=${topicId}`}>
                                Düzenle
                            </Link>
                        </Button>
                    )}

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
                        srcDoc={content.htmlContent + `<style>body { zoom: ${zoomLevel}; transform-origin: top center; padding: 20px; font-family: sans-serif; }</style>`}
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
