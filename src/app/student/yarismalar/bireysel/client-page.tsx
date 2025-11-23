

"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Book, Library, ListTodo, Settings, PartyPopper, Loader2, Users, UserPlus } from "lucide-react";
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


const steps = [
  { id: 1, name: "Ders Seçimi", icon: <Book className="h-5 w-5" /> },
  { id: 2, name: "Ünite Seçimi", icon: <Library className="h-5 w-5" /> },
  { id: 3, name: "Konu Seçimi", icon: <ListTodo className="h-5 w-5" /> },
  { id: 4, name: "Oyuncular ve Ayarlar", icon: <Users className="h-5 w-5" /> },
  { id: 5, name: "Onay", icon: <Check className="h-5 w-5" /> },
];

export function BireyselYarismaClientPage({ gameConfig }: { gameConfig: any }) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  
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

  const handleSelectCourse = async (courseId: string, courseName: string) => {
    setSelection({ ...selection, courseId, courseName, unitId: '', unitName: '', topicId: '', topicName: '' });
    setIsLoading(true);
    const unitsRef = collection(db, `courses/${courseId}/units`);
    const q = query(unitsRef, orderBy("title"));
    const unitsSnapshot = await getDocs(q);
    setUnits(unitsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Unit)));
    setTopics([]);
    setIsLoading(false);
    setCurrentStep(2);
  };

  const handleSelectUnit = async (unitId: string, unitName: string) => {
    setSelection({ ...selection, unitId, unitName, topicId: '', topicName: '' });
    if (unitId === 'all') {
      setSelection(prev => ({ ...prev, topicId: 'all', topicName: 'Tüm Konular' }));
      setTopics([]);
    } else {
      setIsLoading(true);
      const topicsRef = collection(db, `courses/${selection.courseId}/units/${unitId}/topics`);
      const q = query(topicsRef, orderBy("title"));
      const topicsSnapshot = await getDocs(q);
      setTopics(topicsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Topic)));
      setIsLoading(false);
    }
    setCurrentStep(3);
  };
  
  const handleSelectTopic = (topicId: string, topicName: string) => {
    setSelection({ ...selection, topicId, topicName });
    setCurrentStep(4);
  };
  
  const toggleGuestPlayer = (name: string) => {
      setInGameGuests(prev => prev.includes(name) ? prev.filter(p => p !== name) : [...prev, name]);
  }

  const handleNext = () => currentStep < steps.length && setCurrentStep(currentStep + 1);
  const handleBack = () => currentStep > 1 && setCurrentStep(currentStep - 1);
  
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
    });
    return `/student/yarismalar/bireysel/oyun?${params.toString()}`;
  }
  
  const renderContent = () => {
    if (isLoading && currentStep > 0) {
        return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin"/></div>
    }
    switch(currentStep) {
        case 1:
            return <SelectionGrid items={courses} selectedId={selection.courseId} onSelect={handleSelectCourse} titleKey="title" isLoading={isLoading} subtitleKey={user?.role === 'teacher' || user?.role === 'superadmin' ? 'className' : undefined}/>;
        case 2:
            return <SelectionGrid items={units} selectedId={selection.unitId} onSelect={handleSelectUnit} specialOptions={[{ id: 'all', name: 'Tüm Üniteler' }]} disabled={!selection.courseId} titleKey="title" isLoading={isLoading} />;
        case 3:
            return <SelectionGrid items={topics} selectedId={selection.topicId} onSelect={handleSelectTopic} specialOptions={[{ id: 'all', name: 'Tüm Konular' }]} disabled={!selection.unitId || selection.unitId === 'all'} titleKey="title" isLoading={isLoading}/>;
        case 4:
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
                    <Card>
                        <CardHeader>
                            <CardTitle>Oyuncular</CardTitle>
                            <CardDescription>Kendin ve misafir oyuncular arasından seçim yap.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-40 border rounded-md p-2 mb-4">
                                <div className="space-y-2">
                                    <div className="flex items-center space-x-2 p-2 bg-primary/10 rounded-md">
                                        <Checkbox defaultChecked disabled id="main-player"/>
                                        <Label htmlFor="main-player" className="font-semibold">{user?.displayName} (Sen)</Label>
                                    </div>
                                    {guestPlayers.length > 0 ? (
                                        guestPlayers.map(player => (
                                            <div key={player} className="flex items-center space-x-2 p-2">
                                                <Checkbox id={`guest-${player}`} onCheckedChange={() => toggleGuestPlayer(player)} checked={inGameGuests.includes(player)}/>
                                                <Label htmlFor={`guest-${player}`} className="font-normal">{player}</Label>
                                            </div>
                                        ))
                                    ) : (
                                         <p className="p-4 text-center text-sm text-muted-foreground">Hiç misafir oyuncu yok.</p>
                                    )}
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
                    <Card>
                        <CardHeader><CardTitle>Ayarlar</CardTitle></CardHeader>
                        <CardContent className="space-y-8">
                             <div>
                                <Label htmlFor="question-slider" className="flex justify-between"><span>Soru Sayısı:</span> <span>{settings.questionCount}</span></Label>
                                <Slider id="question-slider" value={[settings.questionCount]} max={gameConfig.questionCount.max} min={gameConfig.questionCount.min} step={gameConfig.questionCount.step} onValueChange={(val) => setSettings({ ...settings, questionCount: val[0] })} />
                            </div>
                            <div>
                                <Label htmlFor="question-timer-slider" className="flex justify-between"><span>Soru Süresi:</span> <span>{settings.questionTimer > 0 ? `${settings.questionTimer} sn` : 'Kapalı'}</span></Label>
                                <Slider id="question-timer-slider" value={[settings.questionTimer]} max={gameConfig.questionTimer.max} min={gameConfig.questionTimer.min} step={gameConfig.questionTimer.step} onValueChange={(val) => setSettings({ ...settings, questionTimer: val[0] })} />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )
        case 5:
            const allPlayers = [user?.displayName, ...inGameGuests].filter(Boolean);
            return (
              <div className="space-y-4 text-center sm:text-left w-full max-w-lg">
                 <h3 className="text-xl font-semibold font-headline text-center mb-4">Yarışma Özeti</h3>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                    <p><strong>Ders:</strong></p><p>{selection.courseName}</p>
                    <p><strong>Ünite:</strong></p><p>{selection.unitName}</p>
                    <p><strong>Konu:</strong></p><p>{selection.topicName}</p>
                 </div>
                 <hr className="my-4"/>
                 <h3 className="text-lg font-semibold text-center sm:text-left">Oyuncular ({allPlayers.length})</h3>
                 <p className="text-muted-foreground">{allPlayers.join(', ')}</p>
                 <hr className="my-4"/>
                 <h3 className="text-lg font-semibold text-center sm:text-left">Ayarlar</h3>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                    <p><strong>Soru Sayısı:</strong></p><p>{settings.questionCount}</p>
                    <p><strong>Soru Süresi:</strong></p><p>{settings.questionTimer > 0 ? `${settings.questionTimer} saniye` : 'Kapalı'}</p>
                 </div>
              </div>
            );
        default:
            return null;
    }
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold font-headline">Bireysel Yarışma Kurulumu</h1>
          <p className="text-muted-foreground">Yarışmanı oluşturmak için adımları takip et.</p>
        </div>

        <div className="flex justify-center items-center mb-8 px-4">
          <ol className="flex items-center w-full max-w-xl">
            {steps.map((step) => (
              <li key={step.id} className={cn("flex w-full items-center", { "after:content-[''] after:w-full after:h-1 after:border-b after:border-border after:border-2 after:inline-block": step.id !== steps.length })}>
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

        <Card className="min-h-[400px]">
          <CardHeader>
            <CardTitle>{steps.find(s => s.id === currentStep)?.name}</CardTitle>
          </CardHeader>
          <CardContent className="min-h-[250px] flex justify-center items-center">
             {renderContent()}
          </CardContent>
          <CardFooter className="flex justify-between pt-6">
            {currentStep === 1 ? (
                <Button asChild variant="outline">
                    <Link href="/student/yarismalar"><ArrowLeft className="mr-2 h-4 w-4" /> Geri Dön</Link>
                </Button>
            ) : (
                <Button variant="outline" onClick={handleBack}><ArrowLeft className="mr-2 h-4 w-4" /> Geri</Button>
            )}

            {currentStep < steps.length ? (
              <Button onClick={handleNext} disabled={
                (currentStep === 1 && !selection.courseId) || 
                (currentStep === 2 && !selection.unitId) || 
                (currentStep === 3 && !selection.topicId)
                }>İleri <ArrowRight className="mr-2 h-4 w-4" /></Button>
            ) : (
              <Button asChild className="bg-green-600 hover:bg-green-700 text-white">
                <Link href={getGameUrl()}>
                    <PartyPopper className="mr-2 h-4 w-4" /> Yarışmayı Başlat
                </Link>
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
