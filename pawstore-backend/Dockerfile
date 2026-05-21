FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
FROM node:20-alpine
USER node
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY dist/ ./dist/
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=10s --retries=3 CMD wget --spider http://localhost:5000/ || exit 1
CMD ["node", "dist/index.js"]