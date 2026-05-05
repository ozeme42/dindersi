'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
    Plus, Search, Edit2, Trash2, Globe, Eye, EyeOff, 
    Loader2, MoreVertical, LayoutGrid, Tag, Settings2,
    ChevronRight, Folder, ArrowLeft, FileText, HardDrive, 
    FolderOpen, Settings, CornerDownRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { 
    Dialog, DialogContent, DialogHeader, DialogTitle, 
    DialogFooter, DialogDescription 
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

    // Kategorileri (Klasörleri) hiyerarşik yapıya uygun olarak çıkarır
    const allCategories = useMemo(() => {
        const cats = new Set<string>();
        pages.forEach(p => {
            const cat = p.category || 'Genel';
            cats.add(cat);
            const parts = cat.split('/');
            let current = "";
            parts.forEach((part: string, i: number) => {
                current = i === 0 ? part : `${current}/${part}`;
                cats.add(current);
            });
        });
        return Array.from(cats).sort(); // Alfabetik ve dizin sırasına göre sıralar
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
            toast({ title: "Başarılı", description: "Dosya başarıyla kaydedildi." });
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
            toast({ title: "Silindi", description: "Dosya başarıyla çöp kutusuna taşındı." });
            fetchPages();
        }
    };

    const handleMove = async (newCat: string) => {
        if (!movingPage) return;
        setIsSaving(true);
        const res = await moveExtraPage(movingPage.id, newCat);
        if (res.success) {
            toast({ title: "Taşındı", description: "Dosya yeni klasörüne başarıyla taşındı." });
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
            toast({ title: "Başarılı", description: `Klasör içeriğiyle birlikte temizlendi.` });
            fetchPages();
        }
    };

    const filteredPages = pages.filter(p => 
        p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (p.category || 'Genel').toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Ağaç görünümü (Tree view) için girinti hesaplayıcı yardımcı fonksiyon
    const getFolderIndentStyle = (catPath: string) => {
        const depth = catPath.split('/').length - 1;
        return { paddingLeft: `${depth * 1.25 + 0.5}rem` };
    };

    // Yalnızca klasörün kendi adını döndürür (Örn: "Rehberlik/LGS" -> "LGS")
    const getFolderName = (catPath: string) => {
        return catPath.split('/').pop() || 'Genel';
    };

    return (
        <div className="min-h-screen bg-[#F4F5F7] font-sans text-slate-900 pb-20 relative">
            
            {/* Arka Plan Efektleri */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-blue-100/40 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-purple-100/40 rounded-full blur-[120px]" />
            </div>

            <div className="container mx-auto p-4 md:p-8 space-y-6 relative z-10">
                
                {/* Üst Header Alanı */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/70 backdrop-blur-xl p-5 md:p-6 rounded-3xl border border-slate-200/60 shadow-sm">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" asChild className="rounded-2xl h-12 w-12 hover:bg-white shadow-sm border border-transparent hover:border-slate-200 transition-all">
                            <Link href="/teacher"><ArrowLeft className="h-5 w-5 text-slate-600" /></Link>
                        </Button>
                        <div>
                            <div className="flex items-center gap-2">
                                <HardDrive className="h-5 w-5 text-blue-500" />
                                <h1 className="text-xl font-bold text-slate-800 tracking-tight">Sürücü Yönetimi</h1>
                            </div>
                            <p className="text-slate-500 text-sm mt-0.5">Bulut içeriklerini ve klasörleri düzenleyin.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button onClick={() => setIsCategoryDialogOpen(true)} variant="outline" className="rounded-xl gap-2 h-11 bg-white border-slate-200 hover:bg-slate-50 text-slate-700 shadow-sm">
                            <FolderOpen className="h-4 w-4 text-sky-500" /> Klasörler
                        </Button>
                        <Button onClick={() => handleOpenDialog()} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl gap-2 shadow-md h-11 px-5">
                            <Plus className="h-4 w-4" /> Yeni Dosya
                        </Button>
                    </div>
                </div>

                {/* Arama Alanı */}
                <div className="flex items-center gap-4 bg-white/70 backdrop-blur-xl p-3 rounded-2xl border border-slate-200/60 shadow-sm">
                    <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input 
                            placeholder="Dosya adı veya klasör ara (Örn: LGS, Deneme)..." 
                            value={searchTerm}
                            onChange={(e) => setSearchArea(e.target.value)}
                            className="pl-10 bg-white border-slate-200 shadow-sm rounded-xl focus-visible:ring-blue-500 focus-visible:border-blue-500 h-11"
                        />
                    </div>
                </div>

                {/* İçerik Listesi */}
                {isLoading ? (
                    <div className="flex flex-col justify-center items-center py-32 space-y-4">
                        <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
                        <p className="text-slate-500 font-medium">Dosyalar getiriliyor...</p>
                    </div>
                ) : filteredPages.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {filteredPages.map((page) => (
                            <Card key={page.id} className="group overflow-hidden rounded-2xl border-slate-200/60 hover:border-blue-300 hover:shadow-xl transition-all duration-300 bg-white flex flex-col">
                                <CardHeader className="pb-3 flex-grow-0">
                                    <div className="flex justify-between items-start mb-3">
                                        <Badge variant="outline" className={cn(
                                            "border font-semibold px-2 py-0.5 text-xs rounded-md",
                                            page.isPublished 
                                                ? "bg-emerald-50 text-emerald-600 border-emerald-200" 
                                                : "bg-slate-50 text-slate-500 border-slate-200"
                                        )}>
                                            {page.isPublished ? <><Eye className="h-3 w-3 mr-1.5 inline" /> Yayında</> : <><EyeOff className="h-3 w-3 mr-1.5 inline" /> Taslak</>}
                                        </Badge>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-100">
                                                    <MoreVertical className="h-4 w-4 text-slate-500" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="rounded-xl w-44 shadow-xl border-slate-100">
                                                <DropdownMenuItem onClick={() => handleOpenDialog(page)} className="gap-2 cursor-pointer text-sm font-medium hover:bg-blue-50 hover:text-blue-600">
                                                    <Edit2 className="h-4 w-4" /> Düzenle
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => { setMovingPage(page); setIsMoveDialogOpen(true); }} className="gap-2 cursor-pointer text-sm font-medium hover:bg-blue-50 hover:text-blue-600">
                                                    <FolderOpen className="h-4 w-4" /> Klasöre Taşı
                                                </DropdownMenuItem>
                                                <DropdownMenuItem asChild className="gap-2 cursor-pointer text-sm font-medium hover:bg-blue-50 hover:text-blue-600">
                                                    <Link href={`/extra/${page.id}`} target="_blank">
                                                        <Globe className="h-4 w-4" /> Görüntüle
                                                    </Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={() => handleDelete(page.id)} className="gap-2 cursor-pointer text-red-600 hover:bg-red-50 focus:bg-red-50 font-semibold">
                                                    <Trash2 className="h-4 w-4" /> Sil
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 text-blue-500">
                                            <FileText className="h-5 w-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <CardTitle className="text-base font-bold text-slate-800 line-clamp-2 group-hover:text-blue-600 transition-colors">{page.title}</CardTitle>
                                            
                                            {/* Ekmek Kırıntısı (Breadcrumb) Gösterimi */}
                                            <CardDescription className="flex items-center flex-wrap gap-1 mt-1.5 text-[11px] font-medium text-slate-500">
                                                <Folder className="h-3 w-3 fill-sky-400 text-sky-500 shrink-0" />
                                                {page.category ? page.category.split('/').map((part: string, i: number, arr: string[]) => (
                                                    <span key={i} className="flex items-center gap-1">
                                                        <span className="truncate max-w-[80px]">{part}</span>
                                                        {i < arr.length - 1 && <ChevronRight className="h-2.5 w-2.5 text-slate-300" />}
                                                    </span>
                                                )) : 'Genel'}
                                            </CardDescription>

                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="flex-grow">
                                    <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">
                                        {page.description || "Açıklama belirtilmemiş."}
                                    </p>
                                </CardContent>
                                <CardFooter className="pt-3 pb-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                                    <span>{page.updatedAt ? format(new Date(page.updatedAt), 'dd MMM yyyy', { locale: tr }) : '-'}</span>
                                    <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-24 bg-white/70 backdrop-blur-xl rounded-3xl border border-dashed border-slate-300 shadow-sm">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <HardDrive className="h-8 w-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-700">İçerik Bulunamadı</h3>
                        <p className="text-slate-500 text-sm mt-1">Arama kriterinize uygun dosya veya klasör yok.</p>
                    </div>
                )}
            </div>

            {/* Dosya Düzenleme/Ekleme Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-hidden flex flex-col p-0 rounded-3xl bg-white text-slate-900 border-slate-200 shadow-2xl">
                    <DialogHeader className="p-6 pb-4 border-b border-slate-100 bg-slate-50/50">
                        <DialogTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <FileText className="h-5 w-5 text-blue-500" />
                            {editingPage ? "Dosyayı Düzenle" : "Yeni Dosya Oluştur"}
                        </DialogTitle>
                    </DialogHeader>
                    
                    <div className="flex-grow overflow-y-auto p-6 space-y-6 custom-scrollbar">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Dosya Adı</label>
                                <Input value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} placeholder="Örn: 5. Sınıf Deneme Sınavı" className="rounded-xl border-slate-200 h-11 focus-visible:ring-blue-500" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Klasör Konumu</label>
                                <div className="relative flex gap-2">
                                    <div className="relative flex-1">
                                        <Folder className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                        <Input value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} placeholder="Örn: Sınavlar/5. Sınıf" className="pl-9 rounded-xl border-slate-200 h-11 focus-visible:ring-blue-500" />
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl border-slate-200 text-slate-500 hover:text-blue-600 hover:bg-blue-50">
                                                <FolderOpen className="h-5 w-5" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-64 max-h-[300px] overflow-y-auto rounded-xl shadow-xl border-slate-100 p-1">
                                            <DropdownMenuLabel className="px-2 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Ağaç Görünümü</DropdownMenuLabel>
                                            {allCategories.map(cat => (
                                                <DropdownMenuItem 
                                                    key={cat} 
                                                    onClick={() => setFormData({...formData, category: cat})} 
                                                    className="cursor-pointer text-sm font-medium py-2 rounded-lg hover:bg-blue-50"
                                                >
                                                    {/* Alt klasör girintisi uygula */}
                                                    <div className="flex items-center gap-2" style={getFolderIndentStyle(cat)}>
                                                        {cat.includes('/') ? <CornerDownRight className="h-3.5 w-3.5 text-slate-300" /> : <Folder className="h-4 w-4 fill-sky-400 text-sky-500" />}
                                                        <span className="truncate">{getFolderName(cat)}</span>
                                                    </div>
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Kısa Açıklama</label>
                            <Textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder="Dosya hakkında kısa bir bilgi..." className="rounded-xl h-20 border-slate-200 focus-visible:ring-blue-500 resize-none" />
                        </div>
                        
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center justify-between">
                                <span>HTML Kaynak Kodu</span>
                                <Badge variant="secondary" className="font-mono text-[10px] bg-slate-100 text-slate-500">{"</>"}</Badge>
                            </label>
                            <Textarea 
                                value={formData.htmlContent} 
                                onChange={(e) => setFormData({...formData, htmlContent: e.target.value})} 
                                placeholder="<!-- Kodunuzu buraya yapıştırın -->" 
                                className="rounded-xl font-mono text-sm h-[35vh] border-slate-200 bg-slate-50 focus-visible:ring-blue-500 p-4 leading-relaxed" 
                            />
                        </div>
                        
                        <div className="flex items-center gap-3 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                            <input 
                                type="checkbox" 
                                id="isPublished" 
                                checked={formData.isPublished} 
                                onChange={(e) => setFormData({...formData, isPublished: e.target.checked})} 
                                className="h-5 w-5 rounded border-blue-300 text-blue-600 focus:ring-blue-500 bg-white" 
                            />
                            <label htmlFor="isPublished" className="text-sm font-bold text-blue-900 cursor-pointer select-none">
                                Dosyayı yayına al (Öğrenciler görebilir)
                            </label>
                        </div>
                    </div>
                    
                    <DialogFooter className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 rounded-b-3xl">
                        <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="rounded-xl font-semibold text-slate-600 hover:bg-slate-200 h-11 px-6">İptal</Button>
                        <Button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-md h-11 px-8">
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileText className="h-4 w-4 mr-2" />}
                            {isSaving ? "Kaydediliyor..." : "Dosyayı Kaydet"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Klasör Yönetimi Dialog */}
            <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
                <DialogContent className="max-w-md rounded-3xl bg-white text-slate-900 border-none shadow-2xl p-0 overflow-hidden">
                    <DialogHeader className="p-6 pb-4 border-b border-slate-100 bg-slate-50/50">
                        <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-800">
                            <FolderOpen className="h-5 w-5 text-blue-500" /> 
                            Klasör Ağacı
                        </DialogTitle>
                    </DialogHeader>
                    <div className="p-2 bg-slate-50/30">
                        <ScrollArea className="max-h-[50vh] px-4 py-2">
                            {allCategories.length > 0 ? allCategories.map(cat => (
                                <div key={cat} className="group flex items-center justify-between py-1.5 hover:bg-slate-100 rounded-xl px-2 transition-colors relative">
                                    
                                    {/* İç içe klasör görünümü */}
                                    <div className="flex items-center gap-2" style={getFolderIndentStyle(cat)}>
                                        {cat.includes('/') ? <CornerDownRight className="h-4 w-4 text-slate-300" /> : <Folder className="h-5 w-5 fill-sky-400 text-sky-500" />}
                                        <span className="text-sm font-semibold text-slate-700">{getFolderName(cat)}</span>
                                    </div>

                                    {cat !== 'Genel' && (
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent className="bg-white border-slate-200 text-slate-900 rounded-3xl">
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle className="font-bold text-red-600 flex items-center gap-2">
                                                        <Trash2 className="h-5 w-5" /> Klasörü Sil
                                                    </AlertDialogTitle>
                                                    <AlertDialogDescription className="text-slate-500 leading-relaxed">
                                                        <strong className="text-slate-700">"{cat}"</strong> klasörünü silmek istediğinize emin misiniz? İçindeki tüm dosyalar <strong>"Genel"</strong> klasörüne taşınacaktır. Bu işlem geri alınamaz.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter className="mt-4">
                                                    <AlertDialogCancel className="bg-slate-100 border-none text-slate-600 hover:bg-slate-200 rounded-xl font-semibold">İptal</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleCategoryDelete(cat)} className="bg-red-600 hover:bg-red-700 text-white border-none rounded-xl font-semibold shadow-md">Sil ve Taşı</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    )}
                                </div>
                            )) : (
                                <p className="text-center text-slate-500 text-sm py-4">Henüz klasör bulunmuyor.</p>
                            )}
                        </ScrollArea>
                    </div>
                    <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                        <Button variant="outline" onClick={() => setIsCategoryDialogOpen(false)} className="rounded-xl font-semibold bg-white border-slate-200 text-slate-700">Kapat</Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Dosya Taşıma Dialog */}
            <Dialog open={isMoveDialogOpen} onOpenChange={setIsMoveDialogOpen}>
                <DialogContent className="max-w-md rounded-3xl bg-white text-slate-900 border-none shadow-2xl p-0 overflow-hidden">
                    <DialogHeader className="p-6 pb-4 border-b border-slate-100 bg-slate-50/50">
                        <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-800">
                            <Settings className="h-5 w-5 text-blue-500" /> 
                            Konum Değiştir
                        </DialogTitle>
                    </DialogHeader>
                    <div className="p-6 space-y-5">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Hedef Klasör Yolu</label>
                            <Input 
                                value={movingPage?.category || ""} 
                                onChange={(e) => setMovingPage({...movingPage, category: e.target.value})}
                                placeholder="Örn: Yeni Klasör/Alt Klasör"
                                className="rounded-xl border-slate-200 h-11 focus-visible:ring-blue-500"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Ağaçtan Seçin</label>
                            <ScrollArea className="h-56 border border-slate-200 rounded-xl bg-slate-50/50">
                                <div className="p-2 space-y-1">
                                    {allCategories.map(cat => (
                                        <button 
                                            key={cat} 
                                            onClick={() => setMovingPage({...movingPage, category: cat})}
                                            className={cn(
                                                "w-full text-left pr-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2",
                                                movingPage?.category === cat 
                                                    ? "bg-blue-100 text-blue-700" 
                                                    : "text-slate-700 hover:bg-slate-100/80"
                                            )}
                                        >
                                            <div className="flex items-center gap-2" style={getFolderIndentStyle(cat)}>
                                                {cat.includes('/') ? <CornerDownRight className="h-4 w-4 text-slate-400" /> : <Folder className={cn("h-4 w-4", movingPage?.category === cat ? "fill-blue-400 text-blue-500" : "fill-sky-400 text-sky-500")} />}
                                                <span className="truncate">{getFolderName(cat)}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                    </div>
                    <DialogFooter className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
                        <Button variant="ghost" onClick={() => setIsMoveDialogOpen(false)} className="rounded-xl font-semibold text-slate-600 hover:bg-slate-200 h-11 px-6">İptal</Button>
                        <Button onClick={() => handleMove(movingPage.category)} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-md h-11 px-8">
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Dosyayı Taşı"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}