
import { getGameSettings } from "@/app/teacher/game-settings/actions";
import { SmartboardBireyselClientPage } from "./client-page";

export default async function SmartboardBireyselPage() {
    const settings = await getGameSettings();
    // Re-use bireysel settings for now as they are similar
    return <SmartboardBireyselClientPage gameConfig={settings.teacherBireysel} />;
}
