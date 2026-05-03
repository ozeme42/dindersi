
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
    Globe, Home, Settings, ArrowRight, Clock, LayoutGrid, List, 
    ChevronRight, Search, Folder, ArrowLeft, Loader2, BookOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getExtraPages } from '@/app/teacher/extra-pages/actions';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function ExtraPagesExplorer() {
    const [pages, setPages] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [currentPath, setCurrentPath] = useState<string[]>([]); // Hiyerarşik gezinme için

    useEffect(() => {
        // Mobil cihaz tespiti ve varsayılan görünüm ayarı
        if (window.innerWidth < 768) {
            setViewMode('list');
        }
        
        const fetchData = async () => {
            setIsLoading(true);
            const res = await getExtraPages(true); // Sadece yayındakileri getir
            if (res.success) {
                setPages(res.data || []);
            }
            setIsLoading(false);
        };
        fetchData();
    }, []);

    // Kategorileri/Klasörleri filtrele
    const items = useMemo(() => {
        const pathStr = currentPath.join('/');
        const results: any[] = [];
        const foundFolders = new Set<string>();

        pages.forEach(page => {
            const cat = page.category || 'Genel';
            
            // Eğer döküman şu anki yoldaysa
            if (cat === pathStr || (pathStr === "" && cat === "Genel")) {
                results.push({ ...page, type: 'page' });
            } 
            // Eğer döküman şu anki yolun bir alt klasöründeyse
            else if (cat.startsWith(pathStr ? pathStr + '/' : "")) {
                const relativePath = pathStr ? cat.substring(pathStr.length + 1) : cat;
                const folderName = relativePath.split('/')[0];
                if (!foundFolders.has(folderName)) {
                    results.push({ id: folderName, name: folderName, type: 'folder' });
                    foundFolders.add(folderName);
                }
            }
        });

        // Arama varsa sadece dökümanlarda ara ve hiyerarşiyi yoksay
        if (searchTerm) {
            return pages.filter(p => 
                p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.description?.toLowerCase().includes(searchTerm.toLowerCase())
            ).map(p => ({ ...p, type: 'page' }));
        }

        // Klasörler önce, sayfalar sonra
        return results.sort((a, b) => {
            if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
            return (a.title || a.name).localeCompare(b.title || b.name, 'tr');
        });
    }, [pages, currentPath, searchTerm]);

    const handleFolderClick = (folderName: string) => {
        setCurrentPath([...currentPath, folderName]);
        setSearchTerm("");
    };

    const handleGoBack = () => {
        setCurrentPath(prev => prev.slice(0, -1));
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
            {/* Arka Plan Efekti */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-indigo-50/50 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-sky-50/50 rounded-full blur-[100px]" />
            </div>

            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200">
                <div className="container mx-auto px-4 h-20 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/">
                            <Button variant="ghost" size="icon" className="rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600">
                                <Home className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div className="flex flex-col">
                            <h1 className="text-xl font-black text-slate-900 leading-none uppercase tracking-tight">Döküman Merkezi</h1>
                            <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 tracking-widest">Ekstra Materyaller</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="hidden md:flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                            <Button 
                                variant={viewMode === 'grid' ? 'default' : 'ghost'} 
                                size="sm" 
                                onClick={() => setViewMode('grid')}
                                className={cn("h-8 px-3 rounded-lg", viewMode === 'grid' ? "bg-white text-slate-900 shadow-sm hover:bg-white" : "text-slate-500")}
                            >
                                <LayoutGrid className="h-4 w-4 mr-2" /> Izgara
                            </Button>
                            <Button 
                                variant={viewMode === 'list' ? 'default' : 'ghost'} 
                                size="sm" 
                                onClick={() => setViewMode('list')}
                                className={cn("h-8 px-3 rounded-lg", viewMode === 'list' ? "bg-white text-slate-900 shadow-sm hover:bg-white" : "text-slate-500")}
                            >
                                <List className="h-4 w-4 mr-2" /> Liste
                            </Button>
                        </div>
                        <Link href="/teacher/extra-pages">
                            <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl border-slate-200 text-slate-400 hover:text-indigo-600">
                                <Settings className="h-5 w-5" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8 relative z-10 space-y-6">
                
                {/* Arama ve Navigasyon */}
                <div className="flex flex-col md:flex-row gap-4 items-center">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <Input 
                            placeholder="Dökümanlarda ara..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-12 h-12 bg-white border-slate-200 rounded-2xl shadow-sm focus-visible:ring-indigo-500 text-lg"
                        />
                    </div>
                    
                    {!searchTerm && currentPath.length > 0 && (
                        <Button onClick={handleGoBack} variant="outline" className="h-12 rounded-2xl gap-2 border-slate-200 bg-white">
                            <ArrowLeft className="h-4 w-4" /> Geri Dön
                        </Button>
                    )}
                </div>

                {/* Breadcrumb */}
                {!searchTerm && (
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest px-2 overflow-x-auto no-scrollbar">
                        <span className={cn("cursor-pointer hover:text-indigo-600", currentPath.length === 0 && "text-indigo-600")} onClick={() => setCurrentPath([])}>ANA DİZİN</span>
                        {currentPath.map((p, i) => (
                            <React.Fragment key={i}>
                                <ChevronRight className="h-3 w-3" />
                                <span 
                                    className={cn("cursor-pointer hover:text-indigo-600", i === currentPath.length - 1 && "text-indigo-600")}
                                    onClick={() => setCurrentPath(currentPath.slice(0, i + 1))}
                                >
                                    {p}
                                </span>
                            </React.Fragment>
                        ))}
                    </div>
                )}

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
                        <p className="text-slate-400 font-bold animate-pulse">Materyaller Yükleniyor...</p>
                    </div>
                ) : items.length > 0 ? (
                    <div className={cn(
                        "grid gap-4 md:gap-6",
                        viewMode === 'grid' ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1"
                    )}>
                        {items.map((item) => {
                            if (item.type === 'folder') {
                                return (
                                    <button 
                                        key={item.id} 
                                        onClick={() => handleFolderClick(item.name)}
                                        className={cn(
                                            "group relative flex items-center gap-4 p-5 rounded-3xl border-2 border-white bg-white shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all text-left",
                                            viewMode === 'list' && "p-4"
                                        )}
                                    >
                                        <div className="p-3 bg-amber-50 rounded-2xl text-amber-500 group-hover:scale-110 transition-transform">
                                            <Folder className="h-8 w-8 fill-current" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-black text-slate-800 text-lg leading-none uppercase truncate">{item.name}</h3>
                                            <p className="text-[10px] text-slate-400 font-bold mt-1.5 uppercase tracking-wider">Alt Klasör</p>
                                        </div>
                                        <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                                    </button>
                                );
                            }

                            return (
                                <Link key={item.id} href={`/extra/${item.id}`}>
                                    <Card className={cn(
                                        "group overflow-hidden rounded-[2rem] border-2 border-white bg-white shadow-sm hover:shadow-2xl hover:border-indigo-100 transition-all duration-300 h-full flex flex-col",
                                        viewMode === 'list' && "flex-row items-center p-2"
                                    )}>
                                        <CardHeader className={cn("pb-3", viewMode === 'list' && "p-4 flex-1")}>
                                            <div className="flex justify-between items-start mb-2">
                                                <Badge variant="outline" className="bg-indigo-50 text-indigo-600 border-indigo-100 text-[9px] font-black uppercase tracking-tighter">
                                                    {item.category || 'Genel'}
                                                </Badge>
                                                <div className="p-2 rounded-full bg-slate-50 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Globe className="h-4 w-4" />
                                                </div>
                                            </div>
                                            <CardTitle className={cn("text-xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2 leading-tight uppercase tracking-tight", viewMode === 'list' && "text-base line-clamp-1")}>
                                                {item.title}
                                            </CardTitle>
                                        </CardHeader>
                                        
                                        {viewMode === 'grid' && (
                                            <CardContent className="flex-grow">
                                                <p className="text-sm text-slate-500 font-medium line-clamp-3 leading-relaxed">
                                                    {item.description || "Bu döküman için açıklama belirtilmemiş."}
                                                </p>
                                            </CardContent>
                                        )}
                                        
                                        <CardFooter className={cn(
                                            "bg-slate-50/50 p-4 border-t border-slate-100 flex items-center justify-between mt-auto",
                                            viewMode === 'list' && "bg-transparent border-t-0 p-4 shrink-0"
                                        )}>
                                            <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                                <Clock className="h-3 w-3" />
                                                {item.updatedAt ? format(new Date(item.updatedAt), 'dd MMM yyyy', { locale: tr }) : '-'}
                                            </div>
                                            <div className="bg-slate-900 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 group-hover:translate-x-0 translate-x-2 transition-all shadow-lg shadow-indigo-200">
                                                <ArrowRight className="h-4 w-4" />
                                            </div>
                                        </CardFooter>
                                    </Card>
                                </Link>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-32 bg-white rounded-[3rem] border-4 border-dashed border-slate-100 text-center px-4">
                        <div className="p-6 bg-slate-50 rounded-full mb-6">
                            <BookOpen className="h-16 w-16 text-slate-200" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Döküman Bulunamadı</h3>
                        <p className="text-slate-400 max-w-sm mx-auto mt-2">Aradığınız kriterlere uygun bir materyal mevcut değil.</p>
                        {searchTerm && (
                            <Button onClick={() => setSearchTerm("")} variant="link" className="mt-4 text-indigo-600 font-bold">Aramayı Temizle</Button>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}

