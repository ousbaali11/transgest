"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton({ redirectTo, label = "Déconnexion" }: { redirectTo: string; label?: string }) {
  const router = useRouter();
  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {
      // On redirige quand même : mieux vaut renvoyer l'utilisateur vers la
      // connexion (au pire il devra se reconnecter) que le laisser bloqué
      // sur place sans aucune réaction si le réseau a un souci ponctuel.
      console.error("Échec de la déconnexion :", e);
    } finally {
      router.push(redirectTo);
      router.refresh();
    }
  }
  return (
    <button className="btn btn-ghost" style={{ width: "auto", padding: "6px 12px" }} onClick={logout}>
      {label}
    </button>
  );
}
