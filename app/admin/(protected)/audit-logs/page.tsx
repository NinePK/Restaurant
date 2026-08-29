import { prisma } from "@/lib/prisma";
import { AUDIT_LOG_RETENTION_DAYS, cleanupOldAuditLogs } from "@/lib/audit";
import { formatDateTime } from "@/lib/utils";
import Link from "next/link";
import { headers } from "next/headers";
import { ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import DeleteAuditLogsButton from "@/components/admin/DeleteAuditLogsButton";

const LOGS_PER_PAGE = 10;

interface AuditLogsPageProps {
  searchParams?: { page?: string };
}

export default async function AuditLogsPage({ searchParams }: AuditLogsPageProps) {
  await cleanupOldAuditLogs();

  const userRole = headers().get("x-user-role");
  const canDeleteLogs = userRole === "OWNER" || userRole === "ADMIN";
  const currentPage = Math.max(Number(searchParams?.page || 1) || 1, 1);
  const totalLogs = await prisma.auditLog.count();
  const pageCount = Math.max(Math.ceil(totalLogs / LOGS_PER_PAGE), 1);
  const safePage = Math.min(currentPage, pageCount);
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    skip: (safePage - 1) * LOGS_PER_PAGE,
    take: LOGS_PER_PAGE,
    include: { user: { select: { username: true } } },
  });

  return (
    <div className="space-y-6 fade-in">
      <section className="panel-surface p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff1df] text-[#b96526]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="section-kicker">Audit</p>
              <h1 className="mt-1 text-2xl font-semibold text-[#17211f]">ประวัติการใช้งาน</h1>
              <p className="mt-1 text-sm text-[#66736c]">เก็บย้อนหลัง {AUDIT_LOG_RETENTION_DAYS} วัน</p>
            </div>
          </div>
          <Badge variant="secondary" className="w-fit rounded-full">
            แสดง {logs.length === 0 ? 0 : (safePage - 1) * LOGS_PER_PAGE + 1}-{Math.min(safePage * LOGS_PER_PAGE, totalLogs)} จาก {totalLogs}
          </Badge>
          {canDeleteLogs && <DeleteAuditLogsButton />}
        </div>
      </section>

      <div className="space-y-2">
        {logs.length === 0 ? (
          <Card><CardContent className="text-center py-12 text-muted-foreground">ยังไม่มีประวัติการใช้งาน</CardContent></Card>
        ) : (
          logs.map((log) => (
            <Card key={log.id} className="hover:bg-gray-50 transition-colors">
              <CardContent className="flex items-start gap-4 py-3 px-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs font-mono">{log.action}</Badge>
                    <span className="text-sm text-muted-foreground">{log.entityType}</span>
                    {log.entityId && (
                      <span className="text-xs text-muted-foreground font-mono">#{log.entityId.slice(0, 8)}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{log.user?.username || "ระบบ"}</span>
                    <span>·</span>
                    <span>{formatDateTime(log.createdAt)}</span>
                    {log.ipAddress && <><span>·</span><span>{log.ipAddress}</span></>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {pageCount > 1 && (
        <div className="panel-surface flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[#66736c]">
            หน้า {safePage} / {pageCount}
          </p>
          <div className="flex gap-2">
            <Button asChild variant="outline" className="h-10 rounded-full bg-white" disabled={safePage === 1}>
              <Link href={`/admin/audit-logs?page=${Math.max(safePage - 1, 1)}`}>
                <ChevronLeft className="h-4 w-4" />
                ก่อนหน้า
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-10 rounded-full bg-white" disabled={safePage === pageCount}>
              <Link href={`/admin/audit-logs?page=${Math.min(safePage + 1, pageCount)}`}>
                ถัดไป
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
