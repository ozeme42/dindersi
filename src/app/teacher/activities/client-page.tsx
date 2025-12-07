
"use client";

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { BrainCircuit, Search, Crosshair, Shuffle, Lightbulb, Puzzle, Gamepad2, ArrowLeft, Skull, Layers, FolderKanban, MousePointerClick, Trophy, ArrowDownUp, Link2, Mic, Pencil, Wind, Package, BookOpen, Coins, ClipboardCheck } from 'lucide-react';
import type { EnrichedClass } from './actions';
import { cn } from '@/lib/utils';
import { SelectionGrid } from '@/components/selection-grid';
import { useSearchParams } from 'next/navigation';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ErrorReportDialog } from '@/components/error-report-dialog';


const activityTypes = [
  { href: '/oyunlar/milyoner-yarismasi', label: 'Milyoner', icon: Trophy },
  { href: '/oyunlar/yazi-tura', label: 'Yazı Tura', icon: Coins },
  { href: '/oyunlar/kavram-yarismasi', label: 'Kavram Yarışması', icon: BrainCircuit },
  { href: '/oyunlar/kelime-avi', label: 'Kelime Avı', icon: Search },
  { href: '/oyunlar/kutu-ac', label: 'Kutu Aç', icon: Package },
  { href: '/oyunlar/kavram-avi', label: 'Kavram Avı', icon: Crosshair },
  { href: '/oyunlar/eslestirme', label: 'Eşleştirme', icon: Puzzle },
  { href: '/oyunlar/cumle-olusturma', label: 'Cümle Ustası', icon: Shuffle },
  { href: '/oyunlar/olay-siralama', label: 'Olay Sıralama', icon: ArrowDownUp },
  { href: '/oyunlar/adam-asmaca', label: 'Adam Asmaca', icon: Skull },
  { href: '/oyunlar/hafiza-kartlari', label: 'Hafıza Kartları', icon: Layers },
  { href: '/oyunlar/kategorilere-ayir', label: 'Kategorize Et', icon: FolderKanban },
  { href: '/oyunlar/hedefi-vur', label: 'Hedefi Vur', icon: MousePointerClick },
  { href: '/oyunlar/bil-bakalim', label: 'Bil Bakalım', icon: Lightbulb },
  { href: '/oyunlar/dogru-yanlis-zinciri', label: 'D/Y Zinciri', icon: Link2 },
  { href: '/oyunlar/ben-kimim', label: 'Ben Kimim?', icon: BrainCircuit },
  { href: '/oyunlar/acik-uclu-cevapla', label: 'Açık Uçlu', icon: Pencil },
  { href: '/oyunlar/ilim-hazinesi', label: 'İlim Hazinesi', icon: BookOpen },
  { href: '/oyunlar/labirent', label: 'Labirent', icon: Puzzle },
  { href: '/oyunlar/soru-coz', label: 'Soru Çöz', icon: ClipboardCheck },
  { href: '/oyunlar/tornado', label: 'Tornado', icon: Wind },
];

export function ActivitiesClientPage({ data }: { data: EnrichedClass[] }) {
  const searchParams = useSearchParams();
  const [selectedClassId, setSelectedClassId] = useState<string | null>(searchParams.get("classId") || null);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(searchParams.get("courseId") || null);
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [infoDialogContent, setInfoDialogContent] = useState({ title: '', description: '' });

  const selectedClassData = useMemo(() => data.find(c => c.id === selectedClassId), [data, selectedClassId]);
  const coursesForSelectedClass = useMemo(() => selectedClassData?.courses || [], [selectedClassData]);
  const selectedCourseData = useMemo(() => coursesForSelectedClass.find(c => c.id === selectedCourseId), [coursesForSelectedClass, selectedCourseId]);

  const handleSelectClass = (classId: string) => {
    setSelectedClassId(classId);
    setSelectedCourseId(null); // Reset course selection
  };
  
  const handleSelectCourse = (courseId: string) => {
    setSelectedCourseId(courseId);
  }

  const handleBack = () => {
      if (selectedCourseId) {
          setSelectedCourseId(null);
      } else if (selectedClassId) {
          setSelectedClassId(null);
      }
  }
  
  const getHeader = () => {
      if (selectedCourseData) {
          return {
              title: '3. Ünite ve Etkinlik Seçimi',
              description: `${selectedClassData?.name} > ${selectedCourseData.title}`
          }
      }
      if (selectedClassData) {
          return {
              title: '2. Ders Seçimi',
              description: selectedClassData.name
          }
      }
      return {
          title: '1. Sınıf Seçimi',
          description: "Etkinlik içeriğini filtrelemek için bir sınıf seçin."
      };
  }
  
  const handleInfoClick = (activityLabel: string) => {
    setInfoDialogContent({
        title: `${activityLabel} İçin Konu Seçimi Gerekli`,
        description: `Bu etkinlik, sorularını doğrudan belirli bir konudan aldığı için, oynamak üzere bir konu seçmeniz gerekmektedir. Lütfen bir üniteyi genişletip, ardından listeden belirli bir konuya tıklayarak etkinliği başlatın.`
    });
    setInfoDialogOpen(true);
  }

  const { title, description } = getHeader();
  
  const colorClasses = [
        'bg-chart-1 hover:bg-chart-1/90', 'bg-chart-2 hover:bg-chart-2/90', 'bg-chart-3 hover:bg-chart-3/90',
        'bg-chart-4 hover:bg-chart-4/90', 'bg-chart-5 hover:bg-chart-5/90', 'bg-accent hover:bg-accent/90',
        'bg-slate-600 hover:bg-slate-700', 'bg-rose-600 hover:bg-rose-700', 'bg-lime-600 hover:bg-lime-700', 'bg-red-600 hover:bg-red-700',
        'bg-purple-600 hover:bg-purple-700', 'bg-sky-600 hover:bg-sky-700', 'bg-blue-600 hover:bg-blue-700', 'bg-pink-600 hover:bg-pink-700'
    ];

  const renderContent = () => {
    if (!selectedClassId) {
        return <SelectionGrid items={data} onSelect={(id, _name) => handleSelectClass(id)} titleKey="name"/>
    }
    
    if (!selectedCourseId) {
        return <SelectionGrid items={coursesForSelectedClass} onSelect={(id, _name) => handleSelectCourse(id)} titleKey="title"/>
    }

    if (selectedCourseData) {
        return (
            <Accordion type="multiple" className="w-full space-y-4">
                {selectedCourseData.units.length > 0 ? (
                    selectedCourseData.units.map(unit => (
                        <AccordionItem value={unit.id} key={unit.id} className="border rounded-lg bg-background">
                            <AccordionTrigger className="p-4 text-2xl font-bold hover:no-underline">
                                {unit.title}
                            </AccordionTrigger>
                            <AccordionContent className="p-4 pt-0">
                                <div className="space-y-3">
                                     <Accordion type="multiple" className="w-full">
                                        <AccordionItem value="all-topics" className="border rounded-md bg-muted/50">
                                            <AccordionTrigger className="p-3 text-lg font-semibold hover:no-underline text-primary">
                                                Tüm Konular (Genel Etkinlikler)
                                            </AccordionTrigger>
                                            <AccordionContent className="p-4">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                                    {activityTypes.sort((a,b) => a.label.localeCompare(b.label, 'tr')).map((activity, activityIndex) => {
                                                         const buttonProps = {
                                                             size: "lg" as const,
                                                             className: cn(
                                                                "h-24 text-lg text-primary-foreground flex flex-col items-center justify-center gap-1",
                                                                colorClasses[activityIndex % colorClasses.length]
                                                             )
                                                         };

                                                         return (
                                                            <Button key={activity.href} asChild {...buttonProps}>
                                                                <Link href={`${activity.href}?classId=${selectedClassData.id}&courseId=${selectedCourseData.id}&unitId=${unit.id}&topicId=all&courseName=${encodeURIComponent(selectedCourseData.title)}&unitName=${encodeURIComponent(unit.title)}&topicName=${encodeURIComponent("Tüm Konular")}`}>
                                                                    <activity.icon className="h-6 w-6 mb-1" />
                                                                    <span>{activity.label}</span>
                                                                </Link>
                                                            </Button>
                                                         );
                                                    })}
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>
                                     </Accordion>
                                    {unit.topics.length > 0 ? (
                                        <Accordion type="multiple" className="w-full space-y-3">
                                            {unit.topics.map(topic => (
                                                <AccordionItem value={topic.id} key={topic.id} className="border rounded-md bg-background">
                                                    <AccordionTrigger className="p-3 text-lg font-semibold hover:no-underline">
                                                        {topic.title}
                                                    </AccordionTrigger>
                                                    <AccordionContent className="p-4">
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                                            {activityTypes.sort((a,b) => a.label.localeCompare(b.label, 'tr')).map((activity, activityIndex) => (
                                                                <Button
                                                                    asChild
                                                                    key={activity.href}
                                                                    size="lg"
                                                                    className={cn(
                                                                        "h-24 text-lg text-primary-foreground flex flex-col items-center justify-center gap-1",
                                                                        colorClasses[activityIndex % colorClasses.length]
                                                                    )}
                                                                >
                                                                    <Link href={`${activity.href}?classId=${selectedClassData.id}&courseId=${selectedCourseData.id}&unitId=${unit.id}&topicId=${topic.id}&courseName=${encodeURIComponent(selectedCourseData.title)}&unitName=${encodeURIComponent(unit.title)}&topicName=${encodeURIComponent(topic.title)}`}>
                                                                        <activity.icon className="h-6 w-6 mb-1" />
                                                                        <span>{activity.label}</span>
                                                                    </Link>
                                                                </Button>
                                                            ))}
                                                        </div>
                                                    </AccordionContent>
                                                </AccordionItem>
                                            ))}
                                        </Accordion>
                                    ) : (
                                        <p className="pl-4 text-sm text-muted-foreground">Bu ünite için konu bulunmuyor.</p>
                                    )}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    ))
                ) : (
                    <p className="text-center text-sm text-muted-foreground py-4">Bu ders için ünite bulunmuyor.</p>
                )}
            </Accordion>
        );
    }
    
    return null; // Should not be reached
  }


  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8">
      <div className="flex flex-col items-center text-center mb-12">
        <Gamepad2 className="h-16 w-16 text-primary mb-4" />
        <h1 className="text-4xl font-bold font-headline">Etkinlik Merkezi</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          Öğrenci etkinliklerini test etmek için sınıf, ders ve konu seçerek ilerleyin.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
              <div>
                 <CardTitle>{title}</CardTitle>
                 <CardDescription>{description}</CardDescription>
              </div>
              <div className='flex items-center gap-2'>
                  <Button variant="outline" size="sm" onClick={() => setIsReportDialogOpen(true)}>
                    Hata Bildir
                  </Button>
                  {selectedClassId && (
                      <Button variant="outline" size="sm" onClick={handleBack}>
                          <ArrowLeft className="h-4 w-4 mr-2"/> Geri
                      </Button>
                  )}
              </div>
          </div>
        </CardHeader>
        <CardContent className="min-h-[250px] flex justify-center">
            {renderContent()}
        </CardContent>
      </Card>
      
       <AlertDialog open={infoDialogOpen} onOpenChange={setInfoDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{infoDialogContent.title}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {infoDialogContent.description}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogAction onClick={() => setInfoDialogOpen(false)}>Anladım</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        <ErrorReportDialog isOpen={isReportDialogOpen} onOpenChange={setIsReportDialogOpen} />
    </div>
  );
}
