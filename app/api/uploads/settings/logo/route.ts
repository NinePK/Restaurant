import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteUploadedFile } from "@/lib/upload";

const CLOUDINARY_DELETE_TIMEOUT_MS = 3000;

async function getUser(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  return token ? verifyToken(token) : null;
}

function withTimeout<T>(promise: Promise<T>, ms: number) {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

export async function DELETE(request: NextRequest) {
  const user = await getUser(request);
  if (!user || user.role !== "OWNER") {
    return NextResponse.json({ error: "เฉพาะเจ้าของร้านเท่านั้น" }, { status: 403 });
  }

  const settings = await prisma.restaurantSetting.findFirst();
  if (!settings?.logoUrl) {
    return NextResponse.json({ success: true });
  }

  await prisma.restaurantSetting.update({
    where: { id: settings.id },
    data: { logoUrl: null },
  });

  await withTimeout(
    deleteUploadedFile(settings.logoUrl).catch((error) => {
      console.error("Failed to delete logo file:", error);
      return null;
    }),
    CLOUDINARY_DELETE_TIMEOUT_MS
  );

  return NextResponse.json({ success: true });
}
