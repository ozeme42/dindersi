
"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, PartyPopper, Users, UserPlus, Trash2, Shuffle, Book, ListTodo, Settings, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { UserProfile, Course, Topic } from "@/lib/types";
import { Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { SelectionGrid } from "@/components/selection-grid";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

const SUMMER_SCHOOL_CLASS_NAME = "Yaz Okulu Havuzu";

const steps = [
  { id: 1, name: "Ders Seçimi", icon: <Book className="h-5 w-5" /> },
  { id: 2, name: "Konu Seçimi", icon: <ListTodo className="h-5 w-5" /> },
  { id: 3, name: "Takım Kurulumu", icon: <Users className="h-5 w-5" /> },
  { id: 4, name: "Ayarlar", icon: <Settings className="h-5 w-5" /> },
  { id: 5, name: "Onay", icon: <Check className="h-5 w-5" /> },
];

type Team = { id: number; name: string; students: UserProfile[] };
type TeamForUrl = { id: number; name: string; studentUids: string[] };

export function TakimYarismaSetupClientPage({ gameConfig }: { gameConfig: any }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(false);
  
  // Data states
  const [courses, setCourses] = useState<Course[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  
  const [selection, setSelection] = useState({
    courseId: "",
    courseName: "",
    topicId: "",
    topicName: "",
  });

  const [settings, setSettings] = useState({
    questionCount: gameConfig.questionCount.default,
    questionTimer: gameConfig.questionTimer.default,
    finishScore: gameConfig.finishScore.default,
  });
  
  const [teams, setTeams] = useState<Team[]>([
    { id: 1, name: "Takım A", students: [] },
    { id: 2, name: "Takım B", students: [] },
  ]);
  const [unassignedStudents, setUnassignedStudents] = useState<UserProfile[]>([]);
  
  useEffect(() => {
    const fetchInitialData = async () => {
        setIsLoading(true);
        const summerCoursesQuery = query(collection(db, "courses"), where("isSummerSchool", "==", true));
        const summerStudentsQuery = query(collection(db, "users"), where("class", "==", SUMMER_SCHOOL_CLASS_NAME));
        
        const [coursesSnapshot, studentsSnapshot] = await Promise.all([
            getDocs(summerCoursesQuery),
            getDocs(summerStudentsQuery),
        ]);
        
        setCourses(coursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course)));
        const summerStudents = studentsSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
        setUnassignedStudents(summerStudents);
        setIsLoading(false);
    };
    fetchInitialData();
  }, []);

  const handleSelectCourse = async (courseId: string, courseName: string) => {
    setSelection(prev => ({ ...prev, courseId, courseName, topicId: '', topicName: '' }));
    setIsDataLoading(true);
    const topicsSnapshot = await getDocs(query(collection(db, `courses/${courseId}/topics`), orderBy("title")));
    setTopics(topicsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Topic)));
    setIsDataLoading(false);
    handleNext();
  };
  
   const handleSelectTopic = (topicId: string, topicName: string) => {
    setSelection(prev => ({...prev, topicId, topicName}));
    handleNext();
  }

  const handleNext = () => currentStep < steps.length && setCurrentStep(currentStep + 1);
  const handleBack = () => currentStep > 1 && setCurrentStep(currentStep - 1);

  const addTeam = () => {
    const newTeamId = teams.length > 0 ? Math.max(...teams.map(t => t.id)) + 1 : 1;
    setTeams([...teams, { id: newTeamId, name: `Takım ${String.fromCharCode(65 + teams.length)}`, students: [] }]);
  };

  const removeTeam = (teamId: number) => {
    const teamToRemove = teams.find(t => t.id === teamId);
    if (teamToRemove) {
      setUnassignedStudents([...unassignedStudents, ...teamToRemove.students]);
      setTeams(teams.filter(t => t.id !== teamId));
    }
  };

  const updateTeamName = (teamId: number, name: string) => {
    setTeams(teams.map(t => t.id === teamId ? { ...t, name } : t));
  };

  const assignStudent = (studentId: string, teamId: number) => {
    const student = unassignedStudents.find(s => s.uid === studentId);
    if (student) {
      setTeams(teams.map(t => t.id === teamId ? { ...t, students: [...t.students, student] } : t));
      setUnassignedStudents(unassignedStudents.filter(s => s.uid !== studentId));
    }
  };

  const unassignStudent = (studentId: string, teamId: number) => {
    const team = teams.find(t => t.id === teamId);
    const student = team?.students.find(s => s.uid === studentId);
    if (team && student) {
      setTeams(teams.map(t => t.id === teamId ? { ...t, students: t.students.filter(s => s.uid !== studentId) } : t));
      setUnassignedStudents([...unassignedStudents, student]);
    }
  };
  
  const distributeStudents = () => {
    let allStudentsToDistribute = [...unassignedStudents, ...teams.flatMap(t => t.students)];
    const newTeams = teams.map(t => ({ ...t, students: [] as UserProfile[] }));
    
    allStudentsToDistribute = allStudentsToDistribute.sort(() => Math.random() - 0.5);
    
    allStudentsToDistribute.forEach((student, index) => {
        const teamIndex = index % teams.length;
        newTeams[teamIndex].students.push(student);
    });

    setTeams(newTeams);
    setUnassignedStudents([]);
  };

  const getGameUrl = () => {
    const teamsForUrl: TeamForUrl[] = teams.map(t => ({
        id: t.id,
        name: t.name,
        studentUids: t.students.map(s => s.uid)
    }));
    const params = new URLSearchParams({
        courseId: selection.courseId,
        courseName: selection.courseName,
        topicId: selection.topicId,
        topicName: selection.topicName,
        questionCount: settings.questionCount.toString(),
        questionTimer: settings.questionTimer.toString(),
        finishScore: settings.finishScore.toString(),
        teams: JSON.stringify(teamsForUrl)
    });
    return `/teacher/summer-school/smartboard/takim/oyun?${params.toString()}`;
  }
  
  const renderContent = () => {
    if (isLoading) {
      return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin"/></div>
    }

    const loadingProp = isDataLoading;

    switch(currentStep) {
      case 1: return <SelectionGrid items={courses} selectedId={selection.courseId} onSelect={handleSelectCourse} titleKey="title" isLoading={isLoading} />
      case 2: return <SelectionGrid items={topics} selectedId={selection.topicId} onSelect={handleSelectTopic} specialOptions={[{ id: 'all', name: 'Tüm Konular' }]} disabled={!selection.courseId} titleKey="title" isLoading={loadingProp} />
      case 3:
        return (
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-4 border-b">
                  <h3 className="text-lg font-semibold">Takımları Yönet</h3>
                  <div className="flex gap-2">
                      <Button onClick={distributeStudents} variant="outline" size="sm" disabled={teams.length === 0 || isDataLoading}><Shuffle className="mr-2 h-4 w-4"/>Rastgele Dağıt</Button>
                      <Button onClick={addTeam} size="sm"><UserPlus className="mr-2 h-4 w-4"/>Takım Ekle</Button>
                  </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="md:col-span-1">
                      <CardHeader><CardTitle>Yaz Okulu Havuzu ({unassignedStudents.length})</CardTitle></CardHeader>
                      <CardContent>
                         <ScrollArea className="h-72">
                              <div className="space-y-2">
                              {unassignedStudents.map(student => (
                                  <div key={student.uid} className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                                      <Avatar className="h-8 w-8"><AvatarImage src={student.avatar || ''} data-ai-hint="profile picture" /><AvatarFallback>{student.displayName?.charAt(0)}</AvatarFallback></Avatar>
                                      <span className="flex-1 font-medium truncate">{student.displayName}</span>
                                      {teams.map((team, index) => (
                                          <Button key={team.id} size="icon" variant="ghost" className="h-7 w-7" onClick={() => assignStudent(student.uid, team.id)} title={`${team.name} takımına ekle`}>
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
                                      {team.students.map(student => (
                                          <div key={student.uid} className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                                              <Avatar className="h-8 w-8"><AvatarImage src={student.avatar || ''} data-ai-hint="profile picture" /><AvatarFallback>{student.displayName?.charAt(0)}</AvatarFallback></Avatar>
                                              <span className="flex-1 font-medium truncate">{student.displayName}</span>
                                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => unassignStudent(student.uid, team.id)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                          </div>
                                      ))}
                                      {team.students.length === 0 && <p className="text-center text-sm text-muted-foreground p-4">Bu takıma öğrenci ekleyin.</p>}
                                      </div>
                                  </ScrollArea>
                              </CardContent>
                          </Card>
                      ))}
                  </div>
              </div>
            </div>
        )
      case 4:
        return (
             <div className="space-y-8 max-w-lg mx-auto w-full">
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
      case 5:
        return (
            <div className="space-y-4 max-w-2xl mx-auto">
               <h3 className="text-xl font-semibold font-headline text-center mb-4">Yarışma Özeti</h3>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                    <p><strong>Ders:</strong></p><p>{selection.courseName}</p>
                    <p><strong>Konu:</strong></p><p>{selection.topicName}</p>
                    <p><strong>Soru Sayısı:</strong></p><p>{settings.questionCount}</p>
                    <p><strong>Soru Zamanlayıcısı:</strong></p><p>{settings.questionTimer > 0 ? `${settings.questionTimer} saniye` : 'Kapalı'}</p>
                    <p><strong>Bitiş Skoru:</strong></p><p>{settings.finishScore > 0 ? `${settings.finishScore} puan` : 'Devre Dışı'}</p>
                 </div>
               <hr className="my-4"/>
               <h3 className="text-lg font-semibold text-center mb-4">Takımlar</h3>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {teams.map(team => (
                      <div key={team.id} className="border p-4 rounded-lg">
                          <h4 className="font-bold text-accent">{team.name} ({team.students.length} oyuncu)</h4>
                          <ul className="list-disc list-inside text-sm text-muted-foreground mt-2">
                              {team.students.map(s => <li key={s.uid}>{s.displayName}</li>)}
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
          <h1 className="text-3xl font-bold font-headline">Yaz Kursu Takım Yarışması</h1>
          <p className="text-muted-foreground">Yarışmayı başlatmak için adımları takip edin.</p>
        </div>

        <div className="flex justify-center items-center mb-8 px-4">
            <ol className="flex items-center w-full max-w-xl">
                {steps.map((step, index) => (
                <li key={step.id} className={cn("flex w-full items-center", { "after:content-[''] after:w-full after:h-1 after:border-b after:border-border after:border-2 after:inline-block": index !== steps.length - 1 })}>
                    <span className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-full lg:h-12 lg:w-12 shrink-0 transition-colors duration-300",
                    currentStep > step.id ? "bg-primary text-primary-foreground" :
                    currentStep === step.id ? "bg-accent text-accent-foreground scale-110" :
                    "bg-muted text-muted-foreground"
                    )}>
                    {step.icon}
                    </span>
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
            {currentStep === 1 ? <Button asChild variant="outline"><Link href="/teacher/summer-school/smartboard"><ArrowLeft className="mr-2 h-4 w-4" /> Geri Dön</Link></Button> : <Button variant="outline" onClick={handleBack}><ArrowLeft className="mr-2 h-4 w-4" /> Geri</Button>}
            
            {currentStep < steps.length ? 
                <Button onClick={handleNext} disabled={
                    (currentStep === 1 && !selection.courseId) ||
                    (currentStep === 2 && !selection.topicId) ||
                    (currentStep === 3 && teams.some(t => t.students.length === 0))
                }>İleri <ArrowRight className="ml-2 h-4 w-4" /></Button> 
            : 
                <Button asChild className="bg-green-600 hover:bg-green-700 text-white"><Link href={getGameUrl()}><PartyPopper className="mr-2 h-4 w-4" /> Yarışmayı Başlat</Link></Button>
            }
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
