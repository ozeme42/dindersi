
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
    Search, LayoutGrid, List, Folder, FileText, 
    ChevronRight, Home, Settings, Loader2, ArrowRight, Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getExtraPages } from '@/app/teacher/extra-pages/actions';
import Link from 'next/link';

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
        // Sadece yayınlanmış sayfaları getir
        const res = await getExtraPages(true);
        if (res.success) {
            setPages(res.data || []);
        }
        setIsLoading(false);
    };

    useEffect(() => { fetchPages(); }, []);

    // Kategorileri ve dosyaları mevcut yola göre filtrele
    const explorerContent = useMemo(() => {
        const pathStr = currentPath.join('/');
        
        const folders = new Set<string>();
        const files: any[] = [];

        pages.forEach(page => {
            const cat = page.category || 'Genel';
            
            if (currentPath.length === 0) {
                // Ana dizindeyiz
                if (cat.includes('/')) {
                    folders.add(cat.split('/')[0]);
                } else if (cat === 'Genel' || cat === '') {
                    files.push(page);
                } else {
                    folders.add(cat);
                }
            } else {
                // Bir klasörün içindeyiz
                if (cat === pathStr) {
                    files.push(page);
                } else if (cat.startsWith(pathStr + '/')) {
                    const relativePart = cat.substring(pathStr.length + 1);
                    folders.add(relativePart.split('/')[0]);
                }
            }
        });

        return {
            folders: Array.from(folders).sort(),
            files: files.sort((a, b) => a.title.localeCompare(b.title, 'tr'))
        };
    }, [pages, currentPath]);

    const filteredFiles = explorerContent.files.filter(f => 
        f.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const navigateToFolder = (folder: string) => {
        setCurrentPath([...currentPath, folder]);
        setSearchTerm("");
    };

    const navigateToPath = (index: number) => {
        setCurrentPath(currentPath.slice(0, index + 1));
        setSearchTerm("");
    };

    const resetToHome = () => {
        setCurrentPath([]);
        setSearchTerm("");
    };

    return (
        <div className="min-h-screen bg-slate-50/50 font-sans selection:bg-indigo-100">
            {/* Arka Plan Efekti */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-5%] w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[100px]" />
            </div>

            <div className="container mx-auto p-4 md:p-8 relative z-10 space-y-6">
                
                {/* ÜST HEADER */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-5">
                        <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-200">
                            <FileText className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Materyal Kütüphanesi</h1>
                            <p className="text-slate-500 text-sm font-medium">Özel dökümanlar ve yardımcı kaynaklar.</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <div className="bg-slate-100 p-1 rounded-xl flex items-center">
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

                {/* BREADCRUMB & ARAMA */}
                <div className="flex flex-col md:flex-row items-center gap-4 bg-white p-3 px-5 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-1 flex-1 overflow-x-auto no-scrollbar py-1">
                        <button 
                            onClick={resetToHome}
                            className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors whitespace-nowrap",
                                currentPath.length === 0 ? "bg-indigo-50 text-indigo-700" : "text-slate-500 hover:bg-slate-50"
                            )}
                        >
                            <Home className="h-4 w-4" /> Ana Dizin
                        </button>
                        {currentPath.map((folder, i) => (
                            <React.Fragment key={i}>
                                <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />
                                <button 
                                    onClick={() => navigateToPath(i)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-lg text-sm font-bold transition-colors whitespace-nowrap",
                                        i === currentPath.length - 1 ? "bg-indigo-50 text-indigo-700" : "text-slate-500 hover:bg-slate-50"
                                    )}
                                >
                                    {folder}
                                </button>
                            </React.Fragment>
                        ))}
                    </div>
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input 
                            placeholder="Dosya ara..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 bg-slate-50 border-none rounded-xl focus-visible:ring-indigo-500 h-10"
                        />
                    </div>
                </div>

                {/* İÇERİK ALANI */}
                {isLoading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
                    </div>
                ) : (
                    <div className="space-y-8 pb-20">
                        {/* KLASÖRLER */}
                        {explorerContent.folders.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                {explorerContent.folders.map(folder => (
                                    <button 
                                        key={folder}
                                        onClick={() => navigateToFolder(folder)}
                                        className="group flex flex-col items-center justify-center p-6 bg-white border border-slate-200 rounded-[2rem] hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300"
                                    >
                                        <div className="p-4 bg-amber-50 rounded-2xl mb-3 group-hover:scale-110 transition-transform">
                                            <Folder className="h-8 w-8 text-amber-500 fill-amber-500" />
                                        </div>
                                        <span className="text-sm font-black text-slate-700 uppercase tracking-tight text-center line-clamp-1">{folder}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* DOSYALAR (GRID) */}
                        {viewMode === 'grid' ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {filteredFiles.map(page => (
                                    <Link key={page.id} href={`/extra/${page.id}`} className="group block h-full">
                                        <Card className="h-full overflow-hidden rounded-[2rem] border-slate-200 hover:shadow-2xl transition-all duration-500 group-hover:-translate-y-1">
                                            <CardHeader className="pb-3">
                                                <div className="flex justify-between items-start mb-2">
                                                    <Badge variant="outline" className="bg-indigo-50 text-indigo-600 border-indigo-100 text-[10px] font-black uppercase">
                                                        DÖKÜMAN
                                                    </Badge>
                                                </div>
                                                <CardTitle className="text-xl font-bold line-clamp-2 group-hover:text-indigo-600 transition-colors leading-tight">
                                                    {page.title}
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <p className="text-sm text-slate-500 line-clamp-2 min-h-[2.5rem] leading-relaxed">
                                                    {page.description || "Bu döküman için açıklama girilmemiş."}
                                                </p>
                                            </CardContent>
                                            <CardFooter className="pt-4 border-t border-slate-50 flex items-center justify-between">
                                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase">
                                                    <Clock className="h-3 w-3" /> 
                                                    {page.updatedAt ? new Date(page.updatedAt).toLocaleDateString('tr-TR') : '-'}
                                                </div>
                                                <div className="bg-slate-900 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all group-hover:scale-110">
                                                    <ArrowRight className="h-4 w-4" />
                                                </div>
                                            </CardFooter>
                                        </Card>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            /* DOSYALAR (LISTE) */
                            <div className="space-y-3">
                                {filteredFiles.map(page => (
                                    <Link key={page.id} href={`/extra/${page.id}`} className="group block">
                                        <div className="bg-white border border-slate-200 p-4 rounded-2xl flex items-center justify-between hover:shadow-lg hover:border-indigo-200 transition-all duration-300">
                                            <div className="flex items-center gap-4 min-w-0">
                                                <div className="p-3 bg-slate-50 rounded-xl text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors shrink-0">
                                                    <FileText className="h-6 w-6" />
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="font-bold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">{page.title}</h3>
                                                    <p className="text-xs text-slate-500 truncate">{page.description || "Açıklama yok."}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-6 shrink-0">
                                                <span className="hidden md:block text-[10px] font-bold text-slate-400 uppercase">{page.updatedAt ? new Date(page.updatedAt).toLocaleDateString('tr-TR') : '-'}</span>
                                                <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}

                        {filteredFiles.length === 0 && explorerContent.folders.length === 0 && (
                            <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
                                <FileText className="h-16 w-16 text-slate-200 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-slate-900">Bu Klasör Boş</h3>
                                <p className="text-slate-400 mt-1">Henüz buraya bir döküman eklenmemiş.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
