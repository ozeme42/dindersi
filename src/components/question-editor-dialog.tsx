"use client";

import { useState, useEffect, useRef } from "react";
import type { Question, Course, SchoolClass } from "@/lib/types";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
// Layers ikonu buraya eklendi
import { Loader2, ArrowLeft, ArrowRight, Trash2, Save, FileEdit, CheckCircle2, XCircle, Layers } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const difficultyOptions: Question['difficulty'][] = ['Kolay', 'Orta', 'Zor'];
const questionTypeOptions: Question['type'][] = ['Çoktan Seçmeli', 'Doğru/Yanlış', 'Boşluk Doldurma'];

type QuestionEditorProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editingState: { question: Question, index: number };
  onSave: (question: Question) => Promise<Question | null>;
  onNavigate: (currentData: Question, direction: 'prev' | 'next') => void;
  onDelete: (questionId: string) => void;
  isSaving: boolean;
  totalQuestions: number;
  curriculum: (Course & { units: { id: string; title: string; topics: { id: string; title: string; }[] }[] })[];
  classes: SchoolClass[];
};

export function QuestionEditorDialog({
  isOpen,
  onOpenChange,
  editingState,
  onSave,
  onNavigate,
  onDelete,
  isSaving,
  totalQuestions,
  curriculum,
  classes
}: QuestionEditorProps) {
  const [editedQuestion, setEditedQuestion] = useState<Question>(editingState.question);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  useEffect(() => {
    setEditedQuestion(editingState.question);
  }, [editingState.question]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [editedQuestion.text]);
  
  const handleContextChange = (type: 'class' | 'course' | 'unit' | 'topic', id: string) => {
    const newQuestion = { ...editedQuestion };
    if (type === 'class') {
      newQuestion.classId = id;
      newQuestion.courseId = '';
      newQuestion.unitId = '';
      newQuestion.topicId = '';
      newQuestion.topic = '';
    } else if (type === 'course') {
      newQuestion.courseId = id;
      newQuestion.unitId = '';
      newQuestion.topicId = '';
      newQuestion.topic = '';
    } else if (type === 'unit') {
        newQuestion.unitId = id;
        newQuestion.topicId = '';
        newQuestion.topic = '';
    } else if (type === 'topic') {
        newQuestion.topicId = id;
        const topic = curriculum.flatMap(c => c.units?.flatMap(u => u.topics)).find(t => t.id === id);
        newQuestion.topic = topic?.title || '';
    }
    setEditedQuestion(newQuestion);
  }

  const selectedCourse = curriculum.find(c => c.id === editedQuestion.courseId);
  const selectedUnit = selectedCourse?.units.find(u => u.id === editedQuestion.unitId);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 bg-slate-950 border-white/10 text-slate-100 shadow-2xl">
        
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b border-white/5 bg-slate-900/50 flex flex-row items-center justify-between">
          <DialogTitle className="flex items-center gap-3 text-2xl font-black uppercase tracking-tight text-white">
             <div className="p-2 bg-indigo-500/20 rounded-lg border border-indigo-500/30">
                <FileEdit className="h-6 w-6 text-indigo-400" />
             </div>
             {editedQuestion.id.startsWith('new-') ? 'Yeni Soru Oluştur' : `Soru ${editingState.index + 1} Düzenle`}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
            
            {/* Soru Metni ve Tipi */}
            <div className="grid gap-6">
                <div className="space-y-2">
                    <Label htmlFor="question-text" className="text-slate-300 font-bold uppercase tracking-wider text-xs">Soru Metni</Label>
                    <Textarea 
                        ref={textareaRef} 
                        rows={2} 
                        id="question-text" 
                        className="resize-none overflow-hidden text-lg bg-slate-900/50 border-white/10 text-white focus:border-indigo-500/50 min-h-[100px] leading-relaxed p-4 rounded-xl" 
                        value={editedQuestion.text} 
                        onChange={(e) => setEditedQuestion({...editedQuestion, text: e.target.value})} 
                        placeholder="Sorunuzu buraya yazın..."
                    />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="question-type" className="text-slate-300 font-bold uppercase tracking-wider text-xs">Soru Tipi</Label>
                        <Select
                            value={editedQuestion.type}
                            onValueChange={(value: Question['type']) => {
                                const newQuestion = { ...editedQuestion, type: value };
                                if (value === 'Doğru/Yanlış') {
                                    newQuestion.options = [];
                                    newQuestion.correctAnswer = 'Doğru';
                                } else {
                                    newQuestion.options = newQuestion.options && newQuestion.options.length === 4 ? newQuestion.options : ['', '', '', ''];
                                    newQuestion.correctAnswer = '';
                                }
                                setEditedQuestion(newQuestion);
                            }}
                        >
                            <SelectTrigger id="question-type" className="bg-slate-900 border-white/10 text-white h-12">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-white/10 text-white">
                                {questionTypeOptions.map(type => (
                                    <SelectItem key={type} value={type} className="focus:bg-white/10 focus:text-white cursor-pointer">{type}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="difficulty" className="text-slate-300 font-bold uppercase tracking-wider text-xs">Zorluk Seviyesi</Label>
                        <Select value={editedQuestion.difficulty} onValueChange={(val) => setEditedQuestion({...editedQuestion, difficulty: val as Question['difficulty']})}>
                             <SelectTrigger id="difficulty" className="bg-slate-900 border-white/10 text-white h-12"><SelectValue/></SelectTrigger>
                             <SelectContent className="bg-slate-900 border-white/10 text-white">
                                {difficultyOptions.map(opt => (
                                    <SelectItem key={opt} value={opt} className={cn("focus:bg-white/10 focus:text-white cursor-pointer", opt === 'Kolay' ? "text-emerald-400" : opt === 'Orta' ? "text-yellow-400" : "text-red-400")}>
                                        {opt}
                                    </SelectItem>
                                ))}
                             </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {/* Cevaplar Bölümü */}
            <Card className="bg-slate-900/40 border-white/5 shadow-inner">
                <CardHeader className="pb-4 border-b border-white/5">
                    <CardTitle className="text-lg text-white font-bold flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" /> Cevap Seçenekleri
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                    {(editedQuestion.type === 'Çoktan Seçmeli' || editedQuestion.type === 'Boşluk Doldurma') && (
                      <div className="space-y-4">
                          <RadioGroup value={editedQuestion.correctAnswer} onValueChange={(val) => setEditedQuestion({...editedQuestion, correctAnswer: val})} className="space-y-3">
                          {(editedQuestion.options || ['', '', '', '']).map((option, index) => (
                             <div key={index} className="flex items-center gap-3 p-2 pr-4 rounded-xl bg-slate-950/50 border border-white/5 focus-within:border-indigo-500/50 transition-colors">
                                <RadioGroupItem 
                                    value={option} 
                                    id={`option-${index}`} 
                                    className="border-white/20 text-indigo-500 ml-2"
                                />
                                <div className="flex-1">
                                    <Input 
                                        value={option} 
                                        onChange={(e) => { const newOptions = [...(editedQuestion.options || ['', '', '', ''])]; newOptions[index] = e.target.value; setEditedQuestion({...editedQuestion, options: newOptions}) }} 
                                        placeholder={`Seçenek ${index + 1}`} 
                                        className="bg-transparent border-none text-white placeholder:text-slate-600 h-10 focus-visible:ring-0"
                                    />
                                </div>
                                {editedQuestion.correctAnswer === option && option !== '' && (
                                    <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider px-2">Doğru</span>
                                )}
                             </div>
                            ))}
                          </RadioGroup>
                      </div>
                    )}
                     {editedQuestion.type === 'Doğru/Yanlış' && (
                        <div className="space-y-4">
                            <Label className="text-slate-300">Doğru Cevabı Seçin</Label>
                            <RadioGroup value={editedQuestion.correctAnswer} onValueChange={(val) => setEditedQuestion({...editedQuestion, correctAnswer: val})} className="flex space-x-6">
                                <div className={cn("flex items-center space-x-3 p-4 rounded-xl border-2 cursor-pointer transition-all", editedQuestion.correctAnswer === 'Doğru' ? "bg-emerald-500/20 border-emerald-500" : "bg-slate-900 border-white/10 hover:bg-slate-800")}>
                                    <RadioGroupItem value="Doğru" id="r1" className="border-white/20 text-emerald-500" />
                                    <Label htmlFor="r1" className="text-lg font-bold cursor-pointer text-white">Doğru</Label>
                                </div>
                                <div className={cn("flex items-center space-x-3 p-4 rounded-xl border-2 cursor-pointer transition-all", editedQuestion.correctAnswer === 'Yanlış' ? "bg-red-500/20 border-red-500" : "bg-slate-900 border-white/10 hover:bg-slate-800")}>
                                    <RadioGroupItem value="Yanlış" id="r2" className="border-white/20 text-red-500" />
                                    <Label htmlFor="r2" className="text-lg font-bold cursor-pointer text-white">Yanlış</Label>
                                </div>
                            </RadioGroup>
                        </div>
                    )}
                </CardContent>
            </Card>
            
            {/* Bağlam Ayarları (Accordion) */}
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1" className="border border-white/10 rounded-xl bg-slate-900/30 px-2">
                <AccordionTrigger className="hover:no-underline text-slate-300 hover:text-white">
                    <span className="flex items-center gap-2 font-bold"><Layers className="h-4 w-4"/> İlişkilendirme Ayarları</span>
                </AccordionTrigger>
                <AccordionContent className="pt-4 pb-4">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-slate-400 font-bold uppercase">Sınıf</Label>
                      <Select value={editedQuestion.classId || ''} onValueChange={(val) => handleContextChange('class', val)}>
                          <SelectTrigger className="bg-slate-950 border-white/10 text-white"><SelectValue placeholder="Sınıf Seç"/></SelectTrigger>
                          <SelectContent className="bg-slate-900 border-white/10 text-white">
                              {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                          </SelectContent>
                      </Select>
                    </div>
                     <div className="space-y-2">
                        <Label className="text-xs text-slate-400 font-bold uppercase">Ders</Label>
                        <Select value={editedQuestion.courseId || ''} onValueChange={(val) => handleContextChange('course', val)} disabled={!editedQuestion.classId}>
                            <SelectTrigger className="bg-slate-950 border-white/10 text-white"><SelectValue placeholder="Ders Seç"/></SelectTrigger>
                            <SelectContent className="bg-slate-900 border-white/10 text-white">
                                {curriculum.filter(c => c.classId === editedQuestion.classId || !c.classId).map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label className="text-xs text-slate-400 font-bold uppercase">Ünite</Label>
                         <Select value={editedQuestion.unitId || ''} onValueChange={(val) => handleContextChange('unit', val)} disabled={!selectedCourse}>
                            <SelectTrigger className="bg-slate-950 border-white/10 text-white"><SelectValue placeholder="Ünite Seç"/></SelectTrigger>
                            <SelectContent className="bg-slate-900 border-white/10 text-white">
                                {selectedCourse?.units.map(u => <SelectItem key={u.id} value={u.id}>{u.title}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label className="text-xs text-slate-400 font-bold uppercase">Konu</Label>
                         <Select value={editedQuestion.topicId || ''} onValueChange={(val) => handleContextChange('topic', val)} disabled={!selectedUnit}>
                            <SelectTrigger className="bg-slate-950 border-white/10 text-white"><SelectValue placeholder="Konu Seç"/></SelectTrigger>
                            <SelectContent className="bg-slate-900 border-white/10 text-white">
                                {selectedUnit?.topics.map(t => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
        </div>
        
        {/* Footer */}
        <DialogFooter className="p-6 border-t border-white/5 bg-slate-900/80 backdrop-blur-sm flex flex-row items-center justify-between gap-4">
          <div className="flex gap-2">
             <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" disabled={editedQuestion.id.startsWith('new-')} className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-10 w-10">
                        <Trash2 className="h-5 w-5"/>
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-slate-900 border-white/10 text-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-red-400">Soruyu Sil</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-400">Bu soruyu silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-transparent border-white/10 text-slate-300 hover:bg-white/5 hover:text-white">İptal</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onDelete(editedQuestion.id)} className="bg-red-600 hover:bg-red-500 text-white border-none">Sil</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <div className="h-10 w-px bg-white/10 mx-1"></div>
            <Button variant="outline" onClick={() => onNavigate(editedQuestion, 'prev')} disabled={editingState.index === 0 || isSaving} className="border-white/10 text-slate-300 hover:text-white hover:bg-white/5">
                <ArrowLeft className="h-4 w-4 mr-1" /> Önceki
            </Button>
            <Button variant="outline" onClick={() => onNavigate(editedQuestion, 'next')} disabled={editingState.index >= totalQuestions - 1 || isSaving} className="border-white/10 text-slate-300 hover:text-white hover:bg-white/5">
                Sonraki <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
          
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-slate-400 hover:text-white hover:bg-white/5">İptal</Button>
            <Button onClick={() => onSave(editedQuestion)} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 shadow-lg shadow-emerald-900/20">
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                Kaydet
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}