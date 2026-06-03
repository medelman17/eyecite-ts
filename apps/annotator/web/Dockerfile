FROM node:22-slim AS build
RUN corepack enable
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter annotator-web build
FROM nginx:alpine
COPY apps/annotator/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/annotator/web/dist /usr/share/nginx/html
