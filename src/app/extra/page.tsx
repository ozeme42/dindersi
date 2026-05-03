
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
    Loader2, Globe, Home, Settings, Search, ArrowRight, 
    Clock, Folder, LayoutGrid, List, ChevronRight, AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
    Card, CardContent, CardHeader, CardTitle, 
    CardDescription, CardFooter 
} from '@/components/ui/card';
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
    const [currentPath, setCurrentPath] = useState<string[]>([]); // Kategori yolu (Klasör navigasyonu)

    // Açılışta cihaz tipine göre görünüm belirle
    useEffect(() => {
        if (window.innerWidth < 768) {
            setViewMode('list');
        }
    }, []);

    const fetchPages = async () => {
        setIsLoading(true);
        const res = await getExtraPages(true); // Sadece yayında olanları getir
        if (res.success) {
            setPages(res.data || []);
        }
        setIsLoading(false);
    };

    useEffect(() => { fetchPages(); }, []);

    // Kategorileri ve dosyaları mevcut yola göre filtrele
    const { currentFolders, currentFiles } = useMemo(() => {
        const pathStr = currentPath.join('/');
        const folders = new Set<string>();
        const files: any[] = [];

        pages.forEach(page => {
            const cat = page.category || 'Genel';
            
            // Arama yapılıyorsa klasör yapısını yoksay, direkt dosyaları göster
            if (searchTerm) {
                if (page.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                    cat.toLowerCase().includes(searchTerm.toLowerCase())) {
                    files.push(page);
                }
                return;
            }

            // Normal klasör gezintisi
            if (cat === pathStr || (pathStr === "" && cat === "Genel")) {
                files.push(page);
            } else if (pathStr === "" && cat !== "Genel") {
                folders.add(cat.split('/')[0]);
            } else if (cat.startsWith(pathStr + '/')) {
                const relativePath = cat.slice(pathStr.length + 1);
                folders.add(relativePath.split('/')[0]);
            }
        });

        return { 
            currentFolders: Array.from(folders).sort(), 
            currentFiles: files.sort((a, b) => a.title.localeCompare(b.title, 'tr')) 
        };
    }, [pages, currentPath, searchTerm]);

    const navigateTo = (folder: string) => {
        setCurrentPath([...currentPath, folder]);
        setSearchTerm("");
    };

    const goBack = () => {
        setCurrentPath(currentPath.slice(0, -1));
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8">
                <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mb-4" />
                <p className="text-slate-500 font-bold animate-pulse uppercase tracking-widest text-xs">Materyaller Yükleniyor</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] font-sans text-slate-900 pb-32">
            
            {/* Üst Header */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
                <div className="container mx-auto px-4 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-5">
                        <div className="p-3 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl text-white shadow-lg shadow-indigo-200">
                            <Globe className="h-7 w-7" />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight uppercase leading-none">Döküman Merkezi</h1>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Eğitim Materyalleri ve Kaynaklar</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden md:flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setViewMode('grid')}
                                className={cn("rounded-lg h-9 w-10 p-0", viewMode === 'grid' ? "bg-white shadow-sm text-indigo-600" : "text-slate-400")}
                            >
                                <LayoutGrid className="h-5 w-5" />
                            </Button>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setViewMode('list')}
                                className={cn("rounded-lg h-9 w-10 p-0", viewMode === 'list' ? "bg-white shadow-sm text-indigo-600" : "text-slate-400")}
                            >
                                <List className="h-5 w-5" />
                            </Button>
                        </div>
                        <Button asChild variant="outline" className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 gap-2 h-11 px-5">
                            <Link href="/teacher/extra-pages"><Settings className="h-4 w-4" /> Yönet</Link>
                        </Button>
                        <Button asChild variant="ghost" size="icon" className="rounded-full h-11 w-11 hover:bg-slate-100">
                            <Link href="/"><Home className="h-6 w-6 text-slate-500" /></Link>
                        </Button>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8 space-y-8">
                
                {/* Arama ve Navigasyon */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm">
                    <div className="flex flex-wrap items-center gap-2">
                         <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setCurrentPath([])}
                            className={cn("rounded-full px-4 font-bold text-xs uppercase tracking-wider", currentPath.length === 0 ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-slate-100")}
                         >
                            Kök Dizin
                         </Button>
                         {currentPath.map((part, i) => (
                             <React.Fragment key={i}>
                                 <ChevronRight className="h-4 w-4 text-slate-300" />
                                 <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => setCurrentPath(currentPath.slice(0, i + 1))}
                                    className="rounded-full px-4 font-bold text-xs uppercase tracking-wider text-indigo-600 bg-indigo-50 border border-indigo-100"
                                 >
                                    {part}
                                 </Button>
                             </React.Fragment>
                         ))}
                    </div>

                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input 
                            placeholder="Dosya veya klasör ara..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 bg-slate-50 border-none rounded-2xl h-11 focus-visible:ring-indigo-500 text-sm"
                        />
                    </div>
                </div>

                {/* --- KLASÖRLER --- */}
                {currentFolders.length > 0 && !searchTerm && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                        {currentFolders.map(folder => (
                            <button 
                                key={folder}
                                onClick={() => navigateTo(folder)}
                                className="group flex flex-col items-center justify-center p-6 bg-white rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-300 transition-all hover:-translate-y-1"
                            >
                                <div className="p-4 bg-amber-50 rounded-2xl mb-3 transition-transform group-hover:scale-110">
                                    <Folder className="h-8 w-8 text-amber-500 fill-amber-500/20" />
                                </div>
                                <span className="font-black text-xs text-slate-700 uppercase tracking-tight text-center line-clamp-1">{folder}</span>
                            </button>
                        ))}
                    </div>
                )}

                {/* --- DOSYALAR (IZGARA GÖRÜNÜMÜ) --- */}
                {viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {currentFiles.map((item) => (
                            <Link key={item.id} href={`/extra/${item.id}`} className="group block">
                                <Card className="h-full rounded-[2rem] border-slate-200 group-hover:border-indigo-400 group-hover:shadow-2xl transition-all duration-300 overflow-hidden bg-white">
                                    <CardHeader className="pb-4 relative">
                                        <div className="absolute top-4 right-4">
                                            <div className="p-2 bg-slate-50 rounded-xl text-slate-400 group-hover:text-indigo-600 transition-colors">
                                                <FileText className="h-5 w-5" />
                                            </div>
                                        </div>
                                        <Badge variant="outline" className="bg-slate-50 text-slate-500 text-[9px] font-black uppercase mb-2 border-slate-100">
                                            {item.category?.split('/').pop() || 'Genel'}
                                        </Badge>
                                        <CardTitle className="text-xl font-bold text-slate-800 leading-tight group-hover:text-indigo-600 transition-colors">
                                            {item.title}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-slate-500 line-clamp-3 min-h-[3rem]">
                                            {item.description || "Bu döküman için açıklama belirtilmemiş."}
                                        </p>
                                    </CardContent>
                                    <CardFooter className="pt-4 border-t border-slate-50 flex items-center justify-between bg-slate-50/50">
                                        <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400">
                                            <Clock className="h-3 w-3" />
                                            {item.updatedAt ? format(new Date(item.updatedAt), 'dd.MM.yyyy', { locale: tr }) : '-'}
                                        </div>
                                        <div className="bg-slate-900 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-2 transition-all">
                                            <ArrowRight className="h-4 w-4" />
                                        </div>
                                    </CardFooter>
                                </Card>
                            </Link>
                        ))}
                    </div>
                ) : (
                    /* --- DOSYALAR (LİSTE GÖRÜNÜMÜ) --- */
                    <div className="space-y-3">
                        {currentFiles.map((item) => (
                            <Link key={item.id} href={`/extra/${item.id}`} className="group block">
                                <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 hover:border-indigo-400 hover:shadow-lg transition-all group">
                                    <div className="p-3 bg-slate-50 rounded-xl text-slate-400 group-hover:text-indigo-600 transition-colors">
                                        <FileText className="h-6 w-6" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-slate-800 group-hover:text-indigo-600 truncate">{item.title}</h3>
                                        <p className="text-xs text-slate-400 truncate">{item.description || "Açıklama yok."}</p>
                                    </div>
                                    <div className="hidden sm:flex flex-col items-end gap-1 px-4 border-l border-slate-100">
                                        <Badge variant="outline" className="text-[9px] font-black uppercase bg-slate-50 text-slate-400">
                                            {item.category?.split('/').pop() || 'Genel'}
                                        </Badge>
                                        <span className="text-[9px] font-bold text-slate-300">{item.updatedAt ? format(new Date(item.updatedAt), 'dd MMMM', { locale: tr }) : '-'}</span>
                                    </div>
                                    <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all mr-2" />
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

                {/* Boş Durum */}
                {currentFolders.length === 0 && currentFiles.length === 0 && (
                    <div className="text-center py-32 bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
                        <AlertTriangle className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-slate-800">İçerik Bulunamadı</h3>
                        <p className="text-slate-400 mt-2">Bu klasörde henüz yayınlanmış bir döküman yok.</p>
                        <Button variant="link" onClick={() => setCurrentPath([])} className="mt-4 text-indigo-600 font-bold">
                            Tüm Dökümanlara Dön
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}

