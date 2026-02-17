# --- STAGE 1: Build do Frontend ---
FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# --- STAGE 2: Build do Backend ---
FROM node:18-alpine AS server-builder
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci
COPY server/ ./
RUN npm run build

# --- STAGE 3: Runtime ---
FROM node:18-alpine
WORKDIR /app

ENV NODE_ENV=production
ENV CLIENT_DIST_PATH=/app/public

COPY server/package*.json ./
RUN npm ci --only=production

COPY --from=server-builder /app/server/dist ./dist
COPY --from=client-builder /app/client/dist ./public

EXPOSE 3000

CMD ["npm", "start"]
