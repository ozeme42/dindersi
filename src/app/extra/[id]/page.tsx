'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
    Loader2, ArrowLeft, Printer, Plus, Minus, Maximize2, 
    Minimize2, FileText, Clock, Share2, BookOpen
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

    const [content, setContent] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [zoomLevel, setZoomLevel] = useState(100);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const viewerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchPage = async () => {
            setIsLoading(true);
            const res = await getExtraPage(id);
            if (res.success) {
                setContent(res.data);
            } else {
                setError(res.error || "Döküman bulunamadı.");
            }
            setIsLoading(false);
        };
        fetchPage();

        const handleFs = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFs);
        return () => document.removeEventListener('fullscreenchange', handleFs);
    }, [id]);

    // HTML içindeki scriptleri güvenli bir şekilde çalıştıran efekt
    useEffect(() => {
        if (!content?.htmlContent) return;

        const timer = setTimeout(() => {
            const div = document.createElement('div');
            div.innerHTML = content.htmlContent;
            const scripts = div.querySelectorAll('script');

            scripts.forEach(oldScript => {
                const newScript = document.createElement('script');
                const code = oldScript.innerText;
                
                // HATA ÇÖZÜMÜ: 'Identifier already declared' hatasını önlemek için kodları blok kapsamına alıyoruz.
                // showSection gibi fonksiyonları ise global (window) kapsamına bağlıyoruz.
                newScript.text = `
                    (function() {
                        try {
                            // Fonksiyonları pencereye (global) bağla
                            const functionRegex = /function\\s+([a-zA-Z0-9_]+)\\s*\\(/g;
                            let match;
                            let modifiedCode = \`${code.replace(/`/g, '\\`').replace(/\${/g, '\\${')}\`;
                            
                            while ((match = functionRegex.exec(modifiedCode)) !== null) {
                                const funcName = match[1];
                                // Eğer fonksiyon window'da yoksa veya override edilmek isteniyorsa:
                                // modifiedCode += "\\n window." + funcName + " = " + funcName + ";";
                            }

                            // Doğrudan eval kullanarak window kapsamında çalıştır (Daha riskli ama onclick="showSection()" için gerekli)
                            window.eval(\`${code.replace(/`/g, '\\`').replace(/\${/g, '\\${')}\`);
                            
                            // Ekstra: Eğer initAdimAdim varsa otomatik çağır
                            if (typeof window.initAdimAdim === 'function') window.initAdimAdim();
                        } catch (e) {
                            console.warn("Script runner warning:", e);
                        }
                    })();
                `;
                document.body.appendChild(newScript);
                // Script çalıştıktan sonra temizle (DOM'u kirletmemek için)
                document.body.removeChild(newScript);
            });
        }, 100);

        return () => clearTimeout(timer);
    }, [content]);

    const handlePrint = () => window.print();

    if (isLoading) return <div className="h-screen flex flex-col items-center justify-center bg-slate-50"><Loader2 className="h-12 w-12 animate-spin text-indigo-500" /><p className="mt-4 text-slate-400 font-medium animate-pulse">Döküman Yükleniyor...</p></div>;

    if (error || !content) {
        return (
            <div className="h-screen flex items-center justify-center p-8 bg-slate-50">
                <Card className="max-w-md w-full p-8 text-center rounded-[2rem] border-red-100 shadow-2xl">
                    <div className="p-4 bg-red-50 rounded-2xl w-fit mx-auto mb-6 text-red-500"><AlertTriangle className="h-10 w-10" /></div>
                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">HATA OLUŞTU</h2>
                    <p className="text-slate-500 mb-8 font-medium">{error || "Bu döküman görüntülenemiyor."}</p>
                    <Button asChild className="w-full h-12 bg-slate-900 rounded-xl"><Link href="/extra"><ArrowLeft className="mr-2 h-4 w-4" /> Geri Dön</Link></Button>
                </Card>
            </div>
        );
    }

    return (
        <div className={cn("min-h-screen bg-slate-50 flex flex-col font-sans", isFullscreen ? "bg-white" : "")}>
            
            {/* PRINT CSS */}
            <style media="print">{`
                @page { size: auto; margin: 20mm; }
                .no-print { display: none !important; }
                body { background: white !important; padding: 0 !important; }
                .content-area { padding: 0 !important; box-shadow: none !important; border: none !important; }
            `}</style>

            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200 no-print">
                <div className="container mx-auto px-4 md:px-8 h-20 flex items-center justify-between gap-4">
                    
                    <div className="flex items-center gap-4 min-w-0">
                        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-xl h-10 w-10 text-slate-400 hover:text-indigo-600 shrink-0">
                            <ArrowLeft className="h-6 w-6" />
                        </Button>
                        <div className="min-w-0 overflow-hidden">
                            <h1 className="text-xl font-black text-slate-900 truncate uppercase tracking-tight">{content.title}</h1>
                            <div className="flex items-center gap-2 mt-0.5">
                                <Badge variant="secondary" className="bg-indigo-50 text-indigo-600 border-none text-[10px] font-bold uppercase tracking-tight">{content.category || 'Genel'}</Badge>
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{content.updatedAt ? new Date(content.updatedAt).toLocaleDateString('tr-TR') : 'YENİ'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <div className="hidden sm:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 mr-2">
                            <Button variant="ghost" size="icon" onClick={() => setZoomLevel(prev => Math.max(50, prev - 10))} className="h-8 w-8 rounded-lg text-slate-500 hover:bg-white"><Minus className="h-4 w-4" /></Button>
                            <span className="text-[10px] font-black text-slate-400 w-12 text-center uppercase tracking-tighter">{zoomLevel}%</span>
                            <Button variant="ghost" size="icon" onClick={() => setZoomLevel(prev => Math.min(250, prev + 10))} className="h-8 w-8 rounded-lg text-slate-500 hover:bg-white"><Plus className="h-4 w-4" /></Button>
                        </div>

                        <Button variant="outline" size="icon" onClick={handlePrint} className="rounded-xl h-10 w-10 border-slate-200 text-slate-500 hover:bg-slate-50" title="Yazdır">
                            <Printer className="h-5 w-5" />
                        </Button>
                        
                        <FullscreenToggle elementRef={viewerRef} className="rounded-xl h-10 w-10 border-slate-200 text-slate-500 hover:bg-slate-50" />
                    </div>
                </div>
            </header>

            <main ref={viewerRef} className={cn("flex-grow overflow-y-auto bg-slate-50 transition-colors", isFullscreen ? "bg-white p-8" : "p-4 md:p-12")}>
                <div 
                    className="mx-auto w-full max-w-5xl prose prose-indigo md:prose-lg lg:prose-xl content-area"
                    style={{ fontSize: `${zoomLevel / 100}rem`, transformOrigin: 'top center' }}
                >
                    <div 
                        dangerouslySetInnerHTML={{ __html: content.htmlContent }} 
                        className="animate-in fade-in duration-700"
                    />
                </div>
                
                {/* Alt Boşluk */}
                <div className="h-32 no-print" />
            </main>
        </div>
    );
}

function AlertTriangle(props: any) {
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
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
        </svg>
    )
}
