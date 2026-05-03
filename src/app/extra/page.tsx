
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
    Search, Folder, FileText, ChevronRight, Home, ArrowRight, 
    Clock, Settings, Globe, LayoutGrid, List, Loader2, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
    Card, CardContent, CardHeader, CardTitle, 
    CardDescription, CardFooter 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { getExtraPages } from '@/app/teacher/extra-pages/actions';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function ExtraPagesExplorer() {
    const [allPages, setAllStudents] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPath, setCurrentPath] = useState<string[]>([]);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    // Mobilde varsayılanı liste yap
    useEffect(() => {
        if (window.innerWidth < 768) {
            setViewMode('list');
        }
    }, []);

    const fetchPages = async () => {
        setIsLoading(true);
        const res = await getExtraPages(true); // Sadece yayınlananlar
        if (res.success) {
            setAllStudents(res.data || []);
        }
        setIsLoading(false);
    };

    useEffect(() => { fetchPages(); }, []);

    // Kategorileri işle ve hiyerarşik yapı kur
    const folderStructure = useMemo(() => {
        const root: any = { files: [], folders: {} };
        
        const filtered = allPages.filter(p => 
            p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
            p.category?.toLowerCase().includes(searchTerm.toLowerCase())
        );

        filtered.forEach(page => {
            const cat = page.category || 'Genel';
            const parts = cat.split('/').filter(Boolean);
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
    }, [allPages, searchTerm]);

    // Mevcut dizin içeriğini al
    const currentDir = useMemo(() => {
        let current = folderStructure;
        for (const p of currentPath) {
            if (current.folders[p]) current = current.folders[p];
            else return { files: [], folders: {} };
        }
        return current;
    }, [folderStructure, currentPath]);

    const navigateTo = (folder: string) => setCurrentPath([...currentPath, folder]);
    const navigateBack = (index: number) => setCurrentPath(currentPath.slice(0, index + 1));
    const goToRoot = () => setCurrentPath([]);

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
                    <p className="text-slate-500 font-bold animate-pulse">Dökümanlar Hazırlanıyor...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] font-sans text-slate-900 pb-20 selection:bg-indigo-100">
            {/* Dekoratif Arka Plan */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-indigo-50/50 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-sky-50/50 rounded-full blur-[120px]" />
            </div>

            <main className="container mx-auto p-4 md:p-8 space-y-6 relative z-10">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/80 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white shadow-xl shadow-slate-200/50">
                    <div className="flex items-center gap-5">
                        <div className="p-3 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl text-white shadow-lg shadow-indigo-200">
                            <Globe className="h-7 w-7" />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight uppercase">Döküman Merkezi</h1>
                            <p className="text-slate-500 text-sm font-medium flex items-center gap-1.5 mt-0.5">
                                <Sparkles className="h-3.5 w-3.5 text-indigo-400" /> Materyaller ve Rehberler
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3">
                        <div className="relative w-full md:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input 
                                placeholder="Dosya ara..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 bg-slate-50 border-none rounded-xl focus-visible:ring-indigo-500 h-11"
                            />
                        </div>
                        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                            <Button 
                                variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
                                size="icon" 
                                onClick={() => setViewMode('grid')}
                                className={cn("h-9 w-9 rounded-lg", viewMode === 'grid' ? "bg-white shadow-sm text-indigo-600" : "text-slate-500")}
                            >
                                <LayoutGrid className="h-4.5 w-4.5" />
                            </Button>
                            <Button 
                                variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
                                size="icon" 
                                onClick={() => setViewMode('list')}
                                className={cn("h-9 w-9 rounded-lg", viewMode === 'list' ? "bg-white shadow-sm text-indigo-600" : "text-slate-500")}
                            >
                                <List className="h-4.5 w-4.5" />
                            </Button>
                        </div>
                        <Button asChild variant="outline" className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 gap-2 h-11 px-5">
                            <Link href="/teacher/extra-pages"><Settings className="h-4 w-4" /> Yönet</Link>
                        </Button>
                    </div>
                </div>

                {/* Breadcrumb / Navigasyon */}
                <div className="bg-white/60 backdrop-blur-md px-6 py-3 rounded-2xl border border-white shadow-sm flex items-center gap-2 overflow-x-auto no-scrollbar">
                    <button 
                        onClick={goToRoot}
                        className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-all",
                            currentPath.length === 0 ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" : "text-slate-500 hover:bg-white hover:text-indigo-600"
                        )}
                    >
                        <Home className="h-4 w-4" /> Ana Dizin
                    </button>
                    {currentPath.map((folder, i) => (
                        <React.Fragment key={i}>
                            <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />
                            <button 
                                onClick={() => navigateBack(i)}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap",
                                    i === currentPath.length - 1 ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" : "text-slate-500 hover:bg-white hover:text-indigo-600"
                                )}
                            >
                                {folder}
                            </button>
                        </React.Fragment>
                    ))}
                </div>

                {/* İçerik Alanı */}
                <div className="min-h-[50vh]">
                    {Object.keys(currentDir.folders).length === 0 && currentDir.files.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 text-center">
                            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                                <Search className="h-10 w-10 text-slate-300" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900">Sonuç Bulunamadı</h3>
                            <p className="text-slate-500 max-w-xs mt-2">Bu klasörde veya aramanızla eşleşen bir içerik bulunmuyor.</p>
                        </div>
                    ) : (
                        <div className={cn(
                            viewMode === 'grid' 
                                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" 
                                : "flex flex-col gap-3"
                        )}>
                            {/* Klasörler */}
                            {Object.keys(currentDir.folders).sort().map(folderName => (
                                <button 
                                    key={folderName} 
                                    onClick={() => navigateTo(folderName)}
                                    className={cn(
                                        "group transition-all duration-300 text-left relative",
                                        viewMode === 'grid' 
                                            ? "bg-white p-6 rounded-[2rem] border border-white shadow-sm hover:shadow-xl hover:translate-y-[-4px]" 
                                            : "bg-white/80 p-4 rounded-2xl border border-white flex items-center gap-4 hover:bg-white hover:shadow-md"
                                    )}
                                >
                                    <div className={cn(
                                        "p-4 bg-amber-50 rounded-2xl text-amber-500 transition-colors group-hover:bg-amber-500 group-hover:text-white",
                                        viewMode === 'list' && "p-2.5 rounded-xl"
                                    )}>
                                        <Folder className={cn(viewMode === 'grid' ? "h-8 w-8" : "h-5 w-5")} fill="currentColor" fillOpacity={0.2} />
                                    </div>
                                    <div className={viewMode === 'grid' ? "mt-4" : "flex-1"}>
                                        <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{folderName}</h3>
                                        <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mt-0.5">Klasör</p>
                                    </div>
                                    <ChevronRight className="absolute right-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 opacity-0 group-hover:opacity-100 transition-all" />
                                </button>
                            ))}

                            {/* Dosyalar */}
                            {currentDir.files.sort((a:any, b:any) => a.title.localeCompare(b.title, 'tr')).map((item: any) => (
                                <Link 
                                    href={`/extra/${item.id}`} 
                                    key={item.id} 
                                    className={cn(
                                        "group transition-all duration-300",
                                        viewMode === 'grid' ? "h-full" : "w-full"
                                    )}
                                >
                                    {viewMode === 'grid' ? (
                                        <Card className="h-full bg-white border-white rounded-[2rem] shadow-sm hover:shadow-2xl hover:translate-y-[-4px] transition-all overflow-hidden flex flex-col">
                                            <CardHeader className="pb-4">
                                                <div className="p-3 w-fit bg-indigo-50 rounded-2xl text-indigo-500 mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                                    <FileText className="h-6 w-6" />
                                                </div>
                                                <CardTitle className="text-lg line-clamp-2 leading-tight min-h-[3rem] group-hover:text-indigo-600 transition-colors">{item.title}</CardTitle>
                                            </CardHeader>
                                            <CardContent className="flex-grow">
                                                <p className="text-xs text-slate-500 line-clamp-3 font-medium leading-relaxed">
                                                    {item.description || "Döküman içeriğini görüntülemek için tıklayın."}
                                                </p>
                                            </CardContent>
                                            <CardFooter className="pt-4 border-t border-slate-50 flex items-center justify-between bg-slate-50/50">
                                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                    <Clock className="h-3 w-3" /> 
                                                    {item.updatedAt ? format(new Date(item.updatedAt), 'd MMM yyyy', { locale: tr }) : '-'}
                                                </div>
                                                <div className="bg-slate-900 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <ArrowRight className="h-4 w-4" />
                                                </div>
                                            </CardFooter>
                                        </Card>
                                    ) : (
                                        <div className="bg-white/80 p-4 rounded-2xl border border-white flex items-center gap-4 hover:bg-white hover:shadow-md transition-all">
                                            <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-500 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                                <FileText className="h-5 w-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">{item.title}</h3>
                                                <div className="flex items-center gap-3 mt-0.5">
                                                    <Badge variant="outline" className="text-[9px] font-bold border-slate-100 text-slate-400 uppercase tracking-widest px-1.5 h-4">Döküman</Badge>
                                                    <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400">
                                                        <Clock className="h-3 w-3" />
                                                        {item.updatedAt ? format(new Date(item.updatedAt), 'dd.MM.yyyy') : '-'}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="bg-slate-900 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                                                <ArrowRight className="h-3.5 w-3.5" />
                                            </div>
                                        </div>
                                    )}
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
