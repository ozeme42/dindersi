
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
    Loader2, BookOpen, Columns, LayoutTemplate, Shield, PenSquare, UserCog, 
    FileCog, FileQuestion, ClipboardList, ClipboardCheck, Scale, BarChart3, 
    Video, Settings, Trophy, Bug, DollarSign, LogIn, ListOrdered, Smartphone, 
    Gamepad2, Star, Sparkles, ChevronDown, PlayCircle, Menu, X, User
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';
import type { PublicCourse } from './actions/getPublicCurriculum';
import { getPublicCurriculum } from './actions/getPublicCurriculum';

// --- UI COMPONENTS (SHADCN REPLACEMENTS) ---

const Button = ({ children, className, variant = 'default', size = 'default', asChild, ...props }: any) => {
    const variants: any = {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
    };
    
    const sizes: any = {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
    };

    const Comp = asChild ? 'span' : 'button';
    return (
        <Comp 
            className={cn(
                "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                variants[variant] || variants.default,
                sizes[size] || sizes.default,
                className
            )}
            {...props}
        >
            {children}
        </Comp>
    );
};

const Accordion = ({ type, defaultValue, className, children }: any) => {
    const [openItems, setOpenItems] = useState<string[]>(Array.isArray(defaultValue) ? defaultValue : (defaultValue ? [defaultValue] : []));

    const toggleItem = (value: string) => {
        if (type === 'single') {
            setOpenItems(openItems.includes(value) ? [] : [value]);
        } else {
            setOpenItems(prev => prev.includes(value) ? prev.filter(i => i !== value) : [...prev, value]);
        }
    };

    return (
        <div className={className}>
            {React.Children.map(children, child => {
                if (React.isValidElement(child)) {
                    return React.cloneElement(child, { openItems, toggleItem } as any);
                }
                return child;
            })}
        </div>
    );
};

const AccordionItem = ({ value, children, className, openItems, toggleItem }: any) => {
    const isOpen = openItems?.includes(value);
    return (
        <div className={cn("border-b", className)}>
            {React.Children.map(children, child => {
                if (React.isValidElement(child)) {
                    if (typeof child.type === 'string') {
                        return child;
                    }
                    return React.cloneElement(child, { isOpen, onClick: () => toggleItem(value) } as any);
                }
                return child;
            })}
        </div>
    );
};

const AccordionTrigger = ({ children, className, isOpen, onClick }: any) => (
    <button
        onClick={onClick}
        className={cn(
            "flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180 w-full text-left",
            className
        )}
        data-state={isOpen ? "open" : "closed"}
    >
        {children}
        <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform duration-200", isOpen ? "rotate-180" : "")} />
    </button>
);

const AccordionContent = ({ children, className, isOpen }: any) => (
    <div className={cn("overflow-hidden text-sm transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down", isOpen ? "block" : "hidden", className)}>
        <div className="pb-4 pt-0">{children}</div>
    </div>
);

// --- APP COMPONENTS ---

const AppHeader = () => (
    <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur-sm">
        <div className="container flex h-16 items-center justify-between px-4">
            <div className="flex items-center gap-2 font-bold text-xl bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600">
                <Gamepad2 className="h-6 w-6 text-indigo-500" />
                <span>Değerler Oyunu</span>
            </div>
            <div className="flex items-center gap-4">
                 <div className="hidden md:flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <span className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 px-3 py-1 rounded-full">v2.0 Beta</span>
                 </div>
                 <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-5 w-5" />
                 </Button>
                 <Button variant="ghost" size="icon" className="hidden md:flex">
                    <User className="h-5 w-5" />
                 </Button>
            </div>
        </div>
    </header>
);

// --- GAME THEME COMPONENTS ---

const GameButton = ({ children, className, variant = 'primary', href, target, ...props }: any) => {
    const variants: {[key: string]: string} = {
        primary: "bg-indigo-500 hover:bg-indigo-400 border-indigo-700 text-white shadow-indigo-900/20",
        secondary: "bg-rose-500 hover:bg-rose-400 border-rose-700 text-white shadow-rose-900/20",
        success: "bg-emerald-500 hover:bg-emerald-400 border-emerald-700 text-white shadow-emerald-900/20",
        warning: "bg-amber-500 hover:bg-amber-400 border-amber-700 text-white shadow-amber-900/20",
        info: "bg-sky-500 hover:bg-sky-400 border-sky-700 text-white shadow-sky-900/20",
        dark: "bg-slate-700 hover:bg-slate-600 border-slate-900 text-white shadow-slate-900/20",
    };

    const baseClass = "relative inline-flex items-center justify-center font-bold uppercase tracking-wide transition-all duration-200 border-b-[6px] active:border-b-0 active:translate-y-[6px] rounded-2xl py-3 px-6 shadow-xl group cursor-pointer";
    
    const content = (
        <span className={cn(baseClass, variants[variant], className)} {...props}>
            {children}
        </span>
    );

    if (href) {
        return <Link href={href} target={target} className="inline-block">{content}</Link>;
    }
    return <button className="inline-block">{content}</button>;
};

const GlassCard = ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <div className={cn(
        "backdrop-blur-md bg-white/10 dark:bg-black/20 border-2 border-white/20 dark:border-white/5 rounded-3xl shadow-2xl overflow-hidden",
        className
    )}>
        {children}
    </div>
);

type CourseData = {
    name: string;
    courses: PublicCourse[];
}

const LoggedOutPage = ({ courseGroups }: { courseGroups: { name: string; courses: PublicCourse[] }[] }) => {
    if (courseGroups.length === 0) {
        return (
            <div className="flex flex-col min-h-screen bg-[#2b1055] items-center justify-center p-4">
                 <div className="text-center p-8 rounded-3xl bg-white/10 backdrop-blur-lg border border-white/20">
                    <Gamepad2 className="w-16 h-16 text-white/50 mx-auto mb-4" />
                    <p className="text-white text-xl font-bold">Gösterilecek herkese açık macera bulunmuyor.</p>
                </div>
            </div>
        );
    }

    const groupColors = [
        'from-purple-500 to-indigo-600', 
        'from-pink-500 to-rose-600', 
        'from-emerald-400 to-teal-600',
        'from-amber-400 to-orange-600', 
        'from-sky-400 to-blue-600'
    ];
    
    const classColorMap: { [key: string]: string } = {
        '5': 'text-sky-500',
        '6': 'text-emerald-500',
        '7': 'text-amber-500',
        '8': 'text-rose-500',
        'Lise': 'text-indigo-500',
        'Genel': 'text-slate-500',
    };
    
    // Group courses by title first, then by class name inside
    const groupedByCourseTitle = courseGroups.reduce((acc, group) => {
        group.courses.forEach(course => {
            const courseTitle = course.title || 'Diğer Dersler';
            if(!acc[courseTitle]) {
                acc[courseTitle] = { title: courseTitle, coursesByClass: {} };
            }
            const className = group.name || 'Genel';
            if(!acc[courseTitle].coursesByClass[className]) {
                acc[courseTitle].coursesByClass[className] = [];
            }
            acc[courseTitle].coursesByClass[className].push(course);
        });
        return acc;
    }, {} as {[key:string]: {title: string, coursesByClass: {[key: string]: PublicCourse[]}}});


    return (
        <div className="flex flex-col min-h-screen bg-[#2b1055] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900 via-[#2b1055] to-black pb-20 md:pb-8 font-sans selection:bg-purple-500/30 text-white">
             
             <main className="flex-1 container mx-auto p-4 sm:p-6 md:p-8 space-y-8 relative z-10">
                <div className="flex flex-col items-center justify-center py-10 space-y-6">
                    <div className="relative">
                        <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 opacity-75 blur-xl animate-pulse"></div>
                        <h1 className="relative text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-100 to-white drop-shadow-sm text-center tracking-tight">
                            DEĞERLER OYUNU
                        </h1>
                    </div>
                    
                    <div className="flex gap-4 flex-wrap justify-center mt-8">
                        <GameButton href="/login" variant="success" className="text-lg min-w-[160px]">
                            <LogIn className="mr-2 h-6 w-6" /> Giriş Yap
                        </GameButton>
                        <GameButton href="/leaderboard" variant="warning" className="text-lg min-w-[160px]">
                            <Trophy className="mr-2 h-6 w-6" /> Liderlik
                        </GameButton>
                    </div>
                </div>
                 
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {Object.values(groupedByCourseTitle).map((group, groupIndex) => (
                        <div key={group.title} className="space-y-4">
                            <GlassCard>
                                <Accordion type="multiple" defaultValue={[group.title]} className="w-full border-none">
                                    <AccordionItem value={group.title} className="border-none">
                                        <AccordionTrigger className={cn(
                                            "px-6 py-5 text-xl sm:text-2xl font-black text-white hover:no-underline rounded-t-3xl data-[state=closed]:rounded-b-3xl transition-all",
                                            `bg-gradient-to-r ${groupColors[groupIndex % groupColors.length]}`
                                        )}>
                                            <div className="flex items-center gap-3">
                                                <Star className="h-6 w-6 text-yellow-300 fill-yellow-300" />
                                                {group.title}
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="p-0 bg-white/5">
                                            <div className="p-4 space-y-3">
                                                <Accordion type="multiple" className="w-full space-y-3">
                                                    {Object.entries(group.coursesByClass).map(([className, courses]) => (
                                                        <AccordionItem 
                                                            value={className} 
                                                            key={className} 
                                                            className="border-none bg-white/5 rounded-2xl overflow-hidden border border-white/10"
                                                        >
                                                            <AccordionTrigger className="px-4 py-3 hover:bg-white/5 hover:no-underline transition-colors">
                                                                <div className="flex items-center gap-3">
                                                                    <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center font-bold text-lg bg-white shadow-sm", classColorMap[className])}>
                                                                        {className === 'Genel' ? 'G' : className}
                                                                    </div>
                                                                    <span className="text-lg font-bold text-white/90">
                                                                        {className === 'Genel' ? 'Genel Maceralar' : `${className}. Sınıf Seviyesi`}
                                                                    </span>
                                                                </div>
                                                            </AccordionTrigger>
                                                            <AccordionContent className="px-4 pb-4 pt-0">
                                                            {courses.map(course => (
                                                                <div key={course.id} className="mt-2 space-y-2 pl-3 border-l-2 border-dashed border-white/20 ml-5">
                                                                    {course.units.length > 0 ? (
                                                                        <Accordion type="multiple">
                                                                            {course.units.map(unit => (
                                                                            <AccordionItem value={unit.id} key={unit.id} className="border-none">
                                                                                <AccordionTrigger className="flex items-center gap-2 mb-2 text-indigo-300 font-bold uppercase text-xs tracking-wider hover:no-underline py-2">
                                                                                    <div className="justify-start flex items-center gap-2 w-full">
                                                                                        <div className="h-1.5 w-1.5 rounded-full bg-indigo-400"></div>
                                                                                        <span>{unit.title}</span>
                                                                                    </div>
                                                                                </AccordionTrigger>
                                                                                <AccordionContent className="space-y-2">
                                                                                    {unit.topics.map(topic => (
                                                                                        <div key={topic.id} className="group/topic flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-black/20 hover:bg-black/40 p-3 rounded-xl transition-all border border-transparent hover:border-white/10">
                                                                                            <div className="flex items-center gap-3">
                                                                                                <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center group-hover/topic:scale-110 transition-transform">
                                                                                                    <Sparkles className="h-4 w-4 text-yellow-200" />
                                                                                                </div>
                                                                                                <span className="font-medium text-white/90">{topic.title}</span>
                                                                                            </div>
                                                                                            <div className="flex gap-2 self-end sm:self-center">
                                                                                                {topic.hasYazilacaklarContent && (
                                                                                                    <Link href={`/yazilacaklar/${course.id}/${unit.id}/${topic.id}`} className="flex items-center gap-1 bg-sky-600/80 hover:bg-sky-500 text-white text-xs font-bold py-1.5 px-3 rounded-lg transition-colors border-b-2 border-sky-800 active:border-b-0 active:translate-y-[2px]">
                                                                                                        <Columns className="h-3.5 w-3.5"/> Yazılacaklar
                                                                                                    </Link>
                                                                                                )}
                                                                                                {topic.hasOzetContent && (
                                                                                                    <Link href={`/ozetler/${course.id}/${unit.id}/${topic.id}`} className="flex items-center gap-1 bg-amber-600/80 hover:bg-amber-500 text-white text-xs font-bold py-1.5 px-3 rounded-lg transition-colors border-b-2 border-amber-800 active:border-b-0 active:translate-y-[2px]">
                                                                                                        <BookOpen className="h-3.5 w-3.5"/> Özet
                                                                                                    </Link>
                                                                                                )}
                                                                                            </div>
                                                                                        </div>
                                                                                    ))}
                                                                                </AccordionContent>
                                                                            </AccordionItem>
                                                                            ))}
                                                                        </Accordion>
                                                                    ) : <p className="text-sm text-white/40 italic p-2">Henüz görev eklenmemiş.</p>}
                                                                </div>
                                                                ))}
                                                            </AccordionContent>
                                                        </AccordionItem>
                                                    ))}
                                                </Accordion>
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                </Accordion>
                            </GlassCard>
                        </div>
                    ))}
                </div>
            </main>

            <footer className="container mx-auto p-8 text-center relative z-10">
                <div className="flex justify-center gap-6 flex-wrap">
                    <GameButton 
                        href="https://drive.google.com/file/d/19J9e8KGlR_H2VxKgsegfp3EnmcClR16E/view?usp=drive_link" 
                        variant="secondary"
                        className="text-sm px-8"
                    >
                        <Smartphone className="mr-2 h-5 w-5" />
                        Android Uygulaması
                    </GameButton>
                    <GameButton 
                        href="https://vimeo.com/user248310384" 
                        variant="info"
                        className="text-sm px-8"
                    >
                        <Video className="mr-2 h-5 w-5" />
                        Video Galerisi
                    </GameButton>
                </div>
                <p className="text-white/30 text-xs mt-8 font-medium tracking-widest uppercase">Eğlenerek Öğrenmenin Adresi</p>
            </footer>
        </div>
    );
};


export default function App() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [courseGroups, setCourseGroups] = useState<{ name: string; courses: PublicCourse[] }[]>([]);
    const [dataLoading, setDataLoading] = useState(true);

    useEffect(() => {
        if (!loading && user) {
            if (user.role === 'student') {
                router.replace('/student');
            } else if (user.role === 'teacher' || user.role === 'superadmin') {
                router.replace('/teacher');
            }
        }
    }, [user, loading, router]);

    useEffect(() => {
        if (!user) {
            setDataLoading(true);
            getPublicCurriculum()
                .then(data => {
                    setCourseGroups(data.classGroups || []);
                })
                .finally(() => {
                    setDataLoading(false);
                });
        } else {
            setDataLoading(false);
        }
    }, [user]);

    if (loading || dataLoading || user) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#2b1055]">
                <Loader2 className="h-12 w-12 animate-spin text-white" />
            </div>
        );
    }
    
    return (
        <div className="relative">
            <LoggedOutPage courseGroups={courseGroups} />
        </div>
    );
}
    
