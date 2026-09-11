import { redirect } from "next/navigation";
import { getValidSession } from "@/lib/auth";

export default async function Home() {
  const session = await getValidSession();
  if (session?.role === "PLATFORM_ADMIN") redirect("/admin");
  if (session?.role === "OWNER" || session?.role === "DRIVER") redirect("/dashboard");
  redirect("/login");
}
