'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
    FileText, Search, LayoutGrid, List, ArrowLeft, Loader2, 
    ChevronRight, Folder, Globe, Home
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { getExtraPages } from '@/app/teacher/extra-pages/actions';

export default function ExtraPagesExplorer() {
    const [pages, setPages] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [activeCategory, setActiveClass] = useState<string>('all');

    // Cihazı algılayıp varsayılan görünüm modunu ayarla
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
            const res = await getExtraPages(true); // Sadece yayınlanmış olanları getir
            if (res.success) {
                setPages(res.data || []);
            }
            setIsLoading(false);
        };
        fetchPages();
    }, []);

    const categories = useMemo(() => {
        const cats = new Set<string>();
        pages.forEach(p => {
            if (p.category) cats.add(p.category.split('/')[0]);
        });
        return Array.from(cats).sort();
    }, [pages]);

    const filteredPages = useMemo(() => {
        return pages.filter(p => {
            const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCat = activeCategory === 'all' || p.category?.startsWith(activeCategory);
            return matchesSearch && matchesCat;
        });
    }, [pages, searchTerm, activeCategory]);

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
            {/* Arka Plan Efektleri */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-indigo-100/50 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-sky-100/50 rounded-full blur-[100px]" />
            </div>

            <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200 shadow-sm">
                <div className="container mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <Button variant="ghost" size="icon" asChild className="rounded-full h-11 w-11 hover:bg-slate-100">
                            <Link href="/"><ArrowLeft className="h-6 w-6 text-slate-600" /></Link>
                        </Button>
                        <div className="flex flex-col">
                            <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none">Döküman Merkezi</h1>
                            <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest mt-1">İnteraktif İçerikler</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input 
                                placeholder="Döküman ara..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 bg-slate-50 border-none rounded-xl h-11 text-sm focus-visible:ring-indigo-500"
                            />
                        </div>
                        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => setViewMode('grid')}
                                className={cn("h-9 w-9 rounded-lg transition-all", viewMode === 'grid' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600")}
                            >
                                <LayoutGrid className="h-5 w-5" />
                            </Button>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => setViewMode('list')}
                                className={cn("h-9 w-9 rounded-lg transition-all", viewMode === 'list' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600")}
                            >
                                <List className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8 relative z-10 space-y-8">
                {/* Kategori Filtreleme */}
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
                    <Button 
                        variant={activeCategory === 'all' ? 'default' : 'outline'}
                        onClick={() => setActiveClass('all')}
                        className={cn("rounded-full px-6 h-9 font-bold text-xs uppercase tracking-wider transition-all", activeCategory === 'all' ? "bg-indigo-600 shadow-lg shadow-indigo-200 text-white" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50")}
                    >
                        TÜMÜ
                    </Button>
                    {categories.map(cat => (
                        <Button 
                            key={cat}
                            variant={activeCategory === cat ? 'default' : 'outline'}
                            onClick={() => setActiveClass(cat)}
                            className={cn("rounded-full px-6 h-9 font-bold text-xs uppercase tracking-wider transition-all", activeCategory === cat ? "bg-indigo-600 shadow-lg shadow-indigo-200 text-white" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50")}
                        >
                            {cat}
                        </Button>
                    ))}
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-indigo-500" /></div>
                ) : (
                    <div className={cn(
                        viewMode === 'grid' 
                            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" 
                            : "max-w-4xl mx-auto space-y-3"
                    )}>
                        {filteredPages.length > 0 ? filteredPages.map((item) => (
                            <Link key={item.id} href={`/extra/${item.id}`} className="group block h-full">
                                <Card className={cn(
                                    "transition-all duration-300 hover:shadow-2xl border-slate-200 bg-white overflow-hidden",
                                    viewMode === 'grid' ? "h-full rounded-[2.5rem] flex flex-col" : "rounded-2xl flex flex-row items-center p-4"
                                )}>
                                    {viewMode === 'grid' ? (
                                        <>
                                            <CardHeader className="pb-4">
                                                <div className="p-3 bg-indigo-50 w-fit rounded-2xl text-indigo-600 mb-3 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                                                    <FileText className="h-6 w-6" />
                                                </div>
                                                <CardTitle className="text-xl leading-tight group-hover:text-indigo-600 transition-colors uppercase font-black tracking-tight">{item.title}</CardTitle>
                                            </CardHeader>
                                            <CardContent className="flex-grow pb-6">
                                                <p className="text-sm text-slate-500 line-clamp-3 leading-relaxed">
                                                    {item.description || "İnteraktif ders materyali ve döküman içeriği."}
                                                </p>
                                            </CardContent>
                                            <CardFooter className="pt-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                                                <Badge variant="outline" className="bg-white border-slate-200 text-[10px] uppercase font-black text-slate-500 tracking-widest">{item.category || 'Genel'}</Badge>
                                                <div className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all shadow-sm">
                                                    <ChevronRight className="h-5 w-5" />
                                                </div>
                                            </CardFooter>
                                        </>
                                    ) : (
                                        <>
                                            <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600 mr-4 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                                                <FileText className="h-6 w-6" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-black text-slate-900 group-hover:text-indigo-600 transition-colors truncate text-lg tracking-tight uppercase">{item.title}</h3>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <Badge variant="outline" className="bg-transparent border-slate-200 text-[9px] text-slate-400 font-black uppercase tracking-widest h-4">{item.category || 'Genel'}</Badge>
                                                </div>
                                            </div>
                                            <div className="h-10 w-10 rounded-full flex items-center justify-center text-slate-300 group-hover:text-indigo-600 transition-colors ml-4">
                                                <ChevronRight className="h-6 w-6" />
                                            </div>
                                        </>
                                    )}
                                </Card>
                            </Link>
                        )) : (
                            <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
                                <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-slate-400 uppercase tracking-tight">Döküman Bulunamadı</h3>
                                <p className="text-slate-400 text-sm mt-1">Arama kriterlerinizi değiştirmeyi deneyin.</p>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
