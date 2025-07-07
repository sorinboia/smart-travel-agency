# Smart Travel Agency - Weather Service Dockerfile

FROM node:20-slim

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

ENV NODE_ENV=production
ENV PORT=4000
ENV MINIO_BUCKET=weather

EXPOSE 4000

CMD ["node", "src/server.js"]