'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { 
    Loader2, ArrowLeft, BookOpen, Download, Plus, Minus, GripHorizontal, ChevronDown, Settings2, 
    Maximize2, Minimize2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FullscreenToggle } from '@/components/fullscreen-toggle';
import Link from 'next/link';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getCurriculumForSelection } from '@/components/actions/get-curriculum-for-selection';

// --- ARKA PLAN ---
const MagnificentLightBackground = () => (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-slate-50">
        <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-indigo-200/40 rounded-full blur-[120px] animate-pulse-slow mix-blend-multiply" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-sky-200/40 rounded-full blur-[120px] animate-pulse-slow delay-700 mix-blend-multiply" />
        <div className="absolute top-[40%] left-[50%] w-[400px] h-[400px] bg-purple-200/30 rounded-full blur-[100px] animate-pulse-slow delay-1000 mix-blend-multiply" />
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.015] mix-blend-overlay"></div>
    </div>
);

// --- TOOLBAR ---
const DraggableToolbar = ({ onPlus, onMinus, onFullscreen, isFullscreen, label }: any) => {
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [isOpen, setIsOpen] = useState(true);
    const dragStartPos = useRef({ x: 0, y: 0 });

    useEffect(() => {
        if (window.innerWidth < 768) setIsOpen(false);
    }, []);

    const handleDragStart = (e: React.MouseEvent) => {
        setIsDragging(true);
        dragStartPos.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;
            setPosition({ x: e.clientX - dragStartPos.current.x, y: e.clientY - dragStartPos.current.y });
        };
        const handleMouseUp = () => setIsDragging(false);
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    return (
        <div className="fixed z-[100] transition-all duration-100 ease-out" style={{ left: '50%', bottom: '2rem', transform: `translate(calc(-50% + ${position.x}px), ${position.y}px)`, cursor: isDragging ? 'grabbing' : 'default' }}>
            <div className="flex items-center gap-2 p-2 rounded-full bg-white/95 border border-slate-200 shadow-2xl backdrop-blur-xl ring-1 ring-black/5">
                <div onMouseDown={handleDragStart} className="cursor-grab active:cursor-grabbing text-slate-400 p-2 border-r border-slate-100 mr-1">
                    <GripHorizontal className="h-6 w-6" />
                </div>
                {isOpen ? (
                    <div className="flex items-center gap-1 pr-2 animate-in fade-in zoom-in duration-300">
                        <Button variant="ghost" size="icon" onClick={onMinus} className="h-10 w-10 rounded-full"><Minus className="h-5 w-5"/></Button>
                        <span className="text-[10px] font-black text-slate-500 uppercase px-2 min-w-[60px] text-center select-none">{label}</span>
                        <Button variant="ghost" size="icon" onClick={onPlus} className="h-10 w-10 rounded-full"><Plus className="h-5 w-5"/></Button>
                        <div className="w-px h-8 bg-slate-200 mx-1" />
                        <Button variant="ghost" size="icon" onClick={onFullscreen} className="h-10 w-10 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-lg transition-colors flex items-center justify-center">
                            {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="h-9 w-9 text-slate-400 hover:text-slate-700 ml-1"><ChevronDown className="h-5 w-5" /></Button>
                    </div>
                ) : (
                    <Button variant="ghost" size="icon" onClick={() => setIsOpen(true)} className="bg-indigo-600 text-white rounded-full h-11 w-11 shadow-lg hover:bg-indigo-700 animate-in fade-in zoom-in duration-300">
                        <Settings2 className="h-6 w-6" />
                    </Button>
                )}
            </div>
        </div>
    );
};

// --- ANA SAYFA BİLEŞENİ ---
function OzetDisplayPage() {
    const params = useParams();
    const slug = params.slug as string[];
    const [courseId, unitId, topicId] = slug || [];

    const [content, setContent] = useState<{title: string, htmlContent: string, courseName: string} | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [zoomLevel, setZoomLevel] = useState(1.0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!courseId || !unitId) {
                setError("Geçersiz URL.");
                setIsLoading(false);
                return;
            }

            try {
                // Canlı dökümanı çek
                const docRef = topicId 
                    ? doc(db, 'courses', courseId, 'units', unitId, 'topics', topicId)
                    : doc(db, 'courses', courseId, 'units', unitId);
                
                const [docSnap, courseSnap] = await Promise.all([
                    getDoc(docRef),
                    getDoc(doc(db, 'courses', courseId))
                ]);

                if (!docSnap.exists()) {
                    setError("İçerik bulunamadı.");
                    setIsLoading(false);
                    return;
                }

                const data = docSnap.data();
                const courseData = courseSnap.data();

                if (!data.htmlContent) {
                    setError("Bu konu için interaktif özet içeriği henüz eklenmemiş.");
                    setIsLoading(false);
                    return;
                }

                setContent({ 
                    title: data.title, 
                    htmlContent: data.htmlContent, 
                    courseName: courseData?.title || 'Ders' 
                });

            } catch (e: any) {
                console.error(e);
                setError("Veri çekilirken bir hata oluştu.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();

        const handleFs = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFs);
        return () => document.removeEventListener('fullscreenchange', handleFs);
    }, [courseId, unitId, topicId]);

    const backUrl = `/`;

    if (isLoading) return <div className="h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-indigo-500" /></div>;

    if (error || !content) {
        return (
           <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 text-center">
               <div className="bg-white p-8 rounded-3xl border border-red-500/20 max-w-md w-full shadow-xl">
                   <p className="text-red-600 mb-6 font-medium text-lg">{error || "İçerik bulunamadı."}</p>
                   <Button asChild className="bg-slate-900 text-white hover:bg-slate-800 w-full">
                       <Link href={backUrl}><ArrowLeft className="mr-2 h-4 w-4"/> Geri Dön</Link>
                   </Button>
               </div>
           </div>
       );
   }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col relative overflow-x-hidden">
            <MagnificentLightBackground />
            
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200">
                <div className="container mx-auto px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-5 w-full md:w-auto">
                        <Link href="/">
                            <button className="group relative flex items-center justify-center h-12 px-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all duration-300 overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <div className="relative flex items-center gap-2">
                                    <ArrowLeft className="h-5 w-5 text-slate-600 group-hover:text-white group-hover:-translate-x-1 transition-all duration-300" />
                                    <span className="font-black text-xs uppercase tracking-widest text-slate-600 group-hover:text-white transition-colors duration-300">GERİ</span>
                                </div>
                            </button>
                        </Link>
                        <div className="hidden md:block h-8 w-[1px] bg-slate-200 mx-2" />
                        <div className="flex flex-col">
                            <h1 className="text-2xl font-black text-slate-800 tracking-tighter line-clamp-1">{content?.title}</h1>
                            <p className="text-[10px] text-indigo-500 font-black uppercase tracking-widest">{content?.courseName} / Canlı Özet</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                         <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
                            <Button variant="ghost" size="icon" onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.1))} className="h-8 w-8 text-slate-600 hover:bg-white rounded-md"><Minus className="h-4 w-4"/></Button>
                            <span className="text-[10px] font-bold text-slate-500 w-12 text-center uppercase">Zoom</span>
                            <Button variant="ghost" size="icon" onClick={() => setZoomLevel(z => Math.min(2.5, z + 0.1))} className="h-8 w-8 text-slate-600 hover:bg-white rounded-md"><Plus className="h-4 w-4"/></Button>
                        </div>
                        <FullscreenToggle elementRef={containerRef} className="bg-slate-100 border-slate-200 text-slate-600 h-10 w-10 rounded-xl" />
                    </div>
                </div>
            </header>

            <main className="flex-1 relative z-10">
                <div ref={containerRef} className={cn("w-full relative flex flex-col bg-white", isFullscreen ? "fixed inset-0 z-[100] h-screen" : "h-[calc(100vh-88px)] border-t border-slate-200")}>
                    <iframe 
                        srcDoc={content?.htmlContent + `<style>body { zoom: ${zoomLevel}; transform-origin: top center; padding: 20px; font-family: sans-serif; }</style>`} 
                        className="w-full h-full border-0 bg-white" 
                        sandbox="allow-scripts allow-same-origin"
                    />
                </div>
            </main>
        </div>
    );
}

export default function Page() {
    return (
        <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" /></div>}>
            <OzetDisplayPage />
        </Suspense>
    );
}
