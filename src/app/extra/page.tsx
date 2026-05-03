
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
    Search, Folder, FileText, ArrowRight, ArrowLeft, 
    Loader2, ChevronRight, Home, Settings, LayoutGrid, List,
    Sparkles, Clock, Globe
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
    
    // Mobil/Masaüstü tespiti ve varsayılan görünüm
    useEffect(() => {
        const isMobile = window.innerWidth < 768;
        setViewMode(isMobile ? 'list' : 'grid');
        
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

    // Mevcut klasördeki öğeleri filtrele
    const currentItems = useMemo(() => {
        const pathStr = currentPath.join('/');
        
        const folders = new Set<string>();
        const files: any[] = [];

        pages.forEach(page => {
            const cat = page.category || 'Genel';
            
            if (pathStr === "") {
                // Ana dizindeyiz
                const rootPart = cat.split('/')[0];
                if (cat.includes('/')) {
                    folders.add(rootPart);
                } else {
                    if (cat === 'Genel') files.push(page);
                    else folders.add(cat);
                }
            } else {
                // Bir klasörün içindeyiz
                if (cat.startsWith(pathStr + '/')) {
                    const relativePath = cat.slice(pathStr.length + 1);
                    const nextPart = relativePath.split('/')[0];
                    if (relativePath.includes('/')) {
                        folders.add(nextPart);
                    } else {
                        folders.add(nextPart);
                    }
                } else if (cat === pathStr) {
                    files.push(page);
                }
            }
        });

        const sortedFolders = Array.from(folders).sort().map(name => ({
            type: 'folder',
            name: name
        }));

        const sortedFiles = files.sort((a, b) => a.title.localeCompare(b.title, 'tr')).map(file => ({
            type: 'file',
            ...file
        }));

        const combined = [...sortedFolders, ...sortedFiles];

        // Arama varsa sadece dökümanlarda ara (klasör yapısını bozmamak için)
        if (searchTerm) {
            return sortedFiles.filter(f => f.title.toLowerCase().includes(searchTerm.toLowerCase()));
        }

        return combined;
    }, [pages, currentPath, searchTerm]);

    const navigateToFolder = (folderName: string) => {
        setCurrentPath([...currentPath, folderName]);
        setSearchTerm("");
    };

    const navigateBack = (index: number) => {
        setCurrentPath(currentPath.slice(0, index + 1));
        setSearchTerm("");
    };

    const navigateHome = () => {
        setCurrentPath([]);
        setSearchTerm("");
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans pb-20">
            {/* Arka Plan Süslemeleri */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-indigo-100/50 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-sky-100/50 rounded-full blur-[120px]" />
            </div>

            {/* Sticky Header */}
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200">
                <div className="container mx-auto px-4 h-20 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/">
                            <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100 h-10 w-10">
                                <ArrowLeft className="h-5 w-5 text-slate-600" />
                            </Button>
                        </Link>
                        <div className="flex flex-col">
                            <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none uppercase">Döküman Merkezi</h1>
                            <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest mt-1">Ekstra Kaynaklar & Rehberler</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden md:flex bg-slate-100 p-1 rounded-xl border border-slate-200">
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
            </header>

            <main className="flex-1 container mx-auto px-4 py-8 relative z-10">
                {/* Search & Breadcrumb Bar */}
                <div className="flex flex-col md:flex-row items-center gap-4 mb-8">
                    <div className="w-full md:flex-1 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-2 overflow-hidden">
                        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar px-2 min-w-0 flex-1">
                            <button 
                                onClick={navigateHome}
                                className={cn(
                                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap",
                                    currentPath.length === 0 ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-100"
                                )}
                            >
                                <Home className="h-4 w-4" /> Ana Dizin
                            </button>
                            {currentPath.map((folder, i) => (
                                <React.Fragment key={i}>
                                    <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />
                                    <button 
                                        onClick={() => navigateBack(i)}
                                        className={cn(
                                            "px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap",
                                            i === currentPath.length - 1 ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-100"
                                        )}
                                    >
                                        {folder}
                                    </button>
                                </React.Fragment>
                            ))}
                        </div>
                        <div className="hidden sm:flex relative w-48 lg:w-64 border-l border-slate-100 pl-2 pr-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input 
                                placeholder="Sayfalarda ara..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 h-9 bg-slate-50 border-none rounded-lg text-xs focus-visible:ring-indigo-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Content Grid/List */}
                {isLoading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
                    </div>
                ) : (
                    <div className={cn(
                        viewMode === 'grid' 
                            ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4" 
                            : "flex flex-col gap-2"
                    )}>
                        {currentItems.map((item, idx) => (
                            <React.Fragment key={item.type === 'folder' ? `folder-${item.name}` : `file-${item.id}`}>
                                {item.type === 'folder' ? (
                                    <button 
                                        onClick={() => navigateToFolder(item.name)}
                                        className={cn(
                                            "group text-left transition-all duration-300",
                                            viewMode === 'grid' 
                                                ? "flex flex-col items-center justify-center p-6 bg-white border border-slate-200 rounded-3xl hover:shadow-xl hover:border-indigo-200 hover:-translate-y-1"
                                                : "flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50"
                                        )}
                                    >
                                        <div className={cn(
                                            "rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center transition-transform group-hover:scale-110",
                                            viewMode === 'grid' ? "w-16 h-16 mb-4" : "w-10 h-10"
                                        )}>
                                            <Folder className={viewMode === 'grid' ? "h-8 w-8" : "h-5 w-5"} fill="currentColor" />
                                        </div>
                                        <div className={viewMode === 'grid' ? "text-center" : "flex-1"}>
                                            <span className="font-bold text-slate-800 block truncate max-w-full">{item.name}</span>
                                            {viewMode === 'list' && <span className="text-[10px] text-slate-400 font-bold uppercase">Klasör</span>}
                                        </div>
                                        {viewMode === 'list' && <ChevronRight className="h-4 w-4 text-slate-300" />}
                                    </button>
                                ) : (
                                    <Link 
                                        href={`/extra/${item.id}`}
                                        className={cn(
                                            "group transition-all duration-300",
                                            viewMode === 'grid' ? "h-full" : "w-full"
                                        )}
                                    >
                                        {viewMode === 'grid' ? (
                                            <Card className="h-full bg-white border-slate-200 rounded-3xl overflow-hidden hover:shadow-xl hover:border-indigo-200 hover:-translate-y-1 transition-all flex flex-col">
                                                <CardHeader className="pb-3 p-5">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                                            <FileText className="h-5 w-5" />
                                                        </div>
                                                        <Badge variant="outline" className="text-[9px] bg-slate-50 border-slate-100 font-bold">DÖKÜMAN</Badge>
                                                    </div>
                                                    <CardTitle className="text-base font-bold text-slate-800 line-clamp-2 leading-tight group-hover:text-indigo-600 transition-colors">
                                                        {item.title}
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="flex-grow px-5 pb-4">
                                                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                                                        {item.description || "Döküman içeriğini görüntülemek için tıklayın."}
                                                    </p>
                                                </CardContent>
                                                <CardFooter className="px-5 py-3 border-t border-slate-50 flex items-center justify-between">
                                                    <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400">
                                                        <Clock className="h-3 w-3" />
                                                        {item.updatedAt ? format(new Date(item.updatedAt), 'dd.MM.yyyy') : '-'}
                                                    </div>
                                                    <div className="bg-slate-900 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                                                        <ArrowRight className="h-3.5 w-3.5" />
                                                    </div>
                                                </CardFooter>
                                            </Card>
                                        ) : (
                                            <div className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-2xl hover:border-indigo-300 hover:bg-indigo-50 transition-all group">
                                                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                                                    <FileText className="h-5 w-5" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-slate-800 truncate">{item.title}</span>
                                                        <Badge variant="outline" className="hidden sm:inline-flex text-[9px] h-4 bg-slate-50 border-slate-100">DÖKÜMAN</Badge>
                                                    </div>
                                                    <p className="text-[11px] text-slate-500 truncate">{item.description || "Görüntülemek için tıklayın."}</p>
                                                </div>
                                                <div className="flex flex-col items-end gap-1 shrink-0">
                                                    <span className="text-[9px] font-bold text-slate-400">{item.updatedAt ? format(new Date(item.updatedAt), 'dd.MM.yyyy') : '-'}</span>
                                                    <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                                                </div>
                                            </div>
                                        )}
                                    </Link>
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                )}

                {/* Empty State */}
                {!isLoading && currentItems.length === 0 && (
                    <div className="text-center py-20 bg-white/50 rounded-[3rem] border-2 border-dashed border-slate-200">
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <FileText className="h-10 w-10 text-slate-300" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900">Klasör Boş</h3>
                        <p className="text-slate-500 mt-2">Bu kategoride henüz bir döküman bulunmuyor.</p>
                        <Button variant="outline" onClick={navigateHome} className="mt-6 rounded-xl border-slate-200">
                            Ana Dizine Dön
                        </Button>
                    </div>
                )}
            </main>
        </div>
    );
}

