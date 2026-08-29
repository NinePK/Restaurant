# Restaurant Management System

ระบบจัดการร้านอาหารสำหรับร้านเดียว ใช้สำหรับให้ลูกค้าสแกน QR ที่โต๊ะเพื่อสั่งอาหาร และให้เจ้าของร้าน/พนักงานจัดการเมนู ออเดอร์ ครัว แคชเชียร์ บิล พนักงาน รายงาน และการตั้งค่าร้านจากหลังบ้าน

ระบบนี้ออกแบบเป็นงานติดตั้งให้ร้านอาหารหนึ่งร้าน ไม่ใช่ SaaS หลายร้าน

---

## สถานะปัจจุบัน

ระบบแกนหลักใช้งานได้แล้ว:

- ลูกค้าสแกน QR เพื่อดูเมนูและสั่งอาหาร
- หลังบ้านรับออเดอร์แบบ polling ทุก 5 วินาที
- มี popup แจ้งเตือนออเดอร์ใหม่ทุกหน้าแอดมิน
- ครัวดูคิวและเปลี่ยนสถานะอาหารได้
- แคชเชียร์เลือกโต๊ะ รวมออเดอร์ ออกบิล และปิดโต๊ะได้
- ประวัติบิลมีตัวอย่างใบเสร็จและพิมพ์ใบเสร็จได้
- จัดการเมนู หมวดหมู่ โปรโมชัน โต๊ะ QR รูปภาพ และตั้งค่าร้านได้
- จัดการพนักงาน ตำแหน่ง account และสิทธิ์การเข้าถึงแต่ละเมนูได้
- มีรายงานยอดขายและ audit log
- รูปภาพรองรับ Cloudinary สำหรับ production และ fallback local upload สำหรับ local/dev

ก่อนส่งมอบจริงควรทดสอบ flow เต็มหลายรอบ และปิดช่อง API หลังบ้านบางตัวที่ยังเปิดอ่านได้โดยไม่ login ตามรายการใน `PROGRESS.md`

---

## ฟีเจอร์หลัก

### ลูกค้าและ QR Order

- หน้าเมนูลูกค้า `/t/[qrToken]`
- ลูกค้าสแกน QR จากโต๊ะเพื่อเปิดเมนู
- ค้นหาเมนูและกรองหมวดหมู่
- เพิ่มเมนูลงตะกร้า
- ใส่ note ต่อรายการอาหาร
- ส่งออเดอร์เข้าโต๊ะนั้นโดยตรง

### หลังบ้านร้านอาหาร

- Dashboard ภาพรวมร้าน
- Order board แยกสถานะ `รอรับ`, `รับแล้ว`, `กำลังทำ`
- Kitchen screen สำหรับครัว
- Billing/Cashier สำหรับออกบิลและปิดโต๊ะ
- Bill history สำหรับดูย้อนหลัง ค้นหา กรองวันที่ และพิมพ์ใบเสร็จ
- Global order notification พร้อมปุ่มลอยและ popup กลางจอ

### เมนูและพื้นที่ขาย

- CRUD หมวดหมู่
- CRUD เมนูอาหาร
- อัปโหลดรูปเมนูหลายรูป
- ลบรูปเมนูและลบจาก storage/Cloudinary
- จัดการโปรโมชัน
- โปรโมชันรองรับส่วนลดบาท/เปอร์เซ็นต์ ขั้นต่ำยอดสั่งซื้อ auto apply และ stack rule
- จัดการโต๊ะและ QR token
- ดาวน์โหลด QR code

### แคชเชียร์และบิล

- รวมออเดอร์ที่ยังไม่ปิดบิลตามโต๊ะ
- คำนวณส่วนลด VAT และ service charge
- ใช้ส่วนลดหน้าร้านร่วมกับโปรโมชันได้ตามเงื่อนไข
- วิธีชำระเงิน: เงินสด, โอนเงิน, PromptPay, บัตร
- ออกบิลแล้ว mark order เป็น served และปิดรอบโต๊ะ
- แสดง popup ตัวอย่างใบเสร็จหลังออกบิล
- พิมพ์ใบเสร็จแบบแนวตั้งสำหรับกระดาษบิล

### ทีมงานและสิทธิ์

- เพิ่มพนักงาน
- ตั้งค่าแรงรายวัน รายชั่วโมง หรือรายเดือน
- เพิ่มตำแหน่งผ่าน popup
- กำหนด permission ต่อแต่ละตำแหน่ง
- สร้าง account ให้พนักงานผ่าน popup
- ตารางจัดการ account เพื่อแก้ username, password, role, permission, เปิด/ปิด account และลบ account
- Sidebar แสดงเมนูตามสิทธิ์จริงของ account

### รายงานและ Audit Log

- รายงานยอดขาย
- Filter วันนี้และ 7 วัน
- Audit log เก็บเหตุการณ์สำคัญ
- Pagination ใน audit log
- Retention ลบประวัติอัตโนมัติทุก 30 วัน
- ปุ่มลบ audit log ทันทีสำหรับผู้มีสิทธิ์

### รูปภาพและ Storage

- Local upload สำหรับ development
- Cloudinary สำหรับ production
- รองรับรูปเมนูและโลโก้ร้าน
- ใช้ Cloudinary transform URL สำหรับ thumbnail เพื่อลดการอัปโหลดซ้ำ
- ลบรูปจาก Cloudinary เมื่อลบในระบบ ถ้าดึง `public_id` ได้

---

## Role และ Permission

Role หลักในระบบ:

| Role | ใช้สำหรับ |
| --- | --- |
| `OWNER` | เจ้าของร้าน เห็นและจัดการได้ทุกส่วน |
| `MANAGER` | ผู้จัดการ จัดการงานส่วนใหญ่ ยกเว้นบางส่วนที่อ่อนไหว |
| `CASHIER` | งานหน้าร้าน ออเดอร์ ออกบิล ประวัติบิล เมนู/โต๊ะบางส่วน |
| `KITCHEN` | หน้าครัวและสถานะอาหาร |
| `STAFF` | งานพนักงาน เช่น เวลาเข้างาน |

ระบบมี permission รายเมนู เช่น:

- `dashboard`
- `orders`
- `kitchen`
- `billing`
- `bills`
- `menu`
- `categories`
- `promotions`
- `tables`
- `staff`
- `attendance`
- `payroll`
- `reports`
- `settings`
- `audit-logs`

ผู้จัดการ/เจ้าของร้านสามารถสร้างตำแหน่งแล้วติ๊กว่า account นั้นจะเห็นเมนูไหนได้

---

## Tech Stack

- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Prisma ORM
- PostgreSQL
- JWT cookie auth ด้วย `jose`
- Password hashing ด้วย `bcryptjs`
- Cloudinary สำหรับ image storage บน production
- `qrcode` สำหรับ QR code
- Recharts สำหรับรายงาน
- ExcelJS และ `@react-pdf/renderer` ถูกเตรียมไว้สำหรับงาน export/report เพิ่มเติม
- Docker Compose สำหรับ database/local infra

---

## โครงสร้างโปรเจกต์

```text
Restaurant/
├── app/
│   ├── admin/
│   │   ├── login/
│   │   └── (protected)/
│   │       ├── dashboard/
│   │       ├── orders/
│   │       ├── kitchen/
│   │       ├── billing/
│   │       ├── bills/
│   │       ├── menu/
│   │       ├── categories/
│   │       ├── promotions/
│   │       ├── tables/
│   │       ├── staff/
│   │       ├── attendance/
│   │       ├── payroll/
│   │       ├── reports/
│   │       ├── settings/
│   │       └── audit-logs/
│   ├── api/
│   │   ├── auth/
│   │   ├── orders/
│   │   ├── billing/
│   │   ├── menu/
│   │   ├── categories/
│   │   ├── promotions/
│   │   ├── tables/
│   │   ├── staff/
│   │   ├── users/
│   │   ├── reports/
│   │   └── uploads/
│   └── t/[qrToken]/
├── components/
│   ├── admin/
│   └── ui/
├── lib/
├── prisma/
├── public/
├── scripts/
├── docker-compose.yml
├── Dockerfile
└── README.md
```

---

## URL สำคัญ

| URL | รายละเอียด |
| --- | --- |
| `/admin/login` | หน้า login หลังบ้าน |
| `/admin/dashboard` | ภาพรวมร้าน |
| `/admin/orders` | บอร์ดออเดอร์ |
| `/admin/kitchen` | หน้าครัว |
| `/admin/billing` | แคชเชียร์/ออกบิล |
| `/admin/bills` | ประวัติบิล |
| `/admin/menu` | จัดการเมนู |
| `/admin/categories` | จัดการหมวดหมู่ |
| `/admin/promotions` | จัดการโปรโมชัน |
| `/admin/tables` | จัดการโต๊ะและ QR |
| `/admin/staff` | พนักงาน ตำแหน่ง และ account |
| `/admin/attendance` | เวลาเข้างาน |
| `/admin/payroll` | เงินเดือน |
| `/admin/reports` | รายงาน |
| `/admin/settings` | ตั้งค่าร้าน |
| `/admin/audit-logs` | ประวัติการใช้งาน |
| `/t/[qrToken]` | หน้าเมนูลูกค้า |

---

## การติดตั้งสำหรับ Development

### ความต้องการ

- Node.js 20+
- npm 10+
- PostgreSQL 16+ หรือ Docker Desktop

### 1. ติดตั้ง dependencies

```bash
npm install
```

### 2. ตั้งค่า environment

คัดลอกไฟล์ตัวอย่าง:

```bash
cp .env.example .env
```

ตัวอย่างค่าหลัก:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/restaurant_db"
JWT_SECRET="change_me_to_a_long_random_secret_string_at_least_64_chars"
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
UPLOAD_DIR="public/uploads"
MAX_FILE_SIZE=10485760

# Optional for production image storage
CLOUDINARY_CLOUD_NAME=""
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""
CLOUDINARY_FOLDER="restaurant"
```

ถ้าไม่ได้ตั้งค่า Cloudinary ระบบจะ fallback ไปเก็บรูปใน local upload directory

### 3. เปิด database ด้วย Docker

ถ้าใช้ database จาก `docker-compose.yml`:

```bash
docker compose up -d db
```

### 4. Sync Prisma schema

สำหรับ development:

```bash
npm run db:push
npm run db:generate
```

หรือใช้คำสั่งตรง:

```bash
npx prisma db push
npx prisma generate
```

### 5. Seed ข้อมูลตัวอย่าง

```bash
npm run db:seed
```

Login เริ่มต้น:

```text
Username: admin
Password: admin1234
```

ต้องเปลี่ยนรหัสผ่านและ `JWT_SECRET` ก่อนใช้งานจริง

### 6. Run dev server

```bash
npm run dev
```

เปิด:

```text
http://localhost:3000
```

---

## Scripts

| Script | รายละเอียด |
| --- | --- |
| `npm run dev` | run Next.js dev server ด้วย Turbopack |
| `npm run dev:webpack` | run Next.js dev server ด้วย webpack |
| `npm run build` | production build |
| `npm run start` | start production server หลัง build |
| `npm run db:generate` | generate Prisma client |
| `npm run db:push` | push schema เข้า database |
| `npm run db:migrate` | deploy migrations |
| `npm run db:seed` | seed ข้อมูลเริ่มต้น |
| `npm run db:studio` | เปิด Prisma Studio |

หมายเหตุ: `npm run lint` ยังต้องตั้งค่า ESLint ให้เรียบร้อยก่อนใช้เป็น check จริง

---

## การใช้งาน Docker

เปิด database:

```bash
docker compose up -d db
```

ถ้าต้องการเปิดทั้ง stack ตาม `docker-compose.yml`:

```bash
docker compose up -d
```

หลังเปิด database ครั้งแรก:

```bash
npm run db:push
npm run db:seed
```

---

## Backup

มีสคริปต์ใน `scripts/`:

```bash
./scripts/backup-db.sh
./scripts/backup-uploads.sh
```

สำหรับ production ควรกำหนด backup database และ backup storage ให้ชัดเจนตามโฮสที่ใช้จริง

ถ้าใช้ Cloudinary เป็นหลัก ควรแยกแผน backup/restore รูปภาพออกจาก `public/uploads`

---

## Deployment Notes

แนะนำสำหรับขาย/ส่งมอบให้ร้านจริง:

- ให้ลูกค้าเป็นเจ้าของบัญชีโฮส โดเมน และ Cloudinary เองถ้าเป็นไปได้
- ผู้พัฒนาช่วยติดตั้งและตั้งค่าให้
- ราคาแพ็กเกจควรแยกค่าโฮส/โดเมน/บริการภายนอกออกจากค่าระบบ
- ตั้งค่า `JWT_SECRET` ใหม่ทุกครั้งก่อนขึ้น production
- เปลี่ยน password admin หลังติดตั้ง
- ตรวจ `.env` ไม่ให้หลุดขึ้น git
- ตั้งค่า `NEXT_PUBLIC_BASE_URL` ให้ตรงกับ domain จริง เพื่อให้ QR link ถูกต้อง
- ถ้า deploy บน platform ที่ filesystem ไม่ถาวร ให้ใช้ Cloudinary สำหรับรูปภาพ

---

## Known Issues / ก่อนส่งมอบจริง

รายการนี้มาจากการ smoke test ล่าสุด:

- API หลังบ้านบางตัวที่เป็น `GET` ยังอ่านได้โดยไม่ login เช่น billing, reports, attendance, payroll และ orders บาง endpoint ควรเพิ่ม auth/permission guard ก่อนขึ้น production
- `/api/tables` ส่ง `qrToken` ของทุกโต๊ะโดยไม่ต้อง login ควรแยก public endpoint สำหรับหน้าลูกค้าออกจาก admin endpoint
- `npm run lint` ยังเปิด Next.js ESLint setup wizard แทนการ lint จริง
- `npm audit --omit=dev` พบ vulnerability ใน dependency โดยเฉพาะ Next.js 14.2.13 ควรวางแผนอัปเดตแบบคุม breaking change
- ควรทดสอบ role/permission ทุกตำแหน่งซ้ำก่อนส่งมอบ
- ควรทดสอบ Cloudinary upload/delete ด้วยรูปจริง 30-100 รูป
- ควรทดสอบ flow เต็ม: ลูกค้าสั่ง -> รับออเดอร์ -> ครัว -> ออกบิล -> พิมพ์ใบเสร็จ -> ประวัติบิล

---

## หมายเหตุสำคัญ

- โปรเจกต์จริงตอนนี้อยู่ที่ `C:\Users\ninej\Desktop\Restaurant`
- Path เก่า `C:\Users\ninej\OneDrive\Desktop\Restaurant` เคยเหลือ `.next` และทำให้เกิดปัญหา `readlink EINVAL` ไม่ควรใช้เป็น working directory หลัก
- ระบบใช้ polling 5 วินาที ไม่ใช่ WebSocket เพื่อให้ดูแลง่ายและเหมาะกับร้านเดี่ยว
- ระบบไม่มี payment gateway จริง เป็นการบันทึกช่องทางชำระเงินเป็น label
- ค่า VAT และ Service Charge ตั้งได้จากหน้า `/admin/settings`
