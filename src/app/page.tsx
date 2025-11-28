
'use client';

import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';

export default function Home() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading) {
            if (user) {
                // If user has a student role, redirect to student dashboard
                if (user.role === 'student') {
                    router.replace('/student');
                }
                // Teachers and superadmins will stay on this page, which will show their dashboard
                // The main dashboard content will be in a component that checks for teacher/superadmin role
            } else {
                // If no user, redirect to login
                router.replace('/login');
            }
        }
    }, [user, loading, router]);
    
    // For teachers and superadmins, this page will render their specific dashboard.
    // For students, it shows a loader while redirecting.
    // For non-logged-in users, it shows a loader while redirecting to login.
    
    if (loading || user?.role === 'student' || !user) {
         return (
            <div className="flex h-screen items-center justify-center bg-[#2b1055]">
                <Loader2 className="h-12 w-12 animate-spin text-white" />
            </div>
        );
    }

  // Teacher/Superadmin content would be rendered here
  // For now, let's assume `LoggedInDashboard` handles this.
  // But based on the request, let's build the teacher dashboard view here as well
  // Or better, keep it in a separate component and render it here.
  // For now, a simple placeholder while the student is being redirected.
  
   // This part will be reached only by teachers/superadmins
  // We can import and render the teacher dashboard component here
  return (
    <div className="text-white">
      {/* Teacher/Superadmin Dashboard Component will go here */}
      <p>Öğretmen Paneli Yükleniyor...</p>
      <Loader2 className="h-12 w-12 animate-spin text-white" />
    </div>
  );
}

