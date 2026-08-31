/**
 * Service worker minimal pour TransGest.
 *
 * Objectif volontairement limité : rendre l'app installable (critère PWA)
 * et afficher une page de repli propre si l'utilisateur perd la connexion
 * en pleine navigation. Ce n'est PAS un cache "offline-first" complet —
 * les données (voyages, dépenses...) viennent d'une vraie base de données
 * et ne doivent pas être servies depuis un cache obsolète.
 *
 * Si vous voulez un vrai mode hors-ligne plus tard (consultation des
 * derniers voyages sans réseau, etc.), envisagez `next-pwa` ou Workbox
 * avec une stratégie "stale-while-revalidate" ciblée sur /api/trips, etc.
 */

const CACHE_NAME = "transgest-shell-v1";
const APP_SHELL = ["/offline.html", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Ne jamais intercepter les appels API : toujours réseau, jamais de cache
  // (données sensibles / toujours à jour : abonnement, voyages, etc.).
  if (request.method !== "GET" || request.url.includes("/api/")) {
    return;
  }

  // Pour la navigation (changement de page) : réseau d'abord, page hors-ligne
  // en repli si la requête échoue.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/offline.html"))
    );
    return;
  }

  // Pour les icônes/assets statiques : cache d'abord, réseau en repli.
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});
