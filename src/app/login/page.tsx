"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { KeyRound, GraduationCap, Database, RefreshCw } from "lucide-react";
import { isMockMode, setForceMockMode, getScriptUrl } from "@/lib/api";

export default function LoginPage() {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, loginStudent } = useAuth();
  const { showToast } = useToast();
  
  const mockActive = isMockMode();
  const scriptUrlSet = !!getScriptUrl();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin) {
      showToast("กรุณากรอกรหัสผ่าน (PIN)", "warning");
      return;
    }

    setLoading(true);
    // Simulate brief validation delay
    setTimeout(() => {
      const success = login(pin);
      setLoading(false);
      if (success) {
        showToast("เข้าสู่ระบบสำเร็จ", "success");
      } else {
        showToast("รหัสผ่านไม่ถูกต้อง หรือไม่ได้อยู่ในช่วงรหัสที่กำหนด", "error");
      }
    }, 500);
  };

  const handleToggleMock = () => {
    if (!scriptUrlSet) {
      showToast("ยังไม่ได้ระบุ NEXT_PUBLIC_APPS_SCRIPT_URL ใน .env.local จะบังคับใช้โหมดจำลอง", "info");
      return;
    }
    const nextMock = !mockActive;
    setForceMockMode(nextMock);
    showToast(nextMock ? "สลับมาใช้โหมดจำลองการทำงาน" : "สลับมาใช้โหมดบันทึกเข้า Google Sheets จริง", "success");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-orange-50/50 to-orange-100/40">
      
      {/* Mock Mode Alert Banner */}
      <div className="mb-6 max-w-md w-full flex items-center justify-between gap-3 p-3.5 bg-orange-100/60 border border-orange-200 text-orange-950 text-xs rounded-2xl shadow-sm">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-orange-600 flex-shrink-0" />
          <div>
            <span className="font-bold">สถานะฐานข้อมูล: </span>
            <span>{mockActive ? "โหมดจำลอง (Mock DB ในเครื่อง)" : "โหมดจริง (Google Sheets Web App)"}</span>
          </div>
        </div>
        {scriptUrlSet ? (
          <button 
            onClick={handleToggleMock}
            className="flex items-center gap-1 bg-white hover:bg-orange-50 border border-orange-200 text-orange-700 px-2.5 py-1 rounded-xl font-bold transition-all"
          >
            <RefreshCw className="h-3 w-3" /> สลับโหมด
          </button>
        ) : (
          <span className="text-[10px] text-gray-500 bg-white px-2 py-0.5 rounded-lg border border-orange-200 font-semibold">Local Only</span>
        )}
      </div>

      <Card className="max-w-md w-full shadow-md border-orange-100 hover:shadow-lg transition-shadow duration-300">
        <CardHeader className="text-center bg-orange-500 text-white p-8 relative">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-orange-600"></div>
          <div className="mx-auto bg-white/20 p-3 rounded-2xl w-fit mb-4">
            <GraduationCap className="h-10 w-10 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-white tracking-wide">
            ระบบเช็คชื่อนักเรียน
          </CardTitle>
          <CardDescription className="text-orange-100 mt-1.5 font-medium text-xs">
            โรงเรียนมัธยมศึกษาดีเด่น (ม.ด.)
          </CardDescription>
        </CardHeader>
        
        <CardContent className="p-8 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Input
                label="รหัสผ่านเข้าใช้งาน (PIN สำหรับครู / ผู้ดูแลระบบ)"
                type="password"
                placeholder="กรอก PIN เช่น TEACHER_MD21 หรือ ADMIN_MD2026"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                disabled={loading}
                className="text-center font-mono tracking-widest text-lg"
              />
            </div>
            
            <Button
              type="submit"
              className="w-full h-11 text-base font-semibold"
              loading={loading}
            >
              <KeyRound className="h-4 w-4" /> เข้าสู่ระบบ
            </Button>
          </form>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-orange-100"></div>
            <span className="flex-shrink mx-4 text-gray-400 text-xs font-semibold">หรือ</span>
            <div className="flex-grow border-t border-orange-100"></div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={loginStudent}
            className="w-full h-11 border-orange-200 hover:bg-orange-50 text-orange-800 font-bold flex items-center justify-center gap-2"
          >
            <GraduationCap className="h-5 w-5 text-orange-600" /> พอร์ทัลนักเรียน (ไม่ต้องใช้รหัสผ่าน)
          </Button>
        </CardContent>
      </Card>
      
      {/* Help info */}
      <div className="mt-8 text-center text-xs text-gray-400 max-w-sm space-y-1 font-medium">
        <p>คุณครูใช้รหัสล็อกห้องเรียน: <code className="bg-orange-100/50 text-orange-800 px-1 rounded">TEACHER_MDXY</code> (2/1 - 6/5)</p>
        <p>ผู้ดูแลระบบใช้รหัสผ่าน: <code className="bg-orange-100/50 text-orange-800 px-1 rounded">ADMIN_MD2026</code></p>
      </div>
    </div>
  );
}
