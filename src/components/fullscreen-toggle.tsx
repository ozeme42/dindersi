'use client';

import { useState, useEffect, type RefObject } from 'react';
import { Button } from '@/components/ui/button';
import { Expand, Minimize } from 'lucide-react';
import { cn } from '@/lib/utils';

export function FullscreenToggle({ 
  elementRef,
  className,
  variant = "ghost",
  size,
  showLabel = false,
  iconSize = "h-4 w-4"
}: { 
  elementRef?: RefObject<HTMLElement | null>;
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  showLabel?: boolean;
  iconSize?: string;
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
      const el = (elementRef?.current) || document.documentElement;
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

  const titleText = isFullscreen ? "Tam Ekrandan Çık (F)" : "Tam Ekran Yap (F)";

  return (
    <Button 
      variant={variant} 
      size={size || (showLabel ? "default" : "icon")} 
      onClick={toggleFullscreen} 
      className={cn("transition-all shrink-0", className)}
      title={titleText}
      aria-label={titleText}
    >
      {isFullscreen ? (
        <Minimize className={cn(iconSize, showLabel && "mr-1.5")} />
      ) : (
        <Expand className={cn(iconSize, showLabel && "mr-1.5")} />
      )}
      {showLabel && (
        <span className="text-xs font-semibold">{isFullscreen ? "Küçült" : "Tam Ekran"}</span>
      )}
    </Button>
  );
}

