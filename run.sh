#!/bin/sh -e

DOCKER_USERNAME=${DOCKER_USERNAME:-vallyian}
DOCKER_REPO=${DOCKER_REPO:-media-share}
PLATFORMS=linux/amd64,linux/arm64/v8 # linux/arm/v7,linux/ppc64le,linux/s390x

github_env() {
    echo "::set-output name=GITHUB_MAIN::${GITHUB_MAIN}"
}

calc_semver() {
    if [ "${GITHUB_MAIN}" = "true" ]; then
        echo "SEMVER: ${SEMVER}"
        echo "::set-output name=SEMVER::${SEMVER}"
    else
        echo "SEMVER: ${SEMVER}-${GITHUB_SHA}"
        echo "::set-output name=SEMVER::${SEMVER}-${GITHUB_SHA}"
    fi
}

build() {
    rm -rf artifacts \
    || exit 1

    docker buildx build \
        --pull \
        --target export \
        --output=type=local,dest=artifacts \
        . \
    || exit 1

    docker buildx build \
        -t ${DOCKER_USERNAME}/${DOCKER_REPO}:local \
        --build-arg SEMVER \
        --pull \
        --output=type=docker \
        . \
    || exit 2

    docker image inspect ${DOCKER_USERNAME}/${DOCKER_REPO}:local > /dev/null \
    || exit 3
}

test_end_to_end() {
    local container=${DOCKER_USERNAME}-${DOCKER_REPO}-local

    if [ ! -f server/certs/cert.crt ] || [ ! -f server/certs/cert.key ]; then
        mkdir -p server/certs
        openssl req -new -newkey rsa:4096 -days 1 -nodes -x509 \
            -subj "/C=US/ST=Denial/L=Springfield/O=Dis/CN=www.example.com" \
            -out server/certs/cert.crt -keyout server/certs/cert.key
    fi

    if [ ! -f server/media/test-dir/test-file ]; then
        mkdir -p server/media/test-dir
        echo "test file" > server/media/test-dir/test-file
    fi

    (docker stop ${container} && docker rm ${container} || echo "container ${container} not running") && \
    docker run --name ${container} --rm --detach \
        -v "${PWD}/server/media:/home/node/app/media" \
        -v "${PWD}/server/certs/cert.crt:/run/secrets/cert.crt:ro" \
        -v "${PWD}/server/certs/cert.key:/run/secrets/cert.key:ro" \
        -e "G_CLIENT_ID=test.apps.googleusercontent.com" \
        -e "G_EMAILS=test@gmail.com" \
        -p "58081:58082" \
        ${DOCKER_USERNAME}/${DOCKER_REPO}:local

    timeout 25s bash -c 'while [[ "$(curl --insecure https://localhost:58081/health)" != "healthy" ]]; do sleep 5; done'

    local http_result="server/test-results/e2e_test_run"
    mkdir -p server/test-results
    rm -rf server/test-results/e2e_test_run
    curl --insecure --verbose https://localhost:58081/test-dir/test-file > "${http_result}" 2>&1

    if ! grep -q "GET \/test-dir\/test-file HTTP\/1.1"   "${http_result}" \
    || ! grep -q "HTTP\/1.1 401 Unauthorized"          "${http_result}"; then
        echo "invalid http response"
        exit 1
    fi

    docker stop ${container}
}

check_test_results() {
    if [ ! -f artifacts/test-results/*.xml ]; then
        echo "no test results found"
        exit 1
    fi
}

scan() {
    docker run \
        --rm \
        --pull always \
        -v /var/run/docker.sock:/var/run/docker.sock \
        -v ${HOME}/.trivy/cache:/root/.cache \
        -v ${PWD}:/config \
        aquasec/trivy \
            image \
                --exit-code=1 \
                ${DOCKER_USERNAME}/${DOCKER_REPO}:local \
    || exit 1
}

push() {
    docker buildx build \
        -t ${DOCKER_USERNAME}/${DOCKER_REPO}:${SEMVER} \
        -t ${DOCKER_USERNAME}/${DOCKER_REPO}:latest \
        --build-arg SEMVER \
        --platform ${PLATFORMS} \
        --pull \
        --output=type=registry \
        . \
    || exit 1
}

case "${1}" in
    "github-env"         ) github_env         ;;
    "calc-semver"        ) calc_semver        ;;
    "build"              ) build              ;;
    "e2e"                ) test_end_to_end    ;;
    "check-test-results" ) check_test_results ;;
    "scan"               ) scan               ;;
    "push"               ) push               ;;

    *) echo "\033[0;31mUSAGE:   ./run.sh github-env | calc-semver | build | e2e | check-test-results | scan | push\033[0m" && exit 1
esac
