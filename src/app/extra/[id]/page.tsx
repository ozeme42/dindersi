
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
    Loader2, ArrowLeft, Download, Plus, Minus, 
    Maximize2, Minimize2, Printer, Globe, FileText, 
    Share2, Calendar, Clock, Bookmark
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getExtraPage } from '@/app/teacher/extra-pages/actions';
import Link from 'next/link';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function ExtraPageViewer() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [page, setPage] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(1);
    
    const contentRef = useRef<HTMLDivElement>(null);

    // Veri Çekme
    useEffect(() => {
        if (!id) return;
        const fetchPage = async () => {
            setIsLoading(true);
            const res = await getExtraPage(id);
            if (res.success) {
                setPage(res.data);
            } else {
                setError(res.error || "İçerik yüklenemedi.");
            }
            setIsLoading(false);
        };
        fetchPage();
    }, [id]);

    // Script Yürütücü (Gelişmiş & Güvenli)
    useEffect(() => {
        if (page?.htmlContent && contentRef.current) {
            // Identifier already declared hatasını önlemek için scoped scriptler oluşturuyoruz
            const doc = new DOMParser().parseFromString(page.htmlContent, 'text/html');
            const scripts = doc.querySelectorAll('script');
            
            // Mevcut global fonksiyonları React uyumlu hale getir
            if (typeof window !== 'undefined') {
                (window as any).go = (n: number) => window.history.go(n);
                // Diğer beklenen global fonksiyonlar buraya eklenebilir
            }

            scripts.forEach(oldScript => {
                const newScript = document.createElement('script');
                // Script içeriğini IIFE (Self-Invoking Function) ile sarmalayarak çakışmayı önle
                const scopedContent = `(function(){ try { ${oldScript.textContent} } catch(e) { console.error('Script Error:', e); } })();`;
                newScript.textContent = scopedContent;
                document.body.appendChild(newScript);
                
                // Temizlik için scripti kaldır (ancak window üzerindeki tanımlar kalır)
                setTimeout(() => document.body.removeChild(newScript), 100);
            });

            // init fonksiyonlarını tetikle (DOM hazır olduktan sonra)
            setTimeout(() => {
                if (typeof (window as any).initAdimAdim === 'function') {
                    try { (window as any).initAdimAdim(); } catch(e) {}
                }
                if (typeof (window as any).showSection === 'function') {
                    // Sayfa başında ilk bölümü göster
                    try { (window as any).showSection(1); } catch(e) {}
                }
            }, 200);
        }
    }, [page?.htmlContent]);

    // Klavye Kısayolları ve Fullscreen Dinleyicisi
    useEffect(() => {
        const handleFS = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFS);
        return () => document.removeEventListener('fullscreenchange', handleFS);
    }, []);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    };

    const handlePrint = () => window.print();

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-950">
                <Loader2 className="h-16 w-16 animate-spin text-indigo-500" />
            </div>
        );
    }

    if (error || !page) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-950 p-6 text-center">
                <div className="bg-slate-900 p-12 rounded-[3rem] border border-red-500/20 max-w-md w-full shadow-2xl">
                    <div className="bg-red-500/10 p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                        <X className="h-10 w-10 text-red-500" />
                    </div>
                    <p className="text-red-400 text-xl font-bold mb-8 leading-tight">{error || "Bu döküman bulunamadı veya silinmiş."}</p>
                    <Button asChild size="lg" className="w-full bg-slate-800 hover:bg-slate-700 h-14 rounded-2xl">
                        <Link href="/extra"><ArrowLeft className="mr-2 h-5 w-5"/> Geri Dön</Link>
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className={cn(
            "min-h-screen bg-white transition-all duration-500 relative",
            isFullscreen ? "p-0" : "bg-[#f8fafc] pb-20"
        )}>
            {/* Yazdırma Stili */}
            <style media="print">{`
                @page { margin: 15mm; }
                .no-print { display: none !important; }
                .print-content { padding: 0 !important; width: 100% !important; margin: 0 !important; }
                body { background: white !important; color: black !important; }
            `}</style>

            {/* Üst Bar (Toolbar) */}
            <header className={cn(
                "sticky top-0 z-50 transition-all no-print",
                isFullscreen 
                    ? "bg-slate-950/80 backdrop-blur-md text-white p-2 border-b border-white/10 opacity-0 hover:opacity-100" 
                    : "bg-white/80 backdrop-blur-xl border-b border-slate-200 p-4 shadow-sm"
            )}>
                <div className="container mx-auto flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 overflow-hidden">
                        {!isFullscreen && (
                            <Button asChild variant="ghost" size="icon" className="rounded-xl h-10 w-10 shrink-0">
                                <Link href="/extra"><ArrowLeft className="h-5 w-5 text-slate-500" /></Link>
                            </Button>
                        )}
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className={cn("p-2 rounded-lg shrink-0", isFullscreen ? "bg-white/10" : "bg-indigo-50")}>
                                <FileText className={cn("h-5 w-5", isFullscreen ? "text-white" : "text-indigo-600")} />
                            </div>
                            <h1 className={cn("font-black tracking-tight uppercase truncate", isFullscreen ? "text-sm" : "text-xl text-slate-800")}>
                                {page.title}
                            </h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Zoom Kontrolü */}
                        <div className={cn("flex items-center rounded-xl p-1 border", isFullscreen ? "bg-white/10 border-white/10" : "bg-slate-100 border-slate-200")}>
                            <Button variant="ghost" size="icon" onClick={() => setZoomLevel(z => Math.max(0.6, z - 0.1))} className="h-8 w-8 rounded-lg text-slate-500 hover:bg-white"><Minus className="h-4 w-4"/></Button>
                            <span className="text-[10px] font-mono font-bold w-12 text-center text-slate-400">{Math.round(zoomLevel * 100)}%</span>
                            <Button variant="ghost" size="icon" onClick={() => setZoomLevel(z => Math.min(2.5, z + 0.1))} className="h-8 w-8 rounded-lg text-slate-500 hover:bg-white"><Plus className="h-4 w-4"/></Button>
                        </div>
                        
                        <div className="w-px h-6 bg-slate-200 mx-1 hidden sm:block" />

                        <Button onClick={handlePrint} variant="ghost" size="icon" className="rounded-xl h-10 w-10 text-slate-500 hidden sm:flex">
                            <Printer className="h-5 w-5" />
                        </Button>
                        
                        <Button onClick={toggleFullscreen} variant="ghost" size="icon" className="rounded-xl h-10 w-10 text-slate-500">
                            {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
                        </Button>
                    </div>
                </div>
            </header>

            {/* İçerik Alanı */}
            <main className={cn(
                "transition-all duration-500 pt-8 print-content",
                isFullscreen ? "p-4 md:p-12" : "container mx-auto px-4"
            )}>
                {/* Meta Bilgileri */}
                {!isFullscreen && (
                    <div className="max-w-4xl mx-auto mb-10 space-y-6 animate-in fade-in slide-in-from-top-4 duration-700">
                        <div className="flex flex-wrap items-center gap-3">
                            <Badge className="bg-indigo-600 hover:bg-indigo-600 text-white px-4 py-1 rounded-full text-xs font-black tracking-widest uppercase">
                                <Globe className="w-3 h-3 mr-2" /> {page.category || 'Genel'}
                            </Badge>
                            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                <Calendar className="w-3.5 h-3.5" />
                                {page.updatedAt ? format(new Date(page.updatedAt), 'dd MMMM yyyy', { locale: tr }) : '-'}
                            </span>
                        </div>
                        <h2 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter leading-none">
                            {page.title}
                        </h2>
                        {page.description && (
                            <p className="text-xl text-slate-500 font-medium leading-relaxed border-l-4 border-indigo-500 pl-6 py-1 italic">
                                {page.description}
                            </p>
                        )}
                        <Separator className="bg-slate-200" />
                    </div>
                )}

                <div 
                    style={{ zoom: zoomLevel }}
                    className={cn(
                        "max-w-4xl mx-auto transition-transform origin-top",
                        "prose prose-slate lg:prose-xl prose-indigo dark:prose-invert"
                    )}
                >
                    <div 
                        ref={contentRef}
                        dangerouslySetInnerHTML={{ __html: page.htmlContent }} 
                        className="animate-in fade-in duration-1000"
                    />
                </div>
            </main>

            {/* Alt Bilgi */}
            {!isFullscreen && (
                <footer className="container mx-auto px-4 mt-20 pt-8 border-t border-slate-200 no-print">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-slate-900 flex items-center justify-center text-white font-black text-xs">DO</div>
                            <div>
                                <p className="font-bold text-slate-800">Din Dersi Atölyesi</p>
                                <p className="text-xs text-slate-500 font-medium">Bu döküman dijital eğitim platformu üzerinden sunulmaktadır.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Button variant="outline" className="rounded-xl border-slate-200 gap-2 h-11">
                                <Share2 className="h-4 w-4" /> Paylaş
                            </Button>
                            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl gap-2 h-11 px-8 font-bold">
                                <Bookmark className="h-4 w-4" /> Kaydet
                            </Button>
                        </div>
                    </div>
                    <div className="mt-8 text-center text-[10px] font-black text-slate-300 uppercase tracking-[0.5em] pb-10">
                        &copy; {new Date().getFullYear()} TÜM HAKLARI SAKLIDIR
                    </div>
                </footer>
            )}
        </div>
    );
}

function Separator({ className }: { className?: string }) {
    return <div className={cn("h-px w-full", className)} />
}

function X(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  )
}
