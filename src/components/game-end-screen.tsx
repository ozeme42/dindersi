
'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, PartyPopper, Repeat, Save, CheckCircle2, Home } from "lucide-react";
import Link from 'next/link';

type GameEndScreenProps = {
    score: number;
    onSave: () => void;
    isSaving: boolean;
    onRestart: () => void;
    backUrl: string;
    scoreSaved?: boolean;
};

export function GameEndScreen({ score, onSave, isSaving, onRestart, backUrl, scoreSaved }: GameEndScreenProps) {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <PartyPopper className="mx-auto h-16 w-16 text-yellow-500" />
                    <CardTitle className="text-3xl font-bold mt-4">Tebrikler!</CardTitle>
                    <CardDescription>Oyunu başarıyla tamamladınız.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-4xl font-bold text-primary">{score}</p>
                    <p className="text-muted-foreground">Toplam Puan</p>
                </CardContent>
                <CardFooter className="flex-col gap-2">
                    <Button onClick={onSave} className="w-full" disabled={isSaving || scoreSaved || score <= 0}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : scoreSaved ? <CheckCircle2 className="mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                        {scoreSaved ? "Kaydedildi" : "Puanı Kaydet ve Çık"}
                    </Button>
                    <Button onClick={onRestart} className="w-full" variant="secondary">
                        <Repeat className="mr-2 h-4 w-4" />Tekrar Oyna
                    </Button>
                     <Button variant="outline" asChild className="w-full">
                        <Link href={backUrl}><Home className="mr-2 h-4 w-4" />Ana Menü</Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
