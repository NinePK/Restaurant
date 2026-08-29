# PROGRESS.md - Restaurant Management System

> อัปเดตล่าสุด: 30 มิถุนายน 2569

ระบบนี้เป็นระบบจัดการร้านอาหารสำหรับร้านเดียว ไม่ใช่ SaaS แบบหลายร้าน ลูกค้าสแกน QR ที่โต๊ะเพื่อสั่งอาหาร ส่วนพนักงาน/เจ้าของร้านใช้งานหลังบ้านสำหรับจัดการเมนู ออเดอร์ ครัว ออกบิล พนักงาน รายงาน และตั้งค่าร้าน

---

## สถานะรวม

ตอนนี้ระบบใช้งานแกนหลักได้แล้ว ตั้งแต่ลูกค้าสั่งอาหารผ่าน QR, แอดมินรับออเดอร์, ครัวจัดการคิว, แคชเชียร์ออกบิล/ปิดโต๊ะ, ดูประวัติบิล, จัดการเมนู/รูปภาพ/โปรโมชัน/โต๊ะ/พนักงาน/สิทธิ์การเข้าใช้งาน และตั้งค่าร้าน

ยังมีส่วนที่ควรเก็บงานต่อก่อนส่งมอบจริง เช่น ทดสอบ flow ทั้งระบบหลายรอบ, ปรับ UX รายละเอียดเล็กๆ, จัด deployment/backup ให้เรียบร้อย และทำคู่มือส่งมอบให้ลูกค้า

---

## Module ที่ทำแล้ว

### Authentication & Permission

- [x] Login ด้วย JWT cookie และ bcrypt
- [x] Middleware ป้องกัน `/admin/*`
- [x] Role หลัก: `OWNER`, `MANAGER`, `CASHIER`, `KITCHEN`, `STAFF`
- [x] เพิ่มระบบ permission รายเมนู เช่น dashboard, orders, billing, menu, staff, reports, settings
- [x] Sidebar แสดงเฉพาะเมนูที่ account นั้นมีสิทธิ์
- [x] เจ้าของ/ผู้จัดการสามารถกำหนดสิทธิ์ตอนสร้างตำแหน่งและ account ได้
- [x] เพิ่ม API จัดการ account: แก้ username, เปลี่ยน password, เปิด/ปิด account, ลบ account
- [x] กันไม่ให้ลบบัญชีเจ้าของร้าน และกันไม่ให้ผู้จัดการตั้งคนอื่นเป็นเจ้าของร้าน

### Dashboard & Admin Shell

- [x] Layout หลังบ้านพร้อม sidebar และ topbar
- [x] Navbar/Sidebar โหลดถูกหลัง login ไม่ต้อง refresh ซ้ำ
- [x] ลดข้อความที่ไม่จำเป็นในหลายหน้าให้กระชับขึ้น
- [x] ปรับ UI/UX ให้ดูเป็นระบบร้านอาหารมากขึ้น ลดความเป็น AI template
- [x] เพิ่ม order notification global ใน `AdminShell`
- [x] มีปุ่มลอยมุมขวาล่างพร้อม badge แสดงจำนวนออเดอร์รอรับ
- [x] เมื่อมีออเดอร์ใหม่จะเด้ง popup กลางจอทุกหน้าแอดมิน
- [x] Popup มีปุ่มปิดและปุ่มไปหน้าออเดอร์

### Restaurant Settings

- [x] ตั้งค่าชื่อร้าน เบอร์โทร LINE ID ที่อยู่ สีหลัก VAT Service Charge และข้อความท้ายใบเสร็จ
- [x] เพิ่มระบบอัปโหลดโลโก้ร้าน
- [x] โลโก้ร้านแสดงใน sidebar แทน icon fallback
- [x] ปรับ layout ตั้งค่าร้านให้ใช้พื้นที่เต็มขึ้น ไม่ลอยกลางจอแบบแคบๆ
- [x] แก้ field ตัวอย่างให้เป็น placeholder/ค่าว่าง ไม่ใช่ข้อมูลจริงที่ต้องลบเอง
- [x] เพิ่มปุ่มลบโลโก้ร้าน
- [x] อัปโหลด settings image ผ่าน Cloudinary ได้

### Image Storage & Cloudinary

- [x] เพิ่ม Cloudinary สำหรับเก็บรูปภาพจริงบน production
- [x] `lib/upload.ts` รองรับทั้ง Cloudinary และ fallback local upload
- [x] เพิ่ม `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_FOLDER`
- [x] `next.config.js` อนุญาตโหลดรูปจาก `res.cloudinary.com`
- [x] ลดการอัปโหลดซ้ำโดยใช้ Cloudinary transform URL แทนการอัปโหลด thumbnail อีกไฟล์
- [x] ลบรูปเมนู/โลโก้แล้วลบจาก Cloudinary ด้วยถ้าดึง `public_id` ได้
- [x] แก้ bug UI ค้างที่ "กำลังอัปโหลดรูป" หลัง API ตอบ 200

### Category & Menu

- [x] CRUD หมวดหมู่
- [x] CRUD เมนูอาหาร
- [x] อัปโหลดรูปเมนูหลายรูป
- [x] ลบรูปเมนูได้จากหน้าเมนู
- [x] ลบเมนูแล้วลบรูปที่เกี่ยวข้องออกจาก storage
- [x] รองรับรูปจาก Cloudinary สำหรับการ deploy จริง

### Promotions

- [x] CRUD โปรโมชัน
- [x] รองรับส่วนลดแบบบาทและเปอร์เซ็นต์
- [x] ตั้งวันที่เริ่ม/สิ้นสุดโปรโมชัน
- [x] ตั้งขั้นต่ำยอดสั่งซื้อได้
- [x] ตั้ง auto apply เพื่อบังคับใช้โปรโมชันอัตโนมัติ
- [x] ตั้ง `canStack` เพื่อกำหนดว่าโปรนี้ใช้ร่วมกับโปรอื่นได้หรือไม่
- [x] หน้าแคชเชียร์เลือกโปรโมชันจากระบบได้
- [x] โปรโมชันที่ไม่เข้าเกณฑ์ถูก disable ไม่ให้เลือก
- [x] แก้ timezone โปรโมชันให้สอดคล้องกับวันแบบ Bangkok

### Table & QR

- [x] CRUD โต๊ะ
- [x] สร้าง QR สำหรับแต่ละโต๊ะ
- [x] ดาวน์โหลด QR ได้
- [x] reset token QR ได้
- [x] ลูกค้าสแกน `/t/[qrToken]` เพื่อเข้าหน้าเมนูของโต๊ะนั้น

### Customer Ordering

- [x] หน้าเมนูลูกค้าแบบ mobile-first
- [x] ค้นหา/กรองหมวดหมู่
- [x] เพิ่มรายการลงตะกร้า
- [x] note ต่อรายการอาหาร
- [x] ส่งออเดอร์เข้า `/api/orders`
- [x] ตรวจสอบเมนูที่หมด/ไม่พร้อมขายก่อนสร้างออเดอร์

### Orders & Kitchen

- [x] หน้า `/admin/orders` แสดงคิวออเดอร์แบบ 3 สถานะ: รอรับ, รับแล้ว, กำลังทำ
- [x] Polling ทุก 5 วินาที
- [x] ปุ่มเปลี่ยนสถานะ: `PENDING -> ACCEPTED -> PREPARING -> SERVED`
- [x] ยกเลิกออเดอร์พร้อม confirm dialog
- [x] ย้าย action buttons ให้อยู่บน card เพื่อกดง่ายเมื่อรายการยาว
- [x] จำกัดรายการใน card และมีปุ่มดูเพิ่ม ลดการ scroll ยาว
- [x] จำกัดจำนวนออเดอร์ต่อ column พร้อมปุ่มดูเพิ่มเมื่อเกิน 10 รายการ
- [x] หน้า `/admin/kitchen` สำหรับครัวพร้อม polling
- [x] เก็บ OrderStatusLog ทุกครั้งที่เปลี่ยนสถานะ
- [x] เพิ่ม global popup แจ้งเตือนออเดอร์ใหม่ทุกหน้า

### Billing / Cashier

- [x] หน้า `/admin/billing` เลือกโต๊ะและรวมออเดอร์ที่ยังไม่ปิดบิล
- [x] แคชเชียร์คำนวณ subtotal, discount, service charge, VAT, grand total
- [x] รองรับวิธีชำระเงิน: เงินสด, โอนเงิน, พร้อมเพย์, บัตร
- [x] สร้างบิลและปิดโต๊ะด้วย transaction
- [x] แก้ bug ปิดโต๊ะแล้วออเดอร์ใหม่ไปรวมกับบิลเก่า
- [x] แก้ช่องส่วนลดไม่ให้ติดเลข 0 ข้างหน้า เช่น `010%`
- [x] ส่วนลดหน้าร้านใช้งานร่วมกับโปรโมชันได้ตามเงื่อนไข
- [x] รวมแนวคิด "แคชเชียร์" กับ "ออกบิล" ให้สื่อความหมายชัดขึ้น
- [x] หลังออกบิลและปิดโต๊ะ แสดง popup ตัวอย่างใบเสร็จพร้อมปุ่มพิมพ์

### Receipt & Bill History

- [x] หน้า `/admin/bills` สำหรับดูประวัติบิล
- [x] มี filter วันที่ โต๊ะ ช่องทางจ่าย และค้นหาเลขบิล/หมายเหตุ
- [x] แก้ timezone ประวัติบิลให้ใช้วันแบบ Bangkok ไม่คลาดวันตอนตี 2-3
- [x] เลขบิลปรับให้เหมาะกับผู้ใช้ไทยมากขึ้น
- [x] แสดงรายละเอียดบิลทางขวาในรูปแบบใบเสร็จ
- [x] พิมพ์ใบเสร็จแบบแนวตั้งและตั้งค่าขนาดกระดาษสำหรับบิล
- [x] เพิ่ม pagination เมื่อรายการบิลเกิน 10 รายการ
- [x] ตัด KPI "เฉลี่ยต่อบิล" ออกตาม feedback

### Staff / Attendance / Payroll

- [x] หน้า `/admin/staff` เพิ่มพนักงานได้
- [x] ตั้งประเภทค่าแรง: รายวัน รายชั่วโมง รายเดือน
- [x] เพิ่มตำแหน่งพนักงานผ่าน popup
- [x] ตำแหน่งมี permission checklist ว่าเห็นส่วนไหนของระบบได้บ้าง
- [x] สร้าง account ให้พนักงานผ่าน popup ไม่ทำให้ form ยาวเกินไป
- [x] ตารางจัดการ account สำหรับแก้ username/password/role/permission/สถานะ/ลบ account
- [x] ปิดใช้งานพนักงานแล้ว sync กับ account ที่ผูกไว้
- [x] หน้า `/admin/attendance` ปรับ flow เช็คชื่อ ลา ขาด สาย ให้ใช้ง่ายขึ้น
- [x] หน้า `/admin/payroll` ปรับ UI ให้เข้าใจการคำนวณเงินเดือนได้ง่ายขึ้น
- [ ] ทดสอบ payroll กับข้อมูลจริงหลายรูปแบบก่อนส่งมอบ
- [ ] Export Excel สำหรับ attendance/payroll ยังควรเก็บต่อ

### Reports & Audit Logs

- [x] หน้า `/admin/reports` สำหรับรายงานยอดขาย
- [x] Filter วันนี้/7 วันทำงานแล้ว
- [x] ตัดค่าเฉลี่ยต่อบิลออก
- [x] หน้า `/admin/audit-logs` แสดงประวัติการใช้งาน
- [x] Audit logs มี pagination 10 รายการต่อหน้า
- [x] ตั้ง retention ลบประวัติอัตโนมัติทุก 30 วัน
- [x] เพิ่มปุ่มลบประวัติทันที เฉพาะเจ้าของร้าน/ผู้มีสิทธิ์
- [ ] Export รายงานเป็น Excel/PDF ยังควรเก็บต่อ

---

## Bug / Performance ที่แก้ไปแล้ว

- [x] แก้ `npm run db:seed` บน PowerShell ที่ JSON quote พัง
- [x] แก้ PostCSS config ให้ Next.js build ผ่าน
- [x] แก้ปัญหา `.next` ใน OneDrive ทำให้ `readlink EINVAL`
- [x] ย้ายโปรเจกต์ออกจาก OneDrive Desktop มาใช้ `C:\Users\ninej\Desktop\Restaurant`
- [x] ปิด process ที่ค้าง port 3000 หลายครั้งระหว่างพัฒนา
- [x] ลดความช้าจาก OneDrive backup/sync
- [x] แก้ Navbar หายหลัง login ครั้งแรก
- [x] ปรับ pagination/expand list เพื่อลดการ scroll เมื่อข้อมูลเยอะ
- [x] แก้ timezone หลายจุดให้ยึดวันแบบ Bangkok
- [x] แก้การพิมพ์ใบเสร็จที่ preview เล็กเกินไป
- [x] แก้ order notification popup มีขอบขาวและปุ่มลอยทับ topbar

---

## Tech Stack ปัจจุบัน

- Next.js 14 App Router + TypeScript
- Prisma ORM + PostgreSQL
- Tailwind CSS + shadcn/ui
- JWT cookie auth ด้วย `jose`
- Password hashing ด้วย `bcryptjs`
- Cloudinary สำหรับรูปภาพ production
- Docker Compose สำหรับ database/local infra
- Polling 5 วินาทีสำหรับ order/kitchen/notification

---

## Deployment / ส่งมอบที่คุยกันไว้

- ระบบนี้เหมาะกับขายเป็นงานติดตั้งให้ร้านเดียว
- รูปภาพเมนู/โลโก้ควรเก็บ Cloudinary เพื่อลด bug จาก filesystem บน hosting
- ลูกค้าสามารถอัปโหลดรูปเองได้หลัง deploy แล้ว ไม่ต้องให้เราฝังรูปก่อนส่งมอบ
- ถ้ามีหลายร้าน แนะนำแยก Cloudinary folder หรือแยก account ตามรูปแบบการดูแลลูกค้า
- ควรเตรียมเอกสารส่งมอบ: URL ระบบ, username/password เริ่มต้น, วิธีเพิ่มเมนู, วิธีเพิ่มโต๊ะ QR, วิธี backup, วิธีติดต่อ support
- ราคาที่คุยเป็นแนวทาง: ระบบพร้อมติดตั้ง + ดูแล 1 เดือน ควรวางแพ็กเกจตาม scope ร้านจริง

---

## สิ่งที่ควรทำต่อ

1. ทดสอบ flow เต็ม: ลูกค้าสั่ง -> รับออเดอร์ -> ครัว -> ออกบิล -> พิมพ์ใบเสร็จ -> ประวัติบิล
2. ทดสอบ role/permission ทุกตำแหน่ง โดยเฉพาะ cashier/kitchen/staff
3. ทดสอบ Cloudinary upload/delete กับรูปจริง 30-100 รูป
4. ทำคู่มือใช้งานสำหรับเจ้าของร้านและพนักงาน
5. เตรียม production env, backup database, backup upload/storage policy
6. ตรวจ responsive บนมือถือ/tablet โดยเฉพาะหน้าลูกค้าและหน้าแคชเชียร์
7. เก็บงาน export Excel/PDF สำหรับรายงานและ payroll ถ้าลูกค้าต้องใช้

---

## หมายเหตุสำคัญ

- โปรเจกต์จริงตอนนี้อยู่ที่ `C:\Users\ninej\Desktop\Restaurant`
- Path เก่า `C:\Users\ninej\OneDrive\Desktop\Restaurant` เคยเหลือ `.next` และทำให้เกิดปัญหา ไม่ควรใช้เป็น working directory หลัก
- ระบบยังใช้ polling ไม่ใช่ WebSocket เพราะเหมาะกับร้านเดี่ยวและดูแลง่ายกว่า
- ก่อนส่งมอบจริงต้องเปลี่ยน `JWT_SECRET`, password admin และตรวจ `.env` ไม่ให้หลุดขึ้น git
