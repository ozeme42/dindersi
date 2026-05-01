
'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, ArrowLeft, Download, Maximize, Minimize, Share2, BookOpen, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { FullscreenToggle } from '@/components/fullscreen-toggle';
import { getExtraPage } from '@/app/teacher/extra-pages/actions';
import Link from 'next/link';

const MagnificentLightBackground = () => (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-slate-50">
        <div className="absolute top-[-20%] left-[-10%] w-[1000px] h-[1000px] bg-indigo-50/40 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-emerald-50/40 rounded-full blur-[120px]" />
    </div>
);

export default function ExtraPageDetail() {
    const params = useParams();
    const id = params.id as string;
    const router = useRouter();

    const [page, setPage] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const containerRef = useRef<HTMLDivElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        const handleFS = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFS);
        return () => document.removeEventListener('fullscreenchange', handleFS);
    }, []);

    useEffect(() => {
        const fetchContent = async () => {
            if (!id) return;
            setIsLoading(true);
            try {
                const result = await getExtraPage(id);
                if (result.success && result.data) {
                    setPage(result.data);
                } else {
                    setError(result.error || "İçerik bulunamadı.");
                }
            } catch (err) {
                setError("Beklenmedik bir hata oluştu.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchContent();
    }, [id]);

    const handleShare = () => {
        if (navigator.share) {
            navigator.share({
                title: page?.title,
                url: window.location.href,
            }).catch(console.error);
        } else {
            navigator.clipboard.writeText(window.location.href);
            alert("Bağlantı kopyalandı!");
        }
    };

    if (isLoading) return (
        <div className="h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
            <p className="text-slate-500 font-bold">Yükleniyor...</p>
        </div>
    );

    if (error || !page) return (
        <div className="h-screen bg-slate-50 flex flex-col items-center justify-center p-8 text-center">
            <div className="bg-white p-12 rounded-[3rem] border border-red-100 shadow-2xl max-w-md w-full">
                <p className="text-red-500 text-xl font-bold mb-8 uppercase tracking-widest">{error || "Sayfa bulunamadı."}</p>
                <Button asChild size="lg" className="w-full bg-slate-900 hover:bg-slate-800 rounded-2xl h-14">
                    <Link href="/extra"><ArrowLeft className="mr-2 h-5 w-5"/> Galeriye Dön</Link>
                </Button>
            </div>
        </div>
    );

    // HTML İçeriğini Iframe'e basmak için hazırlıyoruz
    // Tailwind desteği için script ekliyoruz
    const safeHtml = `
        <!DOCTYPE html>
        <html lang="tr">
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
                body { padding: 40px; font-family: sans-serif; background: transparent; }
                img { max-width: 100%; height: auto; border-radius: 1rem; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); margin: 2rem 0; }
                .prose { max-width: 100%; color: #334155; line-height: 1.8; }
                h1, h2, h3 { color: #1e293b; font-weight: 800; margin-top: 2.5rem; margin-bottom: 1rem; }
                p { margin-bottom: 1.5rem; text-align: justify; }
            </style>
        </head>
        <body>
            <div class="prose">
                ${page.htmlContent}
            </div>
        </body>
        </html>
    `;

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col relative overflow-hidden font-sans">
            <MagnificentLightBackground />

            {/* Üst Bar */}
            <header className={cn(
                "sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200 transition-all duration-300",
                isFullscreen && "hidden"
            )}>
                <div className="container mx-auto px-6 py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                        <Link href="/extra">
                            <Button variant="ghost" size="icon" className="rounded-xl h-11 w-11 hover:bg-slate-100 text-slate-500">
                                <ArrowLeft className="h-6 w-6" />
                            </Button>
                        </Link>
                        <div className="min-w-0">
                            <h1 className="text-xl md:text-2xl font-black text-slate-800 truncate tracking-tight">{page.title}</h1>
                            <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="bg-indigo-50 text-indigo-600 border-none font-bold text-[10px] uppercase px-2 py-0">
                                    <Tag className="h-3 w-3 mr-1" /> {page.category}
                                </Badge>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <Button variant="outline" size="icon" onClick={handleShare} className="rounded-xl h-11 w-11 border-slate-200 text-slate-500 hover:text-indigo-600">
                            <Share2 className="h-5 w-5" />
                        </Button>
                        <FullscreenToggle elementRef={containerRef} className="rounded-xl h-11 w-11 bg-slate-900 text-white hover:bg-slate-800" />
                    </div>
                </div>
            </header>

            {/* İçerik Alanı */}
            <main className="flex-1 flex flex-col relative z-10 p-0 md:p-6 lg:p-8">
                <div 
                    ref={containerRef} 
                    className={cn(
                        "w-full max-w-5xl mx-auto flex-1 bg-white relative transition-all duration-500",
                        isFullscreen ? "max-w-none" : "rounded-[2.5rem] shadow-2xl border-4 border-white ring-1 ring-slate-200/50"
                    )}
                >
                    {/* Fullscreen Kapatma Butonu (Sadece Fullscreen iken görünür) */}
                    {isFullscreen && (
                        <div className="absolute top-6 right-6 z-50">
                            <FullscreenToggle className="h-14 w-14 rounded-full bg-black/20 hover:bg-black/40 text-white border-white/20 backdrop-blur-md" />
                        </div>
                    )}

                    <iframe 
                        srcDoc={safeHtml} 
                        className="w-full h-full border-0 bg-transparent"
                        title={page.title}
                        sandbox="allow-scripts allow-same-origin"
                    />
                </div>
            </main>

            {/* Alt Bilgi (Sadece Masaüstünde ve Fullscreen değilken) */}
            {!isFullscreen && (
                <div className="container mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-widest gap-4">
                    <span>Din Dersi Atölyesi Özel Döküman Sistemi</span>
                    <div className="flex items-center gap-4">
                        <span>Güncelleme: {page.updatedAt ? new Date(page.updatedAt).toLocaleDateString('tr-TR') : '-'}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
