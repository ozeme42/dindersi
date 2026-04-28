
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
    // Müfredat yapısını canlı veritabanından (isStatic: false) çekiyoruz
    if (!loading) {
      setDataLoading(true);
      getCurriculumForSelection('ozetler', false)
        .then(res => {
          if (res.classGroups) {
            setClassGroups(res.classGroups as any);
          }
          setDataLoading(false);
        })
        .catch(err => {
          console.error("Failed to fetch curriculum from database:", err);
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
