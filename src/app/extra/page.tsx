'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
    Search, Globe, FileText, Folder, ArrowRight, ChevronRight, 
    LayoutGrid, List, Clock, ArrowLeft, Loader2, Home, Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { getExtraPages } from '@/app/teacher/extra-pages/actions';
import Link from 'next/link';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function ExtraPagesExplorer() {
    const [pages, setPages] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [currentPath, setCurrentPath] = useState<string[]>([]);
    
    const { toast } = useToast();

    useEffect(() => {
        // Cihaz algılama: Mobilde liste, masaüstünde ızgara varsayılan
        if (window.innerWidth < 768) setViewMode('list');
        
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

    // Hiyerarşik Yapı Oluşturma
    const categorizedData = useMemo(() => {
        const root: any = { items: [], folders: {} };
        
        pages.forEach(page => {
            const pathParts = (page.category || 'Genel').split('/');
            let current = root;
            
            pathParts.forEach((part: string) => {
                if (!current.folders[part]) {
                    current.folders[part] = { items: [], folders: {} };
                }
                current = current.folders[part];
            });
            current.items.push(page);
        });
        
        return root;
    }, [pages]);

    // Aktif Klasör İçeriği
    const currentFolder = useMemo(() => {
        let current = categorizedData;
        for (const part of currentPath) {
            if (current.folders[part]) {
                current = current.folders[part];
            } else {
                return { items: [], folders: {} };
            }
        }
        return current;
    }, [categorizedData, currentPath]);

    const navigateTo = (folderName: string) => {
        setCurrentPath([...currentPath, folderName]);
        window.scrollTo(0, 0);
    };

    const goBack = () => {
        setCurrentPath(currentPath.slice(0, -1));
        window.scrollTo(0, 0);
    };

    const filteredItems = currentFolder.items.filter((item: any) => 
        item.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const folderList = Object.keys(currentFolder.folders).sort();

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20 selection:bg-indigo-100">
            {/* Arka Plan */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-indigo-100/40 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-sky-100/40 rounded-full blur-[100px]" />
            </div>

            {/* Sticky Header */}
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-sm">
                <div className="container mx-auto px-4 h-20 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-5">
                        <div className="p-3 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl text-white shadow-lg shadow-indigo-200">
                            <Globe className="h-7 w-7" />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight uppercase leading-none">Döküman Merkezi</h1>
                            <p className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest mt-1 hidden sm:block">Etkileşimli Eğitim Arşivi</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="hidden md:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => setViewMode('grid')}
                                className={cn("h-9 w-9 rounded-lg transition-all", viewMode === 'grid' ? "bg-white shadow-sm text-indigo-600" : "text-slate-400 hover:text-slate-600")}
                            >
                                <LayoutGrid className="h-5 w-5" />
                            </Button>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => setViewMode('list')}
                                className={cn("h-9 w-9 rounded-lg transition-all", viewMode === 'list' ? "bg-white shadow-sm text-indigo-600" : "text-slate-400 hover:text-slate-600")}
                            >
                                <List className="h-5 w-5" />
                            </Button>
                        </div>
                        <Button asChild variant="ghost" className="h-11 w-11 p-0 rounded-full hover:bg-slate-100">
                            <Link href="/"><Home className="h-6 w-6 text-slate-600" /></Link>
                        </Button>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8 relative z-10 space-y-8">
                
                {/* Search & Breadcrumbs */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-4 rounded-3xl border border-slate-200/60 shadow-sm">
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 md:pb-0">
                        <Button onClick={() => setCurrentPath([])} variant="ghost" size="sm" className={cn("rounded-full font-black text-xs uppercase", currentPath.length === 0 ? "bg-indigo-50 text-indigo-600" : "text-slate-500")}>
                            Ana Dizin
                        </Button>
                        {currentPath.map((part, i) => (
                            <React.Fragment key={part}>
                                <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />
                                <Button onClick={() => setCurrentPath(currentPath.slice(0, i + 1))} variant="ghost" size="sm" className={cn("rounded-full font-black text-xs uppercase whitespace-nowrap", i === currentPath.length - 1 ? "bg-indigo-50 text-indigo-600" : "text-slate-500")}>
                                    {part}
                                </Button>
                            </React.Fragment>
                        ))}
                    </div>

                    <div className="relative w-full md:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input 
                            placeholder="Dosya ara..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 bg-slate-50 border-none rounded-xl focus-visible:ring-indigo-500 h-11"
                        />
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-32 gap-4">
                        <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">İçerik Yükleniyor...</p>
                    </div>
                ) : (
                    <div className="space-y-10">
                        {/* Klasörler */}
                        {folderList.length > 0 && (
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                {folderList.map(folderName => (
                                    <button 
                                        key={folderName}
                                        onClick={() => navigateTo(folderName)}
                                        className="group bg-white p-5 rounded-[2rem] border border-slate-200 hover:border-indigo-300 hover:shadow-xl transition-all duration-300 flex flex-col items-center text-center gap-3"
                                    >
                                        <div className="p-4 bg-amber-50 rounded-2xl text-amber-500 group-hover:scale-110 transition-transform">
                                            <Folder className="h-8 w-8 fill-current" />
                                        </div>
                                        <span className="font-black text-xs uppercase tracking-tight line-clamp-1">{folderName}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Dökümanlar - GRID VIEW */}
                        {viewMode === 'grid' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {filteredItems.map((item: any) => (
                                    <Link key={item.id} href={`/extra/${item.id}`} className="group h-full">
                                        <Card className="h-full flex flex-col rounded-[2.5rem] border-slate-200/60 hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 overflow-hidden bg-white">
                                            <CardHeader className="pb-4">
                                                <div className="p-2.5 bg-indigo-50 w-fit rounded-xl text-indigo-600 mb-3 group-hover:scale-110 transition-transform">
                                                    <FileText className="h-5 w-5" />
                                                </div>
                                                <CardTitle className="text-xl leading-tight group-hover:text-indigo-600 transition-colors uppercase font-black">{item.title}</CardTitle>
                                            </CardHeader>
                                            <CardContent className="flex-grow">
                                                <p className="text-sm text-slate-500 line-clamp-3">
                                                    {item.description || "İnteraktif ders materyali ve döküman içeriği."}
                                                </p>
                                            </CardContent>
                                            <CardFooter className="pt-4 border-t border-slate-50 flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                                <span className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> {item.updatedAt ? format(new Date(item.updatedAt), 'd MMM yyyy', { locale: tr }) : '-'}</span>
                                                <ArrowRight className="h-4 w-4 text-indigo-300 group-hover:translate-x-1 transition-transform" />
                                            </CardFooter>
                                        </Card>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            /* Dökümanlar - LIST VIEW */
                            <div className="bg-white rounded-[2rem] border border-slate-200/60 overflow-hidden shadow-sm">
                                <div className="divide-y divide-slate-50">
                                    {filteredItems.map((item: any) => (
                                        <Link key={item.id} href={`/extra/${item.id}`} className="flex items-center p-5 hover:bg-slate-50 transition-colors group">
                                            <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600 mr-5 group-hover:scale-110 transition-transform">
                                                <FileText className="h-6 w-6" />
                                            </div>
                                            <div className="flex-1 min-w-0 mr-4">
                                                <h3 className="font-black text-lg text-slate-900 group-hover:text-indigo-600 transition-colors uppercase leading-tight truncate">{item.title}</h3>
                                                <p className="text-xs text-slate-400 mt-1 line-clamp-1">{item.description || "İnteraktif ders materyali ve döküman içeriği."}</p>
                                            </div>
                                            <div className="text-right shrink-0 hidden sm:block">
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.updatedAt ? format(new Date(item.updatedAt), 'd MMM yyyy', { locale: tr }) : '-'}</div>
                                            </div>
                                            <ChevronRight className="ml-4 h-6 w-6 text-slate-300 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                        {filteredItems.length === 0 && folderList.length === 0 && (
                            <div className="text-center py-32 bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
                                <FileText className="h-16 w-16 text-slate-200 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-slate-400">Bu bölümde döküman bulunmuyor.</h3>
                                {currentPath.length > 0 && (
                                    <Button onClick={goBack} variant="link" className="mt-2 text-indigo-500">Üst Klasöre Dön</Button>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}