import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export default function Home() {
  const session = getSession();
  if (session?.role === "PLATFORM_ADMIN") redirect("/admin");
  if (session?.role === "OWNER" || session?.role === "DRIVER") redirect("/dashboard");
  redirect("/login");
}
