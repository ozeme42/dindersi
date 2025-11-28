"use client";

import { useState, useEffect } from "react";
import { 
    ArrowLeft, ArrowRight, Check, Book, Library, ListTodo, 
    PartyPopper, Lightbulb, Gamepad2, Star, ChevronRight, Lock 
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- MOCK LINK COMPONENT (Fix for next/link error) ---
const Link = ({ href, children, className, ...props }: any) => (
    <a href={href} className={className} {...props}>
        {children}
    </a>
);

// --- UI COMPONENTS ---

const GlassCard = ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <div className={cn(
        "backdrop-blur-xl bg-[#1a0b2e]/60 border-2 border-white/10 rounded-3xl shadow-2xl overflow-hidden relative transition-all duration-300",
        className
    )}>
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50"></div>
        {children}
    </div>
);

const GameButton = ({ children, onClick, active, disabled, className }: any) => (
    <button 
        onClick={onClick}
        disabled={disabled}
        className={cn(
            "relative w-full group overflow-hidden rounded-2xl p-4 transition-all duration-200 border-b-[4px] active:border-b-0 active:translate-y-[4px]",
            active 
                ? "bg-indigo-600 border-indigo-800 text-white shadow-[0_0_20px_rgba(79,70,229,0.5)] scale-[1.02]" 
                : "bg-slate-800 border-slate-950 text-slate-300 hover:bg-slate-700",
            disabled && "opacity-50 cursor-not-allowed filter grayscale",
            className
        )}
    >
        <div className="relative z-10 flex items-center justify-between">
            {children}
            {active && <div className="absolute inset-0 bg-white/10 animate-pulse rounded-2xl" />}
        </div>
    </button>
);

// --- MOCK DATA (Simüle Edilmiş Veriler) ---
// Gerçek entegrasyonda burayı Firebase verileriyle değiştireceksiniz.
const MOCK_COURSES = [
    { id: 'c1', title: 'Matematik', className: '6. Sınıf', icon: '📐' },
    { id: 'c2', title: 'Fen Bilimleri', className: '6. Sınıf', icon: '🧬' },
    { id: 'c3', title: 'Türkçe', className: '6. Sınıf', icon: '📚' },
    { id: 'c4', title: 'Sosyal Bilgiler', className: '6. Sınıf', icon: '🌍' },
];

const MOCK_UNITS = [
    { id: 'u1', title: 'Doğal Sayılar' },
    { id: 'u2', title: 'Kümeler' },
    { id: 'u3', title: 'Tam Sayılar' },
    { id: 'all', title: 'Tüm Üniteler (Karışık)' },
];

const MOCK_TOPICS = [
    { id: 't1', title: 'Üslü İfadeler' },
    { id: 't2', title: 'İşlem Önceliği' },
    { id: 't3', title: 'Dağılma Özelliği' },
    { id: 'all', title: 'Tüm Konular (Karışık)' },
];

// --- MAIN PAGE ---

const steps = [
  { id: 1, name: "Ders", icon: Book },
  { id: 2, name: "Ünite", icon: Library },
  { id: 3, name: "Konu", icon: ListTodo },
  { id: 4, name: "Başlat", icon: Gamepad2 },
];

export default function BilBakalimSetupClientPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  
  // Selection State
  const [selection, setSelection] = useState({
    courseId: "",
    courseName: "",
    unitId: "",
    unitName: "",
    topicId: "",
    topicName: "",
  });

  // Mock Data Loading Simulation
  const [courses, setCourses] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);

  useEffect(() => {
    // Initial Load
    setCourses(MOCK_COURSES);
  }, []);

  const handleSelectCourse = (id: string, name: string) => {
    setSelection({ ...selection, courseId: id, courseName: name, unitId: '', unitName: '', topicId: '', topicName: '' });
    // Simulate API fetch for units
    setIsLoading(true);
    setTimeout(() => {
        setUnits(MOCK_UNITS);
        setIsLoading(false);
        setCurrentStep(2);
    }, 400);
  };

  const handleSelectUnit = (id: string, name: string) => {
    setSelection({ ...selection, unitId: id, unitName: name, topicId: '', topicName: '' });
    if (id === 'all') {
        setSelection(prev => ({ ...prev, unitId: id, unitName: name, topicId: 'all', topicName: 'Tüm Konular' }));
        setCurrentStep(4);
    } else {
        setIsLoading(true);
        setTimeout(() => {
            setTopics(MOCK_TOPICS);
            setIsLoading(false);
            setCurrentStep(3);
        }, 400);
    }
  };
  
  const handleSelectTopic = (id: string, name: string) => {
    setSelection({ ...selection, topicId: id, topicName: name });
    setCurrentStep(4);
  };

  const handleBack = () => {
      if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  // Render Content Based on Step
  const renderStepContent = () => {
      if (isLoading) {
          return (
              <div className="flex flex-col items-center justify-center py-12 space-y-4 animate-pulse">
                  <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-indigo-300 font-bold">Veriler Yükleniyor...</p>
              </div>
          );
      }

      switch(currentStep) {
          case 1: // COURSE SELECTION
            return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in slide-in-from-right-4 duration-300">
                    {courses.map((course) => (
                        <GameButton 
                            key={course.id} 
                            onClick={() => handleSelectCourse(course.id, course.title)}
                            active={selection.courseId === course.id}
                        >
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center text-2xl">
                                    {course.icon}
                                </div>
                                <div className="text-left">
                                    <div className="font-bold text-white">{course.title}</div>
                                    <div className="text-xs text-slate-400">{course.className}</div>
                                </div>
                            </div>
                            {selection.courseId === course.id && <Check className="h-5 w-5 text-indigo-300" />}
                        </GameButton>
                    ))}
                </div>
            );
          case 2: // UNIT SELECTION
            return (
                <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-300">
                    {units.map((unit) => (
                        <GameButton 
                            key={unit.id} 
                            onClick={() => handleSelectUnit(unit.id, unit.title)}
                            active={selection.unitId === unit.id}
                            className={unit.id === 'all' ? 'border-amber-700 bg-amber-900/40 hover:bg-amber-800/40' : ''}
                        >
                            <div className="flex items-center gap-3">
                                {unit.id === 'all' ? <Star className="h-5 w-5 text-amber-400 fill-amber-400" /> : <Library className="h-5 w-5 text-slate-400" />}
                                <span className={cn("font-semibold", unit.id === 'all' ? "text-amber-100" : "text-slate-200")}>{unit.title}</span>
                            </div>
                            <ChevronRight className="h-5 w-5 text-white/20" />
                        </GameButton>
                    ))}
                </div>
            );
          case 3: // TOPIC SELECTION
            return (
                <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-300">
                    {topics.map((topic) => (
                        <GameButton 
                            key={topic.id} 
                            onClick={() => handleSelectTopic(topic.id, topic.title)}
                            active={selection.topicId === topic.id}
                            className={topic.id === 'all' ? 'border-amber-700 bg-amber-900/40 hover:bg-amber-800/40' : ''}
                        >
                            <div className="flex items-center gap-3">
                                {topic.id === 'all' ? <Star className="h-5 w-5 text-amber-400 fill-amber-400" /> : <ListTodo className="h-5 w-5 text-slate-400" />}
                                <span className={cn("font-semibold", topic.id === 'all' ? "text-amber-100" : "text-slate-200")}>{topic.title}</span>
                            </div>
                            {selection.topicId === topic.id ? <Check className="h-5 w-5 text-green-400" /> : <div className="h-4 w-4 rounded-full border border-white/10" />}
                        </GameButton>
                    ))}
                </div>
            );
          case 4: // CONFIRMATION
            return (
                <div className="animate-in zoom-in-95 duration-300">
                    <div className="bg-black/30 rounded-2xl p-6 border border-white/10 text-center space-y-6">
                        <div className="inline-flex p-4 rounded-full bg-green-500/20 ring-4 ring-green-500/10 mb-2">
                            <Lightbulb className="h-12 w-12 text-green-400 animate-pulse" />
                        </div>
                        
                        <div className="space-y-2">
                            <h3 className="text-xl font-bold text-white">Maceraya Hazır Mısın?</h3>
                            <p className="text-slate-400 text-sm">Seçtiğin ayarlarla oyun oluşturulacak.</p>
                        </div>

                        <div className="flex flex-col gap-2 text-sm bg-white/5 p-4 rounded-xl text-left">
                            <div className="flex justify-between items-center p-2 border-b border-white/5">
                                <span className="text-slate-400 flex items-center gap-2"><Book className="h-4 w-4"/> Ders</span>
                                <span className="font-bold text-white">{selection.courseName}</span>
                            </div>
                            <div className="flex justify-between items-center p-2 border-b border-white/5">
                                <span className="text-slate-400 flex items-center gap-2"><Library className="h-4 w-4"/> Ünite</span>
                                <span className="font-bold text-white">{selection.unitName}</span>
                            </div>
                            <div className="flex justify-between items-center p-2">
                                <span className="text-slate-400 flex items-center gap-2"><ListTodo className="h-4 w-4"/> Konu</span>
                                <span className="font-bold text-white">{selection.topicName}</span>
                            </div>
                        </div>

                        <Link href={`/student/bil-bakalim/oyun?courseId=${selection.courseId}`} className="block w-full">
                            <button className="w-full py-4 bg-green-600 hover:bg-green-500 text-white font-black text-lg uppercase tracking-widest rounded-xl shadow-lg shadow-green-900/20 border-b-4 border-green-800 active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center gap-2 group">
                                <PartyPopper className="h-6 w-6 group-hover:rotate-12 transition-transform" />
                                Oyunu Başlat
                            </button>
                        </Link>
                    </div>
                </div>
            );
      }
  };

  return (
    <div className="min-h-screen bg-[#2b1055] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900 via-[#2b1055] to-black p-4 sm:p-6 md:p-8 pb-20 font-sans selection:bg-purple-500/30 text-white flex flex-col items-center">
      
      {/* HEADER */}
      <div className="w-full max-w-2xl flex items-center justify-between mb-8">
          <Link href="/student/activities" className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-colors">
            <ArrowLeft className="h-6 w-6 text-white" />
          </Link>
          <div className="text-center">
              <h1 className="text-2xl font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-purple-200 to-indigo-200 flex items-center gap-2 justify-center">
                  <Lightbulb className="h-6 w-6 text-indigo-400 mb-1" />
                  Bil Bakalım
              </h1>
              <div className="flex items-center gap-1 justify-center text-xs font-bold text-indigo-300/60 mt-1">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  Kurulum Modu
              </div>
          </div>
          <div className="w-12"></div> {/* Spacer for center alignment */}
      </div>

      {/* PROGRESS TRACKER */}
      <div className="w-full max-w-2xl mb-8">
          <div className="relative flex justify-between items-center">
              {/* Connection Line */}
              <div className="absolute top-1/2 left-0 w-full h-1 bg-white/10 -z-10 rounded-full"></div>
              <div 
                className="absolute top-1/2 left-0 h-1 bg-indigo-500 shadow-[0_0_10px_#6366f1] -z-10 rounded-full transition-all duration-500"
                style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
              ></div>

              {steps.map((step) => {
                  const isActive = currentStep >= step.id;
                  const isCurrent = currentStep === step.id;
                  
                  return (
                      <div key={step.id} className="flex flex-col items-center gap-2">
                          <div className={cn(
                              "w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center border-4 transition-all duration-300 z-10",
                              isActive 
                                ? "bg-indigo-600 border-indigo-900 text-white shadow-lg shadow-indigo-500/50 scale-110" 
                                : "bg-[#1a0b2e] border-white/10 text-slate-500"
                          )}>
                              <step.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                          </div>
                          <span className={cn(
                              "text-[10px] uppercase font-bold tracking-wider transition-colors duration-300 absolute -bottom-6 w-20 text-center",
                              isCurrent ? "text-white" : isActive ? "text-indigo-300" : "text-slate-600"
                          )}>
                              {step.name}
                          </span>
                      </div>
                  );
              })}
          </div>
      </div>

      {/* MAIN CONTENT CARD */}
      <GlassCard className="w-full max-w-lg min-h-[400px] flex flex-col">
          {/* Card Header */}
          <div className="p-6 border-b border-white/5 flex justify-between items-center bg-black/20">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  {steps.find(s => s.id === currentStep)?.name} Seçimi
              </h2>
              <div className="text-xs font-mono text-indigo-300 bg-indigo-500/10 px-2 py-1 rounded">
                  ADIM {currentStep}/4
              </div>
          </div>

          {/* Card Content Area */}
          <div className="flex-grow p-6">
              {renderStepContent()}
          </div>

          {/* Navigation Footer */}
          {currentStep < 4 && (
              <div className="p-6 pt-0 mt-auto flex justify-between gap-4">
                  {currentStep > 1 ? (
                      <button 
                        onClick={handleBack}
                        className="px-6 py-3 rounded-xl font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-2"
                      >
                          <ArrowLeft className="h-4 w-4" /> Geri
                      </button>
                  ) : (
                      <div></div>
                  )}
                  
                  <div className="text-xs text-slate-500 flex items-center italic">
                     {currentStep === 1 && !selection.courseId && "Devam etmek için bir ders seçin"}
                     {currentStep === 2 && !selection.unitId && "Bir ünite seçin"}
                  </div>
              </div>
          )}
      </GlassCard>

    </div>
  );
}
