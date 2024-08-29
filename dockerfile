#syntax=docker/dockerfile:1.5

FROM node:20-slim AS build
USER node
WORKDIR /home/node
COPY --chown=node:node server/package*.json server/tsconfig*.json server/
COPY --chown=node:node server/src server/src
COPY --chown=node:node package.json run.js check-url.js ./
RUN npm run build
COPY --chown=node:node server/test server/test
RUN npm run test
COPY --chown=node:node server/.eslintignore server/.eslintrc.json server/
RUN npm run lint



FROM scratch AS export
COPY --from=build /home/node/artifacts/bin /bin
COPY --from=build /home/node/artifacts/unit /unit
COPY --from=build /home/node/artifacts/lint /lint



FROM node:20-alpine3.20
RUN apk add tini && \
    mkdir -p /home/node/media && \
    chown -R node:node /home/node/media
USER node
WORKDIR /home/node
ENV NODE_ENV=production
COPY --chown=node:node check-url.js .
COPY --chown=node:node README.md media
COPY --chown=node:node --from=build /home/node/artifacts/bin ./
RUN npm i --omit=dev --no-audit
ARG SEMVER
ENV SEMVER=${SEMVER}
# VOLUME [ "/home/node/media", "/run/secrets/cert.crt", "/run/secrets/cert.key"]
HEALTHCHECK --interval=30s --timeout=1s --start-period=5s --retries=1 \
    CMD node check-url localhost:58082${MEDIA_SHARE__ProxyLocation:-/}health 200 healthy
EXPOSE "58082/tcp" "58092/tcp"
ENTRYPOINT [ "/sbin/tini", "--" ]
CMD [ "node", "." ]
