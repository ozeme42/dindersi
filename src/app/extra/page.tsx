'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
    Folder, FileText, Search, ArrowLeft, ChevronRight, 
    Loader2, Clock, Grid, List as ListIcon, 
    LayoutGrid, Calendar, Filter, ArrowUpLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
    Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { getExtraPages } from '@/app/teacher/extra-pages/actions';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function ExtraPagesGallery() {
    const [pages, setPages] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentFolder, setCurrentFolder] = useState<string | null>(null);
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

    // Kategorileri (Klasörleri) belirle
    const categories = useMemo(() => {
        const cats = Array.from(new Set(pages.map(p => p.category || 'Genel')));
        return cats.sort();
    }, [pages]);

    // Filtreleme mantığı
    const filteredContent = useMemo(() => {
        let result = pages;
        
        // Arama varsa klasör yapısını bozup tüm dökümanları göster
        if (searchTerm) {
            return result.filter(p => 
                p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.description?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Klasör içindeysek sadece o kategoriyi göster
        if (currentFolder) {
            return result.filter(p => (p.category || 'Genel') === currentFolder);
        }

        // Ana dizindeysek döküman gösterme (sadece klasörler görünecek)
        return [];
    }, [pages, searchTerm, currentFolder]);

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
                    <p className="text-slate-500 font-medium animate-pulse">Dosya Sistemi Hazırlanıyor...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20 selection:bg-indigo-100">
            {/* Arkaplan Süslemeleri */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-sky-500/5 rounded-full blur-[100px]" />
            </div>

            {/* Header */}
            <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200 shadow-sm">
                <div className="container mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/">
                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-slate-100">
                                <ArrowLeft className="h-5 w-5 text-slate-600" />
                            </Button>
                        </Link>
                        <div className="flex flex-col">
                            <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase leading-none">Döküman Arşivi</h1>
                            <p className="text-[10px] text-indigo-600 font-black uppercase tracking-widest mt-1">Dosya Gezgini</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input 
                                placeholder="Dökümanlarda ara..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 bg-slate-100 border-none rounded-xl h-11 focus-visible:ring-indigo-500"
                            />
                        </div>
                        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                            <Button 
                                variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
                                size="icon" 
                                onClick={() => setViewMode('grid')}
                                className={cn("h-9 w-9 rounded-lg", viewMode === 'grid' && "bg-white shadow-sm")}
                            >
                                <Grid className="h-4 w-4" />
                            </Button>
                            <Button 
                                variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
                                size="icon" 
                                onClick={() => setViewMode('list')}
                                className={cn("h-9 w-9 rounded-lg", viewMode === 'list' && "bg-white shadow-sm")}
                            >
                                <ListIcon className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8 relative z-10">
                {/* Breadcrumb / Navigation */}
                <div className="flex items-center gap-2 mb-8 p-3 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto no-scrollbar">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => { setCurrentFolder(null); setSearchTerm(""); }}
                        className={cn("h-8 rounded-lg font-bold text-xs gap-1.5", !currentFolder ? "bg-indigo-50 text-indigo-700" : "text-slate-500")}
                    >
                        <LayoutGrid className="h-3.5 w-3.5" /> KÖK DİZİN
                    </Button>
                    
                    {currentFolder && (
                        <>
                            <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />
                            <Badge className="bg-indigo-600 text-white hover:bg-indigo-600 px-3 py-1 rounded-lg font-bold shadow-md shadow-indigo-200 animate-in slide-in-from-left-2">
                                <Folder className="h-3 w-3 mr-1.5 fill-white/20" /> {currentFolder.toUpperCase()}
                            </Badge>
                        </>
                    )}
                </div>

                {/* Explorer View */}
                <div className="space-y-10">
                    {/* KLASÖRLER (Sadece ana dizindeyken veya arama yokken görünür) */}
                    {!currentFolder && !searchTerm && (
                        <div className="space-y-4">
                            <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Kategoriler</h2>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                {categories.map(cat => (
                                    <button 
                                        key={cat}
                                        onClick={() => setCurrentFolder(cat)}
                                        className="group relative flex flex-col items-center justify-center p-6 bg-white rounded-[2rem] border border-slate-200 hover:border-indigo-400 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300"
                                    >
                                        <div className="relative mb-4">
                                            <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full scale-0 group-hover:scale-100 transition-transform" />
                                            <Folder className="h-16 w-16 text-indigo-500 fill-indigo-500/10 group-hover:fill-indigo-500/20 group-hover:scale-110 transition-all duration-300" />
                                        </div>
                                        <span className="font-black text-xs text-slate-700 group-hover:text-indigo-700 uppercase tracking-wider text-center line-clamp-1">{cat}</span>
                                        <Badge variant="secondary" className="absolute top-2 right-2 text-[9px] bg-slate-100 text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                                            {pages.filter(p => (p.category || 'Genel') === cat).length}
                                        </Badge>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* DOSYALAR */}
                    {(currentFolder || searchTerm) && (
                        <div className="space-y-4 animate-in fade-in duration-500">
                            <div className="flex items-center justify-between ml-2">
                                <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">
                                    {searchTerm ? `ARAMA SONUÇLARI (${filteredContent.length})` : `DÖKÜMANLAR (${filteredContent.length})`}
                                </h2>
                                {currentFolder && !searchTerm && (
                                    <Button variant="ghost" size="sm" onClick={() => setCurrentFolder(null)} className="h-7 text-[10px] font-black text-indigo-600 hover:bg-indigo-50">
                                        <ArrowUpLeft className="h-3 w-3 mr-1" /> ÜST DİZİNE DÖN
                                    </Button>
                                )}
                            </div>

                            {filteredContent.length > 0 ? (
                                <div className={cn(
                                    "grid gap-4",
                                    viewMode === 'grid' ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4" : "grid-cols-1"
                                )}>
                                    {filteredContent.map(page => (
                                        <Link key={page.id} href={`/extra/${page.id}`}>
                                            <Card className={cn(
                                                "group h-full border-slate-200 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 overflow-hidden",
                                                viewMode === 'list' && "flex flex-row items-center p-1"
                                            )}>
                                                <CardHeader className={cn("relative", viewMode === 'list' ? "p-4 space-y-0" : "pb-4")}>
                                                    <div className={cn(
                                                        "flex items-center gap-3",
                                                        viewMode === 'list' ? "" : "flex-col text-center"
                                                    )}>
                                                        <div className="p-3 bg-slate-50 rounded-2xl text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                                            <FileText className="h-8 w-8" />
                                                        </div>
                                                        <div className={viewMode === 'list' ? "flex-1" : "space-y-1"}>
                                                            <CardTitle className="text-base font-bold text-slate-800 line-clamp-1 group-hover:text-indigo-700 transition-colors">
                                                                {page.title}
                                                            </CardTitle>
                                                            <CardDescription className="text-[11px] font-medium text-slate-400 flex items-center gap-1 mt-1 uppercase">
                                                                <Clock className="h-3 w-3" /> {page.updatedAt ? new Date(page.updatedAt).toLocaleDateString('tr-TR') : 'YENİ'}
                                                            </CardDescription>
                                                        </div>
                                                    </div>
                                                </CardHeader>
                                                {viewMode === 'grid' && (
                                                    <>
                                                        <CardContent className="pb-4">
                                                            <p className="text-xs text-slate-500 line-clamp-2 min-h-[2.5rem]">
                                                                {page.description || "Döküman içeriğini görüntülemek için tıklayın."}
                                                            </p>
                                                        </CardContent>
                                                        <CardFooter className="pt-4 border-t border-slate-50 bg-slate-50/30 flex items-center justify-between">
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{page.category || 'Genel'}</span>
                                                            <div className="flex items-center text-[10px] font-black text-indigo-600 group-hover:translate-x-1 transition-transform">
                                                                GÖRÜNTÜLE <ChevronRight className="h-3 w-3 ml-0.5" />
                                                            </div>
                                                        </CardFooter>
                                                    </>
                                                )}
                                            </Card>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-slate-200">
                                    <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                                    <h3 className="text-lg font-semibold text-slate-900">Dosya Bulunamadı</h3>
                                    <p className="text-slate-500 max-w-xs mx-auto mt-1">Bu klasör henüz boş veya arama kriterine uygun dosya yok.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
