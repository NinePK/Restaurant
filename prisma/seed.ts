import { PrismaClient, Role, WageType } from "@prisma/client";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 เริ่มต้น seed database...");

  // ─── Restaurant Settings ─────────────────────────────────────────────────
  const existingSettings = await prisma.restaurantSetting.findFirst();
  if (!existingSettings) {
    await prisma.restaurantSetting.create({
      data: {
        name: "ร้านอาหารของฉัน",
        phone: "02-xxx-xxxx",
        address: "123 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพฯ 10110",
        themeColor: "#E85D04",
        serviceChargeEnabled: false,
        serviceChargePercent: 10.0,
        vatEnabled: true,
        vatPercent: 7.0,
        receiptFooter: "ขอบคุณที่ใช้บริการ กรุณาเก็บใบเสร็จไว้เป็นหลักฐาน",
      },
    });
    console.log("✅ สร้าง restaurant settings แล้ว");
  }

  // ─── Admin User ──────────────────────────────────────────────────────────
  const existingAdmin = await prisma.user.findUnique({
    where: { username: "admin" },
  });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash("admin1234", 12);
    await prisma.user.create({
      data: {
        username: "admin",
        passwordHash,
        role: Role.OWNER,
        isActive: true,
      },
    });
    console.log("✅ สร้าง admin user แล้ว (username: admin, password: admin1234)");
    console.log("⚠️  กรุณาเปลี่ยนรหัสผ่านทันทีหลัง login ครั้งแรก!");
  }

  // ─── Sample Categories ───────────────────────────────────────────────────
  const categories = [
    { name: "อาหารจานหลัก", sortOrder: 1 },
    { name: "อาหารทานเล่น", sortOrder: 2 },
    { name: "ซุปและแกง", sortOrder: 3 },
    { name: "เครื่องดื่ม", sortOrder: 4 },
    { name: "ของหวาน", sortOrder: 5 },
  ];

  const createdCategories: Record<string, string> = {};
  for (const cat of categories) {
    const existing = await prisma.category.findFirst({ where: { name: cat.name } });
    if (!existing) {
      const created = await prisma.category.create({ data: cat });
      createdCategories[cat.name] = created.id;
      console.log(`✅ สร้างหมวดหมู่: ${cat.name}`);
    } else {
      createdCategories[cat.name] = existing.id;
    }
  }

  // ─── Sample Menu Items ───────────────────────────────────────────────────
  const menuItems = [
    {
      name: "ข้าวผัดกุ้ง",
      description: "ข้าวผัดกุ้งสดใส่ไข่ มีผักหอม แครอท ต้นหอม ปรุงรสกลมกล่อม",
      price: 85,
      categoryName: "อาหารจานหลัก",
      isFeatured: true,
    },
    {
      name: "ผัดไทยกุ้งสด",
      description: "ผัดไทยเส้นจันทน์กุ้งสด ใส่ไข่ ถั่วงอก ต้นหอม",
      price: 90,
      categoryName: "อาหารจานหลัก",
      isFeatured: true,
    },
    {
      name: "ต้มยำกุ้งน้ำข้น",
      description: "ต้มยำกุ้งสูตรน้ำข้น รสจัดจ้าน กุ้งสดตัวใหญ่",
      price: 120,
      categoryName: "ซุปและแกง",
      isFeatured: true,
    },
    {
      name: "แกงเขียวหวานไก่",
      description: "แกงเขียวหวานไก่ใส่มะเขือ ใบโหระพา หอมหัวใหญ่",
      price: 90,
      categoryName: "ซุปและแกง",
    },
    {
      name: "ปอเปี๊ยะทอด",
      description: "ปอเปี๊ยะไส้หมูสับผัก กรอบอร่อย เสิร์ฟพร้อมซอสพริกหวาน",
      price: 60,
      categoryName: "อาหารทานเล่น",
    },
    {
      name: "ไก่ทอดกระเทียม",
      description: "ไก่ทอดกระเทียมพริกไทยดำ หอมกรอบ",
      price: 75,
      categoryName: "อาหารทานเล่น",
    },
    {
      name: "น้ำเปล่า",
      description: "น้ำดื่มบรรจุขวด 600ml",
      price: 15,
      categoryName: "เครื่องดื่ม",
    },
    {
      name: "น้ำมะนาว",
      description: "น้ำมะนาวสด รสเปรี้ยวหวาน เย็นชื่นใจ",
      price: 35,
      categoryName: "เครื่องดื่ม",
    },
    {
      name: "ชาไทย",
      description: "ชาไทยนมสด เย็น หอมชา",
      price: 40,
      categoryName: "เครื่องดื่ม",
    },
    {
      name: "ไอศกรีมมะม่วง",
      description: "ไอศกรีมมะม่วงน้ำดอกไม้ ข้าวเหนียวมูน",
      price: 65,
      categoryName: "ของหวาน",
    },
    {
      name: "บัวลอยน้ำขิง",
      description: "บัวลอยไส้งาดำ น้ำขิงอุ่น หอมเครื่องเทศ",
      price: 45,
      categoryName: "ของหวาน",
    },
  ];

  for (const item of menuItems) {
    const existing = await prisma.menuItem.findFirst({ where: { name: item.name } });
    if (!existing) {
      await prisma.menuItem.create({
        data: {
          name: item.name,
          description: item.description,
          price: item.price,
          categoryId: createdCategories[item.categoryName],
          isFeatured: item.isFeatured || false,
          isAvailable: true,
          sortOrder: 0,
        },
      });
      console.log(`✅ สร้างเมนู: ${item.name}`);
    }
  }

  // ─── Sample Dining Tables ────────────────────────────────────────────────
  const tables = [
    "โต๊ะ 1", "โต๊ะ 2", "โต๊ะ 3", "โต๊ะ 4",
    "โต๊ะ 5", "โต๊ะ 6", "A1", "A2", "VIP1",
  ];

  for (const tableName of tables) {
    const existing = await prisma.diningTable.findUnique({ where: { name: tableName } });
    if (!existing) {
      await prisma.diningTable.create({
        data: {
          name: tableName,
          qrToken: uuidv4(),
          isActive: true,
        },
      });
      console.log(`✅ สร้างโต๊ะ: ${tableName}`);
    }
  }

  // ─── Sample Promotion ────────────────────────────────────────────────────
  const existingPromo = await prisma.promotion.findFirst();
  if (!existingPromo) {
    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + 30);
    await prisma.promotion.create({
      data: {
        name: "โปรโมชันเปิดตัว 🎉",
        description: "ลด 10% สำหรับเมนูอาหารจานหลักทุกจาน ตั้งแต่วันนี้ - สิ้นเดือน",
        startDate: now,
        endDate,
        isActive: true,
        discountType: "percent",
        discountValue: 10,
        autoApply: false,
        canStack: false,
      },
    });
    console.log("✅ สร้างโปรโมชัน ตัวอย่างแล้ว");
  }

  // ─── Sample Staff ────────────────────────────────────────────────────────
  const staffList = [
    { name: "นางสาวสมใจ รักงาน", phone: "081-111-1111", position: "พนักงานเสิร์ฟ", wageType: WageType.DAILY, wageRate: 400 },
    { name: "นายสมชาย ขยันดี", phone: "082-222-2222", position: "พ่อครัว", wageType: WageType.MONTHLY, wageRate: 15000 },
    { name: "นางสาวมาลี สุขใส", phone: "083-333-3333", position: "แคชเชียร์", wageType: WageType.DAILY, wageRate: 380 },
  ];

  for (const staff of staffList) {
    const existing = await prisma.staffProfile.findFirst({ where: { name: staff.name } });
    if (!existing) {
      await prisma.staffProfile.create({ data: staff });
      console.log(`✅ สร้างพนักงาน: ${staff.name}`);
    }
  }

  console.log("\n🎉 Seed เสร็จสมบูรณ์!");
  console.log("📝 ข้อมูล login:");
  console.log("   Username: admin");
  console.log("   Password: admin1234");
  console.log("\n⚠️  กรุณาเปลี่ยนรหัสผ่านทันที!");
}

main()
  .catch((e) => {
    console.error("❌ Seed ล้มเหลว:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
