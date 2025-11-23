'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Loader2, BookOpen, Columns, LayoutTemplate, Shield, PenSquare, UserCog, FileCog, FileQuestion, ClipboardList, ClipboardCheck, Scale, BarChart3, Video, Settings, Trophy, Bug, DollarSign, Workflow, MonitorPlay, Gamepad2, Sun, ArrowRight } from 'lucide-react';
import { AppHeader } from "@/components/app-header";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TeacherMainButtons } from "@/components/teacher-main-buttons";
import type { PublicClass } from './actions/getPublicCurriculum';
import React, { type ReactNode } from "react";
import { cn } from '@/lib/utils';


const LoggedOutPage = ({ classGroups }: { classGroups: PublicClass[] }) => {
    if (classGroups.length === 0) {
        return (
            <div className="flex flex-col min-h-screen">
                <AppHeader />
                <main className="flex-1 flex flex-col items-center justify-center p-4">
                    <p className="text-center text-muted-foreground py-8">Gösterilecek herkese açık ders bulunmuyor.</p>
                </main>
            </div>
        );
    }
    
    return (
        <div className="flex flex-col min-h-screen bg-grid">
             <AppHeader />
             <main className="flex-1 container mx-auto p-4 sm:p-6 md:p-8 space-y-8">
                 <div className="text-center">
                    <h1 className="text-4xl sm:text-5xl font-bold font-headline text-primary drop-shadow-lg">Değerler Oyunu</h1>
                    <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                        Eğlenerek öğrenmeye hoş geldiniz! Aşağıdaki ders içeriklerini keşfedin veya
                        yarışmalara katılmak için giriş yapın.
                    </p>
                 </div>
                 
                <Accordion type="multiple" className="w-full space-y-4">
                    {classGroups.map((group) => (
                        <AccordionItem value={group.name} key={group.name} className="border rounded-lg bg-card shadow-sm">
                            <AccordionTrigger className="p-4 text-xl sm:text-2xl font-semibold hover:no-underline">
                                {group.name === 'Genel' ? 'Genel Dersler' : `${group.name}. Sınıflar`}
                            </AccordionTrigger>
                            <AccordionContent className="p-4 pt-0">
                                <Accordion type="multiple" className="w-full space-y-3">
                                    {group.courses.map((course) => (
                                        <AccordionItem value={course.id} key={course.id} className="border rounded-md bg-background">
                                            <AccordionTrigger className="p-3 text-lg font-medium hover:no-underline [&[data-state=open]>svg]:text-primary">
                                                {course.title}
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
                    ))}
                </Accordion>
            </main>
        </div>
    );
};

const ManagementButton = ({ href, title, icon }: { href: string, title: string, icon: ReactNode }) => {
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
    summerContent: {
       key: 'summerContent', href: "/teacher/summer-school/content-creation", title: "Yaz Kursu İçerik", icon: <Sun />,
    },
    studentsTeacher: {
        key: 'studentsTeacher', href: '/teacher/students', title: 'Öğrenci Yönetimi', icon: <UserCog />,
    },
    summerStudents: {
        key: 'summerStudents', href: '/teacher/summer-school/students', title: 'Yaz Kursu Öğrencileri', icon: <UserCog />,
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
          managementButtons.summerContent,
          managementButtons.studentsTeacher,
          managementButtons.summerStudents,
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


export function PageContent({ classGroups }: { classGroups: PublicClass[] }) {
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
    
    return <LoggedOutPage classGroups={classGroups} />;
}
