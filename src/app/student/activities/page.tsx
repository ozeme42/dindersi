

"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Gamepad2, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { STUDENT_ACTIVITIES } from '@/lib/activity-config';


export const dynamic = 'force-dynamic';

export default function StudentActivitiesPage() {

  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8 pb-20 md:pb-8">
        <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold font-headline flex items-center gap-2">
                <Gamepad2 className="h-8 w-8 text-cyan-500"/>
                Bireysel Etkinlikler
            </h1>
            <Button asChild variant="outline">
                <Link href="/student"><ArrowLeft className="mr-2 h-4 w-4"/> Panele Dön</Link>
            </Button>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {STUDENT_ACTIVITIES.sort((a,b) => a.label.localeCompare(b.label, 'tr')).map((activity) => {
                const Icon = activity.icon;
                return (
                    <Button
                        key={activity.href}
                        asChild
                        className={cn(
                            "h-20 text-lg flex flex-col items-center justify-center gap-1 shadow-lg transform transition-transform hover:-translate-y-1 sm:h-32 sm:gap-2",
                            activity.colorClass
                        )}
                    >
                        <Link href={activity.href}>
                            <Icon className="h-6 w-6 sm:h-10 sm:w-10 mb-0 sm:mb-1" />
                            <span className="text-xs sm:text-sm text-center">{activity.label}</span>
                        </Link>
                    </Button>
                );
            })}
        </div>
    </div>
  );
}
