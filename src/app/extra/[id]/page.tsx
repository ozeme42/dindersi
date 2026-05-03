'use client';

import { useState, useEffect, useCallback, Suspense, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
    Loader2, ArrowLeft, Download, Plus, Minus, Maximize, 
    Minimize, Printer, Globe, Calendar, Folder, User, Share2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getExtraPage } from '@/app/teacher/extra-pages/actions';
import Link from 'next/link';

function ExtraPageViewer() {
    const params = useParams();
    const router = useRouter();
    const pageId = params.id as string;

    const [content, setContent] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [zoomLevel, setZoomLevel] = useState(1.1); // Varsayılan biraz daha büyük
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);

    const mainContentRef = useRef<HTMLDivElement>(null);

    // Dökümanlardaki showSection gibi JS fonksiyonları için uyumluluk katmanı
    useEffect(() => {
        if (!content) return;
        
        // Eğer dökümanda interaktif bölümler varsa onlara erişimi sağla
        (window as any).showSection = (index: number) => {
            const sections = document.querySelectorAll('.slide-section');
            sections.forEach((s, i) => {
                if (i === index) s.classList.add('active');
                else s.classList.remove('active');
            });
        };
    }, [content]);

    useEffect(() => {
        const handleFS = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFS);
        return () => document.removeEventListener('fullscreenchange', handleFS);
    }, []);

    const fetchPage = useCallback(async () => {
        if (!pageId) return;
        setIsLoading(true);
        const res = await getExtraPage(pageId);
        if (res.success) {
            setContent(res.data);
        } else {
            setError(res.error || "İçerik yüklenemedi.");
        }
        setIsLoading(false);
    }, [pageId]);

    useEffect(() => { fetchPage(); }, [fetchPage]);

    const handlePrint = () => {
        setIsPrinting(true);
        window.print();
        setTimeout(() => setIsPrinting(false), 500);
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            mainContentRef.current?.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    };

    if (isLoading) return <div className="h-screen w-screen flex items-center justify-center bg-slate-50"><Loader2 className="h-12 w-12 animate-spin text-indigo-500" /></div>;

    if (error || !content) {
        return (
            <div className="h-screen w-screen flex flex-col items-center justify-center p-4 text-center bg-slate-50">
                <div className="bg-white p-10 rounded-[2.5rem] border border-red-100 shadow-2xl max-w-md">
                    <p className="text-red-600 mb-8 font-bold text-xl">{error || "Döküman bulunamadı."}</p>
                    <Button asChild size="lg" className="w-full bg-slate-900 hover:bg-slate-800 rounded-2xl h-14 text-lg">
                        <Link href="/extra"><ArrowLeft className="mr-2 h-5 w-5"/> Geri Dön</Link>
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div ref={mainContentRef} className={cn(
            "min-h-screen bg-slate-50 flex flex-col relative transition-all duration-500",
            isFullscreen && "bg-white p-0"
        )}>
            {/* Yazdırma Stili */}
            <style media="print">{`
                @page { size: auto; margin: 20mm; }
                header, .controls-bar { display: none !important; }
                body { background: white !important; }
                .prose-container { width: 100% !important; padding: 0 !important; }
                .prose { max-width: 100% !important; font-size: 12pt !important; }
            `}</style>

            {/* Üst Bar */}
            <header className={cn(
                "flex-shrink-0 z-30 flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-xl border-b border-slate-200 transition-all",
                isFullscreen && "hidden"
            )}>
                <div className="flex items-center gap-5">
                    <Link href="/extra">
                        <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl hover:bg-slate-100">
                            <ArrowLeft className="h-6 w-6 text-slate-600" />
                        </Button>
                    </Link>
                    <div className="h-10 w-px bg-slate-200" />
                    <div>
                        <h1 className="text-xl font-black text-slate-900 truncate uppercase tracking-tight leading-none">{content.title}</h1>
                        <div className="flex items-center gap-3 mt-1.5">
                            <Badge variant="secondary" className="bg-indigo-50 text-indigo-600 border-none text-[10px] font-black uppercase tracking-widest px-2 py-0.5">
                                <Folder className="h-3 w-3 mr-1" /> {content.category || 'Genel'}
                            </Badge>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1">
                                <Calendar className="h-3 w-3" /> {content.updatedAt ? new Date(content.updatedAt).toLocaleDateString('tr-TR') : 'YENİ'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center bg-slate-100 rounded-2xl p-1 border border-slate-200 mr-2">
                        <Button variant="ghost" size="icon" onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.1))} className="h-9 w-9 text-slate-600 hover:bg-white rounded-xl"><Minus className="h-4 w-4"/></Button>
                        <span className="text-[10px] font-black text-slate-500 w-12 text-center uppercase">{Math.round(zoomLevel * 100)}%</span>
                        <Button variant="ghost" size="icon" onClick={() => setZoomLevel(z => Math.min(2.5, z + 0.1))} className="h-9 w-9 text-slate-600 hover:bg-white rounded-xl"><Plus className="h-4 w-4"/></Button>
                    </div>
                    <Button variant="outline" size="icon" onClick={handlePrint} className="h-11 w-11 rounded-2xl border-slate-200 bg-white text-slate-600 shadow-sm"><Printer className="h-5 w-5" /></Button>
                    <Button variant="outline" size="icon" onClick={toggleFullscreen} className="h-11 w-11 rounded-2xl border-slate-200 bg-white text-slate-600 shadow-sm"><Maximize className="h-5 w-5" /></Button>
                </div>
            </header>

            {/* İçerik Alanı */}
            <main className={cn(
                "flex-1 overflow-y-auto relative z-10 transition-all duration-300",
                isFullscreen ? "p-4 md:p-10" : "p-6 md:p-12 lg:p-20"
            )}>
                {/* Arka Plan Hafif Gradient (Sadece normal modda) */}
                {!isFullscreen && (
                    <div className="fixed inset-0 pointer-events-none z-0">
                        <div className="absolute top-[10%] left-[5%] w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-[100px]" />
                        <div className="absolute bottom-[10%] right-[5%] w-[400px] h-[400px] bg-sky-500/5 rounded-full blur-[100px]" />
                    </div>
                )}

                <div 
                    className="mx-auto w-full max-w-5xl prose-container"
                    style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top center' }}
                >
                    {/* BAŞLIK (Opsiyonel: Eğer döküman içinde başlık yoksa gösterilsin) */}
                    <div className="mb-12 border-b-4 border-indigo-600 pb-8 print-hide">
                        <h2 className="text-5xl font-black text-slate-900 tracking-tighter uppercase leading-none">{content.title}</h2>
                        <p className="text-slate-500 mt-4 text-xl font-medium leading-relaxed">{content.description}</p>
                    </div>

                    {/* DÖKÜMAN İÇERİĞİ (DIRECT RENDER) */}
                    <div 
                        className="prose prose-slate max-w-none prose-headings:font-black prose-headings:tracking-tight prose-p:text-slate-600 prose-p:leading-relaxed prose-img:rounded-[2rem] prose-img:shadow-2xl prose-a:text-indigo-600 prose-strong:text-slate-900"
                        dangerouslySetInnerHTML={{ __html: content.htmlContent }}
                    />
                </div>
            </main>

            {/* Tam Ekran Modu İçin Yüzen Kontrol Paneli */}
            {isFullscreen && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 p-2 rounded-full bg-slate-900/90 backdrop-blur-xl border border-white/20 shadow-2xl animate-in slide-in-from-bottom-10 controls-bar">
                    <Button variant="ghost" size="icon" onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.1))} className="h-10 w-10 rounded-full text-white hover:bg-white/10"><Minus className="h-4 w-4"/></Button>
                    <span className="text-[10px] font-black text-white/50 px-2 uppercase tracking-widest">{Math.round(zoomLevel * 100)}%</span>
                    <Button variant="ghost" size="icon" onClick={() => setZoomLevel(z => Math.min(2.5, z + 0.1))} className="h-10 w-10 rounded-full text-white hover:bg-white/10"><Plus className="h-4 w-4"/></Button>
                    <div className="w-px h-6 bg-white/20 mx-1" />
                    <Button variant="ghost" size="icon" onClick={handlePrint} className="h-10 w-10 rounded-full text-white hover:bg-white/10"><Printer className="h-4 w-4"/></Button>
                    <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="h-10 w-10 rounded-full bg-red-600 text-white hover:bg-red-500 ml-1"><Minimize className="h-4 w-4" /></Button>
                </div>
            )}
        </div>
    );
}

export default function Page() {
    return (
        <Suspense fallback={<div className="h-screen w-screen flex items-center justify-center bg-slate-50"><Loader2 className="h-12 w-12 animate-spin text-indigo-500" /></div>}>
            <ExtraPageViewer />
        </Suspense>
    );
}