
import { getGameSettings } from "@/app/teacher/game-settings/actions";
import { SmartboardBireyselClientPage } from "@/app/teacher/smartboard/bireysel/client-page";

export const dynamic = 'force-dynamic';

export default async function SmartboardKutuAcSetupPage() {
    const settings = await getGameSettings();
    
    return <SmartboardBireyselClientPage 
                gameConfig={settings.teacherBireysel} 
                gamePath="kutu-ac"
                gameName="Kutu Aç"
                gameIconName="Package"
            />;
}
