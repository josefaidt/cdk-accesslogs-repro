#syntax=docker/dockerfile:1.4
FROM --platform=linux/amd64 node:18-alpine
WORKDIR /usr/src
COPY server .
RUN npm install --global pnpm
RUN pnpm install --frozen-lockfile
ENTRYPOINT ["node", "app.js"]