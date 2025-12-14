
'use client';

import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, PartyPopper, Users, UserPlus, Trash2, Shuffle, Book, Library, ListTodo, Settings, UserCheck, GitBranch, Map } from "lucide-react";
import { cn } from "@/lib/utils";
import { collection, getDocs, query, orderBy, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { UserProfile, Course, Unit, Topic, SchoolClass } from "@/lib/types";
import { useAuth } from "@/context/auth-context";
import { Loader2 } from "lucide-react";
import { SelectionGrid } from "@/components/selection-grid";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const steps = [
  { id: 1, name: "Sınıf", icon: <Users className="h-5 w-5" /> },
  { id: 2, name: "Ders", icon: <Book className="h-5 w-5" /> },
  { id: 3, name: "Ünite", icon: <Library className="h-5 w-5" /> },
  { id: 4, name: "Konu", icon: <ListTodo className="h-5 w-5" /> },
  { id: 5, name: "Takımlar", icon: <Users className="h-5 w-5" /> },
  { id: 6, name: "Başlat", icon: <PartyPopper className="h-5 w-5" /> },
];

type Team = { id: number; name: string; players: UserProfile[] };
type TeamForUrl = { id: number; name: string; playerUids: string[] };

export function TakimYarismaSetupClientPage({ gameConfig }: { gameConfig: any }) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(false);
  
  // Data states
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
  });

  const { toast } = useToast();
  
  const [teams, setTeams] = useState<Team[]>([
    { id: 1, name: "Mavi Takım", color: "blue", players: [] },
    { id: 2, name: "Kırmızı Takım", color: "red", players: [] },
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
        const [classesSnap, coursesSnap, studentsSnap] = await Promise.all([
            getDocs(query(collection(db, 'classes'), orderBy('name'))),
            getDocs(query(collection(db, 'courses'))),
            getDocs(query(collection(db, 'users'), where('role', '==', 'guest')))
        ]);

        const classes = classesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolClass));
        const students = studentsSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
        setAllClasses(classes);
        setAllStudents(students);
        setAllCourses(coursesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course)));
        
    } catch (e) {
        console.error("Initial data fetch failed:", e);
        toast({ title: 'Hata', description: 'Gerekli veriler yüklenemedi.' });
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
        if (currentStep === 6) setTeams([
            { id: 1, name: "Mavi Takım", color: "blue", players: [] },
            { id: 2, name: "Kırmızı Takım", color: "red", players: [] },
        ]);
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
    setTeams([
      { id: 1, name: "Mavi Takım", color: "blue", players: [] },
      { id: 2, name: "Kırmızı Takım", color: "red", players: [] },
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
        { id: 1, name: "Mavi Takım", color: "blue", players: [] },
        { id: 2, name: "Kırmızı Takım", color: "red", players: [] },
    ]);
  };
  
  const addTeam = () => {
    const newTeamId = teams.length > 0 ? Math.max(...teams.map(t => t.id)) + 1 : 1;
    const colors = ["green", "yellow", "purple", "pink", "orange", "cyan"];
    setTeams([...teams, { id: newTeamId, name: `Takım ${String.fromCharCode(65 + teams.length)}`, color: colors[teams.length-2 % colors.length], players: [] }]);
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
        color: t.color,
        playerUids: t.players.map(s => s.uid)
    }));
    const params = new URLSearchParams({
        courseId: selection.courseId,
        unitId: selection.unitId,
        topicId: selection.topicId,
        teams: JSON.stringify(teamsForUrl),
        questionCount: "40", // Simplified for now
        finishScore: gameConfig.finishScore.default.toString(),
        questionTimer: gameConfig.questionTimer.default.toString(),
        points: JSON.stringify(gameConfig.points),
        penalty: JSON.stringify(gameConfig.penalty),
    });
    return `/teacher/smartboard/takim/oyun?${params.toString()}`;
  }
  
  const renderContent = () => {
    if (isLoading && currentStep > 0) return <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-purple-400"/></div>
    
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
                       <Button onClick={addTeam} size="sm" className="bg-purple-600 hover:bg-purple-500 text-white"><UserPlus className="mr-2 h-4 w-4"/>Takım Ekle</Button>
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
                           <Card key={team.id} className={cn("bg-slate-900/40 border-white/5 flex flex-col overflow-hidden h-fit")}>
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
                                   <ScrollArea className="h-48 p-2">
                                     <div className="space-y-1">
                                       {team.players.map(player => (
                                           <div key={player.uid} className="flex items-center gap-2 p-2 rounded-lg bg-slate-950/30 hover:bg-slate-950/50 border border-white/5 group">
                                               <Avatar className="h-7 w-7 border border-white/10"><AvatarImage src={player.avatar || ''} /><AvatarFallback className="bg-slate-900 text-[10px] text-slate-500">{player.displayName?.charAt(0)}</AvatarFallback></Avatar>
                                               <span className="flex-1 font-medium truncate text-sm text-slate-300">{player.displayName}</span>
                                               <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-red-400" onClick={() => unassignStudent(player, team.id)}><Trash2 className="h-3 w-3"/></Button>
                                           </div>
                                       ))}
                                       {team.players.length === 0 && <p className="text-center text-xs text-slate-600 p-8 border-2 border-dashed border-slate-800 rounded-xl m-2">Öğrenci bekliyor...</p>}
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
        return (
          <div className="w-full max-w-lg mx-auto">
             <Card className="bg-slate-900 border-white/10 overflow-hidden shadow-2xl">
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-1"></div>
                <CardHeader className="text-center pb-2">
                    <PartyPopper className="h-12 w-12 text-yellow-400 mx-auto mb-2 drop-shadow-md"/>
                    <CardTitle className="text-2xl text-white">Yarışma Özeti</CardTitle>
                    <CardDescription className="text-slate-400">Her şey hazır mı? Başlamadan önce son kontroller.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-4">
                     <div className="space-y-2 text-sm text-slate-300">
                         <div className="flex justify-between border-b border-white/5 pb-2"><span>Ders:</span> <span className="text-white font-medium">{selection.courseName}</span></div>
                         <div className="flex justify-between"><span>Konu:</span> <span className="text-white font-medium">{selection.topicName}</span></div>
                     </div>
                     
                     <div className="bg-slate-950 p-4 rounded-xl border border-white/5">
                         <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">TAKIMLAR</p>
                         <div className="grid grid-cols-2 gap-2">
                             {teams.map(team => (
                                 <div key={team.id} className="p-2 bg-white/5 rounded text-center">
                                     <p className="font-bold text-white mb-1">{team.name}</p>
                                     <p className="text-xs text-purple-400 font-medium">{team.players.length} Oyuncu</p>
                                 </div>
                             ))}
                         </div>
                     </div>
                </CardContent>
                <CardFooter>
                    <Button asChild className="w-full h-14 bg-emerald-600 hover:bg-emerald-500 text-lg font-bold">
                        <Link href={getGameUrl()}>
                            <PartyPopper className="mr-2 h-5 w-5"/> Yarışmayı Başlat
                        </Link>
                    </Button>
                </CardFooter>
             </Card>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center p-4 sm:p-6 md:p-8 relative overflow-hidden font-sans">
      
       {/* Arka Plan Efektleri */}
       <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-purple-900/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-900/20 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-6xl space-y-8 flex flex-col h-full flex-grow">
        
        {/* Başlık Alanı */}
        <div className="text-center space-y-4 py-4">
            <div className="inline-flex items-center justify-center p-4 bg-purple-500/10 rounded-full mb-2 border border-purple-500/20 shadow-lg shadow-purple-500/10">
                <Users className="h-10 w-10 text-purple-400"/>
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-white drop-shadow-xl tracking-tight">
                TAKIM YARIŞMASI
            </h1>
            <p className="text-slate-400 text-lg font-medium">Öğrencileri takımlara ayır ve bilgiyle savaştır.</p>
        </div>

        {/* Stepper (Adım Göstergesi) */}
        <div className="flex justify-center items-center px-4 w-full">
            <div className="relative flex items-center justify-between w-full max-w-5xl">
                <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-800 -z-10 rounded-full"></div>
                <div 
                    className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-500 -z-10 rounded-full transition-all duration-500 ease-out"
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
                    );
                })}
            </div>
        </div>

        {/* Ana İçerik Kartı */}
        <div className="mt-8 flex-grow flex flex-col">
             <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col flex-grow min-h-[500px]">
                <div className="p-6 md:p-8 border-b border-white/5 bg-slate-900/50 flex items-center justify-between">
                     <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 text-lg">
                            {currentStep}
                        </span>
                        {steps.find(s => s.id === currentStep)?.name}
                     </h2>
                     {isLoading && <Loader2 className="h-6 w-6 animate-spin text-purple-500" />}
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
                            className="bg-purple-600 hover:bg-purple-500 text-white h-14 px-8 rounded-xl text-lg shadow-lg shadow-purple-900/20 transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
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
