
'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
    Loader2, ArrowLeft, Maximize2, Minimize2, 
    Download, Clock, BookOpen, ZoomIn, ZoomOut,
    CheckCircle2, XCircle, ChevronRight, Share2, Printer
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { getExtraPage } from '@/app/teacher/extra-pages/actions';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

function ExtraPageViewer() {
    const params = useParams();
    const router = useRouter();
    const [page, setPage] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [zoom, setZoom] = useState(1);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Gelişmiş Script Runner: Döküman içerisindeki JavaScript kodlarını React ile uyumlu çalıştırır
    const executeInlineScripts = useCallback(() => {
        if (!contentRef.current) return;
        const scripts = contentRef.current.querySelectorAll('script');
        
        scripts.forEach(oldScript => {
            const newScript = document.createElement('script');
            let scriptContent = oldScript.innerText;

            // 1. Zaten tanımlanmış (TOTAL has already been declared) hatasını önlemek için let/const -> var dönüşümü
            scriptContent = scriptContent.replace(/const\s+/g, 'var ').replace(/let\s+/g, 'var ');

            // 2. Fonksiyonları global window nesnesine bağla (onclick eventleri için gerekli)
            const funcRegex = /function\s+([a-zA-Z0-9_]+)\s*\(/g;
            let match;
            const functionNames = [];
            while ((match = funcRegex.exec(scriptContent)) !== null) {
                functionNames.push(match[1]);
            }
            
            if (functionNames.length > 0) {
                const bindings = functionNames.map(name => `window.${name} = ${name};`).join('\n');
                scriptContent += `\n${bindings}`;
            }

            // 3. Yaygın kullanılan yardımcı fonksiyonlar (Eğer dökümanda yoksa)
            if (!scriptContent.includes('function go')) {
                scriptContent += `\nwindow.go = function(n) { if(n === -1) window.history.back(); else window.history.go(n); };`;
            }

            try {
                newScript.text = `(function(){\n${scriptContent}\n})();`;
                document.body.appendChild(newScript);
                // Script eklendikten sonra silinir, DOM'u kirletmez
                document.body.removeChild(newScript);
            } catch (e) {
                console.error("Script execution failed:", e);
            }
        });
    }, []);

    useEffect(() => {
        const fetchPage = async () => {
            if (!params.id) return;
            setIsLoading(true);
            const res = await getExtraPage(params.id as string);
            if (res.success) {
                setPage(res.data);
                // DOM güncellendikten hemen sonra scriptleri çalıştır
                setTimeout(executeInlineScripts, 100);
            }
            setIsLoading(false);
        };
        fetchPage();

        const handleFs = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFs);
        return () => {
            document.removeEventListener('fullscreenchange', handleFs);
            // Global fonksiyonları temizle (isteğe bağlı)
        };
    }, [params.id, executeInlineScripts]);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    };

    if (isLoading) return <div className="h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-indigo-500" /></div>;

    if (!page) return (
        <div className="h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Döküman bulunamadı.</h2>
            <Button asChild className="bg-indigo-600 hover:bg-indigo-500"><Link href="/extra">Geri Dön</Link></Button>
        </div>
    );

    return (
        <div ref={containerRef} className={cn("min-h-screen bg-white transition-all flex flex-col", isFullscreen ? "fixed inset-0 z-50 overflow-auto" : "bg-slate-50")}>
            
            {/* Toolbar */}
            <header className={cn(
                "sticky top-0 z-50 transition-all duration-300",
                isFullscreen 
                    ? "p-2 bg-slate-900/80 backdrop-blur-md border-b border-white/10 text-white opacity-0 hover:opacity-100" 
                    : "p-4 bg-white border-b border-slate-200"
            )}>
                <div className="container mx-auto flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                         {!isFullscreen && (
                            <Button asChild variant="ghost" size="icon" className="rounded-full shrink-0">
                                <Link href="/extra"><ArrowLeft className="h-6 w-6 text-slate-600" /></Link>
                            </Button>
                         )}
                         <div className="min-w-0">
                             <h1 className={cn("font-black uppercase tracking-tight truncate leading-none", isFullscreen ? "text-lg text-white" : "text-xl text-slate-900")}>
                                {page.title}
                             </h1>
                             {!isFullscreen && (
                                <div className="flex items-center gap-3 mt-1.5">
                                    <Badge variant="outline" className="bg-indigo-50 text-indigo-600 border-indigo-100 text-[9px] font-black uppercase py-0 h-4">
                                        {page.category || 'Genel'}
                                    </Badge>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                        <Clock className="h-2.5 w-2.5" />
                                        {page.updatedAt ? format(new Date(page.updatedAt), 'd MMMM yyyy', { locale: tr }) : '-'}
                                    </span>
                                </div>
                             )}
                         </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <div className={cn("flex items-center rounded-xl p-1 border", isFullscreen ? "bg-white/10 border-white/20" : "bg-slate-100 border-slate-200")}>
                            <Button variant="ghost" size="icon" onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} className="h-8 w-8 rounded-lg"><ZoomOut className="h-4 w-4" /></Button>
                            <span className="text-[10px] font-mono font-bold w-12 text-center">{Math.round(zoom * 100)}%</span>
                            <Button variant="ghost" size="icon" onClick={() => setZoom(z => Math.min(3, z + 0.1))} className="h-8 w-8 rounded-lg"><ZoomIn className="h-4 w-4" /></Button>
                        </div>
                        <Button onClick={toggleFullscreen} variant={isFullscreen ? "secondary" : "outline"} size="icon" className="rounded-xl h-10 w-10">
                            {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
                        </Button>
                        <Button variant="outline" size="icon" className="rounded-xl h-10 w-10 hidden sm:flex" onClick={() => window.print()}>
                            <Printer className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
            </header>

            {/* Content Area */}
            <main className={cn("flex-1 relative", isFullscreen ? "bg-white p-0" : "container mx-auto px-4 py-8")}>
                <div 
                    className={cn(
                        "w-full bg-white mx-auto shadow-2xl overflow-hidden transition-all duration-300",
                        isFullscreen ? "rounded-none shadow-none" : "rounded-[2rem] border border-slate-200"
                    )}
                    style={{ transformOrigin: 'top center' }}
                >
                    <div 
                        ref={contentRef}
                        className="prose prose-slate max-w-none p-8 sm:p-12 md:p-16 lg:p-20"
                        style={{ zoom: zoom }}
                        dangerouslySetInnerHTML={{ __html: page.htmlContent }}
                    />
                </div>

                {/* Floating Exit for Fullscreen */}
                {isFullscreen && (
                    <div className="fixed bottom-8 right-8 z-[100] animate-in fade-in slide-in-from-bottom-4 duration-500 opacity-0 hover:opacity-100">
                        <Button 
                            onClick={() => document.exitFullscreen()} 
                            className="h-12 px-6 rounded-full bg-red-600 hover:bg-red-500 text-white font-bold border border-red-400/30 shadow-2xl"
                        >
                            <Minimize2 className="mr-2 h-5 w-5" /> Çıkış
                        </Button>
                    </div>
                )}
            </main>

            {/* Print Only Footer */}
            <footer className="hidden print:block text-center text-[10px] text-slate-400 py-10 border-t mt-20">
                Bu döküman Değerler Oyunu platformu üzerinden oluşturulmuştur. &copy; {new Date().getFullYear()}
            </footer>
        </div>
    );
}

export default function Page() {
    return (
        <Suspense fallback={<div className="h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-indigo-500" /></div>}>
            <ExtraPageViewer />
        </Suspense>
    );
}
