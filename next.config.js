/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Retire l'en-tête "X-Powered-By: Next.js" que Next.js ajoute par défaut
  // sur chaque réponse — évite de révéler la stack technique aux visiteurs
  // qui inspecteraient les requêtes réseau du site.
  poweredByHeader: false,
  // Désactive explicitement les source maps navigateur en production :
  // sans ça, un visiteur ouvrant les outils développeur pourrait voir
  // l'arborescence réelle des fichiers et dossiers du projet (src/app/...).
  // C'est déjà la valeur par défaut de Next.js, mais on la fixe
  // explicitement pour ne jamais dépendre d'un changement de comportement
  // futur du framework.
  productionBrowserSourceMaps: false,
};

module.exports = nextConfig;
