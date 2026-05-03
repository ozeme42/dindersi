'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
    Search, ArrowRight, Globe, Home, Settings, 
    FileText, Folder, LayoutGrid, List, ChevronRight,
    Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getExtraPages } from '@/app/teacher/extra-pages/actions';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function ExtraPagesExplorer() {
    const [pages, setPages] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [currentPath, setCurrentPath] = useState<string[]>([]); // Klasör navigasyonu için

    // Verileri çek
    const fetchPages = async () => {
        setIsLoading(true);
        const res = await getExtraPages(true); // Sadece yayınlanmış olanlar
        if (res.success) {
            setPages(res.data || []);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchPages();
        // Mobilde liste, masaüstünde grid varsayılanı
        if (window.innerWidth < 768) {
            setViewMode('list');
        }
    }, []);

    // Filtreleme mantığı
    const filteredItems = useMemo(() => {
        let result = pages;
        
        // Arama varsa her yerden ara
        if (searchTerm) {
            return result.filter(p => 
                p.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                p.category?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Klasör yapısı
        const pathStr = currentPath.join('/');
        
        // Bu seviyedeki klasörleri ve dosyaları ayır
        const structure: any[] = [];
        const folders = new Set<string>();

        result.forEach(p => {
            const cat = p.category || 'Genel';
            if (pathStr === "") {
                const rootPart = cat.split('/')[0];
                if (cat.includes('/')) {
                    folders.add(rootPart);
                } else {
                    structure.push({ type: 'page', ...p });
                }
            } else if (cat === pathStr) {
                structure.push({ type: 'page', ...p });
            } else if (cat.startsWith(pathStr + '/')) {
                const subPart = cat.substring(pathStr.length + 1).split('/')[0];
                folders.add(subPart);
            }
        });

        const folderItems = Array.from(folders).map(f => ({ type: 'folder', name: f }));
        return [...folderItems, ...structure];

    }, [pages, searchTerm, currentPath]);

    const navigateToFolder = (name: string) => {
        setCurrentPath([...currentPath, name]);
    };

    const goBack = () => {
        setCurrentPath(prev => prev.slice(0, -1));
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
            {/* Dekoratif Arka Plan */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-indigo-100/50 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-sky-100/50 rounded-full blur-[100px]" />
            </div>

            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200">
                <div className="container mx-auto px-4 h-20 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-200 hidden sm:block">
                            <Globe className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight uppercase">Döküman Merkezi</h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden md:flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                            <Button 
                                variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
                                size="icon" 
                                onClick={() => setViewMode('grid')}
                                className="h-8 w-8 rounded-md"
                            >
                                <LayoutGrid className="h-4 w-4" />
                            </Button>
                            <Button 
                                variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
                                size="icon" 
                                onClick={() => setViewMode('list')}
                                className="h-8 w-8 rounded-md"
                            >
                                <List className="h-4 w-4" />
                            </Button>
                        </div>
                        <Button asChild variant="outline" className="rounded-xl border-slate-200 h-10 gap-2 font-bold">
                            <Link href="/"><Home className="h-4 w-4" /> <span className="hidden sm:inline">Geri</span></Link>
                        </Button>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8 relative z-10 space-y-8">
                {/* Search & Breadcrumbs */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setCurrentPath([])}
                            className={cn("h-8 rounded-lg font-bold text-xs uppercase tracking-widest", currentPath.length === 0 ? "text-indigo-600 bg-indigo-50" : "text-slate-400")}
                        >
                            KÖK DİZİN
                        </Button>
                        {currentPath.map((p, i) => (
                            <React.Fragment key={i}>
                                <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => setCurrentPath(currentPath.slice(0, i + 1))}
                                    className={cn("h-8 rounded-lg font-bold text-xs uppercase tracking-widest", i === currentPath.length - 1 ? "text-indigo-600 bg-indigo-50" : "text-slate-400")}
                                >
                                    {p}
                                </Button>
                            </React.Fragment>
                        ))}
                    </div>

                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input 
                            placeholder="Dosya veya kategori ara..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 bg-white border-slate-200 rounded-xl h-11 focus-visible:ring-indigo-500"
                        />
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-32 gap-4">
                        <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
                        <p className="font-bold text-slate-400 uppercase tracking-widest text-xs">Dökümanlar Hazırlanıyor</p>
                    </div>
                ) : filteredItems.length > 0 ? (
                    viewMode === 'grid' ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                            {filteredItems.map((item, idx) => (
                                item.type === 'folder' ? (
                                    <button 
                                        key={`folder-${idx}`} 
                                        onClick={() => navigateToFolder(item.name)}
                                        className="group bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all text-center flex flex-col items-center gap-3 active:scale-95"
                                    >
                                        <div className="p-4 bg-amber-50 rounded-2xl text-amber-500 group-hover:scale-110 transition-transform">
                                            <Folder className="h-8 w-8 fill-current" />
                                        </div>
                                        <span className="font-black text-slate-700 uppercase text-xs tracking-widest truncate w-full">{item.name}</span>
                                    </button>
                                ) : (
                                    <Link 
                                        key={item.id} 
                                        href={`/extra/${item.id}`}
                                        className="group flex flex-col h-full"
                                    >
                                        <Card className="flex-1 bg-white rounded-3xl border-slate-200 hover:shadow-xl hover:border-indigo-200 transition-all overflow-hidden border-b-4 border-b-indigo-100">
                                            <CardHeader className="pb-4">
                                                <div className="p-3 bg-indigo-50 w-fit rounded-2xl text-indigo-600 mb-3 group-hover:scale-110 transition-transform">
                                                    <FileText className="h-6 w-6" />
                                                </div>
                                                <CardTitle className="text-lg font-black leading-tight group-hover:text-indigo-600 transition-colors uppercase tracking-tight line-clamp-2 min-h-[3rem]">{item.title}</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                                                    {item.description || "İnteraktif ders materyali ve interaktif döküman içeriği."}
                                                </p>
                                            </CardContent>
                                            <CardFooter className="pt-4 border-t border-slate-50 flex items-center justify-between">
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">GÜNCEL</span>
                                                <ArrowRight className="h-4 w-4 text-indigo-300 group-hover:translate-x-1 transition-transform" />
                                            </CardFooter>
                                        </Card>
                                    </Link>
                                )
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-3">
                             {filteredItems.map((item, idx) => (
                                item.type === 'folder' ? (
                                    <button 
                                        key={`folder-${idx}`} 
                                        onClick={() => navigateToFolder(item.name)}
                                        className="w-full flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200 hover:border-indigo-200 hover:shadow-md transition-all group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="p-2 bg-amber-50 rounded-xl text-amber-500">
                                                <Folder className="h-5 w-5 fill-current" />
                                            </div>
                                            <span className="font-black text-slate-700 uppercase text-sm tracking-widest">{item.name}</span>
                                        </div>
                                        <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-400 transition-colors" />
                                    </button>
                                ) : (
                                    <Link 
                                        key={item.id} 
                                        href={`/extra/${item.id}`}
                                        className="block"
                                    >
                                        <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200 hover:border-indigo-200 hover:shadow-md transition-all group">
                                            <div className="flex items-center gap-4 min-w-0">
                                                <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600 shrink-0">
                                                    <FileText className="h-5 w-5" />
                                                </div>
                                                <div className="truncate">
                                                    <h3 className="font-black text-slate-800 uppercase text-sm tracking-tight truncate">{item.title}</h3>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{item.category || 'Genel'}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 shrink-0 pl-4">
                                                <span className="hidden sm:inline text-[10px] font-bold text-slate-400 uppercase tracking-widest">İncele</span>
                                                <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                                            </div>
                                        </div>
                                    </Link>
                                )
                             ))}
                        </div>
                    )
                ) : (
                    <div className="text-center py-32 bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
                        <FileText className="h-16 w-16 text-slate-200 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-slate-400 uppercase tracking-tighter">İçerik Bulunamadı</h3>
                        <p className="text-slate-400 text-sm mt-1">Arama kriterlerinizi değiştirmeyi deneyin.</p>
                        {currentPath.length > 0 && (
                            <Button onClick={() => setCurrentPath([])} variant="link" className="mt-4 text-indigo-600 font-bold">Kök Dizine Dön</Button>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
