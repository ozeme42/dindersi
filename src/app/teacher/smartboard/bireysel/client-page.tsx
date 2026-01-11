
'use client';

import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Book, Library, ListTodo, Settings, PartyPopper, Loader2, Users, MonitorPlay, Package, Wind, Gamepad2, UserCog, Lightbulb, Zap, Swords, BrainCircuit } from "lucide-react";
import { cn } from "@/lib/utils";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Course, Unit, Topic, SchoolClass } from "@/lib/types";
import { useAuth } from "@/context/auth-context";
import { SelectionGrid } from "@/components/selection-grid";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { QUESTION_TYPES, DIFFICULTY_LEVELS } from "@/lib/game-config";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const steps = [
  { id: 1, name: "Sınıf", icon: <Users className="h-5 w-5" /> },
  { id: 2, name: "Ders", icon: <Book className="h-5 w-5" /> },
  { id: 3, name: "Ünite", icon: <Library className="h-5 w-5" /> },
  { id: 4, name: "Konu", icon: <ListTodo className="h-5 w-5" /> },
  { id: 5, name: "Ayarlar", icon: <Settings className="h-5 w-5" /> },
  { id: 6, name: "Başlat", icon: <Check className="h-5 w-5" /> },
];

const ICONS = {
    Package, Wind, Gamepad2, UserCog, Lightbulb, Zap, Swords, BrainCircuit
} as const;

type IconName = keyof typeof ICONS;


export function SmartboardBireyselClientPage({ gameConfig, gamePath, gameName, gameIconName }: { gameConfig: any, gamePath: string, gameName: string, gameIconName: IconName }) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(false);

  const GameIcon = ICONS[gameIconName] || Gamepad2;
  
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
    const applicableCourses = allCourses.filter(course => course.isSummerSchool !== true && (course.classId === classId || (!course.classId && isFirstClass)));
    setCourses(applicableCourses);
    setUnits([]);
    setTopics([]);
    
    handleNext();
  };

  const handleSelectCourse = async (courseId: string, courseName: string) => {
    setSelection(prev => ({ ...prev, courseId, courseName, unitId: '', unitName: '', topicId: '', topicName: '' }));
    setIsDataLoading(true);
    const unitsRef = collection(db, `courses/${courseId}/units`);
    const q = query(unitsRef, orderBy("title"));
    const unitsSnapshot = await getDocs(q);
    setUnits(unitsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Unit)));
    setTopics([]);
    setIsDataLoading(false);
    handleNext();
  };

  const handleSelectUnit = async (unitId: string, unitName: string) => {
    setSelection(prev => ({ ...prev, unitId, unitName, topicId: '', topicName: '' }));
    if (unitId === 'all') {
      setSelection(prev => ({ ...prev, topicId: 'all', topicName: 'Tüm Konular' }));
      setTopics([]);
    } else {
      setIsDataLoading(true);
      const topicsRef = collection(db, `courses/${selection.courseId}/units/${unitId}/topics`);
      const q = query(topicsRef, orderBy("title"));
      const topicsSnapshot = await getDocs(q);
      setTopics(topicsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Topic)));
      setIsDataLoading(false);
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
    return `/teacher/smartboard/${gamePath}/oyun?${params.toString()}`;
  }
  
  const renderContent = () => {
    if (isLoading && currentStep > 0) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-purple-400"/></div>
    
    const loadingProp = isDataLoading;

    switch(currentStep) {
        case 1:
            return <SelectionGrid items={allClasses} selectedId={selection.classId} onSelect={handleSelectClass} titleKey="name" isLoading={isLoading} />;
        case 2:
            return <SelectionGrid items={courses} selectedId={selection.courseId} onSelect={handleSelectCourse} titleKey="title" isLoading={loadingProp}/>;
        case 3:
            return <SelectionGrid items={units} selectedId={selection.unitId} onSelect={handleSelectUnit} specialOptions={[{ id: 'all', name: 'Tüm Üniteler' }]} disabled={!selection.courseId} titleKey="title" isLoading={loadingProp} />
        case 4:
            return <SelectionGrid items={topics} selectedId={selection.topicId} onSelect={handleSelectTopic} specialOptions={[{ id: 'all', name: 'Tüm Konular' }]} disabled={!selection.unitId || selection.unitId === 'all'} titleKey="title" isLoading={loadingProp} />
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
                <div className="w-full max-w-2xl mx-auto space-y-6">
                    {/* Soru Sayısı */}
                    <div className="bg-slate-900/50 p-6 rounded-2xl border border-white/5 space-y-4">
                        <div className="flex justify-between items-center mb-2">
                            <Label htmlFor="question-slider" className="text-white text-lg font-bold">Soru Sayısı</Label>
                            <span className="text-2xl font-black text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-lg border border-indigo-500/20">{settings.questionCount}</span>
                        </div>
                        <Slider id="question-slider" value={[settings.questionCount]} max={gameConfig.questionCount.max} min={gameConfig.questionCount.min} step={gameConfig.questionCount.step} onValueChange={(val) => setSettings({ ...settings, questionCount: val[0] })} className="py-4" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Bitiş Skoru */}
                         <div className="bg-slate-900/50 p-6 rounded-2xl border border-white/5 space-y-4">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="finish-score-switch" className="text-white font-bold">Bitiş Skoru</Label>
                                <Switch id="finish-score-switch" checked={settings.finishScore > 0} onCheckedChange={(checked) => setSettings(prev => ({...prev, finishScore: checked ? gameConfig.finishScore.default : 0}))} className="data-[state=checked]:bg-emerald-500"/>
                            </div>
                            {settings.finishScore > 0 && (
                                <div className="pt-2 space-y-2 animate-in fade-in slide-in-from-top-2">
                                    <Input id="finish-score-input" type="number" value={settings.finishScore} onChange={(e) => setSettings(prev => ({ ...prev, finishScore: parseInt(e.target.value) || 0 }))} step={gameConfig.finishScore.step} className="bg-slate-950 border-white/10 text-white h-12 text-lg font-mono text-center focus:ring-emerald-500/50"/>
                                </div>
                            )}
                        </div>

                        {/* Zamanlayıcı */}
                        <div className="bg-slate-900/50 p-6 rounded-2xl border border-white/5 space-y-4">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="timer-switch" className="text-white font-bold">Zamanlayıcı</Label>
                                <Switch id="timer-switch" checked={settings.questionTimer > 0} onCheckedChange={(checked) => setSettings(prev => ({...prev, questionTimer: checked ? gameConfig.questionTimer.default : 0}))} className="data-[state=checked]:bg-amber-500"/>
                            </div>
                            {settings.questionTimer > 0 && (
                                <div className="pt-2 space-y-4 animate-in fade-in slide-in-from-top-2">
                                     <div className="flex justify-between items-center text-sm text-slate-400">
                                        <span>Süre</span>
                                        <span className="text-amber-400 font-bold">{settings.questionTimer} sn</span>
                                     </div>
                                    <Slider id="question-timer-slider" value={[settings.questionTimer]} max={gameConfig.questionTimer.max} min={gameConfig.questionTimer.min} step={gameConfig.questionTimer.step} onValueChange={(val) => setSettings(prev => ({...prev, questionTimer: val[0]}))}/>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {/* Filtreler */}
                    <div className="grid grid-cols-2 gap-6">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="h-14 w-full justify-between px-6 text-lg bg-slate-900/50 border-white/10 hover:bg-slate-800 text-white group">
                                    <span>Zorluk ({settings.difficulty.length})</span> 
                                    <ChevronDown className="h-5 w-5 text-slate-400 group-hover:text-white transition-colors"/>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="bg-slate-900 border-white/10 text-white min-w-[200px]">
                                {DIFFICULTY_LEVELS.map(level => (
                                    <DropdownMenuCheckboxItem key={level} checked={settings.difficulty.includes(level)} onCheckedChange={() => handleDifficultyChange(level)} className="focus:bg-indigo-600 focus:text-white">
                                        {level}
                                    </DropdownMenuCheckboxItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="h-14 w-full justify-between px-6 text-lg bg-slate-900/50 border-white/10 hover:bg-slate-800 text-white group">
                                    <span>Soru Tipi ({settings.questionTypes.length})</span> 
                                    <ChevronDown className="h-5 w-5 text-slate-400 group-hover:text-white transition-colors"/>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="bg-slate-900 border-white/10 text-white min-w-[200px]">
                                {QUESTION_TYPES.map(type => (
                                    <DropdownMenuCheckboxItem key={type.id} checked={settings.questionTypes.includes(type.id)} onCheckedChange={() => handleQuestionTypeChange(type.id)} className="focus:bg-purple-600 focus:text-white">
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
              <div className="w-full max-w-lg mx-auto">
                 <Card className="bg-slate-900 border-white/10 overflow-hidden shadow-2xl">
                    <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-1"></div>
                    <CardHeader className="text-center pb-2">
                         <PartyPopper className="h-12 w-12 text-yellow-400 mx-auto mb-2 drop-shadow-md"/>
                         <CardTitle className="text-2xl text-white">Yarışma Özeti</CardTitle>
                         <CardDescription className="text-slate-400">Her şey hazır, mücadele başlasın!</CardDescription>
                    </CardHeader>
                     <CardContent className="space-y-6 pt-4">
                         <div className="space-y-2 text-sm text-slate-300">
                             <div className="flex justify-between border-b border-white/5 pb-2"><span>Sınıf:</span> <span className="text-white font-medium">{selection.className}</span></div>
                             <div className="flex justify-between border-b border-white/5 pb-2"><span>Ders:</span> <span className="text-white font-medium">{selection.courseName}</span></div>
                             <div className="flex justify-between"><span>Konu:</span> <span className="text-white font-medium">{selection.topicName}</span></div>
                         </div>
                     </CardContent>
                     <CardFooter>
                        <Button asChild className="w-full h-16 text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-[0_0_20px_rgba(16,185,129,0.4)]">
                            <Link href={getGameUrl()}>
                                <PartyPopper className="mr-3 h-6 w-6"/> Yarışmayı Başlat
                            </Link>
                        </Button>
                    </CardFooter>
                 </Card>
              </div>
            );
        default: return null;
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center p-4 sm:p-6 md:p-8 relative overflow-hidden font-sans">
      
       {/* Arka Plan Efektleri */}
       <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-[-20%] left-[-10%] w-[1000px] h-[1000px] bg-purple-900/10 rounded-full blur-[150px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-indigo-900/10 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 w-full max-w-6xl space-y-8 flex flex-col h-full flex-grow">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black font-headline text-white tracking-tight uppercase drop-shadow-lg flex items-center justify-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-xl border border-purple-500/30">
                  <GameIcon className="h-8 w-8 text-purple-400" />
              </div>
              {gameName} Kurulumu
          </h1>
          <p className="text-slate-400 mt-1">Yarışmayı başlatmak için adımları takip edin.</p>
        </div>
        
        {/* Stepper */}
        <div className="flex justify-center items-center px-4 w-full mb-8">
          <div className="relative flex items-center justify-between w-full max-w-5xl">
              <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-800 -z-10 rounded-full"></div>
              <div 
                  className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-500 -z-10 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
              ></div>

              {steps.map((step, index) => {
                  const isActive = currentStep === step.id;
                  const isCompleted = currentStep > step.id;
                  return (
                    <div key={step.id} className="flex flex-col items-center gap-3 group cursor-default">
                        <div className={cn(
                          "w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center border-4 transition-all duration-300 z-10 shadow-lg",
                          isActive 
                              ? "bg-slate-900 border-purple-500 text-purple-400 scale-110 shadow-purple-500/50" 
                              : isCompleted 
                                  ? "bg-indigo-600 border-indigo-600 text-white scale-100" 
                                  : "bg-slate-900 border-slate-800 text-slate-600"
                        )}>
                          {isCompleted ? <Check className="w-6 h-6 stroke-[3]" /> : step.icon}
                        </div>
                        <span className={cn(
                            "text-xs md:text-sm font-bold transition-colors duration-300 absolute -bottom-8 whitespace-nowrap uppercase tracking-wider",
                            isActive ? "text-purple-400" : isCompleted ? "text-indigo-500" : "text-slate-600"
                        )}>
                            {step.name}
                        </span>
                    </div>
                  )
              })}
          </div>
        </div>

        <Card className="bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-2xl flex-grow flex flex-col overflow-hidden">
          <CardHeader className="border-b border-white/5 pb-4">
            <CardTitle className="text-xl text-white">{steps.find(s => s.id === currentStep)?.name}</CardTitle>
          </CardHeader>
          <CardContent className="flex-grow flex justify-center items-start p-6 overflow-y-auto min-h-[400px]">
             {renderContent()}
          </CardContent>
          <CardFooter className="flex justify-between p-6 border-t border-white/5 bg-slate-900/50">
            {currentStep === 1 ? (
                <Button asChild variant="ghost" className="text-slate-400 hover:text-white hover:bg-white/10">
                    <Link href="/teacher/smartboard"><ArrowLeft className="mr-2 h-4 w-4" /> Geri Dön</Link>
                </Button>
            ) : (
                <Button variant="ghost" onClick={handleBack} className="text-slate-400 hover:text-white hover:bg-white/10"><ArrowLeft className="mr-2 h-4 w-4" /> Geri</Button>
            )}

            {currentStep < steps.length && (
                <Button onClick={handleNext} disabled={
                    (currentStep === 1 && !selection.classId) ||
                    (currentStep === 2 && !selection.courseId) ||
                    (currentStep === 3 && !selection.unitId) ||
                    (currentStep === 4 && !selection.topicId)
                } className="bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/20 px-8">
                    İleri <ArrowRight className="ml-2 h-4 w-4" />
                </Button> 
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
