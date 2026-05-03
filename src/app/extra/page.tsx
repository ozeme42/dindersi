
'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
    Globe, Search, ArrowRight, Folder, FolderOpen, 
    LayoutGrid, List, Clock, ChevronRight, Home, 
    Loader2, Settings, ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import Link from 'next/link';
import { getExtraPages } from '@/app/teacher/extra-pages/actions';

export default function ExtraPagesExplorer() {
    const [pages, setPages] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [currentPath, setCurrentPath] = useState<string[]>([]);

    // Cihaz tipine göre varsayılan görünümü belirle
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

    useEffect(() => {
        fetchPages();
    }, []);

    // Hiyerarşik klasör yapısını filtrele
    const currentFolderContent = useMemo(() => {
        const pathStr = currentPath.join('/');
        
        // Bu klasördeki sayfalar
        const items = pages.filter(p => {
            const cat = p.category || 'Genel';
            if (currentPath.length === 0) {
                return !cat.includes('/'); // Ana dizin öğeleri
            }
            return cat.startsWith(pathStr + '/') && cat.split('/').length === currentPath.length + 1;
        });

        // Bu klasördeki alt klasörler
        const subFolders = new Set<string>();
        pages.forEach(p => {
            const cat = p.category || 'Genel';
            if (currentPath.length === 0) {
                if (cat.includes('/')) subFolders.add(cat.split('/')[0]);
            } else if (cat.startsWith(pathStr + '/') && cat.split('/').length > currentPath.length + 1) {
                subFolders.add(cat.split('/')[currentPath.length]);
            }
        });

        return {
            files: items.sort((a, b) => a.title.localeCompare(b.title, 'tr')),
            folders: Array.from(subFolders).sort()
        };
    }, [pages, currentPath]);

    const handleFolderClick = (folderName: string) => {
        setCurrentPath([...currentPath, folderName]);
    };

    const navigateTo = (index: number) => {
        setCurrentPath(currentPath.slice(0, index + 1));
    };

    const goHome = () => setCurrentPath([]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
                <p className="text-slate-500 font-medium animate-pulse">Dökümanlar Hazırlanıyor...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-20 font-sans">
            {/* Header */}
            <header className="sticky top-0 z-30 w-full bg-white/80 backdrop-blur-xl border-b border-slate-200">
                <div className="container mx-auto px-4 h-20 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-5">
                        <Link href="/" className="p-2.5 bg-indigo-50 rounded-xl text-indigo-600 hover:bg-indigo-100 transition-colors">
                            <Home className="h-6 w-6" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase leading-none">Döküman Merkezi</h1>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Materyal ve Rehberlik Arşivi</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative hidden md:block">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input 
                                placeholder="Döküman ara..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 bg-slate-100 border-none rounded-xl w-64 focus-visible:ring-indigo-500"
                            />
                        </div>
                        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
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
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8 space-y-8">
                {/* Breadcrumb / Path Navigation */}
                <nav className="flex items-center gap-2 text-sm overflow-x-auto no-scrollbar py-2">
                    <button 
                        onClick={goHome}
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors",
                            currentPath.length === 0 ? "bg-indigo-600 text-white font-bold" : "text-slate-500 hover:bg-slate-200"
                        )}
                    >
                        <FolderOpen className="h-4 w-4" /> Ana Dizin
                    </button>
                    {currentPath.map((folder, idx) => (
                        <div key={idx} className="flex items-center gap-2 shrink-0">
                            <ChevronRight className="h-4 w-4 text-slate-300" />
                            <button 
                                onClick={() => navigateTo(idx)}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg transition-colors font-medium",
                                    idx === currentPath.length - 1 ? "bg-indigo-600 text-white font-bold" : "text-slate-500 hover:bg-slate-200"
                                )}
                            >
                                {folder}
                            </button>
                        </div>
                    ))}
                </nav>

                {/* Content Area */}
                <div className={cn(
                    viewMode === 'grid' 
                        ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" 
                        : "flex flex-col gap-3"
                )}>
                    {/* Folders First */}
                    {currentFolderContent.folders.map((folderName) => (
                        <button
                            key={folderName}
                            onClick={() => handleFolderClick(folderName)}
                            className={cn(
                                "group text-left transition-all duration-300",
                                viewMode === 'grid'
                                    ? "bg-white p-6 rounded-[2rem] border border-slate-200 hover:border-indigo-300 hover:shadow-xl hover:-translate-y-1"
                                    : "bg-white p-4 rounded-2xl border border-slate-200 hover:border-indigo-300 flex items-center justify-between"
                            )}
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-amber-50 rounded-2xl text-amber-500 group-hover:scale-110 transition-transform">
                                    <Folder className="h-6 w-6 fill-current" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">{folderName}</h3>
                                    {viewMode === 'grid' && <p className="text-[10px] text-slate-400 font-black uppercase mt-1">Klasör</p>}
                                </div>
                            </div>
                            {viewMode === 'list' && <ChevronRight className="h-5 w-5 text-slate-300" />}
                        </button>
                    ))}

                    {/* Files */}
                    {currentFolderContent.files.map((item) => (
                        <Link 
                            key={item.id} 
                            href={`/extra/${item.id}`}
                            className="group block"
                        >
                            {viewMode === 'grid' ? (
                                <Card className="h-full rounded-[2rem] border-slate-200 group-hover:border-indigo-300 transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 overflow-hidden bg-white">
                                    <CardHeader className="pb-4">
                                        <div className="p-2.5 bg-indigo-50 w-fit rounded-xl text-indigo-600 mb-3 group-hover:scale-110 transition-transform">
                                            <FileText className="h-5 w-5" />
                                        </div>
                                        <CardTitle className="text-xl leading-tight group-hover:text-indigo-600 transition-colors">{item.title}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-slate-500 line-clamp-2 min-h-[2.5rem]">
                                            {item.description || "İçeriği görüntülemek için tıklayın."}
                                        </p>
                                    </CardContent>
                                    <CardFooter className="pt-4 border-t border-slate-50 flex justify-between items-center bg-slate-50/30">
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                            <Clock className="h-3 w-3" />
                                            {item.updatedAt ? format(new Date(item.updatedAt), 'dd.MM.yyyy', { locale: tr }) : '-'}
                                        </div>
                                        <div className="bg-slate-900 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                            <ArrowRight className="h-4 w-4" />
                                        </div>
                                    </CardFooter>
                                </Card>
                            ) : (
                                <div className="bg-white p-4 rounded-2xl border border-slate-200 group-hover:border-indigo-300 flex items-center justify-between transition-all hover:shadow-md">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-600">
                                            <FileText className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{item.title}</h3>
                                            <p className="text-xs text-slate-400 truncate max-w-[200px] sm:max-w-md">{item.description}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase">
                                            <Clock className="h-3 w-3" />
                                            {item.updatedAt ? format(new Date(item.updatedAt), 'dd.MM.yyyy', { locale: tr }) : '-'}
                                        </div>
                                        <div className="bg-indigo-600 text-white p-2 rounded-xl group-hover:bg-indigo-700 transition-colors">
                                            <ArrowRight className="h-4 w-4" />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </Link>
                    ))}
                </div>

                {/* Empty State */}
                {currentFolderContent.files.length === 0 && currentFolderContent.folders.length === 0 && (
                    <div className="text-center py-32 bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                            <Folder className="h-10 w-10" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-800">Klasör Boş</h2>
                        <p className="text-slate-500 mt-2">Bu kategoride henüz döküman bulunmuyor.</p>
                        <Button onClick={goHome} variant="link" className="mt-4 text-indigo-600 font-bold">
                            Ana Dizine Dön
                        </Button>
                    </div>
                )}
            </main>
        </div>
    );
}

