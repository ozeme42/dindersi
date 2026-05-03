
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
    Loader2, ArrowLeft, Maximize2, Minimize2, 
    Plus, Minus, Settings2, BookOpen, ChevronRight,
    Home, Settings, Share2, Download, Printer, 
    ChevronLeft, Layout
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { getExtraPage } from '@/app/teacher/extra-pages/actions';
import Link from 'next/link';

export default function ExtraPageViewer() {
    const params = useParams();
    const id = params.id as string;
    const router = useRouter();

    const [page, setPage] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(1);
    
    const contentRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Veri Çekme
    useEffect(() => {
        const fetchPage = async () => {
            setIsLoading(true);
            try {
                const res = await getExtraPage(id);
                if (res.success) {
                    setPage(res.data);
                } else {
                    setError(res.error || "Sayfa bulunamadı.");
                }
            } catch (e) {
                setError("Veri yüklenirken teknik bir hata oluştu.");
            }
            setIsLoading(false);
        };
        fetchPage();
    }, [id]);

    // Script Runner & Global Helper Functions
    useEffect(() => {
        if (!page?.htmlContent) return;

        // Global uyumluluk fonksiyonları (showSection, toggleAccordion, go(-1) vb. için)
        const setupGlobalHelpers = () => {
            (window as any).go = (n: number) => {
                if (n === -1) router.back();
                else window.history.go(n);
            };

            // Döküman içindeki showSection fonksiyonunu global window'a bağla
            // Bu, inline onclick="showSection(1)" yapılarını kurtarır.
        };

        setupGlobalHelpers();

        // Scriptleri ayıkla ve güvenli bir şekilde çalıştır
        const runScripts = () => {
            const div = document.createElement('div');
            div.innerHTML = page.htmlContent;
            const scriptTags = div.querySelectorAll('script');

            scriptTags.forEach(oldScript => {
                const newScript = document.createElement('script');
                // SyntaxError: Identifier already declared hatasını önlemek için kodları kapsama alıyoruz
                const scriptContent = `(function(){ 
                    try { 
                        ${oldScript.textContent} 
                    } catch(e) { 
                        console.warn('Script execution error:', e); 
                    }
                })();`;
                newScript.textContent = scriptContent;
                document.body.appendChild(newScript);
                document.body.removeChild(newScript); // DOM'dan temizle ama bellekte kalır
            });

            // Eğer sayfa yüklendiğinde çalışması gereken bir init fonksiyonu varsa (DOM hazır olduktan sonra)
            setTimeout(() => {
                if (typeof (window as any).initAdimAdim === 'function') {
                    try { (window as any).initAdimAdim(); } catch(e) {}
                }
            }, 100);
        };

        runScripts();

        // Cleanup: Sayfadan çıkınca global fonksiyonları temizle (isteğe bağlı)
        return () => {
            // (window as any).showSection = undefined;
        };
    }, [page?.htmlContent, router]);

    // Fullscreen İzleyici
    useEffect(() => {
        const handleFs = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFs);
        return () => document.removeEventListener('fullscreenchange', handleFs);
    }, []);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen().catch(() => {
                alert("Tam ekran bu tarayıcıda desteklenmiyor.");
            });
        } else {
            document.exitFullscreen();
        }
    };

    if (isLoading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-slate-950">
                <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
            </div>
        );
    }

    if (error || !page) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center">
                <div className="bg-slate-900/50 p-10 rounded-[3rem] border border-red-500/20 max-w-md shadow-2xl">
                    <XCircle className="h-16 w-16 text-red-500 mx-auto mb-6" />
                    <p className="text-red-400 text-xl font-bold mb-8">{error || "Döküman bulunamadı."}</p>
                    <Button asChild size="lg" className="w-full bg-slate-800 hover:bg-slate-700 rounded-2xl">
                        <Link href="/extra"><ArrowLeft className="mr-2 h-5 w-5" /> Geri Dön</Link>
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div ref={containerRef} className="min-h-screen bg-slate-50 flex flex-col relative overflow-x-hidden">
            {/* Üst Bar */}
            <header className={cn(
                "sticky top-0 z-50 flex-shrink-0 transition-all duration-300",
                isFullscreen 
                    ? "h-0 overflow-hidden opacity-0" 
                    : "bg-white/80 backdrop-blur-xl border-b border-slate-200 py-3 shadow-sm"
            )}>
                <div className="container mx-auto px-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                         <Button variant="ghost" size="icon" asChild className="rounded-full h-10 w-10 hover:bg-slate-100">
                             <Link href="/extra"><ArrowLeft className="h-5 w-5" /></Link>
                         </Button>
                         <div className="min-w-0">
                             <h1 className="font-black text-slate-900 truncate max-w-[200px] md:max-w-md leading-none text-lg">
                                {page.title}
                             </h1>
                             <Badge variant="outline" className="bg-indigo-50 text-indigo-600 border-indigo-100 text-[9px] font-black uppercase mt-1 h-4">{page.category || 'Genel'}</Badge>
                         </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="hidden sm:flex items-center bg-slate-100 rounded-full p-1 border border-slate-200 mr-2 shadow-inner">
                            <Button variant="ghost" size="icon" onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.1))} className="h-8 w-8 rounded-full text-slate-500 hover:bg-white hover:text-indigo-600"><Minus className="h-4 w-4"/></Button>
                            <span className="text-[10px] font-black text-slate-400 w-10 text-center">{Math.round(zoomLevel * 100)}%</span>
                            <Button variant="ghost" size="icon" onClick={() => setZoomLevel(z => Math.min(2.5, z + 0.1))} className="h-8 w-8 rounded-full text-slate-500 hover:bg-white hover:text-indigo-600"><Plus className="h-4 w-4"/></Button>
                        </div>
                        
                        <Button variant="outline" size="icon" onClick={toggleFullscreen} className="rounded-xl h-10 w-10 border-slate-200 text-slate-600 hover:bg-slate-50">
                            <Maximize2 className="h-5 w-5" />
                        </Button>
                        
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 text-slate-400 hover:bg-slate-100"><Settings2 className="h-5 w-5" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-2xl w-48 bg-white">
                                <DropdownMenuItem onClick={() => window.print()} className="gap-2 cursor-pointer font-bold text-xs"><Printer className="h-4 w-4" /> Yazdır</DropdownMenuItem>
                                <DropdownMenuItem className="gap-2 cursor-pointer font-bold text-xs"><Share2 className="h-4 w-4" /> Paylaş</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </header>

            {/* İçerik Alanı */}
            <main className={cn(
                "flex-grow relative z-10 transition-all duration-500",
                isFullscreen ? "bg-white p-0" : "py-8 px-4"
            )}>
                <div className={cn(
                    isFullscreen ? "w-full" : "container mx-auto"
                )}>
                    <Card className={cn(
                        "w-full transition-all border-none bg-white",
                        isFullscreen ? "rounded-none" : "rounded-[2.5rem] shadow-2xl p-6 md:p-12 min-h-[80vh] border border-slate-100"
                    )}>
                        <div 
                            ref={contentRef}
                            style={{ zoom: zoomLevel }}
                            className="prose prose-slate max-w-none prose-headings:font-black prose-p:text-justify prose-img:rounded-3xl prose-img:shadow-xl"
                            dangerouslySetInnerHTML={{ __html: page.htmlContent }}
                        />
                    </Card>
                </div>
            </main>

            {/* Tam Ekrandaki Yüzen Çıkış Butonu */}
            <div className={cn(
                "fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] transition-all duration-500",
                isFullscreen ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0 pointer-events-none"
            )}>
                <div className="flex items-center gap-3 p-2 rounded-full bg-slate-900/40 backdrop-blur-xl border border-white/10 shadow-2xl">
                     <div className="flex items-center gap-1 bg-black/20 p-1 rounded-full border border-white/5 mr-2">
                        <Button variant="ghost" size="icon" onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.1))} className="h-9 w-9 rounded-full text-white hover:bg-white/10"><Minus className="h-4 w-4"/></Button>
                        <span className="text-[10px] font-black text-white/50 w-10 text-center">{Math.round(zoomLevel * 100)}%</span>
                        <Button variant="ghost" size="icon" onClick={() => setZoomLevel(z => Math.min(2.5, z + 0.1))} className="h-9 w-9 rounded-full text-white hover:bg-white/10"><Plus className="h-4 w-4"/></Button>
                    </div>
                    <Button 
                        onClick={toggleFullscreen}
                        className="h-11 px-6 rounded-full bg-red-600 hover:bg-red-500 text-white font-black border border-red-400/30 shadow-lg"
                    >
                        <Minimize2 className="mr-2 h-5 w-5" /> KAPAT
                    </Button>
                </div>
            </div>
        </div>
    );
}

// Eksik ShadCN ve İkon bileşenleri için proxy tanımlamalar (Referans hatalarını önlemek için)
const XCircle = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
);

const DropdownMenu = ({ children }: any) => <div className="relative inline-block text-left">{children}</div>;
const DropdownMenuTrigger = ({ children }: any) => children;
const DropdownMenuContent = ({ children, className }: any) => <div className={cn("absolute right-0 mt-2 origin-top-right border border-slate-200 shadow-2xl z-50 p-1", className)}>{children}</div>;
const DropdownMenuItem = ({ children, onClick, className }: any) => <div onClick={onClick} className={cn("flex items-center px-3 py-2 hover:bg-slate-100 transition-colors rounded-xl", className)}>{children}</div>;
