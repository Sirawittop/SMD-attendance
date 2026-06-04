/**
 * Google Apps Script Web App Backend for Attendance Tracking System
 * 
 * Instructions:
 * 1. Create a new Google Spreadsheet.
 * 2. Click Extensions > Apps Script.
 * 3. Replace the default code with this file's contents.
 * 4. Click Deploy > New Deployment.
 * 5. Select type: Web App.
 * 6. Set Description: "Attendance System Backend"
 * 7. Set Execute as: "Me (your email)"
 * 8. Set Who has access: "Anyone"
 * 9. Click Deploy and copy the Web App URL.
 * 10. Paste the URL into your project's .env.local as NEXT_PUBLIC_APPS_SCRIPT_URL.
 */

function doPost(e) {
  var result;
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("No post data received");
    }
    
    var requestData = JSON.parse(e.postData.contents);
    var action = requestData.action;
    
    switch (action) {
      case "getStudents":
        result = getStudents(requestData.classroom);
        break;
      case "saveStudents":
        result = saveStudents(requestData.classroom, requestData.students);
        break;
      case "deleteStudent":
        result = deleteStudent(requestData.classroom, requestData.studentId);
        break;
      case "saveAttendance":
        result = saveAttendance(requestData.classroom, requestData.date, requestData.attendance);
        break;
      case "getAttendance":
        result = getAttendance(requestData.classroom, requestData.date);
        break;
      default:
        result = { success: false, error: "Unknown action: " + action };
    }
  } catch (err) {
    result = { success: false, error: err.toString() };
  }
  
  // Return plain text to avoid CORS pre-flight checks and browser blocking issues
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.TEXT);
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ 
    success: true, 
    message: "Google Apps Script Backend is running! Use POST request for operations." 
  })).setMimeType(ContentService.MimeType.TEXT);
}

// --- Helper function to get sheet or create it with headers ---
function getOrCreateSheet(sheetName, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    if (headers && headers.length > 0) {
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
    }
  }
  return sheet;
}

// --- Get Student List ---
function getStudents(classroom) {
  if (!classroom) {
    throw new Error("Classroom is required for getStudents");
  }
  var tabName = "Students_" + classroom.replace("/", "-"); // Avoid sheet tab name slashes just in case
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(tabName);
  
  if (!sheet) {
    return { success: true, students: [] };
  }
  
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return { success: true, students: [] };
  }
  
  var headers = data[0];
  var students = [];
  
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var student = {};
    for (var j = 0; j < headers.length; j++) {
      var key = headers[j];
      student[key] = row[j];
    }
    students.push(student);
  }
  
  return { success: true, students: students };
}

// --- Save Student List (Overwrite for classroom) ---
function saveStudents(classroom, students) {
  if (!classroom) {
    throw new Error("Classroom is required for saveStudents");
  }
  if (!Array.isArray(students)) {
    throw new Error("Students must be an array");
  }
  
  var tabName = "Students_" + classroom.replace("/", "-");
  var headers = ["studentId", "name", "number"];
  var sheet = getOrCreateSheet(tabName, headers);
  
  // Clear all content except headers
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
  }
  
  if (students.length === 0) {
    return { success: true, message: "Cleared student list" };
  }
  
  var rows = students.map(function(s) {
    return [
      s.studentId ? String(s.studentId).trim() : "",
      s.name ? String(s.name).trim() : "",
      s.number ? Number(s.number) : ""
    ];
  });
  
  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  return { success: true, count: students.length };
}

// --- Delete Student from Classroom ---
function deleteStudent(classroom, studentId) {
  if (!classroom || !studentId) {
    throw new Error("Classroom and Student ID are required for deleteStudent");
  }
  
  var tabName = "Students_" + classroom.replace("/", "-");
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(tabName);
  
  if (!sheet) {
    return { success: false, error: "Classroom student tab not found" };
  }
  
  var data = sheet.getDataRange().getValues();
  var studentIdColIndex = 0; // "studentId" is column 1
  var rowToDelete = -1;
  
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][studentIdColIndex]).trim() === String(studentId).trim()) {
      rowToDelete = i + 1; // 1-based index
      break;
    }
  }
  
  if (rowToDelete !== -1) {
    sheet.deleteRow(rowToDelete);
    return { success: true, message: "Deleted student ID: " + studentId };
  } else {
    return { success: false, error: "Student ID " + studentId + " not found in classroom " + classroom };
  }
}

// --- Save Attendance Records ---
function saveAttendance(classroom, date, attendanceList) {
  if (!classroom || !date) {
    throw new Error("Classroom and Date are required for saveAttendance");
  }
  if (!Array.isArray(attendanceList)) {
    throw new Error("Attendance list must be an array");
  }
  
  var tabName = "Attend_" + classroom.replace("/", "-");
  var headers = ["Date", "StudentID", "StudentName", "Status", "Timestamp"];
  var sheet = getOrCreateSheet(tabName, headers);
  
  var data = sheet.getDataRange().getValues();
  
  // 1. Find rows to delete (matching the given date)
  var rowsToDelete = [];
  // Go backwards so index remains valid after deleting rows
  for (var i = data.length - 1; i >= 1; i--) {
    var rowDate = data[i][0];
    var formattedRowDate = "";
    if (rowDate instanceof Date) {
      formattedRowDate = Utilities.formatDate(rowDate, Session.getScriptTimeZone(), "yyyy-MM-dd");
    } else {
      formattedRowDate = String(rowDate).trim();
    }
    
    if (formattedRowDate === date) {
      rowsToDelete.push(i + 1);
    }
  }
  
  // Delete existing records for that date
  rowsToDelete.forEach(function(rowNum) {
    sheet.deleteRow(rowNum);
  });
  
  // 2. Append new records
  if (attendanceList.length === 0) {
    return { success: true, message: "Cleared attendance for date: " + date };
  }
  
  var timestamp = new Date();
  var newRows = attendanceList.map(function(att) {
    return [
      date,
      att.studentId ? String(att.studentId).trim() : "",
      att.studentName ? String(att.studentName).trim() : "",
      att.status || "ขาด",
      timestamp
    ];
  });
  
  sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, headers.length).setValues(newRows);
  return { success: true, count: attendanceList.length, date: date };
}

// --- Get Attendance Records ---
function getAttendance(classroom, date) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var results = [];
  
  // Define which sheets to scan
  var sheetsToScan = [];
  if (classroom) {
    var targetTabName = "Attend_" + classroom.replace("/", "-");
    var targetSheet = ss.getSheetByName(targetTabName);
    if (targetSheet) {
      sheetsToScan.push({ name: classroom, sheet: targetSheet });
    }
  } else {
    // Scan all sheets with "Attend_" prefix
    var allSheets = ss.getSheets();
    allSheets.forEach(function(s) {
      var name = s.getName();
      if (name.indexOf("Attend_") === 0) {
        var clsName = name.replace("Attend_", "").replace("-", "/");
        sheetsToScan.push({ name: clsName, sheet: s });
      }
    });
  }
  
  sheetsToScan.forEach(function(item) {
    var sheet = item.sheet;
    var cls = item.name;
    var data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) return; // Only headers
    
    var headers = data[0];
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var rowDate = row[0];
      var formattedRowDate = "";
      if (rowDate instanceof Date) {
        formattedRowDate = Utilities.formatDate(rowDate, Session.getScriptTimeZone(), "yyyy-MM-dd");
      } else {
        formattedRowDate = String(rowDate).trim();
      }
      
      // Filter by date if specified
      if (date && formattedRowDate !== date) {
        continue;
      }
      
      var record = {
        classroom: cls,
        date: formattedRowDate,
        studentId: row[1],
        studentName: row[2],
        status: row[3],
        timestamp: row[4]
      };
      
      results.push(record);
    }
  });
  
  return { success: true, attendance: results };
}
