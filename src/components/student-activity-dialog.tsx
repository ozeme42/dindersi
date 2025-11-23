
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import { Gamepad2, Search, Crosshair, Shuffle, Lightbulb, Puzzle, Skull, Layers, FolderKanban, MousePointerClick, Trophy, ArrowDownUp, Link2, Mic, Pencil, ClipboardCheck, Coins, BrainCircuit } from 'lucide-react';
import type { Course, Unit, Topic } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "./ui/scroll-area";

const activityTypes = [
  { href: '/student/milyoner-yarismasi', label: 'Milyoner', icon: Trophy, colorClass: "bg-purple-600 hover:bg-purple-700 text-white" },
  { href: '/student/yazi-tura', label: 'Yazı Tura', icon: Coins, colorClass: "bg-amber-500 hover:bg-amber-600 text-white" },
  { href: '/student/kavram-yarismasi', label: 'Kavram Yarışması', icon: BrainCircuit, colorClass: "bg-pink-500 hover:bg-pink-600 text-white" },
  { href: '/student/kelime-avi', label: 'Kelime Avı', icon: Search, colorClass: "bg-teal-600 hover:bg-teal-700 text-white" },
  { href: '/student/kavram-avi', label: 'Kavram Avı', icon: Crosshair, colorClass: "bg-cyan-600 hover:bg-cyan-700 text-white" },
  { href: '/student/eslestirme', label: 'Eşleştirme', icon: Puzzle, colorClass: "bg-indigo-600 hover:bg-indigo-700 text-white" },
  { href: '/student/cumle-olusturma', label: 'Cümle Oluşturma', icon: Shuffle, colorClass: "bg-orange-500 hover:bg-orange-600 text-white" },
  { href: '/student/olay-siralama', label: 'Olay Sıralama', icon: ArrowDownUp, colorClass: "bg-sky-600 hover:bg-sky-700 text-white" },
  { href: '/student/adam-asmaca', label: 'Adam Asmaca', icon: Skull, colorClass: "bg-slate-600 hover:bg-slate-700 text-white" },
  { href: '/student/hafiza-kartlari', label: 'Hafıza Kartları', icon: Layers, colorClass: "bg-rose-600 hover:bg-rose-700 text-white" },
  { href: '/student/kategorilere-ayir', label: 'Kategorize Et', icon: FolderKanban, colorClass: "bg-lime-600 hover:bg-lime-700 text-white" },
  { href: '/student/hedefi-vur', label: 'Hedefi Vur', icon: MousePointerClick, colorClass: "bg-red-500 hover:bg-red-600 text-white" },
  { href: '/student/bil-bakalim', label: 'Bil Bakalım', icon: Lightbulb, colorClass: "bg-yellow-500 hover:bg-yellow-600 text-white" },
  { href: '/student/dogru-yanlis-zinciri', label: 'D/Y Zinciri', icon: Link2, colorClass: "bg-green-600 hover:bg-green-700 text-white" },
  { href: '/student/ben-kimim', label: 'Ben Kimim?', icon: BrainCircuit, colorClass: "bg-pink-500 hover:bg-pink-600 text-white" },
  { href: '/student/acik-uclu-cevapla', label: 'Açık Uçlu', icon: Pencil, colorClass: "bg-blue-500 hover:bg-blue-600 text-white" },
  { href: '/student/deneme', label: 'Deneme Sınavı', icon: ClipboardCheck, colorClass: "bg-indigo-500 hover:bg-indigo-600 text-white" },
];

type StudentActivityDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  course: Course | null;
  unit: Unit | null;
  topic: Topic | null;
};

export function StudentActivityDialog({
  isOpen,
  onOpenChange,
  course,
  unit,
  topic
}: StudentActivityDialogProps) {
  const { toast } = useToast();

  const getGameUrl = (baseHref: string) => {
    // For a general dialog, we don't pass params, the setup page will handle it.
    if (!course || !unit || !topic) {
        return baseHref;
    }
    
    // For a specific topic context, pass the params to the setup page.
    const params = new URLSearchParams({
      courseId: course.id,
      courseName: course.title,
      unitId: unit.id,
      unitName: unit.title,
      topicId: topic.id,
      topicName: topic.title,
    });
    
    return `${baseHref}?${params.toString()}`;
  }

  const title = topic ? `${topic.title}` : 'Bireysel Etkinlikler';
  const description = topic 
    ? "Bu konu için mevcut etkinliklerden birini seçerek oynamaya başla."
    : "Oynamak için bir etkinlik türü seç. Her etkinlik için ders/konu seçimi yapman istenecek.";

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 py-4">
              {activityTypes.map((activity) => {
                const Icon = activity.icon;
                const href = getGameUrl(activity.href);

                return (
                  <Button
                    key={activity.href}
                    asChild
                    className={cn(
                        "h-28 text-lg flex flex-col items-center justify-center gap-1",
                        activity.colorClass
                    )}
                  >
                    <Link href={href}>
                      <Icon className="h-8 w-8 mb-1" />
                      <span className="text-sm">{activity.label}</span>
                    </Link>
                  </Button>
                );
              })}
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
