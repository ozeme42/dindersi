
'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, ArrowLeft, Plus, Minus, Download, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FullscreenToggle } from '@/components/fullscreen-toggle';
import { getExtraPage } from '@/app/teacher/extra-pages/actions';
import Link from 'next/link';

const MagnificentLightBackground = () => (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-slate-50">
        <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-indigo-200/30 rounded-full blur-[120px] mix-blend-multiply" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-sky-200/30 rounded-full blur-[120px] mix-blend-multiply" />
        <div className="absolute top-[40%] left-[50%] w-[400px] h-[400px] bg-purple-200/20 rounded-full blur-[100px] mix-blend-multiply" />
    </div>
);

export default function ExtraPageViewer() {
    const params = useParams();
    const id = params?.id as string;

    const [content, setContent] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [zoomLevel, setZoomLevel] = useState(1.0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!id) return;
            setIsLoading(true);
            try {
                const res = await getExtraPage(id);
                if (res.success && res.data) {
                    setContent(res.data);
                } else {
                    setError(res.error || "İçerik yüklenemedi.");
                }
            } catch (e: any) {
                setError("Veritabanı bağlantısı sırasında bir hata oluştu.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();

        const handleFs = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFs);
        return () => document.removeEventListener('fullscreenchange', handleFs);
    }, [id]);

    if (isLoading) return <div className="h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-indigo-500" /></div>;

    if (error || !content) {
        return (
           <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 text-center relative z-10">
               <div className="bg-white p-10 rounded-[2.5rem] border border-red-100 max-w-md w-full shadow-2xl">
                   <div className="bg-red-50 p-4 rounded-2xl inline-block mb-6"><X className="h-10 w-10 text-red-500" /></div>
                   <p className="text-slate-800 mb-8 font-bold text-xl">{error || "Aradığınız sayfa bulunamadı."}</p>
                   <Button asChild className="bg-slate-900 text-white hover:bg-slate-800 w-full h-12 rounded-xl">
                       <Link href="/extra"><ArrowLeft className="mr-2 h-4 w-4"/> Listeye Dön</Link>
                   </Button>
               </div>
           </div>
       );
   }

    const safeHtmlDocument = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
                body { 
                    zoom: ${zoomLevel}; 
                    transform-origin: top center; 
                    padding: 40px; 
                    font-family: system-ui, -apple-system, sans-serif; 
                    margin: 0;
                    color: #1e293b;
                    background-color: white;
                    line-height: 1.6;
                }
                .container { max-width: 900px; margin: 0 auto; }
                img { max-width: 100%; height: auto; border-radius: 1rem; margin: 2rem 0; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
                h1 { font-size: 2.5rem; font-weight: 800; color: #1e1b4b; margin-bottom: 1.5rem; }
                h2 { font-size: 1.8rem; font-weight: 700; color: #312e81; margin-top: 2.5rem; margin-bottom: 1rem; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.5rem; }
                p { margin-bottom: 1.25rem; font-size: 1.1rem; text-align: justify; }
                ul, ol { margin-bottom: 1.5rem; padding-left: 1.5rem; }
                li { margin-bottom: 0.5rem; }
            </style>
        </head>
        <body>
            <div class="container">
                ${content.htmlContent}
            </div>
        </body>
        </html>
    `;

    return (
        <div className="min-h-screen bg-white flex flex-col relative overflow-hidden">
            <MagnificentLightBackground />
            
            <header className={cn(
                "sticky top-0 z-50 transition-all duration-300",
                isFullscreen ? "h-0 overflow-hidden" : "bg-white/80 backdrop-blur-xl border-b border-slate-200"
            )}>
                <div className="container mx-auto px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-5 w-full md:w-auto">
                        <Link href="/extra">
                            <Button variant="ghost" size="icon" className="h-11 w-11 rounded-xl bg-slate-100 hover:bg-slate-200 transition-all">
                                <ArrowLeft className="h-5 w-5 text-slate-600" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-xl font-black text-slate-800 tracking-tight uppercase line-clamp-1">{content.title}</h1>
                            <p className="text-[9px] text-indigo-500 font-bold uppercase tracking-[0.2em]">{content.category} &bull; Tam Ekran Modu Desteklenir</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                         <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
                            <Button variant="ghost" size="icon" onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.1))} className="h-8 w-8 text-slate-600 hover:bg-white rounded-lg"><Minus className="h-4 w-4"/></Button>
                            <span className="text-[10px] font-black text-slate-500 w-12 text-center">{Math.round(zoomLevel * 100)}%</span>
                            <Button variant="ghost" size="icon" onClick={() => setZoomLevel(z => Math.min(2.5, z + 0.1))} className="h-8 w-8 text-slate-600 hover:bg-white rounded-lg"><Plus className="h-4 w-4"/></Button>
                        </div>
                        <FullscreenToggle elementRef={containerRef} className="bg-indigo-600 border-none text-white h-10 w-10 rounded-xl shadow-lg shadow-indigo-200" />
                    </div>
                </div>
            </header>

            <main className="flex-1 relative z-10">
                <div ref={containerRef} className={cn("w-full relative flex flex-col bg-white", isFullscreen ? "fixed inset-0 z-[100] h-screen" : "h-[calc(100vh-80px)]")}>
                    <iframe 
                        srcDoc={safeHtmlDocument} 
                        className="w-full h-full border-0 bg-white" 
                        sandbox="allow-scripts allow-same-origin"
                        title={content.title}
                    />
                </div>
            </main>
        </div>
    );
}

function X(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
  )
}
