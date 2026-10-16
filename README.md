# IPTV Server — Plateforme de Streaming & Playlists M3U Sécurisées

Application indépendante, conteneurisée et sécurisée permettant de centraliser des sources multimédias autorisées, de classifier les chaînes avec métadonnées EPG (XMLTV), et de distribuer des flux protégés par jetons révocables.

## Fonctionnalités Clés
- **Authentification SSO OIDC** : Authorization Code Flow avec PKCE connecté à `sso-a.oussamma.tn`.
- **Catalogue & Sources** : Prise en charge HLS/M3U8, RTSP, RTMP et import interactif avec prévisualisation M3U.
- **Passerelle Streaming Sécurisée** : Protection des playlists et des segments vidéo par jeton révocable.
- **EPG XMLTV** : Guide des programmes dynamique compatible lecteurs IPTV (TiviMate, IPTV Smarters, Kodi).
- **Interface Moderne** : React, Tailwind CSS, responsive sur smartphones et tablettes.

## Déploiement Coolify
Le déploiement est piloté par Docker Compose via l'instance Coolify du serveur OVH sur `iptv.oussamma.tn`.
