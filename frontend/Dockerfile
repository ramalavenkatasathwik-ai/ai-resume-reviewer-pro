# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies first for efficient layer caching
COPY package.json ./
RUN npm install

# Copy application source and build production bundle
COPY . .
RUN npm run build

# Production serve stage using Nginx
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
