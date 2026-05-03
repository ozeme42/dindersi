'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
    Search, ArrowLeft, ArrowRight, Globe, FileText, 
    LayoutGrid, List, Clock, Folder, ChevronRight, 
    Home, Settings, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
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
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [currentPath, setCurrentPath] = useState<string[]>([]); // Hiyerarşik gezinme

    // Başlangıçta cihaz tipine göre varsayılan görünümü ayarla
    useEffect(() => {
        if (window.innerWidth < 768) {
            setViewMode('list');
        }
        fetchPages();
    }, []);

    const fetchPages = async () => {
        setIsLoading(true);
        const res = await getExtraPages(true); // Sadece yayınlanmış olanlar
        if (res.success) {
            setPages(res.data || []);
        }
        setIsLoading(false);
    };

    // Mevcut klasördeki öğeleri (klasörler ve dosyalar) belirle
    const currentItems = useMemo(() => {
        const pathStr = currentPath.join('/');
        
        // 1. Önce bu path altındaki klasörleri bul
        const folders = new Set<string>();
        const files: any[] = [];

        pages.forEach(p => {
            const cat = p.category || 'Genel';
            if (pathStr === "") {
                // Ana dizindeyiz
                const rootPart = cat.split('/')[0];
                if (cat.includes('/')) {
                    folders.add(rootPart);
                } else {
                    files.push(p);
                }
            } else if (cat === pathStr) {
                // Tam olarak bu klasördeki dosyalar
                files.push(p);
            } else if (cat.startsWith(pathStr + '/')) {
                // Bu klasörün altındaki klasörler
                const relativePart = cat.substring(pathStr.length + 1);
                const nextFolder = relativePart.split('/')[0];
                folders.add(nextFolder);
            }
        });

        const folderItems = Array.from(folders).sort().map(f => ({
            id: `folder-${f}`,
            title: f,
            type: 'folder'
        }));

        const fileItems = files
            .filter(f => f.title.toLowerCase().includes(searchTerm.toLowerCase()))
            .map(f => ({ ...f, type: 'file' }));

        return [...folderItems, ...fileItems];
    }, [pages, currentPath, searchTerm]);

    const navigateToFolder = (folderName: string) => {
        setCurrentPath([...currentPath, folderName]);
        setSearchTerm("");
    };

    const navigateBack = (index: number) => {
        setCurrentPath(currentPath.slice(0, index + 1));
    };

    const goToRoot = () => setCurrentPath([]);

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20 selection:bg-indigo-100">
            {/* Arka Plan Efekti */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-indigo-100/50 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-sky-100/50 rounded-full blur-[120px]" />
            </div>

            {/* Üst Bar */}
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200">
                <div className="container mx-auto px-4 h-20 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/">
                            <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-200 hidden sm:flex">
                                <Globe className="h-5 w-5" />
                            </div>
                            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight uppercase">Dökümanlar</h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="hidden md:flex bg-slate-100 p-1 rounded-xl border border-slate-200 mr-2">
                            <Button 
                                variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
                                size="icon" 
                                onClick={() => setViewMode('grid')}
                                className={cn("h-9 w-9 rounded-lg transition-all", viewMode === 'grid' && "bg-white shadow-sm")}
                            >
                                <LayoutGrid className="h-4 w-4" />
                            </Button>
                            <Button 
                                variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
                                size="icon" 
                                onClick={() => setViewMode('list')}
                                className={cn("h-9 w-9 rounded-lg transition-all", viewMode === 'list' && "bg-white shadow-sm")}
                            >
                                <List className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input 
                                placeholder="Ara..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 bg-slate-50 border-slate-200 rounded-xl w-32 sm:w-48 md:w-64 focus-visible:ring-indigo-500"
                            />
                        </div>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8 relative z-10">
                {/* Breadcrumb Navigasyon */}
                <div className="flex items-center gap-2 mb-8 bg-white p-3 px-5 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto whitespace-nowrap scrollbar-hide">
                    <button onClick={goToRoot} className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors">
                        <Home className="h-4 w-4" /> KÖK DİZİN
                    </button>
                    {currentPath.map((part, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <ChevronRight className="h-4 w-4 text-slate-300" />
                            <button 
                                onClick={() => navigateBack(i)}
                                className={cn(
                                    "text-sm font-bold uppercase tracking-tight transition-colors",
                                    i === currentPath.length - 1 ? "text-indigo-600" : "text-slate-500 hover:text-indigo-600"
                                )}
                            >
                                {part}
                            </button>
                        </div>
                    ))}
                </div>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">İçerikler Yükleniyor...</p>
                    </div>
                ) : currentItems.length > 0 ? (
                    <div className={cn(
                        "grid gap-4",
                        viewMode === 'grid' ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1"
                    )}>
                        {currentItems.map((item) => (
                            item.type === 'folder' ? (
                                <button
                                    key={item.id}
                                    onClick={() => navigateToFolder(item.title)}
                                    className={cn(
                                        "group flex items-center p-5 bg-white border-2 border-slate-100 rounded-3xl transition-all hover:border-indigo-500 hover:shadow-xl text-left",
                                        viewMode === 'list' && "py-4"
                                    )}
                                >
                                    <div className="p-3 bg-amber-50 text-amber-500 rounded-2xl group-hover:scale-110 transition-transform mr-4">
                                        <Folder className="h-6 w-6 fill-current" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-black text-slate-900 uppercase tracking-tight truncate">{item.title}</h3>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Klasör</p>
                                    </div>
                                    <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                                </button>
                            ) : (
                                <Link href={`/extra/${item.id}`} key={item.id} className="block group">
                                    <Card className={cn(
                                        "h-full overflow-hidden border-2 border-slate-100 rounded-3xl transition-all group-hover:border-indigo-500 group-hover:shadow-2xl bg-white",
                                        viewMode === 'list' && "flex flex-row items-center p-1"
                                    )}>
                                        <CardHeader className={cn("pb-4", viewMode === 'list' && "p-4 shrink-0")}>
                                            <div className="p-2.5 bg-indigo-50 w-fit rounded-xl text-indigo-600 group-hover:scale-110 transition-transform">
                                                <FileText className="h-5 w-5" />
                                            </div>
                                        </CardHeader>
                                        <div className={cn("flex flex-col flex-1 min-w-0", viewMode === 'list' && "flex-row items-center justify-between pr-6")}>
                                            <CardContent className={cn("pb-2", viewMode === 'list' && "p-0 pr-4")}>
                                                <CardTitle className="text-lg leading-tight group-hover:text-indigo-600 transition-colors truncate">{item.title}</CardTitle>
                                                {viewMode === 'grid' && (
                                                    <p className="text-xs text-slate-500 mt-2 line-clamp-2 h-8">
                                                        {item.description || "Döküman içeriğini görüntülemek için tıklayın."}
                                                    </p>
                                                )}
                                            </CardContent>
                                            <CardFooter className={cn("pt-4 border-t border-slate-50 flex items-center justify-between bg-slate-50/30", viewMode === 'list' && "border-none bg-transparent pt-0")}>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                                                        <Clock className="h-3 w-3" />
                                                        {item.updatedAt ? format(new Date(item.updatedAt), 'dd.MM.yyyy', { locale: tr }) : '-'}
                                                    </div>
                                                </div>
                                                <div className="bg-slate-900 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                                                    <ArrowRight className="h-4 w-4" />
                                                </div>
                                            </CardFooter>
                                        </div>
                                    </Card>
                                </Link>
                            )
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-32 bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <FileText className="h-10 w-10 text-slate-300" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Döküman Bulunamadı</h3>
                        <p className="text-slate-400 mt-2">Bu klasörde henüz yayınlanmış bir içerik yok.</p>
                        <Button onClick={goToRoot} variant="link" className="mt-4 text-indigo-600 font-bold">Kök Dizine Dön</Button>
                    </div>
                )}
            </main>
        </div>
    );
}
