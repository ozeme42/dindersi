'use client';

import { useState, useEffect } from "react";
import isEqual from 'lodash.isequal';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, PlusCircle, Trash2, Save, FileEdit, Database, List } from 'lucide-react';
import type { ActivityItem } from '@/lib/types';
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const getInitialFormData = (item: Partial<ActivityItem> | null) => {
    const initialContent = item?.content || {};
    const categories = Array.isArray(initialContent.categories)
        ? initialContent.categories.map((c: any) => (typeof c === 'string' ? { value: c } : c))
        : [];
    
    return {
        id: item?.id || `new-${Date.now()}`,
        type: item?.type || 'concept',
        content: {
            text: initialContent.text || '',
            term: initialContent.term || '',
            definition: initialContent.definition || '',
            title: initialContent.title || '',
            categories: categories,
            items: initialContent.items || [],
        },
        courseId: item?.courseId || '',
        unitId: item?.unitId || '',
        topicId: item?.topicId || '',
    };
};

type ActivityItemEditorProps = {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    item: Partial<ActivityItem> | null;
    onSave: (item: Partial<ActivityItem>) => void;
    isSaving: boolean;
}

export function ActivityItemEditorDialog({ isOpen, onOpenChange, item, onSave, isSaving }: ActivityItemEditorProps) {
    const [formData, setFormData] = useState<Partial<ActivityItem>>({});
    const [initialData, setInitialData] = useState<Partial<ActivityItem>>({});

    useEffect(() => {
        const initial = getInitialFormData(item);
        setFormData(initial);
        setInitialData(initial);
    }, [item, isOpen]);

    const isDirty = !isEqual(initialData, formData);

    const handleValueChange = (path: string, value: any) => {
        setFormData(prev => {
            const keys = path.split('.');
            let newFormData: any = { ...prev };
            let currentLevel = newFormData;

            for (let i = 0; i < keys.length - 1; i++) {
                currentLevel = currentLevel[keys[i]];
            }
            currentLevel[keys[keys.length - 1]] = value;
            return newFormData;
        });
    };

    const handleArrayChange = (arrayPath: string, index: number, fieldPath: string | null, value: any) => {
        setFormData(prev => {
            const newFormData: any = { ...prev };
            let array = newFormData.content[arrayPath];
            if (Array.isArray(array)) {
                const newArray = [...array];
                if (fieldPath) { // It's an array of objects
                    newArray[index] = { ...newArray[index], [fieldPath]: value };
                } else { // It's an array of strings
                    newArray[index] = value;
                }
                newFormData.content[arrayPath] = newArray;
            }
            return newFormData;
        });
    };
    
    const addToArray = (path: 'categories' | 'items') => {
        setFormData(prev => {
            const newFormData: any = { ...prev };
            if (!newFormData.content) newFormData.content = {};
            
            if (path === 'categories') {
                 if (!newFormData.content.categories) newFormData.content.categories = [];
                 newFormData.content.categories = [...newFormData.content.categories, {value: ''}];
            } else if (path === 'items') {
                if (!newFormData.content.items) newFormData.content.items = [];
                const newItem = formData.type === 'sorting' ? '' : {text: '', category: ''};
                newFormData.content.items = [...newFormData.content.items, newItem];
            }
            return newFormData;
        });
    };
    
    const removeFromArray = (path: 'categories' | 'items', indexToRemove: number) => {
         setFormData(prev => {
            const newFormData: any = { ...prev };
             if (!newFormData.content?.[path]) return newFormData;
            
            newFormData.content[path] = newFormData.content[path].filter((_: any, index: number) => index !== indexToRemove);
            return newFormData;
        });
    };

    const handleSubmit = () => {
        onSave(formData);
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl h-[90vh] flex flex-col p-0 bg-slate-950 border-white/10 text-slate-100 shadow-2xl">
                
                {/* Header */}
                <DialogHeader className="p-6 pb-4 border-b border-white/5 bg-slate-900/50 flex flex-row items-center justify-between">
                    <DialogTitle className="flex items-center gap-3 text-2xl font-black uppercase tracking-tight text-white">
                        <div className="p-2 bg-teal-500/20 rounded-lg border border-teal-500/30">
                            <Database className="h-6 w-6 text-teal-400" />
                        </div>
                        {item?.id && !item.id.startsWith('new-') ? 'Veri Öğesini Düzenle' : 'Yeni Veri Öğesi Ekle'}
                    </DialogTitle>
                </DialogHeader>

                <ScrollArea className="flex-1 overflow-y-auto">
                    <div className="grid gap-6 p-6">
                        
                        {/* Tip Seçimi */}
                        <div className="space-y-2">
                             <Label htmlFor="type" className="text-slate-300 font-bold uppercase tracking-wider text-xs">Veri Tipi</Label>
                             <Select onValueChange={(v) => handleValueChange('type', v)} value={formData.type}>
                                <SelectTrigger id="type" className="bg-slate-900 border-white/10 text-white h-12">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-white/10 text-white">
                                    <SelectItem value="concept">Kavram</SelectItem>
                                    <SelectItem value="definition">Tanım</SelectItem>
                                    <SelectItem value="sentence">Cümle</SelectItem>
                                    <SelectItem value="categorization">Kategorizasyon</SelectItem>
                                    <SelectItem value="sorting">Olay Sıralama</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Form İçerikleri - Dinamik */}
                        <div className="bg-slate-900/40 p-4 rounded-xl border border-white/5 space-y-4">
                            {formData.type === 'concept' && (
                                 <div className="space-y-2">
                                    <Label htmlFor="content.text" className="text-slate-300">Kavram</Label>
                                    <Input id="content.text" value={formData.content?.text || ''} onChange={(e) => handleValueChange('content.text', e.target.value)} className="bg-slate-950 border-white/10 text-white h-11 focus:border-teal-500/50"/>
                                 </div>
                            )}
                            {formData.type === 'sentence' && (
                                 <div className="space-y-2">
                                    <Label htmlFor="content.text-sentence" className="text-slate-300">Cümle</Label>
                                    <Textarea id="content.text-sentence" value={formData.content?.text || ''} onChange={(e) => handleValueChange('content.text', e.target.value)} className="bg-slate-950 border-white/10 text-white min-h-[100px] focus:border-teal-500/50"/>
                                 </div>
                            )}
                            {formData.type === 'definition' && (
                                 <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="content.term" className="text-slate-300">Kavram</Label>
                                        <Input id="content.term" value={formData.content?.term || ''} onChange={(e) => handleValueChange('content.term', e.target.value)} className="bg-slate-950 border-white/10 text-white h-11 focus:border-teal-500/50"/>
                                    </div>
                                     <div className="space-y-2">
                                        <Label htmlFor="content.definition" className="text-slate-300">Tanım</Label>
                                        <Textarea id="content.definition" value={formData.content?.definition || ''} onChange={(e) => handleValueChange('content.definition', e.target.value)} className="bg-slate-950 border-white/10 text-white min-h-[100px] focus:border-teal-500/50"/>
                                    </div>
                                 </div>
                            )}
                            {formData.type === 'categorization' && (
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="content.title" className="text-slate-300">Oyun Başlığı</Label>
                                        <Input id="content.title" value={formData.content?.title || ''} onChange={(e) => handleValueChange('content.title', e.target.value)} className="bg-slate-950 border-white/10 text-white h-11 focus:border-teal-500/50"/>
                                    </div>
                                    
                                    <div className="space-y-3 p-4 bg-slate-950/50 rounded-lg border border-white/5">
                                        <Label className="text-slate-300 flex items-center gap-2"><List className="h-4 w-4"/> Kategoriler</Label>
                                        <div className="grid gap-2">
                                            {(formData.content?.categories || []).map((field: any, index: number) => (
                                                <div key={index} className="flex gap-2">
                                                    <Input value={field.value} onChange={(e) => handleArrayChange('categories', index, 'value', e.target.value)} placeholder={`Kategori ${index + 1}`} className="bg-slate-900 border-white/10 text-white h-10"/>
                                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeFromArray('categories', index)} className="text-slate-500 hover:text-red-400"><Trash2 className="h-4 w-4"/></Button>
                                                </div>
                                            ))}
                                        </div>
                                        <Button type="button" variant="outline" size="sm" onClick={() => addToArray('categories')} className="border-white/10 text-teal-400 hover:text-teal-300 hover:bg-teal-900/20"><PlusCircle className="mr-2 h-4 w-4"/>Kategori Ekle</Button>
                                    </div>

                                    <div className="space-y-3 p-4 bg-slate-950/50 rounded-lg border border-white/5">
                                        <Label className="text-slate-300 flex items-center gap-2"><List className="h-4 w-4"/> Öğeler</Label>
                                        <div className="grid gap-2">
                                            {(formData.content?.items || []).map((field: any, index: number) => (
                                                 <div key={index} className="grid grid-cols-12 gap-2 items-center">
                                                    <Input value={field.text} onChange={e => handleArrayChange('items', index, 'text', e.target.value)} placeholder={`Öğe ${index + 1}`} className="col-span-6 bg-slate-900 border-white/10 text-white h-10"/>
                                                    <Select onValueChange={(v) => handleArrayChange('items', index, 'category', v)} value={field.category}>
                                                        <SelectTrigger className="col-span-5 bg-slate-900 border-white/10 text-white h-10"><SelectValue placeholder="Kategori..."/></SelectTrigger>
                                                        <SelectContent className="bg-slate-900 border-white/10 text-white">
                                                            {(formData.content?.categories || []).map((cat: any) => cat.value && <SelectItem key={cat.value} value={cat.value}>{cat.value}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeFromArray('items', index)} className="col-span-1 text-slate-500 hover:text-red-400"><Trash2 className="h-4 w-4"/></Button>
                                                 </div>
                                            ))}
                                        </div>
                                         <Button type="button" variant="outline" size="sm" onClick={() => addToArray('items')} className="border-white/10 text-teal-400 hover:text-teal-300 hover:bg-teal-900/20"><PlusCircle className="mr-2 h-4 w-4"/>Öğe Ekle</Button>
                                    </div>
                                </div>
                            )}
                            {formData.type === 'sorting' && (
                                 <div className="space-y-6">
                                     <div className="space-y-2">
                                        <Label htmlFor="content.title" className="text-slate-300">Oyun Başlığı</Label>
                                        <Input id="content.title" value={formData.content?.title || ''} onChange={(e) => handleValueChange('content.title', e.target.value)} className="bg-slate-950 border-white/10 text-white h-11 focus:border-teal-500/50"/>
                                    </div>
                                    <div className="space-y-3 p-4 bg-slate-950/50 rounded-lg border border-white/5">
                                        <Label className="text-slate-300">Sıralanacak Cümleler (Doğru Sırayla)</Label>
                                        <div className="grid gap-2">
                                            {(formData.content?.items as string[] || []).map((sentence: string, index: number) => (
                                                <div key={index} className="flex gap-2 items-start">
                                                    <span className="mt-2 text-slate-500 text-xs font-mono">{index + 1}.</span>
                                                    <Textarea value={sentence} onChange={(e) => handleArrayChange('items', index, null, e.target.value)} placeholder={`Cümle ${index + 1}`} className="bg-slate-900 border-white/10 text-white min-h-[60px]"/>
                                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeFromArray('items', index)} className="text-slate-500 hover:text-red-400 mt-1"><Trash2 className="h-4 w-4"/></Button>
                                                </div>
                                            ))}
                                        </div>
                                        <Button type="button" variant="outline" size="sm" onClick={() => addToArray('items')} className="border-white/10 text-teal-400 hover:text-teal-300 hover:bg-teal-900/20"><PlusCircle className="mr-2 h-4 w-4"/>Cümle Ekle</Button>
                                    </div>
                                 </div>
                            )}
                        </div>
                    </div>
                </ScrollArea>
                
                {/* Footer */}
                <DialogFooter className="p-6 border-t border-white/5 bg-slate-900/80 backdrop-blur-sm flex justify-end gap-3">
                    <DialogClose asChild><Button type="button" variant="ghost" className="text-slate-400 hover:text-white hover:bg-white/5">İptal</Button></DialogClose>
                    <Button type="button" onClick={handleSubmit} disabled={isSaving} className="bg-teal-600 hover:bg-teal-500 text-white font-bold px-8 shadow-lg shadow-teal-900/20">
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>} Kaydet
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}