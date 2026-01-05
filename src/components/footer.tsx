import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="w-full border-t border-slate-200 bg-white py-8 mt-auto">
      <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Sol Taraf: Telif Hakkı / Marka */}
        <div className="text-center md:text-left">
          <p className="text-sm font-semibold text-slate-700">
            Din Dersi Atölyesi
          </p>
          <p className="text-xs text-slate-500 mt-1">
            © {new Date().getFullYear()} Tüm hakları saklıdır.
          </p>
        </div>

        {/* Sağ Taraf: İletişim Butonu */}
        <Link 
          href="https://t.me/dindersiatolyesi" 
          target="_blank" 
          rel="noopener noreferrer"
          className="group flex items-center gap-2 px-4 py-2 rounded-full bg-slate-50 border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-300"
        >
          {/* Telegram SVG İkonu */}
          <div className="relative flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white group-hover:scale-110 transition-transform">
            <svg 
              viewBox="0 0 24 24" 
              fill="currentColor" 
              className="w-3.5 h-3.5 ml-[-1px] mt-[1px]" // Görsel dengeleme
            >
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 11.944 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
            </svg>
          </div>
          
          <span className="text-sm font-medium text-slate-600 group-hover:text-blue-600 transition-colors">
            Telegram Destek
          </span>
        </Link>
      </div>
    </footer>
  );
}