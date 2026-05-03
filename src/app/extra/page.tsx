'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
    Search, Globe, Folder, ArrowLeft, ChevronRight, 
    Loader2, Home, Grid, List, Clock, FileText, 
    Maximize2, FileSearch, ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
    Card, CardContent, CardHeader, CardTitle, 
    CardDescription, CardFooter 
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { getExtraPages } from '@/app/teacher/extra-pages/actions';
import Link from 'next/link';

type ViewMode = 'grid' | 'list';

export default function ExtraPagesExplorer() {
    const [pages, setPages] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPath, setCurrentPath] = useState<string[]>([]);
    const [viewMode, setViewMode] = useState<ViewMode>('grid');

    // Cihaz tipine göre varsayılan görünümü ayarla
    useEffect(() => {
        if (window.innerWidth < 768) {
            setViewMode('list');
        }
    }, []);

    const fetchPages = async () => {
        setIsLoading(true);
        // Sadece yayında olanları getir
        const res = await getExtraPages(true);
        if (res.success) {
            // Firestore alanı eksik olan eski verileri de güvenli bir şekilde işle
            const processed = (res.data || []).map((p: any) => ({
                ...p,
                category: p.category || 'Genel',
                isPublished: p.isPublished !== undefined ? p.isPublished : true
            }));
            setPages(processed);
        }
        setIsLoading(false);
    };

    useEffect(() => { fetchPages(); }, []);

    // Mevcut klasör seviyesindeki içerikleri hesapla
    const explorerData = useMemo(() => {
        const pathStr = currentPath.join('/');
        
        const filtered = pages.filter(p => {
            const matchesSearch = searchTerm === "" || 
                p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.category.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesSearch;
        });

        // Arama yapılıyorsa klasör yapısını bozup düz liste göster
        if (searchTerm !== "") {
            return { folders: [], files: filtered };
        }

        const folders = new Set<string>();
        const files: any[] = [];

        filtered.forEach(p => {
            const cat = p.category;
            if (cat === pathStr || (pathStr === "" && cat === "Genel")) {
                files.push(p);
            } else if (pathStr === "" && cat !== "Genel") {
                folders.add(cat.split('/')[0]);
            } else if (cat.startsWith(pathStr + "/")) {
                const relative = cat.substring(pathStr.length + 1);
                folders.add(relative.split('/')[0]);
            }
        });

        return { 
            folders: Array.from(folders).sort(), 
            files: files.sort((a, b) => a.title.localeCompare(b.title, 'tr'))
        };
    }, [pages, currentPath, searchTerm]);

    const navigateToFolder = (name: string) => {
        setCurrentPath([...currentPath, name]);
        setSearchTerm("");
    };

    const navigateToBreadcrumb = (index: number) => {
        setCurrentPath(currentPath.slice(0, index + 1));
        setSearchTerm("");
    };

    const resetPath = () => {
        setCurrentPath([]);
        setSearchTerm("");
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-indigo-100">
            {/* Arka Plan Efektleri */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-sky-500/5 rounded-full blur-[120px]" />
            </div>

            {/* Sticky Header */}
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200">
                <div className="container mx-auto px-4 h-20 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/">
                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-slate-100">
                                <ArrowLeft className="h-5 w-5 text-slate-600" />
                            </Button>
                        </Link>
                        <div className="flex flex-col">
                            <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none uppercase">Döküman Merkezi</h1>
                            <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest mt-1">Ekstra Sayfalar & Materyaller</p>
                        </div>
                    </div>

                    <div className="hidden md:flex items-center flex-1 max-w-md relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input 
                            placeholder="Dosya veya klasör ara..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 bg-slate-100 border-none rounded-2xl h-11 focus-visible:ring-indigo-500 transition-all"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 mr-2">
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => setViewMode('grid')}
                                className={cn("h-8 w-8 rounded-lg", viewMode === 'grid' ? "bg-white shadow-sm text-indigo-600" : "text-slate-400")}
                            >
                                <Grid className="h-4 w-4" />
                            </Button>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => setViewMode('list')}
                                className={cn("h-8 w-8 rounded-lg", viewMode === 'list' ? "bg-white shadow-sm text-indigo-600" : "text-slate-400")}
                            >
                                <List className="h-4 w-4" />
                            </Button>
                        </div>
                        <Button asChild variant="outline" className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 gap-2 h-11 px-5">
                            <Link href="/teacher/extra-pages"><Settings className="h-4 w-4" /> Yönet</Link>
                        </Button>
                    </div>
                </div>
            </header>

            <main className="flex-1 relative z-10 container mx-auto px-4 py-8">
                
                {/* Mobile Search */}
                <div className="md:hidden mb-6 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input 
                        placeholder="Ara..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 bg-white border-slate-200 rounded-2xl h-12"
                    />
                </div>

                {/* Breadcrumb Navigation */}
                <div className="flex items-center gap-1 mb-8 overflow-x-auto no-scrollbar whitespace-nowrap bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
                    <button 
                        onClick={resetPath}
                        className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors",
                            currentPath.length === 0 ? "bg-indigo-50 text-indigo-600" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
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
                                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-colors",
                                    i === currentPath.length - 1 ? "bg-indigo-50 text-indigo-600" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                                )}
                            >
                                {folder}
                            </button>
                        </React.Fragment>
                    ))}
                </div>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-32 gap-4">
                        <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Dosyalar Listeleniyor...</p>
                    </div>
                ) : (
                    <div className="space-y-10">
                        {/* 1. KLASÖRLER */}
                        {explorerData.folders.length > 0 && (
                            <div className="space-y-4">
                                <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Klasörler ({explorerData.folders.length})</h2>
                                <div className={cn(
                                    "grid gap-4",
                                    viewMode === 'grid' 
                                        ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6" 
                                        : "grid-cols-1"
                                )}>
                                    {explorerData.folders.map(folder => (
                                        <button 
                                            key={folder}
                                            onClick={() => navigateToFolder(folder)}
                                            className={cn(
                                                "group flex transition-all duration-300 rounded-[1.5rem] border border-slate-200 bg-white hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/10",
                                                viewMode === 'grid' ? "flex-col items-center justify-center p-6 gap-3" : "items-center p-4 gap-4"
                                            )}
                                        >
                                            <div className="p-3 bg-amber-50 rounded-2xl group-hover:scale-110 transition-transform">
                                                <Folder className="h-8 w-8 text-amber-500 fill-amber-500/20" />
                                            </div>
                                            <span className="font-bold text-slate-700 text-sm truncate max-w-full">{folder}</span>
                                            {viewMode === 'list' && <ChevronRight className="ml-auto h-4 w-4 text-slate-300 group-hover:text-indigo-400" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 2. DOSYALAR */}
                        {explorerData.files.length > 0 ? (
                            <div className="space-y-4">
                                <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Dökümanlar ({explorerData.files.length})</h2>
                                <div className={cn(
                                    "grid gap-6",
                                    viewMode === 'grid' 
                                        ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" 
                                        : "grid-cols-1"
                                )}>
                                    {explorerData.files.map(page => (
                                        <Link key={page.id} href={`/extra/${page.id}`} className="group">
                                            {viewMode === 'grid' ? (
                                                <Card className="h-full rounded-[2rem] overflow-hidden border-slate-200 group-hover:shadow-2xl group-hover:border-indigo-300 transition-all duration-300 flex flex-col">
                                                    <CardHeader className="pb-4 relative overflow-hidden">
                                                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-sky-500" />
                                                        <div className="flex justify-between items-start mb-4">
                                                            <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600 group-hover:scale-110 transition-transform">
                                                                <FileText className="h-6 w-6" />
                                                            </div>
                                                            <Badge variant="secondary" className="bg-slate-100 text-slate-500 text-[9px] font-black uppercase">
                                                                {page.category.split('/').pop()}
                                                            </Badge>
                                                        </div>
                                                        <CardTitle className="text-xl font-black text-slate-900 leading-tight line-clamp-2">{page.title}</CardTitle>
                                                    </CardHeader>
                                                    <CardContent className="flex-1">
                                                        <p className="text-sm text-slate-500 line-clamp-3 leading-relaxed">{page.description || 'Açıklama belirtilmemiş.'}</p>
                                                    </CardContent>
                                                    <CardFooter className="bg-slate-50/50 border-t border-slate-100 py-3 flex items-center justify-between">
                                                        <div className="flex items-center gap-1.5 text-slate-400">
                                                            <Clock className="h-3 w-3" />
                                                            <span className="text-[10px] font-bold uppercase">{page.updatedAt ? new Date(page.updatedAt).toLocaleDateString('tr-TR') : 'YENİ'}</span>
                                                        </div>
                                                        <div className="bg-indigo-600 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-2 transition-all">
                                                            <ArrowRight className="h-4 w-4" />
                                                        </div>
                                                    </CardFooter>
                                                </Card>
                                            ) : (
                                                <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 group-hover:border-indigo-300 transition-all group-hover:shadow-lg group-hover:shadow-indigo-500/5">
                                                    <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
                                                        <FileText className="h-6 w-6" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-bold text-slate-900 truncate">{page.title}</h3>
                                                        <div className="flex items-center gap-3 mt-1">
                                                            <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider">{page.category.split('/').pop()}</span>
                                                            <span className="text-[10px] text-slate-400 uppercase font-bold">{page.updatedAt ? new Date(page.updatedAt).toLocaleDateString('tr-TR') : 'YENİ'}</span>
                                                        </div>
                                                    </div>
                                                    <Button variant="ghost" size="icon" className="text-slate-300 group-hover:text-indigo-600 group-hover:bg-indigo-50 rounded-xl">
                                                        <ArrowRight className="h-5 w-5" />
                                                    </Button>
                                                </div>
                                            )}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        ) : explorerData.folders.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-40 text-center animate-in fade-in zoom-in-95 duration-500">
                                <div className="p-6 bg-slate-100 rounded-full mb-6">
                                    <FileSearch className="h-16 w-16 text-slate-300" />
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Burada Dosya Yok</h3>
                                <p className="text-slate-500 mt-2 max-w-sm">Bu klasör henüz bir içerik barındırmıyor veya kriterlere uygun döküman bulunamadı.</p>
                                <Button onClick={resetPath} variant="outline" className="mt-8 rounded-xl">
                                    Ana Dizine Dön
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
