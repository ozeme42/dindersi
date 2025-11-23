
import { getGameSettings } from "@/app/teacher/game-settings/actions";
import { SmartboardBireyselClientPage } from "./client-page";

export default async function SmartboardBireyselPage() {
    const settings = await getGameSettings();
    return <SmartboardBireyselClientPage gameConfig={settings.teacherBireysel} />;
}
