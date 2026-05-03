
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
    Plus, Search, ArrowLeft, ChevronRight, Globe, LayoutGrid, List, 
    Home, Settings, Loader2, Folder, FileText, Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getExtraPages } from '@/app/teacher/extra-pages/actions';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';

export default function ExtraPagesExplorer() {
    const { user } = useAuth();
    const isTeacher = user?.role === 'teacher' || user?.role === 'superadmin';
    
    const [pages, setPages] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPath, setCurrentPath] = useState<string[]>([]);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    // Mobilde varsayılan olarak Liste, Masaüstünde Izgara modu
    useEffect(() => {
        if (window.innerWidth < 768) {
            setViewMode('list');
        }
    }, []);

    const fetchPages = async () => {
        setIsLoading(true);
        // Sadece yayınlanmış sayfaları getir (Öğretmen değilse)
        const res = await getExtraPages(!isTeacher);
        if (res.success) {
            setPages(res.data || []);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchPages();
    }, [isTeacher]);

    // Mevcut yola göre klasörleri ve sayfaları filtrele
    const { folders, currentPages } = useMemo(() => {
        const pathStr = currentPath.join('/');
        const folderSet = new Set<string>();
        const localPages: any[] = [];

        pages.forEach(page => {
            const cat = page.category || 'Genel';
            if (cat === pathStr || (pathStr === "" && cat === "Genel")) {
                localPages.push(page);
            } else if (pathStr === "" && cat !== "Genel") {
                folderSet.add(cat.split('/')[0]);
            } else if (cat.startsWith(pathStr + '/')) {
                const relativePath = cat.substring(pathStr.length + 1);
                folderSet.add(relativePath.split('/')[0]);
            }
        });

        return {
            folders: Array.from(folderSet).sort(),
            currentPages: localPages.filter(p => 
                p.title.toLowerCase().includes(searchTerm.toLowerCase())
            )
        };
    }, [pages, currentPath, searchTerm]);

    const navigateTo = (folder: string) => {
        setCurrentPath([...currentPath, folder]);
        setSearchTerm("");
    };

    const navigateUp = (index: number) => {
        setCurrentPath(currentPath.slice(0, index + 1));
    };

    const navigateToRoot = () => {
        setCurrentPath([]);
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 selection:bg-indigo-100 relative">
            
            {/* Arka Plan */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-indigo-100/40 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-sky-100/40 rounded-full blur-[120px]" />
            </div>

            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200">
                <div className="container mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200">
                            <Globe className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">Bilgi Merkezi</h1>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Ekstra Kaynaklar & Rehberlik</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input 
                                placeholder="Sayfalarda ara..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 bg-slate-100 border-none rounded-xl h-11 focus-visible:ring-indigo-500"
                            />
                        </div>
                        <div className="hidden md:flex bg-slate-100 p-1 rounded-xl border border-slate-200">
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
                        {isTeacher && (
                            <Button asChild variant="outline" className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 gap-2 h-11 px-5">
                                <Link href="/teacher/extra-pages"><Settings className="h-4 w-4" /> Yönet</Link>
                            </Button>
                        )}
                    </div>
                </div>
            </header>

            <main className="flex-1 container mx-auto px-4 py-8 relative z-10">
                
                {/* Breadcrumb / Navigasyon */}
                <div className="flex items-center gap-2 mb-8 bg-white/60 p-2 rounded-2xl border border-white/40 shadow-sm overflow-x-auto no-scrollbar whitespace-nowrap">
                    <button 
                        onClick={navigateToRoot}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
                            currentPath.length === 0 ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "text-slate-500 hover:bg-white"
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
                                    "px-4 py-2 rounded-xl text-sm font-bold transition-all",
                                    i === currentPath.length - 1 ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "text-slate-500 hover:bg-white"
                                )}
                            >
                                {folder}
                            </button>
                        </React.Fragment>
                    ))}
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
                    </div>
                ) : (
                    <div className="space-y-10 animate-in fade-in duration-500">
                        
                        {/* Klasörler */}
                        {folders.length > 0 && (
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                {folders.map(folder => (
                                    <button 
                                        key={folder}
                                        onClick={() => navigateTo(folder)}
                                        className="group flex flex-col items-center gap-3 p-6 bg-white rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all"
                                    >
                                        <div className="p-4 bg-amber-50 rounded-2xl text-amber-500 group-hover:scale-110 group-hover:bg-amber-100 transition-all">
                                            <Folder className="h-10 w-10 fill-current" />
                                        </div>
                                        <span className="font-bold text-slate-700 text-sm uppercase tracking-tight truncate w-full text-center">
                                            {folder}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Sayfalar (Izgara veya Liste) */}
                        {currentPages.length > 0 ? (
                            <div className={cn(
                                "grid gap-6",
                                viewMode === 'grid' ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1"
                            )}>
                                {currentPages.map((page) => (
                                    <Link key={page.id} href={`/extra/${page.id}`}>
                                        {viewMode === 'grid' ? (
                                            <Card className="group h-full overflow-hidden rounded-[2.5rem] border-slate-200 hover:shadow-2xl hover:border-indigo-200 transition-all duration-300">
                                                <CardHeader className="pb-4">
                                                    <div className="p-3 bg-indigo-50 rounded-2xl w-fit text-indigo-600 mb-4 group-hover:scale-110 group-hover:bg-indigo-100 transition-transform">
                                                        <FileText className="h-6 w-6" />
                                                    </div>
                                                    <CardTitle className="text-xl line-clamp-2 leading-tight group-hover:text-indigo-600 transition-colors">{page.title}</CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    <p className="text-sm text-slate-500 line-clamp-3 min-h-[3rem]">
                                                        {page.description || "İçeriği görüntülemek için tıklayın."}
                                                    </p>
                                                </CardContent>
                                                <CardFooter className="pt-4 border-t border-slate-50 flex items-center justify-between">
                                                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                        <Clock className="h-3 w-3" />
                                                        {page.updatedAt ? new Date(page.updatedAt).toLocaleDateString('tr-TR') : '-'}
                                                    </div>
                                                    <div className="bg-slate-900 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <ArrowRight className="h-4 w-4" />
                                                    </div>
                                                </CardFooter>
                                            </Card>
                                        ) : (
                                            <div className="group bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between hover:shadow-lg hover:border-indigo-200 transition-all">
                                                <div className="flex items-center gap-5">
                                                    <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600 group-hover:bg-indigo-100 transition-colors">
                                                        <FileText className="h-6 w-6" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-slate-800 text-lg group-hover:text-indigo-600 transition-colors">{page.title}</h3>
                                                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{page.description || 'Döküman içeriği'}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-6">
                                                    <div className="hidden sm:flex flex-col items-end text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                        <span>GÜNCELLEME</span>
                                                        <span>{page.updatedAt ? new Date(page.updatedAt).toLocaleDateString('tr-TR') : '-'}</span>
                                                    </div>
                                                    <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                                        <ArrowRight className="h-5 w-5" />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </Link>
                                ))}
                            </div>
                        ) : folders.length === 0 && (
                            <div className="text-center py-32 bg-white/40 rounded-[3rem] border-4 border-dashed border-slate-200">
                                <FileText className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-slate-500">Bu klasör henüz boş.</h3>
                                <p className="text-slate-400 mt-1">Geri dönerek diğer kategorilere göz atabilirsiniz.</p>
                            </div>
                        )}
                    </div>
                )}
            </main>

            <footer className="w-full py-8 border-t border-slate-200 bg-white/50 text-center">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Din Dersi Atölyesi | Bilgi Merkezi</p>
            </footer>
        </div>
    );
}

