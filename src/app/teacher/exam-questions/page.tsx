

"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter,
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
  Users,
  Book,
  Library,
  ListTodo,
  Check,
  ChevronDown,
  Trash2,
  ArrowDownAZ,
  CalendarClock,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, orderBy, where, Timestamp } from "firebase/firestore"
import type { Question, Course, Unit, Topic, SchoolClass } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { AIGenerationDialog } from "@/components/ai-generation-dialog"
import { BulkImportDialog } from "@/components/bulk-import-dialog"
import { cn } from "@/lib/utils"
import { SelectionGrid } from "@/components/selection-grid"
import { saveQuestion, updateQuestionDifficulty, deleteBulkQuestions, saveBulkQuestions, saveGeneratedQuestions } from "./actions"
import { Checkbox } from "@/components/ui/checkbox"
import { QuestionEditorDialog } from "@/components/question-editor-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"


type EnrichedCourse = Course & { units: (Unit & { topics: Topic[] })[] };

const steps = [
  { id: 1, name: "Sınıf Seçimi", icon: <Users className="h-5 w-5" /> },
  { id: 2, name: "Ders Seçimi", icon: <Book className="h-5 w-5" /> },
  { id: 3, name: "Ünite Seçimi", icon: <Library className="h-5 w-5" /> },
  { id: 4, name: "Konu Seçimi", icon: <ListTodo className="h-5 w-5" /> },
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
        'Kolay': 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200',
        'Orta': 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200',
        'Zor': 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200',
    };
    
    return (
        <Card className={cn("flex flex-col hover:shadow-md transition-shadow", isSelected && "ring-2 ring-primary")}>
            <CardHeader className="flex flex-row items-start gap-4 pb-4">
                 <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onSelect(question.id)}
                    aria-label={`Select question ${index + 1}`}
                    className="mt-1"
                />
                <div className="flex-1 space-y-1">
                    <div className="flex items-start gap-3">
                       <span className="font-bold text-primary">{index + 1}.</span>
                       <p className="text-base line-clamp-3 font-normal flex-1">{question.text}</p>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="py-2 px-4 ml-12">
                 <div className="p-2 bg-green-500/10 border-l-4 border-green-500 rounded">
                    <p className="text-xs font-semibold text-green-700">Doğru Cevap:</p>
                    <p className="text-sm font-medium text-green-800">{question.correctAnswer}</p>
                </div>
            </CardContent>
            <CardFooter className="flex justify-between items-center bg-muted/50 p-3 mt-auto">
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
        getDocs(query(collection(db, "examQuestions"))),
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
         tempQuestions = tempQuestions.filter(q => courseIdsInClass.has(q.courseId));
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
    
     // Return a new sorted array to ensure re-render
    return [...tempQuestions].sort((a, b) => {
        if (sortBy === 'text') {
            return (a.text || '').localeCompare(b.text || '', 'tr');
        } else { // 'createdAt'
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
        }
    });

  }, [
    allData.questions,
    selection,
    searchTerm,
    selectedQuestionTypes,
    selectedDifficulties,
    filteredCourses,
    sortBy,
  ]);
  
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
      if(isLoading) return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;

      switch(currentStep) {
          case 1: return <SelectionGrid items={classesWithCounts} onSelect={(id, name) => handleSelect('class', id, name)} titleKey="name" isLoading={isLoading} countKey="questionCount" countLabel="Soru"/>
          case 2: return <SelectionGrid items={filteredCoursesWithCounts} onSelect={(id, name) => handleSelect('course', id, name)} isLoading={isLoading} countKey="questionCount" countLabel="Soru"/>
          case 3: return <SelectionGrid items={filteredUnitsWithCounts} onSelect={(id, name) => handleSelect('unit', id, name)} specialOptions={[{id: 'all', name: 'Tüm Üniteler', questionCount: filteredCoursesWithCounts.find(c => c.id === selection.courseId)?.questionCount || 0}]} isLoading={isLoading} countKey="questionCount" countLabel="Soru"/>
          case 4: return <SelectionGrid items={filteredTopicsWithCounts} onSelect={(id, name) => handleSelect('topic', id, name)} specialOptions={[{id: 'all', name: 'Tüm Konular', questionCount: filteredUnitsWithCounts.find(u => u.id === selection.unitId)?.questionCount || 0}]} isLoading={isLoading} countKey="questionCount" countLabel="Soru"/>
          case 5: return (
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

                <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                          <Checkbox id="select-all" checked={paginatedQuestions.length > 0 && paginatedQuestions.every(q => selectedQuestions.has(q.id))} onCheckedChange={handleSelectAllOnPage} disabled={paginatedQuestions.length === 0}/>
                          <Label htmlFor="select-all" className="text-sm font-normal">Bu Sayfadaki Tümünü Seç ({paginatedQuestions.length})</Label>
                      </div>
                      {selectedQuestions.size > 0 && (
                          <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">{selectedQuestions.size} soru seçildi.</span>
                              <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                      <Button variant="destructive" size="sm" disabled={isDeleting}>
                                          <Trash2 className="mr-2 h-4 w-4" /> Seçilenleri Sil
                                      </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                      <AlertDialogHeader>
                                          <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                              Bu işlem geri alınamaz. Seçilen {selectedQuestions.size} soru kalıcı olarak silinecektir.
                                          </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                          <AlertDialogCancel>İptal</AlertDialogCancel>
                                          <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive hover:bg-destructive/90" disabled={isDeleting}>{isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Evet, Sil</AlertDialogAction>
                                      </AlertDialogFooter>
                                  </AlertDialogContent>
                              </AlertDialog>
                          </div>
                      )}
                </div>


                <div className="flex flex-wrap items-center justify-end gap-2 mb-4">
                    <Button variant={sortBy === 'text' ? 'secondary' : 'ghost'} onClick={() => setSortBy('text')} size="sm">
                        <ArrowDownAZ className="mr-2 h-4 w-4"/> İsme Göre Sırala
                    </Button>
                    <Button variant={sortBy === 'createdAt' ? 'secondary' : 'ghost'} onClick={() => setSortBy('createdAt')} size="sm">
                        <CalendarClock className="mr-2 h-4 w-4"/> Tarihe Göre Sırala
                    </Button>
                    <Button size="sm" className="gap-1" variant="outline" onClick={() => setIsAIGenOpen(true)}><Sparkles className="h-4 w-4" /> Yapay Zeka ile Soru Üret</Button>
                    <Button size="sm" className="gap-1" variant="outline" onClick={() => setIsBulkOpen(true)}><Upload className="h-4 w-4" /> Toplu Soru Ekle</Button>
                    <Button size="sm" className="gap-1" onClick={() => handleOpenDialog(null)}><PlusCircle className="h-4 w-4" /> Yeni Soru Ekle</Button>
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
            <h1 className="text-3xl font-bold font-headline">Soru Bankası Sihirbazı</h1>
            <p className="text-muted-foreground">Oyunlarda ve etkinliklerde kullanılacak soruları yönetin.</p>
        </div>
        
        <div className="flex justify-center items-center mb-8 px-4">
            <ol className="flex items-center w-full max-w-2xl">
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
                {selectionNames.className}
                {selectionNames.courseName && ` > ${selectionNames.courseName}`}
                {selectionNames.unitName && ` > ${selectionNames.unitName}`}
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
