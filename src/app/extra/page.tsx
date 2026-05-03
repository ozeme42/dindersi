
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
    Plus, Search, Globe, Eye, Loader2, LayoutGrid, List, 
    ChevronRight, Folder, FileText, Settings, Home, Clock,
    ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { getExtraPages } from '@/app/teacher/extra-pages/actions';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function ExtraPagesGallery() {
    const [pages, setPages] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [currentPath, setCurrentPath] = useState<string[]>([]);
    
    const { toast } = useToast();

    // Cihaz algılama ve varsayılan görünüm
    useEffect(() => {
        if (window.innerWidth < 768) {
            setViewMode('list');
        }
    }, []);

    const fetchPages = async () => {
        setIsLoading(true);
        // Sadece yayınlanmış sayfaları getir (Ancak eski verilerde isPublished alanı olmayabilir)
        // Bu yüzden tüm verileri çekip bellekte güvenli filtreleme yapıyoruz
        const res = await getExtraPages();
        if (res.success) {
            // isPublished alanı false olanları hariç tut, undefined olanları yayında say
            const visiblePages = (res.data || []).filter((p: any) => p.isPublished !== false);
            setPages(visiblePages);
        } else {
            toast({ title: "Hata", description: res.error, variant: "destructive" });
        }
        setIsLoading(false);
    };

    useEffect(() => { fetchPages(); }, []);

    // Mevcut yoldaki klasörleri ve dosyaları ayır
    const explorerData = useMemo(() => {
        const pathStr = currentPath.join('/');
        const folders = new Set<string>();
        const items: any[] = [];

        pages.forEach(page => {
            const cat = page.category || 'Genel';
            
            // Eğer döküman tam olarak bu klasördeyse
            if (cat === pathStr || (pathStr === "" && cat === "Genel")) {
                items.push(page);
            } 
            // Eğer döküman bu klasörün bir alt klasöründeyse
            else if (pathStr === "" && cat !== "Genel") {
                folders.add(cat.split('/')[0]);
            }
            else if (cat.startsWith(pathStr + '/')) {
                const subPath = cat.substring(pathStr.length + 1);
                folders.add(subPath.split('/')[0]);
            }
        });

        return {
            folders: Array.from(folders).sort(),
            items: items.filter(item => 
                item.title.toLowerCase().includes(searchTerm.toLowerCase())
            )
        };
    }, [pages, currentPath, searchTerm]);

    const navigateToFolder = (folderName: string) => {
        setCurrentPath([...currentPath, folderName]);
        setSearchTerm("");
    };

    const navigateBack = (index: number) => {
        setCurrentPath(currentPath.slice(0, index + 1));
    };

    const resetPath = () => setCurrentPath([]);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 selection:bg-indigo-100">
            {/* Arkaplan Işıkları */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-indigo-100/50 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-sky-100/50 rounded-full blur-[120px]" />
            </div>

            <main className="container mx-auto p-4 md:p-8 space-y-6 relative z-10 flex-grow pb-24">
                
                {/* Üst Bar */}
                <div className="bg-white/80 backdrop-blur-xl border border-slate-200 p-6 rounded-[2.5rem] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-200">
                            <Globe className="h-7 w-7" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tighter text-slate-900">DÖKÜMAN MERKEZİ</h1>
                            <p className="text-slate-500 text-sm font-medium">Yardımcı kaynaklar, rehberlik ve materyaller.</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="bg-slate-100 p-1 rounded-xl flex gap-1 border border-slate-200">
                            <Button 
                                variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
                                size="icon" 
                                onClick={() => setViewMode('grid')}
                                className={cn("h-9 w-9 rounded-lg", viewMode === 'grid' ? "bg-white shadow-sm text-indigo-600" : "text-slate-400")}
                            >
                                <LayoutGrid className="h-4 w-4" />
                            </Button>
                            <Button 
                                variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
                                size="icon" 
                                onClick={() => setViewMode('list')}
                                className={cn("h-9 w-9 rounded-lg", viewMode === 'list' ? "bg-white shadow-sm text-indigo-600" : "text-slate-400")}
                            >
                                <List className="h-4 w-4" />
                            </Button>
                        </div>
                        <Button asChild variant="outline" className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 gap-2 h-11 px-5">
                            <Link href="/teacher/extra-pages"><Settings className="h-4 w-4" /> Yönet</Link>
                        </Button>
                    </div>
                </div>

                {/* Navigasyon & Arama */}
                <div className="flex flex-col md:flex-row gap-4 items-center">
                    <div className="w-full md:flex-1 bg-white border border-slate-200 rounded-2xl p-2 flex items-center gap-2 shadow-sm">
                        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar px-2 min-w-0">
                            <button 
                                onClick={resetPath}
                                className={cn(
                                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors whitespace-nowrap",
                                    currentPath.length === 0 ? "bg-indigo-50 text-indigo-700" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
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
                                            "px-3 py-1.5 rounded-lg text-sm font-bold transition-colors whitespace-nowrap",
                                            i === currentPath.length - 1 ? "bg-indigo-50 text-indigo-700" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                                        )}
                                    >
                                        {folder}
                                    </button>
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                    <div className="w-full md:w-80 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input 
                            placeholder="Dosya ara..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-11 bg-white border-slate-200 rounded-2xl h-12 focus-visible:ring-indigo-500"
                        />
                    </div>
                </div>

                {/* İÇERİK ALANI */}
                {isLoading ? (
                    <div className="flex justify-center py-24"><Loader2 className="h-12 w-12 animate-spin text-indigo-500" /></div>
                ) : (
                    <div className={cn(
                        viewMode === 'grid' 
                            ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6" 
                            : "flex flex-col gap-3"
                    )}>
                        {/* Klasörler */}
                        {explorerData.folders.map(folder => (
                            <button
                                key={folder}
                                onClick={() => navigateToFolder(folder)}
                                className={cn(
                                    "group transition-all duration-300 text-left",
                                    viewMode === 'grid' 
                                        ? "bg-white p-6 rounded-[2rem] border border-slate-200 hover:shadow-xl hover:-translate-y-1 flex flex-col items-center justify-center text-center gap-3" 
                                        : "bg-white p-4 rounded-2xl border border-slate-200 hover:border-indigo-300 flex items-center gap-4 hover:shadow-md"
                                )}
                            >
                                <div className={cn(
                                    "rounded-2xl bg-amber-50 text-amber-500 transition-transform group-hover:scale-110",
                                    viewMode === 'grid' ? "p-5" : "p-2"
                                )}>
                                    <Folder className={cn(viewMode === 'grid' ? "h-12 w-12" : "h-6 w-6")} fill="currentColor" fillOpacity={0.2} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="font-bold text-slate-800 truncate text-lg">{folder}</h3>
                                    <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mt-0.5">Klasör</p>
                                </div>
                                {viewMode === 'list' && <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-indigo-400" />}
                            </button>
                        ))}

                        {/* Dosyalar (Sayfalar) */}
                        {explorerData.items.map(page => (
                            <Link 
                                key={page.id} 
                                href={`/extra/${page.id}`}
                                className={cn(
                                    "group transition-all duration-300",
                                    viewMode === 'grid' 
                                        ? "bg-white p-6 rounded-[2rem] border border-slate-200 hover:shadow-xl hover:-translate-y-1 flex flex-col text-left" 
                                        : "bg-white p-4 rounded-2xl border border-slate-200 hover:border-indigo-300 flex items-center gap-4 hover:shadow-md"
                                )}
                            >
                                <div className={cn(
                                    "rounded-2xl bg-indigo-50 text-indigo-600 shrink-0",
                                    viewMode === 'grid' ? "p-3 w-fit mb-4" : "p-2"
                                )}>
                                    <FileText className={cn(viewMode === 'grid' ? "h-7 w-7" : "h-6 w-6")} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="font-bold text-slate-800 truncate group-hover:text-indigo-600 transition-colors leading-tight">
                                        {page.title}
                                    </h3>
                                    {viewMode === 'grid' && (
                                        <p className="text-xs text-slate-500 line-clamp-2 mt-2 leading-relaxed h-8">
                                            {page.description || "Döküman içeriğini görüntülemek için tıklayın."}
                                        </p>
                                    )}
                                    <div className="flex items-center gap-3 mt-3">
                                        <Badge variant="outline" className="text-[9px] uppercase font-black tracking-tighter bg-slate-50 text-slate-400 border-slate-100">
                                            SAYFA
                                        </Badge>
                                        {page.updatedAt && (
                                            <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                                                <Clock className="h-3 w-3" /> {new Date(page.updatedAt).toLocaleDateString('tr-TR')}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {viewMode === 'list' && (
                                    <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600 opacity-0 group-hover:opacity-100 transition-all">
                                        <ArrowRight className="h-5 w-5" />
                                    </div>
                                )}
                            </Link>
                        ))}

                        {explorerData.folders.length === 0 && explorerData.items.length === 0 && (
                            <div className="col-span-full py-32 flex flex-col items-center justify-center text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
                                <Search className="h-16 w-16 text-slate-200 mb-4" />
                                <h3 className="text-xl font-bold text-slate-400">Bu klasörde döküman bulunamadı.</h3>
                                {searchTerm && <Button variant="link" onClick={() => setSearchTerm("")}>Aramayı Temizle</Button>}
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="w-full py-8 border-t border-slate-200 bg-white/50 backdrop-blur-sm text-center">
                <p className="text-sm font-bold text-slate-400 tracking-widest uppercase">Din Dersi Atölyesi &bull; Dijital Kütüphane</p>
            </footer>
        </div>
    );
}
