"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, Book, Library, ListTodo, PartyPopper, Lightbulb, Loader2, Sparkles, Target, ChevronRight, BrainCircuit } from "lucide-react";
import { cn } from "@/lib/utils";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Course, Unit, Topic, SchoolClass } from "@/lib/types";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";

// --- Özel Kart Bileşeni (Selection Item) ---
const SelectionCard = ({ 
    title, 
    subtitle, 
    isSelected, 
    onClick, 
    icon: Icon 
}: { 
    title: string, 
    subtitle?: string, 
    isSelected: boolean, 
    onClick: () => void, 
    icon: any 
}) => (
    <button
        onClick={onClick}
        className={cn(
            "relative w-full group overflow-hidden rounded-2xl border p-4 transition-all duration-300 text-left flex items-center gap-4",
            isSelected 
                ? "bg-amber-500/10 border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.15)]" 
                : "bg-slate-900/50 border-white/5 hover:bg-slate-800 hover:border-white/10 hover:scale-[1.02]"
        )}
    >
        {/* Seçiliyken arkadaki hafif parıltı */}
        {isSelected && <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-transparent opacity-50" />}
        
        <div className={cn(
            "flex items-center justify-center w-12 h-12 rounded-xl transition-colors",
            isSelected ? "bg-amber-500 text-slate-950" : "bg-slate-800 text-slate-400 group-hover:bg-slate-700 group-hover:text-amber-400"
        )}>
            <Icon className="w-6 h-6" />
        </div>
        
        <div className="flex-grow min-w-0 z-10">
            <h3 className={cn("font-bold truncate text-sm sm:text-base", isSelected ? "text-amber-400" : "text-slate-200")}>
                {title}
            </h3>
            {subtitle && (
                <p className="text-xs text-slate-500 truncate mt-0.5">{subtitle}</p>
            )}
        </div>

        {isSelected && (
            <div className="bg-amber-500 rounded-full p-1 shadow-lg shadow-amber-500/50">
                <Check className="w-3 h-3 text-slate-950" />
            </div>
        )}
    </button>
);

const steps = [
  { id: 1, name: "Ders", icon: Book },
  { id: 2, name: "Ünite", icon: Library },
  { id: 3, name: "Konu", icon: ListTodo },
  { id: 4, name: "Başla", icon: BrainCircuit },
];

export function BilBakalimSetupClientPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
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

  useEffect(() => {
    const courseId = searchParams.get('courseId');
    if (courseId) {
        setSelection({
            courseId: searchParams.get('courseId') || "",
            courseName: searchParams.get('courseName') || "",
            unitId: searchParams.get('unitId') || "",
            unitName: searchParams.get('unitName') || "",
            topicId: searchParams.get('topicId') || "",
            topicName: searchParams.get('topicName') || "",
        });
        setCurrentStep(4);
        setIsLoading(false);
        return;
    }

    const fetchCourses = async () => {
      if (!user) { setIsLoading(true); return; }
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
                return { ...course, className: courseClass?.name || 'Genel' };
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
        console.error("Error", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCourses();
  }, [user, searchParams]);

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

  const handleNext = () => currentStep < steps.length && setCurrentStep(currentStep + 1);
  const handleBack = () => currentStep > 1 && setCurrentStep(currentStep - 1);
  
  const getGameUrl = () => {
    const params = new URLSearchParams({
      courseId: selection.courseId, courseName: selection.courseName,
      unitId: selection.unitId, unitName: selection.unitName,
      topicId: selection.topicId, topicName: selection.topicName,
    });
    return `/student/bil-bakalim/oyun?${params.toString()}`;
  }

  if (isLoading && currentStep === 1) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
             <Loader2 className="h-12 w-12 animate-spin text-amber-500" />
        </div>
      )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center py-8 px-4 selection:bg-amber-500/30">
      
      {/* Arkaplan Efektleri (Amber/Sarı Temalı) */}
      <div className="fixed inset-0 pointer-events-none transform-gpu">
            <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-amber-600/10 rounded-full blur-[100px]" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-orange-600/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative w-full max-w-4xl z-10 space-y-8">
        
        {/* Başlık Alanı */}
        <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center p-3 bg-amber-500/10 rounded-2xl mb-2 backdrop-blur-md border border-amber-500/20 shadow-lg shadow-amber-500/10">
                 <Lightbulb className="h-8 w-8 text-amber-400" />
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">
                 Bil <span className="text-amber-400">Bakalım</span>
            </h1>
            <p className="text-slate-400 text-sm md:text-base max-w-lg mx-auto">
                Tanımı verilen kavramları tahmin et, zihnini zorla ve puanları topla.
            </p>
        </div>

        {/* Stepper (İlerleme Barı) */}
        <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl border border-white/5 p-4 md:p-6">
            <div className="relative flex justify-between items-center px-2 md:px-8">
                {/* Bağlantı Çizgisi */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-800 -z-10 rounded-full">
                    <div 
                        className="h-full bg-gradient-to-r from-orange-600 to-amber-500 transition-all duration-500" 
                        style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
                    />
                </div>

                {steps.map((step) => {
                    const isActive = currentStep >= step.id;
                    const isCurrent = currentStep === step.id;
                    
                    return (
                        <div key={step.id} className="flex flex-col items-center gap-2">
                            <div className={cn(
                                "relative w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 shadow-xl",
                                isActive 
                                    ? "bg-slate-900 border-amber-500 text-amber-400 shadow-amber-500/20" 
                                    : "bg-slate-900 border-slate-700 text-slate-600",
                                isCurrent && "scale-110 ring-4 ring-amber-500/20"
                            )}>
                                <step.icon className="w-5 h-5 md:w-6 md:h-6" />
                                {isCurrent && (
                                    <span className="absolute inset-0 rounded-full animate-ping bg-amber-400/20" />
                                )}
                            </div>
                            <span className={cn(
                                "text-[10px] md:text-xs font-bold uppercase tracking-wider transition-colors absolute -bottom-6",
                                isActive ? "text-amber-400" : "text-slate-600"
                            )}>
                                {step.name}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>

        {/* Ana İçerik Alanı */}
        <div className="min-h-[400px] bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
            {/* Arkaplan Grid Deseni */}
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-5 pointer-events-none" />

            <div className="relative z-10 h-full flex flex-col">
                <div className="flex-grow">
                     {/* Yükleniyor Animasyonu */}
                     {isLoading ? (
                        <div className="h-64 flex flex-col items-center justify-center gap-4 text-amber-400">
                             <Loader2 className="h-10 w-10 animate-spin" />
                             <p className="text-sm font-mono animate-pulse">Konular Hazırlanıyor...</p>
                        </div>
                     ) : (
                        <>
                            {currentStep === 1 && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in zoom-in-95 duration-300">
                                    {courses.map((course) => (
                                        <SelectionCard 
                                            key={course.id}
                                            title={course.title}
                                            subtitle={(user?.role === 'teacher' || user?.role === 'superadmin') ? course.className : undefined}
                                            isSelected={selection.courseId === course.id}
                                            onClick={() => handleSelectCourse(course.id, course.title)}
                                            icon={Book}
                                        />
                                    ))}
                                    {courses.length === 0 && <p className="text-center text-slate-500 col-span-full py-10">Kayıtlı ders bulunamadı.</p>}
                                </div>
                            )}

                            {currentStep === 2 && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in slide-in-from-right-8 duration-300">
                                     <SelectionCard 
                                        title="Tüm Üniteler"
                                        subtitle="Karışık ünite testi"
                                        isSelected={selection.unitId === 'all'}
                                        onClick={() => handleSelectUnit('all', 'Tüm Üniteler')}
                                        icon={Sparkles}
                                    />
                                    {units.map((unit) => (
                                        <SelectionCard 
                                            key={unit.id}
                                            title={unit.title}
                                            isSelected={selection.unitId === unit.id}
                                            onClick={() => handleSelectUnit(unit.id, unit.title)}
                                            icon={Library}
                                        />
                                    ))}
                                    {units.length === 0 && <p className="text-center text-slate-500 col-span-full py-10">Bu derse ait ünite bulunamadı.</p>}
                                </div>
                            )}

                            {currentStep === 3 && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in slide-in-from-right-8 duration-300">
                                    <SelectionCard 
                                        title="Tüm Konular"
                                        subtitle="Genel tekrar yap"
                                        isSelected={selection.topicId === 'all'}
                                        onClick={() => handleSelectTopic('all', 'Tüm Konular')}
                                        icon={Sparkles}
                                    />
                                    {topics.map((topic) => (
                                        <SelectionCard 
                                            key={topic.id}
                                            title={topic.title}
                                            isSelected={selection.topicId === topic.id}
                                            onClick={() => handleSelectTopic(topic.id, topic.title)}
                                            icon={ListTodo}
                                        />
                                    ))}
                                     {topics.length === 0 && <p className="text-center text-slate-500 col-span-full py-10">Bu üniteye ait konu bulunamadı.</p>}
                                </div>
                            )}

                            {currentStep === 4 && (
                                <div className="flex flex-col items-center justify-center h-full animate-in zoom-in-95 duration-500">
                                    <div className="w-full max-w-md bg-slate-950/50 border border-amber-500/30 rounded-3xl p-8 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-16 bg-amber-500/10 rounded-full blur-3xl -translate-y-10 translate-x-10 group-hover:bg-amber-500/20 transition-colors" />
                                        
                                        <div className="text-center mb-6">
                                            <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-amber-500/20 mb-4 transform group-hover:rotate-3 transition-transform">
                                                <Target className="h-10 w-10 text-white" />
                                            </div>
                                            <h2 className="text-2xl font-bold text-white">Hazır mısın?</h2>
                                            <p className="text-slate-400 text-sm">Aşağıdaki seçimlerinle oyuna başlayacaksın.</p>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between p-3 bg-slate-900 rounded-xl border border-white/5">
                                                <span className="text-slate-500 text-sm">Ders</span>
                                                <span className="text-slate-200 font-medium">{selection.courseName}</span>
                                            </div>
                                            <div className="flex items-center justify-between p-3 bg-slate-900 rounded-xl border border-white/5">
                                                <span className="text-slate-500 text-sm">Ünite</span>
                                                <span className="text-slate-200 font-medium">{selection.unitName}</span>
                                            </div>
                                            <div className="flex items-center justify-between p-3 bg-slate-900 rounded-xl border border-white/5">
                                                <span className="text-slate-500 text-sm">Konu</span>
                                                <span className="text-amber-400 font-bold">{selection.topicName}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                     )}
                </div>

                {/* Alt Navigasyon Butonları */}
                <div className="flex justify-between items-center mt-8 pt-6 border-t border-white/5">
                    {currentStep > 1 ? (
                        <Button 
                            variant="ghost" 
                            onClick={handleBack}
                            className="text-slate-400 hover:text-white hover:bg-slate-800"
                        >
                            <ArrowLeft className="mr-2 h-4 w-4" /> Geri
                        </Button>
                    ) : (
                        <Button variant="ghost" asChild className="text-slate-400 hover:text-white hover:bg-slate-800">
                             <Link href="/student"><ArrowLeft className="mr-2 h-4 w-4" /> Ana Menü</Link>
                        </Button>
                    )}

                    {currentStep < steps.length ? (
                        <Button 
                            onClick={handleNext} 
                            disabled={
                                (currentStep === 1 && !selection.courseId) ||
                                (currentStep === 2 && !selection.unitId) ||
                                (currentStep === 3 && !selection.topicId)
                            }
                            className="bg-slate-100 text-slate-900 hover:bg-white hover:scale-105 transition-all font-bold px-8"
                        >
                            İleri <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                    ) : (
                        <Button 
                            asChild 
                            size="lg"
                            className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white border-0 shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-105 transition-all"
                        >
                            <Link href={getGameUrl()}>
                                <PartyPopper className="mr-2 h-5 w-5 animate-bounce" /> 
                                <span className="text-lg font-bold">BAŞLAT</span>
                            </Link>
                        </Button>
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}