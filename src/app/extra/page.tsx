
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
    Search, ChevronRight, Clock, Folder, FileText, 
    ArrowLeft, LayoutGrid, List, Settings, Home, Loader2,
    Filter
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

    // Cihaza göre varsayılan görünüm modu
    useEffect(() => {
        if (window.innerWidth < 768) {
            setViewMode('list');
        }
    }, []);

    const fetchPages = async () => {
        setIsLoading(true);
        // Sadece yayında olanları getir
        const res = await getExtraPages(true);
        if (res.success) {
            setPages(res.data || []);
        }
        setIsLoading(false);
    };

    useEffect(() => { fetchPages(); }, []);

    // Kategorileri hiyerarşik olarak ayır
    const currentFolderContent = useMemo(() => {
        const pathStr = currentPath.join('/');
        
        const folders = new Set<string>();
        const files: any[] = [];

        pages.forEach(p => {
            const cat = p.category || 'Genel';
            const catParts = cat.split('/');
            
            // Eğer döküman şu anki klasörün içindeyse
            if (cat === pathStr || (pathStr === "" && cat === "Genel")) {
                files.push(p);
            } 
            // Eğer döküman bir alt klasörün içindeyse
            else if (cat.startsWith(pathStr ? pathStr + '/' : "")) {
                const subPath = pathStr ? cat.substring(pathStr.length + 1) : cat;
                const nextFolder = subPath.split('/')[0];
                if (nextFolder) folders.add(nextFolder);
            }
        });

        return {
            folders: Array.from(folders).sort(),
            files: files.sort((a, b) => a.title.localeCompare(b.title, 'tr'))
        };
    }, [pages, currentPath]);

    const handleFolderClick = (folderName: string) => {
        setCurrentPath([...currentPath, folderName]);
    };

    const handleBreadcrumbClick = (index: number) => {
        if (index === -1) setCurrentPath([]);
        else setCurrentPath(currentPath.slice(0, index + 1));
    };

    const filteredFiles = currentFolderContent.files.filter(f => 
        f.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredFolders = currentFolderContent.folders.filter(f => 
        f.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
            {/* Arka Plan Efekti */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-100/50 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-sky-100/50 rounded-full blur-[120px]" />
            </div>

            <div className="container mx-auto p-4 md:p-8 relative z-10 space-y-6">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/80 backdrop-blur-xl p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-200">
                            <BookOpen className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Döküman Merkezi</h1>
                            <p className="text-slate-500 text-sm font-medium">Rehberlik, materyal ve sunum arşivi.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex mr-2">
                            <Button 
                                variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
                                size="icon" 
                                onClick={() => setViewMode('grid')}
                                className={cn("h-9 w-9 rounded-lg", viewMode === 'grid' && "bg-white shadow-sm")}
                            >
                                <LayoutGrid className="h-4 w-4" />
                            </Button>
                            <Button 
                                variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
                                size="icon" 
                                onClick={() => setViewMode('list')}
                                className={cn("h-9 w-9 rounded-lg", viewMode === 'list' && "bg-white shadow-sm")}
                            >
                                <List className="h-4 w-4" />
                            </Button>
                        </div>
                        <Button asChild variant="outline" className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 gap-2 h-11 px-5">
                            <Link href="/teacher/extra-pages"><Settings className="h-4 w-4" /> Yönet</Link>
                        </Button>
                    </div>
                </div>

                {/* Search & Breadcrumb */}
                <div className="space-y-4">
                    <div className="flex items-center gap-3 bg-white p-2 px-4 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto no-scrollbar">
                        <button 
                            onClick={() => handleBreadcrumbClick(-1)}
                            className={cn(
                                "flex items-center gap-1.5 text-sm font-bold whitespace-nowrap transition-colors py-1.5 px-3 rounded-lg",
                                currentPath.length === 0 ? "bg-indigo-50 text-indigo-600" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
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
                                        "text-sm font-bold whitespace-nowrap transition-colors py-1.5 px-3 rounded-lg",
                                        i === currentPath.length - 1 ? "bg-indigo-50 text-indigo-600" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                                    )}
                                >
                                    {folder}
                                </button>
                            </React.Fragment>
                        ))}
                    </div>

                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <Input 
                            placeholder="Mevcut klasörde ara..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-12 bg-white border-slate-200 rounded-2xl h-12 text-base focus-visible:ring-indigo-500 shadow-sm"
                        />
                    </div>
                </div>

                {/* CONTENT */}
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
                        <p className="text-slate-500 font-medium animate-pulse">Dökümanlar Hazırlanıyor...</p>
                    </div>
                ) : (filteredFiles.length === 0 && filteredFolders.length === 0) ? (
                    <div className="text-center py-32 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200">
                        <div className="p-4 bg-slate-50 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                            <Filter className="h-10 w-10 text-slate-300" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900">Sonuç Bulunamadı</h3>
                        <p className="text-slate-500 mt-1">Bu klasör henüz boş veya aramanızla eşleşen öğe yok.</p>
                    </div>
                ) : (
                    <div className={cn(
                        "transition-all duration-500",
                        viewMode === 'grid' 
                            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" 
                            : "flex flex-col gap-3"
                    )}>
                        {/* KLASÖRLER */}
                        {filteredFolders.map((folder) => (
                            <button 
                                key={folder}
                                onClick={() => handleFolderClick(folder)}
                                className={cn(
                                    "group text-left transition-all duration-300",
                                    viewMode === 'grid'
                                        ? "bg-white p-6 rounded-[2rem] border border-slate-200 hover:shadow-xl hover:-translate-y-1"
                                        : "bg-white p-4 rounded-2xl border border-slate-200 hover:border-indigo-300 flex items-center gap-4"
                                )}
                            >
                                <div className={cn(
                                    "rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm",
                                    viewMode === 'grid' ? "w-14 h-14 mb-4" : "w-10 h-10"
                                )}>
                                    <Folder className={cn(viewMode === 'grid' ? "h-7 w-7" : "h-5 w-5")} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-black text-slate-900 text-lg uppercase tracking-tight truncate">{folder}</h3>
                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-0.5">Klasör</p>
                                </div>
                                {viewMode === 'list' && <ChevronRight className="h-5 w-5 text-slate-300 group-hover:translate-x-1 transition-transform" />}
                            </button>
                        ))}

                        {/* DOSYALAR */}
                        {filteredFiles.map((page) => (
                            <Link 
                                key={page.id} 
                                href={`/extra/${page.id}`}
                                className={cn(
                                    "group transition-all duration-300",
                                    viewMode === 'grid'
                                        ? "flex flex-col bg-white rounded-[2rem] border border-slate-200 hover:shadow-2xl hover:-translate-y-1.5 overflow-hidden"
                                        : "bg-white p-4 rounded-2xl border border-slate-200 hover:border-indigo-400 flex items-center gap-4"
                                )}
                            >
                                <div className={cn(
                                    "rounded-2xl flex items-center justify-center transition-all",
                                    viewMode === 'grid' 
                                        ? "w-14 h-14 bg-indigo-50 text-indigo-600 m-6 mb-2 group-hover:bg-indigo-600 group-hover:text-white" 
                                        : "w-10 h-10 bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600"
                                )}>
                                    <FileText className={cn(viewMode === 'grid' ? "h-7 w-7" : "h-5 w-5")} />
                                </div>
                                
                                <div className={cn("flex-1 min-w-0", viewMode === 'grid' ? "p-6 pt-0" : "")}>
                                    <h3 className="font-bold text-slate-900 text-lg line-clamp-1 group-hover:text-indigo-600 transition-colors leading-tight">
                                        {page.title}
                                    </h3>
                                    {page.description && (
                                        <p className="text-sm text-slate-500 line-clamp-2 mt-1 font-medium leading-snug">
                                            {page.description}
                                        </p>
                                    )}
                                    <div className="flex items-center gap-3 mt-3">
                                        <div className="flex items-center gap-1 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            <Clock className="h-3 w-3" />
                                            {page.updatedAt ? new Date(page.updatedAt).toLocaleDateString('tr-TR') : 'YENİ'}
                                        </div>
                                    </div>
                                </div>
                                {viewMode === 'list' && <ArrowRight className="h-5 w-5 text-slate-300 group-hover:translate-x-1 transition-transform mr-2" />}
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

