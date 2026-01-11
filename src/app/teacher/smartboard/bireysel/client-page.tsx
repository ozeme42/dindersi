
'use client';

import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Book, Library, ListTodo, Settings, PartyPopper, Loader2, Users, UserPlus, Trophy, User, Megaphone, Package, Wind, Gamepad2, UserCog, Lightbulb, Zap, Swords, BrainCircuit } from "lucide-react";
import { cn } from "@/lib/utils";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Course, Unit, Topic, SchoolClass } from "@/lib/types";
import { useAuth } from "@/context/auth-context";
import { SelectionGrid } from "@/components/selection-grid";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { getGuestPlayers, saveGuestPlayers } from "@/app/teacher/smartboard/ayarlar/actions";
import { Slider } from "@/components/ui/slider";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { QUESTION_TYPES, DIFFICULTY_LEVELS } from "@/lib/game-config";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const steps = [
  { id: 1, name: "Ders", icon: <Book className="h-5 w-5" /> },
  { id: 2, name: "Ünite", icon: <Library className="h-5 w-5" /> },
  { id: 3, name: "Konu", icon: <ListTodo className="h-5 w-5" /> },
  { id: 4, name: "Ayarlar", icon: <Settings className="h-5 w-5" /> },
  { id: 5, name: "Başlat", icon: <PartyPopper className="h-5 w-5" /> },
];

export function SmartboardBireyselClientPage({ gameConfig, gamePath, gameName, gameIconName }: { gameConfig: any, gamePath: string, gameName: string, gameIconName: "Megaphone" | "Package" | "Wind" | "Gamepad2" | "UserCog" | "Lightbulb" | "Zap" | "Swords" | "BrainCircuit" | "Trophy" }) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(false);
  
  const GameIcon = useMemo(() => {
    const icons = { Megaphone, Package, Wind, Gamepad2, UserCog, Lightbulb, Zap, Swords, BrainCircuit, Trophy };
    return icons[gameIconName] || Gamepad2;
  }, [gameIconName]);
  
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  
  const [courses, setCourses] = useState<Course[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  
  const [selection, setSelection] = useState({
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
  const [guestPlayers, setGuestPlayers] = useState<string[]>([]);
  const [inGameGuests, setInGameGuests] = useState<string[]>([]);
  const [newGuestName, setNewGuestName] = useState("");

  const fetchPlayers = useCallback(async () => {
    if (!user) return;
    const fetchedPlayers = await getGuestPlayers(user.uid);
    setGuestPlayers(fetchedPlayers);
  }, [user]);

  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      
      await fetchPlayers();

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
                    course.classId === studentClassId || !course.classId
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
  }, [user, fetchPlayers]);
  
  const handleAddGuestPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const name = newGuestName.trim();
    if (name && !guestPlayers.includes(name)) {
        const updatedGuests = [...guestPlayers, name];
        await saveGuestPlayers(user.uid, updatedGuests);
        setGuestPlayers(updatedGuests);
        setNewGuestName("");
        toast({ title: "Misafir Eklendi", description: `"${name}" misafir oyuncu olarak eklendi.` });
    } else if (guestPlayers.includes(name)) {
        toast({ title: "Hata", description: "Bu isimde bir misafir zaten mevcut.", variant: "destructive" });
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length) {
        // "Anlat Bakalım" oyunu için Ayarlar adımını atla
        if (gamePath === 'anlat-bakalim' && currentStep === 3) {
            setCurrentStep(5);
        } else {
            setCurrentStep(currentStep + 1);
        }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
        // "Anlat Bakalım" oyunu için özel geri dönüş mantığı
        if (gamePath === 'anlat-bakalim' && currentStep === 5) {
            setCurrentStep(3);
        } else {
            if (currentStep === 2) setSelection(s => ({...s, courseId: '', courseName: ''}));
            if (currentStep === 3) setSelection(s => ({...s, unitId: '', unitName: ''}));
            if (currentStep === 4) setSelection(s => ({...s, topicId: '', topicName: ''}));
            setCurrentStep(currentStep - 1);
        }
    }
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
  
  const toggleGuestPlayer = (name: string) => {
      setInGameGuests(prev => prev.includes(name) ? prev.filter(p => p !== name) : [...prev, name]);
  }

  const getGameUrl = () => {
    const allPlayers = [user?.displayName, ...inGameGuests].filter(Boolean);
    const params = new URLSearchParams({
      courseId: selection.courseId,
      unitId: selection.unitId,
      topicId: selection.topicId,
      questionCount: settings.questionCount.toString(),
      questionTimer: settings.questionTimer.toString(),
      players: allPlayers.join(','),
      points: JSON.stringify(gameConfig.points),
      penalty: JSON.stringify(gameConfig.penalty),
      finishScore: settings.finishScore.toString(),
    });
    return `/teacher/smartboard/${gamePath}/oyun?${params.toString()}`;
  }
  
  const renderContent = () => {
    if (isLoading && currentStep > 0) {
        return <div className="flex h-64 items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-cyan-400"/></div>
    }
    
    const loadingProp = isDataLoading;

    switch(currentStep) {
        case 1:
            return <SelectionGrid items={courses} selectedId={selection.courseId} onSelect={handleSelectCourse} titleKey="title" isLoading={isLoading} subtitleKey={user?.role === 'teacher' || user?.role === 'superadmin' ? 'className' : undefined}/>;
        case 2:
            return <SelectionGrid items={units} selectedId={selection.unitId} onSelect={handleSelectUnit} specialOptions={[{ id: 'all', name: 'Tüm Üniteler' }]} disabled={!selection.courseId} titleKey="title" isLoading={loadingProp} />;
        case 3:
            return <SelectionGrid items={topics} selectedId={selection.topicId} onSelect={handleSelectTopic} specialOptions={[{ id: 'all', name: 'Tüm Konular' }]} disabled={!selection.unitId || selection.unitId === 'all'} titleKey="title" isLoading={loadingProp} />;
        case 4:
            return (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full">
                    <Card className="bg-slate-900 border-white/10 shadow-lg">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-white"><Users className="text-cyan-400 h-5 w-5"/> Oyuncular</CardTitle>
                            <CardDescription className="text-slate-400 text-sm">
                               Yarışmaya katılacak misafir oyuncuları seç. Yeni misafirleri <Link href="/teacher/smartboard/ayarlar" className="underline hover:text-cyan-400">yönetim sayfasından</Link> ekleyebilirsin.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-48 border border-white/10 rounded-xl p-3 bg-slate-950/50 mb-4">
                                <div className="space-y-2">
                                    <div className="flex items-center space-x-3 p-3 bg-cyan-900/20 rounded-lg border border-cyan-500/20">
                                        <Checkbox defaultChecked disabled id="main-player" className="border-cyan-500/50 data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500"/>
                                        <Label htmlFor="main-player" className="font-bold text-cyan-100 flex items-center gap-2"><User className="h-4 w-4"/> {user?.displayName} (Sen)</Label>
                                    </div>
                                    {guestPlayers.length > 0 ? (
                                        guestPlayers.map(player => (
                                            <div key={player} className="flex items-center space-x-3 p-2 hover:bg-white/5 rounded-lg transition-colors">
                                                <Checkbox 
                                                    id={`guest-${player}`} 
                                                    onCheckedChange={() => toggleGuestPlayer(player)} 
                                                    checked={inGameGuests.includes(player)}
                                                    className="border-white/20 data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500"
                                                />
                                                <Label htmlFor={`guest-${player}`} className="font-normal text-slate-300 cursor-pointer w-full">{player}</Label>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-20 text-slate-500 text-sm italic">
                                            <Users className="h-8 w-8 mb-2 opacity-20"/>
                                            Hiç misafir oyuncu yok.
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                             <form onSubmit={handleAddGuestPlayer} className="flex gap-2">
                                <Input
                                    placeholder="Yeni misafir adı..."
                                    value={newGuestName}
                                    onChange={(e) => setNewGuestName(e.target.value)}
                                    className="bg-slate-950 border-white/10 text-white h-9 text-xs"
                                />
                                <Button type="submit" size="icon" className="h-9 w-9 bg-purple-600 hover:bg-purple-500 text-white"><UserPlus className="h-4 w-4" /></Button>
                            </form>
                        </CardContent>
                    </Card>
                    <Card className="bg-slate-900 border-white/10 shadow-lg">
                        <CardHeader><CardTitle className="text-white flex items-center gap-2"><Settings className="text-purple-400 h-5 w-5"/> Ayarlar</CardTitle></CardHeader>
                        <CardContent className="space-y-8">
                             <div>
                                <Label htmlFor="question-slider" className="flex justify-between text-slate-300 mb-2"><span>Soru Sayısı</span> <span className="text-cyan-400 font-bold">{settings.questionCount}</span></Label>
                                <Slider id="question-slider" value={[settings.questionCount]} onValueChange={(v) => setSettings({ ...settings, questionCount: v[0] })} max={gameConfig.questionCount.max} min={gameConfig.questionCount.min} step={gameConfig.questionCount.step} className="cursor-pointer" />
                            </div>
                            <div>
                                <Label htmlFor="question-timer-slider" className="flex justify-between text-slate-300 mb-2"><span>Soru Süresi</span> <span className="text-purple-400 font-bold">{settings.questionTimer > 0 ? `${settings.questionTimer} sn` : 'Kapalı'}</span></Label>
                                <Slider id="question-timer-slider" value={[settings.questionTimer]} onValueChange={(v) => setSettings({ ...settings, questionTimer: v[0] })} max={gameConfig.questionTimer.max} min={gameConfig.questionTimer.min} step={gameConfig.questionTimer.step} className="cursor-pointer" />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )
        case 5:
            const allPlayers = [user?.displayName, ...inGameGuests].filter(Boolean);
            return (
              <div className="w-full max-w-lg mx-auto">
                 <Card className="bg-slate-900 border-white/10 overflow-hidden shadow-2xl">
                    <div className="bg-gradient-to-r from-cyan-600 to-blue-600 p-1"></div>
                    <CardHeader className="text-center pb-2">
                        <Trophy className="h-12 w-12 text-yellow-400 mx-auto mb-2 drop-shadow-md"/>
                        <CardTitle className="text-2xl text-white">Yarışma Özeti</CardTitle>
                        <CardDescription className="text-slate-400">Her şey hazır mı? Başlamadan önce son kontroller.</CardDescription>
                    </CardHeader>
                     <CardContent className="space-y-6 pt-4">
                         <div className="space-y-2 text-sm text-slate-300">
                             <div className="flex justify-between border-b border-white/5 pb-2"><span>Ders:</span> <span className="text-white font-medium">{selection.courseName}</span></div>
                             <div className="flex justify-between border-b border-white/5 pb-2"><span>Ünite:</span> <span className="text-white font-medium">{selection.unitName}</span></div>
                             <div className="flex justify-between"><span>Konu:</span> <span className="text-white font-medium">{selection.topicName}</span></div>
                         </div>
                         
                         <div className="bg-slate-950 p-4 rounded-xl border border-white/5">
                             <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">YARIŞMACILAR</p>
                             <div className="flex flex-wrap gap-2">
                                 {allPlayers.map((p, i) => (
                                     <span key={i} className="px-2 py-1 bg-white/10 rounded text-xs text-white border border-white/10">{p}</span>
                                 ))}
                             </div>
                         </div>
                    </CardContent>
                    <CardFooter>
                        <Button asChild className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-lg font-bold">
                            <Link href={getGameUrl()}>
                                <PartyPopper className="mr-2 h-5 w-5" /> Yarışmayı Başlat
                            </Link>
                        </Button>
                    </CardFooter>
                 </Card>
              </div>
            );
        default:
            return null;
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 p-4 sm:p-6 md:p-8 relative overflow-hidden flex flex-col">
        
        {/* Arka Plan */}
        <div className="fixed inset-0 pointer-events-none z-0">
            <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-cyan-900/10 rounded-full blur-[150px]" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-900/10 rounded-full blur-[150px]" />
        </div>

      <div className="max-w-5xl mx-auto w-full relative z-10 flex-grow flex flex-col">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black font-headline text-white tracking-tight uppercase drop-shadow-lg">{gameName} Kurulumu</h1>
          <p className="text-slate-400 mt-1">Yarışmanı oluşturmak için adımları takip et.</p>
        </div>

        {/* Stepper */}
        <div className="flex justify-center items-center mb-8 px-4">
          <div className="relative flex items-center justify-between w-full max-w-2xl">
              <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-800 -z-10 rounded-full"></div>
              <div 
                  className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-500 -z-10 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
              ></div>

              {steps.map((step) => {
                  if (gamePath === 'anlat-bakalim' && step.id === 4) return null; // Anlat Bakalım için Ayarlar adımını gizle
                  const isActive = currentStep === step.id;
                  const isCompleted = currentStep > step.id;
                  return (
                    <div key={step.id} className="flex flex-col items-center gap-2 group cursor-default">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center border-4 transition-all duration-300 z-10 shadow-lg",
                          isActive 
                              ? "bg-slate-900 border-cyan-500 text-cyan-400 scale-110 shadow-cyan-500/50" 
                              : isCompleted 
                                  ? "bg-blue-600 border-blue-600 text-white scale-100" 
                                  : "bg-slate-900 border-slate-800 text-slate-600"
                        )}>
                          {isCompleted ? <Check className="w-5 h-5 stroke-[3]" /> : step.icon}
                        </div>
                        <span className={cn("text-[10px] font-bold uppercase tracking-wider hidden sm:block", isActive ? "text-cyan-400" : "text-slate-600")}>{step.name}</span>
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
                    <Link href="/teacher/smartboard"><ArrowLeft className="mr-2 h-4 w-4" /> Menüye Dön</Link>
                </Button>
            ) : (
                <Button variant="ghost" onClick={handleBack} className="text-slate-400 hover:text-white hover:bg-white/10"><ArrowLeft className="mr-2 h-4 w-4" /> Geri</Button>
            )}

            {currentStep < steps.length && (
                <Button onClick={handleNext} disabled={
                    (currentStep === 1 && !selection.courseId) ||
                    (currentStep === 2 && !selection.unitId) ||
                    (currentStep === 3 && !selection.topicId) ||
                    (currentStep === 4 && gamePath !== 'anlat-bakalim' && (inGameGuests.length + 1) === 0)
                } className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/20 px-8">
                    İleri <ArrowRight className="ml-2 h-4 w-4" />
                </Button> 
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
