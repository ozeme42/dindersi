'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, RotateCcw, Loader2, Sparkles, Gamepad2, AlertCircle, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/auth-context';
import { getGameBackUrl } from '@/lib/game-navigation';
import { getGameTopicQuestions } from '@/app/oyunlar/actions/get-game-topic-questions';
import { MiniGamePlayer } from '@/components/lesson-viewer/players/mini-game-player';
import type { MiniGameQuestion } from '@/lib/types';
import { cn } from '@/lib/utils';

export interface AtolyeGameViewProps {
  initialTemplate: string;
  gameTitle: string;
  gamePath: string;
  defaultSubtitle?: string;
  fetchQuestions?: (params: {
    courseId?: string;
    unitId?: string;
    topicId?: string;
    searchParams: URLSearchParams;
  }) => Promise<{
    questions: MiniGameQuestion[];
    topicTitle?: string;
    error?: string;
  }>;
}

function AtolyeGameViewContent({
  initialTemplate,
  gameTitle,
  gamePath,
  defaultSubtitle = 'Din Kültürü ve Ahlak Bilgisi',
  fetchQuestions
}: AtolyeGameViewProps) {
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const courseId = searchParams.get('courseId') || undefined;
  const unitId = searchParams.get('unitId') || undefined;
  const topicId = searchParams.get('topicId') || undefined;

  const backUrl = getGameBackUrl({ user, searchParams });

  const [questions, setQuestions] = useState<MiniGameQuestion[]>([]);
  const [topicTitle, setTopicTitle] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  const fetchQuestionsRef = useRef(fetchQuestions);
  fetchQuestionsRef.current = fetchQuestions;

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    const promise = fetchQuestionsRef.current
      ? fetchQuestionsRef.current({
          courseId,
          unitId,
          topicId,
          searchParams: new URLSearchParams(searchParams.toString())
        })
      : getGameTopicQuestions({ courseId, unitId, topicId });

    promise
      .then((res) => {
        if (!active) return;
        if (res.error && (!res.questions || res.questions.length === 0)) {
          setError(res.error);
        } else {
          setQuestions(res.questions || []);
          setTopicTitle(res.topicTitle || '');
        }
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || 'Sorular yüklenirken hata oluştu.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [courseId, unitId, topicId, refreshKey, searchParams]);

  return (
    <div className="flex flex-col w-full h-[100dvh] bg-slate-950 text-slate-100 overflow-hidden select-none">
      {/* Üst Navigasyon & Başlık Çubuğu */}
      <header className="flex items-center justify-between px-3 sm:px-5 py-2.5 bg-slate-900/90 border-b border-white/10 shrink-0 z-20 backdrop-blur-md">
        {/* Sol: Geri Dön & Başlık */}
        <div className="flex items-center gap-2 sm:gap-3.5 min-w-0">
          <Link
            href={backUrl}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 text-xs sm:text-sm font-semibold text-slate-300 hover:text-white transition-all shadow-sm shrink-0"
            title="Geri Dön"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Geri</span>
          </Link>

          <div className="h-5 w-px bg-white/10 shrink-0 hidden sm:block" />

          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-sm sm:text-base md:text-lg font-bold text-white tracking-wide truncate">
              {gameTitle}
            </h1>
            {topicTitle ? (
              <Badge
                variant="outline"
                className="bg-amber-500/10 text-amber-300 border-amber-500/30 text-xs font-semibold px-2.5 py-0.5 rounded-lg max-w-[220px] sm:max-w-[320px] md:max-w-none truncate shrink-0"
                title={topicTitle}
              >
                <BookOpen className="w-3 h-3 mr-1 inline shrink-0" />
                <span className="truncate">{topicTitle}</span>
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="bg-slate-800 text-slate-300 border-white/10 text-xs font-medium px-2 py-0.5 rounded-lg shrink-0 hidden sm:inline-flex"
              >
                {defaultSubtitle}
              </Badge>
            )}
          </div>
        </div>

        {/* Sağ: Yenileme ve Durum */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setRefreshKey((k) => k + 1)}
            disabled={loading}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 text-slate-400 hover:text-amber-300 transition-all disabled:opacity-50"
            title="Soruları ve Oyunu Yeniden Yükle"
          >
            <RotateCcw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
        </div>
      </header>

      {/* Ana Oyun Alanı */}
      <main className="flex-1 w-full relative overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col">
        {loading ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-4 text-center p-6">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center animate-pulse">
                <Gamepad2 className="w-8 h-8 text-amber-400" />
              </div>
              <Loader2 className="w-6 h-6 text-amber-400 animate-spin absolute -top-1 -right-1" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-white tracking-wide">
                Oyun Hazırlanıyor...
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-sm">
                Konu kavramları ve sorular akıllı tahta oyun motoruna yükleniyor.
              </p>
            </div>
          </div>
        ) : error && questions.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-4 text-center p-6">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div className="space-y-1 max-w-md">
              <h2 className="text-lg font-bold text-white tracking-wide">
                Sorular Yüklenemedi
              </h2>
              <p className="text-xs sm:text-sm text-rose-300">
                {error}
              </p>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <Button
                variant="outline"
                onClick={() => setRefreshKey((k) => k + 1)}
                className="gap-2 bg-white/5 border-white/10 hover:bg-white/10 text-white"
              >
                <RotateCcw className="w-4 h-4" />
                Tekrar Dene
              </Button>
              <Link href={backUrl}>
                <Button variant="default" className="bg-amber-600 hover:bg-amber-500 text-white">
                  Geri Dön
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <MiniGamePlayer
            step={{
              id: `game-${gamePath}`,
              type: 'miniGame',
              title: topicTitle ? `${topicTitle} - ${gameTitle}` : gameTitle,
              gameTemplate: initialTemplate,
              questions: questions,
              timeLimit: 30
            }}
            isSmartboard={true}
            isStandalone={true}
            className="flex-1 w-full rounded-none border-0"
          />
        )}
      </main>
    </div>
  );
}

export function AtolyeGameView(props: AtolyeGameViewProps) {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-full items-center justify-center bg-slate-950">
          <Loader2 className="h-12 w-12 animate-spin text-amber-500" />
        </div>
      }
    >
      <AtolyeGameViewContent {...props} />
    </Suspense>
  );
}
