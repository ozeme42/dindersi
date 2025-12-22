'use client';

import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { PageContent, type PublicClass } from './page-content';

export default function Home() {
  const { user, loading } = useAuth();
  const [classGroups, setClassGroups] = useState<PublicClass[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    // If user is logged in, teacher dashboard will be shown, no need to fetch public curriculum
    if (loading) {
      return;
    }
    if (!user) {
      setDataLoading(true);
      fetch('/curriculum/manifest.json')
        .then(res => res.json())
        .then(data => {
          setClassGroups(data.classGroups || []);
          setDataLoading(false);
        })
        .catch(err => {
          console.error("Failed to fetch public curriculum manifest:", err);
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
