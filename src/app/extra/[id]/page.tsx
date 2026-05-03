
'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
    Loader2, ArrowLeft, Download, Plus, Minus, 
    Printer, Share2, ZoomIn, ZoomOut, Clock, FileText 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { FullscreenToggle } from '@/components/fullscreen-toggle';
import { getExtraPage } from '@/app/teacher/extra-pages/actions';
import Link from 'next/link';

export default function ExtraPageViewer() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [content, setContent] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [zoomLevel, setZoomLevel] = useState(1.1); // Varsayılan biraz daha büyük
    const [isFullscreen, setIsFullscreen] = useState(false);

    const mainContentRef = useRef<HTMLDivElement>(null);
    const contentAreaRef = useRef<HTMLDivElement>(null);

    // --- SCRIPT ÇALIŞTIRICI ---
    // dangerouslySetInnerHTML içindeki scriptler otomatik çalışmaz.
    // Bu useEffect içeriği tarar ve scriptleri manuel olarak çalıştırır.
    useEffect(() => {
        if (!content || !contentAreaRef.current) return;

        const scripts = contentAreaRef.current.getElementsByTagName('script');
        Array.from(scripts).forEach(oldScript => {
            const newScript = document.createElement('script');
            Array.from(oldScript.attributes).forEach(attr => {
                newScript.setAttribute(attr.name, attr.value);
            });
            newScript.appendChild(document.createTextNode(oldScript.innerHTML));
            
            // Script'i geçici olarak dokümana ekleyip çalıştırıyoruz
            document.body.appendChild(newScript);
            
            // Eğer script içinde initAdimAdim veya showSection gibi fonksiyonlar varsa 
            // ve döküman yüklendiğinde otomatik çağrılması gerekiyorsa:
            try {
                // window üzerinde tanımlanmış olabilirler, kontrol et ve çağır
                if (typeof (window as any).initAdimAdim === 'function') {
                    (window as any).initAdimAdim();
                }
                if (typeof (window as any).showSection === 'function') {
                    // İlk bölümü varsayılan olarak göster
                    (window as any).showSection(0);
                }
            } catch (e) {
                console.warn("Script execution warning:", e);
            }
            
            // Temizlik
            document.body.removeChild(newScript);
        });
    }, [content]);

    useEffect(() => {
        const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    useEffect(() => {
        if (!id) return;
        const fetchData = async () => {
            setIsLoading(true);
            const res = await getExtraPage(id);
            if (res.success) {
                setContent(res.data);
            } else {
                setError(res.error || "İçerik bulunamadı.");
            }
            setIsLoading(false);
        };
        fetchData();
    }, [id]);

    const handlePrint = () => {
        window.print();
    };

    if (isLoading) {
        return (
            <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-950 gap-4">
                <Loader2 className="h-16 w-16 animate-spin text-indigo-500" />
                <span className="text-slate-500 font-black uppercase tracking-widest text-xs">İçerik Hazırlanıyor...</span>
            </div>
        );
    }

    if (error || !content) {
        return (
            <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center">
                <div className="bg-slate-900 p-10 rounded-[3rem] border border-red-500/20 max-w-md w-full shadow-2xl">
                    <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-6" />
                    <p className="text-red-400 text-xl mb-8 font-bold leading-tight">{error}</p>
                    <Button asChild size="lg" className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-2xl">
                        <Link href="/extra"><ArrowLeft className="mr-2 h-5 w-5"/> Galeriye Dön</Link>
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div 
            ref={mainContentRef}
            className={cn(
                "min-h-screen bg-slate-50 flex flex-col relative transition-colors duration-500",
                isFullscreen ? "p-0" : "p-0"
            )}
        >
            <style jsx global>{`
                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; color: black !important; }
                    .print-content { padding: 0 !important; width: 100% !important; max-width: 100% !important; }
                }
                .prose img { border-radius: 1.5rem; box-shadow: 0 20px 50px rgba(0,0,0,0.1); }
                .prose h1 { font-weight: 900; color: #1e1b4b; letter-spacing: -0.02em; }
                .prose p { line-height: 1.8; color: #334155; }
            `}</style>

            {/* ÜST BAR */}
            <header className={cn(
                "no-print flex-shrink-0 z-50 flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-xl border-b border-slate-200 sticky top-0 transition-all",
                isFullscreen && "bg-white/95 shadow-md"
            )}>
                <div className="flex items-center gap-5 overflow-hidden">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full h-11 w-11 hover:bg-slate-100 flex-shrink-0">
                        <ArrowLeft className="h-6 w-6 text-slate-600" />
                    </Button>
                    <div className="overflow-hidden">
                        <h1 className="text-xl font-black text-slate-900 truncate uppercase tracking-tight">{content.title}</h1>
                        <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="secondary" className="bg-indigo-50 text-indigo-600 border-none text-[10px] font-bold uppercase">{content.category}</Badge>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1">
                                <Clock className="h-3 w-3" /> {content.updatedAt ? new Date(content.updatedAt).toLocaleDateString('tr-TR') : 'YENİ'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* ZOOM KONTROLLERİ */}
                    <div className="hidden sm:flex items-center bg-slate-100 rounded-2xl p-1 border border-slate-200">
                        <Button variant="ghost" size="icon" onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.1))} className="h-9 w-9 text-slate-600 hover:bg-white rounded-xl"><ZoomOut className="h-4 w-4"/></Button>
                        <span className="text-[10px] font-black text-slate-400 w-12 text-center uppercase">{Math.round(zoomLevel * 100)}%</span>
                        <Button variant="ghost" size="icon" onClick={() => setZoomLevel(prev => Math.min(2.5, prev + 0.1))} className="h-9 w-9 text-slate-600 hover:bg-white rounded-xl"><ZoomIn className="h-4 w-4"/></Button>
                    </div>

                    <div className="w-px h-6 bg-slate-200 mx-1 hidden sm:block" />

                    <Button onClick={handlePrint} variant="outline" size="icon" className="h-11 w-11 rounded-2xl border-slate-200 text-slate-600 hover:bg-slate-50"><Printer className="h-5 w-5" /></Button>
                    <FullscreenToggle elementRef={mainContentRef} className="h-11 w-11 rounded-2xl border-slate-200 text-slate-600 hover:bg-slate-50" />
                </div>
            </header>

            {/* İÇERİK ALANI */}
            <main className="flex-1 overflow-y-auto scroll-smooth bg-white">
                <div 
                    ref={contentAreaRef}
                    className="print-content container mx-auto px-6 py-12 md:py-16 max-w-4xl"
                    style={{ fontSize: `${zoomLevel}rem` }}
                >
                    {/* Açıklama */}
                    {content.description && (
                        <div className="mb-10 p-6 bg-slate-50 rounded-3xl border-l-8 border-indigo-500 italic text-slate-600 text-lg shadow-inner">
                            {content.description}
                        </div>
                    )}

                    {/* Ana HTML İçeriği */}
                    <div 
                        className="prose prose-slate prose-lg max-w-none prose-headings:font-black prose-a:text-indigo-600 prose-img:shadow-2xl"
                        dangerouslySetInnerHTML={{ __html: content.htmlContent }}
                    />
                </div>
            </main>
        </div>
    );
}

const AlertTriangle = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
);
