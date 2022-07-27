FROM node:gallium AS build
RUN npm i -g npm@8
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
COPY server/test.ts .
RUN npm test

FROM scratch AS export
COPY --from=build /app/bin /runtime

FROM node:gallium-alpine3.16
RUN mkdir -p /home/node/app && chown node:node /home/node/app
WORKDIR /home/node/app
COPY --chown=node:node artifacts/runtime/index.cjs ./index.cjs
USER node
ARG SEMVER
ENV SEMVER=${SEMVER}
HEALTHCHECK --interval=60s --timeout=1s --start-period=5s --retries=3 \
    CMD [ $(wget --server-response http://localhost:80/health 2>&1 | awk '/^  HTTP/{print $2}') = 200 ] || exit 1
EXPOSE "80/tcp"
ENV MEDIA_DIR=${MEDIA_DIR:-/media}
# VOLUME [ "/media" ]
ENTRYPOINT [ "node" ]
CMD [ "index.cjs" ]
