'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
    Loader2, ArrowLeft, Printer, Minus, Plus, 
    Maximize2, Minimize2, Calendar, Folder, FileText,
    Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getExtraPage } from '@/app/teacher/extra-pages/actions';
import Link from 'next/link';

function ExtraPageViewer() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    
    const [content, setContent] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [zoomLevel, setZoomLevel] = useState(1);
    const [isFullscreen, setIsFullscreen] = useState(false);
    
    const contentRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchPage = async () => {
            if (!id) return;
            setIsLoading(true);
            const res = await getExtraPage(id);
            if (res.success) {
                setContent(res.data);
            }
            setIsLoading(false);
        };
        fetchPage();
        
        const handleFS = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFS);
        return () => document.removeEventListener('fullscreenchange', handleFS);
    }, [id]);

    // Scriptleri yürütme (showSection, initAdimAdim gibi fonksiyonlar için)
    useEffect(() => {
        if (!isLoading && content?.htmlContent && contentRef.current) {
            const scripts = contentRef.current.querySelectorAll('script');
            scripts.forEach(oldScript => {
                const newScript = document.createElement('script');
                // Değişken çakışmalarını (SyntaxError) önlemek için her scripti bir blok içine alıyoruz
                const scriptBody = `(function() { 
                    try { 
                        ${oldScript.innerHTML} 
                    } catch(e) { console.error('Script Error:', e); } 
                })();`;
                newScript.textContent = scriptBody;
                document.body.appendChild(newScript);
                // Çalıştıktan sonra DOM'u temizle
                document.body.removeChild(newScript);
            });
            
            // Eğer döküman içinde otomatik tetiklenmesi gereken bir başlangıç fonksiyonu varsa burada çağrılabilir
            try {
                if (typeof (window as any).initAdimAdim === 'function') (window as any).initAdimAdim();
            } catch(e) {}
        }
    }, [isLoading, content]);

    const handlePrint = () => window.print();
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) containerRef.current?.requestFullscreen();
        else document.exitFullscreen();
    };

    if (isLoading) return <div className="h-screen flex flex-col items-center justify-center bg-slate-50"><Loader2 className="h-12 w-12 animate-spin text-indigo-500" /><p className="mt-4 text-slate-500 font-medium">Döküman Hazırlanıyor...</p></div>;

    if (!content) return <div className="h-screen flex flex-col items-center justify-center p-8 bg-slate-50 text-center"><div className="bg-white p-8 rounded-3xl border border-red-100 shadow-xl max-w-md"><h2 className="text-xl font-bold text-slate-900 mb-2">Döküman Bulunamadı</h2><p className="text-slate-500 mb-6">Aradığınız sayfa silinmiş veya taşınmış olabilir.</p><Button asChild className="rounded-xl px-8 bg-slate-900"><Link href="/extra">Geri Dön</Link></Button></div></div>;

    return (
        <div ref={containerRef} className="min-h-screen bg-slate-50 flex flex-col font-sans relative overflow-x-hidden">
            <style jsx global>{`
                @media print {
                    .print-hidden { display: none !important; }
                    body { background: white !important; padding: 0 !important; }
                    .prose { max-width: none !important; width: 100% !important; font-size: 12pt !important; }
                }
                .prose { color: #1e293b; max-width: none; }
                .prose h1 { color: #0f172a; font-weight: 800; border-bottom: 2px solid #f1f5f9; padding-bottom: 1rem; }
                .prose img { border-radius: 1rem; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); margin: 2rem auto; }
                .prose blockquote { border-left-color: #6366f1; background: #f8fafc; padding: 1.5rem; border-radius: 0 1rem 1rem 0; font-style: italic; }
            `}</style>

            {/* Üst Bar */}
            <header className="flex-shrink-0 sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200 px-4 md:px-8 py-3 flex items-center justify-between shadow-sm print-hidden">
                <div className="flex items-center gap-4 overflow-hidden">
                    <Link href="/extra">
                        <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 hover:bg-slate-100">
                            <ArrowLeft className="h-5 w-5 text-slate-600" />
                        </Button>
                    </Link>
                    <div className="overflow-hidden">
                        <h1 className="text-lg font-black text-slate-900 truncate uppercase tracking-tight">{content.title}</h1>
                        <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="secondary" className="bg-indigo-50 text-indigo-600 border-none text-[10px] font-bold uppercase">{content.category}</Badge>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{content.updatedAt ? new Date(content.updatedAt).toLocaleDateString('tr-TR') : 'YENİ'}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="hidden sm:flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
                        <Button variant="ghost" size="icon" onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.1))} className="h-8 w-8 text-slate-600 hover:bg-white rounded-lg"><Minus className="h-4 w-4"/></Button>
                        <span className="text-[10px] font-black text-slate-500 w-10 text-center">{Math.round(zoomLevel * 100)}%</span>
                        <Button variant="ghost" size="icon" onClick={() => setZoomLevel(z => Math.min(2.5, z + 0.1))} className="h-8 w-8 text-slate-600 hover:bg-white rounded-lg"><Plus className="h-4 w-4"/></Button>
                    </div>
                    <Button variant="outline" size="icon" onClick={handlePrint} className="h-10 w-10 rounded-xl text-slate-600 border-slate-200 hover:bg-slate-100"><Printer className="h-5 w-5"/></Button>
                    <Button variant="outline" size="icon" onClick={toggleFullscreen} className="h-10 w-10 rounded-xl bg-indigo-600 text-white border-none hover:bg-indigo-700 shadow-md">
                        {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
                    </Button>
                </div>
            </header>

            {/* İçerik Alanı */}
            <main className="flex-grow relative z-10 w-full overflow-y-auto">
                <div 
                    className="container mx-auto px-4 md:px-12 py-12"
                    style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top center' }}
                >
                    <div 
                        ref={contentRef}
                        className="prose prose-slate prose-lg max-w-none animate-in fade-in slide-in-from-bottom-4 duration-700"
                        dangerouslySetInnerHTML={{ __html: content.htmlContent }}
                    />
                    
                    {/* Alt Bilgi */}
                    <div className="mt-20 pt-8 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4 text-slate-400 font-medium text-xs uppercase tracking-widest print-hidden pb-12">
                        <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5"/> {content.createdAt ? new Date(content.createdAt).toLocaleDateString('tr-TR') : '-'}</span>
                            <span className="flex items-center gap-1.5"><Folder className="h-3.5 w-3.5"/> {content.category}</span>
                        </div>
                        <span>Din Dersi Atölyesi Platformu</span>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default function Page() {
    return (
        <Suspense fallback={<div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="h-12 w-12 animate-spin text-indigo-500" /></div>}>
            <ExtraPageViewer />
        </Suspense>
    );
}