
"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Book, ListTodo, Settings, Swords, UserCheck, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Course, Topic, UserProfile } from "@/lib/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SelectionGrid } from "@/components/selection-grid";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

const SUMMER_SCHOOL_CLASS_NAME = "Yaz Okulu Havuzu";

const steps = [
  { id: 1, name: "Ders Seçimi", icon: <Book className="h-5 w-5" /> },
  { id: 2, name: "Konu Seçimi", icon: <ListTodo className="h-5 w-5" /> },
  { id: 3, name: "Ayarlar", icon: <Settings className="h-5 w-5" /> },
  { id: 4, name: "Savaşçılar", icon: <UserCheck className="h-5 w-5" /> },
  { id: 5, name: "Onay", icon: <Check className="h-5 w-5" /> },
];

export function SmartboardDuelloSetupClientPage({ gameConfig }: { gameConfig: any }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Data states
  const [summerStudents, setSummerStudents] = useState<UserProfile[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  
  const [selection, setSelection] = useState({
    player1Id: "",
    player1Name: "",
    player2Id: "",
    player2Name: "",
    courseId: "",
    courseName: "",
    topicId: "",
    topicName: "",
  });
  
  const [settings, setSettings] = useState({
    questionCount: gameConfig.questionCount.default,
    questionTimer: gameConfig.questionTimer.default,
  });

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const summerCoursesQuery = query(collection(db, "courses"), where("isSummerSchool", "==", true));
      const summerStudentsQuery = query(collection(db, "users"), where("class", "==", SUMMER_SCHOOL_CLASS_NAME));

      const [coursesSnapshot, studentsSnapshot] = await Promise.all([
          getDocs(summerCoursesQuery),
          getDocs(summerStudentsQuery)
      ]);
      setCourses(coursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course)));
      setSummerStudents(studentsSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
      setIsLoading(false);
    };
    fetchData();
  }, []);

  const handleNext = () => currentStep < steps.length && setCurrentStep(currentStep + 1);
  const handleBack = () => currentStep > 1 && setCurrentStep(currentStep - 1);

  const handleSelectCourse = async (courseId: string, courseName: string) => {
    setSelection(prev => ({ ...prev, courseId, courseName, topicId: '', topicName: '' }));
    setIsLoading(true);
    const topicsRef = collection(db, `courses/${courseId}/topics`);
    const q = query(topicsRef, orderBy("title"));
    const topicsSnapshot = await getDocs(q);
    setTopics(topicsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Topic)));
    setIsLoading(false);
    handleNext();
  };
  
  const handleSelectTopic = (topicId: string, topicName: string) => {
    setSelection(prev => ({...prev, topicId, topicName}));
    handleNext();
  };

  const handleSelectPlayer = (playerNumber: 1 | 2, studentId: string) => {
    const student = summerStudents.find(s => s.uid === studentId);
    if (!student) return;

    if (playerNumber === 1) {
        setSelection(prev => ({ ...prev, player1Id: student.uid, player1Name: student.displayName }));
    } else {
        setSelection(prev => ({ ...prev, player2Id: student.uid, player2Name: student.displayName }));
    }
  };
  
  const getGameUrl = () => {
     const params = new URLSearchParams({
        courseId: selection.courseId,
        courseName: selection.courseName,
        topicId: selection.topicId,
        topicName: selection.topicName,
        questionCount: settings.questionCount.toString(),
        questionTimer: settings.questionTimer.toString(),
        p1: selection.player1Id,
        p2: selection.player2Id,
    });
    return `/teacher/summer-school/smartboard/duello/oyun?${params.toString()}`;
  }

  const renderContent = () => {
    if (isLoading && currentStep > 1) {
      return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin"/></div>
    }

    switch(currentStep) {
        case 1:
          return <SelectionGrid items={courses} titleKey="title" selectedId={selection.courseId} onSelect={handleSelectCourse} isLoading={isLoading}/>;
        case 2:
            return <SelectionGrid items={topics} titleKey="title" selectedId={selection.topicId} onSelect={handleSelectTopic} specialOptions={[{id: 'all', name: 'Tüm Konular'}]} disabled={!selection.courseId} isLoading={isLoading}/>;
        case 3:
            return (
                <div className="space-y-8 max-w-lg mx-auto w-full">
                    <div>
                        <Label htmlFor="question-slider" className="flex justify-between"><span>Soru Sayısı:</span> <span>{settings.questionCount}</span></Label>
                        <Slider id="question-slider" value={[settings.questionCount]} onValueChange={(v) => setSettings(s => ({ ...s, questionCount: v[0] }))} max={gameConfig.questionCount.max} min={gameConfig.questionCount.min} step={gameConfig.questionCount.step} />
                        <p className="text-sm text-muted-foreground mt-1">Düelloda kullanılacak toplam soru sayısı.</p>
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
            );
        case 4:
            return (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-2xl items-start">
                    <div className="space-y-2">
                        <Label htmlFor="player1" className="text-lg font-semibold">1. Savaşçı</Label>
                        <Select onValueChange={(id) => handleSelectPlayer(1, id)} value={selection.player1Id}>
                            <SelectTrigger id="player1"><SelectValue placeholder="Öğrenci Seç" /></SelectTrigger>
                            <SelectContent>
                                {summerStudents.filter(s => s.uid !== selection.player2Id).map(s => <SelectItem key={s.uid} value={s.uid}>{s.displayName}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="player2" className="text-lg font-semibold">2. Savaşçı</Label>
                        <Select onValueChange={(id) => handleSelectPlayer(2, id)} value={selection.player2Id}>
                            <SelectTrigger id="player2"><SelectValue placeholder="Öğrenci Seç" /></SelectTrigger>
                            <SelectContent>
                                {summerStudents.filter(s => s.uid !== selection.player1Id).map(s => <SelectItem key={s.uid} value={s.uid}>{s.displayName}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            );
        case 5:
            return (
                <div className="space-y-4 text-center sm:text-left w-full max-w-lg">
                    <h3 className="text-xl font-semibold font-headline text-center mb-4">Düello Özeti</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                        <p><strong>1. Savaşçı:</strong></p><p>{selection.player1Name}</p>
                        <p><strong>2. Savaşçı:</strong></p><p>{selection.player2Name}</p>
                        <hr className="col-span-2 my-1"/>
                        <p><strong>Ders:</strong></p><p>{selection.courseName}</p>
                        <p><strong>Konu:</strong></p><p>{selection.topicName}</p>
                        <hr className="col-span-2 my-1"/>
                        <p><strong>Soru Sayısı:</strong></p><p>{settings.questionCount}</p>
                        <p><strong>Soru Zamanlayıcısı:</strong></p><p>{settings.questionTimer > 0 ? `${settings.questionTimer} saniye` : 'Kapalı'}</p>
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
          <h1 className="text-3xl font-bold font-headline">Yaz Kursu Düello Kurulumu</h1>
          <p className="text-muted-foreground">Düelloyu başlatmak için adımları takip edin.</p>
        </div>
        
        <div className="flex justify-center items-center mb-8 px-4">
          <ol className="flex items-center w-full max-w-lg">
            {steps.map((step, index) => (
              <li key={step.id} className={cn("flex w-full items-center", { "after:content-[''] after:w-full after:h-1 after:border-b after:border-border after:border-2 after:inline-block": index !== steps.length - 1 })}>
                <span className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full lg:h-12 lg:w-12 shrink-0 transition-colors duration-300",
                  currentStep > step.id ? "bg-primary text-primary-foreground" :
                  currentStep === step.id ? "bg-destructive text-accent-foreground scale-110" :
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
          <CardContent className="min-h-[250px] flex items-center justify-center">
              {renderContent()}
          </CardContent>
          <CardFooter className="flex justify-between pt-6">
              {currentStep === 1 ? (
                <Button asChild variant="outline">
                    <Link href="/teacher/summer-school/smartboard"><ArrowLeft className="mr-2 h-4 w-4" /> Geri Dön</Link>
                </Button>
              ) : (
                <Button variant="outline" onClick={handleBack}><ArrowLeft className="mr-2 h-4 w-4" /> Geri</Button>
              )}
              {currentStep < steps.length ? (
              <Button onClick={handleNext} disabled={
                  (currentStep === 1 && !selection.courseId) ||
                  (currentStep === 2 && !selection.topicId) ||
                  (currentStep === 4 && (!selection.player1Id || !selection.player2Id))
              }>İleri <ArrowRight className="ml-2 h-4 w-4" /></Button>
            ) : (
              <Button asChild className="bg-destructive hover:bg-destructive/90 text-white" disabled={!selection.player1Id || !selection.player2Id}>
                <Link href={getGameUrl()}>
                    <Swords className="mr-2 h-4 w-4" /> Düelloyu Başlat
                </Link>
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
