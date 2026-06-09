
import { getGameSettings } from "@/app/teacher/game-settings/actions";
import { FetihOyunuSetupClientPage } from "./client-page";

export const dynamic = 'force-dynamic';

export default async function FetihOyunuSetupPage() {
    // For now, we can use the Bireysel Yarışma settings as a base.
    // This can be customized later if needed.
    const settings = await getGameSettings();
    return <FetihOyunuSetupClientPage gameConfig={settings.teacherBireysel} />;
}
