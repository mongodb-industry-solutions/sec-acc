# Build context: repository root (see docker-compose.yml), so workspace manifests and packages/ are available.
# Image tag and install steps are unverified until a build is run (docs/development/roadmap.md).
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json tsconfig.base.json ./
COPY packages ./packages
COPY backend ./backend
COPY frontend/package.json ./frontend/package.json
# package-lock.json is gitignored, so installs are not reproducible yet (ADR 0006).
RUN npm install --workspace @acc/backend --include-workspace-root \
 && npm run build:packages && npm run build:backend

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build --chown=node:node /app ./
USER node
EXPOSE 3001
CMD ["npm", "run", "start", "-w", "@acc/backend"]
