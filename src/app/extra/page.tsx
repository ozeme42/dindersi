
'use client';

import { useState, useEffect } from 'react';
import { getExtraPages, type ExtraPage } from '../teacher/extra-pages/actions';
import { 
    Loader2, Globe, ArrowRight, ArrowLeft, Search, FileText, Sparkles, BookOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { AppHeader } from '@/components/app-header';
import { SiteFooter } from '@/app/page-content';

const MagnificentLightBackground = () => (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-slate-50">
        <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-cyan-50/40 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-indigo-50/40 rounded-full blur-[100px]" />
    </div>
);

export default function ExtraPagesGallery() {
    const [pages, setPages] = useState<ExtraPage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchPages = async () => {
            setIsLoading(true);
            const result = await getExtraPages(true); // Sadece yayınlananlar
            if (result.success && result.data) {
                setPages(result.data);
            }
            setIsLoading(false);
        };
        fetchPages();
    }, []);

    const filteredPages = pages.filter(p => 
        p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex flex-col min-h-screen bg-[#f8fafc] font-sans text-slate-900 relative">
            <MagnificentLightBackground />
            <AppHeader />

            <main className="flex-1 container mx-auto p-4 sm:p-6 md:p-8 space-y-8 relative z-10 pb-20">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-slate-200/60 animate-in fade-in duration-700">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="p-3 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all">
                            <ArrowLeft className="h-6 w-6 text-slate-400" />
                        </Link>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-slate-800">
                                Özel <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-indigo-600">Dökümanlar</span>
                            </h1>
                            <p className="text-slate-500 font-medium mt-1">Ders dışı ek kaynaklar ve bilgilendirici içerikler.</p>
                        </div>
                    </div>

                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input 
                            placeholder="Döküman ara..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="bg-white border-slate-200 pl-10 h-11 rounded-xl shadow-sm focus:ring-cyan-500"
                        />
                    </div>
                </div>

                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="h-40 rounded-3xl bg-white/50 animate-pulse border border-slate-200" />
                        ))}
                    </div>
                ) : filteredPages.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredPages.map((page, index) => (
                            <Link key={page.id} href={`/extra/${page.id}`} className="group relative">
                                <Card className="bg-white border-slate-200 rounded-[2rem] overflow-hidden hover:shadow-2xl hover:shadow-indigo-500/10 hover:border-indigo-200 transition-all duration-300 hover:-translate-y-1 h-full flex flex-col">
                                    <div className="h-2 bg-gradient-to-r from-cyan-500 to-indigo-500 opacity-20 group-hover:opacity-100 transition-opacity" />
                                    <CardContent className="p-8 flex flex-col flex-1">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors">
                                                <FileText className="h-6 w-6" />
                                            </div>
                                            <Sparkles className="h-5 w-5 text-amber-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-indigo-600 transition-colors leading-tight">{page.title}</h3>
                                        <p className="text-sm text-slate-500 font-medium leading-relaxed flex-1">{page.description || 'Bu döküman için açıklama girilmemiş.'}</p>
                                        <div className="mt-6 flex items-center text-xs font-bold text-indigo-500 uppercase tracking-widest gap-1 group-hover:gap-3 transition-all">
                                            İncele <ArrowRight className="h-3 w-3" />
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-32 border-4 border-dashed border-slate-200 rounded-[3rem] bg-white/30">
                        <BookOpen className="h-20 w-20 mx-auto text-slate-300 mb-4" />
                        <p className="text-xl font-bold text-slate-400">Henüz yayınlanmış bir döküman bulunmuyor.</p>
                    </div>
                )}
            </main>

            <SiteFooter />
        </div>
    );
}
