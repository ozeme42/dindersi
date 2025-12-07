import type { ShopItem } from './types';

// 1. LUCIDE İKONLARI (Genişletildi ve Eksikler Eklendi)
import { 
    Gem, Zap, Shield, Crown, Swords, Rocket, Terminal, 
    Ghost, Flame, Snowflake, Star, Hexagon,
    Cpu, Gamepad2, Sun, Moon, Sparkles, Binary, Eye, Globe,
    Brain, Heart, BookOpen, Music, Atom, Headphones, Infinity,
    Anchor, Compass, Feather, Lightbulb, Microscope, Gavel,
    Stethoscope, UtensilsCrossed, Target, Skull, Braces,
    Code2, Fingerprint, Plane, Trophy, Medal,
    // Eksik olanlar için Lucide karşılıkları eklendi:
    Pencil, Telescope, Siren, ChefHat, Glasses // Police, Doctor, Chef, Spy için
} from 'lucide-react';

// 2. SADECE HARF ROZETLERİNİ ESKİ YERİNDEN TUTUYORUZ
import { 
   LetterABadge, LetterBBadge, LetterCBadge, LetterCcBadge, LetterDBadge, LetterEBadge, 
   LetterFBadge, LetterGBadge, LetterGgBadge, LetterHBadge, LetterIBadge, LetterIiBadge, 
   LetterJBadge, LetterKBadge, LetterLBadge, LetterMBadge, LetterNBadge, LetterOBadge, 
   LetterOoBadge, LetterPBadge, LetterRBadge, LetterSBadge, LetterSsBadge, LetterTBadge, 
   LetterUBadge, LetterUuBadge, LetterVBadge, LetterYBadge, LetterZBadge
} from '@/components/icons';

// ==============================================================================
// YENİ NESİL ROZET TASARIMLARI (BİLEŞENLER)
// ==============================================================================

// --- Özel Premium Rozetler ---
const DiamondBadge = () => (
    <div className="relative w-full h-full flex items-center justify-center">
        <Gem className="w-3/4 h-3/4 text-cyan-300 drop-shadow-[0_0_20px_rgba(34,211,238,0.8)] animate-pulse" />
    </div>
);
const AuraBadge = () => (
    <div className="relative w-full h-full flex items-center justify-center">
        <div className="absolute w-full h-full bg-amber-500/30 rounded-full blur-xl animate-pulse" />
        <Sun className="w-3/4 h-3/4 text-amber-300 relative z-10 drop-shadow-lg" />
    </div>
);
const NeonSignBadge = () => (
    <div className="relative w-full h-full flex items-center justify-center bg-slate-950 rounded-xl border-2 border-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.6)]">
        <Sparkles className="w-2/3 h-2/3 text-pink-400" />
    </div>
);
const SamuraiBadge = () => (
    <div className="relative w-full h-full flex items-center justify-center">
        <Swords className="w-3/4 h-3/4 text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
    </div>
);
const BinaryBadge = () => (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden rounded-full">
        <Binary className="w-full h-full text-green-500/50 absolute animate-pulse" />
        <Code2 className="w-1/2 h-1/2 text-green-300 relative z-10 drop-shadow-md" />
    </div>
);

// --- Yeniden Tasarlanan Rozetler (Renkli & Parlak) ---
const NeoAstronautBadge = () => (
    <div className="relative w-full h-full flex items-center justify-center">
        <Globe className="w-full h-full text-blue-900/60 absolute" />
        <Rocket className="w-2/3 h-2/3 text-blue-300 relative z-10 -rotate-45 drop-shadow-[0_0_10px_rgba(147,197,253,0.6)]" />
    </div>
);
const NeoFootballBadge = () => (
    <div className="relative w-full h-full flex items-center justify-center bg-white/10 rounded-full p-1">
        <Trophy className="w-full h-full text-yellow-500 absolute opacity-30" />
        <div className="w-2/3 h-2/3 bg-slate-200 rounded-full flex items-center justify-center border-4 border-slate-900 relative z-10 shadow-lg">
            <div className="w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 via-transparent to-transparent rounded-full"></div>
        </div>
    </div>
);
const NeoBasketballBadge = () => (
    <div className="relative w-full h-full flex items-center justify-center">
         <Flame className="w-full h-full text-orange-600/40 absolute -top-1" />
        <div className="w-3/4 h-3/4 rounded-full border-4 border-orange-600 bg-orange-500 flex items-center justify-center relative z-10 shadow-[0_0_15px_rgba(234,88,12,0.5)]">
             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-full h-full text-orange-900 opacity-70"><circle cx="12" cy="12" r="10"/><path d="M5.5 5.5C14 14 14 14 5.5 5.5Z"/><path d="M18.5 5.5C10 14 10 14 18.5 5.5Z"/><path d="M12 2C12 22 12 22 12 2Z"/><path d="M2 12C22 12 22 12 2 12Z"/></svg>
        </div>
    </div>
);
const NeoCrownBadge = () => (
    <div className="relative w-full h-full flex items-center justify-center">
        <div className="absolute inset-0 bg-yellow-500/20 blur-xl rounded-full" />
        <Crown className="w-3/4 h-3/4 text-yellow-300 drop-shadow-[0_0_12px_rgba(253,224,71,0.8)] relative z-10" />
    </div>
);
const PlasmaShieldBadge = () => (
    <div className="relative w-full h-full flex items-center justify-center">
        <Shield className="w-full h-full text-blue-600/50 absolute" />
        <Shield className="w-2/3 h-2/3 text-blue-300 relative z-10 drop-shadow-[0_0_10px_rgba(147,197,253,0.9)]" />
    </div>
);
const ElectricBoltBadge = () => (
    <div className="relative w-full h-full flex items-center justify-center">
        <Zap className="w-full h-full text-violet-600/50 absolute scale-125 blur-sm animate-pulse" />
        <Zap className="w-3/4 h-3/4 text-violet-300 relative z-10 drop-shadow-[0_0_15px_rgba(196,181,253,1)]" />
    </div>
);
const RetroGamerBadge = () => (
    <div className="relative w-full h-full flex items-center justify-center">
        <Gamepad2 className="w-full h-full text-pink-600/40 absolute -rotate-12" />
        <Gamepad2 className="w-3/4 h-3/4 text-cyan-300 relative z-10 rotate-12 drop-shadow-[0_0_8px_rgba(34,211,238,0.7)]" />
    </div>
);
const CyberBrainBadge = () => (
    <div className="relative w-full h-full flex items-center justify-center">
        <Cpu className="w-full h-full text-emerald-800/60 absolute animate-spin-slow" />
        <Brain className="w-2/3 h-2/3 text-emerald-300 relative z-10 drop-shadow-[0_0_10px_rgba(110,231,183,0.6)]" />
    </div>
);
const NeoMusicBadge = () => (
    <div className="relative w-full h-full flex items-center justify-center">
        <Music className="w-full h-full text-fuchsia-600/40 absolute animate-bounce" />
        <Headphones className="w-3/4 h-3/4 text-fuchsia-300 relative z-10 drop-shadow-[0_0_12px_rgba(232,121,249,0.7)]" />
    </div>
);
const HoloAtomBadge = () => (
    <div className="relative w-full h-full flex items-center justify-center">
        <Atom className="w-full h-full text-cyan-400 animate-spin-slow drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
    </div>
);
const GlowingHeartBadge = () => (
    <div className="relative w-full h-full flex items-center justify-center">
        <Heart className="w-full h-full text-red-600/40 absolute scale-110 blur-sm animate-pulse" />
        <Heart className="w-3/4 h-3/4 text-red-400 fill-red-500 relative z-10 drop-shadow-[0_0_10px_rgba(248,113,113,0.8)]" />
    </div>
);
const MysticBookBadge = () => (
    <div className="relative w-full h-full flex items-center justify-center">
        <Sparkles className="w-full h-full text-amber-400/30 absolute -top-2" />
        <BookOpen className="w-3/4 h-3/4 text-amber-200 relative z-10 drop-shadow-[0_0_8px_rgba(253,230,138,0.6)]" />
    </div>
);
const DigitalFingerprintBadge = () => (
    <div className="relative w-full h-full flex items-center justify-center">
        <Fingerprint className="w-full h-full text-blue-400 drop-shadow-[0_0_10px_rgba(96,165,250,0.7)]" />
    </div>
);
const CyberSkullBadge = () => (
    <div className="relative w-full h-full flex items-center justify-center">
        <Skull className="w-3/4 h-3/4 text-slate-300 drop-shadow-[0_0_15px_rgba(148,163,184,0.5)]" />
        <div className="absolute w-full h-1 bg-red-500 top-1/2 animate-pulse opacity-50"></div>
    </div>
);
const CyberGuardianBadge = () => (
    <div className="relative w-full h-full flex items-center justify-center">
        <Shield className="w-full h-full text-blue-500 absolute opacity-80" />
        <Zap className="w-2/3 h-2/3 text-yellow-400 relative z-10 drop-shadow-md" />
    </div>
);
const LegendaryLeaderBadge = () => (
    <div className="relative w-full h-full flex items-center justify-center">
        <Swords className="w-full h-full text-slate-600 absolute rotate-45 opacity-60" />
        <Crown className="w-3/4 h-3/4 text-amber-500 relative z-10 drop-shadow-lg -mt-2" />
    </div>
);
const CodeMasterBadge = () => (
    <div className="relative w-full h-full flex items-center justify-center">
        <Hexagon className="w-full h-full text-green-900 absolute rotate-90 opacity-80" />
        <Terminal className="w-2/3 h-2/3 text-green-400 relative z-10 drop-shadow-[0_0_8px_rgba(74,222,128,0.6)]" />
    </div>
);
const FutureArchitectBadge = () => (
    <div className="relative w-full h-full flex items-center justify-center group">
        <Cpu className="w-full h-full text-purple-800 absolute opacity-70" />
        <Rocket className="w-2/3 h-2/3 text-purple-400 relative z-10 -rotate-45 drop-shadow-md" />
    </div>
);
const ElementalMasterBadge = () => (
    <div className="relative w-full h-full flex items-center justify-center">
        <Flame className="w-2/3 h-2/3 text-orange-500 absolute -left-1 top-0 opacity-80 drop-shadow-sm" />
        <Snowflake className="w-2/3 h-2/3 text-cyan-300 absolute -right-1 bottom-0 opacity-80 drop-shadow-sm" />
    </div>
);
const EliteGamerBadge = () => (
    <div className="relative w-full h-full flex items-center justify-center">
        <Star className="w-full h-full text-red-600 absolute opacity-40 animate-pulse" />
        <Gamepad2 className="w-3/4 h-3/4 text-red-500 relative z-10 drop-shadow-[0_0_12px_rgba(239,68,68,0.7)]" />
    </div>
);

// --- Düzeltilen Eksik Bileşenler (Lucide İkonları Kullanılıyor) ---
const GlowingPencilBadge = () => <Pencil className="w-3/4 h-3/4 text-yellow-300 drop-shadow-[0_0_8px_rgba(253,224,71,0.7)]" />;
const GlowingTelescopeBadge = () => <Telescope className="w-3/4 h-3/4 text-indigo-300 drop-shadow-[0_0_8px_rgba(165,180,252,0.7)]" />;
const GlowingPoliceBadge = () => <Siren className="w-3/4 h-3/4 text-blue-300 drop-shadow-[0_0_8px_rgba(147,197,253,0.7)]" />;
const GlowingDoctorBadge = () => <Stethoscope className="w-3/4 h-3/4 text-green-300 drop-shadow-[0_0_8px_rgba(134,239,172,0.7)]" />;
const GlowingChefBadge = () => <ChefHat className="w-3/4 h-3/4 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.7)]" />;
const GlowingSpyBadge = () => <Glasses className="w-3/4 h-3/4 text-slate-300 drop-shadow-[0_0_8px_rgba(203,213,225,0.7)]" />;
const GlowingCompassBadge = () => <Compass className="w-3/4 h-3/4 text-amber-300 drop-shadow-[0_0_8px_rgba(252,211,77,0.7)]" />;


// --- MAĞAZA LİSTESİ ---
export const SHOP_ITEMS: ShopItem[] = [
    // ==========================================
    // 1. YENİ EKLENEN & PREMİUM ÇERÇEVELER
    // ==========================================
    {
        id: 'frame_cyber_glitch_v2',
        name: 'Siber Hata v2',
        price: 3500,
        type: 'avatarFrame',
        assetUrl: 'repeating-linear-gradient(45deg, #FF00FF 0 2px, transparent 2px 4px), repeating-linear-gradient(-45deg, #00FFFF 0 2px, transparent 2px 4px), linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)',
        description: 'Gelişmiş dijital bozulma efekti.',
    },
    {
        id: 'frame_toxic_glow',
        name: 'Zehirli Işık',
        price: 2800,
        type: 'avatarFrame',
        assetUrl: 'radial-gradient(circle, transparent 40%, #39FF14 80%, #000 100%), repeating-linear-gradient(transparent, transparent 5px, #39FF14 5px, #39FF14 6px)',
        description: 'Tehlikeli yeşil neon parıltısı.',
    },
    {
        id: 'frame_circuit_board',
        name: 'Devre Kartı',
        price: 4200,
        type: 'avatarFrame',
        assetUrl: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M10 10 H 90 V 90 H 10 L 10 10' fill='none' stroke='%2300bcd4' stroke-width='2'/%3E%3Cpath d='M30 10 V 30 H 10' fill='none' stroke='%2300bcd4' stroke-width='2'/%3E%3Cpath d='M70 90 V 70 H 90' fill='none' stroke='%2300bcd4' stroke-width='2'/%3E%3Ccircle cx='30' cy='30' r='3' fill='%2300bcd4'/%3E%3Ccircle cx='70' cy='70' r='3' fill='%2300bcd4'/%3E%3C/svg%3E"), linear-gradient(to bottom, #0f172a, #1e293b)`,
        description: 'Teknolojik bir altyapı.',
    },
    {
        id: 'frame_aurora',
        name: 'Aurora Borealis',
        price: 5500,
        type: 'avatarFrame',
        assetUrl: 'linear-gradient(120deg, #00ff87, #60efff, #0061ff, #60efff, #00ff87)',
        description: 'Kuzey ışıklarının büyüleyici dansı.',
    },

    // ==========================================
    // 2. YENİ EKLENEN & PREMİUM ROZETLER
    // ==========================================
    {
        id: 'badge_diamond_v2',
        name: 'Kusursuz Elmas',
        price: 5000,
        type: 'avatarBadge',
        description: 'Sonsuz zenginlik ve prestij.',
        component: DiamondBadge,
    },
    {
        id: 'badge_cyber_skull',
        name: 'Siber Kuru Kafa',
        price: 4500,
        type: 'avatarBadge',
        description: 'Dijital korsanların sembolü.',
        component: CyberSkullBadge,
    },
    {
        id: 'badge_digital_id',
        name: 'Dijital Kimlik',
        price: 3200,
        type: 'avatarBadge',
        description: 'Sisteme erişim anahtarı.',
        component: DigitalFingerprintBadge,
    },
    {
        id: 'badge_neon_sign_premium',
        name: 'Neon Tabela (Premium)',
        price: 2800,
        type: 'avatarBadge',
        description: 'Daha parlak, daha dikkat çekici.',
        component: NeonSignBadge,
    },

    // ==========================================
    // 3. YENİDEN TASARLANAN MEVCUT ROZETLER
    // ==========================================
    { id: 'badge_crown', name: 'Kraliyet Tacı', price: 5000, type: 'avatarBadge', description: 'Gerçek liderler için altın parıltı.', component: NeoCrownBadge },
    { id: 'badge_shield', name: 'Plazma Kalkanı', price: 750, type: 'avatarBadge', description: 'Enerji yüklü koruma.', component: PlasmaShieldBadge },
    { id: 'badge_bolt', name: 'Elektrik Yıldırımı', price: 800, type: 'avatarBadge', description: 'Yüksek voltajlı enerji.', component: ElectricBoltBadge },
    { id: 'badge_gamepad', name: 'Retro Oyuncu', price: 900, type: 'avatarBadge', description: 'Neon ışıklı klasik kontrolcü.', component: RetroGamerBadge },
    { id: 'badge_brain', name: 'Siber Beyin', price: 1500, type: 'avatarBadge', description: 'Veri işleyen zihin.', component: CyberBrainBadge },
    { id: 'badge_music', name: 'Neon Müzik', price: 700, type: 'avatarBadge', description: 'Ritmin parlak renkleri.', component: NeoMusicBadge },
    { id: 'badge_atom', name: 'Holo Atom', price: 1600, type: 'avatarBadge', description: 'Bilimin holografik hali.', component: HoloAtomBadge },
    { id: 'badge_heart', name: 'Parlayan Kalp', price: 600, type: 'avatarBadge', description: 'Sevgi dolu ve ışıltılı.', component: GlowingHeartBadge },
    { id: 'badge_book', name: 'Mistik Kitap', price: 1100, type: 'avatarBadge', description: 'Büyülü bilgi kaynağı.', component: MysticBookBadge },
    { id: 'badge_astronaut', name: 'Uzay Yolcusu', price: 1800, type: 'avatarBadge', description: 'Yıldızların ötesine yolculuk.', component: NeoAstronautBadge },
    { id: 'badge_football', name: 'Altın Krampon', price: 700, type: 'avatarBadge', description: 'Sahanın parlayan yıldızı.', component: NeoFootballBadge },
    { id: 'badge_basketball', name: 'Ateşli Basket', price: 700, type: 'avatarBadge', description: 'Potaları yakan atış.', component: NeoBasketballBadge },
    { id: 'badge_pencil', name: 'Parlak Kalem', price: 400, type: 'avatarBadge', description: 'Yaratıcı fikirler.', component: GlowingPencilBadge },
    { id: 'badge_telescope', name: 'Derin Uzay', price: 1700, type: 'avatarBadge', description: 'Evreni keşfet.', component: GlowingTelescopeBadge },
    { id: 'badge_police', name: 'Adalet Rozeti', price: 1200, type: 'avatarBadge', description: 'Güvenlik güçleri.', component: GlowingPoliceBadge },
    { id: 'badge_doctor', name: 'Şifa Işığı', price: 1200, type: 'avatarBadge', description: 'Sağlık sembolü.', component: GlowingDoctorBadge },
    { id: 'badge_chef', name: 'Usta Şef', price: 900, type: 'avatarBadge', description: 'Lezzet ustası.', component: GlowingChefBadge },
    { id: 'badge_spy', name: 'Gizli Ajan', price: 1600, type: 'avatarBadge', description: 'Gölgelerin içinde.', component: GlowingSpyBadge },
    { id: 'badge_compass', name: 'Altın Pusula', price: 1300, type: 'avatarBadge', description: 'Doğru yönü bul.', component: GlowingCompassBadge },
    
    // Cyber Rozetler (Eksik olmasın diye tekrar ekliyoruz)
    { id: 'badge_cyber_guardian', name: 'Siber Muhafız', price: 800, type: 'avatarBadge', description: 'Sistemi koruyan güç.', component: CyberGuardianBadge },
    { id: 'badge_code_master', name: 'Kod Ustası', price: 1500, type: 'avatarBadge', description: 'Dijital dünyanın dilini konuşanlar.', component: CodeMasterBadge },
    { id: 'badge_legendary_leader', name: 'Efsanevi Lider', price: 3000, type: 'avatarBadge', description: 'Savaş meydanlarının kralı.', component: LegendaryLeaderBadge },
    { id: 'badge_future_architect', name: 'Geleceğin Mimarı', price: 5000, type: 'avatarBadge', description: 'Teknoloji ve vizyon.', component: FutureArchitectBadge },
    { id: 'badge_elemental_master', name: 'Element Ustası', price: 8000, type: 'avatarBadge', description: 'Ateş ve buzun dengesi.', component: ElementalMasterBadge },
    { id: 'badge_elite_gamer', name: 'Elit Oyuncu', price: 12000, type: 'avatarBadge', description: 'Sadece en iyiler için.', component: EliteGamerBadge },
    { id: 'badge_diamond', name: 'Elmas (Klasik)', price: 4000, type: 'avatarBadge', description: 'Prestij.', component: DiamondBadge },
    { id: 'badge_aura', name: 'Aura', price: 2500, type: 'avatarBadge', description: 'Enerji.', component: AuraBadge },
    { id: 'badge_neon_sign', name: 'Neon', price: 2200, type: 'avatarBadge', description: 'Işıltı.', component: NeonSignBadge },
    { id: 'badge_samurai', name: 'Samuray', price: 3000, type: 'avatarBadge', description: 'Güç.', component: SamuraiBadge },
    { id: 'badge_binary', name: 'Binary', price: 1800, type: 'avatarBadge', description: 'Kod.', component: BinaryBadge },


    // ==========================================
    // 4. MEVCUT ÇERÇEVELER
    // ==========================================
    {
        id: 'frame_rainbow',
        name: 'Gökkuşağı Sınırı',
        price: 1000,
        type: 'avatarFrame',
        assetUrl: 'conic-gradient(from 180deg at 50% 50%, #ffc800, #ff0080, #00a2ff, #00f0a0, #ffc800)',
        description: 'Profilinize renk katın.',
    },
    {
        id: 'frame_gold',
        name: 'Altın Çerçeve',
        price: 2500,
        type: 'avatarFrame',
        assetUrl: 'linear-gradient(to right, #f7971e, #ffd200)',
        description: 'Prestijinizi gösterin.',
    },
    {
        id: 'frame_fire',
        name: 'Alev Çerçevesi',
        price: 1200,
        type: 'avatarFrame',
        assetUrl: 'linear-gradient(to right, #ff416c, #ff4b2b)',
        description: 'Ateşli bir ruh için.',
    },
    {
        id: 'frame_ocean',
        name: 'Okyanus Esintisi',
        price: 750,
        type: 'avatarFrame',
        assetUrl: 'linear-gradient(to right, #136a8a, #267871)',
        description: 'Sakin ve ferahlatıcı bir dokunuş.',
    },
    {
        id: 'frame_forest',
        name: 'Orman Yeşili',
        price: 750,
        type: 'avatarFrame',
        assetUrl: 'linear-gradient(to right, #134e5e, #71b280)',
        description: 'Doğayla iç içe bir görünüm.',
    },
    {
        id: 'frame_galaxy_purple',
        name: 'Mor Galaksi',
        price: 1500,
        type: 'avatarFrame',
        assetUrl: 'linear-gradient(to right, #480048, #C04848)',
        description: 'Evrenin gizemini taşıyın.',
    },
    {
        id: 'frame_sunrise',
        name: 'Gündoğumu',
        price: 900,
        type: 'avatarFrame',
        assetUrl: 'linear-gradient(to right, #F37335, #FDC830)',
        description: 'Her güne yeni bir başlangıç.',
    },
    {
        id: 'frame_candy',
        name: 'Şeker Dükkanı',
        price: 800,
        type: 'avatarFrame',
        assetUrl: 'linear-gradient(to right, #a8ff78, #78ffd6)',
        description: 'Tatlı ve eğlenceli bir görünüm.',
    },
    {
        id: 'frame_techno',
        name: 'Tekno Devre',
        price: 1800,
        type: 'avatarFrame',
        assetUrl: 'repeating-linear-gradient(45deg, #00ffff, #00ffff 2px, transparent 2px, transparent 10px), repeating-linear-gradient(-45deg, #00ffff, #00ffff 2px, transparent 2px, transparent 10px)',
        description: 'Dijital bir dokunuş.',
    },
    {
        id: 'frame_comic',
        name: 'Çizgi Roman',
        price: 1300,
        type: 'avatarFrame',
        assetUrl: 'radial-gradient(circle, #facc15 10%, transparent 10%), radial-gradient(circle, #facc15 10%, transparent 10%) 5px 5px, linear-gradient(#ef4444 2px, transparent 2px) 0 -1px, linear-gradient(90deg, #ef4444 2px, transparent 2px) -1px 0',
        description: 'Süper kahramanlar gibi.',
    },
    {
        id: 'frame_leaves',
        name: 'Sarmaşık Yapraklar',
        price: 1100,
        type: 'avatarFrame',
        assetUrl: 'repeating-conic-gradient(#22c55e 0% 15%, #16a34a 15% 30%)',
        description: 'Doğal ve taze bir his.',
    },
    {
        id: 'frame_gs',
        name: 'Cimbom Ruhu Çerçevesi',
        price: 1905,
        type: 'avatarFrame',
        assetUrl: 'linear-gradient(to right, #FDB913 50%, #C10E21 50%)',
        description: 'Sarı kırmızı renklerle desteğini göster.',
    },
    {
        id: 'frame_fb',
        name: 'Kanarya Alevi Çerçevesi',
        price: 1907,
        type: 'avatarFrame',
        assetUrl: 'linear-gradient(to right, #003366 50%, #FBB03B 50%)',
        description: 'Sarı lacivert renklerle takımını temsil et.',
    },
    {
        id: 'frame_bjk',
        name: 'Kara Kartal Pençesi Çerçevesi',
        price: 1903,
        type: 'avatarFrame',
        assetUrl: 'linear-gradient(to right, #000000 50%, #FFFFFF 50%)',
        description: 'Siyah beyaz asaletiyle fark yarat.',
    },
    {
        id: 'frame_neon_blue_old',
        name: 'Mavi Neon (Klasik)',
        price: 3000,
        type: 'avatarFrame',
        assetUrl: 'linear-gradient(to right, #00BCD4, #4DD0E1, #00BCD4), radial-gradient(circle at 50% 50%, rgba(0, 188, 212, 0.5) 0%, transparent 70%)',
        description: 'Sonsuz parıltılı mavi ışık.',
    },
    {
        id: 'frame_dark_matter_old',
        name: 'Kara Madde (Klasik)',
        price: 5000,
        type: 'avatarFrame',
        assetUrl: 'radial-gradient(circle at 50% 50%, #000000 0%, #1a1a1a 80%), repeating-conic-gradient(#333333 0% 1%, transparent 1% 2%)',
        description: 'Evrendeki en nadir ve karanlık sınır.',
    },
    {
        id: 'frame_magma_core_old',
        name: 'Magma Çekirdeği (Klasik)',
        description: 'İçinden ateş ve lav fışkıran görünüm.',
        price: 7500,
        type: 'avatarFrame',
        assetUrl: 'linear-gradient(to bottom right, #960000, #ff0000, #ff9a00, #ffff00)',
    },
    {
        id: 'frame_holographic_old',
        name: 'Holografik (Klasik)',
        description: 'Sürekli renk değiştiren yüzey.',
        price: 4000,
        type: 'avatarFrame',
        assetUrl: 'linear-gradient(45deg, rgba(255,0,0,0.4), rgba(255,165,0,0.4), rgba(255,255,0,0.4), rgba(0,128,0,0.4), rgba(0,0,255,0.4), rgba(75,0,130,0.4), rgba(238,130,238,0.4))',
    },

    // ==========================================
    // 5. HARF ROZETLERİ (DEĞİŞİKLİK YOK)
    // ==========================================
    { id: 'badge_letter_a', name: 'Harf Rozeti - A', price: 300, type: 'avatarBadge', description: 'Profilini A harfiyle süsle.', component: LetterABadge },
    { id: 'badge_letter_b', name: 'Harf Rozeti - B', price: 300, type: 'avatarBadge', description: 'Profilini B harfiyle süsle.', component: LetterBBadge },
    { id: 'badge_letter_c', name: 'Harf Rozeti - C', price: 300, type: 'avatarBadge', description: 'Profilini C harfiyle süsle.', component: LetterCBadge },
    { id: 'badge_letter_cc', name: 'Harf Rozeti - Ç', price: 300, type: 'avatarBadge', description: 'Profilini Ç harfiyle süsle.', component: LetterCcBadge },
    { id: 'badge_letter_d', name: 'Harf Rozeti - D', price: 300, type: 'avatarBadge', description: 'Profilini D harfiyle süsle.', component: LetterDBadge },
    { id: 'badge_letter_e', name: 'Harf Rozeti - E', price: 300, type: 'avatarBadge', description: 'Profilini E harfiyle süsle.', component: LetterEBadge },
    { id: 'badge_letter_f', name: 'Harf Rozeti - F', price: 300, type: 'avatarBadge', description: 'Profilini F harfiyle süsle.', component: LetterFBadge },
    { id: 'badge_letter_g', name: 'Harf Rozeti - G', price: 300, type: 'avatarBadge', description: 'Profilini G harfiyle süsle.', component: LetterGBadge },
    { id: 'badge_letter_gg', name: 'Harf Rozeti - Ğ', price: 300, type: 'avatarBadge', description: 'Profilini Ğ harfiyle süsle.', component: LetterGgBadge },
    { id: 'badge_letter_h', name: 'Harf Rozeti - H', price: 300, type: 'avatarBadge', description: 'Profilini H harfiyle süsle.', component: LetterHBadge },
    { id: 'badge_letter_i', name: 'Harf Rozeti - I', price: 300, type: 'avatarBadge', description: 'Profilini I harfiyle süsle.', component: LetterIBadge },
    { id: 'badge_letter_ii', name: 'Harf Rozeti - İ', price: 300, type: 'avatarBadge', description: 'Profilini İ harfiyle süsle.', component: LetterIiBadge },
    { id: 'badge_letter_j', name: 'Harf Rozeti - J', price: 300, type: 'avatarBadge', description: 'Profilini J harfiyle süsle.', component: LetterJBadge },
    { id: 'badge_letter_k', name: 'Harf Rozeti - K', price: 300, type: 'avatarBadge', description: 'Profilini K harfiyle süsle.', component: LetterKBadge },
    { id: 'badge_letter_l', name: 'Harf Rozeti - L', price: 300, type: 'avatarBadge', description: 'Profilini L harfiyle süsle.', component: LetterLBadge },
    { id: 'badge_letter_m', name: 'Harf Rozeti - M', price: 300, type: 'avatarBadge', description: 'Profilini M harfiyle süsle.', component: LetterMBadge },
    { id: 'badge_letter_n', name: 'Harf Rozeti - N', price: 300, type: 'avatarBadge', description: 'Profilini N harfiyle süsle.', component: LetterNBadge },
    { id: 'badge_letter_o', name: 'Harf Rozeti - O', price: 300, type: 'avatarBadge', description: 'Profilini O harfiyle süsle.', component: LetterOBadge },
    { id: 'badge_letter_oo', name: 'Harf Rozeti - Ö', price: 300, type: 'avatarBadge', description: 'Profilini Ö harfiyle süsle.', component: LetterOoBadge },
    { id: 'badge_letter_p', name: 'Harf Rozeti - P', price: 300, type: 'avatarBadge', description: 'Profilini P harfiyle süsle.', component: LetterPBadge },
    { id: 'badge_letter_r', name: 'Harf Rozeti - R', price: 300, type: 'avatarBadge', description: 'Profilini R harfiyle süsle.', component: LetterRBadge },
    { id: 'badge_letter_s', name: 'Harf Rozeti - S', price: 300, type: 'avatarBadge', description: 'Profilini S harfiyle süsle.', component: LetterSBadge },
    { id: 'badge_letter_ss', name: 'Harf Rozeti - Ş', price: 300, type: 'avatarBadge', description: 'Profilini Ş harfiyle süsle.', component: LetterSsBadge },
    { id: 'badge_letter_t', name: 'Harf Rozeti - T', price: 300, type: 'avatarBadge', description: 'Profilini T harfiyle süsle.', component: LetterTBadge },
    { id: 'badge_letter_u', name: 'Harf Rozeti - U', price: 300, type: 'avatarBadge', description: 'Profilini U harfiyle süsle.', component: LetterUBadge },
    { id: 'badge_letter_uu', name: 'Harf Rozeti - Ü', price: 300, type: 'avatarBadge', description: 'Profilini Ü harfiyle süsle.', component: LetterUuBadge },
    { id: 'badge_letter_v', name: 'Harf Rozeti - V', price: 300, type: 'avatarBadge', description: 'Profilini V harfiyle süsle.', component: LetterVBadge },
    { id: 'badge_letter_y', name: 'Harf Rozeti - Y', price: 300, type: 'avatarBadge', description: 'Profilini Y harfiyle süsle.', component: LetterYBadge },
    { id: 'badge_letter_z', name: 'Harf Rozeti - Z', price: 300, type: 'avatarBadge', description: 'Profilini Z harfiyle süsle.', component: LetterZBadge },
];