'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
    Folder, FileText, Search, ArrowLeft, ChevronRight, 
    LayoutGrid, List, Clock, Globe, Loader2, ArrowUpLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
    Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { getExtraPages } from '@/app/teacher/extra-pages/actions';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function ExtraPagesExplorer() {
    const [pages, setPages] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentCategory, setCurrentCategory] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    const { toast } = useToast();

    useEffect(() => {
        const fetchPages = async () => {
            const res = await getExtraPages(true); // Only published
            if (res.success) {
                setPages(res.data || []);
            } else {
                toast({ title: "Hata", description: "Sayfalar yüklenemedi.", variant: "destructive" });
            }
            setIsLoading(false);
        };
        fetchPages();
    }, [toast]);

    const categories = useMemo(() => {
        const cats = Array.from(new Set(pages.map(p => p.category || 'Genel')));
        return cats.sort();
    }, [pages]);

    const filteredPages = useMemo(() => {
        let list = pages;
        if (currentCategory) {
            list = list.filter(p => (p.category || 'Genel') === currentCategory);
        }
        if (searchTerm) {
            list = list.filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase()));
        }
        return list;
    }, [pages, currentCategory, searchTerm]);

    if (isLoading) {
        return (
            <div className="h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <Link href="/">
                                <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100">
                                    <ArrowLeft className="h-5 w-5" />
                                </Button>
                            </Link>
                            <div>
                                <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                                    <Globe className="h-6 w-6 text-indigo-600" />
                                    BELGE MERKEZİ
                                </h1>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dijital Kütüphane ve Dökümanlar</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="relative flex-1 md:w-80">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input 
                                    placeholder="Dosya ara..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 bg-slate-50 border-none rounded-xl focus-visible:ring-indigo-500"
                                />
                            </div>
                            <div className="bg-slate-100 p-1 rounded-xl flex gap-1">
                                <Button 
                                    variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
                                    size="icon" 
                                    onClick={() => setViewMode('grid')}
                                    className={cn("h-8 w-8 rounded-lg", viewMode === 'grid' && "bg-white shadow-sm")}
                                >
                                    <LayoutGrid className="h-4 w-4" />
                                </Button>
                                <Button 
                                    variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
                                    size="icon" 
                                    onClick={() => setViewMode('list')}
                                    className={cn("h-8 w-8 rounded-lg", viewMode === 'list' && "bg-white shadow-sm")}
                                >
                                    <List className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8">
                {/* Breadcrumb / Navigation */}
                <div className="flex items-center gap-2 mb-8 text-sm font-medium">
                    <button 
                        onClick={() => setCurrentCategory(null)}
                        className={cn(
                            "px-3 py-1 rounded-full transition-colors",
                            !currentCategory ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-slate-200"
                        )}
                    >
                        Kök Dizin
                    </button>
                    {currentCategory && (
                        <>
                            <ChevronRight className="h-4 w-4 text-slate-300" />
                            <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full">
                                {currentCategory}
                            </span>
                        </>
                    )}
                </div>

                {/* Explorer View */}
                {!currentCategory ? (
                    /* Folder View */
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setCurrentCategory(cat)}
                                className="group flex flex-col items-center gap-3 p-6 rounded-[2rem] bg-white border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all"
                            >
                                <div className="relative">
                                    <Folder className="h-16 w-16 text-amber-400 fill-amber-400/20 group-hover:scale-110 transition-transform" />
                                    <div className="absolute inset-0 flex items-center justify-center pt-2">
                                        <div className="w-6 h-1 bg-amber-500/20 rounded-full" />
                                    </div>
                                </div>
                                <span className="font-bold text-slate-700 uppercase text-xs tracking-wide text-center">{cat}</span>
                                <Badge variant="secondary" className="bg-slate-100 text-slate-500 font-bold border-none text-[10px]">
                                    {pages.filter(p => (p.category || 'Genel') === cat).length} Dosya
                                </Badge>
                            </button>
                        ))}
                    </div>
                ) : (
                    /* File View */
                    <div className={cn(
                        viewMode === 'grid' 
                            ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6" 
                            : "flex flex-col gap-2"
                    )}>
                        <button 
                            onClick={() => setCurrentCategory(null)}
                            className={cn(
                                "group border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center transition-all hover:bg-slate-100 hover:border-slate-300",
                                viewMode === 'grid' ? "aspect-square flex-col gap-2" : "p-4 gap-4"
                            )}
                        >
                            <ArrowUpLeft className="h-8 w-8 text-slate-300 group-hover:scale-110 transition-transform" />
                            <span className="text-xs font-bold text-slate-400">Üst Klasöre Dön</span>
                        </button>

                        {filteredPages.map(page => (
                            <Link key={page.id} href={`/extra/${page.id}`}>
                                <Card className={cn(
                                    "group overflow-hidden border-slate-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full",
                                    viewMode === 'list' && "flex items-center"
                                )}>
                                    <CardHeader className={cn(
                                        "pb-2",
                                        viewMode === 'list' && "flex-1 p-4"
                                    )}>
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                                <FileText className="h-5 w-5" />
                                            </div>
                                        </div>
                                        <CardTitle className="text-base font-bold text-slate-800 line-clamp-2 leading-tight group-hover:text-indigo-600 transition-colors">
                                            {page.title}
                                        </CardTitle>
                                        <CardDescription className="text-[11px] font-medium text-slate-400 flex items-center gap-1 mt-1 uppercase">
                                            <Clock className="h-3 w-3" /> {page.updatedAt ? new Date(page.updatedAt).toLocaleDateString('tr-TR') : 'YENİ'}
                                        </CardDescription>
                                    </CardHeader>
                                    
                                    {viewMode === 'grid' && (
                                        <CardContent className="pb-4">
                                            <p className="text-xs text-slate-500 line-clamp-2 min-h-[2.5rem]">
                                                {page.description || "Açıklama belirtilmemiş."}
                                            </p>
                                        </CardContent>
                                    )}

                                    <CardFooter className={cn(
                                        "pt-3 border-t border-slate-50 bg-slate-50/30 flex items-center justify-between",
                                        viewMode === 'list' && "border-t-0 bg-transparent p-4"
                                    )}>
                                        <span className="text-[10px] font-black text-indigo-600/60 uppercase tracking-widest">Görüntüle</span>
                                        <ChevronRight className="h-4 w-4 text-slate-300 group-hover:translate-x-1 transition-transform" />
                                    </CardFooter>
                                </Card>
                            </Link>
                        ))}
                    </div>
                )}

                {/* Empty State */}
                {filteredPages.length === 0 && searchTerm && (
                    <div className="text-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-slate-200 mt-8">
                        <Search className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-slate-800">Dosya Bulunamadı</h3>
                        <p className="text-slate-500 text-sm">"{searchTerm}" aramasıyla eşleşen bir döküman bulunmuyor.</p>
                        <Button variant="link" onClick={() => setSearchTerm("")} className="mt-4 text-indigo-600">Aramayı Temizle</Button>
                    </div>
                )}
            </main>
        </div>
    );
}
