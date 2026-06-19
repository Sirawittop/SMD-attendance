"use client";

import * as XLSX from "xlsx";
import { api } from "./api";

/**
 * Normalize sheet name like "ม.21" → "2/1", "สานฝัน ม.61" → "sapfan_6/1"
 */
export const normalizeLegacySheetName = (sheetName: string): { classroom: string | null; isSapfan: boolean } => {
  const trimmed = sheetName.trim();
  
  // Match "ม.21", "ม.2/1", "ม.2 1" etc.
  const mainPattern = /^ม\.?\s*(\d)\s*\/?\s*(\d)$/;
  const mainMatch = trimmed.match(mainPattern);
  if (mainMatch) {
    return { classroom: `${mainMatch[1]}/${mainMatch[2]}`, isSapfan: false };
  }

  // Match "สานฝัน ม.61", "สานฝันม.61", etc.
  const sapfanPattern = /^สานฝัน\s*ม\.?\s*(\d)\s*\/?\s*(\d)$/;
  const sapfanMatch = trimmed.match(sapfanPattern);
  if (sapfanMatch) {
    return { classroom: `${sapfanMatch[1]}/${sapfanMatch[2]}`, isSapfan: true };
  }

  // Try to extract just digits (e.g. "21" → "2/1")
  const digitsMatch = trimmed.match(/(\d)(\d)/);
  if (digitsMatch) {
    const level = digitsMatch[1];
    const room = digitsMatch[2];
    if (["2", "3", "4", "5", "6"].includes(level) && ["1", "2", "3", "4", "5"].includes(room)) {
      return { classroom: `${level}/${room}`, isSapfan: trimmed.includes("สานฝัน") };
    }
  }

  return { classroom: null, isSapfan: false };
};

interface LegacyAttendanceDay {
  date: string; // ISO date string (YYYY-MM-DD)
  records: { studentNumber: number; status: string }[];
}

export interface LegacyClassroomData {
  classroom: string;
  isSapfan: boolean;
  studentNumbers: number[]; // just the numbers (เลขที่)
  studentHeaders: string[]; // raw header text for preview (e.g. "1 เด็กชายกรเดช ไกยวรรณ์")
  attendanceDays: LegacyAttendanceDay[];
}

/**
 * Parse the "1 เด็กชายกรเดช ไกยวรรณ์" format to extract just the number
 */
const extractNumber = (header: string): number | null => {
  const trimmed = header.trim();
  if (!trimmed || trimmed === "วันที่") return null;
  
  // Match any pattern starting with a number
  const match = trimmed.match(/^(\d+)/);
  if (match) {
    return parseInt(match[1], 10);
  }

  return null;
};

/**
 * Normalize status value
 */
const normalizeStatus = (value: any): string => {
  if (value === null || value === undefined) return "";
  const str = String(value).trim();
  
  if (str === "มา") return "มา";
  if (str === "มาสาย" || str === "สาย") return "สาย";
  if (str === "ขาด") return "ขาด";
  if (str === "ลา") return "ลา";
  
  return str;
};

/**
 * Parse a legacy Excel file containing old attendance data
 */
export const parseLegacyAttendanceExcel = async (file: File): Promise<{
  classrooms: LegacyClassroomData[];
  skippedSheets: string[];
}> => {
  const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.onload = () => {
      const result = reader.result;
      if (!(result instanceof ArrayBuffer)) { reject(new Error("Invalid file data")); return; }
      resolve(result);
    };
    reader.readAsArrayBuffer(file);
  });

  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  const classrooms: LegacyClassroomData[] = [];
  const skippedSheets: string[] = [];

  workbook.SheetNames.forEach((sheetName) => {
    const { classroom, isSapfan } = normalizeLegacySheetName(sheetName);
    if (!classroom) {
      skippedSheets.push(sheetName);
      return;
    }

    const sheet = workbook.Sheets[sheetName];
    const aoa: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

    if (aoa.length < 2) {
      skippedSheets.push(`${sheetName} (ไม่มีข้อมูล)`);
      return;
    }

    // First row is header
    const headerRow = aoa[0];
    if (!headerRow || headerRow.length < 2) {
      skippedSheets.push(`${sheetName} (หัวตารางไม่ถูกต้อง)`);
      return;
    }

    // Parse student numbers and headers from header row (skip first column "วันที่")
    const studentNumbers: number[] = [];
    const studentHeaders: string[] = [];
    const studentColumnMap: Map<number, number> = new Map(); // studentNumber → column index

    for (let colIdx = 1; colIdx < headerRow.length; colIdx++) {
      const headerValue = String(headerRow[colIdx] ?? "").trim();
      const num = extractNumber(headerValue);
      if (num !== null) {
        studentNumbers.push(num);
        studentHeaders.push(headerValue);
        studentColumnMap.set(num, colIdx);
      }
    }

    if (studentNumbers.length === 0) {
      skippedSheets.push(`${sheetName} (ไม่พบข้อมูลนักเรียน)`);
      return;
    }

    // Parse attendance data rows
    const attendanceDays: LegacyAttendanceDay[] = [];

    for (let rowIdx = 1; rowIdx < aoa.length; rowIdx++) {
      const row = aoa[rowIdx];
      if (!row || row.length < 2) continue;

      const dateValue = row[0];
      if (!dateValue) continue;

      // Parse date
      let dateStr: string;
      if (typeof dateValue === "number" && dateValue > 40000 && dateValue < 100000) {
        // Excel serial date number
        const dateObj = XLSX.SSF.parse_date_code(dateValue);
        if (dateObj) {
          const y = dateObj.y;
          const m = String(dateObj.m).padStart(2, "0");
          const d = String(dateObj.d).padStart(2, "0");
          dateStr = `${y}-${m}-${d}`;
        } else {
          continue;
        }
      } else {
        // Try string date
        const strDate = String(dateValue).trim();
        // Handle ISO format like "2026-06-04T00:00:00.000Z"
        const isoMatch = strDate.match(/^(\d{4}-\d{2}-\d{2})/);
        if (isoMatch) {
          dateStr = isoMatch[1];
        } else {
          // Try to parse as regular date string
          const parsed = new Date(strDate);
          if (!isNaN(parsed.getTime())) {
            const y = parsed.getFullYear();
            const m = String(parsed.getMonth() + 1).padStart(2, "0");
            const d = String(parsed.getDate()).padStart(2, "0");
            dateStr = `${y}-${m}-${d}`;
          } else {
            continue;
          }
        }
      }

      // Check for duplicate dates
      if (attendanceDays.some((d) => d.date === dateStr)) {
        continue;
      }

      const records: { studentNumber: number; status: string }[] = [];
      
      for (const num of studentNumbers) {
        const colIdx = studentColumnMap.get(num);
        if (colIdx === undefined || colIdx >= row.length) {
          records.push({ studentNumber: num, status: "" });
          continue;
        }
        const rawStatus = row[colIdx];
        const status = normalizeStatus(rawStatus);
        records.push({ studentNumber: num, status: status || "" });
      }

      // Only add if there's at least some data
      if (records.some((r) => r.status)) {
        attendanceDays.push({ date: dateStr, records });
      }
    }

    if (attendanceDays.length === 0) {
      skippedSheets.push(`${sheetName} (ไม่มีข้อมูลการเช็กชื่อ)`);
      return;
    }

    classrooms.push({
      classroom,
      isSapfan,
      studentNumbers,
      studentHeaders,
      attendanceDays,
    });
  });

  return { classrooms, skippedSheets };
};

/**
 * Save legacy attendance data to Supabase
 * Uses student number (เลขที่) to match with existing students in the database
 */
export const saveLegacyAttendanceData = async (
  classroomData: LegacyClassroomData
): Promise<{ success: boolean; attendanceSaved: number; errors: string[] }> => {
  const errors: string[] = [];
  let attendanceSaved = 0;

  try {
    // Step 1: Get existing students for this classroom
    const existingRes = await api.getStudents(classroomData.classroom);
    const existingStudents = existingRes.success ? existingRes.students : [];

    if (existingStudents.length === 0) {
      errors.push(`ไม่พบข้อมูลนักเรียนในห้อง ${classroomData.classroom} กรุณานำเข้ารายชื่อนักเรียนก่อน`);
      return { success: false, attendanceSaved: 0, errors };
    }

    // Step 2: Build a map of studentNumber → student (using the `number` field)
    const studentMap = new Map<number, { studentId: string; name: string; number: number }>();
    for (const s of existingStudents) {
      studentMap.set(s.number, s);
    }

    // Step 3: Save attendance for each day
    for (const day of classroomData.attendanceDays) {
      const attendanceRecords: { studentId: string; studentName: string; status: string }[] = [];

      for (const record of day.records) {
        const student = studentMap.get(record.studentNumber);
        if (!student) {
          // Student with this number doesn't exist in DB - skip
          continue;
        }
        // Skip records with empty status - don't count unchecked students as "มา"
        if (!record.status) continue;
        attendanceRecords.push({
          studentId: student.studentId,
          studentName: student.name,
          status: record.status,
        });
      }

      if (attendanceRecords.length === 0) continue;

      const saveRes = await api.saveAttendance(
        classroomData.classroom,
        day.date,
        attendanceRecords.map((r) => ({
          studentId: r.studentId,
          studentName: r.studentName,
          status: r.status,
        }))
      );

      if (saveRes.success) {
        attendanceSaved += saveRes.count;
      } else {
        errors.push(`ไม่สามารถบันทึกข้อมูลวันที่ ${day.date} ได้`);
      }
    }

    return { success: errors.length === 0, attendanceSaved, errors };
  } catch (err: any) {
    console.error("Error saving legacy attendance:", err);
    return { success: false, attendanceSaved: 0, errors: [err.message || "เกิดข้อผิดพลาด"] };
  }
};