'use client';

import React, { useState, useEffect, useCallback } from "react";
import { 
    ArrowLeft, ArrowRight, Check, Book, Library, ListTodo, 
    Sparkles, Loader2, Gamepad2, Search, XCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { getCurriculumForSelection, type ClassGroup as EnrichedClassGroup } from '@/components/actions/get-curriculum-for-selection';

// --- TİP TANIMLARI ---
type Topic = EnrichedClassGroup['courses'][0]['units'][0]['topics'][0];
type Unit = EnrichedClassGroup['courses'][0]['units'][0];
type Course = EnrichedClassGroup['courses'][0];

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
        "backdrop-blur-xl bg-[#0f172a]/80 border border-white/10 rounded-2xl md:rounded-[2.5rem] shadow-2xl overflow-hidden relative transition-all duration-300",
        className
    )}>
        {/* Dekoratif üst çizgi */}
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 opacity-50"></div>
        {children}
    </div>
);

const SearchInput = ({ value, onChange }: { value: string, onChange: (val: string) => void }) => (
    <div className="relative w-full max-w-md mx-auto mb-6 group">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl blur opacity-20 group-hover:opacity-40 transition-opacity duration-300"></div>
        <div className="relative bg-[#0f172a] border border-white/10 rounded-xl flex items-center px-4 py-3 shadow-xl">
            <Search className="h-5 w-5 text-slate-400 mr-3" />
            <input 
                type="text" 
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Listede ara..." 
                className="bg-transparent border-none outline-none text-white placeholder-slate-500 w-full text-sm md:text-base font-medium"
            />
            {value && (
                <button onClick={() => onChange('')} className="ml-2 hover:bg-white/10 p-1 rounded-full transition-colors">
                    <XCircle className="h-5 w-5 text-slate-400 hover:text-white" />
                </button>
            )}
        </div>
    </div>
);

const SelectionCard = ({ 
    title, 
    subtitle, 
    icon: Icon, 
    onClick, 
    delay = 0, 
    color = "from-slate-700 to-slate-800",
    isActive = false,
    hasContent = true,
}: { 
    title: string, 
    subtitle?: string, 
    icon: any, 
    onClick: () => void, 
    delay?: number,
    color?: string,
    isActive?: boolean,
    hasContent?: boolean
}) => (
    <button 
        onClick={onClick}
        disabled={!hasContent}
        className={cn(
            "group relative w-full overflow-hidden rounded-2xl p-[1px] transition-all duration-300 text-left h-full flex flex-col",
            hasContent ? "hover:scale-[1.02] hover:-translate-y-1 hover:shadow-2xl hover:shadow-cyan-500/10" : "opacity-40 cursor-not-allowed",
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
        <div className="relative h-full w-full bg-[#1e293b] rounded-[15px] p-4 md:p-5 flex items-center gap-4 border border-white/5 group-hover:bg-[#1e293b]/95 transition-colors">
            
            {/* İkon Kutusu */}
            <div className={cn(
                "h-12 w-12 md:h-14 md:w-14 rounded-xl flex items-center justify-center shadow-lg shrink-0 bg-gradient-to-br text-white transition-transform group-hover:scale-110 duration-300 border border-white/10",
                color
            )}>
                <Icon className="h-6 w-6 md:h-7 md:w-7 drop-shadow-md" />
            </div>
            
            {/* Metin Alanı */}
            <div className="flex-grow min-w-0 flex flex-col justify-center">
                {subtitle && (
                    <div className="inline-flex self-start items-center px-2 py-0.5 rounded-full bg-white/5 border border-white/10 mb-1.5">
                        <span className="text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate max-w-[150px]">{subtitle}</span>
                    </div>
                )}
                <h3 className="font-bold text-slate-100 text-sm md:text-base lg:text-lg leading-tight group-hover:text-white transition-colors line-clamp-2">
                    {title}
                </h3>
                 {!hasContent && <span className="text-[10px] text-red-400/70 font-semibold mt-1">İçerik Yok</span>}
            </div>
            
            {/* Sağ Ok - Masaüstünde hover ile belirginleşir */}
            <div className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-cyan-500 group-hover:text-white transition-all shrink-0 ml-auto opacity-50 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0">
                <ArrowRight className="h-4 w-4" />
            </div>
        </div>
    </button>
);

// --- MAIN PAGE COMPONENT ---
const steps = [
  { id: 1, name: "Ders Seçimi", icon: Book },
  { id: 2, name: "Ünite Seçimi", icon: Library },
  { id: 3, name: "Konu Seçimi", icon: ListTodo },
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
  
  const [allClassGroups, setAllClassGroups] = useState<EnrichedClassGroup[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  
  // Arama state'i
  const [searchQuery, setSearchQuery] = useState("");

  const finalGameName = gameName || searchParams.get('gameName') || pageTitle || "Etkinlik Kurulumu";
  const finalGamePath = gamePath || searchParams.get('gamePath') || "";

  const [selection, setSelection] = useState({
    courseId: "",
    courseName: "",
    courseColor: "from-slate-700 to-slate-800", 
    unitId: "",
    unitName: "",
    topicName: ""
  });

  const getBackUrl = () => {
    if (targetPath?.startsWith('student')) return '/student';
    if(targetPath === 'oyunlar') return '/oyunlar';
    return '/';
  };
  
  const handleBack = () => {
    if (currentStep > 1) {
        setCurrentStep(currentStep - 1);
        setSearchQuery(""); // Geri gidince aramayı temizle
    } else {
        router.push(getBackUrl());
    }
  };

  const fetchManifest = useCallback(async () => {
    setIsLoading(true);
    try {
      const isForStudent = !isStatic && !!user;
      const res = await getCurriculumForSelection(dataType, isStatic, isForStudent ? user?.uid : undefined);
      if (res.error) throw new Error(res.error);

      const classGroupsWithData = (res.classGroups || []).map((group, groupIndex) => ({
          ...group,
          courses: group.courses.map((course: any, courseIndex: number) => ({
              ...course,
              icon: ICONS[(groupIndex + courseIndex) % ICONS.length],
              color: getGradient(groupIndex + courseIndex),
              className: group.name,
          }))
      }));

      const allCourses = classGroupsWithData.flatMap(group => group.courses);
      
      setAllClassGroups(classGroupsWithData);
      setCourses(allCourses);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [user, dataType, isStatic]);

  useEffect(() => {
      fetchManifest();
  }, [fetchManifest]);

  const handleSelectCourse = (course: Course) => {
    setSelection({ 
        ...selection, 
        courseId: course.id, 
        courseName: course.title, 
        courseColor: (course as any).color || "from-slate-700 to-slate-800",
        unitId: '', unitName: '',
    });
    
    setIsLoading(true);
    setSearchQuery(""); // İleri gidince aramayı temizle
    setTimeout(() => {
        setUnits((course as any).units || []);
        setIsLoading(false);
        setCurrentStep(2);
    }, 300);
  };

  const handleSelectUnit = (unitId: string, unitName: string) => {
    setSelection({ ...selection, unitId, unitName, topicName: '' });
    
    if (dataType === 'games' && unitId === 'all') {
        const params = new URLSearchParams({
            courseId: selection.courseId,
            courseName: selection.courseName,
            unitId: 'all',
            unitName: 'Tüm Üniteler',
            topicId: 'all',
            topicName: 'Tüm Konular',
        });
        if (isStatic) params.append('isStatic', 'true');
        const url = `/oyunlar/${finalGamePath}/oyun?${params.toString()}`;
        router.push(url);
        return;
    }
    
    if (dataType === 'ozetler' && unitId !== 'all') {
         const selectedUnit = units.find(u => u.id === unitId);
         if (selectedUnit && (selectedUnit as any).hasUnitOzet) {
            const urlPath = isStatic ? `ozetler` : `student/ozetler`;
            router.push(`/${urlPath}/${selection.courseId}/${unitId}`);
            return;
         }
    }

    setIsLoading(true);
    setSearchQuery(""); // İleri gidince aramayı temizle
    setTimeout(() => {
        const selectedUnit = units.find(u => u.id === unitId);
        const availableTopics = (selectedUnit?.topics || []).filter(topic => {
            if (dataType === 'yazilacaklar') return (topic as any).hasYazilacaklarContent;
            if (dataType === 'ozetler') return (topic as any).hasOzetContent;
            return true;
        });
        setTopics(availableTopics);
        setIsLoading(false);
        setCurrentStep(3);
    }, 300);
  };
  
  const handleSelectTopic = (topicId: string, topicName: string) => {
      setSelection({...selection, topicName});
      
      const pathPrefix = isStatic ? '' : '/student';
      let basePath = targetPath;
      if (!basePath) {
          basePath = 'oyunlar';
      }
      
      const params = new URLSearchParams({
        courseId: selection.courseId,
        courseName: selection.courseName,
        unitId: selection.unitId,
        unitName: selection.unitName,
        topicId: topicId,
        topicName: topicName,
      });

      if (isStatic) {
          params.append('isStatic', 'true');
      }
      
      let finalUrl = `/${basePath}/${finalGamePath}/oyun?${params.toString()}`;
      
      if(dataType === 'yazilacaklar') {
          finalUrl = `${pathPrefix}/yazilacaklar/${selection.courseId}/${selection.unitId}/${topicId}`;
      }
      if(dataType === 'ozetler') {
            finalUrl = `${pathPrefix}/ozetler/${selection.courseId}/${selection.unitId}/${topicId}`;
      }

      router.push(finalUrl);
  };

  // --- FILTERING LOGIC ---
  const filterItems = (items: any[]) => {
      if (!searchQuery) return items;
      return items.filter(item => 
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (item.className && item.className.toLowerCase().includes(searchQuery.toLowerCase()))
      );
  };

  const renderStepContent = () => {
      if (isLoading) {
          return (
              <div className="flex flex-col items-center justify-center h-48 md:h-96 gap-4 animate-pulse">
                  <div className="relative">
                    <Loader2 className="h-10 w-10 md:h-20 md:w-20 text-cyan-400 animate-spin" />
                    <div className="absolute inset-0 bg-cyan-400/20 blur-xl rounded-full"></div>
                  </div>
                  <p className="text-sm md:text-2xl font-bold text-cyan-200">İçerikler Yükleniyor...</p>
              </div>
          );
      }
      
      // GRID CLASSES: Masaüstü için 3 kolonlu yapı eklendi (lg:grid-cols-3)
      const gridClasses = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5 pb-10";
      
      switch(currentStep) {
          case 1:
            const filteredCourses = filterItems(courses);
            return (
                <>
                    <SearchInput value={searchQuery} onChange={setSearchQuery} />
                    <div className={gridClasses}>
                        {filteredCourses.length > 0 ? filteredCourses.map((course, idx) => (
                            <SelectionCard 
                                key={course.id}
                                title={course.title}
                                subtitle={(course as any).className}
                                icon={(course as any).icon || Book}
                                color={(course as any).color || getGradient(idx)}
                                onClick={() => handleSelectCourse(course as Course)}
                                delay={idx * 50}
                            />
                        )) : <p className="col-span-full text-center text-slate-500 py-10">Aradığınız kriterde ders bulunamadı.</p>}
                    </div>
                </>
            );
          case 2:
            const filteredUnits = filterItems(units);
            return (
                <>
                    <SearchInput value={searchQuery} onChange={setSearchQuery} />
                    <div className={gridClasses}>
                        {dataType === 'games' && !searchQuery && (
                            <SelectionCard 
                                key="all-units"
                                title="Tüm Üniteler (Karma)"
                                subtitle="Genel Tekrar"
                                icon={Sparkles}
                                color="from-yellow-600 to-amber-500"
                                onClick={() => handleSelectUnit('all', 'Tüm Üniteler')}
                                delay={0}
                            />
                        )}
                        {filteredUnits.length > 0 ? filteredUnits.map((unit, idx) => (
                            <SelectionCard 
                                key={unit.id}
                                title={unit.title}
                                subtitle={selection.courseName}
                                icon={Library}
                                color={selection.courseColor}
                                onClick={() => handleSelectUnit(unit.id, unit.title)}
                                delay={(idx + (dataType === 'games' ? 1 : 0)) * 50}
                                hasContent={dataType === 'ozetler' ? ((unit as any).hasUnitOzet || (unit.topics.length > 0)) : true}
                            />
                        )) : <p className="col-span-full text-center text-slate-500 py-10">Aradığınız kriterde ünite bulunamadı.</p>}
                    </div>
                </>
            );
          case 3:
            const filteredTopics = filterItems(topics);
            return (
                <>
                    <SearchInput value={searchQuery} onChange={setSearchQuery} />
                    <div className={gridClasses}>
                        {dataType === 'games' && !searchQuery && (
                              <SelectionCard 
                                key="all-topics"
                                title="Tüm Konular (Karma)"
                                subtitle="Ünite Tekrarı"
                                icon={Sparkles}
                                color="from-yellow-600 to-amber-500"
                                onClick={() => handleSelectTopic('all', 'Tüm Konular')}
                                delay={0}
                            />
                        )}
                        {filteredTopics.length > 0 ? filteredTopics.map((topic, idx) => (
                            <SelectionCard 
                                key={topic.id}
                                title={topic.title}
                                subtitle={selection.unitName}
                                icon={ListTodo}
                                color={selection.courseColor}
                                onClick={() => handleSelectTopic(topic.id, topic.title)}
                                delay={(idx + 1) * 50}
                            />
                        )) : <p className="col-span-full text-center text-slate-500 py-10">Aradığınız kriterde konu bulunamadı.</p>}
                    </div>
                </>
            );
          default:
            return null;
      }
  }

  return (
    <div className="min-h-screen bg-[#0f172a] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800 via-[#0f172a] to-black p-4 md:p-10 pb-24 font-sans text-white">
        
        <div className="max-w-7xl mx-auto flex items-center justify-between mb-8 md:mb-12 pt-4">
            <button 
                onClick={handleBack}
                className="p-3 md:p-4 bg-white/5 hover:bg-white/10 rounded-xl md:rounded-2xl border border-white/10 transition-all group shrink-0"
            >
                <ArrowLeft className="h-5 w-5 md:h-6 md:w-6 text-slate-400 group-hover:text-white transition-colors" />
            </button>
            <div className="text-center mx-4 overflow-hidden flex-1">
                <div className="flex items-center justify-center gap-3">
                    <div className="hidden md:flex p-2.5 bg-blue-500/20 rounded-xl">
                        <PageIcon className="h-6 w-6 md:h-8 md:w-8 text-blue-400" />
                    </div>
                    <h1 className="text-xl md:text-4xl font-black uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 to-blue-400 truncate">
                        {finalGameName}
                    </h1>
                </div>
            </div>
            <div className="w-12 md:w-20 shrink-0"></div>
        </div>

        <div className="max-w-4xl mx-auto mb-8 md:mb-12 px-4">
            <div className="relative flex justify-between items-center">
                <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-800 -z-10 rounded-full"></div>
                <div 
                    className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-600 shadow-[0_0_15px_#3b82f6] -z-10 rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
                ></div>

                {steps.map((step) => {
                    const isActive = currentStep >= step.id;
                    const isCurrent = currentStep === step.id;
                    return (
                        <div key={step.id} className="flex flex-col items-center gap-2">
                            <div className={cn("w-10 h-10 md:w-16 md:h-16 rounded-full flex items-center justify-center border-4 transition-all duration-500 z-10 font-black text-sm md:text-xl shadow-xl", isActive ? "bg-blue-600 border-blue-400 text-white scale-110 shadow-blue-500/50" : "bg-slate-900 border-slate-700 text-slate-500")}>
                                {isActive && !isCurrent ? <Check className="h-4 w-4 md:h-7 md:w-7" /> : step.id}
                            </div>
                            <span className={cn("text-[10px] md:text-sm font-bold uppercase tracking-wider transition-colors duration-300", isCurrent ? "text-blue-400" : isActive ? "text-white" : "text-slate-600")}>{step.name}</span>
                        </div>
                    );
                })}
            </div>
        </div>

        <GlassPanel className="max-w-6xl mx-auto min-h-[600px] flex flex-col">
            <div className="p-4 md:p-8 border-b border-white/5 bg-black/20 flex justify-between items-center backdrop-blur-md sticky top-0 z-20">
                <h2 className="text-lg md:text-2xl font-bold text-white flex items-center gap-3">
                    {React.createElement(steps[currentStep-1].icon, { className: "h-6 w-6 text-cyan-400" })}
                    <span className="hidden md:inline">{steps[currentStep-1].name}</span>
                    <span className="md:hidden">Seçim Yap</span>
                </h2>
                
                <div className="px-3 py-1 md:px-5 md:py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs md:text-sm font-bold uppercase tracking-wider whitespace-nowrap">
                    ADIM {currentStep} / {steps.length}
                </div>
            </div>

            <div className="flex-grow p-4 md:p-8 lg:p-10 overflow-y-auto">
                {renderStepContent()}
            </div>

            <div className="p-4 md:p-6 border-t border-white/5 bg-black/20 flex justify-between items-center text-slate-500 text-xs md:text-sm font-medium">
                <span className="truncate mr-4">
                    {currentStep === 1 && "Devam etmek için bir ders seçin."}
                    {currentStep === 2 && <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-cyan-500"></span>{selection.courseName} seçildi. Şimdi ünite seçin.</span>}
                    {currentStep === 3 && <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-cyan-500"></span>{selection.unitName} seçildi. Son olarak konuyu belirleyin.</span>}
                </span>
                
                {/* Animasyonlu noktalar */}
                <div className="flex gap-1.5 shrink-0 opacity-50">
                    <div className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce"></div>
                    <div className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:100ms]"></div>
                    <div className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:200ms]"></div>
                </div>
            </div>
        </GlassPanel>

    </div>
  );
}