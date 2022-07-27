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
COPY --chown=node:node artifacts/runtime/index.cjs index.cjs
USER node
ARG SEMVER
ENV SEMVER=${SEMVER}
HEALTHCHECK --interval=30s --timeout=1s --start-period=5s --retries=1 \
    CMD if [ $(wget --no-check-certificate --server-response https://localhost:55557/health 2>&1 | awk '/^  HTTP/{print $2}') -ne 200 ]; then exit 1; fi
EXPOSE "58082/tcp"
ENV MEDIA_DIR=${MEDIA_DIR:-/media}
ENV CERTS_DIR=${CERTS_DIR:-/certs}
# VOLUME [ "/media", "/certs" ]
ENTRYPOINT [ "node" ]
CMD [ "index.cjs" ]
