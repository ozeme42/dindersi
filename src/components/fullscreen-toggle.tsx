'use client';

import { useState, useEffect, type RefObject } from 'react';
import { Button } from '@/components/ui/button';
import { Expand, Minimize } from 'lucide-react';

export function FullscreenToggle({ elementRef }: { elementRef?: RefObject<HTMLElement> }) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    const element = elementRef?.current || document.documentElement;

    if (!document.fullscreenElement) {
      element.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  return (
    <Button variant="ghost" size="icon" onClick={toggleFullscreen} title={isFullscreen ? "Tam Ekrandan Çık" : "Tam Ekran Yap"}>
      {isFullscreen ? <Minimize className="h-5 w-5" /> : <Expand className="h-5 w-5" />}
    </Button>
  );
}
