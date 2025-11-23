
import { getGameSettings } from "./actions";
import { GameSettingsClientPage } from "./client-page";
import { Settings } from "lucide-react";

export default async function GameSettingsPage() {
  const gameSettings = await getGameSettings();

  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold font-headline mb-2 flex items-center gap-2"><Settings /> Oyun Ayarları Yönetimi</h1>
        <p className="text-muted-foreground mb-8">
            Uygulama genelindeki yarışma ve alıştırma modlarının varsayılan ayarlarını buradan düzenleyebilirsiniz. Yaptığınız değişiklikler tüm yeni oyunları etkileyecektir.
        </p>
        <GameSettingsClientPage initialSettings={gameSettings} />
      </div>
    </div>
  );
}
