

"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Book, Library, ListTodo, PartyPopper, BrainCircuit } from "lucide-react";
import { cn } from "@/lib/utils";
import { collection, getDocs, query, orderBy, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Course, Unit, Topic, UserProfile, SchoolClass } from "@/lib/types";
import { useAuth } from "@/context/auth-context";
import { SelectionGrid } from "@/components/selection-grid";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { QUESTION_TYPES, DIFFICULTY_LEVELS } from "@/lib/game-config";

const steps = [
  { id: 1, name: "Ders Seçimi", icon: <Book className="h-5 w-5" /> },
  { id: 2, name: "Ünite Seçimi", icon: <Library className="h-5 w-5" /> },
  { id: 3, name: "Konu Seçimi", icon: <ListTodo className="h-5 w-5" /> },
  { id: 4, name: "Onay", icon: <Check className="h-5 w-5" /> },
];

export function SoruCozSetupClientPage() {
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
    questionCount: 10,
    difficulty: ['Kolay', 'Orta'],
    questionTypes: ['mcq'],
  });

  const { toast } = useToast();


  useEffect(() => {
    const fetchCourses = async () => {
      if (!user) {
        setIsLoading(true);
        return;
      }
      setIsLoading(true);
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
            const studentVisibleCourses = allCourses.filter(c => !c.isTeacherOnly);
            const studentClass = allClasses.find(c => studentClassName && c.name === studentClassName);
            const studentClassId = studentClass?.id;
            const firstClassId = allClasses.length > 0 ? allClasses[0].id : null;
            
            if (studentClassId) {
                const isFirstClass = studentClassId === firstClassId;
                finalCourses = studentVisibleCourses.filter(course =>
                    course.classId === studentClassId || (isFirstClass && !course.classId)
                );
            } else {
                finalCourses = studentVisibleCourses.filter(course => !course.classId);
            }
        }
        setCourses(finalCourses);
      } catch (error) {
        console.error("Error fetching filtered courses:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCourses();
  }, [user]);

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
      setCurrentStep(4);
      return;
    }
    setIsLoading(true);
    const topicsRef = collection(db, `courses/${selection.courseId}/units/${unitId}/topics`);
    const q = query(topicsRef, orderBy("title"));
    const topicsSnapshot = await getDocs(q);
    setTopics(topicsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Topic)));
    setIsLoading(false);
    setCurrentStep(3);
  };
  
  const handleSelectTopic = (topicId: string, topicName: string) => {
    setSelection({ ...selection, topicId, topicName });
    setCurrentStep(4);
  };
  
  const handleDifficultyChange = (level: string) => {
    setSettings(prev => {
        const current = prev.difficulty;
        if(current.includes(level)) {
            return {...prev, difficulty: current.filter(d => d !== level)};
        }
        return {...prev, difficulty: [...current, level]};
    });
  }

  const handleQuestionTypeChange = (type: string) => {
      setSettings(prev => {
        const current = prev.questionTypes;
        if(current.includes(type)) {
            return {...prev, questionTypes: current.filter(t => t !== type)};
        }
        return {...prev, questionTypes: [...current, type]};
    });
  }

  const handleNext = () => currentStep < steps.length && setCurrentStep(currentStep + 1);
  const handleBack = () => currentStep > 1 && setCurrentStep(currentStep - 1);
  
  const getGameUrl = () => {
    if(settings.difficulty.length === 0 || settings.questionTypes.length === 0) {
        toast({title: "Eksik Seçim", description: "Lütfen en az bir zorluk seviyesi ve soru tipi seçin.", variant: "destructive"});
        return "#";
    }
    const params = new URLSearchParams({
      courseId: selection.courseId,
      courseName: selection.courseName,
      unitId: selection.unitId,
      unitName: selection.unitName,
      topicId: selection.topicId,
      topicName: selection.topicName,
      questionCount: settings.questionCount.toString(),
      difficulty: settings.difficulty.join(','),
      questionTypes: settings.questionTypes.join(','),
    });
    return `/student/soru-coz/coz?${params.toString()}`;
  }
  
  const renderContent = () => {
      switch(currentStep) {
          case 1:
            return <SelectionGrid items={courses} selectedId={selection.courseId} onSelect={(id, name) => handleSelectCourse(id, name)} isLoading={isLoading} subtitleKey={user?.role === 'teacher' || user?.role === 'superadmin' ? 'className' : undefined}/>;
          case 2:
            return <SelectionGrid items={units} selectedId={selection.unitId} onSelect={(id, name) => handleSelectUnit(id, name)} specialOptions={[{ id: 'all', name: 'Tüm Üniteler' }]} disabled={!selection.courseId} isLoading={isLoading}/>;
          case 3:
            return <SelectionGrid items={topics} selectedId={selection.topicId} onSelect={(id, name) => handleSelectTopic(id, name)} specialOptions={[{ id: 'all', name: 'Tüm Konular' }]} disabled={!selection.unitId || selection.unitId === 'all'} isLoading={isLoading}/>;
          case 4:
            return (
              <div className="w-full max-w-lg space-y-8">
                 <div className="space-y-4 text-center sm:text-left">
                     <h3 className="text-xl font-semibold font-headline text-center mb-4">Alıştırma Özeti</h3>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                        <p><strong>Ders:</strong></p><p>{selection.courseName}</p>
                        <p><strong>Ünite:</strong></p><p>{selection.unitName}</p>
                        <p><strong>Konu:</strong></p><p>{selection.topicName}</p>
                     </div>
                 </div>
                 <div className="space-y-6">
                    <div>
                        <Label htmlFor="question-count-slider" className="flex justify-between"><span>Soru Sayısı:</span><span>{settings.questionCount}</span></Label>
                        <Slider id="question-count-slider" value={[settings.questionCount]} max={20} min={5} step={1} onValueChange={(val) => setSettings(prev => ({...prev, questionCount: val[0]}))} />
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Zorluk Seviyeleri</Label>
                            <div className="space-y-2 mt-2">
                                {DIFFICULTY_LEVELS.map(level => (
                                    <div key={level} className="flex items-center space-x-2">
                                        <Checkbox id={`diff-${level}`} checked={settings.difficulty.includes(level)} onCheckedChange={() => handleDifficultyChange(level)}/>
                                        <Label htmlFor={`diff-${level}`} className="font-normal">{level}</Label>
                                    </div>
                                ))}
                            </div>
                        </div>
                         <div>
                            <Label>Soru Tipleri</Label>
                             <div className="space-y-2 mt-2">
                                {QUESTION_TYPES.map(type => (
                                    <div key={type.id} className="flex items-center space-x-2">
                                        <Checkbox id={`type-${type.id}`} checked={settings.questionTypes.includes(type.id)} onCheckedChange={() => handleQuestionTypeChange(type.id)}/>
                                        <Label htmlFor={`type-${type.id}`} className="font-normal">{type.name}</Label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
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
          <h1 className="text-3xl font-bold font-headline flex items-center justify-center gap-2">
            <BrainCircuit className="h-8 w-8 text-blue-500"/>
            Soru Çöz
          </h1>
          <p className="text-muted-foreground">İstediğin konu ve zorlukta sorularla kendini sına.</p>
        </div>

        <div className="flex justify-center items-center mb-8 px-4">
          <ol className="flex items-center w-full max-w-lg">
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
          <CardContent className="min-h-[250px] flex items-center justify-center">
            {renderContent()}
          </CardContent>
          <CardFooter className="flex justify-between pt-6">
            {currentStep === 1 ? (
                <Button asChild variant="outline">
                    <Link href="/student"><ArrowLeft className="mr-2 h-4 w-4" /> Geri Dön</Link>
                </Button>
            ) : (
                <Button variant="outline" onClick={handleBack}><ArrowLeft className="mr-2 h-4 w-4" /> Geri</Button>
            )}

            {currentStep < steps.length ? (
              <Button onClick={handleNext} disabled={
                (currentStep === 1 && !selection.courseId) ||
                (currentStep === 2 && !selection.unitId) ||
                (currentStep === 3 && !selection.topicId)
              }>İleri <ArrowRight className="ml-2 h-4 w-4" /></Button>
            ) : (
              <Button asChild className="bg-green-600 hover:bg-green-700 text-white">
                <Link href={getGameUrl()}>
                    <PartyPopper className="mr-2 h-4 w-4" /> Alıştırmayı Başlat
                </Link>
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
