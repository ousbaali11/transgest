"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton({ redirectTo, label = "Déconnexion" }: { redirectTo: string; label?: string }) {
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push(redirectTo);
    router.refresh();
  }
  return (
    <button className="btn btn-ghost" style={{ width: "auto", padding: "6px 12px" }} onClick={logout}>
      {label}
    </button>
  );
}
