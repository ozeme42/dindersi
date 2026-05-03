'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
    Folder, FileText, ChevronRight, Search, 
    ArrowLeft, Loader2, Clock, Globe, LayoutGrid
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
    Card, CardContent, CardHeader, CardTitle, 
    CardDescription, CardFooter 
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { getExtraPages } from '@/app/teacher/extra-pages/actions';
import Link from 'next/link';

export default function ExtraPagesGallery() {
    const [pages, setPages] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentPath, setCurrentPath] = useState<string[]>([]); // Klasör yolu
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        const fetchPages = async () => {
            setIsLoading(true);
            const res = await getExtraPages(true); // Sadece yayınlanmış olanlar
            if (res.success) setPages(res.data || []);
            setIsLoading(false);
        };
        fetchPages();
    }, []);

    // Mevcut yola göre klasörleri ve dosyaları filtrele
    const explorerData = useMemo(() => {
        const currentPathStr = currentPath.join('/');
        
        const folders = new Set<string>();
        const files: any[] = [];

        pages.forEach(page => {
            const cat = page.category || 'Genel';
            
            // Eğer dosya tam olarak bu klasördeyse
            if (cat === currentPathStr || (currentPath.length === 0 && cat === 'Genel')) {
                files.push(page);
            } 
            // Eğer dosya bu klasörün altındaki bir alt klasördeyse
            else if (cat.startsWith(currentPathStr + (currentPath.length > 0 ? '/' : ''))) {
                const relativePart = currentPath.length === 0 ? cat : cat.substring(currentPathStr.length + 1);
                const firstPart = relativePart.split('/')[0];
                if (firstPart) folders.add(firstPart);
            }
        });

        // Arama varsa tümünü göster (Klasör yapısını bozabilir, o yüzden sadece dosyaları filtreleyelim)
        if (searchTerm) {
            const filteredFiles = pages.filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase()));
            return { folders: [], files: filteredFiles };
        }

        return { 
            folders: Array.from(folders).sort(), 
            files: files.sort((a, b) => a.title.localeCompare(b.title, 'tr')) 
        };
    }, [pages, currentPath, searchTerm]);

    const navigateToFolder = (folderName: string) => {
        setCurrentPath([...currentPath, folderName]);
        setSearchTerm("");
    };

    const navigateBack = () => {
        setCurrentPath(currentPath.slice(0, -1));
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
            {/* Arka Plan */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-indigo-100/30 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-sky-100/30 rounded-full blur-[100px]" />
            </div>

            <div className="container mx-auto p-4 sm:p-6 md:p-10 relative z-10 space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/60 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white/40 shadow-xl shadow-slate-200/50">
                    <div className="flex items-center gap-5">
                        <Link href="/">
                             <div className="flex items-center justify-center h-14 w-14 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-95">
                                <ArrowLeft className="h-6 w-6 text-slate-600" />
                             </div>
                        </Link>
                        <div>
                            <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                                <Globe className="h-8 w-8 text-indigo-500" />
                                DÖKÜMAN MERKEZİ
                            </h1>
                            <p className="text-slate-500 font-medium">Rehberlik, materyal ve bilgilendirme dökümanları.</p>
                        </div>
                    </div>
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input 
                            placeholder="Dosyalarda ara..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 bg-white/80 border-slate-200 rounded-2xl h-12 shadow-inner focus-visible:ring-indigo-500"
                        />
                    </div>
                </div>

                {/* Breadcrumb & Navigation */}
                <div className="flex items-center gap-2 bg-white/40 p-2 rounded-2xl border border-white overflow-x-auto no-scrollbar">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setCurrentPath([])} 
                        className={cn("rounded-xl font-bold gap-2 h-10 px-4", currentPath.length === 0 ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500")}
                    >
                        <LayoutGrid className="h-4 w-4" /> Ana Dizin
                    </Button>
                    
                    {currentPath.map((folder, index) => (
                        <React.Fragment key={index}>
                            <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setCurrentPath(currentPath.slice(0, index + 1))}
                                className={cn("rounded-xl font-bold h-10 px-4", index === currentPath.length - 1 ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500")}
                            >
                                {folder}
                            </Button>
                        </React.Fragment>
                    ))}
                </div>

                {/* Explorer Area */}
                {isLoading ? (
                    <div className="flex justify-center py-24">
                        <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 sm:gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        
                        {/* Geri Dön Klasörü */}
                        {currentPath.length > 0 && !searchTerm && (
                            <button 
                                onClick={navigateBack}
                                className="group flex flex-col items-center gap-3 p-4 rounded-3xl bg-white/40 border border-white hover:bg-white hover:shadow-xl transition-all duration-300"
                            >
                                <div className="relative">
                                    <Folder className="h-16 w-16 md:h-20 md:w-20 text-slate-300 group-hover:text-indigo-200 transition-colors" fill="currentColor" />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <ArrowLeft className="h-6 w-6 text-slate-500" />
                                    </div>
                                </div>
                                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">ÜST DİZİN</span>
                            </button>
                        )}

                        {/* Klasörler */}
                        {explorerData.folders.map(folder => (
                            <button 
                                key={folder}
                                onClick={() => navigateToFolder(folder)}
                                className="group flex flex-col items-center gap-3 p-4 rounded-3xl bg-white/60 border border-white hover:bg-white hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                            >
                                <div className="relative">
                                    <Folder className="h-16 w-16 md:h-20 md:w-20 text-amber-400 group-hover:text-amber-500 transition-colors" fill="currentColor" />
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <ChevronRight className="h-8 w-8 text-white" />
                                    </div>
                                </div>
                                <span className="text-sm font-bold text-slate-700 text-center line-clamp-1 group-hover:text-indigo-600 px-2">{folder}</span>
                            </button>
                        ))}

                        {/* Dosyalar */}
                        {explorerData.files.map(page => (
                            <Link key={page.id} href={`/extra/${page.id}`} className="group">
                                <Card className="h-full bg-white/80 border-slate-200 rounded-3xl overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                                    <CardHeader className="p-5 pb-2">
                                        <div className="flex justify-center mb-4">
                                            <div className="p-3 bg-indigo-50 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                                                <FileText className="h-8 w-8" />
                                            </div>
                                        </div>
                                        <CardTitle className="text-center text-sm font-bold leading-snug line-clamp-2 h-10 group-hover:text-indigo-600 transition-colors">
                                            {page.title}
                                        </CardTitle>
                                        <CardDescription className="text-[10px] font-bold text-slate-400 flex items-center justify-center gap-1 mt-2 uppercase tracking-tighter">
                                            <Clock className="h-3 w-3" /> {page.updatedAt ? new Date(page.updatedAt).toLocaleDateString('tr-TR') : 'YENİ'}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardFooter className="px-4 pb-4 pt-2">
                                        <div className="w-full bg-slate-50 text-slate-500 py-2 rounded-xl text-[10px] font-black text-center uppercase tracking-widest group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                            Görüntüle
                                        </div>
                                    </CardFooter>
                                </Card>
                            </Link>
                        ))}
                    </div>
                )}

                {/* Boş Durum */}
                {!isLoading && explorerData.folders.length === 0 && explorerData.files.length === 0 && (
                    <div className="text-center py-32 bg-white/40 rounded-[3rem] border-2 border-dashed border-slate-300">
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Search className="h-10 w-10 text-slate-300" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800">Dosya Bulunamadı</h3>
                        <p className="text-slate-500 mt-2">Bu klasör henüz boş veya arama kriterine uyan dosya yok.</p>
                        <Button variant="link" onClick={() => {setCurrentPath([]); setSearchTerm("");}} className="mt-4 text-indigo-600 font-bold">Tüm Dökümanlara Dön</Button>
                    </div>
                )}
            </div>
        </div>
    );
}