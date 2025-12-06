'use client';

import React, { useState, useEffect } from 'react';
import { 
    Loader2, BookOpen, Columns, LayoutTemplate, Shield, PenSquare, UserCog, 
    FileCog, FileQuestion, ClipboardList, ClipboardCheck, Scale, BarChart3, 
    Video, Settings, Trophy, Bug, DollarSign, LogIn, ListOrdered, Smartphone, 
    Gamepad2, Star, Sparkles, ChevronDown, PlayCircle, Menu, X, User
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { getPublicCurriculum } from '@/app/actions/getPublicCurriculum';
import type { PublicClass } from '@/app/actions/getPublicCurriculum';
import { PageContent } from './page-content';

export default function Home() {
  const { user, loading } = useAuth();
  const [classGroups, setClassGroups] = useState<PublicClass[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    // Fetch data only for the logged-out view
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
  
  return <PageContent classGroups={classGroups || []} />;
}
