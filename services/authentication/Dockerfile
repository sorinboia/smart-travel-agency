# Multi-stage Dockerfile for STA Authentication Service

FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
RUN npm ci

FROM node:20-alpine AS runtime
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
EXPOSE 4003
CMD ["node", "src/server.js"]