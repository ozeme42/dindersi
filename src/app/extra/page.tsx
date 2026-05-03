'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
    Loader2, Search, ArrowLeft, Folder, FileText, 
    ChevronRight, Clock, Globe, LayoutGrid, FolderOpen 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getExtraPages } from '@/app/teacher/extra-pages/actions';
import Link from 'next/link';

export default function ExtraPagesExplorer() {
    const [pages, setPages] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPath, setCurrentPath] = useState<string[]>([]); // Klasör hiyerarşisi

    const fetchPages = async () => {
        setIsLoading(true);
        const res = await getExtraPages(true); // Sadece yayınlanmış olanları getir
        if (res.success) {
            setPages(res.data || []);
        }
        setIsLoading(false);
    };

    useEffect(() => { fetchPages(); }, []);

    // Mevcut klasör yolunu string olarak al
    const currentPathStr = currentPath.join('/');

    // Mevcut seviyedeki öğeleri filtrele
    const currentLevelItems = useMemo(() => {
        // Eğer arama yapılıyorsa hiyerarşiyi boşverip her şeyi göster
        if (searchTerm) {
            return {
                folders: [] as string[],
                files: pages.filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase()))
            };
        }

        const folders = new Set<string>();
        const files: any[] = [];

        pages.forEach(page => {
            const cat = page.category || 'Genel';
            
            // Eğer dosya tam olarak bu klasördeyse
            if (cat === currentPathStr || (currentPath.length === 0 && cat === 'Genel')) {
                files.push(page);
            } 
            // Eğer dosya bir alt klasördeyse
            else if (currentPath.length === 0) {
                // Ana dizindeyiz, ilk parçayı klasör olarak al
                folders.add(cat.split('/')[0]);
            }
            else if (cat.startsWith(currentPathStr + '/')) {
                // Mevcut yolun bir altındaki parçayı klasör olarak al
                const relativePath = cat.substring(currentPathStr.length + 1);
                folders.add(relativePath.split('/')[0]);
            }
        });

        return {
            folders: Array.from(folders).sort(),
            files: files.sort((a, b) => a.title.localeCompare(b.title, 'tr'))
        };
    }, [pages, currentPath, currentPathStr, searchTerm]);

    const enterFolder = (folderName: string) => {
        setCurrentPath([...currentPath, folderName]);
        setSearchTerm("");
    };

    const goBack = () => {
        setCurrentPath(currentPath.slice(0, -1));
    };

    const goToPath = (index: number) => {
        setCurrentPath(currentPath.slice(0, index + 1));
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
            {/* Arka Plan */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-indigo-100/40 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-sky-100/40 rounded-full blur-[120px]" />
            </div>

            <div className="container mx-auto p-4 md:p-8 relative z-10 space-y-8">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/80 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white shadow-xl shadow-slate-200/50">
                    <div className="flex items-center gap-6">
                        <div className="p-4 bg-indigo-600 rounded-3xl shadow-lg shadow-indigo-200">
                            <Globe className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Döküman Merkezi</h1>
                            <p className="text-slate-500 font-medium">Rehberlik, materyaller ve özel içerikler.</p>
                        </div>
                    </div>
                    <Link href="/">
                        <Button variant="outline" className="rounded-2xl border-slate-200 bg-white hover:bg-slate-50 h-12 px-6 gap-2">
                            <ArrowLeft className="h-4 w-4" /> Ana Sayfa
                        </Button>
                    </Link>
                </div>

                {/* Navigasyon & Arama */}
                <div className="flex flex-col md:flex-row items-center gap-4 bg-white/60 backdrop-blur-md p-4 rounded-3xl border border-white shadow-sm">
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar flex-1 px-2">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setCurrentPath([])}
                            className={cn("rounded-xl font-bold uppercase tracking-wider text-xs", currentPath.length === 0 ? "bg-indigo-600 text-white" : "text-slate-500")}
                        >
                            DOSYALARIM
                        </Button>
                        {currentPath.map((part, i) => (
                            <React.Fragment key={i}>
                                <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => goToPath(i)}
                                    className={cn("rounded-xl font-bold uppercase tracking-wider text-xs", i === currentPath.length - 1 ? "bg-indigo-600 text-white" : "text-slate-500")}
                                >
                                    {part}
                                </Button>
                            </React.Fragment>
                        ))}
                    </div>
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input 
                            placeholder="Dosya ara..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 bg-white border-slate-200 rounded-2xl h-11 focus-visible:ring-indigo-500 shadow-sm"
                        />
                    </div>
                </div>

                {/* İçerik Alanı */}
                {isLoading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
                    </div>
                ) : (currentLevelItems.folders.length > 0 || currentLevelItems.files.length > 0) ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                        
                        {/* Geri Dön Klasörü */}
                        {currentPath.length > 0 && !searchTerm && (
                            <button 
                                onClick={goBack}
                                className="group flex flex-col items-center justify-center p-6 rounded-[2rem] bg-white/40 border border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/50 transition-all"
                            >
                                <div className="p-4 bg-slate-100 rounded-2xl mb-3 group-hover:bg-indigo-100 transition-colors">
                                    <ArrowLeft className="h-8 w-8 text-slate-400 group-hover:text-indigo-600" />
                                </div>
                                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">ÜST DİZİN</span>
                            </button>
                        )}

                        {/* Klasörler */}
                        {currentLevelItems.folders.map(folder => (
                            <button 
                                key={folder}
                                onClick={() => enterFolder(folder)}
                                className="group flex flex-col items-center text-center p-6 rounded-[2rem] bg-white border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all"
                            >
                                <div className="relative mb-4">
                                    <div className="absolute inset-0 bg-amber-500/20 blur-xl rounded-full scale-0 group-hover:scale-100 transition-transform" />
                                    <Folder className="h-20 w-20 text-amber-500 fill-amber-400/20 group-hover:fill-amber-400 transition-all relative z-10" />
                                </div>
                                <span className="text-sm font-black text-slate-700 uppercase tracking-tight line-clamp-1">{folder}</span>
                                <span className="text-[10px] font-bold text-slate-400 mt-1">KLASÖR</span>
                            </button>
                        ))}

                        {/* Dosyalar */}
                        {currentLevelItems.files.map(page => (
                            <Link href={`/extra/${page.id}`} key={page.id} className="group">
                                <Card className="h-full rounded-[2rem] border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden bg-white">
                                    <CardHeader className="pb-4">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                                <FileText className="h-6 w-6" />
                                            </div>
                                            {page.isPublished === false && <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-none">Taslak</Badge>}
                                        </div>
                                        <CardTitle className="text-lg font-bold text-slate-800 line-clamp-2 leading-tight group-hover:text-indigo-600 transition-colors">
                                            {page.title}
                                        </CardTitle>
                                        <CardDescription className="text-[11px] font-bold text-slate-400 flex items-center gap-1 mt-2 uppercase tracking-widest">
                                            <Clock className="h-3 w-3" /> {page.updatedAt ? new Date(page.updatedAt).toLocaleDateString('tr-TR') : 'YENİ'}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                                            {page.description || "Döküman içeriğini görüntülemek için tıklayın."}
                                        </p>
                                    </CardContent>
                                    <CardFooter className="pt-4 border-t border-slate-50 bg-slate-50/30 flex items-center justify-between">
                                        <span className="text-[10px] font-black text-indigo-600 uppercase tracking-tighter">İncele</span>
                                        <ChevronRight className="h-4 w-4 text-slate-300 group-hover:translate-x-1 transition-transform" />
                                    </CardFooter>
                                </Card>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-32 bg-white/40 rounded-[3rem] border-2 border-dashed border-slate-200">
                        <FolderOpen className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-slate-400">Burada henüz dosya yok.</h3>
                        <p className="text-sm text-slate-400 mt-1">Bu klasör henüz bir döküman içermiyor.</p>
                        {currentPath.length > 0 && (
                            <Button variant="link" onClick={goBack} className="mt-4 text-indigo-600 font-bold">Geri Dön</Button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}