
'use client';

import { useState, useEffect, useRef } from "react";
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
import { Loader2, PlusCircle, Trash2, Save, FileEdit, Database, List, Library, FilePenLine } from 'lucide-react';
import type { ActivityItem, LessonStep, McqStep, TfStep, FitbStep, FlashcardStep, AnagramStep, SentenceScrambleStep, VisualStep, IframeStep, ActivityLinkStep, TrueFalseListStep, HtmlSlideStep, ConceptExplanationStep, AnagramFlashcardStep, ObjectiveListStep, VideoStep, AnagramGameStep, Question } from '@/lib/types';
import { ScrollArea } from "./ui/scroll-area";
import { cn } from "@/lib/utils";
import { Checkbox } from './ui/checkbox';
import { LibraryImportDialog } from './library-import-dialog';

const getInitialFormData = (item: Partial<LessonStep> | null) => {
    const initialContent = (item as any)?.content || {};
    const categories = Array.isArray(initialContent.categories)
        ? initialContent.categories.map((c: any) => (typeof c === 'string' ? { value: c } : c))
        : [];
    
    return {
        id: item?.id || `new-${Date.now()}`,
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

// Helper function to shuffle words in a sentence
function shuffleSentence(sentence: string): string {
  return sentence
    .split(' ')
    .map(word => {
      let chars = word.split('');
      for (let i = chars.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [chars[i], chars[j]] = [chars[j], chars[i]];
      }
      return chars.join('');
    })
    .join(' ');
}


export function StepEditorDialog({ isOpen, onOpenChange, step, onSave, context }: StepEditorDialogProps) {
    const [editedStep, setEditedStep] = useState<LessonStep | null>(step);
    const [isSaving, setIsSaving] = useState(false);
    const [isLibraryOpen, setIsLibraryOpen] = useState(false);
    
    useEffect(() => {
        setEditedStep(step);
    }, [step]);
    
    const handleSave = () => {
        if (editedStep) {
            onSave(editedStep);
        }
    };

    const handleSelectFromLibrary = (items: (ActivityItem | Question)[], stepType: LessonStep['type'] | 'keyConcepts' | 'anagramGame' | 'questions') => {
        if (!editedStep || items.length === 0) return;

        switch(stepType) {
            case 'flashcard': {
                const newCards = items.map(item => ({ term: (item as ActivityItem).content.term || '', definition: (item as ActivityItem).content.definition || ''}));
                setEditedStep({...editedStep, cards: newCards });
                break;
            }
             case 'anagramFlashcard': {
                const newCards = items.map(item => ({
                    definition: `İpucu: Bu kelime "${(item as ActivityItem).content.text}"`, // Default hint
                    scrambledWord: shuffleSentence((item as ActivityItem).content.text || '').toLocaleUpperCase('tr-TR'),
                    correctAnswer: (item as ActivityItem).content.text || ''
                }));
                setEditedStep({...editedStep, cards: newCards});
                break;
             }
            case 'anagramGame': {
                const newCards = items.map(item => ({
                    definition: (item as ActivityItem).content.definition || 'Tanım bulunamadı.',
                    correctAnswer: (item as ActivityItem).content.term || '',
                    scrambledWord: ((item as ActivityItem).content.term || '').split('').sort(() => 0.5 - Math.random()).join('').toLocaleUpperCase('tr-TR')
                }));
                setEditedStep({...editedStep, cards: newCards});
                break;
            }
            case 'sentenceScramble': {
                 const newSentence = (items[0] as ActivityItem)?.content.text || '';
                 setEditedStep({
                    ...editedStep,
                    correctSentence: newSentence,
                    scrambledSentence: shuffleSentence(newSentence),
                });
                break;
            }
             case 'content': { // Used for "Anahtar Kavramlar"
                 const newContent = "<ul>" + items.map(item => `<li>${(item as ActivityItem).content.text}</li>`).join('');
                 setEditedStep({...editedStep, content: newContent});
                 break;
            }
            case 'questions': {
                const questionItems = items as Question[];
                const newSteps: LessonStep[] = [];
                questionItems.forEach(q => {
                    if (q.type === 'Çoktan Seçmeli') newSteps.push({ type: 'mcq', title: q.text, ...q });
                    else if (q.type === 'Doğru/Yanlış') newSteps.push({ type: 'tf', title: q.text, statement: q.text, isTrue: q.correctAnswer === 'Doğru' });
                    else if (q.type === 'Boşluk Doldurma') newSteps.push({ type: 'fitb', title: q.text, sentenceWithBlank: q.text, options: q.options || [], correctAnswer: q.correctAnswer || '' });
                });
                // This case needs special handling since it creates multiple steps.
                // It's better handled by a separate callback in the parent.
                // For now, let's just log a warning or take the first one.
                if(newSteps.length > 0) {
                     onSave(newSteps[0]); // Just add the first one for now
                }
                break;
            }
        }
        setIsLibraryOpen(false);
    }
    
    if (!editedStep) {
        return null;
    }

    const renderEditorFields = () => {
        if (!editedStep) return null;

        const libraryConfig: { enabled: boolean; filter: (ActivityItem['type'] | 'questions')[]; multiSelect: boolean; stepType: LessonStep['type'] | 'keyConcepts' | 'anagramGame' | 'questions'; } = {
            enabled: false,
            filter: [],
            multiSelect: false,
            stepType: 'content'
        };

        if (editedStep.type === 'flashcard') {
            libraryConfig.enabled = true;
            libraryConfig.filter = ['definition'];
            libraryConfig.multiSelect = true;
            libraryConfig.stepType = 'flashcard';
        } else if (editedStep.type === 'anagramFlashcard' || (editedStep.type === 'content' && editedStep.title.toLowerCase().includes('kavramlar'))) {
             libraryConfig.enabled = true;
             libraryConfig.filter = ['concept'];
             libraryConfig.multiSelect = true;
             libraryConfig.stepType = editedStep.type === 'anagramFlashcard' ? 'anagramFlashcard' : 'keyConcepts';
        } else if (editedStep.type === 'sentenceScramble') {
             libraryConfig.enabled = true;
             libraryConfig.filter = ['sentence'];
             libraryConfig.multiSelect = false;
             libraryConfig.stepType = 'sentenceScramble';
        } else if (editedStep.type === 'anagramGame') {
            libraryConfig.enabled = true;
            libraryConfig.filter = ['definition'];
            libraryConfig.multiSelect = true;
            libraryConfig.stepType = 'anagramGame';
        }


        switch (editedStep.type) {
            case 'content':
                return (
                    <div className="space-y-2">
                        <Label>İçerik (HTML destekler)</Label>
                        {libraryConfig.enabled && <Button variant="outline" size="sm" onClick={() => setIsLibraryOpen(true)}><Library className="mr-2 h-4 w-4" /> Veri Bankasından Seç</Button>}
                        <Textarea value={(editedStep as any).content} onChange={(e) => setEditedStep({ ...editedStep, content: e.target.value })} className="min-h-[200px]" />
                    </div>
                );
            case 'objectiveList': {
                 const objStep = editedStep as ObjectiveListStep;
                 const handleItemChange = (index: number, value: string) => {
                    const newItems = [...objStep.items];
                    newItems[index] = value;
                    setEditedStep({ ...objStep, items: newItems });
                 };
                 const addItem = () => {
                     const newItems = [...objStep.items, 'Yeni hedef...'];
                     setEditedStep({ ...objStep, items: newItems });
                 };
                 const removeItem = (index: number) => {
                     const newItems = objStep.items.filter((_, i) => i !== index);
                     setEditedStep({ ...objStep, items: newItems });
                 };
                return (
                     <div className="space-y-4">
                        <div className="flex justify-end">
                            <Button size="sm" onClick={addItem}><PlusCircle className="mr-2 h-4 w-4"/> Hedef Ekle</Button>
                        </div>
                         {objStep.items.map((item, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <Input value={item} onChange={(e) => handleItemChange(index, e.target.value)} placeholder={`Hedef ${index + 1}`}/>
                                <Button size="icon" variant="ghost" className="shrink-0" onClick={() => removeItem(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                            </div>
                         ))}
                    </div>
                )
            }
            case 'conceptExplanation': {
                const ceStep = editedStep as ConceptExplanationStep;
                const handleItemChange = (index: number, field: 'concept' | 'definition', value: string) => {
                    const newItems = [...ceStep.items];
                    (newItems[index] as any)[field] = value;
                    setEditedStep({ ...ceStep, items: newItems });
                };
                const addItem = () => {
                    const newItems = [...ceStep.items, { concept: 'Yeni Kavram', definition: 'Yeni Tanım' }];
                    setEditedStep({ ...ceStep, items: newItems });
                };
                const removeItem = (index: number) => {
                    const newItems = ceStep.items.filter((_, i) => i !== index);
                    setEditedStep({ ...ceStep, items: newItems });
                };
                return (
                    <div className="space-y-4">
                        <div className="flex justify-end">
                            <Button size="sm" onClick={addItem}><PlusCircle className="mr-2 h-4 w-4"/> Kavram Ekle</Button>
                        </div>
                        {ceStep.items.map((item, index) => (
                            <div key={index} className="grid grid-cols-12 gap-2 items-start border p-3 rounded-md">
                                <div className="col-span-11 space-y-2">
                                     <Input value={item.concept} onChange={(e) => handleItemChange(index, 'concept', e.target.value)} placeholder="Kavram"/>
                                     <Textarea value={item.definition} onChange={(e) => handleItemChange(index, 'definition', e.target.value)} placeholder="Tanım"/>
                                </div>
                                <Button size="icon" variant="ghost" className="col-span-1 self-center" onClick={() => removeItem(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                            </div>
                        ))}
                    </div>
                );
            }
            case 'video':
                return (
                    <div className="space-y-4">
                         <div className="space-y-2">
                            <Label>Video URL (YouTube, Vimeo)</Label>
                            <Input value={(editedStep as VideoStep).url} onChange={(e) => setEditedStep({ ...editedStep, url: e.target.value })} placeholder="https://www.youtube.com/watch?v=..."/>
                        </div>
                        <div className="space-y-2">
                            <Label>Açıklama (İsteğe Bağlı)</Label>
                            <Textarea value={(editedStep as VideoStep).description || ''} onChange={(e) => setEditedStep({ ...editedStep, description: e.target.value })} />
                        </div>
                    </div>
                );
            case 'visual':
                return (
                    <div className="space-y-2">
                        <Label>Görsel URL</Label>
                        <Input value={(editedStep as VisualStep).imageUrl} onChange={(e) => setEditedStep({ ...editedStep, imageUrl: e.target.value })} />
                    </div>
                );
            case 'iframe':
                const iframeStep = editedStep as IframeStep;
                return (
                    <div className="space-y-2">
                        <Label htmlFor="iframe-url">Sayfa URL'i</Label>
                        <Input id="iframe-url" value={iframeStep.url} onChange={(e) => setEditedStep({ ...iframeStep, url: e.target.value })} placeholder="https://..." />
                    </div>
                );
            case 'htmlSlide':
                const htmlStep = editedStep as HtmlSlideStep;
                 return (
                    <div className="space-y-2">
                        <Label>HTML İçeriği</Label>
                        <Textarea
                            value={htmlStep.htmlContent}
                            onChange={(e) => setEditedStep({ ...htmlStep, htmlContent: e.target.value })}
                            className="min-h-[300px] font-mono text-xs"
                            placeholder="<!DOCTYPE html>..."
                        />
                    </div>
                );
            case 'activityLink':
                const activityStep = editedStep as ActivityLinkStep;
                return (
                    <div className="space-y-2">
                        <Label>Etkinlik Türü</Label>
                        <Input value={activityStep.activityLabel} disabled />
                        <p className="text-xs text-muted-foreground">Etkinlik bağlantısı adımı düzenlenemez. Silip yenisini ekleyebilirsiniz.</p>
                    </div>
                );
            case 'flashcard': {
                const fcStep = editedStep as FlashcardStep;
                const handleCardChange = (index: number, field: 'term' | 'definition', value: string) => {
                    const newCards = [...fcStep.cards];
                    (newCards[index] as any)[field] = value;
                    setEditedStep({ ...fcStep, cards: newCards });
                };
                const addCard = () => {
                    const newCards = [...fcStep.cards, { term: 'Yeni Terim', definition: 'Yeni Tanım' }];
                    setEditedStep({ ...fcStep, cards: newCards });
                };
                const removeCard = (index: number) => {
                    const newCards = fcStep.cards.filter((_, i) => i !== index);
                    setEditedStep({ ...fcStep, cards: newCards });
                };
                return (
                    <div className="space-y-4">
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => setIsLibraryOpen(true)}><Library className="mr-2 h-4 w-4" /> Veri Bankasından Seç</Button>
                            <Button size="sm" onClick={addCard}><PlusCircle className="mr-2 h-4 w-4"/> Kart Ekle</Button>
                        </div>
                        {fcStep.cards.map((card, index) => (
                            <div key={index} className="grid grid-cols-12 gap-2 items-center">
                                <Input value={card.term} onChange={(e) => handleCardChange(index, 'term', e.target.value)} className="col-span-5" />
                                <Textarea value={card.definition} onChange={(e) => handleCardChange(index, 'definition', e.target.value)} className="col-span-6" />
                                <Button size="icon" variant="ghost" className="col-span-1" onClick={() => removeCard(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                            </div>
                        ))}
                    </div>
                );
            }
            case 'anagramGame': {
                const agStep = editedStep as AnagramGameStep;
                 const handleCardChange = (index: number, field: 'definition' | 'scrambledWord' | 'correctAnswer', value: string) => {
                    const newCards = [...agStep.cards];
                    (newCards[index] as any)[field] = value;
                    setEditedStep({ ...agStep, cards: newCards });
                };
                const addCard = () => {
                    const newCards = [...agStep.cards, { definition: 'Yeni ipucu...', scrambledWord: 'KELİME', correctAnswer: 'KELİME' }];
                    setEditedStep({ ...agStep, cards: newCards });
                };
                const removeCard = (index: number) => {
                    const newCards = agStep.cards.filter((_, i) => i !== index);
                    setEditedStep({ ...agStep, cards: newCards });
                };
                return (
                    <div className="space-y-4">
                        <div className="flex justify-end gap-2">
                             <Button variant="outline" size="sm" onClick={() => setIsLibraryOpen(true)}><Library className="mr-2 h-4 w-4" /> Veri Bankasından Seç</Button>
                            <Button size="sm" onClick={addCard}><PlusCircle className="mr-2 h-4 w-4"/> Kelime Ekle</Button>
                        </div>
                        {agStep.cards.map((card, index) => (
                            <div key={index} className="grid grid-cols-12 gap-2 p-3 border rounded-md items-center">
                                <div className="col-span-11 space-y-2">
                                     <Textarea value={card.definition} onChange={e => handleCardChange(index, 'definition', e.target.value)} placeholder="İpucu/Tanım..." className="min-h-[50px]"/>
                                     <Input value={card.scrambledWord} onChange={e => handleCardChange(index, 'scrambledWord', e.target.value)} placeholder="Karışık Kelime"/>
                                     <Input value={card.correctAnswer} onChange={e => handleCardChange(index, 'correctAnswer', e.target.value)} placeholder="Doğru Cevap"/>
                                </div>
                                <Button size="icon" variant="ghost" className="col-span-1 self-center" onClick={() => removeCard(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                            </div>
                        ))}
                    </div>
                );
            }
            case 'anagramFlashcard': {
                const afcStep = editedStep as AnagramFlashcardStep;
                 const handleCardChange = (index: number, field: 'definition' | 'scrambledWord' | 'correctAnswer', value: string) => {
                    const newCards = [...afcStep.cards];
                    (newCards[index] as any)[field] = value;
                    setEditedStep({ ...afcStep, cards: newCards });
                };
                const addAnagramCard = () => {
                    const newCards = [...afcStep.cards, { definition: 'İpucu', scrambledWord: 'YENİKELİME', correctAnswer: 'YENI KELIME' }];
                    setEditedStep({ ...afcStep, cards: newCards });
                };
                const removeAnagramCard = (index: number) => {
                    const newCards = afcStep.cards.filter((_, i) => i !== index);
                    setEditedStep({ ...afcStep, cards: newCards });
                };
                return (
                    <div className="space-y-4">
                        <div className="flex justify-end gap-2">
                             <Button variant="outline" size="sm" onClick={() => setIsLibraryOpen(true)}><Library className="mr-2 h-4 w-4" /> Veri Bankasından Seç</Button>
                            <Button size="sm" onClick={addAnagramCard}><PlusCircle className="mr-2 h-4 w-4"/> Anagram Kartı Ekle</Button>
                        </div>
                        {afcStep.cards.map((card, index) => (
                            <div key={index} className="grid grid-cols-12 gap-2 p-3 border rounded-md items-center">
                                <div className="col-span-11 space-y-2">
                                     <Textarea value={card.definition} onChange={e => handleCardChange(index, 'definition', e.target.value)} placeholder="İpucu..."/>
                                     <Input value={card.scrambledWord} onChange={e => handleCardChange(index, 'scrambledWord', e.target.value)} placeholder="Karışık Kelime"/>
                                     <Input value={card.correctAnswer} onChange={e => handleCardChange(index, 'correctAnswer', e.target.value)} placeholder="Doğru Cevap"/>
                                </div>
                                <Button size="icon" variant="ghost" className="col-span-1 self-center" onClick={() => removeAnagramCard(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                            </div>
                        ))}
                    </div>
                );
            }
            case 'mcq':
                const mcqStep = editedStep as McqStep;
                 return (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Soru Metni</Label>
                            <Textarea value={mcqStep.question} onChange={(e) => setEditedStep({ ...mcqStep, question: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>Seçenekler ve Doğru Cevap</Label>
                            <RadioGroup value={mcqStep.correctAnswer} onValueChange={(val) => setEditedStep({ ...mcqStep, correctAnswer: val })}>
                                {(mcqStep.options || ['', '', '', '']).map((option, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <RadioGroupItem value={option} id={`mcq-opt-${index}`} />
                                        <Input value={option} onChange={(e) => {
                                            const newOptions = [...(mcqStep.options || [])];
                                            newOptions[index] = e.target.value;
                                            setEditedStep({ ...mcqStep, options: newOptions });
                                        }} />
                                    </div>
                                ))}
                            </RadioGroup>
                        </div>
                    </div>
                );
            case 'tf':
                const tfStep = editedStep as TfStep;
                return (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>İfade</Label>
                            <Textarea value={tfStep.statement} onChange={e => setEditedStep({ ...tfStep, statement: e.target.value })} />
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox id="is-true-switch" checked={tfStep.isTrue} onCheckedChange={checked => setEditedStep({ ...tfStep, isTrue: !!checked })} />
                            <Label htmlFor="is-true-switch">{tfStep.isTrue ? "Bu ifade Doğru" : "Bu ifade Yanlış"}</Label>
                        </div>
                    </div>
                );
             case 'trueFalseList':
                const tflStep = editedStep as TrueFalseListStep;
                const handleTflChange = (index: number, field: 'statement' | 'isTrue', value: string | boolean) => {
                    const newQuestions = [...tflStep.questions];
                    if (field === 'statement') (newQuestions[index] as any)[field] = value;
                    if (field === 'isTrue') (newQuestions[index] as any)[field] = value;
                    setEditedStep({ ...tflStep, questions: newQuestions });
                };
                const addTflQuestion = () => {
                    const newQuestions = [...tflStep.questions, { statement: 'Yeni ifade...', isTrue: true }];
                    setEditedStep({ ...tflStep, questions: newQuestions });
                };
                const removeTflQuestion = (index: number) => {
                    const newQuestions = tflStep.questions.filter((_, i) => i !== index);
                    setEditedStep({ ...tflStep, questions: newQuestions });
                };
                return (
                    <div className="space-y-4">
                        <div className="flex justify-end">
                            <Button size="sm" onClick={addTflQuestion}><PlusCircle className="mr-2 h-4 w-4"/> Soru Ekle</Button>
                        </div>
                        {tflStep.questions.map((q, index) => (
                            <div key={index} className="space-y-2 p-3 border rounded-md">
                                <Label>İfade {index + 1}</Label>
                                <Textarea value={q.statement} onChange={(e) => handleTflChange(index, 'statement', e.target.value)} />
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <Checkbox id={`is-true-${index}`} checked={q.isTrue} onCheckedChange={checked => handleTflChange(index, 'isTrue', !!checked)} />
                                        <Label htmlFor={`is-true-${index}`}>{q.isTrue ? "Doğru" : "Yanlış"}</Label>
                                    </div>
                                    <Button size="icon" variant="ghost" className="col-span-1" onClick={() => removeTflQuestion(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                </div>
                            </div>
                        ))}
                    </div>
                );
            case 'fitb':
                const fitbStep = editedStep as FitbStep;
                return (
                     <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Boşluklu Cümle</Label>
                            <Textarea value={fitbStep.sentenceWithBlank} onChange={(e) => setEditedStep({ ...fitbStep, sentenceWithBlank: e.target.value })} placeholder="Boşluğu göstermek için ___ kullanın." />
                        </div>
                        <div className="space-y-2">
                            <Label>Seçenekler ve Doğru Cevap</Label>
                            <RadioGroup value={fitbStep.correctAnswer} onValueChange={(val) => setEditedStep({ ...fitbStep, correctAnswer: val })}>
                                {(fitbStep.options || []).map((option, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <RadioGroupItem value={option} id={`fitb-opt-${index}`} />
                                        <Input value={option} onChange={(e) => {
                                            const newOptions = [...(fitbStep.options || [])];
                                            newOptions[index] = e.target.value;
                                            setEditedStep({ ...fitbStep, options: newOptions });
                                        }} />
                                    </div>
                                ))}
                            </RadioGroup>
                        </div>
                    </div>
                );
            case 'anagram':
                const anagramStep = editedStep as AnagramStep;
                return (
                     <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>İpucu / Tanım</Label>
                            <Textarea value={anagramStep.definition} onChange={e => setEditedStep({ ...anagramStep, definition: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>Karışık Kelime</Label>
                            <Input value={anagramStep.scrambledWord} onChange={e => setEditedStep({ ...anagramStep, scrambledWord: e.target.value })} />
                        </div>
                         <div className="space-y-2">
                            <Label>Doğru Cevap</Label>
                            <Input value={anagramStep.correctAnswer} onChange={e => setEditedStep({ ...anagramStep, correctAnswer: e.target.value })} />
                        </div>
                    </div>
                );
            case 'sentenceScramble':
                const ssStep = editedStep as SentenceScrambleStep;
                const handleCorrectSentenceChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
                    const correct = e.target.value;
                    const scrambled = shuffleSentence(correct);
                    setEditedStep({ ...ssStep, correctSentence: correct, scrambledSentence: scrambled });
                };
                return (
                     <div className="space-y-4">
                         <Button variant="outline" size="sm" onClick={() => setIsLibraryOpen(true)}><Library className="mr-2 h-4 w-4" /> Veri Bankasından Seç</Button>
                         <div className="space-y-2">
                            <Label>Doğru Cümle</Label>
                            <Textarea value={ssStep.correctSentence} onChange={handleCorrectSentenceChange} placeholder="Doğru cümleyi buraya yazın, sistem otomatik olarak karıştıracaktır."/>
                        </div>
                         <div className="space-y-2">
                            <Label>Karışık Cümle (Otomatik Oluşturuldu)</Label>
                            <Textarea value={ssStep.scrambledSentence} readOnly disabled className="bg-muted/50" />
                        </div>
                    </div>
                );
            case 'conceptMap':
                return (
                    <div className="space-y-2">
                        <Label>Kavram Haritası Verisi</Label>
                        <p className="text-sm text-muted-foreground">Kavram haritaları doğrudan bu ekrandan düzenlenemez. Lütfen adımı silip yapay zeka ile yenisini oluşturun.</p>
                    </div>
                );
            default:
                return <p>Bu adım türü için düzenleyici bulunmuyor.</p>;
        }
    }

    return (
        <>
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Adımı Düzenle</DialogTitle>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh]">
                    <div className="py-4 space-y-4 pr-6">
                        <div className="space-y-2">
                            <Label htmlFor="step-title">Adım Başlığı</Label>
                            <Input id="step-title" value={editedStep.title} onChange={(e) => setEditedStep({ ...editedStep, title: e.target.value })} />
                        </div>
                        {renderEditorFields()}
                    </div>
                </ScrollArea>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>İptal</Button>
                    <Button onClick={handleSave}>Değişiklikleri Kaydet</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        
         <LibraryImportDialog 
            isOpen={isLibraryOpen}
            onOpenChange={setIsLibraryOpen}
            onItemsSelected={(handleSelectFromLibrary as any)}
            context={context}
            config={
                editedStep.type === 'flashcard' ? { filter: ['definition'], multiSelect: true, stepType: 'flashcard' } :
                editedStep.type === 'anagramFlashcard' ? { filter: ['concept'], multiSelect: true, stepType: 'anagramFlashcard' } :
                editedStep.type === 'sentenceScramble' ? { filter: ['sentence'], multiSelect: false, stepType: 'sentenceScramble' } :
                editedStep.type === 'anagramGame' ? { filter: ['definition'], multiSelect: true, stepType: 'anagramGame' } :
                { filter: ['concept'], multiSelect: true, stepType: 'keyConcepts' } // Default for content with 'kavramlar'
            }
        />
        </>
    );
}
