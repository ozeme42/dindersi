
'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Book, Library, ListTodo, Users, LayoutTemplate } from "lucide-react";
import { cn } from "@/lib/utils";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Course, Unit, Topic, SchoolClass } from "@/lib/types";
import { SelectionGrid } from "@/components/selection-grid";
import { Loader2 } from "lucide-react";

const steps = [
  { id: 1, name: "Sınıf Seçimi", icon: <Users className="h-5 w-5" /> },
  { id: 2, name: "Ders Seçimi", icon: <Book className="h-5 w-5" /> },
  { id: 3, name: "Ünite Seçimi", icon: <Library className="h-5 w-5" /> },
  { id: 4, name: "İçerik Seçimi", icon: <LayoutTemplate className="h-5 w-5" /> },
];

type EnrichedUnit = Unit & { topics: Topic[] };
type EnrichedCourse = Course & { units: EnrichedUnit[] };

export default function OzetlerSetupPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const router = useRouter();

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [courses, setCourses] = useState<EnrichedCourse[]>([]);
  const [units, setUnits] = useState<EnrichedUnit[]>([]);
  
  const [selection, setSelection] = useState({
    classId: "",
    courseId: "",
    unitId: "",
  });

   const [selectionNames, setSelectionNames] = useState({
    className: '',
    courseName: '',
    unitName: '',
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
        setClasses(classesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolClass)));
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
        if (currentStep === 2) setSelection(s => ({...s, classId: ''}));
        if (currentStep === 3) setSelection(s => ({...s, courseId: ''}));
        if (currentStep === 4) setSelection(s => ({...s, unitId: ''}));
        setCurrentStep(currentStep - 1);
    }
  };

  const handleSelectClass = (classId: string, className: string) => {
    setSelection({ ...selection, classId, courseId: '', unitId: '' });
    setSelectionNames({ ...selectionNames, className, courseName: '', unitName: '' });
    
    const firstClassId = classes.length > 0 ? classes[0].id : null;
    const isFirstClass = classId === firstClassId;
    const applicableCourses = allCourses.filter(course => course.isSummerSchool !== true && (course.classId === classId || (!course.classId && isFirstClass)));
    setCourses(applicableCourses as EnrichedCourse[]);
    setUnits([]);
    handleNext();
  };

  const handleSelectCourse = async (courseId: string, courseName: string) => {
    setSelection(prev => ({ ...prev, courseId, unitId: '' }));
    setSelectionNames(prev => ({ ...prev, courseName, unitName: '' }));
    setIsDataLoading(true);
    const unitsRef = collection(db, `courses/${courseId}/units`);
    const q = query(unitsRef, orderBy("title"));
    const unitsSnapshot = await getDocs(q);
    
    const unitsWithTopics = await Promise.all(unitsSnapshot.docs.map(async (unitDoc) => {
        const topicsSnap = await getDocs(query(collection(db, `courses/${courseId}/units/${unitDoc.id}/topics`), orderBy('title')));
        return { 
            id: unitDoc.id, 
            ...unitDoc.data(),
            topics: topicsSnap.docs.map(d => ({id: d.id, ...d.data()}) as Topic)
        } as EnrichedUnit
    }));
    
    setUnits(unitsWithTopics.filter(u => (u.isPublished ?? true) && (u.htmlContent || u.topics.some(t => (t.isPublished ?? true) && t.htmlContent))));

    setIsDataLoading(false);
    handleNext();
  };

  const handleSelectUnit = (unitId: string, unitName: string) => {
    setSelection(prev => ({ ...prev, unitId }));
    setSelectionNames(prev => ({ ...prev, unitName }));
    handleNext();
  };
  
  const handleSelectContent = (type: 'unit' | 'topic', id: string) => {
      const courseIdParam = selection.courseId;
      const unitIdParam = selection.unitId;

      if (type === 'unit') {
          router.push(`/teacher/smartboard/ozetler/goruntule/${courseIdParam}/${id}`);
      } else { // topic
          router.push(`/teacher/smartboard/ozetler/goruntule/${courseIdParam}/${unitIdParam}/${id}`);
      }
  }

  const renderContent = () => {
    if (isLoading && currentStep > 1) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-rose-500"/></div>
    }
     if (isDataLoading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-rose-500"/></div>
    }
    
    switch(currentStep) {
        case 1:
            return <SelectionGrid items={classes} selectedId={selection.classId} onSelect={handleSelectClass} titleKey="name" isLoading={isLoading} />;
        case 2:
            return <SelectionGrid items={courses} selectedId={selection.courseId} onSelect={handleSelectCourse} titleKey="title" isLoading={isLoading}/>;
        case 3:
            return <SelectionGrid items={units} selectedId={selection.unitId} onSelect={handleSelectUnit} disabled={!selection.courseId} titleKey="title" isLoading={isLoading}/>;
        case 4:
            const selectedUnit = units.find(u => u.id === selection.unitId);
            const contentTopics = selectedUnit?.topics.filter(t => t.htmlContent && (t.isPublished ?? true)) || [];
            return (
                <div className="w-full max-w-4xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {selectedUnit?.htmlContent && (
                            <Button
                                onClick={() => handleSelectContent('unit', selectedUnit.id)}
                                className="h-40 text-lg flex flex-col gap-2 bg-rose-600 hover:bg-rose-500 border-b-8 border-rose-800 active:border-b-0 active:translate-y-2 transition-all shadow-lg"
                            >
                                <LayoutTemplate className="h-8 w-8"/>
                                <span>{selectedUnit.title} (Ünite Özeti)</span>
                            </Button>
                        )}
                        {contentTopics.map(topic => (
                             <Button
                                key={topic.id}
                                onClick={() => handleSelectContent('topic', topic.id)}
                                className="h-40 text-lg flex flex-col gap-2 bg-slate-700 hover:bg-slate-600 border-b-8 border-slate-900 active:border-b-0 active:translate-y-2 transition-all shadow-lg"
                            >
                                <Book className="h-8 w-8"/>
                                <span className="line-clamp-3">{topic.title}</span>
                            </Button>
                        ))}
                    </div>
                </div>
            );
        default:
            return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center p-4 sm:p-6 md:p-8 relative overflow-hidden">
      
      {/* Arka Plan Efektleri */}
      <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-rose-900/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-900/20 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-5xl space-y-8">
        
        {/* Başlık Alanı */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-indigo-500 drop-shadow-sm">
            Özet Sunum Modu
          </h1>
          <p className="text-slate-400 text-lg">İçeriği tahtada göstermek için seçim yapın.</p>
        </div>

        {/* Stepper (Adım Göstergesi) */}
        <div className="flex justify-center items-center px-4 w-full">
            <div className="relative flex items-center justify-between w-full max-w-3xl">
                {/* Bağlantı Çizgisi */}
                <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-800 -z-10 rounded-full"></div>
                <div 
                    className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-rose-500 to-indigo-500 -z-10 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
                ></div>

                {steps.map((step, index) => {
                    const isActive = currentStep >= step.id;
                    const isCurrent = currentStep === step.id;
                    
                    return (
                        <div key={step.id} className="flex flex-col items-center gap-2 group cursor-default">
                            <div className={cn(
                                "w-10 h-10 md:w-14 md:h-14 rounded-full flex items-center justify-center border-2 md:border-4 transition-all duration-500 z-10 font-black text-xs md:text-xl shadow-lg",
                                isCurrent 
                                    ? "bg-slate-900 border-rose-500 text-rose-400 scale-125 shadow-rose-500/50" 
                                    : isActive 
                                        ? "bg-indigo-600 border-indigo-600 text-white scale-110" 
                                        : "bg-slate-900 border-slate-700 text-slate-600"
                            )}>
                                {isActive && !isCurrent ? <Check className="w-6 h-6" /> : step.id}
                            </div>
                            <span className={cn(
                                "text-[9px] md:text-sm font-bold transition-colors duration-300 absolute -bottom-8 whitespace-nowrap",
                                isCurrent ? "text-rose-400" : isActive ? "text-indigo-500" : "text-slate-600"
                            )}>
                                {step.name}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>

        {/* Ana İçerik Kartı */}
        <div className="mt-12">
            <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden min-h-[500px] flex flex-col">
                <div className="p-6 border-b border-white/5 bg-slate-900/80 flex items-center justify-between">
                     <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
                            {currentStep}
                        </span>
                        {steps.find(s => s.id === currentStep)?.name}
                     </h2>
                     <div className="h-2 w-2 rounded-full bg-rose-500 animate-pulse shadow-[0_0_10px_#f43f5e]"></div>
                </div>

                <div className="flex-grow p-8 flex items-center justify-center bg-slate-950/30">
                     {renderContent()}
                </div>

                <div className="p-6 border-t border-white/5 bg-slate-900/80 flex justify-between items-center">
                    {currentStep === 1 ? (
                        <Button asChild variant="ghost" className="text-slate-400 hover:text-white hover:bg-white/10 h-12 px-6 rounded-xl">
                            <Link href="/teacher/smartboard"><ArrowLeft className="mr-2 h-4 w-4" /> Akıllı Tahtaya Dön</Link>
                        </Button>
                    ) : (
                        <Button 
                            variant="outline" 
                            onClick={handleBack}
                            className="border-white/10 text-slate-300 hover:text-white hover:bg-white/5 h-12 px-6 rounded-xl"
                        >
                            <ArrowLeft className="mr-2 h-4 w-4" /> Geri
                        </Button>
                    )}
                </div>
            </div>
        </div>

      </div>
    </div>
  );
}
