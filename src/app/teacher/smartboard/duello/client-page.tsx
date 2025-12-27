'use client';

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Book, Library, ListTodo, Settings, Swords, UserPlus, Loader2, User, Trophy, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Course, Unit, Topic, SchoolClass } from "@/lib/types";
import { useAuth } from "@/context/auth-context";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SelectionGrid } from "@/components/selection-grid";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const STORAGE_KEY = 'hikmet-oyunu-guest-players';

const steps = [
  { id: 1, name: "Ders", icon: <Book className="h-5 w-5" /> },
  { id: 2, name: "Ünite", icon: <Library className="h-5 w-5" /> },
  { id: 3, name: "Konu", icon: <ListTodo className="h-5 w-5" /> },
  { id: 4, name: "Savaşçılar", icon: <Swords className="h-5 w-5" /> },
  { id: 5, name: "Başlat", icon: <Check className="h-5 w-5" /> },
];

export function SmartboardDuelloSetupClientPage({ gameConfig }: { gameConfig: any }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(false);
  
  const [courses, setCourses] = useState<Course[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  
  const [guestPlayers, setGuestPlayers] = useState<string[]>([]);
  const [newGuestName, setNewGuestName] = useState("");

  const [selection, setSelection] = useState({
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

  const availablePlayers = useMemo(() => {
    return [user?.displayName, ...guestPlayers].filter(Boolean) as string[];
  }, [user, guestPlayers]);

  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);

      try {
          const stored = localStorage.getItem(STORAGE_KEY);
          if(stored) setGuestPlayers(JSON.parse(stored));
      } catch (e) { console.error("Could not load guests", e); }

      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const studentClassName = user.class?.split(' - ')[0];

        const classesQuery = query(collection(db, "classes"), orderBy("createdAt", "asc"));
        const classesSnapshot = await getDocs(classesQuery);
        const allClasses = classesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolClass));
        
        const allCoursesSnapshot = await getDocs(collection(db, "courses"));
        const allCourses = allCoursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));

        let finalCourses: Course[] = [];

        if (user.role === 'teacher' || user.role === 'superadmin') {
            finalCourses = allCourses.map(course => {
                const courseClass = allClasses.find(c => c.id === course.classId);
                return {
                    ...course,
                    className: courseClass?.name || 'Genel'
                };
            });
        } else {
            const studentClass = allClasses.find(c => studentClassName && c.name === studentClassName);
            const studentClassId = studentClass?.id;
            
            if (studentClassId) { 
                finalCourses = allCourses.filter(course => 
                    course.classId === studentClassId
                );
            } else { 
                finalCourses = allCourses.filter(course => !course.classId);
            }
        }
        setCourses(finalCourses);
      } catch (error) {
        console.error("Error fetching filtered courses:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, [user]);

  const handleNext = () => currentStep < steps.length && setCurrentStep(currentStep + 1);
  const handleBack = () => currentStep > 1 && setCurrentStep(currentStep - 1);

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
  
  const handleAddGuestPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newGuestName.trim();
    if (name && !guestPlayers.includes(name)) {
        const updatedGuests = [...guestPlayers, name];
        setGuestPlayers(updatedGuests);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedGuests));
        setNewGuestName("");
        toast({ title: "Misafir Eklendi", description: `"${name}" misafir oyuncu olarak eklendi.` });
    } else if (guestPlayers.includes(name)) {
        toast({ title: "Hata", description: "Bu isimde bir misafir zaten mevcut.", variant: "destructive" });
    }
  };
  
  const getGameUrl = () => {
    const params = new URLSearchParams({
        courseId: selection.courseId,
        unitId: selection.unitId,
        topicId: selection.topicId,
        questionCount: settings.questionCount.toString(),
        questionTimer: settings.questionTimer.toString(),
        p1Id: selection.player1Name === user?.displayName ? user.uid : selection.player1Name,
        p2Id: selection.player2Name === user?.displayName ? user.uid : selection.player2Name,
        p1Name: selection.player1Name,
        p2Name: selection.player2Name,
        pullStrength: JSON.stringify(settings.pullStrength),
    });
    return `/teacher/smartboard/duello/oyun?${params.toString()}`;
  }

  const renderContent = () => {
    if (isLoading && currentStep > 0) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-rose-500"/></div>
    
    const loadingProp = isDataLoading;

    switch(currentStep) {
        case 1: return <SelectionGrid items={courses} selectedId={selection.courseId} onSelect={handleSelectCourse} titleKey="title" isLoading={isLoading}/>;
        case 2: return <SelectionGrid items={units} selectedId={selection.unitId} onSelect={handleSelectUnit} specialOptions={[{ id: 'all', name: 'Tüm Üniteler' }]} disabled={!selection.courseId} titleKey="title" isLoading={loadingProp} />
        case 3: return <SelectionGrid items={topics} selectedId={selection.topicId} onSelect={handleSelectTopic} specialOptions={[{ id: 'all', name: 'Tüm Konular' }]} disabled={!selection.unitId || selection.unitId === 'all'} titleKey="title" isLoading={loadingProp} />
        case 4:
            return (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl items-start">
                    <Card className="bg-slate-900 border-white/10 shadow-lg">
                        <CardHeader className="pb-3 border-b border-white/5">
                            <CardTitle className="flex items-center gap-2 text-white"><Swords className="h-5 w-5 text-rose-400"/> Savaşçıları Seç</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-6">
                            <div className="space-y-2 p-3 bg-blue-900/10 rounded-xl border border-blue-500/20">
                                <Label htmlFor="player1" className="text-lg font-bold text-blue-400 flex items-center gap-2"><Shield className="h-4 w-4"/> MAVİ SAVAŞÇI (SOL)</Label>
                                <Select onValueChange={(name) => setSelection(prev => ({...prev, player1Name: name}))} value={selection.player1Name}>
                                    <SelectTrigger id="player1" className="bg-slate-950 border-blue-500/30 text-white h-11"><SelectValue placeholder="1. Savaşçı Seç" /></SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-white/10 text-white">
                                        {availablePlayers.filter(p => p !== selection.player2Name).map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            <div className="flex justify-center -my-3 relative z-10">
                                <div className="bg-slate-950 rounded-full p-2 border border-white/10 text-slate-500 font-black text-xs">VS</div>
                            </div>

                            <div className="space-y-2 p-3 bg-red-900/10 rounded-xl border border-red-500/20">
                                <Label htmlFor="player2" className="text-lg font-bold text-red-400 flex items-center gap-2"><Swords className="h-4 w-4"/> KIRMIZI SAVAŞÇI (SAĞ)</Label>
                                <Select onValueChange={(name) => setSelection(prev => ({...prev, player2Name: name}))} value={selection.player2Name}>
                                    <SelectTrigger id="player2" className="bg-slate-950 border-red-500/30 text-white h-11"><SelectValue placeholder="2. Savaşçı Seç" /></SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-white/10 text-white">
                                        {availablePlayers.filter(p => p !== selection.player1Name).map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                             <div className="pt-4 border-t border-white/10">
                                <Label className="text-slate-400 text-xs uppercase tracking-wider mb-2 block">Yeni Misafir Ekle</Label>
                                <form onSubmit={handleAddGuestPlayer} className="flex gap-2">
                                    <Input
                                        placeholder="Misafir adı..."
                                        value={newGuestName}
                                        onChange={(e) => setNewGuestName(e.target.value)}
                                        className="bg-slate-950 border-white/10 text-white h-9 text-xs"
                                    />
                                    <Button type="submit" size="icon" className="h-9 w-9 bg-rose-600 hover:bg-rose-500 text-white"><UserPlus className="h-4 w-4" /></Button>
                                </form>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-slate-900 border-white/10 shadow-lg">
                        <CardHeader className="pb-3 border-b border-white/5">
                            <CardTitle className="flex items-center gap-2 text-white"><Settings className="h-5 w-5 text-indigo-400"/> Oyun Ayarları</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-6">
                            <div>
                                <Label htmlFor="question-slider" className="flex justify-between text-slate-300 mb-2"><span>Soru Sayısı</span> <span className="text-rose-400 font-bold">{settings.questionCount}</span></Label>
                                <Slider id="question-slider" value={[settings.questionCount]} onValueChange={(v) => setSettings(s => ({ ...s, questionCount: v[0] }))} max={gameConfig.questionCount.max} min={gameConfig.questionCount.min} step={gameConfig.questionCount.step} className="cursor-pointer" />
                            </div>
                            <div>
                                <Label htmlFor="question-timer-slider" className="flex justify-between text-slate-300 mb-2"><span>Soru Süresi</span> <span className="text-indigo-400 font-bold">{settings.questionTimer > 0 ? `${settings.questionTimer} sn` : 'Kapalı'}</span></Label>
                                <Slider id="question-timer-slider" value={[settings.questionTimer]} onValueChange={(v) => setSettings(s => ({ ...s, questionTimer: v[0] }))} max={gameConfig.questionTimer.max} min={gameConfig.questionTimer.min} step={gameConfig.questionTimer.step} className="cursor-pointer" />
                            </div>
                            <div>
                                <Label className="text-slate-300 mb-2 block">Çekme Gücü (Zorluk)</Label>
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="space-y-1">
                                        <Label className="text-[10px] text-emerald-400 uppercase">Kolay</Label>
                                        <Input 
                                            value={settings.pullStrength.Kolay} 
                                            onChange={(e) => setSettings(s => ({...s, pullStrength: {...s.pullStrength, Kolay: parseInt(e.target.value) || 0}}))} 
                                            className="bg-slate-950 border-white/10 text-white h-8 text-center"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] text-yellow-400 uppercase">Orta</Label>
                                        <Input 
                                            value={settings.pullStrength.Orta} 
                                            onChange={(e) => setSettings(s => ({...s, pullStrength: {...s.pullStrength, Orta: parseInt(e.target.value) || 0}}))} 
                                            className="bg-slate-950 border-white/10 text-white h-8 text-center"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] text-red-400 uppercase">Zor</Label>
                                        <Input 
                                            value={settings.pullStrength.Zor} 
                                            onChange={(e) => setSettings(s => ({...s, pullStrength: {...s.pullStrength, Zor: parseInt(e.target.value) || 0}}))} 
                                            className="bg-slate-950 border-white/10 text-white h-8 text-center"
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )
        case 5:
            return (
                <div className="w-full max-w-lg mx-auto">
                    <Card className="bg-slate-900 border-white/10 overflow-hidden shadow-2xl">
                        <div className="bg-gradient-to-r from-red-600 to-blue-600 p-1"></div>
                        <CardHeader className="text-center pb-2">
                             <Trophy className="h-12 w-12 text-yellow-400 mx-auto mb-2 drop-shadow-md"/>
                             <CardTitle className="text-2xl text-white">Düello Özeti</CardTitle>
                             <CardDescription className="text-slate-400">Son kontrolleri yapın ve mücadeleyi başlatın.</CardDescription>
                        </CardHeader>
                         <CardContent className="space-y-6 pt-4">
                            <div className="flex items-center justify-between gap-4 p-4 bg-slate-950 rounded-xl border border-white/5">
                                <div className="text-center w-1/2 border-r border-white/10 pr-4">
                                    <p className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">MAVİ KÖŞE</p>
                                    <p className="font-black text-white text-lg truncate">{selection.player1Name}</p>
                                </div>
                                <div className="text-center w-1/2 pl-4">
                                    <p className="text-xs font-bold text-red-400 uppercase tracking-wider mb-1">KIRMIZI KÖŞE</p>
                                    <p className="font-black text-white text-lg truncate">{selection.player2Name}</p>
                                </div>
                            </div>
                             <div className="space-y-2 text-sm text-slate-300">
                                 <div className="flex justify-between border-b border-white/5 pb-2"><span>Ders:</span> <span className="text-white font-medium">{selection.courseName}</span></div>
                                 <div className="flex justify-between border-b border-white/5 pb-2"><span>Ünite:</span> <span className="text-white font-medium">{selection.unitName}</span></div>
                                 <div className="flex justify-between"><span>Konu:</span> <span className="text-white font-medium">{selection.topicName}</span></div>
                             </div>
                        </CardContent>
                        <CardFooter>
                            <Button asChild className="w-full h-16 text-xl font-bold bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 shadow-[0_0_20px_rgba(220,38,38,0.4)]">
                                <Link href={getGameUrl()}>
                                    <Swords className="mr-3 h-6 w-6"/> Düelloyu Başlat
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
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 p-4 sm:p-6 md:p-8 relative overflow-hidden flex flex-col">
        
        {/* Arka Plan */}
        <div className="fixed inset-0 pointer-events-none z-0">
            <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-red-900/10 rounded-full blur-[150px]" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-900/10 rounded-full blur-[150px]" />
            <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.03]" />
        </div>

      <div className="max-w-5xl mx-auto w-full relative z-10 flex-grow flex flex-col">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black font-headline text-white tracking-tight uppercase drop-shadow-lg">Düello Kurulumu</h1>
          <p className="text-slate-400 mt-1">Savaşçıları seç ve mücadeleyi başlat.</p>
        </div>
        
         {/* Stepper */}
        <div className="flex justify-center items-center mb-8 px-4">
          <div className="relative flex items-center justify-between w-full max-w-2xl">
              <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-800 -z-10 rounded-full"></div>
              <div 
                  className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-red-500 to-blue-500 -z-10 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
              ></div>

              {steps.map((step) => {
                  const isActive = currentStep === step.id;
                  const isCompleted = currentStep > step.id;
                  return (
                    <div key={step.id} className="flex flex-col items-center gap-2 group cursor-default">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center border-4 transition-all duration-300 z-10 shadow-lg",
                          isActive 
                              ? "bg-slate-900 border-rose-500 text-rose-400 scale-110 shadow-rose-500/50" 
                              : isCompleted 
                                  ? "bg-blue-600 border-blue-600 text-white scale-100" 
                                  : "bg-slate-900 border-slate-800 text-slate-600"
                        )}>
                          {isCompleted ? <Check className="w-5 h-5 stroke-[3]" /> : step.icon}
                        </div>
                        <span className={cn("text-[10px] font-bold uppercase tracking-wider hidden sm:block", isActive ? "text-rose-400" : "text-slate-600")}>{step.name}</span>
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
                    <Link href="/student/yarismalar"><ArrowLeft className="mr-2 h-4 w-4" /> Geri Dön</Link>
                </Button>
            ) : (
                <Button variant="ghost" onClick={handleBack} className="text-slate-400 hover:text-white hover:bg-white/10"><ArrowLeft className="mr-2 h-4 w-4" /> Geri</Button>
            )}

            {currentStep < steps.length ? (
                <Button onClick={handleNext} disabled={
                    (currentStep === 1 && !selection.courseId) ||
                    (currentStep === 2 && !selection.unitId) ||
                    (currentStep === 3 && !selection.topicId) ||
                    (currentStep === 4 && (!selection.player1Name || !selection.player2Name))
                } className="bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/20 px-8">
                    İleri <ArrowRight className="ml-2 h-4 w-4" />
                </Button> 
            ) : null}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
