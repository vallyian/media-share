FROM node:gallium as base
RUN curl https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb -o /chrome.deb \
    && apt-get update \
    && dpkg -i /chrome.deb \
    || apt-get install --no-install-recommends -yf \
    && rm /chrome.deb \
    && rm -rf /var/lib/apt/lists/* \
    && npm install -g npm@8



FROM base as build-client
WORKDIR /app
COPY client/package*.json ./
ARG NPM_AUDIT_LEVEL
RUN [ "${NPM_AUDIT_LEVEL}" != "" ] || NPM_AUDIT_LEVEL="low"; \
    echo "NPM_AUDIT_LEVEL: \"${NPM_AUDIT_LEVEL}\""; \
    npm audit --omit=dev --audit-level="${NPM_AUDIT_LEVEL}" && \
    npm ci
COPY shared /shared
COPY client/src ./src
COPY client/.browserslistrc client/.eslintrc.json client/angular.json client/tsconfig.app.json client/tsconfig.json ./
RUN npm run lint
ARG SEMVER
RUN [ "${SEMVER}" != "" ] || SEMVER="0.0.0"; \
    echo "SEMVER: \"${SEMVER}\""; \
    npm run build
COPY client/karma.conf.js client/tsconfig.spec.json ./
RUN npm test



FROM base AS build-server
WORKDIR /app
COPY server/package*.json ./
ARG NPM_AUDIT_LEVEL
RUN [ "${NPM_AUDIT_LEVEL}" != "" ] || NPM_AUDIT_LEVEL="low"; \
    echo "NPM_AUDIT_LEVEL: \"${NPM_AUDIT_LEVEL}\""; \
    npm audit --omit=dev --audit-level="${NPM_AUDIT_LEVEL}" && \
    npm ci
COPY shared /shared
COPY server/src ./src
COPY server/.eslintrc.json server/tsconfig.json ./
RUN npm run lint
ARG SEMVER
RUN [ "${SEMVER}" != "" ] || SEMVER="0.0.0"; \
    echo "SEMVER: \"${SEMVER}\""; \
    npm run build
COPY server/test.ts .
RUN npm test



FROM docker:20.10.14-alpine3.15
RUN apk add nodejs-lts npm
WORKDIR /app
COPY --from=build-server /app/bin/index.cjs index.js
COPY --from=build-client /app/dist client
ARG SEMVER
ENV SEMVER=${SEMVER}
HEALTHCHECK --interval=60s --timeout=1s --start-period=5s --retries=3 \
    CMD [ $(wget --server-response http://localhost:80/health 2>&1 | awk '/^  HTTP/{print $2}') = 200 ] || exit 1
EXPOSE "80/tcp"
VOLUME [ "/var/run/docker.sock", "/var/lib/docker/volumes" ]
ENTRYPOINT [ "node" ]
CMD [ "." ]
