
"use client";

import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { auth } from "@/lib/firebase";

type AuthGuardProps = {
  children: ReactNode;
  role: "student" | "teacher" | "superadmin" | ("student" | "teacher" | "superadmin")[];
};

export function AuthGuard({ children, role }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) {
      return; // Still waiting for user state to be determined.
    }

    // If authentication is finished and there's no user, redirect to login.
    if (!user) {
      router.push("/login");
      return;
    }

    // If user is authenticated but role is missing (e.g., Firestore doc not found),
    // it's an invalid state. Log them out and redirect to login.
    if (!user.role) {
      console.error("User is authenticated but role is missing. Logging out.");
      auth.signOut();
      router.push("/login");
      return;
    }

    const requiredRoles = Array.isArray(role) ? role : [role];

    // If the user's role does not match the required roles for this page,
    // redirect them to their correct dashboard.
    if (!requiredRoles.includes(user.role)) {
      const redirectPath =
        user.role === "teacher" || user.role === "superadmin" ? "/" : "/student";
      router.push(redirectPath);
    }
  }, [user, loading, role, router]);


  const requiredRoles = Array.isArray(role) ? role : [role];

  // While loading or redirecting, show a spinner.
  if (loading || !user || !user.role || !requiredRoles.includes(user.role)) {
    return (
      <div className="flex h-[calc(100vh-theme(height.16))] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If everything is correct, render the page content.
  return <>{children}</>;
}
