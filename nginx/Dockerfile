# ---- Client Build Stage ----
FROM node:20-alpine AS client-builder
WORKDIR /app

ARG NPM_REGISTRY=https://registry.npmmirror.com

COPY client/package.json client/package-lock.json ./
RUN npm ci --registry=$NPM_REGISTRY

COPY client ./
RUN npm run build

# ---- Nginx Stage ----
FROM nginx:alpine

COPY --from=client-builder /app/dist /usr/share/nginx/html
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
