'use client';

import { useState, useEffect, type RefObject } from 'react';
import { Button } from '@/components/ui/button';
import { Expand, Minimize } from 'lucide-react';

export function FullscreenToggle({ 
  elementRef,
  className,
  variant = "ghost",
  size
}: { 
  elementRef?: RefObject<HTMLElement | null>;
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}) {
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
    if (!document.fullscreenElement) {
      // Using document.documentElement ensures body portals (Popovers, Selects, Dialogs)
      // remain inside the Fullscreen viewport and fully interactive.
      const el = document.documentElement;
      if (el.requestFullscreen) {
        el.requestFullscreen().catch(err => {
          console.error(`Error attempting to enable full-screen mode: ${err.message}`);
        });
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(err => {
          console.error(`Error attempting to exit full-screen mode: ${err.message}`);
        });
      }
    }
  };

  return (
    <Button 
      variant={variant} 
      size={size || "default"} 
      onClick={toggleFullscreen} 
      className={className}
      title={isFullscreen ? "Tam Ekrandan Çık" : "Tam Ekran Yap"}
    >
      {isFullscreen ? <Minimize className="h-4 w-4 mr-1.5" /> : <Expand className="h-4 w-4 mr-1.5" />}
      <span>{isFullscreen ? "Küçült" : "Tam Ekran"}</span>
    </Button>
  );
}
