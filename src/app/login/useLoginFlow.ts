"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { t, type Locale } from "@/lib/i18n";

export type LoginRole = "select" | "owner" | "driver";
export type OwnerStep = "email" | "code";

/**
 * Logique de l'écran de connexion (choix du rôle, envoi/vérification du
 * code email propriétaire, code chauffeur), partagée telle quelle entre la
 * page d'accueil Classique/Avancée (LoginForm.tsx) et la page d'accueil
 * Premium (LoginPremium.tsx). Déplacée ici depuis LoginForm.tsx sans aucun
 * changement de comportement : mêmes appels API, mêmes messages, même
 * enchaînement d'étapes.
 */
export function useLoginFlow(locale: Locale) {
  const router = useRouter();
  const [role, setRole] = useState<LoginRole>("select");

  // --- Propriétaire : email + code ---
  const [ownerStep, setOwnerStep] = useState<OwnerStep>("email");
  const [email, setEmail] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [lastSentEmail, setLastSentEmail] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);

  // --- Chauffeur : code à 8 caractères ---
  const [driverCode, setDriverCode] = useState("");

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function goHome() {
    setRole("select");
    setOwnerStep("email");
    setEmail("");
    setEmailCode("");
    setDriverCode("");
    setError("");
  }

  async function sendEmailCode() {
    setError("");
    if (!email.includes("@")) { setError(t(locale, "invalid_email_error")); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/send-email-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      let data: { error?: string; code?: string; devCode?: string } = {};
      try {
        data = await res.json();
      } catch {
        setError(t(locale, "unexpected_server_response"));
        return;
      }
      if (!res.ok) {
        if (data.code === "ALREADY_SENT" && email === lastSentEmail) {
          setOwnerStep("code");
          return;
        }
        setError(data.error || t(locale, "error_generic"));
        return;
      }
      setLastSentEmail(email);
      setDevCode(data.devCode || null);
      setOwnerStep("code");
    } catch {
      setError(t(locale, "server_unreachable"));
    } finally {
      setBusy(false);
    }
  }

  async function verifyEmailCode() {
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/verify-email-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: emailCode }),
      });
      let data: { error?: string } = {};
      try {
        data = await res.json();
      } catch {
        setError(t(locale, "unexpected_server_response"));
        return;
      }
      if (!res.ok) { setError(data.error || t(locale, "incorrect_code_error")); return; }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError(t(locale, "server_unreachable"));
    } finally {
      setBusy(false);
    }
  }

  function editEmail() {
    setOwnerStep("email");
    setEmailCode("");
    setError("");
  }

  async function driverLogin() {
    setError("");
    const cleaned = driverCode.replace(/\s+/g, "");
    if (cleaned.length !== 8) { setError(t(locale, "driver_code_length_error")); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/driver-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: cleaned }),
      });
      let data: { error?: string } = {};
      try {
        data = await res.json();
      } catch {
        setError(t(locale, "unexpected_server_response"));
        return;
      }
      if (!res.ok) { setError(data.error || t(locale, "incorrect_code_error")); return; }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError(t(locale, "server_unreachable"));
    } finally {
      setBusy(false);
    }
  }

  return {
    role, setRole, ownerStep, email, setEmail, emailCode, setEmailCode, devCode, driverCode, setDriverCode,
    error, busy, goHome, sendEmailCode, verifyEmailCode, editEmail, driverLogin,
  };
}
