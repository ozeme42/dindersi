
'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Loader2, BookOpen, Columns, LayoutTemplate, Shield, PenSquare, UserCog, FileCog, FileQuestion, ClipboardList, ClipboardCheck, Scale, BarChart3, Video, Settings, Trophy, Bug, DollarSign, LogIn, ListOrdered, Smartphone } from 'lucide-react';
import React from 'react';
import { AppHeader } from "@/components/app-header";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TeacherMainButtons } from "@/components/teacher-main-buttons";
import type { CourseGroup } from './actions/getPublicCurriculum';
import { cn } from '@/lib/utils';


const LoggedOutPage = ({ courseGroups }: { courseGroups: CourseGroup[] }) => {
    if (courseGroups.length === 0) {
        return (
            <div className="flex flex-col min-h-screen">
                
                <main className="flex-1 flex flex-col items-center justify-center p-4">
                    <p className="text-center text-muted-foreground py-8">Gösterilecek herkese açık ders bulunmuyor.</p>
                </main>
            </div>
        );
    }

    const groupColorClasses = [
        'bg-chart-1 text-white', 'bg-chart-2 text-white', 'bg-chart-3 text-white',
        'bg-chart-4 text-white', 'bg-chart-5 text-white', 'bg-accent text-accent-foreground'
    ];
    
    const classColorMap: { [key: string]: string } = {
        '5': 'bg-sky-600',
        '6': 'bg-emerald-600',
        '7': 'bg-amber-600',
        '8': 'bg-rose-600',
        'Lise': 'bg-indigo-600',
        'Genel': 'bg-slate-600',
    };
    const defaultClassColor = 'bg-gray-600';
    
    return (
        <div className="flex flex-col min-h-screen bg-grid pb-20 md:pb-8">
             
             <main className="flex-1 container mx-auto p-4 sm:p-6 md:p-8 space-y-8">
                <div className="flex justify-center gap-4 flex-wrap">
                    <Button asChild size="lg">
                        <Link href="/login">
                            <LogIn className="mr-2 h-5 w-5" />
                            Giriş Yap
                        </Link>
                    </Button>
                    <Button asChild variant="outline" size="lg">
                        <Link href="/leaderboard">
                            <ListOrdered className="mr-2 h-5 w-5" />
                            Liderlik Tablosu
                        </Link>
                    </Button>
                </div>
                 
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                    {courseGroups.map((group, groupIndex) => (
                        <Accordion type="multiple" defaultValue={[group.title]} className="w-full space-y-4" key={group.title}>
                            <AccordionItem value={group.title} className="border rounded-lg bg-card/30 shadow-sm overflow-hidden backdrop-blur-sm">
                                <AccordionTrigger className={cn("p-4 text-xl sm:text-2xl font-semibold hover:no-underline", groupColorClasses[groupIndex % groupColorClasses.length])}>
                                {group.title}
                                </AccordionTrigger>
                                <AccordionContent className="p-4 pt-4">
                                    <Accordion type="multiple" defaultValue={group.courses.map(course => course.id)} className="w-full space-y-3">
                                        {group.courses.map((course) => (
                                            <AccordionItem value={course.id} key={course.id} className="border rounded-md bg-background overflow-hidden">
                                                <AccordionTrigger className={cn("p-3 text-lg font-medium hover:no-underline [&[data-state=open]>svg]:text-primary text-white", classColorMap[course.className] || defaultClassColor)}>
                                                    {course.className === 'Genel' ? 'Genel Dersler' : `${course.className}. Sınıf`}
                                                </AccordionTrigger>
                                                <AccordionContent className="p-3">
                                                    {course.units.length > 0 ? (
                                                        <Accordion type="multiple" className="w-full space-y-2">
                                                            {course.units.map(unit => (
                                                                <AccordionItem value={unit.id} key={unit.id} className="border-b-0">
                                                                    <AccordionTrigger className="font-semibold text-base py-2">{unit.title}</AccordionTrigger>
                                                                    <AccordionContent className="pt-2 pl-4">
                                                                        <div className="space-y-1">
                                                                            {unit.topics.map(topic => (
                                                                                <div key={topic.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                                                                                    <span className="font-medium">{topic.title}</span>
                                                                                    <div className="flex gap-2">
                                                                                        {topic.hasYazilacaklarContent && (
                                                                                            <Button asChild variant="outline" size="sm">
                                                                                                <Link href={`/yazilacaklar/${course.id}/${unit.id}/${topic.id}`}><Columns className="h-4 w-4 mr-2"/>Yazılacaklar</Link>
                                                                                            </Button>
                                                                                        )}
                                                                                        {topic.hasOzetContent && (
                                                                                            <Button asChild variant="outline" size="sm">
                                                                                                <Link href={`/ozetler/${course.id}/${unit.id}/${topic.id}`}><LayoutTemplate className="h-4 w-4 mr-2"/>Özet</Link>
                                                                                            </Button>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </AccordionContent>
                                                                </AccordionItem>
                                                            ))}
                                                        </Accordion>
                                                    ) : <p className="text-sm text-muted-foreground p-2">Bu ders için henüz ünite eklenmemiş.</p>}
                                                </AccordionContent>
                                            </AccordionItem>
                                        ))}
                                    </Accordion>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    ))}
                </div>
            </main>
             <footer className="container mx-auto p-8 text-center">
                <div className="flex justify-center gap-4 flex-wrap">
                    <Button asChild size="lg" className="bg-green-600 hover:bg-green-700">
                        <a href="https://drive.google.com/file/d/19J9e8KGlR_H2VxKgsegfp3EnmcClR16E/view?usp=drive_link" target="_blank" rel="noopener noreferrer">
                            <Smartphone className="mr-2 h-5 w-5" />
                            Android Uygulamasını İndir
                        </a>
                    </Button>
                    <Button asChild size="lg" className="bg-sky-600 hover:bg-sky-700">
                        <a href="https://vimeo.com/user248310384" target="_blank" rel="noopener noreferrer">
                            <Video className="mr-2 h-5 w-5" />
                            Videolar
                        </a>
                    </Button>
                </div>
            </footer>
        </div>
    );
};

const ManagementButton = ({ href, title, icon }: { href: string, title: string, icon: React.ReactNode }) => {
    return (
        <Link href={href} className="block group">
            <div className="p-4 rounded-lg flex flex-col items-center justify-center text-center shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300 h-40 bg-background hover:bg-muted border">
                {React.cloneElement(icon as React.ReactElement, { className: "h-10 w-10 text-primary mb-2" })}
                <h3 className="font-semibold text-base text-foreground leading-tight">{title}</h3>
            </div>
        </Link>
    );
};

const LoggedInDashboard = ({ user }: { user: any }) => {
    const router = useRouter();

    if (user.role === 'student') {
        router.replace('/student');
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
  
  const managementButtons = {
    superAdmin: {
      key: 'superAdmin', href: '/teacher/superadmin', title: 'Süper Admin', icon: <Shield />,
    },
    contentTeacher: {
      key: 'contentTeacher', href: "/teacher/content-creation", title: "İçerik Yönetimi", icon: <PenSquare />,
    },
    studentsTeacher: {
        key: 'studentsTeacher', href: '/teacher/students', title: 'Öğrenci Yönetimi', icon: <UserCog />,
    },
    questionsTeacher: {
        key: 'questionsTeacher', href: '/teacher/questions', title: 'Soru Bankası', icon: <FileCog />,
    },
    examQuestions: {
        key: 'examQuestions', href: '/teacher/exam-questions', title: 'Deneme Havuzu', icon: <FileQuestion />,
    },
    activityDataBank: {
        key: 'activityDataBank', href: '/teacher/activity-data', title: 'Etkinlik Veri Bankası', icon: <ClipboardList />,
    },
    exams: {
      key: 'exams', href: '/teacher/exams', title: 'Deneme Oluşturma', icon: <ClipboardCheck />,
    },
    evaluationScales: {
        key: 'evaluationScales', href: '/teacher/scales', title: 'Değerlendirme Ölçekleri', icon: <Scale />,
    },
    statsTeacher: {
        key: 'statsTeacher', href: '/teacher/stats', title: 'İstatistikler', icon: <BarChart3 />,
    },
    videoLibrary: {
        key: 'videoLibrary', href: '/teacher/video-library', title: 'Video Arşivi', icon: <Video />,
    },
    gameSettingsTeacher: {
        key: 'gameSettingsTeacher', href: '/teacher/game-settings', title: 'Oyun Ayarları', icon: <Settings />,
    },
    leaderboard: {
      key: 'leaderboard', href: "/leaderboard", title: "Liderlik Tablosu", icon: <Trophy />,
    },
    errorReports: {
      key: 'errorReports', href: '/teacher/error-reports', title: 'Hata Raporları', icon: <Bug />,
    },
    scoreEvents: {
      key: 'scoreEvents', href: '/teacher/score-events', title: 'Puan Hareketleri', icon: <DollarSign />,
    },
  };

  const getManagementButtons = () => {
      const buttons = [
          managementButtons.contentTeacher,
          managementButtons.studentsTeacher,
          managementButtons.questionsTeacher,
          managementButtons.examQuestions,
          managementButtons.activityDataBank,
          managementButtons.exams,
          managementButtons.evaluationScales,
          managementButtons.statsTeacher,
          managementButtons.videoLibrary,
          managementButtons.gameSettingsTeacher,
          managementButtons.leaderboard,
          managementButtons.errorReports,
          managementButtons.scoreEvents,
      ];
      if(user.role === 'superadmin') {
          buttons.unshift(managementButtons.superAdmin);
      }
      return buttons;
  }
  
  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader />
      <main className="flex-1 container mx-auto p-4 sm:p-6 md:p-8 space-y-12">
        <div className="text-center animate-fade-in-up">
          <h1 className="font-headline text-5xl md:text-7xl font-bold text-primary">Değerler Oyunu</h1>
          <p className="text-muted-foreground mt-4 text-xl md:text-2xl">
             {user.role === 'teacher' ? 'Öğretmen Paneli' : user.role === 'superadmin' ? 'Süper Admin Paneli' : 'Değerlerimizi Eğlenerek Öğrenelim'}
          </p>
        </div>
        
         <TeacherMainButtons />

        <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1" className="border rounded-lg bg-card shadow-sm">
                <AccordionTrigger className="p-4 text-xl font-semibold hover:no-underline">
                     <div>
                        <h3 className="text-xl font-semibold">Tüm Yönetim Panelleri</h3>
                        <p className="text-sm text-muted-foreground text-left">Tüm yönetimsel araçlara buradan erişebilirsiniz.</p>
                    </div>
                </AccordionTrigger>
                <AccordionContent className="p-4 pt-0">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {getManagementButtons().map(({ key, href, title, icon }) =>
                            <ManagementButton key={key} href={href} title={title} icon={icon} />
                        )}
                    </div>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
      </main>
    </div>
  );
};


export function PageContent({ courseGroups }: { courseGroups: CourseGroup[] }) {
    const { user, loading } = useAuth();
    
    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    if (user) {
        return <LoggedInDashboard user={user} />;
    }
    
    return <LoggedOutPage courseGroups={courseGroups} />;
}
