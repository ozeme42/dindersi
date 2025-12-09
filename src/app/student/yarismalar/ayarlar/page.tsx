
'use client';

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserPlus, Trash2, ArrowLeft, Loader2, Settings, Users, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from 'next/link';
import { ScrollArea } from "@/components/ui/scroll-area";
import { getGuestPlayers, saveGuestPlayers } from "@/app/teacher/smartboard/ayarlar/actions"; // Re-using the same actions
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/utils";

export default function CompetitionSettingsPage() {
    const { user } = useAuth();
    const [players, setPlayers] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [newPlayerName, setNewPlayerName] = useState("");
    const { toast } = useToast();

    const fetchPlayers = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        const fetchedPlayers = await getGuestPlayers(user.uid);
        setPlayers(fetchedPlayers);
        setIsLoading(false);
    }, [user]);

    useEffect(() => {
        fetchPlayers();
    }, [fetchPlayers]);

    const handleSavePlayers = async (updatedPlayers: string[]) => {
        if (!user) return;
        setIsSaving(true);
        const result = await saveGuestPlayers(user.uid, updatedPlayers);
        if (result.success) {
            setPlayers(updatedPlayers);
        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive" });
        }
        setIsSaving(false);
    };

    const handleAddPlayer = async (e: React.FormEvent) => {
        e.preventDefault();
        const name = newPlayerName.trim();
        if (name && !players.includes(name)) {
            const updatedPlayers = [...players, name];
            await handleSavePlayers(updatedPlayers);
            setNewPlayerName("");
            toast({ title: "Misafir Eklendi", description: `"${name}" misafir oyuncu olarak eklendi.` });
        } else if (players.includes(name)) {
            toast({ title: "Hata", description: "Bu isimde bir misafir zaten mevcut.", variant: "destructive" });
        }
    };

    const handleDeletePlayer = async (nameToDelete: string) => {
        const updatedPlayers = players.filter(p => p !== nameToDelete);
        await handleSavePlayers(updatedPlayers);
        toast({ title: "Misafir Silindi", description: `"${nameToDelete}" misafir oyuncu listesinden kaldırıldı.` });
    };

    return (
        <div className="min-h-screen bg-slate-950 font-sans text-slate-100 p-4 sm:p-6 md:p-8 relative overflow-hidden flex flex-col items-center">
            
            {/* Arka Plan */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-slate-800/10 rounded-full blur-[150px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-indigo-900/10 rounded-full blur-[150px]" />
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.03]" />
            </div>

            <div className="max-w-2xl w-full relative z-10">
                <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/5">
                    <div>
                        <h1 className="text-3xl font-black font-headline text-white tracking-tight uppercase drop-shadow-md flex items-center gap-3">
                            <Settings className="h-8 w-8 text-slate-400" />
                            Misafir Oyuncular
                        </h1>
                        <p className="text-slate-400 mt-2 font-medium">Yarışmalar için arkadaşlarınızı ekleyin.</p>
                    </div>
                     <Button asChild variant="outline" className="border-white/10 text-slate-400 hover:text-white hover:bg-white/5 bg-slate-900/50 backdrop-blur-md h-10 px-4 rounded-xl">
                        <Link href="/student/yarismalar"><ArrowLeft className="mr-2 h-4 w-4" /> Geri</Link>
                    </Button>
                </div>
                
                <Card className="bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden">
                    <CardHeader className="border-b border-white/5 pb-4 bg-slate-900/50">
                        <CardTitle className="text-xl text-white flex items-center gap-2">
                             <Users className="h-5 w-5 text-indigo-400"/> Oyuncu Havuzu
                        </CardTitle>
                        <CardDescription className="text-slate-400 text-sm">
                           Bu liste hesabına kaydedilecek ve her yerden erişilebilir olacak.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                        <form onSubmit={handleAddPlayer} className="flex gap-3 mb-6 relative z-10">
                            <div className="relative flex-grow">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                <Input
                                    placeholder="Yeni misafir adı..."
                                    value={newPlayerName}
                                    onChange={(e) => setNewPlayerName(e.target.value)}
                                    className="bg-slate-950 border-white/10 text-white pl-10 h-11 focus:border-indigo-500/50 rounded-xl"
                                />
                            </div>
                            <Button type="submit" disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-11 px-4 rounded-xl shadow-lg shadow-indigo-900/20">
                                {isSaving ? <Loader2 className="mr-2 h-5 w-5 animate-spin"/> : <UserPlus className="mr-2 h-5 w-5" />} Ekle
                            </Button>
                        </form>
                        
                        <div className="bg-slate-950/50 rounded-xl border border-white/5 overflow-hidden">
                            <div className="p-3 bg-white/5 border-b border-white/5 text-xs font-bold text-slate-400 uppercase tracking-wider flex justify-between items-center">
                                <span>Kayıtlı Oyuncular</span>
                                <span className="bg-slate-800 px-2 py-0.5 rounded text-white">{players.length}</span>
                            </div>
                            <ScrollArea className="h-[400px] p-2 custom-scrollbar">
                                {isLoading ? (
                                    <div className="flex items-center justify-center h-full text-indigo-400">
                                        <Loader2 className="h-8 w-8 animate-spin" />
                                    </div>
                                ) : players.length > 0 ? (
                                    <div className="space-y-1">
                                        {players.map((player) => (
                                            <div key={player} className="flex items-center justify-between p-3 hover:bg-white/5 rounded-lg group transition-colors border border-transparent hover:border-white/5">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center border border-white/10 text-slate-400 font-bold text-xs">
                                                        {player.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="font-medium text-slate-200 group-hover:text-white transition-colors">{player}</span>
                                                </div>
                                                <Button size="icon" variant="ghost" onClick={() => handleDeletePlayer(player)} disabled={isSaving} className="h-8 w-8 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-slate-500 py-12 gap-2">
                                        <Users className="h-10 w-10 opacity-20"/>
                                        <p>Henüz misafir oyuncu eklenmedi.</p>
                                    </div>
                                )}
                            </ScrollArea>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
