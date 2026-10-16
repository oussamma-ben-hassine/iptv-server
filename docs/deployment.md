# Guide de Déploiement — Coolify

## Déploiement en Production
IPTV Server est déployé sous Docker Compose managé par Coolify sur un VPS OVH.

1. **Projet Coolify** : `iptv.oussamma.tn`
2. **Build Pack** : `dockercompose`
3. **Emplacement** : `/docker-compose.yml`
4. **Domaine attaché** : `https://iptv.oussamma.tn` sur le service `frontend`
5. **Certificat SSL** : Let's Encrypt automatique via Traefik.
6. **Réseau** : Relié au réseau externe partagé `coolify` pour permettre le routage de Traefik.

## Variables d'Environnement Clés
- `APP_URL=https://iptv.oussamma.tn`
- `SSO_BASE_URL=https://sso-a.oussamma.tn`
- `SSO_CLIENT_ID=client_iptv_server`
- `SSO_CLIENT_SECRET=sec_iptv_platform_secret_2026`
- `SSO_REDIRECT_URI=https://iptv.oussamma.tn/api/v1/auth/callback`
- `INITIAL_ADMIN_EMAIL=oussammabenhassine@gmail.com`
