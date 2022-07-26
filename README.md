# media-share

## Prerequisites

* [Docker](https://docs.docker.com/get-docker/)
* [Node.js LTS](https://nodejs.org/en/) [*only for development*]

## Build

```sh
docker buildx build -t vallyian/media-share:local .
```

## Run

**Security warning**: Shared volume requires read/write access, don't share sensitive data !!!

* local folders
  * linux: `export MEDIA_DIR=/some/path` or Windows: `set MEDIA_DIR=C:\some\path`
  * `cd ./client && npm start`
  * `cd ./server && npm start`

=> [http://localhost/](http://localhost/)

* local image

```sh
(docker stop media-share-local && docker rm media-share-local || echo "not running") && \
docker run --name media-share-local --rm \
    -v "/some/path:/media:rw" \
    -p "127.0.0.1:58081:80" \
    vallyian/media-share:local
```

=> [http://localhost:58081/](http://localhost:58081/)

* public image

```sh
(docker stop media-share && docker rm media-share || echo "not running") && \
docker run --name media-share --pull always --restart=always -d \
    -v "/some/path:/media:rw" \
    -p "127.0.0.1:58080:80" \
    vallyian/media-share:latest
```

=> [http://localhost:58080/](http://localhost:58080/)
