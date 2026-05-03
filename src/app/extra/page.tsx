'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
    Globe, Home, Settings, ArrowRight, Search, 
    LayoutGrid, List, ChevronRight, Clock, 
    Folder, ArrowLeft, FileText, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
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

    // Mobilde otomatik liste görünümü
    useEffect(() => {
        if (window.innerWidth < 768) {
            setViewMode('list');
        }
    }, []);

    const fetchPages = async () => {
        setIsLoading(true);
        const res = await getExtraPages(true); // Sadece yayında olanlar
        if (res.success) {
            setPages(res.data || []);
        }
        setIsLoading(false);
    };

    useEffect(() => { fetchPages(); }, []);

    // Hiyerarşik Yapı Oluşturma
    const { currentFolders, currentFiles } = useMemo(() => {
        const pathStr = currentPath.join('/');
        
        const folderSet = new Set<string>();
        const files: any[] = [];

        pages.forEach(p => {
            const cat = p.category || 'Genel';
            if (searchTerm) {
                if (p.title.toLowerCase().includes(searchTerm.toLowerCase())) {
                    files.push(p);
                }
                return;
            }

            if (cat === pathStr || (pathStr === "" && cat === "Genel")) {
                files.push(p);
            } else if (pathStr === "" && cat !== "Genel") {
                folderSet.add(cat.split('/')[0]);
            } else if (cat.startsWith(pathStr + '/')) {
                const sub = cat.substring(pathStr.length + 1).split('/')[0];
                folderSet.add(sub);
            }
        });

        return {
            currentFolders: Array.from(folderSet).sort(),
            currentFiles: files.sort((a, b) => a.title.localeCompare(b.title, 'tr'))
        };
    }, [pages, currentPath, searchTerm]);

    const navigateToFolder = (folder: string) => {
        setCurrentPath([...currentPath, folder]);
        setSearchTerm("");
    };

    const goBack = () => {
        setCurrentPath(currentPath.slice(0, -1));
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20 selection:bg-indigo-500 selection:text-white">
            {/* Arka Plan */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-indigo-100/50 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-sky-100/50 rounded-full blur-[120px]" />
            </div>

            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200">
                <div className="container mx-auto px-4 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-5">
                        <div className="p-3 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl text-white shadow-lg shadow-indigo-200">
                            <Globe className="h-7 w-7" />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight uppercase">Döküman Merkezi</h1>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden sm:block">Eğitim Materyalleri & Kaynaklar</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="bg-slate-100 p-1 rounded-xl hidden sm:flex border border-slate-200">
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
                        <Button asChild variant="ghost" size="icon" className="rounded-full h-11 w-11 hover:bg-slate-100">
                            <Link href="/"><Home className="h-6 w-6 text-slate-600" /></Link>
                        </Button>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8 relative z-10 space-y-8">
                {/* Arama & Navigasyon */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto no-scrollbar py-1">
                        <Button variant="ghost" size="sm" onClick={() => setCurrentPath([])} className={cn("rounded-lg h-9 font-bold", currentPath.length === 0 ? "bg-indigo-50 text-indigo-600" : "text-slate-500")}>
                            Ana Dizin
                        </Button>
                        {currentPath.map((p, i) => (
                            <React.Fragment key={i}>
                                <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => setCurrentPath(currentPath.slice(0, i + 1))}
                                    className={cn("rounded-lg h-9 font-bold", i === currentPath.length - 1 ? "bg-indigo-50 text-indigo-600" : "text-slate-500")}
                                >
                                    {p}
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
                            className="pl-10 bg-slate-50 border-none rounded-xl focus-visible:ring-indigo-500 h-10"
                        />
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-indigo-500" /></div>
                ) : (
                    <div className="space-y-10">
                        {/* Klasörler */}
                        {currentFolders.length > 0 && (
                            <div className="space-y-4">
                                <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Folder className="h-4 w-4 text-amber-500 fill-current" /> Klasörler
                                </h2>
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                    {currentFolders.map(folder => (
                                        <button 
                                            key={folder}
                                            onClick={() => navigateToFolder(folder)}
                                            className="group flex flex-col items-center justify-center p-6 bg-white border border-slate-200 rounded-3xl hover:shadow-xl hover:border-indigo-300 hover:-translate-y-1 transition-all duration-300"
                                        >
                                            <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                                <Folder className="h-8 w-8 text-amber-500 fill-current" />
                                            </div>
                                            <span className="font-bold text-sm text-slate-700 uppercase tracking-tight">{folder}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Dosyalar */}
                        <div className="space-y-4">
                            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <FileText className="h-4 w-4 text-indigo-500" /> Dökümanlar
                            </h2>
                            
                            {viewMode === 'grid' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {currentFiles.map((item) => (
                                        <Link key={item.id} href={`/extra/${item.id}`} className="group h-full">
                                            <Card className="h-full rounded-[2rem] border-slate-200 hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 overflow-hidden flex flex-col bg-white">
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
                                                <CardFooter className="pt-4 border-t border-slate-50 flex items-center justify-between">
                                                    <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400">
                                                        <Clock className="h-3 w-3" />
                                                        {item.updatedAt ? format(new Date(item.updatedAt), 'dd.MM.yyyy', { locale: tr }) : '-'}
                                                    </div>
                                                    <div className="bg-slate-900 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                                                        <ArrowRight className="h-3.5 w-3.5" />
                                                    </div>
                                                </CardFooter>
                                            </Card>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {currentFiles.map((item) => (
                                        <Link key={item.id} href={`/extra/${item.id}`} className="block group">
                                            <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4 hover:shadow-lg hover:border-indigo-300 transition-all">
                                                <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600 group-hover:scale-110 transition-transform">
                                                    <FileText className="h-6 w-6" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-bold text-slate-800 text-lg uppercase truncate">{item.title}</h3>
                                                    <div className="flex items-center gap-3 text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                                                        <span className="flex items-center gap-1"><Folder className="h-3 w-3 text-amber-500" /> {item.category || 'Genel'}</span>
                                                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {item.updatedAt ? format(new Date(item.updatedAt), 'dd.MM.yyyy', { locale: tr }) : '-'}</span>
                                                    </div>
                                                </div>
                                                <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}

                            {currentFiles.length === 0 && currentFolders.length === 0 && (
                                <div className="text-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-slate-200">
                                    <Search className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                                    <p className="text-slate-400 font-medium italic">Bu klasörde döküman bulunamadı.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
