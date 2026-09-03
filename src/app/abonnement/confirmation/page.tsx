import { getLocale } from "@/lib/get-locale";
import ConfirmationClient from "./ConfirmationClient";

export default async function CheckoutConfirmationPage() {
  const locale = getLocale();
  return <ConfirmationClient locale={locale} />;
}
