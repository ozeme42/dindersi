'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
    Loader2, Globe, Plus, Search, Trash2, FileEdit, Eye, EyeOff, Save, ArrowLeft, Home, FileText, Tag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getExtraPages, saveExtraPage, deleteExtraPage, toggleExtraPagePublish, type ExtraPage } from './actions';
import Link from 'next/link';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function ExtraPagesManagement() {
    const [pages, setPages] = useState<ExtraPage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const { toast } = useToast();

    const [editingPage, setEditingPage] = useState<Partial<ExtraPage> | null>(null);

    const fetchPages = useCallback(async () => {
        setIsLoading(true);
        const result = await getExtraPages();
        if (result.success && result.data) {
            setPages(result.data);
        } else {
            toast({ title: "Hata", description: "Sayfalar yüklenemedi.", variant: "destructive" });
        }
        setIsLoading(false);
    }, [toast]);

    useEffect(() => {
        fetchPages();
    }, [fetchPages]);

    const handleSave = async () => {
        if (!editingPage?.title || !editingPage?.htmlContent) {
            toast({ title: "Eksik Bilgi", description: "Başlık ve HTML içeriği zorunludur.", variant: "destructive" });
            return;
        }
        setIsSaving(true);
        const result = await saveExtraPage(editingPage);
        if (result.success) {
            toast({ title: "Başarılı", description: "Sayfa kaydedildi." });
            setEditingPage(null);
            fetchPages();
        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive" });
        }
        setIsSaving(false);
    };

    const handleDelete = async (id: string) => {
        const result = await deleteExtraPage(id);
        if (result.success) {
            toast({ title: "Başarılı", description: "Sayfa silindi." });
            fetchPages();
        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive" });
        }
    };

    const handleTogglePublish = async (id: string, state: boolean) => {
        const result = await toggleExtraPagePublish(id, state);
        if (result.success) {
            fetchPages();
        }
    };

    const filteredPages = pages.filter(p => 
        p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 md:p-8 relative overflow-hidden font-sans selection:bg-cyan-500/30">
            <div className="fixed inset-0 pointer-events-none z-0 opacity-30">
                <div className="absolute top-[-10%] left-[-10%] w-[1000px] h-[1000px] bg-cyan-900/20 rounded-full blur-[150px]" />
            </div>

            <div className="max-w-7xl mx-auto relative z-10 space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-white/10 pb-8 gap-4">
                     <div className="flex items-center gap-4">
                        <Button asChild variant="ghost" size="icon" className="text-slate-400 hover:text-white bg-white/5 rounded-xl h-12 w-12">
                            <Link href="/teacher"><ArrowLeft className="h-6 w-6"/></Link>
                        </Button>
                        <div>
                            <h1 className="text-4xl font-black text-white tracking-tight uppercase drop-shadow-md flex items-center gap-3">
                                <div className="p-2 bg-cyan-500/20 rounded-xl border border-cyan-500/30">
                                    <Globe className="h-8 w-8 text-cyan-400" />
                                </div>
                                Ekstra Sayfalar
                            </h1>
                            <p className="text-slate-400 mt-1">Herhangi bir sınıf veya derse bağlı olmayan özel dökümanlar.</p>
                        </div>
                     </div>
                     <Button onClick={() => setEditingPage({ title: '', description: '', category: 'Genel', htmlContent: '', isPublished: true })} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-12 px-6 rounded-xl shadow-lg">
                        <Plus className="mr-2 h-5 w-5" /> Yeni Sayfa Oluştur
                    </Button>
                </div>

                {editingPage ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in zoom-in-95 duration-300">
                        <Card className="bg-slate-900/60 border-white/10 shadow-2xl">
                            <CardHeader>
                                <CardTitle className="text-white">Sayfa Bilgileri</CardTitle>
                                <CardDescription>Gezinme listesinde görünecek detaylar.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Sayfa Başlığı</Label>
                                        <Input 
                                            value={editingPage.title} 
                                            onChange={e => setEditingPage({...editingPage, title: e.target.value})}
                                            className="bg-slate-950 border-white/10 text-white h-11"
                                            placeholder="Örn: Rehberlik Dökümanı"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Kategori (Ana Grup)</Label>
                                        <div className="relative">
                                            <Tag className="absolute left-3 top-3 h-5 w-5 text-slate-500" />
                                            <Input 
                                                value={editingPage.category} 
                                                onChange={e => setEditingPage({...editingPage, category: e.target.value})}
                                                className="bg-slate-950 border-white/10 text-white h-11 pl-10"
                                                placeholder="Örn: Rehberlik"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Açıklama (Kısa)</Label>
                                    <Textarea 
                                        value={editingPage.description} 
                                        onChange={e => setEditingPage({...editingPage, description: e.target.value})}
                                        className="bg-slate-950 border-white/10 text-white"
                                        placeholder="Gezinme ekranında görünecek kısa alt metin..."
                                    />
                                </div>
                                <div className="flex items-center justify-between p-4 bg-slate-950/50 rounded-xl border border-white/5">
                                    <div className="space-y-0.5">
                                        <Label>Yayınla</Label>
                                        <p className="text-xs text-slate-500">Sayfa ziyaretçilere açık olsun mu?</p>
                                    </div>
                                    <Switch 
                                        checked={editingPage.isPublished} 
                                        onCheckedChange={v => setEditingPage({...editingPage, isPublished: v})}
                                    />
                                </div>
                            </CardContent>
                            <CardFooter className="justify-between border-t border-white/5 pt-6">
                                <Button variant="ghost" onClick={() => setEditingPage(null)} className="text-slate-400 hover:text-white">İptal</Button>
                                <Button onClick={handleSave} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-500 text-white px-8">
                                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                                    Sayfayı Kaydet
                                </Button>
                            </CardFooter>
                        </Card>

                        <Card className="bg-slate-900/60 border-white/10 shadow-2xl flex flex-col">
                            <CardHeader>
                                <CardTitle className="text-white">HTML İçeriği</CardTitle>
                                <CardDescription>Sayfanın asıl gövdesini oluşturacak HTML kodu.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1 flex flex-col">
                                <Textarea 
                                    value={editingPage.htmlContent} 
                                    onChange={e => setEditingPage({...editingPage, htmlContent: e.target.value})}
                                    className="flex-1 min-h-[400px] bg-slate-950 border-white/10 text-cyan-100 font-mono text-xs leading-relaxed"
                                    placeholder="<!DOCTYPE html>..."
                                />
                            </CardContent>
                        </Card>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="relative max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                            <Input 
                                placeholder="Sayfa, kategori veya açıklama ara..." 
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="bg-slate-900 border-white/10 text-white pl-10 h-11 rounded-xl"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {isLoading ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <div key={i} className="h-48 rounded-3xl bg-slate-900/50 animate-pulse border border-white/5" />
                                ))
                            ) : filteredPages.length > 0 ? (
                                filteredPages.map(page => (
                                    <Card key={page.id} className="bg-slate-900/60 border-white/10 shadow-xl overflow-hidden group hover:border-cyan-500/30 transition-all">
                                        <CardHeader className="pb-3 border-b border-white/5 bg-slate-900/50">
                                            <div className="flex justify-between items-start gap-2">
                                                <div className="space-y-1">
                                                     <Badge variant="outline" className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20 text-[9px] px-2">{page.category || 'Genel'}</Badge>
                                                     <CardTitle className="text-lg font-bold text-white group-hover:text-cyan-400 transition-colors line-clamp-1">{page.title}</CardTitle>
                                                </div>
                                                {!page.isPublished && <Badge variant="destructive" className="text-[9px] h-4">TASLAK</Badge>}
                                            </div>
                                            <CardDescription className="line-clamp-2 text-xs h-8">{page.description || 'Açıklama belirtilmemiş.'}</CardDescription>
                                        </CardHeader>
                                        <CardContent className="py-4 flex flex-col gap-2">
                                            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                                                <FileText className="w-3 h-3"/>
                                                <span>HTML: {page.htmlContent.length.toLocaleString()} karakter</span>
                                            </div>
                                            <div className="text-[10px] text-slate-600">
                                                Oluşturma: {format(new Date(page.createdAt), 'd MMM yyyy', { locale: tr })}
                                            </div>
                                        </CardContent>
                                        <CardFooter className="bg-black/20 p-3 flex justify-between gap-2">
                                            <div className="flex gap-1">
                                                <Button size="icon" variant="ghost" onClick={() => handleTogglePublish(page.id, page.isPublished)} className="h-8 w-8 text-slate-400 hover:text-white">
                                                    {page.isPublished ? <Eye className="h-4 w-4"/> : <EyeOff className="h-4 w-4 text-amber-500"/>}
                                                </Button>
                                                <Button size="icon" variant="ghost" onClick={() => setEditingPage(page)} className="h-8 w-8 text-slate-400 hover:text-emerald-400">
                                                    <FileEdit className="h-4 w-4"/>
                                                </Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-500 hover:text-red-400">
                                                            <Trash2 className="h-4 w-4"/>
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent className="bg-slate-900 border-white/10 text-white">
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Sayfayı Sil</AlertDialogTitle>
                                                            <AlertDialogDescription className="text-slate-400">
                                                                "{page.title}" dökümanı kalıcı olarak silinecektir. Emin misiniz?
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel className="bg-transparent border-white/10 text-slate-300">İptal</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDelete(page.id)} className="bg-red-600 hover:bg-red-500 text-white">Evet, Sil</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                            <Button asChild size="sm" variant="outline" className="h-8 bg-white/5 border-white/10 text-xs font-bold text-white hover:bg-white/10">
                                                <Link href={`/extra/${page.id}`} target="_blank">Görüntüle</Link>
                                            </Button>
                                        </CardFooter>
                                    </Card>
                                ))
                            ) : (
                                <div className="col-span-full py-20 border-2 border-dashed border-slate-800 rounded-[2.5rem] bg-slate-900/30 text-center">
                                    <Globe className="h-16 w-16 mx-auto text-slate-700 opacity-20 mb-4" />
                                    <p className="text-slate-500">Henüz döküman eklenmemiş.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}