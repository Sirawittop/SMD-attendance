"use client";

import React, { useState, useMemo, useCallback } from "react";
import { api, AttendanceRecord } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/context/AuthContext";
import {
  LogOut,
  Search,
  GraduationCap,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  User,
  BadgeCheck,
  School,
  Clock,
  CalendarCheck,
  CalendarX,
  AlertCircle,
  History,
} from "lucide-react";

// Chart.js imports
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend);

// DayPicker imports (v10)
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";

// Date formatting
import { format, parse } from "date-fns";
import { th } from "date-fns/locale/th";

/* ──────────────────────────────────────────────
   Helper functions
   ────────────────────────────────────────────── */

/** Format ISO date string (YYYY-MM-DD) to Thai date */
function formatThaiDate(dateStr: string): string {
  const d = parse(dateStr, "yyyy-MM-dd", new Date());
  // Convert to Buddhist year (+543)
  const buddhistYear = d.getFullYear() + 543;
  const formatted = format(d, "d MMM", { locale: th });
  return `${formatted} ${buddhistYear}`;
}

/** Parse an array of record dates for a given status into Date[] for DayPicker modifiers */
function datesForStatus(records: AttendanceRecord[], status: string): Date[] {
  return records
    .filter((r) => r.status === status)
    .map((r) => parse(r.date, "yyyy-MM-dd", new Date()));
}

/** Get Tailwind badge class based on attendance status */
function statusBadgeClass(status: string): string {
  switch (status) {
    case "มา":
      return "bg-emerald-100 text-emerald-800 border-emerald-300";
    case "สาย":
      return "bg-amber-100 text-amber-800 border-amber-300";
    case "ลา":
      return "bg-blue-100 text-blue-800 border-blue-300";
    case "ขาด":
      return "bg-red-100 text-red-800 border-red-300";
    default:
      return "bg-gray-100 text-gray-800 border-gray-300";
  }
}

function statusBadgeLabel(status: string): string {
  switch (status) {
    case "มา":
      return "มาเรียน";
    case "สาย":
      return "มาสาย";
    case "ลา":
      return "ลา";
    case "ขาด":
      return "ขาดเรียน";
    default:
      return status;
  }
}

/* ──────────────────────────────────────────────
   Stat card config
   ────────────────────────────────────────────── */
const STAT_CARDS = [
  {
    key: "present" as const,
    label: "มาเรียน",
    icon: CheckCircle2,
    bg: "bg-emerald-50 border-emerald-200",
    textColor: "text-emerald-700",
    iconBg: "bg-emerald-100 text-emerald-600",
    hoverBorder: "hover:border-emerald-400",
  },
  {
    key: "late" as const,
    label: "มาสาย",
    icon: Clock,
    bg: "bg-amber-50 border-amber-200",
    textColor: "text-amber-700",
    iconBg: "bg-amber-100 text-amber-600",
    hoverBorder: "hover:border-amber-400",
  },
  {
    key: "leave" as const,
    label: "ลา",
    icon: CalendarCheck,
    bg: "bg-blue-50 border-blue-200",
    textColor: "text-blue-700",
    iconBg: "bg-blue-100 text-blue-600",
    hoverBorder: "hover:border-blue-400",
  },
  {
    key: "absent" as const,
    label: "ขาด",
    icon: CalendarX,
    bg: "bg-red-50 border-red-200",
    textColor: "text-red-700",
    iconBg: "bg-red-100 text-red-600",
    hoverBorder: "hover:border-red-400",
  },
] as const;

/* ──────────────────────────────────────────────
   Component
   ────────────────────────────────────────────── */
export default function StudentPortalPage() {
  const { logout } = useAuth();
  const { showToast } = useToast();

  // ── State ──
  const [studentId, setStudentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  // ── Search handler ──
  const handleSearch = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = studentId.trim();
      if (!trimmed) {
        showToast("กรุณากรอกรหัสนักเรียน", "warning");
        return;
      }

      setLoading(true);
      setSelectedDate(undefined);
      try {
        const res = await api.getAttendance();
        if (!res.success) {
          throw new Error("ไม่สามารถเชื่อมต่อฐานข้อมูลได้");
        }

        const filtered = (res.attendance || []).filter(
          (r) => String(r.studentId).trim() === trimmed
        );

        setRecords(filtered);
        setHasSearched(true);

        if (filtered.length === 0) {
          showToast("ไม่พบประวัติการเข้าเรียนของรหัสนี้", "info");
        } else {
          showToast("ค้นหาข้อมูลสำเร็จ", "success");
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการค้นหา";
        console.error(err);
        showToast(message, "error");
      } finally {
        setLoading(false);
      }
    },
    [studentId, showToast]
  );

  // ── Student Info ──
  const studentInfo = useMemo(() => {
    if (records.length === 0) return null;
    const first = records[0];
    return {
      name: first.studentName,
      classroom: first.classroom,
      id: first.studentId,
    };
  }, [records]);

  // ── Statistics ──
  const stats = useMemo(() => {
    let present = 0;
    let late = 0;
    let leave = 0;
    let absent = 0;

    records.forEach((r) => {
      if (r.status === "มา") present++;
      else if (r.status === "สาย") late++;
      else if (r.status === "ลา") leave++;
      else if (r.status === "ขาด") absent++;
    });

    const total = records.length;
    const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

    return { present, late, leave, absent, total, rate };
  }, [records]);

  // ── Rate bar color ──
  const rateColorClass = useMemo(() => {
    if (stats.rate >= 80) return "bg-emerald-500";
    if (stats.rate >= 60) return "bg-amber-500";
    return "bg-red-500";
  }, [stats.rate]);

  const rateTextColorClass = useMemo(() => {
    if (stats.rate >= 80) return "text-emerald-600";
    if (stats.rate >= 60) return "text-amber-600";
    return "text-red-600";
  }, [stats.rate]);

  // ── Chart data ──
  const chartData = useMemo(() => {
    return {
      labels: ["มาเรียน", "มาสาย", "ลา", "ขาดเรียน"],
      datasets: [
        {
          data: [stats.present, stats.late, stats.leave, stats.absent],
          backgroundColor: [
            "#10b981",
            "#f59e0b",
            "#3b82f6",
            "#ef4444",
          ],
          borderColor: ["#ffffff", "#ffffff", "#ffffff", "#ffffff"],
          borderWidth: 2,
          hoverOffset: 8,
        },
      ],
    };
  }, [stats]);

  const chartOptions = useMemo(() => {
    return {
      cutout: "70%" as const,
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom" as const,
          labels: {
            usePointStyle: true,
            padding: 16,
            font: {
              size: 12,
            },
          },
        },
        tooltip: {
          callbacks: {
            label: (context: { dataset: { data: number[] }; parsed: number; label: string }) => {
              const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
              const value = context.parsed;
              const pct = total > 0 ? Math.round((value / total) * 100) : 0;
              return ` ${context.label}: ${value} วัน (${pct}%)`;
            },
          },
        },
      },
    };
  }, []);

  // ── Calendar modifiers ──
  const calendarModifiers = useMemo(() => {
    if (records.length === 0) return {};
    return {
      present: datesForStatus(records, "มา"),
      late: datesForStatus(records, "สาย"),
      leave: datesForStatus(records, "ลา"),
      absent: datesForStatus(records, "ขาด"),
    };
  }, [records]);

  const calendarModifierClassNames = useMemo(
    () => ({
      present: "!bg-emerald-500 !text-white !rounded-full !font-bold",
      late: "!bg-amber-500 !text-white !rounded-full !font-bold",
      leave: "!bg-blue-500 !text-white !rounded-full !font-bold",
      absent: "!bg-red-500 !text-white !rounded-full !font-bold",
    }),
    []
  );

  // ── Selected day info ──
  const selectedDayInfo = useMemo(() => {
    if (!selectedDate) return null;
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const dayRecords = records.filter((r) => r.date === dateStr);
    if (dayRecords.length === 0) return null;

    const statuses = dayRecords.map((r) => r.status);
    // If multiple records with same date, use the most common / first
    const primaryStatus = statuses[0];

    return {
      dateStr,
      formatted: formatThaiDate(dateStr),
      status: primaryStatus,
      count: dayRecords.length,
    };
  }, [selectedDate, records]);

  // ── Timeline (20 latest) ──
  const timeline = useMemo(() => {
    if (records.length === 0) return [];
    return [...records]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 20);
  }, [records]);

  // ── Render ──
  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-orange-100/40 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* ═══ Top Navbar ═══ */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-orange-500 flex items-center justify-center shadow-md">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-orange-950 text-lg leading-tight">
                ระบบสืบค้นข้อมูลนักเรียน
              </h1>
              <p className="text-xs text-gray-500 font-medium">
                ค้นหาประวัติการเช็คชื่อ
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-xs font-bold text-red-600 bg-white hover:bg-red-50 border border-red-200 px-3.5 py-2 rounded-xl transition-all shadow-sm active:scale-[0.98]"
          >
            <LogOut className="h-3.5 w-3.5" /> กลับหน้าหลัก
          </button>
        </div>

        {/* ═══ Row 1 — Search Card ═══ */}
        <Card className="shadow-md border-orange-200/60">
          <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-5">
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <Search className="h-5 w-5" />
              ตรวจสอบสถิติการมาเรียน
            </CardTitle>
            <CardDescription className="text-orange-100 text-xs font-medium">
              กรอกรหัสประจำตัวนักเรียนเพื่อประมวลผลสถิติส่วนตัว
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5">
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <Input
                  placeholder="กรอกรหัสประจำตัว เช่น 101010"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  disabled={loading}
                  className="pl-10 text-center sm:text-left font-mono font-bold tracking-widest h-11"
                />
              </div>
              <Button
                type="submit"
                loading={loading}
                className="h-11 px-8 font-bold text-sm gap-2 shrink-0"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    กำลังค้นหา...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    ค้นหา
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* ═══ Loading State ═══ */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="relative">
              <div className="h-12 w-12 rounded-full border-4 border-orange-200 border-t-orange-500 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-4 w-4 rounded-full bg-orange-500 animate-pulse" />
              </div>
            </div>
            <span className="text-sm font-bold text-gray-500">
              กำลังประมวลผลสถิติ...
            </span>
          </div>
        )}

        {/* ═══ Empty: Not yet searched ═══ */}
        {!loading && !hasSearched && (
          <Card className="shadow-md border-orange-200/60">
            <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
              <GraduationCap className="h-20 w-20 text-orange-200" />
              <p className="text-base font-bold text-gray-400">
                กรอกรหัสนักเรียนเพื่อตรวจสอบสถิติการเข้าเรียน
              </p>
              <p className="text-xs text-gray-400 font-medium">
                ป้อนรหัสประจำตัวนักเรียนในช่องค้นหาด้านบน
              </p>
            </CardContent>
          </Card>
        )}

        {/* ═══ Empty: No results found ═══ */}
        {!loading && hasSearched && records.length === 0 && (
          <Card className="shadow-md border-orange-200/60">
            <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
              <AlertTriangle className="h-14 w-14 text-orange-400" />
              <div className="text-center">
                <p className="text-base font-bold text-gray-600">
                  ไม่พบข้อมูล
                </p>
                <p className="text-sm text-gray-400 font-medium mt-1">
                  ไม่พบประวัติรหัสนักเรียน "{studentId}"
                </p>
              </div>
              <p className="text-xs text-gray-400 max-w-md text-center">
                โปรดตรวจสอบความถูกต้องของรหัส หรือติดต่อครูประจำชั้นหากยังไม่มี
                การเช็คชื่อ
              </p>
            </CardContent>
          </Card>
        )}

        {/* ═══ Results (only when data is available) ═══ */}
        {!loading && hasSearched && records.length > 0 && studentInfo && (
          <>
            {/* ─── Row 2 — Profile + Rate ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Student Profile Card */}
              <Card className="lg:col-span-2 shadow-md border-orange-200/60 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4">
                  <CardTitle className="text-white text-sm flex items-center gap-2">
                    <User className="h-4 w-4" />
                    ข้อมูลนักเรียน
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5">
                  <div className="flex flex-col sm:flex-row items-start gap-5">
                    {/* Avatar */}
                    <div className="h-16 w-16 rounded-full bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center shrink-0 shadow-inner">
                      <User className="h-8 w-8 text-orange-500" />
                    </div>
                    {/* Details */}
                    <div className="space-y-3 flex-1 w-full">
                      <div className="flex items-center gap-2">
                        <BadgeCheck className="h-4 w-4 text-orange-500 shrink-0" />
                        <span className="font-bold text-gray-800 text-base">
                          {studentInfo.name}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="flex items-center gap-2 bg-orange-50 px-3 py-2 rounded-lg">
                          <School className="h-4 w-4 text-orange-500 shrink-0" />
                          <div>
                            <span className="text-[10px] font-bold text-gray-500 block leading-tight">
                              ห้องเรียน
                            </span>
                            <span className="text-sm font-bold text-gray-800">
                              {studentInfo.classroom}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 bg-orange-50 px-3 py-2 rounded-lg">
                          <BadgeCheck className="h-4 w-4 text-orange-500 shrink-0" />
                          <div>
                            <span className="text-[10px] font-bold text-gray-500 block leading-tight">
                              รหัสประจำตัว
                            </span>
                            <span className="text-sm font-mono font-bold text-gray-800">
                              {studentInfo.id}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Attendance Rate Card */}
              <Card className="shadow-md border-orange-200/60 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4">
                  <CardTitle className="text-white text-sm flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    อัตราการเข้าเรียน
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 flex flex-col items-center justify-center gap-4">
                  <div className="text-center">
                    <span
                      className={`text-5xl font-extrabold ${rateTextColorClass}`}
                    >
                      {stats.rate}%
                    </span>
                    <p className="text-xs text-gray-500 font-medium mt-1">
                      (เช็คชื่อทั้งหมด {stats.total} ครั้ง)
                    </p>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${rateColorClass}`}
                      style={{ width: `${Math.min(stats.rate, 100)}%` }}
                    />
                  </div>
                  {/* Legend */}
                  <div className="flex items-center gap-3 text-[10px] font-bold text-gray-500">
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />{" "}
                      ≥ 80%
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />{" "}
                      60–79%
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-red-500" />{" "}
                      {"< 60%"}
                    </span>
                  </div>
                  {stats.rate < 80 && (
                    <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl w-full">
                      <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                      <p className="text-xs font-bold text-red-800 leading-relaxed">
                        อัตราการเข้าเรียนต่ำกว่าเกณฑ์ 80% โปรดระมัดระวังและปรับปรุงการมาเรียน
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* ─── Row 3 — 4 Statistics Cards ─── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {STAT_CARDS.map((card) => {
                const value = stats[card.key];
                const Icon = card.icon;
                return (
                  <Card
                    key={card.key}
                    className={`${card.bg} ${card.hoverBorder} cursor-default transition-all duration-200 hover:scale-105 hover:shadow-lg shadow-sm`}
                  >
                    <CardContent className="p-4 flex flex-col items-center gap-2">
                      <div className={`p-2.5 rounded-full ${card.iconBg}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className={`text-2xl font-extrabold ${card.textColor}`}>
                        {value}
                      </span>
                      <span className="text-[11px] font-bold text-gray-500">
                        {card.label}
                      </span>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* ─── Row 4 — Chart + Calendar ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Doughnut Chart */}
              <Card className="shadow-md border-orange-200/60">
                <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4">
                  <CardTitle className="text-white text-sm flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    สถิติภาพรวม
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5">
                  <div className="relative h-64 w-full max-w-sm mx-auto">
                    {stats.total > 0 ? (
                      <Doughnut data={chartData} options={chartOptions} />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400 text-sm font-bold">
                        ไม่มีข้อมูล
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Attendance Calendar */}
              <Card className="shadow-md border-orange-200/60">
                <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4">
                  <CardTitle className="text-white text-sm flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    ปฏิทินการเข้าเรียน
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5">
                  <div className="flex flex-col items-center gap-4">
                    <div className="attendance-calendar">
                      <DayPicker
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        modifiers={calendarModifiers}
                        modifiersClassNames={calendarModifierClassNames}
                        locale={th}
                      />
                    </div>

                    {/* Selected day details */}
                    {selectedDayInfo && (
                      <div className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-1">
                        <p className="text-sm font-bold text-gray-700">
                          {selectedDayInfo.formatted}
                        </p>
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusBadgeClass(
                              selectedDayInfo.status
                            )}`}
                          >
                            {statusBadgeLabel(selectedDayInfo.status)}
                          </span>
                          {selectedDayInfo.count > 1 && (
                            <span className="text-xs text-gray-400 font-medium">
                              ({selectedDayInfo.count} รายการ)
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {!selectedDate && (
                      <p className="text-xs text-gray-400 font-medium">
                        คลิกวันที่เพื่อดูรายละเอียด
                      </p>
                    )}

                    {/* Legend */}
                    <div className="flex flex-wrap gap-3 justify-center text-[11px] font-bold text-gray-600">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />{" "}
                        มา
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />{" "}
                        สาย
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />{" "}
                        ลา
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-red-500" />{" "}
                        ขาด
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ─── Row 5 — Recent Attendance Timeline ─── */}
            <Card className="shadow-md border-orange-200/60">
              <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4">
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <History className="h-4 w-4" />
                  ประวัติการเข้าเรียนล่าสุด
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                {timeline.length === 0 ? (
                  <p className="text-center text-sm text-gray-400 font-bold py-6">
                    ไม่มีประวัติ
                  </p>
                ) : (
                  <div className="space-y-1">
                    {timeline.map((record, idx) => (
                      <div
                        key={`${record.date}-${record.studentId}-${idx}`}
                        className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-orange-50 transition-colors border-b border-gray-50 last:border-b-0"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-orange-300 shrink-0" />
                          <span className="text-sm font-medium text-gray-700">
                            {formatThaiDate(record.date)}
                          </span>
                        </div>
                        <span
                          className={`inline-block px-3 py-0.5 rounded-full text-xs font-bold border ${statusBadgeClass(
                            record.status
                          )}`}
                        >
                          {statusBadgeLabel(record.status)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {records.length > 20 && (
                  <p className="text-center text-[11px] text-gray-400 font-medium mt-3">
                    แสดง 20 รายการล่าสุดจากทั้งหมด {records.length} รายการ
                  </p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* ═══ Custom styles for attendance calendar ═══ */}
      <style jsx global>{`
        .attendance-calendar {
          width: 100%;
          display: flex;
          justify-content: center;
        }
        .attendance-calendar .rdp-root {
          --rdp-accent-color: #f97316;
          --rdp-accent-background-color: #fff7ed;
          --rdp-day-width: 40px;
          --rdp-day-height: 40px;
          --rdp-day-font-size: 0.875rem;
          width: 100%;
          max-width: 350px;
        }
        .attendance-calendar .rdp-day_button {
          border-radius: 9999px;
          font-weight: 600;
        }
        .attendance-calendar .rdp-selected .rdp-day_button {
          box-shadow: 0 0 0 2px #f97316;
        }
        .attendance-calendar .rdp-nav {
          display: flex;
          gap: 0.5rem;
        }
        .attendance-calendar .rdp-nav button {
          border-radius: 9999px;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
        }
        .attendance-calendar .rdp-nav button:hover {
          background-color: #fff7ed;
        }
        .attendance-calendar .rdp-month_caption {
          font-weight: 700;
          font-size: 0.95rem;
          color: #431407;
        }
        .attendance-calendar .rdp-weekday {
          font-weight: 700;
          font-size: 0.75rem;
          color: #9a3412;
          text-transform: uppercase;
          padding-bottom: 0.5rem;
        }
        .attendance-calendar .rdp-week_number {
          font-weight: 600;
          font-size: 0.7rem;
          color: #b45309;
        }
      `}</style>
    </div>
  );
}