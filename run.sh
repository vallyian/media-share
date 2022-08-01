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
    "github_env"  ) github_env  ;;
    "calc_semver" ) calc_semver ;;
    "build"       ) build       ;;
    "scan"        ) scan        ;;
    "push"        ) push        ;;

    *) exit 1
esac
