'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
    Folder, FileText, Search, ArrowLeft, ChevronRight, 
    MonitorPlay, Loader2, Home, LayoutGrid, List,
    Calendar, Tag, Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { getExtraPages } from '@/app/teacher/extra-pages/actions';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function ExtraPagesExplorer() {
    const [pages, setPages] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    const { toast } = useToast();

    const fetchPages = async () => {
        setIsLoading(true);
        const res = await getExtraPages(true); // Sadece yayındakileri getir
        if (res.success) {
            setPages(res.data || []);
        } else {
            toast({ title: "Hata", description: res.error, variant: "destructive" });
        }
        setIsLoading(false);
    };

    useEffect(() => { fetchPages(); }, []);

    // Kategorilere göre grupla
    const categoriesMap = useMemo(() => {
        const groups: Record<string, any[]> = {};
        pages.forEach(page => {
            const cat = page.category || 'Genel';
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(page);
        });
        return groups;
    }, [pages]);

    const categories = Object.keys(categoriesMap).sort();

    // Filtreleme mantığı
    const filteredItems = useMemo(() => {
        let list = activeCategory ? categoriesMap[activeCategory] : [];
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            if (!activeCategory) {
                // Root'tayken arama yapılıyorsa tüm sayfalarda ara
                return pages.filter(p => p.title.toLowerCase().includes(term));
            }
            return list.filter(p => p.title.toLowerCase().includes(term));
        }
        return list;
    }, [activeCategory, categoriesMap, searchTerm, pages]);

    const isSearchingAll = searchTerm && !activeCategory;

    return (
        <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans text-slate-900 pb-20">
            {/* Arka Plan Efekti */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute top-[-10%] left-[-5%] w-[600px] h-[600px] bg-indigo-100/50 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-sky-100/50 rounded-full blur-[120px]" />
            </div>

            {/* Üst Bar */}
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200 shadow-sm">
                <div className="container mx-auto px-6 h-20 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                            <Home className="h-6 w-6 text-slate-600" />
                        </Link>
                        <div className="h-6 w-px bg-slate-200" />
                        <h1 className="text-xl font-black tracking-tight text-slate-800 uppercase flex items-center gap-2">
                            <MonitorPlay className="h-6 w-6 text-indigo-600" />
                            Döküman Arşivi
                        </h1>
                    </div>

                    <div className="flex-1 max-w-md relative hidden md:block">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input 
                            placeholder="Dosyalarda ara..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 bg-slate-100 border-none rounded-xl focus-visible:ring-indigo-500 h-11"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => setViewMode('grid')}
                            className={cn("rounded-lg", viewMode === 'grid' && "bg-indigo-50 text-indigo-600")}
                        >
                            <LayoutGrid className="h-5 w-5" />
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => setViewMode('list')}
                            className={cn("rounded-lg", viewMode === 'list' && "bg-indigo-50 text-indigo-600")}
                        >
                            <List className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-6 py-8 relative z-10 flex-grow">
                {/* Gezgin Başlığı ve Geri Butonu */}
                <div className="flex items-center gap-3 mb-8">
                    {activeCategory && (
                        <Button 
                            variant="ghost" 
                            onClick={() => setActiveCategory(null)}
                            className="bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm"
                        >
                            <ArrowLeft className="h-5 w-5 mr-2" /> Üst Dizine Dön
                        </Button>
                    )}
                    <nav className="flex items-center text-sm font-bold text-slate-400 uppercase tracking-widest overflow-x-auto no-scrollbar">
                        <span className={cn("cursor-pointer hover:text-indigo-600 transition-colors", !activeCategory && "text-indigo-600")}>ARŞİV</span>
                        {activeCategory && (
                            <>
                                <ChevronRight className="h-4 w-4 mx-2 shrink-0" />
                                <span className="text-slate-800 whitespace-nowrap">{activeCategory}</span>
                            </>
                        )}
                        {searchTerm && (
                            <>
                                <ChevronRight className="h-4 w-4 mx-2 shrink-0" />
                                <span className="text-indigo-600 whitespace-nowrap italic">Arama: {searchTerm}</span>
                            </>
                        )}
                    </nav>
                </div>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-32 gap-4">
                        <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
                        <p className="text-slate-500 font-medium">Dosyalar listeleniyor...</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* KATEGORİ KLASÖRLERİ (Sadece Root'tayken göster) */}
                        {!activeCategory && !searchTerm && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 animate-in fade-in slide-in-from-bottom-4">
                                {categories.map(cat => (
                                    <button 
                                        key={cat}
                                        onClick={() => setActiveCategory(cat)}
                                        className="group flex flex-col items-center gap-3 p-4 rounded-[2rem] hover:bg-white hover:shadow-xl transition-all duration-300 active:scale-95"
                                    >
                                        <div className="relative">
                                            <Folder className="h-24 w-24 text-amber-400 fill-amber-400/20 group-hover:fill-amber-400/40 transition-all drop-shadow-sm" />
                                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-sm px-2 py-0.5 rounded-full border border-amber-200 text-[10px] font-black text-amber-700">
                                                {categoriesMap[cat].length}
                                            </div>
                                        </div>
                                        <span className="text-sm font-black text-slate-700 uppercase tracking-tight text-center line-clamp-2">
                                            {cat}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* DOSYA LİSTESİ (Kategori içindeyken veya arama yaparken göster) */}
                        {(activeCategory || searchTerm) && (
                            <div className={cn(
                                "animate-in fade-in slide-in-from-bottom-4 duration-500",
                                viewMode === 'grid' 
                                    ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6" 
                                    : "flex flex-col gap-2"
                            )}>
                                {filteredItems.length > 0 ? filteredItems.map((page) => (
                                    viewMode === 'grid' ? (
                                        <Link key={page.id} href={`/extra/${page.id}`}>
                                            <Card className="group h-full rounded-[2rem] border-slate-200 hover:shadow-2xl transition-all duration-300 overflow-hidden bg-white hover:-translate-y-1">
                                                <div className="relative aspect-video w-full bg-slate-50 flex items-center justify-center border-b border-slate-100">
                                                    <FileText className="h-16 w-16 text-indigo-200 group-hover:text-indigo-400 transition-colors" />
                                                    {isSearchingAll && (
                                                        <Badge variant="secondary" className="absolute top-2 right-2 text-[10px] bg-white/80 backdrop-blur-sm">
                                                            {page.category}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <CardHeader className="p-5">
                                                    <CardTitle className="text-base font-bold text-slate-800 line-clamp-2 group-hover:text-indigo-600 transition-colors leading-tight">
                                                        {page.title}
                                                    </CardTitle>
                                                    <CardDescription className="text-[11px] font-medium text-slate-400 flex items-center gap-1 mt-1 uppercase">
                                                        <Clock className="h-3 w-3" /> {page.updatedAt ? new Date(page.updatedAt).toLocaleDateString('tr-TR') : 'YENİ'}
                                                    </CardDescription>
                                                </CardHeader>
                                            </Card>
                                        </Link>
                                    ) : (
                                        <Link key={page.id} href={`/extra/${page.id}`}>
                                            <div className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all group">
                                                <div className="p-3 bg-slate-50 rounded-xl group-hover:bg-white transition-colors">
                                                    <FileText className="h-6 w-6 text-indigo-400" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-bold text-slate-800 truncate">{page.title}</h3>
                                                    <div className="flex items-center gap-3 mt-0.5">
                                                        {isSearchingAll && <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">{page.category}</span>}
                                                        <span className="text-[10px] text-slate-400 font-medium">{page.updatedAt ? new Date(page.updatedAt).toLocaleDateString('tr-TR') : 'YENİ'}</span>
                                                    </div>
                                                </div>
                                                <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                                            </div>
                                        </Link>
                                    )
                                )) : (
                                    <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
                                        <FileText className="h-16 w-16 text-slate-200 mx-auto mb-4" />
                                        <h3 className="text-xl font-bold text-slate-800">Dosya Bulunamadı</h3>
                                        <p className="text-slate-500 mt-1">Arama kriterlerinize uygun döküman mevcut değil.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}

function ArrowRight(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
        </svg>
    )
}
