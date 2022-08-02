# media-share

## Prerequisites

* [Docker](https://docs.docker.com/get-docker/)
* [Node.js LTS](https://nodejs.org/en/) [*only for development*]

## Build

```sh
./run.sh build
```

## Scan for vulnerabilities

```sh
./run.sh scan
```

## Run

**Security warning**: Only expose shared volumes that don't contain sensitive data !!!  
**Security warning**: Only expose this outside `127.0.0.1` if you understand the risks !!!  
**Info** generate self-signed certs with `openssl req -newkey rsa:2048 -new -nodes -x509 -days 3650 -out cert.crt -keyout cert.key`

* local folders

```sh
echo 'prerequisite (Linux):     ln -s "path/to/real/location" server/media            '
echo 'prerequisite (Windows):   mklink /d .\server\media "x:\path\to\real\location"   '
`# optional #` export CERT_CRT="${HOME}/certs/cert.crt" # or   set CERT_CRT="%userprofile%\certs\cert.crt"
`# optional #` export CERT_KEY="${HOME}/certs/cert.key" # or   set CERT_CRT="%userprofile%\certs\cert.crt"
`# optional #` export DEBUG="*" # optional
npm --prefix server start
```

=> [http://localhost:58082/](http://localhost:58082/)

* local image

```sh
(docker stop media-share-local && docker rm media-share-local || echo "not running") && \
docker run --name media-share-local --rm \
    -v "${HOME}/media:/home/node/app/media" \
    -v "${HOME}/certs/cert.crt:/run/secrets/cert.crt" `# optional` \
    -v "${HOME}/certs/cert.key:/run/secrets/cert.key" `# optional` \
    -p "127.0.0.1:58081:58082" \
    vallyian/media-share:local
```

=> [http://localhost:58081/](http://localhost:58081/)

* public image

```sh
(docker stop media-share && docker rm media-share || echo "not running") && \
docker run --name media-share --pull always --restart=always -d \
    -v "${HOME}/media:/home/node/app//media" \
    -v "${HOME}/certs/cert.crt:/run/secrets/cert.crt" `# optional` \
    -v "${HOME}/certs/cert.key:/run/secrets/cert.key" `# optional` \
    -p "127.0.0.1:58080:58082" \
    vallyian/media-share:latest
```

=> [http://localhost:58080/](http://localhost:58080/)
