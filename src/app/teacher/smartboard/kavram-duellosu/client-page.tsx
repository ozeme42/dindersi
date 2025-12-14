
'use client';

import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Book, Library, ListTodo, Swords, Loader2, Trophy, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Course, Unit, Topic, SchoolClass } from "@/lib/types";
import { SelectionGrid } from "@/components/selection-grid";

const steps = [
  { id: 1, name: "Sınıf", icon: <Users className="h-5 w-5" /> },
  { id: 2, name: "Ders", icon: <Book className="h-5 w-5" /> },
  { id: 3, name: "Ünite", icon: <Library className="h-5 w-5" /> },
  { id: 4, name: "Konu", icon: <ListTodo className="h-5 w-5" /> },
  { id: 5, name: "Başlat", icon: <Check className="h-5 w-5" /> },
];

export function SmartboardKavramDuellosuClientPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(false);
  
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

  const handleSelectClass = (classId: string, className: string) => {
    setSelection(prev => ({ ...prev, classId, className, courseId: '', courseName: '', unitId: '', unitName: '', topicId: '' }));
    
    const firstClassId = allClasses.length > 0 ? allClasses[0].id : null;
    const isFirstClass = classId === firstClassId;
    const applicableCourses = allCourses.filter(course => course.isSummerSchool !== true && (course.classId === classId || (!course.classId && isFirstClass)));
    setCourses(applicableCourses);
    setUnits([]);
    setTopics([]);
    
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

  const getGameUrl = () => {
    const params = new URLSearchParams({
        courseId: selection.courseId,
        unitId: selection.unitId,
        topicId: selection.topicId,
    });
    return `/teacher/smartboard/kavram-duellosu/oyun?${params.toString()}`;
  }

  const renderContent = () => {
    if (isLoading && currentStep > 0) return <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-fuchsia-500"/></div>
    
    const loadingProp = isDataLoading;

    switch(currentStep) {
        case 1: return <SelectionGrid items={allClasses} onSelect={handleSelectClass} selectedId={selection.classId} titleKey="name" isLoading={isLoading} />;
        case 2: return <SelectionGrid items={courses} selectedId={selection.courseId} onSelect={handleSelectCourse} titleKey="title" isLoading={loadingProp} />
        case 3: return <SelectionGrid items={units} selectedId={selection.unitId} onSelect={handleSelectUnit} specialOptions={[{ id: 'all', name: 'Tüm Üniteler' }]} disabled={!selection.courseId} titleKey="title" isLoading={loadingProp} />
        case 4: return <SelectionGrid items={topics} selectedId={selection.topicId} onSelect={handleSelectTopic} specialOptions={[{ id: 'all', name: 'Tüm Konular' }]} disabled={!selection.unitId || selection.unitId === 'all'} titleKey="title" isLoading={loadingProp} />
        case 5:
            return (
                <div className="w-full max-w-lg mx-auto">
                    <Card className="bg-slate-900 border-white/10 overflow-hidden shadow-2xl">
                        <div className="bg-gradient-to-r from-red-600 to-blue-600 p-1"></div>
                        <CardHeader className="text-center pb-2">
                             <Trophy className="h-12 w-12 text-yellow-400 mx-auto mb-2 drop-shadow-md"/>
                             <CardTitle className="text-2xl text-white">Düello Özeti</CardTitle>
                             <CardDescription className="text-slate-400">Her şey hazır, mücadele başlasın!</CardDescription>
                        </CardHeader>
                         <CardContent className="space-y-6 pt-4">
                             <div className="space-y-2 text-sm text-slate-300">
                                 <div className="flex justify-between border-b border-white/5 pb-2"><span>Ders:</span> <span className="text-white font-medium">{selection.courseName}</span></div>
                                 <div className="flex justify-between border-b border-white/5 pb-2"><span>Ünite:</span> <span className="text-white font-medium">{selection.unitName}</span></div>
                                 <div className="flex justify-between"><span>Konu:</span> <span className="text-white font-medium">{selection.topicName}</span></div>
                             </div>
                        </CardContent>
                         <CardFooter>
                            <Button asChild className="w-full h-16 text-xl font-bold bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 shadow-[0_0_20px_rgba(220,38,38,0.4)]">
                                <Link href={getGameUrl()}>
                                    <Swords className="mr-3 h-6 w-6"/> Düelloyu Başlat
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
            <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-red-900/10 rounded-full blur-[150px]" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-900/10 rounded-full blur-[150px]" />
        </div>

        <div className="max-w-5xl mx-auto w-full relative z-10 flex-grow flex flex-col">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-black font-headline text-white tracking-tight uppercase drop-shadow-lg">Kavram Düellosu Kurulumu</h1>
                <p className="text-slate-400 mt-1">Konu seçimi yapın ve mücadeleyi başlatın.</p>
            </div>
        
            {/* Stepper */}
            <div className="flex justify-center items-center mb-8 px-4">
                <div className="relative flex items-center justify-between w-full max-w-4xl">
                    <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-800 -z-10 rounded-full"></div>
                    <div 
                        className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-red-500 to-blue-500 -z-10 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
                    ></div>

                    {steps.map((step) => {
                        const isActive = currentStep === step.id;
                        const isCompleted = currentStep > step.id;
                        return (
                            <div key={step.id} className="flex flex-col items-center gap-3 group cursor-default">
                                <div className={cn(
                                    "w-10 h-10 rounded-full flex items-center justify-center border-4 transition-all duration-300 z-10 shadow-lg",
                                    isActive 
                                        ? "bg-slate-900 border-rose-500 text-rose-400 scale-110 shadow-rose-500/50" 
                                        : isCompleted 
                                            ? "bg-blue-600 border-blue-600 text-white scale-100" 
                                            : "bg-slate-900 border-slate-800 text-slate-600"
                                )}>
                                    {isCompleted ? <Check className="w-5 h-5 stroke-[3]" /> : step.icon}
                                </div>
                                <span className={cn("text-[10px] font-bold uppercase tracking-wider hidden sm:block", isActive ? "text-rose-400" : "text-slate-600")}>{step.name}</span>
                            </div>
                        )
                    })}
                </div>
            </div>

            <Card className="bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-2xl flex-grow flex flex-col overflow-hidden">
                <CardHeader className="border-b border-white/5 pb-4">
                    <CardTitle className="text-xl text-white">{steps.find(s => s.id === currentStep)?.name} Seçimi</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow flex justify-center items-start p-6 overflow-y-auto min-h-[400px]">
                    {renderContent()}
                </CardContent>
                <CardFooter className="flex justify-between p-6 border-t border-white/5 bg-slate-900/50">
                    {currentStep === 1 ? (
                        <Button asChild variant="ghost" className="text-slate-400 hover:text-white hover:bg-white/10">
                            <Link href="/teacher/smartboard"><ArrowLeft className="mr-2 h-4 w-4" /> Geri Dön</Link>
                        </Button>
                    ) : (
                        <Button variant="ghost" onClick={handleBack} className="text-slate-400 hover:text-white hover:bg-white/10"><ArrowLeft className="mr-2 h-4 w-4" /> Geri</Button>
                    )}
                    
                    {currentStep < steps.length && (
                        <Button onClick={handleNext} disabled={
                            (currentStep === 1 && !selection.classId) || 
                            (currentStep === 2 && !selection.courseId) ||
                            (currentStep === 3 && !selection.unitId) ||
                            (currentStep === 4 && !selection.topicId)
                        } className="bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/20 px-8">
                            İleri <ArrowRight className="ml-2 h-4 w-4" />
                        </Button> 
                    )}
                </CardFooter>
            </Card>
        </div>
    </div>
  );
}
