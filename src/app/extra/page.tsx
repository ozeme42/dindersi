'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
    Folder, FileText, LayoutGrid, List, ArrowRight, 
    Clock, ChevronRight, Home, Settings, Search, 
    Loader2 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { getExtraPages } from '@/app/teacher/extra-pages/actions';
import Link from 'next/link';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function ExtraPagesExplorer() {
    const [pages, setPages] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [currentPath, setCurrentPath] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState("");

    // Cihaz tespiti ile varsayılan görünümü ayarla
    useEffect(() => {
        if (window.innerWidth < 768) {
            setViewMode('list');
        }
    }, []);

    const fetchPages = async () => {
        setIsLoading(true);
        const res = await getExtraPages(true); // Sadece yayınlanmışları getir
        if (res.success) {
            setPages(res.data || []);
        }
        setIsLoading(false);
    };

    useEffect(() => { fetchPages(); }, []);

    // Mevcut klasördeki öğeleri (klasörler ve dökümanlar) ayıkla
    const currentItems = useMemo(() => {
        const pathStr = currentPath.join('/');
        const folders = new Set<string>();
        const docs: any[] = [];

        pages.forEach(p => {
            const cat = p.category || 'Genel';
            
            // Eğer döküman tam olarak bu yoldaysa listeye ekle
            if (cat === pathStr || (pathStr === "" && cat === "Genel")) {
                docs.push(p);
            } 
            // Eğer döküman bu yolun altındaysa, bir sonraki klasör adını bul
            else if (pathStr === "" || cat.startsWith(pathStr + '/')) {
                const relativePath = pathStr === "" ? cat : cat.slice(pathStr.length + 1);
                const nextFolderName = relativePath.split('/')[0];
                if (nextFolderName) folders.add(nextFolderName);
            }
        });

        // Arama yapılıyorsa hiyerarşiyi boz ve tüm eşleşen dökümanları getir
        if (searchTerm) {
            return {
                folders: [],
                docs: pages.filter(p => 
                    p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    p.category?.toLowerCase().includes(searchTerm.toLowerCase())
                )
            };
        }

        return {
            folders: Array.from(folders).sort(),
            docs: docs.sort((a, b) => a.title.localeCompare(b.title, 'tr'))
        };
    }, [pages, currentPath, searchTerm]);

    const navigateToFolder = (folderName: string) => {
        setCurrentPath([...currentPath, folderName]);
        setSearchTerm(""); // Klasöre girince aramayı temizle
    };

    const navigateUp = (index: number) => {
        setCurrentPath(currentPath.slice(0, index + 1));
    };

    const navigateToRoot = () => {
        setCurrentPath([]);
    };

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-slate-50">
                <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50/50 pb-20 font-sans">
            {/* Arka Plan Efektleri */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-indigo-100/30 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-blue-100/30 rounded-full blur-[120px]" />
            </div>

            <div className="container mx-auto px-4 pt-8 md:pt-12 relative z-10 space-y-8">
                
                {/* Header */}
                <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="p-3 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl text-white shadow-lg shadow-indigo-200">
                            <Globe className="h-7 w-7" />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight uppercase">Döküman Merkezi</h1>
                            <p className="text-slate-500 text-sm font-medium">Rehberlik, döküman ve interaktif materyaller.</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex">
                            <Button 
                                variant={viewMode === 'grid' ? 'default' : 'ghost'} 
                                size="icon" 
                                onClick={() => setViewMode('grid')}
                                className={cn("h-9 w-10 rounded-lg", viewMode === 'grid' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500")}
                            >
                                <LayoutGrid className="h-4 w-4" />
                            </Button>
                            <Button 
                                variant={viewMode === 'list' ? 'default' : 'ghost'} 
                                size="icon" 
                                onClick={() => setViewMode('list')}
                                className={cn("h-9 w-10 rounded-lg", viewMode === 'list' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500")}
                            >
                                <List className="h-4 w-4" />
                            </Button>
                        </div>
                        <Button asChild variant="outline" className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 gap-2 h-11 px-5">
                            <Link href="/teacher/extra-pages"><Settings className="h-4 w-4" /> Yönet</Link>
                        </Button>
                    </div>
                </div>

                {/* Navigasyon & Arama */}
                <div className="flex flex-col md:flex-row items-center gap-4 bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-sm">
                    {/* Breadcrumbs */}
                    <div className="flex items-center gap-1 flex-1 overflow-x-auto no-scrollbar py-1">
                        <button 
                            onClick={navigateToRoot}
                            className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-all",
                                currentPath.length === 0 ? "bg-indigo-50 text-indigo-600" : "text-slate-400 hover:bg-slate-100"
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
                                        "px-3 py-1.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap",
                                        i === currentPath.length - 1 ? "bg-indigo-50 text-indigo-600" : "text-slate-400 hover:bg-slate-100"
                                    )}
                                >
                                    {folder}
                                </button>
                            </React.Fragment>
                        ))}
                    </div>

                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input 
                            placeholder="Döküman ara..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 bg-slate-50 border-slate-200 rounded-xl focus-visible:ring-indigo-500 h-10"
                        />
                    </div>
                </div>

                {/* İçerik Alanı */}
                <div className="space-y-8">
                    {/* KLASÖRLER (Sadece arama yapılmıyorsa göster) */}
                    {!searchTerm && currentItems.folders.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {currentItems.folders.map(folder => (
                                <button
                                    key={folder}
                                    onClick={() => navigateToFolder(folder)}
                                    className="group bg-white p-4 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all text-center flex flex-col items-center gap-3"
                                >
                                    <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform shadow-inner">
                                        <Folder className="h-8 w-8 fill-current" />
                                    </div>
                                    <span className="text-sm font-black text-slate-700 uppercase tracking-tighter truncate w-full">{folder}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* DÖKÜMANLAR */}
                    {currentItems.docs.length > 0 ? (
                        viewMode === 'grid' ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {currentItems.docs.map(item => (
                                    <Link key={item.id} href={`/extra/${item.id}`} className="group block h-full">
                                        <Card className="h-full overflow-hidden rounded-[2rem] border-slate-200 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 bg-white">
                                            <CardHeader className="pb-4">
                                                <div className="bg-indigo-50 w-10 h-10 rounded-xl flex items-center justify-center text-indigo-500 mb-3 group-hover:scale-110 transition-transform">
                                                    <FileText className="h-5 w-5" />
                                                </div>
                                                <CardTitle className="text-lg font-black text-slate-800 leading-tight line-clamp-2">{item.title}</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <p className="text-sm text-slate-500 line-clamp-3 min-h-[3rem]">
                                                    {item.description || "İçeriği görüntülemek için tıklayın."}
                                                </p>
                                            </CardContent>
                                            <CardFooter className="pt-4 border-t border-slate-50 flex items-center justify-between">
                                                <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                    <Clock className="h-3 w-3" />
                                                    {item.updatedAt ? format(new Date(item.updatedAt), 'dd.MM.yyyy', { locale: tr }) : '-'}
                                                </div>
                                                <div className="bg-slate-900 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <ArrowRight className="h-4 w-4" />
                                                </div>
                                            </CardFooter>
                                        </Card>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-50">
                                {currentItems.docs.map(item => (
                                    <Link key={item.id} href={`/extra/${item.id}`} className="group flex items-center p-4 hover:bg-slate-50 transition-colors gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0 group-hover:scale-110 transition-transform shadow-inner">
                                            <FileText className="h-6 w-6" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-slate-800 truncate">{item.title}</h3>
                                            <p className="text-xs text-slate-500 truncate">{item.description || item.category}</p>
                                        </div>
                                        <div className="flex items-center gap-4 shrink-0">
                                            <div className="hidden sm:flex flex-col items-end">
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">GÜNCELLEME</span>
                                                <span className="text-[11px] font-bold text-slate-600">{item.updatedAt ? format(new Date(item.updatedAt), 'dd MMM yyyy', { locale: tr }) : '-'}</span>
                                            </div>
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all">
                                                <ChevronRight className="h-4 w-4" />
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )
                    ) : (
                        <div className="text-center py-20 bg-white/50 rounded-[3rem] border-4 border-dashed border-slate-200">
                            <FileText className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-slate-400">Bu klasörde döküman bulunmuyor.</h3>
                            <p className="text-slate-400 text-sm mt-1">Lütfen başka bir klasörü deneyin veya arama yapın.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}