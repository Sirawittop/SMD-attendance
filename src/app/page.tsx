"use client";

import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

export default function RootPage() {
  const { session, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (session.role) {
        if (session.role === "student") {
          router.push("/student");
        } else {
          router.push("/dashboard/attendance");
        }
      } else {
        router.push("/login");
      }
    }
  }, [session, isLoading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-orange-50/20">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-orange-500"></div>
    </div>
  );
}
