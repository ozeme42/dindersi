

'use client';

import { useState, useEffect, useMemo, useCallback } from "react";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    PlusCircle,
    FilePenLine,
    ArrowLeft,
    ArrowRight,
    Loader2,
    Upload,
    Sparkles,
    Users,
    Book,
    Library,
    ListTodo,
    Check,
    ChevronDown,
    Trash2,
    ArrowDownAZ,
    CalendarClock,
    Search,
    Filter,
    Home
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuCheckboxItem,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, where, Timestamp } from "firebase/firestore";
import type { Question, Course, Unit, Topic, SchoolClass } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { AIGenerationDialog } from "@/components/ai-generation-dialog";
import { BulkImportDialog } from "@/components/bulk-import-dialog";
import { cn } from "@/lib/utils";
import { SelectionGrid } from "@/components/selection-grid";
import { saveQuestion, updateQuestionDifficulty, deleteBulkQuestions, saveBulkQuestions, saveGeneratedQuestions } from "./actions";
import { Checkbox } from "@/components/ui/checkbox";
import { QuestionEditorDialog } from "@/components/question-editor-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


type EnrichedCourse = Course & { units: (Unit & { topics: Topic[] })[] };

const steps = [
  { id: 1, name: "Sınıf", icon: <Users className="h-5 w-5" /> },
  { id: 2, name: "Ders", icon: <Book className="h-5 w-5" /> },
  { id: 3, name: "Ünite", icon: <Library className="h-5 w-5" /> },
  { id: 4, name: "Konu", icon: <ListTodo className="h-5 w-5" /> },
  { id: 5, name: "Sorular", icon: <Check className="h-5 w-5" /> },
];

const difficultyOptions: Question['difficulty'][] = ['Kolay', 'Orta', 'Zor'];
const questionTypeOptions: Question['type'][] = ['Çoktan Seçmeli', 'Doğru/Yanlış', 'Boşluk Doldurma'];


function QuestionCard({ question, index, onEdit, onDifficultyChange, onSelect, isSelected }: { 
    question: Question, 
    index: number, 
    onEdit: () => void, 
    onDifficultyChange: (questionId: string, difficulty: Question['difficulty']) => void,
    onSelect: (questionId: string) => void,
    isSelected: boolean
}) {
    const difficultyColors = {
        'Kolay': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30',
        'Orta': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/30',
        'Zor': 'bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30',
    };
    
    return (
        <Card className={cn(
            "flex flex-col hover:shadow-lg transition-all duration-300 bg-slate-900/40 backdrop-blur-sm border-white/5 hover:border-white/10 group relative overflow-hidden", 
            isSelected && "ring-2 ring-indigo-500 ring-offset-2 ring-offset-slate-950 bg-indigo-900/10"
        )}>
             {/* Glow Effect */}
             <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

            <CardHeader className="flex flex-row items-start gap-4 pb-2 relative z-10">
                 <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onSelect(question.id)}
                    aria-label={`Select question ${index + 1}`}
                    className="mt-1 border-white/20 data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500"
                />
                <div className="flex-1 space-y-1">
                    <div className="flex items-start gap-3">
                       <span className="font-black text-indigo-400 text-lg">#{index + 1}</span>
                       <p className="text-base font-medium text-slate-200 line-clamp-3 leading-relaxed">{question.text}</p>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="py-2 px-4 ml-11 relative z-10">
                 <div className="p-3 bg-emerald-950/30 border-l-4 border-emerald-500 rounded-r-lg">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 mb-1">Doğru Cevap</p>
                    <p className="text-sm font-medium text-emerald-100">{question.correctAnswer}</p>
                </div>
            </CardContent>
            <CardFooter className="flex justify-between items-center bg-black/20 p-3 mt-auto border-t border-white/5 relative z-10">
                 <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-slate-800 text-slate-300 border-white/10">{question.type}</Badge>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Badge variant="outline" className={cn("cursor-pointer font-bold border", difficultyColors[question.difficulty])}>
                                {question.difficulty}
                            </Badge>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-slate-900 border-white/10 text-white">
                            <DropdownMenuLabel>Zorluğu Değiştir</DropdownMenuLabel>
                            {difficultyOptions.map(difficulty => (
                                <DropdownMenuItem key={difficulty} onClick={() => onDifficultyChange(question.id, difficulty)} className="focus:bg-white/10 focus:text-white cursor-pointer">
                                    {difficulty}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                 </div>
                <Button size="sm" variant="ghost" onClick={onEdit} className="text-slate-400 hover:text-white hover:bg-white/10 h-8">
                    <FilePenLine className="mr-2 h-3.5 w-3.5" /> Düzenle
                </Button>
            </CardFooter>
        </Card>
    );
}

export default function ExamQuestionBankPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  
  const [allData, setAllData] = useState<{ classes: SchoolClass[]; courses: EnrichedCourse[]; questions: Question[] }>({
    classes: [],
    courses: [],
    questions: [],
  });

  const [selection, setSelection] = useState({ classId: '', courseId: '', unitId: '', topicId: '' });
  const [selectionNames, setSelectionNames] = useState({ className: '', courseName: '', unitName: '', topicName: '' });

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
  
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [sortBy, setSortBy] = useState<'text' | 'createdAt'>('text');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [questionsQuerySnapshot, classesSnapshot, coursesSnapshot] = await Promise.all([
        getDocs(query(collection(db, "questions"))),
        getDocs(query(collection(db, "classes"), orderBy("createdAt", "asc"))),
        getDocs(collection(db, "courses"))
      ]);

      const classesData = classesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolClass));
      const coursesDataRaw = coursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
      
      const courseIdToClassId = new Map(coursesDataRaw.map(c => [c.id, c.classId]));
      const courseIdToClassName = new Map(coursesDataRaw.map(c => {
          const classInfo = classesData.find(cls => cls.id === c.classId);
          return [c.id, classInfo?.name || 'Genel'];
      }));
      
      const questionsData = questionsQuerySnapshot.docs.map(doc => {
          const data = doc.data();
          const createdAt = (data.createdAt as Timestamp)?.toDate()?.toISOString() || new Date(0).toISOString();
          return {
              ...data,
              id: doc.id,
              classId: courseIdToClassId.get(data.courseId) || '',
              className: courseIdToClassName.get(data.courseId) || 'Genel',
              createdAt,
          } as Question;
      });
      
      const coursesWithUnits = await Promise.all(coursesDataRaw.map(async (courseDoc) => {
        const course = { ...courseDoc, units: [] } as EnrichedCourse;
        const unitsSnapshot = await getDocs(query(collection(db, `courses/${course.id}/units`), orderBy("title")));
        course.units = await Promise.all(unitsSnapshot.docs.map(async (unitDoc) => {
            const unit = { id: unitDoc.id, ...unitDoc.data(), topics: [] } as (Unit & { topics: Topic[] });
            const topicsSnapshot = await getDocs(query(collection(db, `courses/${course.id}/units/${unit.id}/topics`), orderBy('title')));
            unit.topics = topicsSnapshot.docs.map(topicDoc => ({ id: topicDoc.id, ...topicDoc.data() } as Topic));
            return unit;
        }));
        return course;
      }));

      setAllData({ classes: classesData, courses: coursesWithUnits, questions: questionsData });
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({ title: "Hata", description: "Veriler yüklenirken bir hata oluştu.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  const handleNext = () => currentStep < steps.length && setCurrentStep(currentStep + 1);
  const handleBack = () => {
      if (currentStep > 1) {
          if (currentStep === 2) setSelection(s => ({...s, classId: ''}));
          if (currentStep === 3) setSelection(s => ({...s, courseId: ''}));
          if (currentStep === 4) setSelection(s => ({...s, unitId: ''}));
          if (currentStep === 5) setSelection(s => ({...s, topicId: ''}));
          setCurrentStep(currentStep - 1);
      }
  };

  const handleSelect = (type: 'class' | 'course' | 'unit' | 'topic', id: string, name: string) => {
    if (type === 'class') {
      setSelection({ classId: id, courseId: '', unitId: '', topicId: '' });
      setSelectionNames({ className: name, courseName: '', unitName: '', topicName: '' });
    } else if (type === 'course') {
      setSelection(s => ({ ...s, courseId: id, unitId: '', topicId: '' }));
      setSelectionNames(s => ({ ...s, courseName: name, unitName: '' }));
    } else if (type === 'unit') {
      setSelection(s => ({ ...s, unitId: id, topicId: '' }));
      setSelectionNames(s => ({ ...s, unitName: name, topicName: '' }));
    } else if (type === 'topic') {
      setSelection(s => ({ ...s, topicId: id }));
      setSelectionNames(s => ({ ...s, topicName: name }));
    }
    handleNext();
  }
  
  const classesWithCounts = useMemo(() => {
    return allData.classes.map(c => {
        const courseIdsInClass = new Set(allData.courses.filter(course => course.classId === c.id).map(course => course.id));
        return {
            ...c,
            questionCount: allData.questions.filter(q => courseIdsInClass.has(q.courseId)).length
        };
    });
  }, [allData]);

  const filteredCourses = useMemo(() => {
    if (!selection.classId) return [];
    return allData.courses.filter(c => c.classId === selection.classId || !c.classId);
  }, [selection.classId, allData.courses]);

  const filteredCoursesWithCounts = useMemo(() => {
    return filteredCourses.map(course => ({
        ...course,
        questionCount: allData.questions.filter(q => q.courseId === course.id).length
    }));
  }, [filteredCourses, allData.questions]);

  const filteredUnits = useMemo(() => {
    if (!selection.courseId) return [];
    return allData.courses.find(c => c.id === selection.courseId)?.units || [];
  }, [selection.courseId, allData.courses]);

  const filteredUnitsWithCounts = useMemo(() => {
    return filteredUnits.map(unit => ({
        ...unit,
        questionCount: allData.questions.filter(q => q.unitId === unit.id).length
    }));
  }, [filteredUnits, allData.questions]);

  const filteredTopics = useMemo(() => {
    if (!selection.unitId) return [];
    return filteredUnits.find(u => u.id === selection.unitId)?.topics || [];
  }, [selection.unitId, filteredUnits]);

  const filteredTopicsWithCounts = useMemo(() => {
    return filteredTopics.map(topic => ({
        ...topic,
        questionCount: allData.questions.filter(q => q.topicId === topic.id).length
    }));
  }, [filteredTopics, allData.questions]);
  
  const filteredQuestions = useMemo(() => {
    let tempQuestions = allData.questions;
    
    if (selection.topicId && selection.topicId !== 'all') {
        tempQuestions = tempQuestions.filter((q) => q.topicId === selection.topicId);
    } else if (selection.unitId && selection.unitId !== 'all') {
        tempQuestions = tempQuestions.filter((q) => q.unitId === selection.unitId);
    } else if (selection.courseId && selection.courseId !== 'all') {
        tempQuestions = tempQuestions.filter((q) => q.courseId === selection.courseId);
    } else if (selection.classId) {
         const courseIdsInClass = new Set(filteredCourses.map(c => c.id));
         tempQuestions = tempQuestions.filter(q => q.courseId && courseIdsInClass.has(q.courseId));
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
    
    return [...tempQuestions].sort((a, b) => {
        if (sortBy === 'text') {
            return (a.text || '').localeCompare(b.text || '', 'tr');
        } else { // 'createdAt'
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
        }
    });

  }, [allData.questions, selection, searchTerm, selectedQuestionTypes, selectedDifficulties, filteredCourses, sortBy]);
  
  useEffect(() => {
    setCurrentPage(1);
    setSelectedQuestions(new Set());
  }, [filteredQuestions]);
  
  const totalPages = useMemo(() => {
    return Math.ceil(filteredQuestions.length / itemsPerPage);
  }, [filteredQuestions, itemsPerPage]);

  const paginatedQuestions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredQuestions.slice(startIndex, endIndex);
  }, [filteredQuestions, currentPage, itemsPerPage]);

  const handleOpenDialog = (question: Partial<Question> | null, index: number = -1) => {
    const questionContext = currentStep === 5 ? {
        classId: selection.classId,
        className: selectionNames.className,
        courseId: selection.courseId,
        unitId: selection.unitId,
        topicId: selection.topicId,
        topic: selectionNames.topicName,
    } : {};

    setEditingState({
        question: question ? (question as Question) : {
            id: `new-${Date.now()}`,
            text: '',
            type: 'Çoktan Seçmeli',
            difficulty: 'Orta',
            options: ['', '', '', ''],
            correctAnswer: '',
            ...questionContext,
        },
        index
    });
    setIsEditorOpen(true);
  };
  
  const handleSaveQuestion = async (questionToSave: Question): Promise<Question | null> => {
    if (!questionToSave) return null;
    setIsSaving(true);
    const result = await saveQuestion(questionToSave);

    if (result.success && result.question) {
        toast({ title: "Başarılı", description: "Soru kaydedildi." });
        await fetchData();
        setIsSaving(false);
        setEditingState(prev => prev ? { ...prev, question: result.question as Question } : null);
        return result.question;
    } else {
        toast({ title: "Hata", description: result.error, variant: "destructive" });
        setIsSaving(false);
        return null;
    }
  };
  
  const handleNavigate = async (currentData: Question, direction: 'prev' | 'next') => {
    const savedData = await handleSaveQuestion(currentData);
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
  
  const handleSelectQuestion = (questionId: string) => {
    setSelectedQuestions(prev => {
        const newSet = new Set(prev);
        if (newSet.has(questionId)) {
            newSet.delete(questionId);
        } else {
            newSet.add(questionId);
        }
        return newSet;
    });
  };

  const handleSelectAllOnPage = () => {
    const allOnPageIds = paginatedQuestions.map(q => q.id);
    const currentSelection = new Set(selectedQuestions);
    const allOnPageSelected = paginatedQuestions.length > 0 && allOnPageIds.every(id => currentSelection.has(id));

    if (allOnPageSelected) {
        allOnPageIds.forEach(id => currentSelection.delete(id));
    } else {
        allOnPageIds.forEach(id => currentSelection.add(id));
    }
    setSelectedQuestions(currentSelection);
  };
  
  const handleBulkDelete = async () => {
    setIsDeleting(true);
    const result = await deleteBulkQuestions(Array.from(selectedQuestions));
    if (result.success) {
        toast({ title: "Başarılı", description: `${result.count} soru silindi.` });
        setSelectedQuestions(new Set());
        fetchData(); // Refresh data
    } else {
        toast({ title: "Hata", description: result.error, variant: "destructive" });
    }
    setIsDeleting(false);
  };

  const handleDeleteSingleQuestion = async (questionId: string) => {
    const result = await deleteBulkQuestions([questionId]);
    if (result.success) {
        toast({ title: "Başarılı", description: "Soru silindi." });
        setSelectedQuestions(new Set());
        fetchData();
    } else {
        toast({ title: "Hata", description: result.error, variant: "destructive" });
    }
  };

  const aiGenerationContext = useMemo(() => {
    if (currentStep !== 5 || !selection.topicId || selection.topicId === 'all') return null;

    const course = allData.courses.find(c => c.id === selection.courseId);
    if (!course) return null;

    const unit = course.units?.find(u => u.id === selection.unitId);
    if (!unit) return null;

    const topic = unit.topics.find(t => t.id === selection.topicId);
    if (!topic) return null;

    return {
        selection,
        selectionNames,
        sourceText: topic.sourceText || ''
    };
}, [currentStep, selection, selectionNames, allData.courses]);

  const renderContent = () => {
      if(isLoading) return <div className="flex justify-center items-center h-full"><Loader2 className="h-12 w-12 animate-spin text-purple-500" /></div>;

      switch(currentStep) {
          case 1: return <SelectionGrid items={classesWithCounts} onSelect={(id, name) => handleSelect('class', id, name)} titleKey="name" isLoading={isLoading} countKey="questionCount" countLabel="Soru"/>
          case 2: return <SelectionGrid items={filteredCoursesWithCounts} onSelect={(id, name) => handleSelect('course', id, name)} titleKey="title" isLoading={isLoading} countKey="questionCount" countLabel="Soru"/>
          case 3: return <SelectionGrid items={filteredUnitsWithCounts} onSelect={(id, name) => handleSelect('unit', id, name)} specialOptions={[{id: 'all', name: 'Tüm Üniteler', questionCount: filteredCoursesWithCounts.find(c => c.id === selection.courseId)?.questionCount || 0}]} titleKey="title" isLoading={isLoading} countKey="questionCount" countLabel="Soru"/>
          case 4: return <SelectionGrid items={filteredTopicsWithCounts} onSelect={(id, name) => handleSelect('topic', id, name)} specialOptions={[{id: 'all', name: 'Tüm Konular', questionCount: filteredUnitsWithCounts.find(u => u.id === selection.unitId)?.questionCount || 0}]} titleKey="title" isLoading={isLoading} countKey="questionCount" countLabel="Soru"/>
          case 5: return (
              <div>
                   <div className="flex flex-col xl:flex-row items-center gap-4 mb-6 p-4 rounded-2xl bg-slate-900/60 backdrop-blur-md border border-white/5 shadow-lg">
                      <div className="relative flex-grow w-full">
                         <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                         <Input 
                             placeholder="Sorularda ara..."
                             value={searchTerm}
                             onChange={(e) => setSearchTerm(e.target.value)}
                             className="pl-10 bg-slate-950 border-white/10 text-white focus:border-indigo-500/50 h-10 w-full"
                         />
                      </div>
                      <div className="flex flex-wrap gap-2 w-full xl:w-auto">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="border-white/10 text-slate-300 hover:text-white hover:bg-white/5 bg-slate-950">
                                    <Filter className="mr-2 h-4 w-4 text-indigo-400"/> Zorluk <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="bg-slate-900 border-white/10 text-white">
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
                                        className="focus:bg-white/10 focus:text-white cursor-pointer"
                                    >
                                        {option}
                                    </DropdownMenuCheckboxItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="border-white/10 text-slate-300 hover:text-white hover:bg-white/5 bg-slate-950">
                                    <ListTodo className="mr-2 h-4 w-4 text-purple-400"/> Soru Tipi <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="bg-slate-900 border-white/10 text-white">
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
                                        className="focus:bg-white/10 focus:text-white cursor-pointer"
                                    >
                                        {option}
                                    </DropdownMenuCheckboxItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <Select value={String(itemsPerPage)} onValueChange={(value) => { setItemsPerPage(Number(value)); setCurrentPage(1); }}>
                          <SelectTrigger className="w-[140px] bg-slate-950 border-white/10 text-slate-300">
                              <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-900 border-white/10 text-white">
                              <SelectItem value="15">Sayfa: 15</SelectItem>
                              <SelectItem value="25">Sayfa: 25</SelectItem>
                              <SelectItem value="50">Sayfa: 50</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                      <div className="flex items-center gap-3 bg-slate-900/40 p-2 rounded-lg border border-white/5">
                          <Checkbox id="select-all" checked={paginatedQuestions.length > 0 && paginatedQuestions.every(q => selectedQuestions.has(q.id))} onCheckedChange={handleSelectAllOnPage} disabled={paginatedQuestions.length === 0} className="border-white/20 data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500"/>
                          <Label htmlFor="select-all" className="text-sm font-medium text-slate-300 cursor-pointer">Tümünü Seç ({paginatedQuestions.length})</Label>
                      </div>

                      {selectedQuestions.size > 0 && (
                          <div className="flex items-center gap-3 animate-in fade-in slide-in-from-right-5 duration-300">
                              <Badge variant="secondary" className="bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border-indigo-500/30 px-3 py-1.5 text-sm">
                                {selectedQuestions.size} Seçildi
                              </Badge>
                              <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                      <Button variant="destructive" size="sm" disabled={isDeleting} className="bg-red-600 hover:bg-red-500 shadow-lg shadow-red-900/20">
                                          <Trash2 className="mr-2 h-4 w-4" /> Sil
                                      </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent className="bg-slate-900 border-white/10 text-white">
                                      <AlertDialogHeader>
                                          <AlertDialogTitle className="text-red-400">Emin misiniz?</AlertDialogTitle>
                                          <AlertDialogDescription className="text-slate-400">
                                              Bu işlem geri alınamaz. Seçilen {selectedQuestions.size} soru kalıcı olarak silinecektir.
                                          </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                          <AlertDialogCancel className="bg-transparent border-white/10 text-slate-300 hover:bg-white/5 hover:text-white">İptal</AlertDialogCancel>
                                          <AlertDialogAction onClick={handleBulkDelete} className="bg-red-600 hover:bg-red-500 text-white border-none" disabled={isDeleting}>{isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Evet, Sil</AlertDialogAction>
                                      </AlertDialogFooter>
                                  </AlertDialogContent>
                              </AlertDialog>
                          </div>
                      )}
                </div>


                <div className="flex flex-wrap items-center justify-end gap-2 mb-6">
                    <Button variant={sortBy === 'text' ? 'secondary' : 'ghost'} onClick={() => setSortBy('text')} size="sm" className={cn("h-9 border", sortBy === 'text' ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30" : "border-transparent text-slate-400 hover:text-white hover:bg-white/5")}>
                        <ArrowDownAZ className="mr-2 h-4 w-4"/> A-Z
                    </Button>
                     <Button variant={sortBy === 'createdAt' ? 'secondary' : 'ghost'} onClick={() => setSortBy('createdAt')} size="sm" className={cn("h-9 border", sortBy === 'createdAt' ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30" : "border-transparent text-slate-400 hover:text-white hover:bg-white/5")}>
                        <CalendarClock className="mr-2 h-4 w-4"/> Tarih
                    </Button>
                    <div className="w-px h-6 bg-white/10 mx-2 hidden sm:block"></div>
                    <Button size="sm" className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white border-0 shadow-lg shadow-purple-900/20" onClick={() => setIsAIGenOpen(true)}><Sparkles className="h-4 w-4 mr-2" /> AI Üretim</Button>
                    <Button size="sm" className="bg-slate-800 hover:bg-slate-700 text-white border border-white/10" onClick={() => setIsBulkOpen(true)}><Upload className="h-4 w-4 mr-2" /> Toplu Ekle</Button>
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-900/20" onClick={() => handleOpenDialog(null)}><PlusCircle className="h-4 w-4 mr-2" /> Yeni Ekle</Button>
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
                                  onEdit={() => handleOpenDialog(question, globalIndex)} 
                                  onDifficultyChange={handleDifficultyChange}
                                  onSelect={() => handleSelectQuestion(question.id)}
                                  isSelected={selectedQuestions.has(question.id)}
                              />
                          )
                      })
                      ) : (
                      <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-500 border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/50">
                            <Search className="h-12 w-12 mb-4 opacity-20" />
                            <p className="text-lg font-medium">Bu filtrelerle eşleşen soru bulunamadı.</p>
                      </div>
                      )}
                  </div>
                  
                  {/* Pagination */}
                  {totalPages > 1 && (
                      <div className="flex justify-between items-center mt-8 pt-6 border-t border-white/5">
                          <span className="text-sm text-slate-500 font-medium">
                              Toplam {filteredQuestions.length} soru
                          </span>
                          <div className="flex items-center gap-2">
                              <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(p => p - 1)}
                              disabled={currentPage === 1}
                              className="border-white/10 text-slate-300 hover:text-white hover:bg-white/5 bg-slate-950"
                              >
                              Önceki
                              </Button>
                              <span className="text-sm font-bold text-white px-4 bg-slate-900 py-1.5 rounded-lg border border-white/10">
                              {currentPage} / {totalPages}
                              </span>
                              <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(p => p + 1)}
                              disabled={currentPage >= totalPages}
                              className="border-white/10 text-slate-300 hover:text-white hover:bg-white/5 bg-slate-950"
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
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 p-4 sm:p-6 md:p-8 relative overflow-hidden">
      
       {/* Arka Plan */}
       <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-[-20%] left-[-10%] w-[1000px] h-[1000px] bg-indigo-900/10 rounded-full blur-[150px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-emerald-900/10 rounded-full blur-[150px]" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10 space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-4 py-6">
            <div className="inline-flex items-center justify-center p-4 bg-slate-900 border border-white/10 rounded-full shadow-2xl mb-2">
                <FilePenLine className="h-10 w-10 text-indigo-400" />
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight uppercase drop-shadow-lg flex items-center gap-4 justify-center">
                Soru Bankası Sihirbazı
                <Badge className="bg-pink-500/20 text-pink-300 border-pink-500/30">CANLI VERİTABANI</Badge>
            </h1>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto font-medium">
                Oyunlarda ve etkinliklerde kullanılacak soruları yönetin.
            </p>
        </div>
        
        {/* Stepper */}
        <div className="flex justify-center items-center px-4 w-full mb-8">
            <div className="relative flex items-center justify-between w-full max-w-3xl">
                <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-800 -z-10 rounded-full"></div>
                <div 
                    className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-indigo-500 to-emerald-500 -z-10 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
                ></div>

                {steps.map((step, index) => {
                    const isCompleted = currentStep > step.id;
                    const isActive = currentStep === step.id;
                    
                    return (
                        <div key={step.id} className="flex flex-col items-center gap-3 group cursor-default">
                            <div className={cn(
                                "w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center border-4 transition-all duration-300 z-10 shadow-lg",
                                isActive 
                                    ? "bg-slate-900 border-indigo-500 text-indigo-400 scale-110 shadow-indigo-500/50" 
                                    : isCompleted 
                                        ? "bg-emerald-600 border-emerald-600 text-white scale-100" 
                                        : "bg-slate-900 border-slate-800 text-slate-600"
                            )}>
                                {isCompleted ? <Check className="w-6 h-6 stroke-[3]" /> : step.icon}
                            </div>
                            <span className={cn(
                                "text-xs md:text-sm font-bold transition-colors duration-300 absolute -bottom-8 whitespace-nowrap uppercase tracking-wider",
                                isActive ? "text-indigo-400" : isCompleted ? "text-emerald-500" : "text-slate-600"
                            )}>
                                {step.name}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>

        {/* Content Card */}
        <div className="mt-12">
            <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden min-h-[500px] flex flex-col">
                <div className="p-6 md:p-8 border-b border-white/5 bg-slate-900/50 flex items-center justify-between">
                     <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-lg">
                            {currentStep}
                        </span>
                        {steps.find(s => s.id === currentStep)?.name}
                     </h2>
                     {isLoading && <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />}
                </div>

                <div className="flex-grow p-6 md:p-10 bg-black/20">
                    {renderContent()}
                </div>
                
                <div className="p-6 md:p-8 border-t border-white/5 bg-slate-900/50 flex justify-between items-center">
                    <Button 
                        variant="outline" 
                        onClick={handleBack}
                        disabled={currentStep === 1}
                        className="border-white/10 text-slate-300 hover:text-white hover:bg-white/5 h-12 px-6 rounded-xl text-lg bg-transparent disabled:opacity-30"
                    >
                        <ArrowLeft className="mr-2 h-5 w-5" /> Geri
                    </Button>
                    {currentStep < steps.length && (
                         <Button 
                            onClick={handleNext} 
                            disabled={
                                (currentStep === 1 && !selection.classId) || 
                                (currentStep === 2 && !selection.courseId) ||
                                (currentStep === 3 && !selection.unitId) ||
                                (currentStep === 4 && !selection.topicId)
                            }
                            className="bg-indigo-600 hover:bg-indigo-500 text-white h-12 px-8 rounded-xl text-lg shadow-lg shadow-indigo-900/20 transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                        >
                            İleri <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                    )}
                </div>
            </div>
        </div>
      </div>
      
      {editingState && <QuestionEditorDialog key={editingState.question.id} isOpen={isEditorOpen} onOpenChange={setIsEditorOpen} editingState={editingState} onSave={handleSaveQuestion} onNavigate={handleNavigate} isSaving={isSaving} totalQuestions={filteredQuestions.length} curriculum={allData.courses} classes={allData.classes} onDelete={handleDeleteSingleQuestion} />}
      <AIGenerationDialog 
        isOpen={isAIGenOpen} 
        onOpenChange={setIsAIGenOpen} 
        onQuestionsGenerated={fetchData} 
        context={aiGenerationContext}
        onSave={saveGeneratedQuestions}
      />
      <BulkImportDialog 
        isOpen={isBulkOpen} 
        onOpenChange={setIsBulkOpen} 
        onQuestionsImported={fetchData} 
        context={currentStep === 5 ? { selection, selectionNames } : null}
        onSave={saveBulkQuestions}
      />
    </div>
  )
}
