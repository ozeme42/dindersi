
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
    Globe, Search, ArrowRight, Clock, LayoutGrid, 
    List, Grid3X3, ChevronRight, Home, Settings, Loader2,
    Folder, FolderOpen, ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
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
    const [currentPath, setCurrentPath] = useState<string[]>([]); // Klasör navigasyonu

    useEffect(() => {
        // Cihaz algılama: Mobilde liste, masaüstünde ızgara varsayılan
        if (window.innerWidth < 768) {
            setViewMode('list');
        }

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

    // Kategorileri hiyerarşik yapıya sok (Mevcut dizindeki klasörler ve dosyalar)
    const currentDirectory = useMemo(() => {
        const pathStr = currentPath.join('/');
        
        const items = new Set<string>();
        const files: any[] = [];

        pages.forEach(p => {
            const cat = p.category || 'Genel';
            if (pathStr === "") {
                // Ana dizindeyiz
                const rootPart = cat.split('/')[0];
                if (cat.includes('/')) {
                    items.add(rootPart);
                } else {
                    if (cat === "Genel") files.push(p);
                    else items.add(cat);
                }
            } else {
                // Alt dizindeyiz
                if (cat.startsWith(pathStr + '/')) {
                    const subPath = cat.substring(pathStr.length + 1);
                    const nextPart = subPath.split('/')[0];
                    if (subPath.includes('/')) {
                        items.add(nextPart);
                    } else {
                        items.add(nextPart);
                    }
                } else if (cat === pathStr) {
                    files.push(p);
                }
            }
        });

        return {
            folders: Array.from(items).sort(),
            files: files.sort((a, b) => a.title.localeCompare(b.title, 'tr'))
        };
    }, [pages, currentPath]);

    const filteredFiles = currentDirectory.files.filter(f => 
        f.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleFolderClick = (folder: string) => {
        setCurrentPath([...currentPath, folder]);
    };

    const handleBack = () => {
        setCurrentPath(currentPath.slice(0, -1));
    };

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-slate-50">
                <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
            {/* Arka Plan Işımaları */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-indigo-100/50 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-sky-100/50 rounded-full blur-[120px]" />
            </div>

            <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200">
                <div className="container mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-200">
                            <Globe className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black tracking-tight uppercase">Döküman Merkezi</h1>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Ekstra Materyaller</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input 
                                placeholder="Dosya ara..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 bg-slate-100/50 border-none rounded-xl focus-visible:ring-indigo-500 h-10"
                            />
                        </div>
                        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
                            <Button 
                                variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
                                size="icon" 
                                onClick={() => setViewMode('grid')}
                                className={cn("h-8 w-8 rounded-lg", viewMode === 'grid' ? "bg-white shadow-sm" : "text-slate-400")}
                            >
                                <Grid3X3 className="h-4 w-4" />
                            </Button>
                            <Button 
                                variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
                                size="icon" 
                                onClick={() => setViewMode('list')}
                                className={cn("h-8 w-8 rounded-lg", viewMode === 'list' ? "bg-white shadow-sm" : "text-slate-400")}
                            >
                                <List className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8 relative z-10">
                {/* Breadcrumb / Navigasyon */}
                <div className="flex items-center gap-2 mb-8 bg-white/60 p-3 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto whitespace-nowrap scrollbar-hide">
                    <Button variant="ghost" size="sm" onClick={() => setCurrentPath([])} className={cn("rounded-lg gap-2 h-8", currentPath.length === 0 ? "bg-indigo-50 text-indigo-700 font-bold" : "text-slate-500")}>
                        <Home className="h-4 w-4" /> Ana Dizin
                    </Button>
                    {currentPath.map((folder, i) => (
                        <React.Fragment key={i}>
                            <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setCurrentPath(currentPath.slice(0, i + 1))}
                                className={cn("rounded-lg h-8", i === currentPath.length - 1 ? "bg-indigo-50 text-indigo-700 font-bold" : "text-slate-500")}
                            >
                                {folder}
                            </Button>
                        </React.Fragment>
                    ))}
                </div>

                {/* İçerik Alanı */}
                {currentDirectory.folders.length === 0 && filteredFiles.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 shadow-inner">
                        <Folder className="h-16 w-16 text-slate-200 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-slate-400">Bu klasör boş görünüyor.</h3>
                        {currentPath.length > 0 && (
                            <Button onClick={handleBack} variant="link" className="mt-2 text-indigo-600">Geri Dön</Button>
                        )}
                    </div>
                ) : (
                    <div className={cn(
                        "grid gap-4 md:gap-6",
                        viewMode === 'grid' ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" : "grid-cols-1"
                    )}>
                        {/* Klasörler */}
                        {currentDirectory.folders.map(folder => (
                            <button
                                key={folder}
                                onClick={() => handleFolderClick(folder)}
                                className={cn(
                                    "group relative flex items-center gap-4 transition-all duration-300 text-left",
                                    viewMode === 'grid' 
                                        ? "flex-col justify-center p-6 bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-indigo-200" 
                                        : "p-4 bg-white/80 rounded-2xl border border-slate-200 shadow-sm hover:bg-white hover:border-indigo-300"
                                )}
                            >
                                <div className={cn(
                                    "flex items-center justify-center rounded-2xl transition-transform group-hover:scale-110",
                                    viewMode === 'grid' ? "w-16 h-16 bg-amber-50 text-amber-500" : "w-10 h-10 bg-amber-100 text-amber-600"
                                )}>
                                    <FolderOpen className={viewMode === 'grid' ? "h-8 w-8" : "h-5 w-5"} fill="currentColor" fillOpacity={0.2} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-slate-800 truncate">{folder}</h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Klasör</p>
                                </div>
                                {viewMode === 'list' && <ChevronRight className="h-5 w-5 text-slate-300" />}
                            </button>
                        ))}

                        {/* Dosyalar */}
                        {filteredFiles.map(page => (
                            <Link 
                                key={page.id} 
                                href={`/extra/${page.id}`}
                                className="group block"
                            >
                                <Card className={cn(
                                    "h-full overflow-hidden transition-all duration-300 group-hover:shadow-2xl border-slate-200 group-hover:border-indigo-400",
                                    viewMode === 'grid' ? "rounded-3xl flex flex-col" : "rounded-2xl flex flex-row items-center p-2"
                                )}>
                                    <div className={cn(
                                        "flex items-center justify-center shrink-0",
                                        viewMode === 'grid' ? "h-24 bg-indigo-50 text-indigo-500 group-hover:bg-indigo-600 group-hover:text-white transition-colors" : "w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 ml-2"
                                    )}>
                                        <FileText className={viewMode === 'grid' ? "h-10 w-10" : "h-6 w-6"} />
                                    </div>
                                    
                                    <div className={cn("flex-1", viewMode === 'grid' ? "p-5" : "px-4")}>
                                        <h3 className="font-bold text-slate-900 line-clamp-1 group-hover:text-indigo-600 transition-colors">{page.title}</h3>
                                        <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{page.description || 'Döküman içeriği'}</p>
                                        
                                        {viewMode === 'list' && (
                                            <div className="flex items-center gap-3 mt-2 text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                                                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {page.updatedAt ? format(new Date(page.updatedAt), 'dd.MM.yyyy') : '-'}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className={cn(
                                        "flex items-center justify-center transition-all",
                                        viewMode === 'grid' ? "p-4 pt-0 opacity-0 group-hover:opacity-100" : "px-4"
                                    )}>
                                        <div className="bg-slate-900 text-white p-1.5 rounded-lg">
                                            <ArrowRight className="h-4 w-4" />
                                        </div>
                                    </div>
                                </Card>
                            </Link>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}

// Eksik ikonların el ile tanımlanması (Referans hatalarını önlemek için)
const FileText = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
);
