'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
    Plus, Search, Edit2, Trash2, Globe, Eye, EyeOff, 
    Loader2, MoreVertical, LayoutGrid, Tag, Settings2,
    ChevronRight, Save, X, Move, FolderPlus, Folder,
    ArrowLeft, Home, Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { 
    Dialog, DialogContent, DialogHeader, DialogTitle, 
    DialogFooter, DialogDescription, DialogClose
} from '@/components/ui/dialog';
import { 
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
    DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
    getExtraPages, saveExtraPage, deleteExtraPage, 
    deleteExtraPageCategory, moveExtraPage 
} from '@/app/teacher/extra-pages/actions';
import Link from 'next/link';
import { 
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, 
    AlertDialogTitle, AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function ExtraPagesManagement() {
    const [pages, setPages] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [searchTerm, setSearchArea] = useState("");
    
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
    const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
    
    const [editingPage, setEditingPage] = useState<any>(null);
    const [movingPage, setMovingPage] = useState<any>(null);
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        category: "",
        htmlContent: "",
        isPublished: true
    });

    const { toast } = useToast();

    const allCategories = useMemo(() => {
        const cats = new Set<string>();
        pages.forEach(p => {
            const cat = p.category || 'Genel';
            cats.add(cat);
            const parts = cat.split('/');
            let current = "";
            parts.forEach((part, i) => {
                current = i === 0 ? part : `${current}/${part}`;
                cats.add(current);
            });
        });
        return Array.from(cats).sort();
    }, [pages]);

    const fetchPages = async () => {
        setIsLoading(true);
        const res = await getExtraPages();
        if (res.success) {
            setPages(res.data || []);
        } else {
            toast({ title: "Hata", description: res.error, variant: "destructive" });
        }
        setIsLoading(false);
    };

    useEffect(() => { fetchPages(); }, []);

    const handleOpenDialog = (page: any = null) => {
        if (page) {
            setEditingPage(page);
            setFormData({
                title: page.title,
                description: page.description || "",
                category: page.category || "Genel",
                htmlContent: page.htmlContent || "",
                isPublished: page.isPublished ?? true
            });
        } else {
            setEditingPage(null);
            setFormData({ title: "", description: "", category: "Genel", htmlContent: "", isPublished: true });
        }
        setIsDialogOpen(true);
    };

    const handleSave = async () => {
        if (!formData.title || !formData.htmlContent) {
            toast({ title: "Hata", description: "Başlık ve İçerik alanları zorunludur.", variant: "destructive" });
            return;
        }
        setIsSaving(true);
        const res = await saveExtraPage(editingPage?.id || null, formData);
        if (res.success) {
            toast({ title: "Başarılı", description: "Sayfa başarıyla kaydedildi." });
            setIsDialogOpen(false);
            fetchPages();
        } else {
            toast({ title: "Hata", description: res.error, variant: "destructive" });
        }
        setIsSaving(false);
    };

    const handleDelete = async (id: string) => {
        const res = await deleteExtraPage(id);
        if (res.success) {
            toast({ title: "Silindi", description: "Sayfa başarıyla kaldırıldı." });
            fetchPages();
        }
    };

    const handleMove = async (newCat: string) => {
        if (!movingPage) return;
        setIsSaving(true);
        const res = await moveExtraPage(movingPage.id, newCat);
        if (res.success) {
            toast({ title: "Taşındı", description: "Döküman yeni klasöre taşındı." });
            setIsMoveDialogOpen(false);
            fetchPages();
        } else {
            toast({ title: "Hata", description: res.error, variant: "destructive" });
        }
        setIsSaving(false);
    };

    const handleCategoryDelete = async (name: string) => {
        if (name === 'Genel') return;
        const res = await deleteExtraPageCategory(name);
        if (res.success) {
            toast({ title: "Başarılı", description: `Kategori temizlendi.` });
            fetchPages();
        }
    };

    const filteredPages = pages.filter(p => 
        p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.category?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="container mx-auto p-4 md:p-8 space-y-8 min-h-screen bg-slate-50/50 font-sans text-slate-900">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild className="rounded-full h-11 w-11 hover:bg-slate-100">
                        <Link href="/teacher"><ArrowLeft className="h-6 w-6 text-slate-600" /></Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Ekstra Sayfalar Yönetimi</h1>
                        <p className="text-slate-500 text-sm">İnteraktif dökümanları ve klasörleri yönetin.</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={() => setIsCategoryDialogOpen(true)} variant="outline" className="rounded-xl gap-2 h-11">
                        <Settings2 className="h-4 w-4" /> Klasörler
                    </Button>
                    <Button onClick={() => handleOpenDialog()} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl gap-2 shadow-lg h-11">
                        <Plus className="h-4 w-4" /> Yeni Sayfa
                    </Button>
                </div>
            </div>

            <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input 
                        placeholder="Sayfa adı veya yol ara..." 
                        value={searchTerm}
                        onChange={(e) => setSearchArea(e.target.value)}
                        className="pl-10 bg-slate-50 border-none rounded-xl focus-visible:ring-indigo-500 h-11"
                    />
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-indigo-500" /></div>
            ) : filteredPages.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredPages.map((page) => (
                        <Card key={page.id} className="group overflow-hidden rounded-[2rem] border-slate-200 hover:shadow-xl transition-all duration-300 bg-white">
                            <CardHeader className="pb-4">
                                <div className="flex justify-between items-start mb-2">
                                    <Badge variant={page.isPublished ? "default" : "secondary"} className={page.isPublished ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : "bg-slate-100 text-slate-500"}>
                                        {page.isPublished ? <><Eye className="h-3 w-3 mr-1" /> Yayında</> : <><EyeOff className="h-3 w-3 mr-1" /> Taslak</>}
                                    </Badge>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="rounded-xl w-44">
                                            <DropdownMenuItem onClick={() => handleOpenDialog(page)} className="gap-2 cursor-pointer text-sm font-medium">
                                                <Edit2 className="h-4 w-4" /> Düzenle
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => { setMovingPage(page); setIsMoveDialogOpen(true); }} className="gap-2 cursor-pointer text-sm font-medium">
                                                <Move className="h-4 w-4" /> Klasöre Taşı
                                            </DropdownMenuItem>
                                            <DropdownMenuItem asChild className="gap-2 cursor-pointer text-sm font-medium">
                                                <Link href={`/extra/${page.id}`} target="_blank">
                                                    <Globe className="h-4 w-4" /> Görüntüle
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onClick={() => handleDelete(page.id)} className="gap-2 cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 font-bold">
                                                <Trash2 className="h-4 w-4" /> Sil
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                                <CardTitle className="text-xl line-clamp-1 group-hover:text-indigo-600 transition-colors uppercase font-black">{page.title}</CardTitle>
                                <CardDescription className="flex items-center gap-1 mt-1 text-[10px] uppercase font-bold tracking-tight">
                                    <Folder className="h-3 w-3 text-amber-500" /> {page.category || 'Genel'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-slate-500 line-clamp-2 min-h-[2.5rem]">
                                    {page.description || "Açıklama belirtilmemiş."}
                                </p>
                            </CardContent>
                            <CardFooter className="pt-4 border-t border-slate-50 flex items-center justify-between text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                                <span>GÜNCELLEME: {page.updatedAt ? format(new Date(page.updatedAt), 'dd.MM.yyyy', { locale: tr }) : '-'}</span>
                                <ChevronRight className="h-4 w-4 text-indigo-300" />
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-slate-200">
                    <LayoutGrid className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold">Döküman Bulunamadı</h3>
                </div>
            )}

            {/* Sayfa Düzenleme/Ekleme Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-[2rem] bg-white text-slate-900 border-none">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black uppercase tracking-tight">{editingPage ? "Sayfayı Düzenle" : "Yeni Sayfa Oluştur"}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-6 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 uppercase tracking-widest ml-1">Sayfa Başlığı</label>
                                <Input value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} placeholder="Örn: Rehberlik İlkeleri" className="rounded-xl border-slate-200 h-11" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 uppercase tracking-widest ml-1">Klasör Yolu</label>
                                <div className="relative">
                                    <Input value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} placeholder="Örn: Rehberlik/LGS" className="rounded-xl pr-10 border-slate-200 h-11" />
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-slate-400 hover:text-indigo-600"><Tag className="h-4 w-4" /></Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-64 max-h-[300px] overflow-y-auto rounded-xl">
                                                <DropdownMenuLabel className="px-2 py-1.5 text-[10px] font-bold text-slate-400 uppercase">Mevcutlar</DropdownMenuLabel>
                                                {allCategories.map(cat => (
                                                    <DropdownMenuItem key={cat} onClick={() => setFormData({...formData, category: cat})} className="cursor-pointer text-xs font-medium">
                                                        <Folder className="h-3.5 w-3.5 mr-2 text-amber-500" /> {cat}
                                                    </DropdownMenuItem>
                                                ))}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 uppercase tracking-widest ml-1">Kısa Açıklama</label>
                            <Textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder="Kısa özet..." className="rounded-xl h-20 border-slate-200" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 uppercase tracking-widest ml-1">HTML İçeriği</label>
                            <Textarea value={formData.htmlContent} onChange={(e) => setFormData({...formData, htmlContent: e.target.value})} placeholder="HTML kodu buraya..." className="rounded-xl font-mono text-xs h-96 border-slate-200" />
                        </div>
                        <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <input type="checkbox" id="isPublished" checked={formData.isPublished} onChange={(e) => setFormData({...formData, isPublished: e.target.checked})} className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                            <label htmlFor="isPublished" className="text-sm font-black text-slate-700 cursor-pointer uppercase tracking-tight">Hemen yayınla</label>
                        </div>
                    </div>
                    <DialogFooter className="bg-slate-50 p-4 -mx-6 -mb-6 mt-4 border-t border-slate-100 rounded-b-[2rem]">
                        <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="rounded-xl font-bold text-slate-500 h-11 px-6">İptal</Button>
                        <Button onClick={handleSave} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl min-w-[120px] font-bold shadow-lg h-11 px-8">
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Değişiklikleri Kaydet"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Klasör/Kategori Yönetimi Dialog */}
            <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
                <DialogContent className="max-w-md rounded-[2rem] bg-white text-slate-900 border-none shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-3 text-2xl font-black uppercase tracking-tight">
                            <Settings2 className="h-6 w-6 text-indigo-600" /> 
                            Klasörler
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <ScrollArea className="max-h-[50vh] pr-4">
                            {allCategories.map(cat => (
                                <div key={cat} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 mb-2">
                                    <span className="text-xs font-black text-slate-700 flex items-center gap-2 uppercase tracking-tight">
                                        <Folder className="h-4 w-4 text-amber-500 fill-current" /> {cat}
                                    </span>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-red-600">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent className="bg-white border-slate-200 text-slate-900 rounded-[2rem]">
                                            <AlertDialogHeader>
                                                <AlertDialogTitle className="font-bold text-red-600">Klasörü Sil</AlertDialogTitle>
                                                <AlertDialogDescription className="text-slate-500">
                                                    "{cat}" klasörünü ve varsa alt klasörlerini silmek istediğinize emin misiniz? Dökümanlar "Genel" klasörüne taşınacaktır.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel className="bg-transparent text-slate-500">İptal</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleCategoryDelete(cat)} className="bg-red-600 hover:bg-red-700 text-white border-none rounded-xl font-bold">Sil ve Taşı</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            ))}
                        </ScrollArea>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Taşıma Dialog */}
            <Dialog open={isMoveDialogOpen} onOpenChange={setIsMoveDialogOpen}>
                <DialogContent className="max-w-md rounded-[2rem] bg-white text-slate-900 border-none shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="font-black text-2xl uppercase tracking-tight">Klasöre Taşı</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Hedef Yol</label>
                            <Input 
                                value={movingPage?.category || ""} 
                                onChange={(e) => setMovingPage({...movingPage, category: e.target.value})}
                                placeholder="Yeni kategori yolu..."
                                className="rounded-xl border-slate-200 h-11"
                            />
                        </div>
                        <ScrollArea className="h-48 border border-slate-100 rounded-xl p-2 bg-slate-50 shadow-inner">
                            {allCategories.map(cat => (
                                <button 
                                    key={cat} 
                                    onClick={() => setMovingPage({...movingPage, category: cat})}
                                    className={cn(
                                        "w-full text-left p-2.5 rounded-lg text-xs transition-colors hover:bg-white flex items-center gap-2 mb-1 uppercase font-bold",
                                        movingPage?.category === cat ? "bg-indigo-600 text-white" : "text-slate-600"
                                    )}
                                >
                                    <Folder className={cn("h-3.5 w-3.5", movingPage?.category === cat ? "text-white" : "text-amber-500")} /> {cat}
                                </button>
                            ))}
                        </ScrollArea>
                    </div>
                    <DialogFooter className="bg-slate-50 p-4 -mx-6 -mb-6 mt-4 border-t border-slate-100 rounded-b-[2rem]">
                        <Button variant="ghost" onClick={() => setIsMoveDialogOpen(false)} className="rounded-xl font-bold h-11 px-6">İptal</Button>
                        <Button onClick={() => handleMove(movingPage.category)} disabled={isSaving} className="bg-indigo-600 text-white rounded-xl min-w-[120px] font-bold h-11 px-8 shadow-lg">
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Taşı"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
