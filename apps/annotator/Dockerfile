FROM node:22-slim
RUN corepack enable
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile
# Build the eyecite-ts library (workspace root) so `import ... from "eyecite-ts"` resolves to dist/
RUN pnpm build
WORKDIR /repo/apps/annotator
# migrate (idempotent) then start the API
CMD ["sh", "-c", "pnpm migrate && pnpm start"]
