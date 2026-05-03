
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
    Plus, Search, Globe, Eye, EyeOff, 
    Loader2, MoreVertical, LayoutGrid, List, Tag, Settings2,
    ChevronRight, Folder, FileText, ArrowLeft, Clock,
    LayoutDashboard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { getExtraPages } from '@/app/teacher/extra-pages/actions';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function ExtraPagesExplorer() {
    const [pages, setPages] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPath, setCurrentPath] = useState<string[]>([]); // Klasör yolu hiyerarşisi
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    
    const { toast } = useToast();

    // Mobil kontrolü ve varsayılan görünüm
    useEffect(() => {
        if (typeof window !== 'undefined') {
            if (window.innerWidth < 768) {
                setViewMode('list');
            }
        }
    }, []);

    const fetchPages = async () => {
        setIsLoading(true);
        // Sadece yayındaki sayfaları getiriyoruz (Ziyaretçi sayfası olduğu için)
        const res = await getExtraPages(true);
        if (res.success) {
            // Firestore sorgu kısıtlamaları nedeniyle alanı eksik olan verileri kurtaralım
            const processed = (res.data || []).map((p: any) => ({
                ...p,
                category: p.category || 'Genel',
                isPublished: p.isPublished ?? true
            }));
            setPages(processed);
        } else {
            toast({ title: "Hata", description: "Dökümanlar yüklenemedi.", variant: "destructive" });
        }
        setIsLoading(false);
    };

    useEffect(() => { fetchPages(); }, []);

    // Mevcut klasör seviyesindeki dökümanları ve alt klasörleri ayıkla
    const { currentFolders, currentFiles } = useMemo(() => {
        const pathStr = currentPath.join('/');
        const folders = new Set<string>();
        const files: any[] = [];

        pages.forEach(page => {
            const cat = page.category || 'Genel';
            
            // Eğer döküman tam olarak bu klasördeyse (Direkt dosya)
            if (cat === pathStr || (pathStr === "" && cat === "Genel")) {
                files.push(page);
            } 
            // Eğer döküman bu klasörün altındaki bir alt klasördeyse (Klasör göster)
            else if (pathStr === "" || cat.startsWith(pathStr + '/')) {
                const relativePath = pathStr === "" ? cat : cat.slice(pathStr.length + 1);
                const firstPart = relativePath.split('/')[0];
                if (firstPart) folders.add(firstPart);
            }
        });

        return { 
            currentFolders: Array.from(folders).sort(), 
            currentFiles: files.sort((a, b) => a.title.localeCompare(b.title, 'tr'))
        };
    }, [pages, currentPath]);

    const navigateToFolder = (folderName: string) => {
        setCurrentPath([...currentPath, folderName]);
    };

    const navigateBack = () => {
        setCurrentPath(currentPath.slice(0, -1));
    };

    const navigateToBreadcrumb = (index: number) => {
        setCurrentPath(currentPath.slice(0, index + 1));
    };

    // Arama filtrelemesi (Sadece dosyalarda arar)
    const searchedFiles = useMemo(() => {
        if (!searchTerm) return currentFiles;
        return pages.filter(p => 
            p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
            p.description?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [currentFiles, pages, searchTerm]);

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
            {/* Arka Plan Efekti */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-indigo-100/40 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-sky-100/40 rounded-full blur-[120px]" />
            </div>

            <div className="container mx-auto p-4 md:p-8 relative z-10 max-w-7xl space-y-6">
                
                {/* ÜST BAR: Navigasyon ve Mod Seçimi */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/80 backdrop-blur-xl p-4 md:p-6 rounded-[2.5rem] border border-white shadow-xl">
                    <div className="flex items-center gap-4">
                        <Link href="/">
                            <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl bg-slate-100 hover:bg-indigo-100 text-indigo-600 transition-all">
                                <ArrowLeft className="h-6 w-6" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-black tracking-tight text-slate-800 uppercase">Döküman Merkezi</h1>
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-0.5">Özel Ders Materyalleri</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl">
                        <Button 
                            variant={viewMode === 'grid' ? 'default' : 'ghost'} 
                            size="sm" 
                            onClick={() => setViewMode('grid')}
                            className={cn("rounded-xl h-10 px-4", viewMode === 'grid' ? "bg-white text-indigo-600 shadow-sm hover:bg-white" : "text-slate-500")}
                        >
                            <LayoutGrid className="h-4 w-4 mr-2" /> <span className="hidden sm:inline">Izgara</span>
                        </Button>
                        <Button 
                            variant={viewMode === 'list' ? 'default' : 'ghost'} 
                            size="sm" 
                            onClick={() => setViewMode('list')}
                            className={cn("rounded-xl h-10 px-4", viewMode === 'list' ? "bg-white text-indigo-600 shadow-sm hover:bg-white" : "text-slate-500")}
                        >
                            <List className="h-4 w-4 mr-2" /> <span className="hidden sm:inline">Liste</span>
                        </Button>
                    </div>
                </div>

                {/* ARAMA VE BREADCRUMB */}
                <div className="flex flex-col gap-4">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                        <Input 
                            placeholder="Dökümanlarda ara..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-12 h-14 bg-white/70 border-white rounded-2xl shadow-sm focus-visible:ring-indigo-500 focus-visible:bg-white transition-all text-lg"
                        />
                    </div>

                    {!searchTerm && (
                        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2 px-2 bg-white/40 rounded-xl">
                            <button 
                                onClick={() => setCurrentPath([])}
                                className={cn(
                                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-all",
                                    currentPath.length === 0 ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "text-slate-500 hover:bg-white"
                                )}
                            >
                                <Home className="h-4 w-4" /> Ana Dizin
                            </button>
                            {currentPath.map((folder, i) => (
                                <React.Fragment key={i}>
                                    <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />
                                    <button 
                                        onClick={() => navigateToBreadcrumb(i)}
                                        className={cn(
                                            "px-3 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap transition-all",
                                            i === currentPath.length - 1 ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "text-slate-500 hover:bg-white"
                                        )}
                                    >
                                        {folder}
                                    </button>
                                </React.Fragment>
                            ))}
                        </div>
                    )}
                </div>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-32 space-y-4">
                        <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs animate-pulse">İçerikler Hazırlanıyor</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* KLASÖRLER (Arama yoksa gösterilir) */}
                        {!searchTerm && currentFolders.length > 0 && (
                            <div className="space-y-4">
                                <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Klasörler</h2>
                                <div className={cn(
                                    "grid gap-4",
                                    viewMode === 'grid' ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6" : "grid-cols-1"
                                )}>
                                    {currentFolders.map(folder => (
                                        <button
                                            key={folder}
                                            onClick={() => navigateToFolder(folder)}
                                            className={cn(
                                                "group flex items-center bg-white border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all active:scale-95 text-left overflow-hidden",
                                                viewMode === 'grid' ? "flex-col p-6 rounded-[2rem] text-center" : "flex-row p-4 rounded-2xl gap-4"
                                            )}
                                        >
                                            <div className={cn(
                                                "rounded-2xl bg-amber-50 text-amber-500 group-hover:bg-amber-500 group-hover:text-white transition-colors flex items-center justify-center shadow-inner",
                                                viewMode === 'grid' ? "w-16 h-16 mb-4" : "w-10 h-10"
                                            )}>
                                                <Folder className={cn(viewMode === 'grid' ? "h-8 w-8" : "h-5 w-5")} fill="currentColor" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <span className="font-black text-slate-800 text-base block truncate uppercase tracking-tight">{folder}</span>
                                                {viewMode === 'list' && <span className="text-[10px] text-slate-400 font-bold">ALT KLASÖR</span>}
                                            </div>
                                            {viewMode === 'list' && <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* DOSYALAR (Dökümanlar) */}
                        <div className="space-y-4">
                            <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] ml-2">
                                {searchTerm ? "Arama Sonuçları" : "Dökümanlar"}
                            </h2>
                            {searchedFiles.length > 0 ? (
                                <div className={cn(
                                    "grid gap-4",
                                    viewMode === 'grid' ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1"
                                )}>
                                    {searchedFiles.map((page) => (
                                        <Link key={page.id} href={`/extra/${page.id}`}>
                                            <Card className={cn(
                                                "group overflow-hidden border-slate-200 hover:border-indigo-400 hover:shadow-2xl transition-all duration-300 cursor-pointer active:scale-[0.98]",
                                                viewMode === 'grid' ? "rounded-[2.5rem] h-full flex flex-col" : "rounded-2xl flex flex-row items-center"
                                            )}>
                                                <CardHeader className={cn("relative z-10", viewMode === 'grid' ? "pb-2" : "p-4 pr-0 flex-1")}>
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                                                            <FileText className="h-4 w-4" />
                                                        </div>
                                                        {viewMode === 'grid' && (
                                                            <Badge variant="secondary" className="bg-slate-100 text-slate-500 text-[9px] font-bold uppercase py-0 px-2 h-5 border-none">
                                                                DÖKÜMAN
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <CardTitle className={cn("font-black tracking-tight group-hover:text-indigo-600 transition-colors", viewMode === 'grid' ? "text-xl leading-tight" : "text-base")}>
                                                        {page.title}
                                                    </CardTitle>
                                                    <CardDescription className="text-[11px] font-medium text-slate-400 flex items-center gap-1 mt-1 uppercase">
                                                        <Clock className="h-3 w-3" /> {page.updatedAt ? new Date(page.updatedAt).toLocaleDateString('tr-TR') : 'YENİ'}
                                                    </CardDescription>
                                                </CardHeader>
                                                
                                                {viewMode === 'grid' && (
                                                    <CardContent className="pb-6">
                                                        <p className="text-sm text-slate-500 line-clamp-2 italic font-medium leading-snug">
                                                            {page.description || "İncelemek için tıklayın."}
                                                        </p>
                                                    </CardContent>
                                                )}

                                                <CardFooter className={cn(
                                                    "bg-slate-50/50 group-hover:bg-indigo-50/50 transition-colors border-t border-slate-100 mt-auto",
                                                    viewMode === 'grid' ? "p-4 justify-between" : "p-4 border-t-0 border-l"
                                                )}>
                                                    {viewMode === 'grid' ? (
                                                        <>
                                                            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">İncele</span>
                                                            <ChevronRight className="h-4 w-4 text-indigo-400 group-hover:translate-x-1 transition-transform" />
                                                        </>
                                                    ) : (
                                                        <ChevronRight className="h-6 w-6 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                                                    )}
                                                </CardFooter>
                                            </Card>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200">
                                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <FileText className="h-8 w-8 text-slate-300" />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-800">Döküman Bulunamadı</h3>
                                    <p className="text-sm text-slate-400 mt-1">Bu klasör henüz boş görünüyor.</p>
                                    {currentPath.length > 0 && (
                                        <Button variant="link" onClick={navigateBack} className="mt-4 text-indigo-600 font-bold">
                                            Üst Klasöre Dön
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

