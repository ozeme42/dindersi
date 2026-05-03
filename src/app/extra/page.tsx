'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
    Plus, Search, Globe, ChevronRight, LayoutGrid, List, 
    Home, Settings, ArrowRight, Loader2, Clock, Folder,
    FileText, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getExtraPages } from '@/app/teacher/extra-pages/actions';
import Link from 'next/link';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function ExtraPagesExplorer() {
    const [pages, setPages] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPath, setCurrentPath] = useState<string[]>([]);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    // Cihaz algılama ve varsayılan görünüm
    useEffect(() => {
        if (window.innerWidth < 768) {
            setViewMode('list');
        }
    }, []);

    const fetchPages = async () => {
        setIsLoading(true);
        const res = await getExtraPages(true); // Sadece yayınlananları getir
        if (res.success) {
            setPages(res.data || []);
        }
        setIsLoading(false);
    };

    useEffect(() => { fetchPages(); }, []);

    // Kategorileri işle
    const categories = useMemo(() => {
        const fullPath = currentPath.join('/');
        const items = new Set<string>();
        const docs: any[] = [];

        pages.forEach(p => {
            const cat = p.category || 'Genel';
            if (fullPath === "" || cat === fullPath || cat.startsWith(fullPath + '/')) {
                const relativePath = fullPath === "" ? cat : cat.substring(fullPath.length + 1);
                const parts = relativePath.split('/');
                
                if (parts[0] !== "" && parts.length > 1) {
                    items.add(parts[0]);
                } else if (parts[0] === "" || parts.length === 1) {
                    // Bu seviyedeki dökümanlar
                    if (cat === fullPath || (fullPath === "" && cat === "Genel")) {
                        docs.push(p);
                    } else if (fullPath === "" && cat !== "Genel") {
                        items.add(parts[0]);
                    }
                }
            }
        });

        return { folders: Array.from(items).sort(), documents: docs };
    }, [pages, currentPath]);

    const filteredDocs = categories.documents.filter(d => 
        d.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const navigateTo = (folder: string) => {
        setCurrentPath([...currentPath, folder]);
    };

    const goBack = (index: number) => {
        setCurrentPath(currentPath.slice(0, index + 1));
    };

    const resetPath = () => setCurrentPath([]);

    return (
        <div className="min-h-screen bg-slate-50 font-sans selection:bg-indigo-100">
            {/* Arka Plan Efektleri */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-indigo-50/40 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-sky-50/40 rounded-full blur-[100px]" />
            </div>

            <main className="container mx-auto p-4 md:p-8 space-y-8 relative z-10 pb-24">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/60 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white shadow-xl shadow-indigo-900/5">
                    <div className="flex items-center gap-5">
                        <div className="p-3 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl text-white shadow-lg shadow-indigo-200">
                            <Globe className="h-7 w-7" />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight uppercase">Döküman Merkezi</h1>
                            <p className="text-slate-500 text-sm font-medium">Rehberlik, dökümanlar ve yardımcı materyaller.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="bg-slate-100 p-1 rounded-xl flex gap-1 border border-slate-200">
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setViewMode('grid')}
                                className={cn("rounded-lg h-9 px-3", viewMode === 'grid' ? "bg-white shadow-sm text-indigo-600" : "text-slate-500")}
                            >
                                <LayoutGrid className="h-4 w-4" />
                            </Button>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setViewMode('list')}
                                className={cn("rounded-lg h-9 px-3", viewMode === 'list' ? "bg-white shadow-sm text-indigo-600" : "text-slate-500")}
                            >
                                <List className="h-4 w-4" />
                            </Button>
                        </div>
                        <Button asChild variant="outline" className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 gap-2 h-11 px-5">
                            <Link href="/teacher/extra-pages"><Settings className="h-4 w-4" /> Yönet</Link>
                        </Button>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="flex flex-col md:flex-row items-center gap-4 bg-white/60 backdrop-blur-xl p-4 rounded-3xl border border-white shadow-sm">
                    <nav className="flex items-center flex-1 overflow-x-auto no-scrollbar py-1">
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-500 whitespace-nowrap">
                            <button 
                                onClick={resetPath}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all",
                                    currentPath.length === 0 ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "hover:bg-slate-100"
                                )}
                            >
                                <Home className="h-4 w-4" /> Ana Dizin
                            </button>
                            {currentPath.map((folder, i) => (
                                <React.Fragment key={i}>
                                    <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />
                                    <button 
                                        onClick={() => goBack(i)}
                                        className={cn(
                                            "px-3 py-2 rounded-xl transition-all",
                                            i === currentPath.length - 1 ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "hover:bg-slate-100"
                                        )}
                                    >
                                        {folder}
                                    </button>
                                </React.Fragment>
                            ))}
                        </div>
                    </nav>
                    <div className="relative w-full md:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input 
                            placeholder="Dosya ara..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 bg-white border-slate-200 rounded-xl focus-visible:ring-indigo-500 h-11"
                        />
                    </div>
                </div>

                {/* Content Grid/List */}
                {isLoading ? (
                    <div className="flex justify-center py-32"><Loader2 className="h-12 w-12 animate-spin text-indigo-500" /></div>
                ) : (
                    <div className={cn(
                        viewMode === 'grid' 
                            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" 
                            : "flex flex-col gap-3"
                    )}>
                        {/* Folders */}
                        {categories.folders.map(folder => (
                            <button 
                                key={folder}
                                onClick={() => navigateTo(folder)}
                                className={cn(
                                    "group transition-all text-left",
                                    viewMode === 'grid' ? "h-full" : "w-full"
                                )}
                            >
                                <Card className={cn(
                                    "border-slate-200 bg-white hover:border-indigo-300 hover:shadow-xl hover:-translate-y-1 transition-all duration-300",
                                    viewMode === 'grid' ? "rounded-[2rem]" : "rounded-2xl"
                                )}>
                                    <CardHeader className={cn(viewMode === 'grid' ? "p-6" : "p-4 flex-row items-center gap-4 py-3")}>
                                        <div className={cn(
                                            "rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center transition-transform group-hover:scale-110",
                                            viewMode === 'grid' ? "w-14 h-14 mb-4" : "w-10 h-10"
                                        )}>
                                            <Folder className={cn(viewMode === 'grid' ? "h-7 w-7" : "h-5 w-5")} fill="currentColor" />
                                        </div>
                                        <div>
                                            <CardTitle className={cn(viewMode === 'grid' ? "text-xl font-black" : "text-base font-bold")}>{folder}</CardTitle>
                                            {viewMode === 'grid' && <CardDescription className="text-[10px] font-bold uppercase tracking-widest mt-1">Klasör</CardDescription>}
                                        </div>
                                        {viewMode === 'list' && <ChevronRight className="ml-auto h-5 w-5 text-slate-300 group-hover:text-amber-500" />}
                                    </CardHeader>
                                </Card>
                            </button>
                        ))}

                        {/* Documents */}
                        {filteredDocs.map(item => (
                            <Link 
                                key={item.id} 
                                href={`/extra/${item.id}`}
                                className={cn(
                                    "group transition-all",
                                    viewMode === 'grid' ? "h-full" : "w-full"
                                )}
                            >
                                <Card className={cn(
                                    "border-slate-200 bg-white hover:border-blue-300 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full overflow-hidden",
                                    viewMode === 'grid' ? "rounded-[2rem]" : "rounded-2xl"
                                )}>
                                    <CardHeader className={cn(viewMode === 'grid' ? "p-6" : "p-4 flex-row items-center gap-4 py-3")}>
                                        <div className={cn(
                                            "rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center transition-transform group-hover:rotate-6",
                                            viewMode === 'grid' ? "w-14 h-14 mb-4" : "w-10 h-10"
                                        )}>
                                            <FileText className={cn(viewMode === 'grid' ? "h-7 w-7" : "h-5 w-5")} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <CardTitle className={cn(viewMode === 'grid' ? "text-xl font-black" : "text-base font-bold", "truncate")}>
                                                {item.title}
                                            </CardTitle>
                                            {viewMode === 'grid' && (
                                                <div className="flex items-center gap-2 mt-2">
                                                    <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-100 text-[9px] font-black uppercase">{item.category || 'Genel'}</Badge>
                                                </div>
                                            )}
                                        </div>
                                    </CardHeader>
                                    
                                    {viewMode === 'grid' ? (
                                        <>
                                            <CardContent className="px-6 pb-4">
                                                <p className="text-slate-500 text-sm line-clamp-2 min-h-[2.5rem]">
                                                    {item.description || "Döküman içeriğini görüntülemek için tıklayın."}
                                                </p>
                                            </CardContent>
                                            <CardFooter className="px-6 pb-6 pt-0 mt-auto flex items-center justify-between">
                                                <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase">
                                                    <Clock className="h-3 w-3" />
                                                    {item.updatedAt ? format(new Date(item.updatedAt), 'dd.MM.yyyy', { locale: tr }) : '-'}
                                                </div>
                                                <div className="bg-slate-900 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <ArrowRight className="h-4 w-4" />
                                                </div>
                                            </CardFooter>
                                        </>
                                    ) : (
                                        <div className="flex items-center gap-4 ml-auto pr-4 shrink-0">
                                             <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase">
                                                <Clock className="h-3 w-3" />
                                                {item.updatedAt ? format(new Date(item.updatedAt), 'dd.MM.yyyy', { locale: tr }) : '-'}
                                            </div>
                                            <div className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                                <ChevronRight className="h-5 w-5" />
                                            </div>
                                        </div>
                                    )}
                                </Card>
                            </Link>
                        ))}

                        {categories.folders.length === 0 && categories.documents.length === 0 && (
                            <div className="col-span-full py-32 text-center bg-white/40 rounded-[3rem] border-2 border-dashed border-slate-200">
                                <Sparkles className="h-16 w-16 text-slate-200 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-slate-400">Bu klasör henüz boş.</h3>
                                <p className="text-slate-400 text-sm mt-1">Geri dönmek için yol göstericiyi kullanabilirsiniz.</p>
                            </div>
                        )}
                    </div>
                )}
            </main>
            
            {/* Footer */}
            <footer className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-slate-200 py-3 z-30">
                <div className="container mx-auto px-6 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                    <span>Din Dersi Atölyesi</span>
                    <span className="hidden sm:inline">DÖKÜMAN MERKEZİ • V2.0</span>
                    <span>© {new Date().getFullYear()}</span>
                </div>
            </footer>
        </div>
    );
}
