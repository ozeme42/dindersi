'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Loader2, ArrowLeft, PlusCircle, Save, Trash2 } from 'lucide-react';
import { ActivityItemEditorDialog } from './activity-item-editor-dialog';
import { useToast } from '@/hooks/use-toast';
import type { ActivityItem } from '@/lib/types';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';

type StaticDataEditorProps = {
    topicName: string;
    topicId: string;
    initialData: ActivityItem[];
    onBack: () => void;
    saveAction: (topicId: string, data: ActivityItem[]) => Promise<{ success: boolean, error?: string }>;
}

export function StaticDataEditor({ topicName, topicId, initialData, onBack, saveAction }: StaticDataEditorProps) {
    const [data, setData] = useState<ActivityItem[]>(initialData);
    const [editingItem, setEditingItem] = useState<{ item: Partial<ActivityItem>, index: number } | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    const handleSaveItem = (itemData: Partial<ActivityItem>) => {
        if (editingItem) {
            if (editingItem.index > -1) {
                // Edit existing
                setData(prev => prev.map((item, index) => index === editingItem.index ? (itemData as ActivityItem) : item));
            } else {
                // Add new
                const newItem = { ...itemData, id: `static-${Date.now()}` } as ActivityItem;
                setData(prev => [...prev, newItem]);
            }
        }
        setEditingItem(null);
    };

    const handleDeleteItem = (indexToDelete: number) => {
        setData(prev => prev.filter((_, index) => index !== indexToDelete));
    };

    const handleSaveToFile = async () => {
        setIsSaving(true);
        const result = await saveAction(topicId, data);
        if (result.success) {
            toast({ title: 'Başarılı', description: 'Değişiklikler dosyaya kaydedildi.' });
        } else {
            toast({ title: 'Hata', description: result.error, variant: 'destructive' });
        }
        setIsSaving(false);
    };

    const renderItemContent = (item: ActivityItem) => {
        switch (item.type) {
            case 'concept': return item.content.text;
            case 'sentence': return `"${item.content.text}"`;
            case 'definition': return `${item.content.term}: ${item.content.definition}`;
            case 'categorization': return `${item.content.title} (${item.content.items?.length || 0} öğe)`;
            case 'sorting': return `${item.content.title} (${(item.content.items as string[])?.length || 0} cümle)`;
            default: return 'Bilinmeyen';
        }
    };

    return (
        <div className="w-full max-w-5xl mx-auto">
             <div className="flex items-center justify-between mb-6">
                <Button variant="ghost" onClick={onBack} className="text-slate-400 hover:text-white hover:bg-white/10">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Konu Seçimine Dön
                </Button>
                 <Button onClick={handleSaveToFile} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-900/20">
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                    Değişiklikleri Dosyaya Kaydet
                </Button>
            </div>
            
            <Card className="bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-xl">
                <CardHeader>
                    <CardTitle className="text-2xl text-white">Konu: {topicName}</CardTitle>
                    <CardDescription className="text-slate-400">
                        Bu konu için statik etkinlik verilerini yönetin. Yaptığınız değişiklikler doğrudan ilgili JSON dosyasına yazılacaktır.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="flex justify-end">
                        <Button onClick={() => setEditingItem({ item: { type: 'concept' }, index: -1 })}>
                            <PlusCircle className="mr-2 h-4 w-4"/> Yeni Veri Ekle
                        </Button>
                    </div>

                    <div className="border border-white/10 rounded-xl bg-black/20 p-4 space-y-3">
                        {data.length > 0 ? data.map((item, index) => (
                            <div key={item.id || index} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-white/5 group">
                                <div>
                                    <Badge variant="secondary" className="mb-1 text-xs">{item.type}</Badge>
                                    <p className="text-slate-200 line-clamp-2">{renderItemContent(item)}</p>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-emerald-400" onClick={() => setEditingItem({ item, index })}>
                                        <FilePenLine className="h-4 w-4"/>
                                    </Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-400"><Trash2 className="h-4 w-4"/></Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent className="bg-slate-900 border-white/10 text-white">
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Silme Onayı</AlertDialogTitle>
                                                <AlertDialogDescription className="text-slate-400">Bu öğeyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.</AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel className="bg-transparent border-white/10">İptal</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDeleteItem(index)} className="bg-destructive hover:bg-destructive/90">Evet, Sil</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </div>
                        )) : (
                            <div className="text-center py-12 text-slate-500">
                                <p>Bu konu için henüz veri eklenmemiş.</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {editingItem && (
                 <ActivityItemEditorDialog 
                    isOpen={!!editingItem} 
                    onOpenChange={(open) => !open && setEditingItem(null)} 
                    item={{...editingItem.item, topicId}}
                    onSave={handleSaveItem} 
                    isSaving={false} // This dialog just updates local state
                 />
            )}
        </div>
    )
}