
import { getGameSettings } from "@/app/teacher/game-settings/actions";
import { SmartboardDuelloSetupClientPage } from "./client-page";

export const dynamic = 'force-dynamic';

export default async function DuelloSetupPage() {
    const settings = await getGameSettings();
    return <SmartboardDuelloSetupClientPage gameConfig={settings.teacherDuello} />;
}
