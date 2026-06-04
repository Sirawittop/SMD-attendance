"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { api, Student } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { Upload, Plus, Trash2, Save, Download, RefreshCw, FileSpreadsheet, Settings, AlertTriangle } from "lucide-react";
import * as XLSX from "xlsx";

const CLASSROOMS = [
  "2/1", "2/2", "2/3", "2/4",
  "3/1", "3/2", "3/3", "3/4",
  "4/1", "4/2", "4/3", "4/4", "4/5",
  "5/1", "5/2", "5/3", "5/4", "5/5",
  "6/1", "6/2", "6/3", "6/4", "6/5"
];

export default function AdminPage() {
  const { session } = useAuth();
  const { showToast } = useToast();
  
  const [selectedClassroom, setSelectedClassroom] = useState<string>("2/1");
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  
  // Settings
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string>("");

  // Modals & Forms
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newStudent, setNewStudent] = useState({ studentId: "", name: "", number: "" });

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);

  const [isClearOpen, setIsClearOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load spreadsheet URL on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      setSpreadsheetUrl(localStorage.getItem("google_spreadsheet_url") || "");
    }
  }, []);

  const saveSpreadsheetUrl = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("google_spreadsheet_url", spreadsheetUrl);
      showToast("บันทึกลิงก์ Google Sheets เรียบร้อยแล้ว", "success");
    }
  };

  // Load student list
  const loadStudents = useCallback(async () => {
    if (!selectedClassroom) return;
    setLoading(true);
    try {
      const res = await api.getStudents(selectedClassroom);
      if (res.success) {
        // Sort students by seat number
        const sorted = (res.students || []).sort((a, b) => (a.number || 0) - (b.number || 0));
        setStudents(sorted);
      } else {
        throw new Error("ไม่สามารถโหลดรายชื่อนักเรียนได้");
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "โหลดข้อมูลไม่สำเร็จ", "error");
    } finally {
      setLoading(false);
    }
  }, [selectedClassroom, showToast]);

  useEffect(() => {
    loadStudents();
  }, [selectedClassroom, loadStudents]);

  // Bulk Excel Import
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json: any[] = XLSX.utils.sheet_to_json(sheet);

        if (json.length === 0) {
          showToast("ไม่พบข้อมูลในไฟล์ Excel ที่อัปโหลด", "warning");
          return;
        }

        // Map English & Thai headers
        const parsedStudents: Student[] = json.map((row, index) => {
          const studentIdKey = Object.keys(row).find(
            (k) => /studentId|student_id|รหัสนักเรียน|รหัสประจำตัว|รหัส/i.test(k)
          );
          const nameKey = Object.keys(row).find(
            (k) => /name|fullname|ชื่อ|ชื่อ-นามสกุล|ชื่อนามสกุล/i.test(k)
          );
          const numberKey = Object.keys(row).find(
            (k) => /number|no|เลขที่|ลำดับ/i.test(k)
          );

          return {
            studentId: studentIdKey ? String(row[studentIdKey]).trim() : `TEMP-${index + 1}`,
            name: nameKey ? String(row[nameKey]).trim() : `นักเรียนใหม่-${index + 1}`,
            number: numberKey ? Number(row[numberKey]) : index + 1,
          };
        });

        // Sort parsed students
        parsedStudents.sort((a, b) => a.number - b.number);
        setStudents(parsedStudents);
        showToast(`นำเข้าข้อมูลนักเรียนชั่วคราว ${parsedStudents.length} คนสำเร็จ! อย่าลืมกด "บันทึกข้อมูลเข้า Google Sheet"`, "info", 4000);
      } catch (err) {
        console.error(err);
        showToast("ไฟล์ Excel รูปแบบไม่ถูกต้อง ไม่สามารถนำเข้าได้", "error");
      }
    };
    reader.readAsBinaryString(file);
    
    // Clear input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Push to server
  const handleSaveAll = async () => {
    setLoading(true);
    try {
      const res = await api.saveStudents(selectedClassroom, students);
      if (res.success) {
        showToast(`บันทึกรายชื่อนักเรียนห้อง ${selectedClassroom} ไปยังเซิร์ฟเวอร์เรียบร้อย!`, "success");
        loadStudents();
      } else {
        throw new Error("บันทึกล้มเหลว");
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "เกิดข้อผิดพลาดในการบันทึก", "error");
    } finally {
      setLoading(false);
    }
  };

  // Trigger manual add
  const handleManualAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudent.studentId || !newStudent.name || !newStudent.number) {
      showToast("กรุณากรอกข้อมูลให้ครบทุกช่อง", "warning");
      return;
    }

    const sNum = parseInt(newStudent.number, 10);
    const item: Student = {
      studentId: newStudent.studentId.trim(),
      name: newStudent.name.trim(),
      number: isNaN(sNum) ? 99 : sNum,
    };

    // Check duplicate ID in local memory
    if (students.some((s) => s.studentId === item.studentId)) {
      showToast(`รหัสนักเรียน ${item.studentId} ซ้ำกับในตาราง`, "error");
      return;
    }

    const updated = [...students, item].sort((a, b) => a.number - b.number);
    setStudents(updated);
    setNewStudent({ studentId: "", name: "", number: "" });
    setIsAddOpen(false);
    showToast("เพิ่มนักเรียนชั่วคราวลงในตารางแล้ว (กดบันทึกเพื่อบันทึกจริง)", "success");
  };

  // Trigger single delete (direct server delete + reload)
  const confirmDelete = async () => {
    if (!studentToDelete) return;
    setLoading(true);
    try {
      const res = await api.deleteStudent(selectedClassroom, studentToDelete.studentId);
      if (res.success) {
        showToast(res.message || "ลบนักเรียนสำเร็จ", "success");
        setIsDeleteOpen(false);
        setStudentToDelete(null);
        loadStudents();
      } else {
        // If not saved on server yet (just in local table memory), delete locally
        const updated = students.filter((s) => s.studentId !== studentToDelete.studentId);
        setStudents(updated);
        showToast("ลบรายการออกจากตารางชั่วคราวสำเร็จ", "success");
        setIsDeleteOpen(false);
        setStudentToDelete(null);
      }
    } catch (err: any) {
      // Direct local delete as fallback if failed on server
      const updated = students.filter((s) => s.studentId !== studentToDelete.studentId);
      setStudents(updated);
      showToast("ลบข้อมูลชั่วคราวเรียบร้อย", "success");
      setIsDeleteOpen(false);
      setStudentToDelete(null);
    } finally {
      setLoading(false);
    }
  };

  // Clear memory roster
  const confirmClear = () => {
    setStudents([]);
    setIsClearOpen(false);
    showToast("เคลียร์รายชื่อนักเรียนออกจากตารางชั่วคราวแล้ว", "info");
  };

  // Template Excel Download helper
  const downloadTemplate = () => {
    const headers = [["studentId", "name", "number"]];
    const data = [
      ["1001", "เด็กชายมงคล เรียนเก่ง", 1],
      ["1002", "เด็กหญิงวาสนา ประเสริฐ", 2],
    ];
    const ws = XLSX.utils.aoa_to_sheet([...headers, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "รายชื่อนักเรียน");
    XLSX.writeFile(wb, `student_import_template.xlsx`);
    showToast("ดาวน์โหลดไฟล์แม่แบบเรียบร้อย", "success");
  };

  return (
    <div className="space-y-6">
      
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-orange-950 flex items-center gap-2">
            <Settings className="h-6 w-6 text-orange-600" /> จัดการข้อมูลนักเรียน (Admin)
          </h2>
          <p className="text-gray-500 text-xs mt-1">
            นำเข้าไฟล์รายชื่อนักเรียน แก้ไข ลบ และเชื่อมต่อฐานข้อมูล Google Sheets
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left column options */}
        <div className="space-y-6 lg:col-span-1">
          
          {/* Database Setup Card */}
          <Card className="border-orange-100 shadow-sm bg-white">
            <CardHeader className="bg-orange-50/50 pb-4 border-b border-orange-50">
              <CardTitle className="text-orange-950 font-bold text-base flex items-center gap-2">
                <Settings className="h-4.5 w-4.5 text-orange-600" />
                ตั้งค่าระบบฐานข้อมูล
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <Input
                label="ลิงก์ Google Sheets (สำหรับเปิดดูแผ่นงาน)"
                placeholder="https://docs.google.com/spreadsheets/d/..."
                value={spreadsheetUrl}
                onChange={(e) => setSpreadsheetUrl(e.target.value)}
              />
              <Button onClick={saveSpreadsheetUrl} size="sm" className="w-full font-bold">
                บันทึกลิงก์
              </Button>
            </CardContent>
          </Card>

          {/* Import Roster Card */}
          <Card className="border-orange-100 shadow-sm bg-white">
            <CardHeader className="bg-orange-50/50 pb-4 border-b border-orange-50">
              <CardTitle className="text-orange-950 font-bold text-base flex items-center gap-2">
                <Upload className="h-4.5 w-4.5 text-orange-600" />
                นำเข้าข้อมูลนักเรียน
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              
              <div className="space-y-2">
                <span className="text-xs font-bold text-gray-500 block">อัปโหลดไฟล์ Excel (.xlsx)</span>
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="block w-full text-xs text-gray-500
                    file:mr-3 file:py-2 file:px-3
                    file:rounded-xl file:border-0
                    file:text-xs file:font-bold
                    file:bg-orange-50 file:text-orange-700
                    hover:file:bg-orange-100
                    border border-orange-200 rounded-xl cursor-pointer"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={downloadTemplate}
                  size="sm"
                  className="w-full text-xs font-bold border-orange-200"
                >
                  <Download className="h-3 w-3" /> โหลดไฟล์ตัวอย่าง
                </Button>
              </div>

            </CardContent>
          </Card>

          {/* Manual Entry Actions */}
          <Card className="border-orange-100 shadow-sm bg-white">
            <CardHeader className="bg-orange-50/50 pb-4 border-b border-orange-50">
              <CardTitle className="text-orange-950 font-bold text-base flex items-center gap-2">
                <Plus className="h-4.5 w-4.5 text-orange-600" />
                จัดการตารางข้อมูล
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 flex flex-col gap-2">
              <Button onClick={() => setIsAddOpen(true)} variant="outline" className="w-full text-sm font-bold border-orange-200 flex items-center justify-center gap-2">
                <Plus className="h-4 w-4 text-orange-600" /> เพิ่มนักเรียนแบบกำหนดเอง
              </Button>
              <Button onClick={() => setIsClearOpen(true)} variant="outline" className="w-full text-sm font-bold border-red-200 text-red-700 hover:bg-red-50 flex items-center justify-center gap-2">
                <Trash2 className="h-4 w-4" /> ล้างตารางข้อมูลชั่วคราว
              </Button>
            </CardContent>
          </Card>

        </div>

        {/* Right column - Main Roster list */}
        <div className="lg:col-span-2">
          
          <Card className="border-orange-100 shadow-sm bg-white overflow-hidden">
            <CardHeader className="bg-orange-500/5 px-6 py-4 border-b border-orange-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-orange-950 font-bold text-base flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-orange-600" />
                  รายชื่อนักเรียนห้องเรียน {selectedClassroom}
                </CardTitle>
                <CardDescription className="text-xs font-semibold text-gray-500">
                  มีข้อมูลอยู่ในตารางขณะนี้: {students.length} คน
                </CardDescription>
              </div>

              {/* Classroom filter inside header */}
              <div className="w-40">
                <select
                  value={selectedClassroom}
                  onChange={(e) => setSelectedClassroom(e.target.value)}
                  className="h-9 w-full rounded-xl border border-orange-200 bg-white px-3 text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-400"
                >
                  {CLASSROOMS.map((cls) => (
                    <option key={cls} value={cls}>ห้องเรียน {cls}</option>
                  ))}
                </select>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              
              {loading ? (
                <div className="h-64 flex flex-col items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500 mb-2"></div>
                  <span className="text-gray-400 text-xs font-semibold">กำลังโหลดข้อมูลนักเรียน...</span>
                </div>
              ) : students.length === 0 ? (
                <div className="p-12 text-center text-gray-400 text-xs font-bold space-y-1">
                  <p>ยังไม่มีรายชื่อนักเรียนในห้องเรียนนี้</p>
                  <p className="font-medium text-gray-400">กรุณาอัปโหลด Excel หรือกรอกเพิ่มด้วยตนเองด้านซ้าย</p>
                </div>
              ) : (
                <>
                  <div className="max-h-[500px] overflow-y-auto">
                    <Table>
                      <TableHeader className="sticky top-0 z-10 bg-orange-50">
                        <TableRow>
                          <TableHead className="w-16 text-center">เลขที่</TableHead>
                          <TableHead className="w-32">รหัสประจำตัว</TableHead>
                          <TableHead>ชื่อ - นามสกุล</TableHead>
                          <TableHead className="w-20 text-center">จัดการ</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {students.map((student) => (
                          <TableRow key={student.studentId} className="hover:bg-orange-50/10">
                            <TableCell className="text-center font-bold text-gray-500">
                              {student.number}
                            </TableCell>
                            <TableCell className="font-mono font-semibold text-gray-600">
                              {student.studentId}
                            </TableCell>
                            <TableCell className="font-semibold text-gray-800">
                              {student.name}
                            </TableCell>
                            <TableCell className="text-center">
                              <button
                                onClick={() => {
                                  setStudentToDelete(student);
                                  setIsDeleteOpen(true);
                                }}
                                className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Save button footer */}
                  <div className="p-4 bg-orange-50/30 border-t border-orange-100 flex justify-end gap-2">
                    <Button
                      onClick={handleSaveAll}
                      disabled={loading}
                      className="font-bold flex items-center gap-1.5"
                    >
                      <Save className="h-4 w-4" /> บันทึกข้อมูลเข้า Google Sheet
                    </Button>
                  </div>
                </>
              )}

            </CardContent>
          </Card>

        </div>

      </div>

      {/* Manual Add dialog */}
      <Dialog
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="เพิ่มนักเรียนแบบระบุเอง"
      >
        <form onSubmit={handleManualAddSubmit} className="space-y-4">
          <Input
            label="รหัสประจำตัวนักเรียน"
            placeholder="เช่น 1001"
            value={newStudent.studentId}
            onChange={(e) => setNewStudent({ ...newStudent, studentId: e.target.value })}
          />
          <Input
            label="ชื่อ - นามสกุล"
            placeholder="เช่น เด็กชายสมจิต สมหวัง"
            value={newStudent.name}
            onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
          />
          <Input
            label="เลขที่ (ที่นั่ง)"
            placeholder="เช่น 1"
            type="number"
            value={newStudent.number}
            onChange={(e) => setNewStudent({ ...newStudent, number: e.target.value })}
          />
          
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>
              ยกเลิก
            </Button>
            <Button type="submit" size="sm" className="font-bold">
              เพิ่มลงตาราง
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="ยืนยันการลบนักเรียน"
        description="การดำเนินการนี้อาจส่งผลต่อข้อมูลบนฐานข้อมูลทันที"
      >
        <div className="space-y-3 font-semibold text-gray-800">
          <p>คุณแน่ใจหรือไม่ที่จะลบนักเรียน:</p>
          <div className="bg-red-50 border border-red-100 p-3.5 rounded-xl font-bold text-red-950">
            {studentToDelete?.name} (รหัส: {studentToDelete?.studentId}, เลขที่: {studentToDelete?.number})
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" size="sm" onClick={() => setIsDeleteOpen(false)}>
            ยกเลิก
          </Button>
          <Button variant="destructive" size="sm" onClick={confirmDelete} loading={loading}>
            ยืนยันลบข้อมูล
          </Button>
        </div>
      </Dialog>

      {/* Clear confirmation dialog */}
      <Dialog
        isOpen={isClearOpen}
        onClose={() => setIsClearOpen(false)}
        title="ยืนยันการล้างตารางชั่วคราว"
        description="การล้างตารางจะไม่เขียนบันทึกไปบนเซิร์ฟเวอร์จนกว่าคุณจะกดบันทึกจริง"
      >
        <p className="font-semibold text-gray-700">คุณแน่ใจหรือไม่ที่จะล้างตารางรายชื่อทั้งหมดบนหน้าจอนี้ชั่วคราว?</p>
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" size="sm" onClick={() => setIsClearOpen(false)}>
            ยกเลิก
          </Button>
          <Button variant="destructive" size="sm" onClick={confirmClear}>
            ล้างตาราง
          </Button>
        </div>
      </Dialog>

    </div>
  );
}
