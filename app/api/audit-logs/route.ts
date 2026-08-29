import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const allowedRoles = ["OWNER", "ADMIN"];

async function getUser(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  return token ? verifyToken(token) : null;
}

export async function DELETE(request: NextRequest) {
  const user = await getUser(request);
  if (!user || !allowedRoles.includes(user.role)) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์ลบประวัติการใช้งาน" }, { status: 403 });
  }

  const result = await prisma.auditLog.deleteMany();
  return NextResponse.json({ success: true, deletedCount: result.count });
}
