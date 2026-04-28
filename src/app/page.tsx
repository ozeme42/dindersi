
'use client';

import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { PageContent, type PublicClass } from './page-content';
import { getCurriculumForSelection } from '@/components/actions/get-curriculum-for-selection';

export default function Home() {
  const { user, loading } = useAuth();
  const [classGroups, setClassGroups] = useState<PublicClass[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    // HIZLI AÇILIŞ İÇİN: isStatic parametresi 'true' yapıldı.
    // Bu sayede veritabanı yerine 'public/curriculum/manifest.json' dosyası kullanılır.
    if (!loading) {
      setDataLoading(true);
      getCurriculumForSelection('ozetler', true) // isStatic: true olarak değiştirildi
        .then(res => {
          if (res.classGroups) {
            setClassGroups(res.classGroups as any);
          }
          setDataLoading(false);
        })
        .catch(err => {
          console.error("Failed to fetch curriculum from static manifest:", err);
          setDataLoading(false);
        });
    }
  }, [loading]);

  if (loading || (dataLoading && !user)) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <Loader2 className="h-12 w-12 animate-spin text-white" />
      </div>
    );
  }
  
  return <PageContent classGroups={classGroups} />;
}
