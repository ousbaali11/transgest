# TransGest — application réelle (Next.js + PostgreSQL)

Ceci est la vraie version, déployable, du prototype. Même modèle de données,
mêmes fonctionnalités (authentification par téléphone, abonnements avec
devise automatique, espace admin avec mots de passe et abonnements offerts),
mais avec une vraie base de données et une vraie authentification au lieu du
stockage du navigateur.

## Stack

- **Next.js 14** (App Router) — pages + routes API dans un seul projet
- **PostgreSQL** via **Prisma** — hébergez-le sur [Supabase](https://supabase.com), [Neon](https://neon.tech) ou Railway
- **Sessions** par cookie JWT signé (`jsonwebtoken`), httpOnly
- **Mots de passe admin** hachés avec `bcryptjs`
- **SMS (OTP)** : interface prête dans `src/lib/sms.ts`, branchez Twilio ou un
  agrégateur marocain ; en développement, le code s'affiche dans la console
  et dans la réponse de l'API pour tester sans SMS réel

## Démarrage en local

```bash
npm install                  # installe les dépendances + génère le client Prisma
cp .env.example .env         # renseignez DATABASE_URL et SESSION_SECRET
npx prisma migrate dev --name init
npm run db:seed              # crée les formules d'abonnement + votre compte admin
npm run dev
```

Ouvrez `http://localhost:3000` :
- `/login` — création de compte / connexion par téléphone (le code de test
  s'affiche à l'écran tant qu'aucun fournisseur SMS n'est configuré)
- `/admin/login` — connexion admin avec l'email/mot de passe défini dans
  `.env` (`ADMIN_EMAIL` / `ADMIN_PASSWORD`, par défaut
  `admin@transgest.ma` / `admin2026` — **changez-le dès le premier lancement**
  depuis Réglages admin > Sécurité)

## Déployer en production (Vercel + Supabase)

1. **Base de données** : créez un projet sur supabase.com, copiez la
   "Connection string" (mode "Transaction" recommandé pour le pooling) dans
   `DATABASE_URL`.
2. **Poussez ce dossier sur GitHub**, puis importez-le sur
   [vercel.com/new](https://vercel.com/new).
3. Dans les réglages Vercel, ajoutez les variables d'environnement de
   `.env.example` (`DATABASE_URL`, `SESSION_SECRET` généré avec
   `openssl rand -base64 32`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`).
4. Après le premier déploiement, lancez une fois (en local, pointé sur la
   base de production, ou via `vercel env pull` + `npx prisma migrate deploy`) :
   ```bash
   npx prisma migrate deploy
   npm run db:seed
   ```
5. Connectez un vrai fournisseur SMS (Twilio le plus simple à démarrer) en
   ajoutant `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`
   et en installant `npm install twilio`, puis en décommentant l'exemple dans
   `src/lib/sms.ts`.
6. Pour le paiement réel (Stripe n'est pas disponible pour une entité
   domiciliée au Maroc), intégrez CMI ou PayZone : leur webhook de paiement
   confirmé doit appeler la même logique que
   `src/app/api/subscription/subscribe/route.ts`, pas le bouton du client
   directement (le fichier contient une note à ce sujet).

## Ce qui est fonctionnel dès maintenant

- Inscription/connexion par téléphone + code, avec indicatif auto-détecté
  et option "Autre" à indicatif libre
- Connexion admin par email/mot de passe, changement de mot de passe avec
  bouton afficher/masquer
- Session persistante façon WhatsApp (400 jours, renouvelée automatiquement
  à chaque visite — voir `src/middleware.ts`)
- Abonnement avec devise automatique (MAD/EUR/USD), résiliation avec accès
  jusqu'à la fin de la période payée, puis verrouillage automatique
- Attribution gratuite d'un abonnement par l'admin à un utilisateur précis
  (voir `/admin`), avec durée ou accès illimité
- CRUD complet avec modification et suppression : camions, chauffeurs,
  clients, voyages, dépenses — toutes les routes API dans `src/app/api/`
- Génération de facture depuis un voyage (`/trips`), statut payée/en attente
  (`/factures`)
- Colonnes personnalisées (`/colonnes`) : créez des champs propres à votre
  activité, ils apparaissent automatiquement dans les formulaires de voyage
  et de dépense, et dans l'export Excel
- **Export Excel** (`/api/export`, lien depuis Réglages) : un onglet par
  chauffeur avec formules Excel natives (solde, total dépenses, bénéfice),
  un onglet Global avec les totaux par chauffeur et par camion
- Alertes d'échéance des documents véhicules (assurance, visite technique,
  vignette) : badge sur le camion concerné, bannière sur le tableau de bord
- Logo de marque en emoji ou en image (upload + réglage de la taille) depuis
  l'espace admin
- Tableau de bord : chiffre d'affaires, dépenses, bénéfice, classement des
  chauffeurs du mois, alertes véhicules
- Facture PDF téléchargeable (`/api/invoices/[id]/pdf`), lien depuis
  `/factures` et depuis chaque voyage facturé
- Protection contre l'abus d'envoi de code : en plus du délai de 30s par
  numéro, une même adresse IP est limitée à 5 demandes de code toutes les
  15 minutes (`/api/auth/send-otp`)

## Ce qu'il reste à faire pour la parité complète avec le prototype

- Regrouper `/dashboard`, `/trips`, `/expenses`, etc. sous
  `src/app/(app)/layout.tsx` pour factoriser l'appel à `requireActiveOrg()`
  au lieu de le répéter dans chaque page, et pour afficher un en-tête de
  marque (logo + nom) cohérent sur toutes les pages
- La limite anti-abus par IP est un point de départ raisonnable, pas une
  protection complète (un attaquant déterminé peut changer d'IP) — un vrai
  captcha (Cloudflare Turnstile, hCaptcha) reste recommandé avant une
  ouverture publique à grande échelle

## PWA — installable sur téléphone sans passer par les stores

L'app est installable directement depuis le navigateur ("Ajouter à l'écran
d'accueil" sur Android/Chrome, "Sur l'écran d'accueil" dans le menu Partager
de Safari sur iOS). Ce qui a été ajouté pour ça :

- `src/app/manifest.ts` — génère `/manifest.webmanifest`, avec le nom et la
  couleur de thème **lus dynamiquement depuis `PlatformSettings`** (ce que
  l'admin configure dans `/admin` se reflète directement dans l'icône/le nom
  affichés une fois l'app installée)
- `public/icons/` — icônes 192px, 512px et une version "maskable" (fond plein
  pour les icônes adaptatives Android) ; `src/app/icon.png` et
  `apple-icon.png` pour le favicon et l'icône iOS, générées automatiquement
  par les conventions de fichiers Next.js
- `public/sw.js` — service worker minimal : ne met en cache que les assets
  statiques, ne cache jamais les routes `/api/*` (vos données restent
  toujours à jour), et affiche `public/offline.html` si la navigation échoue
  hors connexion
- `src/app/RegisterServiceWorker.tsx` — enregistre le service worker au
  chargement, inclus dans le layout racine

**Pour tester l'installation en local**, servez le build en HTTPS (le
service worker ne s'enregistre pas sur `http://` sauf sur `localhost`, qui
est une exception autorisée par les navigateurs) :
```bash
npm run build && npm start
```
Ouvrez `http://localhost:3000` dans Chrome : l'icône d'installation apparaît
dans la barre d'adresse. Sur Vercel (HTTPS automatique), ça fonctionne
directement.

**Ce n'est pas une app "offline-first"** : les pages ont toujours besoin du
réseau pour afficher des données à jour (voyages, abonnement, etc.). Le
service worker actuel sert uniquement à rendre l'app installable et à éviter
un écran blanc si la connexion tombe en pleine navigation. Un vrai mode
hors-ligne (consulter les derniers voyages sans réseau) serait une étape
ultérieure, avec une stratégie de cache plus fine sur certaines routes API.



Ce projet n'utilise **pas** Row Level Security PostgreSQL, contrairement à
ce qui avait été livré pour une architecture "Supabase client direct". Ici,
le navigateur ne parle jamais directement à Supabase : il passe uniquement
par vos routes API Next.js, qui vérifient la session avant chaque requête
Prisma et filtrent systématiquement par `organizationId`. C'est une
architecture tout aussi sûre — plus simple à raisonner — tant que **toutes**
les routes API utilisent bien `requireOrgSession()` ou
`requireAdminSession()` (voir `src/lib/guards.ts`). Si vous ajoutez une
nouvelle route, n'oubliez jamais cet appel en première ligne.

## Limite de cet environnement de génération

Ce code n'a pas pu être vérifié avec `next build` complet ni `prisma
generate` dans le bac à sable qui l'a produit : le téléchargement du moteur
Prisma est bloqué par ses restrictions réseau (domaine `binaries.prisma.sh`
non autorisé). Chaque fichier a été relu et validé syntaxiquement un par un
avec esbuild, et `npm install` a confirmé que toutes les dépendances
existent et se résolvent sans conflit. Lancez `npm install && npx tsc
--noEmit` une fois le dépôt cloné chez vous (avec accès réseau normal) pour
une vérification de types complète avant le premier déploiement.
