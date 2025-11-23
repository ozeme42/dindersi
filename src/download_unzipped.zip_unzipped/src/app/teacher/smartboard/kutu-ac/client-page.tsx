
"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Book, Library, ListTodo, PartyPopper, Package, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Course, Unit, Topic, SchoolClass } from "@/lib/types";
import { useAuth } from "@/context/auth-context";
import { SelectionGrid } from "@/components/selection-grid";
import { Loader2 } from "lucide-react";

const steps = [
  { id: 1, name: "Sınıf Seçimi", icon: <Users className="h-5 w-5" /> },
  { id: 2, name: "Ders Seçimi", icon: <Book className="h-5 w-5" /> },
  { id: 3, name: "Ünite Seçimi", icon: <Library className="h-5 w-5" /> },
  { id: 4, name: "Konu Seçimi", icon: <ListTodo className="h-5 w-5" /> },
  { id: 5, name: "Onay", icon: <Check className="h-5 w-5" /> },
];

export function SmartboardBireyselClientPage({ gameConfig }: { gameConfig: any }) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  
  const [allClasses, setAllClasses] = useState<SchoolClass[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  
  const [courses, setCourses] = useState<Course[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  
  const [selection, setSelection] = useState({
    classId: "",
    className: "",
    courseId: "",
    courseName: "",
    unitId: "",
    unitName: "",
    topicId: "",
    topicName: "",
  });

  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        const [coursesSnapshot, classesSnapshot] = await Promise.all([
          getDocs(query(collection(db, "courses"), orderBy("title"))),
          getDocs(query(collection(db, "classes"), orderBy("createdAt", "asc")))
        ]);
        setAllCourses(coursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course)));
        setAllClasses(classesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolClass)));
      } catch (error) {
        console.error("Error fetching initial data: ", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  const handleSelectClass = async (classId: string, className: string) => {
    setSelection(prev => ({ ...prev, classId, className, courseId: '', courseName: '', unitId: '', unitName: '', topicId: '' }));
    
    const firstClassId = allClasses.length > 0 ? allClasses[0].id : null;
    const isFirstClass = classId === firstClassId;
    const applicableCourses = allCourses.filter(course => course.classId === classId || (!course.classId && isFirstClass));
    setCourses(applicableCourses);
    setUnits([]);
    setTopics([]);
    handleNext();
  };

  const handleSelectCourse = async (courseId: string, courseName: string) => {
    setSelection(prev => ({ ...prev, courseId, courseName, unitId: '', unitName: '', topicId: '', topicName: '' }));
    setIsLoading(true);
    const unitsRef = collection(db, `courses/${courseId}/units`);
    const q = query(unitsRef, orderBy("title"));
    const unitsSnapshot = await getDocs(q);
    setUnits(unitsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Unit)));
    setTopics([]);
    setIsLoading(false);
    handleNext();
  };

  const handleSelectUnit = async (unitId: string, unitName: string) => {
    setSelection(prev => ({ ...prev, unitId, unitName, topicId: '', topicName: '' }));
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
    handleNext();
  };
  
  const handleSelectTopic = (topicId: string, topicName: string) => {
    setSelection(prev => ({...prev, topicId, topicName}));
    handleNext();
  };

  const handleNext = () => currentStep < steps.length && setCurrentStep(currentStep + 1);
  const handleBack = () => {
    if (currentStep > 1) {
        if (currentStep === 2) setSelection(s => ({...s, classId: '', className: ''}));
        if (currentStep === 3) setSelection(s => ({...s, courseId: '', courseName: ''}));
        if (currentStep === 4) setSelection(s => ({...s, unitId: '', unitName: ''}));
        if (currentStep === 5) setSelection(s => ({...s, topicId: '', topicName: ''}));
        setCurrentStep(currentStep - 1);
    }
  };

  const getGameUrl = (teamCount: number) => {
    const params = new URLSearchParams({
      courseId: selection.courseId,
      courseName: selection.courseName,
      unitId: selection.unitId,
      unitName: selection.unitName,
      topicId: selection.topicId,
      topicName: selection.topicName,
      classId: selection.classId,
      className: selection.className,
      teamCount: teamCount.toString(),
    });
    return `/teacher/smartboard/kutu-ac/oyun?${params.toString()}`;
  }
  
  const renderContent = () => {
      if(isLoading) return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin"/></div>

      switch(currentStep) {
          case 1:
            return <SelectionGrid items={allClasses} selectedId={selection.classId} onSelect={handleSelectClass} titleKey="name" isLoading={isLoading} />;
          case 2:
            return <SelectionGrid items={courses} selectedId={selection.courseId} onSelect={handleSelectCourse} titleKey="title" isLoading={isLoading}/>;
          case 3:
            return <SelectionGrid items={units} selectedId={selection.unitId} onSelect={handleSelectUnit} specialOptions={[{ id: 'all', name: 'Tüm Üniteler' }]} disabled={!selection.courseId} titleKey="title" isLoading={isLoading}/>;
          case 4:
            return <SelectionGrid items={topics} selectedId={selection.topicId} onSelect={handleSelectTopic} specialOptions={[{ id: 'all', name: 'Tüm Konular' }]} disabled={!selection.unitId || selection.unitId === 'all'} titleKey="title" isLoading={isLoading}/>;
          case 5:
            return (
              <div className="space-y-8 text-center w-full max-w-lg">
                 <div>
                    <h3 className="text-xl font-semibold font-headline text-center mb-4">Oyun Özeti</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-left">
                        <p><strong>Sınıf:</strong></p><p>{selection.className}</p>
                        <p><strong>Ders:</strong></p><p>{selection.courseName}</p>
                        <p><strong>Konu:</strong></p><p>{selection.topicName}</p>
                    </div>
                </div>
                <div className="space-y-4 pt-8 border-t">
                    <h3 className="text-xl font-semibold font-headline">Takım Sayısını Seçerek Oyunu Başlatın</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Button asChild size="lg" className="h-28 text-lg flex-col gap-2">
                           <Link href={getGameUrl(1)}>
                               Tek Kişi
                           </Link>
                        </Button>
                        <div className="space-y-2">
                            <Button asChild size="lg" className="h-12 w-full text-lg bg-rose-600 hover:bg-rose-700">
                               <Link href={getGameUrl(2)}>
                                   <Users className="h-5 w-5 mr-2"/> 2 Takım
                               </Link>
                            </Button>
                            <Button asChild size="lg" className="h-12 w-full text-lg bg-blue-600 hover:bg-blue-700">
                               <Link href={getGameUrl(3)}>
                                   <Users className="h-5 w-5 mr-2"/> 3 Takım
                               </Link>
                            </Button>
                             <Button asChild size="lg" className="h-12 w-full text-lg bg-green-600 hover:bg-green-700">
                               <Link href={getGameUrl(4)}>
                                   <Users className="h-5 w-5 mr-2"/> 4 Takım
                               </Link>
                            </Button>
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
            <Package className="h-8 w-8 text-indigo-500"/>
            Kutu Aç Kurulumu (Akıllı Tahta)
          </h1>
          <p className="text-muted-foreground">Oyunu başlatmak için adımları takip edin.</p>
        </div>

        <div className="flex justify-center items-center mb-8 px-4">
          <ol className="flex items-center w-full max-w-xl">
            {steps.map((step) => (
              <li key={step.id} className={cn("flex w-full items-center", { "after:content-[''] after:w-full after:h-1 after:border-b after:border-border after:border-2 after:inline-block": step.id !== steps.length })}>
                <span className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full lg:h-12 lg:w-12 shrink-0 transition-colors duration-300",
                  currentStep > step.id ? "bg-primary text-primary-foreground" :
                  currentStep === step.id ? "bg-accent text-accent-foreground scale-110" :
                  "bg-muted text-muted-foreground")}>{step.icon}</span>
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
                    <Link href="/teacher/smartboard"><ArrowLeft className="mr-2 h-4 w-4" /> Geri Dön</Link>
                </Button>
            ) : (
                <Button variant="outline" onClick={handleBack}><ArrowLeft className="mr-2 h-4 w-4" /> Geri</Button>
            )}

            {currentStep < steps.length -1 && (
              <Button onClick={handleNext} disabled={
                (currentStep === 1 && !selection.classId) || 
                (currentStep === 2 && !selection.courseId) ||
                (currentStep === 3 && !selection.unitId) ||
                (currentStep === 4 && !selection.topicId)
              }>İleri <ArrowRight className="mr-2 h-4 w-4" /></Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
