import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_NAME } from "@/lib/auth";

export default function Home() {
  const hasSession = cookies().has(COOKIE_NAME);
  redirect(hasSession ? "/admin/dashboard" : "/admin/login");
}
