
"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, PartyPopper, Users, UserPlus, Trash2, Shuffle, Book, Library, ListTodo, Settings, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { collection, getDocs, query, orderBy, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { UserProfile, Course, Unit, Topic, SchoolClass } from "@/lib/types";
import { useAuth } from "@/context/auth-context";
import { Loader2 } from "lucide-react";
import { SelectionGrid } from "@/components/selection-grid";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { QUESTION_TYPES, DIFFICULTY_LEVELS } from "@/lib/game-config";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


const steps = [
  { id: 1, name: "Sınıf Seçimi", icon: <Users className="h-5 w-5" /> },
  { id: 2, name: "Ders Seçimi", icon: <Book className="h-5 w-5" /> },
  { id: 3, name: "Ünite Seçimi", icon: <Library className="h-5 w-5" /> },
  { id: 4, name: "Konu Seçimi", icon: <ListTodo className="h-5 w-5" /> },
  { id: 5, name: "Takım Kurulumu", icon: <Users className="h-5 w-5" /> },
  { id: 6, name: "Ayarlar", icon: <Settings className="h-5 w-5" /> },
  { id: 7, name: "Onay", icon: <Check className="h-5 w-5" /> },
];

type Team = { id: number; name: string; players: UserProfile[] };
type TeamForUrl = { id: number; name: string; playerUids: string[] };

export function TakimYarismaSetupClientPage({ gameConfig }: { gameConfig: any }) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(false);
  
  const [allClasses, setAllClasses] = useState<SchoolClass[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [allStudents, setAllStudents] = useState<UserProfile[]>([]);
  
  const [courses, setCourses] = useState<Course[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  
  const [filteredStudents, setFilteredStudents] = useState<UserProfile[]>([]);
  
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
  const [teams, setTeams] = useState<Team[]>([
    { id: 1, name: "Takım A", players: [] },
    { id: 2, name: "Takım B", players: [] },
  ]);
  const [unassignedStudents, setUnassignedStudents] = useState<UserProfile[]>([]);

  useEffect(() => {
      const allAssignedStudentsUids = new Set(teams.flatMap(t => t.players.map(p => p.uid)));
      setUnassignedStudents(filteredStudents.filter(s => !allAssignedStudentsUids.has(s.uid)));
  }, [filteredStudents, teams]);


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
    setTeams([
      { id: 1, name: "Takım A", players: [] },
      { id: 2, name: "Takım B", players: [] },
    ]);
    
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
    setTeams([
        { id: 1, name: "Takım A", players: [] },
        { id: 2, name: "Takım B", players: [] },
    ]);
  };

  const handleNext = () => currentStep < steps.length && setCurrentStep(currentStep + 1);
  const handleBack = () => {
    if (currentStep > 1) {
        if (currentStep === 2) setSelection(s => ({...s, classId: '', className: '', branch: 'all'}));
        if (currentStep === 3) setSelection(s => ({...s, courseId: '', courseName: ''}));
        if (currentStep === 4) setSelection(s => ({...s, unitId: '', unitName: ''}));
        if (currentStep === 5) setSelection(s => ({...s, topicId: '', topicName: ''}));
        if (currentStep === 6) setTeams([
            { id: 1, name: "Takım A", players: [] },
            { id: 2, name: "Takım B", players: [] },
        ]);
        setCurrentStep(currentStep - 1);
    }
  };
  
  const addTeam = () => {
    const newTeamId = teams.length > 0 ? Math.max(...teams.map(t => t.id)) + 1 : 1;
    setTeams([...teams, { id: newTeamId, name: `Takım ${String.fromCharCode(65 + teams.length)}`, players: [] }]);
  };

  const removeTeam = (teamId: number) => {
      const teamToRemove = teams.find(t => t.id === teamId);
      if (teamToRemove) {
          const newUnassigned = [...unassignedStudents, ...teamToRemove.players];
          setUnassignedStudents(newUnassigned.sort((a,b) => (a.displayName || '').localeCompare(b.displayName || '')));
          setTeams(teams.filter(t => t.id !== teamId));
      }
  };

  const updateTeamName = (teamId: number, name: string) => {
    setTeams(teams.map(t => t.id === teamId ? { ...t, name } : t));
  };
  
  const assignStudent = (student: UserProfile, teamId: number) => {
    setTeams(teams.map(t => t.id === teamId ? { ...t, players: [...t.players, student] } : t));
  };

  const unassignStudent = (student: UserProfile, teamId: number) => {
    const team = teams.find(t => t.id === teamId);
    if (team) {
      setTeams(teams.map(t => t.id === teamId ? { ...t, players: t.players.filter(p => p.uid !== student.uid) } : t));
    }
  };
  
  const distributeStudents = () => {
    let allStudentsToDistribute = [...filteredStudents];
    const newTeams = teams.map(t => ({ ...t, players: [] as UserProfile[] }));
    
    allStudentsToDistribute = allStudentsToDistribute.sort(() => Math.random() - 0.5);
    
    allStudentsToDistribute.forEach((student, index) => {
        const teamIndex = index % teams.length;
        newTeams[teamIndex].players.push(student);
    });

    setTeams(newTeams);
  };

  const getGameUrl = () => {
    const teamsForUrl: TeamForUrl[] = teams.map(t => ({
        id: t.id,
        name: t.name,
        playerUids: t.players.map(s => s.uid)
    }));
    const params = new URLSearchParams({
        courseId: selection.courseId,
        unitId: selection.unitId,
        topicId: selection.topicId,
        teams: JSON.stringify(teamsForUrl),
        questionCount: "40", // Simplified for now
    });
    return `/teacher/smartboard/takim/oyun?${params.toString()}`;
  }

  const renderContent = () => {
    if (isLoading && currentStep > 0) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin"/></div>
    
    const loadingProp = isDataLoading;
    const selectedClassData = allClasses.find(c => c.id === selection.classId);

    switch(currentStep) {
      case 1: return <SelectionGrid items={allClasses} onSelect={handleSelectClass} selectedId={selection.classId} titleKey="name" isLoading={isLoading} />;
      case 2: return <SelectionGrid items={courses} selectedId={selection.courseId} onSelect={handleSelectCourse} titleKey="title" isLoading={loadingProp} />
      case 3: return <SelectionGrid items={units} selectedId={selection.unitId} onSelect={handleSelectUnit} specialOptions={[{ id: 'all', name: 'Tüm Üniteler' }]} disabled={!selection.courseId} titleKey="title" isLoading={loadingProp} />
      case 4: return <SelectionGrid items={topics} selectedId={selection.topicId} onSelect={handleSelectTopic} specialOptions={[{ id: 'all', name: 'Tüm Konular' }]} disabled={!selection.unitId || selection.unitId === 'all'} titleKey="title" isLoading={loadingProp} />
      case 5:
        return (
            <div className="space-y-4 w-full">
              <div className="flex justify-between items-center pb-4 border-b">
                  <h3 className="text-lg font-semibold">Takımları Kur</h3>
                  <div className="flex gap-2">
                      <Button onClick={distributeStudents} variant="outline" size="sm" disabled={teams.length === 0 || filteredStudents.length === 0}><Shuffle className="mr-2 h-4 w-4"/>Rastgele Dağıt</Button>
                      <Button onClick={addTeam} size="sm"><UserPlus className="mr-2 h-4 w-4"/>Takım Ekle</Button>
                  </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="md:col-span-1">
                      <CardHeader>
                        <CardTitle>Sınıf Listesi ({filteredStudents.length})</CardTitle>
                        <div className="pt-2">
                            <Label>Şube</Label>
                             <Select value={selection.branch} onValueChange={handleBranchSelect} disabled={!selectedClassData}>
                                <SelectTrigger><SelectValue placeholder="Şube Seçin..." /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tüm Şubeler</SelectItem>
                                    {selectedClassData?.branches?.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                      </CardHeader>
                      <CardContent>
                         <ScrollArea className="h-72">
                              <div className="space-y-2">
                              {unassignedStudents.map(student => (
                                  <div key={student.uid} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50">
                                      <Avatar className="h-8 w-8"><AvatarImage src={student.avatar || ''} data-ai-hint="profile picture" /><AvatarFallback>{student.displayName?.charAt(0)}</AvatarFallback></Avatar>
                                      <span className="flex-1 font-medium truncate">{student.displayName}</span>
                                      {teams.map((team, index) => (
                                          <Button key={team.id} size="icon" variant="ghost" className="h-7 w-7" onClick={() => assignStudent(student, team.id)} title={`${team.name} takımına ekle`}>
                                              <span className={`font-bold text-sm text-chart-${(index % 5) + 1}`}>{String.fromCharCode(65 + index)}</span>
                                          </Button>
                                      ))}
                                  </div>
                              ))}
                              {unassignedStudents.length === 0 && <p className="text-center text-sm text-muted-foreground p-4">Tüm öğrenciler atandı.</p>}
                              </div>
                         </ScrollArea>
                      </CardContent>
                  </Card>
                  <div className="md:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {teams.map((team, index) => (
                          <Card key={team.id}>
                              <CardHeader>
                                  <div className="flex items-center gap-2">
                                      <Input value={team.name} onChange={(e) => updateTeamName(team.id, e.target.value)} className={`font-bold border-0 focus-visible:ring-0 text-lg text-chart-${(index % 5) + 1}`} />
                                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => removeTeam(team.id)} disabled={teams.length <= 2}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                  </div>
                              </CardHeader>
                              <CardContent>
                                  <ScrollArea className="h-60">
                                    <div className="space-y-2">
                                      {team.players.map(player => (
                                          <div key={player.uid} className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                                              <Avatar className="h-8 w-8"><AvatarImage src={player.avatar || ''} data-ai-hint="profile picture" /><AvatarFallback>{player.displayName?.charAt(0)}</AvatarFallback></Avatar>
                                              <span className="flex-1 font-medium truncate">{player.displayName}</span>
                                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => unassignStudent(player, team.id)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                          </div>
                                      ))}
                                      {team.players.length === 0 && <p className="text-center text-sm text-muted-foreground p-4">Bu takıma öğrenci ekleyin.</p>}
                                      </div>
                                  </ScrollArea>
                              </CardContent>
                          </Card>
                      ))}
                  </div>
              </div>
            </div>
        )
      case 6:
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
                  <Slider id="question-slider" value={[settings.questionCount]} onValueChange={(v) => setSettings(s => ({ ...s, questionCount: v[0] }))} max={gameConfig.questionCount.max} min={gameConfig.questionCount.min} step={gameConfig.questionCount.step} />
                </div>
                <div className="space-y-3 rounded-lg border p-3 shadow-sm">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="finish-score-switch" className="flex flex-col space-y-1">
                            <span>Bitiş Skoru</span>
                            <span className="font-normal leading-snug text-muted-foreground">
                                Belirli bir puana ulaşınca yarışı bitir.
                            </span>
                        </Label>
                        <Switch
                            id="finish-score-switch"
                            checked={settings.finishScore > 0}
                            onCheckedChange={(checked) => {
                                setSettings(prev => ({
                                    ...prev,
                                    finishScore: checked ? gameConfig.finishScore.default : 0
                                }));
                            }}
                        />
                    </div>
                    {settings.finishScore > 0 && (
                        <div className="pt-2 space-y-2">
                            <Label htmlFor="finish-score-input">Puan Değeri</Label>
                            <Input
                                id="finish-score-input"
                                type="number"
                                value={settings.finishScore}
                                onChange={(e) => setSettings(prev => ({ ...prev, finishScore: parseInt(e.target.value) || 0 }))}
                                step={gameConfig.finishScore.step}
                                className="w-full"
                            />
                        </div>
                    )}
                </div>
                 <div className="space-y-3 rounded-lg border p-3 shadow-sm">
                  <div className="flex items-center justify-between">
                      <Label htmlFor="timer-switch" className="flex flex-col space-y-1">
                          <span>Soru Zamanlayıcısı</span>
                          <span className="font-normal leading-snug text-muted-foreground">
                              Her soru için bir geri sayım sayacı ayarlayın.
                          </span>
                      </Label>
                      <Switch
                          id="timer-switch"
                          checked={settings.questionTimer > 0}
                          onCheckedChange={(checked) => {
                              setSettings(prev => ({
                                  ...prev,
                                  questionTimer: checked ? gameConfig.questionTimer.default : 0
                              }));
                          }}
                      />
                  </div>
                  {settings.questionTimer > 0 && (
                      <div className="pt-2 space-y-2">
                          <Label htmlFor="question-timer-slider" className="flex justify-between">
                              <span>Süre:</span>
                              <span>{settings.questionTimer} saniye</span>
                          </Label>
                          <div className="flex items-center gap-4">
                              <Slider
                                  id="question-timer-slider"
                                  value={[settings.questionTimer]}
                                  max={gameConfig.questionTimer.max}
                                  min={gameConfig.questionTimer.min}
                                  step={gameConfig.questionTimer.step}
                                  onValueChange={(val) => setSettings(prev => ({ ...prev, questionTimer: val[0] }))}
                                  className="flex-1"
                              />
                              <Input
                                  type="number"
                                  value={settings.questionTimer}
                                  onChange={(e) => {
                                      const val = parseInt(e.target.value);
                                      if (!isNaN(val)) {
                                          setSettings(prev => ({ ...prev, questionTimer: Math.max(gameConfig.questionTimer.min, Math.min(gameConfig.questionTimer.max, val)) }));
                                      }
                                  }}
                                  className="w-20"
                              />
                          </div>
                      </div>
                  )}
                </div>
             </div>
        )
      case 7:
        return (
            <div className="space-y-4 max-w-2xl mx-auto">
               <h3 className="text-xl font-semibold font-headline text-center mb-4">Yarışma Özeti</h3>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                    <p><strong>Sınıf:</strong></p><p>{selection.className} - {selection.branch}</p>
                    <p><strong>Ders:</strong></p><p>{selection.courseName}</p>
                    <p><strong>Konu:</strong></p><p>{selection.topicName}</p>
                 </div>
               <hr className="my-4"/>
               <h3 className="text-lg font-semibold text-center mb-4">Takımlar</h3>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {teams.map(team => (
                      <div key={team.id} className="border p-4 rounded-lg">
                          <h4 className="font-bold text-accent">{team.name} ({team.players.length} oyuncu)</h4>
                          <ul className="list-disc list-inside text-sm text-muted-foreground mt-2">
                              {team.players.map(p => <li key={p.uid}>{p.displayName}</li>)}
                          </ul>
                      </div>
                  ))}
               </div>
            </div>
        )
      default:
        return null;
    }
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold font-headline">Takım Yarışması Kurulumu</h1>
          <p className="text-muted-foreground">Takımları kur ve yarışmayı başlat.</p>
        </div>

        <div className="flex justify-center items-center mb-8 px-4">
            <ol className="flex items-center w-full max-w-3xl">
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

        <Card className="min-h-[450px]">
          <CardHeader><CardTitle>{steps.find(s => s.id === currentStep)?.name}</CardTitle></CardHeader>
          <CardContent className="min-h-[300px]">
            {renderContent()}
          </CardContent>
          <CardFooter className="flex justify-between pt-6">
            {currentStep === 1 ? <Button asChild variant="outline"><Link href="/teacher/smartboard"><ArrowLeft className="mr-2 h-4 w-4" /> Geri Dön</Link></Button> : <Button variant="outline" onClick={handleBack}><ArrowLeft className="mr-2 h-4 w-4" /> Geri</Button>}
            
            {currentStep < steps.length ? 
                <Button onClick={handleNext} disabled={
                    (currentStep === 1 && !selection.classId) ||
                    (currentStep === 2 && !selection.courseId) ||
                    (currentStep === 3 && !selection.unitId) ||
                    (currentStep === 4 && !selection.topicId) ||
                    (currentStep === 5 && (teams.some(t => t.players.length === 0) || unassignedStudents.length > 0))
                }>İleri <ArrowRight className="mr-2 h-4 w-4" /></Button> 
            : 
                <Button asChild className="bg-green-600 hover:bg-green-700 text-white"><Link href={getGameUrl()}><PartyPopper className="mr-2 h-4 w-4" /> Yarışmayı Başlat</Link></Button>
            }
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

    