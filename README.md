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

### Security warnings

* only expose shared volumes that don't contain sensitive data !!!  
* only expose this outside `127.0.0.1` if you understand the risks !!!  
* use TLS certificates in prod

Example self-signed cert (for development testing)
`openssl req -new -newkey rsa:4096 -out cert.crt -keyout cert.key -days 365 -nodes -x509 -subj "/C=CC/ST=ST/L=L/O=O/CN=127.0.0.1"`

### Environment

```sh
# see server/src/config.ts for all possible env vars
export MEDIA_SHARE__AuthClient= # optional, highly recommended, see https://console.cloud.google.com/apis/credentials
export MEDIA_SHARE__AuthEmails= # optional, highly recommended, comma separated list of authorized emails
```

### nodejs

```sh
# required: dir or symlink 'server/media' 
npm --prefix server start `# http://localhost:58082/ `
```

### docker

Possible docker run args

```sh
# volumes
-v "absolute/path/to/media/dir:/home/node/media"        `# optional, pointless without` \
-v "absolute/path/to/cert.crt:/run/secrets/cert.crt:ro" `# optional, highly recommended` \
-v "absolute/path/to/cert.key:/run/secrets/cert.key:ro" `# optional, highly recommended` \

# env vars (see environment section)
-e "..." \
```

#### local image

```sh
docker run --rm \
    -p "127.0.0.1:58081:58082" `# http://localhost:58081/ ` \
    `# additional args` \
vallyian/media-share:0.0.0
```

#### public image

```sh
docker run --pull always --restart=always --detach
    -p "127.0.0.1:58080:58082" `# http://localhost:58080/ ` \
    `# additional args` \
vallyian/media-share:latest
```

## TODO

* selection page for ID provider (sync to all cluster workers)
* sub - get fps - video not found - when name ends with space
* jschardet.detectAll and return multiple subtitles if detection not 100%
* across device sync
