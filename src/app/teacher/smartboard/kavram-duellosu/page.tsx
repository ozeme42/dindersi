
import { getGameSettings } from "@/app/teacher/game-settings/actions";
import { SmartboardKavramDuellosuClientPage } from "./client-page";

export const dynamic = 'force-dynamic';

export default async function KavramDuellosuSetupPage() {
    const settings = await getGameSettings();
    // Re-use bireysel settings for now as they are similar, can be customized later
    return <SmartboardKavramDuellosuClientPage gameConfig={settings.teacherDuello} />;
}
