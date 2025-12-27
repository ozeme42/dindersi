
'use client';

import { getGameSettings } from "@/app/teacher/game-settings/actions";
import { SmartboardBireyselClientPage } from "@/app/teacher/smartboard/bireysel/client-page";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

// This is a new async component to fetch settings on the server
async function TornadoSetup() {
    const settings = await getGameSettings();
    // We reuse the Bireysel Yarışma client page as it provides the necessary setup flow.
    // The actual game logic is determined by the URL generated in the client page.
    return <SmartboardBireyselClientPage gameConfig={settings.teacherBireysel} gamePath="tornado" gameName="Tornado" />;
}

export default function Page() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-[#0f172a]"><Loader2 className="h-12 w-12 animate-spin text-white" /></div>}>
            <TornadoSetup />
        </Suspense>
    );
}
