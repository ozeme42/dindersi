
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
    Search, ArrowLeft, Globe, Tag, Calendar, 
    ChevronRight, Loader2, LayoutGrid, FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { getExtraPages } from '@/app/teacher/extra-pages/actions';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function ExtraPagesGallery() {
    const [pages, setPages] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [activeCategory, setActiveCategory] = useState("all");

    useEffect(() => {
        const fetchPages = async () => {
            setIsLoading(true);
            const res = await getExtraPages(true); // Sadece yayındakiler
            if (res.success) {
                setPages(res.data || []);
            }
            setIsLoading(false);
        };
        fetchPages();
    }, []);

    const categories = useMemo(() => {
        const cats = Array.from(new Set(pages.map(p => p.category || 'Genel')));
        return ['all', ...cats.sort()];
    }, [pages]);

    const filteredPages = useMemo(() => {
        return pages.filter(p => {
            const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = activeCategory === 'all' || p.category === activeCategory;
            return matchesSearch && matchesCategory;
        });
    }, [pages, searchTerm, activeCategory]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] pb-20 font-sans selection:bg-indigo-100">
            {/* Arka Plan Efektleri */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-indigo-50/50 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-sky-50/50 rounded-full blur-[100px]" />
            </div>

            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-sm">
                <div className="container mx-auto px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <Link href="/">
                            <Button variant="ghost" size="icon" className="rounded-full h-11 w-11 bg-white border border-slate-200 shadow-sm hover:bg-slate-50">
                                <ArrowLeft className="h-5 w-5 text-slate-600" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none">Döküman Arşivi</h1>
                            <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-widest mt-1">Ek Kaynaklar ve Materyaller</p>
                        </div>
                    </div>

                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input 
                            placeholder="Dökümanlarda ara..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 bg-slate-50 border-none rounded-xl focus-visible:ring-indigo-500 h-11"
                        />
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-6 py-8 relative z-10 space-y-8">
                {/* Kategori Sekmeleri */}
                {categories.length > 2 && (
                    <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
                        <TabsList className="bg-slate-100/80 p-1 rounded-2xl border border-slate-200 shadow-inner h-auto flex-wrap justify-start">
                            {categories.map(cat => (
                                <TabsTrigger 
                                    key={cat} 
                                    value={cat}
                                    className="rounded-xl px-6 py-2.5 font-bold text-xs uppercase tracking-wider transition-all data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm"
                                >
                                    {cat === 'all' ? 'Tümü' : cat}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </Tabs>
                )}

                {/* Grid Alanı */}
                {filteredPages.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredPages.map((page) => (
                            <Link key={page.id} href={`/extra/${page.id}`} className="group block h-full">
                                <Card className="h-full rounded-[2rem] border-slate-200 overflow-hidden hover:shadow-2xl transition-all duration-500 group-hover:-translate-y-1 flex flex-col">
                                    <CardHeader className="pb-4 flex-shrink-0">
                                        <div className="flex justify-between items-start mb-3">
                                            <Badge variant="secondary" className="bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-100">
                                                <Tag className="h-3 w-3 mr-1.5" />
                                                {page.category || 'Genel'}
                                            </Badge>
                                            <div className="p-2 bg-slate-50 rounded-xl text-slate-400 group-hover:text-indigo-600 group-hover:bg-indigo-50 transition-colors">
                                                <Globe className="h-4 w-4" />
                                            </div>
                                        </div>
                                        <CardTitle className="text-xl font-bold text-slate-800 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                                            {page.title}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="flex-grow">
                                        <p className="text-sm text-slate-500 leading-relaxed line-clamp-3">
                                            {page.description || "Bu döküman için açıklama belirtilmemiş."}
                                        </p>
                                    </CardContent>
                                    <CardFooter className="pt-4 border-t border-slate-50 bg-slate-50/30 flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                            <Calendar className="h-3.5 w-3.5" />
                                            {page.createdAt ? new Date(page.createdAt).toLocaleDateString('tr-TR') : 'YENİ'}
                                        </div>
                                        <div className="flex items-center gap-1 text-xs font-black text-indigo-600 uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">
                                            Görüntüle <ChevronRight className="h-4 w-4" />
                                        </div>
                                    </CardFooter>
                                </Card>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-24 bg-white/50 rounded-[3rem] border-2 border-dashed border-slate-200 max-w-2xl mx-auto">
                        <FileText className="h-16 w-16 text-slate-200 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-slate-800">Döküman Bulunamadı</h3>
                        <p className="text-slate-500 mt-2">Aramanızla eşleşen içerik bulunmuyor.</p>
                    </div>
                )}
            </main>
        </div>
    );
}
