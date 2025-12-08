
"use client";

import { useState, useEffect, useRef } from "react";
import { z } from "zod";
import type { Question, Course, SchoolClass } from "@/lib/types";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, ArrowLeft, ArrowRight, Trash2 } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "./ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

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
      <DialogContent className="max-w-3xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-2 border-b">
          <DialogTitle>{editedQuestion.id.startsWith('new-') ? 'Yeni Soru Oluştur' : `Soru ${editingState.index + 1} Düzenle`}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="space-y-2">
                <Label htmlFor="question-text" className="text-base">Soru Metni</Label>
                <Textarea ref={textareaRef} rows={1} id="question-text" className="resize-none overflow-hidden text-base" value={editedQuestion.text} onChange={(e) => setEditedQuestion({...editedQuestion, text: e.target.value})} placeholder="Soru metnini buraya yazın..."/>
            </div>
            
            <div className="space-y-2">
                <Label htmlFor="question-type">Soru Tipi</Label>
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
                    <SelectTrigger id="question-type">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {questionTypeOptions.map(type => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Cevaplar</CardTitle>
                </CardHeader>
                <CardContent>
                    {(editedQuestion.type === 'Çoktan Seçmeli' || editedQuestion.type === 'Boşluk Doldurma') && (
                      <div className="space-y-2">
                         <RadioGroup value={editedQuestion.correctAnswer} onValueChange={(val) => setEditedQuestion({...editedQuestion, correctAnswer: val})} className="space-y-3 pt-2">
                          {(editedQuestion.options || ['', '', '', '']).map((option, index) => (
                             <div key={index} className="flex items-center gap-2">
                                <RadioGroupItem value={option} id={`option-${index}`} />
                                <Label htmlFor={`option-${index}`} className="font-normal flex-1">
                                    <Input value={option} onChange={(e) => { const newOptions = [...(editedQuestion.options || ['', '', '', ''])]; newOptions[index] = e.target.value; setEditedQuestion({...editedQuestion, options: newOptions}) }} placeholder={`Seçenek ${index + 1}`} className="text-base"/>
                                </Label>
                             </div>))}
                         </RadioGroup>
                      </div>)}
                     {editedQuestion.type === 'Doğru/Yanlış' && (
                        <div className="space-y-2">
                            <Label className="text-base">Doğru Cevap</Label>
                            <RadioGroup value={editedQuestion.correctAnswer} onValueChange={(val) => setEditedQuestion({...editedQuestion, correctAnswer: val})} className="flex space-x-4 pt-2">
                                <div className="flex items-center space-x-2"><RadioGroupItem value="Doğru" id="r1" /><Label htmlFor="r1">Doğru</Label></div>
                                <div className="flex items-center space-x-2"><RadioGroupItem value="Yanlış" id="r2" /><Label htmlFor="r2">Yanlış</Label></div>
                            </RadioGroup>
                        </div>
                    )}
                </CardContent>
            </Card>
            
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="difficulty">Zorluk Seviyesi</Label>
                    <Select value={editedQuestion.difficulty} onValueChange={(val) => setEditedQuestion({...editedQuestion, difficulty: val as Question['difficulty']})}>
                         <SelectTrigger id="difficulty"><SelectValue/></SelectTrigger>
                         <SelectContent>
                            {difficultyOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                         </SelectContent>
                    </Select>
                </div>
            </div>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>Diğer Ayarlar (İlişki ve Özellikler)</AccordionTrigger>
                <AccordionContent className="pt-4">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                    <div className="space-y-1">
                      <Label>Sınıf</Label>
                      <Select value={editedQuestion.classId || ''} onValueChange={(val) => handleContextChange('class', val)}>
                          <SelectTrigger><SelectValue placeholder="Sınıf Seç"/></SelectTrigger>
                          <SelectContent>
                              {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                          </SelectContent>
                      </Select>
                    </div>
                     <div className="space-y-1">
                        <Label>Ders</Label>
                        <Select value={editedQuestion.courseId || ''} onValueChange={(val) => handleContextChange('course', val)} disabled={!editedQuestion.classId}>
                            <SelectTrigger><SelectValue placeholder="Ders Seç"/></SelectTrigger>
                            <SelectContent>
                                {curriculum.filter(c => c.classId === editedQuestion.classId || !c.classId).map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-1">
                        <Label>Ünite</Label>
                         <Select value={editedQuestion.unitId || ''} onValueChange={(val) => handleContextChange('unit', val)} disabled={!selectedCourse}>
                            <SelectTrigger><SelectValue placeholder="Ünite Seç"/></SelectTrigger>
                            <SelectContent>
                                {selectedCourse?.units.map(u => <SelectItem key={u.id} value={u.id}>{u.title}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-1">
                        <Label>Konu</Label>
                         <Select value={editedQuestion.topicId || ''} onValueChange={(val) => handleContextChange('topic', val)} disabled={!selectedUnit}>
                            <SelectTrigger><SelectValue placeholder="Konu Seç"/></SelectTrigger>
                            <SelectContent>
                                {selectedUnit?.topics.map(t => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
        </div>
        <DialogFooter className="justify-between w-full p-4 mt-auto border-t bg-background">
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onNavigate(editedQuestion, 'prev')} disabled={editingState.index === 0 || isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin"/> : <ArrowLeft className="h-4 w-4" />}
            </Button>
            <Button variant="outline" onClick={() => onNavigate(editedQuestion, 'next')} disabled={editingState.index >= totalQuestions - 1 || isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin"/> : <ArrowRight className="h-4 w-4" />}
            </Button>
             <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive-outline" size="icon" disabled={editedQuestion.id.startsWith('new-')}><Trash2 className="h-4 w-4"/></Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Soruyu Sil</AlertDialogTitle>
                        <AlertDialogDescription>Bu soruyu silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>İptal</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onDelete(editedQuestion.id)}>Sil</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Kapat</Button>
            <Button onClick={() => onSave(editedQuestion)} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                Kaydet
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
