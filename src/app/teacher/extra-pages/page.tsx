'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
    Plus, Search, Edit2, Trash2, Globe, Eye, EyeOff, 
    Loader2, MoreVertical, LayoutGrid, Tag, Settings2,
    ChevronRight, Folder, ArrowLeft, FileText, HardDrive, 
    FolderOpen, Settings, CornerDownRight, Link2, ExternalLink,
    Save
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
    const [pageType, setPageType] = useState<'html' | 'link'>('html');
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        category: "",
        htmlContent: "",
        linkUrl: "",
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
            parts.forEach((part: string, i: number) => {
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
            const isLink = page.htmlContent?.startsWith('URL::');
            setPageType(isLink ? 'link' : 'html');
            setFormData({
                title: page.title,
                description: page.description || "",
                category: page.category || "Genel",
                htmlContent: isLink ? "" : (page.htmlContent || ""),
                linkUrl: isLink ? page.htmlContent.replace('URL::', '') : "",
                isPublished: page.isPublished ?? true
            });
        } else {
            setEditingPage(null);
            setPageType('html');
            setFormData({ title: "", description: "", category: "Genel", htmlContent: "", linkUrl: "", isPublished: true });
        }
        setIsDialogOpen(true);
    };

    const handleSave = async () => {
        if (!formData.title) {
            toast({ title: "Hata", description: "Başlık alanı zorunludur.", variant: "destructive" });
            return;
        }

        if (pageType === 'html' && !formData.htmlContent) {
            toast({ title: "Hata", description: "HTML içeriği zorunludur.", variant: "destructive" });
            return;
        }

        if (pageType === 'link' && !formData.linkUrl) {
            toast({ title: "Hata", description: "Link adresi zorunludur.", variant: "destructive" });
            return;
        }

        setIsSaving(true);
        const finalContent = pageType === 'link' ? `URL::${formData.linkUrl}` : formData.htmlContent;
        
        const res = await saveExtraPage(editingPage?.id || null, {
            ...formData,
            htmlContent: finalContent
        });

        if (res.success) {
            toast({ title: "Başarılı", description: "Kaydedildi." });
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
            toast({ title: "Silindi", description: "Başarıyla silindi." });
            fetchPages();
        }
    };

    const handleMove = async (newCat: string) => {
        if (!movingPage) return;
        setIsSaving(true);
        const res = await moveExtraPage(movingPage.id, newCat);
        if (res.success) {
            toast({ title: "Taşındı", description: "Klasör güncellendi." });
            setIsMoveDialogOpen(false);
            fetchPages();
        } else {
            toast({ title: "Hata", description: res.error, variant: "destructive" });
        }
        setIsSaving(false);
    };

    const filteredPages = pages.filter(p => 
        p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (p.category || 'Genel').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getFolderIndentStyle = (catPath: string) => {
        const depth = catPath.split('/').length - 1;
        return { paddingLeft: `${depth * 1.25 + 0.5}rem` };
    };

    const getFolderName = (catPath: string) => {
        return catPath.split('/').pop() || 'Genel';
    };

    const handleCategoryDelete = async (categoryName: string) => {
        if(!confirm(`"${categoryName}" klasörünü silmek istediğinize emin misiniz? İçindeki dökümanlar "Genel" klasörüne taşınacaktır.`)) return;
        const res = await deleteExtraPageCategory(categoryName);
        if (res.success) {
            toast({ title: "Klasör Silindi", description: `${res.count} döküman "Genel" klasörüne taşındı.` });
            fetchPages();
        }
    };

    return (
        <div className="min-h-screen bg-[#F4F5F7] font-sans text-slate-900 pb-20 relative">
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-blue-100/40 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-purple-100/40 rounded-full blur-[120px]" />
            </div>

            <div className="container mx-auto p-4 md:p-8 space-y-6 relative z-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/70 backdrop-blur-xl p-5 md:p-6 rounded-3xl border border-slate-200/60 shadow-sm">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" asChild className="rounded-2xl h-12 w-12 hover:bg-white shadow-sm border border-transparent hover:border-slate-200 transition-all">
                            <Link href="/teacher"><ArrowLeft className="h-5 w-5 text-slate-600" /></Link>
                        </Button>
                        <div>
                            <div className="flex items-center gap-2">
                                <HardDrive className="h-5 w-5 text-blue-500" />
                                <h1 className="text-xl font-bold text-slate-800 tracking-tight">Ekstra Sayfalar</h1>
                            </div>
                            <p className="text-slate-500 text-sm mt-0.5">İçerikleri ve bağlantıları yönetin.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button onClick={() => setIsCategoryDialogOpen(true)} variant="outline" className="rounded-xl gap-2 h-11 bg-white border-slate-200">
                            <FolderOpen className="h-4 w-4 text-sky-500" /> Klasörler
                        </Button>
                        <Button onClick={() => handleOpenDialog()} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl gap-2 shadow-md h-11 px-5">
                            <Plus className="h-4 w-4" /> Yeni Ekle
                        </Button>
                    </div>
                </div>

                <div className="flex items-center gap-4 bg-white/70 backdrop-blur-xl p-3 rounded-2xl border border-slate-200/60 shadow-sm">
                    <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input 
                            placeholder="Dosya veya klasör ara..." 
                            value={searchTerm}
                            onChange={(e) => setSearchArea(e.target.value)}
                            className="pl-10 bg-white border-slate-200 shadow-sm rounded-xl h-11"
                        />
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex flex-col justify-center items-center py-32 space-y-4">
                        <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
                        <p className="text-slate-500 font-medium">Yükleniyor...</p>
                    </div>
                ) : filteredPages.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {filteredPages.map((page) => {
                            const isLink = page.htmlContent?.startsWith('URL::');
                            return (
                                <Card key={page.id} className="group overflow-hidden rounded-2xl border-slate-200/60 hover:border-blue-300 hover:shadow-xl transition-all duration-300 bg-white flex flex-col">
                                    <CardHeader className="pb-3 flex-grow-0">
                                        <div className="flex justify-between items-start mb-3">
                                            <Badge variant="outline" className={cn(
                                                "border font-semibold px-2 py-0.5 text-xs rounded-md",
                                                page.isPublished 
                                                    ? "bg-emerald-50 text-emerald-600 border-emerald-200" 
                                                    : "bg-slate-50 text-slate-500 border-slate-200"
                                            )}>
                                                {page.isPublished ? "Yayında" : "Taslak"}
                                            </Badge>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <MoreVertical className="h-4 w-4 text-slate-500" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="rounded-xl w-44">
                                                    <DropdownMenuItem onClick={() => handleOpenDialog(page)} className="gap-2 cursor-pointer">
                                                        <Edit2 className="h-4 w-4" /> Düzenle
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => { setMovingPage(page); setIsMoveDialogOpen(true); }} className="gap-2 cursor-pointer">
                                                        <FolderOpen className="h-4 w-4" /> Taşı
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem asChild className="gap-2 cursor-pointer">
                                                        <Link href={isLink ? page.htmlContent.replace('URL::', '') : `/extra/${page.id}`} target="_blank">
                                                            <ExternalLink className="h-4 w-4" /> Görüntüle
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={() => handleDelete(page.id)} className="gap-2 cursor-pointer text-red-600 font-semibold">
                                                        <Trash2 className="h-4 w-4" /> Sil
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0", isLink ? "bg-fuchsia-50 text-fuchsia-500" : "bg-blue-50 text-blue-500")}>
                                                {isLink ? <Link2 className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                                            </div>
                                            <div className="min-w-0">
                                                <CardTitle className="text-base font-bold text-slate-800 line-clamp-2">{page.title}</CardTitle>
                                                <CardDescription className="flex items-center gap-1 mt-1 text-[11px] font-medium text-slate-500">
                                                    <Folder className="h-3 w-3 fill-sky-400 text-sky-500 shrink-0" />
                                                    <span className="truncate">{page.category || 'Genel'}</span>
                                                </CardDescription>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="flex-grow">
                                        <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">
                                            {page.description || (isLink ? "Dış bağlantı." : "İçerik sayfası.")}
                                        </p>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                ) : (
                    <div className="text-center py-24 bg-white/70 rounded-3xl border border-dashed border-slate-300">
                        <HardDrive className="h-8 w-8 text-slate-400 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-slate-700">İçerik Bulunamadı</h3>
                    </div>
                )}
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-4xl w-[95vw] max-h-[95vh] overflow-hidden flex flex-col p-0 rounded-3xl bg-white text-slate-900">
                    <DialogHeader className="p-6 pb-4 border-b border-slate-100">
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            {editingPage ? <Edit2 className="h-5 w-5 text-blue-500" /> : <Plus className="h-5 w-5 text-blue-500" />}
                            {editingPage ? "Kaydı Düzenle" : "Yeni Kayıt Oluştur"}
                        </DialogTitle>
                    </DialogHeader>
                    
                    <div className="flex-grow overflow-y-auto p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-600 uppercase">Başlık</label>
                                <Input value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} placeholder="İçerik başlığı..." className="rounded-xl h-11" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-600 uppercase">Klasör (Kategori)</label>
                                <Input value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} placeholder="Örn: Sınavlar/5. Sınıf" className="rounded-xl h-11" />
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-600 uppercase">Açıklama</label>
                            <Textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder="Kısa bir açıklama girin..." className="rounded-xl h-20 resize-none" />
                        </div>

                        <div className="space-y-4">
                            <label className="text-xs font-bold text-slate-600 uppercase">İçerik Türü</label>
                            <Tabs value={pageType} onValueChange={(v: any) => setPageType(v)} className="w-full">
                                <TabsList className="grid grid-cols-2 w-full max-w-sm mb-4">
                                    <TabsTrigger value="html" className="gap-2"><FileText className="h-4 w-4" /> Döküman (HTML)</TabsTrigger>
                                    <TabsTrigger value="link" className="gap-2"><Link2 className="h-4 w-4" /> Dış Bağlantı (Link)</TabsTrigger>
                                </TabsList>
                                <TabsContent value="html">
                                    <Textarea 
                                        value={formData.htmlContent} 
                                        onChange={(e) => setFormData({...formData, htmlContent: e.target.value})} 
                                        placeholder="HTML kodunuzu buraya yapıştırın..." 
                                        className="rounded-xl font-mono text-sm h-[40vh] bg-slate-50 p-4" 
                                    />
                                </TabsContent>
                                <TabsContent value="link">
                                    <div className="p-8 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
                                        <div className="max-w-md mx-auto space-y-4">
                                            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-fuchsia-100 text-fuchsia-600 mx-auto">
                                                <Link2 className="h-6 w-6" />
                                            </div>
                                            <div className="text-center">
                                                <h4 className="font-bold text-slate-800">Dış Bağlantı Adresi</h4>
                                                <p className="text-xs text-slate-500 mt-1">Gidilecek URL adresini tam olarak (https://...) yazın.</p>
                                            </div>
                                            <Input 
                                                value={formData.linkUrl} 
                                                onChange={(e) => setFormData({...formData, linkUrl: e.target.value})} 
                                                placeholder="https://example.com/dosya.pdf" 
                                                className="h-12 text-center font-medium rounded-xl border-fuchsia-200 focus-visible:ring-fuchsia-500" 
                                            />
                                        </div>
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </div>
                        
                        <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                            <input 
                                type="checkbox" 
                                id="isPublished" 
                                checked={formData.isPublished} 
                                onChange={(e) => setFormData({...formData, isPublished: e.target.checked})} 
                                className="h-5 w-5 rounded border-slate-300 text-blue-600" 
                            />
                            <label htmlFor="isPublished" className="text-sm font-bold text-slate-700 cursor-pointer">
                                Yayına al (Herkes görebilir)
                            </label>
                        </div>
                    </div>
                    
                    <DialogFooter className="p-4 border-t border-slate-100 bg-slate-50">
                        <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="rounded-xl font-semibold px-6">İptal</Button>
                        <Button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold px-8 shadow-md">
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                            {isSaving ? "Kaydediliyor..." : "Kaydet"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
                <DialogContent className="max-w-md rounded-3xl bg-white text-slate-900">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2"><FolderOpen className="h-5 w-5 text-blue-500" /> Klasör Listesi</DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="max-h-[50vh] pr-4">
                        <div className="space-y-2">
                            {allCategories.map(cat => (
                                <div key={cat} className="group flex items-center justify-between p-2 hover:bg-slate-100 rounded-xl px-3 transition-colors">
                                    <div className="flex items-center gap-3" style={getFolderIndentStyle(cat)}>
                                        <Folder className="h-4 w-4 text-sky-500" />
                                        <span className="text-sm font-bold text-slate-700">{getFolderName(cat)}</span>
                                    </div>
                                    {cat !== 'Genel' && (
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100" onClick={() => handleCategoryDelete(cat)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </DialogContent>
            </Dialog>

            <Dialog open={isMoveDialogOpen} onOpenChange={setIsMoveDialogOpen}>
                <DialogContent className="max-w-md rounded-3xl bg-white text-slate-900">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2"><Settings className="h-5 w-5 text-blue-500" /> Konumu Değiştir</DialogTitle>
                    </DialogHeader>
                    <div className="p-4 space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-600 uppercase">Yeni Klasör Yolu</label>
                            <Input 
                                value={movingPage?.category || ""} 
                                onChange={(e) => setMovingPage({...movingPage, category: e.target.value})}
                                placeholder="Klasör yolu girin..."
                                className="rounded-xl h-11"
                            />
                        </div>
                    </div>
                    <DialogFooter className="p-4 pt-0">
                        <Button variant="ghost" onClick={() => setIsMoveDialogOpen(false)}>İptal</Button>
                        <Button onClick={() => handleMove(movingPage.category)} disabled={isSaving} className="bg-blue-600 text-white rounded-xl px-6">Taşı</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}