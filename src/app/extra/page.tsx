
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
    Plus, Search, Globe, Home, Settings, ArrowRight, 
    FileText, LayoutGrid, List, ChevronRight, 
    Clock, Tag, Folder, BookOpen, Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
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
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    // Cihaz algılama ve varsayılan görünüm
    useEffect(() => {
        if (window.innerWidth < 768) {
            setViewMode('list');
        }
        fetchPages();
    }, []);

    const fetchPages = async () => {
        setIsLoading(true);
        const res = await getExtraPages(true); // Sadece yayınlanmışları getir
        if (res.success) {
            setPages(res.data || []);
        }
        setIsLoading(false);
    };

    const categories = useMemo(() => {
        const cats = new Set<string>();
        pages.forEach(p => {
            const cat = p.category || 'Genel';
            cats.add(cat.split('/')[0]); // Ana kategorileri al
        });
        return Array.from(cats).sort();
    }, [pages]);

    const filteredPages = pages.filter(p => {
        const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             p.category?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCat = selectedCategory === 'all' || p.category?.startsWith(selectedCategory);
        return matchesSearch && matchesCat;
    });

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
            {/* Dekoratif Arka Plan */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-indigo-100/50 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-sky-100/50 rounded-full blur-[120px]" />
            </div>

            {/* Üst Bar */}
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200">
                <div className="container mx-auto px-4 h-20 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-5">
                        <div className="p-3 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl text-white shadow-lg shadow-indigo-200">
                            <Globe className="h-7 w-7" />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight uppercase">Döküman Merkezi</h1>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest hidden sm:block">Dijital Materyaller & Ekstra Sayfalar</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Görünüm Değiştirici */}
                        <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 hidden sm:flex">
                            <Button 
                                variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
                                size="sm" 
                                onClick={() => setViewMode('grid')}
                                className={cn("rounded-lg h-9 w-9 p-0", viewMode === 'grid' && "bg-white shadow-sm")}
                            >
                                <LayoutGrid className="h-4 w-4" />
                            </Button>
                            <Button 
                                variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
                                size="sm" 
                                onClick={() => setViewMode('list')}
                                className={cn("rounded-lg h-9 w-9 p-0", viewMode === 'list' && "bg-white shadow-sm")}
                            >
                                <List className="h-4 w-4" />
                            </Button>
                        </div>

                        <Button asChild variant="ghost" className="rounded-xl h-11 px-4 gap-2 text-slate-600 hover:bg-slate-100">
                            <Link href="/">
                                <Home className="h-5 w-5" /> <span className="hidden md:inline">Ana Sayfa</span>
                            </Link>
                        </Button>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8 relative z-10 space-y-8">
                {/* Filtreler ve Arama */}
                <div className="flex flex-col md:flex-row items-center gap-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="relative w-full md:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input 
                            placeholder="Dosya ara..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 bg-slate-50 border-none rounded-xl focus-visible:ring-indigo-500 h-11"
                        />
                    </div>
                    
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full md:w-auto pb-1 md:pb-0">
                        <button 
                            onClick={() => setSelectedCategory('all')}
                            className={cn(
                                "px-5 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap border-2",
                                selectedCategory === 'all' 
                                    ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100" 
                                    : "bg-white border-slate-100 text-slate-500 hover:border-indigo-200"
                            )}
                        >
                            Tümü
                        </button>
                        {categories.map(cat => (
                            <button 
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={cn(
                                    "px-5 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap border-2",
                                    selectedCategory === cat 
                                        ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100" 
                                        : "bg-white border-slate-100 text-slate-500 hover:border-indigo-200"
                                )}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-20"><Loader2 className="h-12 w-12 animate-spin text-indigo-600" /></div>
                ) : filteredPages.length > 0 ? (
                    viewMode === 'grid' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredPages.map((item) => (
                                <Link href={`/extra/${item.id}`} key={item.id} className="group h-full">
                                    <Card className="h-full flex flex-col rounded-[2rem] border-slate-200 hover:shadow-2xl hover:border-indigo-400/50 transition-all duration-500 overflow-hidden bg-white">
                                        <CardHeader className="pb-4">
                                            <div className="p-2.5 bg-indigo-50 w-fit rounded-xl text-indigo-600 mb-3 group-hover:scale-110 transition-transform">
                                                <FileText className="h-5 w-5" />
                                            </div>
                                            <CardTitle className="text-xl leading-tight group-hover:text-indigo-600 transition-colors uppercase font-black">{item.title}</CardTitle>
                                        </CardHeader>
                                        <CardContent className="flex-grow">
                                            <p className="text-sm text-slate-500 line-clamp-3">
                                                {item.description || "İnteraktif ders materyali ve döküman içeriği."}
                                            </p>
                                        </CardContent>
                                        <CardFooter className="pt-4 border-t border-slate-50 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-bold uppercase text-[9px] px-2">
                                                    {item.category || 'Genel'}
                                                </Badge>
                                            </div>
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                                <ChevronRight className="h-5 w-5" />
                                            </div>
                                        </CardFooter>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredPages.map((item) => (
                                <Link href={`/extra/${item.id}`} key={item.id} className="group block">
                                    <div className="flex items-center justify-between p-5 bg-white rounded-3xl border border-slate-200 hover:border-indigo-400/50 hover:shadow-xl transition-all duration-300">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-slate-100 rounded-2xl text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                                <FileText className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <h3 className="font-black text-slate-900 group-hover:text-indigo-600 transition-colors uppercase">{item.title}</h3>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                                        <Tag className="h-2.5 w-2.5" /> {item.category || 'Genel'}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1">
                                                        <Clock className="h-2.5 w-2.5" /> {item.updatedAt ? format(new Date(item.updatedAt), 'dd.MM.yyyy', { locale: tr }) : '-'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="hidden sm:block text-right pr-4">
                                                <p className="text-xs text-slate-400 line-clamp-1 max-w-[300px] italic">{item.description}</p>
                                            </div>
                                            <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                                                <ChevronRight className="h-6 w-6" />
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )
                ) : (
                    <div className="text-center py-32 bg-white/50 rounded-[3rem] border-4 border-dashed border-slate-200">
                        <BookOpen className="h-20 w-20 text-slate-300 mx-auto mb-6 opacity-50" />
                        <h3 className="text-2xl font-black text-slate-400 uppercase tracking-tight">Kayıt Bulunmadı</h3>
                        <p className="text-slate-500 mt-2">Arama kriterlerinizi değiştirmeyi deneyin.</p>
                    </div>
                )}
            </main>
        </div>
    );
}
