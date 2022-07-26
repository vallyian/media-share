FROM node:gallium AS build-server
WORKDIR /app
COPY server/package*.json ./
ARG NPM_AUDIT_LEVEL
RUN [ "${NPM_AUDIT_LEVEL}" != "" ] || NPM_AUDIT_LEVEL="low"; \
    echo "NPM_AUDIT_LEVEL: \"${NPM_AUDIT_LEVEL}\""; \
    npm audit --omit=dev --audit-level="${NPM_AUDIT_LEVEL}" && \
    npm ci
COPY server/@types ./@types
COPY server/src ./src
COPY server/.eslintrc.json server/globals.ts server/tsconfig.json ./
RUN npm run lint
ARG SEMVER
RUN [ "${SEMVER}" != "" ] || SEMVER="0.0.0"; \
    echo "SEMVER: \"${SEMVER}\""; \
    npm run build
# COPY server/test.ts .
# RUN npm test



FROM node:gallium-alpine3.15
WORKDIR /app
COPY --from=build-server /app/bin/index.cjs index.cjs
ARG SEMVER
ENV SEMVER=${SEMVER}
HEALTHCHECK --interval=60s --timeout=1s --start-period=5s --retries=3 \
    CMD [ $(wget --server-response http://localhost:80/health 2>&1 | awk '/^  HTTP/{print $2}') = 200 ] || exit 1
EXPOSE "80/tcp"
ENV MEDIA_DIR=${MEDIA_DIR:-/media}
# VOLUME [ "/media" ]
ENTRYPOINT [ "node" ]
CMD [ "index.cjs" ]
