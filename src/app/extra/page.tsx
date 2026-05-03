
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
    Plus, Search, Globe, Eye, EyeOff, Loader2, 
    ChevronRight, Home, Settings, Grid, List, 
    Folder, FileText, Clock, ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
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

    // Mobil kontrolü ve varsayılan görünüm
    useEffect(() => {
        if (window.innerWidth < 768) {
            setViewMode('list');
        }
    }, []);

    const fetchPages = async () => {
        setIsLoading(true);
        // Sadece yayınlanmış sayfaları getir (Ziyaretçi görünümü)
        const res = await getExtraPages(true);
        if (res.success) {
            setPages(res.data || []);
        } else {
            toast({ title: "Hata", description: res.error, variant: "destructive" });
        }
        setIsLoading(false);
    };

    useEffect(() => { fetchPages(); }, []);

    // Kategorileri hiyerarşik klasör yapısına dönüştür
    const explorerData = useMemo(() => {
        const currentPathStr = currentPath.join('/');
        
        const folders = new Set<string>();
        const documents: any[] = [];

        pages.forEach(page => {
            const cat = page.category || 'Genel';
            
            if (currentPath.length === 0) {
                // Ana dizindeyiz
                const rootPart = cat.split('/')[0];
                if (cat.includes('/')) {
                    folders.add(rootPart);
                } else {
                    documents.push(page);
                }
            } else {
                // Bir klasörün içindeyiz
                if (cat === currentPathStr) {
                    documents.push(page);
                } else if (cat.startsWith(currentPathStr + '/')) {
                    const relativePath = cat.slice(currentPathStr.length + 1);
                    const nextPart = relativePath.split('/')[0];
                    folders.add(nextPart);
                }
            }
        });

        return {
            folders: Array.from(folders).sort(),
            documents: documents.sort((a, b) => a.title.localeCompare(b.title, 'tr'))
        };
    }, [pages, currentPath]);

    const handleFolderClick = (folderName: string) => {
        setCurrentPath([...currentPath, folderName]);
    };

    const navigateTo = (index: number) => {
        setCurrentPath(currentPath.slice(0, index + 1));
    };

    const resetPath = () => setCurrentPath([]);

    const filteredDocuments = explorerData.documents.filter(doc => 
        doc.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
                    <p className="text-slate-500 font-medium animate-pulse">Materyaller Hazırlanıyor...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans selection:bg-indigo-100">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200">
                <div className="container mx-auto px-4 h-20 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200">
                            <Globe className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">Döküman Merkezi</h1>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Ek İçerikler ve Rehberler</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="hidden sm:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 mr-2">
                            <Button 
                                variant={viewMode === 'grid' ? 'white' : 'ghost'} 
                                size="icon" 
                                onClick={() => setViewMode('grid')}
                                className={cn("h-9 w-9 rounded-lg transition-all", viewMode === 'grid' && "shadow-sm")}
                            >
                                <Grid className="h-4 w-4" />
                            </Button>
                            <Button 
                                variant={viewMode === 'list' ? 'white' : 'ghost'} 
                                size="icon" 
                                onClick={() => setViewMode('list')}
                                className={cn("h-9 w-9 rounded-lg transition-all", viewMode === 'list' && "shadow-sm")}
                            >
                                <List className="h-4 w-4" />
                            </Button>
                        </div>
                        <Button asChild variant="outline" className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 gap-2 h-11 px-5">
                            <Link href="/teacher/extra-pages"><Settings className="h-4 w-4" /> Yönet</Link>
                        </Button>
                    </div>
                </div>
            </header>

            <main className="container mx-auto p-4 md:p-8 flex-1 space-y-6">
                {/* Search & Breadcrumb Bar */}
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto no-scrollbar">
                        <button 
                            onClick={resetPath}
                            className={cn(
                                "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
                                currentPath.length === 0 ? "bg-indigo-50 text-indigo-700" : "text-slate-500 hover:bg-slate-50"
                            )}
                        >
                            <Home className="h-4 w-4" /> Ana Dizin
                        </button>
                        {currentPath.map((folder, i) => (
                            <React.Fragment key={i}>
                                <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />
                                <button 
                                    onClick={() => navigateTo(i)}
                                    className={cn(
                                        "px-3 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
                                        i === currentPath.length - 1 ? "bg-indigo-50 text-indigo-700" : "text-slate-500 hover:bg-slate-50"
                                    )}
                                >
                                    {folder}
                                </button>
                            </React.Fragment>
                        ))}
                    </div>
                    <div className="relative md:w-80">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input 
                            placeholder="Döküman ara..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-11 h-12 bg-white border-slate-200 rounded-2xl focus-visible:ring-indigo-500 shadow-sm"
                        />
                    </div>
                </div>

                {/* Content Area */}
                <div className="space-y-6">
                    {/* Folders */}
                    {explorerData.folders.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                            {explorerData.folders.map(folder => (
                                <button 
                                    key={folder}
                                    onClick={() => handleFolderClick(folder)}
                                    className="group flex flex-col items-center justify-center p-6 bg-white rounded-[2rem] border border-slate-200 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-100 transition-all duration-300"
                                >
                                    <div className="relative mb-3">
                                        <Folder className="h-12 w-12 text-amber-400 fill-amber-100 group-hover:scale-110 transition-transform duration-300" />
                                        <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 border border-slate-100 shadow-sm">
                                            <Plus className="h-3 w-3 text-indigo-600" />
                                        </div>
                                    </div>
                                    <span className="text-sm font-black text-slate-700 text-center line-clamp-1 uppercase tracking-tight">{folder}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Documents */}
                    {filteredDocuments.length > 0 ? (
                        viewMode === 'grid' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {filteredDocuments.map((item) => (
                                    <Link key={item.id} href={`/extra/${item.id}`} className="group block">
                                        <Card className="h-full rounded-[2rem] border-slate-200 overflow-hidden hover:shadow-2xl hover:shadow-indigo-100 transition-all duration-500 transform group-hover:-translate-y-1">
                                            <CardHeader className="pb-4">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-slate-400 group-hover:text-indigo-600 group-hover:bg-indigo-50 transition-colors">
                                                        <FileText className="h-5 w-5" />
                                                    </div>
                                                    <Badge variant="outline" className="text-[9px] font-black tracking-widest uppercase py-0.5 border-slate-200 text-slate-400">DÖKÜMAN</Badge>
                                                </div>
                                                <CardTitle className="text-lg font-bold text-slate-900 group-hover:text-indigo-700 transition-colors leading-tight line-clamp-2 min-h-[3rem]">
                                                    {item.title}
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">
                                                    {item.description || "Bu döküman için açıklama girilmemiş."}
                                                </p>
                                            </CardContent>
                                            <CardFooter className="pt-4 border-t border-slate-50 bg-slate-50/30 flex items-center justify-between">
                                                <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                                    <Clock className="h-3 w-3" />
                                                    {item.updatedAt ? format(new Date(item.updatedAt), 'dd MMM yyyy', { locale: tr }) : '-'}
                                                </div>
                                                <div className="bg-slate-900 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                                    <ArrowRight className="h-4 w-4" />
                                                </div>
                                            </CardFooter>
                                        </Card>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {filteredDocuments.map((item) => (
                                    <Link key={item.id} href={`/extra/${item.id}`} className="group block">
                                        <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-lg transition-all group">
                                            <div className="p-3 bg-slate-50 rounded-xl text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                                <FileText className="h-6 w-6" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-slate-900 group-hover:text-indigo-700 truncate">{item.title}</h4>
                                                <p className="text-xs text-slate-500 truncate mt-0.5">{item.description}</p>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400">
                                                <Clock className="h-3 w-3" />
                                                {item.updatedAt ? format(new Date(item.updatedAt), 'dd.MM.yyyy') : '-'}
                                            </div>
                                            <div className="bg-slate-900 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                                                <ArrowRight className="h-3.5 w-3.5" />
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )
                    ) : (
                        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
                            <div className="p-6 bg-slate-50 rounded-full mb-4">
                                <FileText className="h-12 w-12 text-slate-300" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900">Sonuç Bulunamadı</h3>
                            <p className="text-slate-500 mt-1">Aramanızla eşleşen bir döküman yok.</p>
                            <Button variant="link" onClick={() => setSearchTerm("")} className="mt-2 text-indigo-600 font-bold">Aramayı Temizle</Button>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
