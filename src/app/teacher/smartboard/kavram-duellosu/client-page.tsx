'use client';

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Book, Library, ListTodo, Swords, Users, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Course, Unit, Topic, SchoolClass } from "@/lib/types";
import { useAuth } from "@/context/auth-context";
import { SelectionGrid } from "@/components/selection-grid";
import { useToast } from "@/hooks/use-toast";

const steps = [
  { id: 1, name: "Sınıf", icon: <Users className="h-5 w-5" /> },
  { id: 2, name: "Ders", icon: <Book className="h-5 w-5" /> },
  { id: 3, name: "Ünite", icon: <Library className="h-5 w-5" /> },
  { id: 4, name: "Konu", icon: <ListTodo className="h-5 w-5" /> },
  { id: 5, name: "Başlat", icon: <Check className="h-5 w-5" /> },
];

export function SmartboardDuelloSetupClientPage({ gameConfig }: { gameConfig: any }) {
  const { user } = useAuth();
  const { toast } = useToast();
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
        toast({ title: "Hata", description: "Veriler getirilirken bir sorun oluştu.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, [toast]);

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
  
  const handleSelectClass = async (classId: string, className: string) => {
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
        courseName: selection.courseName,
        unitId: selection.unitId,
        unitName: selection.unitName,
        topicId: selection.topicId,
        topicName: selection.topicName,
        p1Name: "1. Savaşçı",
        p2Name: "2. Savaşçı",
    });
    return `/teacher/smartboard/kavram-duellosu/oyun?${params.toString()}`;
  }

  const renderContent = () => {
    if (isLoading && currentStep > 0) return <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-orange-500"/></div>
    
    const loadingProp = isDataLoading;

    switch(currentStep) {
        case 1:
            return <SelectionGrid items={allClasses} selectedId={selection.classId} onSelect={handleSelectClass} titleKey="name" isLoading={isLoading} />;
        case 2:
            return <SelectionGrid items={courses} selectedId={selection.courseId} onSelect={handleSelectCourse} titleKey="title" isLoading={loadingProp} />
        case 3:
            return <SelectionGrid items={units} selectedId={selection.unitId} onSelect={handleSelectUnit} specialOptions={[{ id: 'all', name: 'Tüm Üniteler' }]} disabled={!selection.courseId} titleKey="title" isLoading={loadingProp} />
        case 4:
            return <SelectionGrid items={topics} selectedId={selection.topicId} onSelect={handleSelectTopic} specialOptions={[{ id: 'all', name: 'Tüm Konular' }]} disabled={!selection.unitId || selection.unitId === 'all'} titleKey="title" isLoading={loadingProp} />
        case 5:
            return (
              <div className="w-full max-w-4xl mx-auto space-y-8">
                 {/* Özet Kartı */}
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                     <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5 text-center">
                         <span className="text-xs text-slate-400 uppercase font-bold mb-1 block">Sınıf</span>
                         <span className="text-lg font-bold text-white">{selection.className}</span>
                     </div>
                     <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5 text-center">
                         <span className="text-xs text-slate-400 uppercase font-bold mb-1 block">Ders</span>
                         <span className="text-lg font-bold text-white truncate px-2">{selection.courseName}</span>
                     </div>
                     <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5 text-center lg:col-span-2">
                         <span className="text-xs text-slate-400 uppercase font-bold mb-1 block">Konu</span>
                         <span className="text-lg font-bold text-white truncate px-2">{selection.topicName}</span>
                     </div>
                 </div>

                 {/* Savaşçılar (Sabit İsimler) */}
                 <div className="flex items-center justify-center gap-8 py-4">
                     <div className="bg-gradient-to-br from-orange-900/40 to-slate-900/40 border-2 border-orange-500/50 rounded-2xl p-6 w-48 text-center relative overflow-hidden group">
                         <div className="absolute inset-0 bg-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                         <div className="bg-orange-500/20 p-3 rounded-full mb-3 mx-auto w-16 h-16 flex items-center justify-center border border-orange-500/30">
                              <Swords className="h-8 w-8 text-orange-400" />
                         </div>
                         <p className="font-black text-xl text-orange-400">1. SAVAŞÇI</p>
                     </div>
                     
                     <div className="text-4xl font-black text-white/20 italic">VS</div>

                     <div className="bg-gradient-to-bl from-red-900/40 to-slate-900/40 border-2 border-red-500/50 rounded-2xl p-6 w-48 text-center relative overflow-hidden group">
                         <div className="absolute inset-0 bg-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                         <div className="bg-red-500/20 p-3 rounded-full mb-3 mx-auto w-16 h-16 flex items-center justify-center border border-red-500/30">
                              <Swords className="h-8 w-8 text-red-400 transform scale-x-[-1]" />
                         </div>
                         <p className="font-black text-xl text-red-400">2. SAVAŞÇI</p>
                     </div>
                 </div>

                 <div className="pt-4 flex justify-center">
                      <Button asChild size="lg" className="w-full md:w-2/3 h-20 text-2xl font-black bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white shadow-[0_0_40px_rgba(234,88,12,0.4)] rounded-2xl transition-all hover:scale-105 active:scale-95 group">
                        <Link href={getGameUrl()}>
                            <Swords className="mr-4 h-8 w-8 group-hover:rotate-12 transition-transform" /> DÜELLOYU BAŞLAT
                        </Link>
                      </Button>
                 </div>
              </div>
            );
        default: return null;
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center p-4 sm:p-6 md:p-8 relative overflow-hidden font-sans">
      
       {/* Arka Plan Efektleri */}
       <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-orange-900/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-red-900/20 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-6xl space-y-8 flex flex-col h-full flex-grow">
        
        {/* Başlık Alanı */}
        <div className="text-center space-y-4 py-4">
            <div className="inline-flex items-center justify-center p-4 bg-orange-500/10 rounded-full mb-2 border border-orange-500/20 shadow-lg shadow-orange-500/10">
                <Swords className="h-10 w-10 text-orange-400"/>
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-white drop-shadow-xl tracking-tight">
                KAVRAM DÜELLOSU
            </h1>
            <p className="text-slate-400 text-lg font-medium">Birebir bilgi savaşı için arenayı hazırla.</p>
        </div>

        {/* Stepper */}
        <div className="flex justify-center items-center px-4 w-full">
            <div className="relative flex items-center justify-between w-full max-w-4xl">
                <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-800 -z-10 rounded-full"></div>
                <div 
                    className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-orange-500 to-red-500 -z-10 rounded-full transition-all duration-500 ease-out"
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
                                    ? "bg-slate-900 border-orange-500 text-orange-400 scale-110 shadow-orange-500/50" 
                                    : isCompleted 
                                        ? "bg-red-600 border-red-600 text-white scale-100" 
                                        : "bg-slate-900 border-slate-800 text-slate-600"
                            )}>
                                {isCompleted ? <Check className="w-6 h-6 stroke-[3]" /> : step.icon}
                            </div>
                            <span className={cn(
                                "text-xs md:text-sm font-bold transition-colors duration-300 absolute -bottom-8 whitespace-nowrap uppercase tracking-wider",
                                isActive ? "text-orange-400" : isCompleted ? "text-red-500" : "text-slate-600"
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
                        <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30 text-lg">
                            {currentStep}
                        </span>
                        {steps.find(s => s.id === currentStep)?.name}
                     </h2>
                     {isLoading && <Loader2 className="h-6 w-6 animate-spin text-orange-500" />}
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
                                (currentStep === 4 && !selection.topicId)
                            }
                            className="bg-orange-600 hover:bg-orange-500 text-white h-14 px-8 rounded-xl text-lg shadow-lg shadow-orange-900/20 transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
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