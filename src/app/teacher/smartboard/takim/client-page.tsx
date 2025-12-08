'use client';

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
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
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { QUESTION_TYPES, DIFFICULTY_LEVELS } from "@/lib/game-config";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const steps = [
  { id: 1, name: "Sınıf", icon: <Users className="h-5 w-5" /> },
  { id: 2, name: "Ders", icon: <Book className="h-5 w-5" /> },
  { id: 3, name: "Ünite", icon: <Library className="h-5 w-5" /> },
  { id: 4, name: "Konu", icon: <ListTodo className="h-5 w-5" /> },
  { id: 5, name: "Takımlar", icon: <Users className="h-5 w-5" /> },
  { id: 6, name: "Ayarlar", icon: <Settings className="h-5 w-5" /> },
  { id: 7, name: "Başlat", icon: <Check className="h-5 w-5" /> },
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
        finishScore: settings.finishScore.toString(),
        questionTimer: settings.questionTimer.toString(),
        points: JSON.stringify(settings.points),
        penalty: JSON.stringify(settings.penalty),
    });
    return `/teacher/smartboard/takim/oyun?${params.toString()}`;
  }

  const renderContent = () => {
    if (isLoading && currentStep > 0) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-purple-400"/></div>
    
    const loadingProp = isDataLoading;
    const selectedClassData = allClasses.find(c => c.id === selection.classId);

    switch(currentStep) {
      case 1: return <SelectionGrid items={allClasses} onSelect={handleSelectClass} selectedId={selection.classId} titleKey="name" isLoading={isLoading} />;
      case 2: return <SelectionGrid items={courses} selectedId={selection.courseId} onSelect={handleSelectCourse} titleKey="title" isLoading={loadingProp} />
      case 3: return <SelectionGrid items={units} selectedId={selection.unitId} onSelect={handleSelectUnit} specialOptions={[{ id: 'all', name: 'Tüm Üniteler' }]} disabled={!selection.courseId} titleKey="title" isLoading={loadingProp} />
      case 4: return <SelectionGrid items={topics} selectedId={selection.topicId} onSelect={handleSelectTopic} specialOptions={[{ id: 'all', name: 'Tüm Konular' }]} disabled={!selection.unitId || selection.unitId === 'all'} titleKey="title" isLoading={loadingProp} />
      case 5:
        return (
            <div className="w-full h-full flex flex-col gap-6">
               <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-900/50 p-4 rounded-xl border border-white/5">
                   <div>
                       <h3 className="text-xl font-bold text-white">Takım Yönetimi</h3>
                       <p className="text-sm text-slate-400">Öğrencileri takımlara yerleştirin.</p>
                   </div>
                   <div className="flex gap-3">
                       <Button onClick={distributeStudents} variant="outline" size="sm" disabled={teams.length === 0 || filteredStudents.length === 0} className="border-indigo-500/30 text-indigo-300 hover:text-indigo-200 hover:bg-indigo-500/10"><Shuffle className="mr-2 h-4 w-4"/>Rastgele Dağıt</Button>
                       <Button onClick={addTeam} size="sm" className="bg-cyan-600 hover:bg-cyan-500 text-white"><UserPlus className="mr-2 h-4 w-4"/>Takım Ekle</Button>
                   </div>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-grow min-h-0">
                   {/* Sol: Öğrenci Havuzu */}
                   <Card className="lg:col-span-1 bg-slate-900/40 border-white/5 flex flex-col overflow-hidden">
                       <CardHeader className="py-4 border-b border-white/5 bg-slate-900/50">
                         <CardTitle className="text-base font-bold text-slate-300 flex justify-between items-center">
                             <span>Sınıf Listesi ({unassignedStudents.length})</span>
                         </CardTitle>
                         <div className="pt-2">
                            <Select value={selection.branch} onValueChange={handleBranchSelect} disabled={!selectedClassData}>
                                <SelectTrigger className="bg-slate-950 border-white/10 h-9 text-xs"><SelectValue placeholder="Şube Seçin..." /></SelectTrigger>
                                <SelectContent className="bg-slate-900 border-white/10 text-white">
                                    <SelectItem value="all">Tüm Şubeler</SelectItem>
                                    {selectedClassData?.branches?.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                                </SelectContent>
                            </Select>
                         </div>
                       </CardHeader>
                       <CardContent className="p-0 flex-grow overflow-hidden">
                          <ScrollArea className="h-[400px] p-2">
                              <div className="space-y-1">
                              {unassignedStudents.map(student => (
                                  <div key={student.uid} className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 group border border-transparent hover:border-white/5 transition-all">
                                      <Avatar className="h-8 w-8 border border-white/10"><AvatarImage src={student.avatar || ''} /><AvatarFallback className="bg-slate-800 text-xs text-slate-400">{student.displayName?.charAt(0)}</AvatarFallback></Avatar>
                                      <span className="flex-1 font-medium truncate text-sm text-slate-300 group-hover:text-white">{student.displayName}</span>
                                      <div className="flex gap-1">
                                        {teams.map((team, index) => (
                                            <Button key={team.id} size="icon" variant="ghost" className="h-7 w-7 rounded-md hover:bg-white/10" onClick={() => assignStudent(student, team.id)} title={`${team.name} takımına ekle`}>
                                                <span className={`font-black text-xs ${['text-blue-400', 'text-red-400', 'text-green-400', 'text-yellow-400'][index % 4]}`}>{String.fromCharCode(65 + index)}</span>
                                            </Button>
                                        ))}
                                      </div>
                                  </div>
                              ))}
                              {unassignedStudents.length === 0 && <p className="text-center text-xs text-slate-500 p-8 font-medium">Tüm öğrenciler takımlara yerleşti.</p>}
                              </div>
                          </ScrollArea>
                       </CardContent>
                   </Card>

                   {/* Sağ: Takımlar */}
                   <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 auto-rows-min">
                       {teams.map((team, index) => (
                           <Card key={team.id} className="bg-slate-900/40 border-white/5 flex flex-col overflow-hidden h-[400px]">
                               <CardHeader className={`py-3 border-b border-white/5 ${['bg-blue-500/10', 'bg-red-500/10', 'bg-green-500/10', 'bg-yellow-500/10'][index % 4]}`}>
                                   <div className="flex items-center gap-2">
                                       <Input 
                                            value={team.name} 
                                            onChange={(e) => updateTeamName(team.id, e.target.value)} 
                                            className={`font-black border-0 bg-transparent focus-visible:ring-0 text-lg h-8 px-0 ${['text-blue-400', 'text-red-400', 'text-green-400', 'text-yellow-400'][index % 4]}`} 
                                        />
                                       <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-500 hover:text-red-400 ml-auto" onClick={() => removeTeam(team.id)} disabled={teams.length <= 2}><Trash2 className="h-4 w-4"/></Button>
                                   </div>
                                   <p className="text-xs text-slate-400 font-medium">{team.players.length} Oyuncu</p>
                               </CardHeader>
                               <CardContent className="p-0 flex-grow overflow-hidden">
                                   <ScrollArea className="h-full p-2">
                                     <div className="space-y-1">
                                       {team.players.map(player => (
                                           <div key={player.uid} className="flex items-center gap-2 p-2 rounded-lg bg-slate-950/30 hover:bg-slate-950/50 border border-white/5 group">
                                               <Avatar className="h-7 w-7 border border-white/10"><AvatarImage src={player.avatar || ''} /><AvatarFallback className="bg-slate-900 text-[10px] text-slate-500">{player.displayName?.charAt(0)}</AvatarFallback></Avatar>
                                               <span className="flex-1 font-medium truncate text-sm text-slate-300">{player.displayName}</span>
                                               <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-red-400" onClick={() => unassignStudent(player, team.id)}><Trash2 className="h-3 w-3"/></Button>
                                           </div>
                                       ))}
                                       {team.players.length === 0 && <p className="text-center text-xs text-slate-600 p-8 border-2 border-dashed border-slate-800 rounded-xl m-2">Öğrenci sürükleyin veya ekleyin.</p>}
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
      case 7:
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
             
             <div className="bg-slate-900/40 p-6 rounded-2xl border border-white/5">
                 <h3 className="text-white font-bold mb-4 flex items-center gap-2 text-lg border-b border-white/5 pb-2">
                    <Users className="w-5 h-5 text-cyan-400" /> Takımlar
                 </h3>
                 <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {teams.map((team, i) => (
                        <div key={team.id} className="bg-slate-950/50 p-3 rounded-xl border border-white/5">
                            <p className={cn("font-bold", ['text-blue-400', 'text-red-400', 'text-green-400', 'text-yellow-400'][i % 4])}>{team.name}</p>
                            <p className="text-sm text-slate-500">{team.players.length} Oyuncu</p>
                        </div>
                    ))}
                 </div>
             </div>
             
             <div className="bg-slate-900/40 p-6 rounded-2xl border border-white/5">
                 <h3 className="text-white font-bold mb-4 flex items-center gap-2 text-lg border-b border-white/5 pb-2">
                    <Settings className="w-5 h-5 text-indigo-400" /> Oyun Ayarları
                 </h3>
                 <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-sm">
                    <div>
                        <span className="text-slate-400 block mb-1">Soru Sayısı</span>
                        <span className="text-white font-bold text-lg">{settings.questionCount}</span>
                    </div>
                    <div>
                        <span className="text-slate-400 block mb-1">Süre</span>
                        <span className="text-white font-bold text-lg">{settings.questionTimer > 0 ? `${settings.questionTimer} sn` : 'Kapalı'}</span>
                    </div>
                     <div>
                        <span className="text-slate-400 block mb-1">Hedef Puan</span>
                        <span className="text-white font-bold text-lg">{settings.finishScore > 0 ? settings.finishScore : 'Yok'}</span>
                    </div>
                 </div>
             </div>

             <div className="pt-4 flex justify-center">
                  <Button asChild size="lg" className="w-full md:w-2/3 h-20 text-2xl font-black bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-[0_0_40px_rgba(16,185,129,0.3)] rounded-2xl transition-all hover:scale-105 active:scale-95 group">
                    <Link href={getGameUrl()}>
                        <PartyPopper className="mr-4 h-8 w-8 group-hover:rotate-12 transition-transform" /> YARIŞMAYI BAŞLAT
                    </Link>
                  </Button>
             </div>

          </div>
        );
      default:
        return null;
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center p-4 sm:p-6 md:p-8 relative overflow-hidden font-sans">
      
       {/* Arka Plan Efektleri */}
       <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-cyan-900/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-900/20 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-6xl space-y-8 flex flex-col h-full flex-grow">
        
        {/* Başlık Alanı */}
        <div className="text-center space-y-4 py-4">
            <div className="inline-flex items-center justify-center p-4 bg-cyan-500/10 rounded-full mb-2 border border-cyan-500/20 shadow-lg shadow-cyan-500/10">
                <Users className="h-10 w-10 text-cyan-400"/>
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-white drop-shadow-xl tracking-tight">
                TAKIM YARIŞMASI
            </h1>
            <p className="text-slate-400 text-lg font-medium">Birlikte daha güçlüyüz! Takımını kur ve zafere ulaş.</p>
        </div>

        {/* Stepper (Adım Göstergesi) */}
        <div className="flex justify-center items-center px-4 w-full">
            <div className="relative flex items-center justify-between w-full max-w-5xl">
                {/* Bağlantı Çizgisi */}
                <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-800 -z-10 rounded-full"></div>
                <div 
                    className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-500 -z-10 rounded-full transition-all duration-500 ease-out"
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
                                    ? "bg-slate-900 border-cyan-500 text-cyan-400 scale-110 shadow-cyan-500/50" 
                                    : isCompleted 
                                        ? "bg-blue-600 border-blue-600 text-white scale-100" 
                                        : "bg-slate-900 border-slate-800 text-slate-600"
                            )}>
                                {isCompleted ? <Check className="w-6 h-6 stroke-[3]" /> : step.icon}
                            </div>
                            <span className={cn(
                                "text-xs md:text-sm font-bold transition-colors duration-300 absolute -bottom-8 whitespace-nowrap uppercase tracking-wider",
                                isActive ? "text-cyan-400" : isCompleted ? "text-blue-500" : "text-slate-600"
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
                        <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-lg">
                            {currentStep}
                        </span>
                        {steps.find(s => s.id === currentStep)?.name}
                     </h2>
                     {isLoading && <Loader2 className="h-6 w-6 animate-spin text-cyan-500" />}
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
                                (currentStep === 5 && (teams.some(t => t.players.length === 0) || unassignedStudents.length > 0))
                            }
                            className="bg-cyan-600 hover:bg-cyan-500 text-white h-14 px-8 rounded-xl text-lg shadow-lg shadow-cyan-900/20 transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
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