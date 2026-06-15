"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

export type UserRole = "admin" | "teacher" | "student" | null;

export interface UserSession {
  role: UserRole;
  pin: string | null;
  classroomLock: string | null; // e.g., "2/1" or null for admin/student
}

interface AuthContextType {
  session: UserSession;
  login: (pin: string) => Promise<boolean>;
  loginStudent: () => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Validates the teacher PIN structure: TEACHER_MDXY
// Where X is grade (2-6) and Y is room (1-4 for grade 2, 3; 1-5 for grade 4, 5, 6)
function validateTeacherPin(pin: string): string | null {
  const match = pin.trim().match(/^TEACHER_MD([2-6])([1-5])$/);
  if (!match) return null;
  
  const grade = parseInt(match[1], 10);
  const room = parseInt(match[2], 10);

  // Classroom restrictions check
  if (grade === 2 && (room < 1 || room > 4)) return null;
  if (grade === 3 && (room < 1 || room > 4)) return null;
  if (grade === 4 && (room < 1 || room > 5)) return null;
  if (grade === 5 && (room < 1 || room > 5)) return null;
  if (grade === 6 && (room < 1 || room > 5)) return null;

  return `${grade}/${room}`;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<UserSession>({
    role: null,
    pin: null,
    classroomLock: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Load session from sessionStorage on mount
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      
      if (data.session) {
        const storedRole = sessionStorage.getItem("auth_role") as UserRole;
        const storedPin = sessionStorage.getItem("auth_pin");
        const storedLock = sessionStorage.getItem("auth_lock");

        if (storedRole) {
          setSession({
            role: storedRole,
            pin: storedPin,
            classroomLock: storedLock,
          });
        }
      } else {
        const storedRole = sessionStorage.getItem("auth_role") as UserRole;
        if (storedRole === "student") {
          setSession({
            role: "student",
            pin: null,
            classroomLock: null,
          });
        } else {
          sessionStorage.removeItem("auth_role");
          sessionStorage.removeItem("auth_pin");
          sessionStorage.removeItem("auth_lock");
        }
      }
      setIsLoading(false);
    };

    if (typeof window !== "undefined") {
      checkSession();
    }
  }, []);

  // Redirect logic based on auth status
  useEffect(() => {
    if (isLoading) return;

    const isStudentRoute = pathname?.startsWith("/student");
    const isDashboardRoute = pathname?.startsWith("/dashboard");

    if (!session.role) {
      // Redirect to login if on dashboard or student page (unless student page is accessed directly)
      if (isDashboardRoute) {
        router.push("/login");
      }
    } else if (session.role === "student") {
      if (isDashboardRoute) {
        router.push("/student");
      }
    } else {
      // Teacher or Admin
      if (isStudentRoute || pathname === "/login" || pathname === "/") {
        router.push("/dashboard/attendance");
      }
    }
  }, [session, isLoading, pathname, router]);

  const login = async (pin: string): Promise<boolean> => {
    const trimmedPin = pin.trim();
    const email = `${trimmedPin}@smd.com`.toLowerCase();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: trimmedPin,
    });

    if (error || !data.user) {
      console.error("Login failed:", error?.message);
      return false;
    }

    // 1. Admin Check
    if (trimmedPin.startsWith("ADMIN_")) {
      const adminSession: UserSession = {
        role: "admin",
        pin: trimmedPin,
        classroomLock: null,
      };
      setSession(adminSession);
      sessionStorage.setItem("auth_role", "admin");
      sessionStorage.setItem("auth_pin", trimmedPin);
      sessionStorage.removeItem("auth_lock");
      router.push("/dashboard/attendance");
      return true;
    }

    // 2. Teacher Check
    const classroomLock = validateTeacherPin(trimmedPin);
    if (classroomLock) {
      const teacherSession: UserSession = {
        role: "teacher",
        pin: trimmedPin,
        classroomLock,
      };
      setSession(teacherSession);
      sessionStorage.setItem("auth_role", "teacher");
      sessionStorage.setItem("auth_pin", trimmedPin);
      sessionStorage.setItem("auth_lock", classroomLock);
      router.push("/dashboard/attendance");
      return true;
    }

    await supabase.auth.signOut();
    return false;
  };

  const loginStudent = () => {
    const studentSession: UserSession = {
      role: "student",
      pin: null,
      classroomLock: null,
    };
    setSession(studentSession);
    sessionStorage.setItem("auth_role", "student");
    sessionStorage.removeItem("auth_pin");
    sessionStorage.removeItem("auth_lock");
    router.push("/student");
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setSession({ role: null, pin: null, classroomLock: null });
    sessionStorage.removeItem("auth_role");
    sessionStorage.removeItem("auth_pin");
    sessionStorage.removeItem("auth_lock");
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ session, login, loginStudent, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
