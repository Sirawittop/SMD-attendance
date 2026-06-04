"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { api, AttendanceRecord } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { RefreshCw, BarChart2, PieChart, Info } from "lucide-react";

// Chart.js imports
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title as ChartTitle
} from "chart.js";
import { Doughnut, Bar } from "react-chartjs-2";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  ChartTitle
);

const CLASSROOMS = [
  "2/1", "2/2", "2/3", "2/4",
  "3/1", "3/2", "3/3", "3/4",
  "4/1", "4/2", "4/3", "4/4", "4/5",
  "5/1", "5/2", "5/3", "5/4", "5/5",
  "6/1", "6/2", "6/3", "6/4", "6/5"
];

export default function StatisticsPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [rangeFilter, setRangeFilter] = useState<"all" | "7d" | "30d">("all");

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getAttendance();
      if (res.success) {
        setAttendance(res.attendance || []);
      } else {
        throw new Error("ไม่สามารถดึงสถิติการเข้าเรียนได้");
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "เกิดข้อผิดพลาดในการโหลดข้อมูลสถิติ", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Filter records based on selected date range
  const filteredAttendance = useMemo(() => {
    if (rangeFilter === "all") return attendance;
    
    const cutoffDate = new Date();
    if (rangeFilter === "7d") {
      cutoffDate.setDate(cutoffDate.getDate() - 7);
    } else if (rangeFilter === "30d") {
      cutoffDate.setDate(cutoffDate.getDate() - 30);
    }

    const cutoffStr = cutoffDate.toISOString().split("T")[0];
    return attendance.filter((r) => r.date >= cutoffStr);
  }, [attendance, rangeFilter]);

  // Math for Doughnut Chart (Status Breakdown)
  const statusCounts = useMemo(() => {
    let present = 0;
    let late = 0;
    let leave = 0;
    let absent = 0;

    filteredAttendance.forEach((r) => {
      if (r.status === "มา") present++;
      else if (r.status === "สาย") late++;
      else if (r.status === "ลา") leave++;
      else if (r.status === "ขาด") absent++;
    });

    return { present, late, leave, absent };
  }, [filteredAttendance]);

  const doughnutData = useMemo(() => {
    return {
      labels: ["มาเรียน", "มาสาย", "ลากิจ/ลาป่วย", "ขาดเรียน"],
      datasets: [
        {
          data: [
            statusCounts.present,
            statusCounts.late,
            statusCounts.leave,
            statusCounts.absent,
          ],
          backgroundColor: [
            "#10b981", // Emerald-500
            "#f59e0b", // Amber-500
            "#3b82f6", // Blue-500
            "#ef4444", // Red-500
          ],
          borderColor: [
            "#ffffff",
            "#ffffff",
            "#ffffff",
            "#ffffff",
          ],
          borderWidth: 2,
          hoverOffset: 6,
        },
      ],
    };
  }, [statusCounts]);

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: {
          font: {
            family: "var(--font-noto-thai), sans-serif",
            weight: "bold" as const,
            size: 12,
          },
          padding: 20,
        },
      },
      tooltip: {
        bodyFont: {
          family: "var(--font-noto-thai), sans-serif",
        },
        titleFont: {
          family: "var(--font-noto-thai), sans-serif",
        },
      },
    },
  };

  // Math for Bar Chart (Classroom Attendance %)
  const classroomPercentages = useMemo(() => {
    return CLASSROOMS.map((cls) => {
      const clsRecords = filteredAttendance.filter((r) => r.classroom === cls);
      const total = clsRecords.length;
      if (total === 0) return { classroom: cls, percentage: 0, hasData: false };

      const present = clsRecords.filter((r) => r.status === "มา").length;
      const late = clsRecords.filter((r) => r.status === "สาย").length;

      // Rate = (มา + สาย) / ทั้งหมด * 100
      const pct = Math.round(((present + late) / total) * 100);
      return { classroom: cls, percentage: pct, hasData: true };
    });
  }, [filteredAttendance]);

  const barData = useMemo(() => {
    return {
      labels: classroomPercentages.map((item) => `ห้อง ${item.classroom}`),
      datasets: [
        {
          label: "อัตราเข้าเรียน (%)",
          data: classroomPercentages.map((item) => item.hasData ? item.percentage : 0),
          backgroundColor: classroomPercentages.map((item) =>
            item.hasData ? "rgba(249, 115, 22, 0.85)" : "rgba(229, 231, 235, 0.5)" // orange-500 or light grey
          ),
          borderColor: "rgb(249, 115, 22)",
          borderWidth: 1,
          borderRadius: 8,
        },
      ],
    };
  }, [classroomPercentages]);

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        min: 0,
        max: 100,
        grid: {
          color: "rgba(0, 0, 0, 0.05)",
        },
        ticks: {
          font: {
            family: "var(--font-noto-thai), sans-serif",
            weight: "bold" as const,
          },
          callback: (value: any) => `${value}%`,
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            family: "var(--font-noto-thai), sans-serif",
            weight: "bold" as const,
            size: 10,
          },
        },
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        bodyFont: {
          family: "var(--font-noto-thai), sans-serif",
        },
        titleFont: {
          family: "var(--font-noto-thai), sans-serif",
        },
        callbacks: {
          label: (context: any) => {
            const index = context.dataIndex;
            const item = classroomPercentages[index];
            return item.hasData ? `อัตราเข้าเรียน: ${context.raw}%` : "ยังไม่มีข้อมูลเช็คชื่อ";
          },
        },
      },
    },
  };

  const overallSchoolPercentage = useMemo(() => {
    const total = filteredAttendance.length;
    if (total === 0) return 0;
    const presentAndLate = filteredAttendance.filter(
      (r) => r.status === "มา" || r.status === "สาย"
    ).length;
    return Math.round((presentAndLate / total) * 100);
  }, [filteredAttendance]);

  return (
    <div className="space-y-6">
      
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-orange-950 flex items-center gap-2">
            <BarChart2 className="h-6 w-6 text-orange-600" /> สถิติและบทวิเคราะห์การเข้าเรียน
          </h2>
          <p className="text-gray-500 text-xs mt-1">
            ดูแผนภูมิสรุปความประพฤติเข้าเรียน และเปรียบเทียบสัดส่วนระหว่างแต่ละห้องเรียน
          </p>
        </div>
      </div>

      {/* Filter Card */}
      <Card className="border-orange-100 shadow-sm">
        <CardContent className="p-5 flex flex-col sm:flex-row items-end justify-between gap-4">
          <div className="w-full sm:w-56">
            <Select
              label="ช่วงเวลาวิเคราะห์"
              value={rangeFilter}
              onChange={(e: any) => setRangeFilter(e.target.value)}
              options={[
                { value: "all", label: "ข้อมูลทั้งหมด" },
                { value: "7d", label: "7 วันที่ผ่านมา" },
                { value: "30d", label: "30 วันที่ผ่านมา" },
              ]}
            />
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={loadStats}
              disabled={loading}
              className="px-4 w-full sm:w-auto border-orange-200"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> รีเฟรชข้อมูล
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-orange-100 shadow-sm">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500 mb-2"></div>
          <span className="text-gray-500 text-xs font-semibold">กำลังวิเคราะห์ข้อมูลกราฟ...</span>
        </div>
      ) : filteredAttendance.length === 0 ? (
        <Card className="border-orange-100 bg-orange-50/10">
          <CardContent className="p-8 text-center flex flex-col items-center justify-center gap-3">
            <Info className="h-10 w-10 text-orange-400" />
            <div>
              <h3 className="font-bold text-orange-950 text-base">ไม่พบข้อมูลสถิติในช่วงเวลาที่เลือก</h3>
              <p className="text-gray-500 text-xs mt-1">
                กรุณาลงบันทึกการเช็คชื่อก่อนเข้าเมนูเพื่อประมวลผลกราฟ
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Doughnut Widget */}
          <Card className="border-orange-100 shadow-sm lg:col-span-1 flex flex-col bg-white">
            <CardHeader className="border-b border-orange-50">
              <CardTitle className="text-orange-950 font-bold text-base flex items-center gap-2">
                <PieChart className="h-5 w-5 text-orange-600" />
                สัดส่วนสถานะการเช็คชื่อ
              </CardTitle>
              <CardDescription className="text-xs font-semibold text-gray-500">
                สัดส่วนการเข้าเรียนภาพรวมของนักเรียนทุกคน
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 flex-grow flex flex-col justify-between">
              <div className="relative h-64 w-full">
                <Doughnut data={doughnutData} options={doughnutOptions} />
              </div>
              <div className="mt-4 p-4 bg-orange-50/50 border border-orange-100 rounded-xl text-center">
                <span className="text-xs font-bold text-gray-500 block">อัตราการเข้าเรียนเฉลี่ยทั้งโรงเรียน</span>
                <span className="text-3xl font-extrabold text-orange-600 mt-1 block">{overallSchoolPercentage}%</span>
              </div>
            </CardContent>
          </Card>

          {/* Bar Chart Widget */}
          <Card className="border-orange-100 shadow-sm lg:col-span-2 bg-white flex flex-col">
            <CardHeader className="border-b border-orange-50">
              <CardTitle className="text-orange-950 font-bold text-base flex items-center gap-2">
                <BarChart2 className="h-5 w-5 text-orange-600" />
                เปรียบเทียบอัตราเข้าเรียนรายห้อง
              </CardTitle>
              <CardDescription className="text-xs font-semibold text-gray-500">
                ร้อยละการเข้าเรียนสะสม (มาเรียน + มาสาย) แยกรายห้องเรียน
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 flex-grow flex flex-col justify-center">
              
              {/* Horizontal Scroll on Mobile for the bar chart */}
              <div className="w-full overflow-x-auto pb-2">
                <div className="h-80 min-w-[700px] w-full">
                  <Bar data={barData} options={barOptions} />
                </div>
              </div>
              
              <div className="text-[10px] text-gray-400 mt-4 font-semibold italic flex items-center gap-1">
                <Info className="h-3 w-3" />
                <span>ห้องเรียนที่เป็นแท่งสีเทาหมายความว่าไม่มีประวัติข้อมูลการเช็คชื่อในช่วงเวลาที่ระบุ</span>
              </div>
            </CardContent>
          </Card>

        </div>
      )}

    </div>
  );
}
