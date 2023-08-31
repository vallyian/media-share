#syntax=docker/dockerfile:1.5

FROM node:18-slim AS build
USER node
WORKDIR /home/node
COPY --chown=node:node server/package*.json server/tsconfig*.json server/
COPY --chown=node:node server/src server/src
COPY --chown=node:node package.json run.js ./
RUN npm run build
COPY --chown=node:node server/test server/test
RUN npm run test
COPY --chown=node:node server/.eslintignore server/.eslintrc.json server/
RUN npm run lint



FROM scratch AS export
COPY --from=build /home/node/artifacts/bin /bin
COPY --from=build /home/node/artifacts/unit /unit
COPY --from=build /home/node/artifacts/lint /lint



FROM node:18-alpine3.18
RUN apk add tini && \
    mkdir -p /home/node/media && \
    chown -R node:node /home/node/media
USER node
WORKDIR /home/node
ENV NODE_ENV=production
COPY --chown=node:node              README.md                         media
COPY --chown=node:node --from=build /home/node/artifacts/bin          ./
RUN npm i --omit=dev --no-audit
ARG SEMVER
ENV SEMVER=${SEMVER}
# VOLUME [ "/home/node/media", "/run/secrets/cert.crt", "/run/secrets/cert.key"]
HEALTHCHECK --interval=30s --timeout=1s --start-period=5s --retries=1 \
    CMD if [ -f "/run/secrets/cert.crt" ] && [ -f "/run/secrets/cert.key" ]; then \
    if [ ! "$(wget -O /dev/null --no-check-certificate --server-response https://localhost:58082/health 2>&1 | awk '/^  HTTP/{print $2}')" = "200" ]; then exit 1; fi \
    else \
    if [ ! "$(wget -O /dev/null --server-response http://localhost:58082/health 2>&1 | awk '/^  HTTP/{print $2}')" = "200" ]; then exit 1; fi \
    fi
EXPOSE "58082/tcp" "58092/tcp"
ENTRYPOINT [ "/sbin/tini", "--" ]
CMD [ "node", "." ]
