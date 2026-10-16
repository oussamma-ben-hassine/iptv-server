# Architecture Streaming & Remuxing — MediaMTX & FFmpeg

## Rôle de MediaMTX
MediaMTX est un serveur multimédia performant en Go qui assure :
- La réception de flux RTSP, RTMP et HLS.
- Le remuxing sans transcodage (zero-copy) pour minimiser la consommation CPU.
- La distribution de segments fMP4/HLS à faible latence.

## Rôle de la Passerelle Sécurisée NestJS
- Les lecteurs externes ne se connectent jamais directement aux sources d'origine.
- La passerelle NestJS réécrit dynamiquement les playlists M3U8 pour associer chaque segment à un jeton d'accès temporaire et révocable.
- Si un partage est révoqué ou expiré, tout segment vidéo ultérieur est immédiatement rejeté (HTTP 403 Forbidden).
