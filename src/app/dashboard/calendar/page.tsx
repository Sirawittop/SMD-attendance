"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, RefreshCw, Calendar as CalendarIcon, AlertCircle } from "lucide-react";

const CLASSROOMS = [
  "2/1", "2/2", "2/3", "2/4",
  "3/1", "3/2", "3/3", "3/4",
  "4/1", "4/2", "4/3", "4/4", "4/5",
  "5/1", "5/2", "5/3", "5/4", "5/5",
  "6/1", "6/2", "6/3", "6/4", "6/5"
];

const MONTHS_THAI = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
];

export default function CalendarPage() {
  const { session } = useAuth();
  const { showToast } = useToast();
  
  const [selectedClassroom, setSelectedClassroom] = useState<string>(
    session.classroomLock || "2/1"
  );

  // Calendar states
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [loading, setLoading] = useState(false);
  const [studentCount, setStudentCount] = useState<number>(0);
  const [attendanceMap, setAttendanceMap] = useState<{ [dateStr: string]: number }>({});

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // Load classroom students and all attendance records
  const loadCalendarData = useCallback(async () => {
    if (!selectedClassroom) return;
    setLoading(true);
    try {
      // 1. Fetch student count
      const studentRes = await api.getStudents(selectedClassroom);
      const sCount = studentRes.success ? studentRes.students.length : 0;
      setStudentCount(sCount);

      // 2. Fetch all attendance records for classroom
      const attendanceRes = await api.getAttendance(selectedClassroom);
      const records = attendanceRes.success ? attendanceRes.attendance : [];

      // 3. Count records per date
      const map: { [dateStr: string]: number } = {};
      records.forEach((r) => {
        const dateStr = r.date; // YYYY-MM-DD
        map[dateStr] = (map[dateStr] || 0) + 1;
      });

      setAttendanceMap(map);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "เกิดข้อผิดพลาดในการโหลดข้อมูลปฏิทิน", "error");
    } finally {
      setLoading(false);
    }
  }, [selectedClassroom, showToast]);

  useEffect(() => {
    loadCalendarData();
  }, [selectedClassroom, loadCalendarData]);

  // Calendar Math
  const calendarDays = useMemo(() => {
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    // Day of the week of the first day (0 = Sunday, 1 = Monday, ...)
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();

    const days = [];
    
    // Fill in blanks for previous month offset
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }

    // Fill in days of current month
    for (let day = 1; day <= daysInMonth; day++) {
      const monthStr = String(currentMonth + 1).padStart(2, "0");
      const dayStr = String(day).padStart(2, "0");
      const dateKey = `${currentYear}-${monthStr}-${dayStr}`;
      days.push({
        day,
        dateKey,
        count: attendanceMap[dateKey] || 0,
      });
    }

    return days;
  }, [currentYear, currentMonth, attendanceMap]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentDate(new Date(currentYear, parseInt(e.target.value, 10), 1));
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentDate(new Date(parseInt(e.target.value, 10), currentMonth, 1));
  };

  const getDayStatus = (dayInfo: { day: number; dateKey: string; count: number } | null) => {
    if (!dayInfo) return "empty";
    if (dayInfo.count === 0) return "no-record";
    
    // If classroom has students and count equals studentCount, it's complete
    if (studentCount > 0 && dayInfo.count >= studentCount) {
      return "complete";
    }
    return "incomplete";
  };

  const todayStr = useMemo(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

  return (
    <div className="space-y-6">
      
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-orange-950 flex items-center gap-2">
            <CalendarIcon className="h-6 w-6 text-orange-600" /> ปฏิทินบันทึกข้อมูล
          </h2>
          <p className="text-gray-500 text-xs mt-1">
            ดูสถานะการเช็คชื่อรายวันของแต่ละเดือน: เขียว (ครบถ้วน), ส้ม (ยังไม่ครบ)
          </p>
        </div>
      </div>

      {/* Control bar */}
      <Card className="border-orange-100 shadow-sm">
        <CardContent className="p-5 flex flex-col md:flex-row items-end justify-between gap-4">
          
          <div className="flex flex-wrap items-end gap-3 w-full md:w-auto">
            {/* Classroom Select */}
            <div className="w-44">
              <Select
                label="ชั้นเรียน"
                value={selectedClassroom}
                onChange={(e) => setSelectedClassroom(e.target.value)}
                disabled={!!session.classroomLock}
                options={CLASSROOMS.map((cls) => ({ value: cls, label: `ห้องเรียน ${cls}` }))}
              />
            </div>

            {/* Month Select */}
            <div className="w-36 space-y-1.5">
              <label className="text-sm font-semibold text-gray-700 block">เดือน</label>
              <select
                value={currentMonth}
                onChange={handleMonthChange}
                className="h-10 w-full rounded-xl border border-orange-200 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-400"
              >
                {MONTHS_THAI.map((m, idx) => (
                  <option key={idx} value={idx}>{m}</option>
                ))}
              </select>
            </div>

            {/* Year Select */}
            <div className="w-28 space-y-1.5">
              <label className="text-sm font-semibold text-gray-700 block">ปี (ค.ศ.)</label>
              <select
                value={currentYear}
                onChange={handleYearChange}
                className="h-10 w-full rounded-xl border border-orange-200 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-400"
              >
                {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map((y) => (
                  <option key={y} value={y}>{y + 543} (ปี {y})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            <Button
              variant="outline"
              onClick={loadCalendarData}
              disabled={loading}
              className="px-4 border-orange-200 flex-grow md:flex-grow-0"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> รีเฟรช
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Calendar Body */}
      {studentCount === 0 && !loading ? (
        <Card className="border-orange-200 bg-orange-50/20">
          <CardContent className="p-8 text-center flex flex-col items-center justify-center gap-3">
            <AlertCircle className="h-10 w-10 text-orange-500" />
            <div>
              <h3 className="font-bold text-orange-950 text-base">ไม่พบคลังข้อมูลนักเรียนของห้อง {selectedClassroom}</h3>
              <p className="text-gray-500 text-xs mt-1">
                กรุณาเพิ่มรายชื่อนักเรียนก่อนเพื่อแสดงผลปฏิทินที่สมบูรณ์
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-orange-100 shadow-sm overflow-hidden bg-white">
          <CardHeader className="bg-orange-500/5 px-6 py-4 flex flex-row items-center justify-between border-b border-orange-100">
            <div>
              <CardTitle className="text-orange-950 font-bold text-base flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-orange-600" />
                <span>{MONTHS_THAI[currentMonth]} {currentYear + 543}</span>
              </CardTitle>
              <CardDescription className="text-gray-500 font-semibold text-xs mt-0.5">
                ห้องเรียน {selectedClassroom} • นักเรียนลงทะเบียน {studentCount} คน
              </CardDescription>
            </div>
            
            <div className="flex gap-1">
              <button
                onClick={handlePrevMonth}
                className="p-2 border border-orange-100 hover:bg-orange-50 rounded-xl text-orange-600 transition-colors"
              >
                <ChevronLeft className="h-4.5 w-4.5" />
              </button>
              <button
                onClick={handleNextMonth}
                className="p-2 border border-orange-100 hover:bg-orange-50 rounded-xl text-orange-600 transition-colors"
              >
                <ChevronRight className="h-4.5 w-4.5" />
              </button>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            
            {/* Days of week */}
            <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-bold text-gray-500">
              <div className="text-red-500">อา.</div>
              <div>จ.</div>
              <div>อ.</div>
              <div>พ.</div>
              <div>พฤ.</div>
              <div>ศ.</div>
              <div className="text-blue-500">ส.</div>
            </div>

            {/* Grid */}
            {loading ? (
              <div className="h-64 flex flex-col items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500 mb-2"></div>
                <span className="text-gray-400 text-xs font-semibold">กำลังโหลดข้อมูลสถานะปฏิทิน...</span>
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-2">
                {calendarDays.map((dayInfo, idx) => {
                  const status = getDayStatus(dayInfo);
                  const isToday = dayInfo?.dateKey === todayStr;

                  if (!dayInfo) {
                    return <div key={`empty-${idx}`} className="aspect-square bg-gray-50/20 rounded-xl border border-dashed border-gray-100" />;
                  }

                  // Styling based on status
                  let statusClasses = "bg-white border border-gray-200 text-gray-600 hover:bg-orange-50/20";
                  if (status === "complete") {
                    statusClasses = "bg-emerald-50 border-2 border-emerald-300 text-emerald-800 shadow-sm";
                  } else if (status === "incomplete") {
                    statusClasses = "bg-amber-50 border-2 border-amber-300 text-amber-800 shadow-sm";
                  }

                  return (
                    <div
                      key={dayInfo.dateKey}
                      className={`aspect-square flex flex-col items-center justify-between p-1.5 md:p-3 rounded-2xl relative transition-all duration-150 group ${statusClasses} ${
                        isToday ? "ring-2 ring-orange-500 ring-offset-2" : ""
                      }`}
                    >
                      {/* Date number */}
                      <span className="text-xs sm:text-sm font-bold">{dayInfo.day}</span>
                      
                      {/* Check details on hover/desktop */}
                      {dayInfo.count > 0 && (
                        <div className="hidden sm:block text-[9px] font-bold text-center mt-1 text-gray-500">
                          เช็คแล้ว {dayInfo.count} คน
                        </div>
                      )}

                      {/* Small dot indicators for mobile */}
                      {dayInfo.count > 0 && (
                        <div className="sm:hidden absolute bottom-1 h-1.5 w-1.5 rounded-full bg-current"></div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Legends */}
            <div className="flex flex-wrap gap-4 mt-6 pt-5 border-t border-orange-50 text-xs font-bold text-gray-600">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 bg-emerald-50 border-2 border-emerald-300 rounded-lg"></div>
                <span>บันทึกครบถ้วน ({studentCount} คน)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 bg-amber-50 border-2 border-amber-300 rounded-lg"></div>
                <span>บันทึกยังไม่ครบ (น้อยกว่า {studentCount} คน)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 bg-white border border-gray-200 rounded-lg"></div>
                <span>ไม่มีบันทึกข้อมูล</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 border-2 border-orange-500 rounded-lg"></div>
                <span>วันนี้ (Today)</span>
              </div>
            </div>

          </CardContent>
        </Card>
      )}

    </div>
  );
}
