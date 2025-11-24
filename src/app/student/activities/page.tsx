

"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Gamepad2, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { activityTypes } from '@/lib/activities';


export const dynamic = 'force-dynamic';

export default function StudentActivitiesPage() {
    
  const colorClasses = [
      "bg-purple-600 hover:bg-purple-700 text-white",
      "bg-amber-500 hover:bg-amber-600 text-white",
      "bg-pink-500 hover:bg-pink-600 text-white",
      "bg-teal-600 hover:bg-teal-700 text-white",
      "bg-indigo-500 hover:bg-indigo-600 text-white",
      "bg-cyan-600 hover:bg-cyan-700 text-white",
      "bg-indigo-600 hover:bg-indigo-700 text-white",
      "bg-orange-500 hover:bg-orange-600 text-white",
      "bg-sky-600 hover:bg-sky-700 text-white",
      "bg-slate-600 hover:bg-slate-700 text-white",
      "bg-rose-600 hover:bg-rose-700 text-white",
      "bg-lime-600 hover:bg-lime-700 text-white",
      "bg-red-500 hover:bg-red-600 text-white",
      "bg-yellow-500 hover:bg-yellow-600 text-white",
      "bg-green-600 hover:bg-green-700 text-white",
      "bg-blue-500 hover:bg-blue-600 text-white",
      "bg-gray-500 hover:bg-gray-600 text-white",
      "bg-violet-600 hover:bg-violet-700 text-white",
      "bg-gray-700 hover:bg-gray-800 text-white",
      "bg-violet-500 hover:bg-violet-600 text-white",
      "bg-gray-500 hover:bg-gray-600 text-white",
  ];


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
            {activityTypes.sort((a,b) => a.label.localeCompare(b.label, 'tr')).map((activity, index) => {
                const Icon = activity.icon;
                return (
                    <Button
                        key={activity.href}
                        asChild
                        className={cn(
                            "h-20 text-lg flex flex-col items-center justify-center gap-1 shadow-lg transform transition-transform hover:-translate-y-1 sm:h-32 sm:gap-2",
                            colorClasses[index % colorClasses.length]
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
