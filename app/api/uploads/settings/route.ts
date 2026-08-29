import { NextRequest, NextResponse } from "next/server";
import { ALLOWED_TYPES, MAX_FILE_SIZE, processAndSaveImage } from "@/lib/upload";
import { COOKIE_NAME, verifyToken } from "@/lib/auth";

async function getUser(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  return token ? verifyToken(token) : null;
}

export async function POST(request: NextRequest) {
  const user = await getUser(request);
  if (!user || !["OWNER", "MANAGER"].includes(user.role)) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์อัปโหลดรูป" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("images");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "กรุณาเลือกรูปภาพ" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "รองรับเฉพาะ JPEG, PNG, WebP, GIF" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `ไฟล์ใหญ่เกินไป สูงสุด ${MAX_FILE_SIZE / 1024 / 1024}MB` },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await processAndSaveImage(buffer, file.name, "settings", { thumbnail: false });

  return NextResponse.json(result, { status: 201 });
}
