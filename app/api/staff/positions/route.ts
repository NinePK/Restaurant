import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { allPermissions } from "@/lib/permissions";
import { z } from "zod";

const positionSchema = z.object({
  name: z.string().trim().min(1),
  permissions: z.array(z.enum(allPermissions as [string, ...string[]])).default([]),
});

async function getUser(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  return token ? verifyToken(token) : null;
}

export async function GET(request: NextRequest) {
  const user = await getUser(request);
  if (!user || !["OWNER", "MANAGER"].includes(user.role)) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
  }

  const positions = await prisma.staffPosition.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(positions);
}

export async function POST(request: NextRequest) {
  const user = await getUser(request);
  if (!user || !["OWNER", "MANAGER"].includes(user.role)) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = positionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "ข้อมูลตำแหน่งไม่ถูกต้อง" }, { status: 400 });
  }

  const position = await prisma.staffPosition.upsert({
    where: { name: parsed.data.name },
    update: { permissions: parsed.data.permissions },
    create: parsed.data,
  });

  return NextResponse.json(position);
}
