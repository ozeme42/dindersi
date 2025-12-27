
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { SmartboardBireyselClientPage } from "@/app/teacher/smartboard/bireysel/client-page";
import { getGameSettings } from "@/app/teacher/game-settings/actions";

// This component is now a Server Component. It can be async.
export default async function TornadoSetupPage() {
    // 1. Fetch data on the server
    const settings = await getGameSettings();
    const gameConfig = settings.teacherBireysel;

    // 2. Pass the data as props to the Client Component
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-[#0f172a]"><Loader2 className="h-12 w-12 animate-spin text-white" /></div>}>
            <SmartboardBireyselClientPage gameConfig={gameConfig} gamePath="tornado" gameName="Tornado" />
        </Suspense>
    );
}
