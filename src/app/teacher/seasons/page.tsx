
'use client';

import { useState, useEffect } from "react";
import { getArchivedSeasons } from "./actions";
import { Loader2, ArrowLeft, Trophy, Crown, Award, Medal } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

type ArchivedSeason = {
    id: string;
    seasonName: string;
    createdAt: string;
    leaderboard: {
        uid: string;
        displayName: string;
        class: string;
        score: number;
        avatar?: string;
    }[];
}

export default function ArchivedSeasonsPage() {
    const [seasons, setSeasons] = useState<ArchivedSeason[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            const data = await getArchivedSeasons();
            setSeasons(data);
            setIsLoading(false);
        };
        fetchData();
    }, []);

    if (isLoading) {
        return <div className="flex h-screen items-center justify-center bg-slate-950"><Loader2 className="h-12 w-12 animate-spin text-amber-500" /></div>;
    }

    return (
        <div className="min-h-screen bg-slate-950 font-sans text-slate-100 p-4 sm:p-6 md:p-8 relative overflow-hidden">
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-amber-600/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-20%] left-[-20%] w-[800px] h-[800px] bg-indigo-900/10 rounded-full blur-[150px]" />
            </div>

            <div className="max-w-7xl mx-auto relative z-10 space-y-8">
                 <div className="flex items-center justify-between border-b border-white/10 pb-8">
                    <div>
                        <h1 className="text-4xl font-black text-white tracking-tight uppercase drop-shadow-md flex items-center gap-3">
                            <div className="p-2 bg-amber-500/20 rounded-xl border border-amber-500/30">
                                <Trophy className="h-8 w-8 text-amber-400" />
                            </div>
                            Şampiyonlar Arşivi
                        </h1>
                         <p className="text-slate-400 mt-2 font-medium">Geçmiş sezonların liderlik tablolarını görüntüleyin.</p>
                    </div>
                     <Button asChild variant="outline" className="border-white/10 text-slate-300 hover:text-white hover:bg-white/5 bg-slate-900">
                        <Link href="/teacher">
                            <ArrowLeft className="mr-2 h-4 w-4" /> Panele Dön
                        </Link>
                    </Button>
                </div>

                {seasons.length > 0 ? (
                    <Accordion type="single" collapsible defaultValue={seasons[0]?.id} className="w-full space-y-4">
                        {seasons.map(season => (
                            <AccordionItem key={season.id} value={season.id} className="border border-white/10 rounded-2xl bg-slate-900/60 backdrop-blur-md overflow-hidden">
                                <AccordionTrigger className="p-6 text-xl font-bold text-white hover:no-underline hover:bg-white/5 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <Award className="h-6 w-6 text-amber-400"/>
                                        <span>{season.seasonName}</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="p-0">
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="border-white/10">
                                                    <TableHead className="w-20 text-center font-semibold text-slate-300">Sıra</TableHead>
                                                    <TableHead className="font-semibold text-slate-300">Öğrenci</TableHead>
                                                    <TableHead className="font-semibold text-slate-300">Sınıf</TableHead>
                                                    <TableHead className="text-right font-semibold text-slate-300">Skor</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {season.leaderboard.map((player, index) => (
                                                    <TableRow key={player.uid} className="border-white/5">
                                                        <TableCell className="text-center font-bold">
                                                            {index === 0 && <Crown className="h-6 w-6 text-yellow-400 mx-auto" />}
                                                            {index === 1 && <Medal className="h-6 w-6 text-slate-300 mx-auto" />}
                                                            {index === 2 && <Medal className="h-6 w-6 text-orange-400 mx-auto" />}
                                                            {index > 2 && <span className="text-lg text-slate-500">{index + 1}</span>}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-3">
                                                                <UserAvatar user={player} className="w-9 h-9 border border-white/10"/>
                                                                <span className="font-medium text-slate-100">{player.displayName}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-slate-400">{player.class}</TableCell>
                                                        <TableCell className="text-right font-mono text-xl font-bold text-emerald-400">{player.score.toLocaleString()}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                ) : (
                    <div className="text-center py-20 border-2 border-dashed border-slate-800 rounded-2xl">
                        <Trophy className="h-16 w-16 mx-auto text-slate-700 mb-4"/>
                        <p className="text-xl font-bold text-slate-500">Henüz arşivlenmiş sezon bulunmuyor.</p>
                        <p className="text-slate-600">Bir sezon finali yaptığınızda, sonuçlar burada görünecektir.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

