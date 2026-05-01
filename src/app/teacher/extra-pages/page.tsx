'use client';

import React, { useState, useEffect } from 'react';
import { 
    Plus, Search, Edit2, Trash2, Globe, Eye, EyeOff, 
    Loader2, MoreVertical, LayoutGrid, Tag, Settings2,
    ChevronRight, Save, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
    Dialog, DialogContent, DialogHeader, DialogTitle, 
    DialogTrigger, DialogFooter, DialogDescription 
} from '@/components/ui/dialog';
import { 
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
    DropdownMenuTrigger, DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
    getExtraPages, saveExtraPage, deleteExtraPage, 
    renameExtraPageCategory, deleteExtraPageCategory 
} from '@/app/teacher/extra-pages/actions';
import Link from 'next/link';
import { 
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger 
} from "@/components/ui/alert-dialog";

export default function ExtraPagesManagement() {
    const [pages, setPages] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [searchTerm, setSearchArea] = useState("");
    
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
    
    const [editingPage, setEditingPage] = useState<any>(null);
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        category: "",
        htmlContent: "",
        isPublished: true
    });

    const { toast } = useToast();

    const categories = Array.from(new Set(pages.map(p => p.category || 'Genel'))).sort();

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

    const handleCategoryDelete = async (name: string) => {
        if (name === 'Genel') {
            toast({ title: "Hata", description: "'Genel' kategorisi silinemez.", variant: "destructive" });
            return;
        }
        const res = await deleteExtraPageCategory(name);
        if (res.success) {
            toast({ title: "Başarılı", description: "Kategori silindi ve içerikler 'Genel' altına taşındı." });
            fetchPages();
        } else {
            toast({ title: "Hata", description: res.error, variant: "destructive" });
        }
    };

    const filteredPages = pages.filter(p => 
        p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.category?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="container mx-auto p-4 md:p-8 space-y-8 min-h-screen bg-slate-50/50">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-100 rounded-2xl text-indigo-600">
                        <Globe className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Ekstra Sayfalar</h1>
                        <p className="text-slate-500 text-sm">Bağımsız dökümanları ve özel içerikleri yönetin.</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={() => setIsCategoryDialogOpen(true)} variant="outline" className="rounded-xl gap-2">
                        <Tag className="h-4 w-4" /> Kategorileri Düzenle
                    </Button>
                    <Button onClick={() => handleOpenDialog()} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl gap-2 shadow-lg shadow-indigo-200">
                        <Plus className="h-4 w-4" /> Yeni Sayfa
                    </Button>
                </div>
            </div>

            <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input 
                        placeholder="Sayfa adı veya kategori ara..." 
                        value={searchTerm}
                        onChange={(e) => setSearchArea(e.target.value)}
                        className="pl-10 bg-slate-50 border-none rounded-xl focus-visible:ring-indigo-500"
                    />
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-indigo-500" /></div>
            ) : filteredPages.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredPages.map((page) => (
                        <Card key={page.id} className="group overflow-hidden rounded-[2rem] border-slate-200 hover:shadow-xl transition-all duration-300">
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
                                        <DropdownMenuContent align="end" className="rounded-xl w-40">
                                            <DropdownMenuItem onClick={() => handleOpenDialog(page)} className="gap-2 cursor-pointer">
                                                <Edit2 className="h-4 w-4" /> Düzenle
                                            </DropdownMenuItem>
                                            <DropdownMenuItem asChild className="gap-2 cursor-pointer">
                                                <Link href={`/extra/${page.id}`} target="_blank">
                                                    <Globe className="h-4 w-4" /> Görüntüle
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onClick={() => handleDelete(page.id)} className="gap-2 cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50">
                                                <Trash2 className="h-4 w-4" /> Sil
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                                <CardTitle className="text-xl line-clamp-1 group-hover:text-indigo-600 transition-colors">{page.title}</CardTitle>
                                <CardDescription className="flex items-center gap-1 mt-1">
                                    <Tag className="h-3 w-3" /> {page.category || 'Genel'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-slate-500 line-clamp-2 min-h-[2.5rem]">
                                    {page.description || "Açıklama belirtilmemiş."}
                                </p>
                                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                                    <span>Güncelleme: {page.updatedAt ? new Date(page.updatedAt).toLocaleDateString('tr-TR') : '-'}</span>
                                    <ChevronRight className="h-4 w-4 text-indigo-300 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-slate-200">
                    <LayoutGrid className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900">Sonuç Bulunamadı</h3>
                    <p className="text-slate-500 max-w-xs mx-auto mt-1">Arama kriterlerinize uygun sayfa bulunamadı veya henüz sayfa eklemediniz.</p>
                </div>
            )}

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-[2rem]">
                    <DialogHeader>
                        <DialogTitle className="text-2xl">{editingPage ? "Sayfayı Düzenle" : "Yeni Sayfa Oluştur"}</DialogTitle>
                        <DialogDescription>HTML kodu kullanarak zengin içerikli bir döküman hazırlayın.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-6 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Sayfa Başlığı</label>
                                <Input 
                                    value={formData.title} 
                                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                                    placeholder="Örn: Rehberlik İlkeleri"
                                    className="rounded-xl"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Kategori</label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Input 
                                            value={formData.category} 
                                            onChange={(e) => setFormData({...formData, category: e.target.value})}
                                            placeholder="Kategori yazın veya seçin..."
                                            className="rounded-xl pr-10"
                                        />
                                        <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-slate-400 hover:text-indigo-600">
                                                        <Tag className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-48 rounded-xl">
                                                    <div className="px-2 py-1.5 text-[10px] font-bold text-slate-400 uppercase">Mevcut Kategoriler</div>
                                                    {categories.length > 0 ? categories.map(cat => (
                                                        <DropdownMenuItem key={cat} onClick={() => setFormData({...formData, category: cat})} className="cursor-pointer">
                                                            {cat}
                                                        </DropdownMenuItem>
                                                    )) : <div className="px-2 py-2 text-xs text-slate-500 italic">Kategori yok</div>}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Kısa Açıklama</label>
                            <Textarea 
                                value={formData.description} 
                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                                placeholder="Liste ekranında görünecek kısa özet..."
                                className="rounded-xl resize-none h-20"
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-bold text-slate-700">HTML İçeriği</label>
                                <Badge variant="outline" className="text-[10px] uppercase">Tailwind CSS Desteklenir</Badge>
                            </div>
                            <Textarea 
                                value={formData.htmlContent} 
                                onChange={(e) => setFormData({...formData, htmlContent: e.target.value})}
                                placeholder="<div class='p-4 bg-blue-50'>...</div>"
                                className="rounded-xl font-mono text-sm h-64 border-indigo-100 focus-visible:ring-indigo-500"
                            />
                        </div>
                        <div className="flex items-center gap-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <input 
                                type="checkbox" 
                                id="isPublished"
                                checked={formData.isPublished}
                                onChange={(e) => setFormData({...formData, isPublished: e.target.checked})}
                                className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <label htmlFor="isPublished" className="text-sm font-semibold text-slate-700 cursor-pointer">
                                Bu sayfayı hemen yayınla (Ziyaretçiler görebilsin)
                            </label>
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="rounded-xl">İptal</Button>
                        <Button onClick={handleSave} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl min-w-[120px]">
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-2" /> Kaydet</>}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
                <DialogContent className="max-w-md rounded-[2rem]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Settings2 className="h-5 w-5 text-indigo-600" /> Kategorileri Yönet
                        </DialogTitle>
                        <DialogDescription>Mevcut kategori isimlerini güncelleyin veya kaldırın.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        {categories.length > 0 ? (
                            <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                                {categories.map(cat => (
                                    <CategoryItem 
                                        key={cat} 
                                        name={cat} 
                                        onRename={async (newName) => {
                                            const res = await renameExtraPageCategory(cat, newName);
                                            if (res.success) {
                                                toast({ title: "Başarılı", description: "Kategori adı güncellendi." });
                                                fetchPages();
                                            } else {
                                                toast({ title: "Hata", description: res.error, variant: "destructive" });
                                            }
                                        }} 
                                        onDelete={() => handleCategoryDelete(cat)}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-slate-400 italic">Henüz kategori bulunmuyor.</div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setIsCategoryDialogOpen(false)} className="w-full rounded-xl">Kapat</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function CategoryItem({ 
    name, onRename, onDelete 
}: { 
    name: string, 
    onRename: (newName: string) => Promise<void>,
    onDelete: () => Promise<void>
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [newName, setNewName] = useState(name);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleSave = async () => {
        if (!newName.trim() || newName === name) {
            setIsEditing(false);
            return;
        }
        setIsProcessing(true);
        await onRename(newName.trim());
        setIsProcessing(false);
        setIsEditing(false);
    };

    return (
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 group">
            {isEditing ? (
                <div className="flex items-center gap-2 w-full">
                    <Input 
                        value={newName} 
                        onChange={(e) => setNewName(e.target.value)}
                        className="h-8 rounded-lg text-sm"
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                    />
                    <Button size="icon" variant="ghost" onClick={handleSave} disabled={isProcessing} className="h-8 w-8 text-emerald-600 hover:bg-emerald-50">
                        {isProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => { setIsEditing(false); setNewName(name); }} className="h-8 w-8 text-slate-400">
                        <X className="h-3.5 w-3.5" />
                    </Button>
                </div>
            ) : (
                <>
                    <span className="text-sm font-semibold text-slate-700">{name}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="icon" variant="ghost" onClick={() => setIsEditing(true)} className="h-8 w-8 text-slate-400 hover:text-indigo-600">
                            <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        
                        {name !== 'Genel' && (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-red-600">
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="bg-slate-900 border-white/10 text-white">
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Kategoriyi Sil</AlertDialogTitle>
                                        <AlertDialogDescription className="text-slate-400">
                                            "{name}" kategorisini silmek istediğinize emin misiniz? Bu kategorideki tüm dökümanlar "Genel" kategorisine taşınacaktır.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel className="bg-transparent text-slate-400">İptal</AlertDialogCancel>
                                        <AlertDialogAction onClick={onDelete} className="bg-red-600 hover:bg-red-500">Evet, Sil</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
