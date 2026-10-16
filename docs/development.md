# Guide de Développement & Reprise par un Agent IA

## Organisation du Code
- `backend/` : Application NestJS avec Prisma ORM connectée à PostgreSQL.
  - `src/auth/` : Gestion du cycle OIDC, PKCE, Guards et permissions ADMIN/USER.
  - `src/channels/` : Catalogue des chaînes et catégories.
  - `src/sources/` : Gestion des flux multimédias et vérifications de santé.
  - `src/shares/` : Gestion des jetons de partage et génération des playlists M3U.
  - `src/streaming/` : Passerelle de diffusion HLS et réécriture de segments sécurisés.
  - `src/epg/` : Génération du guide XMLTV.
- `frontend/` : Application React 18, TypeScript, Vite, Tailwind CSS et Lucide Icons.
- `mediamtx/` : Configuration et conteneurisation du serveur de streaming MediaMTX.

## Commandes Clés
- Générer Prisma : `npx prisma generate`
- Synchroniser schéma DB : `npx prisma db push`
- Compiler NestJS : `npm run build`
- Lancer en local : `npm run start:dev`
