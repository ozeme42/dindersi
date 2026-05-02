'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
    Folder, FileText, ChevronRight, Search, 
    ArrowLeft, Loader2, Globe, Clock, LayoutGrid, Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getExtraPages } from '@/app/teacher/extra-pages/actions';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function ExtraPagesGallery() {
    const [pages, setPages] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPath, setCurrentPath] = useState<string[]>([]); // Klasör derinliği takibi

    const fetchPages = async () => {
        setIsLoading(true);
        const res = await getExtraPages(true); // Sadece yayınlanmışları getir
        if (res.success) {
            setPages(res.data || []);
        }
        setIsLoading(false);
    };

    useEffect(() => { fetchPages(); }, []);

    // Mevcut konumdaki klasörler ve dosyalar
    const explorerData = useMemo(() => {
        const currentPathStr = currentPath.join('/');
        
        const filtered = pages.filter(p => {
            const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase());
            if (searchTerm) return matchesSearch;
            return true;
        });

        const folders = new Set<string>();
        const files: any[] = [];

        filtered.forEach(p => {
            const cat = p.category || 'Genel';
            const catParts = cat.split('/');
            
            // Arama yapılıyorsa klasör yapısını bozup hepsini listeleyelim
            if (searchTerm) {
                files.push(p);
                return;
            }

            // Mevcut yola göre filtrele
            const isAtCurrentPath = (currentPath.length === 0 && !cat.includes('/')) || cat.startsWith(currentPathStr + '/');
            const isExactlyAtCurrentPath = cat === currentPathStr;

            if (isExactlyAtCurrentPath) {
                files.push(p);
            } else if (currentPath.length === 0) {
                // Ana dizindeyiz
                folders.add(catParts[0]);
            } else if (cat.startsWith(currentPathStr + '/')) {
                // Alt dizindeyiz
                const relativePart = cat.substring(currentPathStr.length + 1);
                folders.add(relativePart.split('/')[0]);
            }
        });

        return {
            folders: Array.from(folders).sort(),
            files: files.sort((a, b) => a.title.localeCompare(b.title, 'tr'))
        };
    }, [pages, currentPath, searchTerm]);

    const handleFolderClick = (folderName: string) => {
        setCurrentPath([...currentPath, folderName]);
        setSearchTerm("");
    };

    const handleBack = () => {
        setCurrentPath(prev => prev.slice(0, -1));
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
                <div className="container mx-auto px-4 h-20 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 overflow-hidden">
                        <Link href="/">
                            <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100">
                                <ArrowLeft className="h-6 w-6 text-slate-600" />
                            </Button>
                        </Link>
                        <div className="flex flex-col">
                            <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">Döküman Merkezi</h1>
                            <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Extra Kaynaklar & Rehberlik</p>
                        </div>
                    </div>

                    <div className="relative flex-1 max-w-md hidden md:block">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input 
                            placeholder="Dosya veya klasör ara..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 bg-slate-50 border-slate-200 rounded-xl focus-visible:ring-indigo-500"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                         <Button asChild variant="outline" className="rounded-xl border-slate-200 hidden sm:flex">
                            <Link href="/login">Öğretmen Girişi</Link>
                         </Button>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8 space-y-8">
                {/* Breadcrumbs / Back */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setCurrentPath([])}
                            className={cn("px-2 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg", currentPath.length === 0 && "text-indigo-600")}
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
                                    className={cn("px-2 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg", i === currentPath.length - 1 && "text-indigo-600")}
                                >
                                    {part}
                                </Button>
                            </React.Fragment>
                        ))}
                    </div>
                    {currentPath.length > 0 && (
                        <Button variant="outline" size="sm" onClick={handleBack} className="rounded-lg border-slate-200 bg-white">
                            <ArrowLeft className="h-4 w-4 mr-2" /> Geri Dön
                        </Button>
                    )}
                </div>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
                        <p className="text-slate-400 font-medium animate-pulse">Dosyalar listeleniyor...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                        {/* Klasörler */}
                        {explorerData.folders.map(folder => (
                            <button 
                                key={folder} 
                                onClick={() => handleFolderClick(folder)}
                                className="group flex flex-col items-center p-6 bg-white rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all duration-300"
                            >
                                <div className="relative mb-4">
                                    <div className="absolute inset-0 bg-amber-400/20 blur-xl rounded-full group-hover:scale-150 transition-transform opacity-0 group-hover:opacity-100" />
                                    <Folder className="h-20 w-20 text-amber-400 group-hover:scale-110 transition-transform relative z-10" fill="currentColor" fillOpacity={0.2} />
                                </div>
                                <span className="font-bold text-slate-800 text-center line-clamp-1 group-hover:text-indigo-600">{folder}</span>
                                <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-1">Klasör</span>
                            </button>
                        ))}

                        {/* Dosyalar */}
                        {explorerData.files.map(page => (
                            <Link key={page.id} href={`/extra/${page.id}`} className="group h-full">
                                <Card className="h-full bg-white rounded-[2rem] border-slate-200 shadow-sm group-hover:shadow-xl group-hover:border-indigo-200 transition-all duration-300 overflow-hidden flex flex-col">
                                    <CardHeader className="pb-4">
                                        <div className="mb-4 relative w-fit">
                                             <div className="absolute inset-0 bg-indigo-500/10 blur-lg rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                                             <div className="bg-slate-50 p-3 rounded-2xl group-hover:bg-indigo-50 transition-colors relative z-10">
                                                <FileText className="h-8 w-8 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                                             </div>
                                        </div>
                                        <CardTitle className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors leading-tight line-clamp-2 min-h-[3rem]">
                                            {page.title}
                                        </CardTitle>
                                        <CardDescription className="text-[11px] font-medium text-slate-400 flex items-center gap-1 mt-1 uppercase">
                                            <Clock className="h-3 w-3" /> {page.updatedAt ? new Date(page.updatedAt).toLocaleDateString('tr-TR') : 'YENİ'}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex-1 pt-0">
                                        <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                                            {page.description || "Döküman içeriğini görüntülemek için tıklayın."}
                                        </p>
                                    </CardContent>
                                    <CardFooter className="pt-4 border-t border-slate-50 bg-slate-50/30 flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                            <Calendar className="h-3.5 w-3.5" />
                                            {page.createdAt ? new Date(page.createdAt).toLocaleDateString('tr-TR') : 'YENİ'}
                                        </div>
                                        <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                                    </CardFooter>
                                </Card>
                            </Link>
                        ))}
                    </div>
                )}

                {!isLoading && explorerData.folders.length === 0 && explorerData.files.length === 0 && (
                    <div className="text-center py-32 bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
                        <LayoutGrid className="h-16 w-16 text-slate-200 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-slate-400">Bu klasör henüz boş.</h3>
                        <p className="text-slate-400 mt-1">Daha sonra tekrar kontrol edin.</p>
                    </div>
                )}
            </main>
        </div>
    );
}