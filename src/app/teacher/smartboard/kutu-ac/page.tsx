
import { getGameSettings } from "@/app/teacher/game-settings/actions";
import { SmartboardBireyselClientPage } from "@/app/teacher/smartboard/bireysel/client-page";
import { Package } from "lucide-react";

export const dynamic = 'force-dynamic';

// This page now uses the same setup client page as the "Bireysel Yarışma"
// to provide a consistent setup flow for class, course, unit, and topic selection.
// The game-specific logic is handled by passing the correct game path.
export default async function SmartboardKutuAcSetupPage() {
    const settings = await getGameSettings();
    
    // We can reuse the "teacherBireysel" config as a base, or create a new one.
    // For simplicity, we'll assume the settings are similar.
    return <SmartboardBireyselClientPage 
                gameConfig={settings.teacherBireysel} 
                gamePath="kutu-ac"
                gameName="Kutu Aç"
                gameIcon={Package}
            />;
}
