# media-share

fast media share web server with a very basic UI

## Prerequisites

* [Docker](https://docs.docker.com/get-docker/)
* [Node.js LTS](https://nodejs.org/en/) [*only for development*]

## Build

```sh
./run build
```

## Scan for vulnerabilities

```sh
./run scan
```

## Run

**Security warning**: Only expose shared volumes that don't contain sensitive data !!!  
**Security warning**: Only expose this outside `127.0.0.1` if you understand the risks !!!  

* local folders

```sh
# required: create (or symlink) ./media dir'

# required: create (or symlink) ./server/certs/cert.crt and ./server/certs/cert.key files
#    mkdir -p server/certs
#    openssl req -newkey rsa:2048 -new -nodes -x509 -days 3650 -out server/certs/cert.crt -keyout server/certs/cert.key

# required: .env file or indicidual env vars 
export G_CLIENT_ID="" # reqired, see https://console.cloud.google.com/apis/credentials
export G_EMAILS="" # required, comma separated list of authorized emails

export DEBUG="*" # optional
npm --prefix server start
```

=> [http://localhost:58082/](http://localhost:58082/)

* local image

```sh
(docker stop media-share-0.0.0 || echo "not running") && \
docker run --name media-share-0.0.0 --rm \
    -v "${HOME}/media:/home/node/app/media" \
    -v "${HOME}/certs/cert.crt:/run/secrets/cert.crt:ro" \
    -v "${HOME}/certs/cert.key:/run/secrets/cert.key:ro" \
    -v "${PWD}/server/.env:/run/secrets/.env:ro" \
    -p "127.0.0.1:58081:58082" \
    vallyian/media-share:0.0.0
```

=> [http://localhost:58081/](http://localhost:58081/)

* public image

```sh
(docker stop media-share && docker rm media-share || echo "not running") && \
docker run --name media-share --pull always --restart=always -d \
    -v "${HOME}/media:/home/node/app/media" \
    -v "${HOME}/certs/cert.crt:/run/secrets/cert.crt:ro" \
    -v "${HOME}/certs/cert.key:/run/secrets/cert.key:ro" \
    -e "G_CLIENT_ID=" `# required` \
    -e "G_EMAILS=" `# required` \
    -p "127.0.0.1:58080:58082" \
    vallyian/media-share:latest
```

=> [http://localhost:58080/](http://localhost:58080/)
