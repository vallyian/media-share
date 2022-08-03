FROM node:gallium AS build
RUN npm i -g npm@8
WORKDIR /app
COPY server/package*.json ./
ARG NPM_AUDIT_LEVEL
RUN [ "${NPM_AUDIT_LEVEL}" != "" ] || NPM_AUDIT_LEVEL="low"; \
    echo "NPM_AUDIT_LEVEL: \"${NPM_AUDIT_LEVEL}\""; \
    npm audit --omit=dev --audit-level="${NPM_AUDIT_LEVEL}" && \
    npm ci
COPY server/src ./src
COPY server/tsconfig*.json ./
ARG SEMVER
RUN [ "${SEMVER}" != "" ] || SEMVER="0.0.0"; \
    echo "SEMVER: \"${SEMVER}\""; \
    npm run build
COPY server/test.ts .
RUN npm test
# COPY server/.eslintignore server/.eslintrc.json ./
# RUN npm run lint



FROM scratch AS export
COPY --from=build /app/bin /runtime
COPY --from=build /app/test-results /test-results



FROM node:gallium-alpine3.16 AS prod-deps
WORKDIR /home/node/app
COPY server/package*.json ./
RUN NODE_ENV=production npm ci --omit=dev



FROM node:gallium-alpine3.16
RUN mkdir -p /home/node/app/media && \
    touch /home/node/app/media/_no_media_volume_mounted_ && \
    chown -R node:node /home/node/app
WORKDIR /home/node/app
ARG SEMVER
ENV SEMVER=${SEMVER}
USER node
COPY --chown=node:node --from=prod-deps /home/node/app/node_modules node_modules
COPY --chown=node:node artifacts/runtime/ ./
VOLUME [ "/media" `#, "/run/secrets/cert.crt", "/run/secrets/cert.key"` ]
HEALTHCHECK --interval=30s --timeout=1s --start-period=5s --retries=1 \
    CMD if [ -f "/run/secrets/cert.crt" ] && [ -f "/run/secrets/cert.key" ]; then \
            if [ ! "$(wget --no-check-certificate --server-response https://localhost:58082/health 2>&1 | awk '/^  HTTP/{print $2}')" = "200" ]; then exit 1; fi \
        else \
            if [ ! "$(wget --server-response http://localhost:58082/health 2>&1 | awk '/^  HTTP/{print $2}')" = "200" ]; then exit 1; fi \
        fi
EXPOSE "58082/tcp"
ENTRYPOINT [ "node" ]
CMD [ "." ]
