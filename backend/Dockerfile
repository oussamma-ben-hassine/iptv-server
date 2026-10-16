FROM node:20-alpine AS builder

WORKDIR /app

# Outils système pour Prisma et compilation
RUN apk add --no-cache openssl python3 make g++

COPY package.json ./
RUN npm install

COPY tsconfig.json nest-cli.json ./
COPY prisma ./prisma/
RUN npx prisma generate

COPY src ./src/
RUN npm run build

# Étape finale de production
FROM node:20-alpine AS runner

WORKDIR /app
RUN apk add --no-cache openssl ffmpeg

COPY package.json ./
RUN npm install --only=production

COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000

CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/main.js"]
