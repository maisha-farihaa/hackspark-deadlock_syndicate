# Stage 1 - Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Stage 2 - Runtime
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app .
EXPOSE 8001
CMD ["node", "index.js"]