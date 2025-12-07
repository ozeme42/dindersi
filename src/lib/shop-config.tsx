
import type { ShopItem } from './types';
import { 
    Zap, Shield, Crown, Swords, Rocket, Terminal, 
    Ghost, Key, Flame, Snowflake, Star, Hexagon,
    Cpu, Gamepad2, Skull, Heart, BookOpen, Music, Atom, 
    Headphones, Infinity, Globe, Anchor, Camera, Briefcase, 
    Utensils, Eye, Moon, Sun, Flag
} from 'lucide-react';

// --- ÖZEL ROZET BİLEŞENLERİ (Custom Badge Components) ---
// Birden fazla Lucide ikonunu birleştirerek oluşturulan "kompozit" rozetler.

const CyberGuardianBadge = (props: React.SVGProps<SVGSVGElement>) => (
    <div className="relative w-full h-full flex items-center justify-center">
        <Shield className="w-full h-full text-blue-500 absolute opacity-80" />
        <Zap className="w-2/3 h-2/3 text-yellow-400 relative z-10 drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]" />
    </div>
);

const LegendaryLeaderBadge = (props: React.SVGProps<SVGSVGElement>) => (
    <div className="relative w-full h-full flex items-center justify-center">
        <Swords className="w-full h-full text-slate-600 absolute rotate-45 opacity-60" />
        <Crown className="w-3/4 h-3/4 text-amber-500 relative z-10 drop-shadow-lg -mt-2" />
    </div>
);

const CodeMasterBadge = (props: React.SVGProps<SVGSVGElement>) => (
    <div className="relative w-full h-full flex items-center justify-center">
        <Hexagon className="w-full h-full text-green-900 absolute rotate-90 opacity-80" />
        <Terminal className="w-2/3 h-2/3 text-green-400 relative z-10 drop-shadow-[0_0_8px_rgba(74,222,128,0.6)]" />
    </div>
);

const FutureArchitectBadge = (props: React.SVGProps<SVGSVGElement>) => (
    <div className="relative w-full h-full flex items-center justify-center group">
        <Cpu className="w-full h-full text-purple-800 absolute opacity-70 group-hover:rotate-90 transition-transform duration-500" />
        <Rocket className="w-2/3 h-2/3 text-purple-400 relative z-10 -rotate-45 drop-shadow-md" />
    </div>
);

const ElementalMasterBadge = (props: React.SVGProps<SVGSVGElement>) => (
    <div className="relative w-full h-full flex items-center justify-center">
        <Flame className="w-2/3 h-2/3 text-orange-500 absolute -left-1 top-0 opacity-80 drop-shadow-sm" />
        <Snowflake className="w-2/3 h-2/3 text-cyan-300 absolute -right-1 bottom-0 opacity-80 drop-shadow-sm" />
    </div>
);

const EliteGamerBadge = (props: React.SVGProps<SVGSVGElement>) => (
    <div className="relative w-full h-full flex items-center justify-center">
        <Star className="w-full h-full text-red-600 absolute opacity-40 animate-pulse" />
        <Gamepad2 className="w-3/4 h-3/4 text-red-500 relative z-10 drop-shadow-[0_0_12px_rgba(239,68,68,0.7)]" />
    </div>
);

const SpaceExplorerBadge = (props: React.SVGProps<SVGSVGElement>) => (
    <div className="relative w-full h-full flex items-center justify-center">
        <Globe className="w-full h-full text-blue-900 absolute opacity-60" />
        <Rocket className="w-2/3 h-2/3 text-white relative z-10 -rotate-45 drop-shadow-md" />
    </div>
);

const MysticEyeBadge = (props: React.SVGProps<SVGSVGElement>) => (
    <div className="relative w-full h-full flex items-center justify-center">
        <Hexagon className="w-full h-full text-purple-900 absolute opacity-80" />
        <Eye className="w-2/3 h-2/3 text-purple-400 relative z-10 drop-shadow-[0_0_8px_rgba(168,85,247,0.6)]" />
    </div>
);

const NightOwlBadge = (props: React.SVGProps<SVGSVGElement>) => (
    <div className="relative w-full h-full flex items-center justify-center">
        <div className="w-full h-full bg-slate-800 rounded-full absolute opacity-50" />
        <Moon className="w-2/3 h-2/3 text-indigo-300 relative z-10 drop-shadow-md" />
    </div>
);

const SunChaserBadge = (props: React.SVGProps<SVGSVGElement>) => (
    <div className="relative w-full h-full flex items-center justify-center">
        <Sun className="w-full h-full text-orange-400 absolute opacity-40 animate-spin-slow" />
        <Sun className="w-2/3 h-2/3 text-yellow-400 relative z-10 drop-shadow-[0_0_15px_rgba(250,204,21,0.8)]" />
    </div>
);

const BookWormBadge = (props: React.SVGProps<SVGSVGElement>) => (
    <div className="relative w-full h-full flex items-center justify-center">
        <BookOpen className="w-3/4 h-3/4 text-emerald-600 relative z-10" />
        <Star className="w-1/3 h-1/3 text-yellow-400 absolute -top-1 -right-1 z-20" />
    </div>
);

const MusicMaestroBadge = (props: React.SVGProps<SVGSVGElement>) => (
    <div className="relative w-full h-full flex items-center justify-center">
        <Music className="w-full h-full text-pink-500 absolute opacity-30 animate-bounce" />
        <Headphones className="w-2/3 h-2/3 text-pink-600 relative z-10" />
    </div>
);

const ScienceGeekBadge = (props: React.SVGProps<SVGSVGElement>) => (
    <div className="relative w-full h-full flex items-center justify-center">
        <Atom className="w-3/4 h-3/4 text-cyan-500 animate-spin-slow" />
    </div>
);

const InfinitePowerBadge = (props: React.SVGProps<SVGSVGElement>) => (
    <div className="relative w-full h-full flex items-center justify-center">
        <Infinity className="w-3/4 h-3/4 text-fuchsia-500 drop-shadow-[0_0_8px_rgba(217,70,239,0.6)]" />
    </div>
);

const PixelLoveBadge = (props: React.SVGProps<SVGSVGElement>) => (
    <div className="relative w-full h-full flex items-center justify-center">
        <Heart className="w-3/4 h-3/4 text-red-500 fill-red-500 drop-shadow-md" />
    </div>
);

// --- MAĞAZA ÜRÜNLERİ LİSTESİ ---
export const SHOP_ITEMS: ShopItem[] = [
    // --- ÇERÇEVELER (Frames) ---
    {
        id: 'frame-neon-cyber',
        name: 'Siber Neon',
        description: 'Dijital dünyada parlayan mavi ve mor neon ışıklar.',
        price: 500,
        type: 'avatarFrame',
        assetUrl: 'linear-gradient(135deg, #00f260 0%, #0575e6 100%), radial-gradient(circle at top left, rgba(0,242,96,0.5), transparent 40%)',
    },
    {
        id: 'frame-matrix-code',
        name: 'Matrix Yağmuru',
        description: 'Yeşil dijital kodların aktığı bir çerçeve.',
        price: 1200,
        type: 'avatarFrame',
        assetUrl: 'repeating-linear-gradient(0deg, rgba(0, 255, 70, 0.1) 0px, rgba(0, 255, 70, 0.1) 1px, transparent 1px, transparent 5px), linear-gradient(to bottom, #000000, #0f3d0f)',
    },
    {
        id: 'frame-golden-glory',
        name: 'Altın İhtişam',
        description: 'Gerçek şampiyonlar için lüks, parlayan altın doku.',
        price: 2500,
        type: 'avatarFrame',
        assetUrl: 'radial-gradient(ellipse farthest-corner at right bottom, #FEDB37 0%, #FDB931 8%, #9f7928 30%, #8A6E2F 40%, transparent 80%), radial-gradient(ellipse farthest-corner at left top, #FFFFFF 0%, #FFFFAC 8%, #D1B464 25%, #5d4a1f 62%, #5d4a1f 100%)',
    },
    {
        id: 'frame-holographic',
        name: 'Holografik Yansıma',
        description: 'Sürekli renk değiştiren, fütüristik bir yüzey.',
        price: 4000,
        type: 'avatarFrame',
        assetUrl: 'linear-gradient(45deg, rgba(255,0,0,0.4), rgba(255,165,0,0.4), rgba(255,255,0,0.4), rgba(0,128,0,0.4), rgba(0,0,255,0.4), rgba(75,0,130,0.4), rgba(238,130,238,0.4)), url("data:image/svg+xml,%3Csvg viewBox=%270 0 250 250%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27noiseFilter%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%274%27 numOctaves=%273%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23noiseFilter)%27 opacity=%270.1%27/%3E%3C/svg%3E")',
    },
    {
        id: 'frame-magma-core',
        name: 'Magma Çekirdeği',
        description: 'İçinden ateş ve lav fışkıran agresif bir görünüm.',
        price: 7500,
        type: 'avatarFrame',
        assetUrl: 'linear-gradient(to bottom right, #960000, #ff0000, #ff9a00, #ffff00)',
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
        id: 'frame_galaxy_purple',
        name: 'Mor Galaksi',
        price: 1500,
        type: 'avatarFrame',
        assetUrl: 'linear-gradient(to right, #480048, #C04848), radial-gradient(circle at 50% 50%, rgba(255,255,255,0.1) 0%, transparent 60%)',
        description: 'Evrenin gizemini taşıyın.',
    },
    {
        id: 'frame_gs',
        name: 'Cimbom Ruhu',
        price: 1905,
        type: 'avatarFrame',
        assetUrl: 'linear-gradient(to right, #FDB913 50%, #C10E21 50%)',
        description: 'Sarı kırmızı renklerle desteğini göster.',
    },
    {
        id: 'frame_fb',
        name: 'Kanarya Alevi',
        price: 1907,
        type: 'avatarFrame',
        assetUrl: 'linear-gradient(to right, #003366 50%, #FBB03B 50%)',
        description: 'Sarı lacivert renklerle takımını temsil et.',
    },
    {
        id: 'frame_bjk',
        name: 'Kara Kartal',
        price: 1903,
        type: 'avatarFrame',
        assetUrl: 'linear-gradient(to right, #000000 50%, #FFFFFF 50%)',
        description: 'Siyah beyaz asaletiyle fark yarat.',
    },

    // --- ROZETLER (Badges) ---
    {
        id: 'badge-cyber-guardian',
        name: 'Siber Muhafız',
        description: 'Sistemi koruyan dijital bir kalkan ve enerji sembolü.',
        price: 800,
        type: 'avatarBadge',
        component: CyberGuardianBadge,
    },
    {
        id: 'badge-code-master',
        name: 'Kod Ustası',
        description: 'Dijital dünyanın dilini konuşanlar için.',
        price: 1500,
        type: 'avatarBadge',
        component: CodeMasterBadge,
    },
    {
        id: 'badge-legendary-leader',
        name: 'Efsanevi Lider',
        description: 'Savaş meydanlarının taçsız kralı.',
        price: 3000,
        type: 'avatarBadge',
        component: LegendaryLeaderBadge,
    },
    {
        id: 'badge-future-architect',
        name: 'Geleceğin Mimarı',
        description: 'Teknoloji ve vizyonu birleştiren bir sembol.',
        price: 5000,
        type: 'avatarBadge',
        component: FutureArchitectBadge,
    },
    {
        id: 'badge-elemental-master',
        name: 'Element Ustası',
        description: 'Ateş ve buzun dengesine hükmedenler için.',
        price: 8000,
        type: 'avatarBadge',
        component: ElementalMasterBadge,
    },
    {
        id: 'badge-elite-gamer',
        name: 'Elit Oyuncu',
        description: 'Sadece en iyilerin taşıyabileceği, parlayan bir nişan.',
        price: 12000,
        type: 'avatarBadge',
        component: EliteGamerBadge,
    },
    {
        id: 'badge_space_explorer',
        name: 'Uzay Kaşifi',
        price: 1800,
        type: 'avatarBadge',
        description: 'Yıldızlara yolculuk.',
        component: SpaceExplorerBadge,
    },
    {
        id: 'badge_mystic_eye',
        name: 'Mistik Göz',
        price: 1750,
        type: 'avatarBadge',
        description: 'Görünenin ötesini görenler için.',
        component: MysticEyeBadge,
    },
    {
        id: 'badge_night_owl',
        name: 'Gece Kuşu',
        price: 900,
        type: 'avatarBadge',
        description: 'Geceleri yaşayanlar için.',
        component: NightOwlBadge,
    },
    {
        id: 'badge_sun_chaser',
        name: 'Güneş Avcısı',
        price: 900,
        type: 'avatarBadge',
        description: 'Pozitif ve aydınlık.',
        component: SunChaserBadge,
    },
    {
        id: 'badge_book_worm',
        name: 'Kitap Kurdu',
        price: 1100,
        type: 'avatarBadge',
        description: 'Bilgi güçtür.',
        component: BookWormBadge,
    },
    {
        id: 'badge_music_maestro',
        name: 'Müzik Üstadı',
        price: 850,
        type: 'avatarBadge',
        description: 'Hayatın ritmini yakala.',
        component: MusicMaestroBadge,
    },
    {
        id: 'badge_science_geek',
        name: 'Bilim Dehası',
        price: 1600,
        type: 'avatarBadge',
        description: 'Her şeyin teorisi.',
        component: ScienceGeekBadge,
    },
    {
        id: 'badge_infinite_power',
        name: 'Sonsuz Güç',
        price: 2000,
        type: 'avatarBadge',
        description: 'Limit tanımayanlar için.',
        component: InfinitePowerBadge,
    },
    {
        id: 'badge_pixel_love',
        name: 'Piksel Aşkı',
        price: 650,
        type: 'avatarBadge',
        description: 'Retro oyun tutkusu.',
        component: PixelLoveBadge,
    },
];
