
'use client';

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { 
    ArrowLeft, ArrowRight, Check, Book, Library, ListTodo, 
    Sparkles, Loader2, Gamepad2, Search, XCircle, BookOpen
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { getCurriculumForSelection } from '@/components/actions/get-curriculum-for-selection';
import type { ClassGroup as EnrichedClassGroup } from '@/components/actions/get-curriculum-for-selection';


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

const defaultSteps = [
  { id: 1, name: "Ders", icon: Book },
  { id: 2, name: "Ünite", icon: Library },
  { id: 3, name: "Konu", icon: ListTodo },
];

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
            "absolute inset-0 opacity-40 group-hover:opacity-100 transition-opacity bg-gradient-to-br", 
            color
        )}></div>
        
        {/* Kart İçeriği */}
        <div className="relative h-full w-full bg-[#1e293b] rounded-[15px] p-4 md:p-5 flex items-center gap-4 md:gap-6 border border-white/5 group-hover:bg-[#1e293b]/95 transition-colors">
            
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
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  
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
  
  const stepsToDisplay = useMemo(() => {
    const allSteps = [
        { id: 1, name: "Ders", icon: Book },
        { id: 2, name: "Ünite", icon: Library },
        { id: 3, name: "Konu", icon: ListTodo },
    ];
    return allSteps;
  }, []);

  const getBackUrl = () => {
    if (targetPath?.startsWith('student')) return '/student';
    if(targetPath === 'oyunlar') return '/oyunlar';
    if(isStatic) return '/';
    return '/teacher/smartboard';
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
        const result = await getCurriculumForSelection(dataType, isStatic, isForStudent ? user?.uid : undefined);
        if (result.error) throw new Error(result.error);

        const classGroupsWithData = (result.classGroups || []).map((group, groupIndex) => ({
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
        setAllCourses(allCourses);

        return { classGroups: classGroupsWithData, allCourses };
    } catch (error) {
        console.error(error);
        return { classGroups: [], allCourses: [] };
    } finally {
        setIsLoading(false);
    }
}, [user, dataType, isStatic]);

useEffect(() => {
    const processUrlParams = async () => {
        const { allCourses: fetchedCourses } = await fetchManifest();

        const courseIdFromUrl = searchParams.get('courseId');
        const unitIdFromUrl = searchParams.get('unitId');
        const topicIdFromUrl = searchParams.get('topicId');
        
        if (courseIdFromUrl) {
            const foundCourse = fetchedCourses.find(c => c.id === courseIdFromUrl);
            if (foundCourse) {
                handleSelectCourse(foundCourse, true);

                if (unitIdFromUrl) {
                    const courseUnits = (foundCourse as any).units || [];
                    const foundUnit = courseUnits.find((u: Unit) => u.id === unitIdFromUrl);
                    if (foundUnit) {
                        handleSelectUnit(foundUnit, true);
                        
                        if (topicIdFromUrl) {
                            const foundTopic = (foundUnit.topics || []).find((t:Topic) => t.id === topicIdFromUrl);
                            if (foundTopic) {
                                handleSelectTopic(foundTopic.id, foundTopic.title || '');
                            }
                        }
                    }
                }
            }
        }
    };
    processUrlParams();
}, []); // Runs only once on mount

  const handleSelectCourse = (course: Course, fromUrl: boolean = false) => {
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
        if(!fromUrl) setCurrentStep(2);
    }, 300);
  };

  const handleSelectUnit = (unit: Unit, fromUrl: boolean = false) => {
    setSelection({ ...selection, unitId: unit.id, unitName: unit.title, topicName: '' });
    
    if (dataType === 'games' && unit.id === 'all') {
        const gamePath = new URLSearchParams(window.location.search).get('gamePath') || '';
        const params = new URLSearchParams({
            gameName: finalGameName,
            gamePath,
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

    setIsLoading(true);
    setSearchQuery("");
    setTimeout(() => {
        const selectedUnit = units.find(u => u.id === unit.id);
        setTopics(selectedUnit?.topics || []);
        setIsLoading(false);
        if(!fromUrl) setCurrentStep(3);
    }, 300);
  };
  
  const handleSelectTopic = (topicId: string, topicName: string) => {
      setSelection({...selection, topicName});
      
      const pathPrefix = isStatic ? '' : '/student';
      let basePath = targetPath;
      if (!basePath) {
          basePath = dataType === 'games' ? 'oyunlar' : dataType;
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
          const hasYazilacaklarContent = topics.find(t => t.id === topicId)?.hasYazilacaklarContent;
          if (hasYazilacaklarContent) {
              finalUrl = `${pathPrefix}/yazilacaklar/${selection.courseId}/${selection.unitId}/${topicId}`;
          } else {
              alert("Bu konu için yazılacaklar içeriği bulunmuyor.");
              return;
          }
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
          (item.title || item.name).toLowerCase().includes(searchQuery.toLowerCase()) ||
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
      
      const gridClasses = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5 pb-10";
      
      switch(currentStep) {
          case 1:
            const filteredCourses = filterItems(allCourses);
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
                                onClick={() => handleSelectUnit({id: 'all', title: 'Tüm Üniteler'}, false)}
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
                                onClick={() => handleSelectUnit(unit as Unit, false)}
                                delay={(idx + (dataType === 'games' ? 1 : 0)) * 50}
                            />
                        )) : <p className="col-span-full text-center text-slate-500 py-10">Aradığınız kriterde ünite bulunamadı.</p>}
                    </div>
                </>
            );
          case 3:
            const filteredTopics = filterItems(topics);
            
            const topicsWithContent = filteredTopics.filter(topic => {
                if(dataType === 'ozetler') return (topic as any).hasOzetContent;
                 if(dataType === 'yazilacaklar') {
                    // Check if there are any definitions or notes for this topic.
                    const hasContent = (topic as any).hasYazilacaklarContent;
                    return hasContent;
                }
                return true; // For 'games', assume all topics are valid
            });

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
                        
                        {topicsWithContent.length > 0 ? topicsWithContent.map((topic, idx) => (
                            <SelectionCard 
                                key={topic.id}
                                title={topic.title}
                                subtitle={selection.unitName}
                                icon={ListTodo}
                                color={selection.courseColor}
                                onClick={() => handleSelectTopic(topic.id, topic.title)}
                                delay={(idx + 1) * 50}
                                hasContent={true}
                            />
                        )) : (
                            <p className="col-span-full text-center text-slate-500 py-10">
                                Bu ünite için görüntülenecek {dataType === 'ozetler' ? 'özet' : (dataType === 'yazilacaklar' ? 'yazılacaklar' : 'etkinlik')} içeriği bulunamadı.
                            </p>
                        )}
                    </div>
                </>
            );
          default:
            return null;
      }
  }

  return (
    <div className="min-h-screen bg-[#0f172a] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800 via-[#0f172a] to-black p-2 md:p-10 pb-24 font-sans text-white">
        
        <div className="max-w-7xl mx-auto flex items-center justify-between mb-4 md:mb-12 pt-2">
            <button 
                onClick={handleBack}
                className="p-2 md:p-4 bg-white/5 hover:bg-white/10 rounded-lg md:rounded-2xl border border-white/10 transition-all group shrink-0"
            >
                <ArrowLeft className="h-5 w-5 md:h-8 md:w-8 text-slate-400 group-hover:text-white transition-colors" />
            </button>
            <div className="text-center mx-2 overflow-hidden flex-1">
                <div className="flex items-center justify-center gap-2">
                    <div className="hidden md:block p-2 bg-blue-500/20 rounded-xl">
                        <PageIcon className="h-8 w-8 text-blue-400" />
                    </div>
                    <h1 className="text-lg md:text-4xl font-black uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 to-blue-400 truncate">
                        {finalGameName}
                    </h1>
                </div>
            </div>
            <div className="w-9 md:w-20 shrink-0"></div>
        </div>

        <div className="max-w-4xl mx-auto mb-4 md:mb-12 px-1">
            <div className="relative flex justify-between items-center">
                <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-800 -z-10 rounded-full"></div>
                <div 
                    className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-600 shadow-[0_0_15px_#3b82f6] -z-10 rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${((currentStep - 1) / (stepsToDisplay.length - 1)) * 100}%` }}
                ></div>

                {stepsToDisplay.slice(0, 3).map((step) => {
                    const isActive = currentStep >= step.id;
                    const isCurrent = currentStep === step.id;
                    return (
                        <div key={step.id} className="flex flex-col items-center gap-1">
                            <div className={cn("w-8 h-8 md:w-14 md:h-14 rounded-full flex items-center justify-center border-2 md:border-4 transition-all duration-500 z-10 font-black text-xs md:text-xl shadow-xl", isActive ? "bg-blue-600 border-blue-400 text-white scale-110 shadow-blue-500/50" : "bg-slate-900 border-slate-700 text-slate-500")}>
                                {isActive && !isCurrent ? <Check className="h-3 w-3 md:h-6 md:w-6" /> : step.id}
                            </div>
                            <span className={cn("text-[9px] md:text-sm font-bold uppercase tracking-wider transition-colors duration-300", isCurrent ? "text-blue-400" : isActive ? "text-white" : "text-slate-600")}>{step.name}</span>
                        </div>
                    );
                })}
            </div>
        </div>

        <GlassPanel className="max-w-5xl mx-auto min-h-[600px] flex flex-col">
            <div className="p-3 md:p-6 border-b border-white/5 bg-black/20 flex justify-between items-center">
                <h2 className="text-base md:text-2xl font-bold text-white flex items-center gap-2">
                    {React.createElement(stepsToDisplay[currentStep-1].icon, { className: "h-5 w-5 md:h-6 md:w-6 text-cyan-400" })}
                    <span className="hidden md:inline">{stepsToDisplay[currentStep-1].name} Seçimi</span>
                    <span className="md:hidden">Seçim Yap</span>
                </h2>
                
                <div className="px-2 py-0.5 md:px-4 md:py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[10px] md:text-sm font-bold uppercase tracking-wider whitespace-nowrap">
                    ADIM {currentStep} / {stepsToDisplay.length}
                </div>
            </div>

            <div className="flex-grow p-2 md:p-8 lg:p-12 overflow-y-auto">
                {renderStepContent()}
            </div>

            <div className="p-3 md:p-6 border-t border-white/5 bg-black/20 flex justify-between items-center text-slate-500 text-[10px] md:text-sm font-medium">
                <span className="truncate mr-4">
                    {currentStep === 1 && "Devam etmek için bir ders seçin."}
                    {currentStep === 2 && <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-cyan-500"></span>{selection.courseName} seçildi. Şimdi ünite seçin.</span>}
                    {currentStep === 3 && <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-cyan-500"></span>{selection.unitName} seçildi. Son olarak, bir konu seç.</span>}
                </span>
                
                {/* Animasyonlu noktalar */}
                <div className="flex gap-1 md:gap-2 shrink-0 opacity-50">
                    <div className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce"></div>
                    <div className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:100ms]"></div>
                    <div className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:200ms]"></div>
                </div>
            </div>
        </GlassPanel>

    </div>
  );
}

```
- src/lib/placeholders.ts:
```ts
export const getPlaceholderAvatar = (seed: string) => `https://api.dicebear.com/8.x/bottts-neutral/svg?seed=${seed}`
```
- src/lib/quiz-config.ts:
```ts

export const QUESTION_TYPES = [
    { id: 'mcq', name: 'Çoktan Seçmeli' },
    { id: 'tf', name: 'Doğru/Yanlış' },
    { id: 'fitb', name: 'Boşluk Doldurma' },
] as const;

export const DIFFICULTY_LEVELS = ['Kolay', 'Orta', 'Zor'] as const;

export const GAME_SETTINGS = {
    // Sadece öğretmen tarafından başlatılan Akıllı Tahta oyunları
    smartboard: {
        bireyselYarisma: {
            questionCount: { min: 5, max: 50, default: 20, step: 1 },
            finishScore: { default: 100, min: 0, step: 10 },
            streakBonus: { default: true },
            questionTimer: { default: 0, min: 0, max: 60, step: 5 },
            displayModes: {
                random: { id: 'random', name: 'Kapalı Kutu (Rastgele)' },
                sequential: { id: 'sequential', name: 'Açık Sıralı' },
                default: 'random'
            },
            difficulty: { default: ['Kolay', 'Orta', 'Zor'] },
            questionTypes: { default: ['mcq', 'tf', 'fitb'] },
            points: { 
                mcq: { Kolay: 10, Orta: 15, Zor: 20 },
                tf: { Kolay: 5, Orta: 10, Zor: 15 },
                fitb: { Kolay: 10, Orta: 15, Zor: 20 },
            },
             penalty: { 
                mcq: { Kolay: 5, Orta: 8, Zor: 10 },
                tf: { Kolay: 3, Orta: 5, Zor: 8 },
                fitb: { Kolay: 5, Orta: 8, Zor: 10 },
            },
        },
        takimYarismasi: {
            questionCount: { min: 10, max: 80, default: 40, step: 5 },
            questionTimer: { default: 0, min: 0, max: 60, step: 5 },
            finishScore: { default: 150, min: 0, step: 10 },
        },
        duello: {
            questionCount: { min: 10, max: 50, default: 20, step: 2 },
            questionTimer: { default: 0, min: 0, max: 60, step: 5 },
            pullStrength: { Kolay: 10, Orta: 15, Zor: 20 },
        }
    },
    // Öğrencilerin kendilerinin başlattığı oyun/aktiviteler
    student: {
        soruCoz: {
            questionCount: { min: 5, max: 20, default: 10, step: 1 },
            difficulty: { default: ['Orta'] },
            questionTypes: { default: ['mcq'] },
        }
    }
}

```
- src/app/layout.tsx:
```tsx
'use client';

import type { Metadata } from 'next';
import { Toaster } from "@/components/ui/toaster"
import './globals.css';
import { Providers } from '@/components/providers';
import { BottomNavBar } from '@/components/bottom-nav-bar';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { Analytics } from '@vercel/analytics/react';


// Metadata can still be exported from a client component layout in Next.js 13+
// but it's often better to move it to the page level if the layout is client-side.
// For now, we'll keep it here as it might still work depending on the Next.js version.
// export const metadata: Metadata = {
//   title: 'Değerler Oyunu',
//   description: 'Değerler Oyunu - Eğlenerek Değerlerimizi Öğrenelim',
// };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <title>Değerler Oyunu</title>
        <meta name="description" content="Değerler Oyunu - Eğlenerek Değerlerimizi Öğrenelim" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Poppins:wght@600;700;800;900&display=swap" rel="stylesheet" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0"/>
      </head>
      <body className="antialiased font-body">
          <Providers>
              {children}
              <Analytics />
              <Toaster />
              <Suspense fallback={null}>
                <BottomNavBar />
              </Suspense>
          </Providers>
      </body>
    </html>
  );
}

```
- src/app/teacher/smartboard/page.tsx:
```tsx
'use client';

import Link from 'next/link';
import React, { type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { 
  MonitorPlay, Workflow, Gamepad2, FileJson, Trophy, 
  Settings, UserCog, Zap, Columns, LayoutTemplate, 
  GitBranch, Swords, User, Users, BrainCircuit, Wind, 
  Package, BookOpen, Coins, ClipboardCheck, ArrowRight, Home
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';

const FeatureButton = ({ href, title, description, icon, colorClass }: { href: string, title: string, description: string, icon: ReactNode, colorClass: string }) => {
    return (
        <Link href={href} className="block group h-full">
            <div className={cn(
                "h-full w-full rounded-[2rem] p-6 md:p-8 flex flex-col items-center justify-center text-center shadow-2xl transition-all duration-300 transform border-b-8 group-hover:border-b-0 group-hover:translate-y-2 relative overflow-hidden",
                colorClass
            )}>
                <div className="absolute inset-0 opacity-20 blur-3xl group-hover:opacity-40 transition-opacity bg-white"></div>
                <div className="p-4 rounded-3xl bg-white/10 mb-6 border border-white/20 relative z-10 group-hover:scale-110 transition-transform shadow-lg backdrop-blur-sm">
                    {React.cloneElement(icon as React.ReactElement, { className: "h-12 w-12 text-white" })}
                </div>
                <h3 className="font-black text-2xl md:text-3xl mt-1 text-white drop-shadow-md relative z-10 uppercase tracking-tight leading-tight">{title}</h3>
                <p className="mt-3 text-white/80 text-base font-medium relative z-10 leading-snug">{description}</p>
                <div className="flex-grow" />
                <div className="mt-8 flex items-center text-lg font-bold text-white relative z-10 bg-black/20 px-6 py-3 rounded-full border-2 border-white/10 group-hover:bg-white/30 transition-colors">
                    BAŞLAT <ArrowRight className="ml-3 h-6 w-6 group-hover:translate-x-2 transition-transform" />
                </div>
            </div>
        </Link>
    )
};


export default function SmartboardPage() {
    const { user } = useAuth();
  
    const mainButtons = [
        {
            key: 'dersAkisi',
            href: '/teacher/ders-akisi',
            title: 'Ders Akışı',
            description: 'Konu anlatımlarını ve ders adımlarını yansıtın.',
            icon: <Workflow />,
            colorClass: 'bg-teal-600 border-teal-800 hover:bg-teal-500',
        },
        {
            key: 'yazilacaklar',
            href: "/teacher/smartboard/yazilacaklar",
            title: "Yazılacaklar",
            description: "Kavramları ve önemli notları tahtaya yansıtın.",
            icon: <Columns />,
            colorClass: "bg-amber-600 border-amber-800 hover:bg-amber-500",
        },
        {
            key: 'ozetler',
            href: "/teacher/smartboard/ozetler",
            title: "İnteraktif Özet",
            description: "HTML ile zenginleştirilmiş özetleri sunun.",
            icon: <LayoutTemplate />,
            colorClass: "bg-rose-600 border-rose-800 hover:bg-rose-500",
        },
        {
            key: 'sanalTahta',
            href: "/teacher/smartboard/sanal-tahta",
            title: "Sanal Tahta",
            description: "Ders anlatımı için dijital beyaz tahta.",
            icon: <Lightbulb />,
            colorClass: "bg-blue-600 border-blue-800 hover:bg-blue-500",
        },
        {
            key: 'anlikGeriBildirim',
            href: "/teacher/smartboard/anlik-geri-bildirim",
            title: "Anlık Geri Bildirim",
            description: "Evet/Hayır, trafik ışıkları veya şıklı testlerle sınıfın nabzını ölçün.",
            icon: <Zap />,
            colorClass: "bg-slate-700 border-slate-900 hover:bg-slate-600",
        },
    ];

    const competitionButtons = [
        {
            key: 'bireysel',
            href: '/teacher/smartboard/bireysel',
            title: 'Bireysel Yarışma',
            description: 'Tüm sınıfın bireysel olarak yarıştığı mod.',
            icon: <User />,
            colorClass: 'bg-indigo-600 border-indigo-800 hover:bg-indigo-500',
        },
        {
            key: 'takim',
            href: '/teacher/smartboard/takim',
            title: 'Takım Yarışması',
            description: 'Sınıfı gruplara ayırarak takım ruhuyla yarıştırın.',
            icon: <Users />,
            colorClass: 'bg-cyan-600 border-cyan-800 hover:bg-cyan-500',
        },
         {
            key: 'duello',
            href: '/teacher/smartboard/duello',
            title: 'Düello',
            description: 'İki öğrenciyi teke tek, heyecanlı bir bilgi mücadelesine davet edin.',
            icon: <Swords />,
            colorClass: 'bg-red-600 border-red-800 hover:bg-red-500',
        },
        {
            key: 'kavram_duellosu',
            href: "/teacher/smartboard/kavram-duellosu",
            title: "Kavram Düellosu",
            description: "İki takım arasında hızlı ve tempolu kavram-tanım eşleştirme oyunu.",
            icon: <BrainCircuit />,
            colorClass: "bg-fuchsia-600 border-fuchsia-800 hover:bg-fuchsia-500",
        },
        {
            key: 'fetih_oyunu',
            href: "/teacher/smartboard/fetih-oyunu",
            title: "Fetih Oyunu",
            description: "Takımca soruları doğru cevaplayarak haritadaki tüm bölgeleri fethedin.",
            icon: <GitBranch />,
            colorClass: "bg-emerald-600 border-emerald-800 hover:bg-emerald-500",
        },
        {
            key: 'tornado',
            href: "/teacher/smartboard/tornado",
            title: "Tornado",
            description: "Şans ve bilginin birleştiği, sürprizlerle dolu kutu açma oyunu.",
            icon: <Wind />,
            colorClass: "bg-sky-600 border-sky-800 hover:bg-sky-500",
        },
        {
            key: 'kutu_ac',
            href: "/teacher/smartboard/kutu-ac",
            title: "Kutu Aç",
            description: "Kutuları açarak puan topla ve lider ol.",
            icon: <Package />,
            colorClass: "bg-purple-600 border-purple-800 hover:bg-purple-500",
        },
    ];

  return (
    <div className="flex flex-col items-center p-6 sm:p-8 space-y-12 min-h-screen bg-slate-950 text-white font-sans relative overflow-hidden">
            
             {/* Arka Plan Efektleri */}
             <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-900/20 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-900/20 rounded-full blur-[100px]" />
            </div>

            {/* Ana Başlık */}
            <div className="text-center relative z-10 space-y-4 pt-4">
                <div className="inline-flex items-center justify-center p-4 bg-white/5 rounded-full mb-2 border border-white/10 shadow-2xl backdrop-blur-md">
                    <MonitorPlay className="h-10 w-10 text-cyan-400"/>
                </div>
                <h1 className="font-black text-4xl md:text-6xl tracking-tight text-white drop-shadow-2xl">AKILLI <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">TAHTA</span></h1>
                <p className="text-slate-400 text-lg md:text-xl font-medium max-w-2xl mx-auto">Sınıf içi etkileşimi artırmak için bir mod seçin.</p>
            </div>
            
            <div className="w-full max-w-[1600px] space-y-12 relative z-10">
                
                 {/* Yarışmalar Bölümü */}
                <section>
                    <h2 className="text-2xl font-black text-center mb-8 text-white flex items-center justify-center gap-4">
                        <div className="h-px w-10 bg-gradient-to-r from-transparent to-indigo-500"></div>
                        <span className="bg-indigo-500/10 px-4 py-1.5 rounded-lg border border-indigo-500/30 text-indigo-300 uppercase tracking-widest text-sm flex items-center gap-2">
                           <Trophy className="h-5 w-5" /> Yarışma Modları
                        </span>
                        <div className="h-px w-10 bg-gradient-to-l from-transparent to-indigo-500"></div>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                        {competitionButtons.map(({ key, ...buttonProps }) => (
                            <div key={key} className="aspect-[4/5] min-h-[340px]">
                                <FeatureButton {...buttonProps} />
                            </div>
                        ))}
                    </div>
                </section>
                
                <section>
                    <h2 className="text-2xl font-black text-center mb-8 text-white flex items-center justify-center gap-4">
                        <div className="h-px w-10 bg-gradient-to-r from-transparent to-rose-500"></div>
                        <span className="bg-rose-500/10 px-4 py-1.5 rounded-lg border border-rose-500/30 text-rose-300 uppercase tracking-widest text-sm flex items-center gap-2">
                           <MonitorPlay className="h-5 w-5" /> Sunum ve Araçlar
                        </span>
                        <div className="h-px w-10 bg-gradient-to-l from-transparent to-rose-500"></div>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                        {mainButtons.map(({ key, ...buttonProps }) => (
                            <div key={key} className="aspect-[4/5] min-h-[340px]">
                                <FeatureButton {...buttonProps} />
                            </div>
                        ))}
                    </div>
                </section>
                
            </div>

            {/* Yönetim Butonları */}
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 w-full max-w-4xl relative z-10 p-5 rounded-3xl bg-slate-900/80 backdrop-blur-xl border border-white/10 shadow-2xl mt-10">
                <Button asChild className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white text-base font-bold shadow-lg shadow-amber-900/40 h-12 px-6 rounded-xl transition-all border-b-4 border-orange-800 active:border-b-0 active:translate-y-1 w-full md:w-auto">
                    <Link href="/teacher/smartboard/leaderboard">
                        <Trophy className="mr-2 h-5 w-5" />
                        Turnuva Liderliği
                    </Link>
                </Button>
                <div className="h-px w-full md:w-px md:h-8 bg-white/10"></div>
                <Button asChild variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/5 text-base font-bold h-12 px-5 rounded-lg w-full md:w-auto justify-start md:justify-center">
                    <Link href="/teacher/smartboard/ayarlar">
                        <UserCog className="mr-2 h-5 w-5 text-cyan-400" />
                        Misafir Oyuncular
                    </Link>
                </Button>
                <Button asChild variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/10 text-base font-bold h-12 px-5 rounded-lg w-full md:w-auto justify-start md:justify-center">
                    <Link href="/teacher/game-settings">
                        <Settings className="mr-2 h-5 w-5 text-purple-400" />
                        Oyun Ayarları
                    </Link>
                </Button>
            </div>
            
        </div>
    );
}
```
- tailwind.config.js:
```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
}

```
- .eslintrc.json:
```json
{
  "extends": "next/core-web-vitals"
}

```
- .gitignore:
```
# See https://help.github.com/articles/ignoring-files/ for more about ignoring files.

# dependencies
/node_modules
/.pnp
.pnp.js

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# local env files
.env*.local

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts

# genkit
.genkit/
.genkit-cache/
genkit.log

```
- postcss.config.js:
```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}

```
- next.config.js:
```js
/** @type {import('next').NextConfig} */
const nextConfig = {}

module.exports = nextConfig

```
- firebase.json:
```json
{
  "hosting": {
    "public": "public",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ]
  }
}
```
