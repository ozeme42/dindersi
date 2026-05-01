'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, ArrowLeft, Plus, Minus, Download, Layout, Share2, Info, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FullscreenToggle } from '@/components/fullscreen-toggle';
import Link from 'next/link';
import { getExtraPage } from '@/app/teacher/extra-pages/actions';
import { Badge } from '@/components/ui/badge';
import { 
    Card, CardContent, CardDescription, CardHeader, CardTitle 
} from '@/components/ui/card';

function ExtraPageDetail() {
    const params = useParams();
    const id = params.id as string;

    const [page, setPage] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [zoomLevel, setZoomLevel] = useState(1.1);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!id) return;
            setIsLoading(true);
            try {
                const res = await getExtraPage(id);
                if (res.success) {
                    setPage(res.data);
                } else {
                    setError(res.error || "Sayfa bulunamadı.");
                }
            } catch (e) {
                setError("Veri çekilirken bir hata oluştu.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();

        const handleFs = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFs);
        return () => document.removeEventListener('fullscreenchange', handleFs);
    }, [id]);

    const handleShare = () => {
        if (navigator.share) {
            navigator.share({
                title: page?.title,
                url: window.location.href
            }).catch(console.error);
        } else {
            navigator.clipboard.writeText(window.location.href);
            alert("Bağlantı kopyalandı!");
        }
    };

    if (isLoading) {
        return (
            <div className="h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
                <p className="text-slate-400 font-bold animate-pulse">İçerik Yükleniyor...</p>
            </div>
        );
    }

    if (error || !page) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 text-center font-sans">
                <div className="bg-white p-12 rounded-[3rem] border border-red-100 max-w-md w-full shadow-2xl space-y-6">
                    <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto">
                        <Info className="h-10 w-10 text-red-500" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-black text-slate-800">Döküman Bulunamadı</h2>
                        <p className="text-slate-500">{error || "Ulaşmaya çalıştığınız içerik kaldırılmış veya taşınmış olabilir."}</p>
                    </div>
                    <Button asChild size="lg" className="bg-slate-900 text-white hover:bg-slate-800 w-full rounded-2xl h-14">
                        <Link href="/extra"><ArrowLeft className="mr-2 h-5 w-5"/> Geri Dön</Link>
                    </Button>
                </div>
            </div>
        );
    }

    // Iframe dokümanı
    const safeHtmlDocument = `
        <!DOCTYPE html>
        <html lang="tr">
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <script src="https://cdn.tailwindcss.com"></script>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
            <style>
                body { 
                    zoom: ${zoomLevel}; 
                    transform-origin: top center; 
                    padding: 40px; 
                    font-family: 'Inter', sans-serif; 
                    background-color: transparent; 
                    color: #1e293b;
                    line-height: 1.6;
                }
                .prose { max-width: 1000px; margin: 0 auto; }
                img { max-width: 100%; height: auto; border-radius: 1.5rem; box-shadow: 0 10px 30px rgba(0,0,0,0.1); margin: 2rem 0; border: 4px solid white; }
                h1 { color: #1e1b4b; font-weight: 800; font-size: 2.5rem; margin-bottom: 2rem; border-bottom: 4px solid #e2e8f0; padding-bottom: 1rem; }
                h2 { color: #312e81; font-weight: 700; font-size: 1.8rem; margin-top: 2.5rem; margin-bottom: 1.5rem; }
                p { margin-bottom: 1.25rem; font-size: 1.1rem; }
                ul, ol { padding-left: 1.5rem; margin-bottom: 1.5rem; }
                li { margin-bottom: 0.5rem; }
                blockquote { border-left: 6px solid #6366f1; background: #f8fafc; padding: 1.5rem; border-radius: 0 1.5rem 1.5rem 0; font-style: italic; color: #475569; margin: 2rem 0; }
                .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin: 2rem 0; }
                @media (max-width: 768px) { .grid-2 { grid-template-columns: 1fr; } h1 { font-size: 2rem; } }
            </style>
        </head>
        <body class="prose">
            <h1>${page.title}</h1>
            ${page.htmlContent}
        </body>
        </html>
    `;

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col relative overflow-hidden font-sans">
            
            {/* Navigasyon Barı */}
            <header className={cn(
                "flex-shrink-0 z-50 flex items-center justify-between p-4 md:p-6 transition-all duration-300",
                isFullscreen 
                    ? "absolute top-0 left-0 right-0 bg-white/80 backdrop-blur-md border-b border-slate-200 opacity-0 hover:opacity-100 focus-within:opacity-100" 
                    : "bg-slate-900/50 border-b border-white/5"
            )}>
                <div className="flex items-center gap-4">
                    <Link href="/extra">
                        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-white/10 rounded-xl h-11 w-11 transition-all">
                            <ArrowLeft className="h-6 w-6" />
                        </Button>
                    </Link>
                    <div className="hidden sm:block h-8 w-px bg-white/10 mx-1" />
                    <div>
                        <h1 className="text-xl font-black text-white uppercase tracking-tight line-clamp-1">{page.title}</h1>
                        <div className="flex items-center gap-3 mt-0.5">
                            <Badge className="bg-indigo-600/20 text-indigo-400 border-indigo-500/30 text-[9px] uppercase tracking-widest">{page.category || 'GENEL'}</Badge>
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Görüntüleme Modu</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 md:gap-3">
                    <div className="hidden md:flex items-center bg-black/40 rounded-xl p-1 border border-white/10">
                        <Button variant="ghost" size="icon" onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.1))} className="h-8 w-8 text-white hover:bg-white/10"><Minus className="h-4 w-4"/></Button>
                        <span className="text-[10px] font-black text-slate-500 w-12 text-center uppercase">{Math.round(zoomLevel * 100)}%</span>
                        <Button variant="ghost" size="icon" onClick={() => setZoomLevel(z => Math.min(2.5, z + 0.1))} className="h-8 w-8 text-white hover:bg-white/10"><Plus className="h-4 w-4"/></Button>
                    </div>
                    
                    <Button variant="outline" size="icon" onClick={handleShare} className="bg-black/40 border-white/10 text-slate-300 hover:text-white rounded-xl h-11 w-11 shadow-lg">
                        <Share2 className="h-5 w-5" />
                    </Button>
                    
                    <FullscreenToggle elementRef={containerRef} className="bg-indigo-600 hover:bg-indigo-500 text-white border-0 h-11 w-11 rounded-xl shadow-xl shadow-indigo-900/20" />
                </div>
            </header>

            {/* İçerik Alanı */}
            <main className="flex-1 relative z-10 flex flex-col overflow-hidden bg-slate-900/20">
                <div ref={containerRef} className={cn(
                    "w-full h-full relative transition-all duration-500",
                    isFullscreen ? "bg-white" : "p-4 md:p-8"
                )}>
                    <div className={cn(
                        "w-full h-full overflow-hidden transition-all duration-500",
                        isFullscreen ? "rounded-none" : "rounded-[3rem] border-8 border-white shadow-[0_30px_100px_rgba(0,0,0,0.5)] bg-white ring-1 ring-slate-200"
                    )}>
                        <iframe 
                            srcDoc={safeHtmlDocument} 
                            className="w-full h-full border-0 block bg-transparent" 
                            sandbox="allow-scripts allow-same-origin allow-popups"
                            title={page.title}
                        />
                    </div>
                </div>
            </main>
        </div>
    );
}

export default function Page() {
    return (
        <Suspense fallback={<div className="h-screen flex items-center justify-center bg-slate-950"><Loader2 className="animate-spin text-indigo-500 h-12 w-12" /></div>}>
            <ExtraPageDetail />
        </Suspense>
    );
}