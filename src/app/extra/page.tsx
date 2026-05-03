'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
    Plus, Search, Globe, Eye, Loader2, LayoutGrid, List, 
    ChevronRight, ArrowRight, Clock, Folder, Home, Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getExtraPages } from '@/app/teacher/extra-pages/actions';
import Link from 'next/link';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function ExtraPagesExplorer() {
    const [pages, setPages] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPath, setCurrentPath] = useState<string[]>([]);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    // Cihaz tespiti ve varsayılan görünüm
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

    // Kategorileri hiyerarşik olarak işle
    const currentFolderItems = useMemo(() => {
        const pathStr = currentPath.join('/');
        
        // Bu klasördeki alt klasörleri bul
        const subFolders = new Set<string>();
        const documents = [];

        pages.forEach(p => {
            const cat = p.category || 'Genel';
            if (pathStr === "" || cat === pathStr || cat.startsWith(pathStr + '/')) {
                const relativePath = pathStr === "" ? cat : cat.slice(pathStr.length + 1);
                if (relativePath === "" || !relativePath.includes('/')) {
                    // Bu döküman direkt bu klasörde
                    if (cat === pathStr || (pathStr === "" && !cat.includes('/'))) {
                        documents.push(p);
                    } else if (relativePath !== "") {
                        // Bu bir alt klasör
                        subFolders.add(relativePath);
                    }
                } else {
                    // Daha derin bir klasör, en üst parçasını al
                    subFolders.add(relativePath.split('/')[0]);
                }
            }
        });

        return {
            folders: Array.from(subFolders).sort(),
            docs: documents.sort((a, b) => a.title.localeCompare(b.title, 'tr'))
        };
    }, [pages, currentPath]);

    const filteredDocs = useMemo(() => {
        if (!searchTerm) return currentFolderItems.docs;
        const term = searchTerm.toLowerCase();
        return pages.filter(p => 
            p.title.toLowerCase().includes(term) || 
            p.description?.toLowerCase().includes(term)
        );
    }, [currentFolderItems.docs, pages, searchTerm]);

    const navigateToFolder = (folder: string) => {
        setCurrentPath([...currentPath, folder]);
        setSearchTerm("");
    };

    const navigateToPath = (index: number) => {
        setCurrentPath(currentPath.slice(0, index + 1));
        setSearchTerm("");
    };

    const resetPath = () => {
        setCurrentPath([]);
        setSearchTerm("");
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
                <p className="text-slate-500 font-medium animate-pulse">Dökümanlar Hazırlanıyor...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50/50 pb-20 font-sans">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
                <div className="container mx-auto px-4 h-20 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-5">
                        <div className="p-3 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl text-white shadow-lg shadow-indigo-200">
                            <Globe className="h-7 w-7" />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight uppercase">Döküman Merkezi</h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="hidden md:flex bg-slate-100 p-1 rounded-xl border border-slate-200 mr-2">
                            <Button 
                                variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
                                size="icon" 
                                onClick={() => setViewMode('grid')}
                                className="h-9 w-9 rounded-lg"
                            >
                                <LayoutGrid className="h-4 w-4" />
                            </Button>
                            <Button 
                                variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
                                size="icon" 
                                onClick={() => setViewMode('list')}
                                className="h-9 w-9 rounded-lg"
                            >
                                <List className="h-4 w-4" />
                            </Button>
                        </div>
                        <Button asChild variant="outline" className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 gap-2 h-11 px-5">
                            <Link href="/teacher/extra-pages"><Settings className="h-4 w-4" /> Yönet</Link>
                        </Button>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8 space-y-8">
                {/* Search & Breadcrumbs */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="flex flex-wrap items-center gap-2 text-sm font-bold">
                        <button 
                            onClick={resetPath}
                            className={cn(
                                "flex items-center gap-2 px-3 py-2 rounded-xl transition-all",
                                currentPath.length === 0 ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 hover:bg-slate-100"
                            )}
                        >
                            <Home className="h-4 w-4" /> Ana Dizin
                        </button>
                        {currentPath.map((folder, i) => (
                            <React.Fragment key={i}>
                                <ChevronRight className="h-4 w-4 text-slate-300" />
                                <button 
                                    onClick={() => navigateToPath(i)}
                                    className={cn(
                                        "px-3 py-2 rounded-xl transition-all",
                                        i === currentPath.length - 1 ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 hover:bg-slate-100"
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
                            className="pl-10 bg-slate-50 border-none rounded-xl focus-visible:ring-indigo-500"
                        />
                    </div>
                </div>

                {/* Content Grid */}
                <div className={cn(
                    "grid gap-4",
                    viewMode === 'grid' ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1"
                )}>
                    {/* Folders (Always Grid-ish or list based on mode) */}
                    {!searchTerm && currentFolderItems.folders.map(folder => (
                        <button 
                            key={folder}
                            onClick={() => navigateToFolder(folder)}
                            className={cn(
                                "group p-5 rounded-[2rem] border transition-all duration-300 flex items-center gap-4 text-left shadow-sm",
                                viewMode === 'grid' 
                                    ? "bg-white border-slate-200 hover:border-indigo-400 hover:shadow-xl hover:-translate-y-1 flex-col justify-center text-center py-8" 
                                    : "bg-white border-slate-200 hover:bg-slate-50"
                            )}
                        >
                            <div className={cn(
                                "rounded-2xl flex items-center justify-center transition-all",
                                viewMode === 'grid' ? "w-16 h-16 bg-amber-100 text-amber-600 mb-2 group-hover:scale-110" : "w-10 h-10 bg-amber-50 text-amber-500"
                            )}>
                                <Folder className={cn(viewMode === 'grid' ? "h-8 w-8" : "h-5 w-5")} fill="currentColor" />
                            </div>
                            <div className="min-w-0">
                                <h3 className="font-black text-slate-800 truncate uppercase tracking-tight">{folder}</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Klasör</p>
                            </div>
                            {viewMode === 'list' && <ChevronRight className="ml-auto h-5 w-5 text-slate-300 group-hover:text-indigo-500" />}
                        </button>
                    ))}

                    {/* Documents */}
                    {filteredDocs.map(item => (
                        <Link 
                            key={item.id} 
                            href={`/extra/${item.id}`}
                            className="block group"
                        >
                            {viewMode === 'grid' ? (
                                <Card className="h-full overflow-hidden rounded-[2rem] border-slate-200 hover:border-indigo-500 hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 bg-white">
                                    <CardHeader className="pb-4">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                                <FileText className="h-5 w-5" />
                                            </div>
                                            <Badge variant="outline" className="bg-slate-50 text-[9px] font-black tracking-widest border-slate-100">DÖKÜMAN</Badge>
                                        </div>
                                        <CardTitle className="text-lg font-black text-slate-800 leading-tight line-clamp-2 uppercase group-hover:text-indigo-600 transition-colors">{item.title}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-slate-500 line-clamp-3 min-h-[3rem] font-medium leading-relaxed">
                                            {item.description || "Açıklama belirtilmemiş."}
                                        </p>
                                    </CardContent>
                                    <CardFooter className="pt-4 border-t border-slate-50 flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400">
                                            <Clock className="h-3 w-3" />
                                            {item.updatedAt ? format(new Date(item.updatedAt), 'dd.MM.yyyy', { locale: tr }) : '-'}
                                        </div>
                                        <div className="bg-slate-900 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                            <ArrowRight className="h-4 w-4" />
                                        </div>
                                    </CardFooter>
                                </Card>
                            ) : (
                                <div className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center gap-4 hover:border-indigo-400 hover:bg-slate-50 transition-all shadow-sm group">
                                    <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                        <FileText className="h-6 w-6" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-slate-800 truncate uppercase">{item.title}</h3>
                                        <p className="text-xs text-slate-500 truncate">{item.description || 'Açıklama yok'}</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="hidden sm:flex items-center gap-1.5 text-[9px] font-bold text-slate-400">
                                            <Clock className="h-3 w-3" />
                                            {item.updatedAt ? format(new Date(item.updatedAt), 'dd.MM.yyyy', { locale: tr }) : '-'}
                                        </div>
                                        <div className="bg-slate-900 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                                            <ArrowRight className="h-3.5 w-3.5" />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </Link>
                    ))}

                    {/* Empty State */}
                    {filteredDocs.length === 0 && currentFolderItems.folders.length === 0 && (
                        <div className="col-span-full py-24 text-center">
                            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200">
                                <Search className="h-10 w-10 text-slate-300" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900">Dosya Bulunamadı</h3>
                            <p className="text-slate-500 mt-1">Bu klasör henüz boş veya arama kriterine uygun dosya yok.</p>
                            <Button variant="link" onClick={resetPath} className="mt-4 text-indigo-600 font-bold">Ana Dizine Dön</Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
