'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
    Folder, FileText, ChevronRight, Search, ArrowLeft, 
    LayoutGrid, BookOpen, Clock, Loader2, Home
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
    Card, CardContent, CardHeader, CardTitle, 
    CardDescription, CardFooter 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getExtraPages } from '@/app/teacher/extra-pages/actions';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function ExtraPagesGallery() {
    const [pages, setPages] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentPath, setCurrentPath] = useState<string[]>([]); // Klasör yolu hiyerarşisi
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        const fetchPages = async () => {
            setIsLoading(true);
            const res = await getExtraPages(true); // Sadece yayındakileri getir
            if (res.success) {
                setPages(res.data || []);
            }
            setIsLoading(false);
        };
        fetchPages();
    }, []);

    // Mevcut konumdaki içeriği belirle
    const currentDirectoryContent = useMemo(() => {
        const currentPathStr = currentPath.join('/');
        
        // Klasörleri ve Dosyaları ayıkla
        const subDirs = new Set<string>();
        const filesAtCurrentLevel: any[] = [];

        pages.forEach(page => {
            const cat = page.category || 'Genel';
            
            // Arama yapılıyorsa hiyerarşiyi görmezden gel
            if (searchTerm) {
                if (page.title.toLowerCase().includes(searchTerm.toLowerCase())) {
                    filesAtCurrentLevel.push(page);
                }
                return;
            }

            if (currentPath.length === 0) {
                // Kök dizindeyiz
                const rootPart = cat.split('/')[0];
                if (cat.includes('/')) {
                    subDirs.add(rootPart);
                } else if (cat === 'Genel' || !cat) {
                    filesAtCurrentLevel.push(page);
                } else {
                    subDirs.add(rootPart);
                }
            } else {
                // Bir klasörün içindeyiz
                if (cat.startsWith(currentPathStr + '/')) {
                    const relativePath = cat.substring(currentPathStr.length + 1);
                    const nextPart = relativePath.split('/')[0];
                    if (relativePath.includes('/')) {
                        subDirs.add(nextPart);
                    } else {
                        subDirs.add(nextPart);
                    }
                } else if (cat === currentPathStr) {
                    filesAtCurrentLevel.push(page);
                }
            }
        });

        return {
            folders: Array.from(subDirs).sort(),
            files: filesAtCurrentLevel.sort((a, b) => a.title.localeCompare(b.title, 'tr'))
        };
    }, [pages, currentPath, searchTerm]);

    const navigateToFolder = (folderName: string) => {
        setCurrentPath([...currentPath, folderName]);
        setSearchTerm("");
    };

    const goBack = () => {
        setCurrentPath(prev => prev.slice(0, -1));
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
            {/* Arka Plan Efekti */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-indigo-100/50 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-sky-100/50 rounded-full blur-[120px]" />
            </div>

            <div className="container mx-auto p-4 md:p-8 relative z-10 space-y-6">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/80 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white shadow-xl">
                    <div className="flex items-center gap-5">
                        <Link href="/">
                            <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-200 hover:scale-105 transition-transform">
                                <Home className="h-6 w-6" />
                            </div>
                        </Link>
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Döküman Merkezi</h1>
                            <p className="text-slate-500 font-medium text-sm">Rehberlik, duyurular ve yardımcı materyaller.</p>
                        </div>
                    </div>

                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input 
                            placeholder="Dosya ara..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 bg-slate-100/50 border-none rounded-2xl h-12 focus-visible:ring-indigo-500 shadow-inner"
                        />
                    </div>
                </div>

                {/* Navigasyon & Breadcrumb */}
                {!searchTerm && (
                    <div className="flex items-center gap-3 px-4">
                        {currentPath.length > 0 && (
                            <Button variant="ghost" size="icon" onClick={goBack} className="rounded-full h-10 w-10 hover:bg-indigo-50 text-indigo-600">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        )}
                        <div className="flex items-center gap-1 text-sm font-bold text-slate-400 uppercase tracking-widest">
                            <span className={cn("hover:text-indigo-600 cursor-pointer transition-colors", currentPath.length === 0 ? "text-indigo-600" : "")} onClick={() => setCurrentPath([])}>KÖK DİZİN</span>
                            {currentPath.map((part, i) => (
                                <React.Fragment key={i}>
                                    <ChevronRight className="h-4 w-4" />
                                    <span 
                                        className={cn("hover:text-indigo-600 cursor-pointer transition-colors", i === currentPath.length - 1 ? "text-indigo-600" : "")}
                                        onClick={() => setCurrentPath(currentPath.slice(0, i + 1))}
                                    >
                                        {part}
                                    </span>
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                )}

                {/* GALERİ ALANI */}
                {isLoading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                        
                        {/* Klasörler */}
                        {!searchTerm && currentDirectoryContent.folders.map((folder) => (
                            <button 
                                key={folder}
                                onClick={() => navigateToFolder(folder)}
                                className="group flex flex-col items-center gap-3 p-6 rounded-[2rem] bg-white border border-slate-200 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
                            >
                                <div className="relative">
                                    <div className="absolute inset-0 bg-amber-400 blur-2xl opacity-0 group-hover:opacity-20 transition-opacity" />
                                    <Folder className="h-16 w-16 text-amber-500 fill-amber-500/10 group-hover:fill-amber-500/20 transition-all" />
                                </div>
                                <span className="font-black text-slate-700 text-sm uppercase tracking-tight text-center line-clamp-1">{folder}</span>
                            </button>
                        ))}

                        {/* Dosyalar */}
                        {currentDirectoryContent.files.map((page) => (
                            <Link key={page.id} href={`/extra/${page.id}`}>
                                <Card className="group h-full rounded-[2rem] border-slate-200 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col">
                                    <CardHeader className="p-5 pb-2">
                                        <div className="p-3 bg-sky-50 rounded-2xl w-fit mb-3 group-hover:bg-sky-100 transition-colors">
                                            <FileText className="h-6 w-6 text-sky-600" />
                                        </div>
                                        <CardTitle className="text-lg font-black text-slate-800 leading-tight line-clamp-2 min-h-[3.5rem] group-hover:text-indigo-600 transition-colors uppercase tracking-tighter">
                                            {page.title}
                                        </CardTitle>
                                        <CardDescription className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mt-1 uppercase tracking-widest">
                                            <Clock className="h-3 w-3" /> {page.updatedAt ? new Date(page.updatedAt).toLocaleDateString('tr-TR') : 'YENİ'}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="px-5 pb-5 mt-auto">
                                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed italic">
                                            {page.description || "Döküman içeriğini görüntülemek için tıklayın."}
                                        </p>
                                    </CardContent>
                                    <CardFooter className="bg-slate-50/50 p-3 flex justify-end items-center border-t border-slate-100">
                                        <div className="flex items-center gap-1 text-[10px] font-black text-indigo-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                                            AÇ <ChevronRight className="h-3 w-3" />
                                        </div>
                                    </CardFooter>
                                </Card>
                            </Link>
                        ))}

                        {/* Boş Durum */}
                        {currentDirectoryContent.folders.length === 0 && currentDirectoryContent.files.length === 0 && (
                            <div className="col-span-full py-32 text-center flex flex-col items-center bg-white/50 rounded-[3rem] border-2 border-dashed border-slate-200">
                                <LayoutGrid className="h-16 w-16 text-slate-200 mb-4" />
                                <h3 className="text-xl font-bold text-slate-400">Bu klasör boş.</h3>
                                <p className="text-slate-300 text-sm mt-1 font-medium">Henüz bir döküman eklenmemiş.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
