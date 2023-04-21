FROM node:hydrogen AS build
RUN npm i -g npm@latest
WORKDIR /home/node/server
COPY server/package*.json .
ARG NPM_AUDIT_LEVEL
RUN npm audit --omit=dev --audit-level="${NPM_AUDIT_LEVEL}" && \
    npm ci --omit=dev && \
    mkdir -p ../artifacts && \
    mv node_modules ../artifacts/node_modules && \
    npm ci
COPY server/src src
COPY server/tsconfig*.json .
RUN npm run build
COPY server/test.ts .
RUN npm test
COPY server/.eslintignore server/.eslintrc.json ./
RUN npm run lint



FROM scratch AS export
COPY --from=build /home/node/server/bin /bin
COPY --from=build /home/node/artifacts/unit-tests /unit-tests
COPY --from=build /home/node/artifacts/*.fail /



FROM node:hydrogen-alpine3.16
WORKDIR /home/node
RUN apk add tini && \
    mkdir -p /home/node/media && \
    chown -R node:node /home/node/media
ENV NODE_ENV=production
COPY --chown=node:node --from=build /home/node/artifacts/node_modules node_modules
COPY --chown=node:node --from=build /home/node/server/bin             ./
COPY --chown=node:node              README.md                         media
ARG SEMVER
ENV SEMVER=${SEMVER}
USER node
# VOLUME [ "/home/node/app/media", "/run/secrets/cert.crt", "/run/secrets/cert.key"]
HEALTHCHECK --interval=30s --timeout=1s --start-period=5s --retries=1 \
    CMD if [ -f "/run/secrets/cert.crt" ] && [ -f "/run/secrets/cert.key" ]; then \
            if [ ! "$(wget -O /dev/null --no-check-certificate --server-response https://localhost:58082/health 2>&1 | awk '/^  HTTP/{print $2}')" = "200" ]; then exit 1; fi \
        else \
            if [ ! "$(wget -O /dev/null --server-response http://localhost:58082/health 2>&1 | awk '/^  HTTP/{print $2}')" = "200" ]; then exit 1; fi \
        fi
EXPOSE "58082/tcp" "58092/tcp"
ENTRYPOINT [ "/sbin/tini", "--" ]
CMD [ "node", "." ]
