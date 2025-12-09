import { getGameSettings } from "@/app/teacher/game-settings/actions";
import { TakimYarismaSetupClientPage } from "./client-page";

export const dynamic = 'force-dynamic';

export default async function Page() {
    const settings = await getGameSettings();
    return <TakimYarismaSetupClientPage gameConfig={settings.teacherTakim} />;
}
