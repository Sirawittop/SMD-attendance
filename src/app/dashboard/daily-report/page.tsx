"use client";

import React, { useState, useEffect, useCallback } from "react";
import { api, AttendanceRecord } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { RefreshCw, FileText, CheckCircle2, AlertCircle, TrendingUp, Users, BarChart3 } from "lucide-react";

const CLASSROOMS = [
  "2/1", "2/2", "2/3", "2/4",
  "3/1", "3/2", "3/3", "3/4",
  "4/1", "4/2", "4/3", "4/4", "4/5",
  "5/1", "5/2", "5/3", "5/4", "5/5",
  "6/1", "6/2", "6/3", "6/4", "6/5"
];

interface ClassroomSummary {
  classroom: string;
  totalChecked: number;
  present: number;
  late: number;
  leave: number;
  absent: number;
  percentage: number;
  hasRecord: boolean;
}

export default function DailyReportPage() {
  const { showToast } = useToast();
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });

  const [loading, setLoading] = useState(false);
  const [summaries, setSummaries] = useState<ClassroomSummary[]>([]);
  const [schoolStats, setSchoolStats] = useState({
    overallPercentage: 0,
    totalStudents: 0,
    recordedClassrooms: 0,
    present: 0,
    late: 0,
    leave: 0,
    absent: 0,
  });

  const loadReport = useCallback(async () => {
    if (!selectedDate) return;
    setLoading(true);
    try {
      // Fetch all attendance for selected date
      const res = await api.getAttendance(undefined, selectedDate);
      if (!res.success) {
        throw new Error("ไม่สามารถโหลดข้อมูลรายงานได้");
      }

      const allRecords = res.attendance || [];

      // Process each classroom
      const summariesList: ClassroomSummary[] = CLASSROOMS.map((cls) => {
        const clsRecords = allRecords.filter((r) => r.classroom === cls);
        const hasRecord = clsRecords.length > 0;
        
        if (!hasRecord) {
          return {
            classroom: cls,
            totalChecked: 0,
            present: 0,
            late: 0,
            leave: 0,
            absent: 0,
            percentage: 0,
            hasRecord: false,
          };
        }

        const present = clsRecords.filter((r) => r.status === "มา").length;
        const late = clsRecords.filter((r) => r.status === "สาย").length;
        const leave = clsRecords.filter((r) => r.status === "ลา").length;
        const absent = clsRecords.filter((r) => r.status === "ขาด").length;
        const total = clsRecords.length;

        // % Attendance = (มา + สาย) / ทั้งหมด * 100
        const percentage = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

        return {
          classroom: cls,
          totalChecked: total,
          present,
          late,
          leave,
          absent,
          percentage,
          hasRecord: true,
        };
      });

      setSummaries(summariesList);

      // Compute School-wide stats
      const recordedCls = summariesList.filter((s) => s.hasRecord);
      const totalCheckedSchool = allRecords.length;
      const schoolPresent = allRecords.filter((r) => r.status === "มา").length;
      const schoolLate = allRecords.filter((r) => r.status === "สาย").length;
      const schoolLeave = allRecords.filter((r) => r.status === "ลา").length;
      const schoolAbsent = allRecords.filter((r) => r.status === "ขาด").length;
      
      const overallPct = totalCheckedSchool > 0 
        ? Math.round(((schoolPresent + schoolLate) / totalCheckedSchool) * 100) 
        : 0;

      setSchoolStats({
        overallPercentage: overallPct,
        totalStudents: totalCheckedSchool,
        recordedClassrooms: recordedCls.length,
        present: schoolPresent,
        late: schoolLate,
        leave: schoolLeave,
        absent: schoolAbsent,
      });

    } catch (err: any) {
      console.error(err);
      showToast(err.message || "เกิดข้อผิดพลาดในการดึงรายงาน", "error");
    } finally {
      setLoading(false);
    }
  }, [selectedDate, showToast]);

  useEffect(() => {
    loadReport();
  }, [selectedDate, loadReport]);

  return (
    <div className="space-y-6">
      
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-orange-950 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-orange-600" /> รายงานสรุปประจำวัน
          </h2>
          <p className="text-gray-500 text-xs mt-1">
            ดูภาพรวมการเข้าเรียน สถิติ และสถานะการเช็คชื่อแยกตามห้องเรียนในแต่ละวัน
          </p>
        </div>
      </div>

      {/* Date Select Card */}
      <Card className="border-orange-100 shadow-sm">
        <CardContent className="p-5 flex flex-col sm:flex-row items-end gap-4">
          <div className="w-full sm:w-56 space-y-1.5">
            <label className="text-sm font-semibold text-gray-700 block">
              เลือกวันที่ดูรายงาน
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="flex h-10 w-full rounded-xl border border-orange-200 bg-white px-3 py-2 text-sm text-gray-800 transition-all focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={loadReport}
              disabled={loading}
              className="px-4 w-full sm:w-auto border-orange-200"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> รีเฟรชข้อมูล
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary KPI Widgets */}
      {schoolStats.totalStudents > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <Card className="border-orange-100 shadow-sm">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 bg-orange-100 rounded-xl text-orange-600">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500">อัตราเข้าเรียนภาพรวม</p>
                <h3 className="text-2xl font-bold text-orange-950 mt-1">{schoolStats.overallPercentage}%</h3>
              </div>
            </CardContent>
          </Card>

          <Card className="border-orange-100 shadow-sm">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 bg-emerald-100 rounded-xl text-emerald-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500">ห้องที่บันทึกแล้ว</p>
                <h3 className="text-2xl font-bold text-emerald-800 mt-1">
                  {schoolStats.recordedClassrooms} / {CLASSROOMS.length} ห้อง
                </h3>
              </div>
            </CardContent>
          </Card>

          <Card className="border-orange-100 shadow-sm">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-xl text-blue-600">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500">มาเรียน & สาย</p>
                <h3 className="text-2xl font-bold text-blue-950 mt-1">
                  {schoolStats.present + schoolStats.late} คน <span className="text-xs text-gray-400">({schoolStats.totalStudents} คน)</span>
                </h3>
              </div>
            </CardContent>
          </Card>

          <Card className="border-orange-100 shadow-sm">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 bg-red-100 rounded-xl text-red-600">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500">ลา & ขาดเรียน</p>
                <h3 className="text-2xl font-bold text-red-700 mt-1">
                  {schoolStats.leave + schoolStats.absent} คน
                </h3>
              </div>
            </CardContent>
          </Card>
          
        </div>
      )}

      {/* Report Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-orange-100 shadow-sm">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500 mb-2"></div>
          <span className="text-gray-500 text-xs font-semibold">กำลังประมวลผลรายงาน...</span>
        </div>
      ) : (
        <Card className="border-orange-100 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ห้องเรียน</TableHead>
                <TableHead className="text-center">สถานะการส่ง</TableHead>
                <TableHead className="text-center">นักเรียนทั้งหมด</TableHead>
                <TableHead className="text-center text-emerald-700">มา (คน)</TableHead>
                <TableHead className="text-center text-amber-700">สาย (คน)</TableHead>
                <TableHead className="text-center text-blue-700">ลา (คน)</TableHead>
                <TableHead className="text-center text-red-700">ขาด (คน)</TableHead>
                <TableHead className="text-right">% อัตราการเข้าเรียน</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summaries.map((s) => (
                <TableRow key={s.classroom} className="hover:bg-orange-50/10">
                  <TableCell className="font-bold text-gray-800">
                    ห้องเรียน {s.classroom}
                  </TableCell>
                  <TableCell className="text-center">
                    {s.hasRecord ? (
                      <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                        <CheckCircle2 className="h-3 w-3" /> ส่งแล้ว
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                        <AlertCircle className="h-3 w-3" /> ยังไม่ส่ง
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-center font-bold text-gray-700">
                    {s.hasRecord ? `${s.totalChecked} คน` : "-"}
                  </TableCell>
                  <TableCell className="text-center text-emerald-700 font-semibold">
                    {s.hasRecord ? s.present : "-"}
                  </TableCell>
                  <TableCell className="text-center text-amber-700 font-semibold">
                    {s.hasRecord ? s.late : "-"}
                  </TableCell>
                  <TableCell className="text-center text-blue-700 font-semibold">
                    {s.hasRecord ? s.leave : "-"}
                  </TableCell>
                  <TableCell className="text-center text-red-700 font-semibold">
                    {s.hasRecord ? s.absent : "-"}
                  </TableCell>
                  <TableCell className="text-right font-bold text-gray-800">
                    {s.hasRecord ? (
                      <span className={`px-2 py-0.5 rounded-lg ${
                        s.percentage >= 80 ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"
                      }`}>
                        {s.percentage}%
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

    </div>
  );
}
