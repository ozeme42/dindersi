
'use client';

import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, PartyPopper, Users, UserPlus, Trash2, Shuffle, Book, Library, ListTodo, User, Trophy, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { UserProfile, Course, Unit, Topic, SchoolClass } from "@/lib/types";
import { useAuth } from "@/context/auth-context";
import { Loader2 } from "lucide-react";
import { SelectionGrid } from "@/components/selection-grid";
import { useToast } from "@/hooks/use-toast";
import { getGuestPlayers, saveGuestPlayers } from "@/app/teacher/smartboard/ayarlar/actions";


const steps = [
  { id: 1, name: "Ders", icon: <Book className="h-5 w-5" /> },
  { id: 2, name: "Ünite", icon: <Library className="h-5 w-5" /> },
  { id: 3, name: "Konu", icon: <ListTodo className="h-5 w-5" /> },
  { id: 4, name: "Takımlar", icon: <Users className="h-5 w-5" /> },
  { id: 5, name: "Başlat", icon: <PartyPopper className="h-5 w-5" /> },
];

type Team = { id: number; name: string; players: string[] };
type TeamForUrl = { id: number; name: string; players: string[] };

export function TakimYarismaSetupClientPage({ gameConfig }: { gameConfig: any }) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(false);
  
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

  const { toast } = useToast();
  const [guestPlayers, setGuestPlayers] = useState<string[]>([]);
  const [teams, setTeams] = useState<Team[]>([
    { id: 1, name: "Takım A", players: [] },
    { id: 2, name: "Takım B", players: [] },
  ]);
  const [unassignedPlayers, setUnassignedPlayers] = useState<string[]>([]);
  const [newGuestName, setNewGuestName] = useState("");

  const allAvailablePlayers = useMemo(() => {
    return [user?.displayName, ...guestPlayers].filter(Boolean) as string[];
  }, [user, guestPlayers]);
  
  useEffect(() => {
      const allAssignedPlayers = teams.flatMap(t => t.players);
      setUnassignedPlayers(allAvailablePlayers.filter(p => !allAssignedPlayers.includes(p)));
  }, [allAvailablePlayers, teams]);


  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      // Fetch guests
      if (user) {
          const fetchedPlayers = await getGuestPlayers(user.uid);
          setGuestPlayers(fetchedPlayers);
      }
      
      if (!user) {
        setIsLoading(false);
        return;
      }
      
      // Fetch courses based on user class
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
  }, [user]);
  
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
  
  const handleSelectCourse = async (courseId: string, courseName: string) => {
    setSelection({ ...selection, courseId, courseName, unitId: '', unitName: '', topicId: '', topicName: '' });
    setIsDataLoading(true);
    const unitsRef = collection(db, `courses/${courseId}/units`);
    const q = query(unitsRef, orderBy("title"));
    const unitsSnapshot = await getDocs(q);
    setUnits(unitsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Unit)));
    setTopics([]);
    setIsDataLoading(false);
    setCurrentStep(2);
  };

  const handleSelectUnit = async (unitId: string, unitName: string) => {
    setSelection({ ...selection, unitId, unitName, topicId: '', topicName: '' });
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
    setCurrentStep(3);
  };
  
  const handleSelectTopic = (topicId: string, topicName: string) => {
    setSelection({ ...selection, topicId, topicName });
    setCurrentStep(4);
  };

  const handleNext = () => currentStep < steps.length && setCurrentStep(currentStep + 1);
  const handleBack = () => currentStep > 1 && setCurrentStep(currentStep - 1);
  
  const addTeam = () => setTeams([...teams, { id: Date.now(), name: `Takım ${String.fromCharCode(65 + teams.length)}`, players: [] }]);
  const removeTeam = (teamId: number) => {
      const teamToRemove = teams.find(t => t.id === teamId);
      if (teamToRemove) {
          setUnassignedPlayers(prev => [...prev, ...teamToRemove.players]);
          setTeams(teams.filter(t => t.id !== teamId));
      }
  };
  const updateTeamName = (teamId: number, name: string) => setTeams(teams.map(t => t.id === teamId ? { ...t, name } : t));
  const assignPlayer = (playerName: string, teamId: number) => {
    if (unassignedPlayers.includes(playerName)) {
      setTeams(teams.map(t => t.id === teamId ? { ...t, players: [...t.players, playerName] } : t));
    }
  };
  const unassignPlayer = (playerName: string, teamId: number) => {
    setTeams(teams.map(t => t.id === teamId ? { ...t, players: t.players.filter(p => p !== playerName) } : t));
  };
  
  const distributePlayers = () => {
    let allStudentsToDistribute = [...unassignedPlayers];
    const newTeams = teams.map(t => ({ ...t, players: [] as string[] }));
    allStudentsToDistribute = allStudentsToDistribute.sort(() => Math.random() - 0.5);
    allStudentsToDistribute.forEach((player, index) => {
        const teamIndex = index % teams.length;
        newTeams[teamIndex].players.push(player);
    });
    setTeams(newTeams);
  };

  const getGameUrl = () => {
    const teamsForUrl: TeamForUrl[] = teams.map(t => ({ id: t.id, name: t.name, players: t.players }));
    const params = new URLSearchParams({
        courseId: selection.courseId,
        unitId: selection.unitId,
        topicId: selection.topicId,
        teams: JSON.stringify(teamsForUrl),
        questionCount: "40", // Simplified for now
    });
    return `/student/yarismalar/takim/oyun?${params.toString()}`;
  }

  const renderContent = () => {
    if (isLoading && currentStep > 0) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-purple-400"/></div>
    
    const loadingProp = isDataLoading;

    switch(currentStep) {
      case 1: return <SelectionGrid items={courses} onSelect={handleSelectCourse} selectedId={selection.courseId} titleKey="title" isLoading={isLoading} subtitleKey={user?.role === 'teacher' || user?.role === 'superadmin' ? 'className' : undefined}/>;
      case 2: return <SelectionGrid items={units} selectedId={selection.unitId} onSelect={handleSelectUnit} specialOptions={[{ id: 'all', name: 'Tüm Üniteler' }]} disabled={!selection.courseId} titleKey="title" isLoading={loadingProp} />
      case 3: return <SelectionGrid items={topics} selectedId={selection.topicId} onSelect={handleSelectTopic} specialOptions={[{ id: 'all', name: 'Tüm Konular' }]} disabled={!selection.unitId || selection.unitId === 'all'} titleKey="title" isLoading={loadingProp} />
      case 4:
        return (
            <div className="space-y-6 w-full">
              <div className="flex flex-col sm:flex-row justify-between items-center pb-4 border-b border-white/10 gap-4">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2"><Shield className="h-6 w-6 text-purple-400"/> Takım Yönetimi</h3>
                  <div className="flex gap-2">
                      <Button onClick={distributePlayers} variant="secondary" size="sm" disabled={teams.length === 0 || unassignedPlayers.length === 0} className="bg-slate-800 text-white hover:bg-slate-700 border border-white/10"><Shuffle className="mr-2 h-4 w-4"/>Rastgele Dağıt</Button>
                      <Button onClick={addTeam} size="sm" className="bg-purple-600 hover:bg-purple-500 text-white"><UserPlus className="mr-2 h-4 w-4"/>Takım Ekle</Button>
                  </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Müsait Oyuncular */}
                  <Card className="lg:col-span-1 bg-slate-900 border-white/10 shadow-lg">
                      <CardHeader className="pb-3 border-b border-white/5">
                        <CardTitle className="text-white text-lg flex items-center gap-2">
                             <User className="h-5 w-5 text-cyan-400"/> Müsait Oyuncular ({unassignedPlayers.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4">
                         <ScrollArea className="h-[300px] pr-2">
                            <div className="space-y-2">
                                {unassignedPlayers.map(player => (
                                    <div key={player} className="flex items-center gap-2 p-2 rounded-lg bg-slate-950 border border-white/5 hover:border-white/10 group transition-all">
                                            <span className="flex-1 font-medium text-slate-300 truncate text-sm">{player === user?.displayName ? `${player} (Sen)` : player}</span>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {teams.map((team, index) => (
                                                    <button 
                                                        key={team.id} 
                                                        onClick={() => assignPlayer(player, team.id)} 
                                                        className={cn(
                                                            "h-6 w-6 rounded flex items-center justify-center text-xs font-bold transition-transform hover:scale-110",
                                                            index === 0 ? "bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white" :
                                                            index === 1 ? "bg-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-white" :
                                                            index === 2 ? "bg-green-500/20 text-green-400 hover:bg-green-500 hover:text-white" :
                                                            "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500 hover:text-white"
                                                        )}
                                                        title={`${team.name} takımına ekle`}
                                                    >
                                                        {String.fromCharCode(65 + index)}
                                                    </button>
                                                ))}
                                            </div>
                                    </div>
                                ))}
                                {unassignedPlayers.length === 0 && <p className="text-sm text-slate-500 text-center py-8 italic">Tüm oyuncular atandı.</p>}
                            </div>
                         </ScrollArea>
                         <form onSubmit={handleAddGuestPlayer} className="flex gap-2 pt-4 border-t border-white/10 mt-2">
                            <Input
                                placeholder="Yeni misafir adı..."
                                value={newGuestName}
                                onChange={(e) => setNewGuestName(e.target.value)}
                                className="bg-slate-950 border-white/10 text-white h-9 text-xs focus:border-purple-500/50"
                            />
                            <Button type="submit" size="icon" className="h-9 w-9 bg-purple-600 hover:bg-purple-500 text-white"><UserPlus className="h-4 w-4" /></Button>
                        </form>
                      </CardContent>
                  </Card>
                  
                  {/* Takımlar */}
                  <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 h-fit">
                      {teams.map((team, index) => {
                          const teamColors = [
                              "border-red-500/30 bg-red-900/10",
                              "border-blue-500/30 bg-blue-900/10",
                              "border-green-500/30 bg-green-900/10",
                              "border-yellow-500/30 bg-yellow-900/10",
                          ];
                          const headerColors = [
                                "text-red-400", "text-blue-400", "text-green-400", "text-yellow-400"
                          ];
                          return (
                              <Card key={team.id} className={cn("border shadow-lg transition-all", teamColors[index % teamColors.length] || "border-white/10 bg-slate-900")}>
                                  <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                                      <div className="flex items-center gap-2 w-full">
                                           <span className={cn("font-black text-xl w-6", headerColors[index % headerColors.length])}>{String.fromCharCode(65 + index)}</span>
                                           <Input 
                                                value={team.name} 
                                                onChange={(e) => updateTeamName(team.id, e.target.value)} 
                                                className="font-bold border-0 bg-transparent focus-visible:ring-0 text-white text-lg h-auto p-0 w-full" 
                                            />
                                      </div>
                                      <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-500 hover:text-red-400 hover:bg-red-500/10" onClick={() => removeTeam(team.id)} disabled={teams.length <= 2}><Trash2 className="h-4 w-4"/></Button>
                                  </CardHeader>
                                  <CardContent>
                                      <ScrollArea className="h-48 pr-2">
                                          <div className="space-y-1">
                                            {team.players.map(player => (
                                                <div key={player} className="flex items-center justify-between p-2 rounded bg-black/20 hover:bg-black/40 group transition-colors">
                                                    <span className="font-medium text-slate-300 text-sm truncate">{player === user?.displayName ? `${player} (Sen)` : player}</span>
                                                    <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400" onClick={() => unassignPlayer(player, team.id)}><Trash2 className="h-3 w-3"/></Button>
                                                </div>
                                            ))}
                                            {team.players.length === 0 && <p className="text-center text-xs text-slate-500 py-8 italic border-2 border-dashed border-white/5 rounded-xl m-2">Oyuncu bekliyor...</p>}
                                          </div>
                                      </ScrollArea>
                                  </CardContent>
                              </Card>
                          )
                      })}
                  </div>
              </div>
            </div>
        )
      case 5:
        return (
          <div className="w-full max-w-lg mx-auto">
             <Card className="bg-slate-900 border-white/10 overflow-hidden shadow-2xl">
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-1"></div>
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
                     
                     <div className="grid grid-cols-2 gap-4">
                         {teams.map(team => (
                             <div key={team.id} className="bg-slate-950 p-3 rounded-lg border border-white/5 text-center">
                                 <p className="font-bold text-white mb-1">{team.name}</p>
                                 <p className="text-xs text-purple-400 font-medium">{team.players.length} Oyuncu</p>
                             </div>
                         ))}
                     </div>
                </CardContent>
                <CardFooter>
                    <Button asChild className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-lg font-bold">
                        <Link href={getGameUrl()}>
                            <PartyPopper className="mr-2 h-5 w-5"/> Yarışmayı Başlat
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
            <div className="absolute top-[-20%] left-[-10%] w-[1000px] h-[1000px] bg-purple-900/10 rounded-full blur-[150px]" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-indigo-900/10 rounded-full blur-[150px]" />
        </div>

      <div className="max-w-7xl mx-auto w-full relative z-10 flex-grow flex flex-col">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black font-headline text-white tracking-tight uppercase drop-shadow-lg">Takım Yarışması</h1>
          <p className="text-slate-400 mt-1">Takımları kur ve rekabeti başlat.</p>
        </div>

        {/* Stepper */}
        <div className="flex justify-center items-center mb-8 px-4">
          <div className="relative flex items-center justify-between w-full max-w-4xl">
              <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-800 -z-10 rounded-full"></div>
              <div 
                  className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-purple-500 to-pink-500 -z-10 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
              ></div>

              {steps.map((step) => {
                  const isActive = currentStep === step.id;
                  const isCompleted = currentStep > step.id;
                  return (
                    <div key={step.id} className="flex flex-col items-center gap-2">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center border-4 transition-all duration-300 z-10 shadow-lg",
                          isActive 
                              ? "bg-slate-900 border-purple-500 text-purple-400 scale-110 shadow-purple-500/50" 
                              : isCompleted 
                                  ? "bg-pink-600 border-pink-600 text-white scale-100" 
                                  : "bg-slate-900 border-slate-800 text-slate-600"
                        )}>
                          {isCompleted ? <Check className="w-5 h-5 stroke-[3]" /> : step.icon}
                        </div>
                        <span className={cn("text-[10px] font-bold uppercase tracking-wider hidden sm:block", isActive ? "text-purple-400" : "text-slate-600")}>{step.name}</span>
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
                    (currentStep === 1 && !selection.classId) || 
                    (currentStep === 2 && !selection.courseId) ||
                    (currentStep === 3 && !selection.unitId) ||
                    (currentStep === 4 && !selection.topicId) || 
                    (currentStep === 5 && (teams.some(t => t.players.length === 0) || unassignedStudents.length > 0))
                } className="bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/20 px-8">
                    İleri <ArrowRight className="ml-2 h-4 w-4" />
                </Button> 
            ) : (
              <Button asChild className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-900/20 px-8 h-12 rounded-xl text-lg animate-pulse">
                <Link href={getGameUrl()}>
                    <PartyPopper className="mr-2 h-5 w-5" /> Yarışmayı Başlat
                </Link>
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
