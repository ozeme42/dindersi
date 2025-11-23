

"use client"

import { useState, useEffect } from "react";
import isEqual from 'lodash.isequal';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, PlusCircle, Trash2 } from 'lucide-react';
import type { ActivityItem } from '@/lib/types';
import { ScrollArea } from "./ui/scroll-area";

const getInitialFormData = (item: Partial<ActivityItem> | null) => {
    const initialContent = item?.content || {};
    const categories = Array.isArray(initialContent.categories)
        ? initialContent.categories.map(c => (typeof c === 'string' ? { value: c } : c))
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
            <DialogContent className="max-w-2xl h-[90vh] flex flex-col p-0">
                <DialogHeader className="p-6 pb-2 border-b">
                    <DialogTitle>{item?.id && !item.id.startsWith('new-') ? 'Veri Öğesini Düzenle' : 'Yeni Veri Öğesi Ekle'}</DialogTitle>
                </DialogHeader>
                <ScrollArea className="flex-1 overflow-y-auto">
                <div className="grid gap-4 p-6">
                    <div className="space-y-2">
                         <Label htmlFor="type">Veri Tipi</Label>
                         <Select onValueChange={(v) => handleValueChange('type', v)} value={formData.type}>
                            <SelectTrigger id="type"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="concept">Kavram</SelectItem>
                                <SelectItem value="definition">Tanım</SelectItem>
                                <SelectItem value="sentence">Cümle</SelectItem>
                                <SelectItem value="categorization">Kategorizasyon</SelectItem>
                                <SelectItem value="sorting">Olay Sıralama</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {formData.type === 'concept' && (
                         <div className="space-y-2">
                            <Label htmlFor="content.text">Kavram</Label>
                            <Input id="content.text" value={formData.content?.text || ''} onChange={(e) => handleValueChange('content.text', e.target.value)} />
                         </div>
                    )}
                    {formData.type === 'sentence' && (
                         <div className="space-y-2">
                            <Label htmlFor="content.text-sentence">Cümle</Label>
                            <Textarea id="content.text-sentence" value={formData.content?.text || ''} onChange={(e) => handleValueChange('content.text', e.target.value)} />
                         </div>
                    )}
                    {formData.type === 'definition' && (
                         <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="content.term">Kavram</Label>
                                <Input id="content.term" value={formData.content?.term || ''} onChange={(e) => handleValueChange('content.term', e.target.value)} />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="content.definition">Tanım</Label>
                                <Textarea id="content.definition" value={formData.content?.definition || ''} onChange={(e) => handleValueChange('content.definition', e.target.value)} />
                            </div>
                         </div>
                    )}
                    {formData.type === 'categorization' && (
                        <div className="space-y-4 border p-4 rounded-lg">
                            <div className="space-y-2">
                                <Label htmlFor="content.title">Oyun Başlığı</Label>
                                <Input id="content.title" value={formData.content?.title || ''} onChange={(e) => handleValueChange('content.title', e.target.value)}/>
                            </div>
                            <div className="space-y-2">
                                <Label>Kategoriler</Label>
                                {(formData.content?.categories || []).map((field: any, index: number) => (
                                    <div key={index} className="flex gap-2">
                                        <Input value={field.value} onChange={(e) => handleArrayChange('categories', index, 'value', e.target.value)} placeholder={`Kategori ${index + 1}`}/>
                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeFromArray('categories', index)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                    </div>
                                ))}
                                <Button type="button" variant="outline" size="sm" onClick={() => addToArray('categories')}><PlusCircle className="mr-2 h-4 w-4"/>Kategori Ekle</Button>
                            </div>
                            <div className="space-y-2">
                                <Label>Öğeler</Label>
                                {(formData.content?.items || []).map((field: any, index: number) => (
                                     <div key={index} className="grid grid-cols-12 gap-2 items-center">
                                        <Input value={field.text} onChange={e => handleArrayChange('items', index, 'text', e.target.value)} placeholder={`Öğe ${index + 1}`} className="col-span-6"/>
                                        <Select onValueChange={(v) => handleArrayChange('items', index, 'category', v)} value={field.category}>
                                            <SelectTrigger className="col-span-5"><SelectValue placeholder="Kategori Seç..."/></SelectTrigger>
                                            <SelectContent>
                                                {(formData.content?.categories || []).map((cat: any) => cat.value && <SelectItem key={cat.value} value={cat.value}>{cat.value}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeFromArray('items', index)} className="col-span-1"><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                    </div>
                                ))}
                                 <Button type="button" variant="outline" size="sm" onClick={() => addToArray('items')}><PlusCircle className="mr-2 h-4 w-4"/>Öğe Ekle</Button>
                            </div>
                        </div>
                    )}
                    {formData.type === 'sorting' && (
                         <div className="space-y-4 border p-4 rounded-lg">
                             <div className="space-y-2">
                                <Label htmlFor="content.title">Oyun Başlığı</Label>
                                <Input id="content.title" value={formData.content?.title || ''} onChange={(e) => handleValueChange('content.title', e.target.value)}/>
                            </div>
                            <div className="space-y-2">
                                <Label>Sıralanacak Cümleler</Label>
                                <p className="text-xs text-muted-foreground">Cümleleri doğru sırayla girin. Oyun sırasında karıştırılacaktır.</p>
                                {(formData.content?.items as string[] || []).map((sentence: string, index: number) => (
                                    <div key={index} className="flex gap-2">
                                        <Textarea value={sentence} onChange={(e) => handleArrayChange('items', index, null, e.target.value)} placeholder={`Cümle ${index + 1}`}/>
                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeFromArray('items', index)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                    </div>
                                ))}
                                <Button type="button" variant="outline" size="sm" onClick={() => addToArray('items')}><PlusCircle className="mr-2 h-4 w-4"/>Cümle Ekle</Button>
                            </div>
                         </div>
                    )}
                </div>
                </ScrollArea>
                <DialogFooter className="p-6 pt-2 border-t">
                    <DialogClose asChild><Button type="button" variant="ghost">İptal</Button></DialogClose>
                    <Button type="button" onClick={handleSubmit} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Kaydet
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
