FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
USER node
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=10s --retries=3 CMD wget --spider http://localhost:5000/ || exit 1
CMD ["node", "dist/index.js"]