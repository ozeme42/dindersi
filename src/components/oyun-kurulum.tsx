'use client';

import React, { useState, useEffect, useCallback } from "react";
import { 
    ArrowLeft, ArrowRight, Check, Book, Library, ListTodo, 
    Sparkles, Loader2, Gamepad2, Users, ChevronRight, RefreshCcw
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { getCurriculumForSelection, type EnrichedCourse } from '@/components/actions/get-curriculum-for-selection';

// --- TİP TANIMLARI ---
type Topic = { id: string; title: string; hasOzetContent?: boolean; hasYazilacaklarContent?: boolean; };
type Unit = { id: string; title: string; topics: Topic[]; hasUnitOzet?: boolean };
type Course = EnrichedCourse;
type ClassGroup = { name: string; courses: Course[] };

const ICONS = [Book, Sparkles, Book, Gamepad2];
const getGradient = (index: number) => {
    const gradients = [
        "from-blue-600 to-cyan-500",
        "from-violet-600 to-purple-500",
        "from-emerald-600 to-teal-500",
        "from-rose-600 to-pink-500",
        "from-amber-600 to-orange-500"
    ];
    return gradients[index % gradients.length];
};

// --- UI COMPONENTS ---

const GlassPanel = ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <div className={cn(
        "backdrop-blur-xl bg-[#0f172a]/80 border border-white/10 rounded-2xl shadow-2xl relative overflow-hidden",
        className
    )}>
         {/* Dekoratif üst çizgi */}
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>
        {children}
    </div>
);

const SelectionCard = ({ 
    title, 
    subtitle, 
    icon: Icon, 
    onClick, 
    delay = 0, 
    color = "from-slate-700 to-slate-800",
    isActive = false
}: { 
    title: string, 
    subtitle?: string, 
    icon: any, 
    onClick: () => void, 
    delay?: number,
    color?: string,
    isActive?: boolean
}) => (
    <button 
        onClick={onClick}
        className={cn(
            "group relative w-full overflow-hidden rounded-2xl p-[1px] transition-all duration-300 text-left h-full",
            "hover:scale-[1.02] hover:-translate-y-1 hover:shadow-2xl hover:shadow-cyan-500/10",
            "animate-in slide-in-from-bottom-4 fade-in fill-mode-forwards"
        )}
        style={{ animationDelay: `${delay}ms` }}
    >
        {/* Arkaplan Gradyanı (Border Effect) */}
        <div className={cn(
            "absolute inset-0 opacity-40 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br", 
            color
        )}></div>
        
        {/* Kart İçeriği */}
        <div className="relative h-full bg-[#1e293b] rounded-[15px] p-4 md:p-6 flex flex-row items-center gap-4 border border-white/5 group-hover:bg-[#1e293b]/95 transition-colors">
            
            {/* İkon Kutusu */}
            <div className={cn(
                "h-12 w-12 md:h-16 md:w-16 rounded-xl flex items-center justify-center shadow-lg shrink-0 bg-gradient-to-br text-white transition-transform group-hover:scale-110 duration-300 border border-white/10",
                color
            )}>
                <Icon className="h-6 w-6 md:h-8 md:w-8 drop-shadow-md" />
            </div>
            
            {/* Metin Alanı */}
            <div className="flex-grow min-w-0 flex flex-col justify-center">
                {subtitle && (
                    <div className="inline-flex self-start items-center px-2 py-0.5 rounded-full bg-white/5 border border-white/10 mb-1.5">
                        <span className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider">{subtitle}</span>
                    </div>
                )}
                <h3 className="font-bold text-slate-100 text-base md:text-lg lg:text-xl leading-snug group-hover:text-white transition-colors">
                    {title}
                </h3>
            </div>
            
            {/* Sağ Ok */}
            <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-cyan-500 group-hover:text-white transition-all shrink-0 ml-2">
                <ArrowRight className="h-4 w-4 md:h-5 md:w-5 text-slate-500 group-hover:text-white" />
            </div>
        </div>
    </button>
);

// --- SIDEBAR STEPPER COMPONENT (Masaüstü İçin Yeni) ---
const SidebarStepper = ({ 
    currentStep, 
    steps, 
    selection, 
    onJumpToStep 
}: { 
    currentStep: number, 
    steps: any[], 
    selection: any, 
    onJumpToStep: (step: number) => void 
}) => {
    return (
        <div className="flex flex-col gap-6 py-4">
            {steps.map((step) => {
                const isCompleted = currentStep > step.id;
                const isCurrent = currentStep === step.id;
                const isPending = currentStep < step.id;

                let label = step.name;
                let subLabel = "Seçim Bekleniyor";
                let activeColor = "text-slate-500";
                let borderColor = "border-slate-700 bg-slate-900";

                // Adım durumuna göre içerik belirleme
                if (step.id === 1) { // Sınıf
                    if (selection.className) subLabel = selection.className;
                } else if (step.id === 2) { // Ders
                    if (selection.courseName) subLabel = selection.courseName;
                } else if (step.id === 3) { // Ünite
                    if (selection.unitName) subLabel = selection.unitName;
                } else if (step.id === 4) { // Konu
                     if (selection.topicName) subLabel = selection.topicName;
                }

                if (isCompleted) {
                    activeColor = "text-cyan-400";
                    borderColor = "border-cyan-500 bg-cyan-500/20 text-cyan-400";
                } else if (isCurrent) {
                    activeColor = "text-white";
                    borderColor = "border-blue-500 bg-blue-600 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]";
                    subLabel = "Seçim Yapılıyor...";
                }

                return (
                    <div key={step.id} className={cn("relative flex gap-4 group", !isPending && "cursor-pointer")} onClick={() => !isPending && onJumpToStep(step.id)}>
                        {/* Dikey Çizgi */}
                        {step.id !== steps.length && (
                            <div className={cn(
                                "absolute left-[19px] top-10 bottom-[-24px] w-[2px] transition-colors duration-500",
                                isCompleted ? "bg-cyan-500/50" : "bg-slate-800"
                            )} />
                        )}

                        {/* Yuvarlak İkon */}
                        <div className={cn(
                            "relative z-10 w-10 h-10 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-300",
                            borderColor
                        )}>
                            {isCompleted ? <Check className="w-5 h-5" /> : <step.icon className="w-5 h-5" />}
                        </div>

                        {/* Metinler */}
                        <div className="flex flex-col pt-1">
                            <span className={cn("text-xs font-bold uppercase tracking-wider transition-colors", activeColor)}>
                                {label}
                            </span>
                            <span className={cn(
                                "text-sm font-medium transition-colors line-clamp-1",
                                isCompleted ? "text-slate-200" : isCurrent ? "text-white animate-pulse" : "text-slate-600"
                            )}>
                                {subLabel}
                            </span>
                        </div>
                        
                        {/* Geri Dön İpucu (Hover) */}
                        {isCompleted && (
                            <div className="absolute right-0 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <RefreshCcw className="w-4 h-4 text-slate-400" />
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

// --- MAIN PAGE COMPONENT ---
const steps = [
  { id: 1, name: "Sınıf Seviyesi", icon: Users },
  { id: 2, name: "Ders Seçimi", icon: Book },
  { id: 3, name: "Ünite Seçimi", icon: Library },
  { id: 4, name: "Konu Seçimi", icon: ListTodo },
];

type OyunKurulumProps = {
    pageTitle?: string;
    gameName?: string;
    gamePath?: string;
    gameIcon?: React.ElementType;
    targetPath?: string;
    dataType: 'games' | 'yazilacaklar' | 'ozetler';
    isStatic?: boolean;
}

export function OyunKurulum({ pageTitle, gameName, gamePath, gameIcon: PageIcon = Gamepad2, targetPath, dataType, isStatic = false }: OyunKurulumProps) {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  
  const [allClassGroups, setAllClassGroups] = useState<ClassGroup[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);

  const finalGameName = gameName || searchParams.get('gameName') || pageTitle || "Etkinlik Kurulumu";
  const finalGamePath = gamePath || searchParams.get('gamePath') || "";

  const [selection, setSelection] = useState({
    className: "",
    courseId: "",
    courseName: "",
    courseColor: "from-slate-700 to-slate-800", 
    unitId: "",
    unitName: "",
    topicName: ""
  });

  // Veri Çekme (Değişmedi, aynı mantık)
  const fetchManifest = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!isStatic && !user) {
        setIsLoading(false);
        return;
      }
      const res = await getCurriculumForSelection(dataType, isStatic, user?.uid);
      if (res.error) throw new Error(res.error);

      const enrichedClassGroups = (res.classGroups || []).map((group: any, groupIndex: number) => ({
          ...group,
          courses: group.courses.map((course: any, courseIndex: number) => ({
              ...course,
              icon: ICONS[courseIndex % ICONS.length],
              color: getGradient(courseIndex),
              className: group.name,
          }))
      }));
      setAllClassGroups(enrichedClassGroups);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [user, dataType, isStatic]);

  useEffect(() => {
      fetchManifest();
  }, [fetchManifest]);

  // --- HANDLERS ---
  const handleJumpToStep = (stepId: number) => {
      if (stepId < currentStep) {
          setCurrentStep(stepId);
          // İleri adımların seçimlerini sıfırlamak isteyebiliriz ama
          // UX açısından veriyi tutmak daha iyidir, sadece adımı değiştiriyoruz.
      }
  };

  const handleSelectClass = (group: ClassGroup) => {
    setSelection({ 
        ...selection, 
        className: formatGroupName(group.name), 
        courseId: '', courseName: '', unitId: '', unitName: '', topicName: ''
    });
    setCourses(group.courses);
    setCurrentStep(2);
  };

  const handleSelectCourse = (course: Course) => {
    setSelection({ 
        ...selection, 
        courseId: course.id, 
        courseName: course.title, 
        courseColor: course.color || "from-slate-700 to-slate-800",
        unitId: '', unitName: '', topicName: ''
    });
    
    setIsLoading(true);
    setTimeout(() => {
        setUnits(course.units || []);
        setIsLoading(false);
        setCurrentStep(3);
    }, 300);
  };

  const handleSelectUnit = (unitId: string, unitName: string) => {
    setSelection({ ...selection, unitId, unitName, topicName: '' });
    
    // Oyunlar için "Tüm Üniteler" seçimi
    const gamePathFromUrl = finalGamePath;
    if (dataType === 'games' && unitId === 'all' && gamePathFromUrl) {
        const params = new URLSearchParams({
            gameName: finalGameName, gamePath: gamePathFromUrl, courseId: selection.courseId, courseName: selection.courseName,
            unitId: 'all', unitName: 'Tüm Üniteler', topicId: 'all', topicName: 'Tüm Konular', isStatic: String(isStatic),
        });
        router.push(`/oyunlar/${gamePathFromUrl}/oyun?${params.toString()}`);
        return;
    }
    
    // Özetler için üniteye git
     if (dataType === 'ozetler' && unitId !== 'all') {
         const selectedUnit = units.find(u => u.id === unitId);
         if (selectedUnit && selectedUnit.hasUnitOzet) {
            const urlPath = isStatic ? `ozetler` : `student/ozetler`;
            router.push(`/${urlPath}/${selection.courseId}/${unitId}`);
            return;
         }
    }

    setIsLoading(true);
    setTimeout(() => {
        const selectedUnit = units.find(u => u.id === unitId);
        const availableTopics = (selectedUnit?.topics || []).filter(topic => {
            if (dataType === 'yazilacaklar') return topic.hasYazilacaklarContent;
            if (dataType === 'ozetler') return topic.hasOzetContent;
            return true;
        });
        setTopics(availableTopics);
        setIsLoading(false);
        setCurrentStep(4);
    }, 300);
  };
  
  const handleSelectTopic = (topicId: string, topicName: string) => {
      setSelection({...selection, topicName});
      let url = '';
      const gamePathFromUrl = finalGamePath;
      
      if (dataType === 'games' && gamePathFromUrl) {
          const params = new URLSearchParams({
            gameName: finalGameName, gamePath: gamePathFromUrl, courseId: selection.courseId, courseName: selection.courseName,
            unitId: selection.unitId, unitName: selection.unitName, topicId: topicId, topicName: topicName, isStatic: String(isStatic),
          });
          url = `/oyunlar/${gamePathFromUrl}/oyun?${params.toString()}`;
      } else {
          const urlPath = isStatic ? `${dataType}` : `student/${dataType}`;
          url = `/${urlPath}/${selection.courseId}/${selection.unitId}/${topicId}`;
      }
      router.push(url);
  };

  const formatGroupName = (name: string) => !isNaN(parseInt(name)) ? `${name}. Sınıf` : name;

  // --- RENDER HELPERS ---
  const gridClass = "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 md:gap-6";

  const renderContent = () => {
      if (isLoading) {
          return (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-6 animate-pulse">
                  <div className="relative">
                    <Loader2 className="h-16 w-16 text-cyan-400 animate-spin" />
                    <div className="absolute inset-0 bg-cyan-400/20 blur-xl rounded-full"></div>
                  </div>
                  <p className="text-xl font-medium text-cyan-200">İçerikler Yükleniyor...</p>
              </div>
          );
      }
      
      switch(currentStep) {
          case 1: // Sınıf
            return (
                <div className={gridClass}>
                    {allClassGroups.length > 0 ? allClassGroups.map((group, idx) => (
                        <SelectionCard 
                            key={group.name}
                            title={formatGroupName(group.name)}
                            subtitle="Sınıf Seviyesi"
                            icon={Users}
                            color={getGradient(idx)}
                            onClick={() => handleSelectClass(group)}
                            delay={idx * 50}
                        />
                    )) : <p className="col-span-full text-center text-slate-500 py-10">Müfredat içeriği bulunamadı.</p>}
                </div>
            );
          case 2: // Ders
            return (
                <div className={gridClass}>
                    {courses.map((course, idx) => (
                        <SelectionCard 
                            key={course.id}
                            title={course.title}
                            subtitle={selection.className}
                            icon={course.icon || Book}
                            color={course.color || getGradient(idx)}
                            onClick={() => handleSelectCourse(course)}
                            delay={idx * 50}
                        />
                    ))}
                </div>
            );
          case 3: // Ünite
            return (
                <div className={gridClass}>
                    {dataType === 'games' && (
                        <SelectionCard 
                            key="all-units"
                            title="Tüm Üniteler (Karma)"
                            subtitle="Genel Tekrar"
                            icon={Sparkles}
                            color="from-yellow-600 to-amber-500"
                            onClick={() => handleSelectUnit('all', 'Tüm Üniteler')}
                        />
                    )}
                    {units.map((unit, idx) => (
                        <SelectionCard 
                            key={unit.id}
                            title={unit.title}
                            subtitle={selection.courseName}
                            icon={Library}
                            color={selection.courseColor}
                            onClick={() => handleSelectUnit(unit.id, unit.title)}
                            delay={(idx + 1) * 50}
                        />
                    ))}
                </div>
            );
          case 4: // Konu
            return (
                <div className={gridClass}>
                    {dataType === 'games' && (
                          <SelectionCard 
                            key="all-topics"
                            title="Tüm Konular (Karma)"
                            subtitle="Ünite Özeti"
                            icon={Sparkles}
                            color="from-yellow-600 to-amber-500"
                            onClick={() => handleSelectTopic('all', 'Tüm Konular')}
                        />
                    )}
                    {topics.map((topic, idx) => (
                        <SelectionCard 
                            key={topic.id}
                            title={topic.title}
                            subtitle={selection.unitName}
                            icon={ListTodo}
                            color={selection.courseColor}
                            onClick={() => handleSelectTopic(topic.id, topic.title)}
                            delay={(idx + 1) * 50}
                        />
                    ))}
                </div>
            );
          default:
            return null;
      }
  }

  return (
    <div className="min-h-screen bg-[#0f172a] bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-slate-900 via-[#0f172a] to-black font-sans text-white pb-10">
        
        {/* --- NAVBAR --- */}
        <div className="sticky top-0 z-50 backdrop-blur-md bg-[#0f172a]/80 border-b border-white/5 shadow-lg">
            <div className="max-w-[1600px] mx-auto px-4 md:px-8 h-20 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/oyunlar" className="p-2 md:p-2.5 bg-slate-800/50 hover:bg-slate-700 rounded-xl border border-white/10 transition-all group">
                        <ArrowLeft className="h-5 w-5 text-slate-400 group-hover:text-white transition-colors" />
                    </Link>
                    <div className="h-8 w-[1px] bg-white/10 hidden md:block"></div>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-lg border border-blue-500/20 hidden md:block">
                            <PageIcon className="h-6 w-6 text-blue-400" />
                        </div>
                        <div>
                            <h1 className="text-lg md:text-xl font-bold text-slate-100 leading-none mb-1">{finalGameName}</h1>
                            <p className="text-xs text-slate-400 font-medium">İçerik Seçim Sihirbazı</p>
                        </div>
                    </div>
                </div>
                
                {/* Mobile Step Indicator (Sadece mobilde görünür) */}
                <div className="md:hidden px-3 py-1 bg-slate-800 rounded-full text-xs font-bold text-cyan-400 border border-slate-700">
                    Adım {currentStep}/4
                </div>
            </div>
        </div>

        <div className="max-w-[1600px] mx-auto px-4 md:px-8 mt-6 md:mt-10">
            <div className="flex flex-col lg:flex-row gap-8 items-start">
                
                {/* --- LEFT SIDEBAR (Masaüstü) --- */}
                <div className="hidden lg:block w-80 shrink-0 sticky top-28">
                    <GlassPanel className="p-6">
                        <div className="mb-6">
                            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">İlerleme Durumu</h2>
                            <div className="h-1 w-12 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"></div>
                        </div>
                        
                        <SidebarStepper 
                            currentStep={currentStep} 
                            steps={steps} 
                            selection={selection}
                            onJumpToStep={handleJumpToStep}
                        />

                        <div className="mt-8 pt-6 border-t border-white/5 text-center">
                            <p className="text-xs text-slate-500 leading-relaxed">
                                Seçiminizi değiştirmek için listedeki <br/> önceki adımlara tıklayabilirsiniz.
                            </p>
                        </div>
                    </GlassPanel>
                </div>

                {/* --- MAIN CONTENT AREA --- */}
                <div className="flex-grow w-full">
                    {/* Üstteki İlerleme Çubuğu (Sadece Mobil/Tablet) */}
                    <div className="lg:hidden mb-8">
                         <div className="relative flex justify-between items-center px-2">
                            <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-800 -z-10 rounded-full"></div>
                            <div 
                                className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-600 shadow-[0_0_10px_#3b82f6] -z-10 rounded-full transition-all duration-500"
                                style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
                            ></div>
                            {steps.map((step) => {
                                const isActive = currentStep >= step.id;
                                return (
                                    <div key={step.id} className={cn("w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 shadow-xl", isActive ? "bg-blue-600 border-blue-400 text-white scale-110" : "bg-slate-900 border-slate-700 text-slate-600")}>
                                        {isActive && currentStep > step.id ? <Check className="h-4 w-4" /> : <span className="text-xs font-bold">{step.id}</span>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* İçerik Başlığı */}
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
                                {steps[currentStep-1].name}
                                <span className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold rounded-full uppercase tracking-wider hidden md:inline-block">
                                    Seçim Yap
                                </span>
                            </h2>
                            <p className="text-slate-400 mt-2 text-sm md:text-base">
                                {currentStep === 1 && "Başlamak için öğrencinin sınıf seviyesini seçin."}
                                {currentStep === 2 && `${selection.className} düzeyi için çalışılacak dersi belirleyin.`}
                                {currentStep === 3 && `${selection.courseName} dersi içerisinden bir ünite seçin.`}
                                {currentStep === 4 && `${selection.unitName} ünitesinden odaklanılacak konuyu seçin.`}
                            </p>
                        </div>
                        
                        {/* Geri Butonu (İçerik Alanında) */}
                        {currentStep > 1 && (
                             <button 
                                onClick={() => setCurrentStep(currentStep - 1)}
                                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors text-sm font-medium border border-white/10"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                <span className="hidden md:inline">Geri Dön</span>
                            </button>
                        )}
                    </div>

                    {/* Ana Grid */}
                    <div className="min-h-[50vh]">
                        {renderContent()}
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
}