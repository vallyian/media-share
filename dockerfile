FROM node:gallium AS build
RUN npm i -g npm@8
WORKDIR /home/node/server
COPY server/package*.json ./
RUN npm ci
COPY server/src ./src
COPY server/tsconfig*.json ./
RUN npm run build
COPY server/test.ts .
RUN npm test
# TODO: fix lint in docker
COPY server/.eslintignore server/.eslintrc.json ./
RUN npm run lint



FROM scratch AS export
COPY --from=build /home/node/server/bin /runtime
COPY --from=build /home/node/artifacts/unit-tests /unit-tests
COPY --from=build /home/node/artifacts/*.fail /



FROM node:gallium-alpine3.16 AS prod-deps
WORKDIR /home/node/app
COPY server/package*.json ./
ARG NPM_AUDIT_LEVEL
RUN npm audit --omit=dev --audit-level="${NPM_AUDIT_LEVEL}" && \
    NODE_ENV=production npm ci --omit=dev



FROM node:gallium-alpine3.16
RUN apk add zlib=1.2.12-r3 && echo "temp fix for CVE-2022-37434 ###########################################################" && \
    mkdir -p /home/node/app/media && \
    touch /home/node/app/media/_no_media_volume_mounted_ && \
    chown -R node:node /home/node/app
WORKDIR /home/node/app
ARG SEMVER
ENV SEMVER=${SEMVER}
USER node
COPY --chown=node:node --from=prod-deps /home/node/app/node_modules node_modules
COPY --chown=node:node artifacts/runtime/ ./
VOLUME [ "/home/node/app/media", "/run/secrets/cert.crt", "/run/secrets/cert.key", "/run/secrets/.env"]
HEALTHCHECK --interval=30s --timeout=1s --start-period=5s --retries=1 \
    CMD if [ -f "/run/secrets/cert.crt" ] && [ -f "/run/secrets/cert.key" ]; then \
            if [ ! "$(wget -O /dev/null --no-check-certificate --server-response https://localhost:58082/health 2>&1 | awk '/^  HTTP/{print $2}')" = "200" ]; then exit 1; fi \
        else \
            if [ ! "$(wget -O /dev/null --server-response http://localhost:58082/health 2>&1 | awk '/^  HTTP/{print $2}')" = "200" ]; then exit 1; fi \
        fi
EXPOSE "58082/tcp"
ENTRYPOINT [ "node" ]
CMD [ "." ]
