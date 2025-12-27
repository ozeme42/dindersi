
'use client';

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { TornadoSetupClientPage } from "./client-page";
// gameConfig'i prop olarak alacak şekilde güncellendi.
// getGameSettings sunucu tarafında çağrılacak.

// Bu component artık sunucu tarafında veri çekip istemciye aktaracak.
// Bu yüzden async olmalı ve 'use client' kaldırılmalı.
// AMA, ana hatayı hızlıca çözmek için şimdilik istemci tarafında bırakıp doğru component'i çağıralım.

export default function TornadoPage() {
    // Bu sayfa artık doğrudan /teacher/smartboard/bireysel/client-page.tsx'i değil,
    // kendi client-page.tsx'ini kullanmalı.
    // client-page.tsx içinde OyunKurulum bileşeni zaten var ve doğru şekilde çalışmalı.
    // Bu yüzden bu dosyayı basitleştiriyoruz.
    return (
         <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-[#0f172a]"><Loader2 className="h-12 w-12 animate-spin text-white" /></div>}>
            <TornadoSetupClientPage />
        </Suspense>
    );
}
