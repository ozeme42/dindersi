
"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, PartyPopper, Users, UserPlus, Trash2, Shuffle, Book, Library, ListTodo } from "lucide-react";
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

const STORAGE_KEY = 'hikmet-oyunu-guest-players';

const steps = [
  { id: 1, name: "Ders Seçimi", icon: <Book className="h-5 w-5" /> },
  { id: 2, name: "Ünite Seçimi", icon: <Library className="h-5 w-5" /> },
  { id: 3, name: "Konu Seçimi", icon: <ListTodo className="h-5 w-5" /> },
  { id: 4, name: "Takım Kurulumu", icon: <Users className="h-5 w-5" /> },
  { id: 5, name: "Onay", icon: <Check className="h-5 w-5" /> },
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
      try {
          const stored = localStorage.getItem(STORAGE_KEY);
          if(stored) setGuestPlayers(JSON.parse(stored));
      } catch (e) { console.error("Could not load guests", e); }
      
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
    if (isLoading && currentStep > 0) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin"/></div>
    
    const loadingProp = isDataLoading;

    switch(currentStep) {
      case 1: return <SelectionGrid items={courses} onSelect={handleSelectCourse} selectedId={selection.courseId} titleKey="title" isLoading={isLoading} subtitleKey={user?.role === 'teacher' || user?.role === 'superadmin' ? 'className' : undefined}/>;
      case 2: return <SelectionGrid items={units} selectedId={selection.unitId} onSelect={handleSelectUnit} specialOptions={[{ id: 'all', name: 'Tüm Üniteler' }]} disabled={!selection.courseId} titleKey="title" isLoading={loadingProp} />
      case 3: return <SelectionGrid items={topics} selectedId={selection.topicId} onSelect={handleSelectTopic} specialOptions={[{ id: 'all', name: 'Tüm Konular' }]} disabled={!selection.unitId || selection.unitId === 'all'} titleKey="title" isLoading={loadingProp} />
      case 4:
        return (
            <div className="space-y-4 w-full">
              <div className="flex justify-between items-center pb-4 border-b">
                  <h3 className="text-lg font-semibold">Takımları Yönet</h3>
                  <div className="flex gap-2">
                      <Button onClick={distributePlayers} variant="outline" size="sm" disabled={teams.length === 0 || unassignedPlayers.length === 0}><Shuffle className="mr-2 h-4 w-4"/>Rastgele Dağıt</Button>
                      <Button onClick={addTeam} size="sm"><UserPlus className="mr-2 h-4 w-4"/>Takım Ekle</Button>
                  </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="md:col-span-1">
                      <CardHeader><CardTitle>Müsait Oyuncular ({unassignedPlayers.length})</CardTitle></CardHeader>
                      <CardContent>
                         <ScrollArea className="h-60 mb-4">
                            <div className="space-y-2">
                                {unassignedPlayers.map(player => (
                                    <div key={player} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50">
                                        <span className="flex-1 font-medium truncate">{player === user?.displayName ? `${player} (Sen)` : player}</span>
                                        {teams.map((team, index) => <Button key={team.id} size="icon" variant="ghost" className="h-7 w-7" onClick={() => assignPlayer(player, team.id)} title={`${team.name} takımına ekle`}><span className={`font-bold text-sm text-chart-${(index % 5) + 1}`}>{String.fromCharCode(65 + index)}</span></Button>)}
                                    </div>
                                ))}
                                {unassignedPlayers.length === 0 && <p className="text-sm text-muted-foreground p-2">Tüm oyuncular atandı.</p>}
                            </div>
                         </ScrollArea>
                         <form onSubmit={handleAddGuestPlayer} className="flex gap-2 pt-4 border-t">
                            <Input
                                placeholder="Yeni misafir adı..."
                                value={newGuestName}
                                onChange={(e) => setNewGuestName(e.target.value)}
                            />
                            <Button type="submit" size="icon" title="Yeni misafir ekle"><UserPlus className="h-4 w-4" /></Button>
                        </form>
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
                                          <div key={player} className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                                              <span className="flex-1 font-medium truncate">{player === user?.displayName ? `${player} (Sen)` : player}</span>
                                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => unassignPlayer(player, team.id)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
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
      case 5:
        return (
            <div className="space-y-4 max-w-2xl mx-auto">
               <h3 className="text-xl font-semibold font-headline text-center mb-4">Yarışma Özeti</h3>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
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
                              {team.players.map(p => <li key={p}>{p}</li>)}
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
            <ol className="flex items-center w-full max-w-xl">
                {steps.map((step) => (
                <li key={step.id} className={cn("flex w-full items-center", { "after:content-[''] after:w-full after:h-1 after:border-b after:border-border after:border-2 after:inline-block": step.id !== steps.length })}>
                    <span className={cn("flex items-center justify-center w-10 h-10 rounded-full lg:h-12 lg:w-12 shrink-0 transition-colors duration-300",
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
            {currentStep === 1 ? <Button asChild variant="outline"><Link href="/student/yarismalar"><ArrowLeft className="mr-2 h-4 w-4" /> Geri Dön</Link></Button> : <Button variant="outline" onClick={handleBack}><ArrowLeft className="mr-2 h-4 w-4" /> Geri</Button>}
            
            {currentStep < steps.length ? 
                <Button onClick={handleNext} disabled={
                    (currentStep === 1 && !selection.courseId) ||
                    (currentStep === 2 && !selection.unitId) ||
                    (currentStep === 3 && !selection.topicId) ||
                    (currentStep === 4 && (teams.some(t => t.players.length === 0) || unassignedPlayers.length > 0))
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
