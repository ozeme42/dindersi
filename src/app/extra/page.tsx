'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
    Folder, FileText, ChevronRight, Search, 
    ArrowLeft, LayoutGrid, Clock, ChevronLeft,
    Loader2, MoreVertical, Globe, BookOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
    Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getExtraPages } from '@/app/teacher/extra-pages/actions';
import Link from 'next/link';

export default function ExtraPagesExplorer() {
    const [pages, setPages] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPath, setCurrentPath] = useState<string[]>([]); // Klasör hiyerarşisi

    useEffect(() => {
        const fetchPages = async () => {
            setIsLoading(true);
            const res = await getExtraPages(true); // Sadece yayınlananları getir
            if (res.success) setPages(res.data || []);
            setIsLoading(false);
        };
        fetchPages();
    }, []);

    // Hiyerarşik Veri İşleme
    const explorerData = useMemo(() => {
        const folders = new Set<string>();
        const files: any[] = [];
        
        const pathString = currentPath.join('/');

        pages.forEach(page => {
            const category = page.category || 'Genel';
            
            // Arama varsa hiyerarşiyi görmezden gelip tüm sonuçları göster
            if (searchTerm) {
                if (page.title.toLowerCase().includes(searchTerm.toLowerCase())) {
                    files.push(page);
                }
                return;
            }

            if (category === pathString || (pathString === "" && category === "Genel")) {
                // Bu seviyedeki dosyalar
                files.push(page);
            } else if (pathString === "" && !category.includes('/')) {
                // Ana dizindeki klasörler
                if (category !== "Genel") folders.add(category);
            } else if (category.startsWith(pathString + (pathString ? '/' : ''))) {
                // Alt klasörler
                const relativePath = pathString ? category.substring(pathString.length + 1) : category;
                const nextFolderName = relativePath.split('/')[0];
                if (nextFolderName) folders.add(nextFolderName);
            }
        });

        return {
            folders: Array.from(folders).sort(),
            files: files.sort((a, b) => a.title.localeCompare(b.title, 'tr'))
        };
    }, [pages, currentPath, searchTerm]);

    const handleFolderClick = (folderName: string) => {
        setCurrentPath([...currentPath, folderName]);
    };

    const handleBack = () => {
        setCurrentPath(currentPath.slice(0, -1));
    };

    const navigateToBreadcrumb = (index: number) => {
        setCurrentPath(currentPath.slice(0, index + 1));
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-indigo-100 relative pb-20">
            {/* Arka Plan Efekti */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-indigo-50/40 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-sky-50/40 rounded-full blur-[100px]" />
            </div>

            <main className="container mx-auto p-4 md:p-8 space-y-6 relative z-10">
                
                {/* Header */}
                <div className="bg-white/80 backdrop-blur-xl border border-slate-200 p-6 rounded-[2rem] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/">
                            <Button variant="ghost" size="icon" className="rounded-full h-12 w-12 hover:bg-slate-100">
                                <ArrowLeft className="h-6 w-6 text-slate-600" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">Döküman Merkezi</h1>
                            <p className="text-slate-500 text-sm font-medium">Rehberlik, materyal ve duyurular.</p>
                        </div>
                    </div>
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input 
                            placeholder="Dosyalarda ara..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 bg-slate-100 border-none rounded-2xl h-11 focus-visible:ring-indigo-500"
                        />
                    </div>
                </div>

                {/* Navigasyon & Breadcrumb */}
                {!searchTerm && (
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setCurrentPath([])}
                            className={cn("rounded-full font-bold", currentPath.length === 0 ? "bg-indigo-600 text-white hover:bg-indigo-600" : "text-slate-500")}
                        >
                            <Home className="h-4 w-4 mr-1.5" /> Ana Dizin
                        </Button>
                        {currentPath.map((part, i) => (
                            <React.Fragment key={i}>
                                <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => navigateToBreadcrumb(i)}
                                    className={cn("rounded-full font-bold", i === currentPath.length - 1 ? "bg-indigo-100 text-indigo-700" : "text-slate-500")}
                                >
                                    {part}
                                </Button>
                            </React.Fragment>
                        ))}
                    </div>
                )}

                {/* Explorer Grid */}
                {isLoading ? (
                    <div className="flex justify-center py-20"><Loader2 className="h-12 w-12 animate-spin text-indigo-500" /></div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                        
                        {/* Geri Dön Klasörü */}
                        {!searchTerm && currentPath.length > 0 && (
                            <button 
                                onClick={handleBack}
                                className="group flex flex-col items-center justify-center p-6 rounded-3xl bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-xl transition-all duration-300 text-center"
                            >
                                <div className="p-4 bg-slate-100 rounded-2xl text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors">
                                    <ChevronLeft className="h-10 w-10" />
                                </div>
                                <span className="mt-3 font-bold text-xs text-slate-500 uppercase">Üst Klasör</span>
                            </button>
                        )}

                        {/* Klasörler */}
                        {explorerData.folders.map(folderName => (
                            <button 
                                key={folderName}
                                onClick={() => handleFolderClick(folderName)}
                                className="group flex flex-col items-center justify-center p-6 rounded-3xl bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-xl transition-all duration-300 text-center"
                            >
                                <div className="p-4 bg-amber-50 rounded-2xl text-amber-500 group-hover:scale-110 transition-transform shadow-sm">
                                    <Folder className="h-10 w-10 fill-current" />
                                </div>
                                <span className="mt-3 font-black text-xs text-slate-700 uppercase line-clamp-1">{folderName}</span>
                            </button>
                        ))}

                        {/* Dosyalar */}
                        {explorerData.files.map(page => (
                            <Link 
                                key={page.id} 
                                href={`/extra/${page.id}`}
                                className="group flex flex-col items-center justify-center p-6 rounded-3xl bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-xl transition-all duration-300 text-center relative overflow-hidden"
                            >
                                <div className="p-4 bg-indigo-50 rounded-2xl text-indigo-600 group-hover:scale-110 transition-transform shadow-sm">
                                    <FileText className="h-10 w-10" />
                                </div>
                                <span className="mt-3 font-bold text-xs text-slate-800 uppercase line-clamp-2 leading-tight h-8 flex items-center">{page.title}</span>
                                <div className="absolute top-2 right-2">
                                     {page.isNew && <Badge className="bg-rose-500 text-[8px] h-4 px-1.5 border-none">YENİ</Badge>}
                                </div>
                            </Link>
                        ))}

                        {explorerData.folders.length === 0 && explorerData.files.length === 0 && (
                            <div className="col-span-full py-20 text-center">
                                <LayoutGrid className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                                <p className="text-slate-400 font-medium">Bu klasörde döküman bulunamadı.</p>
                            </div>
                        )}
                    </div>
                )}

            </main>
        </div>
    );
}

const Home = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;