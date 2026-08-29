import { NextRequest, NextResponse } from "next/server";
import { processAndSaveImage, MAX_FILE_SIZE, ALLOWED_TYPES } from "@/lib/upload";
import { prisma } from "@/lib/prisma";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";

async function getUser(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return await verifyToken(token);
}

export async function POST(request: NextRequest) {
  const user = await getUser(request);
  if (!user || !["OWNER", "MANAGER", "CASHIER"].includes(user.role)) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const menuItemId = formData.get("menuItemId") as string;
    const files = formData.getAll("images") as File[];

    if (!menuItemId) {
      return NextResponse.json({ error: "กรุณาระบุ menuItemId" }, { status: 400 });
    }

    if (!files.length) {
      return NextResponse.json({ error: "กรุณาเลือกรูปภาพ" }, { status: 400 });
    }

    // Check menu item exists
    const menuItem = await prisma.menuItem.findUnique({ where: { id: menuItemId } });
    if (!menuItem) return NextResponse.json({ error: "ไม่พบเมนู" }, { status: 404 });

    // Get current image count for sort order
    const currentCount = await prisma.menuItemImage.count({ where: { menuItemId } });

    const results = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: `ไฟล์ ${file.name} ไม่รองรับ (รองรับ JPEG, PNG, WebP, GIF เท่านั้น)` },
          { status: 400 }
        );
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `ไฟล์ ${file.name} ขนาดใหญ่เกินไป (สูงสุด ${MAX_FILE_SIZE / 1024 / 1024}MB)` },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const { url, thumbnailUrl } = await processAndSaveImage(buffer, file.name, "menu");

      const image = await prisma.menuItemImage.create({
        data: {
          menuItemId,
          url,
          thumbnailUrl,
          sortOrder: currentCount + i,
        },
      });

      results.push(image);
    }

    return NextResponse.json(results, { status: 201 });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "อัปโหลดรูปภาพล้มเหลว" }, { status: 500 });
  }
}
