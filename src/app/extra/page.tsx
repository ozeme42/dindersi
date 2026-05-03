'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
    Search, ChevronRight, Globe, Folder, Home, Settings, Loader2,
    LayoutGrid, List, Clock, FileText, ChevronLeft, ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getExtraPages } from '@/app/teacher/extra-pages/actions';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function ExtraPagesExplorer() {
    const [pages, setPages] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPath, setCurrentPath] = useState<string[]>([]);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    // Mobilde varsayılan olarak liste modunu seç
    useEffect(() => {
        if (window.innerWidth < 768) {
            setViewMode('list');
        }
    }, []);

    const fetchPages = async () => {
        setIsLoading(true);
        const res = await getExtraPages(true); // Sadece yayındakileri getir
        if (res.success) {
            setPages(res.data || []);
        }
        setIsLoading(false);
    };

    useEffect(() => { fetchPages(); }, []);

    // Kategorileri hiyerarşik yapıya dönüştür
    const explorerData = useMemo(() => {
        const pathStr = currentPath.join('/');
        
        // Mevcut klasördeki alt klasörleri bul
        const subFolders = new Set<string>();
        const currentFiles: any[] = [];

        pages.forEach(page => {
            const cat = page.category || 'Genel';
            
            // Eğer kategori tam olarak mevcut yolu eşleşiyorsa, bu bir dosyadır
            if (cat === (pathStr || 'Genel')) {
                currentFiles.push(page);
            } 
            // Eğer kategori mevcut yolla başlıyorsa, alt klasör olabilir
            else if (pathStr === "" && cat !== 'Genel') {
                const firstPart = cat.split('/')[0];
                subFolders.add(firstPart);
            }
            else if (pathStr !== "" && cat.startsWith(pathStr + '/')) {
                const relativePart = cat.substring(pathStr.length + 1);
                const nextPart = relativePart.split('/')[0];
                subFolders.add(nextPart);
            }
            // Özel durum: Ana dizindeyken 'Genel' kategorisindeki dosyaları göster
            else if (pathStr === "" && cat === 'Genel') {
                currentFiles.push(page);
            }
        });

        return {
            folders: Array.from(subFolders).sort(),
            files: currentFiles.sort((a, b) => a.title.localeCompare(b.title, 'tr'))
        };
    }, [pages, currentPath]);

    const navigateToFolder = (folder: string) => {
        setCurrentPath(prev => [...prev, folder]);
        setSearchTerm("");
    };

    const navigateUp = (index: number) => {
        setCurrentPath(prev => prev.slice(0, index + 1));
    };

    const goToRoot = () => setCurrentPath([]);

    // Arama sonuçları (Tüm hiyerarşide arar)
    const searchResults = useMemo(() => {
        if (!searchTerm.trim()) return null;
        return pages.filter(p => 
            p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
            p.description?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [pages, searchTerm]);

    return (
        <div className="min-h-screen bg-[#f8fafc] font-sans text-slate-900 selection:bg-indigo-100 relative pb-20">
            {/* Arka Plan */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-indigo-50/50 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-sky-50/50 rounded-full blur-[100px]" />
            </div>

            <main className="container mx-auto p-4 md:p-8 space-y-6 relative z-10">
                
                {/* ÜST BAR */}
                <div className="bg-white/80 backdrop-blur-xl border border-slate-200 p-4 md:p-6 rounded-[2.5rem] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-200">
                            <Globe className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Döküman Merkezi</h1>
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-0.5">Ek Materyaller ve Rehberlik</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative flex-1 md:w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input 
                                placeholder="Tüm dökümanlarda ara..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 bg-slate-100/50 border-none rounded-2xl h-11 focus-visible:ring-indigo-500"
                            />
                        </div>
                        
                        {/* Görünüm Değiştirici */}
                        <div className="hidden sm:flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                            <Button 
                                variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
                                size="icon" 
                                onClick={() => setViewMode('grid')}
                                className={cn("h-9 w-9 rounded-lg", viewMode === 'grid' ? "bg-white shadow-sm" : "text-slate-500")}
                            >
                                <LayoutGrid className="h-4 w-4" />
                            </Button>
                            <Button 
                                variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
                                size="icon" 
                                onClick={() => setViewMode('list')}
                                className={cn("h-9 w-9 rounded-lg", viewMode === 'list' ? "bg-white shadow-sm" : "text-slate-500")}
                            >
                                <List className="h-4 w-4" />
                            </Button>
                        </div>

                        <Button asChild variant="outline" className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 gap-2 h-11 px-5">
                            <Link href="/teacher/extra-pages"><Settings className="h-4 w-4" /> Yönet</Link>
                        </Button>
                    </div>
                </div>

                {/* YOL GÖSTERİCİ (BREADCRUMB) */}
                {!searchTerm && (
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2 px-1">
                        <button 
                            onClick={goToRoot}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
                                currentPath.length === 0 ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" : "bg-white text-slate-500 hover:bg-slate-100"
                            )}
                        >
                            <Home className="h-4 w-4" /> Ana Dizin
                        </button>
                        {currentPath.map((folder, i) => (
                            <React.Fragment key={i}>
                                <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />
                                <button 
                                    onClick={() => navigateUp(i)}
                                    className={cn(
                                        "px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
                                        i === currentPath.length - 1 ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" : "bg-white text-slate-500 hover:bg-slate-100"
                                    )}
                                >
                                    {folder}
                                </button>
                            </React.Fragment>
                        ))}
                    </div>
                )}

                {/* İÇERİK ALANI */}
                {isLoading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
                    </div>
                ) : searchTerm ? (
                    /* ARAMA SONUÇLARI GÖRÜNÜMÜ */
                    <div className="space-y-4">
                        <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest px-2">Arama Sonuçları</h2>
                        <div className={cn(
                            viewMode === 'grid' 
                                ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4" 
                                : "flex flex-col gap-3"
                        )}>
                            {searchResults && searchResults.length > 0 ? (
                                searchResults.map(page => (
                                    <PageCard key={page.id} page={page} viewMode={viewMode} />
                                ))
                            ) : (
                                <div className="col-span-full py-20 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200">
                                    <Search className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                                    <p className="text-slate-400 font-bold">Eşleşen döküman bulunamadı.</p>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    /* STANDART KLASÖR GEZGİNİ GÖRÜNÜMÜ */
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* KLASÖRLER */}
                        {explorerData.folders.length > 0 && (
                            <div className="space-y-4">
                                <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest px-2 flex items-center gap-2">
                                    <Folder className="h-4 w-4" /> Klasörler
                                </h2>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                                    {explorerData.folders.map(folder => (
                                        <button 
                                            key={folder}
                                            onClick={() => navigateToFolder(folder)}
                                            className="group flex flex-col items-center justify-center p-6 bg-white border border-slate-200 rounded-[2rem] hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-100 transition-all duration-300"
                                        >
                                            <div className="relative">
                                                <Folder className="h-12 w-12 text-amber-400 fill-amber-400 group-hover:scale-110 transition-transform" />
                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                    <ChevronRight className="h-6 w-6 text-white drop-shadow-md" />
                                                </div>
                                            </div>
                                            <span className="mt-3 text-sm font-black text-slate-700 text-center line-clamp-1 uppercase tracking-tight">{folder}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* DOSYALAR (DÖKÜMANLAR) */}
                        <div className="space-y-4">
                            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest px-2 flex items-center gap-2">
                                <FileText className="h-4 w-4" /> Dökümanlar
                            </h2>
                            <div className={cn(
                                viewMode === 'grid' 
                                    ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4" 
                                    : "flex flex-col gap-3"
                            )}>
                                {explorerData.files.length > 0 ? (
                                    explorerData.files.map(page => (
                                        <PageCard key={page.id} page={page} viewMode={viewMode} />
                                    ))
                                ) : explorerData.folders.length === 0 ? (
                                    <div className="col-span-full py-20 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200">
                                        <FileText className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                                        <p className="text-slate-400 font-bold">Bu klasör henüz boş.</p>
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

function PageCard({ page, viewMode }: { page: any, viewMode: 'grid' | 'list' }) {
    if (viewMode === 'list') {
        return (
            <Link href={`/extra/${page.id}`} className="block group">
                <div className="flex items-center gap-4 bg-white/60 backdrop-blur-md border border-slate-200 p-4 rounded-2xl hover:border-indigo-400 hover:bg-white hover:shadow-lg transition-all duration-300">
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors shrink-0 shadow-sm">
                        <FileText className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-4">
                            <h3 className="font-bold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">{page.title}</h3>
                            <div className="hidden sm:flex items-center gap-3 shrink-0">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter flex items-center gap-1">
                                    <Clock className="h-3 w-3" /> {page.updatedAt ? new Date(page.updatedAt).toLocaleDateString('tr-TR') : '-'}
                                </span>
                                <Badge variant="secondary" className="bg-slate-100 text-slate-500 border-none text-[9px] uppercase font-black px-2">{page.category?.split('/').pop() || 'Genel'}</Badge>
                            </div>
                        </div>
                        {page.description && <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{page.description}</p>}
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                </div>
            </Link>
        );
    }

    return (
        <Link href={`/extra/${page.id}`} className="block h-full group">
            <Card className="h-full bg-white/60 backdrop-blur-md border-slate-200 hover:border-indigo-400 hover:shadow-2xl hover:shadow-indigo-100 transition-all duration-500 rounded-[2rem] overflow-hidden flex flex-col group">
                <CardHeader className="p-5 pb-2">
                    <div className="flex justify-between items-start mb-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                            <FileText className="h-5 w-5" />
                        </div>
                        <Badge variant="secondary" className="bg-slate-100 text-slate-500 border-none text-[9px] uppercase font-black px-2 py-0.5">
                            {page.category?.split('/').pop() || 'Genel'}
                        </Badge>
                    </div>
                    <CardTitle className="text-lg font-black text-slate-800 group-hover:text-indigo-600 transition-colors leading-tight line-clamp-2">
                        {page.title}
                    </CardTitle>
                </CardHeader>
                <CardContent className="px-5 flex-1">
                    <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed font-medium">
                        {page.description || "Bu döküman için bir açıklama bulunmuyor."}
                    </p>
                </CardContent>
                <CardFooter className="px-5 py-4 border-t border-slate-100 flex items-center justify-between mt-auto">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {page.updatedAt ? new Date(page.updatedAt).toLocaleDateString('tr-TR') : '-'}
                    </span>
                    <div className="flex items-center text-[10px] font-black text-indigo-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                        OKU <ArrowRight className="ml-1 h-3 w-3" />
                    </div>
                </CardFooter>
            </Card>
        </Link>
    );
}