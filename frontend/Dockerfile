# Build context: repository root (see docker-compose.yml).
# Image tag and install steps are unverified until a build is run (docs/development/roadmap.md).
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json tsconfig.base.json ./
COPY packages ./packages
COPY frontend ./frontend
COPY backend/package.json ./backend/package.json
# package-lock.json is gitignored, so installs are not reproducible yet (ADR 0006).
RUN npm install --workspace @acc/frontend --include-workspace-root \
 && npm run build:packages && npm run build:frontend

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000
COPY --from=build --chown=node:node /app ./
USER node
EXPOSE 3000
CMD ["npm", "run", "start", "-w", "@acc/frontend"]
