# Build stage
FROM dhi.io/node:24-sfw-dev AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./
COPY vite.config.ts ./
COPY postcss.config.js ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src/ ./src/

# Build the application
RUN npm run build

# Production dependencies stage
FROM dhi.io/node:24-sfw-dev AS deps

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev && npm cache clean --force

# Pre-create the data directory owned by the runtime user, since the
# runtime image has no shell to mkdir/chown in.
RUN mkdir -p /app/data && chown -R node:node /app/data

# Production stage
FROM dhi.io/node:24
LABEL org.opencontainers.image.source=https://github.com/ulvio-dev/mock-oidc-provider

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps --chown=node:node /app/data ./data

# Copy built files from builder
COPY --from=builder /app/dist ./dist
COPY package.json ./package.json

# Copy default logo
COPY --chown=node:node data/logo-ulvio-revert.png ./data/logo-ulvio-revert.png

USER node

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production

# Probe the port and base path the server actually listens on - both are
# configurable via env, so a hardcoded http://localhost:3000/api/status reports
# unhealthy on every deployment that overrides PORT or BASE_PATHNAME.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["node", "-e", "const p=process.env.PORT||3000;let b=process.env.BASE_PATHNAME||'';if(b.endsWith('/'))b=b.slice(0,-1);fetch('http://127.0.0.1:'+p+b+'/api/status').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]

# Node handles SIGTERM itself (see the shutdown handler in src/server/server.ts),
# so the container stops cleanly instead of being SIGKILLed at the stop timeout.
STOPSIGNAL SIGTERM

# Start the server. Exec form (no shell) so node runs as PID 1 and receives
# signals directly - the hardened base image has no shell to forward them.
CMD ["node", "dist/server.js"]
