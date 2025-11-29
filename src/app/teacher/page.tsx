
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
import type { ReactNode } from "react";
import { cn } from '@/lib/utils';

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

        <Card>
            <CardHeader>
                <CardTitle>Tüm Yönetim Panelleri</CardTitle>
                 <CardDescription>Tüm yönetimsel araçlara buradan erişebilirsiniz.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {getManagementButtons().map(({ key, href, title, icon }) =>
                        <ManagementButton key={key} href={href} title={title} icon={icon} />
                    )}
                </div>
            </CardContent>
        </Card>
      </main>
    </div>
  );
};


export default function TeacherPage() {
    const { user, loading } = useAuth();
    
    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    if (user && (user.role === 'teacher' || user.role === 'superadmin')) {
        return <LoggedInDashboard user={user} />;
    }

    // This part should theoretically not be reached due to AuthGuard,
    // but it's good practice to have a fallback.
    return (
        <div className="flex h-screen items-center justify-center">
            <p>Erişim yetkiniz yok veya bir hata oluştu.</p>
        </div>
    );
}

