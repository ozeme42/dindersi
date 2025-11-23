'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, ArrowLeft, Book, Library, ListTodo } from 'lucide-react';
import type { Topic, Unit, Course, SchoolClass } from '@/lib/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { SelectionGrid } from '@/components/selection-grid';
import { cn } from '@/lib/utils';
import { getCurriculumForOzetler, type EnrichedCourseWithOzetler } from './actions';
import { useToast } from '@/hooks/use-toast';

const steps = [
  { id: 1, name: "Ders Seçimi", icon: <Book className="h-5 w-5" /> },
  { id: 2, name: "Ünite Seçimi", icon: <Library className="h-5 w-5" /> },
  { id: 3, name: "Konu Seçimi", icon: <ListTodo className="h-5 w-5" /> },
];

function OzetlerSetupPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [currentStep, setCurrentStep] = useState(1);
    const [isLoading, setIsLoading] = useState(true);

    const [courses, setCourses] = useState<EnrichedCourseWithOzetler[]>([]);
    const [units, setUnits] = useState<EnrichedCourseWithOzetler['units']>([]);
    const [topics, setTopics] = useState<EnrichedCourseWithOzetler['units'][0]['topics']>([]);

    const [selection, setSelection] = useState({
        courseId: "",
        unitId: "",
        topicId: "",
    });

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.push('/login');
            return;
        }

        setIsLoading(true);
        getCurriculumForOzetler(user.uid).then(result => {
            if (result.error || result.courses.length === 0) {
                toast({
                    title: 'Veri Bulunamadı',
                    description: result.error || 'İnteraktif özet içeriği olan ders bulunamadı.',
                    variant: 'destructive',
                });
            } else {
                setCourses(result.courses);
            }
        }).finally(() => setIsLoading(false));
    }, [user, authLoading, router, toast]);

    const handleSelectCourse = (courseId: string) => {
        setSelection({ courseId, unitId: '', topicId: '' });
        const selectedCourse = courses.find(c => c.id === courseId);
        setUnits(selectedCourse?.units || []);
        setTopics([]);
        setCurrentStep(2);
    };

    const handleSelectUnit = (unitId: string) => {
        setSelection(prev => ({ ...prev, unitId, topicId: '' }));
        const selectedUnit = units.find(u => u.id === unitId);
        setTopics(selectedUnit?.topics || []);
        setCurrentStep(3);
    };
    
    const handleSelectTopic = (topicId: string) => {
        router.push(`/student/ozetler/${selection.courseId}/${selection.unitId}/${topicId}`);
    };
    
    const handleBack = () => {
        if (currentStep > 1) {
            if (currentStep === 2) setSelection({ courseId: '', unitId: '', topicId: '' });
            if (currentStep === 3) setSelection(prev => ({ ...prev, unitId: '', topicId: '' }));
            setCurrentStep(prev => prev - 1);
        }
    };
    
    const renderContent = () => {
        if(isLoading) return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin"/></div>
        
        switch(currentStep) {
            case 1: return <SelectionGrid items={courses} selectedId={selection.courseId} onSelect={(id) => handleSelectCourse(id)} titleKey="title" isLoading={isLoading} subtitleKey="className"/>;
            case 2: return <SelectionGrid items={units} selectedId={selection.unitId} onSelect={(id) => handleSelectUnit(id)} disabled={!selection.courseId} titleKey="title" isLoading={isLoading} />;
            case 3: return <SelectionGrid items={topics} selectedId={selection.topicId} onSelect={(id) => handleSelectTopic(id)} disabled={!selection.unitId} titleKey="title" isLoading={isLoading} />;
            default: return null;
        }
    }
    
    const getCurrentSelectionName = () => {
        if (currentStep === 3) return units.find(u => u.id === selection.unitId)?.title;
        if (currentStep === 2) return courses.find(c => c.id === selection.courseId)?.title;
        return '';
    }

    return (
        <div className="container mx-auto p-4 sm:p-6 md:p-8">
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold font-headline">İnteraktif Özetler</h1>
                    <p className="text-muted-foreground">İçeriği görüntülemek için bir konu seçin.</p>
                </div>
                 <div className="flex justify-center items-center mb-8 px-4">
                    <ol className="flex items-center w-full max-w-lg">
                        {steps.map((step, index) => (
                        <li key={step.id} className={cn("flex w-full items-center", { "after:content-[''] after:w-full after:h-1 after:border-b after:border-border after:border-2 after:inline-block": index !== steps.length - 1 })}>
                            <span className={cn(
                            "flex items-center justify-center w-10 h-10 rounded-full lg:h-12 lg:w-12 shrink-0 transition-colors duration-300",
                            currentStep > step.id ? "bg-primary text-primary-foreground" :
                            currentStep === step.id ? "bg-accent text-accent-foreground scale-110" :
                            "bg-muted text-muted-foreground"
                            )}>
                            {step.icon}
                            </span>
                        </li>
                        ))}
                    </ol>
                </div>
                <Card className="min-h-[400px]">
                    <CardHeader>
                        <CardTitle>{steps.find(s => s.id === currentStep)?.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{getCurrentSelectionName()}</p>
                    </CardHeader>
                    <CardContent className="min-h-[250px]">
                        {renderContent()}
                    </CardContent>
                    <CardFooter className="justify-between">
                         <Button asChild variant="outline">
                            <Link href="/student"><ArrowLeft className="mr-2 h-4 w-4"/> Panele Dön</Link>
                        </Button>
                        {currentStep > 1 && (
                            <Button variant="outline" onClick={handleBack}><ArrowLeft className="mr-2 h-4 w-4"/> Geri</Button>
                        )}
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}

export default function Page() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-screen"><Loader2 className="h-12 w-12 animate-spin text-primary"/></div>}>
            <OzetlerSetupPage />
        </Suspense>
    );
}
