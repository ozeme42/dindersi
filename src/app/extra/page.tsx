'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
    Search, Globe, ArrowRight, Loader2, Tag, Calendar, 
    ChevronRight, BookOpen, Layers, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
    Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { getExtraPages } from '@/app/teacher/extra-pages/actions';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function ExtraPagesGallery() {
    const [pages, setPages] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [activeCategory, setActiveCategory] = useState("all");
    const [error, setError] = useState<string | null>(null);

    const fetchPages = async () => {
        setIsLoading(true);
        setError(null);
        try {
            // Sadece yayınlanmış (true) dökümanları getir
            const res = await getExtraPages(true);
            if (res.success) {
                setPages(res.data || []);
            } else {
                setError(res.error || "Dökümanlar yüklenirken bir hata oluştu.");
            }
        } catch (e) {
            setError("Sunucuya bağlanırken bir hata oluştu.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchPages(); }, []);

    // Kategorileri veritabanındaki verilerden dinamik olarak türet
    const categories = useMemo(() => {
        const unique = Array.from(new Set(pages.map(p => p.category || 'Genel')));
        return unique.sort();
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
                <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
                <p className="text-slate-500 font-bold animate-pulse">Dökümanlar Hazırlanıyor...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col relative overflow-x-hidden selection:bg-indigo-100">
            {/* Arka Plan Efekti */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-indigo-100/40 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-sky-100/40 rounded-full blur-[100px]" />
            </div>

            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200">
                <div className="container mx-auto px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-5 w-full md:w-auto">
                        <Link href="/">
                            <button className="group relative flex items-center justify-center h-12 px-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all duration-300 overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <div className="relative flex items-center gap-2">
                                    <BookOpen className="h-5 w-5 text-slate-600 group-hover:text-white transition-all duration-300" />
                                    <span className="font-black text-xs uppercase tracking-widest text-slate-600 group-hover:text-white transition-colors duration-300">ANA SAYFA</span>
                                </div>
                            </button>
                        </Link>
                        <div className="hidden md:block h-8 w-[1px] bg-slate-200 mx-2" />
                        <div>
                            <h1 className="text-2xl font-black text-slate-800 tracking-tighter leading-none">Özel Dökümanlar</h1>
                            <p className="text-[10px] text-indigo-500 font-black uppercase tracking-widest mt-1">Materyaller, Rehberlik ve Duyurular</p>
                        </div>
                    </div>

                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input 
                            placeholder="Döküman ara..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 bg-white border-slate-200 rounded-xl focus-visible:ring-indigo-500 shadow-sm h-11"
                        />
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-6 py-8 space-y-8 relative z-10 flex-1">
                
                {/* Dinamik Kategori Menüsü */}
                <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
                    <div className="flex justify-center mb-8">
                        <TabsList className="bg-slate-200/50 p-1.5 rounded-full border border-slate-200 h-auto inline-flex shadow-inner">
                            <TabsTrigger 
                                value="all" 
                                className="rounded-full px-6 py-2.5 font-black text-xs uppercase tracking-widest data-[state=active]:bg-indigo-600 data-[state=active]:text-white transition-all shadow-none"
                            >
                                <Layers className="w-4 h-4 mr-2" /> Tümü
                            </TabsTrigger>
                            {categories.map(cat => (
                                <TabsTrigger 
                                    key={cat} 
                                    value={cat}
                                    className="rounded-full px-6 py-2.5 font-black text-xs uppercase tracking-widest data-[state=active]:bg-indigo-600 data-[state=active]:text-white transition-all shadow-none"
                                >
                                    {cat}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </div>

                    {error ? (
                        <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-red-100 shadow-sm max-w-2xl mx-auto">
                            <AlertTriangle className="h-16 w-16 text-red-400 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-slate-900">Bir Sorun Oluştu</h3>
                            <p className="text-slate-500 mt-2">{error}</p>
                            <Button onClick={fetchPages} variant="outline" className="mt-6">Tekrar Dene</Button>
                        </div>
                    ) : filteredPages.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in zoom-in-95 duration-500">
                            {filteredPages.map((page) => (
                                <Link key={page.id} href={`/extra/${page.id}`} className="group h-full">
                                    <Card className="h-full group overflow-hidden rounded-[2.5rem] border-slate-200 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500 hover:-translate-y-2 bg-white flex flex-col">
                                        <CardHeader className="pb-4 pt-8 px-8">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-500">
                                                    <Globe className="h-6 w-6" />
                                                </div>
                                                <Badge variant="secondary" className="bg-slate-100 text-slate-500 font-bold text-[9px] uppercase tracking-widest border-none">
                                                    {page.category || 'Genel'}
                                                </Badge>
                                            </div>
                                            <CardTitle className="text-xl font-black text-slate-800 line-clamp-2 leading-tight group-hover:text-indigo-600 transition-colors">
                                                {page.title}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="px-8 flex-grow">
                                            <p className="text-sm text-slate-500 line-clamp-3 leading-relaxed">
                                                {page.description || "Bu döküman için açıklama belirtilmemiş."}
                                            </p>
                                        </CardContent>
                                        <CardFooter className="pt-4 pb-8 px-8 border-t border-slate-50 bg-slate-50/30 flex items-center justify-between">
                                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                                <Calendar className="h-3.5 w-3.5" />
                                                {page.createdAt ? new Date(page.createdAt).toLocaleDateString('tr-TR') : 'YENİ'}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs font-black text-indigo-600 group-hover:gap-3 transition-all duration-300">
                                                İNCELE <ChevronRight className="h-4 w-4" />
                                            </div>
                                        </CardFooter>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-32 bg-white rounded-[3rem] border-4 border-dashed border-slate-100 max-w-3xl mx-auto shadow-inner">
                            <div className="p-6 bg-slate-50 rounded-full inline-flex mb-6">
                                <Search className="h-16 w-16 text-slate-200" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-800">Döküman Bulunamadı</h3>
                            <p className="text-slate-400 max-w-sm mx-auto mt-2">Aradığınız kriterlere uygun veya bu kategoride yayınlanmış bir döküman bulunmuyor.</p>
                            <Button variant="link" onClick={() => { setActiveCategory('all'); setSearchTerm(''); }} className="mt-4 text-indigo-600 font-bold">Tüm Filtreleri Temizle</Button>
                        </div>
                    )}
                </Tabs>
            </main>

            <footer className="w-full py-12 border-t border-slate-200 bg-white/50 text-center relative z-10">
                <div className="container mx-auto px-6">
                    <div className="flex items-center justify-center gap-2 text-slate-400 mb-2">
                        <Sparkles className="h-5 w-5 text-indigo-300" />
                        <span className="font-bold text-sm tracking-tighter uppercase">Din Dersi Atölyesi</span>
                    </div>
                    <p className="text-xs text-slate-400 font-medium">Bu dökümanlar eğitim materyali olarak öğretmenlerimiz tarafından hazırlanmıştır.</p>
                </div>
            </footer>
        </div>
    );
}