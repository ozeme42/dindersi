export type WordwallThemeId = 'gameshow' | 'wood' | 'comic' | 'chalkboard' | 'space' | 'classic';

export interface WordwallThemeConfig {
    id: WordwallThemeId;
    name: string;
    icon: string;
    description: string;
    // Arka plan ve genel konteyner
    wrapper: string;
    stageOverlay?: string;
    // Üst durum çubuğu
    headerBg: string;
    headerBorder: string;
    // Soru / Gövde kartı
    cardBg: string;
    cardBorder: string;
    cardShadow: string;
    cardText: string;
    questionText: string;
    subText: string;
    accentText: string;
    cardDivider: string;
    subPanelBg: string;
    isDark: boolean;
    // 3D Seçenek Butonları
    buttonBase: string;
    buttonIdle: string;
    buttonHover: string;
    buttonSelected: string;
    buttonCorrect: string;
    buttonIncorrect: string;
    buttonDisabled: string;
    buttonBadgeIdle: string;
    buttonBadgeSelected: string;
    buttonBadgeCorrect: string;
    buttonBadgeIncorrect: string;
    // Rozetler & Sayaçlar
    scoreBadge: string;
    timerBadge: string;
    timerWarningBadge: string;
    progressTrack: string;
    progressBar: string;
    badgeCounter: string;
    livesContainer: string;
    livesHeartInactive: string;
    // Alt Kontrol Çubuğu
    footerBg: string;
    footerBorder: string;
    activeThemePill: string;
    themePillIdle: string;
}

export interface WordwallTemplateItem {
    id: string;
    title: string;
    icon: string;
    path: string;
    color: string;
    description: string;
}

export interface WordwallShellProps {
    title: string;
    subtitle?: string;
    currentQuestionIndex?: number;
    totalQuestions?: number;
    score?: number;
    lives?: number;
    maxLives?: number;
    timeLeft?: number;
    maxTime?: number;
    onTimeUp?: () => void;
    onBack?: () => void;
    backUrl?: string;
    children: React.ReactNode;
    toolbarExtra?: React.ReactNode;
    className?: string;
    contentClassName?: string;
    isFinished?: boolean;
    showTimer?: boolean;
    showProgress?: boolean;
    fitToScreen?: boolean;
    hideFooterOnFullscreen?: boolean;
}
