'use client';

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Book, Library, ListTodo, Settings, Swords, Users, Shuffle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { collection, getDocs, query, orderBy, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Course, Unit, Topic, SchoolClass, UserProfile } from "@/lib/types";
import { useAuth } from "@/context/auth-context";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SelectionGrid } from "@/components/selection-grid";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const steps = [
  { id: 1, name: "Sınıf", icon: <Users className="h-5 w-5" /> },
  { id: 2, name: "Ders", icon: <Book className="h-5 w-5" /> },
  { id: 3, name: "Ünite", icon: <Library className="h-5 w-5" /> },
  { id: 4, name: "Konu", icon: <ListTodo className="h-5 w-5" /> },
  { id: 5, name: "Savaşçılar", icon: <Swords className="h-5 w-5" /> },
  { id: 6, name: "Onay", icon: <Check className="h-5 w-5" /> },
];

export function SmartboardDuelloSetupClientPage({ gameConfig }: { gameConfig: any }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(false);
  
  const [allClasses, setAllClasses] = useState<SchoolClass[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [allStudents, setAllStudents] = useState<UserProfile[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<UserProfile[]>([]);
  
  const [courses, setCourses] = useState<Course[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  
  const [selection, setSelection] = useState({
    classId: "",
    className: "",
    branch: "all",
    courseId: "",
    courseName: "",
    unitId: "",
    unitName: "",
    topicId: "",
    topicName: "",
    player1Id: "",
    player1Name: "",
    player2Id: "",
    player2Name: "",
  });

  const [settings, setSettings] = useState({
    questionCount: gameConfig.questionCount.default,
    questionTimer: gameConfig.questionTimer.default,
    pullStrength: gameConfig.pullStrength,
  });

  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        const [coursesSnapshot, classesSnapshot, studentsSnapshot] = await Promise.all([
          getDocs(query(collection(db, "courses"), orderBy("title"))),
          getDocs(query(collection(db, "classes"), orderBy("createdAt", "asc"))),
          getDocs(query(collection(db, "users"), where("role", "==", "guest")))
        ]);
        setAllCourses(coursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course)));
        setAllClasses(classesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolClass)));
        setAllStudents(studentsSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
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
        if (currentStep === 2) setSelection(s => ({...s, classId: '', className: '', branch: 'all'}));
        if (currentStep === 3) setSelection(s => ({...s, courseId: '', courseName: ''}));
        if (currentStep === 4) setSelection(s => ({...s, unitId: '', unitName: ''}));
        if (currentStep === 5) setSelection(s => ({...s, topicId: '', topicName: ''}));
        if (currentStep === 6) setSelection(s => ({...s, player1Id: '', player1Name: '', player2Id: '', player2Name: ''}));
        setCurrentStep(currentStep - 1);
    }
  };

  const handleSelectClass = async (classId: string, className: string) => {
    setSelection(prev => ({ ...prev, classId, className, courseId: '', courseName: '', unitId: '', unitName: '', topicId: '', branch: 'all' }));
    
    const firstClassId = allClasses.length > 0 ? allClasses[0].id : null;
    const isFirstClass = classId === firstClassId;
    const applicableCourses = allCourses.filter(course => course.isSummerSchool !== true && (course.classId === classId || (!course.classId && isFirstClass)));
    setCourses(applicableCourses);
    setUnits([]);
    setTopics([]);
    
    const studentsInClass = allStudents.filter(s => s.class?.startsWith(className));
    setFilteredStudents(studentsInClass);
    
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
  
  const handleSelectPlayer = (playerNumber: 1 | 2, studentId: string) => {
    const student = filteredStudents.find(s => s.uid === studentId);
    if (!student) return;

    if (playerNumber === 1) {
        setSelection(prev => ({ ...prev, player1Id: student.uid, player1Name: student.displayName }));
    } else {
        setSelection(prev => ({ ...prev, player2Id: student.uid, player2Name: student.displayName }));
    }
  };

  const handleRandomSelect = () => {
    if (filteredStudents.length < 2) {
      toast({ title: 'Hata', description: 'Düello için en az 2 uygun öğrenci olmalı.', variant: 'destructive'});
      return;
    }
    const shuffled = [...filteredStudents].sort(() => 0.5 - Math.random());
    const player1 = shuffled[0];
    const player2 = shuffled[1];
    setSelection(prev => ({
        ...prev,
        player1Id: player1.uid,
        player1Name: player1.displayName,
        player2Id: player2.uid,
        player2Name: player2.displayName
    }));
  };

  const handleBranchSelect = (branch: string) => {
    setSelection(prev => ({ ...prev, branch }));
    const selectedClass = allClasses.find(c => c.id === selection.classId);
    if (!selectedClass) return;

    if (branch === 'all') {
      setFilteredStudents(allStudents.filter(s => s.class?.startsWith(selectedClass.name)));
    } else {
      const branchClassName = `${selectedClass.name} - ${branch}`;
      setFilteredStudents(allStudents.filter(s => s.class === branchClassName || s.class?.startsWith(`${branchClassName} (Havuz)`)));
    }
  };

  const getGameUrl = () => {
    const params = new URLSearchParams({
        courseId: selection.courseId,
        courseName: selection.courseName,
        unitId: selection.unitId,
        unitName: selection.unitName,
        topicId: selection.topicId,
        topicName: selection.topicName,
        questionCount: settings.questionCount.toString(),
        questionTimer: settings.questionTimer.toString(),
        p1: selection.player1Id,
        p2: selection.player2Id,
        pullStrength: JSON.stringify(settings.pullStrength),
    });
    return `/teacher/smartboard/duello/oyun?${params.toString()}`;
  }

  const renderContent = () => {
    if (isLoading && currentStep > 0) return <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-red-500"/></div>
    
    const loadingProp = isDataLoading;
    const selectedClassData = allClasses.find(c => c.id === selection.classId);

    switch(currentStep) {
        case 1: return <SelectionGrid items={allClasses} selectedId={selection.classId} onSelect={handleSelectClass} titleKey="name" isLoading={isLoading} />;
        case 2: return <SelectionGrid items={courses} selectedId={selection.courseId} onSelect={handleSelectCourse} titleKey="title" isLoading={loadingProp} />
        case 3: return <SelectionGrid items={units} selectedId={selection.unitId} onSelect={handleSelectUnit} specialOptions={[{ id: 'all', name: 'Tüm Üniteler' }]} disabled={!selection.courseId} titleKey="title" isLoading={loadingProp} />
        case 4: return <SelectionGrid items={topics} selectedId={selection.topicId} onSelect={handleSelectTopic} specialOptions={[{ id: 'all', name: 'Tüm Konular' }]} disabled={!selection.unitId || selection.unitId === 'all'} titleKey="title" isLoading={loadingProp} />
        case 5:
            return (
                  <div className="flex flex-col gap-8 w-full max-w-5xl items-center">
                    
                    {/* Üst Bar: Şube ve Rastgele Seçim */}
                    <div className="w-full flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-900/50 p-4 rounded-xl border border-white/5">
                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <span className="text-slate-400 font-bold uppercase text-xs tracking-widest whitespace-nowrap">Filtrele:</span>
                            <Select value={selection.branch} onValueChange={handleBranchSelect} disabled={!selectedClassData}>
                                <SelectTrigger className="bg-slate-950 border-white/10 h-10 w-40 text-white"><SelectValue placeholder="Şube Seçin..." /></SelectTrigger>
                                <SelectContent className="bg-slate-900 border-white/10 text-white">
                                    <SelectItem value="all">Tüm Şubeler</SelectItem>
                                    {selectedClassData?.branches?.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleRandomSelect} disabled={filteredStudents.length < 2} className="border-red-500/30 text-red-300 hover:text-red-200 hover:bg-red-500/10 w-full md:w-auto h-10">
                            <Shuffle className="mr-2 h-4 w-4" /> Rastgele Eşleştir
                        </Button>
                    </div>

                    {/* Savaşçı Seçimi (VS Modu) */}
                    <div className="flex flex-col md:flex-row items-center justify-center gap-8 w-full">
                        
                        {/* 1. Savaşçı */}
                        <div className="flex-1 w-full max-w-sm">
                            <div className="bg-gradient-to-br from-blue-900/40 to-slate-900/40 border-2 border-blue-500/50 rounded-2xl p-6 flex flex-col items-center gap-4 relative overflow-hidden group hover:border-blue-500 transition-colors">
                                <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                <div className="bg-blue-500/20 p-4 rounded-full mb-2 border border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                                     <Swords className="h-10 w-10 text-blue-400" />
                                </div>
                                <Label htmlFor="player1" className="text-xl font-black text-blue-400 uppercase tracking-widest">1. SAVAŞÇI</Label>
                                <Select onValueChange={(id) => handleSelectPlayer(1, id)} value={selection.player1Id}>
                                    <SelectTrigger id="player1" className="bg-slate-950 border-blue-500/30 h-14 text-lg text-white font-bold"><SelectValue placeholder="Seçiniz" /></SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-blue-500/30 text-white max-h-60">
                                        {filteredStudents.filter(s => s.uid !== selection.player2Id).map(s => <SelectItem key={s.uid} value={s.uid}>{s.displayName}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* VS Badge */}
                        <div className="flex-shrink-0">
                            <div className="bg-slate-950 border-4 border-red-600 rounded-full w-20 h-20 flex items-center justify-center shadow-[0_0_30px_rgba(220,38,38,0.5)] z-10 relative">
                                <span className="text-3xl font-black text-white italic">VS</span>
                            </div>
                        </div>

                        {/* 2. Savaşçı */}
                        <div className="flex-1 w-full max-w-sm">
                            <div className="bg-gradient-to-bl from-red-900/40 to-slate-900/40 border-2 border-red-500/50 rounded-2xl p-6 flex flex-col items-center gap-4 relative overflow-hidden group hover:border-red-500 transition-colors">
                                <div className="absolute inset-0 bg-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                <div className="bg-red-500/20 p-4 rounded-full mb-2 border border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.3)]">
                                     <Swords className="h-10 w-10 text-red-400 transform scale-x-[-1]" />
                                </div>
                                <Label htmlFor="player2" className="text-xl font-black text-red-400 uppercase tracking-widest">2. SAVAŞÇI</Label>
                                <Select onValueChange={(id) => handleSelectPlayer(2, id)} value={selection.player2Id}>
                                    <SelectTrigger id="player2" className="bg-slate-950 border-red-500/30 h-14 text-lg text-white font-bold"><SelectValue placeholder="Seçiniz" /></SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-red-500/30 text-white max-h-60">
                                        {filteredStudents.filter(s => s.uid !== selection.player1Id).map(s => <SelectItem key={s.uid} value={s.uid}>{s.displayName}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {/* Ayarlar Kartı */}
                    <Card className="w-full max-w-2xl bg-slate-900/40 border-white/5">
                        <CardHeader><CardTitle className="text-white flex items-center gap-2"><Settings className="w-5 h-5 text-gray-400"/> Oyun Ayarları</CardTitle></CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <Label htmlFor="question-slider" className="flex justify-between text-slate-300 mb-2"><span>Soru Sayısı</span> <span className="text-white font-bold">{settings.questionCount}</span></Label>
                                <Slider id="question-slider" value={[settings.questionCount]} onValueChange={(v) => setSettings(s => ({ ...s, questionCount: v[0] }))} max={gameConfig.questionCount.max} min={gameConfig.questionCount.min} step={gameConfig.questionCount.step} />
                            </div>
                            <div>
                                <Label className="text-slate-300 mb-2 block">Çekme Gücü (Halat)</Label>
                                <div className="grid grid-cols-3 gap-4">
                                    {Object.keys(settings.pullStrength).map(level => (
                                        <div key={level} className="bg-slate-950/50 p-2 rounded-lg border border-white/5">
                                            <Label className="text-xs text-slate-500 uppercase font-bold mb-1 block">{level}</Label>
                                            <Input 
                                                type="number" 
                                                className="bg-transparent border-none text-center font-bold text-white h-8 focus-visible:ring-0"
                                                value={settings.pullStrength[level as keyof typeof settings.pullStrength]} 
                                                onChange={(e) => setSettings(s => ({...s, pullStrength: {...s.pullStrength, [level]: parseInt(e.target.value) || 0}}))} 
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )
        case 6:
            return (
                <div className="w-full max-w-4xl mx-auto space-y-8">
                     {/* Özet Kartı */}
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                         <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5 text-center">
                             <span className="text-xs text-slate-400 uppercase font-bold mb-1 block">Sınıf</span>
                             <span className="text-lg font-bold text-white">{selection.className}</span>
                         </div>
                         <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5 text-center">
                             <span className="text-xs text-slate-400 uppercase font-bold mb-1 block">Ders</span>
                             <span className="text-lg font-bold text-white truncate px-2">{selection.courseName}</span>
                         </div>
                         <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5 text-center lg:col-span-2">
                             <span className="text-xs text-slate-400 uppercase font-bold mb-1 block">Konu</span>
                             <span className="text-lg font-bold text-white truncate px-2">{selection.topicName}</span>
                         </div>
                     </div>

                     {/* VS Özeti */}
                     <div className="flex items-center justify-center gap-4 sm:gap-12 py-8 relative">
                         <div className="text-center w-40">
                             <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-3 border-2 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.4)]">
                                 <Users className="h-10 w-10 text-blue-400"/>
                             </div>
                             <p className="text-xl font-black text-blue-400 truncate">{selection.player1Name}</p>
                         </div>
                         
                         <div className="text-5xl font-black text-white/20 italic">VS</div>
                         
                         <div className="text-center w-40">
                             <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-3 border-2 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)]">
                                 <Users className="h-10 w-10 text-red-400"/>
                             </div>
                             <p className="text-xl font-black text-red-400 truncate">{selection.player2Name}</p>
                         </div>
                     </div>

                     <div className="pt-4 flex justify-center">
                          <Button asChild size="lg" className="w-full md:w-2/3 h-20 text-2xl font-black bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white shadow-[0_0_40px_rgba(220,38,38,0.4)] rounded-2xl transition-all hover:scale-105 active:scale-95 group">
                            <Link href={getGameUrl()}>
                                <Swords className="mr-4 h-8 w-8 group-hover:rotate-12 transition-transform" /> DÜELLOYU BAŞLAT
                            </Link>
                          </Button>
                     </div>
                </div>
            );
        default: return null;
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center p-4 sm:p-6 md:p-8 relative overflow-hidden font-sans">
      
       {/* Arka Plan Efektleri */}
       <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-red-900/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-900/20 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-6xl space-y-8 flex flex-col h-full flex-grow">
        
        {/* Başlık Alanı */}
        <div className="text-center space-y-4 py-4">
            <div className="inline-flex items-center justify-center p-4 bg-red-500/10 rounded-full mb-2 border border-red-500/20 shadow-lg shadow-red-500/10">
                <Swords className="h-10 w-10 text-red-400"/>
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-white drop-shadow-xl tracking-tight">
                DÜELLO
            </h1>
            <p className="text-slate-400 text-lg font-medium">Birebir mücadele için arenayı hazırla.</p>
        </div>

        {/* Stepper */}
        <div className="flex justify-center items-center px-4 w-full">
            <div className="relative flex items-center justify-between w-full max-w-4xl">
                <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-800 -z-10 rounded-full"></div>
                <div 
                    className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-red-500 to-orange-500 -z-10 rounded-full transition-all duration-500 ease-out"
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
                                    ? "bg-slate-900 border-red-500 text-red-400 scale-110 shadow-red-500/50" 
                                    : isCompleted 
                                        ? "bg-orange-600 border-orange-600 text-white scale-100" 
                                        : "bg-slate-900 border-slate-800 text-slate-600"
                            )}>
                                {isCompleted ? <Check className="w-6 h-6 stroke-[3]" /> : step.icon}
                            </div>
                            <span className={cn(
                                "text-xs md:text-sm font-bold transition-colors duration-300 absolute -bottom-8 whitespace-nowrap uppercase tracking-wider",
                                isActive ? "text-red-400" : isCompleted ? "text-orange-500" : "text-slate-600"
                            )}>
                                {step.name}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>

        {/* Ana İçerik Kartı */}
        <div className="mt-8 flex-grow flex flex-col">
             <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col flex-grow min-h-[500px]">
                <div className="p-6 md:p-8 border-b border-white/5 bg-slate-900/50 flex items-center justify-between">
                     <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 text-lg">
                            {currentStep}
                        </span>
                        {steps.find(s => s.id === currentStep)?.name}
                     </h2>
                     {isLoading && <Loader2 className="h-6 w-6 animate-spin text-red-500" />}
                </div>

                <div className="flex-grow p-6 md:p-10 flex items-center justify-center bg-slate-950/30 overflow-y-auto">
                     {renderContent()}
                </div>

                <div className="p-6 md:p-8 border-t border-white/5 bg-slate-900/50 flex justify-between items-center">
                    {currentStep === 1 ? (
                        <Button asChild variant="ghost" className="text-slate-400 hover:text-white hover:bg-white/10 h-14 px-8 rounded-xl text-lg">
                            <Link href="/teacher/smartboard">
                                <ArrowLeft className="mr-2 h-5 w-5" /> Menüye Dön
                            </Link>
                        </Button>
                    ) : (
                        <Button 
                            variant="outline" 
                            onClick={handleBack}
                            className="border-white/10 text-slate-300 hover:text-white hover:bg-white/5 h-14 px-8 rounded-xl text-lg bg-transparent"
                        >
                            <ArrowLeft className="mr-2 h-5 w-5" /> Geri
                        </Button>
                    )}
                    
                    {currentStep < steps.length && (
                         <Button 
                            onClick={handleNext} 
                            disabled={
                                (currentStep === 1 && !selection.classId) || 
                                (currentStep === 2 && !selection.courseId) ||
                                (currentStep === 3 && !selection.unitId) ||
                                (currentStep === 4 && !selection.topicId) ||
                                (currentStep === 5 && (!selection.player1Id || !selection.player2Id))
                            }
                            className="bg-red-600 hover:bg-red-500 text-white h-14 px-8 rounded-xl text-lg shadow-lg shadow-red-900/20 transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                        >
                            İleri <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                    )}
                </div>
            </div>
        </div>

      </div>
    </div>
  );
}