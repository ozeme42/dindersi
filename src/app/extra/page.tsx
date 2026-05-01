
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
    Loader2, ArrowLeft, Globe, Search, Tag, 
    ChevronRight, BookOpen, Layers, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { getExtraPages } from '@/app/teacher/extra-pages/actions';
import { cn } from '@/lib/utils';

// --- Arka Plan Bileşeni ---
const MagnificentLightBackground = () => (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-slate-50">
        <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-indigo-50/50 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-sky-50/50 rounded-full blur-[120px] animate-pulse delay-700" />
    </div>
);

export default function ExtraPagesGallery() {
    const [pages, setPages] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [activeCategory, setActiveCategory] = useState("all");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPages = async () => {
            setIsLoading(true);
            setError(null);
            try {
                // Sadece yayınlanmış sayfaları getir
                const res = await getExtraPages(true);
                if (res.success) {
                    setPages(res.pages || []);
                } else {
                    setError("Dökümanlar yüklenirken bir hata oluştu.");
                }
            } catch (e) {
                setError("Sistem bağlantısında bir sorun oluştu.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchPages();
    }, []);

    // Dinamik Kategoriler
    const categories = useMemo(() => {
        const cats = Array.from(new Set(pages.map(p => p.category || 'Genel')));
        return ['all', ...cats.sort()];
    }, [pages]);

    // Filtreleme Mantığı
    const filteredPages = pages.filter(page => {
        const matchesSearch = page.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             (page.description && page.description.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesCategory = activeCategory === "all" || page.category === activeCategory;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 relative flex flex-col selection:bg-indigo-100">
            <MagnificentLightBackground />

            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200">
                <div className="container mx-auto px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-5 w-full md:w-auto">
                        <Link href="/">
                            <button className="group relative flex items-center justify-center h-12 px-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all duration-300 overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <div className="relative flex items-center gap-2">
                                    <ArrowLeft className="h-5 w-5 text-slate-600 group-hover:text-white group-hover:-translate-x-1 transition-all duration-300" />
                                    <span className="font-black text-xs uppercase tracking-widest text-slate-600 group-hover:text-white transition-colors duration-300">GERİ</span>
                                </div>
                            </button>
                        </Link>
                        <div className="hidden md:block h-8 w-[1px] bg-slate-200 mx-2" />
                        <div className="flex flex-col">
                            <h1 className="text-2xl font-black text-slate-800 tracking-tighter">Özel Dökümanlar</h1>
                            <p className="text-[10px] text-indigo-500 font-black uppercase tracking-widest">Diğer / Ek Kaynaklar</p>
                        </div>
                    </div>

                    <div className="relative w-full md:w-72 lg:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input 
                            placeholder="Dökümanlarda ara..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 bg-slate-100/50 border-slate-200 rounded-xl focus-visible:ring-indigo-500 h-11"
                        />
                    </div>
                </div>
            </header>

            <main className="flex-1 container mx-auto p-4 md:p-8 space-y-8 relative z-10">
                
                {/* Kategori Tabları */}
                {!isLoading && categories.length > 2 && (
                    <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full overflow-x-auto no-scrollbar">
                        <TabsList className="bg-slate-100/80 p-1.5 rounded-full border border-slate-200 h-auto inline-flex gap-2 shadow-inner">
                            {categories.map((cat) => (
                                <TabsTrigger 
                                    key={cat}
                                    value={cat} 
                                    className="rounded-full px-6 py-2.5 font-bold text-xs uppercase tracking-widest transition-all data-[state=active]:text-white data-[state=active]:bg-indigo-600 data-[state=active]:shadow-lg"
                                >
                                    {cat === 'all' ? 'TÜMÜ' : cat}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </Tabs>
                )}

                {/* İçerik */}
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-32 gap-4">
                        <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
                        <p className="text-slate-400 font-bold animate-pulse uppercase tracking-widest text-xs">İçerikler Hazırlanıyor...</p>
                    </div>
                ) : error ? (
                    <div className="max-w-md mx-auto text-center py-20 bg-white rounded-[3rem] border border-red-100 shadow-xl p-8">
                        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
                            <Layers className="h-10 w-10" />
                        </div>
                        <h2 className="text-xl font-black text-slate-800 mb-2">BİR SORUN OLUŞTU</h2>
                        <p className="text-slate-500 text-sm mb-6">{error}</p>
                        <Button onClick={() => window.location.reload()} className="bg-slate-900 rounded-xl">Tekrar Dene</Button>
                    </div>
                ) : filteredPages.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        {filteredPages.map((page, index) => (
                            <Link key={page.id} href={`/extra/${page.id}`} className="group h-full">
                                <Card className="h-full rounded-[2.5rem] border-slate-200 hover:border-indigo-300 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500 flex flex-col bg-white overflow-hidden relative">
                                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
                                    
                                    <CardHeader className="pb-4">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="p-3 bg-slate-50 rounded-2xl text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-500">
                                                <BookOpen className="h-6 w-6" />
                                            </div>
                                            <Badge className="bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-100 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                                                {page.category || 'Genel'}
                                            </Badge>
                                        </div>
                                        <CardTitle className="text-xl font-black tracking-tight leading-tight group-hover:text-indigo-600 transition-colors">
                                            {page.title}
                                        </CardTitle>
                                    </CardHeader>

                                    <CardContent className="flex-1 flex flex-col justify-between">
                                        <p className="text-slate-500 text-sm leading-relaxed line-clamp-3 italic">
                                            "{page.description || "Bu döküman için açıklama eklenmemiş."}"
                                        </p>
                                        
                                        <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                                <Sparkles className="h-3 w-3 text-amber-400" /> 
                                                Hemen İncele
                                            </span>
                                            <div className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white group-hover:translate-x-1 transition-all duration-300">
                                                <ChevronRight className="h-5 w-5" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-32 bg-white/50 rounded-[4rem] border-4 border-dashed border-slate-200 animate-in zoom-in-95 duration-500">
                        <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Layers className="h-12 w-12 text-slate-300" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">İçerik Bulunamadı</h3>
                        <p className="text-slate-400 max-w-sm mx-auto mt-2 font-medium">Bu kategoride veya arama sonucunda henüz yayınlanmış bir döküman bulunmuyor.</p>
                        <Button asChild variant="link" onClick={() => { setSearchTerm(""); setActiveCategory("all"); }} className="mt-4 text-indigo-600 font-bold">
                            Tüm Dökümanları Göster
                        </Button>
                    </div>
                )}
            </main>

            <footer className="w-full py-12 text-center relative z-10 border-t border-slate-200/50 bg-white/50">
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">Din Dersi Atölyesi Dijital Kütüphane</p>
            </footer>
        </div>
    );
}
