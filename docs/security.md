# Sécurité & Protection des Flux

## 1. Protection Anti-SSRF
Toutes les URLs de flux soumises par l'utilisateur ou importées depuis un fichier M3U sont rigoureusement validées par le `SecurityService`.
Les plages d'adresses privées (RFC 1918 : `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), adresses de bouclage (`127.0.0.1`, `localhost`), link-local (`169.254.0.0/16`) et noms internes Docker (`host.docker.internal`) sont bloqués immédiatement.

## 2. Authentification SSO OIDC Obligatoire
- Utilisation de PKCE (S256) pour éviter l'interception de codes d'autorisation.
- Validation cryptographique d'état OIDC (HMAC-SHA256).
- Cookies de session signés `HttpOnly`, `SameSite=Lax`, `Secure` en HTTPS.

## 3. Révocation Instantanée des Segments
Les jetons de distribution (tokens) sont vérifiés à la volée tant sur la playlist racine que sur chaque segment unitaire (`/api/v1/stream/segment/:encoded?token=...`), empêchant tout lecteur de continuer le visionnage après révocation.
