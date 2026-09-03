/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Retire l'en-tête "X-Powered-By: Next.js" que Next.js ajoute par défaut
  // sur chaque réponse — évite de révéler la stack technique aux visiteurs
  // qui inspecteraient les requêtes réseau du site.
  poweredByHeader: false,
};

module.exports = nextConfig;
