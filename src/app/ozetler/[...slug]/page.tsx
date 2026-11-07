'use client';

import { useState, useEffect, useRef, Suspense, useMemo } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { 
    Loader2, ArrowLeft, Plus, Minus, BookOpen, Gamepad2, 
    Trophy, Zap, Star, Play, Users, Swords, Crown,
    Maximize2, Minimize2, Sparkles, StickyNote, Printer,
    Search, Crosshair, Shuffle, Lightbulb, Puzzle, Skull, Target, Link2, Pencil, Package, Wind, BrainCircuit, Milestone, Book, MousePointerClick, Grid3x3, Castle, Rocket
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FullscreenToggle } from '@/components/fullscreen-toggle';
import Link from 'next/link';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SketchnoteNotesViewer } from '@/components/sketchnote-notes-viewer';
import { SmartboardPresentationModal, type SmartboardSectionItem } from '@/components/smartboard-presentation-modal';
import { NOTEBOOK_SHEET_CSS, NOTEBOOK_SHEET_JS, sanitizeExamWordsFromSummary } from '@/lib/notebook-sheet-template';
import { useToast } from '@/hooks/use-toast';
import { saveOzetContent } from '@/app/teacher/ozetler/actions';
import { SummaryVisualEditorToolbar } from '@/components/summary-visual-editor-toolbar';

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
    ];

    const teamGameSlugs = ['kavram-yarismasi', 'kutu-ac', 'tornado', 'carkifelek', 'anagram-duvari', 'tirmanma-yarisi', 'fetih-oyunu'];
    const teamGames = activityTypes.filter(a => teamGameSlugs.includes(a.href.split('/').pop() || ''));
    const soloGames = activityTypes.filter(a => !teamGameSlugs.includes(a.href.split('/').pop() || ''));

    const GameCard = ({ activity, isTeam = false }: { activity: any, isTeam?: boolean }) => {
        const Icon = activity.icon;
        // Ünite bazlı oyunlar için topicId="all" ve topicName="Tüm Ünite" gönderilir
        const gameUrl = `${activity.href}/oyun?${new URLSearchParams({ 
            courseId, courseName, unitId, unitName, 
            topicId: 'all', topicName: 'Tüm Ünite', 
            isStatic: 'false',
            from: 'home'
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

    const [content, setContent] = useState<{title: string, htmlContent: string, courseName: string, conceptDefinitions: {concept: string, definition: string}[], notes: string[], unitId?: string | null, courseId?: string | null} | null>(null);
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
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const { toast } = useToast();
    const [isVisualEditing, setIsVisualEditing] = useState(false);
    const [isSavingVisual, setIsSavingVisual] = useState(false);

    const handleVisualSave = async (cleanHtml: string) => {
        if (!courseId || !unitId) return;
        setIsSavingVisual(true);
        try {
            const res = await saveOzetContent(courseId, unitId, topicId, cleanHtml);
            if (res.success) {
                setContent(prev => prev ? { ...prev, htmlContent: cleanHtml } : null);
                setIsVisualEditing(false);
                toast({
                    title: "Özet Güncellendi 🎉",
                    description: "Yaptığınız değişiklikler başarıyla kaydedildi.",
                });
            } else {
                toast({
                    title: "Hata",
                    description: res.error || "Özet kaydedilemedi.",
                    variant: "destructive"
                });
            }
        } catch (err: any) {
            toast({
                title: "Hata",
                description: err.message || "Kaydetme sırasında bir hata oluştu.",
                variant: "destructive"
            });
        } finally {
            setIsSavingVisual(false);
        }
    };
    const [smartboardModal, setSmartboardModal] = useState<{
        isOpen: boolean;
        currentIndex: number;
        sections: SmartboardSectionItem[];
    }>({
        isOpen: false,
        currentIndex: 0,
        sections: []
    });

    useEffect(() => {
        const handleWindowMessage = (event: MessageEvent) => {
            if (event.data?.type === 'OPEN_SMARTBOARD_SECTION_MODAL') {
                setSmartboardModal({
                    isOpen: true,
                    currentIndex: event.data.currentIndex || 0,
                    sections: event.data.sections || []
                });
            } else if (event.data?.type === 'CLOSE_SMARTBOARD_SECTION_MODAL') {
                setSmartboardModal(prev => ({ ...prev, isOpen: false }));
            } else if (event.data?.type === 'REQUEST_FULLSCREEN') {
                if (!document.fullscreenElement) {
                    containerRef.current?.requestFullscreen?.().catch(() => {});
                } else {
                    document.exitFullscreen?.().catch(() => {});
                }
            }
        };
        window.addEventListener('message', handleWindowMessage);
        return () => window.removeEventListener('message', handleWindowMessage);
    }, []);

    useEffect(() => {
        let isMounted = true;
        const fetchData = async () => {
            if (!courseId || !unitId) {
                if (isMounted) {
                    setError("Geçersiz URL.");
                    setIsLoading(false);
                }
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

                if (!isMounted) return;

                if (!docSnap.exists()) {
                    const targetId = (topicId && topicId !== 'undefined') ? topicId : unitId;
                    let foundTitle = (topicId && topicId !== 'undefined') ? 'Konu Özeti' : 'Ünite Özeti';
                    let courseTitle = 'Ders';

                    try {
                        const mRes = await fetch('/curriculum/manifest.json');
                        if (mRes.ok) {
                            const manifest = await mRes.json();
                            for (const g of manifest.classGroups || []) {
                                for (const c of g.courses || []) {
                                    if (c.id === courseId) courseTitle = c.title;
                                    for (const u of c.units || []) {
                                        if (u.id === targetId) foundTitle = u.title;
                                        for (const t of u.topics || []) {
                                            if (t.id === targetId) { foundTitle = t.title; break; }
                                        }
                                    }
                                }
                            }
                        }
                    } catch (mErr) {}

                    let htmlContent = '';
                    try {
                        const ozRes = await fetch(`/curriculum/ozetler/${targetId}.html`);
                        if (ozRes.ok) htmlContent = await ozRes.text();
                    } catch (ozErr) {}

                    let conceptDefinitions: { concept: string; definition: string }[] = [];
                    let notes: string[] = [];
                    try {
                        const yRes = await fetch(`/curriculum/yazilacaklar/${targetId}.json`);
                        if (yRes.ok) {
                            const yData = await yRes.json();
                            notes = yData.notes || [];
                            if (Array.isArray(yData.conceptDefinitions)) {
                                conceptDefinitions = yData.conceptDefinitions;
                            }
                        }
                    } catch (yErr) {}

                    if (!isMounted) return;

                    if (htmlContent || conceptDefinitions.length > 0 || notes.length > 0) {
                        setContent({
                            title: foundTitle,
                            courseName: courseTitle,
                            htmlContent,
                            conceptDefinitions,
                            notes,
                            unitId,
                            courseId
                        });
                        setIsLoading(false);
                        return;
                    }

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
                    if (!isMounted) return;

                    const sortedTopics = topicsSnap.docs
                        .map(d => ({ id: d.id, ...d.data() as any }))
                        .sort((a, b) => (a.title || '').localeCompare(b.title || '', 'tr', { numeric: true }));

                    for (const tData of sortedTopics) {
                        const tTitle = tData.title || 'Konu';
                        const defs = await getDefinitionsForTopic(tData.id);
                        if (!isMounted) return;

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
                    if (!isMounted) return;
                    notes = data.writingContent?.notes || [];
                }

                const targetId = (topicId && topicId !== 'undefined') ? topicId : unitId;
                let finalHtml = data.htmlContent || '';
                try {
                    const staticRes = await fetch(`/curriculum/ozetler/${targetId}.html?v=${Date.now()}`);
                    if (staticRes.ok) {
                        const text = await staticRes.text();
                        if (text && text.trim().length > 0) {
                            finalHtml = text;
                        }
                    }
                } catch (staticErr) {}

                if (isMounted) {
                    setContent({ 
                        title: data.title || 'İsimsiz İçerik', 
                        htmlContent: finalHtml || '<p class="text-center p-10">Özet içeriği bulunmuyor.</p>', 
                        courseName: courseData?.title || 'Ders',
                        conceptDefinitions,
                        notes
                    });
                }

            } catch (e: any) {
                if (isMounted) setError("Sunucu hatası oluştu.");
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        fetchData();

        const handleFs = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFs);
        return () => {
            isMounted = false;
            document.removeEventListener('fullscreenchange', handleFs);
        };
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

    const getSafeHtmlDocument = () => {
        if (!content?.htmlContent) return '';
        let html = content.htmlContent;
        const trimmed = html.trim().toLowerCase();

        // Modern Fasikül (A4 Eğitim Fasikülü & Sunum Sistemi) veya kendi stilleri olan dökümanları doğrudan render et
        const isFasikulOrPresentation = html.includes('fasikul-container') || html.includes('presentation-modal') || html.includes('presentationModal') || html.includes('smartboard-topbar');
        if (isFasikulOrPresentation) {
            return html;
        }

        if (!trimmed.startsWith('<!doctype') && !trimmed.startsWith('<html') && !trimmed.includes('<body')) {
            return `
                <!DOCTYPE html>
                <html lang="tr">
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <script src="https://cdn.tailwindcss.com"></script>
                    <base target="_blank">
                    <style id="notebookSheetLiveStyles">
                        body { 
                            zoom: ${zoomLevel}; 
                            transform-origin: top center; 
                            padding: 20px; 
                            font-family: system-ui, -apple-system, sans-serif; 
                            margin: 0;
                            background-color: white;
                        }
                        img { max-width: 100%; height: auto; border-radius: 8px; margin: 1rem 0; }
                        ${NOTEBOOK_SHEET_CSS}
                    </style>
                </head>
                <body>
                    ${html}
                    <script id="smartboardFocusScript">
                        ${NOTEBOOK_SHEET_JS}
                    </script>
                </body>
                </html>
            `;
        }

        // If it is a full HTML document, guarantee NOTEBOOK_SHEET_CSS is injected
        if (!html.includes('notebookSheetLiveStyles')) {
            const headEnd = html.indexOf('</head>');
            if (headEnd !== -1) {
                html = html.slice(0, headEnd) + `<style id="notebookSheetLiveStyles">\n${NOTEBOOK_SHEET_CSS}\n</style>\n` + html.slice(headEnd);
            }
        }

        // Dynamic Zoom injection for iframe scaling
        const zoomCss = `<style id="dynamicZoomLiveStyle">body { zoom: ${zoomLevel}; transform-origin: top center; }</style>`;
        if (html.includes('dynamicZoomLiveStyle')) {
            html = html.replace(/<style id="dynamicZoomLiveStyle">[\s\S]*?<\/style>/i, zoomCss);
        } else {
            const headEnd = html.indexOf('</head>');
            if (headEnd !== -1) {
                html = html.slice(0, headEnd) + `${zoomCss}\n` + html.slice(headEnd);
            }
        }

        // Guarantee NOTEBOOK_SHEET_JS is injected
        const sTag = '<script id="smartboardFocusScript">';
        const sIdx = html.indexOf(sTag);
        if (sIdx !== -1) {
            const eIdx = html.indexOf('</script>', sIdx);
            if (eIdx !== -1) {
                html = html.slice(0, sIdx) + `${sTag}\n${NOTEBOOK_SHEET_JS}\n</script>` + html.slice(eIdx + 9);
            }
        } else {
            const bEnd = html.indexOf('</body>');
            if (bEnd !== -1) {
                html = html.slice(0, bEnd) + `\n${sTag}\n${NOTEBOOK_SHEET_JS}\n</script>\n` + html.slice(bEnd);
            }
        }

        return html;
    };

    return (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="min-h-screen bg-slate-50 flex flex-col relative overflow-x-hidden selection:bg-indigo-500 selection:text-white">
            <MagnificentLightBackground />
            
            <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm flex-shrink-0">
                <div className="w-full px-4 sm:px-6 py-2 flex items-center justify-between gap-3">
                    {/* Sol Kısım: Geri Butonu ve Başlık */}
                    <div className="flex items-center gap-3 min-w-0">
                        <Link href="/">
                            <button className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-white border border-slate-200 shadow-sm hover:shadow hover:border-indigo-300 text-slate-700 hover:text-indigo-600 transition-all font-bold text-xs flex-shrink-0 cursor-pointer">
                                <ArrowLeft className="h-4 w-4" />
                                <span className="hidden sm:inline font-black uppercase tracking-wider">GERİ</span>
                            </button>
                        </Link>
                        <div className="hidden sm:block h-6 w-[1px] bg-slate-200 flex-shrink-0" />
                        <div className="flex flex-col min-w-0">
                            <h1 className="text-sm sm:text-base md:text-lg font-black text-slate-900 tracking-tight truncate leading-tight">
                                {content.title}
                            </h1>
                            <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider truncate">
                                {content.courseName} • Ünite Özeti
                            </p>
                        </div>
                    </div>

                    {/* Orta Kısım: Tek Satır, Asla Bölünmeyen ve Taşmayan Sekmeler */}
                    <div className="flex-shrink-0">
                        <TabsList className="bg-slate-100 p-1 rounded-xl border border-slate-200/90 flex items-center gap-1 shadow-inner flex-nowrap h-auto">
                            <TabsTrigger 
                                value="ozet" 
                                className="rounded-lg px-3 sm:px-4 py-1.5 font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 whitespace-nowrap data-[state=active]:text-white data-[state=active]:bg-gradient-to-r from-violet-600 to-purple-600 data-[state=active]:shadow-sm cursor-pointer"
                            >
                                <BookOpen className="h-3.5 w-3.5"/> <span>Özet</span>
                            </TabsTrigger>
                            {content.conceptDefinitions.length > 0 && (
                                <TabsTrigger 
                                    value="kavramlar" 
                                    className="rounded-lg px-3 sm:px-4 py-1.5 font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 whitespace-nowrap data-[state=active]:text-white data-[state=active]:bg-gradient-to-r from-indigo-500 to-blue-500 data-[state=active]:shadow-sm cursor-pointer"
                                >
                                    <Sparkles className="h-3.5 w-3.5"/> <span>Kavramlar</span>
                                </TabsTrigger>
                            )}
                            {content.notes.length > 0 && (
                                <TabsTrigger 
                                    value="notlar" 
                                    className="rounded-lg px-3 sm:px-4 py-1.5 font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 whitespace-nowrap data-[state=active]:text-white data-[state=active]:bg-gradient-to-r from-amber-500 to-orange-500 data-[state=active]:shadow-sm cursor-pointer"
                                >
                                    <StickyNote className="h-3.5 w-3.5"/> <span>Notlar</span>
                                </TabsTrigger>
                            )}
                            <TabsTrigger 
                                value="oyun" 
                                className="rounded-lg px-3 sm:px-4 py-1.5 font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 whitespace-nowrap data-[state=active]:text-white data-[state=active]:bg-gradient-to-r from-emerald-500 to-green-500 data-[state=active]:shadow-sm cursor-pointer"
                            >
                                <Gamepad2 className="h-3.5 w-3.5"/> <span>Oyun</span>
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    {/* Sağ Kısım: Kompakt ve Düzenli Kontroller */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {activeTab === 'ozet' && (
                            <>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        iframeRef.current?.contentWindow?.postMessage({ type: 'TRIGGER_FIRST_SECTION_FOCUS' }, '*');
                                    }}
                                    className="bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl px-3 h-9 shadow-sm border border-sky-400 transition-all hover:scale-105 flex items-center gap-1.5 cursor-pointer whitespace-nowrap flex-shrink-0"
                                    title="Bölümleri Akıllı Tahta Odak Modunda Göster"
                                >
                                    <Maximize2 className="h-3.5 w-3.5 flex-shrink-0" />
                                    <span className="hidden md:inline">Bölümleri Büyüt / Odaklan</span>
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        if (iframeRef.current?.contentWindow) {
                                            iframeRef.current.contentWindow.focus();
                                            iframeRef.current.contentWindow.print();
                                        } else {
                                            window.print();
                                        }
                                    }}
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl px-3 h-9 shadow-sm border border-emerald-400 transition-all hover:scale-105 flex items-center gap-1.5 cursor-pointer whitespace-nowrap flex-shrink-0"
                                    title="Özeti Yazdır veya PDF Olarak Kaydet"
                                >
                                    <Printer className="h-3.5 w-3.5 flex-shrink-0" />
                                    <span className="hidden md:inline">Yazdır / PDF</span>
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setIsVisualEditing(prev => !prev)}
                                    className={cn(
                                        "font-bold text-xs rounded-xl px-3 h-9 shadow-sm border transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap flex-shrink-0",
                                        isVisualEditing 
                                            ? "bg-amber-500 hover:bg-amber-600 text-white border-amber-400 ring-2 ring-amber-400/30" 
                                            : "bg-purple-600 hover:bg-purple-500 text-white border-purple-400 hover:scale-105"
                                    )}
                                    title="Özet üzerindeki yazıları doğrudan tıklayarak düzenleyin (HTML gerekmez)"
                                >
                                    <Pencil className="h-3.5 w-3.5 flex-shrink-0" />
                                    <span className="hidden md:inline">{isVisualEditing ? "Düzenlemeyi Bitir" : "Metni Düzenle"}</span>
                                </Button>
                                <div className="hidden sm:flex items-center bg-slate-100 rounded-xl p-0.5 border border-slate-200 h-9">
                                    <Button variant="ghost" size="icon" onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.1))} className="h-7 w-7 text-slate-600 hover:bg-white rounded-lg"><Minus className="h-3.5 w-3.5"/></Button>
                                    <span className="text-[11px] font-mono font-bold text-slate-600 w-11 text-center">{Math.round(zoomLevel * 100)}%</span>
                                    <Button variant="ghost" size="icon" onClick={() => setZoomLevel(z => Math.min(2.5, z + 0.1))} className="h-7 w-7 text-slate-600 hover:bg-white rounded-lg"><Plus className="h-3.5 w-3.5"/></Button>
                                </div>
                            </>
                        )}
                        {(activeTab === 'kavramlar' || activeTab === 'notlar') && (
                             <div className="hidden sm:flex items-center bg-slate-100 rounded-xl p-0.5 border border-slate-200 h-9">
                                <Button variant="ghost" size="icon" onClick={() => setFontSize(z => Math.max(1.0, z - 0.2))} className="h-7 w-7 text-slate-600 hover:bg-white rounded-lg"><Minus className="h-3.5 w-3.5"/></Button>
                                <span className="text-[10px] font-bold text-slate-600 px-2 uppercase">YAZI</span>
                                <Button variant="ghost" size="icon" onClick={() => setFontSize(z => Math.min(5.0, z + 0.2))} className="h-7 w-7 text-slate-600 hover:bg-white rounded-lg"><Plus className="h-3.5 w-3.5"/></Button>
                            </div>
                        )}
                        <FullscreenToggle elementRef={containerRef} className="bg-slate-100 border-slate-200 text-slate-700 h-9 w-9 rounded-xl hover:bg-white shadow-sm flex-shrink-0" />
                    </div>
                </div>
            </header>

            <main ref={containerRef} className="flex-1 relative z-10 bg-white w-full overflow-hidden flex flex-col" style={{ minHeight: 'calc(100vh - 53px)' }}>
                <TabsContent value="ozet" className="m-0 p-0 w-full focus:outline-none overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 53px)' }}>
                    <SummaryVisualEditorToolbar
                        iframeRef={iframeRef}
                        isEditing={isVisualEditing}
                        onToggleEdit={() => setIsVisualEditing(prev => !prev)}
                        onSave={handleVisualSave}
                        onCancel={() => setIsVisualEditing(false)}
                        isSaving={isSavingVisual}
                        title={content.title}
                    />
                    <iframe 
                        ref={iframeRef}
                        srcDoc={getSafeHtmlDocument()} 
                        style={{ width: '100%', height: isVisualEditing ? 'calc(100vh - 105px)' : 'calc(100vh - 53px)', minHeight: isVisualEditing ? 'calc(100vh - 105px)' : 'calc(100vh - 53px)' }}
                        className="w-full border-0 bg-white block flex-1" 
                        allow="fullscreen"
                        allowFullScreen={true}
                        sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals"
                    />
                </TabsContent>
                <TabsContent value="oyun" className="m-0 p-0 w-full focus:outline-none overflow-y-auto" style={{ height: 'calc(100vh - 53px)' }}>
                    <GamesTab 
                        courseName={content.courseName} 
                        unitName={content.title} 
                        courseId={courseId} 
                        unitId={unitId} 
                    />
                </TabsContent>
                <TabsContent value="kavramlar" className="m-0 p-0 w-full focus:outline-none overflow-y-auto bg-transparent relative" style={{ height: 'calc(100vh - 53px)' }}>
                    <SketchnoteNotesViewer 
                        topicTitle={content.title || 'Kavramlar'}
                        courseName={content.courseName}
                        conceptDefinitions={content.conceptDefinitions}
                        notes={[]}
                        activeSection="concepts"
                        showToolbar={false}
                    />
                </TabsContent>
                <TabsContent value="notlar" className="m-0 p-0 w-full focus:outline-none overflow-y-auto bg-transparent relative" style={{ height: 'calc(100vh - 53px)' }}>
                    <SketchnoteNotesViewer 
                        topicTitle={content.title || 'Önemli Notlar'}
                        courseName={content.courseName}
                        conceptDefinitions={[]}
                        notes={content.notes}
                        activeSection="notes"
                        showToolbar={false}
                    />
                </TabsContent>
            </main>

            {/* Akıllı Tahta Bölüm Odak Modu - Tüm Tarayıcı / Ekran Genişliğinde Açar */}
            <SmartboardPresentationModal
                isOpen={smartboardModal.isOpen}
                onClose={() => setSmartboardModal(prev => ({ ...prev, isOpen: false }))}
                sections={smartboardModal.sections}
                initialIndex={smartboardModal.currentIndex}
            />
        </Tabs>
    );
}

export default function Page() {
    return (
        <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" /></div>}>
            <OzetDisplayPage />
        </Suspense>
    );
}
