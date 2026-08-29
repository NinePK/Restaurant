import { prisma } from "@/lib/prisma";
import { type JWTUser } from "@/lib/auth";

export const AUDIT_LOG_RETENTION_DAYS = 30;

type AuditAction =
  | "LOGIN"
  | "LOGOUT"
  | "CREATE_MENU_ITEM"
  | "UPDATE_MENU_ITEM"
  | "DELETE_MENU_ITEM"
  | "UPDATE_MENU_PRICE"
  | "CREATE_CATEGORY"
  | "UPDATE_CATEGORY"
  | "DELETE_CATEGORY"
  | "CREATE_ORDER"
  | "UPDATE_ORDER_STATUS"
  | "CANCEL_ORDER"
  | "CREATE_BILL"
  | "UPDATE_BILL"
  | "CLOSE_TABLE"
  | "CREATE_DISCOUNT"
  | "CREATE_STAFF"
  | "UPDATE_STAFF"
  | "DELETE_STAFF"
  | "UPDATE_USER_ACCOUNT"
  | "DELETE_USER_ACCOUNT"
  | "UPDATE_ATTENDANCE"
  | "CHECK_IN"
  | "CHECK_OUT"
  | "LATE"
  | "ABSENT"
  | "LEAVE"
  | "UPDATE_WAGE"
  | "GENERATE_PAYROLL"
  | "RESET_QR_TOKEN"
  | "UPDATE_SETTINGS"
  | "CREATE_PROMOTION"
  | "UPDATE_PROMOTION"
  | "DELETE_PROMOTION";

interface AuditOptions {
  userId?: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  oldValue?: unknown;
  newValue?: unknown;
  ipAddress?: string;
}

function getAuditLogRetentionCutoff() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - AUDIT_LOG_RETENTION_DAYS);
  return cutoff;
}

export async function cleanupOldAuditLogs() {
  try {
    await prisma.auditLog.deleteMany({
      where: {
        createdAt: {
          lt: getAuditLogRetentionCutoff(),
        },
      },
    });
  } catch (error) {
    console.error("Failed to clean up old audit logs:", error);
  }
}

export async function writeAuditLog(options: AuditOptions) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: options.userId,
        action: options.action,
        entityType: options.entityType,
        entityId: options.entityId,
        oldValue: options.oldValue ? (options.oldValue as object) : undefined,
        newValue: options.newValue ? (options.newValue as object) : undefined,
        ipAddress: options.ipAddress,
      },
    });
    await cleanupOldAuditLogs();
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
}

export function getUserFromRequest(user: JWTUser | null) {
  return user?.id;
}
