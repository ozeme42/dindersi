'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { MiniGameStep } from '@/lib/types';
import { 
  Maximize2, 
  Minimize2, 
  RotateCcw, 
  Gamepad2, 
  Sparkles, 
  Trophy, 
  HelpCircle,
  Shuffle,
  ChevronDown,
  X,
  Check,
  User,
  Users,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';

interface MiniGamePlayerProps {
  step: MiniGameStep;
  isSmartboard?: boolean;
  isStandalone?: boolean;
  className?: string;
}

const TEMPLATE_INFO: Record<string, { name: string; icon: string; desc: string; color: string; category?: 'soru' | 'kavram' }> = {
  // 🎯 Test & Soru Oyunları
  'carkifelek': {
    name: 'Çarkıfelek',
    icon: '🎡',
    desc: 'Çarkı çevir, puanı kap, soruyu yanıtla!',
    color: 'from-amber-500 to-orange-600',
    category: 'soru'
  },
  'kutuyu-ac': {
    name: 'Kutuyu Aç',
    icon: '🎁',
    desc: 'Gizemli kutulardan birini seç ve soruyu aç!',
    color: 'from-purple-500 to-indigo-600',
    category: 'soru'
  },
  'penalti': {
    name: 'Gol Kralı (Penaltı)',
    icon: '⚽',
    desc: 'Doğru şıkkı seç, köşeye 90\'a golü at!',
    color: 'from-emerald-500 to-teal-600',
    category: 'soru'
  },
  'balon': {
    name: 'Balon Patlatma',
    icon: '🎈',
    desc: 'Uçan balonlardan doğru olanı patlat!',
    color: 'from-pink-500 to-rose-600',
    category: 'soru'
  },
  'kostebek': {
    name: 'Köstebek Vurmaca',
    icon: '🦔',
    desc: 'Doğru cevabı tutan köstebeklere vur!',
    color: 'from-amber-600 to-yellow-600',
    category: 'soru'
  },
  'kule': {
    name: 'Kule Kur',
    icon: '🏗️',
    desc: 'Doğru bildikçe vinçten blokları kuleye diz!',
    color: 'from-cyan-600 to-blue-700',
    category: 'soru'
  },
  'kirmizi-isik': {
    name: 'Kırmızı Işık Yeşil Işık',
    icon: '🚦',
    desc: 'Yeşil ışıkta doğru cevabı ver, hedefe koş!',
    color: 'from-rose-500 to-emerald-600',
    category: 'soru'
  },
  'milyoner': {
    name: 'Milyoner',
    icon: '💰',
    desc: 'Para basamaklarını tırman, zirveye ulaş!',
    color: 'from-blue-600 to-indigo-800',
    category: 'soru'
  },
  'dogru-yanlis': {
    name: 'Doğru / Yanlış',
    icon: '⚡',
    desc: 'Hızlı akan ifadeleri anında değerlendir!',
    color: 'from-cyan-500 to-blue-600',
    category: 'soru'
  },
  'yarisma': {
    name: 'Bilgi Yarışması',
    icon: '🏆',
    desc: 'Sınıf içi takımlı veya bireysel yarışma!',
    color: 'from-violet-600 to-purple-800',
    category: 'soru'
  },

  // 🧠 Anahtar Kavram & Terim Oyunları
  'eslesen-ciftler': {
    name: 'Eşleşen Çiftler (Hafıza)',
    icon: '🎴',
    desc: 'Kapalı kartları aç, kavram ile tanımını eşleştir!',
    color: 'from-fuchsia-600 to-pink-600',
    category: 'kavram'
  },
  'eslestir': {
    name: 'Kavram Eşleştirme',
    icon: '🔗',
    desc: 'Sol taraftaki kavramları sağdaki tanımlarla eşleştir!',
    color: 'from-teal-500 to-emerald-600',
    category: 'kavram'
  },
  'adam-asmaca': {
    name: 'Adam Asmaca',
    icon: '🚀',
    desc: 'İpucuna göre kavramın harflerini tahmin et!',
    color: 'from-indigo-500 to-violet-700',
    category: 'kavram'
  },
  'anagram': {
    name: 'Karışık Harfler',
    icon: '🔤',
    desc: 'Harfleri sürükleyerek anahtar kavramı oluştur!',
    color: 'from-amber-600 to-orange-700',
    category: 'kavram'
  },
  'kelime-avi': {
    name: 'Kelime Avı',
    icon: '🔍',
    desc: 'Harf tablosunda gizlenmiş kavramları bul!',
    color: 'from-emerald-600 to-teal-700',
    category: 'kavram'
  },
  'bulmaca': {
    name: 'Çapraz Bulmaca',
    icon: '🧩',
    desc: 'Konunun kavramlarıyla otomatik kare bulmaca!',
    color: 'from-blue-500 to-cyan-600',
    category: 'kavram'
  },
  'labirent': {
    name: 'Labirent Kovalamaca',
    icon: '🌀',
    desc: 'Akıllı tahtada pacman tarzı kavram labirenti!',
    color: 'from-purple-600 to-indigo-800',
    category: 'kavram'
  }
};

const KELIME_SABLONLARI = ['eslesen-ciftler', 'eslestir', 'adam-asmaca', 'anagram', 'kelime-avi', 'bulmaca'];

export const MiniGamePlayer: React.FC<MiniGamePlayerProps> = ({ step, isSmartboard = false, isStandalone = false, className = '' }) => {
  const { user } = useAuth();
  const isStudent = user?.role === 'student' || (typeof window !== 'undefined' && window.location.pathname.startsWith('/student'));

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<string>(step.gameTemplate || 'carkifelek');
  const [gameKey, setGameKey] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Template değiştiğinde veya adım değiştiğinde güncelle
  useEffect(() => {
    if (step.gameTemplate) {
      setActiveTemplate(step.gameTemplate);
    }
  }, [step.gameTemplate]);

  const [showAllTemplates, setShowAllTemplates] = useState(false);
  const [filterCategory, setFilterCategory] = useState<'all' | 'kavram' | 'soru'>('all');
  const [gameMode, setGameMode] = useState<'solo' | 'takim'>('solo');

  const handleSelectTemplate = (templateKey: string) => {
    setActiveTemplate(templateKey);
    setGameKey(k => k + 1);
    setShowAllTemplates(false);
  };

  const handleModeChange = (newMode: 'solo' | 'takim') => {
    setGameMode(newMode);
    setGameKey(k => k + 1);
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage({
        type: 'SET_MODE',
        mode: newMode
      }, '*');
    }
  };

  // Oyun Atölyesi motorunun beklediği veri formatı
  const gameData = useMemo(() => {
    const rawQuestions = step.questions || [];
    const isKelime = KELIME_SABLONLARI.includes(activeTemplate);
    const isDy = activeTemplate === 'dogru-yanlis';

    let formattedQuestions;

    if (isKelime) {
      // 🧠 Anahtar Kavram Oyunları Formatı: { id, cevap: 'Kavram', ipucu: 'Tanım' }
      formattedQuestions = rawQuestions.map((q, idx) => {
        let correctOpt = (q.options && q.options[q.correctAnswerIndex ?? 0]) || 'Kavram';
        // Başındaki harf/madde işaretlerini temizle (örn: "A) Tevhid" -> "Tevhid")
        correctOpt = String(correctOpt).replace(/^[A-Da-d][\)\.\-]\s*/, '').trim();
        return {
          id: q.id || `q-${idx + 1}`,
          cevap: correctOpt,
          ipucu: String(q.question || '').trim(),
          sure: step.timeLimit || 30
        };
      }).filter(q => {
        // Dummy/taslak seçenekleri filtrele
        const isDummy = /^(doğru seçenek|çeldirici|seçenek \d+|a seçeneği)$/i.test(q.cevap.trim());
        return !isDummy || rawQuestions.length <= 1;
      });
    } else if (isDy) {
      // ⚡ Doğru / Yanlış Formatı: { id, q: 'İfade', dy: boolean }
      formattedQuestions = rawQuestions.map((q, idx) => {
        const correctOpt = (q.options && q.options[q.correctAnswerIndex ?? 0]) || '';
        const isWrong = correctOpt.toLowerCase().includes('yanlış') || correctOpt.toLowerCase().includes('false');
        return {
          id: q.id || `q-${idx + 1}`,
          q: q.question || 'İfade metni',
          dy: !isWrong,
          sure: step.timeLimit || 15
        };
      });
    } else {
      // 🎯 Çoktan Seçmeli Test Formatı: { id, q, opts: [{t: '...'}], dogru: index }
      formattedQuestions = rawQuestions.map((q, idx) => {
        const opts = (q.options && q.options.length > 0)
          ? q.options.map(opt => ({ t: String(opt || '') }))
          : [{ t: 'Doğru' }, { t: 'Yanlış' }];

        return {
          id: q.id || `q-${idx + 1}`,
          q: q.question || 'Soru metni',
          opts: opts,
          dogru: typeof q.correctAnswerIndex === 'number' ? q.correctAnswerIndex : 0,
          sure: step.timeLimit || 30
        };
      });
    }

    return {
      sablon: activeTemplate,
      mod: gameMode, // Varsayılan: 'solo' (istenirse 'takim' yapılabilir)
      otomatikBasla: true,
      bilgi: {
        oyunAdi: step.title || 'İnteraktif Sınıf Etkinliği',
        ders: 'Din Kültürü ve Ahlak Bilgisi',
        sinif: '',
        uniteler: [],
        kazanimlar: [],
        hazirlayan: '',
        okul: ''
      },
      ayar: {
        varsayilanSure: step.timeLimit || 30,
        soruKaristir: true,
        ileriSay: true, // Saniyeleri ileriye doğru sayar (zaman baskısı yok)
        surpriz: gameMode === 'takim' ? 'evet' : 'hayir', // Tek kişide sorusuz hediye çıkmasın, her kutu soru olsun
        ipucuGoster: 'evet', // Karışık Harfler ve Adam Asmaca'da kavramın tanımını/sorusunu üstte göster
        joker: 'hayir', // Harf yerleştir ve ipucu butonları kapalı
        ogrenciMi: isStudent, // Öğrenci için tahtaya öğrenci kaldırma uyarısı çıkmaz
        rol: user?.role || ''
      },
      sorular: formattedQuestions
    };
  }, [step, activeTemplate, gameMode, isStudent, user?.role]);

  // Iframe URL'si hash verisiyle
  const iframeSrc = useMemo(() => {
    try {
      const hashStr = encodeURIComponent(JSON.stringify(gameData));
      return `/games/oyun-atolyesi.html#${hashStr}`;
    } catch (e) {
      console.error('Hash serileştirme hatası:', e);
      return '/games/oyun-atolyesi.html';
    }
  }, [gameData, gameKey]);

  // PostMessage ile iframe hazır olduğunda veri gönderme yedeği
  const sendDataToIframe = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage({
        type: 'START_GAME',
        payload: gameData
      }, '*');
    }
  };

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === 'GAME_BRIDGE_READY') {
        sendDataToIframe();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [gameData]);

  // Tam ekran toggle
  const toggleFullscreen = async () => {
    try {
      if (!isFullscreen) {
        if (containerRef.current) {
          if (containerRef.current.requestFullscreen) {
            await containerRef.current.requestFullscreen();
          }
          setIsFullscreen(true);
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error('Tam ekran hatası:', err);
      // Fallback state
      setIsFullscreen(!isFullscreen);
    }
  };

  // Fullscreenchange event listener
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const handleRestart = () => {
    setGameKey(k => k + 1);
  };

  const currentInfo = TEMPLATE_INFO[activeTemplate] || {
    name: 'İnteraktif Oyun',
    icon: '🎮',
    desc: 'Soru ve etkinlik oyunu',
    color: 'from-blue-600 to-indigo-700'
  };

  const questionCount = step.questions?.length || 0;

  if (questionCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-900/40 rounded-3xl border border-white/10 text-white min-h-[400px]">
        <Gamepad2 className="w-16 h-16 text-amber-400 mb-4 animate-bounce" />
        <h3 className="text-2xl font-bold mb-2">Henüz Soru Eklenmemiş</h3>
        <p className="text-slate-400 max-w-md">
          Bu mini oyun adımı için henüz soru bulunmuyor. Düzenleme panelinden bu adıma soru ekleyerek akıllı tahta oyununu başlatabilirsiniz.
        </p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`relative flex flex-col w-full overflow-hidden transition-all duration-300 ${
        isFullscreen 
          ? 'fixed inset-0 z-50 bg-slate-950 p-2 md:p-4' 
          : cn('rounded-2xl md:rounded-3xl border border-white/10 bg-slate-950/80 shadow-2xl backdrop-blur-xl', className)
      }`}
      style={{
        height: isFullscreen ? '100vh' : (isStandalone ? 'calc(100dvh - 72px)' : 'calc(100vh - 220px)'),
        minHeight: isFullscreen ? '100vh' : (isStandalone ? 'calc(100dvh - 72px)' : '580px')
      }}
    >
      {/* Oyun Üst Başlık & Kontrol Çubuğu */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-gradient-to-r from-slate-900/90 via-slate-800/80 to-slate-900/90 border-b border-white/10 select-none">
        {/* Sol: Oyun Bilgisi */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-2xl shadow-inner">
            {currentInfo.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-base md:text-lg tracking-wide">
                {currentInfo.name}
              </span>
              <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-400 border-amber-500/30 font-medium">
                {questionCount} Soru
              </Badge>
              <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-medium hidden sm:flex items-center gap-1" title="Zaman baskısı yok, saniyeler ileriye doğru sayar">
                <Clock className="w-3 h-3" />
                <span>İleri Sayım</span>
              </Badge>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              {currentInfo.desc}
            </p>
          </div>
        </div>

        {/* Orta: Hızlı Şablon Değiştirici */}
        <div className="hidden md:flex items-center gap-1 bg-slate-950/70 p-1 rounded-xl border border-white/10">
          {/* Öne Çıkan Hızlı Seçenekler */}
          {[
            'carkifelek',
            'kutuyu-ac',
            'penalti',
            'labirent',
            'eslesen-ciftler',
            'eslestir',
            'adam-asmaca',
            'anagram',
            'kelime-avi',
            'bulmaca'
          ].map(key => {
            const info = TEMPLATE_INFO[key];
            if (!info) return null;
            const isActive = activeTemplate === key;
            return (
              <button
                key={key}
                onClick={() => handleSelectTemplate(key)}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/20 scale-105'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
                title={info.desc}
              >
                <span>{info.icon}</span>
                <span className="hidden xl:inline">{info.name}</span>
              </button>
            );
          })}

          {/* Tüm Oyunlar Butonu */}
          <button
            onClick={() => setShowAllTemplates(!showAllTemplates)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
              showAllTemplates
                ? 'bg-indigo-600 text-white border-indigo-400'
                : 'bg-white/5 text-amber-300 border-amber-500/30 hover:bg-white/10'
            }`}
          >
            <Gamepad2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Tüm Oyunlar ({Object.keys(TEMPLATE_INFO).length})</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${showAllTemplates ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Sağ: Eylem Butonları */}
        <div className="flex items-center gap-2">
          {/* Mod Seçici: Tek Kişi (Varsayılan) vs Takımlı */}
          <div className="flex items-center bg-slate-950/80 p-0.5 rounded-xl border border-white/10 text-xs">
            <button
              type="button"
              onClick={() => handleModeChange('solo')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold transition-all ${
                gameMode === 'solo'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Tek Kişilik Oyun Modu (Varsayılan)"
            >
              <User className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tek Kişi</span>
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('takim')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold transition-all ${
                gameMode === 'takim'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Sınıfı Takımlara Ayır (A-B Grupları)"
            >
              <Users className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Takımlı</span>
            </button>
          </div>

          {/* Mobil Oyun Seçici Butonu */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAllTemplates(!showAllTemplates)}
            className="md:hidden text-amber-300 border-amber-500/30 bg-slate-900 h-9 px-2.5 text-xs font-bold gap-1"
          >
            <Gamepad2 className="w-4 h-4" />
            <span>Oyun Seç</span>
          </Button>

          {/* Yeniden Başlat Butonu */}
          <Button
            size="sm"
            variant="ghost"
            onClick={handleRestart}
            className="text-slate-300 hover:text-white hover:bg-white/10 rounded-xl h-9 px-3 gap-1.5 text-xs font-semibold"
            title="Oyunu Sıfırla / Yeniden Başlat"
          >
            <RotateCcw className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">Yeniden Başlat</span>
          </Button>

          {/* Tam Ekran Butonu */}
          <Button
            size="sm"
            variant="default"
            onClick={toggleFullscreen}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl h-9 px-3.5 gap-2 text-xs shadow-lg shadow-emerald-900/30"
            title={isFullscreen ? 'Tam Ekrandan Çık' : 'Akıllı Tahta Tam Ekran'}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-4 h-4" />
                <span className="hidden sm:inline">Küçült</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-4 h-4" />
                <span className="hidden sm:inline">Tam Ekran Yap</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ══ TÜM OYUNLAR AÇILIR MENÜSÜ (DRAWER / OVERLAY) ══ */}
      {showAllTemplates && (
        <div className="p-4 bg-slate-900/98 border-b border-indigo-500/30 shadow-2xl backdrop-blur-md animate-in fade-in-50 duration-200 z-20">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">🎮</span>
              <span className="text-sm font-bold text-white">Etkinlik Oyun Şablonunu Seçin</span>
              <span className="text-xs text-slate-400 hidden sm:inline">— Sorularınız anında seçtiğiniz oyuna aktarılır</span>
            </div>
            <div className="flex items-center gap-2">
              {/* Kategori Filtresi */}
              <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-white/10 text-xs">
                <button
                  onClick={() => setFilterCategory('all')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${filterCategory === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  Tümü
                </button>
                <button
                  onClick={() => setFilterCategory('kavram')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${filterCategory === 'kavram' ? 'bg-fuchsia-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  <span>🧠</span>
                  <span>Anahtar Kavram Oyunları</span>
                </button>
                <button
                  onClick={() => setFilterCategory('soru')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${filterCategory === 'soru' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  <span>🎯</span>
                  <span>Test & Soru Oyunları</span>
                </button>
              </div>

              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowAllTemplates(false)}
                className="text-slate-400 hover:text-white h-7 w-7 p-0 rounded-lg"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 max-h-[300px] overflow-y-auto pr-1">
            {Object.entries(TEMPLATE_INFO)
              .filter(([_, info]) => filterCategory === 'all' || info.category === filterCategory)
              .map(([key, info]) => {
                const isSelected = activeTemplate === key;
                return (
                  <button
                    key={key}
                    onClick={() => handleSelectTemplate(key)}
                    className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                      isSelected
                        ? 'bg-gradient-to-br from-indigo-600/30 to-purple-600/30 border-indigo-400 ring-2 ring-indigo-400/30 shadow-lg'
                        : 'bg-slate-950/70 border-white/10 hover:border-white/30 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-2xl">{info.icon}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${info.category === 'kavram' ? 'bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}`}>
                        {info.category === 'kavram' ? 'Kavram' : 'Test'}
                      </span>
                    </div>
                    <div className="font-bold text-xs text-white line-clamp-1">{info.name}</div>
                    <div className="text-[10px] text-slate-400 line-clamp-2 leading-tight">{info.desc}</div>
                  </button>
                );
              })}
          </div>
        </div>
      )}

      {/* Oyun Alanı: Iframe */}
      <div className="relative flex-1 w-full h-full bg-slate-950 overflow-hidden">
        <iframe
          key={`${activeTemplate}-${gameKey}`}
          ref={iframeRef}
          src={iframeSrc}
          className="w-full h-full border-0 select-none"
          allow="autoplay; fullscreen; clipboard-write; encrypted-media"
          onLoad={sendDataToIframe}
          title={step.title || 'Oyun Atölyesi'}
        />
      </div>
    </div>
  );
};
