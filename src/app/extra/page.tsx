'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
    Plus, Search, Globe, Folder, FileText, ChevronRight, 
    ArrowLeft, Clock, Loader2, Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { getExtraPages } from '@/app/teacher/extra-pages/actions';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function ExtraPagesExplorer() {
    const [pages, setPages] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPath, setCurrentPath] = useState<string[]>([]); // Boş dizi ana dizindir
    
    const { toast } = useToast();

    useEffect(() => {
        const fetchPages = async () => {
            setIsLoading(true);
            const res = await getExtraPages(true); // Sadece yayınlanmışlar
            if (res.success) {
                setPages(res.data || []);
            } else {
                toast({ title: "Hata", description: res.error, variant: "destructive" });
            }
            setIsLoading(false);
        };
        fetchPages();
    }, [toast]);

    const currentPathStr = currentPath.join('/');

    // Mevcut dizindeki klasörleri ve dosyaları ayır
    const { folders, files } = useMemo(() => {
        const foldersSet = new Set<string>();
        const filteredFiles: any[] = [];
        
        pages.forEach(page => {
            const cat = page.category || 'Genel';
            const catParts = cat.split('/');
            
            // Yolun eşleşip eşleşmediğini kontrol et
            const isMatch = currentPath.every((part, i) => catParts[i] === part);
            
            if (isMatch) {
                if (catParts.length > currentPath.length) {
                    // Bu bir alt klasör
                    foldersSet.add(catParts[currentPath.length]);
                } else {
                    // Bu seviyedeki bir dosya
                    if (!searchTerm || page.title.toLowerCase().includes(searchTerm.toLowerCase())) {
                        filteredFiles.push(page);
                    }
                }
            }
        });

        return { 
            folders: Array.from(foldersSet).sort(),
            files: filteredFiles.sort((a,b) => a.title.localeCompare(b.title, 'tr'))
        };
    }, [pages, currentPath, searchTerm]);

    const handleFolderClick = (folderName: string) => {
        setCurrentPath([...currentPath, folderName]);
        setSearchTerm("");
    };

    const handleBack = () => {
        if (currentPath.length > 0) {
            setCurrentPath(currentPath.slice(0, -1));
            setSearchTerm("");
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-indigo-100">
            {/* Arka Plan Süslemeleri */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-indigo-100/50 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-sky-100/50 rounded-full blur-[120px]" />
            </div>

            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200 shadow-sm">
                <div className="container mx-auto px-6 py-5 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-5 w-full md:w-auto">
                        <Link href="/">
                            <Button variant="ghost" size="icon" className="bg-slate-100 border border-slate-200 text-slate-600 rounded-2xl h-12 w-12 hover:bg-white hover:scale-105 transition-all">
                                <ArrowLeft className="h-6 w-6" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none uppercase">Dökümanlar</h1>
                            <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-[0.2em] mt-1.5">Bilgi ve Materyal Deposu</p>
                        </div>
                    </div>

                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input 
                            placeholder="Dökümanlarda ara..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 bg-slate-100 border-none rounded-2xl h-11 focus-visible:ring-indigo-500 shadow-inner"
                        />
                    </div>
                </div>
            </header>

            <main className="flex-1 container mx-auto px-6 py-8 relative z-10">
                
                {/* Navigasyon Barı */}
                <div className="mb-8 flex items-center gap-3 overflow-x-auto pb-2 no-scrollbar">
                    {currentPath.length > 0 && (
                        <Button onClick={handleBack} variant="outline" size="sm" className="rounded-xl border-slate-200 bg-white text-slate-600 font-bold px-4 h-10 shadow-sm shrink-0">
                            <ArrowLeft className="h-4 w-4 mr-2" /> Üst Dizine Dön
                        </Button>
                    )}
                    <div className="flex items-center gap-2 text-slate-400 font-bold text-sm bg-white/50 px-4 py-2 rounded-xl border border-slate-200">
                        <Folder className="h-4 w-4 text-amber-500 shrink-0" />
                        <span className="shrink-0">Ana Dizin</span>
                        {currentPath.map((part, i) => (
                            <React.Fragment key={i}>
                                <ChevronRight className="h-4 w-4 shrink-0" />
                                <span className="text-indigo-600 truncate">{part}</span>
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-32 gap-4">
                        <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Dosya Sistemi Yükleniyor...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in duration-500">
                        
                        {/* Klasörler */}
                        {folders.map(folder => (
                            <button 
                                key={folder}
                                onClick={() => handleFolderClick(folder)}
                                className="group flex flex-col items-center justify-center p-8 bg-white border-2 border-slate-200 rounded-[2.5rem] hover:border-amber-400 hover:bg-amber-50/30 transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-1 relative"
                            >
                                <div className="p-5 bg-amber-100 rounded-3xl mb-4 group-hover:scale-110 transition-transform shadow-inner">
                                    <Folder className="h-10 w-10 text-amber-500 fill-amber-500/20" />
                                </div>
                                <span className="font-black text-slate-700 uppercase tracking-tight line-clamp-1">{folder}</span>
                                <div className="absolute top-4 right-6 text-[10px] font-black text-slate-300 group-hover:text-amber-400 transition-colors uppercase tracking-widest">Klasör</div>
                            </button>
                        ))}

                        {/* Dosyalar */}
                        {files.map(page => (
                            <Link key={page.id} href={`/extra/${page.id}`} className="group h-full">
                                <Card className="h-full border-2 border-slate-200 rounded-[2.5rem] hover:border-indigo-400 hover:bg-indigo-50/30 transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-1 overflow-hidden flex flex-col">
                                    <CardHeader className="pb-4 shrink-0">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="p-3 bg-indigo-100 rounded-2xl group-hover:scale-110 transition-transform shadow-inner">
                                                <FileText className="h-6 w-6 text-indigo-600" />
                                            </div>
                                            <Badge variant="outline" className="bg-white border-slate-200 text-slate-400 text-[9px] font-bold py-0.5 px-2">DOSYA</Badge>
                                        </div>
                                        <CardTitle className="text-lg font-black text-slate-800 leading-tight uppercase line-clamp-2">
                                            {page.title}
                                        </CardTitle>
                                        <CardDescription className="text-[11px] font-medium text-slate-400 flex items-center gap-1 mt-1 uppercase">
                                            <Clock className="h-3 w-3" /> {page.updatedAt ? new Date(page.updatedAt).toLocaleDateString('tr-TR') : 'YENİ'}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex-1">
                                        <p className="text-sm text-slate-500 line-clamp-3 font-medium leading-relaxed italic">
                                            {page.description || "Döküman içeriğini görüntülemek için tıklayın."}
                                        </p>
                                    </CardContent>
                                    <CardFooter className="pt-4 border-t border-slate-50 bg-slate-50/30 flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                            <Calendar className="h-3.5 w-3.5" />
                                            {page.createdAt ? new Date(page.createdAt).toLocaleDateString('tr-TR') : 'YENİ'}
                                        </div>
                                        <div className="h-8 w-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                                            <ChevronRight className="h-4 w-4" />
                                        </div>
                                    </CardFooter>
                                </Card>
                            </Link>
                        ))}

                        {/* Boş Klasör Durumu */}
                        {folders.length === 0 && files.length === 0 && (
                            <div className="col-span-full py-24 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
                                <div className="p-6 bg-slate-50 rounded-full inline-block mb-4">
                                    <Globe className="h-16 w-16 text-slate-200" />
                                </div>
                                <h3 className="text-xl font-black text-slate-400 uppercase tracking-tight">Bu klasör henüz boş</h3>
                                <p className="text-slate-300 font-medium text-sm mt-1">Geri dönerek diğer dökümanlara bakabilirsiniz.</p>
                                <Button onClick={handleBack} variant="outline" className="mt-8 rounded-2xl border-slate-200 text-slate-500 hover:bg-slate-50 h-12 px-8 font-bold">
                                    <ArrowLeft className="mr-2 h-4 w-4" /> Geri Dön
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </main>
            
            <footer className="shrink-0 p-8 text-center border-t border-slate-200 bg-white/50 backdrop-blur-md">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em]">Din Dersi Atölyesi Arşiv Sistemi</p>
            </footer>
        </div>
    );
}
