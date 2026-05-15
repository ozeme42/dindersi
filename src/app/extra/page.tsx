'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
    FileText, Search, LayoutGrid, List, ArrowLeft, Loader2, 
    Folder, Home, ChevronRight as ChevronRightIcon,
    FileImage, Link2, ExternalLink,
    PlayCircle, Sparkles, BrainCircuit, BookOpen,
    RotateCcw, KeyRound, Gamepad2 // Yeni ikonlar eklendi
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { getExtraPages } from '@/app/teacher/extra-pages/actions';

// OYUN BİLEŞENLERİ
import { WordSudoku } from '@/components/word-sudoku';
import { CryptoGame } from '@/components/crypto-game'; // Şifreli Çark bileşeni

// Zeka Köşesi Oyun Listesi
const GAMES = [
    { 
        id: 'sudoku', 
        title: 'Kelime Sudoku', 
        desc: 'Zihnini aç, boşluklara dini kavramları yerleştir.', 
        icon: RotateCcw, 
        color: 'text-indigo-600', 
        bg: 'bg-indigo-100',
        active: true 
    },
    { 
        id: 'crypto', 
        title: 'Şifreli Söz', 
        desc: 'Sayıların gizlediği ayet ve hadisleri deşifre et.', 
        icon: KeyRound, 
        color: 'text-emerald-600', 
        bg: 'bg-emerald-100',
        active: true 
    },
    { 
        id: 'resfebe', 
        title: 'İslami Resfebe', 
        desc: 'Görsellerle anlatılan gizli kelimeleri çöz.', 
        icon: Sparkles, 
        color: 'text-slate-400', 
        bg: 'bg-slate-100',
        active: false 
    },
    { 
        id: 'analoji', 
        title: 'Kavram Analojisi', 
        desc: 'Kavramlar arası mantıksal bağ kur.', 
        icon: Link2, 
        color: 'text-slate-400', 
        bg: 'bg-slate-100',
        active: false 
    }
];

export default function ExtraPagesExplorer() {
    const [pages, setPages] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [currentPath, setCurrentPath] = useState<string>("");
    const [activeTab, setActiveTab] = useState("documents");
    
    // Zeka Köşesi için Aktif Oyun State'i
    const [activeGame, setActiveGame] = useState<string | null>(null);

    // Cihaz algılama: Mobilde varsayılan liste modu
    useEffect(() => {
        if (typeof window !== 'undefined') {
            if (window.innerWidth < 768) {
                setViewMode('list');
            }
        }
    }, []);

    useEffect(() => {
        const fetchPages = async () => {
            setIsLoading(true);
            const res = await getExtraPages(true); 
            if (res.success) {
                setPages(res.data || []);
            }
            setIsLoading(false);
        };
        fetchPages();
    }, []);

    const { currentFolders, currentFiles } = useMemo(() => {
        const folderMap = new Map<string, number>();
        const files: any[] = [];

        if (searchTerm) {
            const searchRes = pages.filter(p => 
                p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                (p.category || 'Genel').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()))
            );
            return { currentFolders: [], currentFiles: searchRes };
        }

        pages.forEach(p => {
            const cat = p.category || 'Genel';
            if (currentPath === "") {
                const rootFolder = cat.split('/')[0];
                folderMap.set(rootFolder, (folderMap.get(rootFolder) || 0) + 1);
            } else {
                if (cat === currentPath) {
                    files.push(p);
                } else if (cat.startsWith(currentPath + '/')) {
                    const remainingPath = cat.substring(currentPath.length + 1);
                    const nextFolder = remainingPath.split('/')[0]; 
                    folderMap.set(nextFolder, (folderMap.get(nextFolder) || 0) + 1);
                }
            }
        });

        const folders = Array.from(folderMap.entries()).map(([name, count]) => ({
            name, count, fullPath: currentPath === "" ? name : `${currentPath}/${name}`
        })).sort((a, b) => a.name.localeCompare(b.name));

        return { currentFolders: folders, currentFiles: files };
    }, [pages, currentPath, searchTerm]);

    const getFileTheme = (title: string, isLink: boolean) => {
        const lowerTitle = title.toLowerCase();
        
        if (isLink) return {
            icon: <Link2 className="h-6 w-6" />,
            bg: "bg-fuchsia-100", text: "text-fuchsia-600",
            borderHover: "hover:border-fuchsia-300", shadowHover: "hover:shadow-fuchsia-500/20",
            badgeBg: "bg-fuchsia-50", badgeText: "text-fuchsia-600",
            gradient: "from-fuchsia-50 to-white"
        };
        
        if (lowerTitle.includes('video') || lowerTitle.includes('izle')) return {
            icon: <PlayCircle className="h-6 w-6" />,
            bg: "bg-rose-100", text: "text-rose-600",
            borderHover: "hover:border-rose-300", shadowHover: "hover:shadow-rose-500/20",
            badgeBg: "bg-rose-50", badgeText: "text-rose-600",
            gradient: "from-rose-50 to-white"
        };

        if (lowerTitle.includes('resim') || lowerTitle.includes('fotoğraf') || lowerTitle.includes('görsel')) return {
            icon: <FileImage className="h-6 w-6" />,
            bg: "bg-amber-100", text: "text-amber-600",
            borderHover: "hover:border-amber-300", shadowHover: "hover:shadow-amber-500/20",
            badgeBg: "bg-amber-50", badgeText: "text-amber-600",
            gradient: "from-amber-50 to-white"
        };

        return {
            icon: <FileText className="h-6 w-6" />,
            bg: "bg-blue-100", text: "text-blue-600",
            borderHover: "hover:border-blue-300", shadowHover: "hover:shadow-blue-500/20",
            badgeBg: "bg-blue-50", badgeText: "text-blue-600",
            gradient: "from-blue-50 to-white"
        };
    };

    const pathParts = currentPath.split('/').filter(Boolean);

    return (
        <div className="min-h-screen bg-slate-50/50 font-sans text-slate-900 pb-20 relative selection:bg-indigo-100 selection:text-indigo-900">
            {/* Arka plan efektleri */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-indigo-200/30 rounded-full blur-[100px] mix-blend-multiply animate-pulse duration-[10000ms]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-sky-200/30 rounded-full blur-[100px] mix-blend-multiply" />
            </div>

            <header className="sticky top-0 z-30 bg-white/70 backdrop-blur-3xl border-b border-slate-200 shadow-sm">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <Button variant="outline" size="icon" asChild className="rounded-2xl h-11 w-11 bg-white hover:bg-slate-50 border-slate-200 text-slate-600 shadow-sm transition-all flex-shrink-0">
                                <Link href="/"><ArrowLeft className="h-5 w-5" /></Link>
                            </Button>
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl shadow-lg shadow-blue-500/20">
                                    <Sparkles className="h-5 w-5 text-white" />
                                </div>
                                <div className="flex flex-col">
                                    <h1 className="text-xl font-black tracking-tight text-slate-900">İnteraktif Merkez</h1>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500">Dijital Araçlar ve Kaynaklar</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); setActiveGame(null); }} className="w-full md:w-auto">
                                <TabsList className="bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-inner h-12">
                                    <TabsTrigger value="documents" className="rounded-xl px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold text-xs uppercase tracking-wider">
                                        <BookOpen className="w-4 h-4 mr-2" /> Dökümanlar
                                    </TabsTrigger>
                                    <TabsTrigger value="puzzles" className="rounded-xl px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold text-xs uppercase tracking-wider">
                                        <BrainCircuit className="w-4 h-4 mr-2" /> Zeka Köşesi
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8 relative z-10 w-full max-w-none">
                <Tabs value={activeTab} className="w-full">
                    
                    {/* --- DÖKÜMANLAR SEKMESİ --- */}
                    <TabsContent value="documents" className="m-0 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-7xl mx-auto">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white/50 backdrop-blur-md p-4 rounded-3xl border border-white/60 shadow-sm">
                            <div className="relative flex-1 md:w-80 group w-full">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                <Input 
                                    placeholder="İçerik, klasör veya test ara..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-11 bg-white border-slate-200/80 rounded-2xl h-12 text-sm shadow-sm hover:border-indigo-300 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 transition-all"
                                />
                            </div>
                            <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm shrink-0">
                                <Button variant="ghost" size="icon" onClick={() => setViewMode('grid')} className={cn("h-10 w-10 rounded-xl transition-all", viewMode === 'grid' ? "bg-indigo-50 text-indigo-600" : "text-slate-400 hover:text-slate-700")}>
                                    <LayoutGrid className="h-5 w-5" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => setViewMode('list')} className={cn("h-10 w-10 rounded-xl transition-all", viewMode === 'list' ? "bg-indigo-50 text-indigo-600" : "text-slate-400 hover:text-slate-700")}>
                                    <List className="h-5 w-5" />
                                </Button>
                            </div>
                        </div>

                        {/* Klasör Navigasyonu (Eski Kod) */}
                        {!searchTerm && (
                            <div className="flex items-center gap-1.5 text-sm font-medium text-slate-600 overflow-x-auto no-scrollbar pb-1">
                                <button onClick={() => setCurrentPath("")} className={cn("flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all whitespace-nowrap", currentPath === "" ? "text-indigo-700 bg-indigo-100 font-bold shadow-sm" : "bg-white border border-slate-200 hover:bg-slate-50")}>
                                    <Home className="h-4 w-4" /><span>Ana Dizin</span>
                                </button>
                                {pathParts.map((part, index) => {
                                    const pathToHere = pathParts.slice(0, index + 1).join('/');
                                    const isLast = index === pathParts.length - 1;
                                    return (
                                        <React.Fragment key={pathToHere}>
                                            <ChevronRightIcon className="h-4 w-4 text-slate-300 flex-shrink-0" />
                                            <button onClick={() => setCurrentPath(pathToHere)} className={cn("flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all whitespace-nowrap", isLast ? "text-indigo-700 bg-indigo-100 font-bold shadow-sm" : "bg-white border border-slate-200 hover:bg-slate-50")}>
                                                <Folder className={cn("h-4 w-4", isLast ? "fill-indigo-500 text-indigo-500" : "fill-sky-400 text-sky-500")} /><span>{part}</span>
                                            </button>
                                        </React.Fragment>
                                    );
                                })}
                            </div>
                        )}

                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-32 space-y-6">
                                <div className="p-4 bg-white rounded-2xl shadow-xl shadow-indigo-500/10 border border-slate-100"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>
                                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs animate-pulse">İçerikler Yükleniyor</p>
                            </div>
                        ) : (
                            <div className="space-y-10">
                                {/* Döküman Listeleme Kısmı Aynen Bırakıldı... (Yukarıdaki Kodun Aynısı) */}
                                {searchTerm && (
                                    <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                                        <Search className="h-6 w-6 text-indigo-500" /> "{searchTerm}" için sonuçlar
                                        <Badge variant="secondary" className="text-sm bg-white border border-slate-200 shadow-sm">{currentFiles.length}</Badge>
                                    </h2>
                                )}

                                {!searchTerm && currentFolders.length > 0 && (
                                    <section>
                                        <h3 className="text-xs font-black text-slate-400 mb-5 uppercase tracking-widest flex items-center gap-2 ml-1">Klasörler <span className="bg-slate-200 text-slate-600 rounded-full px-2 py-0.5">{currentFolders.length}</span></h3>
                                        <div className={cn(viewMode === 'grid' ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5" : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4")}>
                                            {currentFolders.map((folder) => (
                                                <button key={folder.name} onClick={() => setCurrentPath(folder.fullPath)} className={cn("group flex text-left transition-all duration-300 bg-white/60 backdrop-blur-sm border border-slate-200/80 rounded-3xl overflow-hidden hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-1", viewMode === 'grid' ? "flex-col p-6 items-center text-center" : "flex-row items-center p-4 gap-5")}>
                                                    <div className={cn("relative transition-transform duration-300 group-hover:scale-110", viewMode === 'grid' ? "mb-4" : "")}>
                                                        <div className="absolute inset-0 bg-sky-400 blur-xl opacity-20 group-hover:opacity-40 transition-opacity" />
                                                        <Folder className={cn("fill-sky-400 text-sky-500 drop-shadow-sm relative z-10", viewMode === 'grid' ? "h-16 w-16" : "h-12 w-12")} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-bold text-slate-800 truncate group-hover:text-indigo-600 transition-colors text-base">{folder.name}</h4>
                                                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-1">{folder.count} İçerik</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </section>
                                )}

                                {(searchTerm || currentFiles.length > 0) && (
                                    <section>
                                        {!searchTerm && <h3 className="text-xs font-black text-slate-400 mb-5 uppercase tracking-widest flex items-center gap-2 ml-1">Dökümanlar <span className="bg-slate-200 text-slate-600 rounded-full px-2 py-0.5">{currentFiles.length}</span></h3>}
                                        {currentFiles.length > 0 ? (
                                            <div className={cn(viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" : "flex flex-col gap-4 max-w-5xl mx-auto")}>
                                                {currentFiles.map((item) => {
                                                    const isExternalLink = item.htmlContent?.startsWith('URL::');
                                                    const targetUrl = isExternalLink ? item.htmlContent.replace('URL::', '') : `/extra/${item.id}`;
                                                    const theme = getFileTheme(item.title, isExternalLink);

                                                    const renderCard = () => (
                                                        <Card className={cn("transition-all duration-300 bg-white overflow-hidden border-slate-200/80 hover:-translate-y-1.5 h-full", theme.borderHover, theme.shadowHover, viewMode === 'grid' ? "rounded-[2rem] flex flex-col" : "rounded-2xl flex flex-row items-center p-4")}>
                                                            {viewMode === 'grid' ? (
                                                                <>
                                                                    <div className={cn("h-36 flex items-center justify-center p-6 relative overflow-hidden bg-gradient-to-br", theme.gradient)}>
                                                                        <div className="absolute top-[-20%] right-[-10%] w-24 h-24 rounded-full bg-white/40 blur-xl" /><div className="absolute bottom-[-20%] left-[-10%] w-20 h-20 rounded-full bg-white/40 blur-xl" />
                                                                        <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg bg-white relative z-10 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3", theme.text)}>{theme.icon}</div>
                                                                    </div>
                                                                    <CardContent className="flex-grow p-6">
                                                                        <CardTitle className={cn("text-lg leading-tight transition-colors font-black tracking-tight mb-2 line-clamp-2", theme.text.replace('text-', 'group-hover:text-'))}>{item.title}</CardTitle>
                                                                        <p className="text-sm font-medium text-slate-500 line-clamp-2 leading-relaxed">{item.description || (isExternalLink ? "Dış Bağlantı" : "İnteraktif İçerik")}</p>
                                                                    </CardContent>
                                                                    <CardFooter className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between mt-auto">
                                                                        <Badge variant="secondary" className={cn("text-[10px] font-black uppercase tracking-widest rounded-md px-2.5 py-1 border-none", theme.badgeBg, theme.badgeText)}>{isExternalLink ? 'Bağlantı' : 'Döküman'}</Badge>
                                                                        <div className={cn("h-8 w-8 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm transition-all text-slate-400 group-hover:border-transparent", theme.text.replace('text-', 'group-hover:text-'))}>{isExternalLink ? <ExternalLink className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4 ml-0.5" />}</div>
                                                                    </CardFooter>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <div className={cn("w-14 h-14 rounded-xl flex items-center justify-center mr-5 p-3 transition-transform duration-500 group-hover:scale-105 group-hover:rotate-3", theme.bg, theme.text)}>{theme.icon}</div>
                                                                    <div className="flex-1 min-w-0 pr-6">
                                                                        <h3 className={cn("font-black text-slate-800 transition-colors truncate text-lg tracking-tight", theme.text.replace('text-', 'group-hover:text-'))}>{item.title}</h3>
                                                                        <div className="flex items-center gap-3 mt-1.5"><Badge variant="secondary" className={cn("text-[9px] font-black uppercase tracking-widest rounded-sm px-1.5 py-0.5 border-none", theme.badgeBg, theme.badgeText)}>{item.category ? item.category.split('/').pop() : 'Genel'}</Badge><span className="text-xs font-medium text-slate-400 truncate">{item.description || (isExternalLink ? "Dış bağlantıya gider" : "İçeriği görüntüle")}</span></div>
                                                                    </div>
                                                                    <div className={cn("h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center transition-all ml-2 flex-shrink-0 text-slate-300", theme.text.replace('text-', 'group-hover:text-'))}>{isExternalLink ? <ExternalLink className="h-5 w-5" /> : <ChevronRightIcon className="h-5 w-5 ml-0.5" />}</div>
                                                                </>
                                                            )}
                                                        </Card>
                                                    );

                                                    return isExternalLink ? <a key={item.id} href={targetUrl} target="_blank" rel="noopener noreferrer" className="group block h-full">{renderCard()}</a> : <Link key={item.id} href={targetUrl} className="group block h-full">{renderCard()}</Link>;
                                                })}
                                            </div>
                                        ) : (
                                            <div className="py-24 text-center bg-white/70 backdrop-blur-xl rounded-[3rem] border border-dashed border-slate-300 shadow-sm"><div className="mx-auto w-24 h-24 bg-slate-100 rounded-3xl rotate-12 flex items-center justify-center mb-6 shadow-inner"><Search className="h-10 w-10 text-slate-400 -rotate-12" /></div><h3 className="text-xl font-black tracking-tight text-slate-800">Sonuç Bulunamadı</h3></div>
                                        )}
                                    </section>
                                )}

                                {!searchTerm && currentFolders.length === 0 && currentFiles.length === 0 && (
                                    <div className="py-32 text-center bg-white/60 backdrop-blur-xl rounded-[3rem] border border-slate-200/60 shadow-xl shadow-sky-500/5">
                                        <div className="w-28 h-28 bg-gradient-to-br from-sky-100 to-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-sky-100"><Folder className="h-14 w-14 fill-sky-400 text-sky-500 drop-shadow-sm" /></div>
                                        <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-2">Bu Klasör Bomboş</h3>
                                        {currentPath !== "" && <Button variant="outline" onClick={() => { const parts = currentPath.split('/'); parts.pop(); setCurrentPath(parts.join('/')); }} className="mt-8 rounded-xl text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-300 font-bold px-6 h-12 transition-all shadow-sm"><ArrowLeft className="mr-2 h-5 w-5" /> Geri Dön</Button>}
                                    </div>
                                )}
                            </div>
                        )}
                    </TabsContent>

                    {/* --- ZEKA KÖŞESİ SEKMESİ --- */}
                    <TabsContent value="puzzles" className="m-0 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
                        <div className="w-full space-y-8 py-6">
                            
                            {/* OYUN SEÇİLMEDİYSE MENÜYÜ GÖSTER */}
                            {!activeGame ? (
                                <div className="animate-in fade-in duration-500">
                                    <div className="text-center space-y-4 max-w-4xl mx-auto mb-12">
                                        <Badge className="bg-indigo-100 text-indigo-600 border-none font-black px-5 py-1.5 uppercase tracking-widest text-[10px] shadow-sm">
                                            Eğitici Zeka Oyunları
                                        </Badge>
                                        <h2 className="text-4xl md:text-5xl font-black text-slate-800 tracking-tighter uppercase">
                                            Zeka Köşesi
                                        </h2>
                                        <p className="text-slate-500 font-medium text-lg max-w-2xl mx-auto leading-relaxed">
                                            Ders başlarında öğrencilerin odaklanmasını sağlamak ve zihinlerini açmak için özel olarak tasarlanmış interaktif oyunlar.
                                        </p>
                                    </div>

                                    {/* Oyun Kartları Grid'i */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
                                        {GAMES.map((game) => {
                                            const Icon = game.icon;
                                            return (
                                                <button
                                                    key={game.id}
                                                    onClick={() => game.active && setActiveGame(game.id)}
                                                    disabled={!game.active}
                                                    className={cn(
                                                        "group text-left bg-white border rounded-[2rem] p-6 transition-all duration-300 flex flex-col items-start h-full relative overflow-hidden",
                                                        game.active 
                                                            ? "border-slate-200 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-1 cursor-pointer" 
                                                            : "border-slate-100 bg-slate-50/50 opacity-70 cursor-not-allowed"
                                                    )}
                                                >
                                                    {!game.active && (
                                                        <Badge variant="outline" className="absolute top-4 right-4 text-[9px] font-black uppercase bg-slate-100 text-slate-400 border-none">
                                                            Yakında
                                                        </Badge>
                                                    )}
                                                    
                                                    <div className={cn(
                                                        "w-14 h-14 rounded-2xl flex items-center justify-center mb-5 transition-transform group-hover:scale-110",
                                                        game.bg, game.color
                                                    )}>
                                                        <Icon className="w-7 h-7" />
                                                    </div>
                                                    
                                                    <h3 className={cn("font-black text-xl mb-2", game.active ? "text-slate-800 group-hover:text-indigo-600 transition-colors" : "text-slate-500")}>
                                                        {game.title}
                                                    </h3>
                                                    <p className="text-slate-500 text-sm font-medium leading-relaxed">
                                                        {game.desc}
                                                    </p>
                                                    
                                                    {game.active && (
                                                        <div className="mt-auto pt-6 flex items-center text-xs font-black uppercase tracking-widest text-indigo-500 group-hover:translate-x-2 transition-transform">
                                                            Oyuna Başla <ChevronRightIcon className="w-4 h-4 ml-1" />
                                                        </div>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : (
                                /* OYUN SEÇİLDİYSE OYUNU GÖSTER */
                                <div className="w-full animate-in zoom-in-95 duration-500">
                                    <div className="max-w-6xl mx-auto mb-6 flex justify-between items-center">
                                        <Button 
                                            variant="ghost" 
                                            onClick={() => setActiveGame(null)} 
                                            className="text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 font-bold rounded-xl h-12 px-5 transition-colors"
                                        >
                                            <ArrowLeft className="w-5 h-5 mr-2" /> Oyun Seçimine Dön
                                        </Button>
                                        <Badge className="bg-slate-100 text-slate-500 border-none hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg">
                                            <Gamepad2 className="w-4 h-4" /> Zeka Köşesi Modu
                                        </Badge>
                                    </div>
                                    
                                    {/* SEÇİLEN OYUNUN RENDER EDİLMESİ */}
                                    <div className="w-full flex justify-center">
                                        {activeGame === 'sudoku' && <WordSudoku />}
                                        {activeGame === 'crypto' && <CryptoGame />}
                                    </div>
                                </div>
                            )}

                        </div>
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    );
}