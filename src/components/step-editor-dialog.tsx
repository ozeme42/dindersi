
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
// Layers ikonu buraya eklendi
import { Loader2, PlusCircle, Trash2, Save, FileEdit, Database, List, Library, ArrowLeft, ArrowRight } from 'lucide-react';
import type { ActivityItem, LessonStep, AnagramGameStep, AnagramFlashcardStep, SentenceScrambleStep, FlashcardStep, AccordionStep, ConceptExplanationStep, FitbStep, IframeStep, McqStep, ObjectiveListStep, TfStep, TrueFalseListStep, VideoStep, VisualStep, Question, ImageAsset, Course, Unit, Topic, SchoolClass } from '@/lib/types';
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn, cleanForAnagram } from "@/lib/utils";
import { LibraryImportDialog } from './library-import-dialog';
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "./ui/checkbox";
import { db } from "@/lib/firebase";
import { collection, query, getDocs, orderBy } from 'firebase/firestore';

const getInitialFormData = (item: Partial<LessonStep> | null) => {
    const initialContent = (item as any)?.content || {};
    const categories = Array.isArray(initialContent.categories)
        ? initialContent.categories.map((c: any) => (typeof c === 'string' ? { value: c } : c))
        : [];
    
    return {
        id: (item as any)?.id || `new-${Date.now()}-${Math.random()}`,
        type: item?.type || 'content',
        title: item?.title || '',
        content: {
            text: initialContent.text || '',
            term: initialContent.term || '',
            definition: initialContent.definition || '',
            title: initialContent.title || '',
            categories: categories,
            items: initialContent.items || [],
        },
        ...item, // Spread the rest of the item properties
    };
};

type StepEditorDialogProps = {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    step: LessonStep | null;
    onSave: (updatedStep: LessonStep) => void;
    isSaving: boolean;
    context?: { courseId?: string | null, unitId?: string | null, topicId?: string | null };
};

export function StepEditorDialog({ isOpen, onOpenChange, step, onSave, isSaving, context }: StepEditorDialogProps) {
    const [editedStep, setEditedStep] = useState<LessonStep | null>(step);
    const [initialData, setInitialData] = useState<Partial<LessonStep>>({});
    const [isLibraryOpen, setIsLibraryOpen] = useState(false);
    
    const { toast } = useToast();
    const [allCourses, setAllCourses] = useState<(Course & { units: (Unit & { topics: Topic[]})[]})[]>([]);
    
    useEffect(() => {
        if(isOpen && editedStep?.type === 'activityLink'){
            const fetchCourses = async () => {
                const coursesSnapshot = await getDocs(query(collection(db, "courses")));
                 const coursesData = await Promise.all(coursesSnapshot.docs.map(async (courseDoc) => {
                    const course = { id: courseDoc.id, ...courseDoc.data() } as Course & { units: (Unit & { topics: Topic[]})[] };
                    const unitsSnapshot = await getDocs(query(collection(db, `courses/${course.id}/units`)));
                    course.units = await Promise.all(unitsSnapshot.docs.map(async (unitDoc) => {
                        const unit = { id: unitDoc.id, ...unitDoc.data() } as Unit & { topics: Topic[] };
                        const topicsSnapshot = await getDocs(query(collection(db, `courses/${course.id}/units/${unit.id}/topics`)));
                        unit.topics = topicsSnapshot.docs.map(doc => ({id: doc.id, ...doc.data()}) as Topic);
                        return unit;
                    }));
                    return course;
                }));
                setAllCourses(coursesData);
            }
            fetchCourses();
        }
    }, [isOpen, editedStep?.type]);

    useEffect(() => {
        const initial = getInitialFormData(step);
        setEditedStep(initial as LessonStep);
        setInitialData(initial);
    }, [step, isOpen]);

    const isDirty = !isEqual(initialData, editedStep);

    const handleValueChange = (path: string, value: any) => {
        setEditedStep(prev => {
            if (!prev) return null;
            const keys = path.split('.');
            let newStepData: any = { ...prev };
            let currentLevel = newStepData;

            for (let i = 0; i < keys.length - 1; i++) {
                currentLevel[keys[i]] = { ...(currentLevel[keys[i]] || {}) };
                currentLevel = currentLevel[keys[i]];
            }
            currentLevel[keys[keys.length - 1]] = value;
            return newStepData;
        });
    };
    
    const handleArrayChange = (arrayPath: string, index: number, fieldPath: string | null, value: any) => {
      setEditedStep(prev => {
          if (!prev) return null;
          const newStepData: any = { ...prev };
          
          let array: any[] | undefined;
          let isContentArray = false;
    
          if (newStepData[arrayPath] && Array.isArray(newStepData[arrayPath])) {
              array = newStepData[arrayPath];
          } else if (newStepData.content && newStepData.content[arrayPath] && Array.isArray(newStepData.content[arrayPath])) {
              array = newStepData.content[arrayPath];
              isContentArray = true;
          } else {
               return prev;
          }
    
          const newArray = [...array];
          if (fieldPath) {
              newArray[index] = { ...newArray[index], [fieldPath]: value };
          } else {
              newArray[index] = value;
          }
    
          if (isContentArray) {
              if (!newStepData.content) newStepData.content = {};
              newStepData.content[arrayPath] = newArray;
          } else {
              newStepData[arrayPath] = newArray;
          }
          
          return newStepData;
      });
    };
    
    const addToArray = (path: 'categories' | 'items' | 'cards' | 'questions') => {
      setEditedStep(prev => {
          if (!prev) return null;
          const newStepData: any = { ...prev };
          
          const newItemId = `item-${Date.now()}-${Math.random()}`;
    
          let targetArray: any[] = newStepData[path] || newStepData.content?.[path] || [];
          
          let newItem: any;
          if (path === 'categories') newItem = { value: '', id: newItemId };
          else if (path === 'items' && prev.type === 'conceptExplanation') newItem = { id: newItemId, concept: 'Yeni Kavram', definition: 'Yeni Tanım' };
          else if (path === 'items' && prev.type === 'accordion') newItem = { id: newItemId, title: 'Yeni Başlık', content: 'Yeni İçerik' };
          else if (path === 'items') newItem = prev.type === 'sorting' ? '' : { text: '', category: '' };
          else if (path === 'cards' && prev.type === 'flashcard') newItem = { term: 'Yeni Terim', definition: 'Yeni Tanım' };
          else if (path === 'cards' && (prev.type === 'anagramGame' || prev.type === 'anagramFlashcard')) newItem = { definition: 'İpucu', scrambledWord: 'YENI', correctAnswer: 'YENİ' };
          else if (path === 'questions') newItem = { statement: 'Yeni İfade', isTrue: true };
          else return prev;
    
          const updatedArray = [...targetArray, newItem];
    
          if (['categories', 'items'].includes(path) && (prev.type === 'categorization' || prev.type === 'sorting' || prev.type === 'conceptExplanation' || prev.type === 'accordion')) {
               if (!newStepData.content) newStepData.content = {};
               newStepData.content[path] = updatedArray;
          } else {
               newStepData[path] = updatedArray;
          }
    
          return newStepData;
      });
    };
    
    const removeFromArray = (path: 'categories' | 'items' | 'cards' | 'questions', indexToRemove: number) => {
         setEditedStep(prev => {
            if (!prev) return null;
            const newStepData: any = { ...prev };
             let targetArray: any[] | undefined = newStepData[path] || newStepData.content?.[path];
            if (!targetArray) return prev;

            const updatedArray = targetArray.filter((_: any, index: number) => index !== indexToRemove);
            
            if (['categories', 'items'].includes(path) && (prev.type === 'categorization' || prev.type === 'sorting' || prev.type === 'conceptExplanation' || prev.type === 'accordion')) {
                 newStepData.content[path] = updatedArray;
            } else {
                 newStepData[path] = updatedArray;
            }

            return newStepData;
        });
    };

    const handleSubmit = () => {
        if (editedStep) {
            onSave(editedStep);
        }
    };
    
    const libraryConfig = useMemo(() => {
        if (!editedStep) return null;
        switch(editedStep.type) {
            case 'flashcard': return { enabled: true, filter: ['definition'], multiSelect: true, stepType: 'flashcard' as const };
            case 'anagramFlashcard': return { enabled: true, filter: ['concept'], multiSelect: true, stepType: 'anagramFlashcard' as const };
            case 'anagramGame': return { enabled: true, filter: ['definition'], multiSelect: true, stepType: 'anagramGame' as const };
            case 'sentenceScramble': return { enabled: true, filter: ['sentence'], multiSelect: true, stepType: 'sentenceScramble' as const };
            case 'content': return { enabled: true, filter: ['concept'], multiSelect: true, stepType: 'keyConcepts' as const };
            default: return { enabled: false, filter: [], multiSelect: false, stepType: 'content' as const };
        }
    }, [editedStep]);

     const handleSelectFromLibrary = (items: (ActivityItem | Question | ImageAsset)[], stepType: LessonStep['type'] | 'keyConcepts' | 'anagramGame' | 'questions') => {
        if (!editedStep || items.length === 0) return;

        switch(stepType) {
            case 'flashcard': {
                const newCards = items.map(item => ({ term: (item as ActivityItem).content.term || '', definition: (item as ActivityItem).content.definition || ''}));
                setEditedStep({...editedStep, cards: newCards } as FlashcardStep);
                break;
            }
            case 'anagramFlashcard': {
                const newCards = items.map(item => ({
                    definition: `İpucu: Bu kelime "${(item as ActivityItem).content.text}"`, // Default hint
                    scrambledWord: ((item as ActivityItem).content.text || '').split('').sort(() => Math.random() - 0.5).join('').toLocaleUpperCase('tr-TR'),
                    correctAnswer: (item as ActivityItem).content.text || ''
                }));
                setEditedStep({...editedStep, cards: newCards} as AnagramFlashcardStep);
                break;
             }
            case 'anagramGame': {
                const newCards = items.map(item => {
                    const cleanWord = cleanForAnagram((item as ActivityItem).content.term || '');
                    return {
                        definition: (item as ActivityItem).content.definition || 'Tanım bulunamadı.',
                        correctAnswer: cleanWord,
                        scrambledWord: cleanWord.replace(/\s/g, '').split('').sort(() => Math.random() - 0.5).join(''),
                    };
                });
                setEditedStep({...(editedStep as AnagramGameStep), cards: newCards});
                break;
            }
            case 'sentenceScramble': {
                 const newSentence = (items[0] as ActivityItem)?.content.text || '';
                 const shuffleSentence = (s: string) => s.split(' ').sort(() => Math.random() - 0.5).join(' ');
                 setEditedStep({
                    ...editedStep,
                    correctSentence: newSentence,
                    scrambledSentence: shuffleSentence(newSentence),
                } as SentenceScrambleStep);
                break;
            }
             case 'keyConcepts': {
                 const newContent = "<ul>" + items.map(item => `<li>${(item as ActivityItem).content.text}</li>`).join('');
                 setEditedStep({...editedStep, content: newContent});
                 break;
            }
        }
        setIsLibraryOpen(false);
    };

    if (!isOpen || !editedStep) return null;
    
    const selectedCourseData = allCourses.find(c => c.id === (editedStep as any).courseId);
    const selectedUnitData = selectedCourseData?.units.find(u => u.id === (editedStep as any).unitId);


    const renderEditorFields = () => {
        return (
             <div className="space-y-4">
                 {libraryConfig?.enabled && <Button variant="outline" size="sm" onClick={() => setIsLibraryOpen(true)} className="border-white/10 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-900/20"><Library className="mr-2 h-4 w-4" /> Veri Bankasından Seç</Button>}
                 {
                 editedStep.type === 'content' ? (
                    <Textarea value={(editedStep as any).content || ''} onChange={(e) => handleValueChange('content', e.target.value)} className="min-h-[200px]" placeholder="Metin içeriği (HTML destekler)"/>
                 ) : editedStep.type === 'objectiveList' ? (
                     <>
                        <Button size="sm" onClick={() => addToArray('items')}><PlusCircle className="mr-2 h-4 w-4"/>Hedef Ekle</Button>
                        {(editedStep.items || []).map((item, index) => (
                             <div key={`obj-${index}`} className="flex gap-2"><Input value={item} onChange={e => handleArrayChange('items', index, null, e.target.value)} /><Button variant="ghost" size="icon" onClick={() => removeFromArray('items', index)}><Trash2 className="h-4 w-4"/></Button></div>
                        ))}
                     </>
                 ) : editedStep.type === 'conceptExplanation' ? (
                     <>
                        <Button size="sm" onClick={() => addToArray('items')}><PlusCircle className="mr-2 h-4 w-4"/>Kavram Ekle</Button>
                        {(editedStep.items || []).map((item: any, index: number) => (
                             <div key={`concept-${index}`} className="space-y-2 border p-2 rounded-md"><Input value={item.concept} onChange={e => handleArrayChange('items', index, 'concept', e.target.value)} placeholder="Kavram" /><Textarea value={item.definition} onChange={e => handleArrayChange('items', index, 'definition', e.target.value)} placeholder="Tanım"/><Button variant="ghost" size="sm" onClick={() => removeFromArray('items', index)}>Sil</Button></div>
                        ))}
                     </>
                 ) : editedStep.type === 'video' ? (
                     <div className="space-y-4"><Input value={(editedStep as VideoStep).url} onChange={e => handleValueChange('url', e.target.value)} placeholder="YouTube/Vimeo URL"/> <Textarea value={(editedStep as VideoStep).description || ''} onChange={e => handleValueChange('description', e.target.value)} placeholder="Açıklama..."/></div>
                 ) : editedStep.type === 'visual' ? (
                    <Input value={(editedStep as VisualStep).imageUrl} onChange={(e) => handleValueChange('imageUrl', e.target.value)} />
                 ) : editedStep.type === 'iframe' ? (
                    <Input value={(editedStep as IframeStep).url} onChange={(e) => handleValueChange('url', e.target.value)} />
                 ) : editedStep.type === 'htmlSlide' ? (
                     <Textarea value={(editedStep as HtmlSlideStep).htmlContent} onChange={(e) => handleValueChange('htmlContent', e.target.value)} className="min-h-[250px] font-mono text-xs"/>
                 ) : editedStep.type === 'mcq' ? (
                    <div className="space-y-2"><Textarea value={(editedStep as McqStep).question} onChange={e => handleValueChange('question', e.target.value)}/><RadioGroup value={(editedStep as McqStep).correctAnswer} onValueChange={(val) => handleValueChange('correctAnswer', val)}>{(editedStep as McqStep).options.map((opt, i) => <div key={`mcq-opt-${i}`} className="flex items-center gap-2"><RadioGroupItem value={opt} id={`opt-${i}`}/><Input value={opt} onChange={e => {const newOpts = [...(editedStep as McqStep).options]; newOpts[i] = e.target.value; handleValueChange('options', newOpts)}}/></div>)}</RadioGroup></div>
                 ) : editedStep.type === 'tf' ? (
                    <div className="space-y-2"><Textarea value={(editedStep as TfStep).statement} onChange={e => handleValueChange('statement', e.target.value)}/><div className="flex items-center space-x-2"><Checkbox id="isTrue" checked={(editedStep as TfStep).isTrue} onCheckedChange={c => handleValueChange('isTrue', !!c)}/><Label htmlFor="isTrue">Bu ifade doğru</Label></div></div>
                 ) : editedStep.type === 'fitb' ? (
                    <div className="space-y-2"><Textarea value={(editedStep as FitbStep).sentenceWithBlank} onChange={e => handleValueChange('sentenceWithBlank', e.target.value)}/><RadioGroup value={(editedStep as FitbStep).correctAnswer} onValueChange={(val) => handleValueChange('correctAnswer', val)}>{(editedStep as FitbStep).options.map((opt, i) => <div key={`fitb-opt-${i}`} className="flex items-center gap-2"><RadioGroupItem value={opt} id={`opt-fitb-${i}`}/><Input value={opt} onChange={e => {const newOpts = [...(editedStep as FitbStep).options]; newOpts[i] = e.target.value; handleValueChange('options', newOpts)}}/></div>)}</RadioGroup></div>
                 ) : editedStep.type === 'flashcard' || editedStep.type === 'anagramFlashcard' ? (
                     <>
                        <div className="flex justify-end"><Button size="sm" onClick={() => addToArray('cards')}><PlusCircle className="mr-2 h-4 w-4"/>Kart Ekle</Button></div>
                        {(editedStep.cards || []).map((card: any, index: number) => (
                           <div key={`card-${index}`} className="space-y-2 p-2 border rounded-md">
                               { 'term' in card ? <><Input value={card.term} onChange={e => handleArrayChange('cards', index, 'term', e.target.value)} placeholder="Terim"/><Textarea value={card.definition} onChange={e => handleArrayChange('cards', index, 'definition', e.target.value)} placeholder="Tanım"/></> 
                                : <><Textarea value={card.definition} onChange={e => handleArrayChange('cards', index, 'definition', e.target.value)} placeholder="İpucu"/><Input value={card.correctAnswer} onChange={e => handleArrayChange('cards', index, 'correctAnswer', e.target.value)} placeholder="Doğru Cevap"/><Input value={card.scrambledWord} disabled readOnly className="bg-muted"/></>}
                               <Button size="icon" variant="ghost" onClick={() => removeFromArray('cards', index)}><Trash2 className="h-4 w-4"/></Button>
                           </div>
                        ))}
                     </>
                 ) : editedStep.type === 'anagramGame' ? (
                     <>
                        <div className="flex justify-end"><Button size="sm" onClick={() => addToArray('cards')}><PlusCircle className="mr-2 h-4 w-4"/>Kelime Ekle</Button></div>
                        {(editedStep.cards || []).map((card: any, index: number) => (
                           <div key={`anagram-card-${index}`} className="space-y-2 p-2 border rounded-md">
                             <Textarea value={card.definition} onChange={e => handleArrayChange('cards', index, 'definition', e.target.value)} placeholder="İpucu"/>
                             <Input value={card.correctAnswer} onChange={e => {
                                 const cleanWord = cleanForAnagram(e.target.value);
                                 const newScrambled = cleanWord.replace(/\s/g, '').split('').sort(() => Math.random() - 0.5).join('');
                                 handleArrayChange('cards', index, 'correctAnswer', cleanWord);
                                 handleArrayChange('cards', index, 'scrambledWord', newScrambled);
                             }} placeholder="Doğru Cevap (Boşluk olabilir)"/>
                             <Input value={card.scrambledWord} disabled readOnly className="bg-muted"/>
                             <Button size="icon" variant="ghost" onClick={() => removeFromArray('cards', index)}><Trash2 className="h-4 w-4"/></Button>
                           </div>
                        ))}
                     </>
                 ) : editedStep.type === 'sentenceScramble' ? (
                    <>
                        <Textarea value={(editedStep as SentenceScrambleStep).correctSentence} onChange={e => { const newCorrect = e.target.value; const newScrambled = newCorrect.split(' ').sort(() => Math.random() - 0.5).join(' '); handleValueChange('correctSentence', newCorrect); handleValueChange('scrambledSentence', newScrambled); }} placeholder="Doğru cümleyi yazın..." />
                        <Input value={(editedStep as SentenceScrambleStep).scrambledSentence} readOnly disabled className="bg-muted"/>
                    </>
                 ) : editedStep.type === 'activityLink' ? (
                    <div className="space-y-4">
                        <p className="text-sm text-slate-400">Bu etkinlik, içeriğini seçilen konudan alır. Varsayılan olarak mevcut konu seçilidir.</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                             <Select value={(editedStep as any).courseId || ''} onValueChange={(val) => {setEditedStep({...editedStep, courseId: val, unitId: '', topicId: ''} as any)}}><SelectTrigger><SelectValue placeholder="Ders Seç"/></SelectTrigger><SelectContent>{allCourses.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent></Select>
                             <Select value={(editedStep as any).unitId || ''} onValueChange={(val) => {setEditedStep({...editedStep, unitId: val, topicId: ''} as any)}} disabled={!selectedCourseData}><SelectTrigger><SelectValue placeholder="Ünite Seç"/></SelectTrigger><SelectContent>{selectedCourseData?.units.map(u => <SelectItem key={u.id} value={u.id}>{u.title}</SelectItem>)}</SelectContent></Select>
                             <Select value={(editedStep as any).topicId || ''} onValueChange={(val) => {setEditedStep({...editedStep, topicId: val} as any)}} disabled={!selectedUnitData}><SelectTrigger><SelectValue placeholder="Konu Seç"/></SelectTrigger><SelectContent>{selectedUnitData?.topics.map(t => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}</SelectContent></Select>
                        </div>
                    </div>
                 ) : null
                }
             </div>
        )
    };

    return (
    <>
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl h-[90vh] flex flex-col p-0 bg-slate-950 border-white/10 text-slate-100 shadow-2xl">
                
                {/* Header */}
                <DialogHeader className="p-6 pb-4 border-b border-white/5 bg-slate-900/50 flex flex-row items-center justify-between">
                    <DialogTitle className="flex items-center gap-3 text-2xl font-black uppercase tracking-tight text-white">
                         <div className="p-2 bg-indigo-500/20 rounded-lg border border-indigo-500/30">
                            <FileEdit className="h-6 w-6 text-indigo-400" />
                         </div>
                         {step?.id && !step.id.startsWith('new-') ? 'Adımı Düzenle' : 'Yeni Adım Ekle'}
                    </DialogTitle>
                </DialogHeader>

                <ScrollArea className="flex-1">
                    <div className="px-6 py-4 space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="step-title">Adım Başlığı</Label>
                            <Input id="step-title" value={editedStep.title} onChange={(e) => handleValueChange('title', e.target.value)} />
                        </div>
                        {renderEditorFields()}
                    </div>
                </ScrollArea>
                
                {/* Footer */}
                <DialogFooter className="p-6 border-t border-white/5 bg-slate-900/80 backdrop-blur-sm flex justify-end gap-3">
                    <DialogClose asChild><Button type="button" variant="ghost" className="text-slate-400 hover:text-white hover:bg-white/5">İptal</Button></DialogClose>
                    <Button onClick={handleSubmit} disabled={isSaving || !isDirty} className="bg-teal-600 hover:bg-teal-500 text-white font-bold px-8 shadow-lg shadow-teal-900/20">
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>} Kaydet
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        
        {libraryConfig && (
             <LibraryImportDialog 
                isOpen={isLibraryOpen}
                onOpenChange={setIsLibraryOpen}
                onItemsSelected={(handleSelectFromLibrary as any)}
                context={context}
                config={libraryConfig}
            />
        )}
        </>
    );
}
