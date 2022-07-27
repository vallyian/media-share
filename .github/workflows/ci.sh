#!/bin/sh -e

DOCKER_REPO=${DOCKER_REPO:-media-share}
PLATFORMS=linux/amd64,linux/arm/v7,linux/arm64/v8,linux/ppc64le,linux/s390x

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
    docker buildx build \
        --pull \
        --target export \
        -o artifacts . \
    || exit 1
}

scan() {
    docker buildx build \
        -t ${DOCKER_REPO}:scan \
        --build-arg SEMVER \
        --pull \
        --load \
        . \
    || exit 1

    docker image inspect ${DOCKER_REPO}:scan > /dev/null \
    || exit 2

    docker run \
        --rm \
        --pull always \
        -v /var/run/docker.sock:/var/run/docker.sock \
        -v ${HOME}/.trivy/cache:/root/.cache \
        -v ${PWD}:/config \
        aquasec/trivy \
            image \
                --exit-code=1 \
                ${DOCKER_REPO}:scan \
    || exit 3

    docker image rm ${DOCKER_REPO}:scan \
    || exit 4
}

push() {
    docker buildx build \
        -t ${DOCKER_USERNAME}/${DOCKER_REPO}:${SEMVER} \
        -t ${DOCKER_USERNAME}/${DOCKER_REPO}:latest \
        --build-arg SEMVER \
        --platform ${PLATFORMS} \
        --pull \
        --push \
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
