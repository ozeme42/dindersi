
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
    Plus, Search, Edit2, Trash2, Globe, Eye, EyeOff, 
    Loader2, MoreVertical, LayoutGrid, Tag, Settings2,
    ChevronRight, Save, X, Move, FolderPlus, Folder,
    ArrowLeft, Home, Clock, List, ArrowRight, FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { getExtraPages } from '@/app/teacher/extra-pages/actions';
import Link from 'next/link';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function ExtraPagesExplorer() {
    const [pages, setPages] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [currentCategory, setCurrentCategory] = useState<string | null>(null);

    const { toast } = useToast();

    // Cihaz tipine göre varsayılan görünümü ayarla
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
        } else {
            toast({ title: "Hata", description: res.error, variant: "destructive" });
        }
        setIsLoading(false);
    };

    useEffect(() => { fetchPages(); }, []);

    // Kategorileri hiyerarşik olarak hazırla
    const categories = useMemo(() => {
        const cats = new Set<string>();
        pages.forEach(p => {
            const cat = p.category || 'Genel';
            if (currentCategory) {
                if (cat.startsWith(currentCategory + '/')) {
                    const sub = cat.substring(currentCategory.length + 1).split('/')[0];
                    cats.add(sub);
                }
            } else {
                cats.add(cat.split('/')[0]);
            }
        });
        return Array.from(cats).sort();
    }, [pages, currentCategory]);

    const filteredPages = useMemo(() => {
        return pages.filter(p => {
            const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase());
            const cat = p.category || 'Genel';
            const matchesCategory = currentCategory 
                ? (cat === currentCategory || cat.startsWith(currentCategory + '/'))
                : true;
            return matchesSearch && matchesCategory;
        });
    }, [pages, searchTerm, currentCategory]);

    const handleCategoryClick = (cat: string) => {
        const newCat = currentCategory ? `${currentCategory}/${cat}` : cat;
        setCurrentCategory(newCat);
    };

    const goBackCategory = () => {
        if (!currentCategory) return;
        const parts = currentCategory.split('/');
        if (parts.length === 1) setCurrentCategory(null);
        else {
            parts.pop();
            setCurrentCategory(parts.join('/'));
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20 selection:bg-indigo-100">
            {/* Arka Plan */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-indigo-100/40 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-sky-100/40 rounded-full blur-[120px]" />
            </div>

            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200 shadow-sm">
                <div className="container mx-auto px-4 h-20 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-5">
                        <Link href="/" className="p-2 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">
                            <Home className="h-5 w-5 text-slate-600" />
                        </Link>
                        <div>
                            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight uppercase leading-none">Döküman Merkezi</h1>
                            <p className="text-[10px] md:text-xs font-bold text-indigo-600 uppercase tracking-widest mt-1">Ekstra Ders Materyalleri</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200">
                            <Button 
                                variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
                                size="icon" 
                                onClick={() => setViewMode('grid')}
                                className={cn("h-9 w-9 rounded-lg", viewMode === 'grid' && "bg-white shadow-sm")}
                            >
                                <LayoutGrid className="h-4 w-4" />
                            </Button>
                            <Button 
                                variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
                                size="icon" 
                                onClick={() => setViewMode('list')}
                                className={cn("h-9 w-9 rounded-lg", viewMode === 'list' && "bg-white shadow-sm")}
                            >
                                <List className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8 relative z-10 space-y-8">
                {/* Search & Breadcrumbs */}
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                    <div className="flex items-center flex-wrap gap-2 text-sm font-bold">
                        <button onClick={() => setCurrentCategory(null)} className="text-slate-400 hover:text-indigo-600 transition-colors uppercase tracking-wider">ROOT</button>
                        {currentCategory?.split('/').map((part, i, arr) => (
                            <React.Fragment key={i}>
                                <ChevronRight className="h-4 w-4 text-slate-300" />
                                <button 
                                    onClick={() => setCurrentCategory(arr.slice(0, i+1).join('/'))}
                                    className={cn(
                                        "uppercase tracking-wider transition-colors",
                                        i === arr.length - 1 ? "text-indigo-600" : "text-slate-400 hover:text-indigo-600"
                                    )}
                                >
                                    {part}
                                </button>
                            </React.Fragment>
                        ))}
                    </div>

                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input 
                            placeholder="Dökümanlarda ara..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 bg-white border-slate-200 rounded-2xl h-12 shadow-sm focus-visible:ring-indigo-500"
                        />
                    </div>
                </div>

                {/* Categories Grid */}
                {categories.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {currentCategory && (
                            <button onClick={goBackCategory} className="flex flex-col items-center justify-center p-6 rounded-[2rem] bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-xl transition-all group">
                                <div className="p-4 bg-slate-50 rounded-2xl mb-3 group-hover:scale-110 transition-transform">
                                    <ArrowLeft className="h-6 w-6 text-slate-400" />
                                </div>
                                <span className="text-xs font-black uppercase text-slate-500">Geri Dön</span>
                            </button>
                        )}
                        {categories.map(cat => (
                            <button key={cat} onClick={() => handleCategoryClick(cat)} className="flex flex-col items-center justify-center p-6 rounded-[2rem] bg-white border border-slate-200 hover:border-amber-300 hover:shadow-xl transition-all group">
                                <div className="p-4 bg-amber-50 rounded-2xl mb-3 group-hover:scale-110 transition-transform">
                                    <Folder className="h-8 w-8 text-amber-500 fill-amber-500/20" />
                                </div>
                                <span className="text-sm font-black uppercase text-slate-700 tracking-tight line-clamp-1">{cat}</span>
                            </button>
                        ))}
                    </div>
                )}

                {/* Content Area */}
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Dökümanlar Hazırlanıyor</p>
                    </div>
                ) : filteredPages.length > 0 ? (
                    <div className={cn(
                        viewMode === 'grid' 
                            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" 
                            : "flex flex-col gap-3"
                    )}>
                        {filteredPages.map((item) => (
                            <Link key={item.id} href={`/extra/${item.id}`} className="group">
                                {viewMode === 'grid' ? (
                                    <Card className="h-full flex flex-col rounded-[2.5rem] overflow-hidden border-slate-200 hover:shadow-2xl hover:border-indigo-300 transition-all duration-300 bg-white">
                                        <CardHeader className="pb-4">
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-600 group-hover:scale-110 transition-transform">
                                                    <FileText className="h-6 w-6" />
                                                </div>
                                                <Badge variant="outline" className="bg-slate-50 text-[9px] font-black uppercase tracking-wider">{item.category || 'Genel'}</Badge>
                                            </div>
                                            <CardTitle className="text-xl leading-tight uppercase font-black line-clamp-2 min-h-[3.5rem] group-hover:text-indigo-600 transition-colors">
                                                {item.title}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="flex-grow">
                                            <p className="text-sm text-slate-500 line-clamp-3 leading-relaxed">
                                                {item.description || "İnteraktif ders materyali ve interaktif konu dökümanı."}
                                            </p>
                                        </CardContent>
                                        <CardFooter className="pt-4 border-t border-slate-50 flex items-center justify-between">
                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                <Clock className="h-3 w-3" />
                                                {item.updatedAt ? format(new Date(item.updatedAt), 'dd.MM.yyyy', { locale: tr }) : 'Yeni'}
                                            </div>
                                            <div className="p-2 rounded-full bg-slate-50 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                                                <ArrowRight className="h-4 w-4" />
                                            </div>
                                        </CardFooter>
                                    </Card>
                                ) : (
                                    <div className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl hover:border-indigo-300 hover:shadow-lg transition-all group">
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
                                                <FileText className="h-5 w-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-bold text-slate-900 uppercase truncate">{item.title}</h3>
                                                <p className="text-xs text-slate-500 truncate">{item.category || 'Genel'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 shrink-0 pl-4">
                                            <div className="hidden sm:flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                <Clock className="h-3 w-3" />
                                                {item.updatedAt ? format(new Date(item.updatedAt), 'dd.MM.yyyy', { locale: tr }) : '-'}
                                            </div>
                                            <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                                        </div>
                                    </div>
                                )}
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-32 bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
                        <FileText className="h-20 w-20 text-slate-200 mx-auto mb-6" />
                        <h3 className="text-xl font-bold text-slate-400 uppercase tracking-widest">Döküman Bulunamadı</h3>
                        <p className="text-slate-400 mt-2">Arama kriterlerini değiştirerek tekrar deneyebilirsiniz.</p>
                    </div>
                )}
            </main>
        </div>
    );
}
