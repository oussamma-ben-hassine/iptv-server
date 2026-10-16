# Intégration SSO OpenID Connect (OIDC)

## Fournisseur SSO
- **URL de base** : `https://sso-a.oussamma.tn`
- **Well-known** : `https://sso-a.oussamma.tn/.well-known/openid-configuration`
- **Client ID** : `client_iptv_server`
- **Client Type** : `confidential`
- **Redirect URIs** :
  - `https://iptv.oussamma.tn/auth/callback`
  - `https://iptv.oussamma.tn/api/v1/auth/callback`

## Mécanisme de Sécurité
1. **Flow** : Authorization Code Flow avec PKCE (S256).
2. **State & Verifier** : Dérivés cryptographiquement par HMAC-SHA256 afin de garantir l'absence d'altération et de résister aux attaques CSRF.
3. **Provisioning Utilisateur** : À la première connexion réussie, l'utilisateur est enregistré en base Postgres locale avec son `ssoSub`.
4. **Attribution Admin** : L'adresse `oussammabenhassine@gmail.com` ou tout compte possédant le rôle SSO `ADMIN` reçoit automatiquement les droits d'administration sur IPTV Server.
