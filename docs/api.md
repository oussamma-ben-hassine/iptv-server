# Documentation de l'API REST IPTV Server

## Points d'accès publics et lecteurs
- `GET /api/v1/channels` : Liste des chaînes actives pour lecteurs tiers.
- `GET /api/v1/channels/:id` : Détails d'une chaîne et métadonnées.
- `GET /api/v1/categories` : Liste des catégories de chaînes.
- `GET /api/v1/epg` : Guide TV électronique au format standard XMLTV.
- `GET /api/v1/playlists/:accessId.m3u` : Génération de la playlist M3U dynamique sécurisée par jeton.
- `GET /api/v1/playlists/:accessId/channels` : Export JSON pour applications clientes (TV Player).
- `GET /api/v1/stream/:channelId/live.m3u8?token=...` : Passerelle HLS authentifiée.
- `GET /api/v1/stream/segment/:encodedUrl?token=...` : Passerelle segment protégée individuellement.
- `GET /api/v1/health` : Monitoring de santé du système et base de données.

## Points d'accès d'administration (Rôle ADMIN requis)
- `GET /api/v1/admin/dashboard` : Métriques globales et état des services.
- `GET /api/v1/admin/channels` : Catalogue complet des chaînes.
- `POST /api/v1/admin/channels` : Création de chaîne.
- `PUT /api/v1/admin/channels/:id` : Mise à jour de chaîne.
- `DELETE /api/v1/admin/channels/:id` : Suppression de chaîne.
- `GET /api/v1/sources` : Liste des sources vidéo.
- `POST /api/v1/sources` : Ajout manuel de flux HLS/RTSP.
- `POST /api/v1/sources/:id/check` : Test instantané de disponibilité de flux.
- `POST /api/v1/sources/m3u/preview` : Analyse et prévisualisation d'un fichier M3U.
- `POST /api/v1/sources/m3u/import` : Import en masse sélectif de chaînes M3U.
- `GET /api/v1/admin/shares` : Liste des jetons et partages M3U.
- `POST /api/v1/admin/shares` : Création d'un accès de diffusion sécurisé.
- `POST /api/v1/admin/shares/:id/revoke` : Révocation instantanée d'un accès.
