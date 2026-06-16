# SMD Attendance System

ระบบเช็คชื่อนักเรียน (Student Attendance System) พัฒนาด้วย Next.js 14 สำหรับใช้งานในโรงเรียน รองรับการเช็คชื่อเข้าเรียน ตรวจเครื่องแต่งกาย และจัดการข้อมูลนักเรียน โดยมีการเชื่อมต่อฐานข้อมูลกับ Supabase และสามารถส่งข้อมูลสำรองไปยัง Google Sheets ได้

## 🌟 ฟีเจอร์หลัก (Features)

- **ระบบล็อกอิน (Authentication):** แบ่งสิทธิ์การใช้งานระหว่างนักเรียน (Student) และครู/ผู้ดูแลระบบ (Admin/Teacher) ผ่าน Supabase
- **ระบบจัดการข้อมูลนักเรียน:** รองรับการอัปโหลดไฟล์ Excel (`.xlsx`) เพื่อนำเข้าข้อมูลรายชื่อนักเรียนในระบบ
- **เช็คชื่อเข้าเรียน (Attendance):** บันทึกสถานะการเข้าเรียนของนักเรียน (มา, สาย, ลา, ขาด) 
- **ตรวจเครื่องแต่งกาย (Uniform Check):** บันทึกผลการตรวจระเบียบเครื่องแต่งกาย ทรงผม และเล็บ พร้อมสามารถระบุหมายเหตุได้
- **แดชบอร์ดสรุปผล:** มีการแสดงกราฟและสถิติข้อมูลการเข้าเรียน ด้วย Chart.js
- **Google Sheets Integration:** สามารถตั้งค่าให้ระบบส่งข้อมูลแบบ Background เข้าไปยัง Google Sheets เพื่อใช้สำรองข้อมูลหรือทำรายงาน (ผ่าน Google Apps Script)

## 🛠️ เทคโนโลยีที่ใช้ (Tech Stack)

- **Framework:** [Next.js 14](https://nextjs.org/) (App Router)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Database & Auth:** [Supabase](https://supabase.com/)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Charts:** [Chart.js](https://www.chartjs.org/) & [react-chartjs-2](https://react-chartjs-2.js.org/)
- **Dates Handling:** `date-fns`, `react-datepicker`, `react-day-picker`
- **Excel Parser:** `xlsx`

## 🚀 วิธีการติดตั้งและรันโปรเจกต์ (Getting Started)

1. **โคลนโปรเจกต์ (Clone repository)**
   ```bash
   git clone <repository-url>
   cd SMD-attendance
   ```

2. **ติดตั้ง Dependencies**
   ```bash
   npm install
   # หรือ
   yarn install
   # หรือ
   pnpm install
   ```

3. **ตั้งค่า Environment Variables**
   สร้างไฟล์ `.env.local` ที่ root directory ของโปรเจกต์ และกำหนดค่าเหล่านี้:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   
   # สำหรับส่งข้อมูลไปสำรองที่ Google Sheets (ตั้งค่าเมื่อต้องการใช้)
   NEXT_PUBLIC_APPS_SCRIPT_URL=your_google_apps_script_web_app_url
   ```

4. **รัน Development Server**
   ```bash
   npm run dev
   ```
   จากนั้นเปิดบราวเซอร์ไปที่ [http://localhost:3000](http://localhost:3000) เพื่อเข้าใช้งานระบบ

## 📊 การตั้งค่า Google Sheets (อุปกรณ์เสริมสำหรับแอดมิน)

ระบบนี้รองรับการเชื่อมต่อกับ Google Sheets เพื่อบันทึกข้อมูลแบบคู่ขนาน (ผ่าน Apps Script)

1. สร้าง Google Spreadsheet ใหม่
2. ไปที่เมนู `Extensions > Apps Script`
3. คัดลอกโค้ดจากไฟล์ [`Code.gs`](./Code.gs) ในโปรเจกต์ ไปวางทับในเอดิเตอร์
4. (ตัวเลือก) สามารถรันฟังก์ชัน `bootstrapWorkbook` จากหน้า Apps Script 1 ครั้ง เพื่อให้ระบบสร้าง Sheet ย่อยตามชื่อห้อง (เช่น 21, 22 ... 65) และเขียนหัวตารางให้โดยอัตโนมัติ
5. กดปุ่ม **Deploy > New Deployment**
   - Select type: **Web App**
   - Execute as: **Me**
   - Who has access: **Anyone**
6. นำ URL ของ Web App ที่ได้มาใส่ในไฟล์ `.env.local` ที่ตัวแปร `NEXT_PUBLIC_APPS_SCRIPT_URL`

## 📦 โครงสร้างฐานข้อมูล Supabase (Database Schema)

ระบบใช้งานตารางหลักๆ (Tables) ดังนี้:
- `students`: เก็บข้อมูลนักเรียน (`student_id`, `name`, `number`, `classroom`)
- `attendance`: เก็บประวัติการเช็คชื่อรายวัน (`classroom`, `date`, `student_id`, `student_name`, `status`, `timestamp`)
- `uniform_checks`: เก็บประวัติการตรวจเครื่องแต่งกาย (`classroom`, `date`, `teacher_name`, `student_id`, `student_name`, `uniform_pass`, `hair_pass`, `nail_pass`, พร้อมระบุหมายเหตุ)

## 📝 แผนการพัฒนาเพิ่มเติม (TODO)
ตรวจสอบฟีเจอร์ที่ต้องทำเพิ่มหรือบั๊กที่กำลังแก้ได้ที่ไฟล์ [`TODO.md`](./TODO.md)

---
*พัฒนาระบบสำหรับการจัดการเช็คชื่อนักเรียนในรูปแบบออนไลน์*
