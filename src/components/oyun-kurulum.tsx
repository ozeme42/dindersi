'use client';

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { 
    ArrowLeft, ArrowRight, Check, Book, Library, ListTodo, 
    Sparkles, Loader2, Gamepad2, Search, XCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { getCurriculumForSelection } from '@/components/actions/get-curriculum-for-selection';
import type { Course, Unit, Topic } from "@/lib/types";
import { StudentOyunKurulum } from "@/components/student-oyun-kurulum";

// Firebase Bağlantıları
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

// --- TİP TANIMLARI ---
type EnrichedCourse = Course & {
    units: (Omit<Unit, 'topics'> & {
        topics: (Topic & { hasOzetContent?: boolean; hasYazilacaklarContent?: boolean; })[]
    })[]
};

type ClassGroup = { 
    name: string; 
    courses: EnrichedCourse[] 
};

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
    title, subtitle, icon: Icon, onClick, delay = 0, color = "from-slate-700 to-slate-800", hasContent = true,
}: { title: string, subtitle?: string, icon: any, onClick: () => void, delay?: number, color?: string, isActive?: boolean, hasContent?: boolean }) => (
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
        <div className={cn("absolute inset-0 opacity-40 group-hover:opacity-100 transition-opacity bg-gradient-to-br", color)}></div>
        <div className="relative h-full w-full bg-[#1e293b] rounded-[15px] p-4 md:p-5 flex items-center gap-4 md:gap-6 border border-white/5 group-hover:bg-[#1e293b]/95 transition-colors">
            <div className={cn("h-12 w-12 md:h-14 md:w-14 rounded-xl flex items-center justify-center shadow-lg shrink-0 bg-gradient-to-br text-white transition-transform group-hover:scale-110 duration-300 border border-white/10", color)}>
                <Icon className="h-6 w-6 md:h-7 md:w-7 drop-shadow-md" />
            </div>
            <div className="flex-grow min-w-0 flex flex-col justify-center">
                {subtitle && (
                    <div className="inline-flex self-start items-center px-2 py-0.5 rounded-full bg-white/5 border border-white/10 mb-1.5">
                        <span className="text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate max-w-[150px]">{subtitle}</span>
                    </div>
                )}
                <h3 className="font-bold text-slate-100 text-sm md:text-base lg:text-lg leading-tight group-hover:text-white transition-colors line-clamp-2">{title}</h3>
                 {!hasContent && <span className="text-[10px] text-red-400/70 font-semibold mt-1">İçerik Yok</span>}
            </div>
            <div className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-cyan-500 group-hover:text-white transition-all shrink-0 ml-auto opacity-50 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0">
                <ArrowRight className="h-4 w-4" />
            </div>
        </div>
    </button>
);

// --- MAIN PAGE COMPONENT ---
type OyunKurulumProps = {
    pageTitle?: string; gameName?: string; gamePath?: string; pageIcon?: React.ElementType; gameIcon?: React.ElementType;
    targetPath?: string; dataType: 'games' | 'yazilacaklar' | 'ozetler'; isStatic?: boolean;
    studentClassId?: string | null; 
}

export function OyunKurulum({ 
    pageTitle: initialPageTitle, gameName, gamePath, pageIcon: PageIconProp, gameIcon,
    targetPath, dataType, isStatic = false, studentClassId 
}: OyunKurulumProps) {
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [currentStep, setCurrentStep] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [isRedirecting, setIsRedirecting] = useState(false); 
    
    // Öğrenci ise yeni kurumu göster
    if (user?.role === 'student' && dataType === 'games') {
        return <StudentOyunKurulum 
            pageTitle={initialPageTitle} 
            gameName={gameName} 
            gamePath={gamePath} 
            pageIcon={PageIconProp} 
            gameIcon={gameIcon} 
            isStatic={isStatic} 
            studentClassId={studentClassId} 
        />;
    }

    // Firestore'dan gelecek sınıf bilgisi state'i
    const [dbUserClass, setDbUserClass] = useState<string | null>(null);
    const [isClassFetching, setIsClassFetching] = useState(true);
    
    const PageIcon = PageIconProp || gameIcon || Gamepad2;
  
    const [classGroups, setClassGroups] = useState<ClassGroup[]>([]);
    const [courses, setCourses] = useState<EnrichedCourse[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    const [topics, setTopics] = useState<Topic[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
  
    const pageTitle = initialPageTitle || gameName || searchParams.get('gameName') || "Etkinlik Kurulumu";
    const finalGamePath = gamePath || searchParams.get('gamePath') || "";
  
    const [selection, setSelection] = useState({
      classId: "", className: "", courseId: "", courseName: "", courseColor: "from-slate-700 to-slate-800", unitId: "", unitName: "", topicName: ""
    });

    // 1. ÖĞRENCİNİN SINIF BİLGİSİNİ FİRESTORE'DAN OTOMATİK ÇEK
    useEffect(() => {
        const fetchStudentClass = async () => {
            if (!user || !user.uid) {
                setIsClassFetching(false);
                return;
            }
            try {
                const userDocRef = doc(db, 'users', user.uid);
                const docSnap = await getDoc(userDocRef);
                
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    const className = data.class?.split(' - ')[0];
                    setDbUserClass(className || null);
                }
            } catch (error) {
                console.error("Sınıf bilgisi çekilirken hata:", error);
            } finally {
                setIsClassFetching(false);
            }
        };

        fetchStudentClass();
    }, [user]);

    // 2. GÖREV MODUNDAYSA DİREKT YÖNLENDİR
    useEffect(() => {
        const topicIdParam = searchParams.get('topicId');
        const modeParam = searchParams.get('mode');
        if (dataType === 'games' && topicIdParam && modeParam === 'mission') {
            setIsRedirecting(true);
            const params = new URLSearchParams(searchParams.toString());
            if(!params.get('gameName')) params.set('gameName', pageTitle);
            params.set('isStatic', String(isStatic));
            router.replace(`/oyunlar/${finalGamePath}/oyun?${params.toString()}`);
        }
    }, [searchParams, finalGamePath, dataType, pageTitle, isStatic, router]);
    
    const stepsToDisplay = useMemo(() => [
        { id: 1, name: "Ders", icon: Book }, { id: 2, name: "Ünite", icon: Library }, { id: 3, name: "Konu", icon: ListTodo }
    ], []);
  
    // GERİ DÖNÜŞ URL'Sİ (HATA BURADA ÇÖZÜLDÜ)
    const getBackUrl = () => {
      // Eğer kullanıcı öğrenciyse veya oyunlar sayfasındaysa öğrenci ana paneline döner
      if (user?.role === 'student' || targetPath === 'oyunlar' || targetPath?.startsWith('student')) {
          return '/student';
      }
      return '/'; 
    };
    
    const handleBack = () => {
      if (currentStep > 1) { 
          setCurrentStep(currentStep - 1); 
          setSearchQuery(""); 
      } 
      else { 
          router.push(getBackUrl()); 
      }
    };
  
    // 3. MÜFREDATI ÇEK VE SINIFI FİLTRELE
    const fetchCurriculumData = useCallback(async () => {
      if (isRedirecting || isClassFetching) return;
      
      setIsLoading(true);
      try {
          const userId = isStatic ? undefined : user?.uid;
          const { classGroups: fetchedClassGroups, error } = await getCurriculumForSelection(dataType, isStatic, userId);
          
          if (error) { setClassGroups([]); return; }
          
          const classGroupsWithData = (fetchedClassGroups || []).map((group, groupIndex) => ({
              ...group,
              courses: group.courses.map((course: any, courseIndex: number) => ({
                  ...course, icon: ICONS[(groupIndex + courseIndex) % ICONS.length], color: getGradient(groupIndex + courseIndex),
                  className: group.name, classId: course.classId || group.id 
              }))
          }));
          
          setClassGroups(classGroupsWithData);
          
          let allCourses = classGroupsWithData.flatMap(group => group.courses);

          const activeClassFilter = studentClassId || dbUserClass;

          if (activeClassFilter) {
              allCourses = allCourses.filter(course => {
                  const courseClassIdStr = String(course.classId).toLowerCase();
                  const courseClassNameStr = String(course.className).toLowerCase();
                  const filterStr = String(activeClassFilter).toLowerCase();
                  
                  return courseClassIdStr === filterStr || courseClassNameStr.includes(filterStr);
              });
          }

          setCourses(allCourses);
      } catch (error) { console.error(error); } 
      finally { setIsLoading(false); }
    }, [user?.uid, dataType, isStatic, isRedirecting, isClassFetching, dbUserClass, studentClassId]);
  
    useEffect(() => { if (!isRedirecting && !isClassFetching) fetchCurriculumData(); }, [fetchCurriculumData, isRedirecting, isClassFetching]);
  
    const handleSelectCourse = (course: EnrichedCourse) => {
      setSelection({ 
          ...selection, classId: course.classId || "", className: course.className || "", courseId: course.id, 
          courseName: course.title, courseColor: course.color || "from-slate-700 to-slate-800", unitId: '', unitName: '',
      });
      setIsLoading(true); setSearchQuery("");
      setTimeout(() => {
          let unitsWithContent = course.units;
          if (dataType !== 'games') {
               unitsWithContent = course.units.filter((unit) => {
                  if (dataType === 'ozetler') return (unit as any).hasUnitOzet || unit.topics.some((t: Topic) => (t as any).hasOzetContent);
                  if (dataType === 'yazilacaklar') return unit.topics.some((t: Topic) => (t as any).hasYazilacaklarContent);
                  return false;
               });
          }
          setUnits((unitsWithContent || []).sort((a, b) => (a.title || '').localeCompare(b.title || '', 'tr', { numeric: true })));
          setIsLoading(false); setCurrentStep(2);
      }, 300);
    };
  
    const handleSelectUnit = (unit: Unit) => {
      setSelection({ ...selection, unitId: unit.id, unitName: unit.title, topicName: '' });
      if (dataType === 'games' && unit.id === 'all') {
          const params = new URLSearchParams({ gameName: pageTitle, gamePath: finalGamePath, classId: selection.classId, className: selection.className, courseId: selection.courseId, courseName: selection.courseName, unitId: 'all', unitName: 'Tüm Üniteler', topicId: 'all', topicName: 'Tüm Konular', isStatic: String(isStatic) });
          router.push(`/oyunlar/${finalGamePath}/oyun?${params.toString()}`);
          return;
      }
      if (dataType === 'ozetler' && (unit as any).hasUnitOzet && (!unit.topics || unit.topics.every(t => !(t as any).hasOzetContent))) {
          router.push(`${isStatic ? '' : '/student'}/ozetler/${selection.courseId}/${unit.id}`);
          return;
      }
      setIsLoading(true); setSearchQuery("");
      setTimeout(() => {
          const selectedUnit = courses.find(c => c.id === selection.courseId)?.units?.find(u => u.id === unit.id);
          let topicsWithContent: Topic[] = [];
          if (selectedUnit?.topics) {
              if (dataType === 'games') topicsWithContent = selectedUnit.topics;
              else if (dataType === 'ozetler') topicsWithContent = selectedUnit.topics.filter(t => (t as any).hasOzetContent);
              else if (dataType === 'yazilacaklar') topicsWithContent = selectedUnit.topics.filter(t => (t as any).hasYazilacaklarContent);
          }
          setTopics(topicsWithContent.sort((a,b) => (a.title || '').localeCompare(b.title || '', 'tr', { numeric: true })));
          setIsLoading(false); setCurrentStep(3);
      }, 300);
    };
    
    const handleSelectTopic = (topicId: string, topicName: string) => {
        setSelection({...selection, topicName});
        const pathPrefix = isStatic ? '' : (targetPath || 'oyunlar').startsWith('student/') ? '/student' : '';
        let finalUrl = '';
        if (dataType === 'yazilacaklar') finalUrl = `${pathPrefix}/yazilacaklar/${selection.courseId}/${selection.unitId}/${topicId}`;
        else if (dataType === 'ozetler') finalUrl = `${pathPrefix}/ozetler/${selection.courseId}/${selection.unitId}/${topicId}`;
        else {
            const params = new URLSearchParams({ gameName: pageTitle, gamePath: finalGamePath, classId: selection.classId, className: selection.className, courseId: selection.courseId, courseName: selection.courseName, unitId: selection.unitId, unitName: selection.unitName, topicId: topicId, topicName: topicName, isStatic: String(isStatic) });
            finalUrl = `/oyunlar/${finalGamePath}/oyun?${params.toString()}`;
        }
        router.push(finalUrl);
    };
  
    const filterItems = (items: any[]) => {
        if (!searchQuery) return items;
        return items.filter(item => (item.title || item.name).toLowerCase().includes(searchQuery.toLowerCase()) || (item.className && item.className.toLowerCase().includes(searchQuery.toLowerCase())));
    };
  
    const renderStepContent = () => {
        if (isLoading || isClassFetching) return <div className="flex flex-col items-center justify-center h-48 md:h-96 gap-4 animate-pulse"><div className="relative"><Loader2 className="h-10 w-10 md:h-20 md:w-20 text-cyan-400 animate-spin" /><div className="absolute inset-0 bg-cyan-400/20 blur-xl rounded-full"></div></div><p className="text-sm md:text-2xl font-bold text-cyan-200">İçerikler Yükleniyor...</p></div>;
        
        const gridClasses = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5 pb-10";
        
        switch(currentStep) {
            case 1:
                const finalFilteredCourses = filterItems(courses);

                return (
                    <>
                        <SearchInput value={searchQuery} onChange={setSearchQuery} />

                        <div className={gridClasses}>
                            {finalFilteredCourses.length > 0 ? finalFilteredCourses.map((course, idx) => (
                                <SelectionCard key={course.id} title={course.title} subtitle={course.className} icon={(course as any).icon || Book} color={(course as any).color || getGradient(idx)} onClick={() => handleSelectCourse(course as EnrichedCourse)} delay={idx * 50} />
                            )) : (
                                <div className="col-span-full flex flex-col items-center justify-center py-10 text-slate-400 space-y-2">
                                  <Book className="h-12 w-12 opacity-50 mb-2" />
                                  <p className="text-lg font-medium text-white">Ders Bulunamadı</p>
                                  <p className="text-sm">Kayıtlı olduğunuz {dbUserClass || "sınıfa"} ait ders görünmüyor.</p>
                                </div>
                            )}
                        </div>
                    </>
                );
            case 2:
              const filteredUnits = filterItems(units);
              return (
                  <>
                      <SearchInput value={searchQuery} onChange={setSearchQuery} />
                      <div className={gridClasses}>
                          {dataType === 'games' && !searchQuery && <SelectionCard key="all-units" title="Tüm Üniteler (Karma)" subtitle="Genel Tekrar" icon={Sparkles} color="from-yellow-600 to-amber-500" onClick={() => handleSelectUnit({ id: 'all', title: 'Tüm Üniteler' } as Unit)} delay={0} />}
                          {filteredUnits.length > 0 ? filteredUnits.map((unit, idx) => (
                              <SelectionCard key={unit.id} title={unit.title} subtitle={selection.courseName} icon={Library} color={selection.courseColor} onClick={() => handleSelectUnit(unit as Unit)} delay={(idx + 1) * 50} hasContent={dataType === 'games' || (unit as any).hasUnitOzet || (unit.topics && unit.topics.some((t: any) => t.hasOzetContent || t.hasYazilacaklarContent))} />
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
                          {dataType === 'games' && !searchQuery && <SelectionCard key="all-topics" title="Tüm Konular (Karma)" subtitle="Ünite Tekrarı" icon={Sparkles} color="from-yellow-600 to-amber-500" onClick={() => handleSelectTopic('all', 'Tüm Konular')} delay={0} />}
                          {filteredTopics.length > 0 ? filteredTopics.map((topic, idx) => (
                              <SelectionCard key={topic.id} title={topic.title} subtitle={selection.unitName} icon={ListTodo} color={selection.courseColor} onClick={() => handleSelectTopic(topic.id, topic.title)} delay={(idx + 1) * 50} hasContent={true} />
                          )) : <p className="col-span-full text-center text-slate-500 py-10">Bu ünite için görüntülenecek içerik bulunamadı.</p>}
                      </div>
                  </>
              );
            default: return null;
        }
    }

    if (isRedirecting) return <div className="flex h-screen items-center justify-center bg-[#0f172a] text-white"><Loader2 className="h-16 w-16 text-cyan-500 animate-spin" /></div>;
  
    return (
      <div className="min-h-screen bg-[#0f172a] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800 via-[#0f172a] to-black p-2 md:p-10 pb-24 font-sans text-white">
          <div className="max-w-7xl mx-auto flex items-center justify-between mb-4 md:mb-12 pt-2">
              <button onClick={handleBack} className="p-2 md:p-4 bg-white/5 hover:bg-white/10 rounded-lg md:rounded-2xl border border-white/10 transition-all group shrink-0">
                  <ArrowLeft className="h-5 w-5 md:h-8 md:w-8 text-slate-400 group-hover:text-white transition-colors" />
              </button>
              <div className="text-center mx-2 overflow-hidden flex-1"><h1 className="text-lg md:text-4xl font-black uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 to-blue-400 truncate">{pageTitle}</h1></div>
              <div className="w-9 md:w-20 shrink-0"></div>
          </div>
  
          <div className="max-w-4xl mx-auto mb-4 md:mb-12 px-1">
              <div className="relative flex justify-between items-center">
                  <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-800 -z-10 rounded-full"></div>
                  <div className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-600 shadow-[0_0_15px_#3b82f6] -z-10 rounded-full transition-all duration-700 ease-out" style={{ width: `${((currentStep - 1) / (stepsToDisplay.length - 1)) * 100}%` }}></div>
                  {stepsToDisplay.slice(0, 3).map((step) => {
                      const isActive = currentStep >= step.id; const isCurrent = currentStep === step.id;
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
                  <h2 className="text-base md:text-2xl font-bold text-white flex items-center gap-2">Seçim Ekranı</h2>
              </div>
              <div className="flex-grow p-2 md:p-8 lg:p-12 overflow-y-auto">{renderStepContent()}</div>
          </GlassPanel>
      </div>
    );
}