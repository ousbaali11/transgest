import { getLocale } from "@/lib/get-locale";
import AdminLoginForm from "./AdminLoginForm";

export default async function AdminLoginPage() {
  const locale = getLocale();
  return <AdminLoginForm locale={locale} />;
}
