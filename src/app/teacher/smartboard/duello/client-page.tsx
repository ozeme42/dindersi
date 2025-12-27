'use client';

import React from "react";
import { OyunKurulum } from '@/components/oyun-kurulum';
import { Swords } from 'lucide-react';

export function DuelloSetupClientPage({ gameConfig }: { gameConfig: any }) {
  // Bu sayfa artık doğrudan OyunKurulum bileşenini kullanacak.
  // Karmaşık state yönetimi ve adım mantığı bu bileşen içinde hallediliyor.
  return (
      <OyunKurulum 
          pageTitle="Tırmanma Yarışı"
          pageIcon={Swords}
          targetPath="teacher/smartboard/duello" // Hedef oyun yolu
          dataType="games" // Veri tipi
          isStatic={false} // Veritabanından veri çekecek
          gameName="Tırmanma Yarışı"
          gamePath="duello" // Bu, /oyunlar/{gamePath}/oyun URL'ini oluşturmak için
          steps={[
            { id: 1, name: "Ders", icon: <Book className="h-5 w-5" /> },
            { id: 2, name: "Ünite", icon: <Library className="h-5 w-5" /> },
            { id: 3, name: "Konu", icon: <ListTodo className="h-5 w-5" /> },
          ]}
      />
  );
}
