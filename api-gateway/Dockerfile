# Stage 1 - builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json .
RUN npm install

# Stage 2 - runtime
FROM node:20-alpine AS runtime
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
EXPOSE 8000
CMD ["node", "index.js"]