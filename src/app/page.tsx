'use client';

import React, { useState, useEffect } from 'react';
import { 
    Loader2
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { getPublicCurriculum } from './actions/getPublicCurriculum';
import type { PublicClass } from './actions/getPublicCurriculum';
import { PageContent } from './page-content';


export default function Home() {
  const { user, loading } = useAuth();
  const [classGroups, setClassGroups] = useState<PublicClass[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    // Fetch data only if user is not logged in.
    // If user is logged in, PageContent will handle redirection or teacher dashboard.
    if (!user && !loading) {
      getPublicCurriculum()
        .then(data => {
          setClassGroups(data.classGroups);
          setDataLoading(false);
        })
        .catch(err => {
          console.error("Failed to fetch public curriculum:", err);
          setDataLoading(false);
        });
    } else {
      setDataLoading(false);
    }
  }, [user, loading]);

  const viewLoading = loading || dataLoading;

  if (viewLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#2b1055]">
        <Loader2 className="h-12 w-12 animate-spin text-white" />
      </div>
    );
  }
  
  return <PageContent classGroups={classGroups} />;
}
