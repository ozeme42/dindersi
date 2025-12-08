'use client';

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
  { id: 1, name: "Sınıf", icon: <Users className="h-5 w-5" /> },
  { id: 2, name: "Ders", icon: <Book className="h-5 w-5" /> },
  { id: 3, name: "Ünite", icon: <Library className="h-5 w-5" /> },
  { id: 4, name: "Konu", icon: <ListTodo className="h-5 w-5" /> },
  { id: 5, name: "Başlat", icon: <Check className="h-5 w-5" /> },
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
      if(isLoading) return <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-purple-400"/></div>

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
              <div className="w-full max-w-4xl mx-auto space-y-8">
                 
                 {/* Özet Kartı */}
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5 flex flex-col items-center justify-center text-center">
                         <span className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-1">Sınıf</span>
                         <span className="text-xl font-bold text-white">{selection.className}</span>
                     </div>
                     <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5 flex flex-col items-center justify-center text-center">
                         <span className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-1">Ders</span>
                         <span className="text-xl font-bold text-white">{selection.courseName}</span>
                     </div>
                     <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5 flex flex-col items-center justify-center text-center">
                         <span className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-1">Konu</span>
                         <span className="text-xl font-bold text-white">{selection.topicName}</span>
                     </div>
                 </div>

                {/* Başlatma Seçenekleri */}
                <div className="pt-8 border-t border-white/10">
                    <h3 className="text-2xl font-bold text-center text-white mb-6 flex items-center justify-center gap-3">
                        <PartyPopper className="text-yellow-400 h-8 w-8"/> Takım Sayısını Seç ve Başla
                    </h3>
                    
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Tek Kişilik Mod */}
                        <Link href={getGameUrl(1)} className="group block h-full">
                            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-8 rounded-3xl h-full flex flex-col items-center justify-center text-center shadow-lg transform transition-all duration-300 group-hover:scale-105 group-hover:shadow-indigo-500/30 border border-white/10">
                                <Users className="h-16 w-16 text-white mb-4 opacity-80 group-hover:opacity-100 transition-opacity"/>
                                <h4 className="text-3xl font-black text-white uppercase tracking-wide">Tek Kişi</h4>
                                <p className="text-indigo-200 mt-2 text-sm font-medium">Bireysel meydan okuma</p>
                            </div>
                        </Link>

                        {/* Takım Modları */}
                        <div className="grid grid-cols-1 gap-3 h-full">
                            <Link href={getGameUrl(2)} className="block group">
                                <div className="bg-slate-800 hover:bg-rose-600 p-4 rounded-2xl flex items-center justify-between px-6 transition-all border border-white/5 group-hover:border-rose-400/50">
                                    <span className="text-xl font-bold text-white">2 Takım</span>
                                    <Users className="h-6 w-6 text-slate-400 group-hover:text-white"/>
                                </div>
                            </Link>
                             <Link href={getGameUrl(3)} className="block group">
                                <div className="bg-slate-800 hover:bg-blue-600 p-4 rounded-2xl flex items-center justify-between px-6 transition-all border border-white/5 group-hover:border-blue-400/50">
                                    <span className="text-xl font-bold text-white">3 Takım</span>
                                    <Users className="h-6 w-6 text-slate-400 group-hover:text-white"/>
                                </div>
                            </Link>
                             <Link href={getGameUrl(4)} className="block group">
                                <div className="bg-slate-800 hover:bg-green-600 p-4 rounded-2xl flex items-center justify-between px-6 transition-all border border-white/5 group-hover:border-green-400/50">
                                    <span className="text-xl font-bold text-white">4 Takım</span>
                                    <Users className="h-6 w-6 text-slate-400 group-hover:text-white"/>
                                </div>
                            </Link>
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center p-4 sm:p-6 md:p-8 relative overflow-hidden font-sans">
      
       {/* Arka Plan Efektleri */}
       <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-purple-900/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-900/20 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-6xl space-y-8 flex flex-col h-full flex-grow">
        
        {/* Başlık Alanı */}
        <div className="text-center space-y-4 py-4">
            <div className="inline-flex items-center justify-center p-4 bg-indigo-500/10 rounded-full mb-2 border border-indigo-500/20 shadow-lg shadow-indigo-500/10">
                <Package className="h-10 w-10 text-indigo-400"/>
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-white drop-shadow-xl tracking-tight">
                KUTU AÇ
            </h1>
            <p className="text-slate-400 text-lg font-medium">Sürprizlerle dolu bir yarışma için ayarları yapın.</p>
        </div>

        {/* Stepper (Adım Göstergesi) */}
        <div className="flex justify-center items-center px-4 w-full">
            <div className="relative flex items-center justify-between w-full max-w-4xl">
                {/* Bağlantı Çizgisi */}
                <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-800 -z-10 rounded-full"></div>
                <div 
                    className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500 -z-10 rounded-full transition-all duration-500 ease-out"
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
                                    ? "bg-slate-900 border-indigo-500 text-indigo-400 scale-110 shadow-indigo-500/50" 
                                    : isCompleted 
                                        ? "bg-purple-600 border-purple-600 text-white scale-100" 
                                        : "bg-slate-900 border-slate-800 text-slate-600"
                            )}>
                                {isCompleted ? <Check className="w-6 h-6 stroke-[3]" /> : step.icon}
                            </div>
                            <span className={cn(
                                "text-xs md:text-sm font-bold transition-colors duration-300 absolute -bottom-8 whitespace-nowrap uppercase tracking-wider",
                                isActive ? "text-indigo-400" : isCompleted ? "text-purple-500" : "text-slate-600"
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
                        <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-lg">
                            {currentStep}
                        </span>
                        {steps.find(s => s.id === currentStep)?.name} Seçimi
                     </h2>
                     {isLoading && <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />}
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
                            className="bg-indigo-600 hover:bg-indigo-500 text-white h-14 px-8 rounded-xl text-lg shadow-lg shadow-indigo-900/20 transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
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