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
    // If user is logged in, teacher dashboard will be shown, no need to fetch public curriculum
    if (loading) {
      return;
    }
    
    // Her durumda canlı veritabanından çek (isStatic: false)
    // dataType: 'ozetler' seçerek içeriği olan (htmlContent veya yazılacaklar) konuları getirmesini sağlıyoruz
    if (!user || process.env.NEXT_PUBLIC_STATIC_BUILD === 'true') {
      setDataLoading(true);
      getCurriculumForSelection('ozetler', false)
        .then(res => {
          if (res.classGroups) {
            // Transform internal ClassGroup to PublicClass structure expected by PageContent
            setClassGroups(res.classGroups as any);
          }
          setDataLoading(false);
        })
        .catch(err => {
          console.error("Failed to fetch curriculum from DB:", err);
          setDataLoading(false);
        });
    } else {
      setDataLoading(false);
    }
  }, [user, loading]);

  const viewLoading = loading || (dataLoading && !user);

  if (viewLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <Loader2 className="h-12 w-12 animate-spin text-white" />
      </div>
    );
  }
  
  return <PageContent classGroups={classGroups} />;
}
