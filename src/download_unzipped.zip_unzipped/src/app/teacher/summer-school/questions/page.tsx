

"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  PlusCircle,
  FilePenLine,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Upload,
  Sparkles,
  Book,
  ListTodo,
  Check,
  ChevronDown,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { db } from "@/lib/firebase"
import { collection, getDocs, doc, addDoc, updateDoc, query, orderBy, where } from "firebase/firestore"
import type { Question, Course, Unit, Topic } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { AIGenerationDialog } from "@/components/ai-generation-dialog"
import { BulkImportDialog } from "@/components/bulk-import-dialog"
import { cn } from "@/lib/utils"
import { SelectionGrid } from "@/components/selection-grid"
import { updateQuestionDifficulty } from "@/app/teacher/questions/actions"

type EnrichedCourse = Course & { topics: Topic[] };

const steps = [
  { id: 1, name: "Ders Seçimi", icon: <Book className="h-5 w-5" /> },
  { id: 2, name: "Konu Seçimi", icon: <ListTodo className="h-5 w-5" /> },
  { id: 3, name: "Sorular", icon: <Check className="h-5 w-5" /> },
];

const difficultyOptions: Question['difficulty'][] = ['Kolay', 'Orta', 'Zor'];
const questionTypeOptions: Question['type'][] = ['Çoktan Seçmeli', 'Doğru/Yanlış', 'Boşluk Doldurma'];


function QuestionCard({ question, index, onEdit, onDifficultyChange }: { question: Question, index: number, onEdit: () => void, onDifficultyChange: (questionId: string, difficulty: Question['difficulty']) => void }) {
    const difficultyColors = {
        'Kolay': 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200',
        'Orta': 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200',
        'Zor': 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200',
    };
    
    return (
        <Card className="flex flex-col hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-start justify-between gap-4 pb-4">
                <div className="flex items-start gap-4">
                    <span className="text-xl font-bold text-primary">{index + 1}</span>
                    <div className="space-y-1">
                        <CardTitle className="text-base line-clamp-3 font-normal">{question.text}</CardTitle>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-grow"/>
            <CardFooter className="flex justify-between items-center bg-muted/50 p-3">
                 <div className="flex items-center gap-2">
                    <Badge variant="secondary">{question.type}</Badge>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Badge variant="outline" className={cn("cursor-pointer", difficultyColors[question.difficulty])}>
                                {question.difficulty}
                            </Badge>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuLabel>Zorluğu Değiştir</DropdownMenuLabel>
                            {difficultyOptions.map(difficulty => (
                                <DropdownMenuItem key={difficulty} onClick={() => onDifficultyChange(question.id, difficulty)}>
                                    {difficulty}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                 </div>
                <Button size="sm" onClick={onEdit}>
                    <FilePenLine className="mr-2 h-4 w-4" /> Düzenle
                </Button>
            </CardFooter>
        </Card>
    );
}

export default function SummerQuestionManagementPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const [allData, setAllData] = useState<{ courses: EnrichedCourse[]; questions: Question[] }>({
    courses: [],
    questions: [],
  });

  const [selection, setSelection] = useState({ courseId: '', topicId: '' });
  const [selectionNames, setSelectionNames] = useState({ courseName: '', topicName: '' });

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingState, setEditingState] = useState<{ question: Question, index: number } | null>(null);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [isAIGenOpen, setIsAIGenOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedQuestionTypes, setSelectedQuestionTypes] = useState<string[]>([]);
  const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>([]);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const coursesQuery = query(collection(db, "courses"), where("isSummerSchool", "==", true));
      const [questionsQuerySnapshot, coursesSnapshot] = await Promise.all([
        getDocs(collection(db, "questions")),
        getDocs(coursesQuery),
      ]);

      const coursesDataRaw = coursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
      const summerCourseIds = new Set(coursesDataRaw.map(c => c.id));
      
      const questionsData = questionsQuerySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Question))
        .filter(q => summerCourseIds.has(q.courseId));

      const enrichedCourses: EnrichedCourse[] = [];
      for (const courseDoc of coursesDataRaw) {
        const course = { ...courseDoc, topics: [] } as EnrichedCourse;
        const topicsSnapshot = await getDocs(query(collection(db, `courses/${course.id}/topics`), orderBy("title")));
        course.topics = topicsSnapshot.docs.map(topicDoc => ({ id: topicDoc.id, ...topicDoc.data() } as Topic));
        enrichedCourses.push(course);
      }
      setAllData({ courses: enrichedCourses, questions: questionsData });
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({ title: "Hata", description: "Veriler yüklenirken bir hata oluştu.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);
  
  const handleNext = () => currentStep < steps.length && setCurrentStep(currentStep + 1);
  const handleBack = () => {
      if (currentStep > 1) {
          if (currentStep === 2) setSelection(s => ({...s, courseId: ''}));
          if (currentStep === 3) setSelection(s => ({...s, topicId: ''}));
          setCurrentStep(currentStep - 1);
      }
  };

  const handleSelect = (type: 'course' | 'topic', id: string, name: string) => {
    if (type === 'course') {
      setSelection({ courseId: id, topicId: '' });
      setSelectionNames({ courseName: name, topicName: '' });
    } else if (type === 'topic') {
      setSelection(s => ({ ...s, topicId: id }));
      setSelectionNames(s => ({ ...s, topicName: name }));
    }
    handleNext();
  }

  const filteredTopics = useMemo(() => {
    if (!selection.courseId) return [];
    return allData.courses.find(c => c.id === selection.courseId)?.topics || [];
  }, [selection.courseId, allData.courses]);
  
  const filteredQuestions = useMemo(() => {
    if (currentStep !== 3) return [];

    let tempQuestions = allData.questions;

    if (selection.topicId && selection.topicId !== 'all') {
      tempQuestions = tempQuestions.filter((q) => q.topicId === selection.topicId);
    } else if (selection.courseId && selection.courseId !== 'all') {
      tempQuestions = tempQuestions.filter((q) => q.courseId === selection.courseId);
    }

    if (searchTerm) {
      const lowercasedTerm = searchTerm.toLowerCase();
      tempQuestions = tempQuestions.filter((q) =>
        q.text.toLowerCase().includes(lowercasedTerm)
      );
    }
    if (selectedQuestionTypes.length > 0) {
      tempQuestions = tempQuestions.filter((q) =>
        selectedQuestionTypes.includes(q.type)
      );
    }
    if (selectedDifficulties.length > 0) {
      tempQuestions = tempQuestions.filter((q) =>
        selectedDifficulties.includes(q.difficulty)
      );
    }

    return tempQuestions;
  }, [
    currentStep,
    allData.questions,
    selection,
    searchTerm,
    selectedQuestionTypes,
    selectedDifficulties,
  ]);
  
  useEffect(() => {
    setCurrentPage(1);
  }, [filteredQuestions]);
  
  const totalPages = useMemo(() => {
    return Math.ceil(filteredQuestions.length / itemsPerPage);
  }, [filteredQuestions, itemsPerPage]);

  const paginatedQuestions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredQuestions.slice(startIndex, endIndex);
  }, [filteredQuestions, currentPage, itemsPerPage]);


  const handleEdit = (question: Question, index: number) => {
    setEditingState({ question, index });
    setIsEditorOpen(true);
  }

  const handleAddNew = () => {
    setEditingState({
      question: {
        id: `new-${Date.now()}`,
        text: '', type: 'Çoktan Seçmeli',
        courseId: selection.courseId, 
        topicId: selection.topicId,
        topic: selectionNames.topicName,
        difficulty: 'Orta',
        options: ['', '', '', ''],
        correctAnswer: ''
      },
      index: -1
    })
    setIsEditorOpen(true)
  }

  const handleSave = async (questionToSave: Question): Promise<Question | null> => {
    if (!questionToSave) return null;
    setIsSaving(true);
    const { id, ...questionData } = questionToSave;
    try {
      if (id.startsWith('new-')) {
        const newDocRef = await addDoc(collection(db, "questions"), questionData);
        toast({ title: "Başarılı", description: "Yeni soru başarıyla eklendi." });
        const newQuestion = { ...questionData, id: newDocRef.id };
        setAllData(prev => ({...prev, questions: [...prev.questions, newQuestion]}));
        setIsSaving(false);
        return newQuestion;
      } else {
        await updateDoc(doc(db, "questions", id), questionData);
        toast({ title: "Kaydedildi!", description: "Soru değişiklikleri kaydedildi." });
        setAllData(prev => ({
            ...prev,
            questions: prev.questions.map(q => q.id === id ? questionToSave : q)
        }));
        setIsSaving(false);
        return questionToSave;
      }
    } catch (error) {
      console.error("Error saving question:", error);
      toast({ title: "Hata", description: "Soru kaydedilirken bir hata oluştu.", variant: "destructive" });
      setIsSaving(false);
      return null;
    }
  }
  
  const handleNavigate = async (currentData: Question, direction: 'prev' | 'next') => {
    const savedData = await handleSave(currentData);
    if (!savedData) {
        toast({ title: "Navigasyon Hatası", description: "Mevcut soru kaydedilemediği için geçiş yapılamadı.", variant: "destructive"});
        return;
    }

    if (editingState) {
        const newIndex = direction === 'next' ? editingState.index + 1 : editingState.index - 1;
        if (newIndex >= 0 && newIndex < filteredQuestions.length) {
            setEditingState({ question: filteredQuestions[newIndex], index: newIndex });
        }
    }
  };
  
  const handleDifficultyChange = async (questionId: string, difficulty: Question['difficulty']) => {
    setAllData(prev => ({
        ...prev,
        questions: prev.questions.map(q => q.id === questionId ? { ...q, difficulty } : q)
    }));
    const result = await updateQuestionDifficulty(questionId, difficulty);
    if (!result.success) {
        toast({ title: "Hata", description: result.error, variant: "destructive" });
        fetchData();
    } else {
        toast({ title: "Başarılı", description: "Zorluk seviyesi güncellendi." });
    }
  }

  const renderContent = () => {
      if(isLoading) return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;

      switch(currentStep) {
          case 1: return <SelectionGrid items={allData.courses} onSelect={(id, name) => handleSelect('course', id, name)} titleKey="title" isLoading={isLoading} />
          case 2: return <SelectionGrid items={filteredTopics} onSelect={(id, name) => handleSelect('topic', id, name)} specialOptions={[{id: 'all', name: 'Tüm Konular'}]} isLoading={isLoading} />
          case 3: return (
              <div>
                  <div className="flex flex-col sm:flex-row items-center gap-2 mb-4 p-4 border rounded-lg bg-muted/50">
                    <Input 
                        placeholder="Sorularda ara..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="flex-grow bg-background"
                    />
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="w-full sm:w-auto bg-background">
                                Zorluk <ChevronDown className="ml-2 h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            {difficultyOptions.map(option => (
                                <DropdownMenuCheckboxItem
                                    key={option}
                                    checked={selectedDifficulties.includes(option)}
                                    onSelect={(e) => e.preventDefault()}
                                    onCheckedChange={(checked) => {
                                        return checked
                                            ? setSelectedDifficulties([...selectedDifficulties, option])
                                            : setSelectedDifficulties(selectedDifficulties.filter(item => item !== option))
                                    }}
                                >
                                    {option}
                                </DropdownMenuCheckboxItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="w-full sm:w-auto bg-background">
                                Soru Tipi <ChevronDown className="ml-2 h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            {questionTypeOptions.map(option => (
                                <DropdownMenuCheckboxItem
                                    key={option}
                                    checked={selectedQuestionTypes.includes(option)}
                                    onSelect={(e) => e.preventDefault()}
                                    onCheckedChange={(checked) => {
                                        return checked
                                            ? setSelectedQuestionTypes([...selectedQuestionTypes, option])
                                            : setSelectedQuestionTypes(selectedQuestionTypes.filter(item => item !== option))
                                    }}
                                >
                                    {option}
                                </DropdownMenuCheckboxItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                     <Select value={String(itemsPerPage)} onValueChange={(value) => { setItemsPerPage(Number(value)); setCurrentPage(1); }}>
                        <SelectTrigger className="w-full sm:w-[180px] bg-background">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="15">Sayfa Başına 15</SelectItem>
                            <SelectItem value="25">Sayfa Başına 25</SelectItem>
                            <SelectItem value="50">Sayfa Başına 50</SelectItem>
                        </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2 mb-4">
                      <Button size="sm" className="gap-1" variant="outline" onClick={() => setIsAIGenOpen(true)}><Sparkles className="h-4 w-4" /> Yapay Zeka ile Soru Üret</Button>
                      <Button size="sm" className="gap-1" variant="outline" onClick={() => setIsBulkOpen(true)}><Upload className="h-4 w-4" /> Toplu Soru Ekle</Button>
                      <Button size="sm" className="gap-1" onClick={handleAddNew}><PlusCircle className="h-4 w-4" /> Yeni Soru Ekle</Button>
                  </div>
                   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                        {paginatedQuestions.length > 0 ? (
                        paginatedQuestions.map((question, paginatedIndex) => {
                           const globalIndex = (currentPage - 1) * itemsPerPage + paginatedIndex;
                           return (
                                <QuestionCard 
                                    key={question.id} 
                                    question={question} 
                                    index={globalIndex} 
                                    onEdit={() => handleEdit(question, globalIndex)} 
                                    onDifficultyChange={handleDifficultyChange}
                                />
                           )
                        })
                        ) : (
                        <p className="col-span-full text-center text-muted-foreground py-16">Bu filtrelerle eşleşen soru bulunamadı.</p>
                        )}
                    </div>
                    {totalPages > 1 && (
                        <div className="flex justify-between items-center mt-6 pt-4 border-t">
                            <span className="text-sm text-muted-foreground">
                                Toplam {filteredQuestions.length} soru.
                            </span>
                            <div className="flex items-center gap-2">
                                <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(p => p - 1)}
                                disabled={currentPage === 1}
                                >
                                Önceki
                                </Button>
                                <span className="text-sm font-medium">
                                Sayfa {currentPage} / {totalPages}
                                </span>
                                <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(p => p + 1)}
                                disabled={currentPage >= totalPages}
                                >
                                Sonraki
                                </Button>
                            </div>
                        </div>
                    )}
              </div>
          );
          default: return null;
      }
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
            <h1 className="text-3xl font-bold font-headline">Yaz Kursu Soru Bankası</h1>
            <p className="text-muted-foreground">Yaz kursu dersleri için soruları yönetin.</p>
        </div>
        
        <div className="flex justify-center items-center mb-8 px-4">
            <ol className="flex items-center w-full max-w-lg">
                {steps.map((step, index) => (
                    <li key={step.id} className={cn("flex w-full items-center", { "after:content-[''] after:w-full after:h-1 after:border-b after:border-border after:border-2 after:inline-block": index !== steps.length - 1 })}>
                        <span className={cn("flex items-center justify-center w-10 h-10 rounded-full lg:h-12 lg:w-12 shrink-0 transition-colors duration-300",
                            currentStep > step.id ? "bg-primary text-primary-foreground" :
                            currentStep === step.id ? "bg-accent text-accent-foreground scale-110" :
                            "bg-muted text-muted-foreground"
                        )}>
                        {step.icon}
                        </span>
                    </li>
                ))}
            </ol>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{steps.find(s => s.id === currentStep)?.name}</CardTitle>
            <CardDescription>
                {selectionNames.courseName}
                {selectionNames.topicName && ` > ${selectionNames.topicName}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="min-h-[300px]">
            {renderContent()}
          </CardContent>
          <CardFooter className="flex justify-between pt-6">
              <Button variant="outline" onClick={handleBack} disabled={currentStep === 1}><ArrowLeft className="mr-2 h-4 w-4" /> Geri</Button>
              <Button onClick={handleNext} disabled={currentStep === steps.length}>İleri <ArrowRight className="mr-2 h-4 w-4" /></Button>
          </CardFooter>
        </Card>
      </div>
      
      {editingState && <QuestionEditorDialog key={editingState.question.id} isOpen={isEditorOpen} onOpenChange={setIsEditorOpen} editingState={editingState} onSave={handleSave} onNavigate={handleNavigate} isSaving={isSaving} totalQuestions={filteredQuestions.length} curriculum={allData.courses} />}
      <AIGenerationDialog 
        isOpen={isAIGenOpen} 
        onOpenChange={setIsAIGenOpen} 
        onQuestionsGenerated={fetchData} 
        context={currentStep === 3 ? { selection: {...selection, classId: '', unitId: ''}, selectionNames: {...selectionNames, className: '', unitName: ''} } : null}
      />
      <BulkImportDialog 
        isOpen={isBulkOpen} 
        onOpenChange={setIsBulkOpen} 
        onQuestionsImported={fetchData} 
        context={currentStep === 3 ? { selection: {...selection, classId: '', unitId: ''}, selectionNames: {...selectionNames, className: '', unitName: ''} } : null}
      />
    </div>
  )
}

function QuestionEditorDialog({ isOpen, onOpenChange, editingState, onSave, onNavigate, isSaving, totalQuestions, curriculum }: { isOpen: boolean, onOpenChange: (open: boolean) => void, editingState: { question: Question, index: number }, onSave: (q: Question) => Promise<Question | null>, onNavigate: (currentData: Question, direction: 'prev' | 'next') => void, isSaving: boolean, totalQuestions: number, curriculum: EnrichedCourse[] }) {
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
  
  const selectedCourse = curriculum.find(c => c.id === editedQuestion.courseId);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onOpenChange(false); }}>
      <DialogContent className="max-w-2xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-2 border-b">
          <DialogTitle>{editedQuestion.id.startsWith('new-') ? 'Yeni Soru Oluştur' : `Soru ${editingState.index + 1} Düzenle`}</DialogTitle>
          <DialogDescription>Soru detaylarını düzenleyin ve kaydedin.</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="space-y-2">
                <Label htmlFor="question-text" className="text-base">Soru Metni</Label>
                <Textarea ref={textareaRef} rows={1} id="question-text" className="resize-none overflow-hidden text-base" value={editedQuestion.text} onChange={(e) => setEditedQuestion({...editedQuestion, text: e.target.value})} placeholder="Soru metnini buraya yazın..."/>
            </div>
            
            <div className="space-y-2">
                <Label htmlFor="question-type-summer">Soru Tipi</Label>
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
                    <SelectTrigger id="question-type-summer">
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

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>Diğer Ayarlar (İlişki ve Özellikler)</AccordionTrigger>
                <AccordionContent className="pt-4">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Ders</Label>
                      <p className="font-medium">{selectedCourse?.title}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Konu</Label>
                      <p className="font-medium">{editedQuestion.topic}</p>
                    </div>
                     <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Soru Tipi</Label>
                      <p className="font-medium">{editedQuestion.type}</p>
                    </div>
                     <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Zorluk</Label>
                      <p className="font-medium">{editedQuestion.difficulty}</p>
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

