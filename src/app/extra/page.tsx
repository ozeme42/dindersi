
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
    Plus, Search, Edit2, Trash2, Globe, Eye, EyeOff, 
    Loader2, MoreVertical, LayoutGrid, List as ListIcon, Tag, Settings,
    ChevronRight, Save, X, Move, FolderPlus, Folder, ArrowRight, Home, Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { getExtraPages } from '@/app/teacher/extra-pages/actions';
import Link from 'next/link';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function ExtraPagesExplorer() {
    const [pages, setPages] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPath, setCurrentPath] = useState<string[]>([]);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    
    const { toast } = useToast();

    // Akıllı Cihaz Tespiti: Mobilde varsayılan olarak Liste modunu seçer
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
        } else {
            toast({ title: "Hata", description: res.error, variant: "destructive" });
        }
        setIsLoading(false);
    };

    useEffect(() => { fetchPages(); }, []);

    // Mevcut konumdaki klasörleri ve dökümanları ayıkla
    const explorerData = useMemo(() => {
        const pathStr = currentPath.join('/');
        const folders = new Set<string>();
        const files: any[] = [];

        pages.forEach(p => {
            const cat = p.category || 'Genel';
            if (pathStr === "") {
                const firstPart = cat.split('/')[0];
                if (cat.includes('/')) folders.add(firstPart);
                else files.push(p);
            } else {
                if (cat === pathStr) {
                    files.push(p);
                } else if (cat.startsWith(pathStr + '/')) {
                    const remaining = cat.substring(pathStr.length + 1);
                    const nextPart = remaining.split('/')[0];
                    folders.add(nextPart);
                }
            }
        });

        return {
            folders: Array.from(folders).sort(),
            files: files.sort((a, b) => a.title.localeCompare(b.title, 'tr'))
        };
    }, [pages, currentPath]);

    const navigateToFolder = (folderName: string) => {
        setCurrentPath([...currentPath, folderName]);
    };

    const navigateToPath = (index: number) => {
        setCurrentPath(currentPath.slice(0, index + 1));
    };

    const resetPath = () => setCurrentPath([]);

    const filteredFolders = explorerData.folders.filter(f => f.toLowerCase().includes(searchTerm.toLowerCase()));
    const filteredFiles = explorerData.files.filter(f => f.title.toLowerCase().includes(searchTerm.toLowerCase()));

    if (isLoading) return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
            <p className="text-slate-400 font-bold animate-pulse uppercase tracking-widest text-xs">Arşiv Yükleniyor...</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50/50 font-sans text-slate-900 pb-20 relative selection:bg-indigo-100">
            {/* Üst Header */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
                <div className="container mx-auto px-4 h-20 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="p-2.5 bg-slate-100 rounded-xl text-slate-600 hover:bg-slate-200 transition-colors">
                            <ArrowLeft className="h-6 w-6" />
                        </Link>
                        <div>
                            <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">Ekstra Sayfalar</h1>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Dijital Materyal Arşivi</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden md:flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setViewMode('grid')}
                                className={cn("rounded-lg h-9 px-3", viewMode === 'grid' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500")}
                            >
                                <LayoutGrid className="h-4 w-4 mr-2" /> Izgara
                            </Button>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setViewMode('list')}
                                className={cn("rounded-lg h-9 px-3", viewMode === 'list' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500")}
                            >
                                <ListIcon className="h-4 w-4 mr-2" /> Liste
                            </Button>
                        </div>
                        <Button asChild variant="outline" className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 gap-2 h-11 px-5">
                            <Link href="/teacher/extra-pages"><Settings className="h-4 w-4" /> Yönet</Link>
                        </Button>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8 space-y-6">
                {/* Arama ve Yol Gösterici */}
                <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <Input 
                            placeholder="Dosya veya klasör ara..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-11 bg-slate-50 border-none rounded-2xl h-12 text-base focus-visible:ring-2 focus-visible:ring-indigo-500"
                        />
                    </div>
                    
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                        <button 
                            onClick={resetPath}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
                                currentPath.length === 0 ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
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
                                        "px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
                                        i === currentPath.length - 1 ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                    )}
                                >
                                    {folder}
                                </button>
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                {/* İçerik Alanı */}
                {(filteredFolders.length > 0 || filteredFiles.length > 0) ? (
                    <div className={cn(
                        "grid gap-4",
                        viewMode === 'grid' ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1"
                    )}>
                        {/* Klasörler */}
                        {filteredFolders.map(folder => (
                            <button 
                                key={folder}
                                onClick={() => navigateToFolder(folder)}
                                className={cn(
                                    "group relative flex items-center gap-4 bg-white border border-slate-200 rounded-3xl p-5 text-left transition-all duration-300 hover:shadow-xl hover:border-amber-400/50 hover:-translate-y-1",
                                    viewMode === 'list' && "p-4"
                                )}
                            >
                                <div className="p-3 bg-amber-50 rounded-2xl text-amber-500 group-hover:scale-110 transition-transform group-hover:bg-amber-100">
                                    <Folder className="h-8 w-8 fill-current" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-slate-800 truncate text-lg">{folder}</h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Klasör</p>
                                </div>
                                <ArrowRight className="h-5 w-5 text-slate-300 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                            </button>
                        ))}

                        {/* Dosyalar */}
                        {filteredFiles.map(file => (
                            <Link 
                                key={file.id} 
                                href={`/extra/${file.id}`}
                                className="block h-full group"
                            >
                                {viewMode === 'grid' ? (
                                    <Card className="h-full rounded-[2rem] border-slate-200 shadow-sm group-hover:shadow-2xl group-hover:border-indigo-500/30 transition-all duration-500 group-hover:-translate-y-2 overflow-hidden flex flex-col">
                                        <CardHeader className="pb-3">
                                            <div className="p-2.5 bg-indigo-50 rounded-2xl text-indigo-600 w-fit mb-3 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500">
                                                <BookOpen className="h-6 w-6" />
                                            </div>
                                            <CardTitle className="text-xl line-clamp-2 leading-tight group-hover:text-indigo-600 transition-colors">{file.title}</CardTitle>
                                        </CardHeader>
                                        <CardContent className="flex-1">
                                            <p className="text-sm text-slate-500 line-clamp-3 leading-relaxed">
                                                {file.description || "Bu materyal için açıklama girilmemiş."}
                                            </p>
                                        </CardContent>
                                        <CardFooter className="bg-slate-50/80 p-4 flex justify-between items-center border-t border-slate-100">
                                            <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400">
                                                <Clock className="h-3 w-3" />
                                                {file.updatedAt ? format(new Date(file.updatedAt), 'dd.MM.yyyy', { locale: tr }) : '-'}
                                            </div>
                                            <div className="bg-slate-900 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity translate-x-4 group-hover:translate-x-0">
                                                <ArrowRight className="h-4 w-4" />
                                            </div>
                                        </CardFooter>
                                    </Card>
                                ) : (
                                    <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between hover:border-indigo-500/40 hover:shadow-lg transition-all group-hover:-translate-y-0.5">
                                        <div className="flex items-center gap-4 flex-1 min-w-0">
                                            <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-600 shrink-0">
                                                <BookOpen className="h-5 w-5" />
                                            </div>
                                            <div className="truncate">
                                                <h3 className="font-bold text-slate-800 text-lg truncate group-hover:text-indigo-600 transition-colors">{file.title}</h3>
                                                <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                    <span className="flex items-center gap-1"><Clock className="h-3 w-3"/> {file.updatedAt ? format(new Date(file.updatedAt), 'dd.MM.yyyy', { locale: tr }) : '-'}</span>
                                                    <span>•</span>
                                                    <span>Döküman</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-slate-100 text-slate-400 p-2 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-all ml-4">
                                            <ArrowRight className="h-5 w-5" />
                                        </div>
                                    </div>
                                )}
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-32 bg-white rounded-[3rem] border-4 border-dashed border-slate-100 flex flex-col items-center justify-center">
                        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                            <Search className="h-10 w-10 text-slate-300" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 uppercase">Sonuç Bulunamadı</h3>
                        <p className="text-slate-400 mt-2 text-lg">Arama kriterlerinize uygun döküman veya klasör yok.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
