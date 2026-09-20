'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { WordwallThemeConfig } from './wordwall-types';
import { Check, X } from 'lucide-react';
import { playSound } from '@/lib/audio-service';
import { useWordwall } from './wordwall-shell';

export interface WordwallButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    theme?: WordwallThemeConfig;
    optionKey?: string; // 'A', 'B', 'C', 'D' vb.
    children: React.ReactNode;
    isSelected?: boolean;
    isCorrect?: boolean;
    isRevealed?: boolean;
    soundEnabled?: boolean;
    onClick?: () => void;
}

export const WordwallButton = React.forwardRef<HTMLButtonElement, WordwallButtonProps>(({
    theme,
    optionKey,
    children,
    isSelected = false,
    isCorrect,
    isRevealed = false,
    soundEnabled,
    className,
    disabled,
    onClick,
    ...props
}, ref) => {
    const context = useWordwall();
    const activeTheme = theme || context.theme;
    const isSound = soundEnabled !== undefined ? soundEnabled : context.soundEnabled;

    const handleClick = () => {
        if (disabled) return;
        if (isSound) {
            playSound('pop');
        }
        if (onClick) onClick();
    };

    // Durum Belirleme
    let buttonThemeStyle = activeTheme.buttonIdle;
    let badgeThemeStyle = activeTheme.buttonBadgeIdle;
    let statusIcon: React.ReactNode = null;

    if (isRevealed) {
        if (isCorrect) {
            buttonThemeStyle = activeTheme.buttonCorrect;
            badgeThemeStyle = activeTheme.buttonBadgeCorrect;
            statusIcon = <Check className="w-5 h-5 md:w-6 md:h-6 stroke-[3] text-white animate-in zoom-in" />;
        } else if (isSelected && !isCorrect) {
            buttonThemeStyle = activeTheme.buttonIncorrect;
            badgeThemeStyle = activeTheme.buttonBadgeIncorrect;
            statusIcon = <X className="w-5 h-5 md:w-6 md:h-6 stroke-[3] text-white animate-in zoom-in" />;
        } else {
            // Yanıtsız kalan diğer seçenekler
            buttonThemeStyle = activeTheme.buttonDisabled;
            badgeThemeStyle = activeTheme.buttonBadgeIdle;
        }
    } else if (isSelected) {
        buttonThemeStyle = activeTheme.buttonSelected;
        badgeThemeStyle = activeTheme.buttonBadgeSelected;
    }

    return (
        <button
            ref={ref}
            type="button"
            disabled={disabled}
            onClick={handleClick}
            className={cn(
                activeTheme.buttonBase,
                buttonThemeStyle,
                "group relative w-full flex items-center gap-3 md:gap-4 p-3.5 sm:p-4 md:p-5 text-left select-none cursor-pointer touch-manipulation",
                "min-h-[58px] sm:min-h-[66px] md:min-h-[74px]",
                disabled && "cursor-default",
                className
            )}
            {...props}
        >
            {/* Seçenek Harfi Rozeti (A, B, C, D) */}
            {optionKey && (
                <div className={cn(
                    "flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center font-black text-sm sm:text-base md:text-lg transition-transform group-hover:scale-105 shadow-sm",
                    badgeThemeStyle
                )}>
                    {statusIcon ? statusIcon : optionKey}
                </div>
            )}

            {/* Seçenek Metni */}
            <div className="flex-1 text-sm sm:text-base md:text-lg lg:text-xl font-bold leading-snug break-words hyphens-auto">
                {children}
            </div>
        </button>
    );
});

WordwallButton.displayName = 'WordwallButton';
