
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Book, Library, ListTodo, Settings, PartyPopper, Loader2, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Course, Unit, Topic, SchoolClass, UserProfile } from "@/lib/types";
import { SelectionGrid } from "@/components/selection-grid";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { QUESTION_TYPES, DIFFICULTY_LEVELS } from "@/lib/game-config";

const steps = [
  { id: 1, name: "Sınıf Seçimi", icon: <Users className="h-5 w-5" /> },
  { id: 2, name: "Ders Seçimi", icon: <Book className="h-5 w-5" /> },
  { id: 3, name: "Ünite Seçimi", icon: <Library className="h-5 w-5" /> },
  { id: 4, name: "Konu Seçimi", icon: <ListTodo className="h-5 w-5" /> },
  { id: 5, name: "Ayarlar", icon: <Settings className="h-5 w-5" /> },
  { id: 6, name: "Onay", icon: <Check className="h-5 w-5" /> },
];

export function SmartboardBireyselClientPage({ gameConfig }: { gameConfig: any }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  
  const [allClasses, setAllClasses] = useState<SchoolClass[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  
  const [courses, setCourses] = useState<Course[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  
  const [selection, setSelection] = useState({
    classId: "",
    className: "",
    courseId: "",
    courseName: "",
    unitId: "",
    unitName: "",
    topicId: "",
    topicName: "",
  });

  const [settings, setSettings] = useState({
    questionCount: gameConfig.questionCount.default,
    questionTimer: gameConfig.questionTimer.default,
    finishScore: gameConfig.finishScore.default,
    difficulty: gameConfig.difficulty.default,
    questionTypes: gameConfig.questionTypes.default,
    points: gameConfig.points,
    penalty: gameConfig.penalty,
  });

  const { toast } = useToast();

  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        const [coursesSnapshot, classesSnapshot] = await Promise.all([
          getDocs(query(collection(db, "courses"), orderBy("title"))),
          getDocs(query(collection(db, "classes"), orderBy("createdAt", "asc")))
        ]);
        setAllCourses(coursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course)));
        setAllClasses(classesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolClass)));
      } catch (error) {
        console.error("Error fetching initial data: ", error);
        toast({ title: "Hata", description: "Veriler getirilirken bir sorun oluştu.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, [toast]);
  
  const handleNext = () => currentStep < steps.length && setCurrentStep(currentStep + 1);
  const handleBack = () => {
    if (currentStep > 1) {
        if (currentStep === 2) setSelection(s => ({...s, classId: '', className: ''}));
        if (currentStep === 3) setSelection(s => ({...s, courseId: '', courseName: ''}));
        if (currentStep === 4) setSelection(s => ({...s, unitId: '', unitName: ''}));
        if (currentStep === 5) setSelection(s => ({...s, topicId: '', topicName: ''}));
        setCurrentStep(currentStep - 1);
    }
  };

  const handleSelectClass = async (classId: string, className: string) => {
    setSelection(prev => ({ ...prev, classId, className, courseId: '', courseName: '', unitId: '', unitName: '', topicId: '' }));
    
    const firstClassId = allClasses.length > 0 ? allClasses[0].id : null;
    const isFirstClass = classId === firstClassId;
    const applicableCourses = allCourses.filter(course => course.classId === classId || (!course.classId && isFirstClass));
    setCourses(applicableCourses);
    setUnits([]);
    setTopics([]);
    
    handleNext();
  };

  const handleSelectCourse = async (courseId: string, courseName: string) => {
    setSelection(prev => ({ ...prev, courseId, courseName, unitId: '', unitName: '', topicId: '', topicName: '' }));
    setIsLoading(true);
    const unitsRef = collection(db, `courses/${courseId}/units`);
    const q = query(unitsRef, orderBy("title"));
    const unitsSnapshot = await getDocs(q);
    setUnits(unitsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Unit)));
    setTopics([]);
    setIsLoading(false);
    handleNext();
  };

  const handleSelectUnit = async (unitId: string, unitName: string) => {
    setSelection(prev => ({ ...prev, unitId, unitName, topicId: '', topicName: '' }));
    if (unitId === 'all') {
      setSelection(prev => ({ ...prev, topicId: 'all', topicName: 'Tüm Konular' }));
      setTopics([]);
    } else {
      setIsLoading(true);
      const topicsRef = collection(db, `courses/${selection.courseId}/units/${unitId}/topics`);
      const q = query(topicsRef, orderBy("title"));
      const topicsSnapshot = await getDocs(q);
      setTopics(topicsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Topic)));
      setIsLoading(false);
    }
    handleNext();
  };
  
  const handleSelectTopic = (topicId: string, topicName: string) => {
    setSelection(prev => ({...prev, topicId, topicName}));
    handleNext();
  };

  const getGameUrl = () => {
    const params = new URLSearchParams({
        courseId: selection.courseId,
        courseName: selection.courseName,
        unitId: selection.unitId,
        unitName: selection.unitName,
        topicId: selection.topicId,
        topicName: selection.topicName,
        classId: selection.classId,
        className: selection.className,
        questionCount: settings.questionCount.toString(),
        questionTimer: settings.questionTimer.toString(),
        finishScore: settings.finishScore.toString(),
        difficulty: settings.difficulty.join(','),
        questionTypes: settings.questionTypes.join(','),
        points: JSON.stringify(settings.points),
        penalty: JSON.stringify(settings.penalty),
    });
    return `/teacher/smartboard/bireysel/oyun?${params.toString()}`;
  }
  
  const renderContent = () => {
     if(isLoading) return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin"/></div>
     
     switch(currentStep) {
        case 1:
            return <SelectionGrid items={allClasses} selectedId={selection.classId} onSelect={handleSelectClass} titleKey="name" isLoading={isLoading}/>;
        case 2:
            return <SelectionGrid items={courses} selectedId={selection.courseId} onSelect={handleSelectCourse} titleKey="title" isLoading={isLoading}/>;
        case 3:
            return <SelectionGrid items={units} selectedId={selection.unitId} onSelect={handleSelectUnit} specialOptions={[{ id: 'all', name: 'Tüm Üniteler' }]} disabled={!selection.courseId} titleKey="title" isLoading={isLoading}/>;
        case 4:
            return <SelectionGrid items={topics} selectedId={selection.topicId} onSelect={handleSelectTopic} specialOptions={[{ id: 'all', name: 'Tüm Konular' }]} disabled={!selection.unitId || selection.unitId === 'all'} titleKey="title" isLoading={isLoading}/>;
        case 5:
            const handleDifficultyChange = (type: string) => {
                setSettings(prev => {
                    const current = prev.difficulty;
                    if (current.includes(type)) {
                        return { ...prev, difficulty: current.filter(d => d !== type) };
                    }
                    return { ...prev, difficulty: [...current, type] };
                });
            };
            
            const handleQuestionTypeChange = (type: string) => {
                 setSettings(prev => {
                    const current = prev.questionTypes;
                    if (current.includes(type)) {
                        return { ...prev, questionTypes: current.filter(t => t !== type) };
                    }
                    return { ...prev, questionTypes: [...current, type] };
                });
            };

            return (
                <div className="w-full max-w-lg mx-auto space-y-8">
                    <div>
                        <Label htmlFor="question-slider" className="flex justify-between"><span>Soru Sayısı:</span> <span>{settings.questionCount}</span></Label>
                        <Slider id="question-slider" value={[settings.questionCount]} max={gameConfig.questionCount.max} min={gameConfig.questionCount.min} step={gameConfig.questionCount.step} onValueChange={(val) => setSettings({ ...settings, questionCount: val[0] })} />
                    </div>
                     <div className="space-y-3 rounded-lg border p-3 shadow-sm">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="finish-score-switch" className="flex flex-col space-y-1"><span>Bitiş Skoru</span></Label>
                            <Switch id="finish-score-switch" checked={settings.finishScore > 0} onCheckedChange={(checked) => setSettings(prev => ({...prev, finishScore: checked ? gameConfig.finishScore.default : 0}))}/>
                        </div>
                        {settings.finishScore > 0 && (
                            <div className="pt-2 space-y-2">
                                <Label htmlFor="finish-score-input">Puan Değeri</Label>
                                <Input id="finish-score-input" type="number" value={settings.finishScore} onChange={(e) => setSettings(prev => ({ ...prev, finishScore: parseInt(e.target.value) || 0 }))} step={gameConfig.finishScore.step} className="w-full"/>
                            </div>
                        )}
                    </div>
                    <div className="space-y-3 rounded-lg border p-3 shadow-sm">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="timer-switch" className="flex flex-col space-y-1"><span>Soru Zamanlayıcısı</span></Label>
                            <Switch id="timer-switch" checked={settings.questionTimer > 0} onCheckedChange={(checked) => setSettings(prev => ({...prev, questionTimer: checked ? gameConfig.questionTimer.default : 0}))}/>
                        </div>
                        {settings.questionTimer > 0 && (
                            <div className="pt-2 space-y-2">
                                <Label htmlFor="question-timer-slider" className="flex justify-between"><span>Süre:</span> <span>{settings.questionTimer} saniye</span></Label>
                                <Slider id="question-timer-slider" value={[settings.questionTimer]} max={gameConfig.questionTimer.max} min={gameConfig.questionTimer.min} step={gameConfig.questionTimer.step} onValueChange={(val) => setSettings(prev => ({...prev, questionTimer: val[0]}))}/>
                            </div>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline">Zorluk ({settings.difficulty.length}) <ChevronDown className="ml-2 h-4 w-4"/></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                {DIFFICULTY_LEVELS.map(level => (
                                    <DropdownMenuCheckboxItem key={level} checked={settings.difficulty.includes(level)} onCheckedChange={() => handleDifficultyChange(level)}>
                                        {level}
                                    </DropdownMenuCheckboxItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline">Soru Tipi ({settings.questionTypes.length}) <ChevronDown className="ml-2 h-4 w-4"/></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                {QUESTION_TYPES.map(type => (
                                    <DropdownMenuCheckboxItem key={type.id} checked={settings.questionTypes.includes(type.id)} onCheckedChange={() => handleQuestionTypeChange(type.id)}>
                                        {type.name}
                                    </DropdownMenuCheckboxItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            );
        case 6:
            return (
              <div className="space-y-4 text-center sm:text-left w-full max-w-lg">
                 <h3 className="text-xl font-semibold font-headline text-center mb-4">Yarışma Özeti</h3>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                    <p><strong>Sınıf:</strong></p><p>{selection.className}</p>
                    <p><strong>Ders:</strong></p><p>{selection.courseName}</p>
                    <p><strong>Konu:</strong></p><p>{selection.topicName}</p>
                 </div>
                 <hr className="my-4"/>
                 <h3 className="text-lg font-semibold text-center sm:text-left">Ayarlar</h3>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                    <p><strong>Soru Sayısı:</strong></p><p>{settings.questionCount}</p>
                    <p><strong>Soru Süresi:</strong></p><p>{settings.questionTimer > 0 ? `${settings.questionTimer} saniye` : 'Kapalı'}</p>
                    <p><strong>Bitiş Skoru:</strong></p><p>{settings.finishScore > 0 ? `${settings.finishScore} puan` : 'Devre Dışı'}</p>
                    <p><strong>Zorluk:</strong></p><p>{settings.difficulty.join(', ')}</p>
                    <p><strong>Soru Tipleri:</strong></p><p>{settings.questionTypes.map(t => QUESTION_TYPES.find(qt => qt.id === t)?.name).join(', ')}</p>
                 </div>
              </div>
            );
        default:
            return null;
     }
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold font-headline">Bireysel Yarışma Kurulumu (Akıllı Tahta)</h1>
          <p className="text-muted-foreground">Yarışmayı başlatmak için adımları takip edin.</p>
        </div>

        <div className="flex justify-center items-center mb-8 px-4">
          <ol className="flex items-center w-full max-w-2xl">
            {steps.map((step, index) => (
              <li key={step.id} className={cn("flex w-full items-center", { "after:content-[''] after:w-full after:h-1 after:border-b after:border-border after:border-2 after:inline-block": index !== steps.length - 1 })}>
                <span className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full lg:h-12 lg:w-12 shrink-0 transition-colors duration-300",
                  currentStep > step.id ? "bg-primary text-primary-foreground" :
                  currentStep === step.id ? "bg-accent text-accent-foreground scale-110" :
                  "bg-muted text-muted-foreground")}>{step.icon}</span>
              </li>
            ))}
          </ol>
        </div>

        <Card className="min-h-[400px]">
          <CardHeader>
            <CardTitle>{steps.find(s => s.id === currentStep)?.name}</CardTitle>
          </CardHeader>
          <CardContent className="min-h-[250px] flex justify-center items-center">
             {renderContent()}
          </CardContent>
          <CardFooter className="flex justify-between pt-6">
            {currentStep === 1 ? <Button asChild variant="outline"><Link href="/teacher/smartboard"><ArrowLeft className="mr-2 h-4 w-4" /> Geri Dön</Link></Button> : <Button variant="outline" onClick={handleBack}><ArrowLeft className="mr-2 h-4 w-4" /> Geri</Button>}
            {currentStep < steps.length ? (
              <Button onClick={handleNext} disabled={
                  (currentStep === 1 && !selection.classId) || 
                  (currentStep === 2 && !selection.courseId) ||
                  (currentStep === 3 && !selection.unitId) ||
                  (currentStep === 4 && !selection.topicId)
              }>İleri <ArrowRight className="mr-2 h-4 w-4" /></Button>
            ) : (
              <Button asChild className="bg-green-600 hover:bg-green-700 text-white">
                <Link href={getGameUrl()}>
                    <PartyPopper className="mr-2 h-4 w-4" /> Yarışmayı Başlat
                </Link>
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
