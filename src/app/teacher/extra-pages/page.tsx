'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
    Plus, Search, Edit2, Trash2, Globe, Eye, EyeOff, 
    Loader2, MoreVertical, LayoutGrid, Tag, Settings2,
    ChevronRight, Save, X, Move, FolderPlus, Folder
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
    Dialog, DialogContent, DialogHeader, DialogTitle, 
    DialogFooter, DialogDescription, DialogClose
} from '@/components/ui/dialog';
import { 
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
    DropdownMenuTrigger, DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
    getExtraPages, saveExtraPage, deleteExtraPage, 
    renameExtraPageCategory, deleteExtraPageCategory, moveExtraPage 
} from '@/app/teacher/extra-pages/actions';
import Link from 'next/link';
import { 
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

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

    // Kategorileri hiyerarşik olarak topla
    const allCategories = useMemo(() => {
        const cats = new Set<string>();
        pages.forEach(p => {
            const cat = p.category || 'Genel';
            cats.add(cat);
            // Parçaları da ekle (A/B/C -> A, A/B, A/B/C)
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
            toast({ title: "Başarılı", description: `Kategori ve alt kategorileri temizlendi. ${res.count} sayfa 'Genel' altına taşındı.` });
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
                        <p className="text-slate-500 text-sm">Alt klasörler oluşturun ve dökümanları taşıyın.</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={() => setIsCategoryDialogOpen(true)} variant="outline" className="rounded-xl gap-2">
                        <Settings2 className="h-4 w-4" /> Klasör Yönetimi
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
                        placeholder="Sayfa adı veya yol ara..." 
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
                                        <DropdownMenuContent align="end" className="rounded-xl w-44">
                                            <DropdownMenuItem onClick={() => handleOpenDialog(page)} className="gap-2 cursor-pointer">
                                                <Edit2 className="h-4 w-4" /> Düzenle
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => { setMovingPage(page); setIsMoveDialogOpen(true); }} className="gap-2 cursor-pointer">
                                                <Move className="h-4 w-4" /> Başka Klasöre Taşı
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
                                <CardDescription className="flex items-center gap-1 mt-1 text-[10px] uppercase font-bold tracking-tight">
                                    <Folder className="h-3 w-3 text-amber-500" /> {page.category || 'Genel'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-slate-500 line-clamp-2 min-h-[2.5rem]">
                                    {page.description || "Açıklama belirtilmemiş."}
                                </p>
                                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                                    <span>GÜNCELLEME: {page.updatedAt ? new Date(page.updatedAt).toLocaleDateString('tr-TR') : '-'}</span>
                                    <ChevronRight className="h-4 w-4 text-indigo-300 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-slate-200">
                    <LayoutGrid className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900">Döküman Bulunamadı</h3>
                </div>
            )}

            {/* Sayfa Düzenleme/Ekleme Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-[2rem]">
                    <DialogHeader>
                        <DialogTitle className="text-2xl">{editingPage ? "Sayfayı Düzenle" : "Yeni Sayfa Oluştur"}</DialogTitle>
                        <DialogDescription>Alt klasörler için '/' karakterini kullanın (Örn: Rehberlik/Sınav Hazırlık/LGS).</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-6 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Sayfa Başlığı</label>
                                <Input value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} placeholder="Örn: Rehberlik İlkeleri" className="rounded-xl" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Kategori Yolu (Klasör/Alt Klasör)</label>
                                <div className="relative">
                                    <Input value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} placeholder="Örn: Rehberlik/Materyal" className="rounded-xl pr-10" />
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-slate-400 hover:text-indigo-600"><Tag className="h-4 w-4" /></Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-64 max-h-[300px] overflow-y-auto rounded-xl">
                                                <div className="px-2 py-1.5 text-[10px] font-bold text-slate-400 uppercase">Mevcut Klasörler</div>
                                                {allCategories.map(cat => (
                                                    <DropdownMenuItem key={cat} onClick={() => setFormData({...formData, category: cat})} className="cursor-pointer text-xs">
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
                            <label className="text-sm font-bold text-slate-700">Kısa Açıklama</label>
                            <Textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder="Kısa özet..." className="rounded-xl h-20" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">HTML İçeriği</label>
                            <Textarea value={formData.htmlContent} onChange={(e) => setFormData({...formData, htmlContent: e.target.value})} placeholder="<div class='p-4'>...</div>" className="rounded-xl font-mono text-sm h-64" />
                        </div>
                        <div className="flex items-center gap-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <input type="checkbox" id="isPublished" checked={formData.isPublished} onChange={(e) => setFormData({...formData, isPublished: e.target.checked})} className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                            <label htmlFor="isPublished" className="text-sm font-semibold text-slate-700 cursor-pointer">Hemen yayınla</label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="rounded-xl">İptal</Button>
                        <Button onClick={handleSave} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl min-w-[120px]">
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Kaydet"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Klasör/Kategori Yönetimi Dialog */}
            <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
                <DialogContent className="max-w-md rounded-[2rem]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2"><Settings2 className="h-5 w-5 text-indigo-600" /> Klasörleri Yönet</DialogTitle>
                        <DialogDescription>Klasör adlarını güncelleyin. Alt klasörler otomatik taşınır.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <ScrollArea className="max-h-[50vh] pr-4">
                            {allCategories.map(cat => (
                                <CategoryManagementItem 
                                    key={cat} 
                                    name={cat} 
                                    onRename={async (newName) => {
                                        const res = await renameExtraPageCategory(cat, newName);
                                        if (res.success) { fetchPages(); toast({ title: "Güncellendi", description: `${res.count} öğe taşındı.` }); }
                                    }} 
                                    onDelete={() => handleCategoryDelete(cat)}
                                />
                            ))}
                        </ScrollArea>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Taşıma Dialog */}
            <Dialog open={isMoveDialogOpen} onOpenChange={setIsMoveDialogOpen}>
                <DialogContent className="max-w-md rounded-[2rem]">
                    <DialogHeader>
                        <DialogTitle>Dökümanı Taşı</DialogTitle>
                        <DialogDescription>"{movingPage?.title}" dökümanı için yeni bir yol seçin veya yazın.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <Input 
                            value={movingPage?.category || ""} 
                            onChange={(e) => setMovingPage({...movingPage, category: e.target.value})}
                            placeholder="Yeni kategori yolu..."
                            className="rounded-xl"
                        />
                        <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Mevcut Klasörler</div>
                        <ScrollArea className="h-48 border rounded-xl p-2 bg-slate-50">
                            {allCategories.map(cat => (
                                <button 
                                    key={cat} 
                                    onClick={() => setMovingPage({...movingPage, category: cat})}
                                    className={cn(
                                        "w-full text-left p-2 rounded-lg text-xs transition-colors hover:bg-indigo-50 flex items-center gap-2",
                                        movingPage?.category === cat ? "bg-indigo-100 text-indigo-700 font-bold" : "text-slate-600"
                                    )}
                                >
                                    <Folder className="h-3.5 w-3.5 text-amber-500" /> {cat}
                                </button>
                            ))}
                        </ScrollArea>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsMoveDialogOpen(false)}>İptal</Button>
                        <Button onClick={() => handleMove(movingPage.category)} className="bg-indigo-600 text-white rounded-xl">Taşımayı Onayla</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function CategoryManagementItem({ name, onRename, onDelete }: { name: string, onRename: (n: string) => Promise<void>, onDelete: () => Promise<void> }) {
    const [isEditing, setIsEditing] = useState(false);
    const [newName, setNewName] = useState(name);
    const handleSave = async () => {
        if (!newName.trim() || newName === name) { setIsEditing(false); return; }
        await onRename(newName.trim());
        setIsEditing(false);
    };
    return (
        <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100 mb-2 group">
            {isEditing ? (
                <div className="flex items-center gap-1 w-full">
                    <Input value={newName} onChange={e => setNewName(e.target.value)} className="h-8 rounded-lg text-xs" autoFocus onKeyDown={e => e.key === 'Enter' && handleSave()} />
                    <Button size="icon" variant="ghost" onClick={handleSave} className="h-8 w-8 text-emerald-600"><Save className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => { setIsEditing(false); setNewName(name); }} className="h-8 w-8 text-slate-400"><X className="h-4 w-4" /></Button>
                </div>
            ) : (
                <>
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-2"><Folder className="h-3.5 w-3.5 text-amber-500" /> {name}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="icon" variant="ghost" onClick={() => setIsEditing(true)} className="h-7 w-7 text-slate-400 hover:text-indigo-600"><Edit2 className="h-3.5 w-3.5" /></Button>
                        {name !== 'Genel' && (
                            <AlertDialog>
                                <AlertDialogTrigger asChild><Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></Button></AlertDialogTrigger>
                                <AlertDialogContent className="bg-slate-900 border-white/10 text-white">
                                    <AlertDialogHeader><AlertDialogTitle>Klasörü Sil</AlertDialogTitle><AlertDialogDescription className="text-slate-400">"{name}" klasörünü ve varsa alt klasörlerini silmek istediğinize emin misiniz? Dökümanlar "Genel" klasörüne taşınacaktır.</AlertDialogDescription></AlertDialogHeader>
                                    <AlertDialogFooter><AlertDialogCancel className="bg-transparent text-slate-400">İptal</AlertDialogCancel><AlertDialogAction onClick={onDelete} className="bg-red-600 hover:bg-red-500">Sil ve Taşı</AlertDialogAction></AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
