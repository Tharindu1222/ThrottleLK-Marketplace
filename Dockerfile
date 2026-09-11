# Monorepo root context
FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/types/package.json ./packages/types/
COPY packages/validation/package.json ./packages/validation/
RUN npm ci

FROM deps AS build-api
COPY packages ./packages
COPY apps/api ./apps/api
RUN npm run build -w @throttlelk/types \
  && npm run build -w @throttlelk/validation \
  && npm run build -w @throttlelk/api

FROM base AS api
ENV NODE_ENV=production
ENV API_PORT=3001
COPY --from=build-api /app/package.json /app/package-lock.json ./
COPY --from=build-api /app/node_modules ./node_modules
COPY --from=build-api /app/packages ./packages
COPY --from=build-api /app/apps/api ./apps/api
WORKDIR /app/apps/api
EXPOSE 3001
CMD ["node", "dist/main.js"]

FROM deps AS build-web
ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
COPY packages ./packages
COPY apps/web ./apps/web
RUN npm run build -w @throttlelk/types \
  && npm run build -w @throttlelk/validation \
  && npm run build -w @throttlelk/web

FROM base AS web
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=build-web /app/package.json /app/package-lock.json ./
COPY --from=build-web /app/node_modules ./node_modules
COPY --from=build-web /app/packages ./packages
COPY --from=build-web /app/apps/web ./apps/web
WORKDIR /app/apps/web
EXPOSE 3000
CMD ["npm", "run", "start", "-w", "@throttlelk/web"]
