# media-share

## Prerequisites

* [Docker](https://docs.docker.com/get-docker/)
* [Node.js LTS](https://nodejs.org/en/) [*only for development*]

## Build

```sh
rm -rf artifacts && \
docker buildx build --pull --target export -o artifacts . && \
docker buildx build --pull -t vallyian/media-share:local .
```

## Run

**Security warning**: Only expose shared volumes that don't contain sensitive data !!!  
**Security warning**: Only expose this outside `127.0.0.1` if you understand the risks !!!  
**Info** generate self-signed certs with `openssl req -newkey rsa:2048 -new -nodes -x509 -days 3650 -out cert.pem -keyout key.pem`  

* local folders

```sh
export MEDIA_DIR="/some/path"
export CERTS_DIR="/optional/certs/dir" # optional
export DEBUG="*" # optional
npm --prefix server start
```

=> [http://localhost:58082/](http://localhost:58082/)

* local image

```sh
(docker stop media-share-local && docker rm media-share-local || echo "not running") && \
docker run --name media-share-local --rm \
    -v "/some/path:/media" \
    -v "/optional/certs/dir:/certs" \
    -e "CERTS_DIR=/certs" \
    -p "127.0.0.1:58081:58082" \
    vallyian/media-share:local
```

=> [http://localhost:58081/](http://localhost:58081/)

* public image

```sh
(docker stop media-share && docker rm media-share || echo "not running") && \
docker run --name media-share --pull always --restart=always -d \
    -v "/some/path:/media" \
    -v "/optional/certs/dir:/certs" \
    -e "CERTS_DIR=/certs" \
    -p "127.0.0.1:58080:58082" \
    vallyian/media-share:latest
```

=> [http://localhost:58080/](http://localhost:58080/)
