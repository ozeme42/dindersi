

"use client";

import React, { type ReactNode, useState } from "react";
import Link from "next/link";
import { ArrowRight, MonitorPlay, Workflow, Gamepad2, FileJson, Shield, Loader2 } from 'lucide-react';
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { 
    AlertDialog, 
    AlertDialogAction, 
    AlertDialogCancel, 
    AlertDialogContent, 
    AlertDialogDescription, 
    AlertDialogFooter, 
    AlertDialogHeader, 
    AlertDialogTitle, 
    AlertDialogTrigger 
} from "./ui/alert-dialog";
import { archiveAndResetScores } from "@/app/teacher/actions";
import { useToast } from "@/hooks/use-toast";

const FeatureButton = ({ href, title, description, icon, colorClass }: { href: string, title: string, description: string, icon: ReactNode, colorClass: string }) => {
    return (
        <Link href={href} className="block group h-full">
            <div className={cn(
                "h-full w-full rounded-[2.5rem] p-8 flex flex-col items-center justify-center text-center shadow-2xl transition-all duration-300 transform border-b-8 group-hover:border-b-0 group-hover:translate-y-2 relative overflow-hidden group",
                colorClass
            )}>
                <div className={cn("absolute inset-0 opacity-20 blur-3xl group-hover:opacity-40 transition-opacity", colorClass.includes('bg-') ? colorClass.replace('bg-', 'bg-') : 'bg-primary')}></div>
                <div className="p-6 rounded-3xl bg-white/10 mb-6 border border-white/20 relative z-10 group-hover:scale-110 transition-transform shadow-lg backdrop-blur-sm">
                    {React.cloneElement(icon as React.ReactElement, { className: "h-16 w-16 text-white" })}
                </div>
                <h3 className="font-black text-4xl mt-2 text-white drop-shadow-md relative z-10 uppercase tracking-tight leading-tight">{title}</h3>
                <p className="mt-3 text-white/80 text-lg font-medium relative z-10 leading-snug">{description}</p>
                <div className="flex-grow" />
                <div className="mt-8 flex items-center text-xl font-bold text-white relative z-10 bg-black/20 px-6 py-3 rounded-full border border-white/10 group-hover:bg-white/20 transition-colors">
                    BAŞLA <ArrowRight className="ml-3 h-6 w-6 group-hover:translate-x-2 transition-transform" />
                </div>
            </div>
        </Link>
    )
};

export function TeacherMainButtons() {
    const [isSeasonFinaleDialogOpen, setIsSeasonFinaleDialogOpen] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const { toast } = useToast();

    const mainButtons = [
        { key: 'smartboard', href: '/teacher/smartboard', title: 'Akıllı Tahta', description: 'Sınıfınızla etkileşimli yarışmalar düzenleyin.', icon: <MonitorPlay />, colorClass: 'bg-indigo-600 border-indigo-800 hover:bg-indigo-500' },
        { key: 'dersAkisi', href: '/teacher/ders-akisi', title: 'Ders Akışı', description: 'Derslerin ve konuların akışını görselleştirin ve yönetin.', icon: <Workflow />, colorClass: 'bg-teal-600 border-teal-800 hover:bg-teal-500' },
        { key: 'oyunlar', href: '/oyunlar', title: 'Etkinlikler', description: 'Tüm oyun ve etkinlikleri görüntüleyin.', icon: <Gamepad2 />, colorClass: 'bg-rose-600 border-rose-800 hover:bg-rose-500' },
    ];

    const handleSeasonFinale = async () => {
        setIsResetting(true);
        const result = await archiveAndResetScores();
        if (result.success) {
            toast({ title: "Sezon Finali Başarılı!", description: "Tüm puanlar arşivlendi ve sıfırlandı. Yeni sezon başlıyor!" });
        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive" });
        }
        setIsResetting(false);
        setIsSeasonFinaleDialogOpen(false);
    }

    return (
        <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {mainButtons.map(({ key, ...buttonProps }) =>
                    <div key={key} className="aspect-[4/5] min-h-[380px]">
                        <FeatureButton {...buttonProps} />
                    </div>
                )}
            </div>
            
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                 <div className="lg:col-start-2">
                      <AlertDialog open={isSeasonFinaleDialogOpen} onOpenChange={setIsSeasonFinaleDialogOpen}>
                        <AlertDialogTrigger asChild>
                            <button className="block group h-full w-full">
                                <div className="h-full w-full rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all duration-300 border border-red-500 bg-red-950/40 hover:bg-red-950/80 group-hover:-translate-y-1 backdrop-blur-md shadow-sm">
                                    <div className="p-3 rounded-xl mb-3 transition-colors bg-gradient-to-br from-red-500 to-pink-600 shadow-lg group-hover:shadow-red-500/20">
                                        <Shield className="h-6 w-6 text-white" />
                                    </div>
                                    <h3 className="font-bold text-sm text-red-100 group-hover:text-white transition-colors">Sezon Finali Yap</h3>
                                </div>
                            </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-slate-900 border-white/10 text-white">
                            <AlertDialogHeader>
                                <AlertDialogTitle className="text-red-400">Genel Puanları Sıfırla ve Arşivle</AlertDialogTitle>
                                <AlertDialogDescription className="text-slate-400">
                                    Bu işlem, mevcut liderlik tablosunu "Şampiyonlar Arşivi"ne kaydedecek ve TÜM öğrencilerin genel puanlarını sıfırlayacaktır.
                                    Bu, yeni bir yarışma sezonu başlatır. Bu işlem geri alınamaz. Emin misiniz?
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel className="bg-transparent border-white/10 text-slate-300 hover:bg-white/5 hover:text-white">İptal</AlertDialogCancel>
                                <AlertDialogAction onClick={handleSeasonFinale} disabled={isResetting} className="bg-red-600 hover:bg-red-700 text-white">
                                    {isResetting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                    Evet, Sezon Finali Yap
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                 </div>
            </div>
        </>
    );
}
