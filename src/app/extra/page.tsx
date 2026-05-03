
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
    Plus, Search, Globe, Eye, Loader2, LayoutGrid, List,
    ChevronRight, ArrowRight, Home, Settings, Clock, Folder,
    ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
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

    // Cihaza göre varsayılan görünüm modu (Mobil = Liste, Masaüstü = Izgara)
    useEffect(() => {
        if (typeof window !== 'undefined') {
            if (window.innerWidth < 768) {
                setViewMode('list');
            }
        }
    }, []);

    const fetchPages = async () => {
        setIsLoading(true);
        // Sadece yayınlanmış sayfaları getir
        const res = await getExtraPages(true);
        if (res.success) {
            setPages(res.data || []);
        } else {
            toast({ title: "Hata", description: res.error, variant: "destructive" });
        }
        setIsLoading(false);
    };

    useEffect(() => { fetchPages(); }, []);

    // Hiyerarşik klasör yapısını bellekte oluştur
    const folderStructure = useMemo(() => {
        const structure: any = { files: [] };
        
        pages.forEach(page => {
            const pathParts = (page.category || 'Genel').split('/');
            let current = structure;
            
            pathParts.forEach(part => {
                if (!current[part]) {
                    current[part] = { files: [] };
                }
                current = current[part];
            });
            
            current.files.push(page);
        });
        
        return structure;
    }, [pages]);

    // Aktif dizindeki içerik
    const currentDirectory = useMemo(() => {
        let current = folderStructure;
        for (const part of currentPath) {
            if (current[part]) {
                current = current[part];
            } else {
                return { folders: [], files: [] };
            }
        }
        
        const folders = Object.keys(current).filter(key => key !== 'files');
        const files = current.files || [];
        
        return { folders, files };
    }, [folderStructure, currentPath]);

    const navigateToFolder = (folderName: string) => {
        setCurrentPath([...currentPath, folderName]);
    };

    const navigateBack = (index: number) => {
        setCurrentPath(currentPath.slice(0, index + 1));
    };

    const goToRoot = () => setCurrentPath([]);

    const filteredContent = useMemo(() => {
        const { folders, files } = currentDirectory;
        
        if (!searchTerm) return { folders, files };
        
        const lowerTerm = searchTerm.toLowerCase();
        // Arama yapıldığında tüm dökümanlarda ara (klasör kısıtlaması olmadan)
        const matchedFiles = pages.filter(p => 
            p.title.toLowerCase().includes(lowerTerm) || 
            p.category?.toLowerCase().includes(lowerTerm)
        );
        
        return { folders: [], files: matchedFiles };
    }, [currentDirectory, searchTerm, pages]);

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20 selection:bg-indigo-100">
            
            {/* Arka Plan Efektleri */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-indigo-100/40 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-sky-100/40 rounded-full blur-[120px]" />
            </div>

            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200">
                <div className="container mx-auto px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="p-3 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl text-white shadow-lg shadow-indigo-200">
                            <Globe className="h-7 w-7" />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight uppercase">Döküman Merkezi</h1>
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-0.5">Ekstra Materyaller ve Rehberler</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input 
                                placeholder="Dosya ara..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 bg-slate-100 border-none rounded-xl focus-visible:ring-indigo-500 h-11"
                            />
                        </div>
                        
                        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                            <Button 
                                variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
                                size="icon" 
                                onClick={() => setViewMode('grid')}
                                className={cn("h-9 w-9 rounded-lg transition-all", viewMode === 'grid' ? "bg-white shadow-sm text-indigo-600" : "text-slate-400")}
                            >
                                <LayoutGrid className="h-5 w-5" />
                            </Button>
                            <Button 
                                variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
                                size="icon" 
                                onClick={() => setViewMode('list')}
                                className={cn("h-9 w-9 rounded-lg transition-all", viewMode === 'list' ? "bg-white shadow-sm text-indigo-600" : "text-slate-400")}
                            >
                                <List className="h-5 w-5" />
                            </Button>
                        </div>

                        <Button asChild variant="outline" className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 gap-2 h-11 px-5">
                            <Link href="/teacher/extra-pages"><Settings className="h-4 w-4" /> Yönet</Link>
                        </Button>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-6 py-8 relative z-10 space-y-8">
                
                {/* Yol Gösterici (Breadcrumb) */}
                {!searchTerm && (
                    <nav className="flex items-center gap-2 text-sm font-bold text-slate-500 overflow-x-auto pb-2 no-scrollbar">
                        <button 
                            onClick={goToRoot}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-xl transition-all",
                                currentPath.length === 0 ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "hover:bg-white hover:text-indigo-600"
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
                                        "px-4 py-2 rounded-xl transition-all whitespace-nowrap",
                                        i === currentPath.length - 1 ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "hover:bg-white hover:text-indigo-600"
                                    )}
                                >
                                    {folder}
                                </button>
                            </React.Fragment>
                        ))}
                    </nav>
                )}

                {isLoading ? (
                    <div className="flex justify-center py-32"><Loader2 className="h-12 w-12 animate-spin text-indigo-500" /></div>
                ) : (
                    <div className="space-y-8">
                        
                        {/* Klasörler */}
                        {filteredContent.folders.length > 0 && (
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                {filteredContent.folders.map(folder => (
                                    <button 
                                        key={folder}
                                        onClick={() => navigateToFolder(folder)}
                                        className="group flex flex-col items-center justify-center p-6 bg-white border border-slate-200 rounded-[2rem] hover:border-indigo-400 hover:shadow-xl transition-all"
                                    >
                                        <div className="p-4 bg-amber-50 rounded-2xl text-amber-500 group-hover:scale-110 transition-transform mb-3">
                                            <Folder className="h-8 w-8 fill-current" />
                                        </div>
                                        <span className="font-bold text-slate-700 text-sm truncate w-full text-center">{folder}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Dosyalar (Izgara veya Liste) */}
                        <div className="space-y-4">
                            {filteredContent.files.length > 0 ? (
                                viewMode === 'grid' ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                        {filteredContent.files.map((item) => (
                                            <Link key={item.id} href={`/extra/${item.id}`}>
                                                <Card className="group h-full overflow-hidden rounded-[2rem] border-slate-200 hover:shadow-2xl hover:border-indigo-400 transition-all duration-300 flex flex-col bg-white">
                                                    <CardHeader className="pb-4">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <Badge variant="outline" className="bg-indigo-50 text-indigo-600 border-indigo-100 text-[10px] font-black uppercase">DÖKÜMAN</Badge>
                                                        </div>
                                                        <CardTitle className="text-xl line-clamp-2 group-hover:text-indigo-600 transition-colors leading-tight">
                                                            {item.title}
                                                        </CardTitle>
                                                    </CardHeader>
                                                    <CardContent className="flex-grow">
                                                        <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">
                                                            {item.description || "Döküman içeriğini görüntülemek için tıklayın."}
                                                        </p>
                                                    </CardContent>
                                                    <CardFooter className="pt-4 border-t border-slate-50 flex items-center justify-between">
                                                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                                                            <Clock className="h-3 w-3" />
                                                            {item.updatedAt ? format(new Date(item.updatedAt), 'dd.MM.yyyy', { locale: tr }) : '-'}
                                                        </div>
                                                        <div className="bg-slate-900 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <ArrowRight className="h-4 w-4" />
                                                        </div>
                                                    </CardFooter>
                                                </Card>
                                            </Link>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {filteredContent.files.map((item) => (
                                            <Link key={item.id} href={`/extra/${item.id}`} className="block">
                                                <div className="group flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl hover:border-indigo-400 hover:shadow-lg transition-all">
                                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                                        <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600 group-hover:scale-110 transition-transform shrink-0">
                                                            <FileText className="h-6 w-6" />
                                                        </div>
                                                        <div className="truncate">
                                                            <h3 className="font-bold text-slate-800 text-lg group-hover:text-indigo-600 transition-colors truncate">{item.title}</h3>
                                                            <div className="flex items-center gap-3 mt-0.5">
                                                                <span className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1">
                                                                    <Folder className="h-3 w-3" /> {item.category || 'Genel'}
                                                                </span>
                                                                <span className="text-[10px] font-bold text-slate-300">|</span>
                                                                <span className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1">
                                                                    <Clock className="h-3 w-3" /> {item.updatedAt ? format(new Date(item.updatedAt), 'dd.MM.yyyy', { locale: tr }) : '-'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="bg-slate-900 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all ml-4">
                                                        <ArrowRight className="h-3.5 w-3.5" />
                                                    </div>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                )
                            ) : (
                                <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
                                    <Globe className="h-16 w-16 text-slate-200 mx-auto mb-4" />
                                    <h3 className="text-xl font-bold text-slate-400">Bu klasörde döküman bulunamadı.</h3>
                                    <p className="text-slate-400 mt-2">Daha sonra tekrar kontrol ediniz.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

function FileText(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <line x1="10" y1="9" x2="8" y2="9" />
        </svg>
    )
}
