'use client';
import { usePathname } from 'next/navigation';
import { AuthGuard } from '@/components/auth-guard';
import { StudentSidebar } from '@/components/student-sidebar';
import { cn } from '@/lib/utils';

export default function StudentLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();

    // Tam ekran sınav ve oyun sayfalarında sol menüyü gizle
    const isDistractionFree = [
        '/student/ders/',
        '/student/soru-bankasi/coz',
        '/student/deneme/coz',
        '/student/yarismalar/bireysel/oyun',
        '/student/yarismalar/duello/oyun',
        '/student/yarismalar/takim/oyun'
    ].some(path => pathname.startsWith(path));

    return (
        <AuthGuard role="student">
            <div className="min-h-screen bg-[#09071a] text-white flex flex-col">
                {!isDistractionFree && <StudentSidebar />}
                <div className={cn(
                    "flex-1 flex flex-col min-w-0 transition-all duration-200",
                    !isDistractionFree && "md:pl-72"
                )}>
                    {children}
                </div>
            </div>
        </AuthGuard>
    );
}
