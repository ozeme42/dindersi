"use client";

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { 
    Loader2, ArrowLeft, BookOpen, Columns, Gamepad2, 
    Plus, Minus, GripHorizontal, ChevronDown, Settings2, 
    Maximize2, Minimize2, 
    Search, Crosshair, Shuffle, Lightbulb, 
    Puzzle, Skull, Target, Link2, Pencil, 
    Package, Wind, Coins, BrainCircuit, Milestone, Book, MousePointerClick, Grid3x3,
    Sparkles, Trophy, Star, Zap, Play, Users, Swords, Crown, Download, Maximize, Minimize
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from 'next/link';
import type { YazilacaklarContent, ActivityItem, Topic } from '@/lib/types';
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

// --- ARKA PLAN ---
const MagnificentLightBackground = () => (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-slate-50">
        <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-indigo-200/40 rounded-full blur-[120px] animate-pulse-slow mix-blend-multiply" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-sky-200/40 rounded-full blur-[120px] animate-pulse-slow delay-700 mix-blend-multiply" />
        <div className="absolute top-[40%] left-[50%] w-[400px] h-[400px] bg-purple-200/30 rounded-full blur-[100px] animate-pulse-slow delay-1000 mix-blend-multiply" />
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.015] mix-blend-overlay"></div>
    </div>
);

// --- ORTAK ARAÇ ÇUBUĞU (TOOLBAR) ---
const DraggableToolbar = ({ onPlus, onMinus, onDownload, onFullscreen, isFullscreen, isDownloading, label }: any) => {
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
                        {onDownload && (
                            <>
                                <div className="w-px h-8 bg-slate-200 mx-1" />
                                <Button variant="ghost" size="icon" onClick={onDownload} disabled={isDownloading} className="h-10 w-10 rounded-full text-slate-600 hover:bg-slate-100">
                                    {isDownloading ? <Loader2 className="h-5 w-5 animate-spin"/> : <Download className="h-5 w-5" />}
                                </Button>
                            </>
                        )}
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

// =================================================================================================
// 1. BİLEŞEN: ÖZET
// =================================================================================================
const SummaryTab = ({ courseId, unitId, topicId, title }: { courseId: string, unitId: string, topicId: string, title: string }) => {
    const [htmlContent, setHtmlContent] = useState<string | null>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        const fetchHtml = async () => {
            try {
                const topicRef = doc(db, 'courses', courseId, 'units', unitId, 'topics', topicId);
                const topicSnap = await getDoc(topicRef);
                if (topicSnap.exists()) {
                    setHtmlContent(topicSnap.data().htmlContent || '<p class="text-center p-8">Özet içeriği henüz eklenmemiş.</p>');
                }
            } catch (e) {
                console.error(e);
            }
        };
        fetchHtml();

        const handleFullscreenChange = () => setIsFullscreen(document.fullscreenElement === containerRef.current);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, [courseId, unitId, topicId]);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) containerRef.current?.requestFullscreen();
        else document.exitFullscreen();
    };

    const getFinalHtml = () => htmlContent ? `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
                body { padding: 20px; font-family: sans-serif; background-color: white; }
                img { max-width: 100%; height: auto; border-radius: 0.5rem; margin: 1rem 0; }
            </style>
        </head>
        <body>
            ${htmlContent}
        </body>
        </html>
    ` : '';
    
    useEffect(() => {
        if (iframeRef.current && htmlContent) iframeRef.current.srcdoc = getFinalHtml();
    }, [htmlContent]);

    if (htmlContent === null) return <div className="flex justify-center p-12"><Loader2 className="h-10 w-10 animate-spin text-violet-500"/></div>;

    return (
        <div ref={containerRef} className={cn("w-full relative flex flex-col bg-white transition-all duration-300", isFullscreen ? "fixed inset-0 z-[100] h-screen w-screen" : "h-[calc(100vh-90px)] border-t border-slate-200")}>
            <div className="absolute top-4 right-4 z-20">
                <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="bg-slate-100/80 hover:bg-white text-slate-600 rounded-full h-10 w-10 shadow-lg backdrop-blur-sm border border-slate-200 transition-transform hover:scale-110">
                    {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
                </Button>
            </div>
            <iframe ref={iframeRef} className="w-full h-full border-0 block bg-white" title={title} sandbox="allow-scripts allow-same-origin allow-popups allow-forms" />
        </div>
    );
};

// =================================================================================================
// 2. BİLEŞEN: NOTLAR
// =================================================================================================
const NotesTab = ({ courseId, unitId, topicId, topicTitle }: { courseId: string, unitId: string, topicId: string, topicTitle: string }) => {
    const [content, setContent] = useState<YazilacaklarContent | null>(null);
    const [fontSize, setFontSize] = useState(1.0); 
    const [isDownloading, setIsDownloading] = useState(false);
    const mainContentRef = useRef<HTMLDivElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        if (window.innerWidth >= 768) {
            setFontSize(1.8);
        }
    }, []);

    const colorClasses = [
        'from-indigo-500/10 to-blue-500/10 border-indigo-200 text-indigo-900', 
        'from-emerald-500/10 to-teal-500/10 border-emerald-200 text-emerald-900', 
        'from-rose-500/10 to-pink-500/10 border-rose-200 text-rose-900', 
        'from-amber-500/10 to-orange-500/10 border-amber-200 text-amber-900', 
        'from-cyan-500/10 to-sky-500/10 border-cyan-200 text-cyan-900'
    ];

    const noteColors = [
        { bg: "bg-indigo-50/80 border-indigo-200 hover:border-indigo-300 hover:bg-indigo-100", badge: "from-indigo-500 to-blue-600", text: "text-indigo-900" },
        { bg: "bg-emerald-50/80 border-emerald-200 hover:border-emerald-300 hover:bg-emerald-100", badge: "from-emerald-500 to-teal-600", text: "text-emerald-900" },
        { bg: "bg-rose-50/80 border-rose-200 hover:border-rose-300 hover:bg-rose-100", badge: "from-rose-500 to-pink-600", text: "text-rose-900" },
        { bg: "bg-amber-50/80 border-amber-200 hover:border-amber-300 hover:bg-amber-100", badge: "from-amber-500 to-orange-600", text: "text-amber-900" },
        { bg: "bg-sky-50/80 border-sky-200 hover:border-sky-300 hover:bg-sky-100", badge: "from-sky-500 to-cyan-600", text: "text-sky-900" },
        { bg: "bg-purple-50/80 border-purple-200 hover:border-purple-300 hover:bg-purple-100", badge: "from-purple-500 to-violet-600", text: "text-purple-900" },
    ];

    useEffect(() => {
        const fetchData = async () => {
            try {
                const topicRef = doc(db, 'courses', courseId, 'units', unitId, 'topics', topicId);
                const topicSnap = await getDoc(topicRef);
                
                if (topicSnap.exists()) {
                    const topicData = topicSnap.data();
                    
                    // Tanımları ayrı koleksiyondan çek
                    const q = query(collection(db, "activityItems"), where("topicId", "==", topicId), where("type", "==", "definition"));
                    const querySnapshot = await getDocs(q);
                    const definitions = querySnapshot.docs.map(doc => {
                        const item = doc.data();
                        return {
                            concept: item.content.term || '',
                            definition: item.content.definition || ''
                        };
                    }).filter(item => item.concept && item.definition);

                    setContent({
                        conceptDefinitions: definitions,
                        notes: topicData.writingContent?.notes || []
                    });
                }
            } catch (e) {
                console.error(e);
            }
        };
        fetchData();

        const handleFullscreenChange = () => setIsFullscreen(document.fullscreenElement === mainContentRef.current);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, [courseId, unitId, topicId]);

    const handleDownloadPDF = async () => {
        if (!content) return;
        setIsDownloading(true);
        try {
            const html2pdf = (await import('html2pdf.js')).default;
            const element = document.createElement('div');
            element.style.padding = '40px';
            element.style.fontFamily = 'Arial, sans-serif';
            element.style.backgroundColor = 'white';
            let html = `
                <div style="text-align:center; border-bottom:3px solid #6366f1; padding-bottom:15px; margin-bottom:25px;">
                    <h1 style="color:#1e1b4b; margin:0; font-size: 28px;">${topicTitle}</h1>
                    <p style="color:#6366f1; font-weight:bold; margin:5px 0 0 0; font-size:14px;">Din Dersi Atölyesi | dindersiatolyesi.com</p>
                </div>
            `;
            if (content.conceptDefinitions.length > 0) {
                html += `
                    <div style="margin-top:20px;">
                        <h2 style="color:#4f46e5; border-left:5px solid #4f46e5; padding-left:10px; font-size:20px;">KAVRAMLAR</h2>
                        <div style="margin-top:15px;">
                `;
                content.conceptDefinitions.forEach((item, i) => {
                    html += `
                        <div style="margin-bottom:15px; padding:10px; background-color:#f8fafc; border-radius:8px; border:1px solid #e2e8f0;">
                            <p style="margin:0;"><strong>${i+1}. ${item.concept.toUpperCase()}:</strong> ${item.definition}</p>
                        </div>
                    `;
                });
                html += `</div></div>`;
            }
            if (content.notes.length > 0) {
                html += `
                    <div style="margin-top:30px;">
                        <h2 style="color:#f59e0b; border-left:5px solid #f59e0b; padding-left:10px; font-size:20px;">ÖNEMLİ NOTLAR</h2>
                        <ul style="margin-top:15px; line-height:1.6; color:#334155;">
                `;
                content.notes.forEach(note => { html += `<li style="margin-bottom:12px; text-align:justify;">${note}</li>`; });
                html += `</ul></div>`;
            }
            html += `<div style="margin-top:40px; border-top:1px solid #eee; padding-top:10px; text-align:center; font-size:10px; color:#94a3b8;">Bu belge dindersiatolyesi.com üzerinden oluşturulmuştur. Tüm hakları saklıdır.</div>`;
            element.innerHTML = html;
            const opt = { margin: 10, filename: `${topicTitle.replace(/\s+/g, '_')}_Ders_Notlari.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };
            await html2pdf().set(opt).from(element).save();
        } catch (err) { alert("PDF hatası oluştu."); } finally { setIsDownloading(false); }
    };

    if (!content) return <div className="flex justify-center p-12"><Loader2 className="h-10 w-10 animate-spin text-indigo-500"/></div>;

    return (
        <div ref={mainContentRef} className={cn("w-full relative min-h-screen", isFullscreen ? "bg-slate-50 fixed inset-0 z-50 p-4 overflow-y-auto" : "bg-slate-50")}>
            {isFullscreen && <MagnificentLightBackground />}
            <div className="container mx-auto px-4 py-6 pb-20 relative z-10 max-w-[1600px] space-y-6">
                
                <div className="space-y-4">
                    <h3 className="text-center font-black text-2xl text-indigo-600 uppercase tracking-widest">Kavramlar</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-3">
                        {content.conceptDefinitions.map((item, index) => (
                            <div key={index} className={cn("relative overflow-hidden rounded-xl md:rounded-2xl border shadow-md p-3 md:p-4 bg-gradient-to-br flex flex-col hover:scale-102 transition-all duration-300 group", colorClasses[index % colorClasses.length])}>
                                <div className="absolute -top-2 -right-2 text-6xl font-black opacity-10 select-none">{index + 1}</div>
                                <h4 
                                    className="font-black mb-2 border-b border-black/5 pb-1 uppercase relative z-10 tracking-tighter" 
                                    style={{ fontSize: `${fontSize * 1.1}rem`, lineHeight: '1.2' }}
                                >
                                    {item.concept}
                                </h4>
                                <p className="font-medium text-justify relative z-10 leading-snug" style={{ fontSize: `${fontSize}rem` }}>{item.definition}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-center font-black text-2xl text-amber-500 uppercase tracking-widest">Önemli Notlar</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                        {content.notes.map((note, index) => {
                            const style = noteColors[index % noteColors.length];
                            return (
                                <div key={index} className={cn("flex gap-3 p-3 rounded-xl md:rounded-xl border transition-all duration-200 hover:bg-opacity-100 hover:shadow-md items-start group", style.bg)}>
                                    <div className={cn("flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-gradient-to-br text-white font-bold text-lg shadow-sm", style.badge)}>
                                        {index + 1}
                                    </div>
                                    <p className={cn("font-medium text-justify pt-0.5 leading-snug", style.text)} style={{ fontSize: `${fontSize}rem` }}>
                                        {note}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
            <DraggableToolbar label="Boyut" onPlus={() => setFontSize(s => Math.min(4, s + 0.1))} onMinus={() => setFontSize(s => Math.max(0.5, s - 0.1))} onDownload={handleDownloadPDF} onFullscreen={() => isFullscreen ? document.exitFullscreen() : mainContentRef.current?.requestFullscreen()} isFullscreen={isFullscreen} isDownloading={isDownloading} />
        </div>
    );
};

// =================================================================================================
// 3. BİLEŞEN: ETKİNLİKLER
// =================================================================================================
const GamesTab = ({ courseName, unitName, topicName, courseId, unitId, topicId }: any) => {
    const vibrantGradientMap: Record<string, string> = {
        purple: "from-violet-600 via-purple-600 to-fuchsia-600 shadow-violet-500/40",
        amber: "from-amber-500 via-orange-500 to-red-500 shadow-amber-500/40",
        pink: "from-pink-500 via-rose-500 to-red-500 shadow-pink-500/40",
        teal: "from-teal-500 via-emerald-500 to-green-500 shadow-teal-500/40",
        indigo: "from-indigo-600 via-blue-600 to-cyan-600 shadow-indigo-500/40",
        cyan: "from-cyan-500 via-sky-500 to-blue-500 shadow-cyan-500/40",
        blue: "from-blue-600 via-indigo-600 to-violet-600 shadow-blue-500/40",
        orange: "from-orange-500 via-red-500 to-rose-500 shadow-orange-500/40",
        sky: "from-sky-500 via-blue-500 to-indigo-500 shadow-sky-500/40",
        rose: "from-rose-500 via-pink-500 to-purple-500 shadow-rose-500/40",
        emerald: "from-emerald-500 via-green-500 to-lime-500 shadow-emerald-500/40",
        red: "from-red-600 via-orange-600 to-amber-600 shadow-red-500/40",
        yellow: "from-yellow-400 via-amber-400 to-orange-400 shadow-yellow-500/40",
        zinc: "from-slate-700 via-slate-800 to-slate-900 shadow-slate-500/40",
    };

    const activityTypes = [
        { href: '/oyunlar/yazi-tura', label: 'Gol Kralı', icon: Trophy, color: 'amber' },
        { href: '/oyunlar/carkifelek', label: 'Çarkıfelek', icon: Zap, color: 'purple', badge: 'YENİ' }, 
        { href: '/oyunlar/kavram-yarismasi', label: 'Kavram Yarışması', icon: BrainCircuit, color: 'pink' },
        { href: '/oyunlar/kelime-avi', label: 'Kelime Avı', icon: Search, color: 'teal' },
        { href: '/oyunlar/kutu-ac', label: 'Kutu Aç', icon: Package, color: 'indigo' },
        { href: '/oyunlar/kavram-avi', label: 'Kavram Avı', icon: Crosshair, color: 'cyan' },
        { href: '/oyunlar/eslestirme', label: 'Eşleştirme', icon: Puzzle, color: 'blue' },
        { href: '/oyunlar/cumle-olusturma', label: 'Cümle Ustası', icon: Shuffle, color: 'orange' },
        { href: '/oyunlar/adam-asmaca', label: 'Adam Asmaca', icon: Skull, color: 'rose' },
        { href: '/oyunlar/hedefi-vur', label: 'Hedefi Vur', icon: MousePointerClick, color: 'red' },
        { href: '/oyunlar/bil-bakalim', label: 'Bil Bakalım', icon: Lightbulb, color: 'yellow' },
        { href: '/oyunlar/dogru-yanlis-zinciri', label: 'D/Y Zinciri', icon: Link2, color: 'zinc' },
        { href: '/oyunlar/acik-uclu-cevapla', label: 'Açık Uçlu', icon: Pencil, color: 'purple' },
        { href: '/oyunlar/ilim-hazinesi', label: 'İlim Hazinesi', icon: Book, color: 'emerald' },
        { href: '/oyunlar/labirent', label: 'Labirent', icon: Milestone, color: 'sky' },
        { href: '/oyunlar/tornado', label: 'Tornado', icon: Wind, color: 'teal' },
        { href: '/oyunlar/balon-avcisi', label: 'Balon Avcısı', icon: Target, color: 'rose' },
        { href: '/oyunlar/anagram-duvari', label: 'Anagram Duvarı', icon: Grid3x3, color: 'amber', badge: 'YENİ' },
    ];

    const teamGameSlugs = ['kavram-yarismasi', 'kutu-ac', 'tornado', 'carkifelek', 'anagram-duvari'];
    const teamGames = activityTypes.filter(a => teamGameSlugs.includes(a.href.split('/').pop() || ''));
    const soloGames = activityTypes.filter(a => !teamGameSlugs.includes(a.href.split('/').pop() || ''));

    const GameCard = ({ activity, isTeam = false }: { activity: any, isTeam?: boolean }) => {
        const Icon = activity.icon;
        const gameUrl = `${activity.href}/oyun?${new URLSearchParams({ courseId, courseName, unitId, unitName, topicId, topicName, isStatic: 'false' })}`;
        
        return (
            <Link href={gameUrl} className={cn("group relative perspective-1000", isTeam ? "col-span-1 md:col-span-2 lg:col-span-1 h-64" : "h-56")}>
                <div className={cn(
                    "relative w-full h-full overflow-hidden rounded-[2rem] shadow-xl transition-all duration-500 transform-gpu group-hover:scale-[1.03] group-hover:-translate-y-2 group-hover:shadow-2xl flex flex-col items-center justify-center bg-gradient-to-br border-2 border-white/20",
                    vibrantGradientMap[activity.color],
                    isTeam && "border-amber-300/50 shadow-amber-500/20"
                )}>
                    <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay" />
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white/20 to-transparent opacity-50" />
                    <Icon className={cn("absolute -right-8 -bottom-8 text-white opacity-10 rotate-12 group-hover:rotate-45 transition-transform duration-700", isTeam ? "w-56 h-56" : "w-40 h-40")} />
                    {isTeam && (
                        <div className="absolute top-4 right-4 bg-black/20 backdrop-blur-md px-3 py-1 rounded-full text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-1 border border-white/10">
                            <Users className="w-3 h-3" /> TAKIM MODU
                        </div>
                    )}
                    <div className="relative z-10 mb-4 transform transition-transform duration-500 group-hover:scale-110">
                        <div className={cn("rounded-2xl bg-white/20 backdrop-blur-sm border border-white/40 shadow-lg flex items-center justify-center animate-float", isTeam ? "w-24 h-24" : "w-20 h-20")}>
                            <Icon className={cn("text-white drop-shadow-md", isTeam ? "w-12 h-12" : "h-10 w-10")} />
                        </div>
                    </div>
                    <div className="relative z-10 text-center w-full px-4">
                        <h3 className={cn("font-black text-white uppercase tracking-tight drop-shadow-md mb-2 leading-none", isTeam ? "text-2xl" : "text-lg")}>
                            {activity.label}
                        </h3>
                        <div className="opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 flex justify-center">
                            <div className="bg-white text-slate-900 rounded-full px-4 py-1.5 text-xs font-black flex items-center gap-1 shadow-lg hover:bg-slate-100">
                                {isTeam ? "MÜCADELEYE BAŞLA" : "OYNA"} <Play className="w-3 h-3 fill-current" />
                            </div>
                        </div>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/30 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none transform -translate-x-full group-hover:translate-x-full" style={{ transitionDuration: '1s' }} />
                    {activity.badge && (
                        <div className="absolute top-0 right-0">
                            <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-[9px] font-black px-2 py-1 rounded-bl-xl shadow-lg">
                                {activity.badge}
                            </div>
                        </div>
                    )}
                </div>
            </Link>
        );
    };

    return (
        <div className="max-w-[1800px] mx-auto p-6 space-y-12 pb-32 relative z-10">
            <div className="flex flex-col items-center justify-center space-y-4 py-8 relative">
                <div className="absolute inset-0 bg-indigo-500/5 blur-[100px] rounded-full" />
                <div className="relative inline-block">
                    <h2 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 tracking-tighter animate-pulse-slow">
                        OYUN DÜNYASI
                    </h2>
                    <Star className="absolute -top-6 -right-8 w-12 h-12 text-amber-400 animate-spin-slow" fill="currentColor" />
                    <Zap className="absolute -bottom-2 -left-8 w-10 h-10 text-cyan-400 animate-bounce" fill="currentColor" />
                </div>
            </div>
            <div className="space-y-6">
                <div className="flex items-center gap-3 border-b-2 border-slate-200 pb-2">
                    <Crown className="w-8 h-8 text-indigo-500" />
                    <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">BİREYSEL ALIŞTIRMALAR</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
                    {soloGames.sort((a,b) => a.label.localeCompare(b.label, 'tr')).map((activity) => (
                        <GameCard key={activity.label} activity={activity} />
                    ))}
                </div>
            </div>
            <div className="space-y-6">
                <div className="flex items-center gap-3 border-b-2 border-slate-200 pb-2">
                    <Swords className="w-8 h-8 text-rose-500" />
                    <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">SINIF İÇİ MÜCADELE</h3>
                    <span className="text-xs font-bold text-rose-500 bg-rose-100 px-2 py-1 rounded-md">VS MODE</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {teamGames.map((activity) => (
                        <GameCard key={activity.label} activity={activity} isTeam={true} />
                    ))}
                </div>
            </div>
        </div>
    );
};

// =================================================================================================
// ANA SAYFA
// =================================================================================================
export default function TopicPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const slug = params.slug as string[];
    const [courseId, unitId, topicId] = slug.slice(0, 3);
    const [activeTab, setActiveTab] = useState("ozet");
    const courseName = searchParams.get('courseName') || 'Ders';
    const unitName = searchParams.get('unitName') || 'Ünite';
    const topicName = searchParams.get('topicName') || 'Konu';

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 relative flex flex-col selection:bg-indigo-500 selection:text-white overflow-x-hidden">
            <MagnificentLightBackground />
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-white/60 shadow-sm">
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
                            <h1 className="text-2xl font-black text-slate-800 tracking-tighter line-clamp-1">{topicName}</h1>
                            <p className="text-[10px] text-indigo-500 font-black uppercase tracking-widest">{courseName} / {unitName}</p>
                        </div>
                    </div>
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto overflow-x-auto no-scrollbar">
                        <TabsList className="bg-slate-100/80 p-1.5 rounded-full border border-slate-200 h-auto grid grid-cols-3 md:flex gap-2 shadow-inner w-full md:w-auto">
                            <TabsTrigger 
                                value="ozet" 
                                className="rounded-full px-2 md:px-6 py-2 md:py-3 font-black text-[10px] md:text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-1 md:gap-2 relative overflow-hidden data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-violet-500/30 data-[state=active]:bg-gradient-to-r from-violet-600 to-purple-600 hover:bg-white/50"
                            >
                                <BookOpen className="h-3 w-3 md:h-4 md:w-4 relative z-10"/> 
                                <span className="relative z-10">Özet</span>
                            </TabsTrigger>
                            <TabsTrigger 
                                value="notlar" 
                                className="rounded-full px-2 md:px-6 py-2 md:py-3 font-black text-[10px] md:text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-1 md:gap-2 relative overflow-hidden data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/30 data-[state=active]:bg-gradient-to-r from-blue-600 to-cyan-600 hover:bg-white/50"
                            >
                                <Columns className="h-3 w-3 md:h-4 md:w-4 relative z-10"/> 
                                <span className="relative z-10">Notlar</span>
                            </TabsTrigger>
                            <TabsTrigger 
                                value="etkinlikler" 
                                className="rounded-full px-2 md:px-6 py-2 md:py-3 font-black text-[10px] md:text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-1 md:gap-2 relative overflow-hidden data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-500/30 data-[state=active]:bg-gradient-to-r from-emerald-500 to-green-500 hover:bg-white/50"
                            >
                                <Gamepad2 className="h-3 w-3 md:h-4 md:w-4 relative z-10"/> 
                                <span className="relative z-10">Oyun</span>
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
            </header>
            <main className="flex-1 w-full relative z-10">
                <Tabs value={activeTab} className="w-full h-full">
                    <TabsContent value="ozet" className="m-0 focus:outline-none"><SummaryTab courseId={courseId} unitId={unitId} topicId={topicId} title={topicName} /></TabsContent>
                    <TabsContent value="notlar" className="m-0 focus:outline-none"><NotesTab courseId={courseId} unitId={unitId} topicId={topicId} topicTitle={topicName} /></TabsContent>
                    <TabsContent value="etkinlikler" className="m-0 focus:outline-none"><GamesTab courseName={courseName} unitName={unitName} topicName={topicName} courseId={courseId} unitId={unitId} topicId={topicId} /></TabsContent>
                </Tabs>
            </main>
        </div>
    );
}
