# ============================================================
# SafeTrust ZK Demo — Dockerfile
# Multi-stage build: installs workspace deps, builds demo only
# ============================================================

FROM node:18-alpine AS base
RUN npm install -g pnpm@9

# ── Stage 1: Install workspace dependencies ───────────────
FROM base AS deps
WORKDIR /app

# Copy workspace manifests
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY sdk/package.json ./sdk/
COPY demo/package.json ./demo/

# Install all workspace deps (needed to build SDK first)
RUN pnpm install --frozen-lockfile

# ── Stage 2: Build SDK ────────────────────────────────────
FROM deps AS sdk-build
WORKDIR /app
COPY sdk/ ./sdk/
# Copy compiled circuits if present (needed for real proofs)
COPY circuits/ ./circuits/
RUN pnpm --filter @safetrust/zk-sdk build

# ── Stage 3: Build demo ───────────────────────────────────
FROM sdk-build AS demo-build
WORKDIR /app
COPY demo/ ./demo/
RUN pnpm --filter safetrust-zk-demo build

# ── Stage 4: Production image ─────────────────────────────
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy built demo
COPY --from=demo-build /app/demo/.next/standalone ./
COPY --from=demo-build /app/demo/.next/static ./.next/static
COPY --from=demo-build /app/demo/public ./public

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]