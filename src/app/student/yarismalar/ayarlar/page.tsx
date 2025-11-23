
"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserPlus, Trash2, ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from 'next/link';
import { ScrollArea } from "@/components/ui/scroll-area";
import { getGuestPlayers, saveGuestPlayers } from "@/app/teacher/smartboard/ayarlar/actions"; // Re-using the same actions
import { useAuth } from "@/context/auth-context";

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
        <div className="container mx-auto p-4 sm:p-6 md:p-8">
            <div className="max-w-2xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-3xl font-bold font-headline flex items-center gap-2">
                        Misafir Oyuncular
                    </h1>
                     <Button asChild variant="outline">
                        <Link href="/student/yarismalar"><ArrowLeft className="mr-2 h-4 w-4" /> Geri</Link>
                    </Button>
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle>Misafir Oyuncu Havuzu</CardTitle>
                        <CardDescription>
                           Arkadaşlarınla veya ailenle oynamak için misafir oyuncular ekle. Bu liste hesabına kaydedilecek ve her yerden erişilebilir olacak.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleAddPlayer} className="flex gap-2 mb-4">
                            <Input
                                placeholder="Yeni misafir adı..."
                                value={newPlayerName}
                                onChange={(e) => setNewPlayerName(e.target.value)}
                            />
                            <Button type="submit" disabled={isSaving}>
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                <UserPlus className="mr-2 h-4 w-4" /> Ekle
                            </Button>
                        </form>
                        <ScrollArea className="h-64 border rounded-md p-2">
                            {isLoading ? (
                                <div className="flex items-center justify-center h-full">
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                </div>
                            ) : players.length > 0 ? (
                                players.map((player) => (
                                    <div key={player} className="flex items-center justify-between p-2 hover:bg-muted rounded-md">
                                        <p className="font-medium">{player}</p>
                                        <Button size="icon" variant="ghost" onClick={() => handleDeletePlayer(player)} disabled={isSaving}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center text-muted-foreground p-8">Henüz misafir oyuncu eklenmedi.</p>
                            )}
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
