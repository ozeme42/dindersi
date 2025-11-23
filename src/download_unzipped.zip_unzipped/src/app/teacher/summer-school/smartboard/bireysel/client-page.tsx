
"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Book, ListTodo, Settings, PartyPopper, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { collection, getDocs, query, orderBy, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Course, Topic } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { SelectionGrid } from "@/components/selection-grid";
import { Switch } from "@/components/ui/switch";

const steps = [
  { id: 1, name: "Ders Seçimi", icon: <Book className="h-5 w-5" /> },
  { id: 2, name: "Konu Seçimi", icon: <ListTodo className="h-5 w-5" /> },
  { id: 3, name: "Ayarlar", icon: <Settings className="h-5 w-5" /> },
  { id: 4, name: "Onay", icon: <Check className="h-5 w-5" /> },
];

export function SmartboardBireyselClientPage({ gameConfig }: { gameConfig: any }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  
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

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const summerCoursesQuery = query(collection(db, "courses"), where("isSummerSchool", "==", true));
      const coursesSnapshot = await getDocs(summerCoursesQuery);
      setCourses(coursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course)));
      setIsLoading(false);
    };
    fetchData();
  }, []);

  const handleSelectCourse = async (courseId: string, courseName: string) => {
    setSelection(prev => ({ ...prev, courseId, courseName, topicId: '', topicName: '' }));
    setIsLoading(true);
    const topicsRef = collection(db, `courses/${courseId}/topics`);
    const q = query(topicsRef, orderBy("title"));
    const topicsSnapshot = await getDocs(q);
    setTopics(topicsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Topic)));
    setIsLoading(false);
    setCurrentStep(2);
  };

  const handleSelectTopic = (topicId: string, topicName: string) => {
    setSelection(prev => ({...prev, topicId, topicName}));
    setCurrentStep(3);
  };

  const getGameUrl = () => {
    const params = new URLSearchParams({
        courseId: selection.courseId,
        courseName: selection.courseName,
        topicId: selection.topicId,
        topicName: selection.topicName,
        questionCount: settings.questionCount.toString(),
        questionTimer: settings.questionTimer.toString(),
        finishScore: settings.finishScore.toString(),
    });
    return `/teacher/summer-school/smartboard/bireysel/oyun?${params.toString()}`;
  }

  const handleNext = () => currentStep < steps.length && setCurrentStep(currentStep + 1);
  const handleBack = () => currentStep > 1 && setCurrentStep(currentStep - 1);
  
  const renderContent = () => {
     switch(currentStep) {
        case 1:
            return <SelectionGrid items={courses} selectedId={selection.courseId} onSelect={handleSelectCourse} titleKey="title" isLoading={isLoading}/>;
        case 2:
            return <SelectionGrid items={topics} selectedId={selection.topicId} onSelect={handleSelectTopic} specialOptions={[{ id: 'all', name: 'Tüm Konular' }]} disabled={!selection.courseId} titleKey="title" isLoading={isLoading}/>;
        case 3:
            return (
              <div className="space-y-8 max-w-md mx-auto w-full">
                <div>
                  <Label htmlFor="question-slider" className="flex justify-between"><span>Soru Sayısı:</span> <span>{settings.questionCount}</span></Label>
                  <Slider id="question-slider" value={[settings.questionCount]} max={gameConfig.questionCount.max} min={gameConfig.questionCount.min} step={gameConfig.questionCount.step} onValueChange={(val) => setSettings(prev => ({ ...prev, questionCount: val[0] }))} />
                  <p className="text-sm text-muted-foreground mt-1">Yarışmada kullanılacak toplam soru sayısı.</p>
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
            );
        case 4:
            return (
              <div className="space-y-4 text-center sm:text-left w-full max-w-lg">
                 <h3 className="text-xl font-semibold font-headline text-center mb-4">Yarışma Özeti</h3>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                    <p><strong>Ders:</strong></p><p>{selection.courseName}</p>
                    <p><strong>Konu:</strong></p><p>{selection.topicName}</p>
                 </div>
                 <hr className="my-4"/>
                 <h3 className="text-lg font-semibold text-center sm:text-left">Ayarlar</h3>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                    <p><strong>Soru Sayısı:</strong></p><p>{settings.questionCount}</p>
                    <p><strong>Soru Zamanlayıcısı:</strong></p><p>{settings.questionTimer > 0 ? `${settings.questionTimer} saniye` : 'Kapalı'}</p>
                    <p><strong>Bitiş Skoru:</strong></p><p>{settings.finishScore > 0 ? `${settings.finishScore} puan` : 'Devre Dışı'}</p>
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
          <h1 className="text-3xl font-bold font-headline">Yaz Kursu Bireysel Yarışma</h1>
          <p className="text-muted-foreground">Yarışmayı başlatmak için adımları takip edin.</p>
        </div>

        <div className="flex justify-center items-center mb-8 px-4">
          <ol className="flex items-center w-full max-w-md">
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
                    <Link href="/teacher/summer-school/smartboard"><ArrowLeft className="mr-2 h-4 w-4" /> Geri Dön</Link>
                </Button>
            ) : (
                <Button variant="outline" onClick={handleBack}><ArrowLeft className="mr-2 h-4 w-4" /> Geri</Button>
            )}

            {currentStep < steps.length ? (
              <Button onClick={handleNext} disabled={
                  (currentStep === 1 && !selection.courseId) || 
                  (currentStep === 2 && !selection.topicId)
              }>İleri <ArrowRight className="ml-2 h-4 w-4" /></Button>
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
