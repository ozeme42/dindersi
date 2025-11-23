

"use client";

import { useRouter } from 'next/navigation';
import { useAuth } from "@/context/auth-context";
import { Loader2 } from "lucide-react";

// This page now only serves to redirect users. 
// The main dashboard logic has been consolidated into the root `src/app/page.tsx`.
export default function TeacherDashboardRedirect() {
  const { user, loading } = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  // Redirect to the appropriate main page.
  if (user) {
    router.replace('/');
  } else {
    router.replace('/login');
  }

  return (
      <div className="flex h-screen w-full items-center justify-center">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
}
