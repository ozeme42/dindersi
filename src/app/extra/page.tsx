
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
    Globe, Search, ArrowRight, LayoutGrid, List, 
    ArrowLeft, Home, Settings, Plus, Minus, 
    GripHorizontal, ChevronDown, Clock, FileText,
    Folder, ChevronRight, MonitorPlay, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
    Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { getExtraPages } from '@/app/teacher/extra-pages/actions';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function ExtraPagesExplorer() {
    const [pages, setPages] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [currentPath, setCurrentPath] = useState<string[]>([]);

    // Cihaz algılama ve varsayılan görünüm seçimi
    useEffect(() => {
        if (window.innerWidth < 768) {
            setViewMode('list');
        }
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        const res = await getExtraPages(true); // Sadece yayınlananlar
        if (res.success) {
            setPages(res.data || []);
        }
        setIsLoading(false);
    };

    // Hiyerarşik Klasör Yapısı
    const folderStructure = useMemo(() => {
        const root: any = { files: [], folders: {} };
        
        pages.forEach(page => {
            const category = page.category || 'Genel';
            const parts = category.split('/');
            let current = root;
            
            parts.forEach(part => {
                if (!current.folders[part]) {
                    current.folders[part] = { files: [], folders: {} };
                }
                current = current.folders[part];
            });
            current.files.push(page);
        });
        
        return root;
    }, [pages]);

    // Mevcut klasör içeriği
    const currentData = useMemo(() => {
        let current = folderStructure;
        for (const part of currentPath) {
            if (current.folders[part]) {
                current = current.folders[part];
            } else {
                return { files: [], folders: {} };
            }
        }
        return current;
    }, [folderStructure, currentPath]);

    const handleFolderClick = (folderName: string) => {
        setCurrentPath([...currentPath, folderName]);
    };

    const handleBack = () => {
        setCurrentPath(currentPath.slice(0, -1));
    };

    const filteredFiles = currentData.files.filter((f: any) => 
        f.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredFolders = Object.keys(currentData.folders).filter(f => 
        f.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-indigo-100">
            {/* Arka Plan */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-indigo-100/40 rounded-full blur-[120px] mix-blend-multiply" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-sky-100/40 rounded-full blur-[120px] mix-blend-multiply" />
            </div>

            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200">
                <div className="container mx-auto px-4 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button asChild variant="ghost" size="icon" className="rounded-full">
                            <Link href="/"><ArrowLeft className="h-6 w-6 text-slate-600" /></Link>
                        </Button>
                        <div>
                            <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">Döküman Merkezi</h1>
                            <div className="flex items-center gap-1 text-[10px] text-indigo-600 font-bold uppercase tracking-widest">
                                <Globe className="h-3 w-3" /> Ekstra Sayfalar
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 hidden sm:flex">
                            <Button 
                                variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
                                size="icon" 
                                onClick={() => setViewMode('grid')}
                                className={cn("h-8 w-8 rounded-lg", viewMode === 'grid' ? "bg-white shadow-sm text-indigo-600" : "text-slate-500")}
                            >
                                <LayoutGrid className="h-4 w-4" />
                            </Button>
                            <Button 
                                variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
                                size="icon" 
                                onClick={() => setViewMode('list')}
                                className={cn("h-8 w-8 rounded-lg", viewMode === 'list' ? "bg-white shadow-sm text-indigo-600" : "text-slate-500")}
                            >
                                <List className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8 relative z-10 space-y-8">
                {/* Search and Navigation */}
                <div className="flex flex-col md:flex-row items-center gap-4">
                    <div className="relative w-full md:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input 
                            placeholder="Dosya ara..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 bg-white border-slate-200 rounded-xl focus-visible:ring-indigo-500 h-11"
                        />
                    </div>

                    {currentPath.length > 0 && (
                        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2">
                            <Button variant="ghost" size="sm" onClick={() => setCurrentPath([])} className="text-xs font-bold text-slate-500 hover:text-indigo-600">KÖK</Button>
                            {currentPath.map((part, i) => (
                                <React.Fragment key={i}>
                                    <ChevronRight className="h-4 w-4 text-slate-300" />
                                    <Button variant="ghost" size="sm" onClick={() => setCurrentPath(currentPath.slice(0, i + 1))} className="text-xs font-bold text-slate-900">{part.toUpperCase()}</Button>
                                </React.Fragment>
                            ))}
                        </div>
                    )}
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-indigo-500" /></div>
                ) : (
                    <div className={cn(
                        viewMode === 'grid' 
                            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" 
                            : "flex flex-col gap-3"
                    )}>
                        {/* Klasörler */}
                        {filteredFolders.map(folder => (
                            <button
                                key={folder}
                                onClick={() => handleFolderClick(folder)}
                                className={cn(
                                    "group transition-all duration-300",
                                    viewMode === 'grid' 
                                        ? "p-6 bg-white border border-slate-200 rounded-[2rem] hover:shadow-xl hover:-translate-y-1 flex flex-col items-center text-center" 
                                        : "p-4 bg-white border border-slate-200 rounded-2xl flex items-center gap-4 hover:border-indigo-300 hover:bg-indigo-50/30 text-left"
                                )}
                            >
                                <div className={cn(
                                    "bg-amber-50 rounded-2xl text-amber-600 flex items-center justify-center transition-transform group-hover:scale-110",
                                    viewMode === 'grid' ? "w-20 h-20 mb-4" : "w-12 h-12"
                                )}>
                                    <Folder className={cn(viewMode === 'grid' ? "h-10 w-10" : "h-6 w-6")} fill="currentColor" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-black text-lg text-slate-900 uppercase tracking-tight truncate">{folder}</h3>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">Klasör</p>
                                </div>
                                {viewMode === 'list' && <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-amber-500" />}
                            </button>
                        ))}

                        {/* Dosyalar */}
                        {filteredFiles.map(page => (
                            <Link
                                key={page.id}
                                href={`/extra/${page.id}`}
                                className={cn(
                                    "group transition-all duration-300",
                                    viewMode === 'grid' 
                                        ? "block h-full" 
                                        : "block"
                                )}
                            >
                                {viewMode === 'grid' ? (
                                    <Card className="h-full rounded-[2rem] border-slate-200 hover:shadow-xl transition-all overflow-hidden flex flex-col group relative">
                                        <CardHeader className="pb-4">
                                            <div className="p-2.5 bg-indigo-50 w-fit rounded-xl text-indigo-600 mb-3 group-hover:scale-110 transition-transform">
                                                <FileText className="h-5 w-5" />
                                            </div>
                                            <CardTitle className="text-xl leading-tight group-hover:text-indigo-600 transition-colors uppercase font-black">{page.title}</CardTitle>
                                        </CardHeader>
                                        <CardContent className="flex-grow">
                                            <p className="text-sm text-slate-500 line-clamp-3">
                                                {page.description || "İnteraktif ders materyali ve döküman içeriği."}
                                            </p>
                                        </CardContent>
                                        <CardFooter className="pt-4 border-t border-slate-50 flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {page.updatedAt ? format(new Date(page.updatedAt), 'dd.MM.yyyy', { locale: tr }) : '-'}</span>
                                            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                        </CardFooter>
                                    </Card>
                                ) : (
                                    <div className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center gap-4 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all">
                                        <div className="bg-indigo-50 w-12 h-12 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
                                            <FileText className="h-6 w-6" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-slate-900 truncate uppercase">{page.title}</h3>
                                            <p className="text-xs text-slate-400 line-clamp-1">{page.description || "Döküman içeriği"}</p>
                                        </div>
                                        <div className="flex flex-col items-end gap-1 shrink-0">
                                            <Badge variant="outline" className="text-[9px] font-black uppercase bg-slate-50">{page.category || 'Genel'}</Badge>
                                            <span className="text-[9px] text-slate-400 font-bold uppercase">{page.updatedAt ? format(new Date(page.updatedAt), 'dd.MM.yyyy', { locale: tr }) : '-'}</span>
                                        </div>
                                        <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-indigo-600 ml-2" />
                                    </div>
                                )}
                            </Link>
                        ))}
                    </div>
                )}

                {/* Empty State */}
                {!isLoading && filteredFiles.length === 0 && filteredFolders.length === 0 && (
                    <div className="text-center py-32 bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
                        <FileText className="h-16 w-16 text-slate-200 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-slate-400 uppercase tracking-tight">İçerik Bulunamadı</h3>
                        <p className="text-slate-400 text-sm mt-2">Bu klasörde veya aramada sonuç bulunamadı.</p>
                        <Button variant="link" onClick={() => { setCurrentPath([]); setSearchTerm(""); }} className="mt-4 text-indigo-600 font-bold">Tümüne Geri Dön</Button>
                    </div>
                )}
            </main>
        </div>
    );
}

