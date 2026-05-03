
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
    Plus, Search, Globe, Eye, EyeOff, Loader2, 
    LayoutGrid, List as ListIcon, Settings, Home, 
    ChevronRight, Folder, FolderOpen, Clock, ArrowRight,
    Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { getExtraPages } from '@/app/teacher/extra-pages/actions';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function ExtraPagesExplorer() {
    const [pages, setPages] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPath, setCurrentPath] = useState<string[]>([]);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    
    const { toast } = useToast();

    // Akıllı Cihaz Tespiti: Mobilde Liste, Masaüstünde Izgara varsayılan
    useEffect(() => {
        if (typeof window !== 'undefined' && window.innerWidth < 768) {
            setViewMode('list');
        }
    }, []);

    const fetchPages = async () => {
        setIsLoading(true);
        // isPublished alanı eksik olan eski verileri de çekmek için true parametresi gönderilmiyor
        const res = await getExtraPages();
        if (res.success) {
            // Sadece yayınlanmış olanları veya alanı hiç tanımlanmamış (legacy) olanları göster
            const safeData = (res.data || []).filter((p: any) => p.isPublished !== false);
            setPages(safeData);
        } else {
            toast({ title: "Hata", description: res.error, variant: "destructive" });
        }
        setIsLoading(false);
    };

    useEffect(() => { fetchPages(); }, []);

    // Mevcut klasördeki öğeleri filtrele
    const currentPathStr = currentPath.join('/');
    
    const folderItems = useMemo(() => {
        const items = new Set<string>();
        const docs: any[] = [];

        pages.forEach(page => {
            const cat = page.category || 'Genel';
            
            if (currentPath.length === 0) {
                // Ana dizindeyiz
                if (cat.includes('/')) {
                    items.add(cat.split('/')[0]);
                } else {
                    docs.push(page);
                }
            } else {
                // Bir alt klasördeyiz
                if (cat === currentPathStr) {
                    docs.push(page);
                } else if (cat.startsWith(currentPathStr + '/')) {
                    const relativePath = cat.slice(currentPathStr.length + 1);
                    items.add(relativePath.split('/')[0]);
                }
            }
        });

        return {
            folders: Array.from(items).sort(),
            documents: docs.filter(d => 
                d.title.toLowerCase().includes(searchTerm.toLowerCase())
            ).sort((a, b) => a.title.localeCompare(b.title, 'tr'))
        };
    }, [pages, currentPath, currentPathStr, searchTerm]);

    const navigateTo = (folder: string) => {
        setCurrentPath([...currentPath, folder]);
        setSearchTerm("");
    };

    const navigateUp = (index: number) => {
        setCurrentPath(currentPath.slice(0, index + 1));
        setSearchTerm("");
    };

    const goToRoot = () => {
        setCurrentPath([]);
        setSearchTerm("");
    };

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
                    <p className="text-slate-500 font-bold animate-pulse uppercase tracking-widest text-xs">Dökümanlar Yükleniyor...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] font-sans text-slate-900 pb-20">
            {/* Arka Plan Efekti */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-indigo-50/50 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-sky-50/50 rounded-full blur-[120px]" />
            </div>

            <div className="container mx-auto p-4 md:p-8 relative z-10 space-y-6">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/80 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white shadow-xl">
                    <div className="flex items-center gap-5">
                        <div className="p-4 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl shadow-lg shadow-indigo-200">
                            <Globe className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Döküman Merkezi</h1>
                            <p className="text-slate-500 text-sm font-medium">Rehberlik, döküman ve interaktif materyaller.</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        {/* Görünüm Değiştirici */}
                        <div className="bg-slate-100 p-1 rounded-xl flex border border-slate-200 shadow-inner">
                            <Button 
                                variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
                                size="icon" 
                                onClick={() => setViewMode('grid')}
                                className={cn("h-9 w-9 rounded-lg transition-all", viewMode === 'grid' && "bg-white shadow-sm text-indigo-600")}
                            >
                                <LayoutGrid className="h-4 w-4" />
                            </Button>
                            <Button 
                                variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
                                size="icon" 
                                onClick={() => setViewMode('list')}
                                className={cn("h-9 w-9 rounded-lg transition-all", viewMode === 'list' && "bg-white shadow-sm text-indigo-600")}
                            >
                                <ListIcon className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="w-px h-8 bg-slate-200 mx-1 hidden md:block" />
                        <Button asChild variant="outline" className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 gap-2 h-11 px-5 font-bold">
                            <Link href="/teacher/extra-pages"><Settings className="h-4 w-4" /> Yönet</Link>
                        </Button>
                    </div>
                </div>

                {/* Search & Breadcrumb */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2 bg-white/50 p-2 rounded-2xl border border-white">
                        <button 
                            onClick={goToRoot}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
                                currentPath.length === 0 ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:bg-white hover:text-indigo-600"
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
                                        "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
                                        i === currentPath.length - 1 ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:bg-white hover:text-indigo-600"
                                    )}
                                >
                                    <Folder className="h-4 w-4" /> {folder}
                                </button>
                            </React.Fragment>
                        ))}
                    </div>

                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                        <Input 
                            placeholder="Dökümanlarda ara..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-12 h-14 bg-white border-slate-200 rounded-[1.25rem] shadow-sm text-lg focus-visible:ring-indigo-500 focus-visible:border-indigo-500"
                        />
                    </div>
                </div>

                {/* Galeri Alanı */}
                <div className="space-y-8">
                    {/* Klasörler */}
                    {folderItems.folders.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {folderItems.folders.map(folder => (
                                <button
                                    key={folder}
                                    onClick={() => navigateTo(folder)}
                                    className="group flex flex-col items-center justify-center p-6 bg-white border border-slate-200 rounded-[2rem] hover:border-indigo-400 hover:shadow-xl transition-all duration-300"
                                >
                                    <div className="relative mb-3">
                                        <Folder className="h-14 w-14 text-amber-400 group-hover:hidden" />
                                        <FolderOpen className="h-14 w-14 text-amber-500 hidden group-hover:block animate-in fade-in zoom-in duration-200" />
                                    </div>
                                    <span className="text-sm font-black text-slate-700 text-center line-clamp-1 uppercase tracking-tight">{folder}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Dökümanlar */}
                    {viewMode === 'grid' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {folderItems.documents.map((item) => (
                                <Link key={item.id} href={`/extra/${item.id}`} className="group h-full">
                                    <Card className="h-full overflow-hidden rounded-[2.25rem] border-slate-200 hover:shadow-2xl transition-all duration-500 group-hover:-translate-y-2 flex flex-col bg-white">
                                        <div className="h-3 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
                                        <CardHeader className="pb-4">
                                            <div className="flex justify-between items-start mb-3">
                                                <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-100 font-bold uppercase text-[9px] tracking-widest px-2 py-0.5">
                                                    DÖKÜMAN
                                                </Badge>
                                                <div className="text-slate-300 group-hover:text-indigo-500 transition-colors">
                                                    <ArrowRight className="h-5 w-5" />
                                                </div>
                                            </div>
                                            <CardTitle className="text-xl font-black text-slate-800 line-clamp-2 leading-tight group-hover:text-indigo-700 transition-colors">
                                                {item.title}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="flex-1">
                                            <p className="text-sm text-slate-500 line-clamp-3 leading-relaxed font-medium">
                                                {item.description || "İçeriği görüntülemek için tıklayın."}
                                            </p>
                                        </CardContent>
                                        <CardFooter className="pt-4 border-t border-slate-50 bg-slate-50/50 flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                            <div className="flex items-center gap-1.5">
                                                <Clock className="h-3 w-3" />
                                                {item.updatedAt ? format(new Date(item.updatedAt), 'dd.MM.yyyy', { locale: tr }) : '-'}
                                            </div>
                                            <span className="text-indigo-400 group-hover:text-indigo-600">İncele</span>
                                        </CardFooter>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {folderItems.documents.map((item) => (
                                <Link key={item.id} href={`/extra/${item.id}`} className="block group">
                                    <div className="bg-white border border-slate-200 p-4 rounded-2xl flex items-center justify-between hover:border-indigo-400 hover:shadow-lg transition-all group-hover:translate-x-2">
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className="h-12 w-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0 border border-indigo-100">
                                                <FileText className="h-6 w-6" />
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-black text-slate-800 group-hover:text-indigo-700 transition-colors truncate text-lg">{item.title}</h3>
                                                <div className="flex items-center gap-3 mt-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {item.updatedAt ? format(new Date(item.updatedAt), 'dd.MM.yyyy', { locale: tr }) : '-'}</span>
                                                    <span className="hidden sm:inline-flex items-center gap-1"><Filter className="h-3 w-3" /> {item.category || 'Genel'}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 shrink-0 pl-4">
                                            <div className="bg-slate-900 text-white p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all shadow-lg">
                                                <ArrowRight className="h-5 w-5" />
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}

                    {folderItems.folders.length === 0 && folderItems.documents.length === 0 && (
                        <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
                            <div className="p-6 bg-slate-50 rounded-full inline-flex mb-6">
                                <Search className="h-12 w-12 text-slate-300" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 uppercase">Döküman Bulunamadı</h3>
                            <p className="text-slate-500 mt-2 font-medium">Bu klasörde veya aramada hiçbir sonuç yok.</p>
                            <Button onClick={goToRoot} variant="link" className="mt-4 text-indigo-600 font-bold text-lg">Ana Dizine Dön</Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function FileText(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10 9H8" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
    </svg>
  )
}
