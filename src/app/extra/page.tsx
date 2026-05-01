
'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
    Search, Globe, Loader2, ArrowLeft, Tag, 
    FileText, Calendar, ChevronRight, LayoutGrid 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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

    useEffect(() => {
        const fetchPages = async () => {
            setIsLoading(true);
            const res = await getExtraPages(true); // Sadece yayınlanmış olanlar
            if (res.success) {
                setPages(res.data || []);
            }
            setIsLoading(false);
        };
        fetchPages();
    }, []);

    const categories = useMemo(() => {
        const cats = Array.from(new Set(pages.map(p => p.category || 'Genel')));
        return ["all", ...cats.sort()];
    }, [pages]);

    const filteredPages = useMemo(() => {
        return pages.filter(p => {
            const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                p.description?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = activeCategory === "all" || p.category === activeCategory;
            return matchesSearch && matchesCategory;
        });
    }, [pages, searchTerm, activeCategory]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20 selection:bg-indigo-100">
            {/* Arka Plan Süslemeleri */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-indigo-100/50 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-sky-100/50 rounded-full blur-[100px]" />
            </div>

            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200">
                <div className="container mx-auto px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-5 w-full md:w-auto">
                        <Link href="/">
                            <Button variant="outline" size="icon" className="h-12 w-12 rounded-2xl bg-white shadow-sm hover:shadow-md transition-all">
                                <ArrowLeft className="h-5 w-5 text-slate-600" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-black text-slate-800 tracking-tighter uppercase leading-none">Özel Dökümanlar</h1>
                            <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest mt-1">Materyal ve Kaynak Kütüphanesi</p>
                        </div>
                    </div>

                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input 
                            placeholder="Dökümanlarda ara..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 bg-slate-100 border-none rounded-xl focus-visible:ring-indigo-500 h-11"
                        />
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-6 py-8 relative z-10 space-y-8">
                {/* Kategori Sekmeleri */}
                <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
                    <TabsList className="bg-slate-200/50 p-1.5 rounded-2xl mb-8 flex flex-wrap h-auto gap-2 w-full md:w-fit">
                        {categories.map(cat => (
                            <TabsTrigger 
                                key={cat} 
                                value={cat}
                                className="rounded-xl px-6 py-2.5 font-bold text-xs uppercase tracking-wider data-[state=active]:bg-indigo-600 data-[state=active]:text-white transition-all shadow-sm"
                            >
                                {cat === "all" ? "Tüm Dökümanlar" : cat}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    <TabsContent value={activeCategory} className="mt-0 outline-none">
                        {filteredPages.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {filteredPages.map((page) => (
                                    <Link key={page.id} href={`/extra/${page.id}`}>
                                        <Card className="group h-full flex flex-col rounded-[2rem] border-slate-200 hover:border-indigo-300 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500 overflow-hidden bg-white">
                                            <CardHeader className="pb-4 relative">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600 group-hover:scale-110 transition-transform duration-500 shadow-sm border border-indigo-100">
                                                        <FileText className="h-6 w-6" />
                                                    </div>
                                                    <Badge variant="secondary" className="bg-slate-50 text-slate-500 border-slate-100 text-[9px] uppercase tracking-tighter">
                                                        {page.category || 'Genel'}
                                                    </Badge>
                                                </div>
                                                <CardTitle className="text-xl font-bold leading-tight group-hover:text-indigo-600 transition-colors line-clamp-2">
                                                    {page.title}
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="flex-grow">
                                                <p className="text-sm text-slate-500 line-clamp-3 leading-relaxed font-medium">
                                                    {page.description || "Bu döküman için açıklama girilmemiş."}
                                                </p>
                                            </CardContent>
                                            <CardFooter className="pt-4 border-t border-slate-50 bg-slate-50/30 flex items-center justify-between">
                                                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                                    <Calendar className="h-3.5 w-3.5" />
                                                    {page.createdAt ? new Date(page.createdAt).toLocaleDateString('tr-TR') : 'YENİ'}
                                                </div>
                                                <div className="flex items-center gap-1 text-xs font-black text-indigo-600 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                                                    OKU <ChevronRight className="h-4 w-4" />
                                                </div>
                                            </CardFooter>
                                        </Card>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-32 bg-white/50 rounded-[3rem] border-2 border-dashed border-slate-200 text-center">
                                <LayoutGrid className="h-16 w-16 text-slate-300 mb-6 opacity-50" />
                                <h3 className="text-2xl font-bold text-slate-800">Döküman Bulunamadı</h3>
                                <p className="text-slate-500 max-w-xs mx-auto mt-2">Bu kategoride henüz yayınlanmış bir döküman bulunmuyor.</p>
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    );
}
