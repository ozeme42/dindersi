'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
    Folder, FileText, Search, ArrowLeft, ChevronRight, 
    Calendar, Clock, Globe, LayoutGrid, Loader2, ListTree
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getExtraPages } from '@/app/teacher/extra-pages/actions';
import Link from 'next/link';

export default function ExtraPagesGallery() {
    const [pages, setPages] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPath, setCurrentPath] = useState<string>(""); // Klasör hiyerarşisi için (Örn: "Rehberlik/Sınavlar")

    useEffect(() => {
        const fetchPages = async () => {
            setIsLoading(true);
            const res = await getExtraPages(true); // Sadece yayınlanmışlar
            if (res.success) {
                setPages(res.data || []);
            }
            setIsLoading(false);
        };
        fetchPages();
    }, []);

    // Hiyerarşik Gezgin Mantığı
    const explorerData = useMemo(() => {
        const folders = new Set<string>();
        const documents: any[] = [];

        const filteredBySearch = pages.filter(p => 
            p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.description?.toLowerCase().includes(searchTerm.toLowerCase())
        );

        filteredBySearch.forEach(page => {
            const cat = page.category || 'Genel';
            
            // Eğer döküman tam olarak bu klasördeyse
            if (cat === currentPath) {
                documents.push(page);
            } 
            // Eğer döküman bu klasörün altındaki bir klasördeyse
            else if (currentPath === "" || cat.startsWith(currentPath + "/")) {
                const relativePath = currentPath === "" ? cat : cat.substring(currentPath.length + 1);
                const firstSegment = relativePath.split('/')[0];
                folders.add(firstSegment);
            }
        });

        return {
            folders: Array.from(folders).sort(),
            documents: documents.sort((a, b) => a.title.localeCompare(b.title, 'tr'))
        };
    }, [pages, searchTerm, currentPath]);

    const navigateTo = (folder: string) => {
        const nextPath = currentPath === "" ? folder : `${currentPath}/${folder}`;
        setCurrentPath(nextPath);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const goBack = () => {
        const parts = currentPath.split('/');
        parts.pop();
        setCurrentPath(parts.join('/'));
    };

    const breadcrumbs = useMemo(() => {
        if (currentPath === "") return [];
        return currentPath.split('/');
    }, [currentPath]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8">
                <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mb-4" />
                <p className="text-slate-500 font-medium animate-pulse">Dökümanlar Hazırlanıyor...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20 selection:bg-indigo-100">
            
            {/* Arka Plan Efektleri */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute top-[-10%] left-[-5%] w-[600px] h-[600px] bg-indigo-100/50 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-sky-100/50 rounded-full blur-[120px]" />
            </div>

            <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-sm">
                <div className="container mx-auto px-4 py-4 md:py-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <Link href="/">
                                <Button variant="outline" size="icon" className="h-11 w-11 rounded-2xl border-slate-200 hover:bg-slate-50 group">
                                    <ArrowLeft className="h-5 w-5 text-slate-500 group-hover:-translate-x-1 transition-transform" />
                                </Button>
                            </Link>
                            <div className="flex flex-col">
                                <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 uppercase">Döküman Merkezi</h1>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-0.5">Yardımcı Kaynaklar ve Materyaller</p>
                            </div>
                        </div>

                        <div className="relative w-full md:w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input 
                                placeholder="Dökümanlarda ara..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 h-11 bg-slate-50 border-none rounded-xl focus-visible:ring-indigo-500 shadow-inner"
                            />
                        </div>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8 relative z-10 space-y-8">
                
                {/* Navigasyon & Breadcrumbs */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setCurrentPath("")}
                        className={cn("rounded-lg h-9 px-3 gap-2 font-bold", currentPath === "" ? "bg-indigo-50 text-indigo-700" : "text-slate-500")}
                    >
                        <Globe className="h-4 w-4" /> Ana Dizin
                    </Button>
                    
                    {breadcrumbs.map((part, i) => (
                        <React.Fragment key={part}>
                            <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => {
                                    const path = breadcrumbs.slice(0, i + 1).join('/');
                                    setCurrentPath(path);
                                }}
                                className={cn("rounded-lg h-9 px-3 gap-2 font-bold", i === breadcrumbs.length - 1 ? "bg-indigo-50 text-indigo-700" : "text-slate-500")}
                            >
                                {part}
                            </Button>
                        </React.Fragment>
                    ))}
                </div>

                <div className="space-y-10">
                    
                    {/* KLASÖRLER */}
                    {explorerData.folders.length > 0 && (
                        <div className="space-y-4">
                            <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <ListTree className="h-4 w-4" /> Klasörler
                            </h2>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                {explorerData.folders.map(folder => (
                                    <button 
                                        key={folder}
                                        onClick={() => navigateTo(folder)}
                                        className="group flex flex-col items-center justify-center p-5 bg-white border border-slate-200 rounded-3xl shadow-sm hover:shadow-xl hover:border-indigo-300 hover:-translate-y-1 transition-all duration-300 text-center"
                                    >
                                        <div className="relative mb-3">
                                            <Folder className="h-12 w-12 text-amber-500 fill-amber-500/10 group-hover:scale-110 transition-transform" />
                                            <div className="absolute inset-0 bg-amber-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                        <span className="text-sm font-bold text-slate-700 line-clamp-1 group-hover:text-indigo-700 transition-colors uppercase tracking-tight">
                                            {folder}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* DOSYALAR */}
                    <div className="space-y-4">
                        <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <FileText className="h-4 w-4" /> Dosyalar
                        </h2>
                        {explorerData.documents.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {explorerData.documents.map((page) => (
                                    <Link key={page.id} href={`/extra/${page.id}`} className="group h-full">
                                        <Card className="h-full flex flex-col border-slate-200 rounded-[2rem] overflow-hidden group-hover:shadow-2xl group-hover:border-indigo-300 group-hover:-translate-y-1.5 transition-all duration-500 bg-white/60 backdrop-blur-sm">
                                            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="p-2.5 bg-white rounded-2xl shadow-sm border border-slate-100 group-hover:border-indigo-200 group-hover:scale-110 transition-all duration-500">
                                                        <FileText className="h-6 w-6 text-indigo-600" />
                                                    </div>
                                                </div>
                                                <CardTitle className="text-lg font-black text-slate-800 leading-tight group-hover:text-indigo-700 transition-colors line-clamp-2">
                                                    {page.title}
                                                </CardTitle>
                                                <CardDescription className="text-[11px] font-medium text-slate-400 flex items-center gap-1 mt-1 uppercase">
                                                    <Clock className="h-3 w-3" /> {page.updatedAt ? new Date(page.updatedAt).toLocaleDateString('tr-TR') : 'YENİ'}
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent className="pt-4 flex-grow">
                                                <p className="text-sm text-slate-500 font-medium line-clamp-3 leading-relaxed">
                                                    {page.description || "Döküman içeriğini görüntülemek için tıklayın."}
                                                </p>
                                            </CardContent>
                                            <CardFooter className="pt-4 border-t border-slate-50 bg-slate-50/30 flex items-center justify-between">
                                                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                                    <Calendar className="h-3.5 w-3.5" />
                                                    {page.createdAt ? new Date(page.createdAt).toLocaleDateString('tr-TR') : 'YENİ'}
                                                </div>
                                                <div className="w-7 h-7 rounded-full bg-white border border-slate-100 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                                                    <ChevronRight className="h-4 w-4" />
                                                </div>
                                            </CardFooter>
                                        </Card>
                                    </Link>
                                ))}
                            </div>
                        ) : explorerData.folders.length === 0 ? (
                            <div className="text-center py-32 bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
                                <div className="p-6 bg-slate-50 rounded-full inline-block mb-4">
                                    <LayoutGrid className="h-12 w-12 text-slate-200" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-400">Bu klasör henüz boş</h3>
                                <p className="text-slate-400 text-sm mt-1">Daha sonra tekrar kontrol edin.</p>
                                {currentPath !== "" && (
                                    <Button onClick={goBack} variant="outline" className="mt-6 rounded-xl">
                                        <ArrowLeft className="mr-2 h-4 w-4" /> Üst Klasöre Dön
                                    </Button>
                                )}
                            </div>
                        ) : null}
                    </div>
                </div>
            </main>
        </div>
    );
}
