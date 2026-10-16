# Guide d'Installation — IPTV Server

## Prérequis
- Docker et Docker Compose
- Node.js 20+ (pour le développement local)
- PostgreSQL 16+

## Installation Locale
1. Cloner le dépôt :
   ```bash
   git clone https://github.com/oussamma-ben-hassine/iptv-server.git
   cd iptv-server
   ```
2. Configurer les variables d'environnement en copiant `.env.example` :
   ```bash
   cp .env.example .env
   ```
3. Lancer la pile complète :
   ```bash
   docker compose up -d
   ```
4. Accéder à l'application sur `http://localhost` (ou port spécifié).
