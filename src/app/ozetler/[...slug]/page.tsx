'use client';

import { useState, useEffect, useRef, Suspense, useMemo } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { 
    Loader2, ArrowLeft, Plus, Minus, BookOpen, Gamepad2, 
    Trophy, Zap, Star, Play, Users, Swords, Crown,
    Maximize2, Minimize2, Sparkles, StickyNote,
    Search, Crosshair, Shuffle, Lightbulb, Puzzle, Skull, Target, Link2, Pencil, Package, Wind, BrainCircuit, Milestone, Book, MousePointerClick, Grid3x3, Castle, Rocket
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FullscreenToggle } from '@/components/fullscreen-toggle';
import Link from 'next/link';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

async function getDefinitionsForTopic(topicId: string): Promise<{ concept: string; definition: string; }[]> {
    if (!topicId) return [];
    try {
        const q = query(collection(db, "activityItems"), where("topicId", "==", topicId), where("type", "==", "definition"));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => {
            const item = doc.data() as any;
            return {
                concept: item.content?.term || '',
                definition: item.content?.definition || ''
            };
        }).filter((item: any) => item.concept && item.definition);
    } catch (error) {
        console.error("Error fetching definitions for topic:", error);
        return [];
    }
}

// --- ARKA PLAN ---
const MagnificentLightBackground = () => (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-slate-50">
        <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-indigo-200/40 rounded-full blur-[120px] animate-pulse-slow mix-blend-multiply" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-sky-200/40 rounded-full blur-[120px] animate-pulse-slow delay-700 mix-blend-multiply" />
        <div className="absolute top-[40%] left-[50%] w-[400px] h-[400px] bg-purple-200/30 rounded-full blur-[100px] animate-pulse-slow delay-1000 mix-blend-multiply" />
    </div>
);

// =================================================================================================
// OYUNLAR SEKME BİLEŞENİ (Ünite Bazlı)
// =================================================================================================
const GamesTab = ({ courseName, unitName, courseId, unitId }: any) => {
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
        { href: '/oyunlar/tirmanma-yarisi', label: 'Tırmanma Yarışı', icon: Swords, color: 'red', badge: 'YENİ' },
        { href: '/oyunlar/fetih-oyunu', label: 'Fetih Oyunu', icon: Castle, color: 'emerald', badge: 'YENİ' },
        { href: '/oyunlar/uzay-savunmasi', label: 'Uzay Savunması', icon: Rocket, color: 'blue', badge: 'YENİ' },
    ];

    const teamGameSlugs = ['kavram-yarismasi', 'kutu-ac', 'tornado', 'carkifelek', 'anagram-duvari', 'tirmanma-yarisi', 'fetih-oyunu', 'uzay-savunmasi'];
    const teamGames = activityTypes.filter(a => teamGameSlugs.includes(a.href.split('/').pop() || ''));
    const soloGames = activityTypes.filter(a => !teamGameSlugs.includes(a.href.split('/').pop() || ''));

    const GameCard = ({ activity, isTeam = false }: { activity: any, isTeam?: boolean }) => {
        const Icon = activity.icon;
        // Ünite bazlı oyunlar için topicId="all" ve topicName="Tüm Ünite" gönderilir
        const gameUrl = `${activity.href}/oyun?${new URLSearchParams({ 
            courseId, courseName, unitId, unitName, 
            topicId: 'all', topicName: 'Tüm Ünite', 
            isStatic: 'false' 
        })}`;
        
        return (
            <Link href={gameUrl} className={cn("group relative perspective-1000", isTeam ? "col-span-1 md:col-span-2 lg:col-span-1 h-64" : "h-56")}>
                <div className={cn(
                    "relative w-full h-full overflow-hidden rounded-[2rem] shadow-xl transition-all duration-500 transform-gpu group-hover:scale-[1.03] group-hover:-translate-y-2 group-hover:shadow-2xl flex flex-col items-center justify-center bg-gradient-to-br border-2 border-white/20",
                    vibrantGradientMap[activity.color],
                    isTeam && "border-amber-300/50 shadow-amber-500/20"
                )}>
                    <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay" />
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
                        ÜNİTE OYUNLARI
                    </h2>
                    <Star className="absolute -top-6 -right-8 w-12 h-12 text-amber-400 animate-spin-slow" fill="currentColor" />
                    <Zap className="absolute -bottom-2 -left-8 w-10 h-10 text-cyan-400 animate-bounce" fill="currentColor" />
                </div>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Bu üniteye ait tüm konuların verileriyle oyna</p>
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

// --- ANA BİLEŞEN ---
function OzetDisplayPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    
    const slugArray = Array.isArray(params?.slug) ? params.slug : (params?.slug ? [params.slug] : []);
    const courseId = slugArray[0] ? decodeURIComponent(slugArray[0]) : null;
    const unitId = slugArray[1] ? decodeURIComponent(slugArray[1]) : null;
    const topicId = slugArray[2] ? decodeURIComponent(slugArray[2]) : null;

    const [content, setContent] = useState<{title: string, htmlContent: string, courseName: string, conceptDefinitions: {concept: string, definition: string}[], notes: string[]} | null>(null);
    const [activeTab, setActiveTab] = useState("ozet");
    const [isLoading, setIsLoading] = useState(true);
    const [zoomLevel, setZoomLevel] = useState(1.0);
    const [fontSize, setFontSize] = useState(1.5);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const colorClasses = [
        'from-indigo-500/10 to-blue-500/10 border-indigo-200 text-indigo-900', 
        'from-emerald-500/10 to-teal-500/10 border-emerald-200 text-emerald-900', 
        'from-rose-500/10 to-pink-500/10 border-rose-200 text-rose-900', 
        'from-amber-500/10 to-orange-500/10 border-amber-200 text-amber-900', 
        'from-cyan-500/10 to-sky-500/10 border-cyan-200 text-cyan-900',
        'from-purple-500/10 to-fuchsia-500/10 border-purple-200 text-purple-900'
    ];
    
    const noteColors = [
        { bg: "bg-indigo-50/80 border-indigo-200 hover:border-indigo-300 hover:bg-indigo-100", badge: "from-indigo-500 to-blue-600", text: "text-indigo-900" },
        { bg: "bg-emerald-50/80 border-emerald-200 hover:border-emerald-300 hover:bg-emerald-100", badge: "from-emerald-500 to-teal-600", text: "text-emerald-900" },
        { bg: "bg-rose-50/80 border-rose-200 hover:border-rose-300 hover:bg-rose-100", badge: "from-rose-500 to-pink-600", text: "text-rose-900" },
        { bg: "bg-amber-50/80 border-amber-200 hover:border-amber-300 hover:bg-amber-100", badge: "from-amber-500 to-orange-600", text: "text-amber-900" },
        { bg: "bg-sky-50/80 border-sky-200 hover:border-sky-300 hover:bg-sky-100", badge: "from-sky-500 to-cyan-600", text: "text-sky-900" },
        { bg: "bg-purple-50/80 border-purple-200 hover:border-purple-300 hover:bg-purple-100", badge: "from-purple-500 to-violet-600", text: "text-purple-900" },
    ];
    
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!courseId || !unitId) {
                setError("Geçersiz URL.");
                setIsLoading(false);
                return;
            }

            try {
                const docRef = topicId && topicId !== 'undefined'
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

                let conceptDefinitions: { concept: string; definition: string }[] = [];
                let notes: string[] = [];

                if (!topicId || topicId === 'undefined') {
                    const topicsSnap = await getDocs(query(collection(db, 'courses', courseId, 'units', unitId, 'topics')));
                    const sortedTopics = topicsSnap.docs
                        .map(d => ({ id: d.id, ...d.data() as any }))
                        .sort((a, b) => (a.title || '').localeCompare(b.title || '', 'tr', { numeric: true }));

                    for (const tData of sortedTopics) {
                        const tTitle = tData.title || 'Konu';
                        const defs = await getDefinitionsForTopic(tData.id);
                        if (defs.length > 0) {
                            conceptDefinitions.push({ concept: '[BAŞLIK]', definition: tTitle });
                            conceptDefinitions = [...conceptDefinitions, ...defs];
                        }
                        if (tData.writingContent?.notes && tData.writingContent.notes.length > 0) {
                            notes.push(`[BAŞLIK] ${tTitle.toUpperCase()}`);
                            notes = [...notes, ...tData.writingContent.notes];
                        }
                    }
                } else {
                    conceptDefinitions = await getDefinitionsForTopic(topicId);
                    notes = data.writingContent?.notes || [];
                }

                setContent({ 
                    title: data.title || 'İsimsiz İçerik', 
                    htmlContent: data.htmlContent || '<p class="text-center p-10">Özet içeriği bulunmuyor.</p>', 
                    courseName: courseData?.title || 'Ders',
                    conceptDefinitions,
                    notes
                });

            } catch (e: any) {
                setError("Sunucu hatası oluştu.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();

        const handleFs = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFs);
        return () => document.removeEventListener('fullscreenchange', handleFs);
    }, [courseId, unitId, topicId]);

    if (isLoading) return <div className="h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-indigo-500" /></div>;

    if (error || !content) {
        return (
           <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 text-center relative z-10">
               <div className="bg-white p-8 rounded-3xl border border-red-500/20 max-w-md w-full shadow-xl">
                   <p className="text-red-600 mb-6 font-medium text-lg">{error || "İçerik bulunamadı."}</p>
                   <Button asChild className="bg-slate-900 text-white hover:bg-slate-800 w-full">
                       <Link href="/"><ArrowLeft className="mr-2 h-4 w-4"/> Geri Dön</Link>
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
            <base target="_blank">
            <style>
                body { 
                    zoom: ${zoomLevel}; 
                    transform-origin: top center; 
                    padding: 20px; 
                    font-family: system-ui, -apple-system, sans-serif; 
                    margin: 0;
                    background-color: white;
                }
                img { max-width: 100%; height: auto; border-radius: 8px; margin: 1rem 0; }
            </style>
        </head>
        <body>
            ${content.htmlContent}
        </body>
        </html>
    `;

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col relative overflow-x-hidden selection:bg-indigo-500 selection:text-white">
            <MagnificentLightBackground />
            
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200">
                <div className="container mx-auto px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-5 w-full md:w-auto">
                        <Link href="/">
                            <button className="group relative flex items-center justify-center h-12 px-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all duration-300 overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <div className="relative flex items-center gap-2">
                                    <ArrowLeft className="h-5 w-5 text-slate-600 group-hover:text-white transition-all duration-300" />
                                    <span className="font-black text-xs uppercase tracking-widest text-slate-600 group-hover:text-white transition-colors duration-300">GERİ</span>
                                </div>
                            </button>
                        </Link>
                        <div className="hidden md:block h-8 w-[1px] bg-slate-200 mx-2" />
                        <div className="flex flex-col min-w-0">
                            <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tighter truncate">{content.title}</h1>
                            <p className="text-[10px] text-indigo-500 font-black uppercase tracking-widest">{content.courseName} / Ünite Özeti</p>
                        </div>
                    </div>

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
                        <TabsList className="bg-slate-100/80 p-1.5 rounded-full border border-slate-200 h-auto flex flex-wrap justify-center gap-2 shadow-inner">
                            <TabsTrigger 
                                value="ozet" 
                                className="rounded-full px-6 py-2.5 font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 data-[state=active]:text-white data-[state=active]:bg-gradient-to-r from-violet-600 to-purple-600"
                            >
                                <BookOpen className="h-4 w-4"/> Özet
                            </TabsTrigger>
                            {content.conceptDefinitions.length > 0 && (
                                <TabsTrigger 
                                    value="kavramlar" 
                                    className="rounded-full px-6 py-2.5 font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 data-[state=active]:text-white data-[state=active]:bg-gradient-to-r from-indigo-500 to-blue-500"
                                >
                                    <Sparkles className="h-4 w-4"/> Kavramlar
                                </TabsTrigger>
                            )}
                            {content.notes.length > 0 && (
                                <TabsTrigger 
                                    value="notlar" 
                                    className="rounded-full px-6 py-2.5 font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 data-[state=active]:text-white data-[state=active]:bg-gradient-to-r from-amber-500 to-orange-500"
                                >
                                    <StickyNote className="h-4 w-4"/> Notlar
                                </TabsTrigger>
                            )}
                            <TabsTrigger 
                                value="oyun" 
                                className="rounded-full px-6 py-2.5 font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 data-[state=active]:text-white data-[state=active]:bg-gradient-to-r from-emerald-500 to-green-500"
                            >
                                <Gamepad2 className="h-4 w-4"/> Oyun
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>

                    <div className="flex items-center gap-3">
                        {activeTab === 'ozet' && (
                             <div className="hidden sm:flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
                                <Button variant="ghost" size="icon" onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.1))} className="h-8 w-8 text-slate-600 hover:bg-white rounded-md"><Minus className="h-4 w-4"/></Button>
                                <span className="text-[10px] font-bold text-slate-500 w-12 text-center uppercase">{Math.round(zoomLevel * 100)}%</span>
                                <Button variant="ghost" size="icon" onClick={() => setZoomLevel(z => Math.min(2.5, z + 0.1))} className="h-8 w-8 text-slate-600 hover:bg-white rounded-md"><Plus className="h-4 w-4"/></Button>
                            </div>
                        )}
                        {(activeTab === 'kavramlar' || activeTab === 'notlar') && (
                             <div className="hidden sm:flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
                                <Button variant="ghost" size="icon" onClick={() => setFontSize(z => Math.max(1.0, z - 0.2))} className="h-8 w-8 text-slate-600 hover:bg-white rounded-md"><Minus className="h-4 w-4"/></Button>
                                <span className="text-[10px] font-bold text-slate-500 w-12 text-center uppercase">YAZI</span>
                                <Button variant="ghost" size="icon" onClick={() => setFontSize(z => Math.min(5.0, z + 0.2))} className="h-8 w-8 text-slate-600 hover:bg-white rounded-md"><Plus className="h-4 w-4"/></Button>
                            </div>
                        )}
                        <FullscreenToggle elementRef={containerRef} className="bg-slate-100 border-slate-200 text-slate-600 h-10 w-10 rounded-xl hover:bg-white" />
                    </div>
                </div>
            </header>

            <main ref={containerRef} className="flex-1 relative z-10 bg-white">
                <Tabs value={activeTab} className="w-full h-full">
                    <TabsContent value="ozet" className="m-0 h-full focus:outline-none overflow-hidden">
                        <iframe 
                            srcDoc={safeHtmlDocument} 
                            className="w-full h-[calc(100vh-88px)] border-0 bg-white" 
                            sandbox="allow-scripts allow-same-origin allow-popups"
                        />
                    </TabsContent>
                    <TabsContent value="oyun" className="m-0 h-full focus:outline-none overflow-y-auto">
                        <GamesTab 
                            courseName={content.courseName} 
                            unitName={content.title} 
                            courseId={courseId} 
                            unitId={unitId} 
                        />
                    </TabsContent>
                    <TabsContent value="kavramlar" className="m-0 h-full focus:outline-none overflow-y-auto bg-transparent p-4 md:p-8 relative">
                        <div className="flex flex-col w-full max-w-7xl mx-auto relative z-10 pb-32">
                            <h2 className="text-center font-black text-3xl md:text-4xl text-indigo-600 mb-8 drop-shadow-sm tracking-widest uppercase">
                                {content.title || 'Kavramlar'}
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 p-2">
                                {(() => {
                                    let conceptIndex = 1;
                                    return content.conceptDefinitions.map((item, index) => {
                                        if (item.concept === '[BAŞLIK]') {
                                            return (
                                                <div key={index} className="col-span-full mt-8 mb-2 flex items-center gap-4 w-full">
                                                    <div className="h-px bg-indigo-200 flex-1" />
                                                    <h3 className="text-xl md:text-2xl font-black text-indigo-700 tracking-wider uppercase text-center px-4">{item.definition}</h3>
                                                    <div className="h-px bg-indigo-200 flex-1" />
                                                </div>
                                            );
                                        }
                                        
                                        const style = colorClasses[(conceptIndex - 1) % colorClasses.length];
                                        const currentNum = conceptIndex++;
                                        
                                        return (
                                            <div key={index} className={cn(
                                                "relative overflow-hidden rounded-xl md:rounded-2xl border shadow-md p-4 bg-gradient-to-br flex flex-col hover:scale-105 transition-all duration-300 group",
                                                style
                                            )}>
                                                <div className="absolute -top-2 -right-2 text-7xl font-black opacity-[0.04] select-none">
                                                    {currentNum}
                                                </div>
                                                
                                                <div className="flex flex-col h-full z-10 relative">
                                                    <h3 
                                                        className="font-black mb-3 border-b border-black/5 pb-2 uppercase tracking-tighter leading-tight"
                                                        style={{ fontSize: `${fontSize * 1.1}rem` }}
                                                    >
                                                        {item.concept}
                                                    </h3>
                                                    <div className="flex-grow">
                                                        <p 
                                                            className="font-medium text-justify leading-relaxed"
                                                            style={{ fontSize: `${fontSize}rem` }}
                                                        >
                                                            {item.definition}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })
                                })()}
                            </div>
                        </div>
                    </TabsContent>
                    <TabsContent value="notlar" className="m-0 h-full focus:outline-none overflow-y-auto bg-transparent p-4 md:p-8 relative">
                        <div className="flex flex-col w-full max-w-7xl mx-auto relative z-10 pb-32">
                            <h2 className="text-center font-black text-3xl md:text-4xl text-amber-500 mb-8 drop-shadow-sm tracking-widest uppercase">
                                Önemli Notlar
                            </h2>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-2">
                                {(() => {
                                    let noteIndex = 1;
                                    return content.notes.map((note, index) => {
                                        if (note.startsWith('[BAŞLIK]')) {
                                            const title = note.replace('[BAŞLIK]', '').trim();
                                            return (
                                                <div key={index} className="col-span-full mt-8 mb-2 flex items-center gap-4 w-full">
                                                    <div className="h-px bg-amber-200 flex-1" />
                                                    <h3 className="text-xl md:text-2xl font-black text-amber-600 tracking-wider uppercase text-center px-4">{title}</h3>
                                                    <div className="h-px bg-amber-200 flex-1" />
                                                </div>
                                            );
                                        }

                                        const currentNoteNum = noteIndex++;
                                        const style = noteColors[(currentNoteNum - 1) % noteColors.length];

                                        return (
                                            <div key={index} className={cn(
                                                "flex items-start gap-4 p-4 rounded-xl md:rounded-2xl border transition-all duration-200 hover:shadow-lg group",
                                                style.bg
                                            )}>
                                                <div className={cn(
                                                    "flex-shrink-0 flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br text-white font-black text-xl shadow-sm mt-0.5",
                                                    style.badge
                                                )}>
                                                    {currentNoteNum}
                                                </div>
                                                <p 
                                                    className={cn("font-medium text-justify pt-1 leading-relaxed", style.text)}
                                                    style={{ fontSize: `${fontSize}rem` }}
                                                >
                                                    {note}
                                                </p>
                                            </div>
                                        );
                                    });
                                })()}
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
