
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
    Globe, Home, Settings, Search, Grid3X3, List, 
    ChevronRight, Clock, ArrowRight, Loader2, Folder, FileText 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import Link from 'next/link';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { getExtraPages } from '@/app/teacher/extra-pages/actions';

export default function ExtraPagesExplorer() {
    const [pages, setPages] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPath, setCurrentPath] = useState<string[]>([]);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    // Mobilde varsayılanı liste, masaüstünde ızgara yap
    useEffect(() => {
        if (window.innerWidth < 768) {
            setViewMode('list');
        }
    }, []);

    const fetchPages = async () => {
        setIsLoading(true);
        const res = await getExtraPages(true); // Sadece yayındakiler
        if (res.success) {
            setPages(res.data || []);
        }
        setIsLoading(false);
    };

    useEffect(() => { fetchPages(); }, []);

    // Mevcut klasördeki dökümanları ve alt klasörleri ayır
    const { currentItems, subFolders } = useMemo(() => {
        const fullPath = currentPath.join('/');
        
        // Bu seviyedeki dökümanlar
        const items = pages.filter(p => (p.category || 'Genel') === (fullPath || 'Genel'));

        // Bu seviyenin altındaki klasörler
        const folders = new Set<string>();
        pages.forEach(p => {
            const cat = p.category || 'Genel';
            if (fullPath === '') {
                const firstPart = cat.split('/')[0];
                if (cat !== 'Genel') folders.add(firstPart);
            } else if (cat.startsWith(fullPath + '/')) {
                const relative = cat.slice(fullPath.length + 1);
                const nextPart = relative.split('/')[0];
                folders.add(nextPart);
            }
        });

        return { 
            currentItems: items, 
            subFolders: Array.from(folders).sort() 
        };
    }, [pages, currentPath]);

    const handleFolderClick = (folder: string) => {
        setCurrentPath([...currentPath, folder]);
    };

    const handleBreadcrumbClick = (index: number) => {
        setCurrentPath(currentPath.slice(0, index + 1));
    };

    const filteredItems = currentItems.filter(item => 
        item.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
            {/* Arka Plan Süslemesi */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-100/50 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-blue-100/50 rounded-full blur-[100px]" />
            </div>

            <div className="container mx-auto p-4 md:p-8 space-y-8 relative z-10">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/80 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white shadow-xl shadow-slate-200/50">
                    <div className="flex items-center gap-5">
                        <div className="p-3 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl text-white shadow-lg shadow-indigo-200">
                            <Globe className="h-7 w-7" />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight uppercase">Döküman Merkezi</h1>
                            <p className="text-slate-500 text-sm font-medium">Rehberlik, döküman ve materyal arşivi.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200">
                        <div className="flex bg-white rounded-xl shadow-sm border border-slate-200 p-0.5">
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setViewMode('grid')}
                                className={cn("rounded-lg h-9 w-9 p-0", viewMode === 'grid' ? "bg-indigo-600 text-white hover:bg-indigo-700" : "text-slate-400")}
                            >
                                <Grid3X3 className="h-4 w-4" />
                            </Button>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setViewMode('list')}
                                className={cn("rounded-lg h-9 w-9 p-0", viewMode === 'list' ? "bg-indigo-600 text-white hover:bg-indigo-700" : "text-slate-400")}
                            >
                                <List className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="w-px h-6 bg-slate-300 mx-1" />
                        <Button asChild variant="ghost" size="sm" className="rounded-xl text-slate-600 hover:bg-white hover:text-indigo-600 gap-2 h-10 px-4">
                            <Link href="/teacher/extra-pages"><Settings className="h-4 w-4" /> Yönet</Link>
                        </Button>
                    </div>
                </div>

                {/* Navigasyon & Arama */}
                <div className="flex flex-col md:flex-row items-center gap-4 bg-white/60 backdrop-blur-md p-4 rounded-3xl border border-white shadow-lg">
                    <div className="flex-1 flex items-center gap-2 overflow-x-auto no-scrollbar py-1 w-full md:w-auto">
                        <button 
                            onClick={() => setCurrentPath([])}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
                                currentPath.length === 0 ? "bg-indigo-600 text-white shadow-md shadow-indigo-200" : "text-slate-500 hover:bg-white"
                            )}
                        >
                            <Home className="h-4 w-4" /> Ana Dizin
                        </button>
                        {currentPath.map((folder, i) => (
                            <React.Fragment key={i}>
                                <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />
                                <button 
                                    onClick={() => handleBreadcrumbClick(i)}
                                    className={cn(
                                        "px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
                                        i === currentPath.length - 1 ? "bg-indigo-600 text-white shadow-md shadow-indigo-200" : "text-slate-500 hover:bg-white"
                                    )}
                                >
                                    {folder}
                                </button>
                            </React.Fragment>
                        ))}
                    </div>
                    <div className="relative w-full md:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input 
                            placeholder="Dosya ara..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 bg-white/80 border-slate-200 rounded-xl focus-visible:ring-indigo-500"
                        />
                    </div>
                </div>

                {/* İçerik Alanı */}
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-32 space-y-4">
                        <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Dökümanlar Hazırlanıyor</p>
                    </div>
                ) : (
                    <div className={cn(
                        "animate-in fade-in slide-in-from-bottom-4 duration-500",
                        viewMode === 'grid' 
                            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" 
                            : "flex flex-col gap-3"
                    )}>
                        {/* Klasörler */}
                        {subFolders.map(folder => (
                            <button 
                                key={folder} 
                                onClick={() => handleFolderClick(folder)}
                                className={cn(
                                    "group transition-all duration-300",
                                    viewMode === 'grid' 
                                        ? "h-40 bg-white rounded-3xl border border-slate-200 p-6 flex flex-col items-center justify-center gap-3 hover:shadow-2xl hover:-translate-y-1 hover:border-amber-200" 
                                        : "flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 hover:border-amber-200 hover:bg-amber-50/30"
                                )}
                            >
                                <div className={cn(
                                    "rounded-2xl transition-transform group-hover:scale-110",
                                    viewMode === 'grid' ? "p-4 bg-amber-50 text-amber-500" : "p-2 bg-amber-100 text-amber-600"
                                )}>
                                    <Folder className={viewMode === 'grid' ? "h-10 w-10 fill-current" : "h-6 w-6 fill-current"} />
                                </div>
                                <div className={cn("text-center", viewMode === 'list' && "text-left flex-1")}>
                                    <h3 className="font-black text-slate-800 uppercase tracking-tight">{folder}</h3>
                                    {viewMode === 'list' && <p className="text-[10px] text-slate-400 font-bold">KLASÖR</p>}
                                </div>
                                {viewMode === 'list' && <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-amber-500 group-hover:translate-x-1 transition-all" />}
                            </button>
                        ))}

                        {/* Dökümanlar */}
                        {filteredItems.map((item) => (
                            <Link key={item.id} href={`/extra/${item.id}`} className="group">
                                {viewMode === 'grid' ? (
                                    <Card className="h-full overflow-hidden rounded-[2rem] border-slate-200 hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 group relative bg-white border-2 hover:border-indigo-400/50">
                                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <CardHeader className="pb-4 pt-8">
                                            <div className="mb-4">
                                                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                                                    <FileText className="h-6 w-6" />
                                                </div>
                                            </div>
                                            <CardTitle className="text-xl font-black text-slate-800 group-hover:text-indigo-600 transition-colors leading-tight line-clamp-2 min-h-[3.5rem]">
                                                {item.title}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm text-slate-500 line-clamp-2 min-h-[2.5rem]">
                                                {item.description || "Ayrıntılar için tıklayın."}
                                            </p>
                                        </CardContent>
                                        <CardFooter className="flex items-center justify-between border-t border-slate-50 bg-slate-50/50 p-4">
                                            <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                                <Clock className="h-3 w-3" />
                                                {item.updatedAt ? format(new Date(item.updatedAt), 'dd.MM.yyyy', { locale: tr }) : '-'}
                                            </div>
                                            <div className="bg-slate-900 text-white p-2.5 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-lg scale-75 group-hover:scale-100">
                                                <ArrowRight className="h-4 w-4" />
                                            </div>
                                        </CardFooter>
                                    </Card>
                                ) : (
                                    <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all group shadow-sm hover:shadow-md">
                                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                            <FileText className="h-6 w-6" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-black text-slate-800 uppercase tracking-tight truncate group-hover:text-indigo-600 transition-colors">{item.title}</h3>
                                            <div className="flex items-center gap-3 mt-0.5">
                                                <p className="text-xs text-slate-400 truncate max-w-[200px] md:max-w-md">{item.description}</p>
                                                <div className="hidden sm:flex items-center gap-1.5 text-[9px] font-bold text-slate-400">
                                                    <Clock className="h-3 w-3" />
                                                    {item.updatedAt ? format(new Date(item.updatedAt), 'dd.MM.yyyy', { locale: tr }) : '-'}
                                                </div>
                                            </div>
                                        </div>
                                        <ArrowRight className="h-6 w-6 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all mr-2" />
                                    </div>
                                )}
                            </Link>
                        ))}

                        {/* Boş Durum */}
                        {filteredItems.length === 0 && subFolders.length === 0 && (
                            <div className="col-span-full py-32 text-center bg-white/50 rounded-[3rem] border-4 border-dashed border-slate-200">
                                <FileText className="h-16 w-16 text-slate-200 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-slate-400">Bu klasör henüz boş.</h3>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
