'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { 
    Loader2, ArrowLeft, BookOpen, Gamepad2, 
    Download, Plus, Minus, GripHorizontal, ChevronDown, Settings2, 
    RefreshCcw, ZoomIn, ZoomOut, Maximize2, Minimize2, 
    Search, Crosshair, Shuffle, Lightbulb, 
    Puzzle, Skull, Target, Link2, Pencil, 
    Package, Wind, Coins, BrainCircuit, Milestone, Book, MousePointerClick,
    Sparkles, Trophy, Star, Zap, Play, Users, Swords, Crown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from 'next/link';

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

// --- OYUN KARTI ---
const GameCard = ({ activity, courseId, unitId, isTeam = false }: any) => {
    const Icon = activity.icon;
    
    // Canlı, neon ve doygun renkler (Konu sayfasındakiyle aynı)
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

    const gameUrl = `${activity.href}/oyun?${new URLSearchParams({ courseId, unitId, topicId: 'all', isStatic: 'true' })}`;
    
    return (
        <Link href={gameUrl} className={cn("group relative perspective-1000", isTeam ? "col-span-1 md:col-span-2 lg:col-span-1 h-64" : "h-56")}>
            <div className={cn(
                "relative w-full h-full overflow-hidden rounded-[2rem] shadow-xl transition-all duration-500 transform-gpu group-hover:scale-[1.03] group-hover:-translate-y-2 group-hover:shadow-2xl flex flex-col items-center justify-center bg-gradient-to-br border-2 border-white/20",
                vibrantGradientMap[activity.color],
                isTeam && "border-amber-300/50 shadow-amber-500/20"
            )}>
                 {/* Arka Plan Efektleri */}
                 <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay" />
                 <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white/20 to-transparent opacity-50" />
                
                <Icon className={cn("absolute -right-8 -bottom-8 text-white opacity-10 rotate-12 group-hover:rotate-45 transition-transform duration-700", isTeam ? "w-56 h-56" : "w-40 h-40")} />
                
                {isTeam && (
                    <div className="absolute top-4 right-4 bg-black/20 backdrop-blur-md px-3 py-1 rounded-full text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-1 border border-white/10">
                        <Users className="w-3 h-3" /> TAKIM MODU
                    </div>
                )}

                 {/* Merkez İkon (Yüzen Animasyon) */}
                <div className="relative z-10 mb-4 transform transition-transform duration-500 group-hover:scale-110">
                    <div className={cn("rounded-2xl bg-white/20 backdrop-blur-sm border border-white/40 shadow-lg flex items-center justify-center animate-float", isTeam ? "w-24 h-24" : "w-20 h-20")}>
                        <Icon className={cn("text-white drop-shadow-md", isTeam ? "w-12 h-12" : "w-10 h-10")} />
                    </div>
                </div>

                <div className="relative z-10 text-center w-full px-4">
                    <h3 className={cn("font-black text-white uppercase tracking-tight drop-shadow-md mb-2 leading-none", isTeam ? "text-2xl" : "text-lg")}>{activity.label}</h3>
                    <div className="opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 flex justify-center">
                        <div className="bg-white text-slate-900 rounded-full px-4 py-1.5 text-xs font-black flex items-center gap-1 shadow-lg hover:bg-slate-100">
                            {isTeam ? "MÜCADELEYE BAŞLA" : "OYNA"} <Play className="w-3 h-3 fill-current" />
                        </div>
                    </div>
                </div>

                {/* Parlama Efekti */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/30 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none transform -translate-x-full group-hover:translate-x-full" style={{ transitionDuration: '1s' }} />
                
                 {/* Rozet (Varsa) */}
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

// --- ANA SAYFA BİLEŞENİ ---
function OzetDisplayPage() {
    const params = useParams();
    const slug = params.slug as string[];
    const [courseId, unitId] = slug;

    const [activeTab, setActiveTab] = useState("ozet");
    const [content, setContent] = useState<{title: string, htmlContent: string, courseName: string} | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [zoomLevel, setZoomLevel] = useState(1.0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchUnit = async () => {
            try {
                const res = await fetch(`/curriculum/ozetler/${unitId}.html`);
                const html = await res.text();
                const manifestRes = await fetch('/curriculum/manifest.json');
                const manifest = await manifestRes.json();
                
                let title = '', courseName = '';
                for (const group of manifest.classGroups) {
                    for (const course of group.courses) {
                        const unit = course.units.find((u: any) => u.id === unitId);
                        if (unit) { title = unit.title; courseName = course.title; break; }
                    }
                }
                setContent({ title, htmlContent: html, courseName });
            } catch (e) { console.error(e); } finally { setIsLoading(false); }
        };
        fetchUnit();

        const handleFs = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFs);
        return () => document.removeEventListener('fullscreenchange', handleFs);
    }, [unitId]);

    const activityTypes = [
        { href: '/oyunlar/yazi-tura', label: 'Gol Kralı', icon: Trophy, color: 'amber' },
        { href: '/oyunlar/carkifelek', label: 'Çarkıfelek', icon: Zap, color: 'purple', badge: 'YENİ' }, // EKLENDİ
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
    ];

    // Çarkıfelek'i takım oyunlarına ekledim
    const teamGameSlugs = ['kavram-yarismasi', 'kutu-ac', 'tornado', 'carkifelek'];
    const teamGames = activityTypes.filter(a => teamGameSlugs.includes(a.href.split('/').pop() || ''));
    const soloGames = activityTypes.filter(a => !teamGameSlugs.includes(a.href.split('/').pop() || ''));

    if (isLoading) return <div className="h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-indigo-500" /></div>;

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
                            <p className="text-[10px] text-indigo-500 font-black uppercase tracking-widest">{content?.courseName} / Ünite Özeti</p>
                        </div>
                    </div>

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto overflow-x-auto no-scrollbar">
                        <TabsList className="bg-slate-100/80 p-1.5 rounded-full border border-slate-200 h-auto grid grid-cols-2 md:flex gap-2 shadow-inner w-full md:w-auto">
                            
                            {/* ÖZET SEKME */}
                            <TabsTrigger 
                                value="ozet" 
                                className="rounded-full px-6 py-2.5 font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 relative overflow-hidden data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-violet-500/30 data-[state=active]:bg-gradient-to-r from-violet-600 to-purple-600 hover:bg-white/50"
                            >
                                <BookOpen className="h-4 w-4 relative z-10"/> 
                                <span className="relative z-10">Özet</span>
                            </TabsTrigger>

                            {/* OYUN SEKME */}
                            <TabsTrigger 
                                value="oyunlar" 
                                className="rounded-full px-6 py-2.5 font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 relative overflow-hidden data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-500/30 data-[state=active]:bg-gradient-to-r from-emerald-500 to-green-500 hover:bg-white/50"
                            >
                                <Gamepad2 className="h-4 w-4 relative z-10"/> 
                                <span className="relative z-10">Oyunlar</span>
                            </TabsTrigger>
                        
                        </TabsList>
                    </Tabs>
                </div>
            </header>

            <main className="flex-1 relative z-10">
                <Tabs value={activeTab}>
                    <TabsContent value="ozet" className="m-0">
                        <div ref={containerRef} className={cn("w-full relative flex flex-col bg-white", isFullscreen ? "fixed inset-0 z-[100] h-screen" : "h-[calc(100vh-88px)] border-t border-slate-200")}>
                            <iframe 
                                srcDoc={content?.htmlContent + `<style>body { zoom: ${zoomLevel}; transform-origin: top center; padding: 20px; font-family: sans-serif; }</style>`} 
                                className="w-full h-full border-0 bg-white" 
                                sandbox="allow-scripts allow-same-origin"
                            />
                        </div>
                    </TabsContent>

                    <TabsContent value="oyunlar" className="m-0 focus:outline-none">
                        <div className="max-w-[1800px] mx-auto p-8 space-y-12 pb-32">
                            <div className="flex flex-col items-center justify-center space-y-4 py-8 relative">
                                <div className="absolute inset-0 bg-indigo-500/5 blur-[100px] rounded-full" />
                                <div className="relative inline-block">
                                    <h2 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 tracking-tighter animate-pulse-slow">OYUN DÜNYASI</h2>
                                    <Star className="absolute -top-6 -right-8 w-12 h-12 text-amber-400 animate-spin-slow" fill="currentColor" />
                                </div>
                                <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">Bu ünitedeki tüm konuları kapsayan karma alıştırmalar</p>
                            </div>

                            <div className="space-y-6">
                                <div className="flex items-center gap-3 border-b-2 border-slate-200 pb-2"><Crown className="w-8 h-8 text-indigo-500" /><h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">BİREYSEL ALIŞTIRMALAR</h3></div>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
                                    {soloGames.sort((a,b) => a.label.localeCompare(b.label, 'tr')).map(a => <GameCard key={a.label} activity={a} courseId={courseId} unitId={unitId} />)}
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="flex items-center gap-3 border-b-2 border-slate-200 pb-2"><Swords className="w-8 h-8 text-rose-500" /><h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">SINIF İÇİ MÜCADELE</h3><span className="text-xs font-bold text-rose-500 bg-rose-100 px-2 py-1 rounded-md">VS MODE</span></div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {teamGames.map(a => <GameCard key={a.label} activity={a} courseId={courseId} unitId={unitId} isTeam />)}
                                </div>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
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