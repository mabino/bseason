# ─── Base Stage ───
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./

# ─── Development Stage (Dev & Hot-reloading) ───
FROM base AS development
RUN npm ci
COPY . .
ENV NODE_ENV=development
ENV PORT=3030
EXPOSE 3030
CMD ["npm", "run", "dev"]

# ─── Testing Stage (Runs tests & exits) ───
FROM base AS tester
RUN npm ci
COPY . .
ENV NODE_ENV=test
CMD ["npm", "test"]

# ─── Production Build Stage ───
FROM base AS production-builder
RUN npm ci --omit=dev --ignore-scripts

# ─── Production Runtime Stage ───
FROM node:20-alpine AS production
WORKDIR /app
COPY --from=production-builder /app/node_modules ./node_modules
COPY package*.json ./
COPY server.js ./
COPY src/ ./src/
COPY public/ ./public/

EXPOSE 8080
ENV PORT=8080
ENV NODE_ENV=production

CMD ["node", "server.js"]
