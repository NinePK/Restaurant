import { headers } from "next/headers";
import { redirect } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";

export default function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const requestHeaders = headers();
  const id = requestHeaders.get("x-user-id");
  const username = requestHeaders.get("x-user-username");
  const role = requestHeaders.get("x-user-role");
  const permissions = JSON.parse(requestHeaders.get("x-user-permissions") || "[]") as string[];

  if (!id || !username || !role) {
    redirect("/admin/login");
  }

  return <AdminShell user={{ id, username, role, permissions }}>{children}</AdminShell>;
}
