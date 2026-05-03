
'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
    Folder, FileText, ChevronRight, Search, ArrowLeft, Loader2, Clock, Globe 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getExtraPages } from '@/app/teacher/extra-pages/actions';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function ExtraPagesGallery() {
    const [pages, setPages] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPath, setCurrentPath] = useState<string[]>([]); // Klasör hiyerarşisi

    useEffect(() => {
        const fetchPages = async () => {
            setIsLoading(true);
            const res = await getExtraPages(true); // Sadece yayınlanmış olanlar
            if (res.success) {
                setPages(res.data || []);
            }
            setIsLoading(false);
        };
        fetchPages();
    }, []);

    // Mevcut yola (klasöre) göre içeriği filtrele
    const explorerData = useMemo(() => {
        const pathString = currentPath.join('/');
        const folders = new Set<string>();
        const files: any[] = [];

        pages.forEach(page => {
            const cat = page.category || 'Genel';
            
            // Eğer arama yapılıyorsa hiyerarşiyi görmezden gel
            if (searchTerm) {
                if (page.title.toLowerCase().includes(searchTerm.toLowerCase())) {
                    files.push(page);
                }
                return;
            }

            if (pathString === "") {
                // Ana dizindeyiz
                const rootPart = cat.split('/')[0];
                if (cat.includes('/')) {
                    folders.add(rootPart);
                } else {
                    if (cat === "Genel") files.push(page);
                    else folders.add(cat);
                }
            } else {
                // Bir alt dizindeyiz
                if (cat === pathString) {
                    files.push(page);
                } else if (cat.startsWith(pathString + '/')) {
                    const subPart = cat.substring(pathString.length + 1).split('/')[0];
                    folders.add(subPart);
                }
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

    const goBack = () => {
        setCurrentPath(currentPath.slice(0, -1));
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
            {/* Arka Plan */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-indigo-100/40 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-sky-100/40 rounded-full blur-[120px]" />
            </div>

            <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200">
                <div className="container mx-auto px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <Link href="/">
                            <Button variant="ghost" size="icon" className="rounded-full h-12 w-12 hover:bg-slate-100">
                                <ArrowLeft className="h-6 w-6 text-slate-600" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-3xl font-black tracking-tighter text-slate-900 uppercase">Döküman Merkezi</h1>
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-0.5 flex items-center gap-2">
                                <Globe className="h-3 w-3" /> Ekstra Bilgi & Materyaller
                            </p>
                        </div>
                    </div>

                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input 
                            placeholder="Dosyalarda ara..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 bg-slate-100 border-none rounded-2xl focus-visible:ring-indigo-500"
                        />
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-6 py-8 relative z-10">
                
                {/* Breadcrumb / Navigasyon */}
                {!searchTerm && (
                    <div className="flex items-center gap-2 mb-8 bg-white/50 p-2 rounded-2xl border border-white w-fit shadow-sm">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setCurrentPath([])}
                            className={cn("rounded-xl font-bold text-xs uppercase", currentPath.length === 0 ? "text-indigo-600 bg-white shadow-sm" : "text-slate-500")}
                        >
                            Ana Dizin
                        </Button>
                        {currentPath.map((part, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <ChevronRight className="h-4 w-4 text-slate-300" />
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => setCurrentPath(currentPath.slice(0, i + 1))}
                                    className={cn("rounded-xl font-bold text-xs uppercase", i === currentPath.length - 1 ? "text-indigo-600 bg-white shadow-sm" : "text-slate-500")}
                                >
                                    {part}
                                </Button>
                            </div>
                        ))}
                    </div>
                )}

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4">
                        <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
                        <span className="text-slate-400 font-bold uppercase tracking-widest text-xs">Veriler Yükleniyor...</span>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                        
                        {/* Klasörler */}
                        {explorerData.folders.map(folder => (
                            <button 
                                key={folder}
                                onClick={() => handleFolderClick(folder)}
                                className="group flex flex-col items-center gap-3 p-6 rounded-[2.5rem] bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-2xl transition-all duration-500 hover:-translate-y-2"
                            >
                                <div className="relative">
                                    <Folder className="h-20 w-20 text-amber-400 fill-amber-400/20 group-hover:scale-110 transition-transform duration-500" />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <Plus className="h-6 w-6 text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                </div>
                                <span className="font-black text-slate-700 text-sm uppercase tracking-tight line-clamp-1">{folder}</span>
                            </button>
                        ))}

                        {/* Dosyalar (Dökümanlar) */}
                        {explorerData.files.map(page => (
                            <Link key={page.id} href={`/extra/${page.id}`} className="group block">
                                <Card className="h-full rounded-[2.5rem] border-slate-200 hover:border-indigo-300 hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 overflow-hidden bg-white">
                                    <CardHeader className="p-6 pb-4">
                                        <div className="bg-indigo-50 w-12 h-12 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-indigo-600 transition-colors duration-500">
                                            <FileText className="h-6 w-6 text-indigo-600 group-hover:text-white transition-colors duration-500" />
                                        </div>
                                        <CardTitle className="text-lg font-black text-slate-800 leading-tight group-hover:text-indigo-600 transition-colors">
                                            {page.title}
                                        </CardTitle>
                                        <CardDescription className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-1.5">
                                            <Clock className="h-3 w-3" />
                                            {page.updatedAt ? new Date(page.updatedAt).toLocaleDateString('tr-TR') : 'YENİ'}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="px-6 pb-6">
                                        <p className="text-slate-500 text-xs line-clamp-2 leading-relaxed">
                                            {page.description || "Döküman içeriğini görüntülemek için tıklayın."}
                                        </p>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}

                        {/* Boş Durum */}
                        {explorerData.folders.length === 0 && explorerData.files.length === 0 && (
                            <div className="col-span-full py-20 flex flex-col items-center justify-center text-center opacity-40">
                                <FileText className="h-16 w-16 mb-4 text-slate-300" />
                                <h3 className="text-xl font-bold text-slate-900">Bu klasör henüz boş.</h3>
                                <p className="text-sm">Geri dönüp diğer klasörlere göz atabilirsiniz.</p>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}

const Plus = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
    </svg>
);
