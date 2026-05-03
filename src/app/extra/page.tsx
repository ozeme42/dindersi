'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
    Globe, Search, LayoutGrid, List, FileText, 
    ChevronRight, Clock, ArrowRight, Home, Settings,
    Loader2, Filter, Folder, ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { getExtraPages } from '@/app/teacher/extra-pages/actions';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function ExtraPagesExplorer() {
    const [pages, setPages] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [currentPath, setCurrentPath] = useState<string[]>([]);

    // Verileri Çek
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            const res = await getExtraPages(true); // Sadece yayınlanmış olanlar
            if (res.success) {
                setPages(res.data || []);
            }
            setIsLoading(false);
        };
        fetchData();

        // Akıllı Varsayılan: Mobilde Liste, Masaüstünde Izgara
        if (window.innerWidth < 768) {
            setViewMode('list');
        }
    }, []);

    // Kategorileri Hiyerarşik Olarak Filtrele
    const filteredItems = useMemo(() => {
        const pathStr = currentPath.join('/');
        
        // 1. Arama Yapılıyorsa Hiyerarşiyi Boşver
        if (searchTerm.trim() !== "") {
            return pages.filter(p => 
                p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.category?.toLowerCase().includes(searchTerm.toLowerCase())
            ).map(p => ({ ...p, isFolder: false }));
        }

        // 2. Klasör ve Dosya Mantığı
        const items = new Map<string, any>();

        pages.forEach(page => {
            const cat = page.category || 'Genel';
            const catParts = cat.split('/');
            
            // Mevcut dizin eşleşiyor mu?
            const isMatch = currentPath.every((part, i) => catParts[i] === part);
            
            if (isMatch) {
                const nextPart = catParts[currentPath.length];
                
                if (nextPart) {
                    // Bu bir klasördür
                    if (!items.has(nextPart)) {
                        items.set(nextPart, { 
                            id: `folder-${nextPart}`,
                            title: nextPart, 
                            isFolder: true, 
                            path: [...currentPath, nextPart] 
                        });
                    }
                } else {
                    // Bu bir dökümandır
                    items.set(page.id, { ...page, isFolder: false });
                }
            }
        });

        return Array.from(items.values()).sort((a, b) => {
            if (a.isFolder && !b.isFolder) return -1;
            if (!a.isFolder && b.isFolder) return 1;
            return a.title.localeCompare(b.title, 'tr');
        });
    }, [pages, currentPath, searchTerm]);

    const navigateTo = (path: string[]) => {
        setCurrentPath(path);
        setSearchTerm("");
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
                <p className="text-slate-500 font-bold animate-pulse uppercase tracking-widest text-xs">Dökümanlar Yükleniyor...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans pb-20 selection:bg-indigo-100">
            {/* Dekoratif Arka Plan */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-indigo-50/50 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-sky-50/50 rounded-full blur-[120px]" />
            </div>

            {/* Sticky Header */}
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200">
                <div className="container mx-auto px-4 h-20 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/">
                            <Button variant="ghost" size="icon" className="rounded-full h-11 w-11 hover:bg-slate-100">
                                <ArrowLeft className="h-6 w-6 text-slate-600" />
                            </Button>
                        </Link>
                        <div className="hidden sm:flex items-center gap-3">
                            <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-200">
                                <Globe className="h-6 w-6" />
                            </div>
                            <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">Döküman Merkezi</h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 flex-1 max-w-md">
                        <div className="relative w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input 
                                placeholder="Dökümanlarda ara..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 bg-slate-50 border-slate-200 rounded-2xl h-11 focus-visible:ring-indigo-500 shadow-sm"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => setViewMode('grid')}
                            className={cn("h-9 w-9 rounded-xl transition-all", viewMode === 'grid' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400")}
                        >
                            <LayoutGrid className="h-5 w-5" />
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => setViewMode('list')}
                            className={cn("h-9 w-9 rounded-xl transition-all", viewMode === 'list' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400")}
                        >
                            <List className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8 relative z-10">
                
                {/* Breadcrumbs */}
                <div className="flex items-center gap-2 mb-8 overflow-x-auto no-scrollbar pb-2">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => navigateTo([])}
                        className={cn("rounded-full font-bold text-xs uppercase", currentPath.length === 0 ? "bg-indigo-600 text-white hover:bg-indigo-700" : "text-slate-500")}
                    >
                        <Home className="h-3.5 w-3.5 mr-1.5" /> Ana Dizin
                    </Button>
                    {currentPath.map((part, i) => (
                        <React.Fragment key={i}>
                            <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => navigateTo(currentPath.slice(0, i + 1))}
                                className={cn("rounded-full font-bold text-xs uppercase", i === currentPath.length - 1 ? "bg-indigo-600 text-white hover:bg-indigo-700" : "text-slate-500")}
                            >
                                {part}
                            </Button>
                        </React.Fragment>
                    ))}
                </div>

                {filteredItems.length > 0 ? (
                    <div className={cn(
                        "grid gap-4 md:gap-6",
                        viewMode === 'grid' ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" : "grid-cols-1"
                    )}>
                        {filteredItems.map((item) => (
                            item.isFolder ? (
                                <button 
                                    key={item.id}
                                    onClick={() => navigateTo(item.path)}
                                    className={cn(
                                        "group text-left transition-all duration-300 active:scale-95",
                                        viewMode === 'grid' ? "aspect-square" : "w-full"
                                    )}
                                >
                                    <Card className="h-full border-slate-200 bg-white hover:border-indigo-500/50 hover:shadow-xl transition-all rounded-[2rem] overflow-hidden">
                                        <CardContent className={cn("p-6 flex items-center gap-5 h-full", viewMode === 'grid' && "flex-col justify-center text-center")}>
                                            <div className="p-4 bg-amber-50 rounded-2xl text-amber-500 group-hover:scale-110 transition-transform shadow-sm">
                                                <Folder className="h-8 w-8 fill-current" />
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-black text-slate-800 uppercase tracking-tight truncate text-lg">{item.title}</h3>
                                                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Klasör</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </button>
                            ) : (
                                <Link 
                                    key={item.id} 
                                    href={`/extra/${item.id}`}
                                    className="block group transition-all duration-300 active:scale-95"
                                >
                                    <Card className={cn(
                                        "h-full border-slate-200 bg-white hover:border-indigo-500/50 hover:shadow-xl transition-all rounded-[2rem] overflow-hidden",
                                        viewMode === 'list' && "hover:translate-x-1"
                                    )}>
                                        <div className={cn("flex h-full", viewMode === 'grid' ? "flex-col" : "flex-row items-center")}>
                                            <CardHeader className={cn("pb-4", viewMode === 'list' ? "p-4 pr-0" : "p-6")}>
                                                <div className={cn(
                                                    "p-3 rounded-2xl shadow-sm transition-all",
                                                    viewMode === 'grid' ? "bg-indigo-50 text-indigo-600 w-fit mb-4 group-hover:scale-110" : "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white"
                                                )}>
                                                    <FileText className="h-6 w-6" />
                                                </div>
                                            </CardHeader>
                                            <div className="flex-1 p-6 pt-0 md:pt-6">
                                                <CardTitle className="text-lg font-black text-slate-800 leading-tight group-hover:text-indigo-600 transition-colors uppercase tracking-tighter">
                                                    {item.title}
                                                </CardTitle>
                                                {item.description && (
                                                    <p className="text-xs text-slate-500 line-clamp-2 mt-2 font-medium leading-relaxed">
                                                        {item.description}
                                                    </p>
                                                )}
                                                <div className="flex items-center justify-between mt-4">
                                                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                        <Clock className="h-3 w-3" />
                                                        {item.updatedAt ? format(new Date(item.updatedAt), 'dd.MM.yyyy', { locale: tr }) : '-'}
                                                    </div>
                                                    <div className="bg-indigo-600 text-white p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all shadow-lg shadow-indigo-200">
                                                        <ArrowRight className="h-4 w-4" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                </Link>
                            )
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-32 text-center">
                        <div className="p-8 bg-slate-100 rounded-full mb-6">
                            <FileText className="h-16 w-16 text-slate-300" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-400 uppercase tracking-tighter">Aradığınız döküman bulunamadı</h3>
                        <p className="text-slate-500 mt-2 max-w-sm">Filtreleri temizleyerek veya farklı bir anahtar kelime ile tekrar deneyebilirsiniz.</p>
                        <Button 
                            variant="link" 
                            onClick={() => { setSearchTerm(""); setCurrentPath([]); }}
                            className="mt-6 text-indigo-600 font-bold"
                        >
                            Ana Dizine Dön
                        </Button>
                    </div>
                )}
            </main>
        </div>
    );
}
