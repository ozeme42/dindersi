
'use client';

import { useState, useEffect } from 'react';
import { Loader2, ArrowLeft, BookOpen, Search, Filter, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getExtraPages, type ExtraPage } from '@/app/teacher/extra-pages/actions';
import Link from 'next/link';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const MagnificentLightBackground = () => (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-slate-50">
        <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-indigo-50/40 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-sky-50/40 rounded-full blur-[100px]" />
    </div>
);

export default function ExtraPagesGallery() {
    const [pages, setPages] = useState<ExtraPage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [activeTab, setActiveTab] = useState("all");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            const res = await getExtraPages(true);
            if (res.success && res.data) {
                setPages(res.data);
            } else {
                setError(res.error || "Dökümanlar yüklenemedi. Lütfen daha sonra tekrar deneyin.");
            }
            setIsLoading(false);
        };
        load();
    }, []);

    // Benzersiz kategorileri saptar
    const categories = ["all", ...Array.from(new Set(pages.map(p => p.category || "Genel").filter(Boolean)))];

    const filteredPages = pages.filter(page => {
        const matchesSearch = page.title.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = activeTab === "all" || (page.category || "Genel") === activeTab;
        return matchesSearch && matchesCategory;
    });

    if (isLoading) {
        return (
            <div className="h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
                <p className="text-slate-500 font-medium animate-pulse">Dökümanlar Hazırlanıyor...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col relative selection:bg-indigo-100">
            <MagnificentLightBackground />
            
            {/* HEADER */}
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-sm">
                <div className="container mx-auto px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <Link href="/">
                            <Button variant="ghost" size="icon" className="rounded-xl hover:bg-slate-100">
                                <ArrowLeft className="h-5 w-5 text-slate-600" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Özel Dökümanlar</h1>
                            <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest">Ekstra İçerik Kütüphanesi</p>
                        </div>
                    </div>

                    <div className="relative w-full md:w-80 group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                        <Input 
                            placeholder="Döküman ara..." 
                            className="pl-10 h-11 bg-white border-slate-200 rounded-xl focus:ring-indigo-500/20 transition-all shadow-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* KATEGORİ SEKMELERİ */}
                {categories.length > 2 && (
                    <div className="border-t border-slate-100 bg-white/50 px-6 py-2">
                        <div className="container mx-auto overflow-x-auto no-scrollbar">
                            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                                <TabsList className="bg-transparent h-auto p-0 flex gap-2">
                                    {categories.map((cat) => (
                                        <TabsTrigger 
                                            key={cat} 
                                            value={cat}
                                            className={cn(
                                                "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border-2 border-transparent",
                                                "data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md",
                                                "data-[state=inactive]:text-slate-500 data-[state=inactive]:hover:bg-slate-100"
                                            )}
                                        >
                                            {cat === "all" ? "Tümü" : cat}
                                        </TabsTrigger>
                                    ))}
                                </TabsList>
                            </Tabs>
                        </div>
                    </div>
                )}
            </header>

            <main className="flex-1 container mx-auto p-6 relative z-10 pb-32">
                {error ? (
                    <div className="max-w-md mx-auto mt-20 text-center bg-white p-8 rounded-3xl border border-red-100 shadow-xl">
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Filter className="h-8 w-8 text-red-500" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 mb-2">Hata Oluştu</h2>
                        <p className="text-slate-500 text-sm mb-6">{error}</p>
                        <Button onClick={() => window.location.reload()} className="bg-slate-900 text-white w-full rounded-xl">Tekrar Dene</Button>
                    </div>
                ) : filteredPages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32 text-center">
                        <div className="bg-slate-100 p-8 rounded-full mb-6">
                            <Layers className="h-12 w-12 text-slate-300" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-800">Döküman Bulunamadı</h2>
                        <p className="text-slate-500 max-w-xs mt-2">Arama kriterlerinize uygun döküman bulunmuyor veya henüz hiç döküman eklenmemiş.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in zoom-in-95 duration-500">
                        {filteredPages.map((page) => (
                            <Link key={page.id} href={`/extra/${page.id}`}>
                                <div className="group bg-white rounded-[2rem] border border-slate-200 p-6 h-full flex flex-col shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all duration-300 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Badge className="bg-indigo-100 text-indigo-600 border-none">GÖRÜNTÜLE</Badge>
                                    </div>
                                    
                                    <div className="mb-4">
                                        <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-tighter border-indigo-100 text-indigo-500 bg-indigo-50/50">
                                            {page.category || "Genel"}
                                        </Badge>
                                    </div>

                                    <h3 className="text-xl font-bold text-slate-900 leading-tight mb-4 group-hover:text-indigo-600 transition-colors">
                                        {page.title}
                                    </h3>
                                    
                                    <div className="mt-auto flex items-center justify-between pt-4 border-t border-slate-50">
                                        <div className="flex items-center gap-2 text-slate-400">
                                            <BookOpen className="h-4 w-4" />
                                            <span className="text-[11px] font-medium uppercase tracking-widest">Döküman</span>
                                        </div>
                                        <div className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                            <ArrowLeft className="h-4 w-4 rotate-180" />
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </main>

            <footer className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-slate-50 to-transparent pointer-events-none">
                <div className="container mx-auto flex justify-center">
                    <div className="bg-white/80 backdrop-blur-md px-6 py-3 rounded-full border border-slate-200 shadow-lg pointer-events-auto flex items-center gap-4">
                        <div className="flex -space-x-2">
                             {[1,2,3].map(i => (
                                 <div key={i} className="h-6 w-6 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center">
                                     <div className="h-full w-full rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 opacity-20" />
                                 </div>
                             ))}
                        </div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            {pages.length} TOPLAM DÖKÜMAN
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
