import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { COOKIE_NAME, verifyToken } from "@/lib/auth";
import { deleteUploadedFile } from "@/lib/upload";

async function getUser(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  return token ? verifyToken(token) : null;
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUser(request);
  if (!user || !["OWNER", "MANAGER", "CASHIER"].includes(user.role)) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์ลบรูป" }, { status: 403 });
  }

  const image = await prisma.menuItemImage.findUnique({ where: { id: params.id } });
  if (!image) {
    return NextResponse.json({ error: "ไม่พบรูปภาพ" }, { status: 404 });
  }

  await deleteUploadedFile(image.url);
  if (image.thumbnailUrl && !image.thumbnailUrl.includes("res.cloudinary.com")) {
    await deleteUploadedFile(image.thumbnailUrl);
  }

  await prisma.menuItemImage.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
}
