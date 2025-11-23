import { getGameSettings } from "@/app/teacher/game-settings/actions";
import { BireyselYarismaClientPage } from "./client-page";

export const dynamic = 'force-dynamic';

export default async function BireyselYarismaSetupPage() {
    const settings = await getGameSettings();
    return <BireyselYarismaClientPage gameConfig={settings.studentBireysel} />;
}
