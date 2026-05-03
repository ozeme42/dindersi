
'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
    Loader2, ArrowLeft, Maximize, Minimize, 
    Plus, Minus, Printer, Share2, Globe, Clock, FileText 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getExtraPage } from '@/app/teacher/extra-pages/actions';
import { FullscreenToggle } from '@/components/fullscreen-toggle';
import Link from 'next/link';

export default function ExtraPageViewer() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [page, setPage] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [fontSize, setFontSize] = useState(1.1); // rem bazlı
    const [isFullscreen, setIsFullscreen] = useState(false);
    
    const contentRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleFS = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFS);
        return () => document.removeEventListener('fullscreenchange', handleFS);
    }, []);

    useEffect(() => {
        if (!id) return;
        const fetchData = async () => {
            setIsLoading(true);
            const res = await getExtraPage(id);
            if (res.success) {
                setPage(res.data);
            } else {
                setError(res.error || "Sayfa bulunamadı.");
            }
            setIsLoading(false);
        };
        fetchData();
    }, [id]);

    // HTML İçeriğindeki Scriptleri Güvenli Şekilde Çalıştır
    useEffect(() => {
        if (page?.htmlContent && contentRef.current) {
            // Global uyumluluk fonksiyonlarını tanımla (ReferenceError: go is not defined çözümü)
            (window as any).go = (n: number) => window.history.go(n);
            
            const scripts = contentRef.current.querySelectorAll('script');
            scripts.forEach(oldScript => {
                const newScript = document.createElement('script');
                
                // Script içeriğini IIFE içine alarak "Identifier already declared" hatasını önle
                const wrappedCode = `
                    (function() {
                        try {
                            ${oldScript.innerHTML}
                        } catch(e) {
                            console.warn("Extra Page Script Error:", e);
                        }
                    })();
                `;
                
                newScript.innerHTML = wrappedCode;
                document.body.appendChild(newScript);
                
                // Script'i çalıştırdıktan sonra temizle
                setTimeout(() => {
                    if (document.body.contains(newScript)) {
                        document.body.removeChild(newScript);
                    }
                }, 100);
            });

            // DOM hazır olduğunda init fonksiyonlarını tetikle
            setTimeout(() => {
                try {
                    if ((window as any).initAdimAdim) (window as any).initAdimAdim();
                    if ((window as any).showSection) (window as any).showSection(0);
                } catch (e) {
                    console.warn("Auto-init failed:", e);
                }
            }, 200);
        }
    }, [page?.htmlContent]);

    const handlePrint = () => window.print();

    const handleShare = () => {
        if (navigator.share) {
            navigator.share({
                title: page?.title,
                url: window.location.href
            });
        } else {
            navigator.clipboard.writeText(window.location.href);
            alert("Bağlantı kopyalandı!");
        }
    };

    if (isLoading) return (
        <div className="h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">İçerik Hazırlanıyor...</p>
        </div>
    );

    if (error || !page) return (
        <div className="h-screen bg-slate-50 flex items-center justify-center p-6">
            <Card className="max-w-md w-full rounded-[2rem] border-red-100 shadow-2xl text-center p-8">
                <div className="bg-red-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
                    <FileText className="h-10 w-10" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-2">Hata Oluştu</h2>
                <p className="text-slate-500 mb-8">{error || "Sayfa yüklenirken bir sorun oluştu."}</p>
                <Button asChild className="w-full bg-slate-900 hover:bg-slate-800 rounded-xl h-12">
                    <Link href="/extra"><ArrowLeft className="mr-2 h-4 w-4" /> Geri Dön</Link>
                </Button>
            </Card>
        </div>
    );

    return (
        <div ref={containerRef} className="min-h-screen bg-white flex flex-col font-sans text-slate-900 relative">
            
            {/* Navigasyon Bar */}
            <header className={cn(
                "sticky top-0 z-50 transition-all duration-300 print:hidden",
                isFullscreen ? "h-0 overflow-hidden opacity-0" : "bg-white/80 backdrop-blur-xl border-b border-slate-200"
            )}>
                <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                        <Button asChild variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-slate-100 shrink-0">
                            <Link href="/extra"><ArrowLeft className="h-5 w-5" /></Link>
                        </Button>
                        <div className="min-w-0">
                            <h1 className="font-black text-slate-900 truncate uppercase tracking-tight">{page.title}</h1>
                            <div className="flex items-center gap-2 mt-0.5">
                                <Badge variant="outline" className="text-[9px] font-bold border-slate-200 bg-slate-50">{page.category || 'Genel'}</Badge>
                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                                    <Clock className="h-2.5 w-2.5" />
                                    {page.updatedAt ? new Date(page.updatedAt).toLocaleDateString('tr-TR') : '-'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="hidden sm:flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200 mr-2">
                            <Button variant="ghost" size="icon" onClick={() => setFontSize(f => Math.max(0.6, f - 0.1))} className="h-8 w-8 text-slate-600 hover:bg-white rounded-lg"><Minus className="h-4 w-4"/></Button>
                            <span className="text-[10px] font-black text-slate-500 w-10 text-center uppercase">Zoom</span>
                            <Button variant="ghost" size="icon" onClick={() => setFontSize(f => Math.min(2.5, f + 0.1))} className="h-8 w-8 text-slate-600 hover:bg-white rounded-lg"><Plus className="h-4 w-4"/></Button>
                        </div>
                        <Button onClick={handlePrint} variant="outline" size="icon" className="h-10 w-10 rounded-xl border-slate-200 text-slate-600 hidden md:flex"><Printer className="h-5 w-5" /></Button>
                        <Button onClick={handleShare} variant="outline" size="icon" className="h-10 w-10 rounded-xl border-slate-200 text-slate-600"><Share2 className="h-5 w-5" /></Button>
                        <FullscreenToggle elementRef={containerRef} className="bg-indigo-600 hover:bg-indigo-700 text-white h-10 w-10 rounded-xl shadow-lg shadow-indigo-100 border-0" />
                    </div>
                </div>
            </header>

            {/* İçerik Alanı */}
            <main className={cn(
                "flex-1 w-full bg-white relative transition-all duration-500",
                isFullscreen ? "p-4 overflow-y-auto" : "py-12"
            )}>
                <div className="container mx-auto px-6 max-w-5xl">
                    <div 
                        ref={contentRef}
                        className="prose prose-slate max-w-none prose-img:rounded-[2rem] prose-img:shadow-2xl prose-a:text-indigo-600 prose-headings:font-black prose-headings:tracking-tight"
                        style={{ fontSize: `${fontSize}rem`, lineHeight: '1.6' }}
                        dangerouslySetInnerHTML={{ __html: page.htmlContent }}
                    />
                </div>
            </main>

            {/* Tam Ekran Kontrolleri (Floating) */}
            {isFullscreen && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 p-2 bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl animate-in slide-in-from-bottom-10 print:hidden">
                    <Button variant="ghost" size="icon" onClick={() => setFontSize(f => Math.max(0.6, f - 0.1))} className="h-12 w-12 rounded-full text-white hover:bg-white/10"><Minus className="h-6 w-6"/></Button>
                    <div className="w-px h-6 bg-white/20 mx-2"></div>
                    <span className="text-xs font-black text-slate-300 uppercase px-2">Yazı Boyutu</span>
                    <div className="w-px h-6 bg-white/20 mx-2"></div>
                    <Button variant="ghost" size="icon" onClick={() => setFontSize(f => Math.min(2.5, f + 0.1))} className="h-12 w-12 rounded-full text-white hover:bg-white/10"><Plus className="h-6 w-6"/></Button>
                    <div className="w-px h-8 bg-white/30 mx-4"></div>
                    <FullscreenToggle elementRef={containerRef} className="bg-red-600 hover:bg-red-500 text-white h-12 w-12 rounded-full shadow-lg border-0" />
                </div>
            )}
        </div>
    );
}

