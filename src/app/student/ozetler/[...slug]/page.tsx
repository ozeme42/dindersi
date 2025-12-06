
'use client';

import { useState, useEffect, Suspense, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, LayoutTemplate } from 'lucide-react';
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

    const backUrl = `/student/ozetler`;

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-cyan-500"/>
                <p className="text-slate-400 animate-pulse">Özet Yükleniyor...</p>
            </div>
        );
    }
    
    if (error || !topic || !topic.htmlContent) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center">
                <div className="bg-slate-900/50 p-8 rounded-3xl border border-red-500/20 max-w-md w-full backdrop-blur-sm">
                    <p className="text-red-400 mb-6 font-medium text-lg">{error || "Bu konu için içerik bulunmuyor."}</p>
                    <Button asChild className="bg-white/10 hover:bg-white/20 text-white border border-white/10 w-full">
                        <Link href={backUrl}><ArrowLeft className="mr-2 h-4 w-4"/> Özet Listesine Dön</Link>
                    </Button>
                </div>
            </div>
        )
    }
    
    return (
        <div 
            ref={mainContentRef} 
            className={cn(
                "w-full min-h-screen bg-slate-950 flex flex-col relative overflow-hidden transition-all", 
                // MOBİL DÜZELTME: Tam ekran değilse alttan boşluk bırak
                !isFullscreen ? "pb-24 md:pb-8" : "pb-0"
            )}
        >
             {/* Arka Plan Efektleri */}
             {!isFullscreen && (
                <div className="fixed inset-0 pointer-events-none z-0">
                    <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-cyan-600/5 rounded-full blur-[100px]" />
                    <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-violet-600/5 rounded-full blur-[100px]" />
                </div>
            )}

            {/* --- ÜST BAR (HEADER) --- */}
            <div className={cn(
                "sticky top-0 z-30 w-full border-b border-white/5 bg-slate-950/80 backdrop-blur-xl transition-all",
                !isFullscreen && "pt-4"
            )}>
                 <div className="container mx-auto px-4 pb-4">
                    <div className="flex items-center justify-between gap-4">
                        
                        {/* SOL: Geri Dön Butonu ve Başlık */}
                        <div className="flex items-center gap-3 overflow-hidden">
                            {!isFullscreen && (
                                <Button asChild variant="outline" size="sm" className="shrink-0 bg-slate-800 border-white/20 text-white hover:bg-slate-700 hover:text-white rounded-xl h-10 px-3 shadow-md">
                                    <Link href={backUrl} className="flex items-center gap-2">
                                        <ArrowLeft className="h-4 w-4"/>
                                        <span className="hidden sm:inline">Geri Dön</span>
                                    </Link>
                                </Button>
                            )}
                            
                            <div className="flex flex-col min-w-0">
                                <h1 className="text-lg md:text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 truncate">
                                    {topic?.title || 'Özet'}
                                </h1>
                                {!isFullscreen && (
                                    <span className="text-[10px] text-slate-500 font-mono hidden md:block">İNTERAKTİF MODÜL</span>
                                )}
                            </div>
                        </div>

                        {/* SAĞ: Tam Ekran Butonu (RENGİ AÇILDI) */}
                        <div className="flex items-center gap-2">
                             <FullscreenToggle 
                                elementRef={mainContentRef} 
                                // GÜNCELLENEN KISIM: Arka plan bg-slate-800, yazı text-white ve border daha belirgin
                                className="bg-slate-800 border-2 border-white/20 text-white hover:bg-slate-700 hover:border-white/40 h-10 w-10 rounded-xl transition-colors shadow-lg shadow-black/50" 
                            />
                        </div>
                    </div>
                 </div>
            </div>
            
            {/* --- İÇERİK ALANI --- */}
            <div className={cn(
                "flex-grow flex flex-col min-h-0 relative z-10 transition-all duration-300",
                !isFullscreen ? "container mx-auto px-4 pt-6" : "p-0"
            )}>
                <div className={cn(
                    "w-full transition-all duration-300 flex flex-col bg-white",
                    !isFullscreen ? "h-[80vh] rounded-2xl border border-white/10 shadow-2xl shadow-cyan-900/10 overflow-hidden" : "h-full rounded-none"
                )}>
                    
                    {/* Tarayıcı/Pencere Süsü (Sadece Normal Modda Görünür) */}
                    {!isFullscreen && (
                        <div className="h-8 bg-slate-100 border-b border-slate-200 flex items-center px-4 gap-2 shrink-0">
                            {/* Pencere Butonları */}
                            <div className="flex gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-red-400/80 border border-red-500/20" />
                                <div className="w-2.5 h-2.5 rounded-full bg-amber-400/80 border border-amber-500/20" />
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/80 border border-emerald-500/20" />
                            </div>
                            
                            {/* Adres Çubuğu Süsü */}
                            <div className="ml-4 flex-1 flex justify-center">
                                <div className="bg-slate-200/50 rounded px-3 py-0.5 text-[10px] text-slate-400 font-medium flex items-center gap-1 w-full max-w-[200px] justify-center">
                                    <LayoutTemplate className="w-3 h-3 opacity-50" />
                                    <span>view_mode.html</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* İframe (Özet İçeriği) */}
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

export default function Page() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-950 flex justify-center items-center"><Loader2 className="h-12 w-12 animate-spin text-cyan-500"/></div>}>
            <OzetlerDisplayPage />
        </Suspense>
    )
}
