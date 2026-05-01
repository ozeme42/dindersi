
'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
    Loader2, ArrowLeft, Globe, Search, Tag, 
    FileText, ChevronRight, LayoutGrid, Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { getExtraPages } from '@/app/teacher/extra-pages/actions';

const MagnificentLightBackground = () => (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-slate-50">
        <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-indigo-50/40 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-emerald-50/40 rounded-full blur-[100px]" />
    </div>
);

export default function ExtraPagesGallery() {
    const [pages, setPages] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [activeCategory, setActiveCategory] = useState("all");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchContent = async () => {
            setIsLoading(true);
            const result = await getExtraPages(true); // Sadece yayınlanmışları getir
            if (result.success && result.data) {
                setPages(result.data);
            } else if (!result.success) {
                setError(result.error || "İçerik yüklenirken bir hata oluştu.");
            }
            setIsLoading(false);
        };
        fetchContent();
    }, []);

    // Dinamik Kategoriler
    const categories = useMemo(() => {
        const cats = new Set<string>();
        pages.forEach(p => { if (p.category) cats.add(p.category); });
        return Array.from(cats).sort();
    }, [pages]);

    // Filtreleme Mantığı
    const filteredPages = useMemo(() => {
        return pages.filter(p => {
            const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                p.description?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = activeCategory === 'all' || p.category === activeCategory;
            return matchesSearch && matchesCategory;
        });
    }, [pages, searchTerm, activeCategory]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-indigo-500"/>
                <p className="text-slate-500 font-bold animate-pulse">Dökümanlar Hazırlanıyor...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] flex flex-col relative overflow-x-hidden font-sans">
            <MagnificentLightBackground />
            
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-sm">
                <div className="container mx-auto px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-5 w-full md:w-auto">
                        <Link href="/">
                            <button className="group relative flex items-center justify-center h-12 px-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300">
                                <ArrowLeft className="h-5 w-5 text-slate-600 group-hover:-translate-x-1 transition-transform" />
                                <span className="ml-2 font-black text-xs uppercase tracking-widest text-slate-600">ANA SAYFA</span>
                            </button>
                        </Link>
                        <div className="hidden md:block h-8 w-[1px] bg-slate-200 mx-2" />
                        <div className="flex flex-col">
                            <h1 className="text-2xl font-black text-slate-800 tracking-tighter">Özel Dökümanlar</h1>
                            <p className="text-[10px] text-indigo-500 font-black uppercase tracking-widest">Ek Kaynaklar ve Bilgilendirme</p>
                        </div>
                    </div>

                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input 
                            placeholder="Döküman ara..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 bg-slate-100 border-none rounded-xl focus-visible:ring-indigo-500"
                        />
                    </div>
                </div>
            </header>

            <main className="flex-1 container mx-auto p-4 sm:p-6 md:p-8 space-y-8 relative z-10">
                
                {error ? (
                     <div className="bg-red-50 border border-red-100 p-8 rounded-3xl text-center max-w-md mx-auto shadow-xl">
                        <Info className="h-12 w-12 text-red-500 mx-auto mb-4" />
                        <p className="text-red-700 font-bold">{error}</p>
                        <Button variant="outline" onClick={() => window.location.reload()} className="mt-4 border-red-200 text-red-600">Tekrar Dene</Button>
                    </div>
                ) : pages.length === 0 ? (
                    <div className="text-center py-20 bg-white/50 rounded-[3rem] border-2 border-dashed border-slate-200">
                        <Globe className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-600 font-bold text-xl">Henüz döküman eklenmemiş.</p>
                        <p className="text-slate-400 text-sm mt-1">Bu bölüm yakında güncellenecektir.</p>
                    </div>
                ) : (
                    <>
                        {/* KATEGORİ MENÜSÜ (Sekmeler) */}
                        {categories.length > 0 && (
                            <div className="flex justify-center">
                                <div className="p-1.5 bg-white border border-slate-200 rounded-2xl shadow-md flex items-center gap-1 overflow-x-auto no-scrollbar max-w-full">
                                    <button 
                                        onClick={() => setActiveCategory('all')}
                                        className={cn(
                                            "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap",
                                            activeCategory === 'all' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "text-slate-500 hover:bg-slate-50 hover:text-indigo-600"
                                        )}
                                    >
                                        Tümü
                                    </button>
                                    {categories.map(cat => (
                                        <button 
                                            key={cat}
                                            onClick={() => setActiveCategory(cat)}
                                            className={cn(
                                                "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap",
                                                activeCategory === cat ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "text-slate-500 hover:bg-slate-50 hover:text-indigo-600"
                                            )}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* DÖKÜMAN LİSTESİ */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                            {filteredPages.length > 0 ? filteredPages.map((page) => (
                                <Link href={`/extra/${page.id}`} key={page.id} className="group">
                                    <Card className="h-full rounded-[2.5rem] border-slate-200 hover:border-indigo-300 hover:shadow-2xl transition-all duration-500 bg-white relative overflow-hidden flex flex-col">
                                        <div className="absolute top-0 left-0 w-full h-1.5 bg-indigo-500 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500" />
                                        
                                        <CardHeader className="pb-4">
                                            <div className="flex justify-between items-start mb-2">
                                                <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-none font-black text-[10px] uppercase tracking-wider px-3">
                                                    {page.category || 'Genel'}
                                                </Badge>
                                                <div className="p-2 bg-slate-50 rounded-xl text-slate-400 group-hover:text-indigo-600 group-hover:bg-indigo-50 transition-colors">
                                                    <FileText className="h-5 w-5" />
                                                </div>
                                            </div>
                                            <CardTitle className="text-xl md:text-2xl font-black text-slate-800 leading-tight group-hover:text-indigo-600 transition-colors line-clamp-2">
                                                {page.title}
                                            </CardTitle>
                                        </CardHeader>

                                        <CardContent className="flex-grow">
                                            <p className="text-slate-500 text-sm leading-relaxed line-clamp-3">
                                                {page.description || "Bu döküman hakkında ek bilgi bulunmuyor."}
                                            </p>
                                        </CardContent>

                                        <CardFooter className="pt-4 border-t border-slate-50 bg-slate-50/30 flex items-center justify-between group-hover:bg-indigo-50/30 transition-colors">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Görüntüle</span>
                                            <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all duration-300">
                                                <ChevronRight className="h-4 w-4" />
                                            </div>
                                        </CardFooter>
                                    </Card>
                                </Link>
                            )) : (
                                <div className="col-span-full py-20 text-center bg-white/50 rounded-3xl border-2 border-dashed border-slate-200">
                                    <LayoutGrid className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                                    <h3 className="text-lg font-bold text-slate-700">Sonuç Bulunamadı</h3>
                                    <p className="text-slate-500 text-sm">Arama kriterlerinize uygun döküman bulunmuyor.</p>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </main>

            {/* Footer Alanı */}
            <footer className="mt-auto py-8 border-t border-slate-200 bg-white/80">
                <div className="container mx-auto px-6 text-center">
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em]">Din Dersi Atölyesi &copy; {new Date().getFullYear()}</p>
                </div>
            </footer>
        </div>
    );
}
