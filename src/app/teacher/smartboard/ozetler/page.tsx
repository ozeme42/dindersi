
      
'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Book, Library, Users, LayoutTemplate } from "lucide-react";
import { cn } from "@/lib/utils";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Course, Unit, Topic, SchoolClass } from "@/lib/types";
import { SelectionGrid } from "@/components/selection-grid";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/auth-context";

const steps = [
  { id: 1, name: "Sınıf", icon: <Users className="h-5 w-5" /> },
  { id: 2, name: "Ders", icon: <Book className="h-5 w-5" /> },
  { id: 3, name: "Ünite", icon: <Library className="h-5 w-5" /> },
];

export default function OzetlerSetupPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  
  const [selection, setSelection] = useState({
    classId: "",
    courseId: "",
    unitId: "",
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
        setCurrentStep(currentStep - 1);
    }
  };

  const handleSelectClass = (classId: string) => {
    setSelection(prev => ({ ...prev, classId, courseId: '', unitId: '' }));
    const firstClassId = classes.length > 0 ? classes[0].id : null;
    const isFirstClass = classId === firstClassId;
    const applicableCourses = allCourses.filter(course => course.isSummerSchool !== true && (course.classId === classId || (!course.classId && isFirstClass)));
    setCourses(applicableCourses);
    setUnits([]);
    handleNext();
  };

  const handleSelectCourse = async (courseId: string) => {
    setSelection(prev => ({ ...prev, courseId, unitId: '' }));
    setIsLoading(true);
    const unitsRef = collection(db, `courses/${courseId}/units`);
    const q = query(unitsRef, orderBy("title"));
    const unitsSnapshot = await getDocs(q);
    setUnits(unitsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Unit)));
    setIsLoading(false);
    handleNext();
  };
  
  const handleSelectUnit = (unitId: string) => {
     router.push(`/teacher/smartboard/ozetler/goruntule?courseId=${selection.courseId}&unitId=${unitId}`);
  };
  
  const renderContent = () => {
    if (isLoading && currentStep > 1) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-rose-500"/></div>
    }
    
    switch(currentStep) {
        case 1:
            return <SelectionGrid items={classes} selectedId={selection.classId} onSelect={handleSelectClass} titleKey="name" isLoading={isLoading} />;
        case 2:
            return <SelectionGrid items={courses} selectedId={selection.courseId} onSelect={handleSelectCourse} titleKey="title" isLoading={isLoading} />;
        case 3:
            return <SelectionGrid items={units} selectedId={selection.unitId} onSelect={handleSelectUnit} disabled={!selection.courseId} titleKey="title" isLoading={isLoading} />;
        default:
            return null;
     }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center p-4 sm:p-6 md:p-8 relative overflow-hidden font-sans">
      <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-rose-900/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-900/20 rounded-full blur-[120px]" />
      </div>
      <div className="relative z-10 w-full max-w-5xl space-y-8 flex flex-col h-full flex-grow">
        <div className="text-center space-y-4 py-4">
            <div className="inline-flex items-center justify-center p-4 bg-rose-500/10 rounded-full mb-2 border border-rose-500/20 shadow-lg shadow-rose-500/10">
                <LayoutTemplate className="h-10 w-10 text-rose-400"/>
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-white drop-shadow-xl tracking-tight">ÖZETLER</h1>
            <p className="text-slate-400 text-lg font-medium">Konu anlatımını yansıtmak için seçim yapın.</p>
        </div>
        <div className="flex justify-center items-center px-4 w-full">
            <div className="relative flex items-center justify-between w-full max-w-3xl">
                <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-800 -z-10 rounded-full"></div>
                <div 
                    className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-rose-500 to-indigo-500 -z-10 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
                ></div>
                {steps.map((step) => {
                    const isActive = currentStep >= step.id;
                    const isCurrent = currentStep === step.id;
                    return (
                        <div key={step.id} className="flex flex-col items-center gap-3 group cursor-default">
                            <div className={cn(
                                "w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center border-4 transition-all duration-300 z-10 shadow-lg",
                                isCurrent 
                                    ? "bg-slate-900 border-rose-500 text-rose-400 scale-110 shadow-rose-500/50" 
                                    : isActive 
                                        ? "bg-indigo-600 border-indigo-600 text-white scale-100" 
                                        : "bg-slate-900 border-slate-700 text-slate-600"
                            )}>
                                {isActive && !isCurrent ? <Check className="w-6 h-6 stroke-[3]" /> : step.icon}
                            </div>
                            <span className={cn(
                                "text-xs md:text-sm font-bold transition-colors duration-300 absolute -bottom-8 whitespace-nowrap uppercase tracking-wider",
                                isCurrent ? "text-rose-400" : isActive ? "text-indigo-500" : "text-slate-600"
                            )}>{step.name}</span>
                        </div>
                    );
                })}
            </div>
        </div>
        <div className="mt-8 flex-grow flex flex-col">
             <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col flex-grow min-h-[500px]">
                <div className="p-6 md:p-8 border-b border-white/5 bg-slate-900/50 flex items-center justify-between">
                     <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 text-lg">
                            {currentStep}
                        </span>
                        {steps.find(s => s.id === currentStep)?.name} Seçimi
                     </h2>
                     {isLoading && currentStep > 1 && <Loader2 className="h-6 w-6 animate-spin text-rose-500" />}
                </div>
                <div className="flex-grow p-6 md:p-10 flex items-center justify-center bg-slate-950/30 overflow-y-auto">
                     {renderContent()}
                </div>
                <div className="p-6 md:p-8 border-t border-white/5 bg-slate-900/50 flex justify-between items-center">
                    {currentStep === 1 ? (
                        <Button asChild variant="ghost" className="text-slate-400 hover:text-white hover:bg-white/10 h-14 px-8 rounded-xl text-lg">
                            <Link href="/teacher/smartboard"><ArrowLeft className="mr-2 h-5 w-5" /> Menüye Dön</Link>
                        </Button>
                    ) : (
                        <Button variant="outline" onClick={handleBack} className="border-white/10 text-slate-300 hover:text-white hover:bg-white/5 h-14 px-8 rounded-xl text-lg bg-transparent">
                            <ArrowLeft className="mr-2 h-5 w-5" /> Geri
                        </Button>
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}

    